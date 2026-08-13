import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRuntime } from './helpers.ts';

test('human.contractor: post + hire + close ticket', () => {
  const { r, dispose } = makeRuntime();
  try {
    const ticket = r.human.postTicket({ company_id: r.company.id, platform: 'upwork', title: 'Video editor for ads', description: 'Edit 5 short reels', budget_usd: 150 });
    assert.ok(ticket.id.startsWith('ct_'));
    assert.equal(ticket.status, 'open');

    const open = r.human.tickets(r.company.id, 'open');
    assert.ok(open.length >= 1);

    const hired = r.human.hireContractor(ticket.id, { name: 'Rahul D.', id: 'upwork_rahul_01' });
    assert.ok(hired !== null);

    const closed = r.human.closeTicket(ticket.id, 'Delivered 5 reels, approved');
    assert.ok(closed);
  } finally { dispose(); }
});

test('human.owner_model: observe + synthesize model', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.human.observeOwner({ company_id: r.company.id, observation: 'Owner replied in 2 minutes, prefers quick decisions', signals: { risk_tolerance: 'high', decision_speed: 'fast', communication_style: 'terse' } });
    r.human.observeOwner({ company_id: r.company.id, observation: 'Owner asked for detailed breakdown before approving spend', signals: { risk_tolerance: 'medium', communication_style: 'detailed' } });
    r.human.observeOwner({ company_id: r.company.id, observation: 'Owner focused on real estate and agency growth', signals: { focus_areas: ['real_estate', 'agency'] } });

    const model = r.human.ownerModel(r.company.id);
    assert.ok(model.observations.length >= 2);
    assert.ok(['low', 'medium', 'high'].includes(model.risk_tolerance));
    assert.ok(['terse', 'detailed', 'visual'].includes(model.communication_style));
  } finally { dispose(); }
});

test('human.customer_memory: remember + recall across time', () => {
  const { r, dispose } = makeRuntime();
  try {
    const cid = 'cust_ravi_001';
    r.human.rememberCustomer({ customer_id: cid, company_id: r.company.id, name: 'Ravi Sharma', fact: 'Interested in 3BHK in Banjara Hills, budget ₹80L', sentiment: 'positive' });
    r.human.rememberCustomer({ customer_id: cid, company_id: r.company.id, name: 'Ravi Sharma', fact: 'Wife prefers Jubilee Hills, mentioned daughter in school nearby', sentiment: 'positive' });
    r.human.rememberCustomer({ customer_id: cid, company_id: r.company.id, name: 'Ravi Sharma', fact: 'Lost deal in 2024 — budget fell short. Re-engaged 2026.', sentiment: 'neutral' });

    const memory = r.human.recallCustomer(r.company.id, cid);
    assert.ok(memory !== null);
    assert.equal(memory!.name, 'Ravi Sharma');
    assert.ok(memory!.facts.length >= 3);
    assert.ok(memory!.facts.some(f => f.fact.includes('Banjara Hills')));
    assert.ok(memory!.facts.some(f => f.fact.includes('daughter')));

    const all = r.human.customers(r.company.id);
    assert.ok(all.some(c => c.customer_id === cid));
  } finally { dispose(); }
});

test('human.status: aggregates counters', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.human.postTicket({ company_id: r.company.id, platform: 'fiverr', title: 'Logo design', description: 'Brand logo', budget_usd: 50 });
    r.human.observeOwner({ company_id: r.company.id, observation: 'Prefers WhatsApp updates' });
    r.human.rememberCustomer({ customer_id: 'c1', company_id: r.company.id, name: 'Test', fact: 'Likes quick responses' });

    const s = r.human.status(r.company.id);
    assert.ok(s.open_tickets >= 1);
    assert.ok(s.owner_observations >= 1);
    assert.ok(s.customers_remembered >= 1);
  } finally { dispose(); }
});
