import { PlutoState } from '../kernel/state.ts';
import type { Agent, Task } from '../kernel/types.ts';

export interface EvolutionProposal {
  kind: 'new_agent' | 'replace_agent' | 'retire_agent' | 'new_department' | 'add_capability' | 'budget_change';
  summary: string;
  reason: string;
  metrics: Record<string, number | string>;
  status: 'proposed' | 'applied' | 'rejected';
}

/** Learning + Evolution Engine: versioned, evaluated change only. No uncontrolled self-modification. */
export class LearningEngine {
  private state: PlutoState;

  constructor(state: PlutoState) { this.state = state; }

  /** Called on task outcome; extracts lessons from failures. */
  observeTaskOutcome(t: Task, ok: boolean): void {
    if (ok) return;
    const failures = this.state.repos.tasks(t.company_id).filter(x => x.status === 'FAILED');
    if (failures.length >= 3) {
      this.state.repos.proposeLesson({
        company_id: t.company_id,
        kind: 'repeated_failure',
        trigger: `task ${t.kind} failed ${failures.length} times`,
        lesson: `Escalate ${t.kind} tasks: verify tool access, simplify scope, or reassign.`,
        source: 'learning_engine',
      });
    }
  }

  /** Detect bottlenecks: high utilization + SLA failures -> propose headcount. */
  auditCompany(companyId: string): EvolutionProposal[] {
    const proposals: EvolutionProposal[] = [];
    const agents = this.state.repos.agents(companyId);
    const deps = this.state.repos.departments(companyId);

    for (const d of deps) {
      const members = agents.filter(a => a.department_id === d.id);
      if (members.length === 0) continue;
      const overloaded = members.filter(m => (m.performance.success_rate as number) < 0.5).length;
      if (overloaded > 0 && members.length <= 3) {
        proposals.push({
          kind: 'new_agent', summary: `Add agent to ${d.name}`, reason: `${overloaded} member(s) underperforming`,
          metrics: { dept: d.name, underperforming: overloaded, size: members.length }, status: 'proposed',
        });
      }
    }

    // repeated failures in a department -> capability gap
    for (const d of deps) {
      const deptAgentIds = new Set(agents.filter(a => a.department_id === d.id).map(a => a.id));
      const failed = this.state.repos.tasks(companyId, 'FAILED').filter(t => t.agent_id && deptAgentIds.has(t.agent_id)).length;
      if (failed >= 3) {
        proposals.push({
          kind: 'add_capability', summary: `Add capability to ${d.name}`, reason: `${failed} failed tasks suggest a missing tool`,
          metrics: { dept: d.name, failed_tasks: failed }, status: 'proposed',
        });
      }
    }
    return proposals;
  }

  apply(companyId: string, proposal: EvolutionProposal): void {
    proposal.status = 'applied';
    const c = this.state.repos.company(companyId);
    if (c) {
      this.state.companyEvent(c, 'organization.evolution', { kind: proposal.kind, summary: proposal.summary });
      this.state.remember(companyId, `Evolution: ${proposal.summary} — ${proposal.reason}`, { type: 'procedural', source: 'learning_engine' });
    }
    const lesson = this.state.repos.proposeLesson({
      company_id: companyId, kind: proposal.kind, trigger: proposal.summary, lesson: proposal.reason, source: 'evolution',
    });
    this.state.repos.applyLesson(lesson.id);
  }
}

/** Agent Factory: create, evaluate, promote, retire agents (versioned). */
export class AgentFactory {
  private state: PlutoState;

  constructor(state: PlutoState) { this.state = state; }

  create(c: Partial<Agent> & { company_id: string; name: string; role: string }): Agent {
    const a = this.state.repos.createAgent(c);
    this.state.agentEvent(a, 'agent.created', { version: a.version });
    this.state.remember(a.company_id, `Hired ${a.name} as ${a.role}`, { type: 'organizational', owner: a.id });
    return a;
  }

  promote(a: Agent): Agent {
    const prev = a.version;
    a.version += 1;
    a.status = 'active';
    this.state.repos.saveAgent(a);
    this.state.agentEvent(a, 'agent.promoted', { from: prev, to: a.version });
    return a;
  }

  retire(a: Agent): Agent {
    a.status = 'retired';
    this.state.repos.saveAgent(a);
    this.state.agentEvent(a, 'agent.retired', {});
    return a;
  }

  /** Version a role by bumping version on config change. */
  reconfigure(a: Agent, patch: Partial<Agent>): Agent {
    const next: Agent = { ...a, ...patch, version: a.version + 1 };
    this.state.repos.saveAgent(next);
    this.state.agentEvent(a, 'agent.reconfigured', { version: next.version });
    return next;
  }

  /** Evaluate an agent from real task history (§31): return metrics or null if no history. */
  evaluate(companyId: string, agentId: string): { success_rate: number; avg_latency_ms: number; tasks: number } | null {
    const tasks = this.state.repos.tasks(companyId).filter(t => t.agent_id === agentId);
    if (tasks.length === 0) return null;
    const done = tasks.filter(t => t.status === 'SUCCEEDED');
    const ms = tasks.map(t => {
      const a = t.started_at ? new Date(t.started_at).getTime() : 0;
      const b = t.finished_at ? new Date(t.finished_at).getTime() : 0;
      return b > a ? b - a : 0;
    });
    return {
      success_rate: tasks.length ? done.length / tasks.length : 0,
      avg_latency_ms: ms.length ? ms.reduce((x, y) => x + y, 0) / ms.length : 0,
      tasks: tasks.length,
    };
  }

  /** Promote only if the eval gate passes: >= MIN_WIN_RATE success on enough tasks. */
  promoteIfEarned(a: Agent, minSuccessRate = 0.6, minTasks = 3): { promoted: boolean; metrics: ReturnType<AgentFactory['evaluate']> } {
    const metrics = this.evaluate(a.company_id, a.id);
    if (metrics && metrics.tasks >= minTasks && metrics.success_rate >= minSuccessRate) {
      return { promoted: true, metrics };
    }
    return { promoted: false, metrics };
  }

  /** Retire when an agent persistently underperforms on history, and record a lesson. */
  retireIfUnderperforming(a: Agent, maxSuccessRate = 0.4, minTasks = 3): { retired: boolean; metrics: ReturnType<AgentFactory['evaluate']> } {
    const metrics = this.evaluate(a.company_id, a.id);
    if (metrics && metrics.tasks >= minTasks && metrics.success_rate < maxSuccessRate) {
      this.retire(a);
      this.state.repos.proposeLesson({
        company_id: a.company_id, kind: 'agent_retired', trigger: `${a.role} underperformed`,
        lesson: `Retired ${a.name}: ${metrics.success_rate.toFixed(2)} success over ${metrics.tasks} tasks. Reconsider role, tools, or model.`,
        source: 'agent_factory',
      });
      return { retired: true, metrics };
    }
    return { retired: false, metrics };
  }

  /** Create an agent from an unmet capability need (wired to CapabilityFactory 'create' decisions). */
  createForCapability(c: { company_id: string; name: string; role: string; department_id: string | null; tools: string[]; permissions: string[] }): Agent {
    const a = this.state.repos.createAgent(c);
    this.state.agentEvent(a, 'agent.created', { from_capability: true, role: a.role });
    this.state.remember(c.company_id, `Capability "${c.name}" filled by ${a.name} (${a.role})`, { type: 'organizational', owner: a.id });
    return a;
  }
}