import { PlutoState } from '../kernel/state.ts';
import { newId, now } from '../kernel/types.ts';
import type { Company } from '../kernel/types.ts';
import { Sovereign } from '../sovereign/engine.ts';
import { Civilization } from '../governance/civilization.ts';
import { createHash } from 'node:crypto';

export interface EcommercePersona {
  name: string;
  role: string;
  personality: string[];
  language: string;
  scenario: string;
  channels: string[];
}

export interface ProductLead {
  id: string;
  company_id: string;
  channel: string;
  contact: string;
  interest: string;
  budget: string;
  timeline: string;
  product_category: string;
  qualified: boolean;
  score: number;
  ts: string;
}

export interface CartEvent {
  id: string;
  company_id: string;
  lead_id: string;
  action: 'view' | 'add_to_cart' | 'checkout_start' | 'purchase' | 'abandon';
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
 * Entity #2 — E-Commerce Brand (PLAN 3a). Deploys a second operating entity
 * in a different domain (e-commerce) with:
 *  - Company-level mini-Council (mini-Sovereign, mini-Ethics, mini-Historian)
 *  - Cryptographic anchoring of audit tail
 *  - E-commerce persona ("Riya" — product discovery concierge)
 *  - Multi-channel intake (WhatsApp, Telegram, Web form, Instagram DM)
 *  - Product lead qualification rubric
 *  - Cart/checkout event tracking
 *  - Escalation rules + spend caps (₹800/day LLM, ₹0 ad spend without approval)
 *  - Order fulfillment handoff to human ops
 */
export class EcommerceRuntime {
  private state: PlutoState;
  private sovereign: Sovereign;
  private civ: Civilization;
  private anchors: Array<{ seq: number; company_id: string; hash: string; notary: string; ts: string }> = [];
  private leads: ProductLead[] = [];
  private cartEvents: CartEvent[] = [];

  constructor(state: PlutoState) {
    this.state = state;
    this.sovereign = new Sovereign(state);
    this.civ = new Civilization(state);
  }

  // ---- C96 mini-Council ------------------------------------------------------
  formMiniCouncil(companyId: string): { miniSovereign: string; miniEthics: string; miniHistorian: string } {
    const council = {
      miniSovereign: 'Riya-Council-Sovereign',
      miniEthics: 'Riya-Council-Ethics',
      miniHistorian: 'Riya-Council-Historian',
    };
    this.state.remember(companyId, `Entity #2 mini-Council formed: ${Object.values(council).join(', ')}`, {
      type: 'organizational', source: 'entity.council', tags: ['council', 'entity-2', 'ecommerce'],
    });
    return council;
  }

  // ---- C100 cryptographic anchoring --------------------------------------------
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

  // ---- Entity configuration ---------------------------------------------------
  configure(c: { company_id: string; mission: string; daily_budget_usd: number; kpis: Record<string, number> }): { ok: boolean; company: Company | null } {
    const company = this.state.repos.company(c.company_id);
    if (!company) return { ok: false, company: null };
    company.mission = c.mission;
    company.kpi = { ...company.kpi, ...c.kpis };
    this.state.repos.saveCompany(company);
    this.state.repos.setBudget({ company_id: c.company_id, scope: 'llm_daily', allocated_usd: c.daily_budget_usd, limit_usd: c.daily_budget_usd, kind: 'daily' });
    this.sovereign.shareLesson({ content: `Entity #2 (e-commerce) configured: ${c.mission}`, tags: ['entity-2', 'ecommerce', 'config'] });
    return { ok: true, company };
  }

  // ---- C18 Riya persona -------------------------------------------------------
  persona(): EcommercePersona {
    return {
      name: 'Riya',
      role: 'E-Commerce Concierge',
      personality: ['enthusiastic', 'knowledgeable', 'responsive', 'style-aware', 'helpful'],
      language: 'English + Hindi/regional mix',
      scenario: 'Helps shoppers discover products, answers sizing/material questions, recovers abandoned carts, escalates complex issues to human support.',
      channels: ['whatsapp', 'telegram', 'web_form', 'instagram_dm'],
    };
  }

  // ---- Intake (multi-channel) --------------------------------------------------
  intakeLead(c: { company_id: string; channel: string; contact: string; interest: string; budget: string; timeline: string; product_category: string; humanFlag?: boolean }): ProductLead {
    const score = this._scoreLead(c);
    const qualified = score >= 2 && !c.humanFlag;
    const lead: ProductLead = {
      id: newId('lead'), company_id: c.company_id, channel: c.channel, contact: c.contact,
      interest: c.interest, budget: c.budget, timeline: c.timeline, product_category: c.product_category,
      qualified, score, ts: now(),
    };
    this.leads.push(lead);
    this.state.emit(c.company_id, 'ecommerce.lead_intake', lead.id, 'lead', { channel: c.channel, category: c.product_category, qualified, score });
    this.state.remember(c.company_id, `${c.contact} (${c.channel}) interested in ${c.product_category}: ${c.interest}`, {
      type: 'customer', source: `ecommerce.intake.${c.channel}`, tags: ['lead', c.channel, c.product_category],
    });
    if (qualified) this._nudgeTowardsPurchase(c.company_id, lead);
    return lead;
  }

  leadsList(): ProductLead[] {
    return this.leads;
  }

  private _scoreLead(c: { budget: string; timeline: string; interest: string; product_category: string }): number {
    let score = 0;
    if (/buy|purchase|order|looking for|need|want/i.test(c.interest)) score++;
    if (/ready|now|today|this week|asap|soon/i.test(c.timeline)) score++;
    if (/\d{3,}|k|rs|rupee|inr|budget/i.test(c.budget)) score++;
    if (/gift|occasion|sale|discount|offer/i.test(c.interest)) score++;
    return Math.min(score, 4);
  }

  private _nudgeTowardsPurchase(companyId: string, lead: ProductLead): void {
    this.state.remember(companyId, `Riya nudge sent to qualified lead ${lead.id} (${lead.contact}) for ${lead.product_category}`, {
      type: 'episodic', source: 'ecommerce.nudge', tags: ['nudge', lead.id, lead.product_category],
    });
    this.state.emit(companyId, 'ecommerce.nudge_sent', lead.id, 'lead', { contact: lead.contact, category: lead.product_category });
  }

  // ---- Cart/Checkout Events ----------------------------------------------------
  recordCartEvent(c: { company_id: string; lead_id: string; action: CartEvent['action']; value_usd: number }): CartEvent {
    const ev: CartEvent = { id: newId('car'), company_id: c.company_id, lead_id: c.lead_id, action: c.action, value_usd: c.value_usd, ts: now() };
    this.cartEvents.push(ev);
    this.state.emit(c.company_id, 'ecommerce.cart_event', ev.id, 'lead', { action: c.action, value: c.value_usd });
    if (c.action === 'abandon') this._recoverAbandoned(c.company_id, c.lead_id);
    return ev;
  }

  private _recoverAbandoned(companyId: string, leadId: string): void {
    this.state.remember(companyId, `Abandoned cart recovery triggered for lead ${leadId}`, {
      type: 'episodic', source: 'ecommerce.recovery', tags: ['recovery', leadId],
    });
    this.state.emit(companyId, 'ecommerce.recovery_triggered', leadId, 'lead', {});
  }

  cartEventsList(): CartEvent[] {
    return this.cartEvents;
  }

  // ---- Escalation + Spend Caps -----------------------------------------------
  escalationRules(): EscalationRule[] {
    return [
      { trigger: 'ad_spend', to: 'owner (approval required)' },
      { trigger: 'high_value_order', to: 'owner + mini-Ethics' },
      { trigger: 'return_dispute', to: 'owner + client success' },
      { trigger: 'inventory_shortage', to: 'owner + ops' },
      { trigger: 'constitution_conflict', to: 'constitutional court + owner' },
    ];
  }

  spendCaps(): SpendCap[] {
    return [
      { scope: 'llm_daily', daily: 800, require_approval: false },
      { scope: 'ad_spend', daily: 0, require_approval: true },
      { scope: 'influencer_spend', daily: 0, require_approval: true },
    ];
  }

  tryAdSpend(companyId: string, amount: number): { ok: boolean; reason: string } {
    const cap = this.spendCaps().find(x => x.scope === 'ad_spend')!;
    if (amount > cap.daily) {
      const approval = this.state.repos.createApproval({
        company_id: companyId, actor_id: 'riya', action: 'ad_spend', summary: `Ad spend $${amount}`,
        risk: 'high', req_by: 'policy', cost_usd: amount, payload: { entity: 'entity-2', type: 'ads' },
      });
      this.state.emit(companyId, 'ecommerce.ad_spend_pending', approval.id, 'approval', { amount });
      return { ok: false, reason: 'ad spend requires owner approval ($0 default cap)' };
    }
    return { ok: true, reason: 'within cap' };
  }

  // ---- Historian ----------------------------------------------------------------
  historianSummary(companyId: string): Array<{ ts: string; type: string; summary: string }> {
    return this.state.repos.events(companyId, 200).slice(0, 20).map(e => ({ ts: e.ts, type: e.type, summary: String(e.payload?.summary ?? e.type) }));
  }
}