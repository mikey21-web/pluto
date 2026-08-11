import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ToolSynthesizer } from '../src/meta/synthesizer.ts';
import type { ToolSpec } from '../src/meta/synthesizer.ts';

const s = new ToolSynthesizer();

const goodSpec: ToolSpec = {
  name: 'calc.double',
  description: 'Double a number',
  parameters: { type: 'object', properties: { n: { type: 'number' } } },
  js: `(args) => ({ ok: true, content: String(Number(args.n) * 2) })`,
};

test('synthesize parses a valid tool spec from LLM output', () => {
  const spec = s.synthesize(`here is your tool\n${JSON.stringify(goodSpec)}`);
  assert.ok(spec);
  assert.equal(spec!.name, 'calc.double');
  assert.ok(spec!.description.includes('Double'));
});

test('synthesize returns null for malformed output', () => {
  assert.equal(s.synthesize('not a tool'), null);
  assert.equal(s.synthesize(JSON.stringify({ name: 'x' })), null, 'missing js/description');
});

test('sandboxTest passes when the tool satisfies synthetic tests', async () => {
  const res = await s.sandboxTest(goodSpec, [
    { args: { n: 2 }, expect: '4' },
    { args: { n: 21 }, expect: '42' },
  ]);
  assert.equal(res.passed, true);
  assert.deepEqual(res.failures, []);
  assert.ok(res.tool);
});

test('sandboxTest fails and reports each failing case', async () => {
  const res = await s.sandboxTest(goodSpec, [
    { args: { n: 2 }, expect: '5' },
    { args: { n: 21 }, expect: '999' },
  ]);
  assert.equal(res.passed, false);
  assert.equal(res.failures.length, 2);
});

test('sandboxTest catches thrown errors as failures', async () => {
  const bad: ToolSpec = { ...goodSpec, js: `(args) => { throw new Error('boom'); }` };
  const res = await s.sandboxTest(bad, [{ args: { n: 1 }, expect: 'x' }]);
  assert.equal(res.passed, false);
  assert.ok(res.failures[0].includes('boom'));
});

test('sandboxTest reports compile-time errors (bad js) not as runtime failures', async () => {
  const invalid: ToolSpec = { ...goodSpec, js: `this is not javascript ((` };
  const res = await s.sandboxTest(invalid, [{ args: {}, expect: 'x' }]);
  assert.equal(res.passed, false);
  assert.ok(res.error, 'compile error should set error');
});

test('checksum is stable across identical specs and differs across tools', () => {
  const a = s.checksum(goodSpec);
  const b = s.checksum({ ...goodSpec });
  const c = s.checksum({ ...goodSpec, name: 'other.tool' });
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test('synthesized tool is a runnable ToolDef returning ToolResult', async () => {
  const res = await s.sandboxTest(goodSpec, [{ args: { n: 7 }, expect: '14' }]);
  assert.equal(res.passed, true);
  const out = await res.tool!.run({ n: 7 }, { company_id: '', agent_id: '', task_id: '', state: { remember: () => ({} as any), repos: { memory: () => [], graphNodes: () => [], graphEdges: () => [] } } });
  assert.equal(out.content, '14');
  assert.equal(out.ok, true);
});
