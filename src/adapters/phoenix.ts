// INSTALL: npm install @arizeai/phoenix-otel @opentelemetry/sdk-node
export interface PhoenixAdapter {
  traceCall(name: string, input: unknown, fn: () => Promise<unknown>): Promise<unknown>;
  logEval(name: string, score: number, label?: string, metadata?: Record<string, unknown>): void;
  flush(): Promise<void>;
}

export function makePhoenixAdapter(endpoint?: string, projectName?: string): PhoenixAdapter {
  if (endpoint) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const phoenix = require('@arizeai/phoenix-otel');
      phoenix.register({ endpoint, project: projectName ?? 'pluto' });
      const { trace } = require('@opentelemetry/api');
      const tracer = trace.getTracer('pluto');
      return {
        async traceCall(name, input, fn) {
          return tracer.startActiveSpan(name, async (span: any) => {
            try { span.setAttribute('input', JSON.stringify(input)); return await fn(); }
            catch (e) { span.recordException(e as Error); throw e; }
            finally { span.end(); }
          });
        },
        logEval(name, score, label, metadata) {
          const span = trace.getActiveSpan();
          if (span) { span.setAttribute(`eval.${name}.score`, score); if (label) span.setAttribute(`eval.${name}.label`, label); }
          console.log('[Phoenix] logEval', { name, score, label, metadata });
        },
        async flush() { /* otel provider flushes on process exit */ },
      };
    } catch { console.warn('[Phoenix] @arizeai/phoenix-otel not installed, using stub'); }
  }

  return {
    async traceCall(_name, _input, fn) { return fn(); },
    logEval(name, score, label) { console.log(`[Phoenix stub] eval ${name}=${score}${label ? ` (${label})` : ''}`); },
    async flush() {},
  };
}
