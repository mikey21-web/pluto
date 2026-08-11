import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withOrg } from './helpers.ts';
import { Governance, describeOrg } from '../src/plane/governance.ts';

test('governance.classifyRisk maps action language to risk levels', () => {
  const { r, dispose } = withOrg();
  const g = new Governance(r.state);
  assert.equal(g.classifyRisk('spend $5,000 on ads'), 'high');
  assert.equal(g.classifyRisk('delete all customer data'), 'critical');
  assert.equal(g.classifyRisk('sign the contract with vendor'), 'critical');
  assert.equal(g.classifyRisk('hire a new engineer'), 'critical');
  assert.equal(g.classifyRisk('deploy to production'), 'high');
  assert.equal(g.classifyRisk('research the market'), 'med');
  dispose();
});

test('governance: low/med in-budget actions auto-approve', () => {
  const { r, dispose } = withOrg();
  const g = new Governance(r.state);
  assert.equal(g.approveOrBlock(r.company.id, 'sys', 'research the market', 's'), 'approved');
  dispose();
});

test('governance: high-risk action becomes a pending approval + event', () => {
  const { r, dispose } = withOrg();
  const g = new Governance(r.state);
  const appr = g.approveOrBlock(r.company.id, 'agent_x', 'spend $1,200 on campaign', 'expand', { cost_usd: 1200 });
  assert.notEqual(appr, 'approved');
  assert.equal(appr.status, 'pending');
  assert.equal(appr.risk, 'high');
  assert.equal(appr.req_by, 'policy');
  const events = r.state.repos.events(r.company.id).filter(e => e.type === 'human.approval.requested');
  assert.ok(events.length >= 1);
  dispose();
});

test('governance: over-budget blocks even low-risk actions via approval', () => {
  const { r, dispose } = withOrg();
  r.state.repos.setBudget({ company_id: r.company.id, scope: 'llm', allocated_usd: 0, limit_usd: 0 });
  r.state.repos.spend(r.company.id, 'llm', 1);
  const g = new Governance(r.state);
  const appr = g.approveOrBlock(r.company.id, 'sys', 'research the market', 's');
  assert.notEqual(appr, 'approved');
  assert.equal(appr.req_by, 'policy');
  dispose();
});

test('governance.decide resolves pending approvals and emits completion', () => {
  const { r, dispose } = withOrg();
  const g = new Governance(r.state);
  const appr = g.approveOrBlock(r.company.id, 'agent_x', 'spend $1,200 on campaign', 'expand');
  const decided = g.decide(appr.id, 'approved', 'founder');
  assert.equal(decided?.status, 'approved');
  assert.equal(decided?.decided_by, 'founder');
  assert.equal(g.pending(r.company.id).length, 0);
  const events = r.state.repos.events(r.company.id).filter(e => e.type === 'human.approval.completed');
  assert.ok(events.length >= 1);
  const rejected = g.approveOrBlock(r.company.id, 'agent_x', 'spend $9,000', 'big');
  g.decide(rejected.id, 'rejected', 'founder');
  assert.equal(g.pending(r.company.id).length, 0);
  dispose();
});

test('governance: registerHuman + authorityReport snapshot agents', () => {
  const { r, dispose } = withOrg();
  const g = new Governance(r.state);
  const h = g.registerHuman({ company_id: r.company.id, name: 'Uday', role: 'founder', email: 'u@x.io', authority: ['spend', 'hire'] });
  assert.equal(h.status, 'active');
  const report = g.authorityReport(r.company.id);
  assert.ok(report.length >= 1);
  assert.equal(report[0].budget, 100);
  dispose();
});

test('describeOrg lists departments with their agents', () => {
  const { r, dispose } = withOrg();
  const out = describeOrg(r.state, r.company.id);
  assert.match(out, /Sales/);
  assert.match(out, /Finance/);
  assert.match(out, /\(/);
  dispose();
});
