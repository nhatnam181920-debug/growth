import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import apiRouter from './server/apiRouter.mjs';

const { createApiRequestHandler } = apiRouter as unknown as {
  createApiRequestHandler: (env: Record<string, string>) => (
    req: unknown,
    res: unknown,
  ) => Promise<boolean>;
};

const localApiDevPlugin = (env: Record<string, string>): Plugin => {
  const handler = createApiRequestHandler(env);

  return {
    name: 'local-api-dev-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          next();
          return;
        }

        void handler(req, res)
          .then((handled: boolean) => {
            if (!handled) {
              next();
            }
          })
          .catch((error: unknown) => {
          console.error('DeepSeek dev proxy failed:', error);
          if (!res.writableEnded) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: 'Local API dev proxy failed.' }));
          }
          });
      });
    },
  };
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), localApiDevPlugin(env)],
    base: './',
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
});
