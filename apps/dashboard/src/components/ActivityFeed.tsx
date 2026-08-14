import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api, Event, Snapshot } from '../api'

type Props = {
  selectedId: string | null
  snapshot: Snapshot | null
}

function eventColor(type: string) {
  if (type.startsWith('task.')) return '#ffd700'
  if (type.startsWith('agent.')) return '#00ff88'
  if (type.startsWith('sovereign.')) return '#a855f7'
  if (type.startsWith('company.')) return '#3b82f6'
  return '#4a4a6a'
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

  // Prefer snapshot events when a company is selected
  const displayEvents = selectedId && snapshot?.events?.length
    ? snapshot.events.slice(0, 50)
    : events

  return (
    <aside className="w-64 shrink-0 border-l border-border bg-surface overflow-y-auto hidden lg:flex flex-col">
      <div className="p-3 border-b border-border">
        <h2 className="font-mono text-xs text-dim uppercase tracking-widest">Live Activity</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        <AnimatePresence initial={false}>
          {displayEvents.length === 0 && (
            <p className="text-dim text-xs font-mono p-2">No events yet</p>
          )}
          {displayEvents.map((e, i) => (
            <motion.div
              key={e.id ?? `${e.type}-${i}`}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-2 items-start py-1.5 border-b border-border/30"
            >
              <span
                className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                style={{ background: eventColor(e.type) }}
              />
              <div className="min-w-0">
                <p className="font-mono text-xs truncate" style={{ color: eventColor(e.type) }}>
                  {e.type}
                </p>
                <p className="font-mono text-xs text-dim">{relativeTime(e.ts)}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </aside>
  )
}
