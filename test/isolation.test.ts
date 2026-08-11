import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PlutoState } from '../src/kernel/state.ts';
import { Store } from '../src/kernel/store.ts';
import { CompanyIntelligence } from '../src/intel/engine.ts';
import { PolicyEngine } from '../src/plane/policy.ts';
import { ResourceEngine } from '../src/plane/resources.ts';
import { OrgEngine, StrategyEngine } from '../src/org/engines.ts';
import { CapabilityFactory } from '../src/capability/factory.ts';

function makeState(dir: string): PlutoState {
  const store = new Store({ path: join(dir, 'pluto.db') });
  return new PlutoState(store);
}

async function seedOrg(state: PlutoState, companyId: string): Promise<void> {
  const c = state.repos.company(companyId)!;
  const org = new OrgEngine(state);
  org.build(c, 'Sell widgets');
  state.repos.upsertNode(`acme_${companyId}`, 'company', 'acme', { company_id: companyId });
  state.repos.upsertNode(`stack_${companyId}`, 'stack', 'stack-x', { company_id: companyId });
  state.repos.upsertEdge(`acme_${companyId}`, `stack_${companyId}`, 'uses', { company_id: companyId, confidence: 0.9 });
}

test('multi-tenant: two companies stay fully isolated across all tables', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'pluto-iso-'));
  const state = makeState(dir);
  try {
    const a = state.repos.createCompany('Alpha Corp', 'Sell widgets');
    const b = state.repos.createCompany('Beta Consulting', 'Enterprise advisory');
    await seedOrg(state, a.id);
    await seedOrg(state, b.id);

    // 1. agents / departments are company-scoped
    assert.equal(state.repos.agents(a.id).length, 6); // ceo + 5 managers
    assert.equal(state.repos.agents(b.id).length, 6);
    assert.equal(state.repos.departments(a.id).every(d => d.company_id === a.id), true);

    // 2. strategies / experiments isolate (Beta has only its own mission objective, zero cascades)
    const strat = new StrategyEngine(state);
    const depsA = state.repos.departments(a.id);
    const objA = state.repos.createObjective({ company_id: a.id, kind: 'company', title: 'mission A', krs: [] });
    strat.cascade(a.id, objA, depsA);
    assert.equal(state.repos.objectives(b.id).length, 1, 'Beta must have only its own mission objective (no Alpha cascade)');
    assert.equal(state.repos.objectives(b.id)[0].company_id, b.id);

    // 3. capabilities isolate
    const caps = new CapabilityFactory(state);
    caps.materializeBuy(a.id, { name: 'x', description: 'd', cost_ceiling_usd: 10, urgency: 0.5 }, 'p', 5);
    assert.equal(state.repos.capabilities(b.id).length, 0);

    // 4. policies isolate
    const pol = new PolicyEngine(state);
    pol.register(b.id, 'b-only', '*', [{ id: 'r1', action: '*', effect: 'allow', note: '' }]);
    assert.equal(state.repos.policies(a.id).length, 0);

    // 5. budgets isolate
    const res = new ResourceEngine(state);
    res.allocate(a.id, 'llm', 10);
    assert.equal(res.budget(b.id, 'llm'), null);

    // 6. approvals / messages / jobs isolate by company_id on the entity
    const appr = state.repos.createApproval({ company_id: a.id, actor_id: 'x', action: 'y', summary: 'z', risk: 'low', auth_required: true });
    assert.equal(appr.company_id, a.id);

    // 7. graph nodes carry company_id and company-scoped queries never leak
    const nodesA = state.repos.graphNodesFor(a.id);
    const nodesB = state.repos.graphNodesFor(b.id);
    assert.ok(nodesA.length > 0);
    assert.ok(nodesB.length > 0);
    const bIds = new Set(nodesB.map(n => n.id));
    const edgesA = state.repos.graphEdgesFor(a.id);
    for (const e of edgesA) {
      assert.ok(!bIds.has(e.from), `edge from node of company B leaked into A: ${e.id}`);
      assert.ok(!bIds.has(e.to));
    }

    // 8. memory is company-scoped
    state.remember(b.id, 'Beta secret rivalry intel about Alpha', { type: 'strategic' });
    const amem = state.repos.memory(a.id);
    assert.equal(amem.some(m => m.content.includes('Beta secret')), false, 'company A memory must not see Beta memories');
  } finally {
    state.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('multi-tenant: intel brief never mentions the sibling company', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'pluto-isobrief-'));
  const state = makeState(dir);
  try {
    const a = state.repos.createCompany('Alpha Corp', 'Sell widgets');
    const b = state.repos.createCompany('Beta Consulting', 'Enterprise advisory');
    await seedOrg(state, a.id);
    await seedOrg(state, b.id);
    state.repos.upsertNode('beta_node', 'company', 'beta', { company_id: b.id });
    state.repos.upsertEdge('beta_node', 'beta_stack', 'serves', { company_id: b.id });
    const briefA = new CompanyIntelligence(state).brief(a.id);
    for (const f of briefA.facts) {
      assert.ok(!f.object.toLowerCase().includes('beta'), `brief A leaked Beta fact: ${f.subject} ${f.predicate} ${f.object}`);
    }
  } finally {
    state.close();
    rmSync(dir, { recursive: true, force: true });
  }
});