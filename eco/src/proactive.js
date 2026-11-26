// Messages Eco starts itself: order alerts, payment (cart) recovery, reorder nudges, broadcasts.
// Everything goes through one slow queue with daily/hourly caps and day-time hours,
// because the free WhatsApp connection can be banned for bulk sending.
import { config, hasOrders } from './config.js';
import { store, digitsOf } from './store.js';
import * as woo from './woo.js';
import { toJid } from './agent.js';
import { db } from './db.js';
import { notePurchase } from './shoppers.js';
import { reorderWindow } from './growth.js';
import { products } from './merch.js';
import { complete } from './llm.js';
import { FOLLOW_UP_PROMPT } from './prompt/follow-up.js';

let wa = null; // { sendText, exists }
const PRIORITY = { alert: 0, recovery: 1, followup: 2, reorder: 3, broadcast: 4 };
const FOOD = /honey|ghee|oil|coconut|spice|masala|pepper|cardamom|tea|coffee|jaggery|pickle|soap|tissue/i;
const first = (o) => (o.billing?.first_name || '').trim().split(/\s+/)[0] || '';
const itemsOf = (o) => (o.line_items || []).map((i) => i.name).slice(0, 2).join(' and ');
const ageMin = (o) => (Date.now() - new Date(o.date_created_gmt ? o.date_created_gmt + 'Z' : o.date_created).getTime()) / 60000;
const hourIST = () => Number(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }));
const STOP = '\n\n(Reply STOP if you don\'t want offers from us.)';

function phoneOf(o) {
  let d = digitsOf(o.billing?.phone || '');
  if (d.length === 10) d = `91${d}`;
  return d.length >= 11 ? d : '';
}

function enqueue(kind, key, phone, text, extra = {}) {
  if (!phone || store.isOptedOut(phone)) return;
  if (store.enqueue({ kind, key, phone, text, ...extra })) console.log(`queued ${kind} for +${phone}`);
}

async function pollOrders() {
  if (!hasOrders() || !config.proactive.enabled) return;
  const orders = await woo.recentOrders({ hours: 48 });
  const firstRun = !store.isDone('init:orders');
  const paidPhones = new Set(orders.filter((o) => ['processing', 'completed', 'on-hold'].includes(o.status)).map(phoneOf));
  for (const o of orders) {
    if (['processing', 'completed', 'on-hold'].includes(o.status)) { try { notePurchase(o); } catch (e) { console.error('notePurchase', e.message); } }
    const phone = phoneOf(o);
    const name = first(o);
    const hi = name ? `Hi ${name}` : 'Hi';
    if (firstRun) { store.markDone(`alert:${o.id}:${o.status}`); store.markDone(`recovery:${o.id}`); continue; }
    if (config.proactive.orderAlerts && o.status === 'processing' && !store.isDone(`alert:${o.id}:processing`)) {
      enqueue('alert', `alert:${o.id}:processing`, phone,
        `${hi}, this is Eco from EcoCart 🌿 Thank you for your order #${o.id} (${itemsOf(o)})!\n\nIt's confirmed and we'll pack it soon. Delivery usually takes 4 to 10 days. Any question, just reply here.`);
    }
    if (config.proactive.orderAlerts && o.status === 'completed' && !store.isDone(`alert:${o.id}:completed`)) {
      enqueue('alert', `alert:${o.id}:completed`, phone,
        `${hi}! Your EcoCart order #${o.id} is on its way to you 📦\n\nHope you love it. If anything isn't right, send me a photo within 2 days of delivery and we'll sort it.`);
    }
    if (config.proactive.cartRecovery && ['pending', 'failed'].includes(o.status) && !paidPhones.has(phone)
        && ageMin(o) > 45 && ageMin(o) < 24 * 60 && !store.isDone(`recovery:${o.id}`)) {
      const link = o.payment_url ? `\n\nYou can finish it here: ${o.payment_url}` : `\n\nYou can order again here: ${config.woo.url}`;
      enqueue('recovery', `recovery:${o.id}`, phone,
        `${hi}, Eco from EcoCart here. Looks like the payment for your ${itemsOf(o) || 'order'} didn't go through.${link}\n\nIf something went wrong with UPI or the card, tell me and I'll help you out.`);
    }
  }
  if (firstRun) store.markDone('init:orders');
}

// Personalised reorders: the actual consumable they bought, inside that product's own reorder window,
// at most one nudge per customer per 30 days and one per product per order.
async function queueReorders() {
  if (!hasOrders() || !config.proactive.enabled || !config.proactive.reorderNudges) return;
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  if (store.isDone(`reorder-scan:${day}`) || hourIST() < 10) return;
  store.markDone(`reorder-scan:${day}`);
  const orders = await woo.ordersBetween(20, 75, 'completed');
  const cat = await products().catch(() => []);
  const MONTH = 30 * 86400000;
  for (const o of orders) {
    const phone = phoneOf(o);
    if (!phone) continue;
    if (Date.now() - store.doneAt(`reorder:${phone}`) < MONTH || Date.now() - store.doneAt(`reorder-phone:${phone}`) < MONTH) continue;
    const days = Math.floor(ageMin(o) / 1440);
    const li = (o.line_items || []).find((i) => { const w = reorderWindow(i.name); return w && days >= w[0] && days <= w[1]; });
    if (!li) continue;
    const key = `reorder:${phone}:${li.product_id || li.name}:${o.id}`;
    if (store.isDone(key)) continue;
    const prod = cat.find((p) => p.id === li.product_id && p.inStock);
    const name = first(o);
    const link = prod ? ` Here's the link if you'd like another: ${prod.url}` : ' I can send the link if you\'d like another.';
    enqueue('reorder', key, phone,
      `Hi${name ? ` ${name}` : ''}! Eco from EcoCart 🌿 Your ${li.name} from about ${Math.round(days / 7)} weeks ago might be running low by now.${link}${STOP}`,
      { after: `reorder-phone:${phone}` });
  }
}

// Follow-ups for interested shoppers who went quiet (and the ones they asked for).
// Rules: WhatsApp only, at least 6 h after their last message, at most 2 per shopper, 48 h apart,
// never after STOP / not interested / a purchase, and only through the slow queue.
async function queueFollowUps() {
  if (!config.proactive.enabled || process.env.FOLLOWUPS_ENABLED === 'false') return;
  const h = hourIST();
  if (h < config.proactive.hoursStart || h >= config.proactive.hoursEnd - 1) return;
  const now = Date.now();
  for (const pr of Object.values(db.profiles())) {
    const chat = pr.chat_ids.find((id) => /@(s\.whatsapp\.net|lid)$/.test(id));
    if (!chat || !pr.phone || pr.opted_out || store.isOptedOut(pr.phone)) continue;
    if (store.paused || store.isChatPaused(chat) || ['other', 'supplier'].includes(store.chatKind(chat))) continue;
    if (pr.follow_ups_sent >= 2 || now - (pr.last_follow_up || 0) < 48 * 3600000) continue;
    if (pr.buying_stage === 'purchased' && now - (pr.purchases.at(-1)?.at || 0) < 30 * 86400000) continue;
    if ((pr.intent || []).includes('not_interested')) continue;
    const asked = pr.follow_up_due && now >= pr.follow_up_due;
    const quiet = now - (pr.last_inbound || 0);
    const auto = !pr.follow_up_due && pr.lead_score >= 45 && ['considering', 'ready'].includes(pr.buying_stage)
      && quiet >= 6 * 3600000 && quiet <= 72 * 3600000 && (pr.recommended_products.length || pr.budget || pr.occasion);
    if (!asked && !auto) continue;
    const key = `fu:${pr.key}:${pr.follow_ups_sent + 1}`;
    if (store.isDone(key) || store.queue().some((q) => q.key === key)) continue;
    const hist = store.history(chat).slice(-12).map((m) => `${m.role === 'user' ? 'Customer' : 'Eco'}: ${m.content}`).join('\n');
    let text = '';
    try {
      const msg = await complete([{ role: 'system', content: FOLLOW_UP_PROMPT },
        { role: 'user', content: `Shopper: ${pr.name || 'unknown name'}; budget ${pr.budget || '?'}; occasion ${pr.occasion || '?'}; recommended ${pr.recommended_products.slice(-2).join(', ') || 'nothing yet'}; reason: ${asked ? pr.follow_up_reason : 'went quiet after showing interest'}; follow-up number ${pr.follow_ups_sent + 1}.\nChat:\n${hist}` }],
      null, { maxTokens: 1500, temperature: 0.9 });
      text = (msg.content || '').trim();
    } catch (e) { console.error('follow-up text', e.message); }
    if (!text) continue;
    enqueue('followup', key, pr.phone, `${text}\n\n(Reply STOP if you don't want reminders.)`, { profile: pr.key, jid: chat });
    pr.follow_up_due = 0;
  }
}

// Cart recovery from cart events: off until a real cart-tracking source is connected (CART_RECOVERY_LIVE=true).
async function queueCartRecovery() {
  if (process.env.CART_RECOVERY_LIVE !== 'true') return;
  const carts = {};
  for (const e of db.data.cart_events) carts[e.cart_id] = { ...(carts[e.cart_id] || {}), ...e };
  for (const c of Object.values(carts)) {
    const idle = Date.now() - (c.at || 0);
    if (!c.phone || c.recovered || c.event === 'order_completed' || idle < 2 * 3600000 || idle > 6 * 3600000) continue;
    const phone = digitsOf(c.phone).length === 10 ? `91${digitsOf(c.phone)}` : digitsOf(c.phone);
    enqueue('recovery', `cart:${c.cart_id}`, phone,
      `Hi${c.name ? ` ${c.name}` : ''}, Eco from EcoCart here. You left ${c.items || 'a few things'} in your cart${c.value ? ` (Rs ${c.value})` : ''}. Want me to help you finish the order?${c.url ? ` ${c.url}` : ''}${STOP}`);
  }
}

function canSendNow() {
  const p = config.proactive;
  const h = hourIST();
  if (store.paused || h < p.hoursStart || h >= p.hoursEnd) return false;
  if (store.sendsWithin(3600000) >= p.hourlyLimit || store.sendsWithin(86400000) >= p.dailyLimit) return false;
  const gap = p.minGapSec * 1000 * (1 + Math.random() * 0.8);
  return Date.now() - store.lastSend() > gap;
}

let sending = false;
async function sendNext() {
  if (sending || !wa || !canSendNow()) return;
  const q = store.queue();
  if (!q.length) return;
  q.sort((a, b) => PRIORITY[a.kind] - PRIORITY[b.kind] || a.at - b.at);
  const item = store.shift();
  if (!item || store.isDone(item.key) || store.isOptedOut(item.phone)) return;
  const pr = item.profile ? db.profiles()[item.profile] : null;
  if (item.kind === 'followup' && (!pr || pr.opted_out || (pr.last_inbound || 0) > item.at || pr.buying_stage === 'purchased')) { store.markDone(item.key); return; }
  sending = true;
  try {
    const jid = toJid(item.phone);
    if (!(await wa.exists(jid))) { store.markDone(item.key); return; }
    await wa.sendText(jid, item.text);
    store.push(jid, 'assistant', item.text);
    store.setChatKind(jid, 'customer');
    store.markDone(item.key);
    if (item.after) store.markDone(item.after);
    store.recordSend();
    store.bump(`sent_${item.kind}`);
    db.metric(`sent_${item.kind}`);
    if (pr && item.kind === 'followup') { pr.follow_ups_sent = (pr.follow_ups_sent || 0) + 1; pr.last_follow_up = Date.now(); pr.last_outbound = Date.now(); db.experiment(pr.variant, 'follow_ups'); }
  } catch (e) {
    console.error('proactive send failed', e.message);
  } finally {
    sending = false;
  }
}

export const broadcast = {
  async preview(message, audience) {
    let people = [];
    if (audience === 'past_customers') {
      if (!hasOrders()) return { error: 'Add the WooCommerce key first.' };
      people = await woo.pastCustomers(300);
    } else {
      people = store.knownChats()
        .filter((k) => k.endsWith('@s.whatsapp.net') && !['other', 'supplier'].includes(store.chatKind(k)))
        .map((k) => ({ phone: digitsOf(k), name: store.name(digitsOf(k)) }));
    }
    people = people.filter((p) => !store.isOptedOut(p.phone) && !config.owners.includes(p.phone));
    const id = Date.now().toString(36);
    store.setBroadcastDraft({ id, message, audience, people });
    const p = config.proactive;
    const days = Math.ceil(people.length / p.dailyLimit);
    return { draft: id, recipients: people.length, sample: message.replace('{name}', people[0]?.name || 'Anu'), est_days_to_finish: days, limits: `${p.hourlyLimit}/hour, ${p.dailyLimit}/day, ${p.hoursStart}:00-${p.hoursEnd}:00` };
  },
  confirm() {
    const d = store.broadcastDraft();
    if (!d) return { error: 'No broadcast prepared.' };
    let n = 0;
    for (const p of d.people) {
      const text = d.message.replace(/\{name\}/g, p.name || '').replace(/\s+,/g, ',') + (/stop/i.test(d.message) ? '' : STOP);
      if (store.enqueue({ kind: 'broadcast', key: `bc:${d.id}:${p.phone}`, phone: p.phone, text })) n++;
    }
    store.setBroadcastDraft(null);
    return { queued: n };
  },
  status() {
    const counts = {};
    for (const q of store.queue()) counts[q.kind] = (counts[q.kind] || 0) + 1;
    const p = config.proactive;
    return { queued: counts, sent_last_hour: store.sendsWithin(3600000), sent_last_24h: store.sendsWithin(86400000), limits: `${p.hourlyLimit}/hour, ${p.dailyLimit}/day, ${p.hoursStart}:00-${p.hoursEnd}:00 IST` };
  },
};

export function startProactive(deps) {
  wa = deps;
  const safe = (fn) => () => fn().catch((e) => console.error(fn.name, e.message));
  setTimeout(safe(pollOrders), 20000);
  setInterval(safe(pollOrders), 5 * 60 * 1000);
  setInterval(safe(queueReorders), 30 * 60 * 1000);
  setInterval(safe(queueFollowUps), 15 * 60 * 1000);
  setInterval(safe(queueCartRecovery), 15 * 60 * 1000);
  setInterval(() => sendNext().catch(() => {}), 20000);
}

export { pollOrders, queueReorders, queueFollowUps, queueCartRecovery };
