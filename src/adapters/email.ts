export interface EmailAdapter {
  send(to: string, subject: string, body: string, html?: string): Promise<{id: string}>;
  sendTemplate(to: string, templateId: string, vars: Record<string, string>): Promise<{id: string}>;
}

export function createStubEmailAdapter(): EmailAdapter {
  return {
    async send(to, subject, body, _html) {
      const id = `stub-email-${Date.now()}`;
      console.log(`[email stub] to=${to} subject="${subject}" body="${body.slice(0, 80)}"`);
      return { id };
    },
    async sendTemplate(to, templateId, vars) {
      const id = `stub-email-${Date.now()}`;
      console.log(`[email stub] template to=${to} templateId=${templateId}`, vars);
      return { id };
    },
  };
}

export function createEmailAdapter(config: { apiKey: string; from: string }): EmailAdapter {
  async function post(payload: unknown): Promise<{id: string}> {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`SendGrid ${res.status}: ${await res.text()}`);
    return { id: res.headers.get('x-message-id') ?? `sg-${Date.now()}` };
  }

  return {
    async send(to, subject, body, html) {
      return post({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: config.from },
        subject,
        content: [
          { type: 'text/plain', value: body },
          ...(html ? [{ type: 'text/html', value: html }] : []),
        ],
      });
    },
    async sendTemplate(to, templateId, vars) {
      return post({
        personalizations: [{ to: [{ email: to }], dynamic_template_data: vars }],
        from: { email: config.from },
        template_id: templateId,
      });
    },
  };
}
