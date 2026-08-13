import { PlutoState } from '../kernel/state.ts';
import { newId, now } from '../kernel/types.ts';

// ── Civilization Forks (C25) ─────────────────────────────────────────────────
// Clone the civilization's memory snapshot at moment T, run scenarios in parallel,
// then merge winning insights or discard losers.

export interface CivFork {
  id: string;
  parent_id: string | null;
  label: string;
  snapshot_ts: string;        // when fork was taken
  hypothesis: string;         // what this fork is testing
  status: 'running' | 'merged' | 'discarded';
  outcome_summary: string | null;
  created_at: string;
}

// ── Multi-Timescale Agents (C56) ─────────────────────────────────────────────
// Different agent classes tick at different rates.

export type TimescaleClass =
  | 'microsecond'   // event handlers, routing
  | 'second'        // real-time ops, alerts
  | 'minute'        // pipeline orchestration
  | 'hour'          // planning, reporting
  | 'day'           // strategy review
  | 'week'          // OKR cadence
  | 'month'         // board-level decisions
  | 'year'          // civilization direction
  | 'decade';       // existential planning

export interface TimescaleAgent {
  id: string;
  company_id: string;
  role: string;
  timescale: TimescaleClass;
  last_tick: string | null;
  tick_count: number;
  registered_at: string;
}

// ── Long-Horizon Plans (C57) ─────────────────────────────────────────────────

export interface Milestone {
  id: string;
  label: string;
  target_date: string;
  status: 'pending' | 'hit' | 'missed' | 'revised';
  actual_date: string | null;
}

export interface LongHorizonPlan {
  id: string;
  company_id: string;
  title: string;
  horizon_years: number;
  milestones: Milestone[];
  reality_checks: { ts: string; delta_summary: string }[];
  status: 'active' | 'completed' | 'abandoned';
  created_at: string;
}

// ── Non-Linear Time Perception (C75) ─────────────────────────────────────────

export type TimeMode = 'compressed' | 'normal' | 'expanded';

export interface TimePerception {
  company_id: string;
  mode: TimeMode;
  // compressed: agent skips micro-decisions, focuses on macro
  // expanded: agent slows down, examines each step carefully
  reason: string;
  set_at: string;
}

export class TimeArchEngine {
  private state: PlutoState;
  constructor(state: PlutoState) { this.state = state; }

  // ── Forks ────────────────────────────────────────────────────────────────

  fork(parentId: string | null, label: string, hypothesis: string): CivFork {
    const f: CivFork = {
      id: newId('fork'),
      parent_id: parentId,
      label,
      snapshot_ts: now(),
      hypothesis,
      status: 'running',
      outcome_summary: null,
      created_at: now(),
    };
    this.state.remember('__global__', JSON.stringify(f), {
      type: 'strategic', source: 'time.fork',
      tags: ['fork', f.id, parentId ?? 'root', 'running'],
    });
    return f;
  }

  mergeFork(forkId: string, outcomeSummary: string): boolean {
    return this._updateForkStatus(forkId, 'merged', outcomeSummary);
  }

  discardFork(forkId: string, reason: string): boolean {
    return this._updateForkStatus(forkId, 'discarded', reason);
  }

  forks(status?: CivFork['status']): CivFork[] {
    return this._allBySource('time.fork', 'strategic')
      .filter(r => !status || (r.tags as string[])[3] === status)
      .map(r => JSON.parse(r.content) as CivFork);
  }

  // ── Multi-Timescale Agents ────────────────────────────────────────────────

  registerTimescaleAgent(companyId: string, role: string, timescale: TimescaleClass): TimescaleAgent {
    const agent: TimescaleAgent = {
      id: newId('tsa'),
      company_id: companyId,
      role,
      timescale,
      last_tick: null,
      tick_count: 0,
      registered_at: now(),
    };
    this.state.remember('__global__', JSON.stringify(agent), {
      type: 'procedural', source: 'time.agent',
      tags: ['tsa', agent.id, companyId, timescale, role],
    });
    return agent;
  }

  tick(agentId: string): number {
    const row = this._tsaRow(agentId);
    if (!row) return 0;
    const agent: TimescaleAgent = JSON.parse(row.content);
    agent.tick_count += 1;
    agent.last_tick = now();
    this.state.store.db.prepare(`UPDATE memory SET content=?, ts=? WHERE id=?`)
      .run(JSON.stringify(agent), now(), row.id);
    return agent.tick_count;
  }

  timescaleAgents(companyId: string, timescale?: TimescaleClass): TimescaleAgent[] {
    return this._allBySource('time.agent', 'procedural')
      .filter(r => {
        const tags = r.tags as string[];
        return tags[2] === companyId && (!timescale || tags[3] === timescale);
      })
      .map(r => JSON.parse(r.content) as TimescaleAgent);
  }

  // ── Long-Horizon Plans ────────────────────────────────────────────────────

  createPlan(companyId: string, title: string, horizonYears: number, milestones: Omit<Milestone, 'id' | 'status' | 'actual_date'>[]): LongHorizonPlan {
    const plan: LongHorizonPlan = {
      id: newId('plan'),
      company_id: companyId,
      title,
      horizon_years: horizonYears,
      milestones: milestones.map(m => ({ ...m, id: newId('ms'), status: 'pending', actual_date: null })),
      reality_checks: [],
      status: 'active',
      created_at: now(),
    };
    this.state.remember(companyId, JSON.stringify(plan), {
      type: 'strategic', source: 'time.plan',
      tags: ['plan', plan.id, companyId, 'active'],
    });
    return plan;
  }

  /** Compare plan milestones against current state; record a delta note. */
  realityCheck(planId: string, deltaSummary: string): boolean {
    const row = this._planRow(planId);
    if (!row) return false;
    const plan: LongHorizonPlan = JSON.parse(row.content);
    plan.reality_checks.push({ ts: now(), delta_summary: deltaSummary });
    this.state.store.db.prepare(`UPDATE memory SET content=?, ts=? WHERE id=?`)
      .run(JSON.stringify(plan), now(), row.id);
    return true;
  }

  hitMilestone(planId: string, milestoneId: string): boolean {
    return this._updateMilestone(planId, milestoneId, 'hit');
  }

  reviseMilestone(planId: string, milestoneId: string, newTargetDate: string): boolean {
    const row = this._planRow(planId);
    if (!row) return false;
    const plan: LongHorizonPlan = JSON.parse(row.content);
    const ms = plan.milestones.find(m => m.id === milestoneId);
    if (!ms) return false;
    ms.status = 'revised';
    ms.target_date = newTargetDate;
    this.state.store.db.prepare(`UPDATE memory SET content=?, ts=? WHERE id=?`)
      .run(JSON.stringify(plan), now(), row.id);
    return true;
  }

  plans(companyId: string): LongHorizonPlan[] {
    return this.state.repos.memory(companyId, 'strategic', 200)
      .filter(r => r.source === 'time.plan')
      .map(r => JSON.parse(r.content) as LongHorizonPlan);
  }

  // ── Time Perception ───────────────────────────────────────────────────────

  setTimeMode(companyId: string, mode: TimeMode, reason: string): TimePerception {
    const tp: TimePerception = { company_id: companyId, mode, reason, set_at: now() };
    // upsert: just remember; readers take the latest
    this.state.remember(companyId, JSON.stringify(tp), {
      type: 'semantic', source: 'time.perception',
      tags: ['perception', companyId, mode],
    });
    return tp;
  }

  timeMode(companyId: string): TimePerception | null {
    const rows = this.state.repos.memory(companyId, 'semantic', 50)
      .filter(r => r.source === 'time.perception')
      .sort((a, b) => b.ts.localeCompare(a.ts));
    return rows.length ? JSON.parse(rows[0].content) : null;
  }

  // ── C3: Scheduled Tasks (24/7 time compression) ──────────────────────────

  /** Register a recurring task for a company. cronExpr is a cron string (e.g. "0 * * * *"). */
  scheduleTask(companyId: string, taskKind: string, cronExpr: string, tzAware: boolean): { id: string; company_id: string; task_kind: string; cron_expr: string; tz_aware: boolean; created_at: string } {
    const task = { id: newId('sched'), company_id: companyId, task_kind: taskKind, cron_expr: cronExpr, tz_aware: tzAware, created_at: now() };
    this.state.remember(companyId, JSON.stringify(task), {
      type: 'procedural', source: 'time.schedule',
      tags: ['schedule', task.id, companyId, taskKind],
    });
    return task;
  }

  scheduledTasks(companyId: string): { id: string; company_id: string; task_kind: string; cron_expr: string; tz_aware: boolean; created_at: string }[] {
    return this.state.repos.memory(companyId, 'procedural', 500)
      .filter(r => r.source === 'time.schedule')
      .map(r => JSON.parse(r.content));
  }

  status(): { forks: number; timescale_agents: number; plans: number } {
    return {
      forks: this._allBySource('time.fork', 'strategic').length,
      timescale_agents: this._allBySource('time.agent', 'procedural').length,
      plans: 0, // plans stored per-company
    };
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private _allBySource(source: string, type: 'episodic' | 'semantic' | 'procedural' | 'strategic') {
    return this.state.repos.memory('__global__', type, 500)
      .filter(r => r.source === source);
  }

  private _forkRow(id: string) {
    return this._allBySource('time.fork', 'strategic')
      .find(r => (r.tags as string[])[1] === id) ?? null;
  }

  private _tsaRow(id: string) {
    return this._allBySource('time.agent', 'procedural')
      .find(r => (r.tags as string[])[1] === id) ?? null;
  }

  private _planRow(id: string) {
    // plans stored per-company; need to search across all companies
    // ponytail: global scan — add plan index if companies scale past 100
    return this.state.store.db
      .prepare(`SELECT * FROM memory WHERE source='time.plan' AND active=1 AND tags LIKE ?`)
      .get(`%"${id}"%`) as any ?? null;
  }

  private _updateForkStatus(forkId: string, status: 'merged' | 'discarded', summary: string): boolean {
    const row = this._forkRow(forkId);
    if (!row) return false;
    const f: CivFork = JSON.parse(row.content);
    f.status = status;
    f.outcome_summary = summary;
    const tags = row.tags as string[];
    tags[3] = status;
    this.state.store.db.prepare(`UPDATE memory SET content=?, tags=?, ts=? WHERE id=?`)
      .run(JSON.stringify(f), JSON.stringify(tags), now(), row.id);
    return true;
  }

  private _updateMilestone(planId: string, milestoneId: string, status: Milestone['status']): boolean {
    const row = this._planRow(planId);
    if (!row) return false;
    const plan: LongHorizonPlan = JSON.parse(row.content);
    const ms = plan.milestones.find(m => m.id === milestoneId);
    if (!ms) return false;
    ms.status = status;
    if (status === 'hit') ms.actual_date = now();
    this.state.store.db.prepare(`UPDATE memory SET content=?, ts=? WHERE id=?`)
      .run(JSON.stringify(plan), now(), row.id);
    return true;
  }
}
