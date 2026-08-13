import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRuntime } from './helpers.ts';

test('existential: set legacy mandate', () => {
  const { r, dispose } = makeRuntime();
  try {
    const lm = r.existential.setLegacyMandate('Continuity', 'Transfer assets', ['agent-1'], 'trustee@x.com', ['inactive 90d']);
    assert.ok(lm.id.startsWith('lgc'));
    assert.ok(r.existential.legacyMandates().some(x => x.id === lm.id));
  } finally { dispose(); }
});

test('existential: propose sunset then cancel', () => {
  const { r, dispose } = makeRuntime();
  try {
    const sp = r.existential.proposeSunset('Goals achieved', 'founder', 2);
    assert.equal(sp.status, 'proposed');
    r.existential.approveSunset(sp.id, 'human-1');
    const after1 = r.existential.sunsetProposals().find(x => x.id === sp.id);
    assert.equal(after1!.status, 'proposed'); // still needs 2nd approval
    assert.ok(r.existential.cancelSunset(sp.id));
    assert.equal(r.existential.sunsetProposals().find(x => x.id === sp.id)!.status, 'cancelled');
  } finally { dispose(); }
});

test('existential: commit to contribution and fulfill', () => {
  const { r, dispose } = makeRuntime();
  try {
    const cc = r.existential.commitToContribution('open_source', 'Monthly OSS', 'Release monthly', 'monthly', '1/month');
    assert.ok(cc.active);
    assert.ok(r.existential.fulfill(cc.id, 'Released v1.0'));
    const found = r.existential.contributions().find(x => x.id === cc.id);
    assert.equal(found!.fulfillments.length, 1);
  } finally { dispose(); }
});

test('existential: risk throttling triggers at level >= 0.7', () => {
  const { r, dispose } = makeRuntime();
  try {
    const risk = r.existential.registerRisk('scale', 'Growth too fast', '>80% market', 0.5);
    assert.equal(r.existential.updateRiskLevel(risk.id, 0.3).throttling, false);
    const high = r.existential.updateRiskLevel(risk.id, 0.9);
    assert.equal(high.throttling, true);
    assert.equal(high.factor, 0.5);
  } finally { dispose(); }
});

test('existential: consciousness assessment', () => {
  const { r, dispose } = makeRuntime();
  try {
    const ca = r.existential.assessConsciousness(
      'agent-prime', ['avoids past failures'], 'I feel purpose', 'possible', 0.8, 'Ensure rest',
    );
    assert.equal(ca.assessor_conclusion, 'possible');
    assert.ok(r.existential.consciousnessAssessments('agent-prime').some(x => x.id === ca.id));
  } finally { dispose(); }
});
