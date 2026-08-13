import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRuntime } from './helpers.ts';

test('wisdom.failure_museum: archive and query failures', () => {
  const { r, dispose } = makeRuntime();
  try {
    const f1 = r.wisdom.archiveFailure({ company_id: r.company.id, kind: 'tool_error', summary: 'HTTP 500 on lead intake', tags: ['intake'] });
    const f2 = r.wisdom.archiveFailure({ company_id: r.company.id, kind: 'logic', summary: 'Null pointer in scoring', tags: ['scoring'] });
    assert.ok(f1.id.startsWith('fm_'));
    const all = r.wisdom.queryMuseum();
    assert.ok(all.length >= 2);
    const byKind = r.wisdom.queryMuseum({ kind: 'tool_error' });
    assert.ok(byKind.some(f => f.summary.includes('HTTP 500')));
    const byTag = r.wisdom.queryMuseum({ tag: 'scoring' });
    assert.ok(byTag.some(f => f.summary.includes('Null pointer')));
  } finally { dispose(); }
});

test('wisdom.retirement_pool: retire agent + consult oracle', () => {
  const { r, dispose } = makeRuntime();
  try {
    const retired = r.wisdom.retireAgent({ agent_id: 'ag_test_001', company_id: r.company.id, name: 'Riya v1', role: 'ecommerce-qualifier', reason: 'replaced by v2' });
    assert.ok(retired.id.startsWith('ret_'));
    assert.equal(retired.status, 'oracle');

    const oracles = r.wisdom.oracles();
    assert.ok(oracles.length >= 1);

    const { wisdom } = r.wisdom.consultOracle(retired.id);
    assert.ok(Array.isArray(wisdom));
  } finally { dispose(); }
});

test('wisdom.ancestor: elevate oracle to ancestor', () => {
  const { r, dispose } = makeRuntime();
  try {
    const retired = r.wisdom.retireAgent({ agent_id: 'ag_legacy', company_id: r.company.id, name: 'Priya v1', role: 'lead-qualifier', reason: 'legend' });
    const elevated = r.wisdom.elevateToAncestor(retired.id);
    assert.ok(elevated);
    const anc = r.wisdom.ancestors();
    assert.ok(anc.length >= 1);
  } finally { dispose(); }
});

test('wisdom.historian: record history + biography', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.wisdom.recordHistory({ summary: 'Civilization born', kind: 'milestone', company_id: r.company.id });
    r.wisdom.recordHistory({ summary: 'First deal closed', kind: 'milestone', company_id: r.company.id });
    r.wisdom.recordHistory({ summary: 'Agent loop crashed', kind: 'incident', company_id: r.company.id });
    const bio = r.wisdom.biography();
    assert.ok(bio.length >= 3);
    assert.ok(bio.some(e => e.kind === 'milestone'));
    assert.ok(bio.some(e => e.kind === 'incident'));
  } finally { dispose(); }
});

test('wisdom.emergence_detector: flag + decide', () => {
  const { r, dispose } = makeRuntime();
  try {
    const agents = r.state.repos.agents(r.company.id).map(a => a.id).slice(0, 2);
    const signal = r.wisdom.flagEmergence({ company_id: r.company.id, pattern: 'Agents self-coordinating on lead routing without instruction', agents });
    assert.ok(signal.id.startsWith('emg_'));
    assert.equal(signal.decision, 'pending');

    const pending = r.wisdom.emergenceSignals('pending');
    assert.ok(pending.length >= 1);

    r.wisdom.decideEmergence(signal.id, 'keep');
    const kept = r.wisdom.emergenceSignals('keep');
    assert.ok(kept.length >= 1);
  } finally { dispose(); }
});

test('wisdom.status: aggregates all counters', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.wisdom.archiveFailure({ company_id: r.company.id, kind: 'tool_error', summary: 'test failure' });
    r.wisdom.recordHistory({ summary: 'test event', kind: 'learning' });
    const s = r.wisdom.status();
    assert.ok(s.failures >= 1);
    assert.ok(s.history >= 1);
    assert.equal(typeof s.oracles, 'number');
    assert.equal(typeof s.emergence_pending, 'number');
  } finally { dispose(); }
});
