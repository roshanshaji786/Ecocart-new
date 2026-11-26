// WhatsApp through Baileys (WhatsApp Web protocol, unofficial; the number is a linked device).
// Human-like: waits, marks read, shows typing, sends short bubbles. Ban-safety: never messages
// strangers first, ignores groups/status/channels, rate-limits, and stays silent in personal chats.
import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } from '@whiskeysockets/baileys';
import pino from 'pino';
import path from 'node:path';
import fs from 'node:fs';
import { config } from './config.js';
import { store, digitsOf } from './store.js';
import { customerTurn, ownerTurn, isShopper } from './agent.js';
import { broadcast } from './proactive.js';

const log = pino({ level: process.env.BAILEYS_LOG || 'warn' });
const WAKE = /^\s*(hey|hi|hello|ok|oi)?\s*,?\s*eco\b[\s,:!.-]*/i;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);

const AUTH = path.resolve(process.env.AUTH_DIR || 'auth');
let sock = null;
export const link = { qr: '', code: '', connected: false, number: '', since: 0 };
let myLid = '';
const sentByBot = new Set();
const pending = new Map(); // chatId -> { timer, texts, phone, name, replyTo }
const outbox = [];

function textOf(m) {
  const msg = m.message || {};
  const inner = msg.ephemeralMessage?.message || msg.viewOnceMessageV2?.message || msg.viewOnceMessage?.message || msg;
  if (inner.conversation) return inner.conversation;
  if (inner.extendedTextMessage?.text) return inner.extendedTextMessage.text;
  if (inner.imageMessage) return `[sent a photo] ${inner.imageMessage.caption || ''}`.trim();
  if (inner.videoMessage) return `[sent a video] ${inner.videoMessage.caption || ''}`.trim();
  if (inner.audioMessage) return '[sent a voice note. You cannot listen to it; kindly ask them to type, or say Roshan will listen if it seems important]';
  if (inner.documentMessage) return '[sent a document]';
  if (inner.locationMessage) return '[shared a location]';
  if (inner.contactMessage) return '[shared a contact]';
  if (inner.stickerMessage) return '[sent a sticker]';
  if (inner.reactionMessage) return '';
  return inner.buttonsResponseMessage?.selectedDisplayText || inner.listResponseMessage?.title || '';
}

async function rateLimit() {
  for (;;) {
    const now = Date.now();
    while (outbox.length && now - outbox[0] > 60000) outbox.shift();
    if (outbox.length < 12) { outbox.push(now); return; }
    await sleep(3000);
  }
}

async function sendOne(jid, text, human) {
  await rateLimit();
  if (human) {
    await sock.sendPresenceUpdate('composing', jid).catch(() => {});
    await sleep(Math.min(1200 + text.length * rand(30, 45), 9000));
    await sock.sendPresenceUpdate('paused', jid).catch(() => {});
  }
  const res = await sock.sendMessage(jid, { text });
  if (res?.key?.id) sentByBot.add(res.key.id);
  if (sentByBot.size > 3000) sentByBot.delete(sentByBot.values().next().value);
}

// Split on blank lines into up to 3 bubbles, like a person typing.
export async function sendText(jid, text, { human = true } = {}) {
  if (!sock || !link.connected || !text) return;
  const parts = human ? text.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean) : [text];
  const bubbles = parts.length > 3 ? [...parts.slice(0, 2), parts.slice(2).join('\n\n')] : parts;
  for (let i = 0; i < bubbles.length; i++) {
    if (i) await sleep(rand(700, 1800));
    await sendOne(jid, bubbles[i], human);
  }
}

export async function exists(jid) {
  try { const [r] = await sock.onWhatsApp(jid); return !!r?.exists; } catch { return false; }
}

const selfJid = () => `${link.number}@s.whatsapp.net`;
export async function notifyOwner(text) {
  const owner = config.owners[0] || link.number;
  if (owner) await sendText(owner === link.number ? selfJid() : `${owner}@s.whatsapp.net`, `🤖 Eco: ${text}`, { human: false });
}

// Prefer the phone-number JID; WhatsApp now often addresses chats by @lid.
function chatIdOf(m) {
  const k = m.key;
  if (k.remoteJidAlt?.endsWith('@s.whatsapp.net')) return k.remoteJidAlt;
  return k.remoteJid;
}
const phoneOf = (chatId) => (chatId.endsWith('@s.whatsapp.net') ? digitsOf(chatId) : '');

function isSelfChat(jid) {
  const d = digitsOf(jid);
  return d === link.number || (myLid && d === myLid);
}

async function handle(m, type) {
  const raw = m.key.remoteJid || '';
  if (!raw || raw.endsWith('@g.us') || raw.endsWith('@broadcast') || raw.endsWith('@newsletter') || raw === 'status@broadcast') return;
  if (m.key.id && sentByBot.has(m.key.id)) return;
  const ts = Number(m.messageTimestamp || 0) * 1000;
  if (ts && Date.now() - ts > 3 * 60 * 1000) return; // old/history message
  const text = textOf(m);
  if (!text) return;
  const chatId = chatIdOf(m);
  const phone = phoneOf(chatId);

  // Roshan's commands: "hey eco ..." from his own chat or an owner number.
  const fromOwner = (m.key.fromMe && isSelfChat(chatId)) || (!m.key.fromMe && phone && config.owners.includes(phone));
  if (fromOwner && WAKE.test(text)) {
    const command = text.replace(WAKE, '').trim() || 'status';
    try {
      store.push('owner', 'user', command);
      const reply = await ownerTurn({ text: command, sendTo: (to, t) => sendText(to, t), broadcast });
      store.push('owner', 'assistant', reply || 'Done.');
      await sendText(raw, `🤖 ${reply || 'Done.'}`, { human: false });
    } catch (e) {
      await sendText(raw, `🤖 Eco error: ${e.message}`, { human: false });
    }
    return;
  }
  if (m.key.fromMe) {
    // Roshan typed in a chat himself: a human is handling it, Eco steps back there.
    if (!isSelfChat(chatId) && type === 'notify') store.pauseChat(chatId, 'Roshan replied manually');
    return;
  }
  if (type !== 'notify' || fromOwner) return;
  if (store.paused || store.isChatPaused(chatId) || store.chatKind(chatId) === 'other') return;
  if (config.ignoreSavedContacts && phone && store.isSaved(phone) && store.chatKind(chatId) !== 'customer') return;

  if (m.pushName && phone) store.setName(phone, m.pushName);
  const p = pending.get(chatId) || { texts: [], phone, name: m.pushName || '', keys: [] };
  p.texts.push(text);
  p.keys.push(m.key);
  clearTimeout(p.timer);
  p.timer = setTimeout(() => flush(chatId), rand(5000, 9000)); // wait for them to finish typing
  pending.set(chatId, p);
}

async function flush(chatId) {
  const p = pending.get(chatId);
  pending.delete(chatId);
  if (!p) return;
  const text = p.texts.join('\n');
  try {
    if (!store.chatKind(chatId)) {
      const shopper = await isShopper(`${p.name ? `Name: ${p.name}\n` : ''}${text}`);
      store.setChatKind(chatId, shopper ? 'customer' : 'other');
      if (!shopper) { store.bump('ignored_chats'); return; }
    }
    await sleep(rand(1500, 5000));
    sock.readMessages(p.keys).catch(() => {});
    const reply = await customerTurn({ chatId, phone: p.phone, name: p.name, channel: 'WhatsApp', text, notifyOwner });
    if (reply) await sendText(chatId, reply);
  } catch (e) {
    console.error('reply failed', e.message);
  }
}

export async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH);
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }));
  sock = makeWASocket({
    auth: state, logger: log, version, browser: Browsers.ubuntu('Chrome'),
    markOnlineOnConnect: false, syncFullHistory: false, generateHighQualityLinkPreview: false,
  });
  sock.ev.on('creds.update', saveCreds);
  let askedCode = false;

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      link.qr = qr;
      if (config.waPhone && !sock.authState.creds.registered && !askedCode) {
        askedCode = true;
        try {
          const code = await sock.requestPairingCode(config.waPhone);
          link.code = code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
          console.log(`Pairing code for +${config.waPhone}: ${link.code} (${new Date().toISOString()})`);
        } catch (e) { console.error('pairing code', e.message); }
      }
    }
    if (connection === 'open') {
      Object.assign(link, { connected: true, qr: '', code: '', number: digitsOf(sock.user?.id), since: Date.now() });
      myLid = digitsOf(sock.user?.lid || '');
      console.log(`Eco is live on WhatsApp +${link.number}`);
    }
    if (connection === 'close') {
      link.connected = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      link.code = ''; link.qr = '';
      if (code === DisconnectReason.loggedOut) {
        // Unlinked from the phone, or a pairing attempt expired: start a fresh session with a new code.
        console.error('WhatsApp logged out; starting a fresh link session.');
        fs.rmSync(AUTH, { recursive: true, force: true });
      }
      setTimeout(() => startWhatsApp().catch((e) => console.error('reconnect', e.message)), code === DisconnectReason.loggedOut ? 3000 : 5000);
    }
  });

  const saveContacts = (list) => {
    for (const c of list || []) {
      const phone = c.phoneNumber ? digitsOf(c.phoneNumber) : c.id?.endsWith('@s.whatsapp.net') ? digitsOf(c.id) : '';
      if (c.name && phone) store.setSaved(phone, c.name);
    }
  };
  sock.ev.on('contacts.upsert', saveContacts);
  sock.ev.on('contacts.update', saveContacts);
  sock.ev.on('messaging-history.set', ({ contacts }) => saveContacts(contacts));

  sock.ev.on('messages.upsert', ({ messages, type }) => {
    for (const m of messages) handle(m, type).catch((e) => console.error('handle', e.message));
  });
}
