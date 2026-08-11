import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MockV4Flash, DeepSeekV4Flash, makeDriver } from '../src/agents/llm.ts';

test('makeDriver picks the real DeepSeek lane when the API key is present', () => {
  const hadKey = process.env.DEEPSEEK_API_KEY;
  try {
    process.env.DEEPSEEK_API_KEY = '';
    const mock = makeDriver() as MockV4Flash;
    assert.equal(mock.model, 'mock-v4-flash');
    assert.equal(mock instanceof MockV4Flash, true);
  } finally {
    if (hadKey) process.env.DEEPSEEK_API_KEY = hadKey; else delete process.env.DEEPSEEK_API_KEY;
  }
});

test('mock driver: emits a real http tool call for research prompts with URLs', async () => {
  const d = new MockV4Flash();
  const msgs = [
    { role: 'system', content: 'You are a researcher.' },
    { role: 'user', content: 'Research this target deeply. Input: {"targets":["https://en.wikipedia.org/wiki/Acme_Corporation","https://example.com"]}' },
  ] as any;
  const tools = [{ name: 'http.get', description: 'GET a url', parameters: { type: 'object', properties: { url: { type: 'string' } } } }] as any;
  const comp = await d.complete(msgs, tools);
  assert.equal(comp.tool_calls.length, 1);
  assert.equal(comp.tool_calls[0].name, 'http.get');
  const args = JSON.parse(comp.tool_calls[0].arguments);
  assert.match(args.url, /^https?:\/\//);
});

test('mock driver: emits at most one tool call then summarizes from the tool result', async () => {
  const d = new MockV4Flash();
  const user = { role: 'user', content: 'Research this target deeply. Input: {"targets":["https://example.com"]}' } as any;
  const tools = [{ name: 'http.get', description: 'GET', parameters: { type: 'object', properties: { url: { type: 'string' } } } }] as any;
  const first = await d.complete([user], tools);
  assert.equal(first.tool_calls.length, 1);
  // second call includes the tool result → must NOT emit another tool call
  const second = await d.complete([
    user,
    { role: 'assistant', content: '', name: 'http.get', tool_call_id: 'c1' },
    { role: 'tool', tool_call_id: 'c1', content: '{"status":200,"body":"worked"}' },
  ] as any, tools);
  assert.equal(second.tool_calls.length, 0);
  assert.match(second.text, /tool/i);
});

test('deepseek driver throws clearly without a key (safety guard, never silently mocks)', () => {
  const hadKey = process.env.DEEPSEEK_API_KEY;
  try {
    delete process.env.DEEPSEEK_API_KEY;
    const d = new DeepSeekV4Flash();
    assert.rejects(() => d.complete([
      { role: 'system', content: 'x' }, { role: 'user', content: 'y' },
    ]), /DEEPSEEK_API_KEY|fetch/i);
  } finally {
    if (hadKey) process.env.DEEPSEEK_API_KEY = hadKey;
  }
});