import { Company } from '../api'

type Props = {
  companies: Company[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onNew: () => void
  online: boolean
}

export default function Header({ companies, selectedId, onSelect, onNew, online }: Props) {
  return (
    <header className="flex items-center gap-3 px-4 h-12 border-b border-border bg-surface shrink-0 z-10">
      <button
        onClick={() => onSelect(null)}
        className="font-mono font-bold text-accent text-lg tracking-widest hover:opacity-80 transition-opacity"
      >
        ⬡ PLUTO
      </button>

      <div className="flex gap-1 overflow-x-auto">
        {companies.map(c => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`px-3 py-1 rounded text-xs font-mono whitespace-nowrap transition-colors ${
              selectedId === c.id
                ? 'bg-accent/20 text-accent border border-accent/40'
                : 'text-dim hover:text-gray-200 border border-transparent hover:border-border'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-3">
        <button
          onClick={onNew}
          className="px-3 py-1 rounded text-xs font-mono border border-accent/40 text-accent hover:bg-accent/10 transition-colors"
        >
          + New
        </button>
        <span
          className={`w-2 h-2 rounded-full ${online ? 'bg-accent shadow-[0_0_6px_#00ff88]' : 'bg-red-500'}`}
          style={online ? { animation: 'pulse 2s infinite' } : {}}
        />
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </header>
  )
}
