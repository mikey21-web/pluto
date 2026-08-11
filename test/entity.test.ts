import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRuntime } from './helpers.ts';

test('entity forms mini-Council (mini-Sovereign/Ethics/Historian)', () => {
  const { r, dispose } = makeRuntime();
  try {
    const council = r.entity.formMiniCouncil(r.company.id);
    assert.equal(council.miniSovereign, 'Priya-Council-Sovereign');
    assert.equal(council.miniEthics, 'Priya-Council-Ethics');
    assert.equal(council.miniHistorian, 'Priya-Council-Historian');
  } finally { dispose(); }
});

test('entity anchors audit tail cryptographically to a notary chain and lists anchors', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.civ.audit({ company_id: r.company.id, actor: 'sovereign', action: 'test', detail: 'x' });
    const a1 = r.entity.anchor(r.company.id);
    const a2 = r.entity.anchor(r.company.id);
    assert.equal(a1.hash.length, 64);
    assert.equal(a2.seq, 2);
    assert.equal(a1.hash !== a2.hash, true);
    const ver = r.entity.verifyAnchors();
    assert.equal(ver.ok, true);
    assert.equal(r.entity.anchorsList().length, 2);
  } finally { dispose(); }
});

test('entity configures mission, KPI and daily LLM spend budget', () => {
  const { r, dispose } = makeRuntime();
  try {
    const res = r.entity.configure({ company_id: r.company.id, mission: 'Qualify Hyderabad buyer leads for Priya Realty', daily_budget_usd: 6, kpis: { qualified_leads: 10, viewings: 5 } });
    assert.equal(res.ok, true);
    const company = r.state.repos.company(r.company.id)!;
    assert.match(company.mission, /Hyderabad/);
    assert.equal(company.kpi.qualified_leads, 10);
    const budgets = r.state.repos.budgets(r.company.id);
    assert.ok(budgets.some(b => b.scope === 'llm_daily' && b.limit_usd === 6));
  } finally { dispose(); }
});

test('Priya persona is consistent (name, role, personality, scenario)', () => {
  const { r, dispose } = makeRuntime();
  try {
    const p = r.entity.persona();
    assert.equal(p.name, 'Priya');
    assert.match(p.scenario, /Hyderabad/);
    assert.ok(Array.isArray(p.personality) && p.personality.includes('warm'));
  } finally { dispose(); }
});

test('intake qualifies a strong lead and books a viewing; weak lead is not qualified', () => {
  const { r, dispose } = makeRuntime();
  try {
    const strong = r.entity.intakeLead({ company_id: r.company.id, channel: 'whatsapp', contact: 'Ravi', interest: 'looking to buy a 2BHK', budget: '80 lakhs', timeline: 'ready now' });
    assert.equal(strong.qualified, true);
    assert.ok(strong.score >= 2);
    const weak = r.entity.intakeLead({ company_id: r.company.id, channel: 'telegram', contact: 'Sara', interest: 'just browsing', budget: 'unknown', timeline: 'maybe later' });
    assert.equal(weak.qualified, false);
    assert.equal(r.entity.leadsList().length, 2);
  } finally { dispose(); }
});

test('escalation + spend caps: outbound spend over ₹0 requires owner approval', () => {
  const { r, dispose } = makeRuntime();
  try {
    const rules = r.entity.escalationRules();
    assert.ok(rules.some(x => x.trigger === 'outbound_spend'));
    assert.ok(rules.some(x => x.trigger === 'constitution_conflict'));
    const caps = r.entity.spendCaps();
    assert.equal(caps.find(x => x.scope === 'outbound')!.daily, 0);
    const blocked = r.entity.tryOutboundSpend(r.company.id, 100);
    assert.equal(blocked.ok, false);
    assert.match(blocked.reason, /approval/);
    const pending = r.state.repos.approvals(r.company.id, 'pending');
    assert.ok(pending.some(p => p.action === 'outbound_spend'));
  } finally { dispose(); }
});

test('mini-Historian surfaces recent events as summaries', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.state.emit(r.company.id, 'entity.lead_intake', 'lead_1', 'lead', { summary: 'new lead' });
    const hist = r.entity.historianSummary(r.company.id);
    assert.ok(Array.isArray(hist));
    assert.ok(hist.some(h => typeof h.type === 'string'));
  } finally { dispose(); }
});
