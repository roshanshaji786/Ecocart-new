// Tool sets and one conversation turn for a customer or for Roshan.
import { runAgent, classify, PRO } from './llm.js';
import { customerPrompt, ownerPrompt, CLASSIFY_PROMPT } from './prompt.js';
import { store, digitsOf } from './store.js';
import { hasOrders } from './config.js';
import * as woo from './woo.js';
import { supplierOwnerTools } from './suppliers.js';
import { findProducts, productById, productsInText, checkOffer } from './merch.js';
import { profileFor, noteInbound, noteOutbound, updateProfile, scheduleFollowUp, summary, styleText } from './shoppers.js';
import { db } from './db.js';
import * as growth from './growth.js';
import { cleanCustomerReply } from './clean.js';

const obj = (props, required = []) => ({ type: 'object', properties: props, required });
const str = (description) => ({ type: 'string', description });
export const toJid = (phone) => {
  let d = digitsOf(phone);
  if (d.length === 10) d = `91${d}`;
  return `${d}@s.whatsapp.net`;
};

function productTools() {
  return {
    find_products: {
      description: 'Find in-stock products that fit. Returns name, price, link, tier, gift fit, occasions, sustainability facts from the product page, and an upsell. Pass budget_max/occasion/gift when known.',
      parameters: obj({
        query: str('What they want, e.g. "honey gift", "coconut oil 1 litre", "christmas hamper"'),
        budget_max: { type: 'integer', description: 'Max rupees, if they gave a budget' },
        budget_min: { type: 'integer' },
        occasion: str('christmas, wedding, housewarming, birthday, corporate, onam...'),
        gift: { type: 'boolean' }, sustainable: { type: 'boolean' }, edible: { type: 'boolean' },
      }, ['query']),
      run: (a) => findProducts(a),
    },
    product_details: {
      description: 'Full details of one product by id (what is inside, description, image, sustainability facts).',
      parameters: obj({ id: { type: 'integer' } }, ['id']),
      run: ({ id }) => productById(id),
    },
    list_categories: {
      description: 'Product categories with counts, to know what the shop sells.',
      parameters: obj({}),
      run: () => woo.categories(),
    },
  };
}

export async function isShopper(text) {
  // Only a clear NOT keeps Eco out; an empty or odd answer counts as a shopper (the chat agent can still
  // call not_a_customer), so a model hiccup never silences a real customer for good.
  try { return !/^NOT\b/.test(await classify(CLASSIFY_PROMPT, text)); } catch { return true; }
}

export async function customerTurn({ chatId, phone = '', name = '', channel, text, notifyOwner, cards }) {
  store.push(chatId, 'user', text);
  store.bump(channel === 'WhatsApp' ? 'whatsapp_messages' : 'web_messages');
  const pr = profileFor(chatId, { phone, name, channel });
  const det = noteInbound(pr, text);
  if (/^\s*(stop|unsubscribe)\s*$/i.test(text) && phone) {
    store.optOut(phone);
    pr.opted_out = true; pr.follow_up_due = 0; db.metric('opt_outs');
    const t = 'Done, you won\'t get any more offers from us. You can still message here any time 🙂';
    store.push(chatId, 'assistant', t);
    return t;
  }
  if (det.intents.includes('not_interested')) pr.follow_up_due = 0;
  let silent = false;
  const tools = {
    ...productTools(),
    check_offer: {
      description: 'Check FIRST50 eligibility, shipping, payable total and the Christmas order-by date for a cart total.',
      parameters: obj({ cart_total: { type: 'integer', description: 'Cart value in rupees before shipping' } }, ['cart_total']),
      run: ({ cart_total }) => checkOffer({ cart_total, phone: phone || pr.phone }),
    },
    update_shopper: {
      description: 'Save what you learned about this shopper so Eco remembers next time (any field optional).',
      parameters: obj({
        budget: str('e.g. Rs 1000'), occasion: str(''), recipient: str(''), quantity: str(''), language: str('en, ml or manglish'),
        buying_stage: str('browse, considering, ready or purchased'), interests: { type: 'array', items: { type: 'string' } },
        viewed_products: { type: 'array', items: { type: 'string' } }, objection: str('price, delivery time, trust, quality, need time...'),
        note: str('Anything useful for the next chat'), lead_score_change: { type: 'integer', description: '-30 to 30' },
      }),
      run: (a) => ({ profile: updateProfile(pr, a) }),
    },
    create_follow_up: {
      description: 'Schedule ONE polite follow-up when the shopper asks to be reminded or wants time to think. WhatsApp only.',
      parameters: obj({ hours: { type: 'integer', description: 'Hours from now, at least 6 unless they asked for sooner' }, reason: str('What to follow up about') }, ['reason']),
      run: ({ hours = 24, reason }) => (phone ? scheduleFollowUp(pr, { hours, reason }) : { error: 'Website chat: offer to continue on WhatsApp +91 70121 45854 instead.' }),
    },
    order_status: {
      description: 'Look up an order by order number. On the website also pass the phone used on the order.',
      parameters: obj({ order_id: { type: 'integer' }, phone: str('Phone on the order (website only)') }, ['order_id']),
      run: async ({ order_id, phone: p }) => {
        const r = await woo.orderStatus(order_id, p || phone);
        if (r?.found && p && !phone) profileFor(chatId, { phone: p, channel }); // website shopper identified: share memory
        return r;
      },
    },
    my_orders: {
      description: "This WhatsApp customer's recent orders (uses their phone automatically).",
      parameters: obj({}),
      run: () => (phone ? woo.ordersByPhone(phone) : { error: 'Ask for the order number and the phone used.' }),
    },
    hand_to_owner: {
      description: 'Bring in Roshan (human) for complaints, refunds, damage, bulk/corporate/custom orders, angry customers, unverifiable questions and high-value leads. Eco stops replying in this chat until Roshan resumes it.',
      parameters: obj({ reason: str('Short reason, e.g. "wants 50 custom hampers for office by 20 Dec"'), recommended_action: str('What Roshan should do next') }, ['reason']),
      run: async ({ reason, recommended_action = '' }) => {
        store.pauseChat(chatId, reason);
        store.bump('handoffs'); db.metric('handoffs');
        pr.handoff = true;
        await notifyOwner?.(`Needs you: ${channel}${phone ? ` +${phone}` : ''}${name ? ` (${name})` : ''}\nWhy: ${reason}${recommended_action ? `\nSuggested: ${recommended_action}` : ''}\nShopper: ${summary(pr)}\nThey said: "${text.slice(0, 300)}"\nWhen done, send "hey eco resume ${phone || chatId}".`);
        return { ok: true, tell_customer: 'Roshan will message personally soon.' };
      },
    },
    not_a_customer: {
      description: 'This person is not a shopper (personal chat, Darts AI/website business, spam). Eco stays silent in this chat.',
      parameters: obj({ reason: str('Short reason') }, ['reason']),
      run: ({ reason }) => { store.setChatKind(chatId, 'other'); silent = true; pr.lead_score = 0; return { ok: true, reason }; },
    },
  };
  const detected = [det.intents.join(', '), det.objection && `objection: ${det.objection}`].filter(Boolean).join('; ');
  const usePro = pr.lead_score >= 70 || det.intents.some((i) => ['bulk', 'complaint'].includes(i));
  const history = store.history(chatId).map(({ role, content }) => ({ role, content }));
  const system = customerPrompt(channel, { name, phone, profile: summary(pr), detected, style: styleText(pr.variant) });
  const { text: raw } = await runAgent(system, history, tools, usePro ? { model: PRO() } : {});
  if (silent) return '';
  const reply = cleanCustomerReply(raw);
  if (reply) {
    store.push(chatId, 'assistant', reply);
    let recommended = [];
    try { recommended = await productsInText(reply); } catch {}
    noteOutbound(pr, reply, recommended);
    if (Array.isArray(cards)) for (const p of recommended.slice(0, 2)) cards.push({ name: p.name, price: p.price, url: p.url, image: p.image });
  }
  return reply;
}

export async function ownerTurn({ text, sendTo, broadcast }) {
  const tools = {
    ...productTools(),
    ...supplierOwnerTools,
    eco_status: {
      description: "Eco's state: paused?, today's stats, queue size, paused chats, instructions, orders connected?",
      parameters: obj({}),
      run: () => ({
        paused: store.paused, today: store.statsToday(), queue: store.queue().length,
        paused_chats: Object.keys(store.pausedChats()).length, instructions: store.notes().map((n) => n.text),
        orders_connected: hasOrders(),
      }),
    },
    sales_report: {
      description: 'Orders and revenue for the last N days from WooCommerce.',
      parameters: obj({ days: { type: 'integer', description: 'Default 1' } }),
      run: async ({ days = 1 }) => (hasOrders() ? woo.salesSummary(days) : { error: 'Add the WooCommerce key first (see README).' }),
    },
    set_paused: {
      description: 'Pause (true) or resume (false) Eco for everyone.',
      parameters: obj({ paused: { type: 'boolean' } }, ['paused']),
      run: ({ paused }) => { store.setPaused(paused); return { paused }; },
    },
    pause_chat: {
      description: 'Stop Eco replying to one customer.',
      parameters: obj({ phone: str('Phone, e.g. 9876543210') }, ['phone']),
      run: ({ phone }) => { store.pauseChat(toJid(phone), 'owner'); return { ok: true }; },
    },
    resume_chat: {
      description: 'Let Eco reply again in one chat (phone, or a web:/lid chat id).',
      parameters: obj({ phone: str('Phone or chat id') }, ['phone']),
      run: ({ phone }) => {
        const id = /@|^web:/.test(phone) ? phone : toJid(phone);
        store.resumeChat(id);
        for (const k of Object.keys(store.pausedChats())) if (digitsOf(k).endsWith(digitsOf(phone).slice(-10))) store.resumeChat(k);
        return { ok: true };
      },
    },
    list_paused: {
      description: 'Chats where Eco is paused, with reasons.',
      parameters: obj({}),
      run: () => ({ all_paused: store.paused, chats: store.pausedChats() }),
    },
    add_instruction: {
      description: 'Add a standing selling instruction, e.g. "push the Honey Trio this week".',
      parameters: obj({ text: str('Instruction') }, ['text']),
      run: ({ text: t }) => { store.addNote(t); return { instructions: store.notes().map((n) => n.text) }; },
    },
    clear_instructions: {
      description: 'Remove all standing instructions.',
      parameters: obj({}),
      run: () => { store.clearNotes(); return { ok: true }; },
    },
    message_customer: {
      description: 'Send a WhatsApp message to ONE person who has messaged EcoCart before.',
      parameters: obj({ phone: str('Phone'), message: str('Exact text to send') }, ['phone', 'message']),
      run: async ({ phone, message }) => {
        const jid = toJid(phone);
        const known = store.knownChats().find((k) => digitsOf(k).endsWith(digitsOf(phone).slice(-10)));
        if (!known) return { error: 'This number has never messaged EcoCart, so Eco will not message it first.' };
        await sendTo(known || jid, message);
        store.push(known, 'assistant', message);
        return { sent: true };
      },
    },
    order_lookup: {
      description: 'Look up any order by number (owner).',
      parameters: obj({ order_id: { type: 'integer' } }, ['order_id']),
      run: ({ order_id }) => woo.ownerOrder(order_id),
    },
    queue_status: {
      description: 'Pending automatic messages (order alerts, cart recovery, reorder nudges, broadcast) and send limits.',
      parameters: obj({}),
      run: () => broadcast.status(),
    },
    clear_queue: {
      description: 'Cancel pending automatic messages, optionally only one kind: alert, recovery, reorder, broadcast.',
      parameters: obj({ kind: str('Optional kind') }),
      run: ({ kind }) => { store.clearQueue(kind); return { ok: true, left: store.queue().length }; },
    },
    broadcast_preview: {
      description: 'Prepare a broadcast. audience: "past_customers" (people who ordered) or "chatted" (people who messaged on WhatsApp). Returns the count; nothing is sent yet.',
      parameters: obj({ message: str('Message text. {name} is replaced with the first name.'), audience: str('past_customers or chatted') }, ['message', 'audience']),
      run: ({ message, audience }) => broadcast.preview(message, audience),
    },
    broadcast_confirm: {
      description: 'Queue the prepared broadcast. Only after Roshan said yes to the preview.',
      parameters: obj({}),
      run: () => { db.log('broadcast_history', { draft: store.broadcastDraft()?.id, message: store.broadcastDraft()?.message, recipients: store.broadcastDraft()?.people?.length }); return broadcast.confirm(); },
    },
    growth_snapshot: {
      description: 'Everything needed for strategy questions: sales today/7d, best sellers, Eco funnel metrics, top recommended products, top objections, message-style results, high-intent leads, reorder candidates, bundles in stock, festival calendar.',
      parameters: obj({}),
      run: () => growth.growthSnapshot(),
    },
    growth_plan: {
      description: 'Write today\'s selling plan now (what to push, who to follow up, which offer, a broadcast idea).',
      parameters: obj({}),
      run: async () => ({ plan: await growth.morningPlan() }),
    },
    high_intent_leads: {
      description: 'Shoppers most likely to buy, with score, stage, budget, occasion, what was recommended and objections.',
      parameters: obj({ limit: { type: 'integer' } }),
      run: ({ limit = 10 }) => growth.highIntentLeads(limit),
    },
    reorder_candidates: {
      description: 'Past customers whose consumables (honey, ghee, oil, spices...) are likely running low now.',
      parameters: obj({}),
      run: () => growth.reorderCandidates(),
    },
    best_sellers: {
      description: 'Best-selling products by revenue over N days.',
      parameters: obj({ days: { type: 'integer', description: 'Default 7' } }),
      run: ({ days = 7 }) => growth.bestSellers(days),
    },
    abandoned_carts: {
      description: 'Abandoned carts (only once a cart-tracking source sends events to Eco).',
      parameters: obj({}),
      run: () => growth.abandonedCarts(),
    },
    analyze_chat: {
      description: 'A shopper profile and the last 30 messages of their chat, to analyse what happened.',
      parameters: obj({ phone: str('Phone') }, ['phone']),
      run: ({ phone }) => growth.analyzeChat(phone),
    },
  };
  const history = store.history('owner').slice(-10).map(({ role, content }) => ({ role, content }));
  if (!history.length || history[history.length - 1].content !== text) history.push({ role: 'user', content: text });
  const { text: reply } = await runAgent(ownerPrompt(), history, tools, { model: PRO(), maxTokens: 4000 });
  return reply;
}
