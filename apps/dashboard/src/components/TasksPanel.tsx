import { Snapshot } from '../api'
import { PixelPanel } from './PixelPanel'

type Props = {
  snapshot: Snapshot
  companyId: string
}

type TaskStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'

function statusPillStyle(status: TaskStatus): React.CSSProperties {
  const base: React.CSSProperties = {
    fontFamily: 'var(--cth-font-display)',
    fontSize: 8,
    padding: '2px 6px',
    letterSpacing: '0.05em',
    display: 'inline-block',
    lineHeight: '14px',
  }
  switch (status) {
    case 'PENDING':   return { ...base, background: 'var(--cth-cream-300)', color: 'var(--cth-ink-500)' }
    case 'RUNNING':   return { ...base, background: 'var(--cth-sky-light)', color: 'var(--cth-sky)' }
    case 'SUCCEEDED': return { ...base, background: 'var(--cth-mint-light)', color: 'var(--cth-mint)' }
    case 'FAILED':    return { ...base, background: 'var(--cth-coral-light)', color: 'var(--cth-coral)' }
    default:          return base
  }
}

const thStyle: React.CSSProperties = {
  fontFamily: 'var(--cth-font-display)',
  fontSize: 8,
  color: 'var(--cth-ink-500)',
  textAlign: 'left',
  padding: '6px 12px',
  fontWeight: 400,
  letterSpacing: '0.05em',
}

export default function TasksPanel({ snapshot }: Props) {
  const tasks = snapshot.tasks ?? []

  return (
    <PixelPanel title="TASKS" noPadding>
      {tasks.length === 0 ? (
        <p style={{
          padding: '16px 12px',
          fontFamily: 'var(--cth-font-ui)',
          fontSize: 13,
          color: 'var(--cth-ink-300)',
          margin: 0,
        }}>
          No tasks yet
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--cth-cream-200)', borderBottom: '1px solid var(--cth-ink-100)' }}>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Summary</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Agent</th>
                <th style={thStyle}>Result</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => {
                const agent = snapshot.agents.find(a => a.id === task.agent_id)
                return (
                  <tr key={task.id} style={{ borderBottom: '1px solid var(--cth-cream-200)' }}>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--cth-font-mono)', fontSize: 11, color: 'var(--cth-ink-300)' }}>
                      {task.id.slice(0, 8)}
                    </td>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--cth-font-ui)', fontSize: 13, color: 'var(--cth-ink-700)', maxWidth: 200 }}>
                      {(task.summary ?? '').slice(0, 60)}{(task.summary ?? '').length > 60 ? '…' : ''}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={statusPillStyle(task.status as TaskStatus)}>{task.status}</span>
                    </td>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--cth-font-mono)', fontSize: 11, color: 'var(--cth-ink-300)' }}>
                      {agent?.name ?? '—'}
                    </td>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--cth-font-mono)', fontSize: 11, color: 'var(--cth-ink-300)', maxWidth: 160 }}>
                      {task.result ? task.result.slice(0, 60) + (task.result.length > 60 ? '…' : '') : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </PixelPanel>
  )
}
