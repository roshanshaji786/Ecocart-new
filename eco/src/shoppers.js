// Shopper profiles, intent detection, lead scoring, A/B message styles and sales event logging.
// Intent detection is rule-based (English, Manglish, Malayalam keywords) so it costs no API call.
import { db, save } from './db.js';
import { digitsOf } from './store.js';

const last10 = (s = '') => digitsOf(s).slice(-10);

const INTENTS = {
  gift: /gift|hamper|present|samm?anam|birthday|wedding|kalyanam|housewarming|griha|anniversary|christmas|xmas|new year|onam|vishu|diwali|corporate/i,
  price: /price|rate|cost|how much|ethra|ethrayaa|evide|₹|\brs\.?\s?\d|budget|cheap|discount|offer|coupon/i,
  delivery: /deliver|shipping|courier|reach|kittum|ethum|varum|when will|how many days|days to|before christmas|urgent|fast/i,
  payment: /\bpay|upi|gpay|phonepe|card|cod\b|cash on|razorpay|net ?banking/i,
  order_status: /where is my order|order status|track|tracking|order (no|number|#)|my order|ente order/i,
  complaint: /refund|damag|broken|leak|complain|return|wrong (item|product)|not received|kittiyilla|cheet|fraud|bad quality|expired/i,
  bulk: /bulk|corporate|wholesale|office|employees|staff|\b\d{2,}\s*(pcs|pieces|boxes|nos|numbers|hampers|packs|qty)\b|quantity of/i,
  sustainability: /eco|sustainab|plastic|organic|natural|chemical|green|reusable|bamboo|biodegrad|compost|environment/i,
  reorder: /again|reorder|re-order|one more|another (one|bottle|jar)|same as last|veendum/i,
  objection: /expensive|costly|too much|kooduthal|vila kooduthal|cheaper|think about|let me think|later|not sure|compare|amazon|flipkart|ask my|check with|maybe/i,
  ready: /\b(buy|buying|order(ing)? (it|this|now)|i'?ll take|take it|send (me )?(the )?link|confirm|book it|venam|edukkam|ok done|go ahead|checkout)\b/i,
  browsing: /just (looking|checking|browsing)|only (looking|checking)|chumma/i,
  not_interested: /not interested|no thanks|no thank you|venda|vendaa|don'?t (want|need)/i,
  bot_question: /are you (a )?(bot|robot|ai|human|real)|is this (a )?bot|bot aano/i,
};
const OBJECTION_KIND = [
  ['price', /expensive|costly|too much|kooduthal|cheaper|discount|budget/i],
  ['delivery time', /deliver|reach|before christmas|days|urgent|late/i],
  ['payment method', /cod\b|cash on|pay later/i],
  ['trust', /genuine|trust|fake|real|original|scam|safe/i],
  ['quality', /quality|pure|adulterat|fresh|expiry|expired/i],
  ['sustainability claims', /eco|plastic|organic|natural|chemical/i],
  ['need time', /think|later|not sure|maybe/i],
  ['needs approval', /ask my|check with|wife|husband|family|boss/i],
  ['comparing stores', /amazon|flipkart|other shop|elsewhere|compare/i],
  ['return/refund', /return|refund/i],
];

export function detectIntents(text = '') {
  const found = Object.entries(INTENTS).filter(([, re]) => re.test(text)).map(([k]) => k);
  if (/^\s*(stop|unsubscribe)\s*$/i.test(text)) found.push('opt_out');
  if (!found.length && text.trim().split(/\s+/).length <= 2) found.push('short');
  return found;
}
export const objectionOf = (text) => (OBJECTION_KIND.find(([, re]) => re.test(text)) || [])[0];

const BUDGET = /(?:under|below|within|upto|up to|around|about|max|budget|₹|rs\.?|inr)\s*₹?\s*(\d[\d,]{1,6})|(\d[\d,]{2,6})\s*(?:rs|₹|rupees|inr|budget)/i;
const OCCASION = /(christmas|xmas|new year|onam|vishu|diwali|wedding|kalyanam|housewarming|birthday|anniversary|corporate|thank ?you)/i;
const RECIPIENT = /(for (?:my )?(mom|mother|amma|dad|father|achan|wife|husband|friend|sister|brother|boss|colleague|team|client|parents|in-?laws|kids?|teacher|myself|self))/i;

export const VARIANTS = ['direct', 'question-first', 'benefit-first', 'offer-first'];
const STYLE = {
  direct: 'Lead with the single best product, its price and link, then one short reason.',
  'question-first': 'Open with one sharp question that narrows the choice, then recommend in the same message if you already can.',
  'benefit-first': 'Lead with the benefit to the customer (taste, use, how it will feel as a gift), then the product, price and link.',
  'offer-first': 'When an offer genuinely applies, mention it early (FIRST50, bundle saving, the 15 Dec date), then the product. Otherwise behave like direct.',
};
export const styleText = (v) => STYLE[v] || STYLE.direct;

function newProfile(key, chatId, channel) {
  return {
    key, chat_ids: [chatId], channel, phone: key.startsWith('p:') ? key.slice(2) : '', name: '', language: '',
    intent: [], budget: '', occasion: '', recipient: '', quantity: '', interests: [], viewed_products: [],
    recommended_products: [], objections: [], buying_stage: 'browse', lead_score: 10, last_activity: Date.now(),
    last_inbound: 0, last_outbound: 0, follow_up_due: 0, follow_up_reason: '', follow_ups_sent: 0, last_follow_up: 0,
    opted_out: false, handoff: false, notes: [], purchases: [], variant: VARIANTS[Math.floor(Math.random() * VARIANTS.length)],
    created: Date.now(),
  };
}

// One profile per phone when known (shared by WhatsApp and website), else per chat.
export function profileFor(chatId, { phone = '', name = '', channel = '' } = {}) {
  const p10 = last10(phone);
  const all = db.profiles();
  let key = db.profileKeyOf(chatId);
  if (p10 && key !== `p:${p10}`) {
    const target = `p:${p10}`;
    if (key && all[key] && !all[target]) { all[target] = { ...all[key], key: target, phone: p10 }; delete all[key]; }
    key = target;
    db.linkChat(chatId, key);
  }
  if (!key) { key = `c:${chatId}`; db.linkChat(chatId, key); }
  let pr = all[key];
  if (!pr) { pr = all[key] = newProfile(key, chatId, channel); db.experiment(pr.variant, 'chats'); }
  if (!pr.chat_ids.includes(chatId)) pr.chat_ids.push(chatId);
  if (name && !pr.name) pr.name = name;
  if (channel) pr.channel = channel;
  save();
  return pr;
}

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
const addUnique = (arr, v, max = 12) => { if (v && !arr.includes(v)) { arr.push(v); if (arr.length > max) arr.shift(); } };

// Update the profile from one inbound message; returns what was detected (fed into the prompt).
export function noteInbound(pr, text) {
  const intents = detectIntents(text);
  let d = 0;
  const firstTime = (k) => !pr[k];
  if (intents.includes('price')) d += 8;
  if (intents.includes('delivery')) d += 8;
  if (intents.includes('payment')) d += 10;
  if (intents.includes('gift')) d += 6;
  if (intents.includes('ready')) d += 20;
  if (intents.includes('bulk')) d += 20;
  if (intents.includes('reorder')) d += 15;
  if (intents.includes('browsing')) d -= 10;
  if (intents.includes('short')) d -= 2;
  if (intents.includes('not_interested')) d -= 35;
  const b = text.match(BUDGET); if (b) { if (firstTime('budget')) d += 10; pr.budget = `Rs ${(b[1] || b[2]).replace(/,/g, '')}`; }
  const o = text.match(OCCASION); if (o) { if (firstTime('occasion')) d += 8; pr.occasion = o[1].toLowerCase(); }
  const r = text.match(RECIPIENT); if (r) { if (firstTime('recipient')) d += 6; pr.recipient = r[2].toLowerCase(); }
  if (/[ഀ-ൿ]/.test(text)) pr.language = 'ml';
  else if (/\b(aano|alle|undo|venam|ethra|evide|kittum|chetta|chechi|mone|enthu|aanu|illa)\b/i.test(text)) pr.language = 'manglish';
  else if (!pr.language) pr.language = 'en';
  if (pr.last_outbound && Date.now() - pr.last_outbound < 5 * 60000) d += 3; // replies quickly
  if (pr.purchases.length && !pr._boughtBonus) { d += 15; pr._boughtBonus = true; }
  pr.lead_score = intents.includes('opt_out') ? 0 : clamp(pr.lead_score + d);
  pr.intent = intents;
  if (intents.includes('ready') && pr.buying_stage !== 'purchased') pr.buying_stage = 'ready';
  else if ((intents.includes('price') || intents.includes('delivery') || pr.budget) && pr.buying_stage === 'browse') pr.buying_stage = 'considering';
  const obj = intents.includes('objection') || intents.includes('price') && /expensive|costly|too much|kooduthal|cheaper/i.test(text) ? objectionOf(text) : null;
  if (obj) logObjection(pr, obj, text);
  if (intents.includes('handoff')) pr.handoff = true;
  pr.last_activity = pr.last_inbound = Date.now();
  if (pr.follow_up_reason === 'auto') { pr.follow_up_due = 0; pr.follow_up_reason = ''; }
  db.metric('inbound_messages');
  save();
  return { intents, objection: obj };
}

export function logObjection(pr, kind, text = '') {
  addUnique(pr.objections, kind);
  db.log('objections', { profile: pr.key, kind, text: text.slice(0, 160) });
  db.metric(`objection:${kind}`);
}

// Called after Eco replies: any product link in the reply counts as a recommendation.
export function noteOutbound(pr, reply, recommended = []) {
  pr.last_activity = pr.last_outbound = Date.now();
  for (const p of recommended) {
    addUnique(pr.recommended_products, p.name);
    db.log('recommendations', { profile: pr.key, product: p.id, name: p.name, price: p.price, variant: pr.variant });
    db.productPerf(p.id, 'recommended');
    db.metric('recommendations');
    db.metric('links_sent');
    db.experiment(pr.variant, 'links_sent');
    pr.lead_score = clamp(pr.lead_score + 5);
    if (pr.buying_stage === 'browse') pr.buying_stage = 'considering';
  }
  save();
}

export function updateProfile(pr, fields = {}) {
  for (const k of ['budget', 'occasion', 'recipient', 'quantity', 'language', 'buying_stage']) if (fields[k]) pr[k] = String(fields[k]).slice(0, 80);
  for (const i of [].concat(fields.interests || [])) addUnique(pr.interests, String(i).slice(0, 40));
  for (const i of [].concat(fields.viewed_products || [])) addUnique(pr.viewed_products, String(i).slice(0, 80));
  if (fields.objection) logObjection(pr, String(fields.objection).slice(0, 40));
  if (fields.note) { pr.notes.push(String(fields.note).slice(0, 200)); if (pr.notes.length > 10) pr.notes.shift(); }
  if (typeof fields.lead_score_change === 'number') pr.lead_score = clamp(pr.lead_score + Math.max(-30, Math.min(30, fields.lead_score_change)));
  save();
  return summary(pr);
}

export function scheduleFollowUp(pr, { hours = 24, reason = '' } = {}) {
  if (pr.opted_out) return { error: 'opted out' };
  if (pr.follow_ups_sent >= 2) return { error: 'already followed up twice' };
  pr.follow_up_due = Date.now() + Math.max(1, Math.min(24 * 14, Number(hours) || 24)) * 3600000;
  pr.follow_up_reason = String(reason || 'customer asked').slice(0, 160);
  db.log('follow_ups', { profile: pr.key, due: pr.follow_up_due, reason: pr.follow_up_reason });
  save();
  return { scheduled_for: new Date(pr.follow_up_due).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), note: 'It goes through the slow queue between 9 AM and 8 PM.' };
}

export function summary(pr) {
  const bits = [
    pr.name && `name ${pr.name}`, pr.language && `language ${pr.language}`, pr.budget && `budget ${pr.budget}`,
    pr.occasion && `occasion ${pr.occasion}`, pr.recipient && `for ${pr.recipient}`, pr.quantity && `qty ${pr.quantity}`,
    pr.interests.length && `interests ${pr.interests.join(', ')}`,
    pr.recommended_products.length && `already recommended: ${pr.recommended_products.slice(-4).join(', ')}`,
    pr.objections.length && `objections so far: ${pr.objections.join(', ')}`,
    pr.purchases.length && `bought before: ${pr.purchases.slice(-3).map((x) => x.items).join('; ')}`,
    pr.notes.length && `notes: ${pr.notes.slice(-3).join(' | ')}`,
  ].filter(Boolean);
  return `stage ${pr.buying_stage}, lead score ${pr.lead_score}/100${bits.length ? `, ${bits.join('; ')}` : ''}`;
}

export function profileByPhone(phone) { return db.profiles()[`p:${last10(phone)}`]; }

// A paid order from someone Eco talked to: record the purchase and attribute it.
export function notePurchase(order) {
  const p10 = last10(order.billing?.phone);
  const pr = p10 && db.profiles()[`p:${p10}`];
  if (!pr || pr.purchases.some((x) => x.order === order.id)) return null;
  const items = (order.line_items || []).map((i) => i.name).join(', ');
  const total = Math.round(Number(order.total) || 0);
  pr.purchases.push({ order: order.id, items, total, at: Date.now() });
  const recent = pr.recommended_products.length && Date.now() - pr.last_outbound < 14 * 86400000;
  const viaFollowUp = pr.last_follow_up && Date.now() - pr.last_follow_up < 7 * 86400000;
  pr.buying_stage = 'purchased';
  pr.follow_up_due = 0;
  if (recent) {
    db.log('conversion_events', { profile: pr.key, type: 'order_from_chat', order: order.id, total, variant: pr.variant, via_follow_up: !!viaFollowUp });
    db.metric('orders_from_chat'); db.metric('revenue_influenced', total);
    db.experiment(pr.variant, 'orders'); db.experiment(pr.variant, 'revenue', total);
    if (viaFollowUp) db.metric('follow_up_conversions');
    for (const li of order.line_items || []) if (li.product_id) db.productPerf(li.product_id, 'sold_after_chat', li.quantity || 1);
  }
  save();
  return { profile: pr.key, attributed: !!recent };
}
