import { Memory } from '../api'
import { PixelPanel } from './PixelPanel'

function typePillStyle(type: string): React.CSSProperties {
  const base: React.CSSProperties = {
    fontFamily: 'var(--cth-font-display)',
    fontSize: 8,
    padding: '1px 5px',
    letterSpacing: '0.05em',
    display: 'inline-block',
    flexShrink: 0,
    marginTop: 2,
    lineHeight: '14px',
  }
  if (type === 'episodic') return { ...base, background: 'var(--cth-sky-light)',   color: 'var(--cth-sky)' }
  if (type === 'semantic') return { ...base, background: 'var(--cth-lilac-light)', color: 'var(--cth-lilac)' }
  if (type === 'working')  return { ...base, background: 'var(--cth-mint-light)',  color: 'var(--cth-mint)' }
  return { ...base, background: 'var(--cth-cream-300)', color: 'var(--cth-ink-500)' }
}

export default function MemoryPanel({ memory }: { memory: Memory[] }) {
  if (!memory?.length) return null
  const recent = memory.slice(0, 8)

  return (
    <PixelPanel title={`MEMORY (${memory.length})`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {recent.map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={typePillStyle(m.type)}>{m.type}</span>
            <p style={{
              fontFamily: 'var(--cth-font-ui)',
              fontSize: 13,
              color: 'var(--cth-ink-700)',
              margin: 0,
              lineHeight: '18px',
            }}>
              {m.content}
            </p>
          </div>
        ))}
      </div>
    </PixelPanel>
  )
}
