import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withOrg, deptAgent } from './helpers.ts';
import { MetaAgent } from '../src/meta/engine.ts';
import type { LlmDriver } from '../src/kernel/types.ts';

class SpecDriver implements LlmDriver {
  model = 'fake';
  async complete(): Promise<{ text: string; tool_calls: never[]; usage: { prompt_tokens: number; completion_tokens: number }; model: string }> {
    return {
      text: JSON.stringify({
        name: 'SEO Analyst', role: 'seo_analyst', prompt: 'run seo audits with real tools',
        tools: ['http.get', 'memory.write'], permissions: ['run_seo_audit'],
        budget_usd: 50, kpis: [{ label: 'audits', target: 5, unit: 'per week' }], department_id: null,
      }),
      tool_calls: [], usage: { prompt_tokens: 10, completion_tokens: 20 }, model: this.model,
    };
  }
}

test('meta.detectGaps surfaces failed tasks with unfamiliar kinds', async () => {
  const { r, dispose } = withOrg();
  r.state.repos.setBudget({ company_id: r.company.id, scope: 'llm', allocated_usd: 0.001, limit_usd: 0.001 });
  r.state.repos.spend(r.company.id, 'llm', 0.001);
  const t = r.workforce.submit(r.company.id, { objective_id: null, agent_id: null, kind: 'seo_audit', summary: 'audit seo', input: {} });
  const res = await r.workforce.run(t.id);
  assert.equal(res.task.status, 'FAILED');
  const gaps = r.meta.detectGaps(r.company.id);
  const g = gaps.find(x => x.capability === 'seo_audit');
  assert.ok(g, 'expected a seo_audit gap');
  assert.equal(g!.source_task, t.id);
  dispose();
});

test('meta.detectGaps catches unknown tool calls in traces', () => {
  const { r, dispose } = withOrg();
  r.state.repos.trace({ company_id: r.company.id, task_id: 'task_x', step: 'tool_bad', model: 'm', latency_ms: 1, cost_usd: 0, payload: { text: 'Unknown tool: stripe_charge' } });
  const gaps = r.meta.detectGaps(r.company.id);
  assert.ok(gaps.some(g => g.capability === 'stripe_charge'), 'stripe_charge gap expected');
  dispose();
});

test('meta.detectGaps ignores kinds already covered by agents or capabilities', () => {
  const { r, dispose } = withOrg();
  const agent = deptAgent(r, 'Sales')!;
  r.state.repos.trace({ company_id: r.company.id, task_id: null, step: 'x', model: 'm', latency_ms: 1, cost_usd: 0, payload: { text: `Unknown tool: ${agent.role}` } });
  const gaps = r.meta.detectGaps(r.company.id);
  assert.equal(gaps.some(g => g.capability === agent.role), false);
  dispose();
});

test('meta.generateSpec uses the LLM spec when valid JSON comes back', async () => {
  const { r, dispose } = withOrg();
  const meta = new MetaAgent(r.state, { driver: new SpecDriver() });
  const spec = await meta.generateSpec(r.company.id, { capability: 'seo_audit', reason: 'failed', source_task: null, evidence: '' });
  assert.equal(spec.role, 'seo_analyst');
  assert.equal(spec.name, 'SEO Analyst');
  assert.deepEqual(spec.tools, ['http.get', 'memory.write']);
  assert.equal(spec.budget_usd, 50);
  assert.equal(spec.kpis[0].label, 'audits');
  dispose();
});

test('meta.generateSpec falls back to a deterministic default when the LLM output is not JSON', async () => {
  const { r, dispose } = withOrg();
  const silent = new MetaAgent(r.state, {
    driver: { model: 'silent', complete: async () => ({ text: 'I refuse to return JSON.', tool_calls: [], usage: { prompt_tokens: 1, completion_tokens: 1 }, model: 'silent' }) },
  });
  const spec = await silent.generateSpec(r.company.id, { capability: 'cold_email_delivery', reason: 'n/a', source_task: null, evidence: '' });
  assert.equal(spec.role, 'cold_email_delivery_specialist');
  assert.ok(spec.tools.length > 0);
  assert.ok(spec.budget_usd > 0);
  dispose();
});

test('meta.spawn registers agent, capability, and seeded memory', () => {
  const { r, dispose } = withOrg();
  const before = r.state.repos.agents(r.company.id).length;
  const agent = r.meta.spawn(r.company.id, {
    name: 'SEO Analyst', role: 'seo_analyst', prompt: 'run audits', tools: ['http.get'], permissions: ['run_seo_audit'],
    budget_usd: 60, kpis: [{ label: 'audits', target: 5, unit: 'per week' }], department_id: null,
  });
  assert.equal(r.state.repos.agents(r.company.id).length, before + 1);
  assert.equal(agent.status, 'active');
  assert.equal(agent.budget.monthly_usd, 60);
  const cap = r.state.repos.capabilities(r.company.id).find(c => c.name === 'seo_analyst');
  assert.ok(cap, 'capability should be registered');
  const mem = r.state.repos.memory(r.company.id, 'organizational');
  assert.ok(mem.some(m => m.owner === agent.id), 'spawn event should be in memory');
  dispose();
});

test('meta.kill retires a spawned agent', () => {
  const { r, dispose } = withOrg();
  const agent = r.meta.spawn(r.company.id, {
    name: 'X', role: 'x_specialist', prompt: 'p', tools: [], permissions: [],
    budget_usd: 10, kpis: [], department_id: null,
  });
  const killed = r.meta.kill(r.company.id, agent.id);
  assert.ok(killed);
  assert.equal(r.state.repos.agent(agent.id)!.status, 'retired');
  assert.equal(r.meta.kill(r.company.id, 'nope'), null);
  dispose();
});

test('meta.whatCanIDo reports capabilities, agents, tools, gaps, budgets', () => {
  const { r, dispose } = withOrg();
  const view = r.meta.whatCanIDo(r.company.id);
  assert.ok(Array.isArray(view.capabilities) && view.capabilities.length > 0);
  assert.ok(view.agents.length >= 1);
  assert.ok(Array.isArray(view.tools));
  assert.ok(Array.isArray(view.gaps));
  assert.ok(view.budgets.length >= 1);
  dispose();
});

test('meta.spawnForGap end-to-end: spawned agent completes a real task without human', async () => {
  const { r, dispose } = withOrg();
  const { agent, spec } = await r.meta.spawnForGap(r.company.id, 'seo_audit', 'manual trigger');
  assert.equal(agent.role, spec.role);
  const t = r.workforce.submit(r.company.id, {
    objective_id: null, agent_id: agent.id, kind: 'seo_audit', summary: 'audit landing page', input: { url: 'https://example.com' },
  });
  const res = await r.workforce.run(t.id);
  assert.equal(res.task.status, 'SUCCEEDED');
  const traces = r.state.repos.traces(r.company.id).filter(x => x.agent_id === agent.id);
  assert.ok(traces.length >= 1, 'spawned agent should leave traces');
  dispose();
});
