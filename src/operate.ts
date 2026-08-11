import { createRuntime, formOrganization } from './runtime.ts';
import type { PlutoRuntime } from './runtime.ts';
import { buildToolFabric, fsTools, httpTool } from './tools/fabric.ts';

const DATA_DIR = process.env.PLUTO_DATA_DIR ?? './data';
const MISSION = process.env.PLUTO_MISSION ?? 'Operator: keep the company moving toward its mission.';
const HEARTBEAT_MS = Number(process.env.PLUTO_OP_HEARTBEAT_MS ?? 60_000);
const TICK_MS = Number(process.env.PLUTO_OP_TICK_MS ?? 2_000);
const IDLE_MS = Number(process.env.PLUTO_OP_IDLE_MS ?? 500);

/**
 * Continuous Operator Mode (§25 §7.10): an event-driven daemon that keeps draining
 * queued work across every company. Survives restarts because all state is durable;
 * a crashed tick leaves tasks QUEUED and the next tick re-picks them.
 */
export class Operator {
  private r: PlutoRuntime;
  private stopped = false;
  private tick = 0;
  private lastHeartbeat = 0;

  constructor(r: PlutoRuntime) {
    this.r = r;
  }

  async runForever(ticks = Number.POSITIVE_INFINITY): Promise<void> {
    console.log(`[operator] started — tick=${TICK_MS}ms heartbeat=${HEARTBEAT_MS}ms`);
    while (!this.stopped && this.tick < ticks) {
      this.tick++;
      const started = Date.now();
      const worked = await this.drainOnce();
      console.log(
        `[operator] tick #${this.tick} — drained ${worked} items (${Date.now() - started}ms)`,
      );

      if (Date.now() - this.lastHeartbeat > HEARTBEAT_MS) {
        this.lastHeartbeat = Date.now();
        const alive = this.r.state.repos.companies().length;
        console.log(`[operator] heartbeat — ${alive} companies alive · uptime tick=${this.tick}`);
      }

      if (worked > 0) continue; // keep hot while there is work
      await new Promise(res => setTimeout(res, TICK_MS));
    }
    console.log('[operator] stopped.');
  }

  stop(): void {
    this.stopped = true;
    this.r.state.close();
  }

  /** One drain pass: run all runnable QUEUED/retrying tasks across companies. */
  private async drainOnce(): Promise<number> {
    let worked = 0;
    const companies = this.r.state.repos.companies();
    for (const c of companies) {
      const runnable = this.r.state.repos
        .tasks(c.id)
        .filter(t => t.status === 'QUEUED' || t.status === 'PENDING');

      for (const t of runnable) {
        try {
          const res = await this.r.workforce.run(t.id);
          worked++;
          console.log(`[operator] ${t.kind}:${t.id} → ${res.ok ? 'ok' : `fail — ${res.message}`}`);
        } catch (e) {
          console.log(`[operator] ${t.id} threw — ${String(e)}`);
        }
      }
    }
    return worked;
  }
}

/** Bootstrap a company if the mission hasn't been formed yet. */
async function main(): Promise<void> {
  const tools = [...buildToolFabric(), httpTool(), ...fsTools('./data/workspace')];
  const r = createRuntime(DATA_DIR, 'PLUTO HQ', MISSION, tools);

  const companies = r.state.repos.companies();
  if (!companies.some(c => c.name === MISSION)) {
    const { cascades } = formOrganization(r, MISSION);
    if (cascades.length) console.log(`[operator] formed organization — ${cascades.length} department objectives`);
  }

  const op = new Operator(r);
  const onSig = () => { console.log('\n[operator] signal received, shutting down…'); op.stop(); process.exit(0); };
  process.on('SIGINT', onSig);
  process.on('SIGTERM', onSig);

  try {
    await op.runForever();
  } finally {
    try { op.stop(); } catch { /* already closed */ }
  }
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file://').href) {
  main().catch(e => { console.error(e); process.exit(1); });
}