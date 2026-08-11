import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withOrg, deptAgent } from './helpers.ts';
import { Observability } from '../src/plane/observability.ts';

test('observability.agentHook writes traces, accumulates cost, and spends the llm budget', () => {
  const { r, dispose } = withOrg();
  const agent = deptAgent(r, 'Sales')!;
  const obs = new Observability(r.state);
  const hook = obs.agentHook({ company_id: r.company.id, task_id: 't1', agent_id: agent.id, model: 'mock-v4-flash' });
  hook('step_0', { text: 'hi', tool_calls: 1, tokens_in: 100, tokens_out: 50, latency_ms: 12, cost_usd: 0.0005 });

  const traces = r.state.repos.traces(r.company.id);
  assert.equal(traces.length, 1);
  assert.equal(traces[0].step, 'step_0');
  assert.equal(traces[0].agent_id, agent.id);
  assert.equal(traces[0].cost_usd, 0.0005);

  const reloaded = r.state.repos.agent(agent.id)!;
  assert.ok(reloaded.budget.used_usd > 0);
  const llm = r.state.repos.budgets(r.company.id).find(b => b.scope === 'llm')!;
  assert.ok(llm.used_usd > 0);
  dispose();
});

test('observability transitions a task through RUNNING/SUCCEEDED and bumps agent wins', () => {
  const { r, dispose } = withOrg();
  const agent = deptAgent(r, 'Sales')!;
  const obs = new Observability(r.state);
  const task = r.state.repos.createTask({ company_id: r.company.id, agent_id: agent.id, summary: 't', kind: 'report' });

  obs.taskStarted(task.id);
  assert.equal(r.state.repos.task(task.id)!.status, 'RUNNING');

  obs.taskSucceeded(task.id, { ok: 1 });
  assert.equal(r.state.repos.task(task.id)!.status, 'SUCCEEDED');
  const after = r.state.repos.agent(agent.id)!;
  assert.equal(after.performance.tasks_done, 1);
  assert.equal(after.performance.wins, 1);
  assert.equal(after.performance.success_rate, 1);
  dispose();
});

test('observability.taskFailed records failure reason and bumps agent losses', () => {
  const { r, dispose } = withOrg();
  const agent = deptAgent(r, 'Sales')!;
  const obs = new Observability(r.state);
  const task = r.state.repos.createTask({ company_id: r.company.id, agent_id: agent.id, summary: 't', kind: 'report' });

  obs.taskFailed(task.id, 'tool crashed');
  const t = r.state.repos.task(task.id)!;
  assert.equal(t.status, 'FAILED');
  assert.equal(t.output.failure, 'tool crashed');
  const after = r.state.repos.agent(agent.id)!;
  assert.equal(after.performance.tasks_done, 1);
  assert.equal(after.performance.wins, 0);
  assert.equal(after.performance.success_rate, 0);
  dispose();
});

test('observability is a no-op for unknown task ids', () => {
  const { r, dispose } = withOrg();
  const obs = new Observability(r.state);
  assert.doesNotThrow(() => { obs.taskStarted('missing'); obs.taskSucceeded('missing'); obs.taskFailed('missing'); });
  dispose();
});
