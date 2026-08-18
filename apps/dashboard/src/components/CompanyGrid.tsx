import { Company } from '../api'
import { PixelPanel } from './PixelPanel'

type Props = {
  companies: Company[]
  onSelect: (id: string) => void
}

const ACCENTS = ['coral', 'mint', 'sky', 'lemon', 'lilac', 'peach'] as const

function healthColor(h: string) {
  if (h === 'healthy') return 'var(--cth-status-success)'
  if (h === 'degraded') return 'var(--cth-status-working)'
  return 'var(--cth-status-blocked)'
}

export default function CompanyGrid({ companies, onSelect }: Props) {
  if (companies.length === 0) return null

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
      gap: 12,
    }}>
      {companies.map((c, i) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          style={{ textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <PixelPanel
            title={c.name.toUpperCase()}
            accent={ACCENTS[i % ACCENTS.length]}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <p style={{
                fontFamily: 'var(--cth-font-ui)',
                fontSize: 13,
                color: 'var(--cth-ink-700)',
                margin: 0,
                lineHeight: '18px',
                flex: 1,
              }}>
                {c.mission}
              </p>
              <span style={{
                width: 8,
                height: 8,
                flexShrink: 0,
                marginLeft: 8,
                marginTop: 4,
                background: healthColor(c.health),
                display: 'inline-block',
              }} />
            </div>
            <div style={{
              display: 'flex',
              gap: 12,
              fontFamily: 'var(--cth-font-mono)',
              fontSize: 11,
              color: 'var(--cth-ink-300)',
            }}>
              <span><span style={{ color: 'var(--cth-ink-700)' }}>{c.agents}</span> agents</span>
              <span><span style={{ color: 'var(--cth-status-success)' }}>{c.tasks_total}</span> done</span>
              {c.tasks_failed > 0 && (
                <span><span style={{ color: 'var(--cth-status-blocked)' }}>{c.tasks_failed}</span> failed</span>
              )}
            </div>
          </PixelPanel>
        </button>
      ))}
    </div>
  )
}
