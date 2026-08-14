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
      const pending = tasks.slice(0, 3); // ponytail: max 3 concurrent per company, raise if throughput matters
      for (const task of pending) {
        await this.executeTask(company, task);
      }
    }
  }

  private async executeTask(company: any, task: any): Promise<void> {
    try {
      // Mark running
      task.status = 'RUNNING';
      task.started_at = new Date().toISOString();
      this.state.repos.saveTask(task);
      this.state.emit(company.id, 'task.running', task.id, 'task', { summary: task.summary });

      const role = pickRole(task);
      const result = await callGroq(this.config.groqApiKey, role, task.summary, company.mission);

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

async function callGroq(apiKey: string, role: string, taskSummary: string, companyMission: string): Promise<string> {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 400,
      messages: [
        { role: 'system', content: `You are the ${role} of a company with mission: "${companyMission}". You are autonomous and action-oriented. Complete tasks concisely with specific outputs, decisions, or plans. No fluff.` },
        { role: 'user', content: `Task: ${taskSummary}\n\nProvide your output as ${role}:` }
      ]
    })
  });
  const data = await r.json() as any;
  if (!r.ok) throw new Error(data?.error?.message ?? 'Groq error');
  return data.choices[0].message.content.trim();
}
