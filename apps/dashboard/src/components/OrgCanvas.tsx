import { useState } from 'react'
import { Snapshot, Agent } from '../api'
import AgentDetail from './AgentDetail'
import { PixelPanel } from './PixelPanel'
import { PixelBadge, StatusKind } from './PixelBadge'

type Props = {
  snapshot: Snapshot
  companyId: string
}

const CSUITE_ROLES = ['CEO', 'COO', 'CFO', 'CTO', 'CMO', 'CPO']

function agentStatusKind(status: string): StatusKind {
  if (status === 'working' || status === 'active' || status === 'running') return 'working'
  if (status === 'failed' || status === 'error') return 'blocked'
  return 'idle'
}

function agentSquareBg(status: string) {
  const k = agentStatusKind(status)
  if (k === 'working') return 'var(--cth-status-working)'
  if (k === 'blocked') return 'var(--cth-status-blocked)'
  return 'var(--cth-cream-300)'
}

function agentSquareFg(status: string) {
  const k = agentStatusKind(status)
  if (k === 'working') return 'var(--cth-ink-900)'
  if (k === 'blocked') return 'var(--cth-cream-50)'
  return 'var(--cth-ink-500)'
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
    <div style={{ position: 'relative' }}>
      <PixelPanel title="ORGANIZATION">
        {csuite.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            {csuite.map(agent => (
              <button
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <PixelPanel variant="inset" style={{ width: 132, padding: '10px 12px', textAlign: 'center' }}>
                  <p style={{
                    fontFamily: 'var(--cth-font-display)',
                    fontSize: 8,
                    color: 'var(--cth-ink-900)',
                    margin: '0 0 6px',
                    letterSpacing: '0.05em',
                  }}>
                    {agent.role?.toUpperCase().slice(0, 3)}
                  </p>
                  <p style={{
                    fontFamily: 'var(--cth-font-ui)',
                    fontSize: 11,
                    color: 'var(--cth-ink-700)',
                    margin: '0 0 8px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {agent.name}
                  </p>
                  <PixelBadge status={agentStatusKind(agent.status)} />
                </PixelPanel>
              </button>
            ))}
          </div>
        )}

        {csuite.length > 0 && others.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ width: '60%', height: 1, background: 'var(--cth-ink-100)' }} />
          </div>
        )}

        {others.length > 0 && (
          <div>
            <p style={{
              fontFamily: 'var(--cth-font-display)',
              fontSize: 8,
              color: 'var(--cth-ink-300)',
              margin: '0 0 10px',
              letterSpacing: '0.05em',
            }}>
              DEPARTMENT
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {others.map(agent => (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent)}
                  title={`${agent.name} — ${agent.role} — ${agent.status}`}
                  style={{
                    width: 36,
                    height: 36,
                    background: agentSquareBg(agent.status),
                    color: agentSquareFg(agent.status),
                    fontFamily: 'var(--cth-font-display)',
                    fontSize: 8,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'var(--cth-shadow-hard)',
                  }}
                >
                  {abbrev(agent.role || agent.name || '??')}
                </button>
              ))}
            </div>
          </div>
        )}

        {snapshot.agents.length === 0 && (
          <p style={{
            fontFamily: 'var(--cth-font-ui)',
            fontSize: 13,
            color: 'var(--cth-ink-300)',
            textAlign: 'center',
            padding: '32px 0',
            margin: 0,
          }}>
            No agents yet
          </p>
        )}
      </PixelPanel>

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
