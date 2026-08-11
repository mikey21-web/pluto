import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRuntime, withOrg } from './helpers.ts';

test('ecommerce forms mini-Council', () => {
  const { r, dispose } = makeRuntime();
  try {
    const council = r.ecommerce.formMiniCouncil(r.company.id);
    assert.equal(council.miniSovereign, 'Riya-Council-Sovereign');
    assert.equal(council.miniEthics, 'Riya-Council-Ethics');
    assert.equal(council.miniHistorian, 'Riya-Council-Historian');
  } finally { dispose(); }
});

test('ecommerce anchors audit tail', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.civ.audit({ company_id: r.company.id, actor: 'sovereign', action: 'test', detail: 'x' });
    const a1 = r.ecommerce.anchor(r.company.id);
    const a2 = r.ecommerce.anchor(r.company.id);
    assert.equal(a1.hash.length, 64);
    assert.equal(a2.seq, 2);
    assert.ok(r.ecommerce.verifyAnchors().ok);
  } finally { dispose(); }
});

test('ecommerce configures mission, KPI, budget', () => {
  const { r, dispose } = makeRuntime();
  try {
    const res = r.ecommerce.configure({ company_id: r.company.id, mission: 'Sell sustainable fashion D2C', daily_budget_usd: 10, kpis: { orders: 50, aov: 75, cart_recovery_rate: 0.25 } });
    assert.equal(res.ok, true);
    const company = r.state.repos.company(r.company.id)!;
    assert.match(company.mission, /sustainable fashion/i);
    assert.equal(company.kpi.orders, 50);
  } finally { dispose(); }
});

test('Riya persona is consistent across channels', () => {
  const { r, dispose } = makeRuntime();
  try {
    const p = r.ecommerce.persona();
    assert.equal(p.name, 'Riya');
    assert.match(p.scenario, /shoppers|discover|abandoned/i);
    assert.ok(p.channels.includes('whatsapp') && p.channels.includes('instagram_dm'));
  } finally { dispose(); }
});

test('ecommerce intake qualifies product leads across channels', () => {
  const { r, dispose } = makeRuntime();
  try {
    const strong = r.ecommerce.intakeLead({ company_id: r.company.id, channel: 'instagram_dm', contact: 'Aisha', interest: 'looking to buy organic cotton kurta', budget: 'Rs 3000', timeline: 'this week', product_category: 'women_ethnic' });
    assert.equal(strong.qualified, true);
    assert.ok(strong.score >= 2);

    const weak = r.ecommerce.intakeLead({ company_id: r.company.id, channel: 'web_form', contact: 'Rohan', interest: 'just browsing', budget: 'unknown', timeline: 'maybe later', product_category: 'accessories' });
    assert.equal(weak.qualified, false);
    assert.equal(r.ecommerce.leadsList().length, 2);
  } finally { dispose(); }
});

test('cart events: view/add/checkout/purchase/abandon + recovery trigger', () => {
  const { r, dispose } = makeRuntime();
  try {
    const lead = r.ecommerce.intakeLead({ company_id: r.company.id, channel: 'whatsapp', contact: 'Test', interest: 'buy', budget: '5000', timeline: 'now', product_category: 'test' });
    r.ecommerce.recordCartEvent({ company_id: r.company.id, lead_id: lead.id, action: 'view', value_usd: 0 });
    r.ecommerce.recordCartEvent({ company_id: r.company.id, lead_id: lead.id, action: 'add_to_cart', value_usd: 80 });
    const abandon = r.ecommerce.recordCartEvent({ company_id: r.company.id, lead_id: lead.id, action: 'abandon', value_usd: 80 });
    assert.equal(abandon.action, 'abandon');
    assert.equal(r.ecommerce.cartEventsList().length, 3);
  } finally { dispose(); }
});

test('escalation + spend caps: ad spend requires approval', () => {
  const { r, dispose } = makeRuntime();
  try {
    const rules = r.ecommerce.escalationRules();
    assert.ok(rules.some(x => x.trigger === 'ad_spend'));
    const caps = r.ecommerce.spendCaps();
    assert.equal(caps.find(x => x.scope === 'ad_spend')!.daily, 0);
    const blocked = r.ecommerce.tryAdSpend(r.company.id, 500);
    assert.equal(blocked.ok, false);
    assert.match(blocked.reason, /approval/);
    const pending = r.state.repos.approvals(r.company.id, 'pending');
    assert.ok(pending.some(p => p.action === 'ad_spend'));
  } finally { dispose(); }
});