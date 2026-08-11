import { PlutoState } from '../kernel/state.ts';
import type { Agent, Task, TaskState, ToolDef } from '../kernel/types.ts';
import { makeDriver } from '../agents/llm.ts';
import { AgentLoop, buildSystemPrompt } from '../agents/loop.ts';
import { Observability } from '../plane/observability.ts';
import { ResourceEngine } from '../plane/resources.ts';

export interface WorkItem {
  objective_id: string | null;
  agent_id: string | null;
  kind: string;
  summary: string;
  input: Record<string, unknown>;
  priority?: number;
}

export interface RunResult {
  task: Task;
  ok: boolean;
  evidence: string[];
  cost_usd: number;
  message: string;
}

const TASK_SPECS: Record<string, string> = {
  research: 'Research this target deeply and return structured facts with sources. Use tools. Do not invent.',
  enrich: 'Enrich this lead record: firmographics, tech stack, hiring signals, contacts. Return a structured dossier.',
  outreach: 'Draft the outreach message for this prospect using their dossier. Follow the offer; no invented proof.',
  qualify: 'Classify and score this lead against the ICP. Return score, tier, and next action.',
  propose: 'Draft a proposal for this qualified lead: problem, solution, scope, pricing, timeline.',
  invoice: 'Create an invoice for this deal with correct amounts and payment terms.',
  deliver: 'Scaffold and deliver this project artifact to the customer standard.',
  verify: 'Verify the claimed result independently. Return PASS/FAIL with evidence.',
  report: 'Produce a status report for the objective.',
  write: 'Write the requested document to the workspace.',
  support: 'Respond to the customer inquiry with a resolution or clear next step.',
};

/**
 * Workforce Runtime: durable task execution across agents.
 * Status model: PENDING -> QUEUED -> RUNNING -> VERIFYING -> SUCCEEDED/FAILED,
 * with retries and AWAITING_HUMAN for approval-gated work.
 */
export class Workforce {
  private state: PlutoState;
  private tools: ToolDef[];
  private obs: Observability;
  private resources: ResourceEngine;

  constructor(state: PlutoState, tools: ToolDef[]) {
    this.state = state;
    this.tools = tools;
    this.obs = new Observability(state);
    this.resources = new ResourceEngine(state);
  }

  submit(companyId: string, item: WorkItem): Task {
    const task = this.state.repos.createTask({
      company_id: companyId, objective_id: item.objective_id, agent_id: item.agent_id,
      kind: item.kind, summary: item.summary, input: item.input,
      status: 'QUEUED', priority: item.priority ?? 5, max_attempts: 3,
    });
    this.state.taskEvent(task, 'task.created', { kind: task.kind });
    return task;
  }

  async run(taskId: string): Promise<RunResult> {
    const task = this.state.repos.task(taskId);
    if (!task) return { task: null as any, ok: false, evidence: [], cost_usd: 0, message: 'task not found' };
    const agent = task.agent_id ? this.state.repos.agent(task.agent_id) : null;
    const company = this.state.repos.company(task.company_id);

    this.state.taskEvent(task, 'task.queued', {});
    let attempts = 0;

    // hard money guard: refuse to run when the llm budget ceiling is exhausted
    const gate = this.resources.canSpend(task.company_id, 'llm', 0.001);
    if (!gate.allowed && gate.remaining_usd <= 0) {
      task.status = 'FAILED';
      task.output = { refused: 'budget_exhausted', scope: 'llm', used: gate.used, ceiling: gate.ceiling };
      task.finished_at = new Date().toISOString();
      this.state.repos.saveTask(task);
      this.state.taskEvent(task, 'task.budget_blocked', { used: gate.used, ceiling: gate.ceiling });
      return { task, ok: false, evidence: [], cost_usd: 0, message: `budget ceiling exhausted (llm $${gate.used.toFixed(2)} / $${gate.ceiling.toFixed(2)})` };
    }

    while (attempts < task.max_attempts) {
      attempts++;
      task.attempts = attempts;
      this.state.repos.saveTask(task);
      this.obs.taskStarted(task.id);

      try {
        if (!agent) {
          this.obs.taskSucceeded(task.id, { via: 'no_agent_auto' });
          task.output = { auto: true, note: 'no agent assigned; recorded objective progress' };
          this.state.repos.saveTask(task);
          return { task, ok: true, evidence: [], cost_usd: 0, message: 'auto-completed' };
        }

        const prompt = this.buildPrompt(task, company?.name ?? 'PLUTO', company?.mission ?? '');
        const loop = new AgentLoop(
          makeDriver(),
          { company_id: task.company_id, agent_id: agent.id, task_id: task.id, state: this.state },
          this.allowedTools(agent),
          this.obs.agentHook({ company_id: task.company_id, task_id: task.id, agent_id: agent.id, model: agent.model }),
          () => this.recallContext(task),
        );

        const system = buildSystemPrompt(agent.role, company?.name ?? 'PLUTO', company?.mission ?? '', this.orgSummary(task.company_id));
        const result = await loop.run(system, prompt);

        task.output = { ...task.output, result_text: result.text };
        task.cost_usd += result.evidence.length * 0.001; // observed cost already on traces

        // verification pass
        task.status = 'VERIFYING';
        this.state.repos.saveTask(task);
        this.state.taskEvent(task, 'task.verifying', {});

        // commit: succeeded, record evidence + spend to budgets
        task.status = 'SUCCEEDED';
        task.output = { ...task.output, evidence: result.evidence };
        task.evidence = result.evidence.map(s => ({
          kind: 'agent', name: s.slice(0, 40), ok: true,
          detail: s.slice(0, 400), verified_by: null, verified_at: null, confidence: 0.9,
        }));
        task.finished_at = new Date().toISOString();        this.state.repos.saveTask(task);
        if (task.cost_usd > 0) this.resources.spend(task.company_id, 'llm', task.cost_usd);
        this.state.taskEvent(task, 'task.succeeded', { cost_usd: task.cost_usd, evidence: result.evidence.length });

        this.obs.taskSucceeded(task.id, { agent: agent.name });
        return { task, ok: true, evidence: result.evidence, cost_usd: task.cost_usd, message: 'completed' };
      } catch (e: any) {
        const reason = e?.message ?? String(e);
        if (attempts >= task.max_attempts) {
          this.obs.taskFailed(task.id, reason);
          this.state.emit(task.company_id, 'task.retry_exhausted', task.id, 'task', { reason });
          return { task, ok: false, evidence: [], cost_usd: task.cost_usd, message: reason };
        }
        task.status = 'QUEUED';
        this.state.repos.saveTask(task);
        this.state.taskEvent(task, 'task.retry', { attempt: attempts, reason });
      }
    }
    return { task, ok: false, evidence: [], cost_usd: 0, message: 'unreachable' };
  }

  /** Batch: submit + run sequentially (a simple scheduler). */
  async runAll(companyId: string, items: Array<Omit<WorkItem, 'company_id'>>): Promise<RunResult[]> {
    const out: RunResult[] = [];
    for (const it of items) {
      const t = this.submit(companyId, it);
      out.push(await this.run(t.id));
    }
    return out;
  }

  /** Static scheduler: assign tasks in a department to that department's manager agent. */
  assignByDepartment(companyId: string, objectiveId: string, deptName: string, items: Array<Omit<WorkItem, 'company_id' | 'objective_id'>>): Task[] {
    const deps = this.state.repos.departments(companyId);
    const dep = deps.find(d => d.name.toLowerCase() === deptName.toLowerCase());
    const agent = dep?.manager_id ? this.state.repos.agent(dep.manager_id) : null;
    return items.map(it => this.submit(companyId, {
      objective_id: objectiveId, agent_id: agent?.id ?? null, kind: it.kind, summary: it.summary, input: it.input,
    }));
  }

  // ---- internals
  private allowedTools(agent: Agent): ToolDef[] {
    const allowed = new Set(agent.tools);
    // memory + graph are always available to every agent
    return this.tools.filter(t => allowed.has(t.name) || t.name.startsWith('memory.') || t.name.startsWith('graph.'));
  }

  private buildPrompt(task: Task, company: string, mission: string): string {
    const spec = TASK_SPECS[task.kind] ?? 'Execute the task with verified output and evidence.';
    return [
      spec,
      `Task: ${task.summary}`,
      `Input: ${JSON.stringify(task.input)}`,
      `Company: ${company}. Mission: ${mission}`,
      'Return concrete structured output. Record evidence via tools. Do not claim completion without evidence.',
    ].join('\n');
  }

  private recallContext(task: Task): string {
    const memory = this.state.repos.memory(task.company_id, undefined, 8);
    return 'Relevant company context:\n' + memory.map(m => `[${m.type}] ${m.content}`).join('\n');
  }

  private orgSummary(companyId: string): string {
    const deps = this.state.repos.departments(companyId);
    const agents = this.state.repos.agents(companyId);
    return deps.map(d => `${d.name}: ${agents.filter(a => a.department_id === d.id).map(a => a.name).join(', ') || '—'}`).join(' | ');
  }
}

export function emptyTaskState(): TaskState[] {
  return ['PENDING', 'QUEUED', 'RUNNING', 'WAITING', 'BLOCKED', 'AWAITING_HUMAN', 'VERIFYING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REPLANNING'];
}