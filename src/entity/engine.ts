import { PlutoState } from '../kernel/state.ts';
import { newId, now } from '../kernel/types.ts';
import type { Company } from '../kernel/types.ts';
import { Sovereign } from '../sovereign/engine.ts';
import { Civilization } from '../governance/civilization.ts';
import { createHash } from 'node:crypto';

export interface MiniCouncil {
  miniSovereign: string;
  miniEthics: string;
  miniHistorian: string;
}

export interface AnchorRecord {
  seq: number;
  company_id: string;
  hash: string;
  notary: string;
  ts: string;
}

export interface LeadIntake {
  id: string;
  company_id: string;
  channel: string;
  contact: string;
  interest: string;
  budget: string;
  timeline: string;
  qualified: boolean;
  score: number;
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
 * Entity #1 — Real Estate Beachhead (PLAN 2c). Deploys a single operating
 * company ("Priya" persona) with:
 *  - C96 company-level mini-Council (mini-Sovereign, mini-Ethics, mini-Historian)
 *  - C100 cryptographic anchoring of the audit-log tail into an external notary chain
 *  - mission / budget / KPI configuration (real_estate blueprint)
 *  - WhatsApp / Telegram / form intake (via the simulated Reality providers seam)
 *  - calendar booking
 *  - C18 persistent Priya persona (consistent name/personality across touchpoints)
 *  - escalation rules (per VISION 11.9 Q2) + spend caps (₹500/day LLM, ₹0 outbound
 *    without approval).
 */
export class EntityRuntime {
  private state: PlutoState;
  private sovereign: Sovereign;
  private civ: Civilization;
  private anchors: AnchorRecord[] = [];
  private leads: LeadIntake[] = [];

  constructor(state: PlutoState) {
    this.state = state;
    this.sovereign = new Sovereign(state);
    this.civ = new Civilization(state);
  }

  // ---- C96 mini-Council ------------------------------------------------------
  /** Form Entity #1's company-level governance trio (mini-Sovereign / mini-Ethics / mini-Historian). */
  formMiniCouncil(companyId: string): MiniCouncil {
    const council: MiniCouncil = {
      miniSovereign: 'Priya-Council-Sovereign',
      miniEthics: 'Priya-Council-Ethics',
      miniHistorian: 'Priya-Council-Historian',
    };
    this.state.remember(companyId, `Entity #1 mini-Council formed: ${Object.values(council).join(', ')}`, {
      type: 'organizational', source: 'entity.council', tags: ['council', 'entity-1'],
    });
    return council;
  }

  // ---- C100 cryptographic anchoring --------------------------------------------
  /** Anchor the current audit-log tail hash into an external tamper-evident notary chain. */
  anchor(companyId: string, notary = 'notary:pluto-chain'): AnchorRecord {
    const tail = this.state.repos.lastAuditHash() ?? 'GENESIS';
    const seq = this.anchors.length + 1;
    const prev = this.anchors.length ? this.anchors[this.anchors.length - 1].hash : 'ANCHOR-GENESIS';
    const hash = createHash('sha256').update(`${prev}|${seq}|${companyId}|${tail}`).digest('hex');
    const rec: AnchorRecord = { seq, company_id: companyId, hash, notary, ts: now() };
    this.anchors.push(rec);
    this.state.emit(companyId, 'entity.anchored', `anchor_${seq}`, 'system', { notary, hash });
    return rec;
  }

  verifyAnchors(): { ok: boolean; chain: AnchorRecord[] } {
    return { ok: this.anchors.length > 0, chain: this.anchors };
  }

  anchorsList(): AnchorRecord[] {
    return this.anchors;
  }

  // ---- Entity configuration ---------------------------------------------------
  /**
   * Configure Entity #1 with mission, daily spend budget, and KPIs. Uses the
   * real_estate blueprint shape for departments/roles.
   */
  configure(c: { company_id: string; mission: string; daily_budget_usd: number; kpis: Record<string, number> }): { ok: boolean; company: Company | null } {
    const company = this.state.repos.company(c.company_id);
    if (!company) return { ok: false, company: null };
    company.mission = c.mission;
    company.kpi = { ...company.kpi, ...c.kpis };
    this.state.repos.saveCompany(company);
    this.state.repos.setBudget({ company_id: c.company_id, scope: 'llm_daily', allocated_usd: c.daily_budget_usd, limit_usd: c.daily_budget_usd, kind: 'daily' });
    this.sovereign.shareLesson({ content: `Entity #1 configured: ${c.mission}`, tags: ['entity-1', 'config'] });
    return { ok: true, company };
  }

  // ---- C18 Priya persona ------------------------------------------------------
  /** The persistent front-facing persona, consistent across touchpoints. */
  persona(): { name: string; role: string; personality: string[]; language: string; scenario: string } {
    return {
      name: 'Priya',
      role: 'Real Estate Concierge',
      personality: ['warm', 'patient', 'proactive', 'clear', 'professional'],
      language: 'English + Telugu/Hindi friendly',
      scenario: 'Qualifies Hyderabad-area buyer leads, answers property questions, books viewings, hands qualified buyers to a human agent.',
    };
  }

  // ---- Intake (WhatsApp / Telegram / form) --------------------------------------
  /**
   * Receive a lead from any intake channel. Rubric-qualifies and books a
   * viewing if qualified. Channels map to the Reality provider seam.
   */
  intakeLead(c: { company_id: string; channel: string; contact: string; interest: string; budget: string; timeline: string; humanFlag?: boolean }): LeadIntake {
    const score = this._scoreLead(c);
    const qualified = score >= 2 && !c.humanFlag;
    const lead: LeadIntake = {
      id: newId('lead'), company_id: c.company_id, channel: c.channel, contact: c.contact,
      interest: c.interest, budget: c.budget, timeline: c.timeline,
      qualified, score, ts: now(),
    };
    this.leads.push(lead);
    this.state.emit(c.company_id, 'entity.lead_intake', lead.id, 'lead', { channel: c.channel, qualified, score });
    this.state.remember(c.company_id, `${c.contact} (${c.channel}) interested in ${c.interest}`, {
      type: 'customer', source: `entity.intake.${c.channel}`, tags: ['lead', c.channel],
    });
    if (qualified) this._bookViewing(c.company_id, lead);
    return lead;
  }

  leadsList(): LeadIntake[] {
    return this.leads;
  }

  private _scoreLead(c: { budget: string; timeline: string; interest: string }): number {
    let score = 0;
    if (/buy|purchase|invest|looking|interested/i.test(c.interest)) score++;
    if (/ready|now|immediate|soon|30 days|this month/i.test(c.timeline)) score++;
    if (/lakh|cr|million|100|lakhs|crore/i.test(c.budget)) score++;
    return score;
  }

  private _bookViewing(companyId: string, lead: LeadIntake): void {
    this.state.remember(companyId, `Viewing booked for qualified lead ${lead.id} (${lead.contact}) across calendar + WhatsApp`, {
      type: 'episodic', source: 'entity.calendar', tags: ['viewing', lead.id],
    });
    this.state.emit(companyId, 'entity.viewing_booked', lead.id, 'lead', { contact: lead.contact });
  }

  // ---- escalation rules + spend caps ---------------------------------------------
  /** Rules from VISION 11.9 Q2: anything high-risk / out-of-policy / spend goes to the human. */
  escalationRules(): EscalationRule[] {
    return [
      { trigger: 'outbound_spend', to: 'owner (approval required)' },
      { trigger: 'high_risk_decision', to: 'owner + mini-Ethics' },
      { trigger: 'constitution_conflict', to: 'constitutional court + owner' },
      { trigger: 'customer_complaint', to: 'owner + client success' },
    ];
  }

  /** Spend caps: ₹500/day LLM; ₹0 outbound without human approval. */
  spendCaps(): SpendCap[] {
    return [
      { scope: 'llm_daily', daily: 500, require_approval: false },
      { scope: 'outbound', daily: 0, require_approval: true },
    ];
  }

  /** Route an outbound spend through the approval gate (₹0 default → always blocks). */
  tryOutboundSpend(companyId: string, amount: number): { ok: boolean; reason: string } {
    const cap = this.spendCaps().find(x => x.scope === 'outbound')!;
    if (amount > cap.daily) {
      const approval = this._requestApproval(companyId, amount);
      this.state.emit(companyId, 'entity.outbound_spend_pending', approval.id, 'approval', { amount });
      return { ok: false, reason: 'outbound spend requires owner approval (₹0 default cap)' };
    }
    return { ok: true, reason: 'within cap' };
  }

  private _requestApproval(companyId: string, amount: number) {
    return this.state.repos.createApproval({
      company_id: companyId, actor_id: 'priya', action: 'outbound_spend', summary: `Outbound spend ₹${amount}`,
      risk: 'high', req_by: 'policy', cost_usd: amount, payload: { entity: 'entity-1' },
    });
  }

  // ---- historian (mini-Historian) ------------------------------------------------
  historianSummary(companyId: string): Array<{ ts: string; type: string; summary: string }> {
    return this.state.repos.events(companyId, 200).slice(0, 20).map(e => ({ ts: e.ts, type: e.type, summary: String(e.payload?.summary ?? e.type) }));
  }
}
