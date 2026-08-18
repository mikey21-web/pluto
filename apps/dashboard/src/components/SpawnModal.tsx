import { useState } from 'react'
import { PixelPanel } from './PixelPanel'
import { PixelButton } from './PixelButton'

type Props = {
  onClose: () => void
  onSpawn: (name: string, mission: string) => Promise<void>
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--cth-cream-200)',
  boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)',
  border: 'none',
  padding: '6px 8px',
  fontFamily: 'var(--cth-font-mono)',
  fontSize: 13,
  color: 'var(--cth-ink-900)',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--cth-font-display)',
  fontSize: 8,
  color: 'var(--cth-ink-300)',
  display: 'block',
  marginBottom: 6,
  letterSpacing: '0.05em',
}

export default function SpawnModal({ onClose, onSpawn }: Props) {
  const [name, setName] = useState('')
  const [mission, setMission] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!name.trim() || !mission.trim()) return
    setLoading(true)
    await onSpawn(name.trim(), mission.trim())
    setLoading(false)
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(26, 19, 32, 0.6)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div style={{ width: '100%', maxWidth: 360 }} onClick={e => e.stopPropagation()}>
        <PixelPanel variant="dialog" title="SPAWN COMPANY" accent="lemon" noPadding>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>COMPANY NAME</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Acme Corp"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>MISSION</label>
              <textarea
                value={mission}
                onChange={e => setMission(e.target.value)}
                placeholder="What does this company do?"
                rows={3}
                style={{ ...inputStyle, resize: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <PixelButton variant="secondary" size="md" fullWidth onClick={onClose}>
                Cancel
              </PixelButton>
              <PixelButton
                variant="primary"
                size="md"
                fullWidth
                disabled={loading || !name.trim() || !mission.trim()}
                onClick={submit}
              >
                {loading ? 'Spawning…' : 'Create Company'}
              </PixelButton>
            </div>
          </div>
        </PixelPanel>
      </div>
    </div>
  )
}
