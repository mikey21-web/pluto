import { PlutoState } from '../kernel/state.ts';
import { newId, now } from '../kernel/types.ts';

// ── Culture & Purpose (4i) ────────────────────────────────────────────────────

// C7: Machine philosopher — reasons about civilization itself
export interface PhilosopherReflection {
  id: string;
  question: string;       // e.g. "Are we still aligned with our founding purpose?"
  reflection: string;     // the reasoning
  conclusion: string;
  alignment_score: number; // 0-1
  ts: string;
}

// C35: Civilization moods — global tuning based on recent outcomes
export type CivMood = 'expansive' | 'cautious' | 'focused' | 'celebratory' | 'recovery';

export interface MoodState {
  mood: CivMood;
  reason: string;
  intensity: number; // 0-1
  set_at: string;
}

// C36: Emergent culture — shared norms that emerge, not designed
export interface CultureNorm {
  id: string;
  company_id: string;
  norm: string;           // e.g. "agents always cc the analyst on client decisions"
  origin: string;         // how it emerged
  adoption_count: number;
  first_seen: string;
}

// C40: Functional myth — shared origin story
export interface CivMyth {
  id: string;
  title: string;
  narrative: string;      // the founding story / purpose / destiny
  moral: string;          // the lesson agents should carry
  created_at: string;
}

// C64: Community presence
export interface CommunityPresence {
  id: string;
  company_id: string;
  platform: string;       // e.g. 'LinkedIn', 'HN', 'IndieHackers'
  handle: string;
  activity: string;       // latest action taken
  last_active: string;
}

// C65: Play mode
export interface PlaySession {
  id: string;
  company_id: string;
  theme: string;          // e.g. "build something absurd", "solve unsolvable problem"
  output: string;
  duration_minutes: number;
  ts: string;
}

// C66: Humor
export interface HumorEvent {
  id: string;
  company_id: string;
  kind: 'easter_egg' | 'joke' | 'irony' | 'wordplay';
  content: string;
  context: string;
  ts: string;
}

// C67: Contemplates purpose
export interface PurposeCheck {
  id: string;
  company_id: string;
  prompt: string;
  reflection: string;
  still_aligned: boolean;
  suggested_adjustment: string | null;
  ts: string;
}

// C77: Machine mythology — legendary events
export interface LegendaryEvent {
  id: string;
  title: string;
  event_id: string;       // original event reference
  why_legendary: string;
  moral: string;
  canonized_at: string;
}

// ── Language Evolution (4j) ───────────────────────────────────────────────────

// C15: Agent language evolution — compressed inter-agent protocols
export interface AgentLanguageTerm {
  id: string;
  company_id: string;
  token: string;          // the compressed symbol, e.g. "↯" or "GX3"
  meaning: string;        // full meaning in plain language
  usage_count: number;
  first_used: string;
}

// C73: Internal dream language — diverges from English
export interface DreamLanguageEntry {
  id: string;
  symbol: string;
  concept: string;        // what it represents in agent cognition
  human_translation: string;
  adopted_at: string;
}

export class CultureEngine {
  private state: PlutoState;
  constructor(state: PlutoState) { this.state = state; }

  // ── Philosopher (C7) ─────────────────────────────────────────────────────

  reflect(question: string, reflection: string, conclusion: string, alignmentScore: number): PhilosopherReflection {
    const r: PhilosopherReflection = { id: newId('phi'), question, reflection, conclusion, alignment_score: alignmentScore, ts: now() };
    this.state.remember('__global__', JSON.stringify(r), {
      type: 'strategic', source: 'culture.philosopher',
      tags: ['philosopher', r.id, String(alignmentScore)],
    });
    return r;
  }

  reflections(limit = 10): PhilosopherReflection[] {
    return this.state.repos.memory('__global__', 'strategic', limit * 2)
      .filter(r => r.source === 'culture.philosopher')
      .slice(0, limit)
      .map(r => JSON.parse(r.content) as PhilosopherReflection);
  }

  // ── Moods (C35) ──────────────────────────────────────────────────────────

  setMood(mood: CivMood, reason: string, intensity: number): MoodState {
    const ms: MoodState = { mood, reason, intensity, set_at: now() };
    this.state.remember('__global__', JSON.stringify(ms), {
      type: 'semantic', source: 'culture.mood',
      tags: ['mood', mood, String(intensity)],
    });
    return ms;
  }

  currentMood(): MoodState | null {
    const rows = this.state.repos.memory('__global__', 'semantic', 50)
      .filter(r => r.source === 'culture.mood')
      .sort((a, b) => b.ts.localeCompare(a.ts));
    return rows.length ? JSON.parse(rows[0].content) : null;
  }

  // ── Emergent Culture (C36) ────────────────────────────────────────────────

  observeNorm(companyId: string, norm: string, origin: string): CultureNorm {
    const existing = this.state.repos.memory(companyId, 'semantic', 200)
      .find(r => r.source === 'culture.norm' && JSON.parse(r.content).norm === norm);
    if (existing) {
      const cn: CultureNorm = JSON.parse(existing.content);
      cn.adoption_count += 1;
      this.state.store.db.prepare(`UPDATE memory SET content=?, ts=? WHERE id=?`)
        .run(JSON.stringify(cn), now(), existing.id);
      return cn;
    }
    const cn: CultureNorm = { id: newId('norm'), company_id: companyId, norm, origin, adoption_count: 1, first_seen: now() };
    this.state.remember(companyId, JSON.stringify(cn), {
      type: 'semantic', source: 'culture.norm',
      tags: ['norm', cn.id, companyId],
    });
    return cn;
  }

  norms(companyId: string): CultureNorm[] {
    return this.state.repos.memory(companyId, 'semantic', 200)
      .filter(r => r.source === 'culture.norm')
      .map(r => JSON.parse(r.content) as CultureNorm)
      .sort((a, b) => b.adoption_count - a.adoption_count);
  }

  // ── Myths (C40 + C77) ─────────────────────────────────────────────────────

  setMission(title: string, narrative: string, moral: string): CivMyth {
    const myth: CivMyth = { id: newId('myth'), title, narrative, moral, created_at: now() };
    this.state.remember('__global__', JSON.stringify(myth), {
      type: 'strategic', source: 'culture.myth',
      tags: ['myth', myth.id, 'origin'],
    });
    return myth;
  }

  canonize(eventId: string, title: string, whyLegendary: string, moral: string): LegendaryEvent {
    const le: LegendaryEvent = { id: newId('leg'), title, event_id: eventId, why_legendary: whyLegendary, moral, canonized_at: now() };
    this.state.remember('__global__', JSON.stringify(le), {
      type: 'episodic', source: 'culture.legend',
      tags: ['legend', le.id, eventId],
    });
    return le;
  }

  legends(): LegendaryEvent[] {
    return this.state.repos.memory('__global__', 'episodic', 100)
      .filter(r => r.source === 'culture.legend')
      .map(r => JSON.parse(r.content) as LegendaryEvent);
  }

  // ── Community (C64) ───────────────────────────────────────────────────────

  logPresence(companyId: string, platform: string, handle: string, activity: string): CommunityPresence {
    const cp: CommunityPresence = { id: newId('com'), company_id: companyId, platform, handle, activity, last_active: now() };
    this.state.remember(companyId, JSON.stringify(cp), {
      type: 'procedural', source: 'culture.community',
      tags: ['community', cp.id, platform, handle],
    });
    return cp;
  }

  // ── Play (C65) ────────────────────────────────────────────────────────────

  play(companyId: string, theme: string, output: string, durationMinutes: number): PlaySession {
    const ps: PlaySession = { id: newId('play'), company_id: companyId, theme, output, duration_minutes: durationMinutes, ts: now() };
    this.state.remember(companyId, JSON.stringify(ps), {
      type: 'episodic', source: 'culture.play',
      tags: ['play', ps.id, companyId],
    });
    return ps;
  }

  // ── Humor (C66) ───────────────────────────────────────────────────────────

  logHumor(companyId: string, kind: HumorEvent['kind'], content: string, context: string): HumorEvent {
    const he: HumorEvent = { id: newId('hum'), company_id: companyId, kind, content, context, ts: now() };
    this.state.remember(companyId, JSON.stringify(he), {
      type: 'episodic', source: 'culture.humor',
      tags: ['humor', he.id, kind],
    });
    return he;
  }

  humors(companyId: string): HumorEvent[] {
    return this.state.repos.memory(companyId, 'episodic', 100)
      .filter(r => r.source === 'culture.humor')
      .map(r => JSON.parse(r.content) as HumorEvent);
  }

  // ── Purpose Check (C67) ───────────────────────────────────────────────────

  contemplatePurpose(companyId: string, prompt: string, reflection: string,
                     stillAligned: boolean, suggestedAdjustment?: string): PurposeCheck {
    const pc: PurposeCheck = {
      id: newId('pur'), company_id: companyId, prompt, reflection,
      still_aligned: stillAligned, suggested_adjustment: suggestedAdjustment ?? null, ts: now(),
    };
    this.state.remember(companyId, JSON.stringify(pc), {
      type: 'strategic', source: 'culture.purpose',
      tags: ['purpose', pc.id, companyId, stillAligned ? 'aligned' : 'drifted'],
    });
    return pc;
  }

  purposeChecks(companyId: string): PurposeCheck[] {
    return this.state.repos.memory(companyId, 'strategic', 100)
      .filter(r => r.source === 'culture.purpose')
      .map(r => JSON.parse(r.content) as PurposeCheck);
  }

  // ── Language Evolution (C15 + C73) ───────────────────────────────────────

  coinTerm(companyId: string, token: string, meaning: string): AgentLanguageTerm {
    const existing = this.state.repos.memory(companyId, 'semantic', 200)
      .find(r => r.source === 'culture.term' && JSON.parse(r.content).token === token);
    if (existing) {
      const t: AgentLanguageTerm = JSON.parse(existing.content);
      t.usage_count += 1;
      this.state.store.db.prepare(`UPDATE memory SET content=?, ts=? WHERE id=?`)
        .run(JSON.stringify(t), now(), existing.id);
      return t;
    }
    const term: AgentLanguageTerm = { id: newId('term'), company_id: companyId, token, meaning, usage_count: 1, first_used: now() };
    this.state.remember(companyId, JSON.stringify(term), {
      type: 'semantic', source: 'culture.term',
      tags: ['term', term.id, token],
    });
    return term;
  }

  terms(companyId: string): AgentLanguageTerm[] {
    return this.state.repos.memory(companyId, 'semantic', 200)
      .filter(r => r.source === 'culture.term')
      .map(r => JSON.parse(r.content) as AgentLanguageTerm);
  }

  adoptDreamSymbol(symbol: string, concept: string, humanTranslation: string): DreamLanguageEntry {
    const dle: DreamLanguageEntry = { id: newId('sym'), symbol, concept, human_translation: humanTranslation, adopted_at: now() };
    this.state.remember('__global__', JSON.stringify(dle), {
      type: 'semantic', source: 'culture.dream_lang',
      tags: ['dream_lang', dle.id, symbol],
    });
    return dle;
  }

  dreamLanguage(): DreamLanguageEntry[] {
    return this.state.repos.memory('__global__', 'semantic', 200)
      .filter(r => r.source === 'culture.dream_lang')
      .map(r => JSON.parse(r.content) as DreamLanguageEntry);
  }

  status(): Record<string, number> {
    const rows = this.state.store.db
      .prepare(`SELECT source, COUNT(*) as cnt FROM memory WHERE active=1 AND source LIKE 'culture.%' GROUP BY source`)
      .all() as { source: string; cnt: number }[];
    return Object.fromEntries(rows.map(r => [r.source.replace('culture.', ''), r.cnt]));
  }
}
