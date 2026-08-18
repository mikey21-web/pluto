import { Company } from '../api'
import { PixelButton } from './PixelButton'

type Props = {
  companies: Company[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onNew: () => void
  online: boolean
}

const ACCENTS = ['coral', 'mint', 'sky', 'lemon', 'lilac', 'peach'] as const

export default function Header({ companies, selectedId, onSelect, onNew, online }: Props) {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '0 16px',
      height: 36,
      background: 'linear-gradient(to bottom, var(--cth-cream-100), var(--cth-cream-200))',
      boxShadow: 'inset 0 -1px 0 var(--cth-ink-100)',
      flexShrink: 0,
      zIndex: 10,
    }}>
      <button
        onClick={() => onSelect(null)}
        style={{
          fontFamily: 'var(--cth-font-display)',
          fontSize: 8,
          color: 'var(--cth-ink-900)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0 12px 0 0',
          whiteSpace: 'nowrap',
          letterSpacing: '0.1em',
          flexShrink: 0,
        }}
      >
        ⬡ PLUTO
      </button>

      <div style={{ display: 'flex', gap: 2, overflow: 'hidden', flex: 1 }}>
        {companies.map((c, i) => {
          const accent = ACCENTS[i % ACCENTS.length]
          const active = selectedId === c.id
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              style={{
                fontFamily: 'var(--cth-font-ui)',
                fontSize: 11,
                padding: '0 10px',
                height: 22,
                background: active ? `var(--cth-${accent}-light)` : 'transparent',
                color: active ? 'var(--cth-ink-900)' : 'var(--cth-ink-500)',
                border: 'none',
                boxShadow: active ? `inset 0 0 0 1px var(--cth-${accent})` : 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {c.name}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <PixelButton variant="primary" size="sm" onClick={onNew}>+ New</PixelButton>
        <span style={{
          width: 8,
          height: 8,
          background: online ? 'var(--cth-status-success)' : 'var(--cth-status-blocked)',
          display: 'inline-block',
          flexShrink: 0,
        }} />
      </div>
    </header>
  )
}
