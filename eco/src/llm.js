// DeepSeek chat completions (OpenAI-compatible) with tool calling and model fallback.
import { config } from './config.js';

let badModel = '';
export async function complete(messages, tools, { maxTokens = 700, temperature = 0.7 } = {}) {
  let lastErr;
  for (const model of [config.deepseek.model, config.deepseek.fallback].filter((m) => m && m !== badModel)) {
    const res = await fetch(`${config.deepseek.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.deepseek.key}` },
      body: JSON.stringify({ model, messages, ...(tools?.length ? { tools } : {}), temperature, max_tokens: maxTokens }),
    });
    if (res.ok) return (await res.json()).choices[0].message;
    lastErr = new Error(`DeepSeek ${model} ${res.status}: ${(await res.text()).slice(0, 200)}`);
    if (![400, 404, 422].includes(res.status)) break; // only fall back on model errors
    if (model === config.deepseek.model) { badModel = model; console.error(lastErr.message); }
  }
  throw lastErr;
}

export async function classify(system, text) {
  const msg = await complete([{ role: 'system', content: system }, { role: 'user', content: text.slice(0, 1500) }], null, { maxTokens: 5, temperature: 0 });
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
  for (let round = 0; round < 6; round++) {
    const msg = await complete(messages, defs, opts);
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
