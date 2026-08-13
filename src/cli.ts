import { mkdirSync } from 'node:fs';
import { PlutoState } from './kernel/state.ts';
import { describeOrg } from './plane/governance.ts';
import { Sovereign } from './sovereign/engine.ts';

// Parse args: extract --data <dir> and remaining positional args
const args = process.argv.slice(2);
let dataDir = './data';
const positional: string[] = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--data' && args[i + 1]) { dataDir = args[++i]; }
  else positional.push(args[i]);
}

mkdirSync(dataDir, { recursive: true });
const state = PlutoState.open(dataDir);
const repos = state.repos;

const [cmd, ...rest] = positional;

function pad(s: string | number, n: number, right = false): string {
  const str = String(s);
  if (right) return str.padStart(n);
  return str.padEnd(n);
}

function table(rows: string[][]): string {
  if (!rows.length) return '(empty)';
  const cols = rows[0].length;
  const widths = Array.from({ length: cols }, (_, c) => Math.max(...rows.map(r => String(r[c] ?? '').length)));
  return rows.map(r => r.map((cell, c) => pad(cell ?? '', widths[c])).join('  ')).join('\n');
}

switch (cmd) {
  case 'spawn': {
    const [name, ...mparts] = rest;
    if (!name) { console.error('Usage: pluto spawn <name> <mission>'); process.exit(1); }
    const mission = mparts.join(' ') || 'Operate an autonomous economic civilization';
    const sovereign = new Sovereign(state);
    const company = sovereign.spawnCompany({ name, mission });
    console.log(company.id);
    break;
  }

  case 'status': {
    const companies = repos.companies();
    if (!companies.length) { console.log('No companies. Run: pluto spawn <name> <mission>'); break; }
    const header = ['ID', 'NAME', 'STATUS', 'HEALTH', 'AGENTS', 'TASKS'];
    const rows = companies.map(c => {
      const agents = repos.agents(c.id).length;
      const tasks = (repos as any).tasks(c.id).length;
      return [c.id, c.name, c.status, c.health.toFixed(2), String(agents), String(tasks)];
    });
    console.log(table([header, ...rows]));
    break;
  }

  case 'task': {
    const [companyId, ...dparts] = rest;
    if (!companyId || !dparts.length) { console.error('Usage: pluto task <company_id> <description>'); process.exit(1); }
    const company = repos.company(companyId);
    if (!company) { console.error(`Company ${companyId} not found`); process.exit(1); }
    const task = repos.createTask({ company_id: companyId, summary: dparts.join(' ') });
    console.log(task.id);
    break;
  }

  case 'tasks': {
    const [companyId] = rest;
    if (!companyId) { console.error('Usage: pluto tasks <company_id>'); process.exit(1); }
    const tasks = (repos as any).tasks(companyId);
    if (!tasks.length) { console.log('No tasks.'); break; }
    const header = ['ID', 'STATUS', 'DESCRIPTION'];
    const rows = tasks.map((t: any) => [t.id, t.status, t.summary]);
    console.log(table([header, ...rows]));
    break;
  }

  case 'org': {
    const [companyId] = rest;
    if (!companyId) { console.error('Usage: pluto org <company_id>'); process.exit(1); }
    const company = repos.company(companyId);
    if (!company) { console.error(`Company ${companyId} not found`); process.exit(1); }
    console.log(describeOrg(state, companyId));
    break;
  }

  case 'digest': {
    const companies = repos.companies();
    if (!companies.length) { console.log('No companies.'); break; }
    const sovereign = new Sovereign(state);
    for (const c of companies) {
      const d = sovereign.digest(c.id);
      console.log(`\n=== ${c.name} (${c.id}) ===`);
      for (const [k, v] of Object.entries(d)) {
        console.log(`  ${pad(k, 20)} ${v}`);
      }
    }
    break;
  }

  case 'memory': {
    const [companyId] = rest;
    if (!companyId) { console.error('Usage: pluto memory <company_id>'); process.exit(1); }
    const rows = repos.memory(companyId, undefined, 10);
    if (!rows.length) { console.log('No memory.'); break; }
    const header = ['TS', 'TYPE', 'CONTENT'];
    const tableRows = rows.map(r => [r.ts.slice(0, 19), r.type, r.content.slice(0, 80)]);
    console.log(table([header, ...tableRows]));
    break;
  }

  default: {
    console.log(`Usage: pluto <command> [options]

Commands:
  spawn <name> <mission>     Spawn a new company, prints its ID
  status                     List all companies with agent/task counts
  task <id> <description>    Create a task for a company
  tasks <id>                 List tasks for a company
  org <id>                   Print org summary (departments + agents)
  digest                     Sovereign daily digest for all companies
  memory <id>                Print last 10 memory rows for a company

Options:
  --data <dir>               Data directory (default: ./data)
`);
    if (cmd) process.exit(1);
  }
}

state.close();
