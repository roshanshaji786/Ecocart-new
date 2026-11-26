// HTTP: website chat endpoint, WhatsApp link page (token protected), health.
import express from 'express';
import crypto from 'node:crypto';
import QRCode from 'qrcode';
import { config } from './config.js';
import { customerTurn } from './agent.js';
import { notifyOwner, link, wakeLinking } from './whatsapp.js';
import { store } from './store.js';

const hits = new Map();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function startWeb() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '10kb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, whatsapp: link.connected, paused: store.paused }));
  app.use('/widget', express.static(new URL('../widget', import.meta.url).pathname, { maxAge: '1h' }));

  // Link page: open http://VPS:PORT/link?token=LINK_TOKEN on a laptop, scan with the phone.
  app.get('/link', async (req, res) => {
    if (!config.linkToken || req.query.token !== config.linkToken) return res.status(404).send('Not found');
    if (!link.connected) wakeLinking();
    const qrImg = link.qr ? await QRCode.toDataURL(link.qr, { margin: 1, width: 300 }) : '';
    res.set('Cache-Control', 'no-store').send(`<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><meta http-equiv=refresh content=15>
<title>Link Eco</title><body style="font:16px system-ui;max-width:420px;margin:24px auto;padding:0 16px;color:#1b1b1b;background:#fff">
<h2>Link Eco to WhatsApp</h2>
${link.connected ? `<p style="color:#2e7d32"><b>Connected</b> as +${esc(link.number)}. You can close this page.</p>` : `
${link.code ? `<p><b>Option 1, pairing code:</b> on the phone open WhatsApp &gt; Linked devices &gt; Link a device &gt; <i>Link with phone number instead</i>, and enter:</p><p style="font-size:34px;letter-spacing:4px;font-weight:700">${esc(link.code)}</p>` : ''}
${qrImg ? `<p><b>${link.code ? 'Option 2' : 'Scan'}:</b> WhatsApp &gt; Linked devices &gt; Link a device, then scan:</p><img src="${qrImg}" width=300 height=300 alt="QR">` : '<p>Starting up, this page refreshes every 15 seconds…</p>'}
<p style="color:#666;font-size:13px">Refreshes every 15 seconds. Codes expire quickly; if one fails, wait for the next.</p>`}
</body>`);
  });

  app.use('/chat', (req, res, next) => {
    res.set('Access-Control-Allow-Origin', config.webOrigin);
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
  app.post('/chat', async (req, res) => {
    // Only the ecocart.co.in plugin (which knows the shared secret) may use this endpoint.
    if (config.proxySecret && req.headers['x-eco-proxy'] !== config.proxySecret) return res.status(403).json({ reply: '' });
    const ip = String(req.headers['x-forwarded-for'] || req.ip).split(',')[0].trim();
    const now = Date.now();
    const list = (hits.get(ip) || []).filter((t) => now - t < 60000);
    if (list.length >= 12) return res.status(429).json({ reply: 'One moment please, you are typing faster than me 🙂' });
    list.push(now); hits.set(ip, list);
    const text = String(req.body?.message || '').slice(0, 800).trim();
    let session = String(req.body?.session || '');
    if (!/^[a-f0-9]{32}$/.test(session)) session = crypto.randomBytes(16).toString('hex');
    if (!text) return res.status(400).json({ reply: '', session });
    try {
      const reply = await customerTurn({ chatId: `web:${session}`, channel: 'the ecocart.co.in website chat', text, notifyOwner });
      res.json({ reply: reply || 'Thanks! Roshan will get back to you soon.', session });
    } catch (e) {
      console.error('web chat', e.message);
      res.json({ reply: 'Sorry, I had a hiccup. Please WhatsApp us at +91 70120 45854.', session });
    }
  });

  app.listen(config.webPort, config.webHost, () => console.log(`HTTP on ${config.webHost}:${config.webPort}`));
}
