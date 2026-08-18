import { useState, useEffect, useRef } from 'react'
import { type Agent, type Snapshot, type Approval, api } from '../api'
import { PixelBadge, StatusKind } from './PixelBadge'
import { PixelButton } from './PixelButton'
import { SpritePortrait } from './SpritePortrait'
import { useStore } from '../store/store'

type CCTab = 'terminal' | 'monitor' | 'tasks' | 'ask me' | 'memory' | 'activity' | 'commands'

const TABS: { key: CCTab; label: string; icon: string }[] = [
  { key: 'terminal', label: 'terminal', icon: '▸' },
  { key: 'monitor', label: 'monitor', icon: '⬡' },
  { key: 'tasks', label: 'tasks', icon: '✓' },
  { key: 'ask me', label: 'ask me', icon: '!' },
  { key: 'memory', label: 'memory', icon: '♦' },
  { key: 'activity', label: 'activity', icon: '•' },
  { key: 'commands', label: 'commands', icon: '≡' },
]

function agentStatusKind(status: string): StatusKind {
  if (status === 'working' || status === 'running' || status === 'active' || status === 'thinking') return 'working'
  if (status === 'blocked' || status === 'error' || status === 'failed') return 'blocked'
  if (status === 'waiting') return 'waiting'
  return 'idle'
}

type TaskStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'

function taskColor(s: TaskStatus): string {
  if (s === 'SUCCEEDED') return 'var(--cth-mint)'
  if (s === 'RUNNING') return 'var(--cth-sky)'
  if (s === 'FAILED') return 'var(--cth-coral)'
  return 'var(--cth-ink-300)'
}

function taskBg(s: TaskStatus): string {
  if (s === 'SUCCEEDED') return 'var(--cth-mint-light)'
  if (s === 'RUNNING') return 'var(--cth-sky-light)'
  if (s === 'FAILED') return 'var(--cth-coral-light)'
  return 'var(--cth-cream-200)'
}

function eventColor(type: string) {
  if (type.startsWith('task.')) return 'var(--cth-lemon)'
  if (type.startsWith('agent.')) return 'var(--cth-mint)'
  if (type.startsWith('sovereign.') || type.startsWith('company.')) return 'var(--cth-sky)'
  return 'var(--cth-ink-300)'
}

function reltime(ts?: string) {
  if (!ts) return ''
  const d = Date.now() - new Date(ts).getTime()
  if (d < 60000) return `${Math.round(d / 1000)}s ago`
  if (d < 3600000) return `${Math.round(d / 60000)}m ago`
  return `${Math.round(d / 3600000)}h ago`
}

function riskColor(risk: string) {
  if (risk === 'critical') return 'var(--cth-coral)'
  if (risk === 'high') return 'var(--cth-lemon)'
  if (risk === 'medium') return 'var(--cth-sky)'
  return 'var(--cth-ink-300)'
}

const COMMANDS = [
  { label: 'Status report', cmd: 'Give me a full status report of all agents and their current tasks.' },
  { label: 'Daily standup', cmd: 'Run a daily standup — what did each agent do, what are they working on, any blockers?' },
  { label: 'Prioritize tasks', cmd: 'Review all pending tasks and prioritize them by business impact.' },
  { label: 'Check blockers', cmd: 'Are any agents blocked? What do they need to unblock?' },
  { label: 'Delegate all', cmd: 'Review the task queue and delegate all pending tasks to the appropriate agents.' },
  { label: 'Fleet health', cmd: 'Check the health of all agents — any stalled, failed, or over-budget?' },
]

type Props = {
  agent: Agent | null
  snapshot: Snapshot | null
  companyId?: string | null
}

function EmptyState() {
  const agents = useStore(s => s.agents)
  const select = useStore(s => s.select)
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--cth-paper-100)',
      boxShadow: 'inset 1px 0 0 var(--cth-ink-100)',
      gap: 16,
      padding: 24,
    }}>
      <p style={{ fontFamily: 'var(--cth-font-display)', fontSize: 8, color: 'var(--cth-ink-300)', letterSpacing: '0.05em', textAlign: 'center', lineHeight: '20px' }}>
        Click an agent<br />on the floor<br />to inspect
      </p>
      {agents.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', maxWidth: 200 }}>
          {agents.slice(0, 5).map(a => (
            <button key={a.id} onClick={() => select(a.id)} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '4px 8px',
              background: 'var(--cth-cream-100)',
              boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)',
              border: 'none', cursor: 'pointer',
              fontFamily: 'var(--cth-font-display)', fontSize: 7,
              color: 'var(--cth-ink-700)', letterSpacing: '0.05em',
              textAlign: 'left',
            }}>
              <SpritePortrait character={a.character} scale={1} />
              {a.name.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CommandCenter({ agent, snapshot, companyId }: Props) {
  const [tab, setTab] = useState<CCTab>('terminal')
  const [deciding, setDeciding] = useState<string | null>(null)
  const [logLines, setLogLines] = useState<string[]>([])
  const logRef = useRef<HTMLDivElement>(null)
  const ccTabRequest = useStore(s => s.ccTabRequest)
  const storeAgents = useStore(s => s.agents)

  // Respond to external tab requests (e.g. from floor click)
  useEffect(() => {
    if (!ccTabRequest) return
    const key = ccTabRequest.tab as CCTab
    if (TABS.some(t => t.key === key)) setTab(key)
  }, [ccTabRequest])

  // Build a pseudo-terminal log from events + agent status
  useEffect(() => {
    if (!agent) return
    const lines: string[] = []
    const ts = () => new Date().toLocaleTimeString('en', { hour12: false })
    lines.push(`[${ts()}] Agent: ${agent.name} (${agent.role})`)
    lines.push(`[${ts()}] Status: ${agent.status}`)
    const agentEvents = (snapshot?.events ?? [])
      .filter(e => (e.payload as any)?.agent_id === agent.id || e.type.includes(agent.id))
      .slice(-15)
    for (const e of agentEvents) {
      lines.push(`[${reltime(e.ts)}] ${e.type}${(e.payload as any)?.message ? ': ' + (e.payload as any).message : ''}`)
    }
    const agentTasks = (snapshot?.tasks ?? []).filter(t => t.agent_id === agent.id).slice(0, 5)
    for (const t of agentTasks) {
      lines.push(`[task] ${t.status} — ${t.summary?.slice(0, 60) ?? ''}`)
    }
    setLogLines(lines)
  }, [agent, snapshot])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logLines])

  const handleDecide = async (id: string, decision: 'approved' | 'rejected') => {
    setDeciding(id)
    try { await api.decide(id, decision) } catch {}
    setDeciding(null)
  }

  if (!agent) return <EmptyState />

  const agentTasks = (snapshot?.tasks ?? []).filter(t => t.agent_id === agent.id)
  const allTasks = snapshot?.tasks ?? []
  const memory = snapshot?.memory ?? []
  const events = snapshot?.events ?? []
  const approvals = (snapshot?.approvals ?? []).filter(a => a.status === 'pending')

  // Get the store agent for portrait
  const storeAgent = storeAgents.find(a => a.id === agent.id)

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      background: 'var(--cth-cream-100)',
      boxShadow: 'inset 1px 0 0 var(--cth-ink-100)',
      overflow: 'hidden',
    }}>
      {/* ── Header ── */}
      <div style={{
        padding: '10px 12px 8px',
        background: 'var(--cth-paper-100)',
        boxShadow: 'inset 0 -1px 0 var(--cth-ink-100)',
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        {storeAgent && (
          <div style={{ flexShrink: 0 }}>
            <SpritePortrait character={storeAgent.character} scale={2} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: 'var(--cth-font-display)', fontSize: 8, color: 'var(--cth-ink-900)', margin: '0 0 4px', letterSpacing: '0.05em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {agent.name.toUpperCase()}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--cth-font-ui)', fontSize: 11, color: 'var(--cth-ink-500)' }}>{agent.role}</span>
            <PixelBadge status={agentStatusKind(agent.status)} />
          </div>
        </div>
        {agentTasks.find(t => t.status === 'RUNNING') && (
          <div style={{
            width: 8, height: 8, flexShrink: 0,
            background: 'var(--cth-status-working)',
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
        )}
      </div>

      {/* ── Tab bar ── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap',
        borderBottom: '1px solid var(--cth-ink-100)',
        flexShrink: 0,
        background: 'var(--cth-paper-100)',
        overflowX: 'auto',
      }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            fontFamily: 'var(--cth-font-display)', fontSize: 7,
            padding: '5px 8px',
            border: 'none',
            background: tab === t.key ? 'var(--cth-cream-100)' : 'transparent',
            color: tab === t.key ? 'var(--cth-ink-900)' : 'var(--cth-ink-400)',
            cursor: 'pointer', letterSpacing: '0.04em',
            boxShadow: tab === t.key ? 'inset 0 2px 0 var(--cth-ink-900)' : 'none',
            whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{ fontSize: 9 }}>{t.icon}</span>
            {t.label}
            {t.key === 'ask me' && approvals.length > 0 && (
              <span style={{
                background: 'var(--cth-coral)', color: '#fff',
                borderRadius: 0, fontSize: 6, padding: '1px 3px',
                fontFamily: 'var(--cth-font-display)', lineHeight: '10px',
                marginLeft: 2,
              }}>{approvals.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab body ── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>

        {/* ── TERMINAL — pseudo-log of agent activity ── */}
        {tab === 'terminal' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Current action banner */}
            <div style={{
              padding: '8px 12px',
              background: 'var(--cth-ink-900)',
              borderBottom: '1px solid var(--cth-ink-700)',
              flexShrink: 0,
            }}>
              <span style={{ fontFamily: 'var(--cth-font-display)', fontSize: 7, color: 'var(--cth-lemon)', letterSpacing: '0.05em' }}>
                ⬡ MICHAEL&nbsp;&gt;&nbsp;{agent.name.toUpperCase()}
              </span>
              <p style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 12, color: '#a8ff78', margin: '4px 0 0', lineHeight: '18px' }}>
                {(agent as any).action || (agent.status === 'working' ? 'Working…' : '$ awaiting tasks')}
              </p>
            </div>
            {/* Log stream */}
            <div ref={logRef} style={{
              flex: 1, overflowY: 'auto', padding: 12,
              background: '#0d0d0f',
              fontFamily: 'var(--cth-font-mono)', fontSize: 11,
              color: '#c0bfc8', lineHeight: '18px',
            }}>
              {logLines.map((l, i) => (
                <div key={i} style={{ color: l.startsWith('[task]') ? '#a8ff78' : l.includes('blocked') || l.includes('FAIL') ? '#ff6b6b' : '#c0bfc8' }}>
                  {l}
                </div>
              ))}
              {agentTasks[0] && (
                <>
                  <div style={{ marginTop: 12, color: '#888', borderTop: '1px solid #222', paddingTop: 8 }}>
                    $ latest task:
                  </div>
                  <div style={{ color: agentTasks[0].status === 'SUCCEEDED' ? '#a8ff78' : agentTasks[0].status === 'FAILED' ? '#ff6b6b' : '#f0e68c' }}>
                    [{agentTasks[0].status}] {agentTasks[0].summary}
                  </div>
                  {agentTasks[0].result && (
                    <div style={{ color: '#888', marginTop: 4, whiteSpace: 'pre-wrap', fontSize: 10 }}>
                      {agentTasks[0].result.slice(0, 400)}{agentTasks[0].result.length > 400 ? '…' : ''}
                    </div>
                  )}
                </>
              )}
              <div style={{ color: '#555', marginTop: 8 }}>$ _</div>
            </div>
          </div>
        )}

        {/* ── MONITOR — all agents on the floor ── */}
        {tab === 'monitor' && (
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{ fontFamily: 'var(--cth-font-display)', fontSize: 7, color: 'var(--cth-ink-300)', margin: '0 0 6px', letterSpacing: '0.05em' }}>
              FLOOR — {storeAgents.length} AGENTS
            </p>
            {storeAgents.map(a => {
              const running = (snapshot?.tasks ?? []).filter(t => t.agent_id === a.id && t.status === 'RUNNING').length
              return (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 8px',
                  background: a.id === agent.id ? 'var(--cth-cream-200)' : 'var(--cth-paper-100)',
                  boxShadow: `inset 0 0 0 1px ${a.id === agent.id ? 'var(--cth-ink-300)' : 'var(--cth-ink-100)'}`,
                }}>
                  <SpritePortrait character={a.character} scale={1.5} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontFamily: 'var(--cth-font-display)', fontSize: 7, color: 'var(--cth-ink-900)', letterSpacing: '0.05em' }}>
                        {a.name}
                      </span>
                      <PixelBadge status={a.status} />
                    </div>
                    <div style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 10, color: 'var(--cth-ink-400)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.action !== 'idle' ? a.action : a.description}
                    </div>
                  </div>
                  {running > 0 && (
                    <span style={{ fontFamily: 'var(--cth-font-display)', fontSize: 6, color: 'var(--cth-status-working)', padding: '2px 4px', background: 'var(--cth-lemon-light)', letterSpacing: '0.05em' }}>
                      {running} running
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── TASKS ── */}
        {tab === 'tasks' && (
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <p style={{ fontFamily: 'var(--cth-font-display)', fontSize: 7, color: 'var(--cth-ink-300)', margin: '0 0 8px', letterSpacing: '0.05em' }}>
              ALL TASKS ({allTasks.length})
            </p>
            {allTasks.length === 0 && (
              <p style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 12, color: 'var(--cth-ink-300)', margin: 0 }}>
                No tasks yet — give Michael an instruction.
              </p>
            )}
            {(['RUNNING', 'PENDING', 'SUCCEEDED', 'FAILED'] as TaskStatus[]).map(status => {
              const group = allTasks.filter(t => t.status === status)
              if (!group.length) return null
              return (
                <div key={status} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ width: 8, height: 8, background: taskColor(status), display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontFamily: 'var(--cth-font-display)', fontSize: 6, color: taskColor(status), letterSpacing: '0.05em' }}>
                      {status} ({group.length})
                    </span>
                  </div>
                  {group.map(t => {
                    const assignedAgent = snapshot?.agents.find(a => a.id === t.agent_id)
                    return (
                      <div key={t.id} style={{
                        padding: '6px 8px', marginBottom: 4,
                        background: 'var(--cth-paper-100)',
                        boxShadow: `inset 2px 0 0 ${taskColor(status)}, inset 0 0 0 1px var(--cth-ink-100)`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          {assignedAgent && (
                            <span style={{ fontFamily: 'var(--cth-font-display)', fontSize: 6, color: 'var(--cth-ink-400)', letterSpacing: '0.04em', flexShrink: 0 }}>
                              {assignedAgent.name}
                            </span>
                          )}
                          <span style={{
                            fontFamily: 'var(--cth-font-display)', fontSize: 6,
                            padding: '1px 4px',
                            background: taskBg(status), color: taskColor(status),
                            letterSpacing: '0.04em', flexShrink: 0,
                          }}>{status}</span>
                        </div>
                        <p style={{ fontFamily: 'var(--cth-font-ui)', fontSize: 12, color: 'var(--cth-ink-700)', margin: 0, lineHeight: '16px' }}>
                          {t.summary?.slice(0, 100)}{(t.summary?.length ?? 0) > 100 ? '…' : ''}
                        </p>
                        {t.result && status === 'SUCCEEDED' && (
                          <p style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 10, color: 'var(--cth-ink-400)', margin: '4px 0 0', lineHeight: '14px' }}>
                            {t.result.slice(0, 80)}{t.result.length > 80 ? '…' : ''}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}

        {/* ── ASK ME — pending approvals ── */}
        {tab === 'ask me' && (
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontFamily: 'var(--cth-font-display)', fontSize: 7, color: 'var(--cth-ink-300)', margin: '0 0 4px', letterSpacing: '0.05em' }}>
              PENDING APPROVALS ({approvals.length})
            </p>
            {approvals.length === 0 && (
              <div style={{
                padding: 16,
                background: 'var(--cth-paper-100)',
                boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)',
                textAlign: 'center',
              }}>
                <p style={{ fontFamily: 'var(--cth-font-display)', fontSize: 7, color: 'var(--cth-ink-300)', margin: 0, letterSpacing: '0.05em' }}>
                  NO APPROVALS<br />NEEDED
                </p>
                <p style={{ fontFamily: 'var(--cth-font-ui)', fontSize: 12, color: 'var(--cth-ink-400)', margin: '8px 0 0' }}>
                  The team is running autonomously.
                </p>
              </div>
            )}
            {approvals.map(a => (
              <div key={a.id} style={{
                padding: '10px 12px',
                background: 'var(--cth-paper-100)',
                boxShadow: `inset 2px 0 0 ${riskColor(a.risk)}, inset 0 0 0 1px var(--cth-ink-100)`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{
                    fontFamily: 'var(--cth-font-display)', fontSize: 6,
                    padding: '1px 4px',
                    background: riskColor(a.risk), color: '#fff',
                    letterSpacing: '0.04em', textTransform: 'uppercase',
                  }}>{a.risk}</span>
                  <span style={{ fontFamily: 'var(--cth-font-display)', fontSize: 6, color: 'var(--cth-ink-400)', letterSpacing: '0.04em' }}>
                    {reltime(a.authored_at)}
                  </span>
                </div>
                <p style={{ fontFamily: 'var(--cth-font-ui)', fontSize: 13, color: 'var(--cth-ink-900)', margin: '0 0 6px', lineHeight: '18px', fontWeight: 600 }}>
                  {a.action}
                </p>
                <p style={{ fontFamily: 'var(--cth-font-ui)', fontSize: 12, color: 'var(--cth-ink-500)', margin: '0 0 10px', lineHeight: '16px' }}>
                  {a.summary}
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <PixelButton
                    variant="primary" size="sm"
                    disabled={deciding === a.id}
                    onClick={() => handleDecide(a.id, 'approved')}
                  >
                    Approve
                  </PixelButton>
                  <PixelButton
                    variant="destructive" size="sm"
                    disabled={deciding === a.id}
                    onClick={() => handleDecide(a.id, 'rejected')}
                  >
                    Reject
                  </PixelButton>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── MEMORY ── */}
        {tab === 'memory' && (
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontFamily: 'var(--cth-font-display)', fontSize: 7, color: 'var(--cth-ink-300)', margin: '0 0 4px', letterSpacing: '0.05em' }}>
              MEMORY ({memory.length})
            </p>
            {memory.length === 0 && (
              <p style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 12, color: 'var(--cth-ink-300)', margin: 0 }}>
                No memory entries yet.
              </p>
            )}
            {memory.slice(0, 20).map(m => (
              <div key={m.id} style={{
                padding: '6px 8px',
                background: 'var(--cth-paper-100)',
                boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)',
                display: 'flex', gap: 8, alignItems: 'flex-start',
              }}>
                <span style={{
                  fontFamily: 'var(--cth-font-display)', fontSize: 6,
                  padding: '2px 4px',
                  background: m.type === 'episodic' ? 'var(--cth-sky-light)' : m.type === 'semantic' ? 'var(--cth-mint-light)' : 'var(--cth-lemon-light)',
                  color: m.type === 'episodic' ? 'var(--cth-sky)' : m.type === 'semantic' ? 'var(--cth-mint)' : 'var(--cth-lemon)',
                  letterSpacing: '0.04em', flexShrink: 0, marginTop: 2,
                }}>{m.type}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: 'var(--cth-font-ui)', fontSize: 12, color: 'var(--cth-ink-700)', margin: 0, lineHeight: '16px' }}>
                    {m.content}
                  </p>
                  <p style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 10, color: 'var(--cth-ink-300)', margin: '3px 0 0' }}>
                    conf: {(m.confidence * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ACTIVITY — event log ── */}
        {tab === 'activity' && (
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <p style={{ fontFamily: 'var(--cth-font-display)', fontSize: 7, color: 'var(--cth-ink-300)', margin: '0 0 8px', letterSpacing: '0.05em' }}>
              EVENT LOG ({events.length})
            </p>
            {events.length === 0 && (
              <p style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 12, color: 'var(--cth-ink-300)', margin: 0 }}>
                No events yet.
              </p>
            )}
            {events.slice(0, 40).map((e, i) => (
              <div key={e.id ?? i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '4px 0',
                borderBottom: '1px solid var(--cth-cream-200)',
              }}>
                <span style={{ width: 6, height: 6, background: eventColor(e.type), flexShrink: 0, display: 'inline-block', marginTop: 4 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: 'var(--cth-font-display)', fontSize: 7, color: eventColor(e.type), letterSpacing: '0.04em', display: 'block' }}>
                    {e.type}
                  </span>
                  {(e.payload as any)?.message && (
                    <span style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 10, color: 'var(--cth-ink-400)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(e.payload as any).message}
                    </span>
                  )}
                </div>
                <span style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 9, color: 'var(--cth-ink-300)', flexShrink: 0 }}>
                  {reltime(e.ts)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── COMMANDS — quick instructions to send ── */}
        {tab === 'commands' && (
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontFamily: 'var(--cth-font-display)', fontSize: 7, color: 'var(--cth-ink-300)', margin: '0 0 4px', letterSpacing: '0.05em' }}>
              QUICK COMMANDS
            </p>
            <p style={{ fontFamily: 'var(--cth-font-ui)', fontSize: 12, color: 'var(--cth-ink-400)', margin: '0 0 8px' }}>
              Click to send a command to the company via the chat bar.
            </p>
            {COMMANDS.map(c => (
              <button
                key={c.label}
                onClick={() => {
                  const input = document.querySelector('input[placeholder="Message Pluto…"]') as HTMLInputElement
                  if (input) { input.value = c.cmd; input.dispatchEvent(new Event('input', { bubbles: true })) }
                }}
                style={{
                  padding: '8px 10px', border: 'none', cursor: 'pointer',
                  background: 'var(--cth-paper-100)',
                  boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)',
                  textAlign: 'left',
                  display: 'flex', flexDirection: 'column', gap: 3,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--cth-cream-200)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--cth-paper-100)')}
              >
                <span style={{ fontFamily: 'var(--cth-font-display)', fontSize: 7, color: 'var(--cth-ink-900)', letterSpacing: '0.04em' }}>
                  {c.label}
                </span>
                <span style={{ fontFamily: 'var(--cth-font-ui)', fontSize: 11, color: 'var(--cth-ink-500)', lineHeight: '15px' }}>
                  {c.cmd.slice(0, 60)}…
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
