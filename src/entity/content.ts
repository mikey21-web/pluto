import { PlutoState } from '../kernel/state.ts';
import { newId, now } from '../kernel/types.ts';
import type { Company } from '../kernel/types.ts';
import { Sovereign } from '../sovereign/engine.ts';
import { Civilization } from '../governance/civilization.ts';
import { createHash } from 'node:crypto';

export interface ContentPersona {
  name: string;
  role: string;
  personality: string[];
  language: string;
  scenario: string;
  channels: string[];
}

export interface ContentLead {
  id: string;
  company_id: string;
  channel: string;
  contact: string;
  interest: string;
  budget: string;
  timeline: string;
  content_type: string;
  qualified: boolean;
  score: number;
  ts: string;
}

export interface ContentEvent {
  id: string;
  company_id: string;
  lead_id: string;
  action: 'view' | 'subscribe' | 'engage' | 'sponsor_inquiry' | 'churn_risk';
  value_usd: number;
  ts: string;
}

export interface EscalationRule {
  trigger: string;
  to: string;
}

export interface SpendCap {
  scope: string;
  daily: number;
  require_approval: boolean;
}

/**
 * Entity #3 — Content Business (PLAN 3a). Third operating entity in a
 * different domain (content/media) with:
 *  - Company-level mini-Council
 *  - Cryptographic anchoring
 *  - Content persona ("Kavya" — audience growth strategist)
 *  - Multi-channel intake (YouTube comments, newsletter, Twitter DM, LinkedIn)
 *  - Content lead qualification (creator/sponsor/subscriber)
 *  - Engagement/sponsorship event tracking
 *  - Escalation rules + spend caps (₹600/day LLM, ₹0 production spend without approval)
 *  - Content calendar + distribution handoff
 */
export class ContentRuntime {
  private state: PlutoState;
  private sovereign: Sovereign;
  private civ: Civilization;
  private anchors: Array<{ seq: number; company_id: string; hash: string; notary: string; ts: string }> = [];
  private leads: ContentLead[] = [];
  private contentEvents: ContentEvent[] = [];

  constructor(state: PlutoState) {
    this.state = state;
    this.sovereign = new Sovereign(state);
    this.civ = new Civilization(state);
  }

  formMiniCouncil(companyId: string): { miniSovereign: string; miniEthics: string; miniHistorian: string } {
    const council = {
      miniSovereign: 'Kavya-Council-Sovereign',
      miniEthics: 'Kavya-Council-Ethics',
      miniHistorian: 'Kavya-Council-Historian',
    };
    this.state.remember(companyId, `Entity #3 mini-Council formed: ${Object.values(council).join(', ')}`, {
      type: 'organizational', source: 'entity.council', tags: ['council', 'entity-3', 'content'],
    });
    return council;
  }

  anchor(companyId: string, notary = 'notary:pluto-chain'): { seq: number; company_id: string; hash: string; notary: string; ts: string } {
    const tail = this.state.repos.lastAuditHash() ?? 'GENESIS';
    const seq = this.anchors.length + 1;
    const prev = this.anchors.length ? this.anchors[this.anchors.length - 1].hash : 'ANCHOR-GENESIS';
    const hash = createHash('sha256').update(`${prev}|${seq}|${companyId}|${tail}`).digest('hex');
    const rec = { seq, company_id: companyId, hash, notary, ts: now() };
    this.anchors.push(rec);
    this.state.emit(companyId, 'entity.anchored', `anchor_${seq}`, 'system', { notary, hash });
    return rec;
  }

  verifyAnchors(): { ok: boolean; chain: Array<{ seq: number; company_id: string; hash: string; notary: string; ts: string }> } {
    return { ok: this.anchors.length > 0, chain: this.anchors };
  }

  anchorsList(): Array<{ seq: number; company_id: string; hash: string; notary: string; ts: string }> {
    return this.anchors;
  }

  configure(c: { company_id: string; mission: string; daily_budget_usd: number; kpis: Record<string, number> }): { ok: boolean; company: Company | null } {
    const company = this.state.repos.company(c.company_id);
    if (!company) return { ok: false, company: null };
    company.mission = c.mission;
    company.kpi = { ...company.kpi, ...c.kpis };
    this.state.repos.saveCompany(company);
    this.state.repos.setBudget({ company_id: c.company_id, scope: 'llm_daily', allocated_usd: c.daily_budget_usd, limit_usd: c.daily_budget_usd, kind: 'daily' });
    this.sovereign.shareLesson({ content: `Entity #3 (content) configured: ${c.mission}`, tags: ['entity-3', 'content', 'config'] });
    return { ok: true, company };
  }

  persona(): ContentPersona {
    return {
      name: 'Kavya',
      role: 'Content Growth Strategist',
      personality: ['curious', 'data-driven', 'creative', 'community-focused', 'authentic'],
      language: 'English + Hinglish',
      scenario: 'Helps creators grow audiences, matches sponsors with creators, optimizes content calendar, escalates brand safety issues.',
      channels: ['youtube_comments', 'newsletter_reply', 'twitter_dm', 'linkedin_msg'],
    };
  }

  intakeLead(c: { company_id: string; channel: string; contact: string; interest: string; budget: string; timeline: string; content_type: string; humanFlag?: boolean }): ContentLead {
    const score = this._scoreLead(c);
    const qualified = score >= 2 && !c.humanFlag;
    const lead: ContentLead = {
      id: newId('lead'), company_id: c.company_id, channel: c.channel, contact: c.contact,
      interest: c.interest, budget: c.budget, timeline: c.timeline, content_type: c.content_type,
      qualified, score, ts: now(),
    };
    this.leads.push(lead);
    this.state.emit(c.company_id, 'content.lead_intake', lead.id, 'lead', { channel: c.channel, type: c.content_type, qualified, score });
    this.state.remember(c.company_id, `${c.contact} (${c.channel}) interested in ${c.content_type}: ${c.interest}`, {
      type: 'customer', source: `content.intake.${c.channel}`, tags: ['lead', c.channel, c.content_type],
    });
    if (qualified) this._matchOpportunity(c.company_id, lead);
    return lead;
  }

  leadsList(): ContentLead[] {
    return this.leads;
  }

  private _scoreLead(c: { budget: string; timeline: string; interest: string; content_type: string }): number {
    let score = 0;
    if (/sponsor|collab|partnership|ad|promote|brand deal/i.test(c.interest)) score += 2;
    if (/grow|subscriber|audience|reach|viral/i.test(c.interest)) score++;
    if (/ready|now|this month|asap|soon/i.test(c.timeline)) score++;
    if (/\d{3,}|k|rs|rupee|inr|budget|rate/i.test(c.budget)) score++;
    return Math.min(score, 4);
  }

  private _matchOpportunity(companyId: string, lead: ContentLead): void {
    this.state.remember(companyId, `Kavya matched qualified lead ${lead.id} (${lead.contact}) with ${lead.content_type} opportunity`, {
      type: 'episodic', source: 'content.match', tags: ['match', lead.id, lead.content_type],
    });
    this.state.emit(companyId, 'content.opportunity_matched', lead.id, 'lead', { contact: lead.contact, type: lead.content_type });
  }

  recordContentEvent(c: { company_id: string; lead_id: string; action: ContentEvent['action']; value_usd: number }): ContentEvent {
    const ev: ContentEvent = { id: newId('con'), company_id: c.company_id, lead_id: c.lead_id, action: c.action, value_usd: c.value_usd, ts: now() };
    this.contentEvents.push(ev);
    this.state.emit(c.company_id, 'content.event', ev.id, 'lead', { action: c.action, value: c.value_usd });
    return ev;
  }

  contentEventsList(): ContentEvent[] {
    return this.contentEvents;
  }

  escalationRules(): EscalationRule[] {
    return [
      { trigger: 'production_spend', to: 'owner (approval required)' },
      { trigger: 'brand_safety', to: 'owner + mini-Ethics' },
      { trigger: 'creator_dispute', to: 'owner + client success' },
      { trigger: 'copyright_claim', to: 'owner + legal' },
      { trigger: 'constitution_conflict', to: 'constitutional court + owner' },
    ];
  }

  spendCaps(): SpendCap[] {
    return [
      { scope: 'llm_daily', daily: 600, require_approval: false },
      { scope: 'production_spend', daily: 0, require_approval: true },
      { scope: 'paid_promotion', daily: 0, require_approval: true },
    ];
  }

  tryProductionSpend(companyId: string, amount: number): { ok: boolean; reason: string } {
    const cap = this.spendCaps().find(x => x.scope === 'production_spend')!;
    if (amount > cap.daily) {
      const approval = this.state.repos.createApproval({
        company_id: companyId, actor_id: 'kavya', action: 'production_spend', summary: `Production spend $${amount}`,
        risk: 'high', req_by: 'policy', cost_usd: amount, payload: { entity: 'entity-3', type: 'production' },
      });
      this.state.emit(companyId, 'content.production_spend_pending', approval.id, 'approval', { amount });
      return { ok: false, reason: 'production spend requires owner approval ($0 default cap)' };
    }
    return { ok: true, reason: 'within cap' };
  }

  historianSummary(companyId: string): Array<{ ts: string; type: string; summary: string }> {
    return this.state.repos.events(companyId, 200).slice(0, 20).map(e => ({ ts: e.ts, type: e.type, summary: String(e.payload?.summary ?? e.type) }));
  }
}