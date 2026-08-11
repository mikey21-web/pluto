import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withOrg } from './helpers.ts';

test('work graph: topo order respects dependencies', () => {
  const { r, dispose } = withOrg();
  const wg = r.workGraph.create(r.company.id, 'Delivery');
  r.workGraph.addNode(wg, { id: 'a', kind: 'design', summary: 'A', input: {}, agent_id: null, objective_id: null, project_id: null, depends_on: [], priority: 1 });
  r.workGraph.addNode(wg, { id: 'b', kind: 'build', summary: 'B', input: {}, agent_id: null, objective_id: null, project_id: null, depends_on: ['a'], priority: 1 });
  r.workGraph.addNode(wg, { id: 'c', kind: 'qa', summary: 'C', input: {}, agent_id: null, objective_id: null, project_id: null, depends_on: ['b'], priority: 1 });
  const order = r.workGraph.topoOrder(wg);
  assert.deepEqual(order, ['a', 'b', 'c']);
  dispose();
});

test('work graph: cycles are impossible via addNode (deps validated at insert)', () => {
  const { r, dispose } = withOrg();
  const wg = r.workGraph.create(r.company.id, 'Cycle');
  // building a cycle requires referencing a not-yet-added node → rejected at addNode time
  assert.throws(
    () => r.workGraph.addNode(wg, { id: 'a', kind: 'x', summary: 'A', input: {}, agent_id: null, objective_id: null, project_id: null, depends_on: ['a'], priority: 1 }),
    /unresolved dependency/,
  );
  dispose();
});

test('work graph: unresolved dependency throws on addNode', () => {
  const { r, dispose } = withOrg();
  const wg = r.workGraph.create(r.company.id, 'Broken');
  assert.throws(
    () => r.workGraph.addNode(wg, { id: 'a', kind: 'x', summary: 'A', input: {}, agent_id: null, objective_id: null, project_id: null, depends_on: ['missing'], priority: 1 }),
    /unresolved dependency/,
  );
  dispose();
});

test('work graph: available returns only nodes whose deps are done', () => {
  const { r, dispose } = withOrg();
  const wg = r.workGraph.create(r.company.id, 'Fifo');
  r.workGraph.addNode(wg, { id: 'a', kind: 'design', summary: 'A', input: {}, agent_id: null, objective_id: null, project_id: null, depends_on: [], priority: 1 });
  r.workGraph.addNode(wg, { id: 'b', kind: 'build', summary: 'B', input: {}, agent_id: null, objective_id: null, project_id: null, depends_on: ['a'], priority: 1 });
  const none = r.workGraph.available(wg, new Set());
  assert.deepEqual(none.map(n => n.id), ['a']);
  const withA = r.workGraph.available(wg, new Set(['a']));
  assert.deepEqual(withA.map(n => n.id), ['b']);
  dispose();
});