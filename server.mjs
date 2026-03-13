import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApiRequestHandler } from './server/apiRouter.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist');

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

const parseEnvFile = (filename) => {
  const fullPath = path.join(rootDir, filename);
  if (!existsSync(fullPath)) {
    return;
  }

  const content = readFileSync(fullPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
};

parseEnvFile('.env');
parseEnvFile('.env.local');

const apiHandler = createApiRequestHandler(process.env);

const serveFile = async (res, filePath) => {
  const extension = path.extname(filePath).toLowerCase();
  const contentType = contentTypes[extension] || 'application/octet-stream';

  res.statusCode = 200;
  res.setHeader('Content-Type', contentType);
  createReadStream(filePath).pipe(res);
};

const server = http.createServer(async (req, res) => {
  const handled = await apiHandler(req, res);
  if (handled) {
    return;
  }

  const requestUrl = new URL(req.url || '/', 'http://localhost');
  const normalizedPath = decodeURIComponent(
    requestUrl.pathname === '/' ? 'index.html' : requestUrl.pathname.replace(/^\/+/, ''),
  );
  const candidatePath = path.join(distDir, normalizedPath);

  try {
    const fileStat = await stat(candidatePath);
    if (fileStat.isFile()) {
      await serveFile(res, candidatePath);
      return;
    }
  } catch {
    // Fall through to SPA entry.
  }

  await serveFile(res, path.join(distDir, 'index.html'));
});

const port = Number(process.env.PORT || 4173);

server.listen(port, '0.0.0.0', () => {
  console.log(`青网站本地服务器已启动：http://localhost:${port}`);
});
