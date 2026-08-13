import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRuntime } from './helpers.ts';

test('lifecycle.kill_contract: create + evaluate + execute returns capital', () => {
  const { r, dispose } = makeRuntime();
  try {
    const kc = r.lifecycle.createKillContract({ company_id: r.company.id, condition: 'revenue < 1000 for 3 months', action: 'terminate' });
    assert.ok(kc.id.startsWith('kc_'));
    assert.equal(kc.status, 'active');

    const contracts = r.lifecycle.evaluateKillContracts(r.company.id);
    assert.ok(contracts.length >= 1);

    const result = r.lifecycle.executeKillContract(kc.id, 500);
    assert.equal(result.ok, true);
    assert.ok(result.capital_returned >= 0);
  } finally { dispose(); }
});

test('lifecycle.dormancy: enter + exit preserves agents', () => {
  const { r, dispose } = makeRuntime();
  try {
    const state = r.lifecycle.enterDormancy({ company_id: r.company.id, reason: 'seasonal low', wake_condition: 'Q4 demand spike' });
    assert.equal(state.is_dormant, true);
    assert.equal(state.wake_condition, 'Q4 demand spike');

    const dormantCompany = r.state.repos.company(r.company.id)!;
    assert.equal(dormantCompany.status, 'dormant');
    const agents = r.state.repos.agents(r.company.id);
    assert.ok(agents.every(a => a.status === 'inactive'));

    const revived = r.lifecycle.exitDormancy(r.company.id);
    assert.equal(revived.is_dormant, false);
    assert.ok(revived.revived_at);

    const activeCompany = r.state.repos.company(r.company.id)!;
    assert.equal(activeCompany.status, 'active');
    const revivedAgents = r.state.repos.agents(r.company.id);
    assert.ok(revivedAgents.every(a => a.status === 'active'));
  } finally { dispose(); }
});

test('lifecycle.birth: spawn company with mission, blueprint, budget', () => {
  const { r, dispose } = makeRuntime();
  try {
    const birth = r.lifecycle.birthCompany({ parent_company_id: r.company.id, mission: 'Test new vertical', blueprint: 'saas', initial_budget_usd: 500 });
    assert.equal(birth.status, 'active');
    assert.ok(birth.activated_at);
    assert.ok(birth.id.startsWith('brt_'));

    const companies = r.sovereign.companies();
    assert.ok(companies.length >= 2);
    const newborn = companies.find(c => c.mission === 'Test new vertical');
    assert.ok(newborn);
    const budgets = r.state.repos.budgets(newborn!.id);
    assert.ok(budgets.some(b => b.scope === 'llm_daily' && b.limit_usd === 500));
  } finally { dispose(); }
});

test('lifecycle.death: wind down archives learnings, returns capital', () => {
  const { r, dispose } = makeRuntime();
  try {
    // create a child to kill
    const child = r.sovereign.spawnCompany({ name: 'ToDie', mission: 'short lived' });
    r.state.repos.setBudget({ company_id: child.id, scope: 'llm_daily', allocated_usd: 100, limit_usd: 100, kind: 'daily' });

    const death = r.lifecycle.deathProcess({ company_id: child.id, reason: 'unprofitable' });
    assert.equal(death.status, 'archived');
    assert.ok(death.learnings_archived.length >= 0);
    assert.ok(death.capital_returned_usd >= 0);
    assert.equal(death.company_id, child.id);

    const archived = r.state.repos.company(child.id)!;
    assert.equal(archived.status, 'archived');
  } finally { dispose(); }
});

test('lifecycle.status aggregates all counters', () => {
  const { r, dispose } = makeRuntime();
  try {
    const st = r.lifecycle.status();
    assert.ok(typeof st.kill_contracts === 'number');
    assert.ok(typeof st.dormant_companies === 'number');
    assert.ok(typeof st.births === 'number');
    assert.ok(typeof st.deaths === 'number');
  } finally { dispose(); }
});