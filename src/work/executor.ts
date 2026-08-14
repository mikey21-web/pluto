import { PlutoState } from '../kernel/state.ts';

interface ExecConfig {
  groqApiKey: string;
  pollMs?: number; // default 10000
}

export class AgentExecutor {
  private state: PlutoState;
  private config: ExecConfig;
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(state: PlutoState, config: ExecConfig) {
    this.state = state;
    this.config = config;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.timer = setInterval(() => this.tick(), this.config.pollMs ?? 10000);
    console.log('[executor] started, polling every', this.config.pollMs ?? 10000, 'ms');
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.running = false;
  }

  private async tick(): Promise<void> {
    const companies = this.state.repos.companies();
    for (const company of companies) {
      const tasks = this.state.repos.tasks(company.id, 'PENDING');
      const pending = tasks.slice(0, 3); // ponytail: max 3 concurrent per company
      for (const task of pending) {
        await this.executeTask(company, task);
      }
    }
  }

  private async executeTask(company: any, task: any): Promise<void> {
    try {
      task.status = 'RUNNING';
      task.started_at = new Date().toISOString();
      this.state.repos.saveTask(task);
      this.state.emit(company.id, 'task.running', task.id, 'task', { summary: task.summary });

      const role = pickRole(task);

      // Gap 1: read recent memory so agent knows what it's done before
      const memories = this.state.repos.memory(company.id, undefined, 10);
      const memContext = memories.length
        ? '\n\nPast context (most recent first):\n' + memories.map(m => `- [${m.type}] ${m.content}`).join('\n')
        : '';

      // Gap 2+3: use tool-calling loop so agent can spawn sub-tasks and call tools
      const result = await runAgentLoop(
        this.config.groqApiKey,
        role,
        task.summary,
        company.mission,
        memContext,
        // tool executor: gives agent real capabilities
        async (toolName: string, toolArgs: any) => {
          return await executeTool(toolName, toolArgs, company, task, this.state);
        }
      );

      // write what the agent learned to memory
      this.state.repos.writeMemory({
        company_id: company.id,
        type: 'episodic',
        content: `[${role}] completed task "${task.summary.slice(0, 80)}": ${result.slice(0, 200)}`,
        source: task.id,
        confidence: 0.8,
      });

      task.status = 'SUCCEEDED';
      task.finished_at = new Date().toISOString();
      task.output = { result };
      this.state.repos.saveTask(task);
      this.state.emit(company.id, 'task.succeeded', task.id, 'task', { summary: task.summary, result: result.slice(0, 120) });
    } catch (e) {
      task.status = 'FAILED';
      task.finished_at = new Date().toISOString();
      this.state.repos.saveTask(task);
      this.state.emit(company.id, 'task.failed', task.id, 'task', { error: String(e) });
    }
  }
}

// Gap 3: tool definitions given to Groq
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'http_get',
      description: 'Fetch a public URL and return the response text (max 2000 chars). Use for research.',
      parameters: {
        type: 'object',
        properties: { url: { type: 'string', description: 'The URL to fetch' } },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'memory_write',
      description: 'Save a key insight or decision to company memory for future agent runs.',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'The insight or fact to remember' },
          type: { type: 'string', enum: ['episodic', 'semantic', 'working'], description: 'Memory type' },
        },
        required: ['content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'task_spawn',
      description: 'Spawn a sub-task for another agent to handle. Use to delegate specialized work.',
      parameters: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'What the sub-task should accomplish' },
          kind: { type: 'string', description: 'Task kind, e.g. research, code, ops, finance' },
        },
        required: ['summary'],
      },
    },
  },
];

// Gap 2+3: agentic loop — runs up to 5 rounds of tool calls before final answer
async function runAgentLoop(
  apiKey: string,
  role: string,
  taskSummary: string,
  mission: string,
  memContext: string,
  runTool: (name: string, args: any) => Promise<string>,
): Promise<string> {
  const messages: any[] = [
    {
      role: 'system',
      content: `You are the ${role} of a company with mission: "${mission}". You are autonomous and action-oriented.${memContext}

You have tools available: use http_get to research URLs, memory_write to record insights, task_spawn to delegate work to other agents. Use tools when they genuinely help. After gathering what you need, provide your final output directly — specific decisions, plans, or deliverables. No fluff.`,
    },
    { role: 'user', content: `Task: ${taskSummary}\n\nComplete this task as ${role}:` },
  ];

  for (let round = 0; round < 5; round++) {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 4096,
        tools: TOOLS,
        tool_choice: 'auto',
        messages,
      }),
    });
    const data = await r.json() as any;
    if (!r.ok) throw new Error(data?.error?.message ?? 'Groq error');

    const msg = data.choices[0].message;
    messages.push(msg);

    // no tool calls → done
    if (!msg.tool_calls?.length) return msg.content?.trim() ?? '';

    // execute each tool call and feed results back
    for (const tc of msg.tool_calls) {
      let toolResult: string;
      try {
        const args = JSON.parse(tc.function.arguments ?? '{}');
        toolResult = await runTool(tc.function.name, args);
      } catch (e) {
        toolResult = `error: ${String(e)}`;
      }
      messages.push({ role: 'tool', tool_call_id: tc.id, content: toolResult });
    }
  }

  // fallback: ask for final answer without tools
  messages.push({ role: 'user', content: 'Provide your final answer now.' });
  const final = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', max_tokens: 4096, messages }),
  });
  const fd = await final.json() as any;
  return fd.choices?.[0]?.message?.content?.trim() ?? 'no output';
}

// Gap 3: real tool implementations
async function executeTool(
  name: string,
  args: any,
  company: any,
  task: any,
  state: PlutoState,
): Promise<string> {
  if (name === 'http_get') {
    try {
      const res = await fetch(args.url, { signal: AbortSignal.timeout(8000) });
      const text = await res.text();
      // strip HTML tags for readability, cap at 2000 chars
      return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000);
    } catch (e) {
      return `fetch failed: ${String(e)}`;
    }
  }

  if (name === 'memory_write') {
    state.repos.writeMemory({
      company_id: company.id,
      type: (args.type as any) ?? 'semantic',
      content: args.content,
      source: task.id,
      confidence: 0.9,
    });
    state.emit(company.id, 'memory.written', task.id, 'memory', { content: args.content.slice(0, 80) });
    return 'memory saved';
  }

  if (name === 'task_spawn') {
    const child = state.repos.createTask({
      company_id: company.id,
      summary: args.summary,
      kind: args.kind ?? 'task',
      agent_id: null,
      objective_id: task.objective_id ?? null,
    });
    state.emit(company.id, 'task.spawned', child.id, 'task', { parent: task.id, summary: args.summary });
    return `sub-task spawned: ${child.id}`;
  }

  return `unknown tool: ${name}`;
}

function pickRole(task: any): string {
  const s = (task.summary ?? task.kind ?? '').toLowerCase();
  if (s.includes('budget') || s.includes('finance') || s.includes('cost') || s.includes('revenue')) return 'CFO';
  if (s.includes('ops') || s.includes('operation') || s.includes('process') || s.includes('execut')) return 'COO';
  if (s.includes('market') || s.includes('brand') || s.includes('content') || s.includes('post')) return 'CMO';
  if (s.includes('code') || s.includes('build') || s.includes('develop') || s.includes('engineer')) return 'CTO';
  if (s.includes('hire') || s.includes('team') || s.includes('recruit') || s.includes('people')) return 'HR Director';
  if (s.includes('legal') || s.includes('compli') || s.includes('contract')) return 'Legal Counsel';
  return 'CEO';
}
