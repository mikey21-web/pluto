import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api, Event, Snapshot } from '../api'

type Props = {
  selectedId: string | null
  snapshot: Snapshot | null
}

function eventColor(type: string) {
  if (type.startsWith('task.')) return 'var(--cth-lemon)'
  if (type.startsWith('agent.')) return 'var(--cth-mint)'
  if (type.startsWith('sovereign.')) return 'var(--cth-lilac)'
  if (type.startsWith('company.')) return 'var(--cth-sky)'
  return 'var(--cth-ink-300)'
}

function relativeTime(ts?: string) {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60000) return `${Math.round(diff / 1000)}s ago`
  if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`
  return `${Math.round(diff / 3600000)}h ago`
}

export default function ActivityFeed({ selectedId, snapshot }: Props) {
  const [events, setEvents] = useState<Event[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.events()
        setEvents((Array.isArray(data) ? data : []).slice(0, 50))
      } catch { /* keep old */ }
    }
    load()
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [])

  const displayEvents = selectedId && snapshot?.events?.length
    ? snapshot.events.slice(0, 50)
    : events

  return (
    <aside
      className="hidden lg:flex"
      style={{
        width: 220,
        flexShrink: 0,
        borderLeft: '1px solid var(--cth-ink-100)',
        background: 'var(--cth-paper-100)',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{
        padding: '6px 12px',
        borderBottom: '1px solid var(--cth-ink-100)',
        fontFamily: 'var(--cth-font-display)',
        fontSize: 8,
        color: 'var(--cth-ink-500)',
        letterSpacing: '0.05em',
        flexShrink: 0,
      }}>
        LIVE ACTIVITY
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <AnimatePresence initial={false}>
          {displayEvents.length === 0 && (
            <p style={{
              fontFamily: 'var(--cth-font-mono)',
              fontSize: 11,
              color: 'var(--cth-ink-300)',
              padding: '8px 12px',
              margin: 0,
            }}>
              No events yet
            </p>
          )}
          {displayEvents.map((e, i) => (
            <motion.div
              key={e.id ?? `${e.type}-${i}`}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
                padding: '6px 12px',
                borderBottom: '1px solid var(--cth-cream-200)',
              }}
            >
              <span style={{
                width: 8,
                height: 8,
                flexShrink: 0,
                marginTop: 3,
                background: eventColor(e.type),
                display: 'inline-block',
              }} />
              <div style={{ minWidth: 0 }}>
                <p style={{
                  fontFamily: 'var(--cth-font-mono)',
                  fontSize: 11,
                  color: eventColor(e.type),
                  margin: '0 0 2px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {e.type}
                </p>
                <p style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 10, color: 'var(--cth-ink-300)', margin: 0 }}>
                  {relativeTime(e.ts)}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </aside>
  )
}
