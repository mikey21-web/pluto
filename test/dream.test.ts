import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRuntime } from './helpers.ts';

test('dream.cycle: run scenario + apply insight', () => {
  const { r, dispose } = makeRuntime();
  try {
    const d = r.dream.dream({ company_id: r.company.id, hypothesis: 'What if we raised retainer price from ₹15k to ₹20k?', simulated_outcome: 'Lost 2 of 10 clients, net revenue +₹30k/mo', insight: 'Price increase is net positive — do it in Q3' });
    assert.ok(d.id.startsWith('drm_'));
    assert.ok(d.hypothesis.includes('₹15k'));

    const pending = r.dream.dreams(r.company.id, 'pending');
    assert.ok(pending.length >= 1);

    r.dream.applyInsight(d.id);
    const applied = r.dream.dreams(r.company.id, 'applied');
    assert.ok(applied.length >= 1);
  } finally { dispose(); }
});

test('dream.emotion: frustrated customer triggers high urgency', () => {
  const { r, dispose } = makeRuntime();
  try {
    const signal = r.dream.readEmotion({ customer_id: 'cust_001', company_id: r.company.id, text: 'This is urgent! I am very frustrated with the delay, terrible service', reply_latency_hours: 2 });
    assert.equal(signal.tone, 'frustrated');
    assert.equal(signal.urgency, 'high');
    assert.ok(signal.recommended_action.includes('Escalate'));
  } finally { dispose(); }
});

test('dream.emotion: excited customer → strike while hot', () => {
  const { r, dispose } = makeRuntime();
  try {
    const signal = r.dream.readEmotion({ customer_id: 'cust_002', company_id: r.company.id, text: "I love this! Can't wait to get started, this is fantastic" });
    assert.equal(signal.tone, 'excited');
    assert.ok(signal.recommended_action.toLowerCase().includes('strike') || signal.recommended_action.toLowerCase().includes('proposal') || signal.recommended_action.toLowerCase().includes('hot'));
  } finally { dispose(); }
});

test('dream.emotion: disengagement detected on short reply + long latency', () => {
  const { r, dispose } = makeRuntime();
  try {
    const signal = r.dream.readEmotion({ customer_id: 'cust_003', company_id: r.company.id, text: 'ok', reply_latency_hours: 72 });
    assert.ok(signal.disengagement);
    assert.ok(signal.recommended_action.toLowerCase().includes('re-engage') || signal.recommended_action.toLowerCase().includes('check-in') || signal.recommended_action.toLowerCase().includes('friction'));
  } finally { dispose(); }
});

test('dream.status: aggregates counters', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.dream.dream({ company_id: r.company.id, hypothesis: 'Add WhatsApp-first intake' });
    r.dream.readEmotion({ customer_id: 'c1', company_id: r.company.id, text: 'Urgent! Fix this now!!' });
    const s = r.dream.status(r.company.id);
    assert.ok(s.dreams_run >= 1);
    assert.ok(s.high_urgency_signals >= 1);
  } finally { dispose(); }
});
