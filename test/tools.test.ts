import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { withOrg } from './helpers.ts';
import { buildToolFabric, fsTools } from '../src/tools/fabric.ts';
import type { ExecCtx } from '../src/kernel/types.ts';

function ctxOf(r: ReturnType<typeof withOrg>['r'], agentId: string): ExecCtx {
  return { company_id: r.company.id, agent_id: agentId, task_id: 't', state: r.state };
}

test('tool fabric exposes the core tool set', () => {
  const names = buildToolFabric().map(t => t.name);
  assert.deepEqual(names, ['time.now', 'utils.echo', 'memory.write', 'memory.recall', 'graph.lookup']);
});

test('time.now returns a UTC ISO timestamp', async () => {
  const { r, dispose } = withOrg();
  const [time] = buildToolFabric();
  const res = await time.run({}, ctxOf(r, 'a'));
  assert.equal(res.ok, true);
  assert.ok(!isNaN(Date.parse(JSON.parse(res.content).utc)));
  dispose();
});

test('utils.echo returns its input unchanged', async () => {
  const { r, dispose } = withOrg();
  const [, echo] = buildToolFabric();
  const res = await echo.run({ value: 'ping' }, ctxOf(r, 'a'));
  assert.equal(JSON.parse(res.content).echo, 'ping');
  dispose();
});

test('memory.write + memory.recall roundtrip through company memory', async () => {
  const { r, dispose } = withOrg();
  const [,, w, recall] = buildToolFabric();
  await w.run({ type: 'customer', content: 'Northwind likes fast delivery', tags: ['smb'] }, ctxOf(r, 'a1'));
  await w.run({ type: 'semantic', content: 'ICP prefers fixed pricing' }, ctxOf(r, 'a2'));
  const res = await recall.run({ type: 'customer', limit: 10 }, ctxOf(r, 'a1'));
  const recs = JSON.parse(res.content);
  assert.equal(recs.length, 1);
  assert.match(recs[0].content, /Northwind/);
  dispose();
});

test('graph.lookup returns a node and its edges; missing node returns an error', async () => {
  const { r, dispose } = withOrg();
  const [, , , , graph] = buildToolFabric();
  r.state.repos.upsertNode('n1', 'company', 'Acme', {});
  r.state.repos.upsertNode('n2', 'customer', 'Cust', {});
  r.state.repos.upsertEdge('n1', 'n2', 'targets', {});
  const res = await graph.run({ id: 'n1' }, ctxOf(r, 'a'));
  const data = JSON.parse(res.content);
  assert.equal(data.node.name, 'Acme');
  assert.equal(data.edges.length, 1);
  const missing = await graph.run({ id: 'nope' }, ctxOf(r, 'a'));
  assert.equal(missing.ok, false);
  dispose();
});

test('fsTools read/write roundtrip and block path escape', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'pluto-tools-'));
  const [read, write] = fsTools(dir);
  const w = await write.run({ path: 'reports/q1.md', content: '# Q1' }, null as any);
  assert.equal(w.ok, true);
  const rd = await read.run({ path: 'reports/q1.md' }, null as any);
  assert.equal(rd.ok, true);
  assert.match(rd.content, /# Q1/);
  const esc = await read.run({ path: '../../etc/passwd' }, null as any);
  assert.equal(esc.ok, false);
  rmSync(dir, { recursive: true, force: true });
});
