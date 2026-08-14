import { useState } from 'react'
import { motion } from 'framer-motion'
import { Agent, Snapshot, api } from '../api'

type Props = {
  agent: Agent
  companyId: string
  snapshot: Snapshot
  onClose: () => void
}

export default function AgentDetail({ agent, companyId, snapshot, onClose }: Props) {
  const [taskSummary, setTaskSummary] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Find the agent's most recent task
  const agentTasks = snapshot.tasks.filter(t => t.agent_id === agent.id)
  const currentTask = agentTasks[0]

  const submit = async () => {
    if (!taskSummary.trim()) return
    setSubmitting(true)
    try {
      await api.createTask(companyId, taskSummary.trim())
      setSubmitted(true)
      setTaskSummary('')
    } catch { /* ignore */ }
    setSubmitting(false)
  }

  const statusColor = (s: string) => {
    if (s === 'working' || s === 'active' || s === 'running') return 'text-accent'
    if (s === 'failed' || s === 'error') return 'text-red-400'
    return 'text-dim'
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <motion.div
        className="fixed right-0 top-12 bottom-16 w-80 z-30 bg-surface border-l border-border flex flex-col overflow-hidden"
        initial={{ x: 320 }}
        animate={{ x: 0 }}
        exit={{ x: 320 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="font-mono font-bold text-gray-100">{agent.name}</h3>
            <p className="font-mono text-xs text-dim">{agent.role}</p>
          </div>
          <button onClick={onClose} className="text-dim hover:text-gray-200 text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <div>
            <p className="font-mono text-xs text-dim mb-1">STATUS</p>
            <span className={`font-mono text-sm font-bold ${statusColor(agent.status)}`}>
              {agent.status?.toUpperCase() || 'UNKNOWN'}
            </span>
          </div>

          {currentTask && (
            <div>
              <p className="font-mono text-xs text-dim mb-1">CURRENT TASK</p>
              <p className="text-sm text-gray-300">{currentTask.summary}</p>
              {currentTask.status === 'SUCCEEDED' && currentTask.result && (
                <div className="mt-2 p-2 rounded bg-muted border border-border">
                  <p className="font-mono text-xs text-dim mb-1">RESULT</p>
                  <p className="text-xs text-gray-400 line-clamp-4">{currentTask.result}</p>
                </div>
              )}
            </div>
          )}

          <div>
            <p className="font-mono text-xs text-dim mb-2">ASSIGN TASK</p>
            <textarea
              value={taskSummary}
              onChange={e => setTaskSummary(e.target.value)}
              placeholder="What should this agent do?"
              rows={3}
              className="w-full bg-bg border border-border rounded p-2 text-sm text-gray-200 placeholder-dim resize-none focus:border-accent focus:outline-none font-mono"
            />
            {submitted && (
              <p className="font-mono text-xs text-accent mt-1">Task created!</p>
            )}
            <button
              onClick={submit}
              disabled={submitting || !taskSummary.trim()}
              className="mt-2 w-full py-2 rounded bg-accent/10 border border-accent/40 text-accent font-mono text-xs hover:bg-accent/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Assigning…' : 'Assign Task'}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  )
}
