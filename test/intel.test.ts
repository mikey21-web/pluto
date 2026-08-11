import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { withOrg } from './helpers.ts';
import { CompanyIntelligence } from '../src/intel/engine.ts';
import { PlutoState } from '../src/kernel/state.ts';
import { Store } from '../src/kernel/store.ts';

test('intel.learnCustomer records a customer node with discovery props', () => {
  const { r, dispose } = withOrg();
  const intel = new CompanyIntelligence(r.state);
  const node = intel.learnCustomer(r.company.id, 'Northwind Traders', { icp: 'smb' });
  assert.equal(node.kind, 'customer');
  assert.equal(node.props.icp, 'smb');
  assert.ok(node.props.discovered_at);
  const again = intel.learnCustomer(r.company.id, 'Northwind Traders', { icp: 'mid' });
  assert.equal(again.id, node.id);
  dispose();
});

test('intel.factsAbout returns provenance-tracked facts for a node', () => {
  const { r, dispose } = withOrg();
  const intel = new CompanyIntelligence(r.state);
  r.state.repos.upsertNode('co_x', 'company', 'Acme', { company_id: r.company.id });
  r.state.repos.upsertNode('cust_y', 'customer', 'Northwind', { company_id: r.company.id });
  r.state.repos.upsertEdge('co_x', 'cust_y', 'targets', { confidence: 0.9 });
  const facts = intel.factsAbout('co_x');
  assert.equal(facts.length, 1);
  assert.equal(facts[0].subject, 'Acme');
  assert.equal(facts[0].predicate, 'targets');
  assert.equal(facts[0].object, 'Northwind');
  assert.equal(facts[0].confidence, 0.9);
  assert.equal(facts[0].source, 'graph');
  assert.equal(intel.factsAbout(null).length, 0);
  dispose();
});

test('intel.brief synthesizes an operating picture', () => {
  const { r, dispose } = withOrg();
  const intel = new CompanyIntelligence(r.state);
  r.state.repos.upsertNode('c1', 'customer', 'Cust A', { company_id: r.company.id });
  r.state.repos.upsertNode('c2', 'customer', 'Cust B', { company_id: r.company.id });
  r.state.repos.upsertNode('cap1', 'capability', 'seo_audit', { company_id: r.company.id });
  r.state.repos.createRisk({ company_id: r.company.id, title: 'concentration risk', probability: 0.3, impact: 0.8 });
  r.state.repos.createTask({ company_id: r.company.id, summary: 'failed thing', status: 'FAILED' });

  const brief = intel.brief(r.company.id);
  assert.equal(brief.company?.id, r.company.id);
  assert.equal(brief.customers.length, 2);
  assert.ok(brief.capabilities.length >= 1);
  assert.ok(brief.recent_errors.some(e => e.includes('failed thing')));
  assert.ok(brief.risks.some(rr => rr.includes('concentration')));
  assert.match(brief.summary, /2 customers known/);
  assert.match(brief.summary, /capabilities/);
  dispose();
});

test('intel.brief reports an empty state with no failures', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pluto-intel-'));
  const store = new Store({ path: join(dir, 'pluto.db') });
  const state = new PlutoState(store);
  const company = state.repos.createCompany('Empty', 'no objectives yet');
  const intel = new CompanyIntelligence(state);
  const brief = intel.brief(company.id);
  assert.equal(brief.customers.length, 0);
  assert.equal(brief.capabilities.length, 0);
  assert.equal(brief.recent_errors.length, 0);
  assert.equal(brief.risks.length, 0);
  assert.match(brief.summary, /0 relations/);
  state.close();
  rmSync(dir, { recursive: true, force: true });
});
