'use strict';
const { getSetting } = require('./settings');

function providerConfig() {
  return {
    baseUrl: (getSetting('ai_base_url', 'https://api.openai.com/v1') || '').replace(/\/+$/, ''),
    apiKey: getSetting('ai_api_key', ''),
    model: getSetting('ai_model', 'gpt-4o-mini'),
    maxTokens: parseInt(getSetting('ai_max_tokens', '2048'), 10) || 2048,
    temperature: parseFloat(getSetting('ai_temperature', '0.7')) || 0.7,
  };
}

class AIError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

async function chatComplete(messages, opts = {}) {
  const cfg = providerConfig();
  if (!cfg.apiKey) {
    throw new AIError('AI provider API key is not configured. Please add it in Admin > Settings.', 503);
  }
  const body = {
    model: opts.model || cfg.model,
    messages,
    max_tokens: opts.maxTokens || cfg.maxTokens,
    temperature: opts.temperature !== undefined ? opts.temperature : cfg.temperature,
  };
  let res;
  try {
    res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    });
  } catch (e) {
    throw new AIError(`Could not reach the AI provider: ${e.message}`, 502);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new AIError(`AI provider error (${res.status}): ${text.slice(0, 300)}`, 502);
  }
  const data = await res.json();
  const content = data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : '';
  return { content: content || '', usage: data.usage || {} };
}

async function chatStream(messages, opts = {}, onDelta) {
  const cfg = providerConfig();
  if (!cfg.apiKey) {
    throw new AIError('AI provider API key is not configured. Please add it in Admin > Settings.', 503);
  }
  const body = {
    model: opts.model || cfg.model,
    messages,
    max_tokens: opts.maxTokens || cfg.maxTokens,
    temperature: opts.temperature !== undefined ? opts.temperature : cfg.temperature,
    stream: true,
  };
  let res;
  try {
    res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(300000),
    });
  } catch (e) {
    throw new AIError(`Could not reach the AI provider: ${e.message}`, 502);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new AIError(`AI provider error (${res.status}): ${text.slice(0, 300)}`, 502);
  }
  let full = '';
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === '[DONE]') continue;
      try {
        const json = JSON.parse(payload);
        const delta = json.choices && json.choices[0] && json.choices[0].delta
          ? (json.choices[0].delta.content || '')
          : '';
        if (delta) {
          full += delta;
          onDelta(delta);
        }
      } catch (_) { /* ignore partial keep-alive lines */ }
    }
  }
  return full;
}

module.exports = { chatComplete, chatStream, AIError, providerConfig };
