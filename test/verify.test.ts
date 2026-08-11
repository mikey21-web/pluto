import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withOrg } from './helpers.ts';
import { VerificationEngine, defaultVerifiers } from '../src/verify/engine.ts';

test('defaultVerifiers: output_exists passes only when output has keys', async () => {
  const { r, dispose } = withOrg();
  const verifiers = new Map(defaultVerifiers());
  const noOutput = r.state.repos.createTask({ company_id: r.company.id, summary: 't1', output: {} });
  const withOutput = r.state.repos.createTask({ company_id: r.company.id, summary: 't2', output: { result: 'x' } });

  const a = verifiers.get('output_exists')!;
  const fail = await a(noOutput, r.state);
  const pass = await a(withOutput, r.state);
  assert.equal(fail.ok, false);
  assert.equal(pass.ok, true);
  dispose();
});

test('defaultVerifiers: no_hallucination flags placeholder content', async () => {
  const { r, dispose } = withOrg();
  const verifiers = new Map(defaultVerifiers());
  const clean = r.state.repos.createTask({ company_id: r.company.id, summary: 'clean', output: { text: 'delivered proposal' } });
  const dirty = r.state.repos.createTask({ company_id: r.company.id, summary: 'dirty', output: { text: 'client is Acme Corp, lorem ipsum' } });

  const v = verifiers.get('no_hallucination')!;
  assert.equal((await v(clean, r.state)).ok, true);
  assert.equal((await v(dirty, r.state)).ok, false);
  dispose();
});

test('VerificationEngine: register/list/verify persists evidence and emits task.verifying', async () => {
  const { r, dispose } = withOrg();
  const ve = new VerificationEngine(r.state);
  assert.deepEqual(ve.list(), []);
  ve.register('truthy', async (t) => ({
    kind: 'truthy', name: 'has output', ok: t.output.ok === true,
    detail: 'checked', verified_by: null, verified_at: new Date().toISOString(), confidence: 1,
  }));
  assert.deepEqual(ve.list(), ['truthy']);

  const task = r.state.repos.createTask({ company_id: r.company.id, summary: 't', output: { ok: true } });
  const evs = await ve.verify(task, ['truthy']);
  assert.equal(evs.length, 1);
  assert.equal(evs[0].ok, true);
  const reloaded = r.state.repos.task(task.id)!;
  assert.equal(reloaded.evidence.some(e => e.kind === 'truthy'), true);
  const events = r.state.repos.events(r.company.id).filter(e => e.type === 'task.verifying');
  assert.ok(events.length >= 1);
  assert.equal(ve.allPass(evs), true);
  assert.equal(ve.allPass([...evs, { kind: 'x', name: 'x', ok: false, detail: '', verified_by: null, verified_at: null, confidence: 0 }]), false);
  dispose();
});

test('VerificationEngine: verify skips unknown verifier kinds', async () => {
  const { r, dispose } = withOrg();
  const ve = new VerificationEngine(r.state);
  const task = r.state.repos.createTask({ company_id: r.company.id, summary: 't', output: { a: 1 } });
  const evs = await ve.verify(task, ['nope']);
  assert.equal(evs.length, 0);
  dispose();
});
