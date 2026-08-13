import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRuntime } from './helpers.ts';

test('metasovereign: register node + list', () => {
  const { r, dispose } = makeRuntime();
  try {
    const node = r.metasovereign.registerSovereign({ name: 'Portfolio Alpha', company_ids: [r.company.id], mode: 'peacetime' });
    assert.ok(node.id.startsWith('msv_'));
    assert.equal(node.level, 1);
    assert.equal(node.mode, 'peacetime');

    const nodes = r.metasovereign.nodes();
    assert.ok(nodes.length >= 1);
    assert.ok(nodes.some(n => n.id === node.id));
  } finally { dispose(); }
});

test('metasovereign: nested sovereign (sovereign over sovereign)', () => {
  const { r, dispose } = makeRuntime();
  try {
    const parent = r.metasovereign.registerSovereign({ name: 'Tier 1', company_ids: [r.company.id] });
    const child = r.metasovereign.registerSovereign({ name: 'Tier 2', company_ids: [], parent_id: parent.id });
    assert.equal(child.level, 2);
    assert.equal(child.parent_id, parent.id);
  } finally { dispose(); }
});

test('metasovereign: set mode + auto-detect', () => {
  const { r, dispose } = makeRuntime();
  try {
    const node = r.metasovereign.registerSovereign({ name: 'Ops Sovereign', company_ids: [r.company.id] });
    const ok = r.metasovereign.setMode(node.id, 'exploration', 'all metrics green');
    assert.ok(ok);

    const mode = r.metasovereign.autoMode(node.id);
    assert.ok(['peacetime', 'wartime', 'exploration', 'consolidation'].includes(mode));
  } finally { dispose(); }
});

test('metasovereign: portfolio report', () => {
  const { r, dispose } = makeRuntime();
  try {
    const report = r.metasovereign.portfolioReport();
    assert.ok(report.total_companies >= 1);
    assert.ok(report.recommendations.length >= 1);
    assert.ok(typeof report.total_spend_usd === 'number');
    assert.ok(['peacetime', 'wartime', 'exploration', 'consolidation'].includes(report.mode));
  } finally { dispose(); }
});

test('metasovereign: level2 readiness assessment', () => {
  const { r, dispose } = makeRuntime();
  try {
    const readiness = r.metasovereign.level2Readiness();
    assert.ok(typeof readiness.ready === 'boolean');
    assert.ok(readiness.score >= 0 && readiness.score <= 1);
    assert.ok(Array.isArray(readiness.gaps));
  } finally { dispose(); }
});

test('metasovereign.status: aggregates node counts by mode', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.metasovereign.registerSovereign({ name: 'S1', company_ids: [], mode: 'peacetime' });
    r.metasovereign.registerSovereign({ name: 'S2', company_ids: [], mode: 'wartime' });
    r.metasovereign.portfolioReport();
    const s = r.metasovereign.status();
    assert.ok(s.nodes >= 2);
    assert.ok(s.portfolio_reports >= 1);
    assert.ok(typeof s.modes.peacetime === 'number');
  } finally { dispose(); }
});
