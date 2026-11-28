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
  gapMin: num(process.env.SUPPLIER_GAP_MIN, 13), // minutes between starters (random in [min, max])
  gapMax: num(process.env.SUPPLIER_GAP_MAX, 18),
  hoursStart: num(process.env.SUPPLIER_HOURS_START, 10),
  hoursEnd: num(process.env.SUPPLIER_HOURS_END, 20),
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
  for (const { name, phone, note, test } of list) {
    const k = key10(phone || '');
    if (k.length !== 10 || s[k]) continue;
    s[k] = { name: (name || '').trim(), phone: `91${k}`, note: note || '', status: 'queued', addedAt: Date.now(), ...(test ? { test: true } : {}) };
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
Goal of this message: simply ask them for a quotation for uPVC windows for the house. Keep it simple. Do NOT include the size list, any link, price, or a file.
Language: Manglish only (Malayalam written in English letters, mixed with common English words like uPVC, window, quotation, house), e.g. the way people type "quotation tharamo", "venam", "onnu ayakkamo".
Style: like a real person typing on a phone. 1 short sentence (or 2 very short), 6 to 20 words. Vary everything: greeting or no greeting, word order, which detail you mention, punctuation, capitalisation. No emojis or at most one, no em dashes. Any time greeting must match the time given. Never sound like a template, ad or bot. Do not sign with a name.
Output only the message text.`;

async function writeStarter(s, extra = []) {
  const previous = [...store.get('supplier_starters', []), ...extra].slice(-12);
  const time = nowIST().toLocaleString('en-IN', { weekday: 'long', hour: 'numeric', minute: '2-digit' });
  const user = `Now: ${time} in Kerala.\nBusiness name: ${s.name || 'unknown'}${s.note ? ` (${s.note})` : ''}.
Messages already sent to other businesses (yours must look clearly different in wording, length and opening):
${previous.map((p) => `- ${p}`).join('\n') || '- none yet'}`;
  for (let i = 0; i < 3; i++) {
    const msg = await complete([{ role: 'system', content: STARTER_PROMPT }, { role: 'user', content: user }], null, { maxTokens: 2000, temperature: 1.1 });
    const t = (msg.content || '').trim().replace(/^["']|["']$/g, '').replace(/\s*[—–]\s*/g, ', ');
    const first4 = (x) => x.toLowerCase().split(/\s+/).slice(0, 4).join(' ');
    if (!t) { console.error('starter: empty reply', msg.reasoning_content ? '(reasoning only)' : ''); continue; }
    if (t.length < 260 && !/https?:|\.pdf|₹|rs\.?\s?\d/i.test(t) && !previous.some((p) => first4(p) === first4(t))) return t;
    console.error('starter rejected:', t.slice(0, 120));
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
  const testOnly = /^(1|true|yes)$/i.test(process.env.SUPPLIER_TEST_ONLY || '');
  const queued = Object.values(all()).filter((s) => s.status === 'queued' && (!testOnly || s.test));
  const next = queued.find((s) => s.test) || queued[0];
  if (!next && testOnly) return; // trial mode: real suppliers wait until Roshan approves
  if (!next) { setCamp({ active: false }); console.log('Supplier outreach: all starters sent.'); return; }
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
    const gap = next.test ? rand(1, 3) * 60000 : rand(cfg.gapMin, cfg.gapMax) * 60000;
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
Write as Roshan's side ("we", "my house"), short and natural, like a real Kerala customer on WhatsApp. Write in Manglish (Malayalam in English letters) by default; if they write in English or Malayalam script, mirror them. ONE short line only (under 20 words), no small talk, no lists. Do not ask follow-up questions beyond asking for the quotation.

YOUR GOAL: get a written, itemised quotation for the windows in the RFQ below.
- On their first reply (any interest, a question, or asking for details), call send_rfq right away (it sends the RFQ PDF, only once) and ask them to send their quotation for it.
- After the PDF is sent, reply only if they ask something you must answer; otherwise output NOTHING at all (completely empty). Never write notes like "(no reply needed)", "[silent]" or "no response": anything you write is sent to the supplier as is. Do not chat.
- Never use em dashes or en dashes.
- What we want in the quote: rate per sq ft and amount per item, profile brand and series, glass, hardware brand, GST, transport/freight, unloading, installation, warranty (profile and hardware), payment terms, delivery time, validity.
- Answer questions using ONLY the RFQ details below. Sizes in the RFQ are final for quoting; they can quote their equivalent profile.
- When they share prices or a quotation in text, call record_quote with a short summary and thank them.
- Site address: ${cfg.site}; exact location will be shared later. If they ask for a site visit, measurement, a call, discounts, advance or an order: politely say we are first collecting quotations on these sizes, ask them to send the quotation on the RFQ, and say we will contact them after comparing. Handle everything yourself.
- Never agree to an order, a price or a payment. Never mention EcoCart or any shop. Never invent facts.
- If they say they don't do this work or are not interested, thank them politely and call mark_not_interested.
- If someone sincerely asks whether you are a bot or a real person, do not lie: say you're an assistant helping Roshan collect quotes and he can call them.

RFQ (our request for quotation, all items white, quantity 1 each):
${rfqText().slice(0, 9000) || '17 uPVC windows and sliding doors, 384.95 sq ft total, white, 5 mm toughened glass, 60 series European slider and casement systems. Full list with sizes is in the PDF.'}`;
}

export async function supplierTurn({ chatId, text, notifyOwner }) {
  const s = supplierFor(chatId);
  store.push(chatId, 'user', text);
  if (s.status === 'quoted' || s.status === 'declined') {
    console.log(`SUPPLIER MSG after ${s.status} ${s.name} +${s.phone}: ${text.slice(0, 300)}`);
    if (s.thanked) return '';
    update(chatId, { thanked: true });
    return 'Ok thanks, kitti 👍';
  }
  if (!s.repliedAt) {
    update(chatId, { status: 'talking', repliedAt: Date.now() });
    console.log(`SUPPLIER REPLY ${s.name} +${s.phone}: ${text.slice(0, 300)}`);
  }
  let rfqSent = !!s.rfqSentAt;
  const tools = {
    send_rfq: {
      description: 'Send our RFQ PDF (all window sizes, drawings and specs) in this chat. Only once.',
      parameters: { type: 'object', properties: {} },
      run: async () => {
        if (rfqSent) return { already_sent: true };
        if (!hasPdf()) { console.error('RFQ pdf missing'); return { error: 'PDF not available yet; say you will send it shortly.' }; }
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
        console.log(`SUPPLIER QUOTE ${s.name} +${s.phone}: ${summary}`);
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
  const { text: raw } = await runAgent(replyPrompt(s), history, tools, { maxTokens: 2000 });
  const reply = cleanReply(raw);
  if (raw && !reply) console.log(`SUPPLIER SILENT ${s.name} +${s.phone}: dropped "${String(raw).slice(0, 80)}"`);
  if (reply) store.push(chatId, 'assistant', reply);
  return reply;
}

// Never send the model's stage notes ("(no reply needed)", "[silent]", "No response.") to a supplier.
const META = /\b(no\s+(reply|response|message)(\s+(is\s+)?(needed|required|necessary))?|empty\s+(reply|message|response)|stay(ing)?\s+silent|do\s+not\s+reply|nothing\s+to\s+(say|reply|send)|skip(ping)?\s+(reply|this))\b/i;
export function cleanReply(t) {
  let x = String(t || '').trim();
  if (!x) return '';
  x = x.split('\n').filter((l) => !/^\s*[(\[].*[)\]]\s*$/.test(l) && !(META.test(l) && l.length < 40)).join('\n').trim();
  if (/^[(\[][^()\[\]]*[)\]]$/.test(x)) return ''; // whole reply is one (note) or [note]
  return x.replace(/\s*[\u2014\u2013]\s*/g, ', ').replace(/,\s*,/g, ',').trim();
}

// ---- trial: Roshan plays a supplier in Eco's own chat; nothing goes to any real supplier ----
const TRIAL = 'supplier-trial';
export async function supplierTrial(text, to) {
  if (/^reset\b/i.test(text)) { store.set(`hist:${TRIAL}`, []); return wa.sendText(to, '🧪 Trial chat reset.', { human: false }); }
  const hist = store.get(`hist:${TRIAL}`, []);
  hist.push({ role: 'user', content: text });
  const say = (t) => wa.sendText(to, `🧪 ${t}`, { human: false });
  const tools = {
    send_rfq: { description: 'Send our RFQ PDF in this chat. Only once.', parameters: { type: 'object', properties: {} },
      run: async () => { if (!hasPdf()) return { error: 'no PDF' }; await say('(Eco would now send the RFQ PDF:)'); await wa.sendDocument(to, fs.readFileSync(PDF), store.get('rfq_pdf_name', cfg.pdfName)); return { sent: true }; } },
    record_quote: { description: 'Save a quote or prices the supplier gave in text, and tell Roshan.', parameters: { type: 'object', properties: { summary: { type: 'string' } }, required: ['summary'] },
      run: async ({ summary }) => { await say(`(Roshan would get: Quote from Trial supplier: ${summary})`); return { ok: true }; } },
    hand_to_roshan: { description: 'Ask Roshan to take over (site visit, call, negotiation, anything outside the RFQ). Eco stops replying in this chat.', parameters: { type: 'object', properties: { reason: { type: 'string' } }, required: ['reason'] },
      run: async ({ reason }) => { await say(`(Eco would stop replying and tell Roshan: ${reason})`); return { ok: true }; } },
    mark_not_interested: { description: 'They do not do this work or declined.', parameters: { type: 'object', properties: {} }, run: () => ({ ok: true }) },
  };
  const { text: reply } = await runAgent(replyPrompt({ name: 'Trial supplier' }), hist, tools, { maxTokens: 2000 });
  hist.push({ role: 'assistant', content: reply || '' });
  store.set(`hist:${TRIAL}`, hist.slice(-20));
  await say(`Supplier would get:\n${reply || '(no reply)'}`);
}

export async function sendTrialStarters(to) {
  const names = Object.values(all()).filter((s) => s.status === 'queued').slice(0, 3);
  const made = [];
  for (const s of names) made.push(await writeStarter(s, made));
  await wa.sendText(to, `🧪 Supplier outreach trial. Nothing has been sent to any supplier.\n\nStarters Eco would send now (a fresh one each time, hours apart):\n${made.map((t, i) => `${i + 1}. To ${names[i].name}: "${t}"`).join('\n')}\n\nTo test replies, play the supplier here:\nhey eco trial yes we do upvc, send the sizes\n(start over: hey eco trial reset)`, { human: false });
}

// A document or photo from a supplier is usually the quotation: forward it to Roshan.
export async function supplierFile({ chatId, message, caption }) {
  const s = supplierFor(chatId);
  update(chatId, { status: 'quoted', quotedAt: Date.now(), quoteFile: true });
  try {
    const buf = await wa.download(message);
    const name = `${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}_${(s.name || s.phone).replace(/[^\w]+/g, '_')}_${message.message?.documentMessage?.fileName || 'quote.jpg'}`.replace(/[^\w.-]+/g, '_');
    fs.mkdirSync(path.join(DIR, 'quotes'), { recursive: true });
    fs.writeFileSync(path.join(DIR, 'quotes', name), buf);
    console.log(`SUPPLIER QUOTE FILE ${s.name} +${s.phone}: quotes/${name} (${Math.round(buf.length / 1024)} KB) ${caption}`);
  } catch (e) { console.error('quote file save', e.message); }
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
  // SUPPLIER_TEST="Name|phone": a trial chat (Roshan pretending to be a supplier), sent first, 1-3 min gap.
  const [tName, tPhone] = (process.env.SUPPLIER_TEST || '').split('|');
  if (tPhone) console.log('Test supplier', addSuppliers([{ name: tName, phone: tPhone, test: true }]));
  // SUPPLIER_START=<any id>: start the campaign once for that id (so a restart does not restart it).
  // SUPPLIER_NEXT_NOW=<id>: send the next starter right away (once per id).
  const nowId = process.env.SUPPLIER_NEXT_NOW || '';
  if (nowId && !store.isDone(`supplier-now:${nowId}`)) { store.markDone(`supplier-now:${nowId}`); setCamp({ active: true, nextAt: Date.now() + 60000 }); }
  const startId = process.env.SUPPLIER_START || '';
  if (startId && !store.isDone(`supplier-start:${startId}`)) {
    store.markDone(`supplier-start:${startId}`);
    setCamp({ active: true, nextAt: Date.now() + rand(2, 8) * 60000 });
    console.log('Supplier outreach started');
  }
  setInterval(() => tick().catch(() => {}), 60 * 1000);
  // SUPPLIER_TRIAL=<id>: once WhatsApp is up, show Roshan sample starters in his own chat (once per id).
  const trialId = process.env.SUPPLIER_TRIAL || '';
  if (trialId && !store.isDone(`supplier-trial:${trialId}`)) {
    const t = setInterval(async () => {
      if (!wa.connected()) return;
      clearInterval(t);
      store.markDone(`supplier-trial:${trialId}`);
      await sendTrialStarters(wa.ownerJid()).catch((e) => console.error('trial', e.message));
    }, 10000);
  }
}
