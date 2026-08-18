import { useState } from 'react'
import { motion } from 'framer-motion'
import { Agent, Snapshot, api } from '../api'
import { PixelBadge, StatusKind } from './PixelBadge'
import { PixelButton } from './PixelButton'

type Props = {
  agent: Agent
  companyId: string
  snapshot: Snapshot
  onClose: () => void
}

function agentStatusKind(status: string): StatusKind {
  if (status === 'working' || status === 'active' || status === 'running') return 'working'
  if (status === 'failed' || status === 'error') return 'blocked'
  return 'idle'
}

export default function AgentDetail({ agent, companyId, snapshot, onClose }: Props) {
  const [taskSummary, setTaskSummary] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const agentTasks = snapshot.tasks.filter(t => t.agent_id === agent.id)
  const currentTask = agentTasks[0]

  const submit = async () => {
    if (!taskSummary.trim()) return
    setSubmitting(true)
    try {
      await api.createTask(companyId, taskSummary.trim())
      setSubmitted(true)
      setTaskSummary('')
    } catch { /* ignore */ }
    setSubmitting(false)
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 20 }} onClick={onClose} />
      <motion.div
        style={{
          position: 'fixed',
          right: 0,
          top: 36,
          bottom: 56,
          width: 280,
          zIndex: 30,
          background: 'var(--cth-cream-50)',
          boxShadow: '-1px 0 0 var(--cth-ink-100), var(--cth-shadow-hard)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        initial={{ x: 280 }}
        animate={{ x: 0 }}
        exit={{ x: 280 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        <div style={{
          padding: '8px 12px',
          background: 'var(--cth-cream-200)',
          boxShadow: 'inset 0 -1px 0 var(--cth-ink-100)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}>
          <div>
            <p style={{ fontFamily: 'var(--cth-font-display)', fontSize: 8, color: 'var(--cth-ink-900)', margin: '0 0 4px', letterSpacing: '0.05em' }}>
              {agent.name.toUpperCase()}
            </p>
            <p style={{ fontFamily: 'var(--cth-font-ui)', fontSize: 11, color: 'var(--cth-ink-500)', margin: 0 }}>
              {agent.role}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cth-ink-500)', fontSize: 18, lineHeight: 1, padding: 0, marginTop: 2 }}
          >
            ×
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <p style={{ fontFamily: 'var(--cth-font-display)', fontSize: 8, color: 'var(--cth-ink-300)', margin: '0 0 6px', letterSpacing: '0.05em' }}>STATUS</p>
            <PixelBadge status={agentStatusKind(agent.status)} />
          </div>

          {currentTask && (
            <div>
              <p style={{ fontFamily: 'var(--cth-font-display)', fontSize: 8, color: 'var(--cth-ink-300)', margin: '0 0 6px', letterSpacing: '0.05em' }}>CURRENT TASK</p>
              <p style={{ fontFamily: 'var(--cth-font-ui)', fontSize: 13, color: 'var(--cth-ink-700)', margin: 0, lineHeight: '18px' }}>{currentTask.summary}</p>
              {currentTask.status === 'SUCCEEDED' && currentTask.result && (
                <div style={{
                  marginTop: 8,
                  padding: 8,
                  background: 'var(--cth-cream-200)',
                  boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)',
                }}>
                  <p style={{ fontFamily: 'var(--cth-font-display)', fontSize: 8, color: 'var(--cth-ink-300)', margin: '0 0 4px', letterSpacing: '0.05em' }}>RESULT</p>
                  <p style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 11, color: 'var(--cth-ink-500)', margin: 0, lineHeight: '16px' }}>
                    {currentTask.result.slice(0, 120)}{currentTask.result.length > 120 ? '…' : ''}
                  </p>
                </div>
              )}
            </div>
          )}

          <div>
            <p style={{ fontFamily: 'var(--cth-font-display)', fontSize: 8, color: 'var(--cth-ink-300)', margin: '0 0 6px', letterSpacing: '0.05em' }}>ASSIGN TASK</p>
            <textarea
              value={taskSummary}
              onChange={e => setTaskSummary(e.target.value)}
              placeholder="What should this agent do?"
              rows={3}
              style={{
                width: '100%',
                background: 'var(--cth-cream-200)',
                boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)',
                border: 'none',
                padding: 8,
                fontFamily: 'var(--cth-font-mono)',
                fontSize: 12,
                color: 'var(--cth-ink-900)',
                resize: 'none',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {submitted && (
              <p style={{ fontFamily: 'var(--cth-font-ui)', fontSize: 11, color: 'var(--cth-status-success)', margin: '4px 0 0' }}>Task created!</p>
            )}
            <div style={{ marginTop: 8 }}>
              <PixelButton
                variant="primary"
                size="sm"
                fullWidth
                disabled={submitting || !taskSummary.trim()}
                onClick={submit}
              >
                {submitting ? 'Assigning…' : 'Assign Task'}
              </PixelButton>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  )
}
