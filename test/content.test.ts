import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRuntime } from './helpers.ts';

test('content forms mini-Council', () => {
  const { r, dispose } = makeRuntime();
  try {
    const council = r.content.formMiniCouncil(r.company.id);
    assert.equal(council.miniSovereign, 'Kavya-Council-Sovereign');
    assert.equal(council.miniEthics, 'Kavya-Council-Ethics');
    assert.equal(council.miniHistorian, 'Kavya-Council-Historian');
  } finally { dispose(); }
});

test('content anchors audit tail', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.civ.audit({ company_id: r.company.id, actor: 'sovereign', action: 'test', detail: 'x' });
    const a1 = r.content.anchor(r.company.id);
    const a2 = r.content.anchor(r.company.id);
    assert.equal(a1.hash.length, 64);
    assert.equal(a2.seq, 2);
    assert.ok(r.content.verifyAnchors().ok);
  } finally { dispose(); }
});

test('content configures mission, KPI, budget', () => {
  const { r, dispose } = makeRuntime();
  try {
    const res = r.content.configure({ company_id: r.company.id, mission: 'Build creator economy platform', daily_budget_usd: 8, kpis: { creators: 100, sponsors: 20, revenue: 50000 } });
    assert.equal(res.ok, true);
    const company = r.state.repos.company(r.company.id)!;
    assert.match(company.mission, /creator economy/i);
    assert.equal(company.kpi.creators, 100);
  } finally { dispose(); }
});

test('Kavya persona consistent across channels', () => {
  const { r, dispose } = makeRuntime();
  try {
    const p = r.content.persona();
    assert.equal(p.name, 'Kavya');
    assert.match(p.scenario, /creators|sponsors|calendar/i);
    assert.ok(p.channels.includes('youtube_comments') && p.channels.includes('linkedin_msg'));
  } finally { dispose(); }
});

test('content intake qualifies creator/sponsor leads', () => {
  const { r, dispose } = makeRuntime();
  try {
    const sponsor = r.content.intakeLead({ company_id: r.company.id, channel: 'linkedin_msg', contact: 'BrandCo', interest: 'sponsor a video for our new product', budget: 'Rs 50000', timeline: 'this month', content_type: 'sponsored_video' });
    assert.equal(sponsor.qualified, true);
    assert.ok(sponsor.score >= 2);

    const weak = r.content.intakeLead({ company_id: r.company.id, channel: 'twitter_dm', contact: 'User', interest: 'hello', budget: 'unknown', timeline: 'never', content_type: 'general' });
    assert.equal(weak.qualified, false);
    assert.equal(r.content.leadsList().length, 2);
  } finally { dispose(); }
});

test('content events: view/subscribe/engage/sponsor_inquiry', () => {
  const { r, dispose } = makeRuntime();
  try {
    const lead = r.content.intakeLead({ company_id: r.company.id, channel: 'newsletter_reply', contact: 'Creator', interest: 'grow channel', budget: '0', timeline: 'asap', content_type: 'growth' });
    r.content.recordContentEvent({ company_id: r.company.id, lead_id: lead.id, action: 'view', value_usd: 0 });
    r.content.recordContentEvent({ company_id: r.company.id, lead_id: lead.id, action: 'subscribe', value_usd: 0 });
    const sponsor = r.content.recordContentEvent({ company_id: r.company.id, lead_id: lead.id, action: 'sponsor_inquiry', value_usd: 1000 });
    assert.equal(sponsor.action, 'sponsor_inquiry');
    assert.equal(r.content.contentEventsList().length, 3);
  } finally { dispose(); }
});

test('escalation + spend caps: production spend requires approval', () => {
  const { r, dispose } = makeRuntime();
  try {
    const rules = r.content.escalationRules();
    assert.ok(rules.some(x => x.trigger === 'production_spend'));
    const caps = r.content.spendCaps();
    assert.equal(caps.find(x => x.scope === 'production_spend')!.daily, 0);
    const blocked = r.content.tryProductionSpend(r.company.id, 2000);
    assert.equal(blocked.ok, false);
    assert.match(blocked.reason, /approval/);
    const pending = r.state.repos.approvals(r.company.id, 'pending');
    assert.ok(pending.some(p => p.action === 'production_spend'));
  } finally { dispose(); }
});