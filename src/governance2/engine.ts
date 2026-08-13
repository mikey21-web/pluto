import { PlutoState } from '../kernel/state.ts';
import { newId, now } from '../kernel/types.ts';

// ── Multi-Owner Full (C50) ────────────────────────────────────────────────────

export type DecisionType = 'financial' | 'strategic' | 'operational' | 'personnel' | 'legal';
export type ConsensusMechanism = 'simple_majority' | 'supermajority' | 'unanimous' | 'weighted';

export interface OwnerVote {
  owner_id: string;
  decision_id: string;
  choice: 'approve' | 'reject' | 'abstain';
  weight: number;
  rationale: string;
  ts: string;
}

export interface OwnerDecision {
  id: string;
  company_id: string;
  title: string;
  description: string;
  decision_type: DecisionType;
  consensus: ConsensusMechanism;
  required_weight: number;  // 0-1 fraction needed to pass
  votes: OwnerVote[];
  status: 'open' | 'approved' | 'rejected' | 'expired';
  result: string | null;
  created_at: string;
  resolved_at: string | null;
}

// ── Governed Strategic Ambiguity (C39) ────────────────────────────────────────

export interface AmbiguityRule {
  id: string;
  company_id: string;
  scenario: string;       // when this rule applies
  allowed_ambiguity: string;  // what the system is permitted to obscure
  rationale: string;      // ethics officer justification
  approved_by: string;    // ethics officer id
  active: boolean;
  created_at: string;
}

// ── Counterintelligence (C38) ─────────────────────────────────────────────────

export type ThreatKind = 'anomaly' | 'impersonation' | 'data_leak' | 'prompt_injection' | 'insider';

export interface ThreatSignal {
  id: string;
  company_id: string;
  kind: ThreatKind;
  description: string;
  agent_id: string | null;   // suspected agent
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  detected_at: string;
  resolved_at: string | null;
}

export interface AgentAuth {
  agent_id: string;
  company_id: string;
  public_key_hash: string;   // SHA hash of agent's identity token
  compartments: string[];    // what data partitions this agent can access
  last_verified: string;
  trusted: boolean;
}

export class Governance2Engine {
  private state: PlutoState;
  constructor(state: PlutoState) { this.state = state; }

  // ── Multi-Owner Decisions ─────────────────────────────────────────────────

  openDecision(companyId: string, title: string, description: string,
               decisionType: DecisionType, consensus: ConsensusMechanism = 'simple_majority',
               requiredWeight = 0.5): OwnerDecision {
    const od: OwnerDecision = {
      id: newId('dec'),
      company_id: companyId,
      title,
      description,
      decision_type: decisionType,
      consensus,
      required_weight: requiredWeight,
      votes: [],
      status: 'open',
      result: null,
      created_at: now(),
      resolved_at: null,
    };
    this.state.remember(companyId, JSON.stringify(od), {
      type: 'strategic', source: 'gov2.decision',
      tags: ['decision', od.id, decisionType, 'open'],
    });
    return od;
  }

  vote(decisionId: string, ownerId: string, choice: OwnerVote['choice'],
       weight: number, rationale: string): OwnerDecision | null {
    const row = this._decisionRow(decisionId);
    if (!row) return null;
    const od: OwnerDecision = JSON.parse(row.content);
    if (od.status !== 'open') return od;

    od.votes.push({ owner_id: ownerId, decision_id: decisionId, choice, weight, rationale, ts: now() });

    // tally
    const totalWeight = od.votes.reduce((s, v) => s + v.weight, 0);
    const approveWeight = od.votes.filter(v => v.choice === 'approve').reduce((s, v) => s + v.weight, 0);
    const rejectWeight = od.votes.filter(v => v.choice === 'reject').reduce((s, v) => s + v.weight, 0);
    const fraction = totalWeight > 0 ? approveWeight / totalWeight : 0;

    if (od.consensus === 'unanimous') {
      // veto check on every vote; approval only when closeDecision is called
      if (od.votes.some(v => v.choice === 'reject')) {
        od.status = 'rejected';
        od.result = 'Unanimous required — veto cast';
        od.resolved_at = now();
      }
      // no auto-approve on individual votes — caller must call closeDecision
    } else {
      if (fraction >= od.required_weight) {
        od.status = 'approved';
        od.result = `Approved ${(fraction * 100).toFixed(0)}% weight in favour`;
        od.resolved_at = now();
      } else if (rejectWeight / totalWeight > 1 - od.required_weight) {
        od.status = 'rejected';
        od.result = `Rejected — insufficient approval weight`;
        od.resolved_at = now();
      }
    }

    const tags: string[] = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags;
    tags[3] = od.status;
    this.state.store.db.prepare(`UPDATE memory SET content=?, tags=?, ts=? WHERE id=?`)
      .run(JSON.stringify(od), JSON.stringify(tags), now(), row.id);
    return od;
  }

  decisions(companyId: string, status?: OwnerDecision['status']): OwnerDecision[] {
    return this.state.repos.memory(companyId, 'strategic', 200)
      .filter(r => r.source === 'gov2.decision')
      .filter(r => !status || (r.tags as string[])[3] === status)
      .map(r => JSON.parse(r.content) as OwnerDecision);
  }

  // ── Strategic Ambiguity ───────────────────────────────────────────────────

  permitAmbiguity(companyId: string, scenario: string, allowedAmbiguity: string,
                  rationale: string, approvedBy: string): AmbiguityRule {
    const rule: AmbiguityRule = {
      id: newId('amb'),
      company_id: companyId,
      scenario,
      allowed_ambiguity: allowedAmbiguity,
      rationale,
      approved_by: approvedBy,
      active: true,
      created_at: now(),
    };
    this.state.remember(companyId, JSON.stringify(rule), {
      type: 'procedural', source: 'gov2.ambiguity',
      tags: ['ambiguity', rule.id, companyId, 'active'],
    });
    return rule;
  }

  ambiguityRules(companyId: string): AmbiguityRule[] {
    return this.state.repos.memory(companyId, 'procedural', 100)
      .filter(r => r.source === 'gov2.ambiguity' && (r.tags as string[])[3] === 'active')
      .map(r => JSON.parse(r.content) as AmbiguityRule);
  }

  // ── Counterintelligence ───────────────────────────────────────────────────

  flagThreat(companyId: string, kind: ThreatKind, description: string,
             severity: ThreatSignal['severity'], agentId?: string): ThreatSignal {
    const ts: ThreatSignal = {
      id: newId('thr'),
      company_id: companyId,
      kind,
      description,
      agent_id: agentId ?? null,
      severity,
      status: 'open',
      detected_at: now(),
      resolved_at: null,
    };
    this.state.remember(companyId, JSON.stringify(ts), {
      type: 'episodic', source: 'gov2.threat',
      tags: ['threat', ts.id, kind, severity, 'open'],
    });
    if (severity === 'critical' || severity === 'high') {
      this.state.emit(companyId, 'security.threat_detected', null, 'company', { kind, severity, id: ts.id });
    }
    return ts;
  }

  resolveThreat(threatId: string, resolution: ThreatSignal['status']): boolean {
    const row = this._threatRow(threatId);
    if (!row) return false;
    const ts: ThreatSignal = JSON.parse(row.content);
    ts.status = resolution;
    ts.resolved_at = now();
    const tags: string[] = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags;
    tags[4] = resolution;
    this.state.store.db.prepare(`UPDATE memory SET content=?, tags=?, ts=? WHERE id=?`)
      .run(JSON.stringify(ts), JSON.stringify(tags), now(), row.id);
    return true;
  }

  threats(companyId: string, status?: ThreatSignal['status']): ThreatSignal[] {
    return this.state.repos.memory(companyId, 'episodic', 200)
      .filter(r => r.source === 'gov2.threat')
      .filter(r => !status || (r.tags as string[])[4] === status)
      .map(r => JSON.parse(r.content) as ThreatSignal);
  }

  registerAgent(companyId: string, agentId: string, publicKeyHash: string,
                compartments: string[]): AgentAuth {
    const auth: AgentAuth = {
      agent_id: agentId,
      company_id: companyId,
      public_key_hash: publicKeyHash,
      compartments,
      last_verified: now(),
      trusted: true,
    };
    this.state.remember(companyId, JSON.stringify(auth), {
      type: 'procedural', source: 'gov2.agent_auth',
      tags: ['auth', agentId, companyId, 'trusted'],
    });
    return auth;
  }

  verifyAgent(companyId: string, agentId: string, keyHash: string): boolean {
    const row = this.state.repos.memory(companyId, 'procedural', 100)
      .find(r => r.source === 'gov2.agent_auth' && (r.tags as string[])[1] === agentId);
    if (!row) return false;
    const auth: AgentAuth = JSON.parse(row.content);
    return auth.trusted && auth.public_key_hash === keyHash;
  }

  status(): { decisions: number; threats: number; ambiguity_rules: number } {
    const rows = this.state.store.db
      .prepare(`SELECT source, COUNT(*) as cnt FROM memory WHERE active=1 AND source LIKE 'gov2.%' GROUP BY source`)
      .all() as { source: string; cnt: number }[];
    const get = (src: string) => rows.find(r => r.source === src)?.cnt ?? 0;
    return { decisions: get('gov2.decision'), threats: get('gov2.threat'), ambiguity_rules: get('gov2.ambiguity') };
  }

  private _decisionRow(id: string) {
    return this.state.store.db
      .prepare(`SELECT * FROM memory WHERE source='gov2.decision' AND active=1 AND tags LIKE ?`)
      .get(`%"${id}"%`) as any ?? null;
  }

  private _threatRow(id: string) {
    return this.state.store.db
      .prepare(`SELECT * FROM memory WHERE source='gov2.threat' AND active=1 AND tags LIKE ?`)
      .get(`%"${id}"%`) as any ?? null;
  }
}
