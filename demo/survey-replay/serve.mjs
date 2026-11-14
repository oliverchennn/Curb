import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { extname, resolve, sep } from 'node:path';

const root = fileURLToPath(new URL('../../public/survey-replay/', import.meta.url)).replace(/\/$/, '');
const types = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.css', 'text/css; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'], ['.json', 'application/json'],
  ['.mp4', 'video/mp4'], ['.jpg', 'image/jpeg'], ['.png', 'image/png'],
  ['.webm', 'video/webm'], ['.webp', 'image/webp'],
]);
const port = Number(process.argv[2] ?? 8742);
const server = createServer(async (request, response) => {
  const fail = status => response.writeHead(status).end();
  if (!['GET', 'HEAD'].includes(request.method)) return fail(405);
  let path;
  try {
    const { pathname } = new URL(request.url, 'http://localhost');
    if (pathname === '/favicon.ico') return fail(204);
    if (pathname === '/survey-replay') {
      return response.writeHead(302, { location: '/survey-replay/' }).end();
    }
    path = decodeURIComponent(pathname.replace(/^\/survey-replay\//, '/'));
  } catch {
    return fail(400);
  }
  const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
  if (!file.startsWith(root + sep) || !types.has(extname(file))) return fail(404);
  let size;
  try {
    const entry = await stat(file);
    if (!entry.isFile()) return fail(404);
    size = entry.size;
  } catch {
    return fail(404);
  }
  const headers = {
    'content-type': types.get(extname(file)),
    'accept-ranges': 'bytes',
    'cache-control': 'no-store',
  };
  let start = 0;
  let end = size - 1;
  let status = 200;
  if (request.headers.range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
    if (!match || (!match[1] && !match[2])) {
      return response.writeHead(416, { 'content-range': 'bytes */' + size }).end();
    }
    if (match[1]) {
      start = Number(match[1]);
      if (match[2]) end = Math.min(end, Number(match[2]));
    } else {
      start = Math.max(0, size - Number(match[2]));
    }
    if (start > end) return response.writeHead(416, { 'content-range': 'bytes */' + size }).end();
    headers['content-range'] = 'bytes ' + start + '-' + end + '/' + size;
    status = 206;
  }
  response.writeHead(status, { ...headers, 'content-length': Math.max(0, end - start + 1) });
  if (request.method === 'HEAD' || !size) return response.end();
  const stream = createReadStream(file, { start, end });
  response.on('close', () => stream.destroy());
  stream.on('error', () => response.destroy());
  stream.pipe(response);
});
server.listen(port, '127.0.0.1', () => console.log('Survey replay: http://127.0.0.1:' + port + '/survey-replay/'));
