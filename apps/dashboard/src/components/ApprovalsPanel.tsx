import { useState } from 'react'
import { api, Approval } from '../api'
import { PixelPanel } from './PixelPanel'
import { PixelButton } from './PixelButton'

function riskPillStyle(risk: string): React.CSSProperties {
  const base: React.CSSProperties = {
    fontFamily: 'var(--cth-font-display)',
    fontSize: 8,
    padding: '2px 6px',
    letterSpacing: '0.05em',
    display: 'inline-block',
    lineHeight: '14px',
    flexShrink: 0,
  }
  if (risk === 'critical') return { ...base, background: 'var(--cth-coral-light)', color: 'var(--cth-coral)' }
  if (risk === 'high')     return { ...base, background: 'var(--cth-peach-light)', color: 'var(--cth-peach)' }
  if (risk === 'medium')   return { ...base, background: 'var(--cth-lemon-light)', color: 'var(--cth-lemon)' }
  return { ...base, background: 'var(--cth-mint-light)', color: 'var(--cth-mint)' }
}

export default function ApprovalsPanel({
  approvals,
  onDecide,
}: {
  approvals: Approval[]
  onDecide: () => void
}) {
  const [deciding, setDeciding] = useState<string | null>(null)
  const pending = approvals.filter(a => a.status === 'pending')

  if (pending.length === 0) return null

  const decide = async (id: string, decision: 'approved' | 'rejected') => {
    setDeciding(id)
    try {
      await api.decide(id, decision)
      onDecide()
    } finally {
      setDeciding(null)
    }
  }

  return (
    <PixelPanel title={`APPROVALS (${pending.length})`} accent="lemon">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pending.map(a => (
          <div
            key={a.id}
            style={{
              background: 'var(--cth-cream-200)',
              boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)',
              padding: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: 'var(--cth-font-display)', fontSize: 8, color: 'var(--cth-ink-300)', margin: '0 0 4px', letterSpacing: '0.05em' }}>
                  {a.action}
                </p>
                <p style={{ fontFamily: 'var(--cth-font-ui)', fontSize: 13, color: 'var(--cth-ink-900)', margin: 0, lineHeight: '18px' }}>
                  {a.summary}
                </p>
              </div>
              <span style={riskPillStyle(a.risk ?? 'low')}>{a.risk ?? 'low'}</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <PixelButton
                variant="secondary"
                size="sm"
                fullWidth
                disabled={deciding === a.id}
                onClick={() => decide(a.id, 'approved')}
              >
                {deciding === a.id ? '…' : '✓ Approve'}
              </PixelButton>
              <PixelButton
                variant="destructive"
                size="sm"
                fullWidth
                disabled={deciding === a.id}
                onClick={() => decide(a.id, 'rejected')}
              >
                {deciding === a.id ? '…' : '✗ Reject'}
              </PixelButton>
            </div>
          </div>
        ))}
      </div>
    </PixelPanel>
  )
}
