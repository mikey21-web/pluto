import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRuntime } from './helpers.ts';

test('governance2: open decision + vote + approve', () => {
  const { r, dispose } = makeRuntime();
  try {
    const dec = r.governance2.openDecision(
      r.company.id, 'Expand to Dubai market', 'Should we open a Dubai entity?',
      'strategic', 'simple_majority', 0.5,
    );
    assert.ok(dec.id.startsWith('dec_'));
    assert.equal(dec.status, 'open');

    // owner1 approves with weight 0.6 — passes immediately (0.6 >= 0.5)
    const result = r.governance2.vote(dec.id, 'owner_uday', 'approve', 0.6, 'Strong opportunity');
    assert.equal(result?.status, 'approved');
    assert.ok(result?.result?.includes('Approved'));
  } finally { dispose(); }
});

test('governance2: unanimous decision — one veto rejects immediately', () => {
  const { r, dispose } = makeRuntime();
  try {
    const dec = r.governance2.openDecision(
      r.company.id, 'Accept seed investment', 'Take ₹50L at 10% dilution',
      'financial', 'unanimous', 1.0,
    );
    // first vote approves — still open (unanimous doesn't auto-approve on individual votes)
    const after1 = r.governance2.vote(dec.id, 'owner_a', 'approve', 0.5, 'Looks good');
    assert.equal(after1?.status, 'open');
    // second vote rejects — veto triggers immediate rejection
    const after2 = r.governance2.vote(dec.id, 'owner_b', 'reject', 0.5, 'Too early');
    assert.equal(after2?.status, 'rejected');
  } finally { dispose(); }
});

test('governance2: decisions list filtered by status', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.governance2.openDecision(r.company.id, 'D1', 'desc', 'operational');
    const open = r.governance2.decisions(r.company.id, 'open');
    assert.ok(open.length >= 1);
    assert.ok(open.every(d => d.status === 'open'));
  } finally { dispose(); }
});

test('governance2: strategic ambiguity permit + list', () => {
  const { r, dispose } = makeRuntime();
  try {
    const rule = r.governance2.permitAmbiguity(
      r.company.id,
      'Competitive pricing negotiation',
      'Do not reveal our cost structure or margin targets',
      'Disclosing margins gives counterparty negotiation leverage that damages company value',
      'ethics_officer_01',
    );
    assert.ok(rule.id.startsWith('amb_'));
    assert.ok(rule.active);

    const rules = r.governance2.ambiguityRules(r.company.id);
    assert.ok(rules.some(r => r.id === rule.id));
  } finally { dispose(); }
});

test('governance2: flag threat + resolve', () => {
  const { r, dispose } = makeRuntime();
  try {
    const threat = r.governance2.flagThreat(
      r.company.id, 'prompt_injection',
      'Agent received input attempting to override system prompt',
      'high', 'ag_intake',
    );
    assert.ok(threat.id.startsWith('thr_'));
    assert.equal(threat.status, 'open');
    assert.equal(threat.severity, 'high');

    const ok = r.governance2.resolveThreat(threat.id, 'resolved');
    assert.ok(ok);
    const threats = r.governance2.threats(r.company.id, 'resolved');
    assert.ok(threats.some(t => t.id === threat.id));
  } finally { dispose(); }
});

test('governance2: agent auth register + verify', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.governance2.registerAgent(r.company.id, 'ag_sdr', 'sha256:abc123', ['crm', 'email']);
    assert.ok(r.governance2.verifyAgent(r.company.id, 'ag_sdr', 'sha256:abc123'));
    assert.equal(r.governance2.verifyAgent(r.company.id, 'ag_sdr', 'sha256:wrong'), false);
    assert.equal(r.governance2.verifyAgent(r.company.id, 'ag_unknown', 'sha256:abc123'), false);
  } finally { dispose(); }
});

test('governance2: status counters', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.governance2.openDecision(r.company.id, 'D', 'd', 'operational');
    r.governance2.flagThreat(r.company.id, 'anomaly', 'unusual pattern', 'low');
    r.governance2.permitAmbiguity(r.company.id, 'scenario', 'allow', 'why', 'eo');
    const s = r.governance2.status();
    assert.ok(s.decisions >= 1);
    assert.ok(s.threats >= 1);
    assert.ok(s.ambiguity_rules >= 1);
  } finally { dispose(); }
});
