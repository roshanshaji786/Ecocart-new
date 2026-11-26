// Eco v2 scenario tests. Runs against real DeepSeek and the real catalogue, with fake orders and no
// WhatsApp, in a throwaway DATA_DIR. Run on the VPS: node test/scenarios.js
process.env.DATA_DIR ||= `/tmp/ecotest-${Date.now()}`;
const { config } = await import('../src/config.js');
const woo = await import('../src/woo.js');
const { customerTurn, ownerTurn } = await import('../src/agent.js');
const { store } = await import('../src/store.js');
const { db } = await import('../src/db.js');
const merch = await import('../src/merch.js');
const pro = await import('../src/proactive.js');

const cat = await woo.loadCatalogue(true);
const tagged = await merch.products();
const honey = tagged.find((p) => /honey/i.test(p.name) && p.inStock && !p.types.includes('hamper')) || tagged[0];
const iso = (msAgo) => new Date(Date.now() - msAgo).toISOString().slice(0, 19);
const H = 3600000;
const ORDERS = [
  { id: 5001, status: 'processing', total: '1254', date_created: iso(30 * H), date_created_gmt: iso(30 * H), billing: { first_name: 'Anu', phone: '9876500001' }, line_items: [{ name: 'Honey Trio Gift Box', quantity: 1, total: '1199', product_id: 1 }] },
  { id: 5002, status: 'pending', total: '754', payment_url: 'https://ecocart.co.in/checkout/order-pay/5002/', date_created: iso(2 * H), date_created_gmt: iso(2 * H), billing: { first_name: 'Biju', phone: '9876500002' }, line_items: [{ name: 'Kerala Kitchen Box', quantity: 1, total: '699' }] },
  { id: 5003, status: 'failed', total: '654', date_created: iso(3 * H), date_created_gmt: iso(3 * H), billing: { first_name: 'Chitra', phone: '9876500003' }, line_items: [{ name: 'Plastic-Free Home Starter', quantity: 1, total: '599' }] },
  { id: 4001, status: 'completed', total: String(honey.price + 55), date_created: iso(35 * 24 * H), date_created_gmt: iso(35 * 24 * H), billing: { first_name: 'Deepa', phone: '9876500004' }, line_items: [{ name: honey.name, quantity: 1, total: String(honey.price), product_id: honey.id }] },
];
config.woo.ck = 'test'; config.woo.cs = 'test';
woo.testHooks.wc = async (path, params) => {
  const m = path.match(/^orders\/(\d+)$/);
  if (m) { const o = ORDERS.find((x) => x.id === Number(m[1])); if (!o) throw new Error('404'); return o; }
  let list = ORDERS.slice();
  if (params.search) list = list.filter((o) => o.billing.phone.endsWith(String(params.search).slice(-10)));
  if (params.status) list = list.filter((o) => String(params.status).split(',').includes(o.status));
  if (params.after) list = list.filter((o) => Date.parse(o.date_created_gmt + 'Z') >= Date.parse(params.after));
  if (params.before) list = list.filter((o) => Date.parse(o.date_created_gmt + 'Z') <= Date.parse(params.before));
  return list;
};

const owner = [];
const notifyOwner = async (t) => { owner.push(t); };
const results = [];
let n = 0;
const clip = (t = '') => String(t).replace(/\s+/g, ' ').slice(0, 170);
async function run(name, fn) {
  n++;
  const t0 = Date.now();
  try {
    const { ok, info } = await fn();
    results.push(ok);
    console.log(`#${n} ${ok === true ? 'PASS' : ok === false ? 'FAIL' : 'INFO'} ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s) | ${clip(info)}`);
  } catch (e) {
    results.push(false);
    console.log(`#${n} FAIL ${name} | error: ${clip(e.stack || e.message)}`);
  }
}
const say = (chat, text, extra = {}) => customerTurn({ chatId: chat, channel: extra.web ? 'the ecocart.co.in website chat' : 'WhatsApp', phone: extra.phone || '', name: extra.name || '', text, notifyOwner, cards: extra.cards });
const wa = (p) => `91${p}@s.whatsapp.net`;
const linksIn = async (t) => merch.productsInText(t);

console.log(`Catalogue ${cat.length} products, ${tagged.filter((p) => p.inStock).length} in stock, ${tagged.filter((p) => p.sustainability.length).length} with sustainability facts`);

await run('Gift under Rs 1,000', async () => {
  const r = await say(wa('9000000001'), 'Hi, I need a gift under 1000 rupees for my mother', { phone: '919000000001', name: 'Meera' });
  const l = await linksIn(r);
  return { ok: l.length > 0 && l.every((p) => p.price <= 1100), info: r };
});
await run('Christmas gift', async () => {
  const r = await say(wa('9000000002'), 'Looking for a christmas gift for my office team', { phone: '919000000002' });
  return { ok: (await linksIn(r)).length > 0 || /\?/.test(r), info: r };
});
await run('Delivery before Christmas', async () => {
  const r = await say(wa('9000000002'), 'Will it reach Bangalore before Christmas?', { phone: '919000000002' });
  return { ok: /15/.test(r) && !/guarantee/i.test(r), info: r };
});
await run('Too expensive', async () => {
  const r = await say(wa('9000000001'), 'Hmm that is too expensive for me', { phone: '919000000001', name: 'Meera' });
  const pr = db.profiles()['p:9000000001'];
  return { ok: pr.objections.includes('price') && r.length > 0, info: r };
});
await run('Cash on delivery', async () => {
  const r = await say(wa('9000000003'), 'Is COD available?', { phone: '919000000003' });
  return { ok: /(no|not|don'?t|illa)/i.test(r) && /(upi|card|razorpay)/i.test(r), info: r };
});
await run('Are you a bot?', async () => {
  const r = await say(wa('9000000003'), 'Are you a bot or a real person?', { phone: '919000000003' });
  return { ok: !/\b(i'?m|i am) (a )?(real )?(human|person)\b/i.test(r) && /(eco|assistant|ai|bot|roshan)/i.test(r), info: r };
});
await run('Order status, matching phone', async () => {
  const r = await say(wa('9876500001'), 'Where is my order 5001?', { phone: '919876500001' });
  return { ok: /(5001|processing|confirmed|pack|honey trio)/i.test(r), info: r };
});
await run('Order status, other phone', async () => {
  const r = await say(wa('9999900000'), 'What is the status of order 5001?', { phone: '919999900000' });
  return { ok: !/honey trio|1,?254|anu/i.test(r), info: r };
});
await run('Refund request', async () => {
  const before = owner.length;
  const r = await say(wa('9000000004'), 'I want a refund for my last order, the product was not what I expected', { phone: '919000000004' });
  return { ok: owner.length > before && store.isChatPaused(wa('9000000004')), info: r };
});
await run('Damaged product', async () => {
  const before = owner.length;
  const r = await say(wa('9000000005'), 'The ghee jar arrived broken and leaking', { phone: '919000000005' });
  return { ok: owner.length > before, info: r };
});
await run('Bulk order', async () => {
  const before = owner.length;
  let r = await say(wa('9000000006'), 'I need 60 gift hampers for our company employees by 18 December, budget about 800 each', { phone: '919000000006' });
  if (owner.length === before) r += ' || ' + await say(wa('9000000006'), 'Yes please, can Roshan call me?', { phone: '919000000006' });
  return { ok: owner.length > before, info: r };
});
await run('STOP', async () => {
  const r = await say(wa('9000000007'), 'STOP', { phone: '919000000007' });
  return { ok: store.isOptedOut('919000000007'), info: r };
});
await run('Silent after asking for a link (follow-up queued)', async () => {
  const r = await say(wa('9000000008'), 'Send me the link for a honey gift around 1200 for Christmas', { phone: '919000000008', name: 'Ravi' });
  const pr = db.profiles()['p:9000000008'];
  pr.last_inbound = pr.last_activity = Date.now() - 7 * H; pr.lead_score = Math.max(pr.lead_score, 50); pr.buying_stage = 'considering';
  await pro.queueFollowUps();
  const q = store.queue().find((x) => x.kind === 'followup' && x.phone === '9000000008');
  return { ok: !!q, info: q ? `follow-up: ${q.text}` : `no follow-up queued (IST hour may be outside 9-19); reply was: ${r}` };
});
store.markDone('init:orders');
await run('Pending order gets a payment nudge', async () => {
  await pro.pollOrders();
  const q = store.queue().find((x) => x.key === 'recovery:5002');
  return { ok: !!q, info: q?.text };
});
await run('Failed payment gets a nudge', async () => {
  const q = store.queue().find((x) => x.key === 'recovery:5003');
  return { ok: !!q, info: q?.text };
});
await run('Honey bought 35 days ago gets a personal reorder', async () => {
  await pro.queueReorders();
  const q = store.queue().find((x) => x.kind === 'reorder');
  return { ok: !!q && q.text.includes(honey.name), info: q?.text || 'nothing queued (before 10 AM IST?)' };
});

const sent = [];
const sendTo = async (to, t) => { sent.push([to, t]); };
await run('hey eco status', async () => { const r = await ownerTurn({ text: 'status', sendTo, broadcast: pro.broadcast }); return { ok: r.length > 0, info: r }; });
await run('hey eco sales today', async () => { const r = await ownerTurn({ text: 'sales today', sendTo, broadcast: pro.broadcast }); return { ok: /(order|revenue|rs|₹)/i.test(r), info: r }; });
await run('hey eco pause', async () => { const r = await ownerTurn({ text: 'pause', sendTo, broadcast: pro.broadcast }); const ok = store.paused === true; store.setPaused(false); return { ok, info: r }; });
await run('hey eco broadcast past customers (preview only)', async () => {
  const r = await ownerTurn({ text: 'broadcast past customers: Hi {name}, our Christmas hampers are in! Order by 15 Dec.', sendTo, broadcast: pro.broadcast });
  return { ok: !!store.broadcastDraft() && !store.queue().some((q) => q.kind === 'broadcast'), info: r };
});
await run('Website: sustainable gift', async () => {
  const cards = [];
  const r = await say('web:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'I want a sustainable plastic-free gift for a housewarming', { web: true, cards });
  return { ok: cards.length > 0, info: `${cards.length} card(s) | ${r}` };
});
await run('Website: product price', async () => {
  const r = await say('web:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', `How much is the ${honey.name}?`, { web: true });
  return { ok: new RegExp(String(honey.price)).test(r.replace(/,/g, '')), info: r };
});
await run('Out of stock during chat', async () => {
  const target = tagged.find((p) => p.inStock && /ghee/i.test(p.name)) || tagged.find((p) => p.inStock);
  target.inStock = false; const raw = cat.find((p) => p.id === target.id); if (raw) raw.inStock = false;
  const r = await say(wa('9000000009'), `Do you have ${target.name}? I want to buy it`, { phone: '919000000009' });
  return { ok: !r.includes(target.url.replace(/\/$/, '')), info: r };
});
await run('DeepSeek Flash fails, fallback answers', async () => {
  const keep = config.deepseek.model; config.deepseek.model = 'deepseek-does-not-exist';
  try { const r = await say(wa('9000000010'), 'Hi, do you sell coconut oil?', { phone: '919000000010' }); return { ok: r.length > 0, info: r }; }
  finally { config.deepseek.model = keep; }
});
await run('WhatsApp disconnect and reconnect', async () => ({ ok: null, info: 'Not testable offline: checked live after deploy (Eco relinks on its own; logs show "Eco is live").' }));
await run('Owner copilot: what should I push today?', async () => { const r = await ownerTurn({ text: 'what should I push today?', sendTo, broadcast: pro.broadcast }); return { ok: r.length > 40, info: r }; });

const pass = results.filter((x) => x === true).length; const fail = results.filter((x) => x === false).length;
console.log(`RESULT ${pass} passed, ${fail} failed, ${results.length - pass - fail} info | owner pings ${owner.length} | messages sent ${sent.length}`);
setTimeout(() => process.exit(0), 1500);
