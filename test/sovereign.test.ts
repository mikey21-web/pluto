import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRuntime, withOrg } from './helpers.ts';

test('sovereign.spawnCompany creates a second company with budgets, owner', () => {
  const { r, dispose } = makeRuntime();
  try {
    const co = r.sovereign.spawnCompany({ name: 'Priya Realty', mission: 'Qualify and close real-estate buyer leads at scale.' });
    assert.ok(co.id.startsWith('co_'));
    assert.equal(co.name, 'Priya Realty');
    assert.equal(r.state.repos.companies().length, 2);
    const owners = r.sovereign.owners(co.id);
    assert.equal(owners.length, 1);
    assert.equal(owners[0].role, 'sovereign');
    const budgets = r.state.repos.budgets(co.id);
    assert.ok(budgets.length > 0, 'new company should have seeded budgets');
  } finally { dispose(); }
});

test('sovereign.shareLesson records cross-company memory queryable by lessons()', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.sovereign.shareLesson({ content: 'Lead-qualification prompts convert better with a 3-question screener.', tags: ['leads'] });
    const lessons = r.sovereign.lessons();
    assert.equal(lessons.length, 1);
    assert.match(lessons[0].content, /screener/);
  } finally { dispose(); }
});

test('sovereign.haltCompany + resumeCompany toggle status and inactivate agents', () => {
  const { r, dispose } = withOrg();
  try {
    r.sovereign.haltCompany(r.company.id, 'test halt');
    assert.ok(r.sovereign.isHalted(r.company.id));
    assert.equal(r.state.repos.company(r.company.id)!.status, 'halted');
    const agents = r.state.repos.agents(r.company.id);
    assert.ok(agents.length > 0 && agents.every(a => a.status === 'inactive'));
    r.sovereign.resumeCompany(r.company.id);
    assert.ok(!r.sovereign.isHalted(r.company.id));
  } finally { dispose(); }
});

test('sovereign.haltAll halts every company and logs global kill switch', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.sovereign.spawnCompany({ name: 'SecondCo', mission: 'q' });
    r.sovereign.haltAll('emergency');
    for (const c of r.sovereign.companies()) assert.equal(c.status, 'halted', `${c.name} should be halted`);
    const log = r.state.repos.killLog();
    assert.ok(log.some(l => l.scope === 'global' && l.action === 'halt_all'));
  } finally { dispose(); }
});

test('sovereign rollback registry: register -> apply -> list', () => {
  const { r, dispose } = makeRuntime();
  try {
    const status = r.sovereign.registerRollback({ company_id: r.company.id, action_type: 'capability.add', action_id: 'cap_9', reverse: 'removed cap_9' });
    assert.equal(status, 'pending');
    const list = r.sovereign.rollbacks(r.company.id);
    assert.ok(list.some(l => l.action_id === 'cap_9'));
    const rb = list.find(l => l.action_id === 'cap_9')!;
    assert.equal(r.sovereign.applyRollback(rb.id), true);
    assert.equal(r.sovereign.applyRollback(rb.id), false, 'second apply should fail (already applied)');
    const after = r.sovereign.rollbacks(r.company.id).find(l => l.id === rb.id)!;
    assert.equal(after.status, 'applied');
  } finally { dispose(); }
});

test('sovereign deadmanCheck: silence -> read-only, heartbeat -> active', () => {
  const { r, dispose } = makeRuntime();
  try {
    const o = r.sovereign.owners(r.company.id)[0];
    // simulate silence by rewriting last_active far in the past
    const coId = r.company.id;
    r.state.store.db.prepare('UPDATE sovereign_owners SET last_active=? WHERE id=?').run(new Date(Date.now() - 30 * 86400000).toISOString(), o.id);
    assert.equal(r.sovereign.deadmanCheck(coId, 7), 'read-only');
    // heartbeat restores active
    r.sovereign.heartbeat(coId, o.id);
    assert.equal(r.sovereign.deadmanCheck(coId, 7), 'active');
  } finally { dispose(); }
});

test('sovereign.digest reports spend, task, approval, risk posture', () => {
  const { r, dispose } = makeRuntime();
  try {
    const d = r.sovereign.digest(r.company.id);
    assert.equal(d.company, 'TestCo');
    assert.equal(typeof d.tasks, 'number');
    assert.equal(typeof d.spend_usd, 'number');
    assert.equal(typeof d.approvals_pending, 'number');
    assert.equal(typeof d.halted, 'boolean');
  } finally { dispose(); }
});

test('sovereign.routeApproval: auto approves, gated/human-only request owner review', () => {
  const { r, dispose } = makeRuntime();
  try {
    assert.equal(r.sovereign.routeApproval({ company_id: r.company.id, action: 'a', summary: 'auto', cost_usd: 1, tier: 'auto' }), 'approved');
    assert.equal(r.sovereign.routeApproval({ company_id: r.company.id, action: 'b', summary: 'gated', cost_usd: 50, tier: 'gated' }), 'requested');
    assert.equal(r.sovereign.routeApproval({ company_id: r.company.id, action: 'c', summary: 'human', cost_usd: 500, tier: 'human-only' }), 'requested');
    const pending = r.state.repos.approvals(r.company.id, 'pending');
    assert.ok(pending.some(p => p.summary === 'gated-review: gated'));
    assert.ok(pending.some(p => p.summary === 'human-only: human'));
  } finally { dispose(); }
});

test('sovereign multi-owner model: addOwner + owners list', () => {
  const { r, dispose } = makeRuntime();
  try {
    const o = r.sovereign.addOwner({ company_id: r.company.id, name: 'Aisha', role: 'co-owner', email: 'a@pluto.local', authority: ['spend', 'approve'] });
    const owners = r.sovereign.owners(r.company.id);
    assert.ok(owners.some(x => x.id === o.id));
    assert.deepEqual(o.authority, ['spend', 'approve']);
  } finally { dispose(); }
});
