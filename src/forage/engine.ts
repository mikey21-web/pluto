import { Store } from '../kernel/store.ts';
import { newId } from '../kernel/types.ts';
import { ToolSynthesizer, type ToolSpec } from '../meta/synthesizer.ts';
import { CanaryDeploy } from '../meta/canary.ts';
import type { Capability } from '../kernel/types.ts';

export interface ForageCandidate {
  source: string;      // 'github' | 'huggingface' | 'arxiv' | 'producthunt' | 'hn' | 'npm' | 'pypi' | 'rapidapi' | 'yc'
  repo: string;        // owner/repo or package name
  name: string;
  description: string;
  url: string;
  license?: string;
  language?: string;
  stars?: number;
  updated_at?: string;
  tags?: string[];
  seed?: string;       // optional deterministic routing seed (canary)
}

export interface ForagedEntry extends ForageCandidate {
  id: string;
  company_id: string;
  status: 'candidate' | 'adopted' | 'rejected' | 'museum';
  score: number;
  notes: string;
  foraged_at: string;
}

export interface EvalReport {
  code_quality: number;
  has_tests: boolean;
  license: string;
  security: number;
  maintainer_activity: number;
  fit: number;
  score: number;
  verdict: 'adopt' | 'hold' | 'reject';
}

/**
 * Foraging Layer (C85-C90, PLAN 1f). The civilization consumes the world's
 * open-source output: a scavenger daemon (C85), on-demand gap-triggered search
 * (C86), an evaluator (C87), a fork→adapt→sandbox-test→register→canary-deploy
 * pipeline (C88), a searchable museum archive (C89), and trend prediction (C90).
 * P2 becomes forage-first, synthesize-fallback.
 */
export class ForageEngine {
  private store: Store;
  private synth: ToolSynthesizer;
  private canary: CanaryDeploy;
  private registerVersion: (companyId: string, name: string) => Capability;

  constructor(opts: {
    store: Store;
    synth?: ToolSynthesizer;
    canary?: CanaryDeploy;
    registerVersion: (companyId: string, name: string) => Capability;
  }) {
    this.store = opts.store;
    this.synth = opts.synth ?? new ToolSynthesizer();
    this.canary = opts.canary ?? new CanaryDeploy();
    this.registerVersion = opts.registerVersion;
  }

  // ---- persistence ----------------------------------------------------------

  private insert(e: ForagedEntry): void {
    this.store.db.prepare(
      'INSERT INTO foraged (id,company_id,source,repo,name,description,url,license,language,stars,updated_at,tags,status,seed,score,notes,foraged_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
    ).run(e.id, e.company_id, e.source, e.repo, e.name, e.description, e.url,
      e.license ?? null, e.language ?? null, e.stars ?? null, e.updated_at ?? null,
      JSON.stringify(e.tags ?? []), e.status, e.seed ?? null, e.score, e.notes, e.foraged_at);
  }

  private mapRow(r: any): ForagedEntry {
    return { ...r, tags: JSON.parse(r.tags ?? '[]'), stars: r.stars ?? 0, score: r.score ?? 0 };
  }

  // ---- C85 scavenger daemon -------------------------------------------------

  /**
   * Crawl a set of sources (mock feeds injected as candidates). Real integrations
   * (GitHub trending API, HuggingFace API, etc.) map to this same shape. Each
   * run scores candidates and files them in the museum.
   */
  scavenge(companyId: string, feeds: ForageCandidate[]): ForagedEntry[] {
    const out: ForagedEntry[] = [];
    for (const c of feeds) {
      const report = this.evaluate(c);
      const entry: ForagedEntry = {
        ...c, id: newId('frg'), company_id: companyId,
        status: report.verdict === 'adopt' ? 'candidate' : report.verdict === 'reject' ? 'rejected' : 'museum',
        score: report.score, notes: `${report.verdict} — quality ${report.code_quality}, fit ${report.fit}, tests ${report.has_tests}, license ${report.license}`,
        foraged_at: new Date().toISOString(),
      };
      this.insert(entry);
      out.push(entry);
    }
    return out;
  }

  // ---- C86 on-demand foraging ----------------------------------------------

  /** Query the ecosystem for a capability gap. Falls back to museum first (forage-first). */
  onDemand(companyId: string, capability: string, feeds: ForageCandidate[]): ForagedEntry[] {
    const museum = this.search(companyId, { capability }).filter(e => e.status === 'candidate' || e.status === 'museum');
    if (museum.length > 0) return museum;
    const scored = this.scavenge(companyId, feeds.map(f => ({ ...f, tags: [...(f.tags ?? []), capability] })));
    return scored.filter(e => e.status === 'candidate');
  }

  // ---- C87 evaluator -------------------------------------------------------

  /**
   * Score a candidate on code quality, tests, license, security, maintainer
   * activity, and fit. Verdict thresholds: adopt ≥0.7, reject <0.4, else hold.
   */
  evaluate(c: ForageCandidate): EvalReport {
    const desc = `${c.name} ${c.description}`.toLowerCase();
    const code_quality = clamp01(Math.min(1, (c.stars ?? 0) / 5000 + (desc.includes('typescript') || desc.includes('rust') || desc.includes('go') ? 0.2 : 0)));
    const has_tests = desc.includes('test') || desc.includes('spec') || desc.includes('coverage');
    const license = c.license ?? 'unknown';
    const security = /mit|apache|bsd|mpl/i.test(license) ? 1 : /gpl/i.test(license) ? 0.6 : 0.3;
    const fresh = c.updated_at ? clamp01(1 - (Date.now() - Date.parse(c.updated_at)) / (365 * 86400000)) : 0.2;
    const maintainer_activity = clamp01((c.stars ?? 0) / 20000 + fresh * 0.5);
    const fit = clamp01(1 - (c.tags?.length ?? 0) * 0.1);
    const score = clamp01(
      code_quality * 0.25 + (has_tests ? 0.2 : 0) + security * 0.2 + maintainer_activity * 0.2 + fit * 0.15,
    );
    return {
      code_quality: round1(code_quality), has_tests, license, security: round1(security),
      maintainer_activity: round1(maintainer_activity), fit: round1(fit), score: round1(score),
      verdict: score >= 0.7 ? 'adopt' : score < 0.4 ? 'reject' : 'hold',
    };
  }

  // ---- C88 fork-adapt-integrate pipeline ------------------------------------

  /**
   * Fork → adapt schema → sandbox-test → register → canary-deploy. Accepts a
   * candidate that carries a runnable `ToolSpec` (adapted from the upstream
   * schema) plus synthetic tests. Only tools passing sandbox tests are
   * registered (as a new capability version) and canary-deployed.
   */
  async forkAndIntegrate(c: {
    company_id: string;
    candidate: ForageCandidate;
    adaptedSpec: ToolSpec;
    tests: Array<{ args: Record<string, unknown>; expect: string }>;
    capabilityName?: string;
  }): Promise<{ ok: boolean; entry?: ForagedEntry; canaryId?: string; reason: string }> {
    const report = this.evaluate(c.candidate);
    if (report.verdict === 'reject') {
      const e = this.archive(c.company_id, c.candidate, 'rejected', report.score, `evaluator: ${report.verdict}`);
      return { ok: false, entry: e, reason: 'evaluator rejected candidate' };
    }
    const res = await this.synth.sandboxTest(c.adaptedSpec, c.tests);
    if (!res.passed) {
      const e = this.archive(c.company_id, c.candidate, 'rejected', report.score, `sandbox tests failed: ${res.failures.slice(0, 2).join('; ')}`);
      return { ok: false, entry: e, reason: 'sandbox tests failed' };
    }
    const name = c.capabilityName ?? c.candidate.name;
    const cap = this.registerVersion(c.company_id, name);
    void cap;
    const canaryId = this.canary.start({ company_id: c.company_id, tool_name: name }).id;
    const e = this.archive(c.company_id, c.candidate, 'adopted', report.score,
      `registered capability "${name}" v${this.canary.list(c.company_id).filter(x => x.tool_name === name).length}, canary ${canaryId}`);
    return { ok: true, entry: e, canaryId, reason: `adopted ${c.candidate.repo} → ${name}` };
  }

  // ---- C89 foraging museum --------------------------------------------------

  private archive(companyId: string, c: ForageCandidate, status: ForagedEntry['status'], score: number, notes: string): ForagedEntry {
    const e: ForagedEntry = { ...c, id: newId('frg'), company_id: companyId, status, score, notes, foraged_at: new Date().toISOString() };
    this.insert(e);
    return e;
  }

  /** Queryable museum: filter by source / tags / status / text. */
  search(companyId: string, q: { source?: string; capability?: string; status?: string; q?: string } = {}): ForagedEntry[] {
    const rows: any[] = this.store.db.prepare('SELECT * FROM foraged WHERE company_id=?').all(companyId).map(this.mapRow);
    return rows.filter(e => {
      if (q.source && e.source !== q.source) return false;
      if (q.status && e.status !== q.status) return false;
      if (q.capability && !e.tags.some(t => t.toLowerCase().includes(q.capability!.toLowerCase())) && !`${e.name} ${e.description}`.toLowerCase().includes(q.capability!.toLowerCase())) return false;
      if (q.q) {
        const hay = `${e.name} ${e.description} ${e.repo}`.toLowerCase();
        if (!hay.includes(q.q.toLowerCase())) return false;
      }
      return true;
    });
  }

  museum(companyId: string): ForagedEntry[] {
    return this.search(companyId, {});
  }

  // ---- C90 trend prediction -------------------------------------------------

  /**
   * Predictive foraging: rank sources by star velocity, freshness, and
   * cross-community signal (tag overlap across sources). Returns a predicted
   * "next hot" list.
   */
  predictTrends(companyId: string, feeds: ForageCandidate[]): Array<ForageCandidate & { trend_score: number }> {
    const scored = feeds.map(f => {
      const base = f.stars ?? 0;
      const velocity = f.updated_at ? clamp01((Date.now() - Date.parse(f.updated_at)) / (30 * 86400000) > 30 ? 0 : 0.5) : 0;
      void base;
      return f;
    });
    // cross-community: candidates sharing a tag with a funded/hot source get a boost
    const tagFreq = new Map<string, number>();
    for (const f of feeds) for (const t of f.tags ?? []) tagFreq.set(t, (tagFreq.get(t) ?? 0) + 1);
    return scored.map(f => {
      const community = (f.tags ?? []).reduce((a, t) => a + (tagFreq.get(t) ?? 1), 0) / Math.max(1, (f.tags ?? []).length);
      const velocity = f.updated_at ? (Date.now() - Date.parse(f.updated_at)) / 86400000 : 999;
      const trend_score = round1(clamp01(
        community * 0.4 + clamp01(1 / (1 + velocity)) * 0.4 + clamp01((f.stars ?? 0) / 10000) * 0.2,
      ));
      return { ...f, trend_score };
    }).sort((a, b) => b.trend_score - a.trend_score);
  }
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export { clamp01, round1 };
