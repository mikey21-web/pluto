import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRuntime } from './helpers.ts';

test('authority.ballot: open + vote + close, winner by weighted tally', () => {
  const { r, dispose } = makeRuntime();
  try {
    const ballot = r.authority.openBallot({ company_id: r.company.id, question: 'Should we raise prices 20%?', options: ['yes', 'no', 'defer'] });
    assert.ok(ballot.id.startsWith('bal_'));
    assert.equal(ballot.status, 'open');

    r.authority.castVote(ballot.id, { agent_id: 'ag_sales', choice: 'yes', weight: 2 });
    r.authority.castVote(ballot.id, { agent_id: 'ag_ops', choice: 'no', weight: 1 });
    r.authority.castVote(ballot.id, { agent_id: 'ag_finance', choice: 'yes', weight: 1 });

    const result = r.authority.closeBallot(ballot.id);
    assert.equal(result.status, 'closed');
    assert.equal(result.result, 'yes'); // yes=3 weight vs no=1
    assert.equal(result.votes.length, 3);
  } finally { dispose(); }
});

test('authority.multi_currency: credit + debit + balance', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.authority.credit({ entity_id: 'ag_001', company_id: r.company.id, kind: 'attention', amount: 100, reason: 'completed 10 tasks' });
    r.authority.credit({ entity_id: 'ag_001', company_id: r.company.id, kind: 'trust', amount: 50, reason: 'zero errors this week' });

    assert.equal(r.authority.balance('ag_001', r.company.id, 'attention'), 100);
    assert.equal(r.authority.balance('ag_001', r.company.id, 'trust'), 50);

    const ok = r.authority.debit({ entity_id: 'ag_001', company_id: r.company.id, kind: 'attention', amount: 30, reason: 'used to access tier-2 model' });
    assert.ok(ok);

    // Insufficient balance
    const fail = r.authority.debit({ entity_id: 'ag_001', company_id: r.company.id, kind: 'trust', amount: 999, reason: 'over-spend' });
    assert.ok(!fail);

    const accs = r.authority.accounts('ag_001', r.company.id);
    assert.ok(accs.some(a => a.kind === 'attention'));
    assert.ok(accs.some(a => a.kind === 'trust'));
  } finally { dispose(); }
});

test('authority.metabolism: snapshot captures task + cost telemetry', () => {
  const { r, dispose } = makeRuntime();
  try {
    const snap = r.authority.snapshot(r.company.id);
    assert.ok(typeof snap.health_score === 'number');
    assert.ok(snap.health_score >= 0 && snap.health_score <= 1);
    assert.ok(snap.ts.length > 0);

    const history = r.authority.metabolismHistory(r.company.id);
    assert.ok(history.length >= 1);
  } finally { dispose(); }
});

test('authority.reverse_forage: contribute + list', () => {
  const { r, dispose } = makeRuntime();
  try {
    const c = r.authority.contribute({ kind: 'tool', title: 'pluto-lead-scorer', url: 'https://github.com/pluto/lead-scorer', license: 'MIT' });
    assert.ok(c.id.startsWith('rc_'));

    const all = r.authority.contributions();
    assert.ok(all.length >= 1);
    assert.ok(all.some(x => x.title.includes('lead-scorer')));

    const tools = r.authority.contributions('tool');
    assert.ok(tools.length >= 1);
  } finally { dispose(); }
});

test('authority.status: aggregates counters', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.authority.openBallot({ company_id: r.company.id, question: 'Test?', options: ['a', 'b'] });
    r.authority.credit({ entity_id: 'ag_x', company_id: r.company.id, kind: 'compute', amount: 10, reason: 'test' });
    r.authority.snapshot(r.company.id);
    r.authority.contribute({ kind: 'dataset', title: 'lead-quality-dataset', url: 'https://hf.co/pluto/leads', license: 'CC-BY' });
    const s = r.authority.status(r.company.id);
    assert.ok(s.open_ballots >= 1);
    assert.ok(s.credit_transactions >= 1);
    assert.ok(s.metabolism_snapshots >= 1);
    assert.ok(s.contributions >= 1);
  } finally { dispose(); }
});
