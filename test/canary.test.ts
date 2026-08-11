import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CanaryDeploy, CANARY_STAGES } from '../src/meta/canary.ts';
import { makeRuntime } from './helpers.ts';

test('canary stages match 5% → 10% → 50% → 100%', () => {
  assert.deepEqual([...CANARY_STAGES], [0.05, 0.1, 0.5, 1]);
});

test('canary promote walks stages then goes live', () => {
  const c = new CanaryDeploy();
  const e = c.start({ company_id: 'c1', tool_name: 'calc.double' });
  assert.equal(e.stage, 0.05);
  for (let i = 0; i < CANARY_STAGES.length; i++) c.promote(e.id);
  assert.equal(c.list('c1')[0].status, 'live');
  assert.equal(c.list('c1')[0].stage, 1);
});

test('canary rollback reverts one stage and stop hard-retires', () => {
  const c = new CanaryDeploy();
  const e = c.start({ company_id: 'c1', tool_name: 't' });
  c.promote(e.id); // 10%
  assert.equal(c.list('c1')[0].stage, 0.1);
  c.rollback(e.id); // back to 5%
  assert.equal(c.list('c1')[0].stage, 0.05);
  c.stop(e.id);
  assert.equal(c.list('c1')[0].status, 'rolled_back');
  assert.equal(c.promote(e.id), null, 'rolled back cannot promote');
});

test('isLive true only at full rollout', () => {
  const c = new CanaryDeploy();
  const e = c.start({ company_id: 'c1', tool_name: 'x' });
  assert.equal(c.isLive('c1', 'x'), false);
  for (let i = 0; i < CANARY_STAGES.length; i++) c.promote(e.id);
  assert.equal(c.isLive('c1', 'x'), true);
});

test('shouldServe routes a call deterministically to canary arm by seed bucket', () => {
  const c = new CanaryDeploy();
  const e = c.start({ company_id: 'c1', tool_name: 't' }); // 5%
  let served = 0;
  const N = 5000;
  for (let i = 0; i < N; i++) if (c.shouldServe(e.id, `seed${i}`)) served++;
  const rate = served / N;
  assert.ok(rate > 0.01 && rate < 0.12, `expected ~5% got ${(rate * 100).toFixed(2)}%`);
  // live arm always serves
  for (let i = 0; i < CANARY_STAGES.length; i++) c.promote(e.id);
  assert.equal(c.shouldServe(e.id, 'x'), true);
});

test('canary isLive/shouldServe tied to runtime surface + list filtered by company', () => {
  const { r, dispose } = makeRuntime();
  const e = r.canary.start({ company_id: r.company.id, tool_name: 'synthetic.tool' });
  r.canary.promote(e.id);
  r.canary.promote(e.id);
  r.canary.promote(e.id);
  r.canary.promote(e.id);
  assert.equal(r.canary.isLive(r.company.id, 'synthetic.tool'), true);
  assert.equal(r.canary.list('other-company').length, 0);
  dispose();
});
