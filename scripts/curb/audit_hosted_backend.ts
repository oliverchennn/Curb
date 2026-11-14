/** Bounded read-only contract audit of the pinned Curb release. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ScenarioResponseSchema } from '../../src/contracts/curb';
import { PlanResponseSchema, PlanScenarioResponseSchema, PlanScenarioSchema, matchesPlanRequest, matchesPlanScenario } from '../../src/contracts/curb/plans';
import { SurveyResponseSchema, SurveySchema } from '../../src/contracts/curb/survey';
import { TripResponseSchema, TripScenarioResponseSchema } from '../../src/contracts/curb/trips';
import planFixture from '../../src/data/curb/plan-demo.json';
import tripFixture from '../../src/data/curb/trip-demo.json';

const production = 'https://curb-taupe.vercel.app';
const source = 'b010ad02ce9e0cb905e15e5c7c7109713814b36e';
const origin = new URL(process.argv[2] ?? production);
assert.equal(origin.href, origin.origin + '/', 'Supply an origin without credentials, path, query or fragment');
assert.ok(origin.origin === production || (origin.protocol === 'http:' && origin.hostname === '127.0.0.1' && origin.port));
const cap = 31;
const survey = SurveySchema.parse(JSON.parse(await readFile('src/data/curb/surveys/robertson-hall.json', 'utf8')));
const planContext = PlanScenarioSchema.parse(planFixture);
const trip = {
  contractVersion: 'curb-r1', scenarioId: tripFixture.scenario.id, revision: tripFixture.scenario.revision,
  profileId: 'step-free-demo', originNodeId: 'arrival', destinationId: 'library', repairId: 'add-library-ramp',
} as const;
const plan = {
  contractVersion: 'curb-r2', scenarioId: planFixture.scenario.id, revision: planFixture.scenario.revision,
  profileId: 'step-free-demo', originNodeId: 'arrival', budgetCents: 400,
} as const;
const report = { survey, planId: 'balanced', budgetCents: null } as const;
const receipt: Array<{
  name: string; method: string; path: string; expected: number; status?: number;
  contentType?: string; cache?: string; vercelRequest?: string; ms?: number; note?: string; failure?: string;
}> = [];
type Inspect = (body: unknown) => string | void;

function json(body: unknown): RequestInit {
  return raw(JSON.stringify(body));
}
function raw(body: string): RequestInit {
  assert.ok(Buffer.byteLength(body) <= 256 * 1024, 'Audit body exceeds its functional-probe bound');
  return { method: 'POST', headers: { 'content-type': 'application/json' }, body };
}
function object(value: unknown): Record<string, unknown> {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), 'Expected a JSON object');
  return value as Record<string, unknown>;
}
function error(code: string, version?: string): Inspect {
  return body => {
    const value = object(body);
    const detail = object(value.error);
    assert.equal(detail.code, code);
    assert.ok(typeof detail.message === 'string' && detail.message.length > 0);
    if (version) {
      assert.equal(value.contractVersion, version);
      assert.equal(value.ok, false);
    }
    return String(detail.code);
  };
}

async function probe(name: string, path: string, status: number, init: RequestInit = {}, inspect?: Inspect) {
  assert.ok(receipt.length < cap, 'Explicit request cap reached');
  const row: (typeof receipt)[number] = { name, method: init.method ?? 'GET', path, expected: status };
  receipt.push(row);
  const began = performance.now();
  try {
    const response = await fetch(new URL(path, origin), { ...init, redirect: 'manual', signal: AbortSignal.timeout(18_000) });
    row.status = response.status;
    row.contentType = response.headers.get('content-type') ?? '';
    row.cache = response.headers.get('cache-control') ?? '';
    row.vercelRequest = response.headers.get('x-vercel-id') ?? undefined;
    const body = await response.text();
    assert.equal(response.status, status, 'HTTP status');
    if (status === 405) {
      assert.doesNotMatch(body, /<!doctype html>|stack trace|node_modules/i, 'Unexpected route fallback');
      row.note = 'Framework-generated method rejection';
      return;
    }
    assert.match(row.contentType, /^application\/json(?:;|$)/i);
    assert.match(row.cache, /\bno-store\b/i);
    if (status >= 400) {
      assert.doesNotMatch(body, /(?:[A-Z]:\\|\/var\/task\/|\/workspace\/|stack trace|node_modules)/i);
    }
    const note = inspect?.(JSON.parse(body));
    if (note) row.note = note;
  } catch (failure) {
    row.failure = failure instanceof Error ? failure.message : String(failure);
  } finally {
    row.ms = Math.round(performance.now() - began);
  }
}

function scenario(expectedId: string): Inspect {
  return value => {
    const body = ScenarioResponseSchema.parse(value);
    assert.ok(body.ok);
    assert.equal(body.data.scenario.id, expectedId);
    return body.data.scenario.id;
  };
}

await probe('health', '/api/health', 200, {}, value => {
  const body = object(value);
  assert.equal(body.status, 'alive');
  assert.equal(body.service, 'web');
  assert.equal(typeof body.revision, 'string');
  return 'revision=' + JSON.stringify(body.revision);
});
await probe('ready', '/api/ready', 200, {}, body => {
  assert.deepEqual(body, { status: 'ready', mode: 'local', dependencies: [] });
  return 'local dependency-free design';
});
await probe('default sample', '/api/curb/scenario', 200, {}, scenario('synthetic-campus-quad'));
await probe('explicit empty', '/api/curb/scenario?dataset=empty', 200, {}, scenario('synthetic-empty-campus'));
await probe('invalid dataset', '/api/curb/scenario?dataset=missing', 404, {}, error('DATASET_NOT_FOUND'));
await probe('duplicate dataset observation', '/api/curb/scenario?dataset=empty&dataset=sample', 200, {}, scenario('synthetic-empty-campus'));

await probe('trip metadata', '/api/curb/trip-scenario', 200, {}, value => {
  const body = TripScenarioResponseSchema.parse(value);
  assert.ok(body.ok);
  assert.deepEqual(body.data, tripFixture);
});
await probe('missing trip scenario', '/api/curb/trip-scenario?scenarioId=missing', 404, {}, error('SCENARIO_NOT_FOUND', 'curb-r1'));
await probe('duplicate trip selector', '/api/curb/trip-scenario?scenarioId=one&scenarioId=two', 400, {}, error('INVALID_REQUEST', 'curb-r1'));

await probe('plan metadata', '/api/curb/plan-scenario', 200, {}, value => {
  const body = PlanScenarioResponseSchema.parse(value);
  assert.ok(body.ok);
  assert.deepEqual(body.data, planFixture);
});
await probe('missing plan scenario', '/api/curb/plan-scenario?scenarioId=missing', 404, {}, error('SCENARIO_NOT_FOUND', 'curb-r2'));
await probe('unexpected plan selector', '/api/curb/plan-scenario?budgetCents=400', 400, {}, error('INVALID_REQUEST', 'curb-r2'));

await probe('library repair projection', '/api/curb/trip', 200, json(trip), value => {
  const body = TripResponseSchema.parse(value);
  assert.ok(body.ok);
  for (const [key, item] of Object.entries(trip)) assert.equal(body.data[key as keyof typeof trip], item);
  assert.deepEqual(body.data.before, { status: 'blocked', blockedEdgeIds: ['library-crossing'], unknownEdgeIds: [] });
  assert.deepEqual(body.data.after, { status: 'reachable', distanceMeters: 60,
    nodeIds: ['arrival', 'commons', 'crossing-east', 'library-door'],
    edgeIds: ['arrival-walk', 'library-crossing', 'library-entrance'] });
});
await probe('disconnected archive', '/api/curb/trip', 200, json({ ...trip, destinationId: 'archive', repairId: null }), value => {
  const body = TripResponseSchema.parse(value);
  assert.ok(body.ok);
  assert.equal(body.data.before.status, 'disconnected');
  assert.deepEqual(body.data.after, body.data.before);
});
await probe('malformed trip JSON', '/api/curb/trip', 400, raw('{'), error('INVALID_REQUEST', 'curb-r1'));
await probe('invalid trip endpoint', '/api/curb/trip', 400, json({ ...trip, destinationId: 'missing' }), error('INVALID_REQUEST', 'curb-r1'));
await probe('stale trip', '/api/curb/trip', 409, json({ ...trip, revision: 0 }), error('STALE_SCENARIO', 'curb-r1'));
await probe('missing trip fields', '/api/curb/trip', 400, json({ scenarioId: trip.scenarioId }), error('INVALID_REQUEST', 'curb-r1'));

for (const [budgetCents, expectedCondition, expectedExact] of [
  [0, [], []],
  [400, ['hall'], ['library', 'student-center']],
  [800, ['library', 'student-center', 'hall'], ['library', 'student-center', 'hall']],
] as const) {
  const request = { ...plan, budgetCents };
  await probe('plan budget cents ' + budgetCents, '/api/curb/plan', 200, json(request), value => {
    const body = PlanResponseSchema.parse(value);
    assert.ok(body.ok);
    assert.ok(matchesPlanRequest(body.data, request) && matchesPlanScenario(body.data, planContext));
    assert.deepEqual(body.data.conditionFirst.restoredDestinationIds, expectedCondition);
    assert.deepEqual(body.data.exact.restoredDestinationIds, expectedExact);
    assert.deepEqual(body.data.excludedUnknownCostRepairIds, ['repair-studio']);
    assert.equal(body.data.baseline.outcomes.find(candidate => candidate.destinationId === 'studio')?.route.status, 'unknown');
    assert.equal(body.data.baseline.outcomes.find(candidate => candidate.destinationId === 'archive')?.route.status, 'disconnected');
    return 'restored ' + expectedCondition.length + ' / ' + expectedExact.length;
  });
}
await probe('fractional plan cents', '/api/curb/plan', 400, json({ ...plan, budgetCents: 400.5 }), error('INVALID_REQUEST', 'curb-r2'));
await probe('negative plan cents', '/api/curb/plan', 400, json({ ...plan, budgetCents: -1 }), error('INVALID_REQUEST', 'curb-r2'));
await probe('stale plan', '/api/curb/plan', 409, json({ ...plan, revision: 0 }), error('STALE_SCENARIO', 'curb-r2'));
await probe('wrong plan field type', '/api/curb/plan', 400, json({ ...plan, budgetCents: '400' }), error('INVALID_REQUEST', 'curb-r2'));

await probe('survey before browser work', '/api/curb/survey', 200, {}, value => {
  assert.deepEqual(SurveyResponseSchema.parse(value).data, survey);
  return 'exact canonical fixture';
});
await probe('unknown survey', '/api/curb/survey?id=missing', 404, {}, error('SURVEY_NOT_FOUND'));
await probe('duplicate survey ID', '/api/curb/survey?id=robertson-hall&id=robertson-hall', 400, {}, error('INVALID_REQUEST'));
await probe('unsupported report format', '/api/curb/survey/report?format=csv', 400, json(report), error('INVALID_REQUEST'));
await probe('budget export missing budget', '/api/curb/survey/report', 400, json({ ...report, planId: 'budget' }), error('INVALID_REQUEST'));
await probe('unsupported report method', '/api/curb/survey/report', 405);

assert.equal(receipt.length, cap);
const failed = receipt.filter(row => row.failure).length;
console.log(JSON.stringify({ source, origin: origin.origin, checkedAt: new Date().toISOString(), requests: receipt.length, failed, receipt }, null, 2));
if (failed) process.exitCode = 1;
