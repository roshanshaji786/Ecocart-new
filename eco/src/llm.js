// DeepSeek chat completions (OpenAI-compatible) with tool calling and model fallback.
import { config } from './config.js';

let badModel = '';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const PRO = () => config.deepseek.fallback || config.deepseek.model;

// model: optional override (e.g. Pro for owner strategy). Falls back to the other model on model errors,
// retries with backoff on rate limits, server errors and network failures, and never throws an HTML page.
export async function complete(messages, tools, { maxTokens = 2500, temperature = 0.7, model: want } = {}) {
  let lastErr;
  const models = [...new Set([want, config.deepseek.model, config.deepseek.fallback].filter((m) => m && m !== badModel))];
  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      let res;
      try {
        res = await fetch(`${config.deepseek.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.deepseek.key}` },
          body: JSON.stringify({ model, messages, ...(tools?.length ? { tools } : {}), temperature, max_tokens: maxTokens }),
          signal: AbortSignal.timeout(90000),
        });
      } catch (e) {
        lastErr = e; await sleep(1500 * (attempt + 1) ** 2); continue;
      }
      if (res.ok) return (await res.json()).choices[0].message;
      lastErr = new Error(`DeepSeek ${model} ${res.status}: ${(await res.text()).slice(0, 200)}`);
      if ([429, 500, 502, 503, 504].includes(res.status)) { await sleep(1500 * (attempt + 1) ** 2); continue; }
      if ([400, 404, 422].includes(res.status) && model === config.deepseek.model && !tools?.length) { badModel = model; console.error(lastErr.message); }
      break; // try the next model
    }
  }
  throw lastErr;
}

export async function classify(system, text) {
  const msg = await complete([{ role: 'system', content: system }, { role: 'user', content: text.slice(0, 1500) }], null, { maxTokens: 600, temperature: 0 });
  return (msg.content || '').trim().toUpperCase();
}

// tools: { name: { description, parameters, run(args) } }
export async function runAgent(system, history, tools, opts = {}) {
  const defs = Object.entries(tools).map(([name, t]) => ({
    type: 'function', function: { name, description: t.description, parameters: t.parameters },
  }));
  const messages = [{ role: 'system', content: system }, ...history];
  const used = [];
  const said = []; // text the model wrote alongside tool calls ("let me check…", a first recommendation)
  const finish = (t) => ({ text: [...said, (t || '').trim()].filter(Boolean).join('\n\n'), used });
  for (let round = 0; round < (opts.rounds || 8); round++) {
    const msg = await complete(messages, defs, { maxTokens: opts.maxTokens, model: opts.model, temperature: opts.temperature });
    if (!msg.tool_calls?.length) return finish(msg.content);
    if (msg.content?.trim() && said.length < 1) said.push(msg.content.trim());
    messages.push({ role: 'assistant', content: msg.content || '', tool_calls: msg.tool_calls });
    for (const call of msg.tool_calls) {
      used.push(call.function.name);
      let result;
      try {
        const tool = tools[call.function.name];
        if (!tool) throw new Error('unknown tool');
        result = await tool.run(JSON.parse(call.function.arguments || '{}'));
      } catch (e) {
        result = { error: String(e.message || e) };
      }
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result ?? null).slice(0, 6000) });
    }
  }
  return finish('One sec, let me check and get back to you.');
}
