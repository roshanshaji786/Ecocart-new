// Products from the public WooCommerce Store API (no key needed).
// Orders from the WooCommerce REST API (needs a read key; optional).
import { config, hasOrders } from './config.js';

const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; EcoBot/1.0)', Accept: 'application/json' };
const strip = (html = '') => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#8211;|&#8217;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const rupees = (minor, unit = 2) => (minor ? Math.round(Number(minor) / 10 ** unit) : null);

async function getJson(url, headers = {}) {
  const res = await fetch(url, { headers: { ...UA, ...headers } });
  if (!res.ok) throw new Error(`${new URL(url).pathname} ${res.status}`);
  return res.json();
}

async function wc(pathname, params = {}) {
  if (!hasOrders()) throw new Error('orders_not_connected');
  const url = new URL(`${config.woo.url}/wp-json/wc/v3/${pathname}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const user = config.woo.ck || config.woo.user;
  const pass = config.woo.cs || config.woo.pass;
  return getJson(url, { Authorization: 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64') });
}

let catalogue = [];
let loadedAt = 0;

export async function loadCatalogue(force = false) {
  if (!force && catalogue.length && Date.now() - loadedAt < 30 * 60 * 1000) return catalogue;
  const all = [];
  for (let page = 1; page < 20; page++) {
    const batch = await getJson(`${config.woo.url}/wp-json/wc/store/v1/products?per_page=100&page=${page}`);
    all.push(...batch);
    if (batch.length < 100) break;
  }
  catalogue = all.map((p) => {
    const u = p.prices?.currency_minor_unit ?? 2;
    const cats = (p.categories || []).map((c) => c.name);
    return {
      id: p.id,
      name: strip(p.name),
      price: rupees(p.prices?.price, u),
      regular: rupees(p.prices?.regular_price, u),
      onSale: !!p.on_sale,
      inStock: p.is_in_stock !== false,
      url: p.permalink,
      image: p.images?.[0]?.src || '',
      categories: cats,
      summary: strip(p.short_description).slice(0, 260),
      details: strip(p.description).slice(0, 600),
      text: `${p.name} ${cats.join(' ')} ${strip(p.short_description)} ${strip(p.description)}`.toLowerCase(),
    };
  });
  loadedAt = Date.now();
  return catalogue;
}

const pub = (p, detail = false) => ({
  id: p.id, name: p.name, price_inr: p.price, was_inr: p.onSale ? p.regular : undefined,
  in_stock: p.inStock, link: p.url, categories: p.categories, summary: p.summary,
  ...(detail ? { details: p.details, image: p.image } : {}),
});

export async function searchProducts(query, limit = 6) {
  const items = await loadCatalogue();
  const words = String(query).toLowerCase().split(/[^a-z0-9ഀ-ൿ]+/).filter((w) => w.length > 2);
  return items
    .map((p) => {
      let score = 0;
      for (const w of words) {
        if (p.name.toLowerCase().includes(w)) score += 3;
        else if (p.categories.join(' ').toLowerCase().includes(w)) score += 2;
        else if (p.text.includes(w)) score += 1;
      }
      if (score && p.inStock) score += 0.5;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ p }) => pub(p));
}

export async function getProduct(id) {
  const p = (await loadCatalogue()).find((x) => x.id === Number(id));
  return p ? pub(p, true) : null;
}

export async function categories() {
  const counts = {};
  for (const p of await loadCatalogue()) for (const c of p.categories) counts[c] = (counts[c] || 0) + 1;
  return counts;
}

export const last10 = (s = '') => String(s).replace(/\D/g, '').slice(-10);

const shortOrder = (o) => ({
  id: o.id, status: o.status, total_inr: Number(o.total), date: o.date_created,
  items: (o.line_items || []).map((i) => `${i.quantity} x ${i.name}`),
});

// Customers only see an order when the phone on it matches theirs.
export async function orderStatus(orderId, phone) {
  if (!hasOrders()) return { error: 'Order lookup is not connected yet. Hand this to Roshan.' };
  let o;
  try { o = await wc(`orders/${Number(orderId)}`); } catch { return { found: false }; }
  if (!phone || last10(o.billing?.phone) !== last10(phone)) return { found: false, note: 'No order with that number for this phone.' };
  return { found: true, ...shortOrder(o), tracking_note: 'Delivery takes 4 to 10 days after dispatch.' };
}

export async function ordersByPhone(phone) {
  if (!hasOrders()) return { error: 'Order lookup is not connected yet. Hand this to Roshan.' };
  const orders = await wc('orders', { search: last10(phone), per_page: 5 });
  return orders.filter((o) => last10(o.billing?.phone) === last10(phone)).map(shortOrder);
}

export async function ownerOrder(orderId) {
  const o = await wc(`orders/${Number(orderId)}`);
  return {
    ...shortOrder(o), customer: `${o.billing?.first_name || ''} ${o.billing?.last_name || ''}`.trim(),
    phone: o.billing?.phone, city: o.shipping?.city || o.billing?.city,
  };
}

export async function recentOrders({ hours = 48, status } = {}) {
  const after = new Date(Date.now() - hours * 3600000).toISOString();
  const params = { after, per_page: 100, orderby: 'date', order: 'desc' };
  if (status) params.status = status;
  return wc('orders', params);
}

export async function ordersBetween(daysAgoStart, daysAgoEnd, status = 'completed') {
  const before = new Date(Date.now() - daysAgoStart * 86400000).toISOString();
  const after = new Date(Date.now() - daysAgoEnd * 86400000).toISOString();
  return wc('orders', { after, before, status, per_page: 100 });
}

export async function pastCustomers(limit = 200) {
  const out = new Map();
  for (let page = 1; page <= 5 && out.size < limit; page++) {
    const batch = await wc('orders', { per_page: 100, page, status: 'completed,processing' });
    for (const o of batch) {
      const p = last10(o.billing?.phone);
      if (p && !out.has(p)) out.set(p, { phone: `91${p}`, name: o.billing?.first_name || '' });
    }
    if (batch.length < 100) break;
  }
  return [...out.values()].slice(0, limit);
}

export async function salesSummary(days = 1) {
  const orders = await recentOrders({ hours: days * 24 });
  const paid = orders.filter((o) => ['processing', 'completed', 'on-hold'].includes(o.status));
  return {
    days, orders_created: orders.length, paid_orders: paid.length,
    revenue_inr: Math.round(paid.reduce((s, o) => s + Number(o.total), 0)),
    unpaid_or_failed: orders.filter((o) => ['pending', 'failed'].includes(o.status)).length,
    latest_paid: paid.slice(0, 5).map((o) => ({ id: o.id, total: o.total, name: o.billing?.first_name, city: o.shipping?.city })),
  };
}
