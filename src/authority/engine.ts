import { PlutoState } from '../kernel/state.ts';
import { newId, now } from '../kernel/types.ts';

export type VoteOption = string;
export interface Vote { agent_id: string; choice: VoteOption; weight: number; ts: string }
export interface Ballot {
  id: string;
  company_id: string;
  question: string;
  options: VoteOption[];
  votes: Vote[];
  status: 'open' | 'closed';
  result: VoteOption | null;
  created_at: string;
  closed_at: string | null;
}

export type CreditKind = 'cognit' | 'attention' | 'reputation' | 'compute' | 'trust';
export interface CreditAccount {
  entity_id: string;
  kind: CreditKind;
  balance: number;
}

export interface MetabolismSnapshot {
  company_id: string;
  ts: string;
  attention_consumed: number; // agent steps taken
  llm_calls: number;
  cost_usd: number;
  tasks_completed: number;
  tasks_failed: number;
  health_score: number; // 0-1
}

export interface ForageContribution {
  id: string;
  kind: 'tool' | 'dataset' | 'paper' | 'blog';
  title: string;
  url: string;
  license: string;
  ts: string;
}

/**
 * Distributed Authority & Full-Spectrum (PLAN 3h).
 *  - C107 Democratic Agents: voting inside companies for certain decisions
 *  - C109 Multi-Currency Economy: attention/reputation/compute/trust credits alongside cognits
 *  - C110 The Metabolism: energy-in/energy-out telemetry
 *  - C111 Reverse Foraging: civilization contributes back to open source
 */
export class AuthorityEngine {
  private state: PlutoState;

  constructor(state: PlutoState) {
    this.state = state;
  }

  // ---- C107 Democratic Agents ------------------------------------------------

  /** Open a ballot for a company decision. */
  openBallot(c: { company_id: string; question: string; options: VoteOption[] }): Ballot {
    const ballot: Ballot = {
      id: newId('bal'), company_id: c.company_id, question: c.question,
      options: c.options, votes: [], status: 'open', result: null,
      created_at: now(), closed_at: null,
    };
    this.state.remember(c.company_id, `Ballot: ${c.question}`, {
      type: 'procedural', source: 'authority.ballot',
      tags: ['ballot', ballot.id, 'open', ...c.options],
    });
    this.state.emit(c.company_id, 'authority.ballot_opened', ballot.id, 'ballot', { question: c.question, options: c.options });
    return ballot;
  }

  /** Cast a vote (agent_id votes for a choice; weight defaults to 1). */
  castVote(ballotId: string, vote: { agent_id: string; choice: VoteOption; weight?: number }): boolean {
    const mem = this._ballotMem(ballotId);
    if (!mem || (mem.tags as string[])?.[2] !== 'open') return false;
    this.state.remember(mem.company_id, `Vote: ${vote.agent_id} → ${vote.choice}`, {
      type: 'procedural', source: 'authority.vote',
      tags: ['vote', ballotId, vote.agent_id, vote.choice, String(vote.weight ?? 1)],
    });
    this.state.emit(mem.company_id, 'authority.vote_cast', ballotId, 'ballot', { agent_id: vote.agent_id, choice: vote.choice });
    return true;
  }

  /** Close ballot, tally votes (weighted), return winner. */
  closeBallot(ballotId: string): Ballot {
    const mem = this._ballotMem(ballotId);
    if (!mem) throw new Error(`ballot ${ballotId} not found`);

    const votes = this.state.repos.memory(mem.company_id, 'procedural', 500)
      .filter(m => m.source === 'authority.vote' && (m.tags as string[])?.[1] === ballotId)
      .map(m => {
        const tags = (m.tags as string[]) ?? [];
        return { agent_id: tags[2], choice: tags[3], weight: Number(tags[4] ?? 1), ts: m.ts };
      });

    // Tally weighted votes
    const tally: Record<string, number> = {};
    for (const v of votes) tally[v.choice] = (tally[v.choice] ?? 0) + v.weight;
    const result = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    // Mark closed in memory
    const tags = [...(mem.tags as string[])];
    tags[2] = 'closed';
    this.state.remember(mem.company_id, `Ballot closed: ${result ?? 'no votes'}`, {
      type: 'procedural', source: 'authority.ballot', tags,
    });
    this.state.emit(mem.company_id, 'authority.ballot_closed', ballotId, 'ballot', { result, vote_count: votes.length });

    return {
      id: ballotId, company_id: mem.company_id,
      question: mem.content.replace('Ballot: ', ''),
      options: tags.slice(3), votes, status: 'closed', result,
      created_at: mem.ts, closed_at: now(),
    };
  }

  // ---- C109 Multi-Currency Economy -------------------------------------------

  /** Credit an entity with a non-cognit currency. */
  credit(c: { entity_id: string; company_id: string; kind: CreditKind; amount: number; reason: string }): void {
    this.state.remember(c.company_id, `Credit [${c.kind}] +${c.amount} → ${c.entity_id}: ${c.reason}`, {
      type: 'strategic', source: 'authority.credit',
      tags: ['credit', c.entity_id, c.kind, String(c.amount), c.reason.slice(0, 40)],
    });
    this.state.emit(c.company_id, 'authority.credit_issued', c.entity_id, 'agent', { kind: c.kind, amount: c.amount });
  }

  /** Debit (spend) credits. Returns false if insufficient balance. */
  debit(c: { entity_id: string; company_id: string; kind: CreditKind; amount: number; reason: string }): boolean {
    const bal = this.balance(c.entity_id, c.company_id, c.kind);
    if (bal < c.amount) return false;
    this.state.remember(c.company_id, `Debit [${c.kind}] -${c.amount} ← ${c.entity_id}: ${c.reason}`, {
      type: 'strategic', source: 'authority.credit',
      tags: ['debit', c.entity_id, c.kind, String(-c.amount), c.reason.slice(0, 40)],
    });
    return true;
  }

  /** Get balance of a specific credit kind for an entity. */
  balance(entityId: string, companyId: string, kind: CreditKind): number {
    return this.state.repos.memory(companyId, 'strategic', 1000)
      .filter(m => m.source === 'authority.credit' && (m.tags as string[])?.[1] === entityId && (m.tags as string[])?.[2] === kind)
      .reduce((sum, m) => sum + Number((m.tags as string[])?.[3] ?? 0), 0);
  }

  /** Get all credit balances for an entity. */
  accounts(entityId: string, companyId: string): CreditAccount[] {
    const kinds: CreditKind[] = ['cognit', 'attention', 'reputation', 'compute', 'trust'];
    return kinds.map(k => ({ entity_id: entityId, kind: k, balance: this.balance(entityId, companyId, k) }))
      .filter(a => a.balance !== 0);
  }

  // ---- C110 The Metabolism ---------------------------------------------------

  /** Snapshot the current metabolic state (energy in/out) for a company. */
  snapshot(companyId: string): MetabolismSnapshot {
    const tasks = this.state.repos.tasks(companyId);
    const traces = this.state.repos.traces(companyId, 500);
    const completed = tasks.filter(t => t.status === 'SUCCEEDED').length;
    const failed = tasks.filter(t => t.status === 'FAILED').length;
    const llm_calls = traces.length;
    const cost_usd = traces.reduce((s, t) => s + (t.cost_usd ?? 0), 0);
    const attention = tasks.reduce((s, t) => s + (t.attempts ?? 0), 0);
    // Health: high completion rate + low cost per task = healthy
    const total = completed + failed || 1;
    const health_score = Math.min(1, (completed / total) * (1 - Math.min(1, cost_usd / 10)));

    const snap: MetabolismSnapshot = {
      company_id: companyId, ts: now(),
      attention_consumed: attention, llm_calls, cost_usd,
      tasks_completed: completed, tasks_failed: failed, health_score,
    };
    this.state.remember(companyId, `Metabolism: attention=${attention} llm=${llm_calls} cost=$${cost_usd.toFixed(4)} health=${health_score.toFixed(2)}`, {
      type: 'episodic', source: 'authority.metabolism',
      tags: ['metabolism', companyId, String(health_score.toFixed(2)), String(cost_usd.toFixed(4))],
    });
    if (health_score < 0.3) {
      this.state.emit(companyId, 'authority.metabolism.unhealthy', null, null, { health_score, cost_usd });
    }
    return snap;
  }

  /** Get metabolism history for a company. */
  metabolismHistory(companyId: string): MetabolismSnapshot[] {
    return this.state.repos.memory(companyId, 'episodic', 100)
      .filter(m => m.source === 'authority.metabolism')
      .map(m => {
        const tags = (m.tags as string[]) ?? [];
        return {
          company_id: companyId, ts: m.ts,
          attention_consumed: 0, llm_calls: 0,
          cost_usd: Number(tags[3] ?? 0),
          tasks_completed: 0, tasks_failed: 0,
          health_score: Number(tags[2] ?? 0),
        };
      });
  }

  // ---- C111 Reverse Foraging -------------------------------------------------

  /** Publish a civilization output back to the open-source ecosystem. */
  contribute(c: { kind: ForageContribution['kind']; title: string; url: string; license: string }): ForageContribution {
    const contrib: ForageContribution = {
      id: newId('rc'), kind: c.kind, title: c.title, url: c.url, license: c.license, ts: now(),
    };
    this.state.remember('__global__', `Contribution [${c.kind}]: ${c.title} (${c.license}) — ${c.url}`, {
      type: 'semantic', source: 'authority.reverse_forage',
      tags: ['contribution', contrib.id, c.kind, c.license],
    });
    this.state.emit('__global__', 'authority.contribution_published', contrib.id, 'contribution', { kind: c.kind, title: c.title });
    return contrib;
  }

  /** List all civilization contributions. */
  contributions(kind?: ForageContribution['kind']): ForageContribution[] {
    return this.state.repos.memory('__global__', 'semantic', 200)
      .filter(m => m.source === 'authority.reverse_forage')
      .filter(m => !kind || (m.tags as string[])?.[2] === kind)
      .map(m => {
        const tags = (m.tags as string[]) ?? [];
        const parts = m.content.replace(/^Contribution \[.*?\]: /, '').split(' — ');
        return {
          id: tags[1] ?? m.id, kind: (tags[2] ?? 'tool') as ForageContribution['kind'],
          title: parts[0]?.split(' (')[0] ?? m.content,
          url: parts[1] ?? '', license: tags[3] ?? 'MIT', ts: m.ts,
        };
      });
  }

  // ---- Status ----------------------------------------------------------------
  status(companyId: string): { open_ballots: number; credit_transactions: number; metabolism_snapshots: number; contributions: number } {
    return {
      open_ballots: this.state.repos.memory(companyId, 'procedural', 200)
        .filter(m => m.source === 'authority.ballot' && (m.tags as string[])?.[2] === 'open').length,
      credit_transactions: this.state.repos.memory(companyId, 'strategic', 500)
        .filter(m => m.source === 'authority.credit').length,
      metabolism_snapshots: this.metabolismHistory(companyId).length,
      contributions: this.contributions().length,
    };
  }

  private _ballotMem(ballotId: string) {
    return this.state.repos.companies()
      .flatMap(c => this.state.repos.memory(c.id, 'procedural', 200))
      .find(m => m.source === 'authority.ballot' && (m.tags as string[])?.includes(ballotId)) ?? null;
  }
}
