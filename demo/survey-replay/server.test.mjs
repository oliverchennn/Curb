import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createReplayServer } from './serve.mjs';

const base = '/survey-replay/';
const video = base + 'media/sidewalk-survey.mp4';

async function start(t, directory) {
  const server = await createReplayServer(directory);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  return server.address().port;
}

function get(port, path, { method = 'GET', range } = {}) {
  const headers = range === undefined ? {} : { range };
  return new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path, method, headers, agent: false }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('error', reject);
      response.on('end', () => resolve({
        status: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks),
      }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('serves canonical files and redirects only the replay entry points', async t => {
  const port = await start(t);
  for (const [path, contentType] of [[base, 'text/html'], [base + 'index.html', 'text/html'],
    [base + 'survey.json', 'application/json'], [base + 'app.mjs', 'text/javascript'],
    [base + 'styles.css', 'text/css'], [base + 'media/survey-poster.jpg', 'image/jpeg']]) {
    const response = await get(port, path);
    assert.equal(response.status, 200, path);
    assert.ok(response.headers['content-type'].startsWith(contentType), path);
    assert.ok(response.body.length > 0, path);
  }
  for (const path of ['/', '/survey-replay']) {
    const response = await get(port, path);
    assert.equal(response.status, 302);
    assert.equal(response.headers.location, base);
  }
  assert.equal((await get(port, base, { method: 'POST' })).status, 405);
  assert.equal((await get(port, base + '%GG')).status, 400);
  for (const path of ['/survey.json', base + '.git/config', base + 'survey.json%00', base + 'media/../survey.json',
    base + '%2e%2e/survey.json', base + 'media%5c..%5csurvey.json', base + 'media//missing.mp4']) {
    assert.equal((await get(port, path)).status, 404, path);
  }
});

test('handles MP4 HEAD and bounded, suffix and open ranges with exact byte lengths', async t => {
  const port = await start(t);
  const head = await get(port, video, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.headers['content-type'], 'video/mp4');
  assert.equal(head.headers['accept-ranges'], 'bytes');
  assert.equal(head.body.length, 0);
  const size = Number(head.headers['content-length']);
  assert.ok(size > 12);
  for (const [range, start, end] of [['bytes=0-11', 0, 11], ['bytes=-12', size - 12, size - 1],
    ['bytes=' + (size - 12) + '-', size - 12, size - 1], ['bytes=0-9999999999999999999999', 0, size - 1]]) {
    const response = await get(port, video, { range });
    assert.equal(response.status, 206);
    assert.equal(response.headers['content-range'], 'bytes ' + start + '-' + end + '/' + size);
    assert.equal(response.body.length, end - start + 1);
    if (start === 0) assert.equal(response.body.toString('ascii', 4, 8), 'ftyp');
  }
  const partialHead = await get(port, video, { method: 'HEAD', range: 'bytes=0-11' });
  assert.equal(partialHead.status, 206);
  assert.equal(partialHead.headers['content-length'], '12');
  assert.equal(partialHead.body.length, 0);
  for (const range of ['garbage', '', 'bytes=-', 'bytes=-0', 'bytes=8-2', 'bytes=0-1,2-3',
    'bytes=' + size + '-', 'bytes=9999999999999999999999-']) {
    const response = await get(port, video, { range });
    assert.equal(response.status, 416, range);
    assert.equal(response.headers['content-range'], 'bytes */' + size);
    assert.equal(response.body.length, 0);
  }
});

test('checks where media junctions resolve at the filesystem boundary', async t => {
  const temp = await mkdtemp(join(tmpdir(), 'curb-replay-test-'));
  const root = join(temp, 'replay');
  const media = join(root, 'media');
  await mkdir(media, { recursive: true });
  const outside = join(temp, 'outside');
  const other = join(root, 'unpublished');
  const nested = join(media, 'nested');
  for (const directory of [outside, other, nested]) {
    await mkdir(directory);
    await writeFile(join(directory, 'asset.jpg'), 'fixture photo bytes');
  }
  const linkType = process.platform === 'win32' ? 'junction' : 'dir';
  await symlink(outside, join(media, 'outside'), linkType);
  await symlink(other, join(media, 'unpublished'), linkType);
  await symlink(nested, join(media, 'local'), linkType);
  const port = await start(t, root);
  try {
    for (const name of ['outside', 'unpublished']) {
      assert.equal((await get(port, base + 'media/' + name + '/asset.jpg')).status, 404);
    }
    assert.equal((await get(port, base + 'media/local/asset.jpg')).body.toString(), 'fixture photo bytes');
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
