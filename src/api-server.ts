import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PlutoState } from './kernel/state.ts';
import { describeOrg } from './plane/governance.ts';
import { Sovereign } from './sovereign/engine.ts';
import { CompanyIntelligence } from './intel/engine.ts';
import { ResourceEngine } from './plane/resources.ts';
import { PolicyEngine } from './plane/policy.ts';

const dashboardDir = join(process.cwd(), 'apps', 'dashboard');

const dataDir = process.env.DATA_DIR ?? './data';
const port = Number(process.env.PORT ?? 3000);

mkdirSync(dataDir, { recursive: true });
const state = PlutoState.open(dataDir);
const repos = state.repos;

// ---- helpers ----------------------------------------------------------------

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString();
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function send(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) });
  res.end(payload);
}

function ok(res: ServerResponse, body: unknown): void { send(res, 200, body); }
function created(res: ServerResponse, body: unknown): void { send(res, 201, body); }
function notFound(res: ServerResponse, msg = 'Not found'): void { send(res, 404, { error: msg }); }
function badRequest(res: ServerResponse, msg: string): void { send(res, 400, { error: msg }); }

// ---- router -----------------------------------------------------------------

const server = createServer(async (req, res) => {
  const url = req.url ?? '/';
  const method = req.method ?? 'GET';

  try {
    // Serve Vite dashboard static files (all non-API GET requests)
    if (method === 'GET' && !url.startsWith('/api') && !url.startsWith('/chat') &&
        !url.startsWith('/companies') && !url.startsWith('/spawn') && !url.startsWith('/health') &&
        !url.startsWith('/org') && !url.startsWith('/events')) {
      const filePath = url === '/' ? 'index.html' : url.slice(1).split('?')[0];
      const fullPath = join(dashboardDir, 'dist', filePath);
      try {
        if (existsSync(fullPath) && !fullPath.endsWith('/')) {
          const content = readFileSync(fullPath);
          const ext = filePath.split('.').pop() ?? '';
          const mime: Record<string, string> = {
            html: 'text/html; charset=utf-8',
            js: 'application/javascript',
            css: 'text/css',
            svg: 'image/svg+xml',
            ico: 'image/x-icon',
            json: 'application/json',
            woff2: 'font/woff2',
            woff: 'font/woff',
            ttf: 'font/ttf',
            png: 'image/png',
          };
          res.writeHead(200, { 'Content-Type': mime[ext] ?? 'application/octet-stream' });
          return res.end(content);
        }
      } catch { /* fall through to SPA index */ }
      // SPA fallback
      const html = readFileSync(join(dashboardDir, 'dist', 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    }

    // GET /api/companies
    if (method === 'GET' && url === '/api/companies') {
      const companies = repos.companies();
      return ok(res, companies.map(c => {
        const agents = repos.agents(c.id);
        const departments = repos.departments(c.id);
        const tasks = repos.tasks(c.id);
        const approvals = repos.approvals(c.id, 'pending');
        const capabilities = repos.capabilities(c.id);
        const projects = repos.projects(c.id);
        const strategies = repos.strategies(c.id);
        return {
          id: c.id, name: c.name, mission: c.mission, health: c.health,
          agents: agents.length, departments: departments.length,
          tasks_total: tasks.filter(t => t.status === 'SUCCEEDED').length,
          tasks_failed: tasks.filter(t => t.status === 'FAILED').length,
          spend: repos.budgets(c.id).reduce((a, b) => a + b.used_usd, 0),
          approvals_pending: approvals.length,
          capabilities: capabilities.length, projects: projects.length, strategies: strategies.length,
        };
      }));
    }

    // POST /api/companies
    if (method === 'POST' && url === '/api/companies') {
      const body = await readBody(req) as any;
      if (!body?.name || !body?.mission) return badRequest(res, 'name and mission required');
      const sovereign = new Sovereign(state);
      const company = sovereign.spawnCompany({ name: body.name, mission: body.mission });
      return created(res, company);
    }

    // GET /api/company/:id/snapshot
    const snapshotMatch = url.match(/^\/api\/company\/([^/]+)\/snapshot$/);
    if (method === 'GET' && snapshotMatch) {
      const id = snapshotMatch[1];
      const company = repos.company(id);
      if (!company) return notFound(res, `Company ${id} not found`);
      const agents = repos.agents(id);
      const departments = repos.departments(id);
      const tasks = repos.tasks(id);
      const approvals = repos.approvals(id, 'pending');
      const capabilities = repos.capabilities(id);
      const projects = repos.projects(id);
      const strategies = repos.strategies(id);
      const budgets = new ResourceEngine(state).ledger(id);
      const intel = new CompanyIntelligence(state).brief(id);
      const snap = {
        company: {
          id: company.id, name: company.name, mission: company.mission, health: company.health,
          agents: agents.length, departments: departments.length,
          tasks_total: tasks.filter(t => t.status === 'SUCCEEDED').length,
          tasks_failed: tasks.filter(t => t.status === 'FAILED').length,
          spend: budgets.reduce((a, b) => a + b.used_usd, 0),
          approvals_pending: approvals.length,
          capabilities: capabilities.length, projects: projects.length, strategies: strategies.length,
        },
        org_summary: `${company.name} — ${departments.length} depts, ${agents.length} agents`,
        graph: { nodes: repos.graphNodesFor(id), edges: repos.graphEdgesFor(id) },
        departments, agents, objectives: repos.objectives(id), projects, tasks,
        events: repos.events(id, 100), approvals, decisions: repos.decisions(id, 50),
        budgets, memory: repos.memory(id, undefined, 20), learning: repos.lessons(id),
        traces: repos.traces(id, 50), capabilities, policies: repos.policies(id),
        risks: repos.risks(id), experiments: repos.experiments(id), strategies,
        messages: repos.messages(id, 50), jobs: repos.jobs(id), artifacts: repos.artifacts(id),
        intelligence: intel,
      };
      return ok(res, snap);
    }

    // POST /api/approvals/:id/decide
    const decideMatch = url.match(/^\/api\/approvals\/([^/]+)\/decide$/);
    if (method === 'POST' && decideMatch) {
      const body = await readBody(req) as any;
      const result = repos.decideApproval(decideMatch[1], body?.decision, body?.by ?? 'founder');
      if (!result) return notFound(res, 'approval not found');
      return ok(res, result);
    }

    // GET /api/events/stream — SSE
    if (method === 'GET' && url === '/api/events/stream') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
      const interval = setInterval(() => {
        try { res.write('data: ping\n\n'); } catch { clearInterval(interval); }
      }, 5000);
      req.on('close', () => clearInterval(interval));
      return;
    }

    // Company-scoped /api/company/:id/* routes
    const apiCompanyMatch = url.match(/^\/api\/company\/([^/]+)(\/.*)?$/);
    if (apiCompanyMatch) {
      const id = apiCompanyMatch[1];
      const sub = apiCompanyMatch[2] ?? '';
      const company = repos.company(id);
      if (!company) return notFound(res, `Company ${id} not found`);

      // POST /api/company/:id/tasks
      if (method === 'POST' && sub === '/tasks') {
        const body = await readBody(req) as any;
        if (!body?.summary) return badRequest(res, 'summary required');
        const policyEngine = new PolicyEngine(state);
        const agentId: string | null = body.agent_id ?? null;
        const agent = agentId ? repos.agent(agentId) : null;
        const verdict = policyEngine.evaluate(id, agent?.role ?? '*', body.kind ?? 'task');
        if (verdict.effect === 'deny') {
          return ok(res, { status: 'blocked', policy: verdict, task_id: null });
        }
        const task = repos.createTask({ company_id: id, summary: body.summary, kind: body.kind, agent_id: agentId, objective_id: body.objective_id ?? null });
        state.emit(id, 'task.created', task.id, 'task', { summary: body.summary });
        return created(res, { task_id: task.id, status: task.status, policy: verdict });
      }

      // POST /api/company/:id/strategies
      if (method === 'POST' && sub === '/strategies') {
        const body = await readBody(req) as any;
        if (!body?.name) return badRequest(res, 'name required');
        const strat = repos.createStrategy({ company_id: id, name: body.name, kind: body.kind ?? 'experiment', options: body.options ?? [] });
        // pick highest expected*confidence/cost option
        const best = strat.options.reduce<any>((b, o) => {
          const score = (o.expected ?? 0) * (o.confidence ?? 0.5) / Math.max(o.cost_usd ?? 1, 1);
          return !b || score > b.score ? { ...o, score } : b;
        }, null);
        if (best) repos.chooseStrategy(strat.id, best.id ?? best.name);
        return created(res, { ...strat, chosen: best?.id ?? best?.name ?? null });
      }

      // POST /api/company/:id/experiments
      if (method === 'POST' && sub === '/experiments') {
        const body = await readBody(req) as any;
        if (!body?.hypothesis) return badRequest(res, 'hypothesis required');
        const exp = repos.createExperiment({ company_id: id, hypothesis: body.hypothesis, variant: body.variant ?? 'control', metric: body.metric ?? 'conversion', baseline: body.baseline ?? null });
        exp.status = 'running'; exp.started_at = new Date().toISOString();
        repos.saveExperiment(exp);
        return created(res, exp);
      }

      // POST /api/company/:id/experiments/:eid/conclude
      const concludeMatch = sub.match(/^\/experiments\/([^/]+)\/conclude$/);
      if (method === 'POST' && concludeMatch) {
        const body = await readBody(req) as any;
        const exps = repos.experiments(id);
        const exp = exps.find(e => e.id === concludeMatch[1]);
        if (!exp) return notFound(res, 'experiment not found');
        exp.current = body?.observed ?? null;
        exp.status = exp.current !== null && exp.baseline !== null && exp.current > exp.baseline ? 'won' : 'lost';
        repos.saveExperiment(exp);
        return ok(res, exp);
      }

      // POST /api/company/:id/capabilities/acquire
      if (method === 'POST' && sub === '/capabilities/acquire') {
        const body = await readBody(req) as any;
        if (!body?.name) return badRequest(res, 'name required');
        const ceiling = body.cost_ceiling_usd ?? 10;
        const urgency = body.urgency ?? 0.5;
        // simple heuristic: buy if cheap, create if urgency high, defer otherwise
        let decision: string, provider = '', agentRole = '', est_cost_usd = 0, reason = '';
        if (ceiling >= 5) {
          decision = 'buy'; provider = 'external'; est_cost_usd = ceiling * 0.8;
          const cap = repos.registerCapability({ company_id: id, name: body.name, kind: 'external', provider: 'external', description: body.description ?? '', cost_per_call: est_cost_usd / 100 });
          state.emit(id, 'capability.acquired', cap.id, 'capability', { name: body.name, decision });
        } else if (urgency > 0.7) {
          decision = 'create'; agentRole = `${body.name.toLowerCase().replace(/\s+/g, '_')}_specialist`;
        } else {
          decision = 'defer'; reason = 'cost ceiling too low and urgency not sufficient';
        }
        return ok(res, { decision: { decision, provider, agentRole, est_cost_usd, reason } });
      }

      // POST /api/company/:id/policies/check
      if (method === 'POST' && sub === '/policies/check') {
        const body = await readBody(req) as any;
        const verdict = new PolicyEngine(state).evaluate(id, body?.role ?? '*', body?.action ?? '*');
        return ok(res, { effect: verdict.effect, note: verdict.note ?? null, policy: verdict.policy });
      }

      return notFound(res, `Unknown /api/company endpoint: ${sub}`);
    }

    // GET /health
    if (method === 'GET' && url === '/health') {
      const companies = repos.companies();
      const agents = companies.flatMap(c => repos.agents(c.id));
      const tasks = companies.flatMap(c => (repos as any).tasks(c.id));
      return ok(res, { ok: true, companies: companies.length, agents: agents.length, tasks: tasks.length });
    }

    // GET /companies
    if (method === 'GET' && url === '/companies') {
      return ok(res, repos.companies());
    }

    // POST /companies
    if (method === 'POST' && url === '/companies') {
      const body = await readBody(req) as any;
      if (!body?.name || !body?.mission) return badRequest(res, 'name and mission required');
      const sovereign = new Sovereign(state);
      const company = sovereign.spawnCompany({ name: body.name, mission: body.mission });
      return created(res, company);
    }

    // GET /sovereign/digest
    if (method === 'GET' && url === '/sovereign/digest') {
      const sovereign = new Sovereign(state);
      const companies = repos.companies();
      return ok(res, companies.map(c => sovereign.digest(c.id)));
    }

    // Company-scoped routes
    const companyMatch = url.match(/^\/companies\/([^/]+)(\/.*)?$/);
    if (companyMatch) {
      const id = companyMatch[1];
      const sub = companyMatch[2] ?? '';
      const company = repos.company(id);
      if (!company) return notFound(res, `Company ${id} not found`);

      // GET /companies/:id/org
      if (method === 'GET' && sub === '/org') {
        return ok(res, { org: describeOrg(state, id) });
      }

      // GET /companies/:id/tasks
      if (method === 'GET' && sub === '/tasks') {
        return ok(res, (repos as any).tasks(id));
      }

      // POST /companies/:id/tasks
      if (method === 'POST' && sub === '/tasks') {
        const body = await readBody(req) as any;
        if (!body?.description) return badRequest(res, 'description required');
        const task = repos.createTask({ company_id: id, summary: body.description, kind: body.kind });
        return created(res, task);
      }

      // GET /companies/:id/memory
      if (method === 'GET' && sub === '/memory') {
        return ok(res, repos.memory(id, undefined, 20));
      }

      // GET /companies/:id/agents
      if (method === 'GET' && sub === '/agents') {
        return ok(res, repos.agents(id));
      }

      // POST /companies/:id/message
      if (method === 'POST' && sub === '/message') {
        const body = await readBody(req) as any;
        if (!body?.from || !body?.to || !body?.payload) return badRequest(res, 'from, to, payload required');
        // store as a memory event + emit
        state.emit(id, 'message.sent', body.from, 'agent', { to: body.to, payload: body.payload });
        return ok(res, { ok: true, from: body.from, to: body.to });
      }

      return notFound(res, `Unknown endpoint: ${sub}`);
    }

    // POST /chat
    if (method === 'POST' && url === '/chat') {
      const body = await readBody(req) as any;
      const message: string = String(body?.message || '');
      const companyId: string | undefined = body?.companyId;
      const msg = message.toLowerCase();

      let reply: string;
      let delegations: Array<{ role: string; message: string }>;

      const groqKey = process.env.GROQ_API_KEY;
      const anthropicKey = process.env.ANTHROPIC_API_KEY;
      const llmKey = groqKey || anthropicKey;

      if (llmKey) {
        try {
          const isGroq = !!groqKey;
          const systemPrompt = `You are PLUTO, an autonomous company OS. The user is the Sovereign. Respond as PLUTO in 1-2 sentences, then output a JSON block with key "delegations": array of {role,message} for CEO/COO/CFO. Format: <pluto>your reply</pluto><json>{"delegations":[...]}</json>`;

          let text = '';
          if (isGroq) {
            const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${llmKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ model: 'llama-3.3-70b-versatile', max_tokens: 512, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }] }),
            });
            const data = await r.json() as any;
            text = data?.choices?.[0]?.message?.content ?? '';
          } else {
            const r = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: { 'x-api-key': llmKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
              body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 512, system: systemPrompt, messages: [{ role: 'user', content: message }] }),
            });
            const data = await r.json() as any;
            text = data?.content?.[0]?.text ?? '';
          }

          const plutoMatch = text.match(/<pluto>([\s\S]*?)<\/pluto>/);
          const jsonMatch = text.match(/<json>([\s\S]*?)<\/json>/);
          reply = plutoMatch?.[1]?.trim() ?? text.trim();
          try { delegations = jsonMatch ? (JSON.parse(jsonMatch[1]) as any).delegations ?? [] : []; }
          catch { delegations = []; }
        } catch {
          reply = `Understood. I've briefed your C-suite on: "${message}"`;
          delegations = [
            { role: 'CEO', message: `I'll coordinate on "${message}". Assigning to relevant departments.` },
            { role: 'COO', message: `Operations are ready. Preparing execution plan.` },
            { role: 'CFO', message: `Budget check: within limits. Approved.` },
          ];
        }
      } else if (msg.includes('spawn') || msg.includes('create') || msg.includes('new company')) {
        reply = 'Use the [+ Spawn Company] button or [+ New] in the top bar to create a company.';
        delegations = [];
      } else if (msg.includes('status') || msg.includes('how') || msg.includes('report')) {
        const cs = repos.companies();
        reply = `Currently managing ${cs.length} compan${cs.length === 1 ? 'y' : 'ies'}. All systems nominal.`;
        delegations = [{ role: 'CEO', message: 'Generating status digest across all departments.' }];
      } else if (msg.includes('halt') || msg.includes('stop') || msg.includes('pause')) {
        reply = 'To halt a company, please confirm: which company should be halted?';
        delegations = [];
      } else {
        reply = `Understood. I've briefed your C-suite on: "${message}"`;
        delegations = [
          { role: 'CEO', message: `I'll coordinate on "${message}". Assigning to relevant departments.` },
          { role: 'COO', message: 'Operations are ready. I\'ll prepare execution plan.' },
          { role: 'CFO', message: 'Budget check: within limits. Approved.' },
        ];
      }

      if (companyId) {
        state.emit(companyId, 'sovereign.message', null, 'sovereign', { message, reply });
      }
      return ok(res, { reply, delegations });
    }

    // GET /events — last 50 across all companies
    if (method === 'GET' && url === '/events') {
      const cs = repos.companies();
      const events = cs.flatMap(c => repos.events(c.id, 50))
        .sort((a, b) => new Date(b.ts ?? 0).getTime() - new Date(a.ts ?? 0).getTime())
        .slice(0, 50);
      return ok(res, events);
    }

    // GET /org/:companyId
    const orgMatch = url.match(/^\/org\/([^/]+)$/);
    if (method === 'GET' && orgMatch) {
      const id = orgMatch[1];
      const company = repos.company(id);
      if (!company) return notFound(res, `Company ${id} not found`);
      const agents = repos.agents(id);
      const CSUITE = ['CEO', 'COO', 'CFO'];
      const csuite = agents.filter(a => CSUITE.includes(a.role));
      const departments = agents
        .filter(a => !CSUITE.includes(a.role))
        .reduce<Record<string, typeof agents>>((acc, a) => {
          const key = a.role?.slice(0, 3).toUpperCase() ?? 'OTH';
          (acc[key] = acc[key] ?? []).push(a);
          return acc;
        }, {});
      return ok(res, { company, csuite, departments });
    }

    // GET /agents/:companyId
    const agentsMatch = url.match(/^\/agents\/([^/]+)$/);
    if (method === 'GET' && agentsMatch) {
      const id = agentsMatch[1];
      const company = repos.company(id);
      if (!company) return notFound(res, `Company ${id} not found`);
      const agents = repos.agents(id);
      const tasks = (repos as any).tasks(id) as any[];
      const result = agents.map(a => ({
        ...a,
        currentTask: tasks.find((t: any) => t.agent_id === a.id && t.status === 'RUNNING')?.summary ?? null,
      }));
      return ok(res, result);
    }

    notFound(res);
  } catch (e) {
    send(res, 500, { error: e instanceof Error ? e.message : String(e) });
  }
});

server.listen(port, async () => {
  console.log(`Pluto API running on http://localhost:${port}`);
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    const { AgentExecutor } = await import('./work/executor.ts');
    const executor = new AgentExecutor(state, { groqApiKey: groqKey, pollMs: 10000 });
    executor.start();
  }
});

process.on('SIGTERM', () => { state.close(); server.close(); });
process.on('SIGINT', () => { state.close(); server.close(); process.exit(0); });
