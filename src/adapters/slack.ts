export interface SlackAdapter {
  sendMessage(channel: string, text: string): Promise<boolean>;
  sendBlock(channel: string, blocks: unknown[]): Promise<boolean>;
  uploadFile(channel: string, filename: string, content: string): Promise<boolean>;
}

export function createStubSlackAdapter(): SlackAdapter {
  return {
    async sendMessage(channel, text) { console.log(`[slack stub] #${channel}: ${text}`); return true; },
    async sendBlock(channel, blocks) { console.log(`[slack stub] #${channel} blocks:`, blocks.length); return true; },
    async uploadFile(channel, filename, _content) { console.log(`[slack stub] #${channel} file: ${filename}`); return true; },
  };
}

export function createSlackAdapter(config: { botToken: string }): SlackAdapter {
  async function post(endpoint: string, body: unknown): Promise<any> {
    const res = await fetch(`https://slack.com/api/${endpoint}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.botToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data: any = await res.json();
    if (!data.ok) throw new Error(`Slack ${endpoint} error: ${data.error}`);
    return data;
  }

  return {
    async sendMessage(channel, text) { await post('chat.postMessage', { channel, text }); return true; },
    async sendBlock(channel, blocks) { await post('chat.postMessage', { channel, blocks }); return true; },
    async uploadFile(channel, filename, content) {
      await post('files.upload', { channels: channel, filename, content });
      return true;
    },
  };
}
