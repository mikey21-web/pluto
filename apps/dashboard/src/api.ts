const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

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
  approvals: (companyId: string) =>
    fetch(`${BASE}/api/company/${companyId}/snapshot`)
      .then(r => r.json())
      .then((s: any) => (s.approvals ?? []) as Approval[]),
  decide: (approvalId: string, decision: 'approved' | 'rejected') =>
    fetch(`${BASE}/api/approvals/${approvalId}/decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, by: 'founder' }),
    }).then(r => r.json()),
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

export type Approval = {
  id: string;
  action: string;
  summary: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'approved' | 'rejected';
  authored_at: string;
  actor_id?: string;
};

export type Memory = {
  id: string;
  type: 'episodic' | 'semantic' | 'working';
  content: string;
  ts: string;
  confidence: number;
};

export type Snapshot = {
  company: Company;
  agents: Agent[];
  tasks: Task[];
  events: Event[];
  departments: Array<{ id: string; name: string }>;
  approvals: Approval[];
  memory: Memory[];
};
