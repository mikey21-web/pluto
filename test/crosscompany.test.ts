import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRuntime } from './helpers.ts';

test('cross.descendant: declare + list', () => {
  const { r, dispose } = makeRuntime();
  try {
    const child = r.sovereign.spawnCompany({ name: 'ChildCo', mission: 'derived mission' });
    const decl = r.cross.declareDescendant({
      parent_company_id: r.company.id, child_company_id: child.id,
      resource_allocation_pct: 25, capabilities: ['sales'], budgets: { llm_daily: 100 },
    });
    assert.ok(decl.id.startsWith('des_'));
    assert.equal(decl.inheritance.resource_allocation_pct, 25);
    const descs = r.cross.descendantsOf(r.company.id);
    assert.ok(descs.length >= 1);
  } finally { dispose(); }
});

test('cross.cognits: account init + balance + transfer', () => {
  const { r, dispose } = makeRuntime();
  try {
    const acc = r.cross.cognitAccount(r.company.id);
    assert.equal(acc.balance, 1000);
    assert.equal(r.cross.cognitBalance(r.company.id), 1000);
    const tf = r.cross.transferCognits({ from_company: r.company.id, to_company: 'other_co', amount: 200, reason: 'payment' });
    assert.equal(tf.status, 'rejected');
  } finally { dispose(); }
});

test('cross.message: send between companies', () => {
  const { r, dispose } = makeRuntime();
  try {
    const child = r.sovereign.spawnCompany({ name: 'MsgTarget', mission: 'target' });
    const msg = r.cross.sendMessage({ from_company: r.company.id, to_company: child.id, contract: 'request', payload: { action: 'share_data', data: 'leads' } });
    assert.equal(msg.from_company, r.company.id);
    assert.equal(msg.to_company, child.id);
    assert.equal(msg.contract, 'request');
    assert.equal(msg.status, 'sent');
  } finally { dispose(); }
});

test('cross.status aggregates all subsystems', () => {
  const { r, dispose } = makeRuntime();
  try {
    const st = r.cross.status();
    assert.ok(typeof st.reputation_subjects === 'number');
    assert.ok(typeof st.genes === 'number');
    assert.ok(typeof st.descendants === 'number');
    assert.ok(typeof st.cognit_accounts === 'number');
  } finally { dispose(); }
});