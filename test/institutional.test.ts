import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRuntime } from './helpers.ts';

test('institutional: grant and verify auditor access', () => {
  const { r, dispose } = makeRuntime();
  try {
    const expires = new Date(Date.now() + 86400000).toISOString();
    const a = r.institutional.grantAuditorAccess('Alice CPA', 'KPMG', 'financial', [r.company.id], 'hash_abc', expires);
    assert.equal(a.auditor_name, 'Alice CPA');
    assert.ok(r.institutional.verifyAuditorToken(a.id, 'hash_abc'));
    assert.ok(!r.institutional.verifyAuditorToken(a.id, 'wrong'));
  } finally { dispose(); }
});

test('institutional: submit audit report', () => {
  const { r, dispose } = makeRuntime();
  try {
    const expires = new Date(Date.now() + 86400000).toISOString();
    const a = r.institutional.grantAuditorAccess('Bob', 'Deloitte', 'compliance', [], 'hash_xyz', expires);
    const report = r.institutional.submitAuditReport(a.id, '2026-01-01', '2026-03-31', ['finding'], ['risk'], 'clean');
    assert.equal(report.overall_rating, 'clean');
    assert.ok(r.institutional.auditReports('clean').some(rr => rr.id === report.id));
  } finally { dispose(); }
});

test('institutional: queue and resolve external goal', () => {
  const { r, dispose } = makeRuntime();
  try {
    const g = r.institutional.submitGoal('ext-sub', 'Launch product by Q4', 'high', r.company.id);
    assert.equal(g.status, 'queued');
    const ok = r.institutional.resolveGoal(g.id, 'completed', 'Launched Nov 1');
    assert.ok(ok);
    assert.ok(r.institutional.externalGoals('completed').some(x => x.id === g.id));
  } finally { dispose(); }
});

test('institutional: onboard operator and generate report', () => {
  const { r, dispose } = makeRuntime();
  try {
    const op = r.institutional.onboardOperator('Sequoia', 'vc', 10e9, 5e6, [r.company.id], 'quarterly');
    assert.equal(op.kind, 'vc');
    const report = r.institutional.generateReport(op.id, '2026-Q3', { revenue: 100000 }, 'Strong quarter');
    assert.equal(report.period, '2026-Q3');
    assert.ok(r.institutional.operatorReports(op.id).some(rr => rr.id === report.id));
  } finally { dispose(); }
});

test('institutional: status counts', () => {
  const { r, dispose } = makeRuntime();
  try {
    const expires = new Date(Date.now() + 86400000).toISOString();
    r.institutional.grantAuditorAccess('Aud', 'Firm', 'financial', [], 'h', expires);
    r.institutional.submitGoal('s', 'goal', 'low');
    r.institutional.onboardOperator('Op', 'vc', 1e6, 100, [], 'monthly');
    const s = r.institutional.status();
    assert.ok(s.auditors >= 1);
    assert.ok(s.goals >= 1);
    assert.ok(s.operators >= 1);
  } finally { dispose(); }
});
