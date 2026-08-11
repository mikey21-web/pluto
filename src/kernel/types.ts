export type ID = string;
export type ISO = string;

export const newId = (p: string): ID => `${p}_${crypto.randomUUID().slice(0, 8)}`;
export const now = (): ISO => new Date().toISOString();

export type AgentStatus = 'designing' | 'testing' | 'active' | 'inactive' | 'retired' | 'replaced';
export type TaskState =
  | 'PENDING' | 'QUEUED' | 'RUNNING' | 'WAITING' | 'BLOCKED'
  | 'AWAITING_HUMAN' | 'VERIFYING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'REPLANNING';

export type MemoryType =
  | 'episodic' | 'semantic' | 'procedural' | 'strategic'
  | 'organizational' | 'customer' | 'decision';

export type NodeKind =
  | 'company' | 'executive' | 'department' | 'manager' | 'agent' | 'human'
  | 'project' | 'objective' | 'task' | 'capability' | 'tool' | 'resource'
  | 'system' | 'external_org' | 'customer' | 'kpi' | 'strategy' | 'evidence';

export type EdgeKind =
  | 'reports_to' | 'manages' | 'delegated_to' | 'depends_on' | 'collaborates_with'
  | 'owns' | 'created_by' | 'uses' | 'blocked_by' | 'produces' | 'consumes'
  | 'communicates_with' | 'allocated_to' | 'accountable_for' | 'targets' | 'derived_from';

export interface Company {
  id: ID; name: string; mission: string; created_at: ISO; status: string;
  health: number; kpi: Record<string, number | string>;
}

export interface Department {
  id: ID; company_id: ID; parent_id: ID | null; name: string; kind: string;
  manager_id: ID | null; objectives: ID[]; status: string;
}

export interface Human {
  id: ID; company_id: ID; name: string; role: string; email: string;
  authority: string[]; status: string;
}

export interface Agent {
  id: ID; company_id: ID; name: string; role: string;
  manager_id: ID | null; department_id: ID | null;
  model: string; tools: string[]; permissions: string[];
  memory_scope: string[]; budget: { monthly_usd: number; used_usd: number };
  status: AgentStatus; objectives: ID[]; version: number;
  performance: Record<string, number | string>;
}

export interface Objective {
  id: ID; company_id: ID; parent_id: ID | null; kind: string;
  title: string; description: string;
  krs: KR[]; status: string; owner_id: ID | null; owner_kind: 'agent' | 'human';
  department_id: ID | null; progress: number; key_result_value: number;
}

export interface KR {
  id: string; label: string; target: number; current: number; unit: string;
}

export interface Task {
  id: ID; company_id: ID; objective_id: ID | null; agent_id: ID | null;
  kind: string; summary: string; status: TaskState;
  input: Record<string, unknown>; output: Record<string, unknown>;
  evidence: Evidence[]; attempts: number; max_attempts: number;
  cost_usd: number; created_at: ISO; started_at: ISO | null; finished_at: ISO | null;
  priority: number; deadline: ISO | null; parent_task_id: ID | null;
}

export interface Evidence {
  kind: string; name: string; ok: boolean; detail: string;
  verified_by: ID | null; verified_at: ISO | null; confidence: number;
}

export interface EventRecord {
  seq: number; id: ID; company_id: ID; type: string; ts: ISO;
  entity_id: ID | null; entity_kind: string | null; payload: Record<string, unknown>;
}

export interface MemoryRecord {
  id: ID; company_id: ID; type: MemoryType; content: string;
  source: string; ts: ISO; confidence: number; owner: ID | null;
  version: number; tags: string[]; active: boolean;
}

export interface GraphNode {
  id: ID; kind: NodeKind; name: string; props: Record<string, unknown>; ts: ISO;
}
export interface GraphEdge {
  id: ID; from: ID; to: ID; kind: EdgeKind; props: Record<string, unknown>; ts: ISO;
}

export interface ApprovalRequest {
  id: ID; company_id: ID; actor_id: ID; action: string;
  summary: string; risk: 'low' | 'med' | 'high' | 'critical';
  status: 'pending' | 'approved' | 'rejected'; req_by: 'human' | 'policy';
  cost_usd: number; authored_at: ISO; decided_at: ISO | null; decided_by: ID | null;
  payload: Record<string, unknown>;
}

export interface DecisionRecord {
  id: ID; company_id: ID; kind: string; summary: string; reasoning: string;
  alternatives: string[]; confidence: number; ts: ISO; actor_id: ID | null;
}

export interface BudgetRow {
  id: ID; company_id: ID; scope: string; allocated_usd: number; used_usd: number;
  limit_usd: number; kind: string;
}

export interface TraceRecord {
  id: ID; company_id: ID; task_id: ID | null; agent_id: ID | null;
  step: string; model: string; latency_ms: number; cost_usd: number;
  prompt_tokens: number; completion_tokens: number; ts: ISO; payload: Record<string, unknown>;
}

export interface LearningRecord {
  id: ID; company_id: ID; kind: string; trigger: string; lesson: string;
  source: string; ts: ISO; applied_at: ISO | null; status: 'proposed' | 'applied' | 'rejected';
}

// ---- Phase-0 canonical contracts (§7 / §22): the objects every adapter maps into.

export interface Project {
  id: ID; company_id: ID; objective_id: ID | null; name: string;
  status: 'planned' | 'active' | 'paused' | 'done' | 'cancelled';
  phase: string; budget_usd: number; started_at: ISO | null; finished_at: ISO | null;
  created_at: ISO;
}

export interface Workflow {
  id: ID; company_id: ID; name: string; kind: string;
  definition: Record<string, unknown>; version: number;
  status: 'draft' | 'active' | 'retired'; created_at: ISO;
}

export interface Capability {
  id: ID; company_id: ID; name: string; kind: 'internal' | 'external' | 'buy' | 'delegate';
  provider: string; description: string; status: 'available' | 'acquiring' | 'unavailable';
  cost_per_call: number; cost_per_hour: number; availability: number;
}

export interface Policy {
  id: ID; company_id: ID; name: string; scope: string;
  rules: Array<{ id: string; action: string; effect: 'allow' | 'deny' | 'require_approval'; note?: string }>;
  status: 'active' | 'draft' | 'suspended';
}

export interface Risk {
  id: ID; company_id: ID; objective_id: ID | null; title: string;
  probability: number; impact: number; exposure: number;
  mitigation: string; owner_id: ID | null; status: 'open' | 'mitigating' | 'accepted' | 'closed';
}

export interface Experiment {
  id: ID; company_id: ID; objective_id: ID | null; hypothesis: string;
  variant: string; metric: string; baseline: number | null; current: number | null;
  status: 'designed' | 'running' | 'won' | 'lost' | 'inconclusive'; started_at: ISO | null;
}

export interface Strategy {
  id: ID; company_id: ID; name: string; kind: string;
  options: Array<{ id: string; name: string; expected: number; confidence: number; cost_usd: number; summary: string }>;
  chosen: string | null; status: 'formulating' | 'chosen' | 'executing' | 'abandoned';
  created_at: ISO;
}

export interface Artifact {
  id: ID; company_id: ID; task_id: ID | null; project_id: ID | null;
  name: string; kind: string; uri: string; checksum: string | null;
  created_by: ID | null; created_at: ISO;
}

/** Typed cross-department message (§24): structured contract, not free chat. */
export interface Message {
  id: ID; company_id: ID; contract: string;
  from_agent: ID; to_agent: ID | null; to_department: ID | null;
  payload: Record<string, unknown>; status: 'sent' | 'received' | 'actioned' | 'failed';
  sent_at: ISO; actioned_at: ISO | null;
}

/** Durable execution job (execution fabric §25-26). */
export interface Job {
  id: ID; company_id: ID; task_id: ID | null; workflow_id: ID | null;
  status: 'queued' | 'running' | 'retrying' | 'succeeded' | 'failed' | 'cancelled';
  attempts: number; max_attempts: number; state: Record<string, unknown>;
  last_heartbeat: ISO | null; scheduled_at: ISO; started_at: ISO | null; finished_at: ISO | null;
  error: string | null;
}

export interface ChatMsg {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  name?: string;
}

export interface ToolCall {
  id: string; name: string; arguments: string;
}

export interface ToolResult {
  ok: boolean; content: string; data?: unknown;
}

export interface ToolDef {
  name: string; description: string;
  parameters: Record<string, unknown>;
  run: (args: Record<string, unknown>, ctx: ExecCtx) => Promise<ToolResult>;
}

export interface ExecCtx {
  company_id: ID; agent_id: ID; task_id: ID;
  state: {
    remember(companyId: string, content: string, opts?: Partial<Pick<MemoryRecord, 'type' | 'source' | 'confidence' | 'owner' | 'tags'>>): MemoryRecord;
    repos: {
      memory(companyId: string, type?: MemoryRecord['type'], limit?: number): MemoryRecord[];
      graphNodes(): GraphNode[];
      graphEdges(): GraphEdge[];
    };
  };
}

export interface LlmCompletion {
  text: string;
  tool_calls: ToolCall[];
  usage: { prompt_tokens: number; completion_tokens: number };
  model: string;
}

export interface LlmDriver {
  model: string;
  complete(msgs: ChatMsg[], tools?: ToolDef[]): Promise<LlmCompletion>;
}