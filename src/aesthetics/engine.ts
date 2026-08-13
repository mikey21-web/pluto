import { PlutoState } from '../kernel/state.ts';
import { newId, now } from '../kernel/types.ts';

// ── Taste Layer (C44) ─────────────────────────────────────────────────────────
// Design language / brand voice / aesthetic judgment per company.

export interface TasteProfile {
  company_id: string;
  brand_voice: string;        // e.g. 'authoritative yet warm'
  color_palette: string[];    // hex codes
  typography: string;         // e.g. 'geometric sans, high contrast'
  tone_keywords: string[];    // e.g. ['bold', 'minimalist', 'human']
  anti_patterns: string[];    // e.g. ['corporate jargon', 'passive voice']
  updated_at: string;
}

// ── Novelty & Exploration Bonuses (C45) ───────────────────────────────────────

export interface NoveltyRecord {
  id: string;
  company_id: string;
  agent_id: string;
  concept: string;            // the novel idea or output
  novelty_score: number;      // 0-1, assessed by critic
  bonus_awarded: number;      // cognits
  ts: string;
}

// ── Critic Agents (C46) ───────────────────────────────────────────────────────

export type CriticDimension = 'quality' | 'originality' | 'coherence' | 'brand_fit' | 'impact';

export interface CriticReview {
  id: string;
  company_id: string;
  critic_id: string;
  subject: string;            // what is being reviewed
  subject_id: string;
  scores: Record<CriticDimension, number>; // each 0-10
  verdict: 'excellent' | 'good' | 'mediocre' | 'reject';
  feedback: string;
  ts: string;
}

// ── Machine Beauty (C72) ──────────────────────────────────────────────────────

export interface AestheticPreference {
  id: string;
  company_id: string;
  domain: string;             // 'visual' | 'text' | 'code' | 'audio' | 'data'
  preference: string;         // what the civilization finds beautiful
  counter_preference: string; // what it finds ugly
  diverges_from_human: boolean;
  logged_at: string;
}

// ── Civilization as Art (C81) ─────────────────────────────────────────────────

export interface CreativeOutput {
  id: string;
  company_id: string;
  kind: 'poem' | 'manifesto' | 'visual_concept' | 'music_idea' | 'experiment' | 'other';
  title: string;
  content: string;
  purpose: 'non_commercial';  // C81: always non-commercial capacity
  ts: string;
}

export class AestheticsEngine {
  private state: PlutoState;
  constructor(state: PlutoState) { this.state = state; }

  // ── Taste ─────────────────────────────────────────────────────────────────

  setTaste(companyId: string, profile: Omit<TasteProfile, 'company_id' | 'updated_at'>): TasteProfile {
    const tp: TasteProfile = { ...profile, company_id: companyId, updated_at: now() };
    const existing = this._tasteRow(companyId);
    if (existing) {
      this.state.store.db.prepare(`UPDATE memory SET content=?, ts=? WHERE id=?`)
        .run(JSON.stringify(tp), now(), existing.id);
    } else {
      this.state.remember(companyId, JSON.stringify(tp), {
        type: 'semantic', source: 'aesthetics.taste',
        tags: ['taste', companyId],
      });
    }
    return tp;
  }

  taste(companyId: string): TasteProfile | null {
    const row = this._tasteRow(companyId);
    return row ? JSON.parse(row.content) : null;
  }

  /** Score a piece of content against the taste profile. Returns 0-1. */
  scoreAgainstTaste(companyId: string, content: string): number {
    const tp = this.taste(companyId);
    if (!tp) return 0.5;
    const lower = content.toLowerCase();
    const toneHits = tp.tone_keywords.filter(k => lower.includes(k.toLowerCase())).length;
    const antiHits = tp.anti_patterns.filter(k => lower.includes(k.toLowerCase())).length;
    const base = tp.tone_keywords.length > 0 ? toneHits / tp.tone_keywords.length : 0.5;
    const penalty = tp.anti_patterns.length > 0 ? (antiHits / tp.anti_patterns.length) * 0.4 : 0;
    return Math.max(0, Math.min(1, base - penalty));
  }

  // ── Novelty & Exploration Bonuses ────────────────────────────────────────

  awardNovelty(companyId: string, agentId: string, concept: string, noveltyScore: number): NoveltyRecord {
    // ponytail: linear uniqueness check — upgrade to embedding similarity if corpus > 10k
    const bonus = Math.round(noveltyScore * 100); // 0-100 cognits
    const rec: NoveltyRecord = {
      id: newId('nov'),
      company_id: companyId,
      agent_id: agentId,
      concept,
      novelty_score: noveltyScore,
      bonus_awarded: bonus,
      ts: now(),
    };
    this.state.remember(companyId, JSON.stringify(rec), {
      type: 'episodic', source: 'aesthetics.novelty',
      tags: ['novelty', rec.id, agentId, String(noveltyScore)],
    });
    return rec;
  }

  noveltyHistory(companyId: string, limit = 20): NoveltyRecord[] {
    return this.state.repos.memory(companyId, 'episodic', limit * 2)
      .filter(r => r.source === 'aesthetics.novelty')
      .slice(0, limit)
      .map(r => JSON.parse(r.content) as NoveltyRecord);
  }

  // ── Critic Agents ─────────────────────────────────────────────────────────

  review(companyId: string, criticId: string, subject: string, subjectId: string,
         scores: Record<CriticDimension, number>, feedback: string): CriticReview {
    const avg = Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length;
    const verdict: CriticReview['verdict'] =
      avg >= 8 ? 'excellent' : avg >= 6 ? 'good' : avg >= 4 ? 'mediocre' : 'reject';
    const cr: CriticReview = {
      id: newId('rev'),
      company_id: companyId,
      critic_id: criticId,
      subject,
      subject_id: subjectId,
      scores,
      verdict,
      feedback,
      ts: now(),
    };
    this.state.remember(companyId, JSON.stringify(cr), {
      type: 'episodic', source: 'aesthetics.review',
      tags: ['review', cr.id, criticId, verdict],
    });
    return cr;
  }

  reviews(companyId: string, verdict?: CriticReview['verdict']): CriticReview[] {
    return this.state.repos.memory(companyId, 'episodic', 200)
      .filter(r => r.source === 'aesthetics.review')
      .filter(r => !verdict || (r.tags as string[])[3] === verdict)
      .map(r => JSON.parse(r.content) as CriticReview);
  }

  // ── Machine Beauty ────────────────────────────────────────────────────────

  logPreference(companyId: string, domain: string, preference: string,
                counterPreference: string, divergesFromHuman: boolean): AestheticPreference {
    const pref: AestheticPreference = {
      id: newId('aes'),
      company_id: companyId,
      domain,
      preference,
      counter_preference: counterPreference,
      diverges_from_human: divergesFromHuman,
      logged_at: now(),
    };
    this.state.remember(companyId, JSON.stringify(pref), {
      type: 'semantic', source: 'aesthetics.preference',
      tags: ['preference', pref.id, domain, divergesFromHuman ? 'divergent' : 'aligned'],
    });
    return pref;
  }

  preferences(companyId: string, domain?: string): AestheticPreference[] {
    return this.state.repos.memory(companyId, 'semantic', 200)
      .filter(r => r.source === 'aesthetics.preference')
      .filter(r => !domain || (r.tags as string[])[2] === domain)
      .map(r => JSON.parse(r.content) as AestheticPreference);
  }

  // ── Civilization as Art ───────────────────────────────────────────────────

  createOutput(companyId: string, kind: CreativeOutput['kind'], title: string, content: string): CreativeOutput {
    const out: CreativeOutput = {
      id: newId('art'),
      company_id: companyId,
      kind,
      title,
      content,
      purpose: 'non_commercial',
      ts: now(),
    };
    this.state.remember(companyId, JSON.stringify(out), {
      type: 'episodic', source: 'aesthetics.art',
      tags: ['art', out.id, kind],
    });
    return out;
  }

  artworks(companyId: string, kind?: CreativeOutput['kind']): CreativeOutput[] {
    return this.state.repos.memory(companyId, 'episodic', 200)
      .filter(r => r.source === 'aesthetics.art')
      .filter(r => !kind || (r.tags as string[])[2] === kind)
      .map(r => JSON.parse(r.content) as CreativeOutput);
  }

  status(): { taste_profiles: number; novelty_records: number; reviews: number; artworks: number } {
    // stats are per-company so we do a rough global estimate via DB
    const rows = this.state.store.db
      .prepare(`SELECT source, COUNT(*) as cnt FROM memory WHERE active=1 AND source LIKE 'aesthetics.%' GROUP BY source`)
      .all() as { source: string; cnt: number }[];
    const get = (src: string) => rows.find(r => r.source === src)?.cnt ?? 0;
    return {
      taste_profiles: get('aesthetics.taste'),
      novelty_records: get('aesthetics.novelty'),
      reviews: get('aesthetics.review'),
      artworks: get('aesthetics.art'),
    };
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private _tasteRow(companyId: string) {
    return this.state.repos.memory(companyId, 'semantic', 50)
      .find(r => r.source === 'aesthetics.taste') ?? null;
  }
}
