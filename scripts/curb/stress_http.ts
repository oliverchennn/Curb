/** Bounded HTTP checks for a loopback-only Robertson production server. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import { request } from 'node:http';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { decodePDFRawStream, PDFArray, PDFDocument, PDFRawStream } from 'pdf-lib';
import { SurveyResponseSchema, type Survey } from '../../src/contracts/curb/survey';
import { setAreaPriority } from '../../src/features/curb/survey/presentation';

const base = new URL(process.argv[2] ?? 'http://127.0.0.1:3193');
const mode = process.argv[3] ?? 'normal';
assert.ok(base.origin === base.href.slice(0, -1) && base.protocol === 'http:'
  && base.hostname === '127.0.0.1' && base.port, 'Use an explicit HTTP loopback origin and port');
assert.ok(['normal', 'missing', 'restored'].includes(mode), 'Use normal, missing or restored');
const timeoutMs = 15_000;
const requestCap = 120;
const surveyPath = '/api/curb/survey';
const reportPath = surveyPath + '/report';
const mediaRoot = 'public/curb/surveys/robertson-hall';
const surveyFile = 'src/data/curb/surveys/robertson-hall.json';
const maxBody = 2 * 1024 * 1024;
const errorCode: Record<number, string> = {
  400: 'INVALID_REQUEST', 404: 'SURVEY_NOT_FOUND', 413: 'BODY_TOO_LARGE', 500: 'SURVEY_UNAVAILABLE',
};

type Sample = { label: string; expected: number | 'client-abort'; observed?: number | 'client-abort'; ms?: number; error?: string };
type ResponseData = { status: number; headers: Headers; bytes: Buffer };
type Probe = (receive: (status: number | 'client-abort') => void) => Promise<void>;
const samples: Sample[] = [];
const fingerprints: Record<string, string[]> = {};
let inventoryHash: string | undefined;

function sha(bytes: Buffer | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function snapshot() {
  const names = (await readdir(mediaRoot, { recursive: true, withFileTypes: true }))
    .filter(entry => entry.isFile()).map(entry => join(entry.parentPath, entry.name));
  return Promise.all([surveyFile, ...names.sort()].map(async path => {
    const metadata = await stat(path);
    return { path, bytes: metadata.size, mtimeMs: metadata.mtimeMs, hash: sha(await readFile(path)) };
  }));
}

async function http(path: string, init: RequestInit = {}): Promise<ResponseData> {
  const response = await fetch(new URL(path, base), {
    ...init, redirect: 'error', signal: AbortSignal.timeout(timeoutMs),
  });
  return { status: response.status, headers: response.headers, bytes: Buffer.from(await response.arrayBuffer()) };
}

function post(survey: Survey): RequestInit {
  return {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ survey, planId: 'budget', budgetCents: 150_000 }),
  };
}

function assertStatus(response: ResponseData, expected: number) {
  assert.equal(response.status, expected, 'status');
  assert.equal(response.headers.get('cache-control'), 'no-store', 'cache control');
  if (expected !== 200) {
    const body = JSON.parse(response.bytes.toString());
    assert.equal(body.error.code, errorCode[expected], 'structured error code');
  }
}

async function record(label: string, expected: Sample['expected'], probe: Probe) {
  assert.ok(samples.length < requestCap, 'Reached request cap');
  const sample: Sample = { label, expected };
  samples.push(sample);
  const start = performance.now();
  try {
    await probe(status => {
      sample.observed = status;
      sample.ms = Math.round((performance.now() - start) * 10) / 10;
    });
    assert.equal(sample.observed, expected);
  } catch (error) {
    sample.ms ??= Math.round((performance.now() - start) * 10) / 10;
    sample.error = error instanceof Error ? error.message : String(error);
  }
}

function check(label: string, path: string, expected: number, init?: RequestInit,
  inspect?: (response: ResponseData) => void | Promise<void>) {
  return record(label, expected, async receive => {
    const response = await http(path, init);
    receive(response.status);
    assertStatus(response, expected);
    await inspect?.(response);
  });
}

function remember(label: string, hash: string) {
  (fingerprints[label] ??= []).push(hash);
}

async function checkPdf(response: ResponseData, ids: string[], label: string) {
  assert.match(response.headers.get('content-type') ?? '', /^application\/pdf/);
  assert.match(response.headers.get('content-disposition') ?? '', /^attachment/);
  assert.equal(response.bytes.subarray(0, 5).toString(), '%PDF-');
  const document = await PDFDocument.load(response.bytes, { updateMetadata: false });
  const pages = document.getPages().map(page => {
    const contents = page.node.Contents();
    const refs = contents instanceof PDFArray ? contents.asArray() : contents ? [contents] : [];
    return refs.map(ref => {
      const stream = document.context.lookup(ref);
      assert.ok(stream instanceof PDFRawStream);
      return Buffer.from(decodePDFRawStream(stream).decode()).toString('latin1');
    }).join('\n');
  });
  const headingIds = pages.flatMap(page => {
    const heading = page.match(/<([0-9a-f]+)>\s*Tj/i)?.[1];
    if (!heading) return [];
    const id = Buffer.from(heading, 'hex').toString('latin1')
      .match(/FINDING EVIDENCE\s*\/\s*([a-z0-9-]+)$/i)?.[1];
    return id ? [id.toLowerCase()] : [];
  });
  assert.deepEqual([...new Set(headingIds)], ids, 'PDF evidence headings');
  remember(label + ' bytes', sha(response.bytes));
  remember(label + ' pages', sha(JSON.stringify(pages)));
}

function checkHtml(response: ResponseData, ids: string[], label: string, photoHashes: string[]) {
  assert.match(response.headers.get('content-type') ?? '', /^text\/html/);
  assert.match(response.headers.get('content-security-policy') ?? '', /default-src 'none'/);
  const html = response.bytes.toString();
  assert.deepEqual([...html.matchAll(/<article class="card" id="finding-([^"]+)"/g)].map(match => match[1]), ids);
  assert.deepEqual([...html.matchAll(/src="data:image\/jpeg;base64,([^"]+)"/g)]
    .map(match => sha(Buffer.from(match[1], 'base64'))), photoHashes, 'HTML evidence photos');
  remember(label + ' bytes', sha(response.bytes));
}

function abortUpload(receive: (status: number | 'client-abort') => void) {
  return new Promise<void>((resolve, reject) => {
    const client = request(new URL(reportPath, base), {
      method: 'POST', signal: AbortSignal.timeout(timeoutMs),
      headers: { 'Content-Type': 'application/json', 'Content-Length': '256' },
    });
    let aborted = false;
    client.on('response', response => {
      response.resume();
      receive(response.statusCode ?? 0);
      reject(new Error('Server responded before the deliberate partial-upload cancellation'));
    });
    client.on('error', error => {
      if (aborted && error.message === 'intentional partial upload cancellation') {
        receive('client-abort');
        resolve();
      } else {
        reject(error);
      }
    });
    client.write('{"survey":', error => {
      if (error) {
        reject(error);
        return;
      }
      setTimeout(() => {
        if (client.destroyed) return;
        aborted = true;
        client.destroy(new Error('intentional partial upload cancellation'));
      }, 100);
    });
  });
}

async function checkRange(path: string, offset: number) {
  const label = 'range ' + path.split('/').at(-1) + ' at ' + offset;
  await record(label, 206, async receive => {
    const bytes = await readFile('public' + path);
    const end = offset + 31;
    const response = await http(path, { headers: { Range: 'bytes=' + offset + '-' + end } });
    receive(response.status);
    assert.equal(response.headers.get('content-range'), 'bytes ' + offset + '-' + end + '/' + bytes.length);
    assert.deepEqual(response.bytes, bytes.subarray(offset, end + 1), 'range bytes differ from the tracked file');
  });
}

async function run() {
  const before = await snapshot();
  inventoryHash = sha(JSON.stringify(before.map(({ path, bytes, hash }) => ({ path, bytes, hash }))));
  let survey: Survey | undefined;
  await check('initial GET', surveyPath, 200, {}, response => {
    survey = SurveyResponseSchema.parse(JSON.parse(response.bytes.toString())).data;
    assert.deepEqual(survey, SurveyResponseSchema.parse({ data: JSON.parse(savedJson) }).data, 'canonical survey');
    remember('GET bytes', sha(response.bytes));
  });
  assert.ok(survey, 'Could not read canonical survey');
  const saved: Survey = survey;
  const ids = saved.findings.map(finding => finding.id);
  const photoHashes = mode === 'missing' ? [] : await Promise.all(saved.findings.map(finding =>
    readFile('public' + finding.closeupSrc).then(sha)));
  const requestBody = post(saved);
  const htmlPath = reportPath + '?format=html';
  const pdfPath = reportPath + '?format=pdf';
  const get = (label: string, path = surveyPath) => check(label, path, 200, {}, response => {
    assert.deepEqual(SurveyResponseSchema.parse(JSON.parse(response.bytes.toString())).data, saved);
    remember('GET bytes', sha(response.bytes));
  });
  const html = (label: string, body = requestBody, fingerprint = 'HTML') =>
    check(label, htmlPath, 200, body, response => checkHtml(response, ids, fingerprint, photoHashes));
  const pdf = (label: string, body = requestBody, fingerprint = 'PDF') =>
    check(label, pdfPath, 200, body, response => checkPdf(response, ids, fingerprint));

  if (mode === 'missing') {
    await check('missing closeup HTML', htmlPath, 500, requestBody);
    await check('missing closeup PDF', pdfPath, 500, requestBody);
  } else if (mode === 'restored') {
    await html('restored closeup HTML');
    await pdf('restored closeup PDF');
  } else {
    for (const width of [1, 4, 8]) {
      for (const [name, send] of [['GET', get], ['HTML', html], ['PDF', pdf]] as const) {
        for (let batch = 0; batch < 2; batch++) {
          await Promise.all(Array.from({ length: width }, () => send(name + ' x' + width)));
        }
      }
    }
    await get('explicit survey selector', surveyPath + '?id=robertson-hall');
    for (const [suffix, status] of [['?id=missing', 404], ['?id=', 400],
      ['?id=robertson-hall&id=robertson-hall', 400], ['?extra=1', 400]] as const) {
      await check('survey selector ' + suffix, surveyPath + suffix, status);
    }
    await check('default PDF selector', reportPath, 200, requestBody, response => checkPdf(response, ids, 'PDF'));
    for (const suffix of ['?format=csv', '?format=', '?format=html&format=pdf', '?format=html&extra=1']) {
      await check('report selector ' + suffix, reportPath + suffix, 400, requestBody);
    }
    await check('malformed JSON', htmlPath, 400, { ...requestBody, body: '{' });
    await check('wrong content type', htmlPath, 400, { ...requestBody, headers: { 'Content-Type': 'text/plain' } });
    await check('oversized fixed-length', htmlPath, 413, { ...requestBody, body: ' '.repeat(maxBody + 1) });
    const oversizedChunks = new ReadableStream({
      start(controller) {
        for (let i = 0; i < 8; i++) controller.enqueue(Buffer.alloc(maxBody / 8, 32));
        controller.enqueue(Buffer.from(' '));
        controller.close();
      },
    });
    const chunked = { ...requestBody, body: oversizedChunks, duplex: 'half' as const };
    await check('oversized streamed', htmlPath, 413, chunked);
    await record('cancel partial upload', 'client-abort', abortUpload);
    await html('valid report after abort');

    const area = saved.workAreas[0];
    const priority = area.priority === 'high' ? 'medium' : 'high';
    const unsigned: Survey = { ...saved, workAreas: [{ ...area, priority }, ...saved.workAreas.slice(1)] };
    const signed = setAreaPriority(saved, area.id, priority, 'Stress reviewer', 'Disposable planning check');
    assert.ok(signed.ok);
    for (const path of [htmlPath, pdfPath]) {
      await check('priority without attribution ' + path, path, 400, post(unsigned));
    }
    await html('named priority HTML', post(signed.survey), 'named HTML');
    await pdf('named priority PDF', post(signed.survey), 'named PDF');
    for (const path of [saved.media.src, saved.media.annotatedSrc, saved.media.sourceSrc,
      '/curb/surveys/robertson-hall/demo-backup.mp4']) {
      const { size } = await stat('public' + path);
      await checkRange(path, 0);
      await checkRange(path, size - 32);
    }
    for (const key of ['GET bytes', 'HTML bytes', 'PDF pages']) {
      assert.equal(new Set(fingerprints[key]).size, 1, key + ' changed across identical requests');
    }
  }
  await get('canonical GET after probes');
  assert.deepEqual(await snapshot(), before, 'Canonical survey or source media changed during the run');
}

const savedJson = await readFile(surveyFile, 'utf8');
const runErrors: string[] = [];
try {
  await run();
} catch (error) {
  runErrors.push(error instanceof Error ? error.message : String(error));
}
const groups = new Map<string, Sample[]>();
for (const sample of samples) {
  const group = groups.get(sample.label) ?? [];
  group.push(sample);
  groups.set(sample.label, group);
}
const summary = [...groups].map(([label, group]) => {
  const times = group.map(sample => sample.ms ?? 0).sort((a, b) => a - b);
  return {
    label, count: group.length, expected: group[0].expected,
    observed: [...new Set(group.map(sample => sample.observed ?? null))],
    errors: group.filter(sample => sample.error).map(sample => sample.error),
    minMs: times[0], medianMs: times[Math.ceil(times.length * 0.5) - 1],
    p95Ms: times[Math.ceil(times.length * 0.95) - 1], maxMs: times.at(-1),
  };
});
console.log(JSON.stringify({
  checkedAt: new Date().toISOString(), origin: base.origin, mode, timeoutMs, requestCap,
  requests: samples.length, failed: samples.filter(sample => sample.error).length, runErrors,
  clientPeakRssKiB: process.resourceUsage().maxRSS, inventoryHash,
  fingerprints: Object.fromEntries(Object.entries(fingerprints).map(([key, values]) => [key, [...new Set(values)]])),
  summary,
}, null, 2));
if (runErrors.length || samples.some(sample => sample.error)) process.exitCode = 1;
