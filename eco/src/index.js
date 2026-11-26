import { config, assertConfig } from './config.js';
import { startWhatsApp, notifyOwner, sendText, sendDocument, forwardToOwner, exists, link, ownerJid, download } from './whatsapp.js';
import { startSuppliers } from './suppliers.js';
import { startWeb } from './web.js';
import { startProactive } from './proactive.js';
import { loadCatalogue } from './woo.js';
import { store } from './store.js';
import { dailyReport, morningPlan } from './growth.js';

assertConfig();
process.on('unhandledRejection', (e) => console.error('unhandled', e?.message || e));

// 26 Nov 2026: the shopper check got empty answers (max_tokens too small for a reasoning model), so every
// new WhatsApp chat was marked "not a shopper". Clear those once so each gets a fresh, working check.
if (!store.isDone('fix:shopper-check-v1')) {
  const n = store.clearChatKind('other');
  store.markDone('fix:shopper-check-v1');
  console.log(`Shopper check fix: ${n} chats that were wrongly ignored will be checked again`);
}

await loadCatalogue(true).then((c) => console.log(`Loaded ${c.length} products`)).catch((e) => console.error('Catalogue', e.message));
setInterval(() => loadCatalogue(true).catch(() => {}), 30 * 60 * 1000);

startWeb();
await startWhatsApp();
startProactive({ sendText, exists });
await startSuppliers({ sendText, sendDocument, exists, notifyOwner, forwardToOwner, ownerJid, download, connected: () => link.connected });

// 9 PM report and the morning selling plan to Roshan, India time.
let lastReport = '';
let lastPlan = '';
setInterval(async () => {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day = now.toDateString();
  if (!link.connected) return;
  if (now.getHours() === config.reportHour && lastReport !== day) {
    lastReport = day;
    try { await notifyOwner(await dailyReport()); } catch (e) { console.error('daily report', e.message); }
  }
  if (process.env.MORNING_PLAN !== 'false' && now.getHours() === 9 && now.getMinutes() >= 30 && lastPlan !== day) {
    lastPlan = day;
    try { await notifyOwner(`Today's selling plan\n${await morningPlan()}`); } catch (e) { console.error('morning plan', e.message); }
  }
}, 5 * 60 * 1000);
