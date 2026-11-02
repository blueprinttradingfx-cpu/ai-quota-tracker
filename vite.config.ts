import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv } from 'vite';
import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { handle, resolveServerEnv, type ServerEnv } from './src/connect/server';

const ENV_FILES = ['.env', '.env.local', '.env.development', '.env.development.local'];

/** Serves POST /api/connect during `npm run dev`, using the same code as the Vercel function. */
function devApi(): Plugin {
  let serverEnv: ServerEnv = {};
  return {
    name: 'dev-api-connect',
    configResolved(config) {
      const dir = config.envDir || config.root;
      // Variables from the env files win; variables exported in the shell are the fallback.
      serverEnv = resolveServerEnv({ ...process.env, ...loadEnv(config.mode, dir, '') });
      const found = ENV_FILES.filter((f) => existsSync(join(dir, f)));
      const key = serverEnv.ANTIGRAVITY_OAUTH_CLIENT_SECRET;
      console.info(
        key
          ? `[quota-tracker] Google sign-in: ANTIGRAVITY_OAUTH_CLIENT_SECRET found (${key.length} characters).`
          : `[quota-tracker] Google sign-in: ANTIGRAVITY_OAUTH_CLIENT_SECRET NOT found. Looked in ${dir} for ${ENV_FILES.join(', ')}; ` +
              `${found.length ? `existing: ${found.join(', ')}` : 'none of them exist'}. The file must be named .env.local, with the leading dot.`,
      );
    },
    configureServer(server) {
      server.middlewares.use('/api/connect', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        let raw = '';
        req.on('data', (c) => (raw += c));
        req.on('end', async () => {
          let body: unknown = null;
          try {
            body = JSON.parse(raw);
          } catch {
            /* handled by handle() */
          }
          const reply = await handle(body, undefined, undefined, serverEnv);
          res.statusCode = reply.status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(reply.body));
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devApi()],
  // OpenAI only redirects Codex sign-ins to localhost:1455, and Google accepts any local port, so 1455 serves every provider.
  server: { port: 1455, strictPort: true },
  test: { environment: 'node' },
});
