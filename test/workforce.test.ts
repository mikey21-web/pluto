import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withOrg, deptAgent } from './helpers.ts';

test('workforce.submit creates a QUEUED task and emits task.created', () => {
  const { r, dispose } = withOrg();
  const t = r.workforce.submit(r.company.id, {
    objective_id: null, agent_id: null, kind: 'report', summary: 'daily report', input: {},
  });
  assert.equal(t.status, 'QUEUED');
  assert.equal(t.priority, 5);
  const events = r.state.repos.events(r.company.id).filter(e => e.type === 'task.created');
  assert.ok(events.length >= 1);
  dispose();
});

test('workforce.run auto-completes when no agent is assigned', async () => {
  const { r, dispose } = withOrg();
  const t = r.workforce.submit(r.company.id, { objective_id: null, agent_id: null, kind: 'report', summary: 'x', input: {} });
  const res = await r.workforce.run(t.id);
  assert.equal(res.ok, true);
  assert.equal(res.task.status, 'SUCCEEDED');
  assert.equal(res.task.output.auto, true);
  dispose();
});

test('workforce.run executes a task with an agent and records evidence', async () => {
  const saved = process.env.DEEPSEEK_API_KEY;
  delete process.env.DEEPSEEK_API_KEY;
  const { r, dispose } = withOrg();
  const agent = deptAgent(r, 'Sales')!;
  const t = r.workforce.submit(r.company.id, {
    objective_id: null, agent_id: agent.id, kind: 'report', summary: 'weekly sales report', input: { period: 'Q1' },
  });
  const res = await r.workforce.run(t.id);
  assert.equal(res.ok, true);
  assert.equal(res.task.status, 'SUCCEEDED');
  assert.ok(res.evidence.length >= 1);
  assert.ok(res.cost_usd >= 0);
  const traces = r.state.repos.traces(r.company.id);
  assert.ok(traces.length >= 1);
  assert.equal(traces[0].agent_id, agent.id);
  if (saved === undefined) delete process.env.DEEPSEEK_API_KEY; else process.env.DEEPSEEK_API_KEY = saved;
  dispose();
});

test('workforce.run marks task FAILED when llm budget ceiling is exhausted', async () => {
  const { r, dispose } = withOrg();
  r.state.repos.setBudget({ company_id: r.company.id, scope: 'llm', allocated_usd: 0.001, limit_usd: 0.001 });
  r.state.repos.spend(r.company.id, 'llm', 0.001);
  const t = r.workforce.submit(r.company.id, { objective_id: null, agent_id: null, kind: 'report', summary: 'x', input: {} });
  const res = await r.workforce.run(t.id);
  assert.equal(res.ok, false);
  assert.equal(res.task.status, 'FAILED');
  assert.equal(res.task.output.refused, 'budget_exhausted');
  dispose();
});

test('workforce.runAll submits and runs a batch sequentially', async () => {
  const { r, dispose } = withOrg();
  const items = [
    { kind: 'report', summary: 'r1', input: {} },
    { kind: 'report', summary: 'r2', input: {} },
  ];
  const results = await r.workforce.runAll(r.company.id, items);
  assert.equal(results.length, 2);
  for (const res of results) assert.equal(res.task.status, 'SUCCEEDED');
  dispose();
});

test('workforce.assignByDepartment assigns tasks to the department manager agent', () => {
  const { r, cascades, dispose } = withOrg();
  const salesObj = cascades.find(o => o.title.includes('Sales'))!;
  const sales = deptAgent(r, 'Sales')!;
  const tasks = r.workforce.assignByDepartment(r.company.id, salesObj.id, 'Sales', [
    { kind: 'outreach', summary: 'draft outreach', input: { lead: 'x' } },
  ]);
  assert.equal(tasks[0].agent_id, sales.id);
  assert.equal(tasks[0].objective_id, salesObj.id);
  assert.equal(tasks[0].status, 'QUEUED');
  dispose();
});
