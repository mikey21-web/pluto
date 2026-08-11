import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRuntime } from './helpers.ts';
import { RealityInterface, buildRealityInterface, commercialCycleSteps } from '../src/reality/engine.ts';
import type { ExternalProvider } from '../src/reality/engine.ts';

test('registry exposes all 11 commercial channels, all connected (simulated)', () => {
  const { r, dispose } = makeRuntime();
  try {
    const kinds = r.reality.connectedKinds();
    assert.deepEqual(kinds.sort(), ['ads', 'banking', 'calendar', 'contracts', 'ecommerce', 'email', 'payments', 'signing', 'telegram', 'voice', 'whatsapp'].sort());
    assert.equal(r.reality.list().length, 11);
  } finally { dispose(); }
});

test('syncAll mirrors every connected provider into the world model', () => {
  const { r, dispose } = makeRuntime();
  try {
    const out = r.reality.syncAll(r.company.id);
    assert.equal(out.length, 11);
    assert.ok(out.every(o => o.system.startsWith('reality.')));
    // ground truth is now queryable via the world model
    const payment = r.world.current(r.company.id, 'payments', 'status');
    assert.equal(payment?.value, 'up');
    const mirrors = r.world.mirrors(r.company.id);
    assert.ok(mirrors.some(m => m.system === 'reality.email'));
    const whatDepartment = r.world.whatIsTrueAbout(r.company.id, 'email');
    assert.ok(whatDepartment.length >= 1);
  } finally { dispose(); }
});

test('ingest accepts inbound from a connected channel and records it', () => {
  const { r, dispose } = makeRuntime();
  try {
    const res = r.reality.ingest(r.company.id, { channel: 'email', from: 'lead@acme.com', body: 'Please quote a website build' });
    assert.equal(res.ok, true);
    assert.equal(res.received, 1);
    // a second ingest increments the counter (recorded inbound)
    const res2 = r.reality.ingest(r.company.id, { channel: 'email', from: 'other@acme.com', body: 'hello' });
    assert.equal(res2.received, 2);
    // sync now mirrors and asserts email status fact
    r.reality.syncAll(r.company.id);
    assert.equal(r.world.current(r.company.id, 'email', 'status')?.value, 'up');
  } finally { dispose(); }
});

test('ingest rejects unknown or disconnected channels', () => {
  const { r, dispose } = makeRuntime();
  try {
    const res = r.reality.ingest(r.company.id, { channel: 'fax', from: 'x', body: 'y' } as never);
    assert.equal(res.ok, false);
  } finally { dispose(); }
});

test('full commercial cycle routes through every channel end-to-end', () => {
  const { r, dispose } = makeRuntime();
  try {
    const steps = commercialCycleSteps();
    let ok = true;
    let failReason = '';
    for (const step of steps) {
      const res = r.reality.route(r.company.id, step);
      if (!res.ok) { ok = false; failReason = `${step.channel}: ${res.reason}`; break; }
    }
    assert.equal(ok, true, failReason);
    // every channel now has a mirror
    const mirrors = r.world.mirrors(r.company.id);
    for (const step of steps) {
      assert.ok(mirrors.some(m => m.system === `reality.${step.channel}`), `${step.channel} mirror exists`);
    }
  } finally { dispose(); }
});

test('a custom (real-SDK-backed) provider can replace a simulated one', () => {
  const { r, dispose } = makeRuntime();
  try {
    const custom: ExternalProvider = {
      kind: 'payments', name: 'stripe-live', connected: true,
      snapshot: () => ({ balance_usd: 1234, status: 'live' }),
      sync: (cid, world) => {
        world.syncMirror({ company_id: cid, system: 'reality.payments', entity: 'stripe-live', payload: { balance_usd: 1234 } });
        return { balance_usd: 1234 };
      },
      ingest: () => ({ ok: true }),
    };
    r.reality.register(custom);
    assert.equal(r.reality.provider('payments')!.name, 'stripe-live');
    const synced = r.reality.syncAll(r.company.id);
    assert.ok(synced.filter(o => o.system === 'reality.payments'));
  } finally { dispose(); }
});

test('RealityInterface standalone works with a world + optional bus', () => {
  const { r, dispose } = makeRuntime();
  try {
    const ri = new RealityInterface({ world: r.world });
    const p = r.reality.provider('email')!;
    ri.register(p);
    assert.equal(ri.connectedKinds().length, 1);
    // no bus: ingest should not throw
    const res = ri.ingest(r.company.id, { channel: 'email', from: 'a@b.c', body: 'hi' });
    assert.equal(res.ok, true);
  } finally { dispose(); }
});
