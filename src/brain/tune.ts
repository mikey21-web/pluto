import type { ChatMsg, LlmCompletion, LlmDriver, ToolDef } from '../kernel/types.ts';

/** A registered model version scoped to a company+task with A/B + rollback. */
export interface TuneEntry {
  id: string;
  company_id: string;
  task_kind: string;
  model: string;
  version: number;
  active: boolean;
  fraction: number; // 0..1 traffic share when a/b testing
  rolled_out_at: string;
}

/**
 * C94 — Fine-tune Registry. Versioned custom model management per
 * company/task. Supports A/B (fraction of traffic to a candidate) and
 * rollback (moves `active` back to a previous version).
 */
export class TuneRegistry {
  private tunes: TuneEntry[] = [];

  register(c: { company_id: string; task_kind: string; model: string; active?: boolean; fraction?: number }): TuneEntry {
    const candidates = this.tunes.filter(t => t.company_id === c.company_id && t.task_kind === c.task_kind);
    const version = (candidates.at(-1)?.version ?? 0) + 1;
    const entry: TuneEntry = {
      id: `tune${version}_${(Date.now() % 9999).toString(36)}_${this.tunes.length}`,
      company_id: c.company_id, task_kind: c.task_kind, model: c.model,
      version, active: c.active ?? true, fraction: c.fraction ?? 1,
      rolled_out_at: new Date().toISOString(),
    };
    if (entry.active) for (const t of candidates) t.active = false;
    this.tunes.push(entry);
    return entry;
  }

  list(companyId?: string, taskKind?: string): TuneEntry[] {
    return this.tunes.filter(t => (!companyId || t.company_id === companyId) && (!taskKind || t.task_kind === taskKind));
  }

  /** Moves `active` back one version. Returns the now-active entry or null if none. */
  rollback(companyId: string, taskKind: string): TuneEntry | null {
    const rel = this.tunes.filter(t => t.company_id === companyId && t.task_kind === taskKind);
    const activeIdx = rel.findIndex(t => t.active);
    if (activeIdx < 0) return null;
    if (activeIdx === 0) return rel[0];
    rel[activeIdx].active = false;
    rel[activeIdx - 1].active = true;
    return rel[activeIdx - 1];
  }

  /** The version that should serve this company+task now (A/B by `fraction`). */
  activeFor(companyId: string, taskKind: string): TuneEntry | null {
    const rel = this.tunes.filter(t => t.company_id === companyId && t.task_kind === taskKind);
    if (!rel.length) return null;
    const active = rel.find(t => t.active);
    if (active) return active;
    const cands = rel.filter(t => t.fraction > 0 && t.fraction < 1);
    if (cands.length) return cands[Math.floor(Math.random() * cands.length)];
    return rel[rel.length - 1];
  }
}

/**
 * Multi-provider fallback (Claude → GPT → DeepSeek → local). Each provider is
 * an LlmDriver; the first that succeeds wins, others are recorded as failed.
 */
export class FallbackChain implements LlmDriver {
  model = 'fallback-chain';
  private providers: Array<{ driver: LlmDriver; name: string }>;
  private failures: string[] = [];

  constructor(providers: Array<{ driver: LlmDriver; name: string }>) {
    this.providers = providers;
  }

  async complete(msgs: ChatMsg[], tools?: ToolDef[]): Promise<LlmCompletion> {
    let lastErr: unknown;
    for (const { driver, name } of this.providers) {
      try {
        const comp = await driver.complete(msgs, tools);
        this.failures = []; // a clean success resets the record
        return comp;
      } catch (e) {
        this.failures.push(name);
        lastErr = e;
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error('all providers failed');
  }

  lastFailures(): string[] {
    return [...this.failures];
  }
}
