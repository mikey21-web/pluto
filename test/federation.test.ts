import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRuntime } from './helpers.ts';

test('federation: send and acknowledge message', () => {
  const { r, dispose } = makeRuntime();
  try {
    const msg = r.federation.sendMessage('civ-a', 'civ-b', 'trade_offer', { item: 'data' });
    assert.equal(msg.status, 'sent');
    assert.ok(r.federation.acknowledgeMessage(msg.id, 'acknowledged'));
    const found = r.federation.messages('civ-a').find(m => m.id === msg.id);
    assert.equal(found!.status, 'acknowledged');
  } finally { dispose(); }
});

test('federation: first contact and strategy update', () => {
  const { r, dispose } = makeRuntime();
  try {
    const fc = r.federation.firstContact('civ-rival', 'Rival Corp', 'observe', 'Expanding');
    assert.equal(fc.initial_strategy, 'observe');
    assert.ok(r.federation.updateStrategy(fc.id, 'cooperate', 0.7));
    const updated = r.federation.contacts().find(c => c.id === fc.id);
    assert.equal(updated!.current_strategy, 'cooperate');
  } finally { dispose(); }
});

test('federation: snapshot version increments', () => {
  const { r, dispose } = makeRuntime();
  try {
    const s1 = r.federation.snapshot('civ-a');
    const s2 = r.federation.snapshot('civ-a');
    assert.equal(s1.version, 1);
    assert.equal(s2.version, 2);
  } finally { dispose(); }
});

test('federation: plan and complete migration', () => {
  const { r, dispose } = makeRuntime();
  try {
    const snap = r.federation.snapshot('civ-b');
    const mp = r.federation.planMigration(snap.id, 'vps:eu', 'vps:ap', 'sha256:abc');
    assert.equal(mp.status, 'planned');
    assert.ok(r.federation.completeMigration(mp.id, true));
  } finally { dispose(); }
});

test('federation: sign treaty', () => {
  const { r, dispose } = makeRuntime();
  try {
    const t = r.federation.signTreaty(['civ-a', 'civ-b'], ['no predatory pricing'], ['market_intel'], true);
    assert.ok(t.active);
    assert.ok(r.federation.treaties(true).some(x => x.id === t.id));
  } finally { dispose(); }
});

test('federation: propose and dual-approve M&A', () => {
  const { r, dispose } = makeRuntime();
  try {
    const ma = r.federation.proposeMandA('acquire', 'civ-a', 'civ-target', 'All-stock deal');
    assert.equal(ma.status, 'proposed');
    r.federation.approveMandA(ma.id, 'acquirer');
    const result = r.federation.approveMandA(ma.id, 'target');
    assert.equal(result!.status, 'approved');
  } finally { dispose(); }
});
