import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withOrg } from './helpers.ts';

test('strategy.formulate picks arg-max expected value minus cost', () => {
  const { r, dispose } = withOrg();
  const s = r.strategy.formulate(r.company.id, 'Market-entry', 'market_entry', [
    { name: 'A', expected: 1, confidence: 0.5, cost_usd: 10, summary: 'low value' },
    { name: 'B', expected: 50, confidence: 0.9, cost_usd: 20, summary: 'high value' },
    { name: 'C', expected: 100, confidence: 0.1, cost_usd: 5, summary: 'low confidence' },
  ]);
  // B: 50*0.9 - 20 = 25  vs A: -9.5  vs C: 5
  const chosen = s.options.find(o => o.id === s.chosen)?.name;
  assert.equal(chosen, 'B');
  dispose();
});

test('strategy.cascade creates one objective per department owned by its manager', () => {
  const { r, cascades, dispose } = withOrg();
  assert.ok(cascades.length >= 5);
  const sales = cascades.find(o => o.title.includes('Sales'));
  assert.ok(sales);
  const dept = r.state.repos.departments(r.company.id).find(d => d.id === sales!.department_id);
  assert.equal(dept?.manager_id, sales!.owner_id);
  dispose();
});

test('strategy.experiment concludes won vs baseline', () => {
  const { r, cascades, dispose } = withOrg();
  const e = r.strategy.startExperiment(r.company.id, cascades[0].id, 'h', 'seo', 'reply_rate', 0.02);
  const done = r.strategy.concludeExperiment(r.company.id, e.id, 0.05);
  assert.equal(done.status, 'won');
  dispose();
});