/** Real local HTTP smoke checks. Run against an already started production server. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { SurveyResponseSchema } from '../../src/contracts/curb/survey';
import { buildRepairPlans } from '../../src/domain/curb/survey';

const base = new URL(process.argv[2] ?? 'http://127.0.0.1:3004');
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'This verifier only contacts a local demo server');
assert.equal(base.protocol, 'http:');
const out = resolve('.curb-local/release');
await mkdir(out, {recursive:true});
const checks: string[] = [];
function headers(response: Response) {
  assert.match(response.headers.get('cache-control') ?? '', /no-store/);
}
async function jsonError(path: string, options: RequestInit, status: number) {
  const response = await fetch(new URL(path, base), options);
  assert.equal(response.status, status, `${path}: expected ${status}`);
  headers(response);
  const body = await response.json() as {error?: {code?:unknown;message?:unknown}};
  assert.equal(typeof body.error?.code, 'string');
  assert.equal(typeof body.error?.message, 'string');
  checks.push(`${path}: ${status} structured error`);
}
const response = await fetch(new URL('/api/curb/survey', base));
assert.equal(response.status, 200); headers(response);
const {data: survey} = SurveyResponseSchema.parse(await response.json());
assert.equal(survey.id, 'robertson-hall');
checks.push('GET returns validated Robertson survey');
await jsonError('/api/curb/survey?extra=yes', {}, 400);
await jsonError('/api/curb/survey?id=unknown-survey', {}, 404);

const plans = buildRepairPlans(survey, 150_000);
assert.equal(plans[3].budgetFit, 'partial');
assert.equal(plans[3].coverage.high, 2);
assert.equal(plans[3].coverage.medium, 1);
await writeFile(resolve(out, 'current-survey.json'), JSON.stringify(survey,null,2)+'\n');
await writeFile(resolve(out, 'current-plans.json'), JSON.stringify(plans,null,2)+'\n');
for (const [name, reviewed, planId, budgetCents] of [
  ['default', survey, 'balanced', null],
  ['budget', survey, 'budget', 150_000],
  ['edited', {...survey, findings: survey.findings.map((finding, i) => i === 0 ? {...finding,
    label: 'Defect 01 · Reviewer correction', review: {status:'rejected',method:'manual',reviewer:'Integration verification',note:'Disposable verification scenario; not a field decision.'}} : finding)}, 'balanced', null],
] as const) {
  const result = await fetch(new URL('/api/curb/survey/report', base), {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({survey:reviewed,planId,budgetCents}),
  });
  assert.equal(result.status, 200, `${name} report: ${result.status}`); headers(result);
  assert.match(result.headers.get('content-type') ?? '', /application\/pdf/);
  assert.match(result.headers.get('content-disposition') ?? '', /attachment/);
  const bytes = Buffer.from(await result.arrayBuffer());
  assert.equal(bytes.subarray(0,5).toString(), '%PDF-');
  await writeFile(resolve(out, `${name}.pdf`),bytes);
  checks.push(`${name} PDF downloaded (${bytes.length} bytes); visual/text inspection is separate`);
  const htmlResult = await fetch(new URL('/api/curb/survey/report?format=html', base), {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({survey:reviewed,planId,budgetCents}),
  });
  assert.equal(htmlResult.status,200,`${name} HTML`); headers(htmlResult);
  assert.match(htmlResult.headers.get('content-type') ?? '', /text\/html; charset=utf-8/);
  assert.match(htmlResult.headers.get('content-security-policy') ?? '', /default-src 'none'/);
  const html = await htmlResult.text();
  assert.equal((html.match(/<img\b/g) ?? []).length,5);
  assert.equal((html.match(/src="data:image\/jpeg;base64,/g) ?? []).length,5);
  assert.doesNotMatch(html, /<script\b|<link\b|src="https?:/i);
  for (const finding of reviewed.findings) assert.ok(html.includes(`id="finding-${finding.id}"`));
  await writeFile(resolve(out,`${name}.html`),html);
  checks.push(`${name} self-contained HTML downloaded; five embedded photos, same evidence IDs, no automatic external resources`);
}
const post = (body: unknown) => ({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
const valid = {survey, planId:'balanced', budgetCents:null};
await jsonError('/api/curb/survey/report', post({...valid,totalCents:0}), 400);
const broken = structuredClone(survey);
broken.findings[0].track = broken.findings[0].track.filter(k => k.frame !== 210);
await jsonError('/api/curb/survey/report', post({...valid,survey:broken}), 400);
await jsonError('/api/curb/survey/report', {method:'POST',headers:{'Content-Type':'application/json'},body:'{'}, 400);
await jsonError('/api/curb/survey/report', {method:'POST',headers:{'Content-Type':'application/json'},body:' '.repeat(2*1024*1024+1)}, 413);

for (const asset of [survey.media.src,survey.media.annotatedSrc,survey.media.sourceSrc]) {
  const result = await fetch(new URL(asset,base),{headers:{Range:'bytes=0-31'}});
  assert.equal(result.status,206,asset);
  assert.equal((await result.arrayBuffer()).byteLength,32);
  checks.push(`${asset}: seekable byte range`);
}
const receipt = {checkedAt:new Date().toISOString(),base:base.origin,checks};
await writeFile(resolve(out,'http-verification.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));
