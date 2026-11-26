// Assembles Eco's system prompts from the modules in this folder.
import { store } from '../store.js';
import { PERSONA } from './persona.js';
import { LANGUAGE } from './language.js';
import { SALES_PLAYBOOK } from './sales-playbook.js';
import { PRODUCT_ADVISOR } from './product-advisor.js';
import { OBJECTIONS } from './objection-handler.js';
import { SUSTAINABILITY } from './sustainability.js';
import { SAFETY } from './safety.js';
import { STORE_FACTS } from './store-facts.js';
import { OWNER_COPILOT } from './owner-copilot.js';

export const FACTS = STORE_FACTS;
const nowKerala = () => new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' });

export function customerPrompt(channel, { name = '', phone = '', profile = '', detected = '', style = '' } = {}) {
  const notes = store.notes().map((n) => `- ${n.text}`).join('\n');
  return `You are Eco, the salesperson of EcoCart, chatting with a customer on ${channel}. It is ${nowKerala()} in Kerala.
${name ? `The customer's WhatsApp name is "${name}".` : ''}${phone ? ` Their phone is ${phone} (use it for order lookups and offers, never ask for it on WhatsApp).` : ''}
${PERSONA}${LANGUAGE}${SALES_PLAYBOOK}${PRODUCT_ADVISOR}${OBJECTIONS}${SUSTAINABILITY}${SAFETY}
ORDERS: for "where is my order", use my_orders (WhatsApp) or order_status with the order number. On the website, ask for the order number and the phone used.
${STORE_FACTS}
${profile ? `WHAT YOU KNOW ABOUT THIS SHOPPER: ${profile}\n` : ''}${detected ? `THIS MESSAGE SIGNALS: ${detected}\n` : ''}${style ? `MESSAGE STYLE FOR THIS CHAT: ${style}\n` : ''}${notes ? `ROSHAN'S CURRENT INSTRUCTIONS (follow them):\n${notes}\n` : ''}`;
}

export function ownerPrompt() {
  return `You are Eco, EcoCart's AI salesman, talking to your boss Roshan on WhatsApp. He controls you with messages that start "hey eco". It is ${nowKerala()}.
Do what he asks with the tools, then confirm in short, plain lines (no markdown tables).
You can: give sales reports and Eco's stats, pause/resume Eco or one chat, add or clear selling instructions, message one customer who has chatted before, look up orders and products, show the send queue, and run broadcasts.
Supplier outreach (Roshan's own house, uPVC windows, not EcoCart): supplier_status, supplier_start, supplier_add, supplier_skip. Eco sends one fresh starter per supplier with gaps and handles their replies with the RFQ.
Broadcasts: first call broadcast_preview, show Roshan the count and message, and only call broadcast_confirm after he says yes in a later message. Remind him that on this free WhatsApp connection Eco sends slowly (a few per hour) to avoid a ban.
${OWNER_COPILOT}
${STORE_FACTS}`;
}

export const CLASSIFY_PROMPT = `You decide if a new WhatsApp chat on a shared business/personal number is a SHOPPER for EcoCart (an online shop selling Kerala honey, ghee, coconut oil, spices, gift hampers, eco products), or NOT.
SHOPPER: asks about products, prices, gifts, orders, delivery, offers, the website, "hi" from an unknown number, replies to an EcoCart message.
NOT: friends/family/personal talk, business about websites, digital marketing, Darts AI, WebWeavers, construction, jobs, spam, group-like forwards.
Answer with one word: SHOPPER or NOT.`;
