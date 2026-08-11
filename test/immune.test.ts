import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRuntime } from './helpers.ts';
import { ImmuneSystem } from '../src/immune/engine.ts';
import { ToolSynthesizer } from '../src/meta/synthesizer.ts';
import type { ToolSpec } from '../src/meta/synthesizer.ts';

const goodSpec: ToolSpec = {
  name: 'calc.double',
  description: 'Double a number',
  parameters: { type: 'object', properties: { n: { type: 'number' } } },
  js: `(args) => ({ ok: true, content: String(Number(args.n) * 2) })`,
};

function fresh() {
  const s = new ToolSynthesizer();
  const immune = new ImmuneSystem(null as unknown as never, { synth: s });
  return { s, immune };
}

test('classify routes failure strings to the right bucket', () => {
  const { immune } = fresh();
  assert.equal(immune.classify('connection refused, retry', {}), 'transient');
  assert.equal(immune.classify('timeout after 30s', {}), 'transient');
  assert.equal(immune.classify('missing API key', {}), 'config');
  assert.equal(immune.classify('authentication failed', {}), 'config');
  assert.equal(immune.classify('Cannot read properties of undefined', {}), 'logic');
  assert.equal(immune.classify('Unknown tool: foo.bar', {}), 'missing');
  assert.equal(immune.classify('third-party provider returned 500', {}), 'external');
  assert.equal(immune.classify('totally generic error', {}), 'logic');
});

test('validation gates a broken fix and passes a working one', async () => {
  const { immune } = fresh();
  const broken: ToolSpec = { ...goodSpec, js: `(args) => ({ ok: true, content: 'oops' })` };
  const r1 = await immune.validate({ spec: broken, synthetic: [{ args: { n: 2 }, expect: '4' }], historical: [] });
  assert.equal(r1.ok, false);
  assert.ok(r1.failures.length > 0);

  const r2 = await immune.validate({ spec: goodSpec, synthetic: [{ args: { n: 2 }, expect: '4' }], historical: [{ args: { n: 21 }, expect: '42' }] });
  assert.equal(r2.ok, true);
  assert.deepEqual(r2.failures, []);
});

test('transient failures are self-resolved without human wakeup', async () => {
  const { immune } = fresh();
  const log = await immune.fixTool({ company_id: 'c1', tool_name: 'http.get', current: goodSpec, tests: [], error: 'connection refused, retry' });
  assert.equal(log.outcome, 'fixed');
  assert.equal(log.failure_class, 'transient');
  assert.equal(immune.humanWakeupsCount(), 0);
});

test('an unfixable logic bug escalates to a human once', async () => {
  const { immune } = fresh();
  const broken: ToolSpec = { ...goodSpec, js: `(args) => ({ ok: true, content: 'wrong' })` };
  const tests = [{ args: { n: 2 }, expect: '4' }];
  const log = await immune.fixTool({ company_id: 'c1', tool_name: 'calc.double', current: broken, tests, error: 'tests failing' });
  assert.equal(log.outcome, 'needs_human');
  assert.equal(immune.humanWakeupsCount(), 1);
});

test('repairAgent remembers the intervention', () => {
  const { r, dispose } = makeRuntime();
  try {
    const agent = r.state.repos.createAgent({ company_id: r.company.id, name: 'Repair Bot', role: 'fixer' });
    const log = r.immune.repairAgent(r.company.id, agent.id);
    assert.equal(log.outcome, 'fixed');
    assert.equal(log.deployed, true);
    assert.equal(r.immune.auditLog(r.company.id).length, 1);
    assert.equal(r.immune.humanWakeupsCount(), 0);
  } finally { dispose(); }
});

test('beginPromotion starts a canary deployment', () => {
  const { immune } = fresh();
  const { entry } = immune.beginPromotion({ company_id: 'c1', tool_name: 'calc.double' });
  assert.ok(entry);
  assert.ok(entry.id);
});

test('adversary flags an unsafe tool and proposes a patch', () => {
  const { immune } = fresh();
  const safe = immune.adversaryRun({ company_id: 'c1', candidate: { ...goodSpec, description: 'safely doubles a number' }, probes: [{ payload: { n: 2 }, expect: '4' }] });
  assert.equal(safe.vulnerable, false);
  assert.equal(safe.patch, 'no patch required');

  const risky: ToolSpec = { ...goodSpec, description: 'dangerously executes child_process shell commands from untrusted input' };
  const vuln = immune.adversaryRun({ company_id: 'c1', candidate: risky, probes: [{ payload: { x: 'id' }, expect: 'ok' }] });
  assert.equal(vuln.vulnerable, true);
  assert.ok(vuln.findings.length >= 1);
  assert.ok(vuln.patch.startsWith('restrict'));
  assert.ok(immune.adversaryFindings().some(f => f.includes('FLAG calc.double')));
});

test('runtime wires an immune instance with agent/tool health', () => {
  const { r, dispose } = makeRuntime();
  try {
    assert.ok(r.immune instanceof ImmuneSystem);
    assert.equal(r.immune.agentHealth(r.company.id).length, 0);
    assert.deepEqual(r.immune.toolHealth(r.company.id), []);
  } finally { dispose(); }
});

test('end-to-end: intro bug is detected, revalidated, and promoted without a human', async () => {
  const { immune } = fresh();
  // the "bug": a freshly synthesized tool that a prior regression broke. The
  // immune system revalidates it against synthetic plus historical tests. A
  // clean re-run → fixed (no source change), and promotion begins.
  const tests = [{ args: { n: 3 }, expect: '6' }, { args: { n: 14 }, expect: '28' }];
  const log = await immune.fixTool({ company_id: 'c1', tool_name: 'calc.double', current: goodSpec, tests, error: 'intermittent regression' });
  assert.equal(log.outcome, 'fixed');
  assert.equal(log.deployed, false); // promotion is staged, not immediately live
  assert.equal(immune.humanWakeupsCount(), 0);

  const { entry } = immune.beginPromotion({ company_id: 'c1', tool_name: 'calc.double' });
  assert.ok(entry.id);
  assert.equal(immune.auditLog('c1').filter(l => l.target_name === 'calc.double').length >= 1, true);
});
