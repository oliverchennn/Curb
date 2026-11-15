import { describe, expect, it } from 'vitest';
import { POST as postPlan } from '../../../app/api/curb/plan/route';
import { POST as postTrip } from '../../../app/api/curb/trip/route';
import { PLAN_CONTRACT_VERSION, PlanResponseSchema } from '../../../src/contracts/curb/plans';
import { STEP_FREE_PROFILE_ID, TRIP_CONTRACT_VERSION, TripResponseSchema } from '../../../src/contracts/curb/trips';
import planDemo from '../../../src/data/curb/plan-demo.json';
import { MAX_SELECTION_BODY_BYTES, readJsonBody } from '../../../src/server/curb/readJsonBody';

const cases = [
  { path: 'plan', post: postPlan, schema: PlanResponseSchema, value: {
    contractVersion: PLAN_CONTRACT_VERSION, scenarioId: planDemo.scenario.id,
    revision: planDemo.scenario.revision, profileId: planDemo.profile.id,
    originNodeId: planDemo.originNodeId, budgetCents: 400,
  } },
  { path: 'trip', post: postTrip, schema: TripResponseSchema, value: {
    contractVersion: TRIP_CONTRACT_VERSION, scenarioId: 'synthetic-campus-links', revision: 1,
    profileId: STEP_FREE_PROFILE_ID, originNodeId: 'arrival', destinationId: 'library',
    repairId: 'add-library-ramp',
  } },
];
function request(path: string, body: BodyInit, headers: Record<string, string> = {}) {
  return new Request(`http://localhost/api/curb/${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body,
    ...(body instanceof ReadableStream ? { duplex: 'half' } : {}),
  });
}
const encoder = new TextEncoder();

describe.each(cases)('bounded POST /api/curb/$path', ({ path, post, schema, value }) => {
  const valid = JSON.stringify(value);
  async function invalid(input: Request) {
    const response = await post(input);
    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(schema.parse(await response.json())).toMatchObject({ ok: false, error: { code: 'INVALID_REQUEST' } });
  }

  it('accepts the exact byte boundary but rejects one extra byte, without changing the error contract', async () => {
    const padded = valid.padEnd(MAX_SELECTION_BODY_BYTES, ' ');
    const response = await post(request(path, padded));
    expect(response.status).toBe(200);
    expect(schema.parse(await response.json()).ok).toBe(true);
    await invalid(request(path, padded + ' '));
  });

  it('enforces streamed bytes despite a falsely small Content-Length and cancels before reading the rest', async () => {
    let reads = 0, cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        reads++;
        controller.enqueue(encoder.encode(reads === 1 ? valid.padEnd(MAX_SELECTION_BODY_BYTES, ' ') : ' '));
      },
      cancel() { cancelled = true; return new Promise<void>(() => {}); },
    }, { highWaterMark: 0 });
    // A cancellation producer that never acknowledges must not delay the HTTP response.
    await invalid(request(path, body, { 'content-length': '1' }));
    expect(cancelled).toBe(true);
    expect(reads).toBe(2);
    expect(body.locked).toBe(false);
  });

  it('rejects an oversized declared length before consuming its stream', async () => {
    let reads = 0;
    const body = new ReadableStream<Uint8Array>({ pull() { reads++; } }, { highWaterMark: 0 });
    await invalid(request(path, body, { 'content-length': String(MAX_SELECTION_BODY_BYTES + 1) }));
    expect(reads).toBe(0);
    await body.cancel();
  });

  it.each([
    { 'content-type': 'text/plain' },
    { 'content-type': 'application/octet-stream' },
    { 'content-length': '-1' },
    { 'content-length': '0x20' },
  ] as Record<string, string>[])('rejects an invalid transport header %j', async headers => {
    await invalid(request(path, valid, headers));
  });

  it('returns a typed error for a failed body stream', async () => {
    const body = new ReadableStream<Uint8Array>({ start(controller) { controller.error(new Error('private stream detail')); } });
    await invalid(request(path, body));
    expect(body.locked).toBe(false);
  });
});

describe('JSON byte decoding shared with survey exports', () => {
  it('preserves a Unicode character split between chunks and accepts JSON charset parameters', async () => {
    const bytes = encoder.encode('{"label":"裂缝"}');
    const body = new ReadableStream<Uint8Array>({ start(controller) {
      controller.enqueue(bytes.subarray(0, 11)); controller.enqueue(bytes.subarray(11)); controller.close();
    } });
    expect(await readJsonBody(request('test', body, { 'content-type': 'Application/JSON; charset=utf-8' }), bytes.length))
      .toEqual({ ok: true, value: { label: '裂缝' } });
  });

  it('counts UTF-8 bytes instead of JavaScript characters', async () => {
    const json = '{"label":"裂缝"}';
    expect(await readJsonBody(request('test', json), json.length)).toEqual({ ok: false, reason: 'too-large' });
  });

  it('rejects malformed UTF-8 rather than replacing a corrupted character in valid JSON', async () => {
    const bytes = new Uint8Array([...encoder.encode('{"label":"'), 0xff, ...encoder.encode('"}')]);
    expect(await readJsonBody(request('test', bytes), 100)).toEqual({ ok: false, reason: 'invalid' });
  });
});
