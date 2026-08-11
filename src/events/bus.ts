import { PlutoState } from '../kernel/state.ts';
import type { EventRecord } from '../kernel/types.ts';

export type EventType =
  | 'agent.created' | 'agent.started' | 'agent.failed' | 'agent.promoted' | 'agent.retired'
  | 'task.created' | 'task.queued' | 'task.running' | 'task.succeeded' | 'task.failed' | 'task.verifying' | 'task.retry' | 'task.retry_exhausted'
  | 'objective.created' | 'objective.blocked' | 'objective.progress'
  | 'company.created' | 'department.created' | 'strategy.chosen' | 'strategy.changed'
  | 'budget.exceeded' | 'resource.allocated' | 'spend.recorded'
  | 'approval.requested' | 'approval.completed'
  | 'customer.created' | 'payment.received' | 'deployment.completed'
  | 'job.queued' | 'job.started' | 'job.retrying' | 'job.succeeded' | 'job.failed'
  | 'skill.acquired' | 'capability.registered' | 'capability.unavailable'
  | 'org.restructured' | 'learning.proposed' | 'learning.applied';

export type EventHandler = (ev: EventRecord) => void | Promise<void>;

/** Known event types — any other string is still allowed (extension contract), kept for tooling. */
export const EVENT_TYPES: EventType[] = [
  'agent.created', 'agent.started', 'agent.failed', 'agent.promoted', 'agent.retired',
  'task.created', 'task.queued', 'task.running', 'task.succeeded', 'task.failed', 'task.verifying', 'task.retry', 'task.retry_exhausted',
  'objective.created', 'objective.blocked', 'objective.progress',
  'company.created', 'department.created', 'strategy.chosen', 'strategy.changed',
  'budget.exceeded', 'resource.allocated', 'spend.recorded',
  'approval.requested', 'approval.completed',
  'customer.created', 'payment.received', 'deployment.completed',
  'job.queued', 'job.started', 'job.retrying', 'job.succeeded', 'job.failed',
  'skill.acquired', 'capability.registered', 'capability.unavailable',
  'org.restructured', 'learning.proposed', 'learning.applied',
];

/**
 * Event Bus (§7.11, §23): typed publish/subscribe decoupling.
 * Every emission is persisted via the store's events table (audit/projection source),
 * and in-process handlers react (fan-out). Replaceable by any durable event store later.
 */
export class EventBus {
  private state: PlutoState;
  private subs = new Map<string, EventHandler[]>();

  constructor(state: PlutoState) {
    this.state = state;
  }

  /** Subscribe to zero or more event types (all if none given). */
  on(types: EventType[] | '*', handler: EventHandler): this {
    const keys = types === '*' ? ['*'] : types;
    for (const k of keys) {
      if (!this.subs.has(k)) this.subs.set(k, []);
      this.subs.get(k)!.push(handler);
    }
    return this;
  }

  /** Publish: persist + dispatch to '*' and matching-type handlers. */
  publish(companyId: string, type: string, entityId?: string | null, entityKind?: string | null, payload: Record<string, unknown> = {}): EventRecord {
    const ev = this.state.emit(companyId, type, entityId, entityKind, payload);
    const hs = [...(this.subs.get('*') ?? []), ...(this.subs.get(type) ?? [])];
    for (const h of hs) {
      try { void h(ev); } catch { /* handler errors are isolated — never break the bus */ }
    }
    return ev;
  }
}

/** Convenience event-name constants (avoids typos at the call site). */
export const EV = {
  TASK_CREATED: 'task.created',
  TASK_SUCCEEDED: 'task.succeeded',
  TASK_FAILED: 'task.failed',
  BUDGET_EXCEEDED: 'budget.exceeded',
  APPROVAL_REQUESTED: 'approval.requested',
  APPROVAL_COMPLETED: 'approval.completed',
  JOB_SUCCEEDED: 'job.succeeded',
  CAPABILITY_UNAVAILABLE: 'capability.unavailable',
} as const;