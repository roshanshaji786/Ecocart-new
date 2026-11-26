import 'dotenv/config';
import fs from 'node:fs';

const list = (v) => (v || '').split(',').map((s) => s.replace(/\D/g, '')).filter(Boolean);
const num = (v, d) => (v === undefined || v === '' ? d : Number(v));
const bool = (v, d) => (v === undefined || v === '' ? d : /^(1|true|yes|on)$/i.test(v));

export const config = {
  deepseek: {
    key: process.env.DEEPSEEK_API_KEY || '',
    baseUrl: (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, ''),
    model: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
    fallback: process.env.DEEPSEEK_FALLBACK_MODEL || 'deepseek-v4-pro',
  },
  woo: {
    url: (process.env.WOO_URL || 'https://ecocart.co.in').replace(/\/$/, ''),
    // Optional: WooCommerce REST key (read access) for orders. Products work without it.
    ck: process.env.WOO_CONSUMER_KEY || '',
    cs: process.env.WOO_CONSUMER_SECRET || '',
    user: process.env.WOO_USER || '',
    pass: process.env.WOO_APP_PASSWORD || '',
  },
  waPhone: (process.env.WA_PHONE || '').replace(/\D/g, ''),
  owners: list(process.env.OWNER_NUMBERS),
  ignoreSavedContacts: bool(process.env.IGNORE_SAVED_CONTACTS, true),
  webPort: num(process.env.WEB_PORT, 8795),
  webHost: process.env.WEB_HOST || '0.0.0.0',
  webOrigin: process.env.WEB_ALLOWED_ORIGIN || 'https://ecocart.co.in',
  linkToken: process.env.LINK_TOKEN || '',
  reportHour: num(process.env.REPORT_HOUR, 21),
  proactive: {
    enabled: bool(process.env.PROACTIVE_ENABLED, true),
    dailyLimit: num(process.env.PROACTIVE_DAILY_LIMIT, 30),
    hourlyLimit: num(process.env.PROACTIVE_HOURLY_LIMIT, 8),
    hoursStart: num(process.env.PROACTIVE_HOURS_START, 9),
    hoursEnd: num(process.env.PROACTIVE_HOURS_END, 20),
    minGapSec: num(process.env.PROACTIVE_MIN_GAP_SECONDS, 120),
    cartRecovery: bool(process.env.CART_RECOVERY, true),
    orderAlerts: bool(process.env.ORDER_ALERTS, true),
    reorderNudges: bool(process.env.REORDER_NUDGES, true),
  },
};

// The WooCommerce key can also come from a file on the server (written by deploy/tools/make-woo-key.php).
try {
  const f = JSON.parse(fs.readFileSync(process.env.WOO_KEY_FILE || 'data/woo.json', 'utf8'));
  if (!config.woo.ck && f.consumer_key) { config.woo.ck = f.consumer_key; config.woo.cs = f.consumer_secret; }
} catch {}

export const hasOrders = () => !!((config.woo.ck && config.woo.cs) || (config.woo.user && config.woo.pass));

export function assertConfig() {
  if (!config.deepseek.key) {
    console.error('Missing DEEPSEEK_API_KEY');
    process.exit(1);
  }
  if (!hasOrders()) console.warn('No WooCommerce REST key: order lookups, order alerts, cart recovery and sales reports are off until WOO_CONSUMER_KEY/SECRET are set.');
}
