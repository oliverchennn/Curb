import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  STEP_FREE_PROFILE_ID,
  TRIP_CONTRACT_VERSION,
  TripResponseSchema,
  TripScenarioResponseSchema,
  type TripRequest,
  type TripScenario,
} from '../../../src/contracts/curb/trips';
import tripDemo from '../../../src/data/curb/trip-demo.json';

const request: TripRequest = {
  contractVersion: TRIP_CONTRACT_VERSION,
  scenarioId: 'synthetic-campus-links',
  revision: 1,
  profileId: STEP_FREE_PROFILE_ID,
  originNodeId: 'arrival',
  destinationId: 'library',
  repairId: 'add-library-ramp',
};

const internalFailure = {
  status: 500,
  body: {
    contractVersion: TRIP_CONTRACT_VERSION,
    ok: false,
    error: { code: 'INVALID_SERVER_SCENARIO', message: 'The trip scenario could not be evaluated.' },
  },
};

async function context(query = '') {
  const { GET } = await import('../../../app/api/curb/trip-scenario/route');
  const response = GET(new Request(`http://localhost/api/curb/trip-scenario${query}`));
  expect(response.headers.get('cache-control')).toBe('no-store');
  return { status: response.status, body: TripScenarioResponseSchema.parse(await response.json()) };
}

async function rawTrip(body: string) {
  const { POST } = await import('../../../app/api/curb/trip/route');
  const response = await POST(new Request('http://localhost/api/curb/trip', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body,
  }));
  expect(response.headers.get('cache-control')).toBe('no-store');
  return { status: response.status, body: TripResponseSchema.parse(await response.json()) };
}

function trip(input: unknown = request) {
  return rawTrip(JSON.stringify(input));
}

afterEach(() => {
  vi.doUnmock('../../../src/data/curb/trip-demo.json');
  vi.doUnmock('../../../src/domain/curb/trips');
  vi.resetModules();
});

describe('GET /api/curb/trip-scenario', () => {
  it('serves the separate synthetic context, explicitly or by default', async () => {
    const expected = { status: 200, body: { contractVersion: TRIP_CONTRACT_VERSION, ok: true, data: tripDemo } };
    expect(await context()).toEqual(expected);
    expect(await context('?scenarioId=synthetic-campus-links')).toEqual(expected);
  });

  it('returns 404 for a nonempty unsupported scenario without fallback', async () => {
    expect(await context('?scenarioId=does-not-exist')).toMatchObject({
      status: 404, body: { ok: false, error: { code: 'SCENARIO_NOT_FOUND' } },
    });
  });

  it.each([
    '?scenarioId=',
    '?scenarioId=%20',
    '?dataset=sample',
    '?scenarioId=synthetic-campus-links&scenarioId=synthetic-campus-links',
    '?scenarioId=synthetic-campus-links&revision=1',
  ])('rejects malformed or ambiguous query %s', async (query) => {
    expect(await context(query)).toMatchObject({
      status: 400, body: { ok: false, error: { code: 'INVALID_REQUEST' } },
    });
  });
});

describe('POST /api/curb/trip', () => {
  it('returns the exact golden immutable before/after repair result', async () => {
    expect(await trip()).toEqual({
      status: 200,
      body: {
        contractVersion: TRIP_CONTRACT_VERSION,
        ok: true,
        data: {
          ...request,
          before: { status: 'blocked', blockedEdgeIds: ['library-crossing'], unknownEdgeIds: [] },
          after: {
            status: 'reachable',
            nodeIds: ['arrival', 'commons', 'crossing-east', 'library-door'],
            edgeIds: ['arrival-walk', 'library-crossing', 'library-entrance'],
            distanceMeters: 60,
          },
        },
      },
    });
  });

  it('supports an explicit no-repair comparison and same-node zero-length trip', async () => {
    const baseline = await trip({ ...request, repairId: null });
    expect(baseline.status).toBe(200);
    expect(baseline.body.ok).toBe(true);
    if (!baseline.body.ok) throw new Error('Expected a successful comparison.');
    expect(baseline.body.data.before).toEqual(baseline.body.data.after);
    const zeroLength = { status: 'reachable', nodeIds: ['library-door'], edgeIds: [], distanceMeters: 0 };
    expect(await trip({ ...request, originNodeId: 'library-door', repairId: null })).toMatchObject({
      status: 200, body: { ok: true, data: { before: zeroLength, after: zeroLength } },
    });
  });

  it.each([
    ['cafe', 'reachable'],
    ['studio', 'unknown'],
    ['archive', 'disconnected'],
    ['service', 'blocked'],
  ])('preserves the authored %s destination outcome (%s)', async (destinationId, status) => {
    expect(await trip({ ...request, destinationId, repairId: null })).toMatchObject({
      status: 200, body: { ok: true, data: { before: { status }, after: { status } } },
    });
  });

  it.each([
    [{ ...request, scenarioId: 'missing' }, 404, 'SCENARIO_NOT_FOUND'],
    [{ ...request, revision: 0 }, 409, 'STALE_SCENARIO'],
    [{ ...request, revision: 2 }, 409, 'STALE_SCENARIO'],
    [{ ...request, originNodeId: 'missing' }, 400, 'INVALID_REQUEST'],
    [{ ...request, destinationId: 'missing' }, 400, 'INVALID_REQUEST'],
    [{ ...request, repairId: 'missing' }, 400, 'INVALID_REQUEST'],
    [{ ...request, repairId: 'library-crossing-curb' }, 400, 'INVALID_REQUEST'],
    [{ ...request, profileId: 'another-profile' }, 400, 'INVALID_REQUEST'],
    [{ ...request, contractVersion: 'curb-v0' }, 400, 'INVALID_REQUEST'],
    [{ ...request, revision: -1 }, 400, 'INVALID_REQUEST'],
    [{ ...request, originNodeId: '' }, 400, 'INVALID_REQUEST'],
    [{ ...request, repairIds: ['add-library-ramp'] }, 400, 'INVALID_REQUEST'],
    [{ ...request, repairId: ['add-library-ramp'] }, 400, 'INVALID_REQUEST'],
  ])('returns the typed HTTP failure for invalid selection case %#', async (input, status, code) => {
    expect(await trip(input)).toMatchObject({ status, body: { ok: false, error: { code } } });
  });

  it.each(['', '{', 'null', '[]', '"text"'])('rejects a malformed JSON body %s', async (body) => {
    expect(await rawTrip(body)).toMatchObject({
      status: 400, body: { ok: false, error: { code: 'INVALID_REQUEST' } },
    });
  });

  it('requires the repair field even when no repair is selected', async () => {
    const { repairId: _repairId, ...missingRepair } = request;
    expect(await trip(missingRepair)).toMatchObject({
      status: 400, body: { ok: false, error: { code: 'INVALID_REQUEST' } },
    });
  });

  it('does not mutate evidence or leak a simulation into later requests', async () => {
    const originalFixture = JSON.stringify(tripDemo);
    const originalContext = await context();
    const first = await trip();
    await trip({ ...request, destinationId: 'studio' });
    expect(await trip()).toEqual(first);
    expect(await context()).toEqual(originalContext);
    const baseline = await trip({ ...request, repairId: null });
    expect(baseline).toMatchObject({
      status: 200, body: { ok: true, data: { before: { status: 'blocked' }, after: { status: 'blocked' } } },
    });
    expect(JSON.stringify(tripDemo)).toBe(originalFixture);
  });
});

describe('invalid internal trip data', () => {
  it.each(['shape', 'relationships', 'metadata'])('rejects invalid fixture %s on both handlers', async (kind) => {
    const invalid = structuredClone(tripDemo);
    if (kind === 'shape') invalid.schemaVersion = 2;
    if (kind === 'relationships') invalid.scenario.edges[0].toNodeId = 'missing-node';
    if (kind === 'metadata') invalid.edgeAssessments.push(invalid.edgeAssessments[0]);
    vi.doMock('../../../src/data/curb/trip-demo.json', () => ({ default: invalid }));
    expect(await context()).toEqual(internalFailure);
    expect(await trip()).toEqual(internalFailure);
  });

  it('still rejects malformed requests before reading internal data', async () => {
    const validateTripScenario = vi.fn(() => { throw new Error('Private internal detail.'); });
    vi.doMock('../../../src/domain/curb/trips', async (importOriginal) => ({
      ...await importOriginal<typeof import('../../../src/domain/curb/trips')>(), validateTripScenario,
    }));
    expect(await trip(null)).toMatchObject({ status: 400, body: { ok: false, error: { code: 'INVALID_REQUEST' } } });
    expect(validateTripScenario).not.toHaveBeenCalled();
  });

  it.each(['invalid-scenario', 'unexpected', 'request-error'])('maps context %s errors to generic 500', async (kind) => {
    vi.doMock('../../../src/domain/curb/trips', async (importOriginal) => {
      const domain = await importOriginal<typeof import('../../../src/domain/curb/trips')>();
      return {
        ...domain,
        validateTripScenario() {
          if (kind === 'invalid-scenario') throw new domain.InvalidTripScenarioError('Private context detail.');
          if (kind === 'request-error') throw new domain.TripRequestError('INVALID_REQUEST', 'Private context detail.');
          throw new Error('Private context detail.');
        },
      };
    });
    expect(await context()).toEqual(internalFailure);
    expect(await trip()).toEqual(internalFailure);
  });

  it.each(['invalid-scenario', 'unexpected', 'malformed-result'])('maps evaluation %s errors to generic 500', async (kind) => {
    vi.doMock('../../../src/domain/curb/trips', async (importOriginal) => {
      const domain = await importOriginal<typeof import('../../../src/domain/curb/trips')>();
      return {
        ...domain,
        evaluateTrip() {
          if (kind === 'invalid-scenario') throw new domain.InvalidTripScenarioError('Private evaluation detail.');
          if (kind === 'malformed-result') return { ...request, before: { status: 'reachable' }, after: {} };
          throw new Error('Private evaluation detail.');
        },
      };
    });
    expect(await trip()).toEqual(internalFailure);
  });

  it.each([
    ['contractVersion', 'curb-v0'],
    ['scenarioId', 'another-scenario'],
    ['revision', 2],
    ['profileId', 'another-profile'],
    ['originNodeId', 'another-node'],
    ['destinationId', 'another-destination'],
    ['repairId', 'another-repair'],
  ])('rejects an evaluator result that changes echoed %s', async (key, value) => {
    vi.doMock('../../../src/domain/curb/trips', async (importOriginal) => {
      const domain = await importOriginal<typeof import('../../../src/domain/curb/trips')>();
      return {
        ...domain,
        evaluateTrip(input: TripScenario, selection: TripRequest) {
          return { ...domain.evaluateTrip(input, selection), [key]: value };
        },
      };
    });
    expect(await trip({ ...request, repairId: null })).toEqual(internalFailure);
  });

  it('validates a malformed context returned by the domain before responding', async () => {
    vi.doMock('../../../src/domain/curb/trips', async (importOriginal) => {
      const domain = await importOriginal<typeof import('../../../src/domain/curb/trips')>();
      return {
        ...domain,
        validateTripScenario(input: unknown) {
          return { ...domain.validateTripScenario(input), schemaVersion: 2 };
        },
      };
    });
    expect(await context()).toEqual(internalFailure);
  });
});
