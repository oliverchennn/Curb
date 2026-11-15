/** Bounded functional smoke check only: no public load or concurrent probes. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PDFDocument, PDFDict, PDFName, PDFRawStream } from 'pdf-lib';
import { ExportRequestSchema, SurveyResponseSchema, SurveySchema } from '../../src/contracts/curb/survey';

const base = new URL(process.argv[2] ?? 'http://127.0.0.1:3004');
const expectedRevision = process.argv[3];
assert.ok(process.argv.length <= 4, 'Usage: verify_deployment.ts <origin> [expected-source-sha]');
assert.ok(expectedRevision === undefined || /^[a-f0-9]{40}$/.test(expectedRevision), 'Expected revision must be a full Git SHA');
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

const health = await request('/api/health', 200);
assert.equal(health.response.headers.get('cache-control'), 'no-store');
const healthData = JSON.parse(health.text());
assert.equal(healthData.status, 'alive');
assert.equal(healthData.service, 'web');
if (expectedRevision !== undefined) assert.equal(healthData.revision, expectedRevision, 'Deployment source revision does not match');
const ready = await request('/api/ready', 200);
assert.equal(ready.response.headers.get('cache-control'), 'no-store');
assert.equal(JSON.parse(ready.text()).status, 'ready');

const survey = await request('/api/curb/survey', 200);
assert.equal(survey.response.headers.get('cache-control'), 'no-store');
assert.deepEqual(SurveyResponseSchema.parse(JSON.parse(survey.text())).data, canonical, 'Hosted survey differs from this checkout');
const body = JSON.stringify(ExportRequestSchema.parse({ survey: canonical, planId: 'balanced', budgetCents: null }));
const init = { method: 'POST', headers: { 'content-type': 'application/json' }, body };
const html = await request('/api/curb/survey/report?format=html', 200, init);
assert.equal(html.response.headers.get('cache-control'), 'no-store');
assert.match(html.response.headers.get('content-type') ?? '', /^text\/html/);
const reportHtml = html.text();
const evidenceSections = [
  { id: 'handoff', articlePrefix: 'handoff' },
  { id: 'findings', articlePrefix: 'finding' },
];
assert.equal([...reportHtml.matchAll(/<img\b/g)].length, photoHashes.length * evidenceSections.length,
  'Hosted HTML must contain only the expected photos in both evidence sections');
for (const { id, articlePrefix } of evidenceSections) {
  const sectionStart = reportHtml.indexOf(`<section id="${id}"`);
  const sectionEnd = reportHtml.indexOf('</section>', sectionStart);
  assert.ok(sectionStart >= 0 && sectionEnd > sectionStart, `Missing HTML evidence section ${id}`);
  const section = reportHtml.slice(sectionStart, sectionEnd);
  assert.equal([...section.matchAll(/<img\b/g)].length, photoHashes.length,
    `HTML section ${id} must contain one photo per canonical finding`);
  for (const [index, finding] of canonical.findings.entries()) {
    const articleId = `${articlePrefix}-${finding.id}`;
    const marker = `<article class="card" id="${articleId}"`;
    const articleStart = section.indexOf(marker);
    const articleEnd = section.indexOf('</article>', articleStart);
    assert.ok(articleStart >= 0 && articleEnd > articleStart, `Missing HTML finding ${articleId}`);
    assert.equal(section.lastIndexOf(marker), articleStart, `Duplicate HTML finding ${articleId}`);
    const article = section.slice(articleStart, articleEnd);
    const embedded = [...article.matchAll(/src="data:image\/jpeg;base64,([^"]+)"/g)]
      .map(match => sha(Buffer.from(match[1], 'base64')));
    assert.deepEqual(embedded, [photoHashes[index]], `HTML finding ${articleId} must contain its exact canonical photo`);
  }
}

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
  revision: healthData.revision, expectedRevision: expectedRevision ?? null,
  result: 'pass', scope: '12 sequential functional requests; not browser, load, or accessibility certification' }, null, 2));
