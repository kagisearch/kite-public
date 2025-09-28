import { beforeAll } from 'vitest';
import { createServer, type ViteDevServer } from 'vite';
import path from 'node:path';
import process from 'node:process';

// Prefer real API for integration tests if provided via env, else fallback to local dev server
const realApiBase = process.env.KITE_REAL_API_BASE?.replace(/\/+$/, '');
process.env.VITE_API_BASE = realApiBase ? `${realApiBase}` : (process.env.VITE_API_BASE || 'http://127.0.0.1:5173/api');

// Global sentinel to avoid starting multiple dev servers across suites
const g = globalThis as unknown as Record<string, unknown> & {
  __kiteViteServer?: ViteDevServer | null;
  __kiteVitePort?: number;
  __kiteViteOwner?: boolean;
};
g.__kiteViteServer ??= null;

beforeAll(async () => {
  // If using real API, skip starting local dev server
  if (realApiBase) {
    const originalFetch = global.fetch;
    global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const baseHost = realApiBase as string;
      if (typeof input === 'string' || input instanceof URL) {
        let url = input.toString();
        if (url.startsWith('/api')) {
          url = `${baseHost}${url.replace(/^\/api/, '')}`;
        } else if (url.startsWith('/')) {
          url = `${baseHost}${url}`;
        }
        return originalFetch(url, init);
      }
      const req = input as Request;
      let absUrl = req.url;
      if (absUrl.startsWith('/api')) {
        absUrl = `${baseHost}${absUrl.replace(/^\/api/, '')}`;
      } else if (absUrl.startsWith('/')) {
        absUrl = `${baseHost}${absUrl}`;
      }
      const cloned = new Request(absUrl, req);
      return originalFetch(cloned);
    };
    return;
  }

  if (!g.__kiteViteServer) {
    const server = await createServer({
      configFile: path.resolve(process.cwd(), 'vite.config.ts'),
      server: {
        port: 5173,
        strictPort: false,
        host: '127.0.0.1',
      },
      logLevel: 'error',
    });
    await server.listen();
    const resolvedPort = (server.config.server.port ?? 5173) as number;
    g.__kiteViteServer = server;
    g.__kiteVitePort = resolvedPort;
    g.__kiteViteOwner = true;
    process.env.VITE_API_BASE = `http://127.0.0.1:${resolvedPort}/api`;

    // Rewrap fetch to absolute URL using the resolved dev server port
    const originalFetch = global.fetch;
    global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const baseHost = `http://127.0.0.1:${resolvedPort}`;
      if (typeof input === 'string' || input instanceof URL) {
        let url = input.toString();
        if (url.startsWith('/')) {
          url = `${baseHost}${url}`;
        }
        return originalFetch(url, init);
      }
      // Handle Request objects by cloning with absolute URL
      const req = input as Request;
      const absUrl = req.url.startsWith('/') ? `${baseHost}${req.url}` : req.url;
      const cloned = new Request(absUrl, req);
      return originalFetch(cloned);
    };
  } else if (g.__kiteVitePort) {
    // If already running, ensure base and fetch wrapper are aligned to existing port
    const resolvedPort = g.__kiteVitePort as number;
    process.env.VITE_API_BASE = `http://127.0.0.1:${resolvedPort}/api`;
    const originalFetch = global.fetch;
    global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const baseHost = `http://127.0.0.1:${resolvedPort}`;
      if (typeof input === 'string' || input instanceof URL) {
        let url = input.toString();
        if (url.startsWith('/')) {
          url = `${baseHost}${url}`;
        }
        return originalFetch(url, init);
      }
      const req = input as Request;
      const absUrl = req.url.startsWith('/') ? `${baseHost}${req.url}` : req.url;
      const cloned = new Request(absUrl, req);
      return originalFetch(cloned);
    };
  }
});
// Note: We intentionally do not close the dev server to avoid races between suites