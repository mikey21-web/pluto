import { useState } from 'react'
import { motion } from 'framer-motion'
import { Snapshot, Agent } from '../api'
import AgentDetail from './AgentDetail'

type Props = {
  snapshot: Snapshot
  companyId: string
}

const CSUITE_ROLES = ['CEO', 'COO', 'CFO', 'CTO', 'CMO', 'CPO']

function statusColor(status: string) {
  if (status === 'working' || status === 'active' || status === 'running') return '#00ff88'
  if (status === 'failed' || status === 'error') return '#ff4444'
  return '#1a1a2e'
}

function statusTextColor(status: string) {
  if (status === 'working' || status === 'active' || status === 'running') return '#080810'
  if (status === 'failed' || status === 'error') return '#fff'
  return '#4a4a6a'
}

function abbrev(role: string) {
  return role.slice(0, 2).toUpperCase()
}

export default function OrgCanvas({ snapshot, companyId }: Props) {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)

  const csuite = snapshot.agents.filter(a =>
    CSUITE_ROLES.some(r => a.role?.toUpperCase().includes(r))
  )
  const others = snapshot.agents.filter(a =>
    !CSUITE_ROLES.some(r => a.role?.toUpperCase().includes(r))
  )

  return (
    <div className="relative">
      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="font-mono text-xs text-dim uppercase tracking-widest mb-6">Org Chart</h2>

        {/* C-suite row */}
        {csuite.length > 0 && (
          <div className="flex justify-center gap-6 mb-8">
            {csuite.map((agent, i) => (
              <button
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                className="flex flex-col items-center gap-2 group"
              >
                <div
                  className="w-36 h-20 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all hover:scale-105"
                  style={{
                    borderColor: statusColor(agent.status) === '#1a1a2e' ? '#1a1a2e' : statusColor(agent.status) + '60',
                    background: '#0f0f1a',
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: statusColor(agent.status), boxShadow: statusColor(agent.status) !== '#1a1a2e' ? `0 0 6px ${statusColor(agent.status)}` : 'none' }}
                    />
                    <span className="font-mono text-xs font-bold text-accent">{agent.role?.toUpperCase().slice(0, 3)}</span>
                  </div>
                  <span className="font-mono text-xs text-gray-300 text-center px-2 truncate w-full text-center">{agent.name}</span>
                </div>
                {/* SVG connector line down */}
                {i === Math.floor(csuite.length / 2) && others.length > 0 && (
                  <svg width="2" height="24" className="opacity-30"><line x1="1" y1="0" x2="1" y2="24" stroke="#00ff88" strokeWidth="1" /></svg>
                )}
              </button>
            ))}
          </div>
        )}

        {/* SVG lines from C-suite to agent grid */}
        {csuite.length > 0 && others.length > 0 && (
          <div className="flex justify-center mb-4">
            <svg width="80%" height="16" className="opacity-20">
              <line x1="10%" y1="8" x2="90%" y2="8" stroke="#00ff88" strokeWidth="1" />
            </svg>
          </div>
        )}

        {/* Agent pixel grid */}
        {others.length > 0 && (
          <div>
            <p className="font-mono text-xs text-dim mb-3">Department Agents</p>
            <div className="flex flex-wrap gap-2">
              {others.map(agent => {
                const color = statusColor(agent.status)
                const isActive = color === '#00ff88'
                return (
                  <motion.button
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent)}
                    className="w-9 h-9 rounded flex items-center justify-center text-xs font-mono font-bold cursor-pointer"
                    style={{
                      background: color,
                      color: statusTextColor(agent.status),
                      border: `1px solid ${color === '#1a1a2e' ? '#2a2a3e' : color}`,
                    }}
                    animate={isActive ? { opacity: [0.7, 1, 0.7] } : { opacity: 1 }}
                    transition={isActive ? { repeat: Infinity, duration: 2 } : {}}
                    title={`${agent.name} — ${agent.role} — ${agent.status}`}
                  >
                    {abbrev(agent.role || agent.name || '??')}
                  </motion.button>
                )
              })}
            </div>
          </div>
        )}

        {snapshot.agents.length === 0 && (
          <p className="text-dim text-sm font-mono text-center py-8">No agents yet</p>
        )}
      </div>

      {selectedAgent && (
        <AgentDetail
          agent={selectedAgent}
          companyId={companyId}
          snapshot={snapshot}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </div>
  )
}
