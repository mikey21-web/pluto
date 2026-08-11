import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRuntime, withOrg } from './helpers.ts';
import { newId } from '../src/kernel/types.ts';

test('grace.fugue.enterFugue suspends non-essential agents, exitFugue reactivates', () => {
  const { r, dispose } = withOrg();
  try {
    const fugue = r.grace.enterFugue({ company_id: r.company.id, severity: 'major', reason: 'cash crisis' });
    assert.equal(fugue.active, true);
    assert.equal(fugue.severity, 'major');
    const agents = r.state.repos.agents(r.company.id);
    const inactiveCount = agents.filter(a => a.status === 'inactive').length;
    assert.ok(inactiveCount > 0, 'non-essential agents should be suspended');

    const exited = r.grace.exitFugue(r.company.id);
    assert.equal(exited.active, false);
    assert.ok(exited.ended_at);
    const reactivated = r.state.repos.agents(r.company.id).filter(a => a.status === 'active').length;
    assert.ok(reactivated > 0, 'agents should be reactivated');
  } finally { dispose(); }
});

test('grace.offswitch.initiate + tick + cancel works', () => {
  const { r, dispose } = makeRuntime();
  try {
    const sw = r.grace.initiateOffSwitch({ company_id: r.company.id, trigger: 'manual halt', actions: ['save_state', 'close_positions'] });
    assert.equal(sw.pending, true);
    assert.equal(sw.countdown, 60);

    let remaining = 60;
    while (remaining > 0) remaining = r.grace.tickOffSwitch();
    assert.equal(remaining, 0);
    assert.equal(r.grace.offSwitchStatus().pending, false);

    const cancelled = r.grace.cancelOffSwitch();
    assert.equal(cancelled.pending, false);
  } finally { dispose(); }
});

test('grace.rehearsal plans -> simulates -> approves -> executes', async () => {
  const { r, dispose } = makeRuntime();
  try {
    const rec = await r.grace.planRehearsal({ company_id: r.company.id, action: 'deploy_new_sales_agent', plan: 'spawn agent, route leads, measure conversion' });
    assert.equal(rec.status, 'simulated');
    assert.ok(rec.simulated_outcome.sandbox_ok);

    const approved = r.grace.approveRehearsal(rec.id);
    assert.equal(approved!.status, 'approved');

    const executed = r.grace.executeRehearsal(rec.id);
    assert.equal(executed!.status, 'executed');

    const rejected = r.grace.rejectRehearsal(newId('rhr'), 'not ready');
    assert.equal(rejected, null);
  } finally { dispose(); }
});

test('grace.whimsy budget: init from activity budget, spend within cap, reject over cap', () => {
  const { r, dispose } = withOrg();
  try {
    // set an activity budget
    r.state.repos.setBudget({ company_id: r.company.id, scope: 'activity', allocated_usd: 10000, limit_usd: 10000, kind: 'activity' });
    const ledger = r.grace.initWhimsy(r.company.id, 0.02); // 2%
    assert.equal(ledger.budget_usd, 200); // 2% of 10000

    const ok1 = r.grace.spendWhimsy({ company_id: r.company.id, description: 'flowers for team', cost_usd: 50 });
    assert.equal(ok1.ok, true);
    assert.equal(ok1.act!.cost_usd, 50);

    const ok2 = r.grace.spendWhimsy({ company_id: r.company.id, description: 'joke of the day', cost_usd: 100 });
    assert.equal(ok2.ok, true);

    const over = r.grace.spendWhimsy({ company_id: r.company.id, description: 'expensive gift', cost_usd: 100 });
    assert.equal(over.ok, false);
    assert.match(over.reason, /exceeds/);
  } finally { dispose(); }
});

test('grace.status aggregates fugue/offswitch/rehearsals/whimsy', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.grace.initWhimsy(r.company.id);
    const st = r.grace.status();
    assert.ok(typeof st.fugue.active === 'boolean');
    assert.ok(typeof st.offSwitch.pending === 'boolean');
    assert.ok(typeof st.rehearsals === 'number');
    assert.ok(typeof st.whimsy.budget_usd === 'number');
  } finally { dispose(); }
});