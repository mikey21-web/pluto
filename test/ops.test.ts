import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRuntime } from './helpers.ts';
import { OpsRuntime } from '../src/ops/engine.ts';

test('ops phase progression: days 1-30 supervised, 31-60 trust-building, 61-90 autonomous', () => {
  const { r, dispose } = makeRuntime();
  try {
    const early = new OpsRuntime(r.state, new Date(Date.now() - 14 * 86400000));
    const { day, phase } = early.currentDay();
    assert.equal(day, 15);
    assert.equal(phase, 'supervised');

    const mid = new OpsRuntime(r.state, new Date(Date.now() - 44 * 86400000));
    const { day: d2, phase: p2 } = mid.currentDay();
    assert.equal(d2, 45);
    assert.equal(p2, 'trust-building');

    const late = new OpsRuntime(r.state, new Date(Date.now() - 74 * 86400000));
    const { day: d3, phase: p3 } = late.currentDay();
    assert.equal(d3, 75);
    assert.equal(p3, 'autonomous');

    const gate = new OpsRuntime(r.state, new Date(Date.now() - 94 * 86400000));
    const { day: d4, phase: p4 } = gate.currentDay();
    assert.equal(d4, 95);
    assert.equal(p4, 'gate');
  } finally { dispose(); }
});

test('ops recordDay + autoRecordDay + daysList', () => {
  const { r, dispose } = makeRuntime();
  try {
    const rec = r.ops.recordDay({ decisions_logged: 5, escalations: 1, human_reviews: 3, leads_qualified: 4, meetings_booked: 2, deals_closed: 0, rollback_incidents: 0, spend_usd: 120, revenue_usd: 0, notes: 'day 1' });
    assert.equal(rec.day, 1);
    assert.equal(rec.leads_qualified, 4);
    assert.equal(r.ops.daysList().length, 1);

    // auto-record requires company data; just check it returns a DayRecord
    const auto = r.ops.autoRecordDay(r.company.id);
    assert.ok(auto.day >= 1);
  } finally { dispose(); }
});

test('ops weekly cadence: recordWeek aggregates 7 days', () => {
  const { r, dispose } = makeRuntime();
  try {
    // record 3 days
    r.ops.recordDay({ decisions_logged: 1, escalations: 0, human_reviews: 1, leads_qualified: 2, meetings_booked: 1, deals_closed: 0, rollback_incidents: 0, spend_usd: 50, revenue_usd: 0, notes: '' });
    r.ops.recordDay({ decisions_logged: 1, escalations: 0, human_reviews: 1, leads_qualified: 3, meetings_booked: 1, deals_closed: 0, rollback_incidents: 0, spend_usd: 60, revenue_usd: 0, notes: '' });
    r.ops.recordDay({ decisions_logged: 1, escalations: 0, human_reviews: 1, leads_qualified: 2, meetings_booked: 1, deals_closed: 0, rollback_incidents: 0, spend_usd: 55, revenue_usd: 0, notes: '' });
    const week = r.ops.recordWeek({ retro_notes: 'good week' });
    assert.equal(week.week, 1);
    assert.equal(week.leads_qualified, 7);
    assert.equal(week.meetings_booked, 3);
    assert.equal(week.spend_usd, 165);
    assert.equal(r.ops.weeksList().length, 1);
  } finally { dispose(); }
});

test('ops monthly cadence: recordMonth aggregates ~30 days with unit economics', () => {
  const { r, dispose } = makeRuntime();
  try {
    // mock 3 days in month
    r.ops.recordDay({ decisions_logged: 1, escalations: 0, human_reviews: 1, leads_qualified: 10, meetings_booked: 2, deals_closed: 1, rollback_incidents: 0, spend_usd: 100, revenue_usd: 500, notes: '' });
    r.ops.recordDay({ decisions_logged: 1, escalations: 0, human_reviews: 1, leads_qualified: 5, meetings_booked: 1, deals_closed: 0, rollback_incidents: 0, spend_usd: 80, revenue_usd: 0, notes: '' });
    const month = r.ops.recordMonth({ audit_notes: 'month 1' });
    assert.equal(month.month, 1);
    assert.equal(month.leads_qualified, 15);
    assert.equal(month.meetings_booked, 3);
    assert.equal(month.deals_closed, 1);
    assert.ok(typeof month.unit_economics.cac === 'number');
    assert.ok(typeof month.unit_economics.ltv === 'number');
    assert.ok(typeof month.unit_economics.positive === 'boolean');
  } finally { dispose(); }
});

test('ops evaluateGate: passes when all criteria met', () => {
  const { r, dispose } = makeRuntime();
  try {
    // add sufficient days
    for (let i = 1; i <= 25; i++) {
      r.ops.recordDay({ decisions_logged: 0, escalations: 0, human_reviews: 0, leads_qualified: 4, meetings_booked: 1, deals_closed: i <= 3 ? 1 : 0, rollback_incidents: 0, spend_usd: 100, revenue_usd: i <= 3 ? 5000 : 0, notes: '' });
    }
    // add client.satisfied event
    r.state.emit(r.company.id, 'client.satisfied', 'c1', 'human', {});
    // record a month for unit economics
    r.ops.recordMonth({ audit_notes: 'month 1' });
    const gate = r.ops.evaluateGate(r.company.id);
    assert.equal(gate.passed, true);
    assert.equal(gate.criteria.leads_qualified.met, true);
    assert.equal(gate.criteria.meetings_booked.met, true);
    assert.equal(gate.criteria.deals_closed.met, true);
    assert.equal(gate.criteria.rollback_incidents.met, true);
    assert.equal(gate.criteria.client_satisfied.met, true);
    assert.equal(gate.criteria.unit_economics_positive.met, true);
  } finally { dispose(); }
});

test('ops evaluateGate: fails when criteria not met', () => {
  const { r, dispose } = makeRuntime();
  try {
    const gate = r.ops.evaluateGate(r.company.id);
    assert.equal(gate.passed, false);
    assert.equal(gate.criteria.leads_qualified.met, false);
    assert.equal(gate.criteria.meetings_booked.met, false);
  } finally { dispose(); }
});

test('ops status returns current phase info', () => {
  const { r, dispose } = makeRuntime();
  try {
    const st = r.ops.status();
    assert.ok(typeof st.phase === 'string');
    assert.ok(typeof st.day === 'number');
    assert.ok(typeof st.days_logged === 'number');
  } finally { dispose(); }
});