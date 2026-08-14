import { useState } from 'react'

type Props = {
  onClose: () => void
  onSpawn: (name: string, mission: string) => Promise<void>
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
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-surface border border-border rounded-xl p-6 w-full max-w-sm flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-mono font-bold text-accent">Spawn Company</h2>
          <button onClick={onClose} className="text-dim hover:text-gray-200 text-xl leading-none">×</button>
        </div>

        <div>
          <label className="font-mono text-xs text-dim mb-1 block">COMPANY NAME</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Acme Corp"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-dim focus:border-accent focus:outline-none font-mono"
          />
        </div>

        <div>
          <label className="font-mono text-xs text-dim mb-1 block">MISSION</label>
          <textarea
            value={mission}
            onChange={e => setMission(e.target.value)}
            placeholder="What does this company do?"
            rows={3}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-dim focus:border-accent focus:outline-none font-mono resize-none"
          />
        </div>

        <button
          onClick={submit}
          disabled={loading || !name.trim() || !mission.trim()}
          className="py-2 rounded-lg bg-accent/10 border border-accent/40 text-accent font-mono text-sm hover:bg-accent/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Spawning…' : 'Create Company'}
        </button>
      </div>
    </div>
  )
}
