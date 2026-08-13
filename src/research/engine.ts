import { PlutoState } from '../kernel/state.ts';
import { newId, now } from '../kernel/types.ts';

// ── R&D Operations (C53) ─────────────────────────────────────────────────────

export type HypothesisStatus = 'open' | 'testing' | 'confirmed' | 'refuted';

export interface Hypothesis {
  id: string;
  company_id: string;
  statement: string;
  rationale: string;
  experiment_plan: string;
  status: HypothesisStatus;
  result: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface Experiment {
  id: string;
  hypothesis_id: string;
  company_id: string;
  method: string;
  data: Record<string, unknown>;
  outcome: string;
  supports_hypothesis: boolean;
  run_at: string;
}

// ── Knowledge Contribution (C54) ─────────────────────────────────────────────

export type PublicationKind = 'paper' | 'blog' | 'open_source' | 'dataset' | 'talk';

export interface Publication {
  id: string;
  company_id: string;
  kind: PublicationKind;
  title: string;
  abstract: string;
  url: string | null;
  citations: number;
  published_at: string;
}

// ── Patent Generation (C55) ──────────────────────────────────────────────────

export type PatentStatus = 'draft' | 'filed' | 'granted' | 'abandoned';

export interface Patent {
  id: string;
  company_id: string;
  title: string;
  claims: string[];
  prior_art_checked: boolean;
  novelty_score: number;  // 0-1
  status: PatentStatus;
  filed_at: string | null;
  granted_at: string | null;
  created_at: string;
}

export class ResearchEngine {
  private state: PlutoState;
  constructor(state: PlutoState) { this.state = state; }

  // ── Hypotheses ────────────────────────────────────────────────────────────

  hypothesize(companyId: string, statement: string, rationale: string, experimentPlan: string): Hypothesis {
    const h: Hypothesis = {
      id: newId('hyp'),
      company_id: companyId,
      statement,
      rationale,
      experiment_plan: experimentPlan,
      status: 'open',
      result: null,
      created_at: now(),
      resolved_at: null,
    };
    this.state.remember(companyId, JSON.stringify(h), {
      type: 'strategic', source: 'research.hypothesis',
      tags: ['hypothesis', h.id, companyId, 'open'],
    });
    return h;
  }

  runExperiment(hypothesisId: string, method: string, data: Record<string, unknown>,
                outcome: string, supportsHypothesis: boolean): Experiment {
    const hRow = this._hypRow(hypothesisId);
    const h: Hypothesis | null = hRow ? JSON.parse(hRow.content) : null;
    const companyId = h?.company_id ?? '__global__';

    const exp: Experiment = {
      id: newId('exp'),
      hypothesis_id: hypothesisId,
      company_id: companyId,
      method,
      data,
      outcome,
      supports_hypothesis: supportsHypothesis,
      run_at: now(),
    };
    this.state.remember(companyId, JSON.stringify(exp), {
      type: 'episodic', source: 'research.experiment',
      tags: ['experiment', exp.id, hypothesisId, supportsHypothesis ? 'supports' : 'refutes'],
    });

    // update hypothesis status
    if (hRow) {
      const updatedH: Hypothesis = JSON.parse(hRow.content);
      updatedH.status = supportsHypothesis ? 'confirmed' : 'refuted';
      updatedH.result = outcome;
      updatedH.resolved_at = now();
      const tags: string[] = typeof hRow.tags === 'string' ? JSON.parse(hRow.tags) : hRow.tags;
      tags[3] = updatedH.status;
      this.state.store.db.prepare(`UPDATE memory SET content=?, tags=?, ts=? WHERE id=?`)
        .run(JSON.stringify(updatedH), JSON.stringify(tags), now(), hRow.id);
    }
    return exp;
  }

  hypotheses(companyId: string, status?: HypothesisStatus): Hypothesis[] {
    return this.state.repos.memory(companyId, 'strategic', 200)
      .filter(r => r.source === 'research.hypothesis')
      .filter(r => !status || (r.tags as string[])[3] === status)
      .map(r => JSON.parse(r.content) as Hypothesis);
  }

  experiments(companyId: string, hypothesisId?: string): Experiment[] {
    return this.state.repos.memory(companyId, 'episodic', 200)
      .filter(r => r.source === 'research.experiment')
      .filter(r => !hypothesisId || (r.tags as string[])[2] === hypothesisId)
      .map(r => JSON.parse(r.content) as Experiment);
  }

  // ── Publications ──────────────────────────────────────────────────────────

  publish(companyId: string, kind: PublicationKind, title: string, abstract: string, url?: string): Publication {
    const pub: Publication = {
      id: newId('pub'),
      company_id: companyId,
      kind,
      title,
      abstract,
      url: url ?? null,
      citations: 0,
      published_at: now(),
    };
    this.state.remember(companyId, JSON.stringify(pub), {
      type: 'semantic', source: 'research.publication',
      tags: ['publication', pub.id, kind],
    });
    return pub;
  }

  cite(publicationId: string): number {
    const row = this._pubRow(publicationId);
    if (!row) return 0;
    const pub: Publication = JSON.parse(row.content);
    pub.citations += 1;
    this.state.store.db.prepare(`UPDATE memory SET content=?, ts=? WHERE id=?`)
      .run(JSON.stringify(pub), now(), row.id);
    return pub.citations;
  }

  publications(companyId: string, kind?: PublicationKind): Publication[] {
    return this.state.repos.memory(companyId, 'semantic', 200)
      .filter(r => r.source === 'research.publication')
      .filter(r => !kind || (r.tags as string[])[2] === kind)
      .map(r => JSON.parse(r.content) as Publication);
  }

  // ── Patents ───────────────────────────────────────────────────────────────

  draftPatent(companyId: string, title: string, claims: string[], noveltyScore: number): Patent {
    const p: Patent = {
      id: newId('pat'),
      company_id: companyId,
      title,
      claims,
      prior_art_checked: false,
      novelty_score: noveltyScore,
      status: 'draft',
      filed_at: null,
      granted_at: null,
      created_at: now(),
    };
    this.state.remember(companyId, JSON.stringify(p), {
      type: 'procedural', source: 'research.patent',
      tags: ['patent', p.id, companyId, 'draft'],
    });
    return p;
  }

  filePatent(patentId: string): boolean {
    return this._updatePatentStatus(patentId, 'filed');
  }

  grantPatent(patentId: string): boolean {
    return this._updatePatentStatus(patentId, 'granted');
  }

  patents(companyId: string, status?: PatentStatus): Patent[] {
    return this.state.repos.memory(companyId, 'procedural', 200)
      .filter(r => r.source === 'research.patent')
      .filter(r => !status || (r.tags as string[])[3] === status)
      .map(r => JSON.parse(r.content) as Patent);
  }

  status(): { hypotheses: number; experiments: number; publications: number; patents: number } {
    const rows = this.state.store.db
      .prepare(`SELECT source, COUNT(*) as cnt FROM memory WHERE active=1 AND source LIKE 'research.%' GROUP BY source`)
      .all() as { source: string; cnt: number }[];
    const get = (src: string) => rows.find(r => r.source === src)?.cnt ?? 0;
    return {
      hypotheses: get('research.hypothesis'),
      experiments: get('research.experiment'),
      publications: get('research.publication'),
      patents: get('research.patent'),
    };
  }

  private _hypRow(id: string) {
    return this.state.store.db
      .prepare(`SELECT * FROM memory WHERE source='research.hypothesis' AND active=1 AND tags LIKE ?`)
      .get(`%"${id}"%`) as any ?? null;
  }

  private _pubRow(id: string) {
    return this.state.store.db
      .prepare(`SELECT * FROM memory WHERE source='research.publication' AND active=1 AND tags LIKE ?`)
      .get(`%"${id}"%`) as any ?? null;
  }

  private _patRow(id: string) {
    return this.state.store.db
      .prepare(`SELECT * FROM memory WHERE source='research.patent' AND active=1 AND tags LIKE ?`)
      .get(`%"${id}"%`) as any ?? null;
  }

  private _updatePatentStatus(patentId: string, status: PatentStatus): boolean {
    const row = this._patRow(patentId);
    if (!row) return false;
    const p: Patent = JSON.parse(row.content);
    p.status = status;
    if (status === 'filed') p.filed_at = now();
    if (status === 'granted') p.granted_at = now();
    const tags: string[] = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags;
    tags[3] = status;
    this.state.store.db.prepare(`UPDATE memory SET content=?, tags=?, ts=? WHERE id=?`)
      .run(JSON.stringify(p), JSON.stringify(tags), now(), row.id);
    return true;
  }
}
