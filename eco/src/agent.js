// Tool sets and one conversation turn for a customer or for Roshan.
import { runAgent, classify } from './llm.js';
import { customerPrompt, ownerPrompt, CLASSIFY_PROMPT } from './prompt.js';
import { store, digitsOf } from './store.js';
import { hasOrders } from './config.js';
import * as woo from './woo.js';
import { supplierOwnerTools } from './suppliers.js';

const obj = (props, required = []) => ({ type: 'object', properties: props, required });
const str = (description) => ({ type: 'string', description });
export const toJid = (phone) => {
  let d = digitsOf(phone);
  if (d.length === 10) d = `91${d}`;
  return `${d}@s.whatsapp.net`;
};

function productTools() {
  return {
    search_products: {
      description: 'Search the live EcoCart catalogue (name, price in rupees, stock, link, summary).',
      parameters: obj({ query: str('What they want, e.g. "honey gift", "coconut oil 1 litre", "christmas hamper"') }, ['query']),
      run: ({ query }) => woo.searchProducts(query),
    },
    product_details: {
      description: 'Full details of one product by id (what is inside, description, image).',
      parameters: obj({ id: { type: 'integer' } }, ['id']),
      run: ({ id }) => woo.getProduct(id),
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

export async function customerTurn({ chatId, phone = '', name = '', channel, text, notifyOwner }) {
  store.push(chatId, 'user', text);
  store.bump(channel === 'WhatsApp' ? 'whatsapp_messages' : 'web_messages');
  if (/^\s*(stop|unsubscribe)\s*$/i.test(text) && phone) {
    store.optOut(phone);
    const t = 'Done, you won\'t get any more offers from us. You can still message here any time 🙂';
    store.push(chatId, 'assistant', t);
    return t;
  }
  let silent = false;
  const tools = {
    ...productTools(),
    order_status: {
      description: 'Look up an order by order number. On the website also pass the phone used on the order.',
      parameters: obj({ order_id: { type: 'integer' }, phone: str('Phone on the order (website only)') }, ['order_id']),
      run: ({ order_id, phone: p }) => woo.orderStatus(order_id, p || phone),
    },
    my_orders: {
      description: "This WhatsApp customer's recent orders (uses their phone automatically).",
      parameters: obj({}),
      run: () => (phone ? woo.ordersByPhone(phone) : { error: 'Ask for the order number and the phone used.' }),
    },
    hand_to_owner: {
      description: 'Bring in Roshan (human). Eco stops replying in this chat until Roshan resumes it.',
      parameters: obj({ reason: str('Short reason, e.g. "wants 50 custom hampers for office"') }, ['reason']),
      run: async ({ reason }) => {
        store.pauseChat(chatId, reason);
        store.bump('handoffs');
        await notifyOwner?.(`Needs you: ${channel}${phone ? ` +${phone}` : ''}${name ? ` (${name})` : ''}\nWhy: ${reason}\nThey said: "${text.slice(0, 300)}"\nWhen done, send "hey eco resume ${phone || chatId}".`);
        return { ok: true, tell_customer: 'Roshan will message personally soon.' };
      },
    },
    not_a_customer: {
      description: 'This person is not a shopper (personal chat, Darts AI/website business, spam). Eco stays silent in this chat.',
      parameters: obj({ reason: str('Short reason') }, ['reason']),
      run: ({ reason }) => { store.setChatKind(chatId, 'other'); silent = true; return { ok: true, reason }; },
    },
  };
  const history = store.history(chatId).map(({ role, content }) => ({ role, content }));
  const { text: reply } = await runAgent(customerPrompt(channel, { name, phone }), history, tools);
  if (silent) return '';
  if (reply) store.push(chatId, 'assistant', reply);
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
      run: () => broadcast.confirm(),
    },
  };
  const history = store.history('owner').slice(-10).map(({ role, content }) => ({ role, content }));
  if (!history.length || history[history.length - 1].content !== text) history.push({ role: 'user', content: text });
  const { text: reply } = await runAgent(ownerPrompt(), history, tools);
  return reply;
}
