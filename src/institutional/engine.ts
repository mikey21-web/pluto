import { PlutoState } from '../kernel/state.ts';
import { newId, now } from '../kernel/types.ts';

// ── Auditor Read-Only Portal (C91) ────────────────────────────────────────────

export interface AuditorAccess {
  id: string;
  auditor_name: string;
  org: string;
  access_level: 'financial' | 'operational' | 'compliance' | 'full_read';
  company_ids: string[];   // which companies they can see
  token_hash: string;      // sha256 of access token
  expires_at: string;
  granted_at: string;
  active: boolean;
}

export interface AuditReport {
  id: string;
  auditor_id: string;
  period_start: string;
  period_end: string;
  findings: string[];
  risk_flags: string[];
  overall_rating: 'clean' | 'minor_issues' | 'material_issues' | 'adverse';
  submitted_at: string;
}

// ── Public API / External Goal Submission ────────────────────────────────────

export interface ExternalGoal {
  id: string;
  submitter_id: string;    // external entity
  goal: string;
  priority: 'low' | 'medium' | 'high';
  company_id: string | null;  // null = auto-route
  status: 'queued' | 'accepted' | 'rejected' | 'completed';
  submitted_at: string;
  resolved_at: string | null;
  result: string | null;
}

// ── Portfolio Operator Mode (VC / family office / endowment) ─────────────────

export type OperatorKind = 'vc' | 'family_office' | 'endowment' | 'municipality' | 'enterprise';

export interface PortfolioOperator {
  id: string;
  name: string;
  kind: OperatorKind;
  aum_usd: number;          // assets under management
  allocated_usd: number;    // allocated to this civilization
  company_ids: string[];    // companies in their portfolio
  reporting_cadence: 'weekly' | 'monthly' | 'quarterly';
  dashboard_url: string | null;
  onboarded_at: string;
}

export interface OperatorReport {
  id: string;
  operator_id: string;
  period: string;           // e.g. '2026-Q3'
  kpis: Record<string, number>;
  narrative: string;
  generated_at: string;
}

// ── Regional Operating Layer (C865) ──────────────────────────────────────────

export type RegionalKind = 'municipality' | 'state' | 'ngo' | 'public_sector';

export interface RegionalPartner {
  id: string;
  name: string;
  kind: RegionalKind;
  jurisdiction: string;    // e.g. 'Telangana, IN'
  contact_name: string;
  contact_email: string;
  services_offered: string[];  // what the civ provides to this partner
  agreement_terms: string;
  status: 'active' | 'negotiating' | 'suspended';
  onboarded_at: string;
}

export class InstitutionalEngine {
  private state: PlutoState;
  constructor(state: PlutoState) { this.state = state; }

  // ── Auditor ───────────────────────────────────────────────────────────────

  grantAuditorAccess(auditorName: string, org: string, accessLevel: AuditorAccess['access_level'],
                     companyIds: string[], tokenHash: string, expiresAt: string): AuditorAccess {
    const a: AuditorAccess = {
      id: newId('aud'),
      auditor_name: auditorName,
      org,
      access_level: accessLevel,
      company_ids: companyIds,
      token_hash: tokenHash,
      expires_at: expiresAt,
      granted_at: now(),
      active: true,
    };
    this.state.remember('__global__', JSON.stringify(a), {
      type: 'procedural', source: 'inst.auditor',
      tags: ['auditor', a.id, accessLevel, 'active'],
    });
    return a;
  }

  verifyAuditorToken(auditorId: string, tokenHash: string): boolean {
    const row = this.state.repos.memory('__global__', 'procedural', 100)
      .find(r => r.source === 'inst.auditor' && (r.tags as string[])[1] === auditorId);
    if (!row) return false;
    const a: AuditorAccess = JSON.parse(row.content);
    return a.active && a.token_hash === tokenHash && a.expires_at > now();
  }

  submitAuditReport(auditorId: string, periodStart: string, periodEnd: string,
                    findings: string[], riskFlags: string[], rating: AuditReport['overall_rating']): AuditReport {
    const report: AuditReport = {
      id: newId('arpt'),
      auditor_id: auditorId,
      period_start: periodStart,
      period_end: periodEnd,
      findings,
      risk_flags: riskFlags,
      overall_rating: rating,
      submitted_at: now(),
    };
    this.state.remember('__global__', JSON.stringify(report), {
      type: 'episodic', source: 'inst.audit_report',
      tags: ['audit_report', report.id, auditorId, rating],
    });
    return report;
  }

  auditReports(rating?: AuditReport['overall_rating']): AuditReport[] {
    return this.state.repos.memory('__global__', 'episodic', 100)
      .filter(r => r.source === 'inst.audit_report')
      .filter(r => !rating || (r.tags as string[])[3] === rating)
      .map(r => JSON.parse(r.content) as AuditReport);
  }

  // ── External Goals ────────────────────────────────────────────────────────

  submitGoal(submitterId: string, goal: string, priority: ExternalGoal['priority'],
             companyId?: string): ExternalGoal {
    const eg: ExternalGoal = {
      id: newId('eg'),
      submitter_id: submitterId,
      goal,
      priority,
      company_id: companyId ?? null,
      status: 'queued',
      submitted_at: now(),
      resolved_at: null,
      result: null,
    };
    this.state.remember('__global__', JSON.stringify(eg), {
      type: 'episodic', source: 'inst.external_goal',
      tags: ['goal', eg.id, submitterId, priority, 'queued'],
    });
    return eg;
  }

  resolveGoal(goalId: string, status: 'accepted' | 'rejected' | 'completed', result: string): boolean {
    const row = this.state.store.db
      .prepare(`SELECT * FROM memory WHERE source='inst.external_goal' AND active=1 AND tags LIKE ?`)
      .get(`%"${goalId}"%`) as any;
    if (!row) return false;
    const eg: ExternalGoal = JSON.parse(row.content);
    eg.status = status;
    eg.result = result;
    eg.resolved_at = now();
    const tags: string[] = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags;
    tags[4] = status;
    this.state.store.db.prepare(`UPDATE memory SET content=?, tags=?, ts=? WHERE id=?`)
      .run(JSON.stringify(eg), JSON.stringify(tags), now(), row.id);
    return true;
  }

  externalGoals(status?: ExternalGoal['status']): ExternalGoal[] {
    return this.state.repos.memory('__global__', 'episodic', 100)
      .filter(r => r.source === 'inst.external_goal')
      .filter(r => !status || (r.tags as string[])[4] === status)
      .map(r => JSON.parse(r.content) as ExternalGoal);
  }

  // ── Portfolio Operators ───────────────────────────────────────────────────

  onboardOperator(name: string, kind: OperatorKind, aumUsd: number, allocatedUsd: number,
                  companyIds: string[], cadence: PortfolioOperator['reporting_cadence']): PortfolioOperator {
    const op: PortfolioOperator = {
      id: newId('op'),
      name,
      kind,
      aum_usd: aumUsd,
      allocated_usd: allocatedUsd,
      company_ids: companyIds,
      reporting_cadence: cadence,
      dashboard_url: null,
      onboarded_at: now(),
    };
    this.state.remember('__global__', JSON.stringify(op), {
      type: 'procedural', source: 'inst.operator',
      tags: ['operator', op.id, kind, cadence],
    });
    return op;
  }

  generateReport(operatorId: string, period: string, kpis: Record<string, number>, narrative: string): OperatorReport {
    const report: OperatorReport = {
      id: newId('orpt'),
      operator_id: operatorId,
      period,
      kpis,
      narrative,
      generated_at: now(),
    };
    this.state.remember('__global__', JSON.stringify(report), {
      type: 'episodic', source: 'inst.operator_report',
      tags: ['operator_report', report.id, operatorId, period],
    });
    return report;
  }

  operators(kind?: OperatorKind): PortfolioOperator[] {
    return this.state.repos.memory('__global__', 'procedural', 100)
      .filter(r => r.source === 'inst.operator')
      .filter(r => !kind || (r.tags as string[])[2] === kind)
      .map(r => JSON.parse(r.content) as PortfolioOperator);
  }

  operatorReports(operatorId: string): OperatorReport[] {
    return this.state.repos.memory('__global__', 'episodic', 100)
      .filter(r => r.source === 'inst.operator_report' && (r.tags as string[])[2] === operatorId)
      .map(r => JSON.parse(r.content) as OperatorReport);
  }

  // ── Regional Partners ─────────────────────────────────────────────────────

  registerRegionalPartner(name: string, kind: RegionalKind, jurisdiction: string,
                          contactName: string, contactEmail: string,
                          servicesOffered: string[], agreementTerms: string): RegionalPartner {
    const rp: RegionalPartner = {
      id: newId('rgp'),
      name, kind, jurisdiction, contact_name: contactName, contact_email: contactEmail,
      services_offered: servicesOffered, agreement_terms: agreementTerms,
      status: 'negotiating', onboarded_at: now(),
    };
    this.state.remember('__global__', JSON.stringify(rp), {
      type: 'procedural', source: 'inst.regional',
      tags: ['regional', rp.id, kind, jurisdiction, 'negotiating'],
    });
    return rp;
  }

  activateRegionalPartner(partnerId: string): boolean {
    const row = this.state.store.db
      .prepare(`SELECT * FROM memory WHERE source='inst.regional' AND active=1 AND tags LIKE ?`)
      .get(`%"${partnerId}"%`) as any;
    if (!row) return false;
    const rp: RegionalPartner = JSON.parse(row.content);
    rp.status = 'active';
    const tags: string[] = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags;
    tags[4] = 'active';
    this.state.store.db.prepare(`UPDATE memory SET content=?, tags=?, ts=? WHERE id=?`)
      .run(JSON.stringify(rp), JSON.stringify(tags), now(), row.id);
    return true;
  }

  regionalPartners(kind?: RegionalKind): RegionalPartner[] {
    return this.state.repos.memory('__global__', 'procedural', 100)
      .filter(r => r.source === 'inst.regional')
      .filter(r => !kind || (r.tags as string[])[2] === kind)
      .map(r => JSON.parse(r.content) as RegionalPartner);
  }

  status(): { auditors: number; goals: number; operators: number } {
    const rows = this.state.store.db
      .prepare(`SELECT source, COUNT(*) as cnt FROM memory WHERE active=1 AND source LIKE 'inst.%' GROUP BY source`)
      .all() as { source: string; cnt: number }[];
    const get = (s: string) => rows.find(r => r.source === s)?.cnt ?? 0;
    return { auditors: get('inst.auditor'), goals: get('inst.external_goal'), operators: get('inst.operator') };
  }
}
