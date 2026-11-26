import { config, assertConfig, hasOrders } from './config.js';
import { startWhatsApp, notifyOwner, sendText, sendDocument, forwardToOwner, exists, link } from './whatsapp.js';
import { startSuppliers } from './suppliers.js';
import { startWeb } from './web.js';
import { startProactive } from './proactive.js';
import { loadCatalogue, salesSummary } from './woo.js';
import { store } from './store.js';

assertConfig();
process.on('unhandledRejection', (e) => console.error('unhandled', e?.message || e));

await loadCatalogue(true).then((c) => console.log(`Loaded ${c.length} products`)).catch((e) => console.error('Catalogue', e.message));
setInterval(() => loadCatalogue(true).catch(() => {}), 30 * 60 * 1000);

startWeb();
await startWhatsApp();
startProactive({ sendText, exists });
await startSuppliers({ sendText, sendDocument, exists, notifyOwner, forwardToOwner });

// Daily report to Roshan at REPORT_HOUR, India time.
let lastReport = '';
setInterval(async () => {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day = now.toDateString();
  if (now.getHours() !== config.reportHour || lastReport === day || !link.connected) return;
  lastReport = day;
  const e = store.statsToday();
  let sales = 'Sales: add the WooCommerce key to see orders here.';
  if (hasOrders()) {
    try { const s = await salesSummary(1); sales = `Paid orders (24h): ${s.paid_orders}, revenue Rs ${s.revenue_inr}, unpaid/failed: ${s.unpaid_or_failed}`; } catch {}
  }
  const sent = Object.entries(e).filter(([k]) => k.startsWith('sent_')).map(([k, v]) => `${k.slice(5)} ${v}`).join(', ') || 'none';
  await notifyOwner(`Daily report\n${sales}\nWhatsApp messages in: ${e.whatsapp_messages || 0}\nWebsite chats: ${e.web_messages || 0}\nPersonal/other chats ignored: ${e.ignored_chats || 0}\nHanded to you: ${e.handoffs || 0}\nAuto messages sent: ${sent}\nQueue: ${store.queue().length}`).catch(() => {});
}, 5 * 60 * 1000);
