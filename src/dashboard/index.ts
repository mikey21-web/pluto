export { getDashboardHTML } from './html.ts';

import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { getDashboardHTML } from './html.ts';

export function serveDashboard(port = 4000): void {
  const API_PORT = 3000;
  const apiBase = `http://localhost:${API_PORT}`;

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = req.url ?? '/';

    // Proxy /api/* → localhost:3000/*
    if (url.startsWith('/api/')) {
      const target = `http://localhost:${API_PORT}${url.slice(4)}`;
      try {
        const chunks: Buffer[] = [];
        await new Promise<void>((resolve, reject) => {
          req.on('data', (c: Buffer) => chunks.push(c));
          req.on('end', resolve);
          req.on('error', reject);
        });
        const body = chunks.length ? Buffer.concat(chunks) : undefined;
        const upstream = await fetch(target, {
          method: req.method,
          headers: Object.fromEntries(
            Object.entries(req.headers as Record<string, string | string[]>)
              .map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
              .filter(([k]) => k !== 'host')
          ),
          body: body?.length ? body : undefined,
        });
        const data = await upstream.arrayBuffer();
        res.writeHead(upstream.status, {
          'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
        });
        res.end(Buffer.from(data));
      } catch (e) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'proxy error', detail: String(e) }));
      }
      return;
    }

    // Serve dashboard
    const html = getDashboardHTML(apiBase);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });

  server.listen(port, () => {
    console.log(`[dashboard] http://localhost:${port}  (API proxy → localhost:${API_PORT})`);
  });
}
