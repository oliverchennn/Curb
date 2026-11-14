/** Bounded functional smoke check only: no public load or concurrent probes. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PDFDocument, PDFDict, PDFName, PDFRawStream } from 'pdf-lib';
import { SurveyResponseSchema, SurveySchema } from '../../src/contracts/curb/survey';

const base = new URL(process.argv[2] ?? 'http://127.0.0.1:3004');
assert.ok(!base.username && !base.password && !base.search && !base.hash && base.pathname === '/', 'Pass an origin without credentials, path, query or fragment');
assert.ok(base.protocol === 'https:' || (base.protocol === 'http:' && base.hostname === '127.0.0.1'), 'Use HTTPS or local loopback HTTP');
const canonical = SurveySchema.parse(JSON.parse(await readFile('src/data/curb/surveys/robertson-hall.json', 'utf8')));
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const photoHashes = await Promise.all(canonical.findings.map(f => readFile('public' + f.closeupSrc).then(sha)));
const checks: { path: string; status: number; bytes: number }[] = [];

async function request(path: string, expected: number, init: RequestInit = {}) {
  assert.ok(checks.length < 12, 'Functional probe cap exceeded');
  const response = await fetch(new URL(path, base), { ...init, redirect: 'error', signal: AbortSignal.timeout(20_000) });
  const bytes = new Uint8Array(await response.arrayBuffer());
  checks.push({ path, status: response.status, bytes: bytes.byteLength });
  assert.equal(response.status, expected, `${path}: unexpected status (a protection/login response is not a product pass)`);
  return { response, bytes, text: () => new TextDecoder().decode(bytes) };
}

for (const [path, expected] of [
  ['/curb/upload', 'Start with a sidewalk video'],
  ['/curb/surveys/robertson-hall', 'Survey replay'],
  ['/curb/collection', 'Collection'],
  ['/curb/explore', 'Route'],
] as const) {
  const result = await request(path, 200);
  assert.match(result.response.headers.get('content-type') ?? '', /^text\/html/);
  assert.ok(result.text().includes(expected), `${path}: expected page content missing`);
}

const survey = await request('/api/curb/survey', 200);
assert.equal(survey.response.headers.get('cache-control'), 'no-store');
assert.deepEqual(SurveyResponseSchema.parse(JSON.parse(survey.text())).data, canonical, 'Hosted survey differs from this checkout');
const body = JSON.stringify({ survey: canonical, planId: 'balanced' });
const init = { method: 'POST', headers: { 'content-type': 'application/json' }, body };
const html = await request('/api/curb/survey/report?format=html', 200, init);
assert.equal(html.response.headers.get('cache-control'), 'no-store');
assert.match(html.response.headers.get('content-type') ?? '', /^text\/html/);
const embedded = [...html.text().matchAll(/src="data:image\/jpeg;base64,([^"]+)"/g)].map(m => sha(Buffer.from(m[1], 'base64')));
assert.deepEqual(embedded, photoHashes, 'Hosted HTML must include all five canonical photos');
for (const f of canonical.findings) assert.ok(html.text().includes(`id="finding-${f.id}"`), `Missing finding ${f.id}`);

const pdf = await request('/api/curb/survey/report?format=pdf', 200, init);
assert.match(pdf.response.headers.get('content-type') ?? '', /^application\/pdf/);
assert.equal(new TextDecoder().decode(pdf.bytes.subarray(0, 5)), '%PDF-');
const document = await PDFDocument.load(pdf.bytes), pdfPhotos: string[] = [];
for (const page of document.getPages()) {
  const objects = page.node.Resources()?.lookupMaybe(PDFName.of('XObject'), PDFDict);
  if (!objects) continue;
  for (const [, ref] of objects.entries()) {
    const stream = document.context.lookup(ref);
    if (stream instanceof PDFRawStream && stream.dict.get(PDFName.of('Subtype')) === PDFName.of('Image')) pdfPhotos.push(sha(stream.getContents()));
  }
}
assert.deepEqual(pdfPhotos.sort(), [...photoHashes].sort(), 'Hosted PDF must include all five canonical photos');

for (const path of [canonical.media.src, canonical.media.annotatedSrc, canonical.media.sourceSrc]) {
  const source = await readFile('public' + path);
  const result = await request(path, 206, { headers: { Range: 'bytes=0-31' } });
  assert.equal(result.response.headers.get('content-range'), `bytes 0-31/${source.byteLength}`);
  assert.deepEqual(Buffer.from(result.bytes), source.subarray(0, 32));
}
console.log(JSON.stringify({ checkedAt: new Date().toISOString(), origin: base.origin, checks, pdfPages: document.getPageCount(),
  result: 'pass', scope: '10 sequential functional requests; not browser, load, or accessibility certification' }, null, 2));
