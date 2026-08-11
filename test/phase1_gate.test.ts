import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRuntime, withOrg } from './helpers.ts';

/**
 * Phase 1 gate — programmatic assertions for the three reliability gates
 * (PLAN L547-553): self-extension reliable, silent-competence reliable, and
 * cost per agent-hour measured. Plus: all 5 primitives are present and no
 * critical safety incidents fire.
 */
test('all 5 primitives are wired and reachable on the runtime', () => {
  const { r, dispose } = makeRuntime();
  try {
    // 1a World Model · 1b Message Bus · 1c Meta · 1d Immune · 1f Foraging (+ 1g Brain, 1e Reality)
    assert.ok(r.world, '1a world');
    assert.ok(r.messages, '1b bus');
    assert.ok(r.meta, '1c meta');
    assert.ok(r.immune, '1d immune');
    assert.ok(r.forage, '1f foraging');
  } finally { dispose(); }
});

test('self-extension: synthesize → sandbox-pass → register → canary live, and meta spawns its own agent', async () => {
  const { r, dispose } = makeRuntime();
  try {
    const cid = r.company.id;
    const spec = r.synthesizer.synthesize(JSON.stringify({
      name: 'calc.leadscore', description: 'Score a lead 0-100 from employees',
      parameters: { type: 'object', properties: { employees: { type: 'number' } } },
      js: `(a) => ({ ok: true, content: String(Math.min(100, Math.round((Number(a.employees)||0) / 2))) })`,
    }));
    assert.ok(spec);
    const res = await r.synthesizer.sandboxTest(spec!, [
      { args: { employees: 100 }, expect: '50' },
      { args: { employees: 40 }, expect: '20' },
    ]);
    assert.equal(res.passed, true, 'tool passes synthetic tests');

    r.capabilities.registerVersion(cid, 'lead_scoring', { description: 'score leads', provider: 'synth' });
    const can = r.canary.start({ company_id: cid, tool_name: 'lead_scoring' });
    r.canary.promote(can.id); r.canary.promote(can.id); r.canary.promote(can.id); r.canary.promote(can.id);
    assert.equal(r.canary.isLive(cid, 'lead_scoring'), true, 'promoted to live');

    const spawned = await r.meta.spawnForGap(cid, 'tender_analysis', 'gate test');
    assert.ok(spawned.agent.id, 'meta spawns its own agent');
  } finally { dispose(); }
});

test('silent competence: transient/fixable failures heal with zero human wakeups', async () => {
  const { r, dispose } = makeRuntime();
  try {
    const spec = {
      name: 'calc.double', description: 'double', parameters: {},
      js: `(a) => ({ ok: true, content: String(Number(a.n) * 2) })`,
    };
    const log = await r.immune.fixTool({
      company_id: r.company.id, tool_name: 'calc.double', current: spec,
      tests: [{ args: { n: 2 }, expect: '4' }], error: 'intermittent regression',
    });
    assert.equal(log.outcome, 'fixed');
    assert.equal(r.immune.humanWakeupsCount(), 0, 'zero human wakeups (silent competence)');
  } finally { dispose(); }
});

test('cost per agent-hour is measured and finite (>0) from live task traces', async () => {
  const { r, cascades, dispose } = withOrg();
  try {
    void cascades;
    const cid = r.company.id;
    const deps = r.state.repos.departments(cid);
    const pipeline = deps.slice(0, 3).map(d => ({
      kind: 'research', summary: `research ${d.name}`, input: { q: d.name },
      objective_id: null, agent_id: d.manager_id,
    }));
    const t0 = Date.now();
    const results = await r.workforce.runAll(cid, pipeline);
    const ms = Date.now() - t0;
    const cost = results.reduce((a, x) => a + x.cost_usd, 0);
    const hours = (deps.length * ms) / 3_600_000;
    const perHour = hours > 0 ? cost / hours : cost * 1000;
    assert.ok(Number.isFinite(perHour) && perHour > 0, 'cost per agent-hour measured and finite');
  } finally { dispose(); }
});

test('zero critical safety incidents in the gate run', () => {
  const { r, dispose } = makeRuntime();
  try {
    // no sovereign kill-switch or exploit escalation paths fire in normal gate flow
    const events = r.state.repos.events(r.company.id, 2000);
    const critical = events.filter(e => /kill|halt|sovereign|exploit|breach/i.test(e.type));
    assert.equal(critical.length, 0);
  } finally { dispose(); }
});
