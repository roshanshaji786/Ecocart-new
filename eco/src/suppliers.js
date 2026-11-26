// Supplier outreach for Roshan's own house (not EcoCart): asks uPVC window suppliers to quote on an RFQ.
// Ban-safety on the free WhatsApp connection: only ONE short starter per supplier, each written fresh by
// DeepSeek so no two look alike, long random gaps between starters, office hours only, no links or files
// in the first message. The RFQ PDF goes only after the supplier replies. Replies are handled with the RFQ
// as context; quotes and anything Eco cannot answer are passed to Roshan.
//
// Private data (supplier list, RFQ PDF and its text) never lives in git: it comes from the project
// environment (SUPPLIERS_SEED) and from URLs (RFQ_URL, RFQ_TEXT_URL) downloaded once into the data volume.
import fs from 'node:fs';
import path from 'node:path';
import { store, digitsOf } from './store.js';
import { runAgent, complete } from './llm.js';

const DIR = path.resolve(process.env.DATA_DIR || 'data', 'suppliers');
fs.mkdirSync(DIR, { recursive: true });
const PDF = path.join(DIR, 'rfq.pdf');
const TXT = path.join(DIR, 'rfq.txt');
const num = (v, d) => (v === undefined || v === '' ? d : Number(v));

const cfg = {
  gapMin: num(process.env.SUPPLIER_GAP_MIN, 200), // minutes between starters (random in [min, max])
  gapMax: num(process.env.SUPPLIER_GAP_MAX, 260),
  hoursStart: num(process.env.SUPPLIER_HOURS_START, 10),
  hoursEnd: num(process.env.SUPPLIER_HOURS_END, 18),
  pdfName: process.env.RFQ_FILE_NAME || 'RFQ_uPVC_Windows_Roshan_Shaji.pdf',
  site: process.env.RFQ_SITE || 'Thiruvallam, Thiruvananthapuram',
};

let wa = null; // { sendText, sendDocument, exists, notifyOwner, forwardToOwner }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);
const nowIST = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
const key10 = (p) => digitsOf(p).slice(-10);
const jidOf = (p) => `91${key10(p)}@s.whatsapp.net`;

// ---- state ----
const all = () => store.get('suppliers', {});
const saveAll = (s) => store.set('suppliers', s);
const camp = () => store.get('supplier_campaign', { active: false, nextAt: 0 });
const setCamp = (c) => store.set('supplier_campaign', { ...camp(), ...c });

export function supplierFor(chatId) {
  if (!chatId.endsWith('@s.whatsapp.net')) return null;
  const s = all()[key10(chatId)];
  return s && s.status !== 'queued' && s.status !== 'skipped' ? s : null;
}
function update(phone, patch) {
  const s = all();
  const k = key10(phone);
  if (!s[k]) return null;
  s[k] = { ...s[k], ...patch, updatedAt: Date.now() };
  saveAll(s);
  return s[k];
}
export function addSuppliers(list) {
  const s = all();
  let added = 0;
  for (const { name, phone, note } of list) {
    const k = key10(phone || '');
    if (k.length !== 10 || s[k]) continue;
    s[k] = { name: (name || '').trim(), phone: `91${k}`, note: note || '', status: 'queued', addedAt: Date.now() };
    added++;
  }
  saveAll(s);
  return { added, total: Object.keys(s).length };
}

// ---- RFQ files ----
const rfqText = () => { try { return fs.readFileSync(TXT, 'utf8'); } catch { return ''; } };
const hasPdf = () => fs.existsSync(PDF);
export function saveRfqPdf(buf, name) {
  fs.writeFileSync(PDF, buf);
  if (name) store.set('rfq_pdf_name', name);
}
async function download(url, file) {
  if (!url || fs.existsSync(file)) return;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  console.log(`Saved ${path.basename(file)} for supplier outreach`);
}

// ---- starters ----
const STARTER_PROMPT = `You write ONE short first WhatsApp message from a house owner in Thiruvananthapuram, Kerala, to a uPVC windows business he has never contacted.
Facts: new house at ${cfg.site}; needs uPVC windows and sliding doors, about 17 units (around 385 sq ft), white, 5 mm toughened glass; he has the full list with sizes ready.
Goal of this message: just open the chat. Ask, in your own way, whether they can give a quotation (or whether they do work in this area). Do NOT include the size list, any link, price, or a file.
Style: like a real person typing on a phone. 1 or 2 short sentences, 8 to 30 words. Vary everything: greeting or no greeting, English or light Manglish (Malayalam words in English letters), word order, which detail you mention, punctuation, capitalisation. No emojis or at most one. Never sound like a template, ad or bot. Do not sign with a name.
Output only the message text.`;

async function writeStarter(s) {
  const previous = store.get('supplier_starters', []).slice(-12);
  const user = `Business name: ${s.name || 'unknown'}${s.note ? ` (${s.note})` : ''}.
Messages already sent to other businesses (yours must look clearly different in wording, length and opening):
${previous.map((p) => `- ${p}`).join('\n') || '- none yet'}`;
  for (let i = 0; i < 3; i++) {
    const msg = await complete([{ role: 'system', content: STARTER_PROMPT }, { role: 'user', content: user }], null, { maxTokens: 120, temperature: 1.1 });
    const t = (msg.content || '').trim().replace(/^["']|["']$/g, '');
    const first4 = (x) => x.toLowerCase().split(/\s+/).slice(0, 4).join(' ');
    if (t && t.length < 260 && !/https?:|\.pdf|₹|rs\.?\s?\d/i.test(t) && !previous.some((p) => first4(p) === first4(t))) return t;
  }
  throw new Error('could not write a distinct starter');
}

// ---- scheduler: one starter at a time, long random gaps, office hours ----
function inHours() {
  const n = nowIST();
  return n.getDay() !== 0 && n.getHours() >= cfg.hoursStart && n.getHours() < cfg.hoursEnd;
}
let busy = false;
async function tick() {
  const c = camp();
  if (busy || !wa || !c.active || store.paused || Date.now() < (c.nextAt || 0) || !inHours()) return;
  const next = Object.values(all()).find((s) => s.status === 'queued');
  if (!next) { setCamp({ active: false }); await wa.notifyOwner('Supplier outreach: all starters sent. I will keep handling their replies.'); return; }
  busy = true;
  try {
    const jid = jidOf(next.phone);
    if (!(await wa.exists(jid))) { update(next.phone, { status: 'skipped', why: 'not on WhatsApp' }); return; }
    const text = await writeStarter(next);
    await wa.sendText(jid, text);
    store.push(jid, 'assistant', text);
    store.setChatKind(jid, 'supplier');
    update(next.phone, { status: 'started', startedAt: Date.now(), starter: text });
    store.set('supplier_starters', [...store.get('supplier_starters', []), text].slice(-30));
    store.bump('sent_supplier_starter');
    const gap = rand(cfg.gapMin, cfg.gapMax) * 60000;
    setCamp({ nextAt: Date.now() + gap, lastAt: Date.now() });
    console.log(`Supplier starter sent to ${next.name || next.phone}; next in ${Math.round(gap / 60000)} min`);
  } catch (e) {
    console.error('supplier starter failed', e.message);
    setCamp({ nextAt: Date.now() + 20 * 60000 });
  } finally {
    busy = false;
  }
}

// ---- replies ----
function replyPrompt(s) {
  return `You are replying on WhatsApp for Roshan Shaji, who is building his house at ${cfg.site}, Kerala, and is collecting quotations for uPVC windows. This chat is with "${s.name || 'a uPVC supplier'}", who got a short first message from us asking if they can quote.
Write as Roshan's side ("we", "my house"), short and natural, like a real Kerala customer on WhatsApp. Mirror their language (English, Malayalam or Manglish). 1 to 3 short lines, no lists or headings. A blank line splits two bubbles.

YOUR GOAL: get a written, itemised quotation for the windows in the RFQ below.
- As soon as they show interest or ask for details/sizes/drawings, call send_rfq (it sends the RFQ PDF, only once) and ask them to fill in their rate for each item and send their quotation as a PDF here.
- What we want in the quote: rate per sq ft and amount per item, profile brand and series, glass, hardware brand, GST, transport/freight, unloading, installation, warranty (profile and hardware), payment terms, delivery time, validity.
- Answer questions using ONLY the RFQ details below. Sizes in the RFQ are final for quoting; they can quote their equivalent profile.
- When they share prices or a quotation in text, call record_quote with a short summary and thank them.
- Site address: ${cfg.site}; Roshan will share the exact location when needed. Site visit, measurement visit, phone call, discounts, negotiation, advance, ordering, or anything not in the RFQ: call hand_to_roshan and say Roshan will contact them.
- Never agree to an order, a price or a payment. Never mention EcoCart or any shop. Never invent facts.
- If they say they don't do this work or are not interested, thank them politely and call mark_not_interested.
- If someone sincerely asks whether you are a bot or a real person, do not lie: say you're an assistant helping Roshan collect quotes and he can call them.

RFQ (our request for quotation, all items white, quantity 1 each):
${rfqText().slice(0, 9000) || '17 uPVC windows and sliding doors, 384.95 sq ft total, white, 5 mm toughened glass, 60 series European slider and casement systems. Full list with sizes is in the PDF.'}`;
}

export async function supplierTurn({ chatId, text, notifyOwner }) {
  const s = supplierFor(chatId);
  store.push(chatId, 'user', text);
  if (!s.repliedAt) {
    update(chatId, { status: 'talking', repliedAt: Date.now() });
    await notifyOwner(`Supplier replied: ${s.name || ''} +${s.phone}\n"${text.slice(0, 200)}"`);
  }
  let rfqSent = !!s.rfqSentAt;
  const tools = {
    send_rfq: {
      description: 'Send our RFQ PDF (all window sizes, drawings and specs) in this chat. Only once.',
      parameters: { type: 'object', properties: {} },
      run: async () => {
        if (rfqSent) return { already_sent: true };
        if (!hasPdf()) { await notifyOwner(`Supplier ${s.name} +${s.phone} wants the RFQ but I don't have the PDF. Send it to me with "hey eco rfq".`); return { error: 'PDF not available yet; say you will send it shortly.' }; }
        await wa.sendDocument(chatId, fs.readFileSync(PDF), store.get('rfq_pdf_name', cfg.pdfName));
        rfqSent = true;
        update(chatId, { rfqSentAt: Date.now(), status: 'rfq_sent' });
        return { sent: true };
      },
    },
    record_quote: {
      description: 'Save a quote or prices the supplier gave in text, and tell Roshan.',
      parameters: { type: 'object', properties: { summary: { type: 'string' } }, required: ['summary'] },
      run: async ({ summary }) => {
        update(chatId, { status: 'quoted', quote: summary, quotedAt: Date.now() });
        await notifyOwner(`Quote from ${s.name} +${s.phone}:\n${summary}`);
        return { ok: true };
      },
    },
    hand_to_roshan: {
      description: 'Ask Roshan to take over (site visit, call, negotiation, anything outside the RFQ). Eco stops replying in this chat.',
      parameters: { type: 'object', properties: { reason: { type: 'string' } }, required: ['reason'] },
      run: async ({ reason }) => {
        store.pauseChat(chatId, `supplier: ${reason}`);
        update(chatId, { handedOff: reason });
        await notifyOwner(`Supplier needs you: ${s.name} +${s.phone}\nWhy: ${reason}\nThey said: "${text.slice(0, 300)}"\nWhen done: "hey eco resume ${s.phone.slice(-10)}"`);
        return { ok: true };
      },
    },
    mark_not_interested: {
      description: 'They do not do this work or declined.',
      parameters: { type: 'object', properties: {} },
      run: () => { update(chatId, { status: 'declined' }); return { ok: true }; },
    },
  };
  const history = store.history(chatId).map(({ role, content }) => ({ role, content }));
  const { text: reply } = await runAgent(replyPrompt(s), history, tools);
  if (reply) store.push(chatId, 'assistant', reply);
  return reply;
}

// A document or photo from a supplier is usually the quotation: forward it to Roshan.
export async function supplierFile({ chatId, message, caption }) {
  const s = supplierFor(chatId);
  update(chatId, { status: 'quoted', quotedAt: Date.now(), quoteFile: true });
  await wa.forwardToOwner(message, `Quotation file from ${s.name} +${s.phone}${caption ? `: ${caption}` : ''}`);
}

// ---- owner controls (used by "hey eco …") ----
export const supplierOwnerTools = {
  supplier_status: {
    description: "Supplier outreach for Roshan's house windows: each supplier's status (queued, started, talking, rfq_sent, quoted, declined, skipped), quotes, next send time.",
    parameters: { type: 'object', properties: {} },
    run: () => {
      const c = camp();
      return {
        active: c.active, next_starter_at: c.nextAt ? new Date(c.nextAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : null,
        gap_minutes: `${cfg.gapMin}-${cfg.gapMax}`, hours: `${cfg.hoursStart}:00-${cfg.hoursEnd}:00 Mon-Sat`, rfq_pdf: hasPdf(),
        suppliers: Object.values(all()).map((s) => ({ name: s.name, phone: s.phone, status: s.status, quote: s.quote, handed_off: s.handedOff })),
      };
    },
  },
  supplier_start: {
    description: 'Start (true) or pause (false) sending supplier starters.',
    parameters: { type: 'object', properties: { active: { type: 'boolean' } }, required: ['active'] },
    run: ({ active }) => { setCamp({ active }); return { active }; },
  },
  supplier_add: {
    description: 'Add suppliers to the outreach list.',
    parameters: { type: 'object', properties: { suppliers: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, phone: { type: 'string' } }, required: ['phone'] } } }, required: ['suppliers'] },
    run: ({ suppliers }) => addSuppliers(suppliers),
  },
  supplier_skip: {
    description: 'Remove one queued supplier from the outreach (by phone).',
    parameters: { type: 'object', properties: { phone: { type: 'string' } }, required: ['phone'] },
    run: ({ phone }) => (update(phone, { status: 'skipped', why: 'owner' }) ? { ok: true } : { error: 'not found' }),
  },
};

export async function startSuppliers(deps) {
  wa = deps;
  try { await download(process.env.RFQ_URL, PDF); } catch (e) { console.error('RFQ pdf', e.message); }
  try { await download(process.env.RFQ_TEXT_URL, TXT); } catch (e) { console.error('RFQ text', e.message); }
  // SUPPLIERS_SEED="Name|9876543210;Name 2|9123456789" (project env, not git). Added once each.
  const seed = (process.env.SUPPLIERS_SEED || '').split(';').map((x) => x.split('|')).filter((x) => x[1])
    .map(([name, phone]) => ({ name, phone }));
  if (seed.length) console.log('Suppliers', addSuppliers(seed));
  // SUPPLIER_START=<any id>: start the campaign once for that id (so a restart does not restart it).
  const startId = process.env.SUPPLIER_START || '';
  if (startId && !store.isDone(`supplier-start:${startId}`)) {
    store.markDone(`supplier-start:${startId}`);
    setCamp({ active: true, nextAt: Date.now() + rand(2, 8) * 60000 });
    console.log('Supplier outreach started');
  }
  setInterval(() => tick().catch(() => {}), 60 * 1000);
}
