import { PlutoState } from '../kernel/state.ts';
import { newId, now } from '../kernel/types.ts';

export interface FailureEntry {
  id: string;
  company_id: string;
  task_id: string | null;
  kind: string; // e.g. 'tool_error', 'agent_loop', 'integration', 'logic'
  summary: string;
  tags: string[];
  ts: string;
}

export interface RetiredAgent {
  id: string;
  original_agent_id: string;
  company_id: string;
  name: string;
  role: string;
  reason: string; // why retired
  status: 'oracle' | 'ancestor'; // oracle = read-only consultant, ancestor = revered
  retired_at: string;
  consulted_count: number;
}

export interface HistoryEntry {
  id: string;
  ts: string;
  summary: string;
  kind: 'milestone' | 'incident' | 'spawn' | 'death' | 'learning';
}

export interface EmergenceSignal {
  id: string;
  ts: string;
  pattern: string; // description of emergent behavior
  agents: string[];
  company_id: string;
  flagged: boolean;
  decision: 'keep' | 'kill' | 'study' | 'pending';
}

/**
 * Memory & Wisdom layer (PLAN 3d).
 *  - C4  Failure Museum: indexed searchable archive of failures
 *  - C32 Retirement pool: replaced agents preserved as read-only oracles
 *  - C76 Ancestor agents: revered retired agents, consultable with ritual
 *  - C33 Historian: writes and maintains civilization biography
 *  - C14 Emergence Detector: detects behaviors nobody programmed
 */
export class WisdomEngine {
  private state: PlutoState;

  constructor(state: PlutoState) {
    this.state = state;
  }

  // ---- C4 Failure Museum -------------------------------------------------------

  /** Archive a failure into the museum (tagged, indexed, queryable). */
  archiveFailure(c: { company_id: string; task_id?: string; kind: string; summary: string; tags?: string[] }): FailureEntry {
    const entry: FailureEntry = {
      id: newId('fm'), company_id: c.company_id, task_id: c.task_id ?? null,
      kind: c.kind, summary: c.summary, tags: c.tags ?? [], ts: now(),
    };
    this.state.remember('__global__', entry.summary, {
      type: 'episodic', source: 'wisdom.failure_museum',
      tags: ['failure', entry.id, c.company_id, c.kind, ...(c.tags ?? [])],
    });
    this.state.emit(c.company_id, 'wisdom.failure_archived', c.task_id ?? null, 'task', { failure_id: entry.id, kind: c.kind });
    return entry;
  }

  /** Query the failure museum. Optionally filter by kind or tag. */
  queryMuseum(opts: { kind?: string; tag?: string; limit?: number } = {}): FailureEntry[] {
    return this.state.repos.memory('__global__', 'episodic', opts.limit ?? 100)
      .filter(m => m.source === 'wisdom.failure_museum')
      .filter(m => !opts.kind || (m.tags as string[])?.includes(opts.kind))
      .filter(m => !opts.tag || (m.tags as string[])?.includes(opts.tag))
      .map(m => {
        const tags = (m.tags as string[]) ?? [];
        return {
          id: tags[1] ?? m.id, company_id: tags[2] ?? m.company_id,
          task_id: null, kind: tags[3] ?? 'unknown',
          summary: m.content, tags: tags.slice(4), ts: m.ts,
        };
      });
  }

  // ---- C32 Retirement Pool -----------------------------------------------------

  /** Retire an agent into the oracle pool (read-only, consultable). */
  retireAgent(c: { agent_id: string; company_id: string; name: string; role: string; reason: string }): RetiredAgent {
    const retired: RetiredAgent = {
      id: newId('ret'), original_agent_id: c.agent_id, company_id: c.company_id,
      name: c.name, role: c.role, reason: c.reason, status: 'oracle',
      retired_at: now(), consulted_count: 0,
    };
    this.state.remember('__global__', `Retired oracle: ${c.name} (${c.role}) — ${c.reason}`, {
      type: 'semantic', source: 'wisdom.retirement_pool',
      tags: ['retired', retired.id, c.agent_id, c.company_id, c.role, 'oracle'],
    });
    this.state.emit(c.company_id, 'wisdom.agent_retired', c.agent_id, 'agent', { retired_id: retired.id, role: c.role });
    return retired;
  }

  /** Consult a retired oracle (returns their stored wisdom). */
  consultOracle(retiredId: string): { wisdom: string[]; agent: RetiredAgent | null } {
    const mem = this.state.repos.memory('__global__', 'semantic', 200)
      .find(m => m.source === 'wisdom.retirement_pool' && (m.tags as string[])?.includes(retiredId));
    if (!mem) return { wisdom: [], agent: null };
    const tags = (mem.tags as string[]) ?? [];
    const agentId = tags[2];
    const companyId = tags[3];
    // Gather episodic memory this agent wrote during its life
    const agentWisdom = this.state.repos.memory(companyId, 'procedural', 100)
      .filter(m => m.owner === agentId).map(m => m.content).slice(0, 20);
    const agent: RetiredAgent = {
      id: retiredId, original_agent_id: agentId, company_id: companyId,
      name: mem.content.split(':')[1]?.trim().split('(')[0]?.trim() ?? 'Unknown',
      role: tags[4] ?? 'unknown', reason: '', status: tags[5] as RetiredAgent['status'] ?? 'oracle',
      retired_at: mem.ts, consulted_count: 0,
    };
    return { wisdom: agentWisdom, agent };
  }

  /** List all retired oracles. */
  oracles(): RetiredAgent[] {
    return this.state.repos.memory('__global__', 'semantic', 200)
      .filter(m => m.source === 'wisdom.retirement_pool')
      .map(m => {
        const tags = (m.tags as string[]) ?? [];
        return {
          id: tags[1] ?? m.id, original_agent_id: tags[2] ?? '', company_id: tags[3] ?? '',
          name: m.content, role: tags[4] ?? 'unknown',
          reason: '', status: (tags[5] ?? 'oracle') as RetiredAgent['status'],
          retired_at: m.ts, consulted_count: 0,
        };
      });
  }

  // ---- C76 Ancestor Agents (extends retirement pool with ritual) ---------------

  /** Elevate a retired oracle to ancestor status (revered, consulted in high-stakes decisions). */
  elevateToAncestor(retiredId: string): boolean {
    const mem = this.state.repos.memory('__global__', 'semantic', 200)
      .find(m => m.source === 'wisdom.retirement_pool' && (m.tags as string[])?.includes(retiredId));
    if (!mem) return false;
    const tags = [...(mem.tags as string[])];
    tags[5] = 'ancestor';
    this.state.remember('__global__', mem.content, {
      type: 'semantic', source: 'wisdom.retirement_pool', tags,
    });
    this.state.emit(mem.company_id, 'wisdom.agent_elevated_ancestor', retiredId, 'agent', { retired_id: retiredId });
    return true;
  }

  /** List all ancestors (subset of oracles). */
  ancestors(): RetiredAgent[] {
    return this.oracles().filter(o => o.status === 'ancestor');
  }

  // ---- C33 Historian Agent -----------------------------------------------------

  /** Record a civilization event into the biography. */
  recordHistory(c: { summary: string; kind: HistoryEntry['kind']; company_id?: string }): HistoryEntry {
    const entry: HistoryEntry = { id: newId('hist'), ts: now(), summary: c.summary, kind: c.kind };
    this.state.remember('__global__', c.summary, {
      type: 'episodic', source: 'wisdom.historian',
      tags: ['history', entry.id, c.kind, c.company_id ?? '__global__'],
    });
    return entry;
  }

  /** Produce the civilization biography (ordered history). */
  biography(limit = 50): HistoryEntry[] {
    return this.state.repos.memory('__global__', 'episodic', limit)
      .filter(m => m.source === 'wisdom.historian')
      .map(m => {
        const tags = (m.tags as string[]) ?? [];
        return { id: tags[1] ?? m.id, ts: m.ts, summary: m.content, kind: (tags[2] ?? 'milestone') as HistoryEntry['kind'] };
      })
      .sort((a, b) => a.ts.localeCompare(b.ts));
  }

  // ---- C14 Emergence Detector --------------------------------------------------

  /** Flag an emergent behavior pattern (spontaneous coordination nobody programmed). */
  flagEmergence(c: { company_id: string; pattern: string; agents: string[] }): EmergenceSignal {
    const signal: EmergenceSignal = {
      id: newId('emg'), ts: now(), pattern: c.pattern,
      agents: c.agents, company_id: c.company_id, flagged: true, decision: 'pending',
    };
    this.state.remember('__global__', `Emergence: ${c.pattern}`, {
      type: 'episodic', source: 'wisdom.emergence',
      tags: ['emergence', signal.id, c.company_id, 'pending', ...c.agents],
    });
    this.state.emit(c.company_id, 'wisdom.emergence_detected', null, null, { emergence_id: signal.id, pattern: c.pattern });
    return signal;
  }

  /** Decide what to do with an emergent signal. */
  decideEmergence(signalId: string, decision: EmergenceSignal['decision']): boolean {
    const mem = this.state.repos.memory('__global__', 'episodic', 200)
      .find(m => m.source === 'wisdom.emergence' && (m.tags as string[])?.includes(signalId));
    if (!mem) return false;
    const tags = [...(mem.tags as string[])];
    tags[3] = decision;
    this.state.remember('__global__', mem.content, {
      type: 'episodic', source: 'wisdom.emergence', tags,
    });
    this.state.emit(mem.company_id ?? '__global__', 'wisdom.emergence_decided', signalId, null, { decision });
    return true;
  }

  /** List flagged emergence signals. */
  emergenceSignals(decision?: EmergenceSignal['decision']): EmergenceSignal[] {
    return this.state.repos.memory('__global__', 'episodic', 200)
      .filter(m => m.source === 'wisdom.emergence')
      .filter(m => !decision || (m.tags as string[])?.[3] === decision)
      .map(m => {
        const tags = (m.tags as string[]) ?? [];
        return {
          id: tags[1] ?? m.id, ts: m.ts, pattern: m.content.replace('Emergence: ', ''),
          agents: tags.slice(4), company_id: tags[2] ?? '__global__',
          flagged: true, decision: (tags[3] ?? 'pending') as EmergenceSignal['decision'],
        };
      });
  }

  // ---- Status ------------------------------------------------------------------
  status(): { failures: number; oracles: number; ancestors: number; history: number; emergence_pending: number } {
    return {
      failures: this.queryMuseum().length,
      oracles: this.oracles().length,
      ancestors: this.ancestors().length,
      history: this.biography().length,
      emergence_pending: this.emergenceSignals('pending').length,
    };
  }
}
