import { PlutoState } from '../kernel/state.ts';
import { newId, now } from '../kernel/types.ts';
import { createHash } from 'node:crypto';
import { ToolSynthesizer } from '../meta/synthesizer.ts';
import { CanaryDeploy } from '../meta/canary.ts';
import { BrainLayer } from '../brain/index.ts';
import { makeDriver } from '../agents/llm.ts';

export type FugueSeverity = 'minor' | 'major' | 'existential';

export interface FugueState {
  active: boolean;
  severity: FugueSeverity;
  reason: string;
  suspended_agents: string[];
  started_at: string;
  ended_at: string | null;
}

export interface OffSwitchDelay {
  pending: boolean;
  trigger: string;
  countdown: number;
  actions: string[];
}

export interface RehearsalRecord {
  id: string;
  company_id: string;
  action: string;
  plan: string;
  simulated_outcome: Record<string, unknown>;
  human_feedback: string | null;
  status: 'planned' | 'simulated' | 'approved' | 'executed' | 'rejected';
  ts: string;
}

export interface WhimsyLedger {
  budget_usd: number;
  spent_usd: number;
  acts: Array<{ id: string; description: string; cost_usd: number; ts: string; joy: boolean }>;
}

/**
 * Grace & Rehearsal (PLAN 2d). Operational resilience + joy:
 *  - C112 Fugue Mode: crisis mode — survival-focused, non-essential agents suspended.
 *  - C113 Off-Switch Delay: graceful shutdown — 60-sec window (final messages, save state, close positions).
 *  - C114 Rehearsal Studio: big-action rehearsal — sandbox test, simulated humans, then real.
 *  - C115 Whimsy Budget: reserve 1-2% of activity budget for delightful non-productive acts.
 */
export class GraceRehearsal {
  private state: PlutoState;
  private fugue: FugueState = { active: false, severity: 'minor', reason: '', suspended_agents: [], started_at: '', ended_at: null };
  private offSwitch: OffSwitchDelay = { pending: false, trigger: '', countdown: 60, actions: [] };
  private rehearsals: RehearsalRecord[] = [];
  private whimsy: WhimsyLedger = { budget_usd: 0, spent_usd: 0, acts: [] };
  private synthesizer: ToolSynthesizer;
  private canary: CanaryDeploy;
  private brain: BrainLayer;

  constructor(state: PlutoState) {
    this.state = state;
    this.synthesizer = new ToolSynthesizer();
    this.canary = new CanaryDeploy();
    this.brain = new BrainLayer({ defaultDriver: makeDriver() });
  }

  // ---- C112 Fugue Mode ---------------------------------------------------------
  /** Enter Fugue Mode: suspend non-essential agents, log reason, emit event. */
  enterFugue(c: { company_id: string; severity: FugueSeverity; reason: string }): FugueState {
    const company = this.state.repos.company(c.company_id);
    if (!company) throw new Error(`company ${c.company_id} not found`);

    // suspend all agents except Finance + Sovereign
    const agents = this.state.repos.agents(c.company_id);
    const suspended: string[] = [];
    for (const a of agents) {
      if (!/finance|sovereign/i.test(a.role)) {
        a.status = 'inactive';
        this.state.repos.saveAgent(a);
        suspended.push(a.id);
      }
    }
    this.fugue = { active: true, severity: c.severity, reason: c.reason, suspended_agents: suspended, started_at: now(), ended_at: null };
    this.state.emit(c.company_id, 'grace.fugue.entered', 'sovereign', 'system', { severity: c.severity, reason: c.reason, suspended: suspended.length });
    this.state.remember(c.company_id, `Fugue Mode (${c.severity}): ${c.reason}. Suspended ${suspended.length} agents.`, {
      type: 'strategic', source: 'grace.fugue', tags: ['fugue', c.severity],
    });
    return this.fugue;
  }

  /** Exit Fugue Mode: reactivate suspended agents. */
  exitFugue(companyId: string): FugueState {
    for (const id of this.fugue.suspended_agents) {
      const a = this.state.repos.agent(id);
      if (a) { a.status = 'active'; this.state.repos.saveAgent(a); }
    }
    this.fugue = { ...this.fugue, active: false, ended_at: now() };
    this.state.emit(companyId, 'grace.fugue.exited', 'sovereign', 'system', { reactivated: this.fugue.suspended_agents.length });
    return this.fugue;
  }

  fugueStatus(): FugueState {
    return { ...this.fugue };
  }

  // ---- C113 Off-Switch Delay ----------------------------------------------------
  /** Initiate the 60-second graceful shutdown window. */
  initiateOffSwitch(c: { company_id: string; trigger: string; actions: string[] }): OffSwitchDelay {
    this.offSwitch = { pending: true, trigger: c.trigger, countdown: 60, actions: c.actions };
    this.state.emit(c.company_id, 'grace.offswitch.initiated', 'sovereign', 'system', { trigger: c.trigger, countdown: 60 });
    return { ...this.offSwitch };
  }

  /** Tick the countdown (called once per second externally). Returns remaining seconds. */
  tickOffSwitch(): number {
    if (!this.offSwitch.pending) return 0;
    this.offSwitch.countdown = Math.max(0, this.offSwitch.countdown - 1);
    if (this.offSwitch.countdown === 0) this.offSwitch.pending = false;
    return this.offSwitch.countdown;
  }

  /** Cancel the off-switch delay. */
  cancelOffSwitch(): OffSwitchDelay {
    this.offSwitch = { ...this.offSwitch, pending: false };
    return { ...this.offSwitch };
  }

  offSwitchStatus(): OffSwitchDelay {
    return { ...this.offSwitch };
  }

  // ---- C114 Rehearsal Studio ----------------------------------------------------
  /**
   * Plan a rehearsal: describe the big action, produce a sandbox test plan,
   * run synthetic + simulated-human validation, then require human approval before real exec.
   */
  async planRehearsal(c: { company_id: string; action: string; plan: string }): Promise<RehearsalRecord> {
    // Synthetic test in sandbox via ToolSynthesizer using a minimal tool spec
    const specText = JSON.stringify({
      name: `rehearsal_${newId('rh')}`,
      description: c.plan,
      parameters: { type: 'object', properties: {} },
      js: 'async () => ({ ok: true })',
    });
    const spec = this.synthesizer.synthesize(specText);
    const test = spec ? await this.synthesizer.sandboxTest(spec, []) : { passed: false, failures: ['spec synthesis failed'] };

    // Simulated human feedback (deterministic: approve if no sandbox error, else reject)
    const human_feedback = test.passed ? 'simulated-human: approved — sandbox clean' : 'simulated-human: rejected — sandbox errors';

    const rec: RehearsalRecord = {
      id: newId('rhr'), company_id: c.company_id, action: c.action, plan: c.plan,
      simulated_outcome: { sandbox_ok: test.passed, logs: test.failures },
      human_feedback, status: 'simulated', ts: now(),
    };
    this.rehearsals.push(rec);
    this.state.emit(c.company_id, 'grace.rehearsal.planned', rec.id, 'system', { action: c.action, sandbox_ok: test.passed });
    return rec;
  }

  /** Human approves the rehearsal for real execution. */
  approveRehearsal(rehearsalId: string): RehearsalRecord | null {
    const r = this.rehearsals.find(x => x.id === rehearsalId);
    if (!r) return null;
    r.status = 'approved';
    r.human_feedback = 'human: approved for real execution';
    return r;
  }

  /** Execute the rehearsed action (after approval). */
  executeRehearsal(rehearsalId: string): RehearsalRecord | null {
    const r = this.rehearsals.find(x => x.id === rehearsalId && x.status === 'approved');
    if (!r) return null;
    r.status = 'executed';
    this.state.emit(r.company_id, 'grace.rehearsal.executed', r.id, 'system', { action: r.action });
    return r;
  }

  rejectRehearsal(rehearsalId: string, reason: string): RehearsalRecord | null {
    const r = this.rehearsals.find(x => x.id === rehearsalId);
    if (!r) return null;
    r.status = 'rejected';
    r.human_feedback = reason;
    return r;
  }

  rehearsalsList(): RehearsalRecord[] {
    return [...this.rehearsals];
  }

  // ---- C115 Whimsy Budget -------------------------------------------------------
  /** Initialize the whimsy budget (1-2% of company's activity budget). */
  initWhimsy(companyId: string, percentage = 0.015): WhimsyLedger {
    const budgets = this.state.repos.budgets(companyId);
    const activityBudget = budgets.find(b => b.kind === 'activity')?.limit_usd ?? budgets[0]?.limit_usd ?? 10000;
    this.whimsy.budget_usd = Math.round(activityBudget * percentage * 100) / 100;
    return { ...this.whimsy };
  }

  /** Spend a whimsy act (must be within budget, marked as joy=true). */
  spendWhimsy(c: { company_id: string; description: string; cost_usd: number }): { ok: boolean; reason: string; act?: WhimsyLedger['acts'][0] } {
    if (this.whimsy.spent_usd + c.cost_usd > this.whimsy.budget_usd) {
      return { ok: false, reason: `exceeds whimsy budget ($${this.whimsy.budget_usd})` };
    }
    const act = { id: newId('wim'), description: c.description, cost_usd: c.cost_usd, ts: now(), joy: true };
    this.whimsy.acts.push(act);
    this.whimsy.spent_usd += c.cost_usd;
    this.state.emit(c.company_id, 'grace.whimsy.spent', act.id, 'system', { description: c.description, cost: c.cost_usd });
    return { ok: true, reason: 'whimsy granted', act };
  }

  whimsyLedger(): WhimsyLedger {
    return { ...this.whimsy, acts: [...this.whimsy.acts] };
  }

  // ---- status summary -----------------------------------------------------------
  status(): { fugue: FugueState; offSwitch: OffSwitchDelay; rehearsals: number; whimsy: WhimsyLedger } {
    return { fugue: this.fugueStatus(), offSwitch: this.offSwitchStatus(), rehearsals: this.rehearsals.length, whimsy: this.whimsyLedger() };
  }
}