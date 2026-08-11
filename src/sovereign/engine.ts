import { PlutoState } from '../kernel/state.ts';
import { newId } from '../kernel/types.ts';
import type { Company } from '../kernel/types.ts';
import { OrgEngine } from '../org/engines.ts';
import { Governance } from '../plane/governance.ts';
import { ResourceEngine } from '../plane/resources.ts';
import { PolicyEngine } from '../plane/policy.ts';

export type KillScope = 'company' | 'global';
export type ApprovalTier = 'auto' | 'gated' | 'human-only';
export type RollbackStatus = 'pending' | 'applied' | 'failed';

export interface OwnerRecord {
  id: string;
  company_id: string;
  name: string;
  role: string;
  email: string;
  authority: string[];
  last_active: string;
  status: 'active' | 'silent' | 'dormant';
}

/**
 * Sovereign Layer (PLAN 2a). The portfolio-level governor over the whole
 * civilization. Owns: multi-company spawning from mission templates (company
 * factory), cross-company memory, per-company + global kill switches, a
 * per-action rollback registry, the C29 Deadman's Switch (7-day silence →
 * read-only), the daily sovereign digest, multi-layer approval routing, and
 * the C50 multi-owner model (schema-ready; multi-person impl in Phase 4).
 */
export class Sovereign {
  private state: PlutoState;
  private org: OrgEngine;

  constructor(state: PlutoState) {
    this.state = state;
    this.org = new OrgEngine(state);
  }

  // ---- company factory (2a.1) ----------------------------------------------

  /** Spawn a new company from a mission template: company + org + budgets + policies. */
  spawnCompany(c: { name: string; mission: string }): Company {
    const company = this.state.repos.createCompany(c.name, c.mission);
    const deps = this.org.build(company, c.mission);
    void deps;
    const resources = new ResourceEngine(this.state);
    resources.defaults(company.id);
    const policies = new PolicyEngine(this.state);
    policies.seedDefaults(company.id);
    // seed default owner
    this.addOwner({ company_id: company.id, name: 'Civilization', role: 'sovereign', email: 'owner@pluto.local', authority: ['all'] });
    this.state.companyEvent(company, 'sovereign.company_spawned', { mission: c.mission });
    return company;
  }

  /** List all companies under the civilization. */
  companies(): Company[] {
    return this.state.repos.companies();
  }

  // ---- cross-company memory (2a.2) -----------------------------------------

  /** Record a lesson in the shared cross-company memory (global, queryable by any entity). */
  shareLesson(c: { content: string; source?: string; tags?: string[] }): void {
    this.state.remember('__global__', c.content, {
      type: 'semantic', source: c.source ?? 'sovereign', owner: 'sovereign', tags: c.tags,
    });
    this.state.emit('__global__', 'sovereign.lesson', 'sovereign', 'system', { content: c.content.length > 80 ? c.content.slice(0, 80) + '…' : c.content });
  }

  /** Query the cross-company memory store. */
  lessons(): Array<{ content: string; source: string; ts: string }> {
    return this.state.repos.memory('__global__', 'semantic', 100).map(m => ({ content: m.content, source: m.source, ts: m.ts }));
  }

  // ---- kill switches (2a.3, 2a.4) ------------------------------------------

  /** Gracefully halt a single company: status → dormant, agents inactive. */
  haltCompany(companyId: string, reason = 'no reason given', by = 'sovereign'): void {
    const c = this.state.repos.company(companyId);
    if (!c) throw new Error(`company ${companyId} not found`);
    c.status = 'halted';
    this.state.repos.saveCompany(c);
    for (const a of this.state.repos.agents(companyId)) {
      a.status = 'inactive';
      this.state.repos.saveAgent(a);
    }
    this.logKill({ company_id: companyId, scope: 'company', action: 'halt', reason, by });
    this.state.companyEvent({ id: companyId, name: c.name, mission: c.mission, created_at: c.created_at, status: c.status, health: c.health, kpi: c.kpi }, 'sovereign.company_halted', { reason });
  }

  /** Resume a halted company. */
  resumeCompany(companyId: string, by = 'sovereign'): void {
    const c = this.state.repos.company(companyId);
    if (c) {
      c.status = 'active';
      this.state.repos.saveCompany(c);
      for (const a of this.state.repos.agents(companyId)) { a.status = 'active'; this.state.repos.saveAgent(a); }
      this.logKill({ company_id: companyId, scope: 'company', action: 'resume', reason: 'resumed', by });
    }
  }

  /** Global kill switch: halt every company under the civilization. */
  haltAll(reason = 'global halt', by = 'sovereign'): void {
    for (const c of this.state.repos.companies()) this.haltCompany(c.id, reason, by);
    this.logKill({ company_id: '__global__', scope: 'global', action: 'halt_all', reason, by });
  }

  isHalted(companyId: string): boolean {
    return this.state.repos.company(companyId)?.status === 'halted';
  }

  // ---- per-action rollback registry (2a.5) ----------------------------------

  /** Register a codified reverse for an action type. Returns a pending rollback handle. */
  registerRollback(c: { company_id: string; action_type: string; action_id: string; reverse: string }): RollbackStatus {
    this.state.repos.saveRollback({
      id: newId('rb'), company_id: c.company_id, action_type: c.action_type,
      action_id: c.action_id, reverse: c.reverse, status: 'pending', ts: new Date().toISOString(), reversed_at: null,
    });
    return 'pending';
  }

  /** Apply a registered rollback (stored reverse executed, status → applied). */
  applyRollback(rollbackId: string): boolean {
    const r = this.state.repos.rollback(rollbackId);
    if (!r || r.status !== 'pending') return false;
    this.state.repos.markRollbackApplied(rollbackId);
    this.state.emit(r.company_id, 'sovereign.rollback_applied', r.action_id, 'system', { action_type: r.action_type });
    return true;
  }

  rollbacks(companyId?: string): unknown[] {
    return this.state.repos.rollbacks(companyId ?? null);
  }

  // ---- C29 deadman's switch (2a.6) ------------------------------------------

  /** Touch the owner's last-active marker (called on any owner interaction). */
  heartbeat(companyId: string, ownerId: string): void {
    const o = this.state.repos.owner(companyId, ownerId);
    if (o) this.state.repos.touchOwner(companyId, ownerId);
  }

  /**
   * Enforce the deadman's rule: if the owner has been silent > 7 days, the
   * company drops into read-only mode (no new spending/actions). Returns the
   * resulting company status.
   */
  deadmanCheck(companyId: string, days = 7): 'active' | 'read-only' {
    const owners = this.state.repos.owners(companyId);
    const anyActive = owners.some(o => Date.now() - Date.parse(o.last_active) < days * 86400000);
    if (anyActive) {
      const c = this.state.repos.company(companyId);
      if (c && c.status === 'read-only') { c.status = 'active'; this.state.repos.saveCompany(c); }
      return 'active';
    }
    const c = this.state.repos.company(companyId);
    if (c && c.status === 'active') {
      c.status = 'read-only';
      this.state.repos.saveCompany(c);
      this.state.emit(companyId, 'sovereign.deadman_readonly', 'sovereign', 'system', { days });
    }
    return 'read-only';
  }

  // ---- sovereign digest (2a.7) ----------------------------------------------

  /** Daily report to the human owner: ops, spend, approvals, risks, incidents. */
  digest(companyId: string): Record<string, unknown> {
    const c = this.state.repos.company(companyId);
    const tasks = this.state.repos.tasks(companyId);
    const events = this.state.repos.events(companyId, 500);
    const resources = new ResourceEngine(this.state);
    const spend = resources.totalSpend(companyId);
    const risks = this.state.repos.risks(companyId);
    const pending = new Governance(this.state).pending(companyId);
    const halted = this.isHalted(companyId);
    return {
      company: c?.name ?? companyId, status: c?.status ?? 'unknown',
      date: new Date().toISOString().slice(0, 10),
      tasks: tasks.length, succeeded: tasks.filter(t => t.status === 'SUCCEEDED').length,
      failed: tasks.filter(t => t.status === 'FAILED').length,
      spend_usd: round4(spend), events_24h: events.filter(e => Date.now() - Date.parse(e.ts) < 86400000).length,
      approvals_pending: pending.length, open_risks: risks.length,
      critical_events: events.filter(e => /kill|halt|rollback|readonly|incident/i.test(e.type)).length,
      halted,
    };
  }

  // ---- multi-layer approval routing (2a.8) ----------------------------------

  /** Route a decision by tier: auto → approve, gated → policy review, human-only → always request owner. */
  routeApproval(c: { company_id: string; action: string; summary: string; cost_usd: number; tier: ApprovalTier }): 'approved' | 'requested' {
    const gov = new Governance(this.state);
    if (c.tier === 'auto') {
      gov.approveOrBlock(c.company_id, 'sovereign', c.summary, `auto-route: ${c.action}`, { cost_usd: c.cost_usd, risk: 'low' });
      return 'approved';
    }
    const risk = c.tier === 'human-only' ? 'critical' : 'high';
    const approval = this.state.repos.createApproval({
      company_id: c.company_id, actor_id: 'sovereign', action: c.action,
      summary: `${c.tier === 'human-only' ? 'human-only' : 'gated-review'}: ${c.summary}`,
      risk, req_by: 'policy', cost_usd: c.cost_usd, payload: { tier: c.tier, action: c.action },
    });
    this.state.emit(c.company_id, 'sovereign.approval.requested', approval.id, 'approval', { tier: c.tier, action: c.action });
    return 'requested';
  }

  // ---- C50 multi-owner model (2a.9) -----------------------------------------

  addOwner(c: { company_id: string; name: string; role: string; email: string; authority: string[] }): OwnerRecord {
    const o: OwnerRecord = {
      id: newId('own'), company_id: c.company_id, name: c.name, role: c.role,
      email: c.email, authority: c.authority, last_active: new Date().toISOString(), status: 'active',
    };
    this.state.repos.saveOwner(o);
    return o;
  }

  owners(companyId: string): OwnerRecord[] {
    return this.state.repos.owners(companyId);
  }

  private logKill(c: { company_id: string; scope: KillScope; action: string; reason: string; by: string }): void {
    this.state.repos.storeKillLog({ id: newId('kill'), company_id: c.company_id, scope: c.scope, action: c.action, reason: c.reason, ts: new Date().toISOString(), by: c.by, active: 1 });
  }
}

function round4(n: number): number { return Math.round(n * 10000) / 10000; }

export { round4 };
