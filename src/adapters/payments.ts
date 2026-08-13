import { createStripeAdapter } from './stripe.ts';

export interface PaymentsAdapter {
  charge(amountCents: number, currency: string, description: string): Promise<{id: string; status: string}>;
  refund(chargeId: string): Promise<boolean>;
  getBalance(): Promise<{available: number; pending: number; currency: string}>;
}

export function createStubPaymentsAdapter(): PaymentsAdapter {
  return {
    async charge(amountCents, currency, description) {
      return { id: `charge_stub_${Date.now()}`, status: 'succeeded' };
    },
    async refund(_chargeId) { return true; },
    async getBalance() { return { available: 0, pending: 0, currency: 'usd' }; },
  };
}

export function createPaymentsAdapter(config: { provider: 'stripe'; secretKey: string }): PaymentsAdapter {
  const stripe = createStripeAdapter({ secretKey: config.secretKey });
  const base = 'https://api.stripe.com/v1';
  const auth = `Basic ${Buffer.from(config.secretKey + ':').toString('base64')}`;

  async function req(path: string, method = 'GET', params?: Record<string, string>): Promise<any> {
    const body = params ? new URLSearchParams(params).toString() : undefined;
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { Authorization: auth, ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
      body,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Stripe ${res.status}: ${(data as any).error?.message}`);
    return data;
  }

  return {
    async charge(amountCents, currency, description) {
      const cust = await stripe.createCustomer('noreply@pluto.local', 'pluto');
      const pi = await stripe.createPaymentIntent(amountCents, currency, cust.id);
      return { id: pi.id, status: pi.status };
    },
    async refund(chargeId) {
      await req('/refunds', 'POST', { payment_intent: chargeId });
      return true;
    },
    async getBalance() {
      const d = await req('/balance');
      const avail = d.available?.[0] ?? { amount: 0, currency: 'usd' };
      const pend = d.pending?.[0] ?? { amount: 0, currency: 'usd' };
      return { available: avail.amount, pending: pend.amount, currency: avail.currency };
    },
  };
}
