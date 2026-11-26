// Merchandiser layer: tags every product from its live store data, matches shoppers to products,
// and checks offers. Only words that appear on the product page become sustainability facts.
import { loadCatalogue, ordersByPhone } from './woo.js';
import { hasOrders } from './config.js';

const has = (t, re) => re.test(t);
const TYPES = [
  ['hamper', /hamper|gift box|gift set|combo|trio|kitchen box|starter kit|basket/],
  ['honey', /honey/], ['ghee', /ghee/], ['oil', /\boil\b|coconut oil|gingelly/],
  ['spice', /spice|masala|pepper|cardamom|clove|cinnamon|turmeric|chilli/], ['tea', /\btea\b/], ['coffee', /coffee/],
  ['jaggery', /jaggery|sharkara|karupatti/], ['pickle', /pickle|achar/], ['dryfruit', /dry fruit|almond|cashew|dates|raisin/],
  ['soap', /soap|body wash|shampoo/], ['bamboo', /bamboo/], ['home', /brush|bottle|bag|cup|plate|straw|towel|mat|holder|organiser|organizer/],
  ['custom', /custom|personali[sz]ed|engrav|photo|name print/],
];
const EDIBLE = new Set(['honey', 'ghee', 'oil', 'spice', 'tea', 'coffee', 'jaggery', 'pickle', 'dryfruit']);
const SUSTAIN = [
  ['plastic-free', /plastic[- ]free|no plastic|zero plastic/], ['reusable', /reusable|re-usable/],
  ['bamboo', /bamboo/], ['coconut shell', /coconut shell/], ['biodegradable', /biodegradable/],
  ['compostable', /compostable/], ['handmade', /handmade|hand-made|handcrafted/],
  ['natural', /\bnatural\b|chemical[- ]free|no preservatives?/], ['organic (as stated on the product page)', /organic/],
  ['locally made in Kerala', /kerala|wayanad|idukki|munnar|thiruvananthapuram|trivandrum|kochi/],
  ['cold-pressed', /cold[- ]pressed|wood[- ]pressed|chekku/], ['eco-friendly (as described on the product page)', /eco[- ]friendly/],
];
const OCCASIONS = ['christmas', 'new year', 'onam', 'vishu', 'diwali', 'wedding', 'housewarming', 'birthday', 'anniversary', 'corporate', 'thank you', 'baby'];

export const tierOf = (price) => (price == null ? 'unknown' : price < 300 ? 'budget' : price < 800 ? 'mid' : price < 1500 ? 'premium' : 'luxury');

function tag(p) {
  const t = p.text;
  const types = TYPES.filter(([, re]) => has(t, re)).map(([k]) => k);
  const edible = types.some((k) => EDIBLE.has(k));
  const giftable = types.includes('hamper') || types.includes('custom') || /gift/.test(t);
  const occasions = OCCASIONS.filter((o) => t.includes(o));
  if (types.includes('hamper') && !occasions.length) occasions.push('christmas', 'new year', 'housewarming', 'corporate', 'thank you');
  const sustainability = SUSTAIN.filter(([, re]) => has(t, re)).map(([k]) => k);
  return { ...p, types, edible, giftable, occasions, sustainability, tier: tierOf(p.price) };
}

let tagged = []; let taggedFrom = null;
export async function products() {
  const cat = await loadCatalogue();
  if (cat !== taggedFrom) { tagged = cat.map(tag); taggedFrom = cat; }
  return tagged;
}

const cross = (p, all) => {
  const want = p.types.includes('hamper') ? [] : p.edible ? ['hamper'] : ['bamboo', 'home', 'soap'];
  const pick = all.find((q) => q.id !== p.id && q.inStock && q.types.some((k) => want.includes(k)));
  return pick ? { id: pick.id, name: pick.name, price_inr: pick.price } : undefined;
};

export const card = (p, all = []) => ({
  id: p.id, name: p.name, price_inr: p.price, was_inr: p.onSale ? p.regular : undefined,
  in_stock: p.inStock, link: p.url, categories: p.categories, summary: p.summary,
  tier: p.tier, giftable: p.giftable, occasions: p.occasions.slice(0, 4),
  sustainability_facts: p.sustainability, upsell: all.length ? cross(p, all) : undefined,
});

// Ranked, in-stock matches. Budget is a hard ceiling (with 10% grace) so Eco never pushes past it.
export async function findProducts({ query = '', budget_max, budget_min, occasion, gift, sustainable, edible, limit = 4 } = {}) {
  const all = await products();
  const STOPW = /^(for|the|and|with|my|her|his|our|you|want|need|some|any|under|below|around|about|from|this|that|have|looking|rupees|budget|something|good|nice|best|please|can|get|buy|send|link)$/;
  const words = String(query).toLowerCase().split(/[^a-z0-9ഀ-ൿ]+/).filter((w) => w.length > 2 && !STOPW.test(w));
  const occ = String(occasion || '').toLowerCase();
  const scored = all.filter((p) => p.inStock && p.price).map((p) => {
    let s = 0;
    for (const w of words) {
      if (p.name.toLowerCase().includes(w)) s += 3;
      else if (p.categories.join(' ').toLowerCase().includes(w) || p.types.includes(w)) s += 2;
      else if (p.text.includes(w)) s += 1;
    }
    if (gift) s += p.giftable ? 3 : -1;
    if (occ && p.occasions.some((o) => occ.includes(o) || o.includes(occ))) s += 2;
    if (sustainable && p.sustainability.length) s += 1 + p.sustainability.length * 0.5;
    if (edible === true && p.edible) s += 1;
    if (budget_max) {
      if (p.price > budget_max * 1.1) return { p, s: -1 };
      s += 1 - Math.abs(budget_max * 0.8 - p.price) / budget_max; // closest to ~80% of budget ranks higher
    }
    if (budget_min && p.price < budget_min * 0.7) s -= 1;
    if (budget_max && gift && p.price < budget_max * 0.35) s -= 1.5; // a Rs 150 item is not a Rs 1,000 gift
    return { p, s };
  }).filter((x) => x.s > 0 || (!words.length && x.s >= 0));
  scored.sort((a, b) => b.s - a.s);
  const top = scored.slice(0, limit).map(({ p }) => card(p, all));
  if (!top.length && budget_max) {
    const nearest = all.filter((p) => p.inStock && p.price).sort((a, b) => Math.abs(a.price - budget_max) - Math.abs(b.price - budget_max))[0];
    return { matches: [], note: 'Nothing fits that exactly. Closest option:', closest: nearest ? card(nearest, all) : null };
  }
  return { matches: top, note: top.length ? undefined : 'No in-stock match. Ask one clarifying question or suggest a bundle.' };
}

export async function productById(id) {
  const all = await products();
  const p = all.find((x) => x.id === Number(id));
  return p ? { ...card(p, all), details: p.details, image: p.image } : { error: 'not found' };
}

export async function productsInText(text = '') {
  const all = await products();
  return all.filter((p) => p.url && text.includes(p.url.replace(/\/$/, '')));
}

// Offers. Dates are Kerala time; FIRST50 needs a first order above Rs 499.
export const OFFERS = {
  first50: { code: 'FIRST50', off: 50, min: 499 },
  christmasBy: '2026-12-15',
  shipping: 55,
};

export async function checkOffer({ cart_total = 0, phone = '' } = {}) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const daysToXmas = Math.ceil((Date.parse(OFFERS.christmasBy) - Date.parse(today)) / 86400000);
  let firstOrder = 'unknown';
  if (phone && hasOrders()) {
    try {
      const o = await ordersByPhone(phone);
      firstOrder = !(Array.isArray(o) && o.some((x) => ['processing', 'completed', 'on-hold'].includes(x.status)));
    } catch {}
  }
  const total = Number(cart_total) || 0;
  const first50 = firstOrder !== false && total >= OFFERS.first50.min;
  return {
    cart_total_inr: total,
    first50: first50 ? `Eligible${firstOrder === 'unknown' ? ' if this is their first order' : ''}: Rs 50 off, type FIRST50 at checkout` : total < OFFERS.first50.min ? `Not yet: needs Rs ${OFFERS.first50.min - total} more` : 'Not eligible (not a first order)',
    shipping_inr: OFFERS.shipping,
    estimated_payable_inr: total ? total - (first50 ? OFFERS.first50.off : 0) + OFFERS.shipping : undefined,
    christmas: daysToXmas >= 0 ? `Order by 15 Dec for Christmas (${daysToXmas} days left). Delivery takes 4 to 10 days, so no exact date is promised.` : 'Past 15 Dec: Christmas delivery cannot be promised.',
  };
}
