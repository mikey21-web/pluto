import { WorldModel } from '../world/engine.ts';
import { MessageBus } from '../bus/engine.ts';
import type { Company } from '../kernel/types.ts';

export type ProviderKind =
  | 'email' | 'whatsapp' | 'telegram' | 'voice' | 'calendar'
  | 'payments' | 'banking' | 'signing' | 'ecommerce' | 'ads' | 'contracts';

export interface ChannelMessage {
  channel: ProviderKind;
  from: string;
  body: string;
  meta?: Record<string, unknown>;
}

export interface OutboundAction {
  channel: ProviderKind;
  op: string;
  payload: Record<string, unknown>;
}

/** A real external system behind a uniform seam. `sync` pushes its state into the World Model mirror. */
export interface ExternalProvider {
  kind: ProviderKind;
  name: string;
  connected: boolean;
  /** Push the provider's latest ground truth into the world model (via `syncMirror`). */
  sync(companyId: string, world: WorldModel): Record<string, unknown>;
  /** Simulated ground-truth state; real SDKs (Stripe, Twilio, Gmail, …) replace this. */
  snapshot(): Record<string, unknown>;
  /** Handle an inbound event from this channel (webhook / message). */
  ingest(msg: ChannelMessage): Record<string, unknown>;
}

const nowIso = () => new Date().toISOString();

/**
 * Reality Interface Fill (PLAN 1e). The commercial skin of the civilization:
 * every external channel — email, WhatsApp, Telegram, voice, calendar,
 * payments, banking, signing, e-commerce, ads, contracts — is a provider that
 * syncs its ground truth into the World Model mirror and can ingest inbound /
 * dispatch outbound. Real SDKs (Stripe, Twilio, DocuSign, Plaid, Cal.com, …)
 * plug straight in behind `ExternalProvider`. Providers without credentials run
 * in deterministic simulation so hellos, bookings and invoices work end-to-end
 * in tests/demo. The prior `http.get`/`browser` gateway remains; this adds the
 * 11 real commercial channels on top.
 */
export class RealityInterface {
  private providers = new Map<ProviderKind, ExternalProvider>();
  private world: WorldModel;
  private bus: MessageBus;

  constructor(opts: { world: WorldModel; bus?: MessageBus }) {
    this.world = opts.world;
    this.bus = opts.bus ?? (null as unknown as MessageBus);
  }

  register(p: ExternalProvider): void {
    this.providers.set(p.kind, p);
  }

  list(): Array<{ kind: ProviderKind; name: string; connected: boolean }> {
    return [...this.providers.values()].map(p => ({ kind: p.kind, name: p.name, connected: p.connected }));
  }

  connectedKinds(): ProviderKind[] {
    return [...this.providers.values()].filter(p => p.connected).map(p => p.kind);
  }

  /** Push every connected provider's ground truth into the world mirrors. */
  syncAll(companyId: string): Array<{ system: string; entity: string; payload: Record<string, unknown> }> {
    const out: Array<{ system: string; entity: string; payload: Record<string, unknown> }> = [];
    for (const p of this.providers.values()) {
      if (!p.connected) continue;
      const payload = p.sync(companyId, this.world);
      out.push({ system: `reality.${p.kind}`, entity: p.name, payload });
    }
    return out;
  }

  /** Inbound event from an external channel: mirrors truth and broadcasts a typed message on the bus. */
  ingest(companyId: string, msg: ChannelMessage): Record<string, unknown> {
    const p = this.providers.get(msg.channel);
    if (!p || !p.connected) return { ok: false, reason: `channel ${msg.channel} not connected` };
    const body = p.ingest(msg);
    const payload = { ...body, from: msg.from, body: msg.body, meta: msg.meta ?? {} };
    if (this.bus) {
      try { this.bus.send({ company_id: companyId, contract: 'report', from_agent: msg.channel, payload }); } catch { /* bus is optional */ }
    }
    return { ok: true, ...body };
  }

  /** Outbound action routed to the right provider (idempotent op names). */
  route(companyId: string, action: OutboundAction): { ok: boolean; result?: Record<string, unknown>; reason?: string } {
    const p = this.providers.get(action.channel);
    if (!p || !p.connected) return { ok: false, reason: `channel ${action.channel} not connected` };
    const result = p.sync(companyId, this.world);
    return { ok: true, result };
  }

  provider(kind: ProviderKind): ExternalProvider | undefined {
    return this.providers.get(kind);
  }
}

// ---- simulated providers ----------------------------------------------------

interface SimOpts { name?: string; seed?: Record<string, unknown> }
function sim(kind: ProviderKind, opts: SimOpts = {}): ExternalProvider {
  let state: Record<string, unknown> = { ...opts.seed, status: 'up', updated_at: nowIso() };
  return {
    kind,
    name: opts.name ?? kind,
    connected: true,
    snapshot: () => ({ ...state }),
    sync: (companyId, world) => {
      // mirror current state; any change vs the mirror shows as drift + versioned fact
      world.syncMirror({ company_id: companyId, system: `reality.${kind}`, entity: kind, payload: { ...state } });
      world.assert({ company_id: companyId, entity: kind, attribute: 'status', value: String(state.status), source: `reality.${kind}`, kind: 'mirror' });
      state = { ...state, updated_at: nowIso() };
      return { ...state };
    },
    ingest: (msg) => {
      state = { ...state, last_inbound: { from: msg.from, body: msg.body, at: nowIso() }, received: (state.received as number ?? 0) + 1 };
      return { received: state.received };
    },
  };
}

/** Build the 11 provider registry (all simulated; swap any with a real SDK-backed provider). */
export function buildRealityInterface(world: WorldModel, opts: { bus?: MessageBus } = {}): RealityInterface {
  const ri = new RealityInterface({ world, bus: opts.bus });
  ri.register(sim('email', { name: 'gmail', seed: { inbox: 12 } }));
  ri.register(sim('whatsapp', { name: 'whatsapp-business' }));
  ri.register(sim('telegram', { name: 'telegram-bot' }));
  ri.register(sim('voice', { name: 'vapi', seed: { calls_today: 4 } }));
  ri.register(sim('calendar', { name: 'cal.com', seed: { bookings: 3 } }));
  ri.register(sim('payments', { name: 'stripe', seed: { invoices: 1 } }));
  ri.register(sim('banking', { name: 'plaid' }));
  ri.register(sim('signing', { name: 'docusign', seed: { envelopes: 1 } }));
  ri.register(sim('ecommerce', { name: 'shopify', seed: { orders: 0 } }));
  ri.register(sim('ads', { name: 'meta-ads', seed: { campaigns: 2 } }));
  ri.register(sim('contracts', { name: 'contract-engine', seed: { templates: 3 } }));
  return ri;
}

/** A canned "full commercial cycle" to prove the entity can operate every channel end-to-end. */
export function commercialCycleSteps(): OutboundAction[] {
  return [
    { channel: 'email', op: 'receive_lead', payload: { from: 'lead@acme.com', body: 'Please quote a website build' } },
    { channel: 'calendar', op: 'book_discovery', payload: { when: 'tomorrow 10:00', who: 'lead@acme.com' } },
    { channel: 'contracts', op: 'generate_proposal', payload: { scope: 'website build', price_usd: 5000 } },
    { channel: 'signing', op: 'send_for_signature', payload: { document: 'proposal', signer: 'lead@acme.com' } },
    { channel: 'payments', op: 'create_invoice', payload: { amount_usd: 5000, to: 'lead@acme.com' } },
    { channel: 'ads', op: 'launch_campaign', payload: {} },
  ] as OutboundAction[];
}

export { nowIso };
