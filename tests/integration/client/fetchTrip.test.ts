import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TRIP_CONTRACT_VERSION,
  TripScenarioSchema,
  type TripEvaluation,
  type TripRequest,
  type TripScenario,
} from '../../../src/contracts/curb/trips';
import { fetchTrip, fetchTripScenario, TripFetchError } from '../../../src/client/curb/fetchTrip';

// This transport boundary deliberately isolates B's pure relationship validator.
// Real scenario relationships are covered by the domain/integrated API checks.
const domain = vi.hoisted(() => ({
  validateTripScenario: vi.fn<(input: unknown) => TripScenario>(),
}));
vi.mock('../../../src/domain/curb/trips', () => domain);

function makeScenario(scenarioId = 'transport-example'): TripScenario {
  return TripScenarioSchema.parse({
    schemaVersion: 1,
    contractVersion: TRIP_CONTRACT_VERSION,
    scenario: {
      schemaVersion: 1,
      id: scenarioId,
      revision: 3,
      title: 'Synthetic transport test',
      dataKind: 'synthetic',
      nodes: [
        { id: 'origin', coordinate: [0, 0], label: 'Origin' },
        { id: 'entrance', coordinate: [0, 0.001], label: 'Entrance' },
      ],
      edges: [{
        id: 'walk', fromNodeId: 'origin', toNodeId: 'entrance',
        geometry: { type: 'LineString', coordinates: [[0, 0], [0, 0.001]] },
        lengthMeters: 10, bidirectional: false, barrierIds: ['step'],
      }],
      destinations: [{ id: 'library', label: 'Library', nodeId: 'entrance' }],
      barriers: [{
        id: 'step', edgeId: 'walk', kind: 'missing_ramp',
        reviewStatus: 'pending', evidenceIds: ['note'], note: 'Synthetic step.',
      }],
      evidence: [{ id: 'note', kind: 'note', origin: 'synthetic', caption: 'Synthetic step note.' }],
    },
    profile: { id: 'step-free-demo', label: 'Step-free example', description: 'Authored test assumption.' },
    assumptions: ['Synthetic test data; no navigation advice.'],
    edgeAssessments: [{
      edgeId: 'walk', kind: 'entrance', status: 'blocked',
      blockingBarrierIds: ['step'], reason: 'A synthetic step blocks the entrance.',
    }],
    repairs: [{ id: 'repair-step', label: 'Clear step', barrierId: 'step', description: 'Hypothetical repair.' }],
    defaults: { originNodeId: 'origin', destinationId: 'library' },
  });
}

function makeRequest(): TripRequest {
  return {
    contractVersion: TRIP_CONTRACT_VERSION,
    scenarioId: 'transport-example',
    revision: 3,
    profileId: 'step-free-demo',
    originNodeId: 'origin',
    destinationId: 'library',
    repairId: 'repair-step',
  };
}

function makeEvaluation(request = makeRequest()): TripEvaluation {
  const before = { status: 'blocked', blockedEdgeIds: ['walk'], unknownEdgeIds: [] } as const;
  return {
    ...request,
    before: { ...before, blockedEdgeIds: [...before.blockedEdgeIds], unknownEdgeIds: [] },
    after: request.repairId === null
      ? { ...before, blockedEdgeIds: [...before.blockedEdgeIds], unknownEdgeIds: [] }
      : {
        status: 'reachable', nodeIds: [request.originNodeId, 'entrance'],
        edgeIds: ['walk'], distanceMeters: 10,
      },
  };
}

function scenarioResponse(scenario = makeScenario()) {
  return { contractVersion: TRIP_CONTRACT_VERSION, ok: true, data: scenario } as const;
}

function evaluationResponse(evaluation = makeEvaluation()) {
  return { contractVersion: TRIP_CONTRACT_VERSION, ok: true, data: evaluation } as const;
}

beforeEach(() => {
  domain.validateTripScenario.mockReset();
  domain.validateTripScenario.mockImplementation((input) => TripScenarioSchema.parse(input));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('fetchTripScenario', () => {
  it('loads the default context without a query and forwards cancellation without caching', async () => {
    const scenario = makeScenario();
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(scenarioResponse(scenario)));
    vi.stubGlobal('fetch', fetcher);
    const { signal } = new AbortController();

    await expect(fetchTripScenario(signal)).resolves.toEqual(scenario);
    expect(fetcher).toHaveBeenCalledExactlyOnceWith('/api/curb/trip-scenario', { signal, cache: 'no-store' });
    expect(fetcher.mock.calls[0]?.[1]?.signal).toBe(signal);
    expect(domain.validateTripScenario).toHaveBeenCalledExactlyOnceWith(scenario);
  });

  it('encodes an explicit scenario ID and requires the same scenario in the response', async () => {
    const scenarioId = 'transport example/?';
    const scenario = makeScenario(scenarioId);
    const fetcher = vi.fn().mockResolvedValue(Response.json(scenarioResponse(scenario)));
    vi.stubGlobal('fetch', fetcher);
    const { signal } = new AbortController();

    await expect(fetchTripScenario(signal, scenarioId)).resolves.toEqual(scenario);
    expect(fetcher).toHaveBeenCalledExactlyOnceWith(
      '/api/curb/trip-scenario?scenarioId=transport+example%2F%3F',
      { signal, cache: 'no-store' },
    );
  });

  it('rejects a response for a different explicit scenario without a fallback', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json(scenarioResponse()));
    vi.stubGlobal('fetch', fetcher);

    await expect(fetchTripScenario(new AbortController().signal, 'other-scenario')).rejects.toMatchObject({
      name: 'TripFetchError', code: 'INVALID_RESPONSE', status: 200,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('rejects relationship failures reported by the pure domain validator', async () => {
    const scenario = makeScenario();
    scenario.defaults.originNodeId = 'missing-node';
    domain.validateTripScenario.mockImplementation(() => {
      throw new Error('The default origin does not resolve.');
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(scenarioResponse(scenario))));

    await expect(fetchTripScenario(new AbortController().signal)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE', status: 200,
    });
    expect(domain.validateTripScenario).toHaveBeenCalledExactlyOnceWith(scenario);
  });

  it('rejects malformed context data before invoking relationship validation', async () => {
    const scenario = makeScenario();
    const body = {
      ...scenarioResponse(scenario),
      data: { ...scenario, profile: { ...scenario.profile, id: 'other-profile' } },
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(body)));

    await expect(fetchTripScenario(new AbortController().signal)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE', status: 200,
    });
    expect(domain.validateTripScenario).not.toHaveBeenCalled();
  });
});

describe('fetchTrip', () => {
  it('posts the complete frozen request without mutation and validates the returned evaluation', async () => {
    const request = Object.freeze(makeRequest());
    const evaluation = makeEvaluation(request);
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(evaluationResponse(evaluation)));
    vi.stubGlobal('fetch', fetcher);
    const { signal } = new AbortController();

    await expect(fetchTrip(request, signal)).resolves.toEqual(evaluation);
    expect(fetcher).toHaveBeenCalledExactlyOnceWith('/api/curb/trip', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request), signal, cache: 'no-store',
    });
    expect(fetcher.mock.calls[0]?.[1]?.signal).toBe(signal);
    expect(request).toEqual(makeRequest());
  });

  it('accepts an explicit null repair and identical before/after results', async () => {
    const request = { ...makeRequest(), repairId: null };
    const evaluation = makeEvaluation(request);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(evaluationResponse(evaluation))));

    await expect(fetchTrip(request, new AbortController().signal)).resolves.toEqual(evaluation);
  });

  it('compares the response against the posted snapshot if the caller changes its selection', async () => {
    const request = makeRequest();
    const evaluation = makeEvaluation(request);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(evaluationResponse(evaluation))));

    const load = fetchTrip(request, new AbortController().signal);
    request.destinationId = 'new-destination';
    request.repairId = null;

    await expect(load).resolves.toEqual(evaluation);
  });

  it.each([
    ['contractVersion', 'curb-next'],
    ['scenarioId', 'another-scenario'],
    ['revision', 4],
    ['profileId', 'another-profile'],
    ['originNodeId', 'another-origin'],
    ['destinationId', 'another-destination'],
    ['repairId', 'another-repair'],
  ] as const)('rejects a mismatched echoed %s', async (field, value) => {
    const evaluation = { ...makeEvaluation(), [field]: value };
    if (field === 'originNodeId' && evaluation.after.status === 'reachable') {
      evaluation.after.nodeIds[0] = String(value);
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ ...evaluationResponse(), data: evaluation })));

    await expect(fetchTrip(makeRequest(), new AbortController().signal)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE', status: 200,
    });
  });

  it('rejects a null repair echo when a repair was posted', async () => {
    const evaluation = makeEvaluation({ ...makeRequest(), repairId: null });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(evaluationResponse(evaluation))));

    await expect(fetchTrip(makeRequest(), new AbortController().signal)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE', status: 200,
    });
  });

  it('rejects malformed evaluation paths', async () => {
    const evaluation = makeEvaluation();
    if (evaluation.after.status === 'reachable') evaluation.after.distanceMeters = -1;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(evaluationResponse(evaluation))));

    await expect(fetchTrip(makeRequest(), new AbortController().signal)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE', status: 200,
    });
  });
});

const transports = [
  {
    label: 'context transport',
    load: (signal: AbortSignal) => fetchTripScenario(signal),
    success: () => scenarioResponse(),
  },
  {
    label: 'evaluation transport',
    load: (signal: AbortSignal) => fetchTrip(makeRequest(), signal),
    success: () => evaluationResponse(),
  },
] as const;

describe.each(transports)('$label response boundaries', ({ load, success }) => {
  it.each([
    [400, 'INVALID_REQUEST'],
    [404, 'SCENARIO_NOT_FOUND'],
    [409, 'STALE_SCENARIO'],
    [500, 'INVALID_SERVER_SCENARIO'],
  ] as const)('exposes the typed HTTP %i failure', async (status, code) => {
    const message = 'The requested trip could not be loaded.';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      contractVersion: TRIP_CONTRACT_VERSION, ok: false, error: { code, message },
    }, { status })));

    await expect(load(new AbortController().signal)).rejects.toMatchObject({
      name: 'TripFetchError', code, message, status,
    });
  });

  it.each([201, 202, 404, 500])('rejects a success envelope with HTTP %i', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(success(), { status })));

    await expect(load(new AbortController().signal)).rejects.toMatchObject({ code: 'INVALID_RESPONSE', status });
  });

  it.each([200, 400, 409, 500])('rejects a not-found envelope with HTTP %i', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      contractVersion: TRIP_CONTRACT_VERSION, ok: false,
      error: { code: 'SCENARIO_NOT_FOUND', message: 'Scenario not found.' },
    }, { status })));

    await expect(load(new AbortController().signal)).rejects.toMatchObject({ code: 'INVALID_RESPONSE', status });
  });

  it.each([
    ['missing data', () => ({ contractVersion: TRIP_CONTRACT_VERSION, ok: true })],
    ['missing contract version', () => ({ ok: true, data: success().data })],
    ['wrong contract version', () => ({ ...success(), contractVersion: 'curb-next' })],
    ['extra envelope field', () => ({ ...success(), fallback: true })],
    ['extra data field', () => ({ ...success(), data: { ...success().data, fallback: true } })],
    ['unknown error code', () => ({
      contractVersion: TRIP_CONTRACT_VERSION, ok: false, error: { code: 'OTHER', message: 'Failure.' },
    })],
    ['extra error field', () => ({
      contractVersion: TRIP_CONTRACT_VERSION, ok: false,
      error: { code: 'INVALID_REQUEST', message: 'Failure.', retry: true },
    })],
  ] as const)('rejects %s', async (_label, body) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(body())));

    await expect(load(new AbortController().signal)).rejects.toMatchObject({ code: 'INVALID_RESPONSE', status: 200 });
  });

  it('rejects non-JSON responses without retrying or falling back', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('Unavailable', { status: 503 }));
    vi.stubGlobal('fetch', fetcher);

    await expect(load(new AbortController().signal)).rejects.toBeInstanceOf(TripFetchError);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('preserves a network TypeError without retrying', async () => {
    const error = new TypeError('Failed to fetch');
    const fetcher = vi.fn().mockRejectedValue(error);
    vi.stubGlobal('fetch', fetcher);

    await expect(load(new AbortController().signal)).rejects.toBe(error);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('preserves an abort that happened before fetching', async () => {
    const controller = new AbortController();
    const reason = new DOMException('Trip superseded', 'AbortError');
    controller.abort(reason);
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);

    await expect(load(controller.signal)).rejects.toBe(reason);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('preserves an abort after headers and avoids reading JSON', async () => {
    const controller = new AbortController();
    const response = Response.json(success());
    const readBody = vi.spyOn(response, 'json');
    vi.stubGlobal('fetch', vi.fn(async () => {
      controller.abort(new DOMException('Trip superseded', 'AbortError'));
      return response;
    }));

    await expect(load(controller.signal)).rejects.toBe(controller.signal.reason);
    expect(readBody).not.toHaveBeenCalled();
  });

  it.each([false, true])('preserves abort while JSON is pending (JSON rejects: %s)', async (rejectJson) => {
    const controller = new AbortController();
    const response = Response.json(success());
    let finishBody!: () => void;
    const pendingBody = new Promise<void>((resolve) => { finishBody = resolve; });
    const body = success();
    const readBody = vi.spyOn(response, 'json').mockImplementation(async () => {
      await pendingBody;
      if (rejectJson) throw new SyntaxError('Incomplete JSON.');
      return body;
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

    const loading = load(controller.signal);
    await vi.waitFor(() => expect(readBody).toHaveBeenCalledTimes(1));
    controller.abort(new DOMException('Trip superseded', 'AbortError'));
    finishBody();

    await expect(loading).rejects.toBe(controller.signal.reason);
  });
});
