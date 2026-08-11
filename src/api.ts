import express from 'express';
import { createServer } from 'node:http';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PlutoState } from './kernel/state.ts';
import { buildToolFabric, fsTools, httpTool } from './tools/fabric.ts';
import { orgSummary } from './runtime.ts';
import { Governance } from './plane/governance.ts';
import { ResourceEngine } from './plane/resources.ts';
import { Observability } from './plane/observability.ts';
import { PolicyEngine } from './plane/policy.ts';
import { EventBus } from './events/bus.ts';
import { WorkGraphEngine } from './work/graph.ts';
import { ExecutionFabric } from './work/fabric.ts';
import { CapabilityFactory } from './capability/factory.ts';
import { CompanyIntelligence } from './intel/engine.ts';
import { LearningEngine, AgentFactory } from './learn/engine.ts';
import { VerificationEngine } from './verify/engine.ts';
import { StrategyEngine } from './org/engines.ts';
import { Workforce } from './org/workforce.ts';
import { describeOrg } from './plane/governance.ts';
import { MetaAgent } from './meta/engine.ts';
import { BrainLayer } from './brain/index.ts';
import { makeDriver } from './agents/llm.ts';

const DATA_DIR = process.env.PLUTO_DATA_DIR ?? './data';
const PORT = Number(process.env.PLUTO_PORT ?? 4000);
const __dirname = dirname(fileURLToPath(import.meta.url));
const DASHBOARD_DIR = join(__dirname, '../apps/dashboard');

const app = express();
app.use(express.json());

// one state handle over sqlite + all subsystems (multi-tenant: per-company rows)
const state = PlutoState.open(DATA_DIR);
const tools = [...buildToolFabric(), httpTool(), ...fsTools('./data/workspace')];
const governance = new Governance(state);
const resources = new ResourceEngine(state);
const observability = new Observability(state);
const policies = new PolicyEngine(state);
const bus = new EventBus(state);
const workGraph = new WorkGraphEngine(state);
const fabric = new ExecutionFabric(state);
const capabilities = new CapabilityFactory(state);
const intel = new CompanyIntelligence(state);
const learning = new LearningEngine(state);
const factory = new AgentFactory(state);
const verifier = new VerificationEngine(state);
const strategy = new StrategyEngine(state);
const meta = new MetaAgent(state, { tools });
const brain = new BrainLayer({ defaultDriver: makeDriver() });

let lastSeq = 0;
const sseClients = new Set<import('node:http').ServerResponse>();

function broadcast(companyId: string): void {
  const evs = state.repos.events(companyId, 50, lastSeq);
  if (evs.length) {
    lastSeq = evs[evs.length - 1].seq;
    const body = `data: ${JSON.stringify(evs)}\n\n`;
    for (const res of sseClients) res.write(body);
  }
}

const POLL_MS = 1200;
setInterval(() => {
  for (const c of state.repos.companies()) broadcast(c.id);
}, POLL_MS);

app.get('/api/events/stream', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.write('retry: 2000\n\n');
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

// ---- companies (multi-tenant)
app.get('/api/companies', (_req, res) => {
  const companies = state.repos.companies();
  res.json(companies.map(c => ({
    ...c,
    agents: state.repos.agents(c.id).length,
    departments: state.repos.departments(c.id).length,
    tasks_total: state.repos.tasks(c.id).length,
    tasks_failed: state.repos.tasks(c.id, 'FAILED').length,
    spend: resources.totalSpend(c.id),
    approvals_pending: governance.pending(c.id).length,
    capabilities: state.repos.capabilities(c.id).length,
    projects: state.repos.projects(c.id).length,
    strategies: state.repos.strategies(c.id).length,
  })));
});

app.post('/api/companies', (req, res) => {
  const name = req.body?.name; const mission = req.body?.mission;
  if (!name || !mission) return res.status(400).json({ error: 'name + mission required' });
  const company = state.repos.createCompany(name, mission);
  resources.defaults(company.id);
  policies.seedDefaults(company.id);
  state.emit(company.id, 'company.created', company.id, 'company', { mission });
  res.json(company);
});

// ---- full company snapshot for the dashboard
app.get('/api/company/:id/snapshot', (req, res) => {
  const id = req.params.id;
  const company = state.repos.company(id);
  if (!company) return res.status(404).json({ error: 'not found' });
  const agents = state.repos.agents(id);
  res.json({
    company,
    org_summary: describeOrg(state, id),
    graph: { nodes: state.repos.graphNodesFor(id), edges: state.repos.graphEdgesFor(id) },
    departments: state.repos.departments(id),
    agents: agents.map(a => ({
      ...a,
      tasks: state.repos.tasks(id).filter(t => t.agent_id === a.id).length,
      fail_rate: a.performance.tasks_done ? (1 - (a.performance.success_rate as number)) : 0,
    })),
    objectives: state.repos.objectives(id),
    projects: state.repos.projects(id),
    tasks: state.repos.tasks(id, undefined).slice(0, 100),
    events: state.repos.recentEvents(id, 80),
    approvals: governance.pending(id),
    decisions: state.repos.decisions(id, 50),
    budgets: resources.ledger(id),
    memory: state.repos.memory(id, undefined, 30),
    learning: state.repos.lessons(id),
    traces: state.repos.traces(id, 50),
    capabilities: state.repos.capabilities(id),
    policies: state.repos.policies(id),
    risks: state.repos.risks(id),
    experiments: state.repos.experiments(id),
    strategies: state.repos.strategies(id),
    messages: state.repos.messages(id, 50),
    jobs: state.repos.jobs(id),
    artifacts: state.repos.artifacts(id),
    intelligence: intel.brief(id),
  });
});

app.get('/api/company/:id/graph', (req, res) => {
  const id = req.params.id;
  res.json({ nodes: state.repos.graphNodesFor(id), edges: state.repos.graphEdgesFor(id) });
});

// ---- capability registry (§33)
app.get('/api/company/:id/capabilities', (req, res) => {
  res.json(state.repos.capabilities(req.params.id));
});
app.post('/api/company/:id/capabilities', (req, res) => {
  const cap = state.repos.registerCapability({
    company_id: req.params.id, name: req.body?.name, provider: req.body?.provider ?? 'custom',
    description: req.body?.description ?? '', kind: req.body?.kind ?? 'internal',
  });
  res.json(cap);
});
app.post('/api/company/:id/capabilities/acquire', (req, res) => {
  const d = capabilities.acquire(req.params.id, {
    name: req.body?.name ?? 'unknown', description: req.body?.description ?? '',
    cost_ceiling_usd: Number(req.body?.cost_ceiling_usd ?? 10), urgency: Number(req.body?.urgency ?? 0.5),
  });
  let materialized: ReturnType<typeof capabilities.materializeCreate> | null = null;
  if (d.decision === 'create') materialized = capabilities.materializeCreate(req.params.id, { name: req.body?.name ?? 'unknown', description: req.body?.description ?? '', cost_ceiling_usd: 10, urgency: 0.5 }, d.agentRole, 'llm');
  if (d.decision === 'buy') materialized = capabilities.materializeBuy(req.params.id, { name: req.body?.name ?? 'unknown', description: req.body?.description ?? '', cost_ceiling_usd: 10, urgency: 0.5 }, d.provider, d.est_cost_usd);
  res.json({ decision: d, materialized });
});

// ---- strategy (§16)
app.get('/api/company/:id/strategies', (req, res) => {
  res.json(state.repos.strategies(req.params.id));
});
app.post('/api/company/:id/strategies', (req, res) => {
  const s = strategy.formulate(req.params.id, req.body?.name ?? 'strategy', req.body?.kind ?? 'experiment', req.body?.options ?? []);
  res.json(s);
});
app.get('/api/company/:id/experiments', (req, res) => {
  res.json(state.repos.experiments(req.params.id));
});
app.post('/api/company/:id/experiments', (req, res) => {
  const e = strategy.startExperiment(req.params.id, req.body?.objective_id ?? null, req.body?.hypothesis ?? '', req.body?.variant ?? '', req.body?.metric ?? '', req.body?.baseline ?? null);
  res.json(e);
});
app.post('/api/company/:id/experiments/:eid/conclude', (req, res) => {
  const e = strategy.concludeExperiment(req.params.id, req.params.eid, Number(req.body?.observed ?? 0));
  res.json(e);
});

// ---- work graph (7.8)
app.get('/api/company/:id/workflow', (req, res) => {
  res.json(state.repos.workflows(req.params.id));
});
app.post('/api/company/:id/workflow', (req, res) => {
  const wf = state.repos.saveWorkflow({ company_id: req.params.id, name: req.body?.name ?? 'workflow', kind: req.body?.kind ?? 'work_graph', definition: req.body?.definition ?? {} });
  res.json(wf);
});

// ---- policies (7.13)
app.get('/api/company/:id/policies', (req, res) => {
  res.json(state.repos.policies(req.params.id));
});
app.post('/api/company/:id/policies', (req, res) => {
  const p = policies.register(req.params.id, req.body?.name ?? 'policy', req.body?.scope ?? '*', req.body?.rules ?? []);
  res.json(p);
});
app.post('/api/company/:id/policies/check', (req, res) => {
  const verdict = policies.evaluate(req.params.id, req.body?.role ?? '*', req.body?.action ?? '*');
  res.json(verdict);
});

// ---- risks
app.get('/api/company/:id/risks', (req, res) => {
  res.json(state.repos.risks(req.params.id));
});
app.post('/api/company/:id/risks', (req, res) => {
  const r = state.repos.createRisk({ company_id: req.params.id, title: req.body?.title ?? 'risk', probability: req.body?.probability, impact: req.body?.impact });
  res.json(r);
});

// ---- messages (§24)
app.get('/api/company/:id/messages', (req, res) => {
  res.json(state.repos.messages(req.params.id, Number(req.query.limit ?? 100)));
});
app.post('/api/company/:id/messages', (req, res) => {
  const m = state.repos.sendMessage({
    company_id: req.params.id, contract: req.body?.contract ?? 'generic',
    from_agent: req.body?.from_agent ?? '', to_agent: req.body?.to_agent ?? null,
    to_department: req.body?.to_department ?? null, payload: req.body?.payload ?? {},
  });
  res.json(m);
});

// ---- jobs / execution fabric (7.10)
app.get('/api/company/:id/jobs', (req, res) => {
  res.json(state.repos.jobs(req.params.id, req.query.status as string | undefined));
});

// ---- intelligence (7.2)
app.get('/api/company/:id/intelligence', (req, res) => {
  res.json(intel.brief(req.params.id));
});

// ---- projects
app.get('/api/company/:id/projects', (req, res) => {
  res.json(state.repos.projects(req.params.id));
});
app.post('/api/company/:id/projects', (req, res) => {
  const p = state.repos.createProject({ company_id: req.params.id, name: req.body?.name ?? 'project', objective_id: req.body?.objective_id ?? null, budget_usd: req.body?.budget_usd ?? 0 });
  res.json(p);
});

// ---- artifacts
app.get('/api/company/:id/artifacts', (req, res) => {
  res.json(state.repos.artifacts(req.params.id));
});

// ---- objective/task/event/approval/resource/memory/decision/learning/trace/agent (existing)
app.get('/api/company/:id/objectives', (req, res) => {
  res.json(state.repos.objectives(req.params.id));
});
app.get('/api/company/:id/tasks', (req, res) => {
  res.json(state.repos.tasks(req.params.id, req.query.status as string | undefined));
});
app.get('/api/company/:id/events', (req, res) => {
  res.json(state.repos.recentEvents(req.params.id, Number(req.query.limit ?? 200)));
});
app.get('/api/company/:id/approvals', (req, res) => {
  res.json(state.repos.approvals(req.params.id, req.query.status as string | undefined));
});
app.post('/api/approvals/:id/decide', (req, res) => {
  const decision = (req.body?.decision === 'approved' || req.body?.decision === 'rejected') ? req.body.decision : null;
  if (!decision) return res.status(400).json({ error: 'decision must be approved|rejected' });
  const a = governance.decide(req.params.id, decision, req.body?.by ?? 'founder');
  if (!a) return res.status(404).json({ error: 'not found' });
  res.json(a);
});
app.get('/api/company/:id/resources', (req, res) => {
  res.json(resources.ledger(req.params.id));
});
app.get('/api/company/:id/memory', (req, res) => {
  res.json(state.repos.memory(req.params.id, req.query.type as any, Number(req.query.limit ?? 50)));
});
app.get('/api/company/:id/decisions', (req, res) => {
  res.json(state.repos.decisions(req.params.id, Number(req.query.limit ?? 100)));
});
app.get('/api/company/:id/learning', (req, res) => {
  res.json(state.repos.lessons(req.params.id));
});
app.get('/api/company/:id/traces', (req, res) => {
  res.json(state.repos.traces(req.params.id, Number(req.query.limit ?? 100)));
});
app.get('/api/company/:id/agents', (req, res) => {
  res.json(state.repos.agents(req.params.id));
});
app.post('/api/company/:id/agents', (req, res) => {
  const a = factory.createForCapability({
    company_id: req.params.id, name: req.body?.name ?? 'worker', role: req.body?.role ?? 'generalist',
    department_id: req.body?.department_id ?? null, tools: req.body?.tools ?? [], permissions: req.body?.permissions ?? [],
  });
  res.json(a);
});

// submit a new task (Workforce runtime) — policy-gated
app.post('/api/company/:id/tasks', async (req, res) => {
  const verdict = policies.evaluate(req.params.id, req.body?.role ?? '*', req.body?.kind ?? 'task');
  if (verdict.effect === 'deny') return res.status(403).json({ error: `policy denied: ${verdict.note}` });
  const wf = new Workforce(state, tools, brain);
  const task = wf.submit(req.params.id, {
    agent_id: req.body.agent_id ?? null,
    objective_id: req.body.objective_id ?? null,
    kind: req.body.kind ?? 'task',
    summary: req.body.summary ?? 'Untitled task',
    input: req.body.input ?? {},
  });
  res.json({ task_id: task.id, status: task.status, policy: verdict });
  setImmediate(async () => { await wf.run(task.id); broadcast(req.params.id); });
});

// ---- meta layer (§1c P1) — introspection, agent generation, kill switch
app.get('/api/company/:id/meta/introspect', (req, res) => {
  res.json(meta.whatCanIDo(req.params.id));
});
app.post('/api/company/:id/meta/spawn', async (req, res) => {
  const capability = req.body?.capability;
  if (!capability || typeof capability !== 'string') return res.status(400).json({ error: 'capability required' });
  try {
    const { agent, spec } = await meta.spawnForGap(req.params.id, capability, req.body?.reason ?? 'api request');
    res.json({ agent_id: agent.id, role: agent.role, status: agent.status, spec });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});
app.post('/api/company/:id/meta/agents/:agentId/kill', (req, res) => {
  const a = meta.kill(req.params.id, req.params.agentId);
  if (!a) return res.status(404).json({ error: 'not found' });
  res.json({ agent_id: a.id, status: a.status, retired: true });
});

// ---- brain layer (1g) — usage + fine-tune registry
app.get('/api/brain/usage', (_req, res) => {
  res.json(brain.usage());
});
app.get('/api/company/:id/brains/tunes', (req, res) => {
  res.json(brain.registry.list(req.params.id));
});
app.post('/api/company/:id/brains/tunes', (req, res) => {
  const t = brain.registry.register({
    company_id: req.params.id,
    task_kind: req.body?.task_kind ?? 'default',
    model: req.body?.model ?? 'deepseek-v4-flash',
    active: req.body?.active,
    fraction: req.body?.fraction,
  });
  res.json(t);
});
app.post('/api/company/:id/brains/tunes/rollback', (req, res) => {
  const t = brain.registry.rollback(req.params.id, req.body?.task_kind ?? 'default');
  res.json({ active: t });
});

// ---- static dashboard
app.use(express.static(DASHBOARD_DIR));

const server = createServer(app);
server.listen(PORT, () => {
  console.log(`[PLUTO] API + dashboard on http://localhost:${PORT}`);
  console.log(`[PLUTO] companies: ${state.repos.companies().map(c => c.name).join(', ') || 'none — run npm run demo first'}`);
});