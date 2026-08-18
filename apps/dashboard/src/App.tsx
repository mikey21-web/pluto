import { useEffect, useState, useCallback } from 'react'
import { api, Company, Snapshot } from './api'
import { useStore } from './store/store'
import type { Agent as StoreAgent, StatusKind, StationKind } from './store/store'
import type { OfficeCharacterName } from './scene/office/cast'
import type { AccentColorName } from './design/tokens'
import Header from './components/Header'
import ChatBar from './components/ChatBar'
import SpawnModal from './components/SpawnModal'
import AgentStrip from './components/AgentStrip'
import CommandCenter from './components/CommandCenter'
import { OfficeFloor } from './scene/office/OfficeFloor'

const ACCENT_LIST: AccentColorName[] = ['coral', 'mint', 'sky', 'lemon', 'lilac', 'peach']
const CHAR_LIST: OfficeCharacterName[] = ['michael', 'jim', 'pam', 'dwight', 'kevin', 'angela', 'oscar', 'stanley', 'phyllis', 'andy', 'kelly', 'ryan', 'toby', 'creed', 'meredith']

function mapStatus(s: string): StatusKind {
  if (s === 'working' || s === 'running' || s === 'active' || s === 'thinking') return 'working'
  if (s === 'blocked' || s === 'error' || s === 'failed') return 'blocked'
  if (s === 'waiting') return 'waiting'
  return 'idle'
}

function mapStation(status: string): StationKind {
  if (status === 'working' || status === 'running') return 'desk'
  return 'desk'
}

const DEMO_AGENTS: StoreAgent[] = [
  { id: 'demo-1', name: 'Michael', character: 'michael', accent: 'lemon', description: 'CEO — World\'s best boss', project: 'pluto', tmuxTarget: '', cwd: '/', status: 'working', action: 'Reviewing company goals', progress: 3, currentStation: 'desk', isGod: true },
  { id: 'demo-2', name: 'Jim', character: 'jim', accent: 'sky', description: 'CTO — Salesman, prankster', project: 'pluto', tmuxTarget: '', cwd: '/', status: 'working', action: 'Running build pipeline', progress: 5, currentStation: 'terminal' },
  { id: 'demo-3', name: 'Pam', character: 'pam', accent: 'mint', description: 'CMO — Receptionist, artist', project: 'pluto', tmuxTarget: '', cwd: '/', status: 'idle', action: 'idle', progress: 0, currentStation: 'desk' },
  { id: 'demo-4', name: 'Dwight', character: 'dwight', accent: 'coral', description: 'CFO — Assistant (to the) RM', project: 'pluto', tmuxTarget: '', cwd: '/', status: 'working', action: 'Analysing budget', progress: 4, currentStation: 'shelf' },
  { id: 'demo-5', name: 'Kevin', character: 'kevin', accent: 'peach', description: 'CPO — Accounting', project: 'pluto', tmuxTarget: '', cwd: '/', status: 'idle', action: 'idle', progress: 0, currentStation: 'desk' },
  { id: 'demo-6', name: 'Angela', character: 'angela', accent: 'lilac', description: 'Engineer — Head of accounting', project: 'pluto', tmuxTarget: '', cwd: '/', status: 'working', action: 'Writing tests', progress: 6, currentStation: 'desk' },
  { id: 'demo-7', name: 'Oscar', character: 'oscar', accent: 'sky', description: 'Engineer — Accountant', project: 'pluto', tmuxTarget: '', cwd: '/', status: 'idle', action: 'idle', progress: 0, currentStation: 'desk' },
  { id: 'demo-8', name: 'Stanley', character: 'stanley', accent: 'mint', description: 'Analyst — Sales, crossword', project: 'pluto', tmuxTarget: '', cwd: '/', status: 'working', action: 'Processing metrics', progress: 2, currentStation: 'web' },
]

export default function App() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [spawnOpen, setSpawnOpen] = useState(false)
  const [online, setOnline] = useState(false)

  // Read from Zustand store for agent selection
  const selectedAgentId = useStore(s => s.selectedId)
  const storeAgents = useStore(s => s.agents)
  const setAgents = useStore(s => s.setAgents)
  const storeSelect = useStore(s => s.select)

  // ── Company polling ──────────────────────────────────────────────────────
  const fetchCompanies = useCallback(async () => {
    try {
      const data = await api.companies()
      setCompanies(data)
      setOnline(true)
      if (data.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(data[0].id)
      }
    } catch {
      setOnline(false)
    }
  }, [selectedCompanyId])

  useEffect(() => {
    fetchCompanies()
    const t = setInterval(fetchCompanies, 10000)
    return () => clearInterval(t)
  }, [fetchCompanies])

  // ── Snapshot polling → populate Zustand store ─────────────────────────────
  useEffect(() => {
    if (!selectedCompanyId) {
      setSnapshot(null)
      setAgents(DEMO_AGENTS)
      return
    }
    const load = async () => {
      try {
        const snap = await api.snapshot(selectedCompanyId)
        setSnapshot(snap)
        // Map Pluto agents → store agents for the office floor
        const mapped: StoreAgent[] = snap.agents.map((a: any, i: number) => ({
          id: a.id,
          name: a.name,
          character: CHAR_LIST[i % CHAR_LIST.length],
          accent: ACCENT_LIST[i % ACCENT_LIST.length],
          description: a.role ?? '',
          project: snap.company?.name ?? 'pluto',
          tmuxTarget: '',
          cwd: '/',
          status: mapStatus(a.status),
          action: a.action ?? (a.status === 'working' ? 'Working…' : 'idle'),
          progress: a.status === 'working' ? 4 : 0,
          currentStation: mapStation(a.status),
          isGod: i === 0, // first agent is CEO/god
          recentTextTs: Date.now(),
        }))
        setAgents(mapped.length > 0 ? mapped : DEMO_AGENTS)
      } catch {
        setAgents(DEMO_AGENTS)
      }
    }
    load()
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [selectedCompanyId, setAgents])

  // Show demo agents on load before backend connects
  useEffect(() => {
    if (storeAgents.length === 0) setAgents(DEMO_AGENTS)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSpawn = async (name: string, mission: string) => {
    await api.spawnCompany(name, mission)
    await fetchCompanies()
  }

  // Find agent from API snapshot using store's selected id
  const selectedAgent = snapshot?.agents.find(a => a.id === selectedAgentId) ?? null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--cth-cream-100)' }}>
      <Header
        companies={companies}
        selectedId={selectedCompanyId}
        onSelect={id => { setSelectedCompanyId(id); storeSelect('') }}
        onNew={() => setSpawnOpen(true)}
        online={online}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Real munder-difflin office floor — reads agents from Zustand store */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <OfficeFloor />
        </div>

        {/* Right sidebar — command center */}
        <div style={{ width: 380, flexShrink: 0, overflow: 'hidden' }}>
          <CommandCenter
            agent={selectedAgent}
            snapshot={snapshot}
            companyId={selectedCompanyId}
          />
        </div>
      </div>

      {/* Bottom: chat + agent strip */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <ChatBar selectedId={selectedCompanyId} />
        <AgentStrip
          agents={snapshot?.agents ?? (storeAgents as any)}
          selectedId={selectedAgentId}
          onSelect={id => storeSelect(selectedAgentId === id ? '' : id)}
          onNew={() => setSpawnOpen(true)}
        />
      </div>

      {spawnOpen && (
        <SpawnModal
          onClose={() => setSpawnOpen(false)}
          onSpawn={handleSpawn}
        />
      )}
    </div>
  )
}
