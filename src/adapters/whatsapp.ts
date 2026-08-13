export interface WhatsAppAdapter {
  sendText(to: string, message: string): Promise<{id: string}>;
  sendTemplate(to: string, template: string, params: string[]): Promise<{id: string}>;
  sendMedia(to: string, mediaUrl: string, caption?: string): Promise<{id: string}>;
}

export function createStubWhatsAppAdapter(): WhatsAppAdapter {
  return {
    async sendText(to, message) {
      console.log(`[whatsapp stub] to=${to}: ${message}`);
      return { id: `stub-wa-${Date.now()}` };
    },
    async sendTemplate(to, template, params) {
      console.log(`[whatsapp stub] template to=${to} template=${template}`, params);
      return { id: `stub-wa-${Date.now()}` };
    },
    async sendMedia(to, mediaUrl, caption) {
      console.log(`[whatsapp stub] media to=${to} url=${mediaUrl} caption=${caption}`);
      return { id: `stub-wa-${Date.now()}` };
    },
  };
}

export function createWhatsAppAdapter(config: { accessToken: string; phoneNumberId: string }): WhatsAppAdapter {
  const base = `https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`;

  async function post(body: unknown): Promise<{id: string}> {
    const res = await fetch(base, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data: any = await res.json();
    if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${data.error?.message}`);
    return { id: data.messages?.[0]?.id ?? `wa-${Date.now()}` };
  }

  return {
    async sendText(to, message) {
      return post({ messaging_product: 'whatsapp', to, type: 'text', text: { body: message } });
    },
    async sendTemplate(to, template, params) {
      return post({
        messaging_product: 'whatsapp', to, type: 'template',
        template: {
          name: template, language: { code: 'en' },
          components: params.length ? [{
            type: 'body',
            parameters: params.map(p => ({ type: 'text', text: p })),
          }] : [],
        },
      });
    },
    async sendMedia(to, mediaUrl, caption) {
      return post({
        messaging_product: 'whatsapp', to, type: 'image',
        image: { link: mediaUrl, ...(caption ? { caption } : {}) },
      });
    },
  };
}
