import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRuntime } from './helpers.ts';

test('world.assert records a fact and current() retrieves it', () => {
  const { r, dispose } = makeRuntime();
  r.world.assert({ company_id: r.company.id, entity: 'acme_corp', attribute: 'revenue', value: '4M', source: 'research', confidence: 0.85 });
  const f = r.world.current(r.company.id, 'acme_corp', 'revenue')!;
  assert.equal(f.value, '4M');
  assert.equal(f.active, true);
  assert.equal(f.source, 'research');
  dispose();
});

test('world.assert version-supersedes on same entity+attribute and keeps history', () => {
  const { r, dispose } = makeRuntime();
  r.world.assert({ company_id: r.company.id, entity: 'acme_corp', attribute: 'revenue', value: '4M' });
  r.world.assert({ company_id: r.company.id, entity: 'acme_corp', attribute: 'revenue', value: '5M' });
  const cur = r.world.current(r.company.id, 'acme_corp', 'revenue')!;
  assert.equal(cur.value, '5M');
  assert.equal(cur.version, 2);
  assert.equal(r.world.history(r.company.id).filter(f => f.entity === 'acme_corp' && f.attribute === 'revenue').length, 2);
  dispose();
});

test('world.whatIsTrueAbout returns all active attributes for an entity', () => {
  const { r, dispose } = makeRuntime();
  r.world.assert({ company_id: r.company.id, entity: 'acme_corp', attribute: 'revenue', value: '4M' });
  r.world.assert({ company_id: r.company.id, entity: 'acme_corp', attribute: 'headcount', value: '40' });
  const facts = r.world.whatIsTrueAbout(r.company.id, 'acme_corp');
  assert.equal(facts.length, 2);
  assert.ok(facts.every(f => f.entity === 'acme_corp' && f.active));
  dispose();
});

test('world.forget retires a fact', () => {
  const { r, dispose } = makeRuntime();
  r.world.assert({ company_id: r.company.id, entity: 'acme_corp', attribute: 'revenue', value: '4M' });
  assert.equal(r.world.forget(r.company.id, 'acme_corp', 'revenue'), true);
  assert.equal(r.world.current(r.company.id, 'acme_corp', 'revenue'), null);
  assert.equal(r.world.forget(r.company.id, 'acme_corp', 'nope'), false);
  dispose();
});

test('world mirrors sync and reconcile detects drift', () => {
  const { r, dispose } = makeRuntime();
  r.world.syncMirror({ company_id: r.company.id, system: 'crm', entity: 'acme_corp', payload: { stage: 'proposal' } });
  r.world.syncMirror({ company_id: r.company.id, system: 'crm', entity: 'acme_corp', payload: { stage: 'proposal' } });
  const mirrors = r.world.mirrors(r.company.id);
  assert.equal(mirrors.length, 1);
  assert.equal(mirrors[0].drift, 0);
  // change the payload → next sync flags drift
  r.world.syncMirror({ company_id: r.company.id, system: 'crm', entity: 'acme_corp', payload: { stage: 'won' } });
  assert.equal(r.world.mirrors(r.company.id)[0].drift, 1);
  dispose();
});

test('world.reconcile returns drifted mirrors and clears clean ones', () => {
  const { r, dispose } = makeRuntime();
  r.world.syncMirror({ company_id: r.company.id, system: 'crm', entity: 'a', payload: { stage: 'x' } });
  r.world.syncMirror({ company_id: r.company.id, system: 'crm', entity: 'b', payload: { stage: 'y' } });
  r.world.markDrift(r.company.id, 'crm', 'a', 'tampered');
  const drifted = r.world.reconcile(r.company.id);
  assert.equal(drifted.length, 1);
  assert.equal(drifted[0].entity, 'a');
  dispose();
});

test('world time-travel asOf returns facts as they were at timestamp T', async () => {
  const { r, dispose } = makeRuntime();
  const f1 = r.world.assert({ company_id: r.company.id, entity: 'acme_corp', attribute: 'revenue', value: '4M' });
  await new Promise(res => setTimeout(res, 15));
  const f2 = r.world.assert({ company_id: r.company.id, entity: 'acme_corp', attribute: 'revenue', value: '5M' });
  // as of f1.ts → 4M; as of f2.ts (inclusive) → 5M
  const at1 = r.world.asOf(r.company.id, f1.ts).find(f => f.attribute === 'revenue');
  assert.equal(at1!.value, '4M');
  const at2 = r.world.asOf(r.company.id, f2.ts).find(f => f.attribute === 'revenue');
  assert.equal(at2!.value, '5M');
  assert.equal(f1.version, 1);
  dispose();
});

test('world snapshot records a snapshot entry and does not duplicate active rows', () => {
  const { r, dispose } = makeRuntime();
  r.world.assert({ company_id: r.company.id, entity: 'e', attribute: 'a', value: '1' });
  const key = r.world.snapshot(r.company.id);
  assert.ok(key.length > 0);
  const snaps = r.world.mirrors(r.company.id).filter(m => m.system === 'world_snapshot');
  assert.equal(snaps.length, 1);
  dispose();
});

test('world.all lists every active fact for the company', () => {
  const { r, dispose } = makeRuntime();
  r.world.assert({ company_id: r.company.id, entity: 'e1', attribute: 'x', value: '1' });
  r.world.assert({ company_id: r.company.id, entity: 'e2', attribute: 'y', value: '2' });
  assert.equal(r.world.all(r.company.id).length, 2);
  dispose();
});
