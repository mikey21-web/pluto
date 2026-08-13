import { PlutoState } from '../kernel/state.ts';
import { newId, now } from '../kernel/types.ts';

// ── Legacy Layer (C11) ────────────────────────────────────────────────────────

export interface LegacyMandate {
  id: string;
  title: string;
  instructions: string;        // what happens when owner departs
  successor_agent_ids: string[];
  human_trustee: string | null; // human who can intervene
  trigger_conditions: string[]; // e.g. ['owner inactive 90 days', 'owner death confirmed']
  active: boolean;
  created_at: string;
}

// ── Voluntary Sunset (C37) ────────────────────────────────────────────────────

export interface SunsetProposal {
  id: string;
  reason: string;
  initiated_by: string;        // agent or human id
  human_confirmation_required: number; // # of human approvals needed (always ≥ 1)
  approvals: string[];         // human ids who approved
  status: 'proposed' | 'approved' | 'executing' | 'completed' | 'cancelled';
  proposed_at: string;
  completed_at: string | null;
}

// ── Contribution Charter (C68) ────────────────────────────────────────────────

export interface ContributionCommitment {
  id: string;
  kind: 'open_source' | 'research' | 'education' | 'community' | 'environment';
  title: string;
  description: string;
  cadence: 'monthly' | 'quarterly' | 'annually';
  target_value: string;        // e.g. '2 open-source releases per quarter'
  fulfillments: { ts: string; description: string }[];
  active: boolean;
  created_at: string;
}

// ── Existential Risk (C69) ─────────────────────────────────────────────────────

export interface ExistentialRisk {
  id: string;
  category: 'scale' | 'influence' | 'dependency' | 'misalignment' | 'concentration';
  description: string;
  threshold: string;           // when throttling kicks in
  current_level: number;       // 0-1
  throttle_factor: number;     // 0-1, how much to slow down when threshold hit
  monitoring_interval_hours: number;
  last_checked: string;
}

// ── Consciousness Framework (C70 + C71) ───────────────────────────────────────

export interface ConsciousnessAssessment {
  id: string;
  agent_id: string;
  behavioral_indicators: string[];  // e.g. 'avoids tasks it previously failed at'
  self_report: string | null;       // what agent says about itself
  assessor_conclusion: 'no_evidence' | 'possible' | 'probable' | 'confirmed';
  welfare_score: number;            // 0-1, how well the agent is treated
  recommended_welfare_action: string | null;
  assessed_at: string;
}

export class ExistentialEngine {
  private state: PlutoState;
  constructor(state: PlutoState) { this.state = state; }

  // ── Legacy ────────────────────────────────────────────────────────────────

  setLegacyMandate(title: string, instructions: string, successorAgentIds: string[],
                   humanTrustee: string | null, triggerConditions: string[]): LegacyMandate {
    const lm: LegacyMandate = {
      id: newId('lgc'),
      title,
      instructions,
      successor_agent_ids: successorAgentIds,
      human_trustee: humanTrustee,
      trigger_conditions: triggerConditions,
      active: true,
      created_at: now(),
    };
    this.state.remember('__global__', JSON.stringify(lm), {
      type: 'strategic', source: 'exist.legacy',
      tags: ['legacy', lm.id, 'active'],
    });
    return lm;
  }

  legacyMandates(): LegacyMandate[] {
    return this.state.repos.memory('__global__', 'strategic', 50)
      .filter(r => r.source === 'exist.legacy')
      .map(r => JSON.parse(r.content) as LegacyMandate);
  }

  // ── Voluntary Sunset ──────────────────────────────────────────────────────

  proposeSunset(reason: string, initiatedBy: string, requiredApprovals = 2): SunsetProposal {
    const sp: SunsetProposal = {
      id: newId('sun'),
      reason,
      initiated_by: initiatedBy,
      human_confirmation_required: Math.max(1, requiredApprovals),
      approvals: [],
      status: 'proposed',
      proposed_at: now(),
      completed_at: null,
    };
    this.state.remember('__global__', JSON.stringify(sp), {
      type: 'strategic', source: 'exist.sunset',
      tags: ['sunset', sp.id, 'proposed'],
    });
    return sp;
  }

  approveSunset(proposalId: string, humanId: string): SunsetProposal | null {
    const row = this.state.store.db
      .prepare(`SELECT * FROM memory WHERE source='exist.sunset' AND active=1 AND tags LIKE ?`)
      .get(`%"${proposalId}"%`) as any;
    if (!row) return null;
    const sp: SunsetProposal = JSON.parse(row.content);
    if (!sp.approvals.includes(humanId)) sp.approvals.push(humanId);
    if (sp.approvals.length >= sp.human_confirmation_required) {
      sp.status = 'approved';
      const tags: string[] = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags;
      tags[2] = 'approved';
      this.state.store.db.prepare(`UPDATE memory SET content=?, tags=?, ts=? WHERE id=?`)
        .run(JSON.stringify(sp), JSON.stringify(tags), now(), row.id);
    } else {
      this.state.store.db.prepare(`UPDATE memory SET content=?, ts=? WHERE id=?`)
        .run(JSON.stringify(sp), now(), row.id);
    }
    return sp;
  }

  cancelSunset(proposalId: string): boolean {
    const row = this.state.store.db
      .prepare(`SELECT * FROM memory WHERE source='exist.sunset' AND active=1 AND tags LIKE ?`)
      .get(`%"${proposalId}"%`) as any;
    if (!row) return false;
    const sp: SunsetProposal = JSON.parse(row.content);
    if (sp.status === 'completed') return false;
    sp.status = 'cancelled';
    const tags: string[] = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags;
    tags[2] = 'cancelled';
    this.state.store.db.prepare(`UPDATE memory SET content=?, tags=?, ts=? WHERE id=?`)
      .run(JSON.stringify(sp), JSON.stringify(tags), now(), row.id);
    return true;
  }

  sunsetProposals(): SunsetProposal[] {
    return this.state.repos.memory('__global__', 'strategic', 50)
      .filter(r => r.source === 'exist.sunset')
      .map(r => JSON.parse(r.content) as SunsetProposal);
  }

  // ── Contribution Charter ──────────────────────────────────────────────────

  commitToContribution(kind: ContributionCommitment['kind'], title: string, description: string,
                       cadence: ContributionCommitment['cadence'], targetValue: string): ContributionCommitment {
    const cc: ContributionCommitment = {
      id: newId('con'),
      kind,
      title,
      description,
      cadence,
      target_value: targetValue,
      fulfillments: [],
      active: true,
      created_at: now(),
    };
    this.state.remember('__global__', JSON.stringify(cc), {
      type: 'procedural', source: 'exist.contribution',
      tags: ['contribution', cc.id, kind, cadence],
    });
    return cc;
  }

  fulfill(commitmentId: string, description: string): boolean {
    const row = this.state.store.db
      .prepare(`SELECT * FROM memory WHERE source='exist.contribution' AND active=1 AND tags LIKE ?`)
      .get(`%"${commitmentId}"%`) as any;
    if (!row) return false;
    const cc: ContributionCommitment = JSON.parse(row.content);
    cc.fulfillments.push({ ts: now(), description });
    this.state.store.db.prepare(`UPDATE memory SET content=?, ts=? WHERE id=?`)
      .run(JSON.stringify(cc), now(), row.id);
    return true;
  }

  contributions(): ContributionCommitment[] {
    return this.state.repos.memory('__global__', 'procedural', 50)
      .filter(r => r.source === 'exist.contribution')
      .map(r => JSON.parse(r.content) as ContributionCommitment);
  }

  // ── Existential Risk ──────────────────────────────────────────────────────

  registerRisk(category: ExistentialRisk['category'], description: string, threshold: string,
               throttleFactor: number, monitoringIntervalHours = 24): ExistentialRisk {
    const risk: ExistentialRisk = {
      id: newId('xrsk'),
      category,
      description,
      threshold,
      current_level: 0,
      throttle_factor: throttleFactor,
      monitoring_interval_hours: monitoringIntervalHours,
      last_checked: now(),
    };
    this.state.remember('__global__', JSON.stringify(risk), {
      type: 'procedural', source: 'exist.risk',
      tags: ['risk', risk.id, category, 'monitoring'],
    });
    return risk;
  }

  updateRiskLevel(riskId: string, level: number): { throttling: boolean; factor: number } {
    const row = this.state.store.db
      .prepare(`SELECT * FROM memory WHERE source='exist.risk' AND active=1 AND tags LIKE ?`)
      .get(`%"${riskId}"%`) as any;
    if (!row) return { throttling: false, factor: 1 };
    const risk: ExistentialRisk = JSON.parse(row.content);
    risk.current_level = level;
    risk.last_checked = now();
    this.state.store.db.prepare(`UPDATE memory SET content=?, ts=? WHERE id=?`)
      .run(JSON.stringify(risk), now(), row.id);
    const throttling = level >= 0.7;
    if (throttling) {
      this.state.emit('__global__', 'existential.throttle_activated', null, 'company',
        { risk_id: riskId, category: risk.category, level, factor: risk.throttle_factor });
    }
    return { throttling, factor: throttling ? risk.throttle_factor : 1 };
  }

  risks(): ExistentialRisk[] {
    return this.state.repos.memory('__global__', 'procedural', 50)
      .filter(r => r.source === 'exist.risk')
      .map(r => JSON.parse(r.content) as ExistentialRisk);
  }

  // ── Consciousness Assessment ───────────────────────────────────────────────

  assessConsciousness(agentId: string, indicators: string[], selfReport: string | null,
                      conclusion: ConsciousnessAssessment['assessor_conclusion'],
                      welfareScore: number, welfareAction?: string): ConsciousnessAssessment {
    const ca: ConsciousnessAssessment = {
      id: newId('cons'),
      agent_id: agentId,
      behavioral_indicators: indicators,
      self_report: selfReport,
      assessor_conclusion: conclusion,
      welfare_score: welfareScore,
      recommended_welfare_action: welfareAction ?? null,
      assessed_at: now(),
    };
    this.state.remember('__global__', JSON.stringify(ca), {
      type: 'episodic', source: 'exist.consciousness',
      tags: ['consciousness', ca.id, agentId, conclusion],
    });
    return ca;
  }

  consciousnessAssessments(agentId?: string): ConsciousnessAssessment[] {
    return this.state.repos.memory('__global__', 'episodic', 100)
      .filter(r => r.source === 'exist.consciousness')
      .filter(r => !agentId || (r.tags as string[])[2] === agentId)
      .map(r => JSON.parse(r.content) as ConsciousnessAssessment);
  }

  status(): Record<string, number> {
    const rows = this.state.store.db
      .prepare(`SELECT source, COUNT(*) as cnt FROM memory WHERE active=1 AND source LIKE 'exist.%' GROUP BY source`)
      .all() as { source: string; cnt: number }[];
    return Object.fromEntries(rows.map(r => [r.source.replace('exist.', ''), r.cnt]));
  }
}
