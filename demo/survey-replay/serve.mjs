import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const replayRoot = fileURLToPath(new URL('../../public/survey-replay/', import.meta.url));
const prefix = '/survey-replay/';
const pages = new Map([
  ['index.html', 'text/html; charset=utf-8'],
  ['styles.css', 'text/css; charset=utf-8'],
  ['app.mjs', 'text/javascript; charset=utf-8'],
  ['graph.mjs', 'text/javascript; charset=utf-8'],
  ['survey.json', 'application/json'],
]);
const mediaTypes = new Map([
  ['.mp4', 'video/mp4'],
  ['.webm', 'video/webm'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
]);

function inside(directory, file) {
  const path = relative(directory, file);
  return path !== '' && path !== '..' && !path.startsWith('..' + sep) && !isAbsolute(path);
}

function rangeBounds(range, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match || (!match[1] && !match[2]) || size === 0) return null;

  const length = BigInt(size);
  const lower = match[1] ? BigInt(match[1]) : length - BigInt(match[2]);
  const upper = match[1] && match[2] ? BigInt(match[2]) : length - 1n;
  const start = lower < 0n ? 0n : lower;
  const end = upper >= length ? length - 1n : upper;
  return start <= end ? { start: Number(start), end: Number(end) } : null;
}

export async function createReplayServer(directory = replayRoot) {
  const root = await realpath(directory);
  const mediaRoot = resolve(root, 'media');
  return createServer(async (request, response) => {
    const fail = status => response.writeHead(status).end();
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return response.writeHead(405, { allow: 'GET, HEAD' }).end();
    }
    let pathname;
    try {
      // Check the raw path before a URL parser can normalize dot segments.
      pathname = decodeURIComponent(request.url.split('?', 1)[0]);
    } catch {
      return fail(400);
    }
    if (pathname === '/favicon.ico') return fail(204);
    if (pathname === '/' || pathname === '/survey-replay') {
      return response.writeHead(302, { location: prefix }).end();
    }
    if (!pathname.startsWith(prefix)) return fail(404);
    const path = pathname.slice(prefix.length) || 'index.html';
    const media = /^media\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.[a-z0-9]+$/i.test(path);
    const type = media ? mediaTypes.get(extname(path).toLowerCase()) : pages.get(path);
    if (!type) return fail(404);

    let file;
    let size;
    try {
      file = await realpath(resolve(root, path));
      if (!inside(media ? mediaRoot : root, file)) return fail(404);
      const entry = await stat(file);
      if (!entry.isFile()) return fail(404);
      size = entry.size;
    } catch {
      return fail(404);
    }

    const headers = {
      'content-type': type,
      'accept-ranges': 'bytes',
      'cache-control': 'no-store',
    };
    let start = 0;
    let end = size - 1;
    let status = 200;
    const range = request.headers.range;
    if (range !== undefined) {
      const bounds = rangeBounds(range, size);
      if (!bounds) {
        return response.writeHead(416, { ...headers, 'content-range': 'bytes */' + size }).end();
      }
      ({ start, end } = bounds);
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
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.argv[2] ?? 8742);
  const server = await createReplayServer();
  server.listen(port, '127.0.0.1', () => {
    console.log('Survey replay: http://127.0.0.1:' + server.address().port + prefix);
  });
}
