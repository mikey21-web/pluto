import { Memory } from '../api'

const typeColor: Record<string, string> = {
  episodic: 'text-blue-400 bg-blue-400/10',
  semantic: 'text-purple-400 bg-purple-400/10',
  working: 'text-teal-400 bg-teal-400/10',
}

export default function MemoryPanel({ memory }: { memory: Memory[] }) {
  if (!memory?.length) return null
  const recent = memory.slice(0, 8)

  return (
    <div className="border border-white/5 rounded-xl bg-surface p-4">
      <h3 className="text-xs font-mono uppercase tracking-widest text-dim mb-3">
        Agent Memory ({memory.length})
      </h3>
      <div className="flex flex-col gap-1.5">
        {recent.map(m => (
          <div key={m.id} className="flex items-start gap-2">
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${typeColor[m.type] ?? 'text-gray-400 bg-white/5'}`}
            >
              {m.type}
            </span>
            <p className="text-xs text-gray-300 leading-snug line-clamp-2">{m.content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
