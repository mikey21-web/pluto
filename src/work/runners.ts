import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';

export interface RunnerResult { ok: boolean; output: string; error?: string }

export class ToolRunner {
  constructor(private cfg: { shellEnabled?: boolean; llmApiKey?: string; llmModel?: string } = {}) {}

  async shell(cmd: string, cwd?: string): Promise<RunnerResult> {
    if (!this.cfg.shellEnabled) {
      console.log('[runners:shell stub]', cmd);
      return { ok: true, output: `[stub] would run: ${cmd}` };
    }
    return new Promise((resolve) => {
      const [bin, ...args] = cmd.split(' ');
      const proc = spawn(bin, args, { cwd, shell: true });
      let out = ''; let err = '';
      proc.stdout.on('data', (d: Buffer) => { out += d.toString(); });
      proc.stderr.on('data', (d: Buffer) => { err += d.toString(); });
      const timer = setTimeout(() => { proc.kill(); resolve({ ok: false, output: out, error: 'timeout' }); }, 30_000);
      proc.on('close', (code) => {
        clearTimeout(timer);
        resolve(code === 0 ? { ok: true, output: out } : { ok: false, output: out, error: err || `exit ${code}` });
      });
    });
  }

  async http(url: string, method = 'GET', body?: unknown): Promise<RunnerResult> {
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      return res.ok ? { ok: true, output: text } : { ok: false, output: text, error: `HTTP ${res.status}` };
    } catch (e) {
      return { ok: false, output: '', error: String(e) };
    }
  }

  async file(op: 'read' | 'write', path: string, content?: string): Promise<RunnerResult> {
    try {
      if (op === 'read') {
        const text = await fs.readFile(path, 'utf8');
        return { ok: true, output: text };
      }
      await fs.writeFile(path, content ?? '', 'utf8');
      return { ok: true, output: '' };
    } catch (e) {
      return { ok: false, output: '', error: String(e) };
    }
  }

  async llm(prompt: string, systemPrompt?: string): Promise<RunnerResult> {
    const key = this.cfg.llmApiKey;
    if (!key) return { ok: true, output: '[stub LLM response]' };
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.cfg.llmModel ?? 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          ...(systemPrompt ? { system: systemPrompt } : {}),
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data: any = await res.json();
      if (!res.ok) return { ok: false, output: '', error: data.error?.message ?? `HTTP ${res.status}` };
      return { ok: true, output: data.content?.[0]?.text ?? '' };
    } catch (e) {
      return { ok: false, output: '', error: String(e) };
    }
  }
}

export function makeToolRunner(config?: { shellEnabled?: boolean; llmApiKey?: string; llmModel?: string }): ToolRunner {
  return new ToolRunner(config);
}
