// Messages Eco starts itself: order alerts, payment (cart) recovery, reorder nudges, broadcasts.
// Everything goes through one slow queue with daily/hourly caps and day-time hours,
// because the free WhatsApp connection can be banned for bulk sending.
import { config, hasOrders } from './config.js';
import { store, digitsOf } from './store.js';
import * as woo from './woo.js';
import { toJid } from './agent.js';

let wa = null; // { sendText, exists }
const PRIORITY = { alert: 0, recovery: 1, reorder: 2, broadcast: 3 };
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

function enqueue(kind, key, phone, text) {
  if (!phone || store.isOptedOut(phone)) return;
  if (store.enqueue({ kind, key, phone, text })) console.log(`queued ${kind} for +${phone}`);
}

async function pollOrders() {
  if (!hasOrders() || !config.proactive.enabled) return;
  const orders = await woo.recentOrders({ hours: 48 });
  const firstRun = !store.isDone('init:orders');
  const paidPhones = new Set(orders.filter((o) => ['processing', 'completed', 'on-hold'].includes(o.status)).map(phoneOf));
  for (const o of orders) {
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

async function queueReorders() {
  if (!hasOrders() || !config.proactive.enabled || !config.proactive.reorderNudges) return;
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  if (store.isDone(`reorder-scan:${day}`) || hourIST() < 10) return;
  store.markDone(`reorder-scan:${day}`);
  const orders = await woo.ordersBetween(30, 45, 'completed');
  for (const o of orders) {
    const item = (o.line_items || []).find((i) => FOOD.test(i.name));
    const phone = phoneOf(o);
    if (!item || !phone || store.isDone(`reorder:${phone}`)) continue;
    const name = first(o);
    enqueue('reorder', `reorder:${phone}`, phone,
      `Hi${name ? ` ${name}` : ''}! Eco from EcoCart 🌿 It's been about a month since your ${item.name}. Running low?\n\nI can share the link if you'd like another, and our Honey Trio and Kerala Kitchen Box are popular gifts this season.${STOP}`);
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
  sending = true;
  try {
    const jid = toJid(item.phone);
    if (!(await wa.exists(jid))) { store.markDone(item.key); return; }
    await wa.sendText(jid, item.text);
    store.push(jid, 'assistant', item.text);
    store.setChatKind(jid, 'customer');
    store.markDone(item.key);
    store.recordSend();
    store.bump(`sent_${item.kind}`);
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
        .filter((k) => k.endsWith('@s.whatsapp.net') && store.chatKind(k) !== 'other')
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
  setInterval(() => sendNext().catch(() => {}), 20000);
}
