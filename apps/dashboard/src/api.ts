const BASE = '';

export const api = {
  companies: () => fetch(`${BASE}/api/companies`).then(r => r.json()),
  snapshot: (id: string) => fetch(`${BASE}/api/company/${id}/snapshot`).then(r => r.json()),
  spawnCompany: (name: string, mission: string) =>
    fetch(`${BASE}/api/companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, mission }),
    }).then(r => r.json()),
  createTask: (companyId: string, summary: string) =>
    fetch(`${BASE}/api/company/${companyId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary }),
    }).then(r => r.json()),
  chat: (message: string, companyId?: string) =>
    fetch(`${BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, companyId }),
    }).then(r => r.json()),
  // /events for cross-company feed
  events: () => fetch(`${BASE}/events`).then(r => r.json()).catch(() => []),
};

export type Company = {
  id: string;
  name: string;
  mission: string;
  health: string;
  agents: number;
  departments: number;
  tasks_total: number;
  tasks_failed: number;
  spend: number;
};

export type Agent = {
  id: string;
  name: string;
  role: string;
  status: string;
};

export type Task = {
  id: string;
  summary: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  agent_id?: string;
  result?: string;
  created_at?: string;
};

export type Event = {
  id?: string;
  type: string;
  ts?: string;
  payload?: Record<string, unknown>;
};

export type Snapshot = {
  company: Company;
  agents: Agent[];
  tasks: Task[];
  events: Event[];
  departments: Array<{ id: string; name: string }>;
};
