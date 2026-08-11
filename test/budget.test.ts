import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withOrg, makeRuntime } from './helpers.ts';

test('resources: default budgets seeded for all scopes', () => {
  const { r, dispose } = withOrg();
  const rows = r.resources.ledger(r.company.id);
  assert.ok(rows.length >= 6);
  const llm = r.resources.budget(r.company.id, 'llm');
  assert.equal(llm?.limit_usd, 100);
  dispose();
});

test('resources: spend within ceiling debits budget', () => {
  const { r, dispose } = withOrg();
  const spent = r.resources.spend(r.company.id, 'llm', 12.5);
  assert.equal(spent, 12.5);
  assert.equal(r.resources.budget(r.company.id, 'llm')?.used_usd, 12.5);
  dispose();
});

test('resources: spend over ceiling is denied (returns 0) and emits budget.denied', () => {
  const { r, dispose } = withOrg();
  r.resources.allocate(r.company.id, 'llm', 1); // set a $1 hard ceiling
  assert.equal(r.resources.spend(r.company.id, 'llm', 2), 0);
  const denied = r.state.repos.recentEvents(r.company.id).filter(ev => ev.type === 'budget.denied');
  assert.ok(denied.length >= 1, 'budget.denied must be emitted once');
  assert.equal(r.resources.budget(r.company.id, 'llm')?.used_usd, 0);
  dispose();
});

test('workforce: hard gate refuses a task when llm ceiling is exhausted', async () => {
  const { r, cascades, dispose } = withOrg();
  const dept = r.state.repos.departments(r.company.id).find(d => d.name === 'Sales')!;
  const agent = dept.manager_id ? r.state.repos.agent(dept.manager_id) : null;
  const obj = cascades.find(o => o.department_id === dept.id);
  const t = r.workforce.submit(r.company.id, {
    kind: 'research', summary: 'x', input: { targets: ['https://example.com'] },
    objective_id: obj?.id ?? null, agent_id: agent?.id ?? null,
  });
  // exhaust the llm budget so the pre-run gate refuses
  r.resources.allocate(r.company.id, 'llm', 0); // zero remaining → gate must refuse
  const res = await r.workforce.run(t.id);
  assert.equal(res.ok, false);
  assert.equal(res.task.status, 'FAILED');
  assert.match(res.message, /budget ceiling exhausted/);
  assert.equal((res.task.output as any)?.refused, 'budget_exhausted');
  const blocked = r.state.repos.recentEvents(r.company.id).some(ev => ev.type === 'task.budget_blocked');
  assert.ok(blocked);
  dispose();
});