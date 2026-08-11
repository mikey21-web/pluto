import { PlutoState } from '../kernel/state.ts';
import { EventBus } from '../events/bus.ts';
import type { Message } from '../kernel/types.ts';

/** P3 (PLAN 1b) typed message contracts. */
export const CONTRACTS = [
  'request', 'offer', 'delegate', 'dispute', 'clarify', 'report', 'escalate', 'confess',
] as const;
export type Contract = (typeof CONTRACTS)[number];

export interface BusMessage extends Message {
  contract: Contract;
}

export type BusHandler = (m: BusMessage) => void | Promise<void>;

function channelOf(m: Message): string | null {
  const v = (m.payload as Record<string, unknown> | undefined)?.['__channel'];
  return typeof v === 'string' ? v : null;
}

/**
 * P3 Message Bus (PLAN 1b). Typed agent-to-agent messaging on top of the
 * durable `messages` table + the EventBus. Provides contract validation,
 * routing (to agent/department + subscribable contracts), a reference
 * negotiation protocol, message-driven triggering, compartmentalized private
 * channels, and the Confessional (private uncertainty flagging).
 */
export class MessageBus {
  private state: PlutoState;
  private events: EventBus;
  private subs: Array<{ contract?: Contract; channel?: string; handler: BusHandler }> = [];

  constructor(state: PlutoState, events: EventBus) {
    this.state = state;
    this.events = events;
  }

  /** Subscribe to a contract (optional) and/or a private channel. */
  subscribe(opts: { contract?: Contract; channel?: string; handler: BusHandler }): this {
    this.subs.push(opts);
    return this;
  }

  private deliver(m: BusMessage): void {
    const ch = channelOf(m);
    for (const s of this.subs) {
      if (s.channel && s.channel !== ch) continue;
      if (s.contract && s.contract !== m.contract) continue;
      try { void s.handler(m); } catch { /* isolated */ }
    }
  }

  send(c: {
    company_id: string;
    contract: Contract;
    from_agent: string;
    to_agent?: string | null;
    to_department?: string | null;
    payload?: Record<string, unknown>;
    channel?: string;
  }): BusMessage {
    const m = this.state.repos.sendMessage({
      company_id: c.company_id, contract: c.contract, from_agent: c.from_agent,
      to_agent: c.to_agent ?? null, to_department: c.to_department ?? null,
      payload: { ...(c.payload ?? {}), ...(c.channel ? { __channel: c.channel } : {}) },
    });
    this.events.publish(c.company_id, `msg.${c.contract}`, m.id, 'message', {
      from: c.from_agent, to: c.to_agent ?? c.to_department ?? null, contract: c.contract, channel: c.channel ?? null,
    });
    const bus = m as BusMessage;
    this.deliver(bus);
    return bus;
  }

  // ---- negotiation reference implementation ---------------------------------

  /** Open a negotiation with an offer describing what is on the table and for what. */
  offer(c: { company_id: string; from_agent: string; to_agent: string; what: string; for_: string; alternatives?: string[]; channel?: string }) {
    return this.send({
      company_id: c.company_id, contract: 'offer', from_agent: c.from_agent, to_agent: c.to_agent,
      channel: c.channel,
      payload: { what: c.what, for: c.for_, alternatives: c.alternatives ?? [], status: 'pending' },
    });
  }

  /** Accept an offer → reports acceptance and issues a delegate message back. */
  acceptOffer(c: { company_id: string; from_agent: string; to_agent: string; offer_payload: Record<string, unknown> }) {
    this.send({ company_id: c.company_id, contract: 'report', from_agent: c.from_agent, to_agent: c.to_agent, payload: { ...c.offer_payload, status: 'accepted' } });
    return this.send({ company_id: c.company_id, contract: 'delegate', from_agent: c.from_agent, to_agent: c.to_agent, payload: { what: c.offer_payload.what, outcome: c.offer_payload.for } });
  }

  /** Reject an offer with a reason. */
  rejectOffer(c: { company_id: string; from_agent: string; to_agent: string; offer_payload: Record<string, unknown>; reason: string }) {
    return this.send({ company_id: c.company_id, contract: 'report', from_agent: c.from_agent, to_agent: c.to_agent, payload: { ...c.offer_payload, status: 'rejected', reason: c.reason } });
  }

  // ---- Confessional (silent-competence: private self-doubt) -----------------

  /** Private uncertainty flagging; never routed through normal channels. */
  confess(c: { company_id: string; from_agent: string; about: string; doubt: string; observer?: string }): BusMessage {
    return this.send({
      company_id: c.company_id, contract: 'confess', from_agent: c.from_agent,
      to_agent: null, to_department: null,
      channel: c.observer ?? '__confessional',
      payload: { about: c.about, doubt: c.doubt, confidential: true },
    });
  }

  // ---- queries (persistent log) ----------------------------------------------

  log(companyId: string, opts: { contract?: Contract; channel?: string; limit?: number } = {}): BusMessage[] {
    let ms = this.state.repos.messages(companyId, opts.limit ?? 100) as BusMessage[];
    if (opts.contract) ms = ms.filter(m => m.contract === opts.contract);
    if (opts.channel) ms = ms.filter(m => channelOf(m) === opts.channel);
    return ms;
  }
}
