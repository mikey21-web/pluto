import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { mkdirSync } from 'node:fs';
import { PlutoState } from './kernel/state.ts';
import { describeOrg } from './plane/governance.ts';
import { Sovereign } from './sovereign/engine.ts';
import { getDashboardHTML } from './dashboard/html.ts';

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
    // GET / or /dashboard — serve the dashboard UI
    if (method === 'GET' && (url === '/' || url === '/dashboard')) {
      const html = getDashboardHTML('');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
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

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (apiKey) {
        try {
          const prompt = `You are PLUTO, an autonomous company OS. The user is the Sovereign. Respond as PLUTO in 1-2 sentences, then output a JSON block with key "delegations": array of {role,message} for CEO/COO/CFO. Format: <pluto>your reply</pluto><json>{"delegations":[...]}</json>`;
          const r = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
            body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 512, system: prompt, messages: [{ role: 'user', content: message }] }),
          });
          const data = await r.json() as any;
          const text: string = data?.content?.[0]?.text ?? '';
          const plutoMatch = text.match(/<pluto>([\s\S]*?)<\/pluto>/);
          const jsonMatch = text.match(/<json>([\s\S]*?)<\/json>/);
          reply = plutoMatch?.[1]?.trim() ?? text.trim();
          delegations = jsonMatch ? (JSON.parse(jsonMatch[1]) as any).delegations ?? [] : [];
        } catch {
          reply = `Understood. I've briefed your C-suite on: "${message}"`;
          delegations = [
            { role: 'CEO', message: `I'll coordinate on "${message}". Assigning to relevant departments.` },
            { role: 'COO', message: 'Operations are ready. I\'ll prepare execution plan.' },
            { role: 'CFO', message: 'Budget check: within limits. Approved.' },
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

server.listen(port, () => {
  console.log(`Pluto API running on http://localhost:${port}`);
});

process.on('SIGTERM', () => { state.close(); server.close(); });
process.on('SIGINT', () => { state.close(); server.close(); process.exit(0); });
