import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withOrg, deptAgent } from './helpers.ts';
import { LearningEngine, AgentFactory } from '../src/learn/engine.ts';
import type { Agent } from '../src/kernel/types.ts';

function mkTask(r: ReturnType<typeof withOrg>['r'], summary: string, status: 'SUCCEEDED' | 'FAILED', agentId: string | null = null) {
  return r.state.repos.createTask({ company_id: r.company.id, summary, status, agent_id: agentId, kind: 'report' });
}

test('learning.observeTaskOutcome proposes a lesson after repeated failures', () => {
  const { r, dispose } = withOrg();
  const learn = new LearningEngine(r.state);
  for (let i = 0; i < 3; i++) {
    const t = mkTask(r, `fail ${i}`, 'FAILED');
    learn.observeTaskOutcome(t, false);
  }
  const lessons = r.state.repos.lessons(r.company.id).filter(l => l.kind === 'repeated_failure');
  assert.ok(lessons.length >= 1);
  assert.match(lessons[0].lesson, /Escalate/);
  const ok = mkTask(r, 'success', 'SUCCEEDED');
  learn.observeTaskOutcome(ok, true);
  dispose();
});

test('learning.auditCompany proposes new_agent when a small team underperforms', () => {
  const { r, dispose } = withOrg();
  const learn = new LearningEngine(r.state);
  for (const a of r.state.repos.agents(r.company.id)) {
    a.performance.success_rate = 0.9;
    r.state.repos.saveAgent(a);
  }
  const sales = deptAgent(r, 'Sales')!;
  sales.performance.success_rate = 0.2;
  r.state.repos.saveAgent(sales);
  const proposals = learn.auditCompany(r.company.id);
  const salesProposal = proposals.find(p => p.kind === 'new_agent' && p.metrics.dept === 'Sales');
  assert.ok(salesProposal);
  assert.equal(salesProposal!.metrics.dept, 'Sales');
  dispose();
});

test('learning.auditCompany proposes add_capability after repeated dept failures', () => {
  const { r, dispose } = withOrg();
  const learn = new LearningEngine(r.state);
  const sales = deptAgent(r, 'Sales')!;
  for (let i = 0; i < 3; i++) mkTask(r, `fail ${i}`, 'FAILED', sales.id);
  const proposals = learn.auditCompany(r.company.id);
  const cap = proposals.find(p => p.kind === 'add_capability');
  assert.ok(cap);
  assert.equal(cap!.metrics.failed_tasks, 3);
  dispose();
});

test('learning.apply records an evolution event, memory, and applied lesson', () => {
  const { r, dispose } = withOrg();
  const learn = new LearningEngine(r.state);
  learn.apply(r.company.id, {
    kind: 'new_agent', summary: 'Add agent to Sales', reason: 'overloaded',
    metrics: { dept: 'Sales' }, status: 'proposed',
  });
  assert.ok(r.state.repos.events(r.company.id).some(e => e.type === 'organization.evolution'));
  const mem = r.state.repos.memory(r.company.id).some(m => m.content.includes('Add agent to Sales'));
  assert.ok(mem);
  const applied = r.state.repos.lessons(r.company.id).filter(l => l.status === 'applied');
  assert.ok(applied.length >= 1);
  dispose();
});

test('AgentFactory.create/promote/retire/reconfigure manage agent lifecycle', () => {
  const { r, dispose } = withOrg();
  const factory = new AgentFactory(r.state);
  const a = factory.create({ company_id: r.company.id, name: 'New Agent', role: 'analyst' });
  assert.equal(a.version, 1);
  assert.equal(a.status, 'active');
  const p = factory.promote(a);
  assert.equal(p.version, 2);
  assert.equal(p.status, 'active');
  const rec = factory.reconfigure(p, { tools: ['fs.read'] });
  assert.equal(rec.version, 3);
  assert.deepEqual(rec.tools, ['fs.read']);
  const retired = factory.retire(rec);
  assert.equal(retired.status, 'retired');
  assert.ok(r.state.repos.events(r.company.id).some(e => e.type === 'agent.retired'));
  dispose();
});

test('AgentFactory.evaluate computes success rate from task history', () => {
  const { r, dispose } = withOrg();
  const factory = new AgentFactory(r.state);
  const a = factory.create({ company_id: r.company.id, name: 'Eval', role: 'analyst' });
  assert.equal(factory.evaluate(r.company.id, a.id), null);
  mkTask(r, 'ok1', 'SUCCEEDED', a.id);
  mkTask(r, 'ok2', 'SUCCEEDED', a.id);
  mkTask(r, 'bad', 'FAILED', a.id);
  const m = factory.evaluate(r.company.id, a.id)!;
  assert.equal(m.tasks, 3);
  assert.ok(Math.abs(m.success_rate - 2 / 3) < 1e-9);
  dispose();
});

test('AgentFactory.promoteIfEarned and retireIfUnderperforming gate on history', () => {
  const { r, dispose } = withOrg();
  const factory = new AgentFactory(r.state);
  const good = factory.create({ company_id: r.company.id, name: 'Good', role: 'analyst' });
  mkTask(r, 'a', 'SUCCEEDED', good.id);
  mkTask(r, 'b', 'SUCCEEDED', good.id);
  mkTask(r, 'c', 'SUCCEEDED', good.id);
  const promoted = factory.promoteIfEarned(good, 0.6, 3);
  assert.equal(promoted.promoted, true);

  const bad = factory.create({ company_id: r.company.id, name: 'Bad', role: 'analyst' });
  mkTask(r, 'x', 'FAILED', bad.id);
  mkTask(r, 'y', 'FAILED', bad.id);
  mkTask(r, 'z', 'FAILED', bad.id);
  const retired = factory.retireIfUnderperforming(bad, 0.4, 3);
  assert.equal(retired.retired, true);
  assert.equal(r.state.repos.agent(bad.id)!.status, 'retired');
  const lesson = r.state.repos.lessons(r.company.id).find(l => l.kind === 'agent_retired');
  assert.ok(lesson);
  dispose();
});

test('AgentFactory.createForCapability creates an agent wired to an unmet need', () => {
  const { r, dispose } = withOrg();
  const factory = new AgentFactory(r.state);
  const sales = deptAgent(r, 'Sales')!;
  const a = factory.createForCapability({
    company_id: r.company.id, name: 'SEO Agent', role: 'seo_specialist',
    department_id: sales.department_id, tools: ['http.get'], permissions: ['run_seo_audit'],
  });
  assert.equal(a.department_id, sales.department_id);
  assert.ok(r.state.repos.events(r.company.id).some(e => e.type === 'agent.created'));
  dispose();
});
