import { useEffect, useState, useCallback } from 'react'
import { api, Company, Snapshot } from './api'
import Header from './components/Header'
import CompanyGrid from './components/CompanyGrid'
import OrgCanvas from './components/OrgCanvas'
import ActivityFeed from './components/ActivityFeed'
import ChatBar from './components/ChatBar'
import SpawnModal from './components/SpawnModal'
import TasksPanel from './components/TasksPanel'
import ApprovalsPanel from './components/ApprovalsPanel'
import MemoryPanel from './components/MemoryPanel'

export default function App() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [spawnOpen, setSpawnOpen] = useState(false)
  const [online, setOnline] = useState(false)

  const fetchCompanies = useCallback(async () => {
    try {
      const data = await api.companies()
      setCompanies(data)
      setOnline(true)
    } catch {
      setOnline(false)
    }
  }, [])

  useEffect(() => {
    fetchCompanies()
    const t = setInterval(fetchCompanies, 10000)
    return () => clearInterval(t)
  }, [fetchCompanies])

  useEffect(() => {
    if (!selectedId) { setSnapshot(null); return }
    const load = async () => {
      try {
        const data = await api.snapshot(selectedId)
        setSnapshot(data)
      } catch { /* keep old */ }
    }
    load()
    const t = setInterval(load, 8000)
    return () => clearInterval(t)
  }, [selectedId])

  const handleSpawn = async (name: string, mission: string) => {
    await api.spawnCompany(name, mission)
    await fetchCompanies()
  }

  return (
    <div className="flex flex-col h-screen bg-bg text-gray-200 overflow-hidden">
      <Header
        companies={companies}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onNew={() => setSpawnOpen(true)}
        online={online}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar placeholder for balance */}
        <div className="w-0 md:w-0" />

        {/* Main canvas */}
        <div className="flex-1 overflow-y-auto pb-20">
          {!selectedId ? (
            <div className="p-6">
              <p className="text-dim text-sm mb-4 font-mono">
                {companies.length === 0
                  ? 'No companies yet — spawn one to begin.'
                  : 'Select a company to drill in.'}
              </p>
              <CompanyGrid
                companies={companies}
                onSelect={setSelectedId}
              />
            </div>
          ) : snapshot ? (
            <div className="p-6 flex flex-col gap-6">
              <ApprovalsPanel
                approvals={snapshot.approvals ?? []}
                onDecide={async () => {
                  const data = await api.snapshot(selectedId)
                  setSnapshot(data)
                }}
              />
              <OrgCanvas snapshot={snapshot} companyId={selectedId} />
              <TasksPanel snapshot={snapshot} companyId={selectedId} />
              <MemoryPanel memory={snapshot.memory ?? []} />
            </div>
          ) : (
            <div className="p-6 text-dim text-sm font-mono animate-pulse">Loading…</div>
          )}
        </div>

        {/* Right activity feed */}
        <ActivityFeed selectedId={selectedId} snapshot={snapshot} />
      </div>

      <ChatBar selectedId={selectedId} />

      {spawnOpen && (
        <SpawnModal
          onClose={() => setSpawnOpen(false)}
          onSpawn={handleSpawn}
        />
      )}
    </div>
  )
}
