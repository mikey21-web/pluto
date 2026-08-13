export function getDashboardHTML(_apiBase = ''): string {
  // apiBase unused — dashboard uses relative URLs
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PLUTO — Sovereign Command Center</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;background:#080810;color:#e0e0e0;display:flex;flex-direction:column;height:100vh;overflow:hidden}
#topbar{display:flex;align-items:center;gap:12px;padding:0 20px;height:48px;background:#0d0d1a;border-bottom:1px solid #1a1a30;flex-shrink:0}
#logo{color:#00ff88;font-size:20px;font-weight:900;letter-spacing:2px;margin-right:auto}
.co-tab{padding:4px 12px;border-radius:4px;background:#141428;border:1px solid #252545;color:#aaa;cursor:pointer;font-size:12px;transition:all .15s}
.co-tab.active{background:#00ff8820;border-color:#00ff88;color:#00ff88}
#btn-new-co{padding:4px 10px;border-radius:4px;background:transparent;border:1px dashed #444;color:#666;cursor:pointer;font-size:12px}
#btn-new-co:hover{border-color:#00ff88;color:#00ff88}
#online-dot{width:8px;height:8px;border-radius:50%;background:#00ff88;box-shadow:0 0 6px #00ff88;flex-shrink:0}
#online-label{color:#00ff88;font-size:11px}
#body{display:flex;flex:1;overflow:hidden}
/* LEFT SIDEBAR */
#left{width:220px;background:#0d0d1a;border-right:1px solid #1a1a30;display:flex;flex-direction:column;flex-shrink:0}
#left-header{padding:14px 16px 10px;color:#555;font-size:10px;letter-spacing:2px;text-transform:uppercase;border-bottom:1px solid #141428}
#company-list{flex:1;overflow-y:auto;padding:8px}
.co-card{padding:10px 12px;border-radius:6px;border:1px solid transparent;cursor:pointer;margin-bottom:6px;transition:all .15s}
.co-card:hover{background:#141428;border-color:#252545}
.co-card.active{background:#001a0d;border-color:#00ff8840}
.co-name{font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px}
.co-mission{font-size:11px;color:#555;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sdot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.sdot-green{background:#00ff88}
.sdot-red{background:#ff4444}
.sdot-grey{background:#444}
#spawn-btn{margin:12px;padding:10px;border-radius:6px;background:transparent;border:1px dashed #333;color:#555;cursor:pointer;font-size:12px;text-align:center;transition:all .15s}
#spawn-btn:hover{border-color:#00ff88;color:#00ff88}
/* CENTER CANVAS */
#canvas{flex:1;overflow:auto;position:relative;padding:24px}
#welcome{display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:12px;color:#333}
#welcome .big{font-size:48px}
#welcome p{font-size:14px;color:#444}
.org-wrap{min-width:500px}
.csuite-row{display:flex;gap:24px;justify-content:center;margin-bottom:32px}
.agent-box{background:#141428;border:1px solid #252545;border-radius:10px;padding:14px 18px;min-width:120px;text-align:center;cursor:pointer;transition:all .15s;position:relative}
.agent-box:hover{border-color:#00ff88;background:#001a0d}
.agent-box .role-label{font-size:10px;color:#555;text-transform:uppercase;letter-spacing:1px}
.agent-box .agent-name{font-size:13px;font-weight:700;margin:4px 0;color:#e0e0e0}
.agent-box .adot{width:8px;height:8px;border-radius:50%;margin:0 auto}
.dept-row{display:flex;gap:32px;justify-content:center}
.dept-col{display:flex;flex-direction:column;align-items:center;gap:8px}
.dept-label{font-size:10px;color:#444;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}
.dept-agents{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;max-width:160px}
.apx{width:34px;height:34px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;cursor:pointer;transition:all .15s;border:1px solid transparent}
.apx:hover{border-color:#fff2;transform:scale(1.1)}
.apx-active{background:#00ff88;color:#000}
.apx-idle{background:#252545;color:#888}
.apx-failed{background:#ff4444;color:#fff}
/* connector lines */
.connector{stroke:#252545;stroke-width:1.5;fill:none}
/* RIGHT SIDEBAR */
#right{width:260px;background:#0d0d1a;border-left:1px solid #1a1a30;display:flex;flex-direction:column;flex-shrink:0}
#right-header{padding:14px 16px 10px;color:#555;font-size:10px;letter-spacing:2px;text-transform:uppercase;border-bottom:1px solid #141428;display:flex;align-items:center;justify-content:space-between}
#feed{flex:1;overflow-y:auto;padding:8px}
.ev-item{padding:7px 8px;border-radius:4px;margin-bottom:4px;display:flex;align-items:flex-start;gap:8px;font-size:12px}
.ev-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:4px}
.ev-blue{background:#4488ff}
.ev-yellow{background:#ffaa00}
.ev-green{background:#00ff88}
.ev-purple{background:#aa44ff}
.ev-grey{background:#555}
.ev-text{color:#aaa;flex:1;word-break:break-word}
.ev-time{color:#444;font-size:10px;white-space:nowrap}
/* AGENT DETAIL PANEL */
#detail-panel{position:fixed;top:48px;right:260px;width:300px;bottom:60px;background:#0d0d1a;border-left:1px solid #252545;border-bottom:1px solid #252545;transform:translateX(100%);transition:transform .2s;z-index:20;display:flex;flex-direction:column}
#detail-panel.open{transform:translateX(0)}
#detail-header{padding:14px 16px;border-bottom:1px solid #1a1a30;display:flex;justify-content:space-between;align-items:center}
#detail-header h3{font-size:14px;color:#e0e0e0}
#detail-close{cursor:pointer;color:#555;font-size:18px;line-height:1}
#detail-body{flex:1;overflow-y:auto;padding:14px;font-size:13px}
.detail-row{margin-bottom:10px}
.detail-row label{color:#555;font-size:10px;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:2px}
.detail-row .val{color:#e0e0e0}
#assign-form{padding:12px 14px;border-top:1px solid #1a1a30;display:flex;gap:6px}
#assign-form input{flex:1;background:#141428;border:1px solid #252545;border-radius:4px;color:#e0e0e0;padding:6px 8px;font-size:12px;outline:none}
#assign-form button{padding:6px 10px;background:#00ff8820;border:1px solid #00ff8840;color:#00ff88;border-radius:4px;cursor:pointer;font-size:12px}
/* MODAL */
#modal-overlay{display:none;position:fixed;inset:0;background:#00000099;z-index:50;align-items:center;justify-content:center}
#modal-overlay.open{display:flex}
#modal{background:#0d0d1a;border:1px solid #252545;border-radius:12px;padding:28px;width:380px}
#modal h3{color:#00ff88;font-size:16px;margin-bottom:20px}
.mrow{margin-bottom:14px}
.mrow label{display:block;font-size:11px;color:#555;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px}
.mrow input,.mrow textarea{width:100%;background:#141428;border:1px solid #252545;border-radius:6px;color:#e0e0e0;padding:8px 10px;font-size:13px;outline:none;resize:vertical}
.mrow input:focus,.mrow textarea:focus{border-color:#00ff8860}
.modal-btns{display:flex;gap:8px;justify-content:flex-end;margin-top:20px}
.btn-cancel{padding:8px 16px;background:transparent;border:1px solid #333;color:#777;border-radius:6px;cursor:pointer;font-size:13px}
.btn-submit{padding:8px 16px;background:#00ff8820;border:1px solid #00ff8840;color:#00ff88;border-radius:6px;cursor:pointer;font-size:13px}
/* CHAT */
#chat-bar{height:60px;background:#0d0d1a;border-top:1px solid #1a1a30;display:flex;align-items:center;padding:0 16px;gap:10px;flex-shrink:0;position:relative}
#chat-input{flex:1;background:#141428;border:1px solid #252545;border-radius:6px;color:#e0e0e0;padding:8px 12px;font-size:13px;outline:none}
#chat-input:focus{border-color:#00ff8860}
#chat-send{padding:8px 14px;background:#00ff8820;border:1px solid #00ff8840;color:#00ff88;border-radius:6px;cursor:pointer;font-size:13px}
#chat-overlay{position:fixed;bottom:60px;left:220px;right:260px;max-height:320px;padding:12px 16px;background:#080810ee;backdrop-filter:blur(6px);border-top:1px solid #1a1a30;overflow-y:auto;display:none;flex-direction:column;gap:8px}
#chat-overlay.open{display:flex}
.msg-user{align-self:flex-end;background:#1a2a1a;border:1px solid #2a4a2a;border-radius:8px 8px 2px 8px;padding:8px 12px;max-width:70%;font-size:13px}
.msg-pluto{align-self:flex-start;background:#0a1a2a;border:1px solid #1a2a3a;border-radius:8px 8px 8px 2px;padding:8px 12px;max-width:80%;font-size:13px}
.msg-pluto .from{color:#00ff88;font-size:10px;font-weight:700;letter-spacing:1px;margin-bottom:4px}
.msg-delegate{align-self:flex-start;background:#0d0d1a;border:1px solid #1a1a30;border-radius:6px;padding:6px 10px;max-width:80%;font-size:12px;margin-left:20px}
.msg-delegate .from{color:#666;font-size:10px;letter-spacing:1px;margin-bottom:2px}
</style>
</head>
<body>
<!-- TOP BAR -->
<div id="topbar">
  <div id="logo">⬡ PLUTO</div>
  <div id="co-tabs"></div>
  <button id="btn-new-co" onclick="openModal()">+ New</button>
  <div id="online-dot"></div>
  <span id="online-label">Online</span>
</div>
<!-- BODY -->
<div id="body">
  <!-- LEFT -->
  <div id="left">
    <div id="left-header">Companies</div>
    <div id="company-list"></div>
    <button id="spawn-btn" onclick="openModal()">+ Spawn Company</button>
  </div>
  <!-- CANVAS -->
  <div id="canvas">
    <div id="welcome">
      <div class="big">⬡</div>
      <p>Select a company or spawn one to begin</p>
    </div>
    <div id="org-canvas" style="display:none"></div>
  </div>
  <!-- RIGHT -->
  <div id="right">
    <div id="right-header">
      <span>Activity</span>
      <span id="feed-count" style="color:#333;font-size:10px"></span>
    </div>
    <div id="feed"></div>
  </div>
</div>
<!-- DETAIL PANEL -->
<div id="detail-panel">
  <div id="detail-header">
    <h3 id="detail-title">Agent Detail</h3>
    <span id="detail-close" onclick="closeDetail()">✕</span>
  </div>
  <div id="detail-body"></div>
  <div id="assign-form">
    <input id="assign-input" placeholder="Assign a task…">
    <button onclick="assignTask()">→</button>
  </div>
</div>
<!-- SPAWN MODAL -->
<div id="modal-overlay">
  <div id="modal">
    <h3>Spawn Company</h3>
    <div class="mrow"><label>Company Name</label><input id="co-name" placeholder="e.g. Pluto HQ"></div>
    <div class="mrow"><label>Mission</label><textarea id="co-mission" rows="3" placeholder="e.g. Build the world's first autonomous company OS"></textarea></div>
    <div class="modal-btns">
      <button class="btn-cancel" onclick="closeModal()">Cancel</button>
      <button class="btn-submit" onclick="spawnCompany()">Spawn</button>
    </div>
  </div>
</div>
<!-- CHAT -->
<div id="chat-overlay"></div>
<div id="chat-bar">
  <input id="chat-input" placeholder="Message Pluto…" onkeydown="if(event.key==='Enter')sendChat()">
  <button id="chat-send" onclick="sendChat()">Send ⚡</button>
</div>

<script>
let selectedCompany = null;
let selectedAgent = null;
let allCompanies = [];
let chatMessages = [];

// ---- API -------------------------------------------------------------------
async function api(method, path, body) {
  try {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(path, opts);
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

// ---- COMPANIES -------------------------------------------------------------
async function loadCompanies() {
  const cs = await api('GET', '/companies') || [];
  allCompanies = cs;
  renderCoTabs(cs);
  renderCoList(cs);
}

function renderCoTabs(cs) {
  const el = document.getElementById('co-tabs');
  el.innerHTML = cs.map(c =>
    \`<button class="co-tab\${selectedCompany?.id===c.id?' active':''}" onclick="selectCompany('\${c.id}')">\${c.name}</button>\`
  ).join('');
}

function renderCoList(cs) {
  const el = document.getElementById('company-list');
  if (!cs.length) { el.innerHTML = '<div style="padding:16px;color:#444;font-size:12px">No companies yet</div>'; return; }
  el.innerHTML = cs.map(c => \`
    <div class="co-card\${selectedCompany?.id===c.id?' active':''}" onclick="selectCompany('\${c.id}')">
      <div class="co-name">
        <div class="sdot \${c.status==='halted'?'sdot-red':c.status==='readonly'?'sdot-grey':'sdot-green'}"></div>
        \${c.name}
      </div>
      <div class="co-mission">\${c.mission||''}</div>
    </div>\`).join('');
}

async function selectCompany(id) {
  selectedCompany = allCompanies.find(c => c.id === id) || { id };
  renderCoTabs(allCompanies);
  renderCoList(allCompanies);
  await loadOrg(id);
}

// ---- ORG CANVAS ------------------------------------------------------------
async function loadOrg(companyId) {
  document.getElementById('welcome').style.display = 'none';
  document.getElementById('org-canvas').style.display = '';
  const agents = await api('GET', '/agents/' + companyId) || [];
  renderOrg(agents);
}

function renderOrg(agents) {
  const CSUITE = ['CEO','COO','CFO'];
  const csuite = CSUITE.map(r => agents.find(a => a.role === r) || { id: null, name: r, role: r, status: 'idle' });
  const rest = agents.filter(a => !CSUITE.includes(a.role));

  // Group rest by dept prefix (first 2 chars or full role)
  const depts = {};
  for (const a of rest) {
    const dept = a.role?.slice(0,3).toUpperCase() || 'OTH';
    (depts[dept] = depts[dept] || []).push(a);
  }

  // Under which C-suite? naive: COO gets Ops/Eng, CFO gets Fin, CEO gets rest
  const csuiteOrder = ['CEO','COO','CFO'];
  const deptMap = { CEO: [], COO: [], CFO: [] };
  for (const [dept, das] of Object.entries(depts)) {
    const fin = ['FIN','ACC','BUD'].includes(dept);
    const ops = ['ENG','OPS','MKT','SAL','HR','DEV','TEC','PRO'].includes(dept);
    if (fin) deptMap.CFO.push({ dept, das });
    else if (ops) deptMap.COO.push({ dept, das });
    else deptMap.CEO.push({ dept, das });
  }

  function statusColor(s) {
    const st = (s||'').toLowerCase();
    return st === 'active' || st === 'working' ? '#00ff88' : st === 'failed' || st === 'error' ? '#ff4444' : '#252545';
  }
  function agentDotClass(s) {
    const st = (s||'').toLowerCase();
    return st === 'active' || st === 'working' ? 'apx-active' : st === 'failed' || st === 'error' ? 'apx-failed' : 'apx-idle';
  }
  function dotStyle(s) {
    return 'background:' + statusColor(s);
  }

  const csuiteHTML = csuite.map(a => \`
    <div class="agent-box" onclick="openDetail(\${JSON.stringify(JSON.stringify(a))})">
      <div class="role-label">\${a.role}</div>
      <div class="agent-name">\${a.name||a.role}</div>
      <div class="adot" style="\${dotStyle(a.status)}"></div>
    </div>\`).join('');

  const deptsHTML = csuiteOrder.map((r, i) => {
    const myDepts = deptMap[r];
    if (!myDepts.length) return \`<div class="dept-col"><div class="dept-label" style="color:#1a1a30">—</div></div>\`;
    const agentPixels = myDepts.flatMap(({ dept, das }) =>
      das.map(a => \`<div class="apx \${agentDotClass(a.status)}" title="\${a.role}: \${a.name||''}" onclick="openDetail('\${JSON.stringify(a).replace(/'/g,"&#39;")}')">\${(a.role||'?').slice(0,2).toUpperCase()}</div>\`)
    ).join('');
    return \`<div class="dept-col">
      <div class="dept-label">dept</div>
      <div class="dept-agents">\${agentPixels}</div>
    </div>\`;
  }).join('');

  document.getElementById('org-canvas').innerHTML = \`
    <div class="org-wrap">
      <div class="csuite-row">\${csuiteHTML}</div>
      \${rest.length ? \`<div class="dept-row">\${deptsHTML}</div>\` : '<div style="text-align:center;color:#333;font-size:13px;margin-top:20px">No department agents yet</div>'}
    </div>\`;
}

// ---- AGENT DETAIL ----------------------------------------------------------
function openDetail(agentJSON) {
  const a = typeof agentJSON === 'string' ? JSON.parse(agentJSON) : agentJSON;
  selectedAgent = a;
  document.getElementById('detail-title').textContent = a.name || a.role;
  document.getElementById('detail-body').innerHTML = \`
    <div class="detail-row"><label>Role</label><div class="val">\${a.role||'—'}</div></div>
    <div class="detail-row"><label>Status</label><div class="val">\${a.status||'idle'}</div></div>
    <div class="detail-row"><label>Current Task</label><div class="val">\${a.currentTask||'None'}</div></div>
    <div class="detail-row"><label>ID</label><div class="val" style="color:#444;font-size:11px;font-family:monospace">\${a.id||'—'}</div></div>
  \`;
  document.getElementById('detail-panel').classList.add('open');
}

function closeDetail() {
  document.getElementById('detail-panel').classList.remove('open');
  selectedAgent = null;
}

async function assignTask() {
  const task = document.getElementById('assign-input').value.trim();
  if (!task || !selectedAgent || !selectedCompany) return;
  await api('POST', '/companies/' + selectedCompany.id + '/tasks', { description: task });
  document.getElementById('assign-input').value = '';
  closeDetail();
}

// ---- EVENTS FEED -----------------------------------------------------------
function evColor(type) {
  if (!type) return 'ev-grey';
  if (type.startsWith('company')) return 'ev-blue';
  if (type.startsWith('task')) return 'ev-yellow';
  if (type.startsWith('agent')) return 'ev-green';
  if (type.startsWith('sovereign')) return 'ev-purple';
  return 'ev-grey';
}

function relTime(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return Math.floor(diff/1000) + 's ago';
  if (diff < 3600000) return Math.floor(diff/60000) + 'm ago';
  return Math.floor(diff/3600000) + 'h ago';
}

async function loadFeed() {
  const events = await api('GET', '/events') || [];
  const el = document.getElementById('feed');
  document.getElementById('feed-count').textContent = events.length + ' events';
  if (!events.length) { el.innerHTML = '<div style="padding:12px;color:#333;font-size:12px">No events yet</div>'; return; }
  el.innerHTML = events.slice(0,50).map(e => \`
    <div class="ev-item">
      <div class="ev-dot \${evColor(e.type||e.kind)}"></div>
      <div style="flex:1">
        <div class="ev-text">\${e.type||e.kind||'event'}</div>
        <div class="ev-time">\${relTime(e.ts||e.created_at)}</div>
      </div>
    </div>\`).join('');
}

// ---- MODAL -----------------------------------------------------------------
function openModal() { document.getElementById('modal-overlay').classList.add('open'); }
function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.getElementById('co-name').value = '';
  document.getElementById('co-mission').value = '';
}

async function spawnCompany() {
  const name = document.getElementById('co-name').value.trim();
  const mission = document.getElementById('co-mission').value.trim();
  if (!name || !mission) return;
  const c = await api('POST', '/companies', { name, mission });
  if (c) {
    closeModal();
    await loadCompanies();
    selectCompany(c.id);
  }
}

// ---- CHAT ------------------------------------------------------------------
function renderChat() {
  const el = document.getElementById('chat-overlay');
  if (!chatMessages.length) { el.classList.remove('open'); return; }
  el.classList.add('open');
  el.innerHTML = chatMessages.slice(-10).map(m => {
    if (m.role === 'user') return \`<div class="msg-user">\${m.text}</div>\`;
    const dels = (m.delegations||[]).map(d =>
      \`<div class="msg-delegate"><div class="from">\${d.role}</div>\${d.message}</div>\`).join('');
    return \`<div class="msg-pluto"><div class="from">PLUTO</div>\${m.text}</div>\${dels}\`;
  }).join('');
  el.scrollTop = el.scrollHeight;
}

async function sendChat() {
  const input = document.getElementById('chat-input');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  chatMessages.push({ role: 'user', text: msg });
  renderChat();
  const res = await api('POST', '/chat', { message: msg, companyId: selectedCompany?.id });
  if (res) {
    chatMessages.push({ role: 'pluto', text: res.reply, delegations: res.delegations });
    renderChat();
  }
}

// ---- HEALTH ----------------------------------------------------------------
async function checkHealth() {
  const h = await api('GET', '/health');
  const dot = document.getElementById('online-dot');
  const label = document.getElementById('online-label');
  if (h?.ok) {
    dot.style.background = '#00ff88';
    dot.style.boxShadow = '0 0 6px #00ff88';
    label.style.color = '#00ff88';
    label.textContent = 'Online';
  } else {
    dot.style.background = '#ff4444';
    dot.style.boxShadow = '0 0 6px #ff4444';
    label.style.color = '#ff4444';
    label.textContent = 'Offline';
  }
}

// ---- INIT & POLLING --------------------------------------------------------
(async () => {
  await loadCompanies();
  await loadFeed();
  await checkHealth();
  setInterval(loadFeed, 5000);
  setInterval(checkHealth, 10000);
  setInterval(async () => {
    await loadCompanies();
    if (selectedCompany) await loadOrg(selectedCompany.id);
  }, 8000);
})();
</script>
</body>
</html>`;
}
