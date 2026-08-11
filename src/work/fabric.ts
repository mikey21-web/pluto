import { PlutoState } from '../kernel/state.ts';
import type { Job } from '../kernel/types.ts';

/** Failure classification (§26) — decides if/how a job retries. */
export type FailureClass = 'transient' | 'permanent' | 'timeout' | 'policy' | 'verification';

export interface JobHandler {
  (job: Job, attempt: number): Promise<{ ok: boolean; error?: string; state?: Record<string, unknown>; class?: FailureClass }>;
}

export function classify(e: unknown): FailureClass {
  const s = String(e instanceof Error ? e.message : e).toLowerCase();
  if (/\btimeout\b|timed out|econn|socket hang/.test(s)) return 'timeout';
  if (/\bpermission|forbidden|not authorized|policy|approval/.test(s)) return 'policy';
  if (/\binvalid|malformed|schema|not found|404|denied/.test(s)) return 'permanent';
  return 'transient';
}

const RETRY_BACKOFF_MS = [0, 2_000, 10_000, 30_000, 60_000];

/**
 * Execution Fabric (§7.10, §25-26): durable jobs, heartbeats, idempotent, event-driven.
 * A job is attempted up to max_attempts; transient failures retry with backoff,
 * permanent/policy failures fail fast. Heartbeats keep a job "running" recoverable.
 */
export class ExecutionFabric {
  private state: PlutoState;
  private handlers = new Map<string, JobHandler>();
  private running = new Map<string, Promise<void>>();

  constructor(state: PlutoState) {
    this.state = state;
  }

  register(taskKind: string, handler: JobHandler): void {
    this.handlers.set(taskKind, handler);
  }

  /** Kick off a durable job, returning its id immediately (fire-and-forget from caller's view). */
  enqueue(c: { company_id: string; task_id?: string | null; kind: string; workflow_id?: string | null; max_attempts?: number; state?: Record<string, unknown> }): Job {
    const job = this.state.repos.createJob({
      company_id: c.company_id, task_id: c.task_id ?? null, workflow_id: c.workflow_id ?? null,
      max_attempts: c.max_attempts ?? 3, state: c.state ?? {},
    });
    this.state.emit(c.company_id, 'job.queued', job.id, 'job', { kind: c.kind, task_id: job.task_id });
    // drain inline in a detached microtask would risk blocking; explicit start()
    void job;
    return job;
  }

  /** Run a job through the fabric: retry classification, backoff, heartbeat, terminal states. */
  async run(jobId: string, handler: JobHandler): Promise<Job> {
    let job = this.state.repos.job(jobId);
    if (!job) throw new Error(`job ${jobId} not found`);
    const kind = job.task_id ? this.state.repos.task(job.task_id)?.kind ?? 'task' : 'workflow';

    job.status = 'running'; job.started_at = new Date().toISOString();
    job.last_heartbeat = new Date().toISOString();
    this.state.repos.saveJob(job);
    this.state.emit(job.company_id, 'job.started', job.id, 'job', { kind });

    for (let attempt = 1; attempt <= job.max_attempts; attempt++) {
      job.attempts = attempt;
      job.last_heartbeat = new Date().toISOString();
      this.state.repos.saveJob(job);
      const started = Date.now();
      try {
        const res = await handler(job, attempt);
        if (res.ok) {
          job.status = 'succeeded'; job.finished_at = new Date().toISOString();
          job.state = { ...job.state, ok: true, ...(res.state ?? {}) };
          job.error = null;
        } else {
          const cls = res.class ?? classify(res.error);
          if (cls === 'permanent' || cls === 'policy' || attempt >= job.max_attempts) {
            job.status = 'failed'; job.finished_at = new Date().toISOString();
            job.error = res.error ?? 'failed (permanent)';
            job.state = { ...job.state, ok: false, failure_class: cls };
          } else {
            job.status = 'retrying'; job.error = res.error ?? 'failed (transient)';
            job.state = { ...job.state, ok: false, failure_class: cls };
            this.state.repos.saveJob(job);
            const ms = RETRY_BACKOFF_MS[Math.min(attempt, RETRY_BACKOFF_MS.length - 1)];
            this.state.emit(job.company_id, 'job.retrying', job.id, 'job', { attempt, wait_ms: ms, error: job.error });
            await new Promise(r => setTimeout(r, ms));
            job = this.state.repos.job(jobId)!;
            job.status = 'running';
            continue;
          }
        }
        this.state.repos.saveJob(job);
        const latency = Date.now() - started;
        this.state.emit(job.company_id, job.status === 'succeeded' ? 'job.succeeded' : 'job.failed', job.id, 'job', {
          attempts: job.attempts, latency_ms: latency, error: job.error,
        });
        this.state.repos.trace({
          company_id: job.company_id, task_id: job.task_id, step: `job.${job.status}`, model: 'fabric',
          latency_ms: latency, cost_usd: 0,
        });
        // attach outcome onto the task if one exists
        if (job.task_id) {
          const t = this.state.repos.task(job.task_id);
          if (t) {
            t.output = { ...t.output, job_status: job.status, job_error: job.error };
            if (job.status === 'succeeded') { t.status = 'SUCCEEDED'; t.finished_at = new Date().toISOString(); }
            else if (job.status === 'failed') { t.status = 'FAILED'; t.finished_at = new Date().toISOString(); }
            this.state.repos.saveTask(t);
          }
        }
        return job;
      } catch (e) {
        const cls = classify(e);
        if (cls === 'permanent' || cls === 'policy' || attempt >= job.max_attempts) {
          job.status = 'failed'; job.finished_at = new Date().toISOString();
          job.error = `uncaught: ${String(e)}`;
          this.state.repos.saveJob(job);
          this.state.emit(job.company_id, 'job.failed', job.id, 'job', { attempts: job.attempts, error: job.error });
          return job;
        }
        job = this.state.repos.job(jobId)!;
        job.status = 'retrying'; job.error = String(e);
        this.state.repos.saveJob(job);
        const ms = RETRY_BACKOFF_MS[Math.min(attempt, RETRY_BACKOFF_MS.length - 1)];
        await new Promise(r => setTimeout(r, ms));
        job = this.state.repos.job(jobId)!;
        job.status = 'running';
      }
    }
    return job;
  }
}