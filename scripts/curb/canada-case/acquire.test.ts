import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { acquirePdf, CACHE_FILENAME, inspectPdf, main, SOURCE_REFERENCE, verifyPdf } from './acquire.ts';

const pdf = Buffer.from('%PDF-1.7\nsmall offline fixture\n%%EOF\n');
const reference = { ...SOURCE_REFERENCE, bytes: pdf.length, sha256: createHash('sha256').update(pdf).digest('hex'), pages: 2 };
const countPages = async () => 2;
const options = { reference, countPages };
async function temporary(run: (dir: string) => Promise<void>) {
  const dir = await mkdtemp(join(tmpdir(), 'canada-acquire-test-'));
  try { await run(dir); } finally { await rm(dir, { recursive: true, force: true }); }
}
function fetchPdf(body: Buffer = pdf, status = 200, contentType = 'application/pdf'): typeof fetch {
  return async () => new Response(Uint8Array.from(body), { status, headers: { 'content-type': contentType } });
}

test('inspects exact bytes and keeps verification separate from retrieval', async () => temporary(async (dir) => {
  const path = join(dir, 'source.pdf');
  await writeFile(path, pdf);
  assert.deepEqual(await inspectPdf(path, countPages), { bytes: reference.bytes, sha256: reference.sha256, pages: 2 });
  assert.deepEqual(await verifyPdf(path, options), { sourceId: reference.sourceId, url: reference.url, retrievedAt: null, bytes: pdf.length, sha256: reference.sha256, pages: 2, verification: 'matched_reference' });
}));

test('rejects PDF header, hash, byte size and page-count mismatches', async () => temporary(async (dir) => {
  const path = join(dir, 'source.pdf');
  await writeFile(path, 'HTML response');
  await assert.rejects(inspectPdf(path, countPages), /PDF header/);
  await writeFile(path, pdf);
  for (const changed of [{ bytes: pdf.length + 1 }, { sha256: '0'.repeat(64) }, { pages: 3 }]) {
    await assert.rejects(verifyPdf(path, { ...options, reference: { ...reference, ...changed } }), /version review required/);
  }
  await assert.rejects(inspectPdf(path, async () => NaN), /Invalid PDF page count/);
}));

test('downloads to external cache, records actual retrieval, and reuses without refetch', async () => temporary(async (dir) => {
  let calls = 0;
  const fetcher: typeof fetch = async (url, init) => {
    calls++;
    assert.equal(url, SOURCE_REFERENCE.url);
    assert.equal(init?.redirect, 'error');
    return new Response(pdf, { headers: { 'content-type': 'application/pdf' } });
  };
  const receipt = await acquirePdf(dir, { ...options, fetch: fetcher });
  assert.equal(receipt.verification, 'matched_reference');
  assert.ok(receipt.retrievedAt && Number.isFinite(Date.parse(receipt.retrievedAt)));
  assert.deepEqual(await readFile(join(dir, CACHE_FILENAME)), pdf);
  assert.equal((await acquirePdf(dir, { ...options, fetch: fetcher })).retrievedAt, null);
  assert.equal(calls, 1);
  assert.deepEqual(await readdir(dir), [CACHE_FILENAME]);
}));

test('existing mismatched source is preserved and never downloaded over', async () => temporary(async (dir) => {
  const changed = Buffer.from('%PDF-1.7\nchanged official version\n');
  await writeFile(join(dir, CACHE_FILENAME), changed);
  await assert.rejects(acquirePdf(dir, { ...options, fetch: async () => { throw new Error('must not fetch'); } }), /version review required/);
  assert.deepEqual(await readFile(join(dir, CACHE_FILENAME)), changed);
}));

test('rejects HTTP failures, HTML, changed bytes and cleans incomplete downloads', async () => temporary(async (dir) => {
  await assert.rejects(acquirePdf(dir, { ...options, fetch: fetchPdf(pdf, 404) }), /HTTP 404/);
  await assert.rejects(acquirePdf(dir, { ...options, fetch: fetchPdf(pdf, 200, 'text/html') }), /content type/);
  await assert.rejects(acquirePdf(dir, { ...options, fetch: fetchPdf(Buffer.concat([pdf, Buffer.from('extra')])) }), /exceed frozen size/);
  await assert.rejects(acquirePdf(dir, { ...options, fetch: fetchPdf(Buffer.from('%PDF-bad')) }), /version review required/);
  assert.deepEqual(await readdir(dir), []);
}));

test('rejects source symlinks and cache paths inside the repository including aliases', async () => temporary(async (dir) => {
  const target = join(dir, 'target.pdf');
  await writeFile(target, pdf);
  await symlink(target, join(dir, CACHE_FILENAME));
  await assert.rejects(acquirePdf(dir, options), /regular file/);
  const alias = join(dir, 'alias');
  await symlink(process.cwd(), alias);
  await assert.rejects(acquirePdf(join(alias, 'must-not-create'), options), /outside the repository/);
  await assert.rejects(acquirePdf('relative-cache', options), /absolute/);
}));

test('concurrent file creation cannot be overwritten during publication', async () => temporary(async (dir) => {
  const other = Buffer.from('concurrent owner');
  await assert.rejects(acquirePdf(dir, {
    ...options, fetch: fetchPdf(),
    countPages: async () => {
      await writeFile(join(dir, CACHE_FILENAME), other, { flag: 'wx' });
      return 2;
    },
  }), { code: 'EEXIST' });
  assert.deepEqual(await readFile(join(dir, CACHE_FILENAME)), other);
  assert.deepEqual(await readdir(dir), [CACHE_FILENAME]);
}));

test('page inspection failure never publishes incomplete source', async () => temporary(async (dir) => {
  await assert.rejects(acquirePdf(dir, {
    ...options, fetch: fetchPdf(), countPages: async () => { throw new Error('pdfinfo unavailable'); },
  }), /pdfinfo unavailable/);
  assert.deepEqual(await readdir(dir), []);
}));

test('CLI rejects unsupported modes and relative paths', async () => {
  await assert.rejects(main(['--verify', 'relative.pdf']), /Usage/);
  await assert.rejects(main(['--url', 'https://example.com']), /Usage/);
});
