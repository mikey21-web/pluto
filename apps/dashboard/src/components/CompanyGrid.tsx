import { Company } from '../api'

type Props = {
  companies: Company[]
  onSelect: (id: string) => void
}

export default function CompanyGrid({ companies, onSelect }: Props) {
  if (companies.length === 0) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {companies.map(c => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className="text-left p-5 rounded-xl border border-border bg-surface hover:border-accent/40 hover:bg-muted transition-all group"
        >
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-mono font-bold text-gray-100 group-hover:text-accent transition-colors">
              {c.name}
            </h3>
            <span
              className={`w-2 h-2 rounded-full mt-1 ${
                c.health === 'healthy' ? 'bg-accent' : c.health === 'degraded' ? 'bg-yellow-400' : 'bg-red-500'
              }`}
            />
          </div>
          <p className="text-dim text-xs mb-4 line-clamp-2">{c.mission}</p>
          <div className="flex gap-3 text-xs font-mono">
            <span className="text-dim">
              <span className="text-gray-300">{c.agents}</span> agents
            </span>
            <span className="text-dim">
              <span className="text-green-400">{c.tasks_total}</span> done
            </span>
            {c.tasks_failed > 0 && (
              <span className="text-dim">
                <span className="text-red-400">{c.tasks_failed}</span> failed
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}
