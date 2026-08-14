// PLUTO Command Center — dashboard SPA. Renders the company as a living graph +
// full §34 view set (workforce, departments, objectives, events, decisions,
// resources, approvals, intelligence, strategy, capabilities, policies, projects,
// messages, jobs, artifacts).

/* eslint-disable @typescript-eslint/no-explicit-any */

type Company = {
  id: string; name: string; mission: string; health: number;
  agents: number; departments: number; tasks_total: number; tasks_failed: number;
  spend: number; approvals_pending: number; capabilities: number; projects: number; strategies: number;
};

type Snapshot = {
  company: Company;
  org_summary: string;
  graph: { nodes: any[]; edges: any[] };
  departments: any[];
  agents: any[];
  objectives: any[];
  projects: any[];
  tasks: any[];
  events: any[];
  approvals: any[];
  decisions: any[];
  budgets: any[];
  memory: any[];
  learning: any[];
  traces: any[];
  capabilities: any[];
  policies: any[];
  risks: any[];
  experiments: any[];
  strategies: any[];
  messages: any[];
  jobs: any[];
  artifacts: any[];
  intelligence: any;
};

const state = { companies: [] as Company[], snap: null as Snapshot | null, view: 'command' as string, cid: (localStorage.getItem('pluto.cid') ?? '') as string };

const $ = <T extends HTMLElement>(sel: string): T => document.querySelector(sel) as T;
const esc = (s: unknown): string => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c]);
const fmt = (n: number): string => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;
const pct = (x: number): number => Math.round((x ?? 0) * 100);
const time = (ts: string | null): string => ts ? ts.slice(11, 19) : '—';

const HUMAN_DICT: Record<string, string> = {
  llm: 'LLM', opex: 'OpEx', ceo: 'CEO', cto: 'CTO', seo: 'SEO', icp: 'ICP',
  qa: 'QA', api: 'API', hr: 'HR', krs: 'KRs', usd: 'USD', ai: 'AI', mrr: 'MRR', roi: 'ROI',
};
const human = (s: unknown): string => String(s ?? '')
  .replace(/[._-]+/g, ' ')
  .trim()
  .split(' ')
  .filter(Boolean)
  .map(w => HUMAN_DICT[w.toLowerCase()] ?? (w ? w[0].toUpperCase() + w.slice(1) : w))
  .join(' ');
const agentName = (s: Snapshot, id?: string | null): string => {
  if (!id) return '—';
  const a = s.agents.find(x => x.id === id);
  if (a) return human(a.name);
  if (/^(agt|hum|dep|obj|proj|task|wn)_/i.test(id)) return '—';
  return human(id);
};

async function getJSON<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

// ---- refresh ----------
function currentCompany(): Company | undefined {
  return state.companies.find(c => c.id === state.cid) ?? state.companies[0];
}

async function refresh() {
  try {
    state.companies = await getJSON<Company[]>('/api/companies');
    const c = currentCompany();
    if (!c) return;
    if (state.cid !== c.id) { state.cid = c.id; localStorage.setItem('pluto.cid', c.id); }
    renderCompanySwitcher();
    state.snap = await getJSON<Snapshot>(`/api/company/${c.id}/snapshot`);
    renderSidebarAgents();
    renderAll();
  } catch (e) { $('#live').classList.remove('on'); }
}

function renderCompanySwitcher() {
  const sel = $<HTMLSelectElement>('#company-select');
  sel.innerHTML = state.companies.map(c => `<option value="${esc(c.id)}" ${c.id === state.cid ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
}

function renderAll() {
  const c = currentCompany();
  if (!c) return;
  $('#company-label').textContent = `${c.name} — ${c.mission.slice(0, 60)}`;
  const h = c.health * 100;
  $('#health').textContent = `health ${h.toFixed(0)}%`;
  renderCrumbs();
  renderKpis(c);
  renderOrg();
  renderObjectives();
  renderProps();
  renderView();
}

function renderCrumbs() {
  const c = currentCompany();
  const meta = NAV_META[state.view];
  const label = state.view === 'graph' ? 'Org Graph' : (meta?.label ?? state.view);
  $('#crumbs').innerHTML = `PLUTO<span class="sep">›</span><span>${esc(c ? c.name : '')}</span><span class="sep">›</span><span class="here">${esc(label)}</span>`;
}

function renderProps() {
  const s = state.snap;
  const c = currentCompany();
  if (!s || !c) return;
  const budgets = s.budgets.slice(0, 5);
  const p: string[] = [];
  p.push(`<div class="prop-block"><h3>Company</h3>`);
  p.push(`<div class="prop-row"><span class="k">Name</span><span class="v">${esc(c.name)}</span></div>`);
  p.push(`<div class="prop-row"><span class="k">Mission</span><span class="v" title="${esc(c.mission)}">${esc(c.mission)}</span></div>`);
  p.push(`<div class="prop-row"><span class="k">Health</span><span class="v" style="display:inline-flex;align-items:center;gap:8px">${(c.health * 100).toFixed(0)}%<span class="bar ${c.health > 0.6 ? 'good' : c.health > 0.3 ? 'warn' : 'bad'}" style="width:64px;margin:0"><div style="width:${Math.round(c.health * 100)}%"></div></span></span></div>`);
  p.push(`<div class="prop-row"><span class="k">Spend</span><span class="v mono">${fmt(c.spend)}</span></div>`);
  p.push(`<div class="prop-row"><span class="k">Agents</span><span class="v">${c.agents} · ${c.departments} departments</span></div>`);
  p.push(`</div>`);
  if (budgets.length) {
    p.push(`<div class="prop-block"><h3>Budgets</h3>`);
    for (const b of budgets) {
      p.push(`<div class="prop-row"><span class="k">${esc(human(b.scope))}</span><span class="v mono">${fmt(b.used_usd)} / ${fmt(b.limit_usd)}</span></div>`);
      p.push(`<div class="bar ${b.over ? 'bad' : b.pct > 80 ? 'warn' : 'good'}" style="margin-top:2px"><div style="width:${Math.min(b.pct, 100)}%"></div></div>`);
    }
    p.push(`</div>`);
  }
  p.push(`<div class="prop-block"><h3>Live Activity</h3>`);
  for (const e of s.events.slice(0, 8)) {
    p.push(`<div class="evt"><span class="t">${time(e.ts)}</span><span class="ty">${esc(human(e.type))}</span><span class="msg">${esc(String(e.payload?.summary ?? '').slice(0, 44))}</span></div>`);
  }
  p.push(`</div>`);
  p.push(`<div class="prop-block"><h3>Decisions</h3>`);
  for (const d of s.decisions.slice(0, 4)) {
    p.push(`<div class="evt"><span class="t">${time(d.ts)}</span><span class="ty">${esc(human(d.kind))}</span><span class="msg" title="${esc(d.summary)}">${esc(d.summary.slice(0, 44))}</span></div>`);
  }
  p.push(`</div>`);
  $('#props').innerHTML = p.join('');
}

function renderKpis(c: Company) {
  const snap = state.snap!;
  const kpis = [
    { l: 'Agents', v: String(c.agents), cls: '' },
    { l: 'Departments', v: String(c.departments), cls: '' },
    { l: 'Tasks done', v: String(c.tasks_total), cls: '' },
    { l: 'Failed', v: String(c.tasks_failed), cls: c.tasks_failed ? 'warn' : '' },
    { l: 'Spend', v: fmt(c.spend), cls: '' },
    { l: 'Approvals', v: String(c.approvals_pending), cls: c.approvals_pending ? 'warn' : '' },
    { l: 'Capabilities', v: String(c.capabilities), cls: '' },
    { l: 'Strategies', v: String(c.strategies), cls: '' },
    { l: 'Projects', v: String(c.projects), cls: '' },
    { l: 'Policies', v: String(snap.policies.length), cls: '' },
  ];
  $('#kpis').innerHTML = kpis.map(k => `<div class="kpi"><div class="v ${k.cls}">${esc(k.v)}</div><div class="l">${esc(k.l)}</div></div>`).join('');
}

function renderOrg() {
  const snap = state.snap!;
  $('#org-list').innerHTML = snap.departments.map(d => {
    const members = snap.agents.filter(a => a.department_id === d.id);
    return `<div style="margin-bottom:8px">
      <div style="font-weight:600">${esc(d.name)} <span class="pill accent">${esc(d.kind)}</span></div>
      <div style="color:var(--dim);font-size:12px">${members.map(m => `${esc(m.name)} <span class="pill ${m.status === 'active' ? 'ok' : ''}">${esc(m.role)}</span>`).join(' ') || '—'}</div>
    </div>`;
  }).join('') || '<div class="empty">no departments yet</div>';
}

function renderObjectives() {
  const snap = state.snap!;
  const roots = snap.objectives.filter(o => !o.parent_id);
  const byParent = (id: string | null) => snap.objectives.filter(o => o.parent_id === id);
  const tree = (objs: any[]): string => objs.map(o => {
    const kids = byParent(o.id);
    const bar = `<div class="bar ${o.progress > 0.7 ? 'good' : o.progress > 0.3 ? 'warn' : ''}"><div style="width:${Math.round(o.progress * 100)}%"></div></div>`;
    return `<div style="margin:4px 0 4px 14px;border-left:1px solid var(--line);padding-left:8px">
      <div style="font-size:12px">${esc(o.title)} <span class="pill">${(o.progress * 100).toFixed(0)}%</span></div>${bar}
      ${kids.length ? tree(kids) : ''}
    </div>`;
  }).join('');
  $('#obj-tree').innerHTML = tree(roots) || '<div class="empty">no objectives</div>';
}

// ---- view registry (§34) ----------
function renderView() {
  const wrap = $('#graph-wrap');
  const cmd = $('#view-command');
  wrap.classList.add('hidden');
  cmd.classList.remove('hidden');
  const c = currentCompany();
  if (!c) return;
  if (state.view === 'graph') { wrap.classList.remove('hidden'); cmd.classList.add('hidden'); renderGraph(); return; }
  const v = VIEWS[state.view] ?? VIEWS.command;
  cmd.innerHTML = v.render(state.snap!, c);
  wire(cmd, c);
}

// ---- command ----------
function commandView(s: Snapshot): string {
  return `
    <div class="grid2">
      <div>
        <h3>Command Center</h3>
        <div class="summary">${esc(s.intelligence.summary)}</div>
        <h3 style="margin:10px 0 4px">Intelligence Fact Feed</h3>
        <div id="facts">
          ${s.intelligence.facts.slice(0, 10).map(f => `<div class="event"><span class="ty">${esc(human(f.predicate))}</span><span>${esc(f.subject)} → ${esc(f.object)} <span class="dim">${pct(f.confidence)}%</span></span></div>`).join('') || '<div class="empty">no facts</div>'}
        </div>
      </div>
      <div>
        <h3>Pending Approvals (${s.approvals.length})</h3>
        ${s.approvals.map(a => `
          <div class="approval">
            <div class="a">${esc(a.summary)}</div>
            <div class="mono dim" style="font-size:11px">${esc(human(a.action))} · risk ${esc(human(a.risk))} · ${a.cost_usd ? fmt(a.cost_usd) : 'no cost'}</div>
            <button class="ok" data-decide="${a.id}" data-v="approved">Approve</button>
            <button class="no" data-decide="${a.id}" data-v="rejected">Reject</button>
          </div>`).join('') || '<div class="empty">no pending approvals</div>'}
        <h3 style="margin:12px 0 4px">Recent Decisions</h3>
        ${s.decisions.slice(0, 6).map(d => `<div class="event"><span class="t">${time(d.ts)}</span><span class="ty">${esc(human(d.kind))}</span><span title="${esc(d.reasoning)}">${esc(d.summary)}</span></div>`).join('') || '<div class="empty">none</div>'}
      </div>
    </div>
    <div class="grid3" style="margin-top:10px">
      <div>
        <h3>Budgets</h3><table>
          ${s.budgets.map(b => `<tr><td>${esc(human(b.scope))}</td><td class="mono">${fmt(b.used_usd)} / ${fmt(b.limit_usd)}</td><td style="width:90px"><div class="bar ${b.over ? 'bad' : b.pct > 80 ? 'warn' : 'good'}"><div style="width:${Math.min(b.pct, 100)}%"></div></div></td></tr>`).join('') || '<tr><td class="empty">none</td></tr>'}
        </table>
      </div>
      <div>
        <h3>Memory</h3>
        ${s.memory.slice(0, 8).map(m => `<div class="event"><span class="t">${esc(human(m.type))}</span><span>${esc(m.content.slice(0, 90))}</span></div>`).join('') || '<div class="empty">none</div>'}
      </div>
      <div>
        <h3>Learning</h3>
        ${s.learning.slice(0, 6).map(l => `<div class="event"><span class="ty">${esc(human(l.kind))}</span><span>${esc(l.lesson.slice(0, 80))}</span></div>`).join('') || '<div class="empty">none</div>'}
      </div>
    </div>`;
}

// ---- workforce ----------
function workforceView(s: Snapshot): string {
  return `
    <h3>Workforce (${s.agents.length} agents)</h3>
    <div class="scroll">
      <table>
        <tr><th></th><th>Agent</th><th>Role</th><th>Dept</th><th>Status</th><th>Tasks</th><th>Success</th><th>Fail</th><th>Budget used</th><th>v</th></tr>
        ${s.agents.map(a => {
          const dept = s.departments.find(d => d.id === a.department_id);
          return `<tr>
            <td style="width:20px"><span class="capsule capsule-sm ${capsuleClass(a.status)}" style="background:${capsuleBg(a.name)}"></span></td>
            <td>${esc(a.name)}</td>
            <td>${esc(human(a.role))}</td>
            <td>${dept ? esc(dept.name) : '—'}</td>
            <td><span class="pill ${a.status === 'active' ? 'ok' : a.status === 'paused' ? 'warn' : ''}">${esc(human(a.status))}</span></td>
            <td class="mono">${a.performance.tasks_done ?? 0}</td>
            <td class="mono">${pct(a.performance.success_rate)}%</td>
            <td class="mono ${a.fail_rate > 0.3 ? 'bad' : ''}">${pct(a.fail_rate)}%</td>
            <td class="mono">${fmt(a.budget.used_usd)} / ${fmt(a.budget.monthly_usd)}</td>
            <td class="mono dim">${a.version}</td>
          </tr>`;
        }).join('') || '<tr><td class="empty">no agents</td></tr>'}
      </table>
    </div>`;
}

// ---- departments ----------
function departmentsView(s: Snapshot): string {
  return `
    <h3>Departments</h3>
    <div class="grid2">${s.departments.map(d => {
      const members = s.agents.filter(a => a.department_id === d.id);
      const objs = s.objectives.filter(o => o.department_id === d.id);
      return `<div class="panel">
        <h3>${esc(d.name)} <span class="pill accent">${esc(human(d.kind))}</span></h3>
        <div class="dim">status ${esc(human(d.status))}${d.manager_id ? ` · manager ${esc(agentName(s, d.manager_id))}` : ''}</div>
        <div style="margin-top:6px">members: ${members.map(m => `<span class="pill ${m.status === 'active' ? 'ok' : ''}">${esc(human(m.role))}</span>`).join(' ') || '—'}</div>
        <div style="margin-top:6px">objectives: ${objs.map(o => `<span class="pill">${esc(o.title.slice(0, 28))}</span>`).join(' ') || '—'}</div>
      </div>`;
    }).join('') || '<div class="empty">no departments</div>'}</div>`;
}

// ---- objectives ----------
function objectivesView(s: Snapshot): string {
  const roots = s.objectives.filter(o => !o.parent_id);
  const byParent = (id: string | null) => s.objectives.filter(o => o.parent_id === id);
  const tree = (objs: any[]): string => objs.map(o => `
    <div class="panel" style="margin:8px 0 8px 16px;border-left:2px solid var(--accent)">
      <div style="display:flex;justify-content:space-between"><b>${esc(o.title)}</b><span class="pill ${o.progress > 0.7 ? 'ok' : ''}">${pct(o.progress)}%</span></div>
      <div class="dim">${esc(o.description.slice(0, 120))}</div>
      ${o.krs.map(k => `<div style="margin-top:4px;font-size:12px">${esc(k.label)} — <b>${k.current}</b>/<b>${k.target}</b> ${esc(k.unit)} <span class="pill">${pct(Math.min(k.current / Math.max(k.target, 1), 1))}%</span></div>`).join('')}
      <div class="bar ${o.progress > 0.7 ? 'good' : ''}"><div style="width:${Math.round(o.progress * 100)}%"></div></div>
      ${tree(byParent(o.id))}
    </div>`).join('');
  return `<h3>Objective Explorer</h3>${s.objectives.length ? tree(roots) : '<div class="empty">no objectives</div>'}`;
}

// ---- events ----------
function eventsView(s: Snapshot): string {
  const kinds = Array.from(new Set(s.events.map(e => e.type))).sort();
  return `
    <h3>Event Timeline (${s.events.length})</h3>
    <div style="margin:6px 0">${kinds.map(k => `<button class="chip" data-chip="${esc(k)}">${esc(human(k))}</button>`).join(' ')} <button class="chip clear" data-chip="">all</button></div>
    <div id="evt-list" class="scroll2">
      ${s.events.map(e => `<div class="event" data-evt="${esc(e.type)}"><span class="t">${time(e.ts)}</span><span class="ty">${esc(human(e.type))}</span><span>${e.entity_kind ? esc(human(e.entity_kind)) : ''} ${e.payload?.summary ? '· ' + esc(String(e.payload.summary).slice(0, 60)) : ''}</span></div>`).join('') || '<div class="empty">no events</div>'}
    </div>`;
}

// ---- decisions ----------
function decisionsView(s: Snapshot): string {
  return `
    <h3>Decision Log (${s.decisions.length})</h3>
    <div class="scroll"><table>
      <tr><th>time</th><th>kind</th><th>summary</th><th>confidence</th><th>by</th></tr>
      ${s.decisions.map(d => `<tr>
        <td class="mono dim">${time(d.ts)}</td>
        <td><span class="ty">${esc(human(d.kind))}</span></td>
        <td title="${esc(d.reasoning)}">${esc(d.summary)}${d.alternatives?.length ? `<div class="dim" style="font-size:11px">∨ ${d.alternatives.join(', ')}</div>` : ''}</td>
        <td class="mono">${pct(d.confidence)}%</td>
        <td class="dim">${esc(agentName(s, d.actor_id))}</td>
      </tr>`).join('')}
    </table></div>`;
}

// ---- resources ----------
function resourcesView(s: Snapshot): string {
  const spend = s.budgets.reduce((a, b) => a + b.used_usd, 0);
  const limits = s.budgets.reduce((a, b) => a + b.limit_usd, 0);
  const llmCost = s.traces.reduce((a, t) => a + t.cost_usd, 0);
  const llmCalls = s.traces.length;
  return `
    <h3>Resource Dashboard</h3>
    <div class="kpi-grid">
      <div class="kpi"><div class="v">${fmt(spend)}</div><div class="l">total spend</div></div>
      <div class="kpi"><div class="v">${fmt(limits)}</div><div class="l">total limits</div></div>
      <div class="kpi"><div class="v">${llmCalls}</div><div class="l">LLM calls</div></div>
      <div class="kpi"><div class="v">${fmt(llmCost)}</div><div class="l">LLM cost</div></div>
    </div>
    <h3 style="margin-top:12px">Budget Ledger</h3>
    <div class="scroll"><table>
      <tr><th>scope</th><th>kind</th><th>used</th><th>limit</th><th>allocated</th><th></th></tr>
      ${s.budgets.map(b => `<tr>
        <td>${esc(human(b.scope))}</td><td>${esc(human(b.kind))}</td>
        <td class="mono">${fmt(b.used_usd)}</td><td class="mono">${fmt(b.limit_usd)}</td><td class="mono">${fmt(b.allocated_usd)}</td>
        <td style="width:120px"><div class="bar ${b.over ? 'bad' : b.pct > 80 ? 'warn' : 'good'}"><div style="width:${Math.min(b.pct, 100)}%"></div></div></td>
      </tr>`).join('') || '<tr><td class="empty">none</td></tr>'}
    </table></div>`;
}

// ---- approvals ----------
function approvalsView(s: Snapshot): string {
  return `
    <h3>Approval Center</h3>
    <div class="grid2">${s.approvals.map(a => `
      <div class="approval">
        <div class="a">${esc(a.summary)}</div>
        <div class="mono dim" style="font-size:11px">action ${esc(human(a.action))} · risk ${esc(human(a.risk))} · cost ${a.cost_usd ? fmt(a.cost_usd) : '—'} · by ${esc(human(a.req_by))}</div>
        <div class="dim" style="font-size:11px">actor ${esc(agentName(s, a.actor_id))} · ${time(a.authored_at)}</div>
        <button class="ok" data-decide="${a.id}" data-v="approved">Approve</button>
        <button class="no" data-decide="${a.id}" data-v="rejected">Reject</button>
      </div>`).join('') || '<div class="empty">no pending approvals</div>'}</div>`;
}

// ---- intelligence ----------
function intelligenceView(s: Snapshot): string {
  const i = s.intelligence;
  return `
    <h3>Company Intelligence</h3>
    <div class="summary">${esc(i.summary)}</div>
    <div class="grid2" style="margin-top:10px">
      <div>
        <h3>Known Facts (${i.facts.length})</h3>
        ${i.facts.map(f => `<div class="event"><span class="ty">${esc(human(f.predicate))}</span><span>${esc(f.subject)} → ${esc(f.object)} <span class="dim">· ${pct(f.confidence)}% ${time(f.ts)}</span></span></div>`).join('') || '<div class="empty">none</div>'}
      </div>
      <div>
        <h3>Customers</h3>
        ${i.customers.length ? i.customers.map(c => `<div class="event"><span class="ty">customer</span><span>${esc(human(c.name))}</span></div>`).join('') : '<div class="empty">no customers known — run a discovery</div>'}
        <h3 style="margin-top:10px">Capabilities (${i.capabilities.length})</h3>
        ${i.capabilities.map(c => `<div class="event"><span class="ty">capability</span><span>${esc(human(c.name))}</span></div>`).join('') || '<div class="empty">none</div>'}
        <h3 style="margin-top:10px">Open Risks</h3>
        ${i.risks.map(r => `<div class="event"><span class="ty bad">risk</span><span>${esc(r)}</span></div>`).join('') || '<div class="empty">none</div>'}
        <h3 style="margin-top:10px">Recent Failures</h3>
        ${i.recent_errors.map(r => `<div class="event"><span class="ty bad">failure</span><span>${esc(r)}</span></div>`).join('') || '<div class="empty">none</div>'}
      </div>
    </div>`;
}

// ---- strategy ----------
function strategyView(s: Snapshot): string {
  return `
    <h3>Strategy & Experiments</h3>
    <div class="grid2">
      <div>
        <h3>Strategies (${s.strategies.length})</h3>
        ${s.strategies.map(st => `
          <div class="panel">
            <div><b>${esc(st.name)}</b> <span class="pill ${st.status === 'chosen' ? 'ok' : 'accent'}">${esc(human(st.status))}</span>
              ${st.chosen ? `<span class="pill accent">chose: ${esc(st.options.find(o => o.id === st.chosen)?.name ?? st.chosen)}</span>` : ''}</div>
            <div class="dim" style="font-size:11px">${esc(human(st.kind))} · ${time(st.created_at)}</div>
            <table style="margin-top:6px"><tr><th>option</th><th>expected</th><th>conf</th><th>cost</th><th></th></tr>
              ${st.options.map(o => `<tr><td>${esc(o.name)}</td><td class="mono">${o.expected}</td><td class="mono">${pct(o.confidence)}%</td><td class="mono">${fmt(o.cost_usd)}</td><td class="mono dim">${esc(o.summary.slice(0, 40))}</td></tr>`).join('')}
            </table>
          </div>`).join('') || '<div class="empty">no strategies — run the simulation tab</div>'}
      </div>
      <div>
        <h3>Experiments (${s.experiments.length})</h3>
        ${s.experiments.map(e => `
          <div class="panel">
            <div><b>${esc(e.hypothesis.slice(0, 70))}</b> <span class="pill ${e.status === 'won' ? 'ok' : e.status === 'lost' ? 'bad' : e.status === 'running' ? 'warn' : 'accent'}">${esc(human(e.status))}</span></div>
            <div class="dim" style="font-size:11px">variant ${esc(human(e.variant))} · metric ${esc(human(e.metric))} · baseline ${e.baseline ?? '—'} · current ${e.current ?? '—'}</div>
            ${e.status === 'running' ? `<div style="margin-top:6px"><input id="obs-${e.id}" class="mono" type="number" step="0.001" placeholder="observed value" style="width:130px"/><button class="chip accent" data-conclude="${e.id}">conclude</button></div>` : ''}
          </div>`).join('') || '<div class="empty">no experiments</div>'}
      </div>
    </div>`;
}

// ---- capabilities ----------
function capabilitiesView(s: Snapshot): string {
  return `
    <h3>Capability Registry (${s.capabilities.length})</h3>
    <div class="scroll"><table>
      <tr><th>capability</th><th>kind</th><th>provider</th><th>status</th><th>cost / call</th><th>avail</th></tr>
      ${s.capabilities.map(c => `<tr>
        <td><b>${esc(human(c.name))}</b><div class="dim" style="font-size:11px">${esc(c.description.slice(0, 70))}</div></td>
        <td><span class="pill accent">${esc(human(c.kind))}</span></td>
        <td>${esc(human(c.provider))}</td>
        <td><span class="pill ${c.status === 'available' ? 'ok' : 'warn'}">${esc(human(c.status))}</span></td>
        <td class="mono">${c.cost_per_call ? fmt(c.cost_per_call) : '—'}</td>
        <td class="mono">${pct(c.availability)}%</td>
      </tr>`).join('') || '<tr><td class="empty">none</td></tr>'}
    </table></div>`;
}

// ---- policies ----------
function policiesView(s: Snapshot): string {
  return `
    <h3>Policy Engine (${s.policies.length})</h3>
    <div class="grid2">
      <div>
        ${s.policies.map(p => `
          <div class="panel">
            <div><b>${esc(human(p.name))}</b> <span class="pill accent">${esc(human(p.scope))}</span> <span class="pill">${esc(human(p.status))}</span></div>
            ${p.rules.map(r => `<div style="font-size:12px;margin-top:2px"><span class="ty">${esc(human(r.action))}</span> → <span class="pill ${r.effect === 'allow' ? 'ok' : r.effect === 'deny' ? 'bad' : 'warn'}">${esc(human(r.effect))}</span>${r.note ? ` <span class="dim">${esc(r.note)}</span>` : ''}</div>`).join('')}
          </div>`).join('') || '<div class="empty">none</div>'}
      </div>
      <div>
        <h3>Test a Policy</h3>
        <div style="display:flex;gap:6px"><input id="pol-role" placeholder="role (e.g. Sales Manager)" class="mono" style="flex:1"/></div>
        <div style="display:flex;gap:6px;margin-top:6px"><input id="pol-action" placeholder="action (e.g. Fetch URL)" class="mono" style="flex:1"/>
        <button class="chip accent" data-policy="check">evaluate</button></div>
        <div id="pol-result" class="dim"></div>
      </div>
    </div>`;
}

// ---- projects ----------
function projectsView(s: Snapshot): string {
  return `
    <h3>Projects (${s.projects.length})</h3>
    <div class="scroll"><table>
      <tr><th>project</th><th>status</th><th>phase</th><th>budget</th><th>objective</th></tr>
      ${s.projects.map(p => `<tr>
        <td><b>${esc(human(p.name))}</b></td>
        <td><span class="pill ${p.status === 'done' ? 'ok' : p.status === 'active' ? 'warn' : ''}">${esc(human(p.status))}</span></td>
        <td class="dim">${esc(human(p.phase))}</td>
        <td class="mono">${fmt(p.budget_usd)}</td>
        <td class="dim">${p.objective_id ? esc(agentName(s, p.objective_id)) : '—'}</td>
      </tr>`).join('') || '<tr><td class="empty">none</td></tr>'}
    </table></div>`;
}

// ---- messages ----------
function messagesView(s: Snapshot): string {
  return `
    <h3>Typed Messages (${s.messages.length})</h3>
    <div class="scroll2">
      ${s.messages.map(m => `<div class="event"><span class="t">${time(m.sent_at)}</span><span class="ty">${esc(human(m.contract))}</span><span>${esc(agentName(s, m.from_agent))} → ${m.to_agent ? esc(agentName(s, m.to_agent)) : m.to_department ? esc(agentName(s, m.to_department)) : '*'}</span> <span class="dim mono">${esc(JSON.stringify(m.payload).slice(0, 80))}</span> <span class="pill ${m.status === 'actioned' ? 'ok' : ''}">${esc(human(m.status))}</span></div>`).join('') || '<div class="empty">no messages</div>'}
    </div>`;
}

// ---- jobs ----------
function jobsView(s: Snapshot): string {
  return `
    <h3>Execution Fabric — Jobs (${s.jobs.length})</h3>
    <div class="scroll"><table>
      <tr><th>job</th><th>task</th><th>status</th><th>attempts</th><th>last heartbeat</th><th>error</th></tr>
      ${s.jobs.map(j => `<tr>
        <td class="mono dim">${j.task_id ? '#' + j.task_id.slice(0, 6) : '—'}</td>
        <td class="dim">${j.task_id ? 'task ' + j.task_id.slice(0, 6) : '—'}</td>
        <td><span class="pill ${j.status === 'succeeded' ? 'ok' : j.status === 'failed' ? 'bad' : j.status === 'running' || j.status === 'retrying' ? 'warn' : ''}">${esc(human(j.status))}</span></td>
        <td class="mono">${j.attempts}/${j.max_attempts}</td>
        <td class="mono dim">${j.last_heartbeat ? time(j.last_heartbeat) : '—'}</td>
        <td class="dim" style="font-size:11px">${esc((j.error ?? '').slice(0, 40))}</td>
      </tr>`).join('') || '<tr><td class="empty">no jobs</td></tr>'}
    </table></div>`;
}

// ---- artifacts ----------
function artifactsView(s: Snapshot): string {
  return `
    <h3>Artifacts (${s.artifacts.length})</h3>
    <div class="scroll"><table>
      <tr><th>artifact</th><th>kind</th><th>uri</th><th>by</th><th>at</th></tr>
      ${s.artifacts.map(a => `<tr>
        <td><b>${esc(human(a.name))}</b></td>
        <td><span class="pill accent">${esc(human(a.kind))}</span></td>
        <td class="mono dim">${esc(a.uri.slice(0, 50))}</td>
        <td class="mono dim">${esc(agentName(s, a.created_by))}</td>
        <td class="mono dim">${time(a.created_at)}</td>
      </tr>`).join('') || '<tr><td class="empty">none</td></tr>'}
    </table></div>`;
}

// ---- simulation ----------
function simulationView(s: Snapshot): string {
  return `
    <h3>Simulation Lab</h3>
    <div class="summary">Formulate a strategy from option scores (expected impact × confidence − cost), launch an experiment, check policy gates, or drive a capability acquisition decision. All writes land in the real knowledge store.</div>
    <div class="grid3" style="margin-top:10px">
      <div class="panel">
        <h3>Formulate Strategy</h3>
        <input id="sim-name" placeholder="strategy name (e.g. Market Entry)" class="mono w100"/>
        <textarea id="sim-options" class="mono w100" rows="6" placeholder='options JSON: [{"name":"Referral partners","expected":0.6,"confidence":0.8,"cost_usd":300,"summary":"..."}]'></textarea>
        <button class="chip accent w100" data-sim="strategy">formulate & choose</button>
      </div>
      <div class="panel">
        <h3>Start Experiment</h3>
        <input id="exp-hyp" placeholder="hypothesis" class="mono w100"/>
        <input id="exp-var" placeholder="variant (e.g. Content First)" class="mono w100"/>
        <input id="exp-metric" placeholder="metric (e.g. conversion)" class="mono w100"/>
        <input id="exp-base" type="number" step="0.001" placeholder="baseline (e.g. 0.02)" class="mono w100"/>
        <button class="chip accent w100" data-sim="experiment">start experiment</button>
      </div>
      <div class="panel">
        <h3>Acquire Capability</h3>
        <input id="cap-name" placeholder="capability (e.g. SEO Audit)" class="mono w100"/>
        <input id="cap-desc" placeholder="description" class="mono w100"/>
        <input id="cap-cost" type="number" step="0.1" placeholder="cost ceiling (e.g. 10)" class="mono w100"/>
        <button class="chip accent w100" data-sim="capability">acquire decision</button>
        <div id="sim-result" class="dim" style="margin-top:8px"></div>
      </div>
    </div>`;
}

const VIEWS: Record<string, { label: string; render: (s: Snapshot, c: Company) => string }> = {
  command:     { label: 'command',    render: commandView },
  graph:       { label: 'graph',      render: () => '' },
  workforce:   { label: 'workforce',  render: workforceView },
  departments: { label: 'departments', render: departmentsView },
  objectives:  { label: 'objectives', render: objectivesView },
  events:      { label: 'events',     render: eventsView },
  decisions:   { label: 'decisions',  render: decisionsView },
  resources:   { label: 'resources',  render: resourcesView },
  approvals:   { label: 'approvals',  render: approvalsView },
  intelligence: { label: 'intelligence', render: intelligenceView },
  strategy:    { label: 'strategy',   render: strategyView },
  capabilities: { label: 'capabilities', render: capabilitiesView },
  policies:    { label: 'policies',   render: policiesView },
  projects:    { label: 'projects',   render: projectsView },
  messages:    { label: 'messages',   render: messagesView },
  jobs:        { label: 'jobs',       render: jobsView },
  artifacts:   { label: 'artifacts',  render: artifactsView },
  simulation:  { label: 'simulation', render: simulationView },
};

// ---- wiring ----------
function wire(root: HTMLElement, c: Company): void {
  const cid = c.id;
  root.querySelectorAll('[data-decide]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await postJSON(`/api/approvals/${btn.getAttribute('data-decide')}/decide`, { decision: btn.getAttribute('data-v'), by: 'founder' });
      refresh();
    });
  });

  root.querySelectorAll('[data-sim]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const kind = btn.getAttribute('data-sim');
      try {
        if (kind === 'strategy') {
          const opts = JSON.parse($<HTMLTextAreaElement>('#sim-options').value || '[]').map((o: any, i: number) => ({ id: `opt_${i}`, ...o }));
          const r = await postJSON<any>(`/api/company/${cid}/strategies`, { name: $<HTMLInputElement>('#sim-name').value, kind: 'experiment', options: opts });
          scrollTo('strategy'); alert(`strategy chose: ${r.chosen}`);
        } else if (kind === 'experiment') {
          await postJSON(`/api/company/${cid}/experiments`, {
            hypothesis: $<HTMLInputElement>('#exp-hyp').value, variant: $<HTMLInputElement>('#exp-var').value,
            metric: $<HTMLInputElement>('#exp-metric').value, baseline: Number($<HTMLInputElement>('#exp-base').value) || null,
          });
          scrollTo('strategy');
        } else if (kind === 'capability') {
          const r = await postJSON<any>(`/api/company/${cid}/capabilities/acquire`, {
            name: $<HTMLInputElement>('#cap-name').value, description: $<HTMLInputElement>('#cap-desc').value,
            cost_ceiling_usd: Number($<HTMLInputElement>('#cap-cost').value) || 10, urgency: 0.6,
          });
          const d = r.decision;
          $('#sim-result').innerHTML = `<div class="ty">decision: ${esc(d.decision)}</div>${d.decision === 'buy' ? `<div class="dim">provider ${esc(d.provider)} · est ${fmt(d.est_cost_usd)}</div>` : d.decision === 'create' ? `<div class="dim">hire role ${esc(d.agentRole)}</div>` : `<div class="dim">${esc(d.reason)}</div>`}`;
          if (d.decision === 'buy' || d.decision === 'create') refresh();
        }
      } catch (e) { alert('error: ' + (e as Error).message); }
    });
  });

  root.querySelectorAll('[data-conclude]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const eid = btn.getAttribute('data-conclude')!;
      const obs = Number($<HTMLInputElement>(`#obs-${eid}`).value || 0);
      const r = await postJSON<any>(`/api/company/${cid}/experiments/${eid}/conclude`, { observed: obs });
      alert(`experiment → ${r.status} (current ${r.current})`);
      refresh();
    });
  });

  root.querySelectorAll('[data-policy]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const r = await postJSON<any>(`/api/company/${cid}/policies/check`, { role: $<HTMLInputElement>('#pol-role').value, action: $<HTMLInputElement>('#pol-action').value });
      $('#pol-result').innerHTML = `action <b>${esc($<HTMLInputElement>('#pol-action').value)}</b> by <b>${esc($<HTMLInputElement>('#pol-role').value)}</b> → <span class="pill ${r.effect === 'allow' ? 'ok' : r.effect === 'deny' ? 'bad' : 'warn'}">${esc(r.effect)}</span> <span class="dim">${esc(r.note ?? '')}</span>`;
    });
  });

  root.querySelectorAll('[data-chip]').forEach(chip => {
    chip.addEventListener('click', () => {
      const t = chip.getAttribute('data-chip');
      root.querySelectorAll('#evt-list .event').forEach((el: Element) => el.classList.toggle('hidden', !!t && el.getAttribute('data-evt') !== t));
    });
  });
}

function scrollTo(view: string): void {
  state.view = view;
  document.querySelectorAll('#nav button').forEach(x => x.classList.toggle('active', x.getAttribute('data-view') === view));
  renderView();
}

// ---- graph ----------
const KIND_COLOR: Record<string, string> = {
  company: '#a17828', department: '#2f7f74', agent: '#d95f33', objective: '#5f7d33',
  task: '#8f8674', human: '#a05b8f', project: '#a17828', capability: '#2f7f74',
};

function renderGraph() {
  const snap = state.snap!;
  const nodes = snap.graph.nodes;
  const edges = snap.graph.edges;
  const svg = $('#graph');
  const w = 1000, h = 460, cx = w / 2, cy = h / 2;

  const byKind = new Map<string, any[]>();
  for (const n of nodes) { (byKind.get(n.kind) ?? byKind.set(n.kind, []).get(n.kind)!).push(n); }
  const order = ['company', 'department', 'agent', 'objective', 'task'];
  const pos = new Map<string, { x: number; y: number }>();
  const radii: Record<string, number> = { company: 0, department: 130, agent: 210, objective: 290, task: 350 };
  for (const kind of order) {
    const list = byKind.get(kind) ?? [];
    const r = radii[kind] ?? 320;
    list.forEach((n, i) => {
      const ang = (2 * Math.PI * i) / Math.max(list.length, 1) - Math.PI / 2;
      pos.set(n.id, { x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) });
    });
  }
  const scale = Math.min(1, 820 / (Math.max(...Array.from(pos.values()).map(p => Math.abs(p.x - cx) + 40), 420)));
  const p = (id: string) => { const q = pos.get(id)!; return { x: cx + (q.x - cx) * scale, y: cy + (q.y - cy) * scale }; };

  const edgeSvg = edges.filter(e => pos.has(e.from) && pos.has(e.to)).map(e => {
    const a = p(e.from), b = p(e.to);
    return `<line class="edge" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;
  }).join('');

  const nodeSvg = nodes.map(n => {
    const q = p(n.id);
    const color = KIND_COLOR[n.kind] ?? '#8b95a9';
    const r = n.kind === 'company' ? 26 : n.kind === 'department' ? 16 : n.kind === 'agent' ? 11 : 7;
    return `<g class="node" data-id="${esc(n.id)}" data-kind="${esc(n.kind)}">
      <circle cx="${q.x}" cy="${q.y}" r="${r}" fill="${color}" opacity=".85"/>
      <text x="${q.x + r + 5}" y="${q.y + 3}" ${q.x > cx ? '' : 'text-anchor="end" transform="translate(0,-0)"'} x2="${q.x + r + 5}">${esc(n.name.slice(0, 24))}</text>
    </g>`;
  }).join('');

  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.innerHTML = `<g class="edges">${edgeSvg}</g>${nodeSvg}`;
  $('#graph-legend').innerHTML = Object.entries(KIND_COLOR).map(([k, c]) => `<span style="display:inline-flex;align-items:center;gap:5px;margin:4px 12px 0 0;font-size:11px;color:var(--dim)"><span style="width:9px;height:9px;border-radius:50%;background:${c}"></span>${human(k)}</span>`).join('');
}

// ---- nav ----------
const NAV_META: Record<string, { ic: string; label: string }> = {
  command: { ic: '⌂', label: 'Home' },
  graph: { ic: '◉', label: 'Org Graph' },
  simulation: { ic: '✛', label: 'Simulation' },
  workforce: { ic: '✦', label: 'Workforce' },
  departments: { ic: '▦', label: 'Departments' },
  objectives: { ic: '⌖', label: 'Objectives' },
  projects: { ic: '▧', label: 'Projects' },
  events: { ic: '◌', label: 'Events' },
  decisions: { ic: '◆', label: 'Decisions' },
  approvals: { ic: '⊙', label: 'Approvals' },
  policies: { ic: '✓', label: 'Policies' },
  resources: { ic: '◈', label: 'Resources' },
  strategy: { ic: '▸', label: 'Strategy' },
  capabilities: { ic: '▤', label: 'Capabilities' },
  intelligence: { ic: '▣', label: 'Intelligence' },
  messages: { ic: '◩', label: 'Messages' },
  jobs: { ic: '▮', label: 'Jobs' },
  artifacts: { ic: '◳', label: 'Artifacts' },
};

const NAV_SECTIONS: { cat: string; items: string[] }[] = [
  { cat: '', items: ['command', 'graph', 'simulation'] },
  { cat: 'Work', items: ['workforce', 'departments', 'objectives', 'projects', 'events', 'decisions'] },
  { cat: 'Governance', items: ['approvals', 'policies', 'resources'] },
  { cat: 'Company', items: ['strategy', 'intelligence', 'capabilities', 'messages', 'jobs', 'artifacts'] },
];

function hashStr(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
function capsuleBg(name: string): string { const n = (hashStr(name) % 10) + 1; return `linear-gradient(180deg, var(--agent-${n}a), var(--agent-${n}b))`; }
function capsuleClass(status: string): string { return status === 'active' ? 'online' : status === 'paused' ? 'paused' : ''; }

const nav = $('#nav');
NAV_SECTIONS.forEach(sec => {
  const group = document.createElement('div');
  group.className = 'nav-sec';
  if (sec.cat) {
    const h = document.createElement('div');
    h.className = 'nav-cat';
    h.innerHTML = `${sec.cat}<span class="caret">▾</span>`;
    h.addEventListener('click', () => group.classList.toggle('collapsed'));
    group.appendChild(h);
  }
  sec.items.forEach(id => {
    const v = VIEWS[id];
    const meta = NAV_META[id];
    const b = document.createElement('button');
    b.className = 'nav-item';
    b.setAttribute('data-view', id);
    b.innerHTML = `<span class="ic">${meta ? meta.ic : '·'}</span><span class="tx">${meta ? meta.label : v.label}</span>`;
    if (id === 'command') b.classList.add('active');
    b.addEventListener('click', () => { state.view = id; nav.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b)); renderView(); });
    group.appendChild(b);
  });
  nav.appendChild(group);
});

function renderSidebarAgents() {
  const snap = state.snap;
  const c = currentCompany();
  if (!snap || !c) return;
  const agents = snap.agents.slice(0, 8);
  $('#side-agents-count').textContent = String(c.agents);
  $('#side-agents').innerHTML = agents.map(a => `
    <div class="agent-row" title="${esc(human(a.role))}">
      <span class="capsule ${capsuleClass(a.status)}" style="background:${capsuleBg(a.name)}"></span>
      <span class="name">${esc(human(a.name))}</span>
      <span class="role">${esc(human(a.status))}</span>
    </div>`).join('') || '<div class="empty">no agents</div>';
}

// ---- company switcher / creation (multi-tenant) ----------
$('#toggle-props').addEventListener('click', () => {
  const shell = $('#shell');
  const off = shell.classList.toggle('no-props');
  $('#toggle-props').classList.toggle('off', off);
});

$('#company-select').addEventListener('change', (e) => {
  state.cid = (e.target as HTMLSelectElement).value;
  localStorage.setItem('pluto.cid', state.cid);
  refresh();
});

$('#new-company').addEventListener('click', () => {
  const card = document.createElement('div');
  card.className = 'modal';
  card.innerHTML = `<div class="card">
    <h3>New Company</h3>
    <input id="nc-name" class="w100" placeholder="name (e.g. Atlas Digital)"/>
    <input id="nc-mission" class="w100" placeholder="mission (e.g. Build 20 paying website clients)"/>
    <div style="margin-top:10px;display:flex;gap:8px">
      <button class="chip accent" id="nc-ok" style="flex:1">create</button>
      <button class="chip" id="nc-cancel" style="flex:1">cancel</button>
    </div>
  </div>`;
  document.body.appendChild(card);
  const close = () => card.remove();
  card.querySelector('#nc-cancel')!.addEventListener('click', close);
  card.querySelector('#nc-ok')!.addEventListener('click', async () => {
    const name = $<HTMLInputElement>('#nc-name').value.trim();
    const mission = $<HTMLInputElement>('#nc-mission').value.trim();
    if (!name || !mission) return;
    const c = await postJSON<any>('/api/companies', { name, mission });
    state.cid = c.id; localStorage.setItem('pluto.cid', c.id);
    close(); refresh();
  });
});

// ---- task command bar (Ctrl/Cmd+K) ----------
const TASK_KINDS = ['research', 'outreach', 'qualify', 'propose', 'deliver', 'design', 'qa', 'task'];

async function submitTask(summary: string, agentId: string | null, objectiveId: string | null, kind: string): Promise<string> {
  const c = currentCompany();
  if (!c) throw new Error('no company');
  const r = await postJSON<any>(`/api/company/${c.id}/tasks`, { summary, agent_id: agentId, objective_id: objectiveId, kind });
  const p = r.policy;
  const note = p?.effect === 'deny' ? `blocked (${p.note ?? 'policy'})` : p?.effect === 'require_approval' ? 'sent for approval → Approvals view' : 'queued & running';
  return `task ${r.task_id ?? '?'} → ${r.status ?? '?'} · ${note}`;
}

function populateTaskForm() {
  const snap = state.snap;
  if (!snap) return;
  const sel = $<HTMLSelectElement>('#cmd-agent');
  const agents = snap.agents.filter(a => a.id);
  sel.innerHTML = '<option value="">auto-assign (match by text)</option>' + agents.map(a => `<option value="${esc(a.id)}">${esc(human(a.name))} — ${esc(human(a.role))}</option>`).join('');
  const oSel = $<HTMLSelectElement>('#cmd-objective');
  oSel.innerHTML = '<option value="">auto (agent objective)</option>' + snap.objectives.map(o => `<option value="${esc(o.id)}">${esc(String(o.title ?? '').slice(0, 70))}</option>`).join('');
  const kSel = $<HTMLSelectElement>('#cmd-kind');
  kSel.innerHTML = TASK_KINDS.map(k => `<option value="${esc(k)}">${esc(human(k))}</option>`).join('');
}

function openTaskCmd() {
  populateTaskForm();
  const box = $('#cmdbar');
  box.classList.remove('hidden');
  $('#cmd-result').textContent = '';
  $<HTMLInputElement>('#cmd-summary').value = '';
  setTimeout(() => $<HTMLInputElement>('#cmd-summary').focus(), 30);
}
function closeTaskCmd() { $('#cmdbar').classList.add('hidden'); }

async function runFromCmd() {
  const summary = $<HTMLInputElement>('#cmd-summary').value.trim();
  if (!summary) { $('#cmd-result').textContent = 'describe the task first'; return; }
  const agentId = $<HTMLSelectElement>('#cmd-agent').value || null;
  const objId = $<HTMLSelectElement>('#cmd-objective').value || null;
  const kind = $<HTMLSelectElement>('#cmd-kind').value || 'task';
  const res = $('#cmd-result');
  res.textContent = 'submitting…';
  try {
    res.textContent = await submitTask(summary, agentId, objId, kind);
    closeTaskCmd();
    refresh();
  } catch (e) { res.textContent = `error: ${(e as Error).message}`; }
}

$('#new-task').addEventListener('click', openTaskCmd);
$('#cmd-ok').addEventListener('click', runFromCmd);
$('#cmd-cancel').addEventListener('click', closeTaskCmd);
$<HTMLInputElement>('#cmd-summary').addEventListener('keydown', e => { if (e.key === 'Enter') runFromCmd(); });

// ---- company chat (plain-English → real task) ----------
const CHAT_MATCHERS: Array<[RegExp, string]> = [
  [/research|market|competitor|intel|recon|prospect|icp/i, 'market_researcher'],
  [/sales|lead|outreach|proposal|client|deal|pipeline/i, 'sales_manager'],
  [/content|seo|growth|social|post|blog|marketing/i, 'growth_lead'],
  [/build|deliver|design|website|site|code|qa|landing|launch/i, 'delivery_manager'],
  [/invoice|finance|budget|pay|cost/i, 'finance_agent'],
];
function matchAgent(text: string) {
  const snap = state.snap;
  if (!snap) return null;
  for (const [re, role] of CHAT_MATCHERS) {
    if (re.test(text)) { const a = snap.agents.find(x => x.role === role); if (a) return a; }
  }
  return snap.agents.find(a => a.status === 'active') ?? snap.agents[0] ?? null;
}
function inferKind(text: string): string {
  if (/research|market|competitor|intel|recon|prospect/i.test(text)) return 'research';
  if (/sales|lead|outreach|proposal/i.test(text)) return 'outreach';
  if (/design|landing/i.test(text)) return 'design';
  if (/build|deliver|website|code|qa|launch/i.test(text)) return 'deliver';
  return 'task';
}

const chatState = { msgs: [] as Array<{ who: 'u' | 'c'; text: string; ok?: boolean }> };
function chatRender() {
  const body = $('#chat-body');
  body.innerHTML = chatState.msgs.map(m => `<div class="msg ${m.who === 'u' ? 'u' : 'c'} ${m.ok ? 'ok' : ''}">${esc(m.text)}</div>`).join('');
  body.scrollTop = 99999;
}
async function chatSend() {
  const input = $<HTMLInputElement>('#chat-text');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  chatState.msgs.push({ who: 'u', text });
  chatRender();
  const snap = state.snap;
  const agent = matchAgent(text);
  const aName = agent ? human(agent.name) : '— (auto)';
  chatState.msgs.push({ who: 'c', text: `assigning to ${aName}…` });
  chatRender();
  try {
    const obj = agent && snap ? snap.objectives.find(o => o.department_id === agent.department_id) ?? null : null;
    const res = await submitTask(text, agent ? agent.id : null, obj ? obj.id : null, inferKind(text));
    chatState.msgs.push({ who: 'c', text: res, ok: true });
  } catch (e) {
    chatState.msgs.push({ who: 'c', text: `error: ${(e as Error).message}` });
  }
  chatRender();
  refresh();
}

function toggleChat(open?: boolean) {
  const chat = $('#chat');
  const on = open ?? chat.classList.contains('closed');
  chat.classList.toggle('closed', !on);
  $('#toggle-chat').classList.toggle('on', on);
  if (on) $<HTMLInputElement>('#chat-text').focus();
}
$('#toggle-chat').addEventListener('click', () => toggleChat());
$('#chat-close').addEventListener('click', () => toggleChat(false));
$('#chat-send').addEventListener('click', chatSend);
$<HTMLInputElement>('#chat-text').addEventListener('keydown', e => { if (e.key === 'Enter') chatSend(); });

document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openTaskCmd(); }
  if (e.key === 'Escape') { closeTaskCmd(); toggleChat(false); }
});

// ---- SSE live updates ----------
function connectSSE() {
  const es = new EventSource('/api/events/stream');
  es.onmessage = () => { $('#live').classList.add('on'); refresh(); };
  es.onerror = () => { $('#live').classList.remove('on'); setTimeout(connectSSE, 3000); };
}

refresh();
connectSSE();
setInterval(refresh, 15000);