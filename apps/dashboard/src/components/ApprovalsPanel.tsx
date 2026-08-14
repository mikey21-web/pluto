import { useState } from 'react'
import { api, Approval } from '../api'

const riskColor: Record<string, string> = {
  low: 'text-green-400 bg-green-400/10',
  medium: 'text-yellow-400 bg-yellow-400/10',
  high: 'text-orange-400 bg-orange-400/10',
  critical: 'text-red-400 bg-red-400/10',
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
    <div className="border border-yellow-500/30 rounded-xl bg-yellow-500/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
        <h3 className="text-xs font-mono uppercase tracking-widest text-yellow-400">
          Pending Approvals ({pending.length})
        </h3>
      </div>
      <div className="flex flex-col gap-2">
        {pending.map(a => (
          <div
            key={a.id}
            className="rounded-lg border border-white/5 bg-surface p-3 flex flex-col gap-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono text-dim mb-1">{a.action}</p>
                <p className="text-sm text-gray-200 leading-snug line-clamp-2">{a.summary}</p>
              </div>
              <span
                className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full shrink-0 ${riskColor[a.risk ?? 'low']}`}
              >
                {a.risk ?? 'low'}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => decide(a.id, 'approved')}
                disabled={deciding === a.id}
                className="flex-1 text-xs font-mono py-1.5 rounded-md bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30 transition disabled:opacity-40"
              >
                {deciding === a.id ? '…' : '✓ Approve'}
              </button>
              <button
                onClick={() => decide(a.id, 'rejected')}
                disabled={deciding === a.id}
                className="flex-1 text-xs font-mono py-1.5 rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition disabled:opacity-40"
              >
                {deciding === a.id ? '…' : '✗ Reject'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
