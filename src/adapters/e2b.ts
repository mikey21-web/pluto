// INSTALL: npm install e2b
export interface E2BAdapter {
  runCode(code: string, language?: 'python' | 'javascript'): Promise<{ stdout: string; stderr: string; error?: string }>;
  uploadFile(path: string, content: string): Promise<void>;
  downloadFile(path: string): Promise<string>;
}

export function makeE2BAdapter(apiKey?: string): E2BAdapter {
  if (apiKey) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Sandbox } = require('e2b');
      return {
        async runCode(code, language = 'python') {
          const sbx = await Sandbox.create({ apiKey });
          try {
            const result = language === 'python'
              ? await sbx.runCode(code)
              : await sbx.runCode(code, { language: 'js' });
            return { stdout: result.stdout ?? '', stderr: result.stderr ?? '', error: result.error?.value };
          } finally { await sbx.kill(); }
        },
        async uploadFile(path, content) {
          const sbx = await Sandbox.create({ apiKey });
          try { await sbx.files.write(path, content); } finally { await sbx.kill(); }
        },
        async downloadFile(path) {
          const sbx = await Sandbox.create({ apiKey });
          try { return await sbx.files.read(path); } finally { await sbx.kill(); }
        },
      };
    } catch { console.warn('[E2B] e2b package not installed, using stub'); }
  }

  return {
    async runCode(code, language = 'python') {
      console.log(`[E2B stub] runCode (${language}): ${code.slice(0, 80)}`);
      return { stdout: '', stderr: '' };
    },
    async uploadFile(path, content) { console.log(`[E2B stub] uploadFile ${path} (${content.length}b)`); },
    async downloadFile(path) { console.log(`[E2B stub] downloadFile ${path}`); return ''; },
  };
}
