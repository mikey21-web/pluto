export interface StripeAdapter {
  createCustomer(email: string, name: string): Promise<{id: string}>;
  createPaymentIntent(amountCents: number, currency: string, customerId: string): Promise<{id: string; clientSecret: string; status: string}>;
  getPaymentIntent(id: string): Promise<{id: string; status: string; amount: number}>;
  createSubscription(customerId: string, priceId: string): Promise<{id: string; status: string}>;
  cancelSubscription(subscriptionId: string): Promise<boolean>;
  listInvoices(customerId: string): Promise<Array<{id: string; amount: number; status: string; date: string}>>;
}

export function createStubStripeAdapter(): StripeAdapter {
  return {
    async createCustomer(email, name) { return { id: `cus_stub_${Date.now()}` }; },
    async createPaymentIntent(amountCents, currency, customerId) {
      const id = `pi_stub_${Date.now()}`;
      return { id, clientSecret: `${id}_secret`, status: 'succeeded' };
    },
    async getPaymentIntent(id) { return { id, status: 'succeeded', amount: 0 }; },
    async createSubscription(customerId, priceId) { return { id: `sub_stub_${Date.now()}`, status: 'active' }; },
    async cancelSubscription(_id) { return true; },
    async listInvoices(_customerId) { return []; },
  };
}

export function createStripeAdapter(config: { secretKey: string }): StripeAdapter {
  const base = 'https://api.stripe.com/v1';
  const auth = `Basic ${Buffer.from(config.secretKey + ':').toString('base64')}`;

  async function req(path: string, method = 'GET', params?: Record<string, string>): Promise<any> {
    const body = params ? new URLSearchParams(params).toString() : undefined;
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        Authorization: auth,
        ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      },
      body,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Stripe ${res.status}: ${(data as any).error?.message}`);
    return data;
  }

  return {
    async createCustomer(email, name) {
      return req('/customers', 'POST', { email, name });
    },
    async createPaymentIntent(amountCents, currency, customerId) {
      const d = await req('/payment_intents', 'POST', {
        amount: String(amountCents), currency, customer: customerId,
      });
      return { id: d.id, clientSecret: d.client_secret, status: d.status };
    },
    async getPaymentIntent(id) {
      const d = await req(`/payment_intents/${id}`);
      return { id: d.id, status: d.status, amount: d.amount };
    },
    async createSubscription(customerId, priceId) {
      const d = await req('/subscriptions', 'POST', { customer: customerId, 'items[0][price]': priceId });
      return { id: d.id, status: d.status };
    },
    async cancelSubscription(subscriptionId) {
      await req(`/subscriptions/${subscriptionId}`, 'DELETE');
      return true;
    },
    async listInvoices(customerId) {
      const d = await req(`/invoices?customer=${customerId}`);
      return (d.data ?? []).map((inv: any) => ({
        id: inv.id, amount: inv.amount_due, status: inv.status,
        date: new Date(inv.created * 1000).toISOString(),
      }));
    },
  };
}
