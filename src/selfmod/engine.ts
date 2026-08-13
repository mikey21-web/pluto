import { PlutoState } from '../kernel/state.ts';
import { newId, now } from '../kernel/types.ts';

// ── Kernel Self-Modification (C58) ────────────────────────────────────────────
// The civilization proposes changes to its own code/config.
// Protected core (kernel schema, safety constraints) is immutable.
// All changes must pass safety gate + human review for kernel-tier changes.

export type ModTarget = 'config' | 'prompt' | 'workflow' | 'tool' | 'agent_behavior' | 'kernel'; // kernel = highest gate

export type ModStatus = 'proposed' | 'under_review' | 'approved' | 'applied' | 'rolled_back' | 'rejected';

export interface SelfModProposal {
  id: string;
  company_id: string;
  proposed_by: string;         // agent id
  target: ModTarget;
  title: string;
  rationale: string;
  patch_description: string;   // what the change does
  expected_improvement: string;
  risk_assessment: string;
  safety_score: number;        // 0-1 (computed by safety gate)
  requires_human: boolean;     // kernel tier always true
  human_approvals: string[];
  status: ModStatus;
  proposed_at: string;
  applied_at: string | null;
  rollback_reason: string | null;
}

// ── Constitution Amends Constitution (C59) ────────────────────────────────────

export interface ConstitutionArticle {
  id: string;
  number: string;              // e.g. 'Article 7'
  title: string;
  text: string;
  immutable: boolean;          // founding principles cannot be amended
  version: number;
  last_amended: string;
}

export interface ConstitutionAmendment {
  id: string;
  article_id: string;
  proposed_by: string;
  change_description: string;
  new_text: string;
  votes_required: number;
  votes_cast: { voter_id: string; choice: 'approve' | 'reject'; ts: string }[];
  status: 'open' | 'approved' | 'rejected';
  proposed_at: string;
  resolved_at: string | null;
}

export class SelfModEngine {
  private state: PlutoState;
  constructor(state: PlutoState) { this.state = state; }

  // ── Self-Modification ─────────────────────────────────────────────────────

  propose(companyId: string, proposedBy: string, target: ModTarget, title: string,
          rationale: string, patchDescription: string, expectedImprovement: string,
          riskAssessment: string): SelfModProposal {
    const safetyScore = this._safetyScore(target, riskAssessment);
    const requiresHuman = target === 'kernel' || safetyScore < 0.6;
    const mod: SelfModProposal = {
      id: newId('mod'),
      company_id: companyId,
      proposed_by: proposedBy,
      target,
      title,
      rationale,
      patch_description: patchDescription,
      expected_improvement: expectedImprovement,
      risk_assessment: riskAssessment,
      safety_score: safetyScore,
      requires_human: requiresHuman,
      human_approvals: [],
      status: requiresHuman ? 'under_review' : 'approved', // low-risk non-kernel auto-approve
      proposed_at: now(),
      applied_at: null,
      rollback_reason: null,
    };
    this.state.remember(companyId, JSON.stringify(mod), {
      type: 'strategic', source: 'selfmod.proposal',
      tags: ['mod', mod.id, target, mod.status],
    });
    return mod;
  }

  approveProposal(proposalId: string, humanId: string): SelfModProposal | null {
    const row = this._modRow(proposalId);
    if (!row) return null;
    const mod: SelfModProposal = JSON.parse(row.content);
    if (!mod.human_approvals.includes(humanId)) mod.human_approvals.push(humanId);
    const needed = mod.target === 'kernel' ? 2 : 1;
    if (mod.human_approvals.length >= needed) mod.status = 'approved';
    const tags: string[] = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags;
    tags[3] = mod.status;
    this.state.store.db.prepare(`UPDATE memory SET content=?, tags=?, ts=? WHERE id=?`)
      .run(JSON.stringify(mod), JSON.stringify(tags), now(), row.id);
    return mod;
  }

  applyProposal(proposalId: string): boolean {
    const row = this._modRow(proposalId);
    if (!row) return false;
    const mod: SelfModProposal = JSON.parse(row.content);
    if (mod.status !== 'approved') return false;
    mod.status = 'applied';
    mod.applied_at = now();
    const tags: string[] = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags;
    tags[3] = 'applied';
    this.state.store.db.prepare(`UPDATE memory SET content=?, tags=?, ts=? WHERE id=?`)
      .run(JSON.stringify(mod), JSON.stringify(tags), now(), row.id);
    // emit so other systems can react
    this.state.emit(mod.company_id, 'selfmod.applied', null, 'company',
      { mod_id: proposalId, target: mod.target, title: mod.title });
    return true;
  }

  rollback(proposalId: string, reason: string): boolean {
    const row = this._modRow(proposalId);
    if (!row) return false;
    const mod: SelfModProposal = JSON.parse(row.content);
    if (mod.status !== 'applied') return false;
    mod.status = 'rolled_back';
    mod.rollback_reason = reason;
    const tags: string[] = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags;
    tags[3] = 'rolled_back';
    this.state.store.db.prepare(`UPDATE memory SET content=?, tags=?, ts=? WHERE id=?`)
      .run(JSON.stringify(mod), JSON.stringify(tags), now(), row.id);
    return true;
  }

  proposals(companyId: string, status?: ModStatus): SelfModProposal[] {
    return this.state.repos.memory(companyId, 'strategic', 200)
      .filter(r => r.source === 'selfmod.proposal')
      .filter(r => !status || (r.tags as string[])[3] === status)
      .map(r => JSON.parse(r.content) as SelfModProposal);
  }

  // ── Constitution ──────────────────────────────────────────────────────────

  seedConstitutionArticle(number: string, title: string, text: string, immutable: boolean): ConstitutionArticle {
    const article: ConstitutionArticle = {
      id: newId('art'),
      number,
      title,
      text,
      immutable,
      version: 1,
      last_amended: now(),
    };
    this.state.remember('__global__', JSON.stringify(article), {
      type: 'strategic', source: 'selfmod.article',
      tags: ['article', article.id, number, immutable ? 'immutable' : 'amendable'],
    });
    return article;
  }

  proposeAmendment(articleId: string, proposedBy: string, changeDescription: string,
                   newText: string, votesRequired: number): ConstitutionAmendment | null {
    const articleRow = this.state.repos.memory('__global__', 'strategic', 100)
      .find(r => r.source === 'selfmod.article' && (r.tags as string[])[1] === articleId);
    if (!articleRow) return null;
    const article: ConstitutionArticle = JSON.parse(articleRow.content);
    if (article.immutable) return null; // immutable articles cannot be amended

    const amend: ConstitutionAmendment = {
      id: newId('amend'),
      article_id: articleId,
      proposed_by: proposedBy,
      change_description: changeDescription,
      new_text: newText,
      votes_required: votesRequired,
      votes_cast: [],
      status: 'open',
      proposed_at: now(),
      resolved_at: null,
    };
    this.state.remember('__global__', JSON.stringify(amend), {
      type: 'strategic', source: 'selfmod.amendment',
      tags: ['amendment', amend.id, articleId, 'open'],
    });
    return amend;
  }

  voteAmendment(amendmentId: string, voterId: string, choice: 'approve' | 'reject'): ConstitutionAmendment | null {
    const row = this.state.store.db
      .prepare(`SELECT * FROM memory WHERE source='selfmod.amendment' AND active=1 AND tags LIKE ?`)
      .get(`%"${amendmentId}"%`) as any;
    if (!row) return null;
    const amend: ConstitutionAmendment = JSON.parse(row.content);
    if (amend.status !== 'open') return amend;
    if (!amend.votes_cast.find(v => v.voter_id === voterId)) {
      amend.votes_cast.push({ voter_id: voterId, choice, ts: now() });
    }
    const approvals = amend.votes_cast.filter(v => v.choice === 'approve').length;
    const rejections = amend.votes_cast.filter(v => v.choice === 'reject').length;
    if (approvals >= amend.votes_required) {
      amend.status = 'approved';
      amend.resolved_at = now();
      // apply: update article text
      this._applyAmendment(amend);
    } else if (rejections >= amend.votes_required) {
      amend.status = 'rejected';
      amend.resolved_at = now();
    }
    const tags: string[] = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags;
    tags[3] = amend.status;
    this.state.store.db.prepare(`UPDATE memory SET content=?, tags=?, ts=? WHERE id=?`)
      .run(JSON.stringify(amend), JSON.stringify(tags), now(), row.id);
    return amend;
  }

  articles(): ConstitutionArticle[] {
    return this.state.repos.memory('__global__', 'strategic', 100)
      .filter(r => r.source === 'selfmod.article')
      .map(r => JSON.parse(r.content) as ConstitutionArticle);
  }

  amendments(status?: ConstitutionAmendment['status']): ConstitutionAmendment[] {
    return this.state.repos.memory('__global__', 'strategic', 100)
      .filter(r => r.source === 'selfmod.amendment')
      .filter(r => !status || (r.tags as string[])[3] === status)
      .map(r => JSON.parse(r.content) as ConstitutionAmendment);
  }

  status(): { proposals: number; articles: number; amendments: number } {
    const rows = this.state.store.db
      .prepare(`SELECT source, COUNT(*) as cnt FROM memory WHERE active=1 AND source LIKE 'selfmod.%' GROUP BY source`)
      .all() as { source: string; cnt: number }[];
    const get = (s: string) => rows.find(r => r.source === s)?.cnt ?? 0;
    return { proposals: get('selfmod.proposal'), articles: get('selfmod.article'), amendments: get('selfmod.amendment') };
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private _safetyScore(target: ModTarget, riskAssessment: string): number {
    const lower = riskAssessment.toLowerCase();
    const highRisk = /critical|dangerous|irreversible|data.loss|security.bypass/.test(lower);
    const lowRisk = /safe|minor|reversible|no.risk|low.risk/.test(lower);
    const base: Record<ModTarget, number> = {
      config: 0.85, prompt: 0.8, workflow: 0.75, tool: 0.7, agent_behavior: 0.65, kernel: 0.4,
    };
    let score = base[target];
    if (highRisk) score -= 0.3;
    if (lowRisk) score += 0.1;
    return Math.max(0, Math.min(1, score));
  }

  private _modRow(id: string) {
    return this.state.store.db
      .prepare(`SELECT * FROM memory WHERE source='selfmod.proposal' AND active=1 AND tags LIKE ?`)
      .get(`%"${id}"%`) as any ?? null;
  }

  private _applyAmendment(amend: ConstitutionAmendment): void {
    const articleRow = this.state.repos.memory('__global__', 'strategic', 100)
      .find(r => r.source === 'selfmod.article' && (r.tags as string[])[1] === amend.article_id);
    if (!articleRow) return;
    const article: ConstitutionArticle = JSON.parse(articleRow.content);
    article.text = amend.new_text;
    article.version += 1;
    article.last_amended = now();
    this.state.store.db.prepare(`UPDATE memory SET content=?, ts=? WHERE id=?`)
      .run(JSON.stringify(article), now(), articleRow.id);
  }
}
