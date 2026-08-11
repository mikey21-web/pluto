import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BrainLayer } from '../src/brain/index.ts';
import { ModelRouter, PromptCache, DEFAULT_ROUTING_RULES } from '../src/brain/router.ts';
import { TuneRegistry, FallbackChain } from '../src/brain/tune.ts';
import { ContextWindow } from '../src/brain/window.ts';
import { MockV4Flash } from '../src/agents/llm.ts';
import type { ChatMsg, LlmDriver } from '../src/kernel/types.ts';

class CountingDriver implements LlmDriver {
  model = 'counting';
  calls = 0;
  async complete(msgs: ChatMsg[]): Promise<{ text: string; tool_calls: never[]; usage: { prompt_tokens: number; completion_tokens: number }; model: string }> {
    this.calls++;
    const text = msgs.map(m => m.content).join('|');
    return { text: `echo:${text.slice(0, 40)}`, tool_calls: [], usage: { prompt_tokens: 100, completion_tokens: 10 }, model: this.model };
  }
}

const aMsg = (content: string): ChatMsg => ({ role: 'user', content });

test('brain.complete funnels through cache; identical prompts hit cache after first call', async () => {
  const inner = new CountingDriver();
  const brain = new BrainLayer({ defaultDriver: inner, cacheEnabled: true });
  const m = [aMsg('same exact system prompt body with enough length to be stable')];
  await brain.complete(m);
  await brain.complete(m);
  await brain.complete(m);
  assert.equal(inner.calls, 1, 'only first call should reach the provider');
  assert.equal(brain.cache.usage.cache_hits, 2);
});

test('brain.usage reports router + cache aggregates', async () => {
  const brain = new BrainLayer({ defaultDriver: new CountingDriver(), cacheEnabled: false });
  await brain.complete([aMsg('first')]);
  await brain.complete([aMsg('second')]);
  const u = brain.usage();
  const totalCalls = u.router.cheap.calls + u.router.standard.calls + u.router.heavy.calls;
  assert.ok(totalCalls >= 1);
  assert.ok(u.total_cost_usd >= 0);
});

test('brain.usage remains zero before any call', () => {
  const brain = new BrainLayer({ defaultDriver: new CountingDriver() });
  const u = brain.usage();
  assert.equal(u.router.standard.calls, 0);
  assert.equal(u.total_cost_usd, 0);
});

test('model router routes heavy prompts to heavy tier, cheap to cheap tier', async () => {
  const heavy = new CountingDriver(); heavy.model = 'heavy';
  const cheap = new CountingDriver(); cheap.model = 'cheap';
  const router = new ModelRouter({ cheap, standard: cheap, heavy }, DEFAULT_ROUTING_RULES);
  await router.complete([aMsg('CALL_TOOL:http.get advance this')]);
  await router.complete([aMsg('hi')]);
  const s = router.snapshot();
  assert.equal(s.heavy.calls, 1);
  assert.equal(s.cheap.calls, 1);
});

test('prompt cache disabled path still works when cache disabled', async () => {
  const inner = new CountingDriver();
  const cache = new PromptCache(inner, { enabled: false });
  const m = [aMsg('repeat me')];
  await cache.complete(m);
  await cache.complete(m);
  assert.equal(inner.calls, 2);
  assert.equal(cache.usage.cache_hits, 0);
});

test('tune registry registers versions, active bumps, rollback restores prior', () => {
  const r = new TuneRegistry();
  r.register({ company_id: 'c1', task_kind: 'research', model: 'v1' });
  r.register({ company_id: 'c1', task_kind: 'research', model: 'v2' });
  assert.equal(r.activeFor('c1', 'research')!.model, 'v2');
  const rolled = r.rollback('c1', 'research')!;
  assert.equal(rolled.model, 'v1');
  assert.equal(r.activeFor('c1', 'research')!.model, 'v1');
});

test('tune registry A/B picks among fraction candidates and filters by scope', () => {
  const r = new TuneRegistry();
  r.register({ company_id: 'c1', task_kind: 't', model: 'a', active: false, fraction: 0.5 });
  r.register({ company_id: 'c1', task_kind: 't', model: 'b', active: false, fraction: 0.5 });
  const pick = r.activeFor('c1', 't');
  assert.ok(pick && ['a', 'b'].includes(pick.model));
  assert.equal(r.activeFor('c2', 't'), null);
});

test('fallback chain tries providers in order and surfaces last failure', async () => {
  const good = new CountingDriver(); good.model = 'good';
  const bad = { model: 'bad', complete: async () => { throw new Error('boom'); } };
  const chain = new FallbackChain([{ driver: bad, name: 'bad' }, { driver: good, name: 'good' }]);
  const comp = await chain.complete([aMsg('x')]);
  assert.ok(comp.text.startsWith('echo:'));
  const ok = new FallbackChain([{ driver: good, name: 'good' }]);
  await ok.complete([aMsg('y')]);
  assert.deepEqual(ok.lastFailures(), []);
});

test('context window drops oldest non-system messages over budget', () => {
  const w = new ContextWindow({ budget: 100 });
  const msgs: ChatMsg[] = [
    { role: 'system', content: 'SYS' },
    { role: 'user', content: 'x'.repeat(80) },
    { role: 'user', content: 'y'.repeat(200) },
    { role: 'user', content: 'z'.repeat(200) },
  ];
  const fitted = w.fit(msgs);
  // system kept, at most ~100 tokens of the rest (25 chars each unit)
  assert.ok(fitted.some(m => m.role === 'system'));
  const nonSys = fitted.filter(m => m.role !== 'system');
  assert.ok(nonSys.length <= 2, `expected ≤2 non-system, got ${nonSys.length}`);
});

test('context window splitForInput returns head+body and short input stays whole', () => {
  const w = new ContextWindow({ budget: 100 });
  const short = w.splitForInput('tiny');
  assert.equal(short.head, 'tiny');
  assert.equal(short.body, 'tiny');
  const long = w.splitForInput('a'.repeat(10) + '\n' + 'b'.repeat(3000));
  assert.ok(long.head.length < 3000);
  assert.equal(long.body.length, 3011);
});

test('brain as LlmDriver is usable by AgentLoop-style composition', async () => {
  const brain = new BrainLayer({ defaultDriver: new MockV4Flash(), cacheEnabled: true });
  const comp = await brain.complete([{ role: 'user', content: 'write a report' }]);
  assert.ok(comp.text.length > 0);
});
