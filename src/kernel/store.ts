import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';

export interface StoreOpts {
  path: string;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY, name TEXT, mission TEXT, created_at TEXT,
  status TEXT, health REAL, kpi TEXT
);
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY, company_id TEXT, parent_id TEXT, name TEXT,
  kind TEXT, manager_id TEXT, objectives TEXT, status TEXT
);
CREATE TABLE IF NOT EXISTS humans (
  id TEXT PRIMARY KEY, company_id TEXT, name TEXT, role TEXT,
  email TEXT, authority TEXT, status TEXT
);
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY, company_id TEXT, name TEXT, role TEXT,
  manager_id TEXT, department_id TEXT, model TEXT, tools TEXT,
  permissions TEXT, memory_scope TEXT, budget TEXT, status TEXT,
  objectives TEXT, version INTEGER, performance TEXT
);
CREATE TABLE IF NOT EXISTS objectives (
  id TEXT PRIMARY KEY, company_id TEXT, parent_id TEXT, kind TEXT,
  title TEXT, description TEXT, krs TEXT, status TEXT, owner_id TEXT,
  owner_kind TEXT, department_id TEXT, progress REAL, key_result_value REAL
);
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY, company_id TEXT, objective_id TEXT, agent_id TEXT,
  kind TEXT, summary TEXT, status TEXT, input TEXT, output TEXT,
  evidence TEXT, attempts INTEGER, max_attempts INTEGER, cost_usd REAL,
  created_at TEXT, started_at TEXT, finished_at TEXT, priority INTEGER,
  deadline TEXT, parent_task_id TEXT
);
CREATE TABLE IF NOT EXISTS events (
  seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT, company_id TEXT,
  type TEXT, ts TEXT, entity_id TEXT, entity_kind TEXT, payload TEXT
);
CREATE TABLE IF NOT EXISTS memory (
  id TEXT PRIMARY KEY, company_id TEXT, type TEXT, content TEXT,
  source TEXT, ts TEXT, confidence REAL, owner TEXT, version INTEGER,
  tags TEXT, active INTEGER
);
CREATE TABLE IF NOT EXISTS graph_nodes (
  id TEXT PRIMARY KEY, kind TEXT, name TEXT, props TEXT, ts TEXT
);
CREATE TABLE IF NOT EXISTS graph_edges (
  id TEXT PRIMARY KEY, "from" TEXT, "to" TEXT, kind TEXT, props TEXT, ts TEXT
);
CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY, company_id TEXT, actor_id TEXT, action TEXT,
  summary TEXT, risk TEXT, status TEXT, req_by TEXT, cost_usd REAL,
  authored_at TEXT, decided_at TEXT, decided_by TEXT, payload TEXT
);
CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY, company_id TEXT, kind TEXT, summary TEXT,
  reasoning TEXT, alternatives TEXT, confidence REAL, ts TEXT, actor_id TEXT
);
CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY, company_id TEXT, scope TEXT, allocated_usd REAL,
  used_usd REAL, limit_usd REAL, kind TEXT
);
CREATE TABLE IF NOT EXISTS traces (
  id TEXT PRIMARY KEY, company_id TEXT, task_id TEXT, agent_id TEXT,
  step TEXT, model TEXT, latency_ms REAL, cost_usd REAL,
  prompt_tokens INTEGER, completion_tokens INTEGER, ts TEXT, payload TEXT
);
CREATE TABLE IF NOT EXISTS learning (
  id TEXT PRIMARY KEY, company_id TEXT, kind TEXT, trigger TEXT,
  lesson TEXT, source TEXT, ts TEXT, applied_at TEXT, status TEXT
);
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY, company_id TEXT, objective_id TEXT, name TEXT,
  status TEXT, phase TEXT, budget_usd REAL, started_at TEXT, finished_at TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY, company_id TEXT, name TEXT, kind TEXT,
  definition TEXT, version INTEGER, status TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS capabilities (
  id TEXT PRIMARY KEY, company_id TEXT, name TEXT, kind TEXT,
  provider TEXT, description TEXT, status TEXT, cost_per_call REAL,
  cost_per_hour REAL, availability REAL
);
CREATE TABLE IF NOT EXISTS policies (
  id TEXT PRIMARY KEY, company_id TEXT, name TEXT, scope TEXT,
  rules TEXT, status TEXT
);
CREATE TABLE IF NOT EXISTS risks (
  id TEXT PRIMARY KEY, company_id TEXT, objective_id TEXT, title TEXT,
  probability REAL, impact REAL, exposure REAL, mitigation TEXT,
  owner_id TEXT, status TEXT
);
CREATE TABLE IF NOT EXISTS experiments (
  id TEXT PRIMARY KEY, company_id TEXT, objective_id TEXT, hypothesis TEXT,
  variant TEXT, metric TEXT, baseline REAL, current REAL,
  status TEXT, started_at TEXT
);
CREATE TABLE IF NOT EXISTS strategies (
  id TEXT PRIMARY KEY, company_id TEXT, name TEXT, kind TEXT,
  options TEXT, chosen TEXT, status TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY, company_id TEXT, task_id TEXT, project_id TEXT,
  name TEXT, kind TEXT, uri TEXT, checksum TEXT, created_by TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY, company_id TEXT, contract TEXT,
  from_agent TEXT, to_agent TEXT, to_department TEXT, payload TEXT,
  status TEXT, sent_at TEXT, actioned_at TEXT
);
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY, company_id TEXT, task_id TEXT, workflow_id TEXT,
  status TEXT, attempts INTEGER, max_attempts INTEGER, state TEXT,
  last_heartbeat TEXT, scheduled_at TEXT, started_at TEXT, finished_at TEXT, error TEXT
);
CREATE TABLE IF NOT EXISTS world_facts (
  id TEXT PRIMARY KEY, company_id TEXT, entity TEXT, attribute TEXT,
  value TEXT, kind TEXT, source TEXT, confidence REAL, ts TEXT,
  version INTEGER, active INTEGER
);
CREATE TABLE IF NOT EXISTS world_mirrors (
  id TEXT PRIMARY KEY, company_id TEXT, system TEXT, entity TEXT,
  payload TEXT, checksum TEXT, status TEXT, last_synced TEXT, drift INTEGER
);
CREATE TABLE IF NOT EXISTS foraged (
  id TEXT PRIMARY KEY, company_id TEXT, source TEXT, repo TEXT,
  name TEXT, description TEXT, url TEXT, license TEXT, language TEXT,
  stars INTEGER, updated_at TEXT, tags TEXT, status TEXT, seed TEXT,
  score REAL, notes TEXT, foraged_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_company ON events(company_id, seq);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(company_id, type);
CREATE INDEX IF NOT EXISTS idx_tasks_company ON tasks(company_id, status);
CREATE INDEX IF NOT EXISTS idx_agents_company ON agents(company_id, status);
CREATE INDEX IF NOT EXISTS idx_graph_edges_from ON graph_edges("from");
CREATE INDEX IF NOT EXISTS idx_graph_edges_to ON graph_edges("to");
`;

export class Store {
  db: DatabaseSync;

  constructor(opts: StoreOpts) {
    mkdirSync(dirname(opts.path), { recursive: true });
    this.db = new DatabaseSync(opts.path);
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec(SCHEMA);
  }

  close(): void {
    this.db.close();
  }
}

export const defaultDataPath = (dir: string): string =>
  isAbsolute(dir) ? join(dir, 'pluto.db') : join(process.cwd(), dir, 'pluto.db');