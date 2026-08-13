export function getDashboardHTML(apiBase = 'http://localhost:3000'): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PLUTO</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;background:#0a0a0a;color:#e0e0e0;display:flex;height:100vh;overflow:hidden}
#sidebar{width:180px;background:#111;padding:16px 0;flex-shrink:0;display:flex;flex-direction:column}
#sidebar h1{color:#00ff88;font-size:22px;font-weight:800;padding:0 16px 24px}
nav a{display:block;padding:10px 16px;color:#aaa;text-decoration:none;font-size:14px;cursor:pointer;transition:color .15s,background .15s}
nav a:hover,nav a.active{color:#00ff88;background:#1a1a1a}
#main{flex:1;overflow-y:auto;padding:24px}
#status{font-size:12px;color:#555;margin-bottom:12px}
h2{color:#00ff88;font-size:18px;font-weight:700;margin-bottom:16px}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;padding:8px 10px;color:#666;border-bottom:1px solid #222;font-weight:500}
td{padding:8px 10px;border-bottom:1px solid #1a1a1a;color:#ccc}
tr:hover td{background:#111}
.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;text-transform:uppercase}
.badge-green{background:#00ff8820;color:#00ff88}
.badge-yellow{background:#ffaa0020;color:#ffaa00}
.badge-red{background:#ff444420;color:#ff4444}
.badge-gray{background:#33333380;color:#888}
.stat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:24px}
.stat{background:#111;border:1px solid #1e1e1e;border-radius:8px;padding:16px}
.stat-val{font-size:28px;font-weight:700;color:#00ff88}
.stat-label{font-size:12px;color:#555;margin-top:4px}
.event-log{font-size:12px;font-family:monospace;background:#111;border:1px solid #1a1a1a;border-radius:6px;padding:12px;max-height:500px;overflow-y:auto}
.event-row{padding:4px 0;border-bottom:1px solid #1a1a1a;color:#aaa}
.event-row span{color:#00ff88}
.placeholder{color:#444;font-style:italic;padding:40px 0;text-align:center}
.err{color:#ff4444;font-size:13px;padding:16px 0}
</style>
</head>
<body>
<div id="sidebar">
  <h1>PLUTO</h1>
  <nav>
    <a class="active" data-page="overview">Overview</a>
    <a data-page="companies">Companies</a>
    <a data-page="tasks">Tasks</a>
    <a data-page="agents">Agents</a>
    <a data-page="events">Events</a>
    <a data-page="memory">Memory</a>
    <a data-page="economy">Economy</a>
  </nav>
</div>
<div id="main">
  <div id="status">Auto-refresh every 30s</div>
  <div id="content"></div>
</div>
<script>
const API = ${JSON.stringify(apiBase)};
let current = 'overview';

async function api(path) {
  try {
    const r = await fetch(API + path);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  } catch(e) { return null; }
}

function badge(status) {
  const s = String(status||'').toLowerCase();
  const cls = s==='succeeded'||s==='active'||s==='ok'?'badge-green':s==='failed'||s==='error'?'badge-red':s==='running'||s==='pending'?'badge-yellow':'badge-gray';
  return '<span class="badge '+cls+'">'+status+'</span>';
}

async function renderOverview() {
  const companies = await api('/companies') || [];
  const allTasks = (await Promise.all(companies.map(c => api('/companies/'+c.id+'/tasks').then(r=>r||[])))).flat();
  const allAgents = (await Promise.all(companies.map(c => api('/companies/'+c.id+'/agents').then(r=>r||[])))).flat();
  const allEvents = (await Promise.all(companies.map(c => api('/companies/'+c.id+'/events').then(r=>r||[])))).flat();
  const pending = allTasks.filter(t=>t.status==='PENDING').length;
  return \`<h2>Overview</h2>
<div class="stat-grid">
  <div class="stat"><div class="stat-val">\${companies.length}</div><div class="stat-label">Companies</div></div>
  <div class="stat"><div class="stat-val">\${allTasks.length}</div><div class="stat-label">Total Tasks</div></div>
  <div class="stat"><div class="stat-val">\${allAgents.length}</div><div class="stat-label">Agents</div></div>
  <div class="stat"><div class="stat-val">\${allEvents.length}</div><div class="stat-label">Events</div></div>
  <div class="stat"><div class="stat-val">\${pending}</div><div class="stat-label">Pending</div></div>
</div>\`;
}

async function renderCompanies() {
  const cs = await api('/companies') || [];
  if (!cs.length) return '<h2>Companies</h2><div class="placeholder">No companies yet</div>';
  return '<h2>Companies</h2><table><thead><tr><th>ID</th><th>Name</th><th>Mission</th><th>Status</th></tr></thead><tbody>'
    + cs.map(c=>\`<tr><td style="color:#555;font-size:11px">\${c.id.slice(0,8)}…</td><td>\${c.name}</td><td style="color:#777">\${(c.mission||'').slice(0,60)}</td><td>\${badge(c.status||'active')}</td></tr>\`).join('')
    + '</tbody></table>';
}

async function renderTasks() {
  const cs = await api('/companies') || [];
  const rows = (await Promise.all(cs.map(c => api('/companies/'+c.id+'/tasks').then(r=>(r||[]).map(t=>({...t,_co:c.name})))))).flat();
  if (!rows.length) return '<h2>Tasks</h2><div class="placeholder">No tasks yet</div>';
  return '<h2>Tasks</h2><table><thead><tr><th>ID</th><th>Title</th><th>Status</th><th>Kind</th><th>Company</th></tr></thead><tbody>'
    + rows.map(t=>\`<tr><td style="color:#555;font-size:11px">\${t.id.slice(0,8)}…</td><td>\${t.title||t.kind||''}</td><td>\${badge(t.status)}</td><td style="color:#666">\${t.kind||''}</td><td style="color:#555">\${t._co}</td></tr>\`).join('')
    + '</tbody></table>';
}

async function renderAgents() {
  const cs = await api('/companies') || [];
  const rows = (await Promise.all(cs.map(c => api('/companies/'+c.id+'/agents').then(r=>(r||[]).map(a=>({...a,_co:c.name})))))).flat();
  if (!rows.length) return '<h2>Agents</h2><div class="placeholder">No agents yet</div>';
  return '<h2>Agents</h2><table><thead><tr><th>ID</th><th>Name</th><th>Role</th><th>Status</th><th>Company</th></tr></thead><tbody>'
    + rows.map(a=>\`<tr><td style="color:#555;font-size:11px">\${a.id.slice(0,8)}…</td><td>\${a.name||''}</td><td style="color:#888">\${a.role||''}</td><td>\${badge(a.status||'active')}</td><td style="color:#555">\${a._co}</td></tr>\`).join('')
    + '</tbody></table>';
}

async function renderEvents() {
  const cs = await api('/companies') || [];
  const rows = (await Promise.all(cs.map(c => api('/companies/'+c.id+'/events').then(r=>r||[])))).flat()
    .sort((a,b)=>new Date(b.created_at||0).getTime()-new Date(a.created_at||0).getTime()).slice(0,200);
  if (!rows.length) return '<h2>Events</h2><div class="placeholder">No events yet</div>';
  return '<h2>Events</h2><div class="event-log">'
    + rows.map(e=>\`<div class="event-row"><span>\${e.kind||''}</span> — \${(e.payload ? JSON.stringify(e.payload).slice(0,80) : '')} <span style="color:#333;float:right">\${(e.created_at||'').slice(11,19)}</span></div>\`).join('')
    + '</div>';
}

function renderMemory() {
  return '<h2>Memory</h2><div class="placeholder">Memory search coming soon</div>';
}

async function renderEconomy() {
  const cs = await api('/companies') || [];
  const rows = (await Promise.all(cs.map(async c => {
    const eco = await api('/companies/'+c.id+'/economy');
    return eco ? { ...eco, _co: c.name } : null;
  }))).filter(Boolean);
  if (!rows.length) return '<h2>Economy</h2><div class="placeholder">No economy data yet</div>';
  return '<h2>Economy</h2><table><thead><tr><th>Company</th><th>Budget</th><th>Spent</th><th>Balance</th></tr></thead><tbody>'
    + rows.map(e=>\`<tr><td>\${e._co}</td><td>$\${(e.budget||0).toLocaleString()}</td><td>$\${(e.spend||0).toLocaleString()}</td><td style="color:#00ff88">$\${((e.budget||0)-(e.spend||0)).toLocaleString()}</td></tr>\`).join('')
    + '</tbody></table>';
}

const pages = { overview:renderOverview, companies:renderCompanies, tasks:renderTasks, agents:renderAgents, events:renderEvents, memory:()=>Promise.resolve(renderMemory()), economy:renderEconomy };

async function render() {
  document.getElementById('status').textContent = 'Loading…';
  try {
    document.getElementById('content').innerHTML = await pages[current]();
    document.getElementById('status').textContent = 'Last updated: ' + new Date().toLocaleTimeString() + ' · Auto-refresh every 30s';
  } catch(e) {
    document.getElementById('content').innerHTML = '<div class="err">Error: ' + e.message + '</div>';
    document.getElementById('status').textContent = 'Error';
  }
}

document.querySelectorAll('nav a').forEach(a => {
  a.addEventListener('click', () => {
    document.querySelectorAll('nav a').forEach(x => x.classList.remove('active'));
    a.classList.add('active');
    current = a.dataset.page;
    render();
  });
});

render();
setInterval(render, 30_000);
</script>
</body>
</html>`;
}
