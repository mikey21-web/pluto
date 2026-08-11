import { PlutoState } from '../kernel/state.ts';
import type { AgentStepResult } from '../agents/loop.ts';

export interface TraceHook {
  (step: string, detail: AgentStepResult): void;
}

/** Observability Fabric: per-step traces, cost, latency, task telemetry. */
export class Observability {
  private state: PlutoState;

  constructor(state: PlutoState) { this.state = state; }

  agentHook(opts: { company_id: string; task_id: string; agent_id: string; model: string }): TraceHook {
    return (step: string, detail: AgentStepResult) => {
      this.state.repos.trace({
        company_id: opts.company_id, task_id: opts.task_id, agent_id: opts.agent_id,
        step, model: opts.model,
        latency_ms: detail.latency_ms, cost_usd: detail.cost_usd,
        prompt_tokens: detail.tokens_in, completion_tokens: detail.tokens_out,
        payload: { tool_calls: detail.tool_calls, text: detail.text.slice(0, 200) },
      });
      // accumulate cost onto agent performance
      const a = this.state.repos.agent(opts.agent_id);
      if (a) {
        a.budget.used_usd += detail.cost_usd;
        a.performance.cost_usd = (a.performance.cost_usd as number) + detail.cost_usd;
        this.state.repos.saveAgent(a);
        this.state.spend(opts.company_id, 'llm', detail.cost_usd);
      }
    };
  }

  taskStarted(taskId: string): void {
    const t = this.state.repos.task(taskId);
    if (!t) return;
    t.status = 'RUNNING';
    t.started_at = new Date().toISOString();
    this.state.repos.saveTask(t);
    this.state.taskEvent(t, 'task.started', {});
  }

  taskSucceeded(taskId: string, extra: Record<string, unknown> = {}): void {
    const t = this.state.repos.task(taskId);
    if (!t) return;
    t.status = 'SUCCEEDED';
    t.finished_at = new Date().toISOString();
    this.state.repos.saveTask(t);
    this.state.taskEvent(t, 'task.completed', { cost_usd: t.cost_usd, ...extra });
    this.bumpAgent(taskId, true);
  }

  taskFailed(taskId: string, reason: string): void {
    const t = this.state.repos.task(taskId);
    if (!t) return;
    t.status = 'FAILED';
    t.finished_at = new Date().toISOString();
    t.output = { ...t.output, failure: reason };
    this.state.repos.saveTask(t);
    this.state.taskEvent(t, 'task.failed', { reason });
    this.bumpAgent(taskId, false);
  }

  bumpAgent(taskId: string, ok: boolean): void {
    const t = this.state.repos.task(taskId);
    if (!t?.agent_id) return;
    const a = this.state.repos.agent(t.agent_id);
    if (!a) return;
    a.performance.tasks_done = (a.performance.tasks_done as number) + 1;
    const total = a.performance.tasks_done as number;
    const wins = ok ? (a.performance.wins as number ?? 0) + 1 : (a.performance.wins as number ?? 0);
    a.performance.wins = wins;
    a.performance.success_rate = total ? wins / total : 0;
    this.state.repos.saveAgent(a);
  }
}