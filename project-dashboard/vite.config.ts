import { sites } from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import vinext from 'vinext';
import { defineConfig, type Plugin } from 'vite';
import hostingConfig from './.openai/hosting.json';

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  '00000000-0000-4000-8000-000000000000';

const { d1, r2 } = hostingConfig;

function localBoardApi(): Plugin {
  const boardPath = path.resolve('data/board.json');

  return {
    name: 'local-board-api',
    configureServer(server) {
      server.middlewares.use('/api/board', async (request, response) => {
        try {
          response.setHeader('Content-Type', 'application/json; charset=utf-8');

          if (request.method === 'GET') {
            response.end(await fs.readFile(boardPath, 'utf8'));
            return;
          }

          if (request.method !== 'PUT') {
            response.statusCode = 405;
            response.end(JSON.stringify({ error: 'method not allowed' }));
            return;
          }

          let body = '';
          for await (const chunk of request) {
            body += chunk;
            if (body.length > 1_000_000) {
              response.statusCode = 413;
              response.end(JSON.stringify({ error: 'board is too large' }));
              return;
            }
          }

          const board = JSON.parse(body) as { columns?: unknown[] };
          if (!Array.isArray(board.columns)) {
            response.statusCode = 400;
            response.end(JSON.stringify({ error: 'invalid board' }));
            return;
          }

          const temporaryPath = `${boardPath}.tmp`;
          await fs.writeFile(
            temporaryPath,
            `${JSON.stringify(board, null, 2)}\n`,
            'utf8',
          );
          await fs.rename(temporaryPath, boardPath);
          response.end(JSON.stringify({ ok: true }));
        } catch {
          response.statusCode = 400;
          response.end(JSON.stringify({ error: 'invalid board request' }));
        }
      });
    },
  };
}

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

const localBindingConfig = {
  main: 'vinext/server/fetch-handler',
  compatibility_flags: ['nodejs_compat'],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: 'site-creator-d1',
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: 'site-creator-r2',
        },
      ]
    : [],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import('@cloudflare/vite-plugin');

  return {
    css: { postcss: { plugins: [tailwindcss()] } },
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      localBoardApi(),
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
        config: localBindingConfig,
      }),
    ],
  };
});
