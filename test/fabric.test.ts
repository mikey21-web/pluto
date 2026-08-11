import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withOrg } from './helpers.ts';
import { ExecutionFabric, classify } from '../src/work/fabric.ts';

test('classify maps error messages to failure classes', () => {
  assert.equal(classify(new Error('request timed out after 30s')), 'timeout');
  assert.equal(classify('ECONNREFUSED'), 'timeout');
  assert.equal(classify('socket hang up'), 'timeout');
  assert.equal(classify('permission denied'), 'policy');
  assert.equal(classify('policy denied the action'), 'policy');
  assert.equal(classify('not authorized'), 'policy');
  assert.equal(classify('schema invalid'), 'permanent');
  assert.equal(classify('404 not found'), 'permanent');
  assert.equal(classify('rate limit exceeded'), 'transient');
});

test('ExecutionFabric.enqueue persists a queued job and emits job.queued', () => {
  const { r, dispose } = withOrg();
  const fabric = new ExecutionFabric(r.state);
  const job = fabric.enqueue({ company_id: r.company.id, kind: 'report', max_attempts: 2 });
  assert.equal(job.status, 'queued');
  assert.equal(job.max_attempts, 2);
  const events = r.state.repos.events(r.company.id).filter(e => e.type === 'job.queued');
  assert.ok(events.length >= 1);
  dispose();
});

test('ExecutionFabric.run succeeds a job and marks the linked task SUCCEEDED', async () => {
  const { r, dispose } = withOrg();
  const fabric = new ExecutionFabric(r.state);
  const task = r.state.repos.createTask({ company_id: r.company.id, summary: 't', kind: 'report' });
  const job = fabric.enqueue({ company_id: r.company.id, task_id: task.id, kind: 'report' });

  const done = await fabric.run(job.id, async () => ({ ok: true, state: { note: 'all good' } }));
  assert.equal(done.status, 'succeeded');
  assert.equal(done.attempts, 1);
  assert.equal(done.state.note, 'all good');
  const t = r.state.repos.task(task.id)!;
  assert.equal(t.status, 'SUCCEEDED');
  assert.equal(t.output.job_status, 'succeeded');
  assert.ok(r.state.repos.traces(r.company.id).some(tr => tr.step === 'job.succeeded'));
  dispose();
});

test('ExecutionFabric.run fails fast on a permanent error', async () => {
  const { r, dispose } = withOrg();
  const fabric = new ExecutionFabric(r.state);
  const job = fabric.enqueue({ company_id: r.company.id, kind: 'report', max_attempts: 3 });
  const done = await fabric.run(job.id, async () => ({ ok: false, error: 'schema invalid', class: 'permanent' as const }));
  assert.equal(done.status, 'failed');
  assert.equal(done.attempts, 1);
  assert.equal(done.state.failure_class, 'permanent');
  dispose();
});

test('ExecutionFabric.run retries transient failures then succeeds', async () => {
  const { r, dispose } = withOrg();
  const fabric = new ExecutionFabric(r.state);
  const job = fabric.enqueue({ company_id: r.company.id, kind: 'report', max_attempts: 3 });
  let calls = 0;
  const done = await fabric.run(job.id, async () => {
    calls++;
    return calls < 2 ? { ok: false, error: 'rate limit exceeded', class: 'transient' as const } : { ok: true };
  });
  assert.equal(calls, 2);
  assert.equal(done.status, 'succeeded');
  assert.ok(r.state.repos.events(r.company.id).some(e => e.type === 'job.retrying'));
  dispose();
});

test('ExecutionFabric.run exhausts attempts and fails with retry error kept', async () => {
  const { r, dispose } = withOrg();
  const fabric = new ExecutionFabric(r.state);
  const job = fabric.enqueue({ company_id: r.company.id, kind: 'report', max_attempts: 1 });
  const done = await fabric.run(job.id, async () => ({ ok: false, error: 'transient blip' }));
  assert.equal(done.status, 'failed');
  dispose();
});

test('ExecutionFabric.run surfaces an uncaught handler exception as failure', async () => {
  const { r, dispose } = withOrg();
  const fabric = new ExecutionFabric(r.state);
  const job = fabric.enqueue({ company_id: r.company.id, kind: 'report', max_attempts: 1 });
  const done = await fabric.run(job.id, async () => { throw new Error('boom'); });
  assert.equal(done.status, 'failed');
  assert.match(done.error ?? '', /boom/);
  dispose();
});

test('ExecutionFabric.run throws for an unknown job id', async () => {
  const { r, dispose } = withOrg();
  const fabric = new ExecutionFabric(r.state);
  await assert.rejects(() => fabric.run('missing_job', async () => ({ ok: true })), /not found/);
  dispose();
});

test('fabric jobs attach outcomes to tasks and keep task FAILED status', async () => {
  const { r, dispose } = withOrg();
  const fabric = new ExecutionFabric(r.state);
  const task = r.state.repos.createTask({ company_id: r.company.id, summary: 't', kind: 'report' });
  const job = fabric.enqueue({ company_id: r.company.id, task_id: task.id, kind: 'report', max_attempts: 1 });
  await fabric.run(job.id, async () => ({ ok: false, error: 'schema invalid', class: 'permanent' as const }));
  const t = r.state.repos.task(task.id)!;
  assert.equal(t.status, 'FAILED');
  assert.equal(t.output.job_status, 'failed');
  dispose();
});

test('register stores a handler by task kind without throwing', () => {
  const { r, dispose } = withOrg();
  const fabric = new ExecutionFabric(r.state);
  fabric.register('report', async () => ({ ok: true }));
  const job = fabric.enqueue({ company_id: r.company.id, kind: 'report' });
  assert.equal(job.status, 'queued');
  dispose();
});
