import { Store } from './store.ts';
import type {
  Agent, ApprovalRequest, Artifact, BudgetRow, Capability, Company, DecisionRecord, Department,
  EventRecord, Experiment, GraphEdge, GraphNode, Human, Job, LearningRecord, MemoryRecord,
  Message, Objective, Policy, Project, Risk, Strategy, Task, TraceRecord, Workflow, ID,
} from './types.ts';
import { newId, now } from './types.ts';

const json = <T>(v: T): string => JSON.stringify(v);
const parse = <T>(s: string | null, fallback: T): T => {
  try { return s ? (JSON.parse(s) as T) : fallback; } catch { return fallback; }
};

export class Repos {
  private store: Store;

  constructor(store: Store) {
    this.store = store;
  }

  // ---- companies
  createCompany(name: string, mission: string): Company {
    const c: Company = {
      id: newId('co'), name, mission, created_at: now(),
      status: 'active', health: 0.5, kpi: {},
    };
    this.store.db.prepare(
      'INSERT INTO companies (id,name,mission,created_at,status,health,kpi) VALUES (?,?,?,?,?,?,?)'
    ).run(c.id, c.name, c.mission, c.created_at, c.status, c.health, json(c.kpi));
    this.upsertNode(c.id, 'company', c.name, { mission: c.mission });
    return c;
  }
  company(id: string): Company | null {
    const r: any = this.store.db.prepare('SELECT * FROM companies WHERE id=?').get(id);
    if (!r) return null;
    r.kpi = parse(r.kpi, {}); return r;
  }
  companies(): Company[] {
    const rs: any[] = this.store.db.prepare('SELECT * FROM companies ORDER BY created_at').all();
    return rs.map(r => ({ ...r, kpi: parse(r.kpi, {}) }));
  }
  saveCompany(c: Company): void {
    this.store.db.prepare(
      'UPDATE companies SET name=?,mission=?,status=?,health=?,kpi=? WHERE id=?'
    ).run(c.name, c.mission, c.status, c.health, json(c.kpi), c.id);
  }

  // ---- departments
  createDepartment(c: { company_id: string; name: string; kind: string; parent_id?: string; manager_id?: string }): Department {
    const d: Department = {
      id: newId('dep'), company_id: c.company_id, parent_id: c.parent_id ?? null,
      name: c.name, kind: c.kind, manager_id: c.manager_id ?? null,
      objectives: [], status: 'active',
    };
    this.store.db.prepare(
      'INSERT INTO departments (id,company_id,parent_id,name,kind,manager_id,objectives,status) VALUES (?,?,?,?,?,?,?,?)'
    ).run(d.id, d.company_id, d.parent_id, d.name, d.kind, d.manager_id, json(d.objectives), d.status);
    this.upsertNode(d.id, 'department', d.name, { company_id: d.company_id, kind: d.kind });
    if (d.parent_id) this.upsertEdge(d.parent_id, d.id, 'owns', {});
    return d;
  }
  department(id: string): Department | null {
    const r: any = this.store.db.prepare('SELECT * FROM departments WHERE id=?').get(id);
    if (!r) return null;
    r.objectives = parse(r.objectives, []); return r;
  }
  setDepartmentManager(id: string, managerId: string): void {
    this.store.db.prepare('UPDATE departments SET manager_id=? WHERE id=?').run(managerId, id);
  }
  departments(companyId: string): Department[] {
    const rs: any[] = this.store.db.prepare('SELECT * FROM departments WHERE company_id=?').all(companyId);
    return rs.map(r => ({ ...r, objectives: parse(r.objectives, []) }));
  }

  // ---- humans
  createHuman(c: { company_id: string; name: string; role: string; email?: string; authority?: string[] }): Human {
    const h: Human = {
      id: newId('hum'), company_id: c.company_id, name: c.name, role: c.role,
      email: c.email ?? '', authority: c.authority ?? [], status: 'active',
    };
    this.store.db.prepare(
      'INSERT INTO humans (id,company_id,name,role,email,authority,status) VALUES (?,?,?,?,?,?,?)'
    ).run(h.id, h.company_id, h.name, h.role, h.email, json(h.authority), h.status);
    this.upsertNode(h.id, 'human', h.name, { company_id: h.company_id, role: h.role });
    return h;
  }
  humans(companyId: string): Human[] {
    const rs: any[] = this.store.db.prepare('SELECT * FROM humans WHERE company_id=?').all(companyId);
    return rs.map(r => ({ ...r, authority: parse(r.authority, []) }));
  }
  human(id: string): Human | null {
    const r: any = this.store.db.prepare('SELECT * FROM humans WHERE id=?').get(id);
    if (!r) return null;
    r.authority = parse(r.authority, []); return r;
  }

  // ---- agents
  createAgent(c: Partial<Agent> & { company_id: string; name: string; role: string }): Agent {
    const a: Agent = {
      id: newId('agt'), company_id: c.company_id, name: c.name, role: c.role,
      manager_id: c.manager_id ?? null, department_id: c.department_id ?? null,
      model: c.model ?? 'mock-v4-flash', tools: c.tools ?? [], permissions: c.permissions ?? [],
      memory_scope: c.memory_scope ?? ['episodic', 'semantic'], budget: { monthly_usd: 100, used_usd: 0 },
      status: c.status ?? 'active', objectives: c.objectives ?? [], version: 1,
      performance: c.performance ?? { success_rate: 0, tasks_done: 0, cost_usd: 0 },
    };
    this.store.db.prepare(
      'INSERT INTO agents (id,company_id,name,role,manager_id,department_id,model,tools,permissions,memory_scope,budget,status,objectives,version,performance) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
    ).run(a.id, a.company_id, a.name, a.role, a.manager_id, a.department_id, a.model,
      json(a.tools), json(a.permissions), json(a.memory_scope), json(a.budget), a.status,
      json(a.objectives), a.version, json(a.performance));
    this.upsertNode(a.id, 'agent', a.name, { company_id: a.company_id, role: a.role, department_id: a.department_id, manager_id: a.manager_id });
    if (a.manager_id) this.upsertEdge(a.manager_id, a.id, 'reports_to', {});
    if (a.department_id) this.upsertEdge(a.department_id, a.id, 'owns', {});
    return a;
  }
  agent(id: string): Agent | null {
    const r: any = this.store.db.prepare('SELECT * FROM agents WHERE id=?').get(id);
    if (!r) return null;
    r.tools = parse(r.tools, []); r.permissions = parse(r.permissions, []);
    r.memory_scope = parse(r.memory_scope, []); r.budget = parse(r.budget, {});
    r.objectives = parse(r.objectives, []); r.performance = parse(r.performance, {});
    return r;
  }
  agents(companyId: string): Agent[] {
    const rs: any[] = this.store.db.prepare('SELECT * FROM agents WHERE company_id=?').all(companyId);
    return rs.map(r => {
      r.tools = parse(r.tools, []); r.permissions = parse(r.permissions, []);
      r.memory_scope = parse(r.memory_scope, []); r.budget = parse(r.budget, {});
      r.objectives = parse(r.objectives, []); r.performance = parse(r.performance, {});
      return r;
    });
  }
  saveAgent(a: Agent): void {
    this.store.db.prepare(
      'UPDATE agents SET manager_id=?,department_id=?,model=?,tools=?,permissions=?,memory_scope=?,budget=?,status=?,objectives=?,version=?,performance=? WHERE id=?'
    ).run(a.manager_id, a.department_id, a.model, json(a.tools), json(a.permissions),
      json(a.memory_scope), json(a.budget), a.status, json(a.objectives), a.version, json(a.performance), a.id);
  }

  // ---- objectives
  createObjective(c: Partial<Objective> & { company_id: string; title: string }): Objective {
    const o: Objective = {
      id: newId('obj'), company_id: c.company_id, parent_id: c.parent_id ?? null,
      kind: c.kind ?? 'company', title: c.title, description: c.description ?? '',
      krs: c.krs ?? [], status: c.status ?? 'active', owner_id: c.owner_id ?? null,
      owner_kind: c.owner_kind ?? 'agent', department_id: c.department_id ?? null,
      progress: 0, key_result_value: 0,
    };
    this.store.db.prepare(
      'INSERT INTO objectives (id,company_id,parent_id,kind,title,description,krs,status,owner_id,owner_kind,department_id,progress,key_result_value) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
    ).run(o.id, o.company_id, o.parent_id, o.kind, o.title, o.description, json(o.krs), o.status,
      o.owner_id, o.owner_kind, o.department_id, o.progress, o.key_result_value);
    this.upsertNode(o.id, 'objective', o.title, { company_id: o.company_id, kind: o.kind, parent_id: o.parent_id });
    const parent = o.parent_id ? this.upsertEdge(o.parent_id, o.id, 'derived_from', {}) : null;
    void parent;
    return o;
  }
  objective(id: string): Objective | null {
    const r: any = this.store.db.prepare('SELECT * FROM objectives WHERE id=?').get(id);
    if (!r) return null;
    r.krs = parse(r.krs, []); return r;
  }
  objectives(companyId: string): Objective[] {
    const rs: any[] = this.store.db.prepare('SELECT * FROM objectives WHERE company_id=?').all(companyId);
    return rs.map(r => ({ ...r, krs: parse(r.krs, []) }));
  }
  childObjectives(parentId: string): Objective[] {
    const rs: any[] = this.store.db.prepare('SELECT * FROM objectives WHERE parent_id=?').all(parentId);
    return rs.map(r => ({ ...r, krs: parse(r.krs, []) }));
  }
  saveObjective(o: Objective): void {
    this.store.db.prepare(
      'UPDATE objectives SET parent_id=?,kind=?,title=?,description=?,krs=?,status=?,owner_id=?,owner_kind=?,department_id=?,progress=?,key_result_value=? WHERE id=?'
    ).run(o.parent_id, o.kind, o.title, o.description, json(o.krs), o.status, o.owner_id,
      o.owner_kind, o.department_id, o.progress, o.key_result_value, o.id);
  }

  // ---- tasks
  createTask(c: Partial<Task> & { company_id: string; summary: string }): Task {
    const t: Task = {
      id: newId('tsk'), company_id: c.company_id, objective_id: c.objective_id ?? null,
      agent_id: c.agent_id ?? null, kind: c.kind ?? 'task', summary: c.summary,
      status: c.status ?? 'PENDING', input: c.input ?? {}, output: c.output ?? {},
      evidence: c.evidence ?? [], attempts: c.attempts ?? 0, max_attempts: c.max_attempts ?? 3,
      cost_usd: c.cost_usd ?? 0, created_at: c.created_at ?? now(), started_at: c.started_at ?? null,
      finished_at: c.finished_at ?? null, priority: c.priority ?? 5, deadline: c.deadline ?? null,
      parent_task_id: c.parent_task_id ?? null,
    };
    this.store.db.prepare(
      'INSERT INTO tasks (id,company_id,objective_id,agent_id,kind,summary,status,input,output,evidence,attempts,max_attempts,cost_usd,created_at,started_at,finished_at,priority,deadline,parent_task_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
    ).run(t.id, t.company_id, t.objective_id, t.agent_id, t.kind, t.summary, t.status,
      json(t.input), json(t.output), json(t.evidence), t.attempts, t.max_attempts, t.cost_usd,
      t.created_at, t.started_at, t.finished_at, t.priority, t.deadline, t.parent_task_id);
    this.upsertNode(t.id, 'task', t.summary, { status: t.status, objective_id: t.objective_id, agent_id: t.agent_id });
    if (t.objective_id) this.upsertEdge(t.objective_id, t.id, 'produces', {});
    return t;
  }
  task(id: string): Task | null {
    const r: any = this.store.db.prepare('SELECT * FROM tasks WHERE id=?').get(id);
    if (!r) return null;
    r.input = parse(r.input, {}); r.output = parse(r.output, {});
    r.evidence = parse(r.evidence, []); return r;
  }
  tasks(companyId: string, status?: string): Task[] {
    const rs: any[] = status
      ? this.store.db.prepare('SELECT * FROM tasks WHERE company_id=? AND status=? ORDER BY created_at DESC').all(companyId, status)
      : this.store.db.prepare('SELECT * FROM tasks WHERE company_id=? ORDER BY created_at DESC').all(companyId);
    return rs.map(r => {
      r.input = parse(r.input, {}); r.output = parse(r.output, {});
      r.evidence = parse(r.evidence, []); return r;
    });
  }
  saveTask(t: Task): void {
    this.store.db.prepare(
      'UPDATE tasks SET objective_id=?,agent_id=?,kind=?,summary=?,status=?,input=?,output=?,evidence=?,attempts=?,max_attempts=?,cost_usd=?,started_at=?,finished_at=?,priority=?,deadline=?,parent_task_id=? WHERE id=?'
    ).run(t.objective_id, t.agent_id, t.kind, t.summary, t.status, json(t.input), json(t.output),
      json(t.evidence), t.attempts, t.max_attempts, t.cost_usd, t.started_at, t.finished_at,
      t.priority, t.deadline, t.parent_task_id, t.id);
  }

  // ---- events
  appendEvent(c: { company_id: string; type: string; entity_id?: string | null; entity_kind?: string | null; payload?: Record<string, unknown> }): EventRecord {
    const ev: EventRecord = {
      seq: 0, id: newId('evt'), company_id: c.company_id, type: c.type,
      ts: now(), entity_id: c.entity_id ?? null, entity_kind: c.entity_kind ?? null,
      payload: c.payload ?? {},
    };
    const r = this.store.db.prepare(
      'INSERT INTO events (id,company_id,type,ts,entity_id,entity_kind,payload) VALUES (?,?,?,?,?,?,?)'
    ).run(ev.id, ev.company_id, ev.type, ev.ts, ev.entity_id, ev.entity_kind, json(ev.payload));
    ev.seq = Number(r.lastInsertRowid);
    return ev;
  }
  events(companyId: string, limit = 200, afterSeq = 0): EventRecord[] {
    const rs: any[] = this.store.db.prepare(
      'SELECT * FROM events WHERE company_id=? AND seq>? ORDER BY seq DESC LIMIT ?'
    ).all(companyId, afterSeq, limit);
    return rs.map(r => ({ ...r, payload: parse(r.payload, {}) })).reverse();
  }
  recentEvents(companyId: string, limit = 200): EventRecord[] {
    return this.events(companyId, limit);
  }

  // ---- memory
  writeMemory(c: { company_id: string; type: MemoryRecord['type']; content: string; source?: string; confidence?: number; owner?: string | null; tags?: string[] }): MemoryRecord {
    const m: MemoryRecord = {
      id: newId('mem'), company_id: c.company_id, type: c.type, content: c.content,
      source: c.source ?? 'system', ts: now(), confidence: c.confidence ?? 0.8,
      owner: c.owner ?? null, version: 1, tags: c.tags ?? [], active: true,
    };
    this.store.db.prepare(
      'INSERT INTO memory (id,company_id,type,content,source,ts,confidence,owner,version,tags,active) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
    ).run(m.id, m.company_id, m.type, m.content, m.source, m.ts, m.confidence, m.owner, m.version, json(m.tags), 1);
    return m;
  }
  memory(companyId: string, type?: MemoryRecord['type'], limit = 50): MemoryRecord[] {
    const rs: any[] = type
      ? this.store.db.prepare('SELECT * FROM memory WHERE company_id=? AND type=? AND active=1 ORDER BY ts DESC LIMIT ?').all(companyId, type, limit)
      : this.store.db.prepare('SELECT * FROM memory WHERE company_id=? AND active=1 ORDER BY ts DESC LIMIT ?').all(companyId, limit);
    return rs.map(r => ({ ...r, tags: parse(r.tags, []) }));
  }

  // ---- graph
  upsertNode(id: string, kind: GraphNode['kind'], name: string, props: Record<string, unknown>): void {
    const exists = this.store.db.prepare('SELECT id FROM graph_nodes WHERE id=?').get(id);
    if (exists) {
      this.store.db.prepare('UPDATE graph_nodes SET kind=?,name=?,props=? WHERE id=?').run(kind, name, json(props), id);
    } else {
      this.store.db.prepare('INSERT INTO graph_nodes (id,kind,name,props,ts) VALUES (?,?,?,?,?)')
        .run(id, kind, name, json(props), now());
    }
  }
  upsertEdge(from: string, to: string, kind: GraphEdge['kind'], props: Record<string, unknown>): void {
    const exists = this.store.db.prepare('SELECT id FROM graph_edges WHERE "from"=? AND "to"=? AND kind=?').get(from, to, kind);
    if (exists) {
      this.store.db.prepare('UPDATE graph_edges SET props=? WHERE id=?').run(json(props), (exists as any).id);
    } else {
      this.store.db.prepare('INSERT INTO graph_edges (id,"from","to",kind,props,ts) VALUES (?,?,?,?,?,?)')
        .run(newId('edg'), from, to, kind, json(props), now());
    }
  }
  graphNodes(): GraphNode[] {
    const rs: any[] = this.store.db.prepare('SELECT * FROM graph_nodes').all();
    return rs.map(r => ({ ...r, props: parse(r.props, {}) }));
  }
  graphEdges(): GraphEdge[] {
    const rs: any[] = this.store.db.prepare('SELECT * FROM graph_edges').all();
    return rs.map(r => ({ ...r, props: parse(r.props, {}) }));
  }
  graphNodesFor(companyId: string): GraphNode[] {
    const all = this.graphNodes();
    return all.filter(n => n.kind === 'company' && n.id === companyId || n.props.company_id === companyId);
  }
  graphEdgesFor(companyId: string): GraphEdge[] {
    const nodeIds = new Set(this.graphNodesFor(companyId).map(n => n.id));
    return this.graphEdges().filter(e => nodeIds.has(e.from) && nodeIds.has(e.to));
  }

  // ---- approvals
  createApproval(c: { company_id: string; actor_id: string; action: string; summary: string; risk?: ApprovalRequest['risk']; req_by?: ApprovalRequest['req_by']; cost_usd?: number; payload?: Record<string, unknown> }): ApprovalRequest {
    const a: ApprovalRequest = {
      id: newId('apv'), company_id: c.company_id, actor_id: c.actor_id, action: c.action,
      summary: c.summary, risk: c.risk ?? 'med', status: 'pending', req_by: c.req_by ?? 'policy',
      cost_usd: c.cost_usd ?? 0, authored_at: now(), decided_at: null, decided_by: null,
      payload: c.payload ?? {},
    };
    this.store.db.prepare(
      'INSERT INTO approvals (id,company_id,actor_id,action,summary,risk,status,req_by,cost_usd,authored_at,decided_at,decided_by,payload) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
    ).run(a.id, a.company_id, a.actor_id, a.action, a.summary, a.risk, a.status, a.req_by,
      a.cost_usd, a.authored_at, a.decided_at, a.decided_by, json(a.payload));
    return a;
  }
  approvals(companyId: string, status?: string): ApprovalRequest[] {
    const rs: any[] = status
      ? this.store.db.prepare('SELECT * FROM approvals WHERE company_id=? AND status=? ORDER BY authored_at DESC').all(companyId, status)
      : this.store.db.prepare('SELECT * FROM approvals WHERE company_id=? ORDER BY authored_at DESC').all(companyId);
    return rs.map(r => ({ ...r, payload: parse(r.payload, {}) }));
  }
  decideApproval(id: string, decision: 'approved' | 'rejected', by: string): ApprovalRequest | null {
    const a = this.approval(id); if (!a) return null;
    a.status = decision; a.decided_at = now(); a.decided_by = by;
    this.store.db.prepare('UPDATE approvals SET status=?,decided_at=?,decided_by=? WHERE id=?')
      .run(a.status, a.decided_at, a.decided_by, a.id);
    return a;
  }
  approval(id: string): ApprovalRequest | null {
    const r: any = this.store.db.prepare('SELECT * FROM approvals WHERE id=?').get(id);
    if (!r) return null;
    r.payload = parse(r.payload, {}); return r;
  }

  // ---- decisions
  logDecision(c: { company_id: string; kind: string; summary: string; reasoning: string; alternatives?: string[]; confidence?: number; actor_id?: string | null }): DecisionRecord {
    const d: DecisionRecord = {
      id: newId('dec'), company_id: c.company_id, kind: c.kind, summary: c.summary,
      reasoning: c.reasoning, alternatives: c.alternatives ?? [], confidence: c.confidence ?? 0.6,
      ts: now(), actor_id: c.actor_id ?? null,
    };
    this.store.db.prepare('INSERT INTO decisions (id,company_id,kind,summary,reasoning,alternatives,confidence,ts,actor_id) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(d.id, d.company_id, d.kind, d.summary, d.reasoning, json(d.alternatives), d.confidence, d.ts, d.actor_id);
    return d;
  }
  decisions(companyId: string, limit = 100): DecisionRecord[] {
    const rs: any[] = this.store.db.prepare('SELECT * FROM decisions WHERE company_id=? ORDER BY ts DESC LIMIT ?').all(companyId, limit);
    return rs.map(r => ({ ...r, alternatives: parse(r.alternatives, []) }));
  }

  // ---- budgets
  setBudget(c: { company_id: string; scope: string; allocated_usd: number; limit_usd?: number; kind?: string }): BudgetRow {
    const limit = c.limit_usd ?? c.allocated_usd;
    // upsert per (company, scope): re-allocation updates the row instead of duplicating it,
    // so budget() lookups and spend() stay consistent.
    const existing = this.store.db.prepare('SELECT id, used_usd FROM budgets WHERE company_id=? AND scope=?').get(c.company_id, c.scope) as { id: string; used_usd: number } | undefined;
    if (existing) {
      this.store.db.prepare('UPDATE budgets SET allocated_usd=?, limit_usd=?, kind=? WHERE id=?')
        .run(c.allocated_usd, limit, c.kind ?? 'opex', existing.id);
      return this.budgets(c.company_id).find(b => b.id === existing.id)!;
    }
    const b: BudgetRow = {
      id: newId('bud'), company_id: c.company_id, scope: c.scope,
      allocated_usd: c.allocated_usd, used_usd: 0, limit_usd: limit, kind: c.kind ?? 'opex',
    };
    this.store.db.prepare('INSERT INTO budgets (id,company_id,scope,allocated_usd,used_usd,limit_usd,kind) VALUES (?,?,?,?,?,?,?)')
      .run(b.id, b.company_id, b.scope, b.allocated_usd, b.used_usd, b.limit_usd, b.kind);
    return b;
  }
  budgets(companyId: string): BudgetRow[] {
    const rs: any[] = this.store.db.prepare('SELECT * FROM budgets WHERE company_id=?').all(companyId);
    return rs as BudgetRow[];
  }
  spend(companyId: string, scope: string, amount: number): void {
    this.store.db.prepare('UPDATE budgets SET used_usd=used_usd+? WHERE company_id=? AND scope=?').run(amount, companyId, scope);
  }

  // ---- traces
  trace(c: { company_id: string; task_id?: string | null; agent_id?: string | null; step: string; model: string; latency_ms: number; cost_usd: number; prompt_tokens?: number; completion_tokens?: number; payload?: Record<string, unknown> }): TraceRecord {
    const t: TraceRecord = {
      id: newId('trc'), company_id: c.company_id, task_id: c.task_id ?? null,
      agent_id: c.agent_id ?? null, step: c.step, model: c.model, latency_ms: c.latency_ms,
      cost_usd: c.cost_usd, prompt_tokens: c.prompt_tokens ?? 0, completion_tokens: c.completion_tokens ?? 0,
      ts: now(), payload: c.payload ?? {},
    };
    this.store.db.prepare(
      'INSERT INTO traces (id,company_id,task_id,agent_id,step,model,latency_ms,cost_usd,prompt_tokens,completion_tokens,ts,payload) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
    ).run(t.id, t.company_id, t.task_id, t.agent_id, t.step, t.model, t.latency_ms, t.cost_usd,
      t.prompt_tokens, t.completion_tokens, t.ts, json(t.payload));
    return t;
  }
  traces(companyId: string, limit = 100): TraceRecord[] {
    const rs: any[] = this.store.db.prepare('SELECT * FROM traces WHERE company_id=? ORDER BY ts DESC LIMIT ?').all(companyId, limit);
    return rs.map(r => ({ ...r, payload: parse(r.payload, {}) }));
  }

  // ---- learning
  proposeLesson(c: { company_id: string; kind: string; trigger: string; lesson: string; source?: string }): LearningRecord {
    const l: LearningRecord = {
      id: newId('lrn'), company_id: c.company_id, kind: c.kind, trigger: c.trigger,
      lesson: c.lesson, source: c.source ?? 'system', ts: now(), applied_at: null, status: 'proposed',
    };
    this.store.db.prepare('INSERT INTO learning (id,company_id,kind,trigger,lesson,source,ts,applied_at,status) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(l.id, l.company_id, l.kind, l.trigger, l.lesson, l.source, l.ts, l.applied_at, l.status);
    return l;
  }
  applyLesson(id: string): LearningRecord | null {
    const l = this.learning(id); if (!l) return null;
    l.status = 'applied'; l.applied_at = now();
    this.store.db.prepare('UPDATE learning SET status=?,applied_at=? WHERE id=?').run(l.status, l.applied_at, l.id);
    return l;
  }
  learning(id: string): LearningRecord | null {
    const r: any = this.store.db.prepare('SELECT * FROM learning WHERE id=?').get(id);
    return r ?? null;
  }
  lessons(companyId: string): LearningRecord[] {
    const rs: any[] = this.store.db.prepare('SELECT * FROM learning WHERE company_id=? ORDER BY ts DESC').all(companyId);
    return rs as LearningRecord[];
  }

  // ---- projects
  createProject(c: { company_id: string; objective_id?: ID | null; name: string; phase?: string; budget_usd?: number }): Project {
    const p: Project = {
      id: newId('prj'), company_id: c.company_id, objective_id: c.objective_id ?? null,
      name: c.name, status: 'planned', phase: c.phase ?? 'setup', budget_usd: c.budget_usd ?? 0,
      started_at: null, finished_at: null, created_at: now(),
    };
    this.store.db.prepare('INSERT INTO projects (id,company_id,objective_id,name,status,phase,budget_usd,started_at,finished_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run(p.id, p.company_id, p.objective_id, p.name, p.status, p.phase, p.budget_usd, p.started_at, p.finished_at, p.created_at);
    this.upsertNode(p.id, 'project', p.name, { company_id: p.company_id, status: p.status });
    if (p.objective_id) this.upsertEdge(p.objective_id, p.id, 'produces', {});
    return p;
  }
  saveProject(p: Project): void {
    this.store.db.prepare('UPDATE projects SET objective_id=?,name=?,status=?,phase=?,budget_usd=?,started_at=?,finished_at=? WHERE id=?')
      .run(p.objective_id, p.name, p.status, p.phase, p.budget_usd, p.started_at, p.finished_at, p.id);
  }
  projects(companyId: string): Project[] {
    const rs: any[] = this.store.db.prepare('SELECT * FROM projects WHERE company_id=? ORDER BY created_at DESC').all(companyId);
    return rs as Project[];
  }

  // ---- workflows
  saveWorkflow(c: { company_id: string; name: string; kind: string; definition: Record<string, unknown>; version?: number }): Workflow {
    const w: Workflow = {
      id: newId('wf'), company_id: c.company_id, name: c.name, kind: c.kind,
      definition: c.definition, version: c.version ?? 1, status: 'active', created_at: now(),
    };
    this.store.db.prepare('INSERT INTO workflows (id,company_id,name,kind,definition,version,status,created_at) VALUES (?,?,?,?,?,?,?,?)')
      .run(w.id, w.company_id, w.name, w.kind, json(w.definition), w.version, w.status, w.created_at);
    return w;
  }
  workflows(companyId: string): Workflow[] {
    const rs: any[] = this.store.db.prepare('SELECT * FROM workflows WHERE company_id=? ORDER BY created_at DESC').all(companyId);
    return rs.map(r => ({ ...r, definition: parse(r.definition, {}) }));
  }

  // ---- capabilities (capability registry §33)
  registerCapability(c: { company_id: string; name: string; kind?: Capability['kind']; provider: string; description: string; cost_per_call?: number; cost_per_hour?: number; availability?: number }): Capability {
    const cap: Capability = {
      id: newId('cap'), company_id: c.company_id, name: c.name, kind: c.kind ?? 'internal',
      provider: c.provider, description: c.description, status: 'available',
      cost_per_call: c.cost_per_call ?? 0, cost_per_hour: c.cost_per_hour ?? 0, availability: c.availability ?? 1,
    };
    this.store.db.prepare('INSERT INTO capabilities (id,company_id,name,kind,provider,description,status,cost_per_call,cost_per_hour,availability) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run(cap.id, cap.company_id, cap.name, cap.kind, cap.provider, cap.description, cap.status, cap.cost_per_call, cap.cost_per_hour, cap.availability);
    this.upsertNode(cap.id, 'capability', cap.name, { company_id: cap.company_id, provider: cap.provider, kind: cap.kind });
    return cap;
  }
  capabilities(companyId: string): Capability[] {
    const rs: any[] = this.store.db.prepare('SELECT * FROM capabilities WHERE company_id=?').all(companyId);
    return rs as Capability[];
  }
  capability(id: string): Capability | null {
    const r: any = this.store.db.prepare('SELECT * FROM capabilities WHERE id=?').get(id);
    return r ?? null;
  }
  setCapabilityStatus(id: string, status: Capability['status']): void {
    this.store.db.prepare('UPDATE capabilities SET status=? WHERE id=?').run(status, id);
  }

  // ---- policies (policy engine §13)
  savePolicy(c: { company_id: string; name: string; scope: string; rules: Policy['rules']; status?: Policy['status'] }): Policy {
    const p: Policy = {
      id: newId('pol'), company_id: c.company_id, name: c.name, scope: c.scope,
      rules: c.rules, status: c.status ?? 'active',
    };
    this.store.db.prepare('INSERT INTO policies (id,company_id,name,scope,rules,status) VALUES (?,?,?,?,?,?)')
      .run(p.id, p.company_id, p.name, p.scope, json(p.rules), p.status);
    return p;
  }
  policies(companyId: string): Policy[] {
    const rs: any[] = this.store.db.prepare('SELECT * FROM policies WHERE company_id=?').all(companyId);
    return rs.map(r => ({ ...r, rules: parse(r.rules, []) }));
  }

  // ---- risks
  createRisk(c: { company_id: string; objective_id?: ID | null; title: string; probability?: number; impact?: number; mitigation?: string; owner_id?: ID | null }): Risk {
    const r: Risk = {
      id: newId('risk'), company_id: c.company_id, objective_id: c.objective_id ?? null, title: c.title,
      probability: c.probability ?? 0.5, impact: c.impact ?? 0.5, exposure: (c.probability ?? 0.5) * (c.impact ?? 0.5),
      mitigation: c.mitigation ?? '', owner_id: c.owner_id ?? null, status: 'open',
    };
    this.store.db.prepare('INSERT INTO risks (id,company_id,objective_id,title,probability,impact,exposure,mitigation,owner_id,status) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run(r.id, r.company_id, r.objective_id, r.title, r.probability, r.impact, r.exposure, r.mitigation, r.owner_id, r.status);
    return r;
  }
  risks(companyId: string): Risk[] {
    const rs: any[] = this.store.db.prepare('SELECT * FROM risks WHERE company_id=?').all(companyId);
    return rs as Risk[];
  }
  saveRisk(r: Risk): void {
    this.store.db.prepare('UPDATE risks SET probability=?,impact=?,exposure=?,mitigation=?,owner_id=?,status=? WHERE id=?')
      .run(r.probability, r.impact, r.probability * r.impact, r.mitigation, r.owner_id, r.status, r.id);
  }

  // ---- experiments (§16 strategy loop)
  createExperiment(c: { company_id: string; objective_id?: ID | null; hypothesis: string; variant: string; metric: string; baseline?: number | null }): Experiment {
    const e: Experiment = {
      id: newId('exp'), company_id: c.company_id, objective_id: c.objective_id ?? null,
      hypothesis: c.hypothesis, variant: c.variant, metric: c.metric,
      baseline: c.baseline ?? null, current: null, status: 'designed', started_at: null,
    };
    this.store.db.prepare('INSERT INTO experiments (id,company_id,objective_id,hypothesis,variant,metric,baseline,current,status,started_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run(e.id, e.company_id, e.objective_id, e.hypothesis, e.variant, e.metric, e.baseline, e.current, e.status, e.started_at);
    return e;
  }
  experiments(companyId: string): Experiment[] {
    const rs: any[] = this.store.db.prepare('SELECT * FROM experiments WHERE company_id=? ORDER BY started_at DESC').all(companyId);
    return rs as Experiment[];
  }
  saveExperiment(e: Experiment): void {
    this.store.db.prepare('UPDATE experiments SET baseline=?,current=?,status=?,started_at=? WHERE id=?')
      .run(e.baseline, e.current, e.status, e.started_at, e.id);
  }

  // ---- strategies
  createStrategy(c: { company_id: string; name: string; kind: string; options: Strategy['options'] }): Strategy {
    const s: Strategy = {
      id: newId('strat'), company_id: c.company_id, name: c.name, kind: c.kind,
      options: c.options, chosen: null, status: 'formulating', created_at: now(),
    };
    this.store.db.prepare('INSERT INTO strategies (id,company_id,name,kind,options,chosen,status,created_at) VALUES (?,?,?,?,?,?,?,?)')
      .run(s.id, s.company_id, s.name, s.kind, json(s.options), s.chosen, s.status, s.created_at);
    return s;
  }
  strategies(companyId: string): Strategy[] {
    const rs: any[] = this.store.db.prepare('SELECT * FROM strategies WHERE company_id=? ORDER BY created_at DESC').all(companyId);
    return rs.map(r => ({ ...r, options: parse(r.options, []) }));
  }
  chooseStrategy(id: string, optionId: string): Strategy | null {
    const r: any = this.store.db.prepare('SELECT * FROM strategies WHERE id=?').get(id);
    const rec = r ? { ...r, options: parse(r.options, []) } : null;
    if (!rec) return null;
    rec.chosen = optionId; rec.status = 'chosen';
    this.store.db.prepare('UPDATE strategies SET chosen=?,status=? WHERE id=?').run(optionId, 'chosen', id);
    return rec;
  }

  // ---- artifacts
  saveArtifact(c: { company_id: string; task_id?: ID | null; project_id?: ID | null; name: string; kind: string; uri: string; checksum?: string | null; created_by?: ID | null }): Artifact {
    const a: Artifact = {
      id: newId('art'), company_id: c.company_id, task_id: c.task_id ?? null, project_id: c.project_id ?? null,
      name: c.name, kind: c.kind, uri: c.uri, checksum: c.checksum ?? null,
      created_by: c.created_by ?? null, created_at: now(),
    };
    this.store.db.prepare('INSERT INTO artifacts (id,company_id,task_id,project_id,name,kind,uri,checksum,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run(a.id, a.company_id, a.task_id, a.project_id, a.name, a.kind, a.uri, a.checksum, a.created_by, a.created_at);
    this.upsertNode(a.id, 'evidence', a.name, { kind: a.kind, task_id: a.task_id });
    return a;
  }
  artifacts(companyId: string): Artifact[] {
    const rs: any[] = this.store.db.prepare('SELECT * FROM artifacts WHERE company_id=? ORDER BY created_at DESC').all(companyId);
    return rs as Artifact[];
  }

  // ---- typed messages (§24)
  sendMessage(c: { company_id: string; contract: string; from_agent: ID; to_agent?: ID | null; to_department?: ID | null; payload?: Record<string, unknown> }): Message {
    const m: Message = {
      id: newId('msg'), company_id: c.company_id, contract: c.contract,
      from_agent: c.from_agent, to_agent: c.to_agent ?? null, to_department: c.to_department ?? null,
      payload: c.payload ?? {}, status: 'sent', sent_at: now(), actioned_at: null,
    };
    this.store.db.prepare('INSERT INTO messages (id,company_id,contract,from_agent,to_agent,to_department,payload,status,sent_at,actioned_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run(m.id, m.company_id, m.contract, m.from_agent, m.to_agent, m.to_department, json(m.payload), m.status, m.sent_at, m.actioned_at);
    this.upsertEdge(m.from_agent, m.to_agent ?? m.to_department ?? m.company_id, 'communicates_with', { contract: m.contract });
    return m;
  }
  messages(companyId: string, limit = 100): Message[] {
    const rs: any[] = this.store.db.prepare('SELECT * FROM messages WHERE company_id=? ORDER BY sent_at DESC LIMIT ?').all(companyId, limit);
    return rs.map(r => ({ ...r, payload: parse(r.payload, {}) }));
  }
  actionMessage(id: string): void {
    this.store.db.prepare('UPDATE messages SET status=?,actioned_at=? WHERE id=?').run('actioned', now(), id);
  }

  // ---- durability / execution fabric (§25-26)
  createJob(c: { company_id: string; task_id?: ID | null; workflow_id?: ID | null; max_attempts?: number; state?: Record<string, unknown> }): Job {
    const j: Job = {
      id: newId('job'), company_id: c.company_id, task_id: c.task_id ?? null, workflow_id: c.workflow_id ?? null,
      status: 'queued', attempts: 0, max_attempts: c.max_attempts ?? 3, state: c.state ?? {},
      last_heartbeat: null, scheduled_at: now(), started_at: null, finished_at: null, error: null,
    };
    this.store.db.prepare('INSERT INTO jobs (id,company_id,task_id,workflow_id,status,attempts,max_attempts,state,last_heartbeat,scheduled_at,started_at,finished_at,error) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .run(j.id, j.company_id, j.task_id, j.workflow_id, j.status, j.attempts, j.max_attempts, json(j.state), j.last_heartbeat, j.scheduled_at, j.started_at, j.finished_at, j.error);
    return j;
  }
  job(id: string): Job | null {
    const r: any = this.store.db.prepare('SELECT * FROM jobs WHERE id=?').get(id);
    return r ? { ...r, state: parse(r.state, {}) } : null;
  }
  jobs(companyId: string, status?: string): Job[] {
    const rs: any[] = status
      ? this.store.db.prepare('SELECT * FROM jobs WHERE company_id=? AND status=? ORDER BY scheduled_at DESC').all(companyId, status)
      : this.store.db.prepare('SELECT * FROM jobs WHERE company_id=? ORDER BY scheduled_at DESC').all(companyId);
    return rs.map(r => ({ ...r, state: parse(r.state, {}) }));
  }
  heartbeatJob(id: string): void {
    this.store.db.prepare('UPDATE jobs SET last_heartbeat=? WHERE id=?').run(now(), id);
  }
  saveJob(j: Job): void {
    this.store.db.prepare('UPDATE jobs SET task_id=?,workflow_id=?,status=?,attempts=?,max_attempts=?,state=?,last_heartbeat=?,started_at=?,finished_at=?,error=? WHERE id=?')
      .run(j.task_id, j.workflow_id, j.status, j.attempts, j.max_attempts, json(j.state), j.last_heartbeat, j.started_at, j.finished_at, j.error, j.id);
  }

  // ---- sovereign layer (2a)
  saveOwner(c: { id: string; company_id: string; name: string; role: string; email: string; authority: string[]; last_active: string; status: string }): void {
    this.store.db.prepare('INSERT INTO sovereign_owners (id,company_id,name,role,email,authority,last_active,status) VALUES (?,?,?,?,?,?,?,?)')
      .run(c.id, c.company_id, c.name, c.role, c.email, json(c.authority), c.last_active, c.status);
  }
  owners(companyId: string): any[] {
    return this.store.db.prepare('SELECT * FROM sovereign_owners WHERE company_id=?').all(companyId).map(r => ({ ...r, authority: parse(r.authority as string, []) }));
  }
  owner(companyId: string, ownerId: string): any | null {
    const r: any = this.store.db.prepare('SELECT * FROM sovereign_owners WHERE company_id=? AND id=?').get(companyId, ownerId);
    return r ? { ...r, authority: parse(r.authority, []) } : null;
  }
  touchOwner(companyId: string, ownerId: string): void {
    this.store.db.prepare('UPDATE sovereign_owners SET last_active=?,status=? WHERE company_id=? AND id=?').run(now(), 'active', companyId, ownerId);
  }

  storeKillLog(c: { id: string; company_id: string; scope: string; action: string; reason: string; ts: string; by: string; active: number }): void {
    this.store.db.prepare('INSERT INTO kill_switch_log (id,company_id,scope,action,reason,ts,by,active) VALUES (?,?,?,?,?,?,?,?)')
      .run(c.id, c.company_id, c.scope, c.action, c.reason, c.ts, c.by, c.active);
  }
  killLog(companyId?: string): any[] {
    return companyId
      ? this.store.db.prepare('SELECT * FROM kill_switch_log WHERE company_id=? ORDER BY ts DESC').all(companyId)
      : this.store.db.prepare('SELECT * FROM kill_switch_log ORDER BY ts DESC').all();
  }

  saveRollback(c: { id: string; company_id: string; action_type: string; action_id: string; reverse: string; status: string; ts: string; reversed_at: string | null }): void {
    this.store.db.prepare('INSERT INTO rollback_actions (id,company_id,action_type,action_id,reverse,status,ts,reversed_at) VALUES (?,?,?,?,?,?,?,?)')
      .run(c.id, c.company_id, c.action_type, c.action_id, c.reverse, c.status, c.ts, c.reversed_at);
  }
  rollback(id: string): any | null {
    const r: any = this.store.db.prepare('SELECT * FROM rollback_actions WHERE id=?').get(id);
    return r ?? null;
  }
  rollbacks(companyId: string | null): any[] {
    return companyId
      ? this.store.db.prepare('SELECT * FROM rollback_actions WHERE company_id=? ORDER BY ts DESC').all(companyId)
      : this.store.db.prepare('SELECT * FROM rollback_actions ORDER BY ts DESC').all();
  }
  markRollbackApplied(id: string): void {
    this.store.db.prepare('UPDATE rollback_actions SET status=?,reversed_at=? WHERE id=?').run('applied', now(), id);
  }
}