// Eco v2 sales memory, kept apart from state.json so that file stays small:
// shopper profiles, recommendations, objections, follow-ups, conversions, cart events, experiments, metrics.
import fs from 'node:fs';
import path from 'node:path';
import { todayIST } from './store.js';

const DIR = path.resolve(process.env.DATA_DIR || 'data');
const FILE = path.join(DIR, 'sales.json');
fs.mkdirSync(DIR, { recursive: true });

const empty = () => ({
  shopper_profiles: {}, chat_profile: {}, recommendations: [], objections: [], follow_ups: [],
  conversion_events: [], cart_events: [], message_experiments: {}, daily_metrics: {},
  product_performance: {}, growth_plans: [], broadcast_history: [],
});
let data = empty();
try { data = { ...empty(), ...JSON.parse(fs.readFileSync(FILE, 'utf8')) }; } catch {}

let timer = null;
export function save() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    try {
      fs.writeFileSync(FILE + '.tmp', JSON.stringify(data));
      fs.renameSync(FILE + '.tmp', FILE);
    } catch (e) { console.error('sales.json save', e.message); }
  }, 500);
}

const cap = (arr, n) => { if (arr.length > n) arr.splice(0, arr.length - n); };

export const db = {
  data,
  profiles() { return data.shopper_profiles; },
  profileKeyOf(chatId) { return data.chat_profile[chatId]; },
  linkChat(chatId, key) { data.chat_profile[chatId] = key; save(); },

  log(list, item, max = 3000) { data[list].push({ ...item, at: Date.now() }); cap(data[list], max); save(); },

  metric(key, n = 1) {
    const d = (data.daily_metrics[todayIST()] ||= {});
    d[key] = (d[key] || 0) + n; save();
  },
  metricsOn(day = todayIST()) { return data.daily_metrics[day] || {}; },

  productPerf(id, field, n = 1) {
    const p = (data.product_performance[id] ||= {});
    p[field] = (p[field] || 0) + n; save();
  },

  experiment(variant, field, n = 1) {
    const v = (data.message_experiments[variant] ||= {});
    v[field] = (v[field] || 0) + n; save();
  },
};
