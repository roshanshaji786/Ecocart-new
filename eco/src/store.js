// JSON-file state that survives restarts (kept in the data volume).
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.resolve(process.env.DATA_DIR || 'data');
const FILE = path.join(DIR, 'state.json');
fs.mkdirSync(DIR, { recursive: true });

const empty = () => ({
  paused: false, pausedChats: {}, notes: [], history: {}, stats: {},
  optOut: {}, done: {}, queue: [], sends: [], chatKind: {}, saved: {}, names: {}, broadcastDraft: null, kv: {},
});
let state = empty();
try { state = { ...empty(), ...JSON.parse(fs.readFileSync(FILE, 'utf8')) }; } catch {}

let timer = null;
function save() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    fs.writeFileSync(FILE + '.tmp', JSON.stringify(state));
    fs.renameSync(FILE + '.tmp', FILE);
  }, 400);
}

const MAX_TURNS = 30;
export const todayIST = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
export const digitsOf = (s = '') => String(s).split('@')[0].split(':')[0].replace(/\D/g, '');

export const store = {
  get paused() { return state.paused; },
  setPaused(v) { state.paused = !!v; save(); },

  isChatPaused(id) { return !!state.pausedChats[id]; },
  pauseChat(id, reason = '') { state.pausedChats[id] = { at: Date.now(), reason }; save(); },
  resumeChat(id) { delete state.pausedChats[id]; state.chatKind[id] = 'customer'; save(); },
  pausedChats() { return state.pausedChats; },

  notes() { return state.notes; },
  addNote(text) { state.notes.push({ text, at: Date.now() }); save(); },
  clearNotes() { state.notes = []; save(); },

  history(id) { return state.history[id] || []; },
  push(id, role, content) {
    const h = (state.history[id] ||= []);
    h.push({ role, content, at: Date.now() });
    if (h.length > MAX_TURNS) h.splice(0, h.length - MAX_TURNS);
    save();
  },
  knownChats() { return Object.keys(state.history); },
  lastInbound(id) { const h = state.history[id] || []; for (let i = h.length - 1; i >= 0; i--) if (h[i].role === 'user') return h[i].at; return 0; },

  // "customer" | "other" (friends, Darts leads, etc. Eco stays silent)
  chatKind(id) { return state.chatKind[id]; },
  setChatKind(id, kind) { state.chatKind[id] = kind; save(); },
  clearChatKind(kind) { let n = 0; for (const [id, k] of Object.entries(state.chatKind)) if (k === kind) { delete state.chatKind[id]; n++; } save(); return n; },

  isSaved(phone) { return !!state.saved[phone]; },
  setSaved(phone, name) { if (phone) { state.saved[phone] = name || true; save(); } },
  setName(phone, name) { if (phone && name) { state.names[phone] = name; save(); } },
  name(phone) { return state.names[phone] || ''; },

  isOptedOut(phone) { return !!state.optOut[digitsOf(phone).slice(-10)]; },
  optOut(phone) { state.optOut[digitsOf(phone).slice(-10)] = Date.now(); save(); },
  optIn(phone) { delete state.optOut[digitsOf(phone).slice(-10)]; save(); },

  isDone(key) { return !!state.done[key]; },
  markDone(key) { state.done[key] = Date.now(); save(); },

  queue() { return state.queue; },
  enqueue(item) {
    if (state.queue.some((q) => q.key === item.key) || state.done[item.key]) return false;
    state.queue.push({ ...item, at: Date.now() }); save(); return true;
  },
  shift() { const q = state.queue.shift(); save(); return q; },
  clearQueue(kind) { state.queue = kind ? state.queue.filter((q) => q.kind !== kind) : []; save(); },

  recordSend() { state.sends.push(Date.now()); state.sends = state.sends.filter((t) => Date.now() - t < 86400000); save(); },
  sendsWithin(ms) { return state.sends.filter((t) => Date.now() - t < ms).length; },
  lastSend() { return state.sends[state.sends.length - 1] || 0; },

  broadcastDraft() { return state.broadcastDraft; },
  setBroadcastDraft(d) { state.broadcastDraft = d; save(); },

  // Generic keyed state for add-ons (e.g. the supplier outreach).
  get(key, dflt) { return state.kv?.[key] ?? dflt; },
  set(key, value) { (state.kv ||= {})[key] = value; save(); },

  bump(key, n = 1) { const d = (state.stats[todayIST()] ||= {}); d[key] = (d[key] || 0) + n; save(); },
  statsToday() { return state.stats[todayIST()] || {}; },
};
