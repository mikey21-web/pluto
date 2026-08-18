import { create } from 'zustand';
import type { AccentColorName } from '@/design/tokens';
import type { OfficeCharacterName } from '@/scene/office/cast';

export type StatusKind =
  | 'idle' | 'thinking' | 'working' | 'waiting' | 'blocked'
  | 'success' | 'ghost' | 'compacting' | 'looping' | 'typing';

export type StationKind =
  | 'shelf' | 'terminal' | 'web' | 'board' | 'mailbox' | 'mcp' | 'desk';

export type ToolKind =
  | 'Read' | 'Edit' | 'Write' | 'Bash' | 'WebFetch' | 'WebSearch'
  | 'Grep' | 'Glob' | 'TodoWrite' | 'MCP';

export interface Agent {
  id: string;
  name: string;
  character: OfficeCharacterName;
  accent: AccentColorName;
  description: string;
  project: string;
  tmuxTarget: string;
  cwd: string;
  goal?: string;
  note?: string;
  status: StatusKind;
  action: string;
  progress: number;
  currentStation?: StationKind;
  carrying?: ToolKind;
  recentAssistantText?: string;
  recentTextTs?: number;
  isGod?: boolean;
  isAssistant?: boolean;
  contextTokens?: number;
  contextLimit?: number;
  lastPrompt?: string;
  archived?: boolean;
  ptyId?: string;
}

interface State {
  agents: Agent[];
  selectedId: string | null;
  sidebarWidth: number;
  officeTheme: string;
  ccTabRequest: { tab: string; seq: number } | null;
  select: (id: string) => void;
  updateAgent: (id: string, patch: Partial<Agent>) => void;
  setAgents: (agents: Agent[]) => void;
  setSidebarWidth: (px: number) => void;
  requestCommandCenterTab: (tab: string) => void;
}

export const useStore = create<State>((set) => ({
  agents: [],
  selectedId: null,
  sidebarWidth: 360,
  officeTheme: 'office',
  ccTabRequest: null,
  select: (id) => set({ selectedId: id }),
  updateAgent: (id, patch) =>
    set((s) => ({ agents: s.agents.map(a => a.id === id ? { ...a, ...patch } : a) })),
  setAgents: (agents) => set({ agents }),
  setSidebarWidth: (px) => set({ sidebarWidth: Math.max(240, Math.min(640, px)) }),
  requestCommandCenterTab: (tab) =>
    set((s) => ({ ccTabRequest: { tab, seq: (s.ccTabRequest?.seq ?? 0) + 1 } })),
}));

export function selectedAgent(s: State): Agent | undefined {
  return s.agents.find(a => a.id === s.selectedId);
}
