import { afterEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import { fetchPlan, fetchPlanScenario, PlanFetchError } from '../../../src/client/curb/fetchPlan';
import {
  PLAN_CONTRACT_VERSION,
  PLAN_SCHEMA_VERSION,
  type PlanComparison,
  type PlanRequest,
  type PlanScenario,
  type PlanSelection,
} from '../../../src/contracts/curb/plans';
import { STEP_FREE_PROFILE_ID } from '../../../src/contracts/curb/trips';

function makeRequest(): PlanRequest {
  return {
    contractVersion: PLAN_CONTRACT_VERSION,
    scenarioId: 'transport-example',
    revision: 3,
    profileId: STEP_FREE_PROFILE_ID,
    originNodeId: 'origin',
    budgetCents: 0,
  };
}

function makeScenario(scenarioId = makeRequest().scenarioId): PlanScenario {
  const { originNodeId, revision } = makeRequest();
  return {
    schemaVersion: PLAN_SCHEMA_VERSION,
    contractVersion: PLAN_CONTRACT_VERSION,
    scenario: {
      schemaVersion: 1,
      id: scenarioId,
      revision,
      title: 'Synthetic same-node test',
      dataKind: 'synthetic',
      nodes: [{ id: originNodeId, label: 'Arrival', coordinate: [0, 0] }],
      edges: [],
      destinations: [{ id: 'arrival', label: 'Arrival', nodeId: originNodeId }],
      barriers: [],
      evidence: [],
    },
    profile: { id: STEP_FREE_PROFILE_ID, label: 'Step-free example', description: 'Test profile.' },
    assumptions: ['The destination is at the origin.'],
    edgeAssessments: [],
    repairs: [],
    originNodeId,
    destinationIds: ['arrival'],
    candidates: [],
    defaultBudgetCents: 0,
  };
}

function makeComparison(request = makeRequest()): PlanComparison {
  const untouched: PlanSelection = {
    outcomes: [{
      destinationId: 'arrival',
      route: { status: 'reachable', nodeIds: [request.originNodeId], edgeIds: [], distanceMeters: 0 },
    }],
    reachableCount: 1,
    selectedRepairIds: [],
    spendCents: 0,
    restoredDestinationIds: [],
    restoredCount: 0,
    withoutRepair: [],
  };

  return {
    ...request,
    baseline: { outcomes: untouched.outcomes, reachableCount: untouched.reachableCount },
    eligibleRepairs: [],
    excludedUnknownCostRepairIds: [],
    conditionFirst: untouched,
    exact: untouched,
    singleRepairs: [],
    search: { enumeratedSubsetCount: 1, feasibleSubsetCount: 1 },
  };
}

function success<T>(data: T) {
  return { contractVersion: PLAN_CONTRACT_VERSION, ok: true, data };
}

function mockResponse(body: unknown, status = 200) {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(body, { status }));
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('fetchPlanScenario', () => {
  it('loads the default context with no query, no cache and the original signal', async () => {
    const scenario = makeScenario();
    const fetcher = mockResponse(success(scenario));
    const { signal } = new AbortController();

    await expect(fetchPlanScenario(signal)).resolves.toEqual(scenario);
    expect(fetcher).toHaveBeenCalledExactlyOnceWith('/api/curb/plan-scenario', { signal, cache: 'no-store' });
    expect(fetcher.mock.calls[0]?.[1]?.signal).toBe(signal);
  });

  it('encodes an explicit scenario ID and accepts its matching scenario', async () => {
    const scenario = makeScenario('transport example/?&');
    const fetcher = mockResponse(success(scenario));
    const { signal } = new AbortController();

    await expect(fetchPlanScenario(signal, scenario.scenario.id)).resolves.toEqual(scenario);
    expect(fetcher).toHaveBeenCalledExactlyOnceWith(
      '/api/curb/plan-scenario?scenarioId=transport+example%2F%3F%26',
      { signal, cache: 'no-store' },
    );
  });

  it('rejects a successful response for a different explicit scenario', async () => {
    const fetcher = mockResponse(success(makeScenario()));

    await expect(fetchPlanScenario(new AbortController().signal, 'other')).rejects.toMatchObject({
      code: 'INVALID_RESPONSE', status: 200,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('rejects a whitespace-only scenario selector locally', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);

    await expect(fetchPlanScenario(new AbortController().signal, '  ')).rejects.toBeInstanceOf(ZodError);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('rejects a context whose destination does not resolve under the shared schema', async () => {
    const response = { ...makeScenario(), destinationIds: ['other'] };
    mockResponse(success(response));

    await expect(fetchPlanScenario(new AbortController().signal)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE', status: 200,
    });
  });
});

describe('fetchPlan', () => {
  it('posts the complete validated request and the original signal with no cache', async () => {
    const request = Object.freeze(makeRequest());
    const comparison = makeComparison(request);
    const fetcher = mockResponse(success(comparison));
    const { signal } = new AbortController();

    await expect(fetchPlan(request, signal)).resolves.toEqual(comparison);
    expect(fetcher).toHaveBeenCalledExactlyOnceWith('/api/curb/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal,
      cache: 'no-store',
    });
    expect(fetcher.mock.calls[0]?.[1]?.signal).toBe(signal);
  });

  it('checks the posted snapshot when the caller changes the selection in flight', async () => {
    const submitted = makeRequest();
    const request = { ...submitted };
    const comparison = makeComparison(submitted);
    const fetcher = mockResponse(success(comparison));

    const loading = fetchPlan(request, new AbortController().signal);
    request.budgetCents = 400;
    request.revision += 1;

    await expect(loading).resolves.toEqual(comparison);
    expect(fetcher.mock.calls[0]?.[1]?.body).toBe(JSON.stringify(submitted));
  });

  it.each([
    { scenarioId: 'other' },
    { revision: 4 },
    { originNodeId: 'other-origin' },
    { budgetCents: 1 },
  ])('rejects a valid comparison for a different request field %o', async (difference) => {
    mockResponse(success(makeComparison({ ...makeRequest(), ...difference })));

    await expect(fetchPlan(makeRequest(), new AbortController().signal)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE', status: 200,
    });
  });

  it.each([
    { contractVersion: 'curb-r1' },
    { profileId: 'unknown-profile' },
    { search: { enumeratedSubsetCount: 2, feasibleSubsetCount: 2 } },
  ])('rejects malformed comparison data %o', async (difference) => {
    mockResponse(success({ ...makeComparison(), ...difference }));

    await expect(fetchPlan(makeRequest(), new AbortController().signal)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE', status: 200,
    });
  });

  it.each([
    { budgetCents: -1 },
    { scenarioId: '' },
    { profileId: 'unknown-profile' },
    { selectedRepairIds: ['client-selection'] },
  ])('rejects an invalid local request %o before fetching', async (difference) => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);

    const request = { ...makeRequest(), ...difference } as PlanRequest;
    await expect(fetchPlan(request, new AbortController().signal)).rejects.toBeInstanceOf(ZodError);
    expect(fetcher).not.toHaveBeenCalled();
  });
});

const transports = [
  {
    label: 'context transport',
    load: (signal: AbortSignal) => fetchPlanScenario(signal),
    payload: () => makeScenario(),
  },
  {
    label: 'comparison transport',
    load: (signal: AbortSignal) => fetchPlan(makeRequest(), signal),
    payload: () => makeComparison(),
  },
];

describe.each(transports)('$label response boundaries', ({ load, payload }) => {
  it.each([
    [400, 'INVALID_REQUEST'],
    [404, 'SCENARIO_NOT_FOUND'],
    [409, 'STALE_SCENARIO'],
    [500, 'INVALID_SERVER_SCENARIO'],
  ] as const)('preserves the typed HTTP %i failure', async (status, code) => {
    const message = 'The plan could not be loaded.';
    const fetcher = mockResponse({ contractVersion: PLAN_CONTRACT_VERSION, ok: false, error: { code, message } }, status);

    await expect(load(new AbortController().signal)).rejects.toMatchObject({
      name: 'PlanFetchError', code, message, status,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each([201, 400, 500])('rejects a success envelope with HTTP %i', async (status) => {
    mockResponse(success(payload()), status);

    await expect(load(new AbortController().signal)).rejects.toMatchObject({ code: 'INVALID_RESPONSE', status });
  });

  it.each([200, 400, 409, 500])('rejects a not-found envelope with HTTP %i', async (status) => {
    mockResponse({
      contractVersion: PLAN_CONTRACT_VERSION, ok: false,
      error: { code: 'SCENARIO_NOT_FOUND', message: 'Scenario not found.' },
    }, status);

    await expect(load(new AbortController().signal)).rejects.toMatchObject({ code: 'INVALID_RESPONSE', status });
  });

  const data = payload();
  const validEnvelope = success(data);
  const malformedBodies: [string, unknown][] = [
    ['a missing version', { ok: true, data }],
    ['the wrong version', { ...validEnvelope, contractVersion: 'curb-r1' }],
    ['missing data', { contractVersion: PLAN_CONTRACT_VERSION, ok: true }],
    ['an extra envelope field', { ...validEnvelope, fallback: true }],
    ['an extra payload field', success({ ...data, fallback: true })],
    ['a null body', null],
  ];
  it.each(malformedBodies)('rejects %s', async (_label, body) => {
    mockResponse(body);

    await expect(load(new AbortController().signal)).rejects.toMatchObject({ code: 'INVALID_RESPONSE', status: 200 });
  });

  it.each([
    { code: 'OTHER', message: 'Failure.' },
    { code: 'INVALID_REQUEST', message: 'Failure.', retry: true },
    { code: 'INVALID_REQUEST', message: '  ' },
  ])('rejects an invalid error detail %o', async (error) => {
    mockResponse({ contractVersion: PLAN_CONTRACT_VERSION, ok: false, error }, 400);

    await expect(load(new AbortController().signal)).rejects.toMatchObject({ code: 'INVALID_RESPONSE', status: 400 });
  });

  it('preserves observed HTTP status for an invalid JSON response', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('<unavailable>', { status: 503 }));
    vi.stubGlobal('fetch', fetcher);
    const loading = load(new AbortController().signal);

    await expect(loading).rejects.toBeInstanceOf(PlanFetchError);
    await expect(loading).rejects.toMatchObject({ code: 'INVALID_RESPONSE', status: 503 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('preserves a native network rejection', async () => {
    const error = new TypeError('Failed to fetch');
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(error);
    vi.stubGlobal('fetch', fetcher);

    await expect(load(new AbortController().signal)).rejects.toBe(error);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('preserves an existing abort without starting a request', async () => {
    const reason = new DOMException('Selection changed', 'AbortError');
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);

    await expect(load(AbortSignal.abort(reason))).rejects.toBe(reason);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('prioritizes an abort when the pending fetch rejects', async () => {
    const controller = new AbortController();
    vi.stubGlobal('fetch', vi.fn(async () => {
      controller.abort(new DOMException('Selection changed', 'AbortError'));
      throw new TypeError('Fetch interrupted');
    }));

    await expect(load(controller.signal)).rejects.toBe(controller.signal.reason);
  });

  it('checks for abort after headers before reading the body', async () => {
    const controller = new AbortController();
    const response = Response.json(success(payload()));
    const readBody = vi.spyOn(response, 'json');
    vi.stubGlobal('fetch', vi.fn(async () => {
      controller.abort(new DOMException('Selection changed', 'AbortError'));
      return response;
    }));

    await expect(load(controller.signal)).rejects.toBe(controller.signal.reason);
    expect(readBody).not.toHaveBeenCalled();
  });

  it.each([false, true])('checks abort when a pending body settles (rejects: %s)', async (rejectBody) => {
    const controller = new AbortController();
    const response = Response.json(success(payload()));
    let finishBody!: () => void;
    const pendingBody = new Promise<void>((resolve) => { finishBody = resolve; });
    const readBody = vi.spyOn(response, 'json').mockImplementation(async () => {
      await pendingBody;
      if (rejectBody) throw new SyntaxError('Interrupted JSON');
      return success(payload());
    });
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(response));

    const loading = load(controller.signal);
    await vi.waitFor(() => expect(readBody).toHaveBeenCalledTimes(1));
    controller.abort(new DOMException('Selection changed', 'AbortError'));
    finishBody();

    await expect(loading).rejects.toBe(controller.signal.reason);
  });
});
