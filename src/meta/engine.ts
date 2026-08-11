import { PlutoState } from '../kernel/state.ts';
import type { Agent, ToolDef } from '../kernel/types.ts';
import { makeDriver } from '../agents/llm.ts';
import type { LlmDriver } from '../kernel/types.ts';
import { AgentFactory } from '../learn/engine.ts';

/** A capability gap the Meta-Agent noticed and can close. */
export interface CapabilityGap {
  capability: string;
  reason: string;
  source_task: string | null;
  evidence: string;
}

/** An agent spec: everything needed to register a new worker (P1 §1c). */
export interface AgentSpec {
  name: string;
  role: string;
  prompt: string;
  tools: string[];
  permissions: string[];
  budget_usd: number;
  kpis: Array<{ label: string; target: number; unit: string }>;
  department_id: string | null;
}

const STANDARD_KINDS = new Set([
  'research', 'enrich', 'outreach', 'qualify', 'propose', 'invoice',
  'deliver', 'verify', 'report', 'write', 'support',
]);

function inferCapabilityKind(kind: string): string | null {
  if (!kind || STANDARD_KINDS.has(kind)) return null;
  return kind;
}

function defaultSpec(capability: string): AgentSpec {
  const role = `${capability.replace(/[^a-z0-9]+/g, '_')}_specialist`;
  return {
    name: `${capability.replace(/[^a-z0-9]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim()} Agent`,
    role,
    prompt: `Operate as the ${role}. Own every ${capability} task end-to-end: research with real tools, record evidence, escalate what you cannot verify. Never invent facts; an unsupported claim is failure.`,
    tools: ['http.get', 'memory.write', 'memory.recall', 'graph.lookup', 'fs.write'],
    permissions: [`run_${capability.replace(/[^a-z0-9]+/g, '_')}`],
    budget_usd: 100,
    kpis: [{ label: capability, target: 1, unit: 'per week' }],
    department_id: null,
  };
}

/** Best-effort JSON parse of an LLM spec reply (strips markdown fences). */
function parseSpec(text: string): Partial<AgentSpec> {
  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  try {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end <= start) return {};
    const obj = JSON.parse(cleaned.slice(start, end + 1));
    return {
      name: typeof obj.name === 'string' ? obj.name : undefined,
      role: typeof obj.role === 'string' ? obj.role : undefined,
      prompt: typeof obj.prompt === 'string' ? obj.prompt : undefined,
      tools: Array.isArray(obj.tools) ? obj.tools.filter((t: unknown): t is string => typeof t === 'string') : undefined,
      permissions: Array.isArray(obj.permissions) ? obj.permissions.filter((p: unknown): p is string => typeof p === 'string') : undefined,
      budget_usd: typeof obj.budget_usd === 'number' ? obj.budget_usd : undefined,
      kpis: Array.isArray(obj.kpis) ? obj.kpis : undefined,
      department_id: typeof obj.department_id === 'string' || obj.department_id === null ? obj.department_id : undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Meta-Agent (P1, PLAN 1c): gap detection, agent generation, registration,
 * introspection, and kill switch. Spawned entities are normal agents with a
 * versioned spec, seeded memory, and a registered capability — never special.
 */
export class MetaAgent {
  private state: PlutoState;
  private driver: LlmDriver;
  private tools: ToolDef[];
  private factory: AgentFactory;

  constructor(state: PlutoState, opts: { driver?: LlmDriver; tools?: ToolDef[] } = {}) {
    this.state = state;
    this.driver = opts.driver ?? makeDriver();
    this.tools = opts.tools ?? [];
    this.factory = new AgentFactory(state);
  }

  /** Gap detector: failed tasks with unfamiliar kinds + unknown tool calls. */
  detectGaps(companyId: string): CapabilityGap[] {
    const gaps: CapabilityGap[] = [];
    const seen = new Set<string>();

    for (const t of this.state.repos.tasks(companyId, 'FAILED').slice(0, 50)) {
      const cap = inferCapabilityKind(t.kind);
      if (cap && !seen.has(cap)) {
        seen.add(cap);
        gaps.push({
          capability: cap,
          reason: `task "${t.summary}" (${t.kind}) failed`,
          source_task: t.id,
          evidence: String(t.output?.failure ?? t.output?.refused ?? ''),
        });
      }
    }

    for (const tr of this.state.repos.traces(companyId, 200)) {
      const content = String(tr.payload?.text ?? '');
      const m = /Unknown tool: (\w+)/.exec(content);
      if (m && !seen.has(m[1])) {
        seen.add(m[1]);
        gaps.push({ capability: m[1], reason: `agent called unknown tool "${m[1]}"`, source_task: tr.task_id, evidence: content.slice(0, 120) });
      }
    }

    const covered = new Set([
      ...this.state.repos.capabilities(companyId).map(c => c.name.toLowerCase()),
      ...this.state.repos.agents(companyId).map(a => a.role.toLowerCase()),
    ]);
    return gaps.filter(g => !covered.has(g.capability.toLowerCase()));
  }

  /** Agent generator: LLM writes a spec; any parse failure falls back to a deterministic default. */
  async generateSpec(companyId: string, gap: CapabilityGap): Promise<AgentSpec> {
    const company = this.state.repos.company(companyId);
    const prompt = [
      'Design a single autonomous agent to close a capability gap for an autonomous company.',
      `Company: ${company?.name ?? 'unknown'}. Mission: ${company?.mission ?? ''}`,
      `Capability gap: ${gap.capability}. Reason: ${gap.reason}`,
      'Return ONLY JSON with exactly these fields:',
      '{"name": string, "role": string, "prompt": string (2-3 sentences of operating instructions), "tools": string[], "permissions": string[], "budget_usd": number, "kpis": [{"label": string, "target": number, "unit": string}], "department_id": null}',
    ].join('\n');
    const comp = await this.driver.complete([{ role: 'user', content: prompt }], []);
    const spec = { ...defaultSpec(gap.capability), ...parseSpec(comp.text) };
    if (!spec.kpis || spec.kpis.length === 0) spec.kpis = defaultSpec(gap.capability).kpis;
    if (!spec.name || !spec.role) return defaultSpec(gap.capability);
    return spec;
  }

  /** Registration flow: create the agent, set its budget, register the capability, seed memory. */
  spawn(companyId: string, spec: AgentSpec): Agent {
    const agent = this.factory.createForCapability({
      company_id: companyId,
      name: spec.name,
      role: spec.role,
      department_id: spec.department_id ?? null,
      tools: spec.tools,
      permissions: spec.permissions,
    });
    if (spec.budget_usd > 0) {
      agent.budget.monthly_usd = spec.budget_usd;
      this.state.repos.saveAgent(agent);
    }
    this.state.repos.registerCapability({
      company_id: companyId, name: spec.role, kind: 'internal', provider: 'meta',
      description: spec.prompt, cost_per_call: 0, cost_per_hour: 0, availability: 1,
    });
    this.state.remember(companyId, `Meta-agent spawned ${spec.name} (${spec.role}) — ${spec.prompt}`, {
      type: 'organizational', owner: agent.id,
    });
    this.state.emit(companyId, 'meta.agent_spawned', agent.id, 'agent', {
      role: spec.role, kpis: spec.kpis.length, budget_usd: spec.budget_usd,
    });
    return agent;
  }

  /** Detect + generate + spawn in one call (the API / test path). */
  async spawnForGap(companyId: string, capability: string, reason = 'explicit request'): Promise<{ agent: Agent; spec: AgentSpec; gap: CapabilityGap }> {
    const gap: CapabilityGap = { capability, reason, source_task: null, evidence: '' };
    const spec = await this.generateSpec(companyId, gap);
    const agent = this.spawn(companyId, spec);
    return { agent, spec, gap };
  }

  /** Kill switch: retire a spawned entity and record the event. */
  kill(companyId: string, agentId: string): Agent | null {
    const a = this.state.repos.agent(agentId);
    if (!a || a.company_id !== companyId) return null;
    this.factory.retire(a);
    this.state.remember(companyId, `Meta-agent retired ${a.name} (${a.role}).`, { type: 'organizational', owner: a.id });
    this.state.emit(companyId, 'meta.agent_killed', a.id, 'agent', { role: a.role });
    return a;
  }

  /** Introspection: what the system can/cannot do right now. */
  whatCanIDo(companyId: string) {
    return {
      company_id: companyId,
      capabilities: this.state.repos.capabilities(companyId).map(c => ({ name: c.name, kind: c.kind, provider: c.provider, status: c.status })),
      agents: this.state.repos.agents(companyId).map(a => ({
        id: a.id, name: a.name, role: a.role, status: a.status,
        tools: a.tools, permissions: a.permissions,
        budget_usd: a.budget.monthly_usd, success_rate: Number(a.performance.success_rate ?? 0),
      })),
      tools: this.tools.map(t => t.name),
      gaps: this.detectGaps(companyId),
      budgets: this.state.repos.budgets(companyId).map(b => ({ scope: b.scope, used_usd: b.used_usd, limit_usd: b.limit_usd })),
    };
  }
}
