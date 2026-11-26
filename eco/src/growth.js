// Owner growth copilot: data for "hey eco" strategy questions, the 9 PM report and the morning plan.
import { db } from './db.js';
import { store, todayIST } from './store.js';
import { hasOrders } from './config.js';
import * as woo from './woo.js';
import { products } from './merch.js';
import { complete, PRO } from './llm.js';
import { OWNER_COPILOT } from './prompt/owner-copilot.js';
import { STORE_FACTS } from './prompt/store-facts.js';

const PAID = ['processing', 'completed', 'on-hold'];
const hoursAgo = (t) => (t ? Math.round((Date.now() - t) / 3600000) : null);

// Days after purchase when a consumable is likely running low: [from, to].
const REORDER = [
  [/honey/i, 30, 45], [/ghee/i, 30, 45], [/coconut oil|gingelly|\boil\b/i, 25, 40], [/tea|coffee/i, 30, 45],
  [/spice|masala|pepper|cardamom|turmeric|chilli|clove|cinnamon/i, 45, 60], [/jaggery|sharkara/i, 30, 45],
  [/pickle/i, 30, 50], [/soap|shampoo|body wash/i, 30, 45], [/tissue|toothbrush/i, 45, 75],
];
export const reorderWindow = (name = '') => { const r = REORDER.find(([re]) => re.test(name)); return r ? [r[1], r[2]] : null; };

export async function reorderCandidates(limit = 40) {
  if (!hasOrders()) return { error: 'orders not connected' };
  const orders = await woo.ordersBetween(20, 75, 'completed');
  const out = [];
  for (const o of orders) {
    const days = Math.floor((Date.now() - Date.parse(o.date_created_gmt ? `${o.date_created_gmt}Z` : o.date_created)) / 86400000);
    for (const li of o.line_items || []) {
      const w = reorderWindow(li.name);
      if (w && days >= w[0] && days <= w[1]) {
        out.push({ order: o.id, name: o.billing?.first_name || '', phone: woo.last10(o.billing?.phone), item: li.name, product_id: li.product_id, days_since: days, opted_out: store.isOptedOut(o.billing?.phone || '') });
        break;
      }
    }
  }
  return out.slice(0, limit);
}

export async function bestSellers(days = 7) {
  if (!hasOrders()) return { error: 'orders not connected' };
  const orders = (await woo.recentOrders({ hours: days * 24 })).filter((o) => PAID.includes(o.status));
  const agg = {};
  for (const o of orders) for (const li of o.line_items || []) {
    const a = (agg[li.name] ||= { name: li.name, qty: 0, revenue_inr: 0 });
    a.qty += li.quantity || 1; a.revenue_inr += Math.round(Number(li.total) || 0);
  }
  return { days, paid_orders: orders.length, top: Object.values(agg).sort((a, b) => b.revenue_inr - a.revenue_inr).slice(0, 8) };
}

export function highIntentLeads(limit = 10) {
  return Object.values(db.profiles())
    .filter((p) => !p.opted_out && p.lead_score >= 40 && !(p.buying_stage === 'purchased' && Date.now() - (p.purchases.at(-1)?.at || 0) < 14 * 86400000))
    .sort((a, b) => b.lead_score - a.lead_score)
    .slice(0, limit)
    .map((p) => ({
      who: p.name || p.phone || p.key, phone: p.phone || undefined, channel: p.channel, score: p.lead_score, stage: p.buying_stage,
      budget: p.budget || undefined, occasion: p.occasion || undefined, recommended: p.recommended_products.slice(-3),
      objections: p.objections, last_active_hours_ago: hoursAgo(p.last_activity), follow_ups_sent: p.follow_ups_sent,
    }));
}

export function abandonedCarts() {
  const carts = {};
  for (const e of db.data.cart_events) carts[e.cart_id] = { ...(carts[e.cart_id] || {}), ...e };
  const list = Object.values(carts).filter((c) => ['checkout_started', 'cart_abandoned', 'cart_updated', 'item_added', 'cart_created'].includes(c.event) && !c.recovered);
  return { live: process.env.CART_RECOVERY_LIVE === 'true', note: list.length ? undefined : 'No cart data yet: the store does not send cart events to Eco until a cart-tracking plugin is connected.', carts: list.slice(-20) };
}

export function analyzeChat(phone) {
  const p10 = woo.last10(phone);
  const pr = db.profiles()[`p:${p10}`];
  const chat = store.knownChats().find((k) => k.split('@')[0].endsWith(p10));
  return { profile: pr || null, messages: chat ? store.history(chat).map((m) => `${m.role === 'user' ? 'Customer' : 'Eco'}: ${m.content}`).slice(-30) : [] };
}

function objectionCounts(days = 7) {
  const since = Date.now() - days * 86400000; const c = {};
  for (const o of db.data.objections) if (o.at >= since) c[o.kind] = (c[o.kind] || 0) + 1;
  return Object.entries(c).sort((a, b) => b[1] - a[1]);
}

function topRecommended(days = 7) {
  const since = Date.now() - days * 86400000; const c = {};
  for (const r of db.data.recommendations) if (r.at >= since) c[r.name] = (c[r.name] || 0) + 1;
  return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 6);
}

export async function growthSnapshot() {
  const safe = async (f) => { try { return await f(); } catch (e) { return { error: e.message }; } };
  const cat = await safe(products);
  const today = todayIST();
  return {
    date: today,
    sales_today: await safe(() => woo.salesSummary(1)), sales_7d: await safe(() => woo.salesSummary(7)),
    best_sellers_7d: await safe(() => bestSellers(7)),
    eco_today: db.metricsOn(today), top_recommended_7d: topRecommended(7), top_objections_7d: objectionCounts(7),
    message_styles: db.data.message_experiments, high_intent_leads: highIntentLeads(5),
    reorder_candidates: Array.isArray(cat) ? (await safe(() => reorderCandidates(10))) : [],
    catalogue: Array.isArray(cat) ? { products: cat.length, in_stock: cat.filter((p) => p.inStock).length, bundles_and_hampers: cat.filter((p) => p.types.includes('hamper') && p.inStock).map((p) => `${p.name} Rs ${p.price}`).slice(0, 8) } : cat,
    calendar: 'Christmas order-by 15 Dec; Christmas 25 Dec; New Year 1 Jan; Makar Sankranti/Pongal mid Jan; Valentine 14 Feb; Vishu mid Apr; Onam Aug/Sep.',
    queue_waiting: store.queue().length,
  };
}

async function proText(task, data, maxTokens = 3000) {
  const msg = await complete([
    { role: 'system', content: `You are Eco, EcoCart's AI salesman, writing to the owner Roshan on WhatsApp.${OWNER_COPILOT}${STORE_FACTS}` },
    { role: 'user', content: `${task}\n\nDATA:\n${JSON.stringify(data).slice(0, 12000)}` },
  ], null, { model: PRO(), maxTokens, temperature: 0.5 });
  return (msg.content || '').trim();
}

export async function morningPlan() {
  const snap = await growthSnapshot();
  const text = await proText('Write today\'s selling plan in at most 8 short plain lines: which bundles and products to push, which customer segment or leads to follow up, which offer to mention, and one broadcast idea (Roshan must approve any broadcast). Be specific, use real product names and prices from the data.', snap);
  db.log('growth_plans', { text }, 60);
  return text;
}

export async function dailyReport() {
  const today = todayIST();
  const m = db.metricsOn(today); const s = store.statsToday();
  let sales = null; try { if (hasOrders()) sales = await woo.salesSummary(1); } catch {}
  let best = null; try { if (hasOrders()) best = (await bestSellers(1)).top?.[0]?.name; } catch {}
  const objections = Object.entries(m).filter(([k]) => k.startsWith('objection:')).sort((a, b) => b[1] - a[1]);
  const sent = Object.entries(s).filter(([k]) => k.startsWith('sent_')).map(([k, v]) => `${k.slice(5)} ${v}`).join(', ') || 'none';
  let focus = '';
  try { focus = await proText('In ONE short line (max 18 words), what should Eco and Roshan focus on tomorrow? No preamble.', { metrics: m, stats: s, sales, best, objections, top_recommended: topRecommended(1) }, 1500); } catch {}
  const day = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' });
  return [
    `Eco daily report, ${day}`,
    sales ? `Orders: ${sales.paid_orders} paid, revenue Rs ${sales.revenue_inr.toLocaleString('en-IN')}, unpaid/failed ${sales.unpaid_or_failed}` : 'Orders: not connected',
    `Chats: WhatsApp ${s.whatsapp_messages || 0} msgs, website ${s.web_messages || 0} msgs, ignored personal ${s.ignored_chats || 0}`,
    `Recommendations: ${m.recommendations || 0}, links sent: ${m.links_sent || 0}`,
    `Sales closed from chats: ${m.orders_from_chat || 0} (Rs ${(m.revenue_influenced || 0).toLocaleString('en-IN')})`,
    `Payment recoveries sent: ${s.sent_recovery || 0}, reorder nudges: ${s.sent_reorder || 0}, follow-ups: ${s.sent_followup || 0}`,
    `Hand-offs: ${s.handoffs || 0}, opt-outs: ${m.opt_outs || 0}`,
    `Top objection: ${objections[0] ? objections[0][0].slice(10) : 'none'}`,
    `Best product today: ${best || 'no sales yet'}`,
    `Auto messages sent: ${sent}, queue ${store.queue().length}`,
    focus ? `Tomorrow: ${focus}` : '',
  ].filter(Boolean).join('\n');
}
