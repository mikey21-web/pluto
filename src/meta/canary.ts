export const CANARY_STAGES = [0.05, 0.1, 0.5, 1] as const;
export type CanaryStage = (typeof CANARY_STAGES)[number];

export interface CanaryEntry {
  id: string;
  company_id: string;
  tool_name: string;
  version: number;
  stage: CanaryStage; // current traffic fraction
  stageIdx: number;
  status: 'canary' | 'live' | 'rolled_back';
  promoted_at: string | null;
}

/**
 * Canary deployment (PLAN 1c/1d). Staged traffic rollout for a synthesized
 * tool: 5% → 10% → 50% → 100%. A tool reaches `live` only at the full stage;
 * any promoter can roll back to the previous stage.
 */
export class CanaryDeploy {
  private entries: CanaryEntry[] = [];

  /** Register a new candidate at the first canary stage (5%). */
  start(c: { company_id: string; tool_name: string }): CanaryEntry {
    const version = this.entries.filter(e => e.company_id === c.company_id && e.tool_name === c.tool_name).length + 1;
    const entry: CanaryEntry = {
      id: `can_${c.tool_name}_${version}_${(Date.now() % 9999).toString(36)}`,
      company_id: c.company_id, tool_name: c.tool_name, version,
      stage: CANARY_STAGES[0], stageIdx: 0, status: 'canary', promoted_at: null,
    };
    this.entries.push(entry);
    return entry;
  }

  /** Advance to the next canary stage; at 100% the tool becomes `live`. */
  promote(id: string): CanaryEntry | null {
    const e = this.entries.find(x => x.id === id);
    if (!e || e.status === 'rolled_back') return null;
    if (e.stageIdx >= CANARY_STAGES.length - 1) {
      e.status = 'live';
      e.stage = 1;
      e.promoted_at = new Date().toISOString();
      return e;
    }
    e.stageIdx += 1;
    e.stage = CANARY_STAGES[e.stageIdx];
    return e;
  }

  /** Pull a canary back one stage (or to rollout start). */
  rollback(id: string): CanaryEntry | null {
    const e = this.entries.find(x => x.id === id);
    if (!e) return null;
    if (e.stageIdx > 0) {
      e.stageIdx -= 1;
      e.stage = CANARY_STAGES[e.stageIdx];
      e.status = 'canary';
    }
    return e;
  }

  /** Hard-stop a candidate entirely. */
  stop(id: string): CanaryEntry | null {
    const e = this.entries.find(x => x.id === id);
    if (!e) return null;
    e.status = 'rolled_back';
    return e;
  }

  list(companyId?: string): CanaryEntry[] {
    return this.entries.filter(e => !companyId || e.company_id === companyId);
  }

  /** Whether a tool name is fully live for a company. */
  isLive(companyId: string, toolName: string): boolean {
    const e = this.entries.filter(x => x.company_id === companyId && x.tool_name === toolName).at(-1);
    return e?.status === 'live';
  }

  /** Should this call get the new tool? Deterministic on a hash so a call sticks to one arm. */
  shouldServe(id: string, seed: string): boolean {
    const e = this.entries.find(x => x.id === id);
    if (!e || e.status === 'rolled_back') return false;
    if (e.status === 'live') return true;
    const bucket = (hash(seed) % 10000) / 10000;
    return bucket < e.stage;
  }
}

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
