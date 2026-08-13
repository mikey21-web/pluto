import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRuntime } from './helpers.ts';

test('timearch: fork + merge', () => {
  const { r, dispose } = makeRuntime();
  try {
    const fork = r.timearch.fork(null, 'Q4 Expansion', 'What if we enter logistics market?');
    assert.ok(fork.id.startsWith('fork_'));
    assert.equal(fork.status, 'running');

    const ok = r.timearch.mergeFork(fork.id, 'Logistics entry profitable — absorb insights');
    assert.ok(ok);
    const list = r.timearch.forks('merged');
    assert.ok(list.some(f => f.id === fork.id));
  } finally { dispose(); }
});

test('timearch: nested fork + discard', () => {
  const { r, dispose } = makeRuntime();
  try {
    const parent = r.timearch.fork(null, 'Parent', 'parent hyp');
    const child = r.timearch.fork(parent.id, 'Child', 'child hyp');
    assert.equal(child.parent_id, parent.id);

    r.timearch.discardFork(child.id, 'Child path unprofitable');
    const discarded = r.timearch.forks('discarded');
    assert.ok(discarded.some(f => f.id === child.id));
  } finally { dispose(); }
});

test('timearch: multi-timescale agents register + tick', () => {
  const { r, dispose } = makeRuntime();
  try {
    const agent = r.timearch.registerTimescaleAgent(r.company.id, 'OKR Reviewer', 'week');
    assert.ok(agent.id.startsWith('tsa_'));
    assert.equal(agent.timescale, 'week');
    assert.equal(agent.tick_count, 0);

    const count = r.timearch.tick(agent.id);
    assert.equal(count, 1);
    const count2 = r.timearch.tick(agent.id);
    assert.equal(count2, 2);
  } finally { dispose(); }
});

test('timearch: filter timescale agents by class', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.timearch.registerTimescaleAgent(r.company.id, 'Event Handler', 'microsecond');
    r.timearch.registerTimescaleAgent(r.company.id, 'Strategy Bot', 'year');

    const micro = r.timearch.timescaleAgents(r.company.id, 'microsecond');
    assert.ok(micro.length >= 1);
    assert.ok(micro.every(a => a.timescale === 'microsecond'));
  } finally { dispose(); }
});

test('timearch: long-horizon plan + milestone hit + reality check', () => {
  const { r, dispose } = makeRuntime();
  try {
    const plan = r.timearch.createPlan(r.company.id, '5-Year Civilization Plan', 5, [
      { label: 'Launch 3 companies', target_date: '2026-12-31' },
      { label: 'Hit ₹1Cr revenue', target_date: '2027-06-30' },
    ]);
    assert.ok(plan.id.startsWith('plan_'));
    assert.equal(plan.milestones.length, 2);
    assert.ok(plan.milestones.every(m => m.status === 'pending'));

    const ms = plan.milestones[0];
    const hit = r.timearch.hitMilestone(plan.id, ms.id);
    assert.ok(hit);

    const ok = r.timearch.realityCheck(plan.id, 'Revenue 20% behind target — adjust milestone 2');
    assert.ok(ok);

    const plans = r.timearch.plans(r.company.id);
    const found = plans.find(p => p.id === plan.id);
    assert.ok(found);
    assert.equal(found!.reality_checks.length, 1);
    assert.equal(found!.milestones.find(m => m.id === ms.id)?.status, 'hit');
  } finally { dispose(); }
});

test('timearch: revise milestone', () => {
  const { r, dispose } = makeRuntime();
  try {
    const plan = r.timearch.createPlan(r.company.id, 'Test Plan', 2, [
      { label: 'Launch', target_date: '2026-06-01' },
    ]);
    const ms = plan.milestones[0];
    const ok = r.timearch.reviseMilestone(plan.id, ms.id, '2026-09-01');
    assert.ok(ok);

    const plans = r.timearch.plans(r.company.id);
    const found = plans.find(p => p.id === plan.id);
    assert.equal(found!.milestones[0].status, 'revised');
    assert.equal(found!.milestones[0].target_date, '2026-09-01');
  } finally { dispose(); }
});

test('timearch: time perception set + get', () => {
  const { r, dispose } = makeRuntime();
  try {
    const tp = r.timearch.setTimeMode(r.company.id, 'compressed', 'Crisis mode — skip micro-decisions');
    assert.equal(tp.mode, 'compressed');

    const fetched = r.timearch.timeMode(r.company.id);
    assert.ok(fetched !== null);
    assert.equal(fetched!.mode, 'compressed');
  } finally { dispose(); }
});

test('timearch: status counters', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.timearch.fork(null, 'F1', 'hyp1');
    r.timearch.registerTimescaleAgent(r.company.id, 'Bot', 'day');
    const s = r.timearch.status();
    assert.ok(s.forks >= 1);
    assert.ok(s.timescale_agents >= 1);
  } finally { dispose(); }
});
