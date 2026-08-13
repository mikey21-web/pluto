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
      const html = getDashboardHTML(`https://ravishing-balance-production-68ee.up.railway.app`);
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
