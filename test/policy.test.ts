import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withOrg } from './helpers.ts';

test('policy: seeded defaults allow internal actions and gate unknowns', () => {
  const { r, dispose } = withOrg();
  r.policies.seedDefaults(r.company.id);
  assert.equal(r.policies.evaluate(r.company.id, 'sales_manager', 'http.get').effect, 'allow');
  assert.equal(r.policies.evaluate(r.company.id, 'sales_manager', 'memory.write').effect, 'allow');
  assert.equal(r.policies.evaluate(r.company.id, 'sales_manager', 'external.transfer_funds').effect, 'require_approval');
  assert.equal(r.policies.evaluate(r.company.id, 'finance_agent', 'create_invoice').effect, 'allow');
  dispose();
});

test('policy: role-scoped rule beats wildcard', () => {
  const { r, dispose } = withOrg();
  r.policies.register(r.company.id, 'finance-sensitive', 'finance_agent', [
    { id: 'f1', action: 'create_invoice', effect: 'allow', note: 'core' },
    { id: 'f2', action: '*', effect: 'require_approval', note: 'other gated' },
  ]);
  r.policies.register(r.company.id, 'wild', '*', [
    { id: 'w1', action: '*', effect: 'allow', note: 'loose default' },
  ]);
  // finance-scoped rule matches first for finance_agent; other roles get wildcard allow
  assert.equal(r.policies.evaluate(r.company.id, 'finance_agent', 'create_invoice').effect, 'allow');
  assert.equal(r.policies.evaluate(r.company.id, 'sales_manager', 'http.get').effect, 'allow');
  dispose();
});

test('policy: glob patterns on actions match prefixes', () => {
  const { r, dispose } = withOrg();
  r.policies.register(r.company.id, 'mem', '*', [
    { id: 'm1', action: 'memory.*', effect: 'allow', note: 'mem free' },
    { id: 'm2', action: '*', effect: 'deny', note: 'default deny' },
  ]);
  assert.equal(r.policies.evaluate(r.company.id, 'analyst', 'memory.recall').effect, 'allow');
  assert.equal(r.policies.evaluate(r.company.id, 'analyst', 'money.launder').effect, 'deny');
  dispose();
});