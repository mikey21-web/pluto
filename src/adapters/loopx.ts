// REPO: https://github.com/huangruiteng/loopx
// CAPABILITY: Stateful control-plane kernel for long-running agent loops — durable goals, gates, todos, evidence, quota, and handoffs across agent turns
// INSTALL: pip install loopx (Python CLI / local-first state kernel)
// INTEGRATION: http-client (LoopX exposes a local REST API when running as daemon)

export interface LoopXObjective {
  id: string;
  title: string;
  status: 'open' | 'gated' | 'running' | 'complete' | 'blocked';
  quota?: number;
  quotaUsed?: number;
}

export interface LoopXTodo {
  id: string;
  objectiveId: string;
  description: string;
  status: 'pending' | 'in_progress' | 'done' | 'skipped';
  evidence?: string;
}

export interface LoopXAdapter {
  createObjective(title: string, quota?: number): Promise<LoopXObjective>;
  getObjective(id: string): Promise<LoopXObjective>;
  listObjectives(): Promise<LoopXObjective[]>;
  addTodo(objectiveId: string, description: string): Promise<LoopXTodo>;
  completeTodo(todoId: string, evidence?: string): Promise<LoopXTodo>;
  listTodos(objectiveId: string): Promise<LoopXTodo[]>;
  addEvidence(objectiveId: string, evidence: string): Promise<{ ok: boolean }>;
  handoff(objectiveId: string, toAgent?: string, notes?: string): Promise<{ handoffId: string }>;
  getStatus(): Promise<{ connected: boolean; objectivesOpen?: number }>;
}

export function makeLoopXAdapter(config?: { baseUrl?: string; apiKey?: string }): LoopXAdapter {
  const { baseUrl, apiKey } = config ?? {};

  if (baseUrl) {
    const headers = () => ({
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    });

    return {
      async createObjective(title, quota) {
        const r = await fetch(`${baseUrl}/api/objectives`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ title, quota }),
        });
        if (!r.ok) throw new Error(`loopx createObjective: ${r.status}`);
        return r.json() as Promise<LoopXObjective>;
      },
      async getObjective(id) {
        const r = await fetch(`${baseUrl}/api/objectives/${id}`, { headers: headers() });
        if (!r.ok) throw new Error(`loopx getObjective: ${r.status}`);
        return r.json() as Promise<LoopXObjective>;
      },
      async listObjectives() {
        const r = await fetch(`${baseUrl}/api/objectives`, { headers: headers() });
        if (!r.ok) throw new Error(`loopx listObjectives: ${r.status}`);
        const j = await r.json() as any;
        return Array.isArray(j) ? j : (j.objectives ?? []);
      },
      async addTodo(objectiveId, description) {
        const r = await fetch(`${baseUrl}/api/objectives/${objectiveId}/todos`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ description }),
        });
        if (!r.ok) throw new Error(`loopx addTodo: ${r.status}`);
        return r.json() as Promise<LoopXTodo>;
      },
      async completeTodo(todoId, evidence) {
        const r = await fetch(`${baseUrl}/api/todos/${todoId}/complete`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ evidence }),
        });
        if (!r.ok) throw new Error(`loopx completeTodo: ${r.status}`);
        return r.json() as Promise<LoopXTodo>;
      },
      async listTodos(objectiveId) {
        const r = await fetch(`${baseUrl}/api/objectives/${objectiveId}/todos`, { headers: headers() });
        if (!r.ok) throw new Error(`loopx listTodos: ${r.status}`);
        const j = await r.json() as any;
        return Array.isArray(j) ? j : (j.todos ?? []);
      },
      async addEvidence(objectiveId, evidence) {
        const r = await fetch(`${baseUrl}/api/objectives/${objectiveId}/evidence`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ evidence }),
        });
        return { ok: r.ok };
      },
      async handoff(objectiveId, toAgent, notes) {
        const r = await fetch(`${baseUrl}/api/objectives/${objectiveId}/handoff`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ to_agent: toAgent, notes }),
        });
        if (!r.ok) throw new Error(`loopx handoff: ${r.status}`);
        return r.json() as Promise<{ handoffId: string }>;
      },
      async getStatus() {
        try {
          const r = await fetch(`${baseUrl}/health`, { headers: headers() });
          if (!r.ok) return { connected: false };
          const j = await r.json() as any;
          return { connected: true, objectivesOpen: j.objectives_open };
        } catch {
          return { connected: false };
        }
      },
    };
  }

  return {
    async createObjective(title) {
      console.log(`[LoopX stub] createObjective: ${title}`);
      return { id: 'stub-obj', title, status: 'open' };
    },
    async getObjective(id) { return { id, title: 'stub', status: 'open' }; },
    async listObjectives() { return []; },
    async addTodo(objectiveId, description) {
      console.log(`[LoopX stub] addTodo: ${description}`);
      return { id: 'stub-todo', objectiveId, description, status: 'pending' };
    },
    async completeTodo(todoId) { return { id: todoId, objectiveId: '', description: '', status: 'done' }; },
    async listTodos() { return []; },
    async addEvidence() { return { ok: false }; },
    async handoff() { return { handoffId: 'stub-handoff' }; },
    async getStatus() { return { connected: false }; },
  };
}
