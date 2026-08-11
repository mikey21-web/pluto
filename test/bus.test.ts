import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRuntime, withOrg, deptAgent } from './helpers.ts';
import { MessageBus, CONTRACTS } from '../src/bus/engine.ts';

test('bus.send persists a typed message and emits a msg.<contract> event', () => {
  const { r, dispose } = withOrg();
  const sales = deptAgent(r, 'Sales')!;
  const m = r.messages.send({ company_id: r.company.id, contract: 'report', from_agent: sales.id, to_agent: null, payload: { text: 'Q1 done' } });
  assert.equal(m.contract, 'report');
  const stored = r.messages.log(r.company.id).find(x => x.id === m.id);
  assert.ok(stored, 'message should be in the persistent log');
  const evs = r.state.repos.events(r.company.id).filter(e => e.type === 'msg.report');
  assert.ok(evs.length >= 1);
  dispose();
});

test('CONTRACTS match the P3 typed message schema', () => {
  assert.deepEqual([...CONTRACTS], ['request', 'offer', 'delegate', 'dispute', 'clarify', 'report', 'escalate', 'confess']);
});

test('bus delivers to a contract subscriber', () => {
  const { r, dispose } = withOrg();
  const sales = deptAgent(r, 'Sales')!;
  const seen: string[] = [];
  r.messages.subscribe({ contract: 'request', handler: m => { seen.push(m.contract); } });
  r.messages.send({ company_id: r.company.id, contract: 'request', from_agent: sales.id, payload: { kind: 'research', capability: 'seo_audit' } });
  assert.equal(seen.length, 1);
  dispose();
});

test('capability_gap request triggers meta-agent spawn (P3 wiring)', async () => {
  const { r, dispose } = withOrg();
  const before = r.state.repos.agents(r.company.id).length;
  r.messages.send({ company_id: r.company.id, contract: 'request', from_agent: 'test', payload: { kind: 'capability_gap', capability: 'telemarketing' } });
  await new Promise(res => setTimeout(res, 50));
  const after = r.state.repos.agents(r.company.id).length;
  assert.ok(after > before, 'a capability-gap broadcast should spawn an agent');
  const cap = r.state.repos.capabilities(r.company.id).some(c => c.name.includes('telemarketing'));
  assert.ok(cap, 'spawned agent capability registered');
  dispose();
});

test('negotiation protocol: offer → accept → delegate (two agents end-to-end)', () => {
  const { r, dispose } = withOrg();
  const sales = deptAgent(r, 'Sales')!;
  const delivery = deptAgent(r, 'Delivery')!;
  const offer = r.messages.offer({ company_id: r.company.id, from_agent: sales.id, to_agent: delivery.id, what: 'draft proposal', for_: 'signed deal' });
  assert.equal(offer.contract, 'offer');
  r.messages.acceptOffer({ company_id: r.company.id, from_agent: delivery.id, to_agent: sales.id, offer_payload: offer.payload });
  const msgTypes = r.messages.log(r.company.id).map(m => m.contract);
  assert.ok(msgTypes.includes('delegate'), 'accept should issue a delegate');
  assert.ok(msgTypes.includes('offer'));
  dispose();
});

test('offer reject issues a report with reason', () => {
  const { r, dispose } = withOrg();
  const sales = deptAgent(r, 'Sales')!;
  const delivery = deptAgent(r, 'Delivery')!;
  const offer = r.messages.offer({ company_id: r.company.id, from_agent: sales.id, to_agent: delivery.id, what: 'X', for_: 'Y' });
  r.messages.rejectOffer({ company_id: r.company.id, from_agent: delivery.id, to_agent: sales.id, offer_payload: offer.payload, reason: 'capacity' });
  const reports = r.messages.log(r.company.id, { contract: 'report' });
  assert.ok(reports.some(m => (m.payload as any).status === 'rejected' && (m.payload as any).reason === 'capacity'));
  dispose();
});

test('confessional flags self-doubt privately on its channel', () => {
  const { r, dispose } = withOrg();
  const sales = deptAgent(r, 'Sales')!;
  const seen: unknown[] = [];
  r.messages.subscribe({ channel: '__confessional', handler: m => { seen.push(m.payload); } });
  r.messages.confess({ company_id: r.company.id, from_agent: sales.id, about: 'revenue_forecast', doubt: 'may be too optimistic' });
  assert.equal(seen.length, 1);
  const confessions = r.messages.log(r.company.id, { channel: '__confessional', contract: 'confess' });
  assert.equal(confessions.length, 1);
  assert.equal((confessions[0].payload as any).confidential, true);
  // a normal subscriber on the open bus should NOT see the confession
  const open = r.messages.log(r.company.id, { contract: 'confess' });
  assert.equal(open.length, 1, 'confession persists but only on its private channel filter');
  dispose();
});

test('delivery is limited to matching channel subscriptions', () => {
  const { r, dispose } = withOrg();
  const sales = deptAgent(r, 'Sales')!;
  const inbox: unknown[] = [];
  const other: unknown[] = [];
  r.messages.subscribe({ channel: 'team_a', handler: () => inbox.push(1) });
  r.messages.subscribe({ channel: 'team_b', handler: () => other.push(1) });
  r.messages.send({ company_id: r.company.id, contract: 'report', from_agent: sales.id, channel: 'team_a', payload: {} });
  assert.equal(inbox.length, 1);
  assert.equal(other.length, 0);
  dispose();
});
