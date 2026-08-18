import { useStore } from '../store/store'
import { PixelBadge } from './PixelBadge'
import { SpritePortrait } from './SpritePortrait'
import { Agent } from '../api'

type Props = {
  agents: Agent[]
  selectedId: string | null
  onSelect: (id: string) => void
  onNew: () => void
}

export default function AgentStrip({ agents, selectedId, onSelect, onNew }: Props) {
  const storeAgents = useStore(s => s.agents)
  const storeSelectedId = useStore(s => s.selectedId)
  const storeSelect = useStore(s => s.select)

  // Use store agents for portraits + status; fall back to API agents for names
  const displayAgents = storeAgents.length > 0 ? storeAgents : []

  const effectiveSelected = storeSelectedId || selectedId

  return (
    <div style={{
      height: 112,
      background: 'var(--cth-paper-100)',
      boxShadow: 'inset 0 1px 0 var(--cth-ink-100)',
      display: 'flex',
      alignItems: 'center',
      gap: 0,
      overflowX: 'auto',
      overflowY: 'hidden',
      flexShrink: 0,
      paddingLeft: 8,
    }}>
      {displayAgents.map(a => {
        const isSelected = a.id === effectiveSelected
        return (
          <button
            key={a.id}
            onClick={() => { storeSelect(isSelected ? '' : a.id); onSelect(a.id) }}
            style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 4,
              padding: '6px 10px',
              minWidth: 80, maxWidth: 100,
              height: '100%',
              border: 'none',
              background: isSelected ? 'var(--cth-cream-200)' : 'transparent',
              boxShadow: isSelected ? 'inset 0 -2px 0 var(--cth-ink-900)' : 'none',
              cursor: 'pointer',
              flexShrink: 0,
              position: 'relative',
              transition: 'background 0.1s',
            }}
          >
            {/* Portrait */}
            <div style={{
              position: 'relative',
              outline: isSelected ? '2px solid var(--cth-ink-900)' : 'none',
            }}>
              <SpritePortrait character={a.character} scale={2} />
              {/* Status dot */}
              <span style={{
                position: 'absolute', bottom: -2, right: -2,
                width: 8, height: 8,
                background: `var(--cth-status-${a.status})`,
                boxShadow: '0 0 0 1px var(--cth-paper-100)',
                display: 'block',
              }} />
            </div>
            {/* Name */}
            <span style={{
              fontFamily: 'var(--cth-font-display)', fontSize: 6,
              color: isSelected ? 'var(--cth-ink-900)' : 'var(--cth-ink-500)',
              letterSpacing: '0.04em',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              maxWidth: '100%',
            }}>
              {a.name.toUpperCase()}
            </span>
            {/* Action text */}
            {a.status !== 'idle' && (
              <span style={{
                fontFamily: 'var(--cth-font-mono)', fontSize: 9,
                color: 'var(--cth-ink-400)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                maxWidth: '90%',
              }}>
                {a.action?.slice(0, 12) || a.status}
              </span>
            )}
          </button>
        )
      })}

      {/* Add agent button */}
      <button
        onClick={onNew}
        style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 4,
          padding: '8px 16px',
          height: '100%', minWidth: 64,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          flexShrink: 0,
          color: 'var(--cth-ink-300)',
        }}
      >
        <span style={{ fontSize: 20, lineHeight: 1 }}>+</span>
        <span style={{ fontFamily: 'var(--cth-font-display)', fontSize: 6, letterSpacing: '0.04em', color: 'var(--cth-ink-300)' }}>
          NEW
        </span>
      </button>
    </div>
  )
}
