import { Snapshot, Task } from '../api'

type Props = {
  snapshot: Snapshot
  companyId: string
}

const pillClass: Record<string, string> = {
  PENDING: 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10',
  RUNNING: 'text-blue-400 border-blue-400/40 bg-blue-400/10 animate-pulse',
  SUCCEEDED: 'text-accent border-accent/40 bg-accent/10',
  FAILED: 'text-red-400 border-red-400/40 bg-red-400/10',
}

export default function TasksPanel({ snapshot }: Props) {
  const tasks = snapshot.tasks ?? []

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="p-4 border-b border-border">
        <h2 className="font-mono text-xs text-dim uppercase tracking-widest">Tasks</h2>
      </div>
      {tasks.length === 0 ? (
        <p className="p-4 text-dim text-sm font-mono">No tasks yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="font-mono text-xs text-dim text-left px-4 py-2">ID</th>
                <th className="font-mono text-xs text-dim text-left px-4 py-2">Summary</th>
                <th className="font-mono text-xs text-dim text-left px-4 py-2">Status</th>
                <th className="font-mono text-xs text-dim text-left px-4 py-2">Agent</th>
                <th className="font-mono text-xs text-dim text-left px-4 py-2">Result</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => {
                const agent = snapshot.agents.find(a => a.id === task.agent_id)
                return (
                  <tr key={task.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2 font-mono text-xs text-dim">{task.id.slice(0, 8)}</td>
                    <td className="px-4 py-2 text-sm text-gray-300 max-w-xs">
                      {(task.summary ?? '').slice(0, 60)}{(task.summary ?? '').length > 60 ? '…' : ''}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`font-mono text-xs px-2 py-0.5 rounded border ${pillClass[task.status] ?? 'text-dim border-border'}`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-dim">{agent?.name ?? '—'}</td>
                    <td className="px-4 py-2 text-xs text-dim max-w-xs">
                      {task.result ? (task.result).slice(0, 60) + ((task.result).length > 60 ? '…' : '') : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
