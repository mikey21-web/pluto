import { PlutoState } from '../kernel/state.ts';
import { newId, now } from '../kernel/types.ts';

// ── Rotating Sovereigns (C105) ─────────────────────────────────────────────────
// Multiple sovereigns rotate based on civilization state.

export type SovereignMode = 'peacetime' | 'wartime' | 'exploration' | 'consolidation';

export interface RotatingSovereign {
  id: string;
  name: string;
  mode: SovereignMode;
  active: boolean;
  activation_condition: string;  // when this sovereign takes over
  deactivation_condition: string;
  activated_at: string | null;
  deactivated_at: string | null;
  created_at: string;
}

// ── Meta-Meta Recursion (C106) ────────────────────────────────────────────────
// Meta-agents spawn meta-agents; tool synthesizers generate tool synthesizers.

export interface MetaSpawn {
  id: string;
  parent_meta_id: string;
  child_meta_id: string;
  depth: number;       // how many levels deep (1 = meta spawns meta, 2 = meta-meta spawns meta-meta-meta...)
  purpose: string;
  spawned_at: string;
}

// ── Cross-Modality (C108) ─────────────────────────────────────────────────────

export type Modality = 'text' | 'image' | 'audio' | 'spatial' | 'temporal' | 'mathematical' | 'code';

export interface CrossModalBridge {
  id: string;
  company_id: string;
  from_modality: Modality;
  to_modality: Modality;
  transformation: string;  // how to convert (e.g. "image → structured JSON via vision model")
  protocol: string;        // inter-agent protocol for this bridge
  created_at: string;
}

// ── The Watcher (C83) ─────────────────────────────────────────────────────────

export interface WatcherReport {
  id: string;
  period_start: string;
  period_end: string;
  invisible_patterns: string[];  // things no one else noticed
  recommendations: string[];
  mood: string;
  ts: string;
}

// ── Speculative Fiction (C84) ─────────────────────────────────────────────────

export interface SpeculativeFiction {
  id: string;
  company_id: string;
  title: string;
  premise: string;      // "What if competitor X releases Y?"
  narrative: string;    // the speculative story
  lessons: string[];    // what to learn / avoid groupthink
  ts: string;
}

// ── Civilization Jokes (C74) ──────────────────────────────────────────────────

export interface CivJoke {
  id: string;
  setup: string;
  punchline: string;
  context: string;   // what event/situation spawned this
  preserved: boolean;
  ts: string;
}

export class SpeculativeEngine {
  private state: PlutoState;
  constructor(state: PlutoState) { this.state = state; }

  // ── Rotating Sovereigns ───────────────────────────────────────────────────

  registerSovereign(name: string, mode: SovereignMode, activationCondition: string,
                    deactivationCondition: string): RotatingSovereign {
    const rs: RotatingSovereign = {
      id: newId('rsov'),
      name,
      mode,
      active: false,
      activation_condition: activationCondition,
      deactivation_condition: deactivationCondition,
      activated_at: null,
      deactivated_at: null,
      created_at: now(),
    };
    this.state.remember('__global__', JSON.stringify(rs), {
      type: 'strategic', source: 'speculative.sovereign',
      tags: ['rsov', rs.id, mode, 'inactive'],
    });
    return rs;
  }

  activateSovereign(sovereignId: string): boolean {
    // deactivate all others first
    const allRows = this.state.repos.memory('__global__', 'strategic', 100)
      .filter(r => r.source === 'speculative.sovereign' && (r.tags as string[])[3] === 'active');
    for (const row of allRows) {
      const s: RotatingSovereign = JSON.parse(row.content);
      s.active = false;
      s.deactivated_at = now();
      const tags: string[] = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags;
      tags[3] = 'inactive';
      this.state.store.db.prepare(`UPDATE memory SET content=?, tags=?, ts=? WHERE id=?`)
        .run(JSON.stringify(s), JSON.stringify(tags), now(), row.id);
    }
    const row = this._sovereignRow(sovereignId);
    if (!row) return false;
    const s: RotatingSovereign = JSON.parse(row.content);
    s.active = true;
    s.activated_at = now();
    const tags: string[] = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags;
    tags[3] = 'active';
    this.state.store.db.prepare(`UPDATE memory SET content=?, tags=?, ts=? WHERE id=?`)
      .run(JSON.stringify(s), JSON.stringify(tags), now(), row.id);
    return true;
  }

  activeSovereign(): RotatingSovereign | null {
    const row = this.state.repos.memory('__global__', 'strategic', 100)
      .find(r => r.source === 'speculative.sovereign' && (r.tags as string[])[3] === 'active');
    return row ? JSON.parse(row.content) : null;
  }

  sovereigns(): RotatingSovereign[] {
    return this.state.repos.memory('__global__', 'strategic', 100)
      .filter(r => r.source === 'speculative.sovereign')
      .map(r => JSON.parse(r.content) as RotatingSovereign);
  }

  // ── Meta-Meta Recursion ───────────────────────────────────────────────────

  spawnMeta(parentMetaId: string, childMetaId: string, purpose: string): MetaSpawn {
    // compute depth: parent depth + 1
    const parentSpawn = this.state.repos.memory('__global__', 'episodic', 200)
      .filter(r => r.source === 'speculative.meta_spawn')
      .map(r => JSON.parse(r.content) as MetaSpawn)
      .find(s => s.child_meta_id === parentMetaId);
    const depth = (parentSpawn?.depth ?? 0) + 1;

    const spawn: MetaSpawn = { id: newId('msp'), parent_meta_id: parentMetaId, child_meta_id: childMetaId, depth, purpose, spawned_at: now() };
    this.state.remember('__global__', JSON.stringify(spawn), {
      type: 'episodic', source: 'speculative.meta_spawn',
      tags: ['meta_spawn', spawn.id, parentMetaId, childMetaId, String(depth)],
    });
    return spawn;
  }

  metaSpawns(parentId?: string): MetaSpawn[] {
    return this.state.repos.memory('__global__', 'episodic', 200)
      .filter(r => r.source === 'speculative.meta_spawn')
      .filter(r => !parentId || (r.tags as string[])[2] === parentId)
      .map(r => JSON.parse(r.content) as MetaSpawn);
  }

  // ── Cross-Modality ────────────────────────────────────────────────────────

  bridgeModalities(companyId: string, from: Modality, to: Modality,
                   transformation: string, protocol: string): CrossModalBridge {
    const bridge: CrossModalBridge = {
      id: newId('cmb'),
      company_id: companyId,
      from_modality: from,
      to_modality: to,
      transformation,
      protocol,
      created_at: now(),
    };
    this.state.remember(companyId, JSON.stringify(bridge), {
      type: 'procedural', source: 'speculative.modal_bridge',
      tags: ['bridge', bridge.id, from, to],
    });
    return bridge;
  }

  bridges(companyId: string): CrossModalBridge[] {
    return this.state.repos.memory(companyId, 'procedural', 100)
      .filter(r => r.source === 'speculative.modal_bridge')
      .map(r => JSON.parse(r.content) as CrossModalBridge);
  }

  // ── The Watcher ───────────────────────────────────────────────────────────

  watcherReport(periodStart: string, periodEnd: string, invisiblePatterns: string[],
                recommendations: string[], mood: string): WatcherReport {
    const wr: WatcherReport = {
      id: newId('wch'),
      period_start: periodStart,
      period_end: periodEnd,
      invisible_patterns: invisiblePatterns,
      recommendations,
      mood,
      ts: now(),
    };
    this.state.remember('__global__', JSON.stringify(wr), {
      type: 'episodic', source: 'speculative.watcher',
      tags: ['watcher', wr.id, periodStart, periodEnd],
    });
    return wr;
  }

  watcherReports(limit = 12): WatcherReport[] {
    return this.state.repos.memory('__global__', 'episodic', limit * 2)
      .filter(r => r.source === 'speculative.watcher')
      .slice(0, limit)
      .map(r => JSON.parse(r.content) as WatcherReport);
  }

  // ── Speculative Fiction ───────────────────────────────────────────────────

  writeSpecFic(companyId: string, title: string, premise: string, narrative: string,
               lessons: string[]): SpeculativeFiction {
    const sf: SpeculativeFiction = { id: newId('sf'), company_id: companyId, title, premise, narrative, lessons, ts: now() };
    this.state.remember(companyId, JSON.stringify(sf), {
      type: 'episodic', source: 'speculative.fiction',
      tags: ['fiction', sf.id, companyId],
    });
    return sf;
  }

  specFictions(companyId: string): SpeculativeFiction[] {
    return this.state.repos.memory(companyId, 'episodic', 100)
      .filter(r => r.source === 'speculative.fiction')
      .map(r => JSON.parse(r.content) as SpeculativeFiction);
  }

  // ── Civilization Jokes ────────────────────────────────────────────────────

  logJoke(setup: string, punchline: string, context: string): CivJoke {
    const joke: CivJoke = { id: newId('jk'), setup, punchline, context, preserved: true, ts: now() };
    this.state.remember('__global__', JSON.stringify(joke), {
      type: 'episodic', source: 'speculative.joke',
      tags: ['joke', joke.id, 'preserved'],
    });
    return joke;
  }

  jokes(limit = 20): CivJoke[] {
    return this.state.repos.memory('__global__', 'episodic', limit * 2)
      .filter(r => r.source === 'speculative.joke')
      .slice(0, limit)
      .map(r => JSON.parse(r.content) as CivJoke);
  }

  status(): Record<string, number> {
    const rows = this.state.store.db
      .prepare(`SELECT source, COUNT(*) as cnt FROM memory WHERE active=1 AND source LIKE 'speculative.%' GROUP BY source`)
      .all() as { source: string; cnt: number }[];
    return Object.fromEntries(rows.map(r => [r.source.replace('speculative.', ''), r.cnt]));
  }

  private _sovereignRow(id: string) {
    return this.state.repos.memory('__global__', 'strategic', 100)
      .find(r => r.source === 'speculative.sovereign' && (r.tags as string[])[1] === id) ?? null;
  }
}
