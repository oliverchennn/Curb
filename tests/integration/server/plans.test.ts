import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PLAN_CONTRACT_VERSION,
  PlanComparisonSchema,
  PlanResponseSchema,
  PlanScenarioResponseSchema,
  PlanScenarioSchema,
  matchesPlanRequest,
  matchesPlanScenario,
  type PlanRequest,
} from '../../../src/contracts/curb/plans';
import planDemo from '../../../src/data/curb/plan-demo.json';

const fixture = PlanScenarioSchema.parse(planDemo);
const request: PlanRequest = {
  contractVersion: PLAN_CONTRACT_VERSION,
  scenarioId: fixture.scenario.id,
  revision: fixture.scenario.revision,
  profileId: fixture.profile.id,
  originNodeId: fixture.originNodeId,
  budgetCents: 400,
};
const internalFailure = {
  status: 500,
  body: {
    contractVersion: PLAN_CONTRACT_VERSION,
    ok: false,
    error: {
      code: 'INVALID_SERVER_SCENARIO',
      message: 'The repair plan scenario could not be evaluated.',
    },
  },
};

async function context(query = '') {
  const { GET } = await import('../../../app/api/curb/plan-scenario/route');
  const response = GET(new Request('http://localhost/api/curb/plan-scenario' + query));
  expect(response.headers.get('cache-control')).toBe('no-store');
  return { status: response.status, body: PlanScenarioResponseSchema.parse(await response.json()) };
}

async function rawComparison(body: string) {
  const { POST } = await import('../../../app/api/curb/plan/route');
  const response = await POST(new Request('http://localhost/api/curb/plan', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  }));
  expect(response.headers.get('cache-control')).toBe('no-store');
  return { status: response.status, body: PlanResponseSchema.parse(await response.json()) };
}

const comparison = (input: unknown = request) => rawComparison(JSON.stringify(input));

afterEach(() => {
  vi.doUnmock('../../../src/data/curb/plan-demo.json');
  vi.doUnmock('../../../src/domain/curb/plans');
  vi.resetModules();
});

describe('GET /api/curb/plan-scenario', () => {
  it('returns the authored context explicitly or by default', async () => {
    const body = { contractVersion: PLAN_CONTRACT_VERSION, ok: true, data: fixture };
    expect(await context()).toEqual({ status: 200, body });
    const query = new URLSearchParams({ scenarioId: fixture.scenario.id });
    expect(await context('?' + query)).toEqual({ status: 200, body });
  });

  it('returns not found for an unsupported scenario', async () => {
    expect(await context('?scenarioId=unsupported-plan')).toMatchObject({
      status: 404, body: { ok: false, error: { code: 'SCENARIO_NOT_FOUND' } },
    });
  });

  it.each([
    '?scenarioId=',
    '?scenarioId=%20',
    '?scenarioId=one&scenarioId=two',
    '?scenarioId=one&scenarioId=one',
    '?scenarioId=one&budgetCents=400',
    '?dataset=sample',
  ])('rejects invalid or ambiguous query %s', async (query) => {
    expect(await context(query)).toMatchObject({
      status: 400, body: { ok: false, error: { code: 'INVALID_REQUEST' } },
    });
  });
});

describe('POST /api/curb/plan', () => {
  it('returns a validated complementary bundle and condition-first comparison at the same budget', async () => {
    const { status, body } = await comparison();
    expect(status).toBe(200);
    if (!body.ok) throw new Error('Expected a successful comparison.');
    const result = body.data;
    expect(matchesPlanRequest(result, request)).toBe(true);
    expect(matchesPlanScenario(result, fixture)).toBe(true);
    expect(result.conditionFirst).toMatchObject({
      selectedRepairIds: ['repair-c'],
      spendCents: 400,
      restoredCount: 1,
      restoredDestinationIds: ['hall'],
    });
    expect(result.exact).toMatchObject({
      selectedRepairIds: ['repair-a', 'repair-b'],
      spendCents: 400,
      restoredCount: 2,
      restoredDestinationIds: ['library', 'student-center'],
    });
    expect(result.baseline.outcomes.filter(({ route }) => route.status === 'reachable').map(({ destinationId }) => destinationId))
      .toEqual(['cafe']);
    const exactSingles = result.singleRepairs.filter(({ repairId }) =>
      result.exact.selectedRepairIds.includes(repairId));
    expect(exactSingles.map(({ restoredDestinationIds }) => restoredDestinationIds)).toEqual([[], []]);
    expect(result.exact.withoutRepair.map(({ restoredDestinationIds }) => restoredDestinationIds)).toEqual([[], []]);
    expect(result.excludedUnknownCostRepairIds).toEqual(['repair-studio']);
    expect(result.search).toEqual({ enumeratedSubsetCount: 8, feasibleSubsetCount: 5 });
  });

  it('keeps a zero-budget comparison and later requests isolated', async () => {
    const originalFixture = JSON.stringify(planDemo);
    const before = await comparison();
    const zero = await comparison({ ...request, budgetCents: 0 });
    expect(zero).toMatchObject({
      status: 200,
      body: {
        ok: true,
        data: {
          budgetCents: 0,
          conditionFirst: { spendCents: 0 },
          exact: { spendCents: 0 },
        },
      },
    });
    expect(await comparison()).toEqual(before);
    expect(await context()).toMatchObject({ status: 200, body: { ok: true, data: fixture } });
    expect(JSON.stringify(planDemo)).toBe(originalFixture);
  });

  it.each([
    [{ scenarioId: 'unsupported-plan' }, 404, 'SCENARIO_NOT_FOUND'],
    [{ revision: request.revision + 1 }, 409, 'STALE_SCENARIO'],
    [{ originNodeId: 'missing-node' }, 400, 'INVALID_REQUEST'],
    [{ profileId: 'another-profile' }, 400, 'INVALID_REQUEST'],
    [{ scenarioId: '' }, 400, 'INVALID_REQUEST'],
    [{ contractVersion: 'curb-r1' }, 400, 'INVALID_REQUEST'],
    [{ revision: -1 }, 400, 'INVALID_REQUEST'],
    [{ budgetCents: -1 }, 400, 'INVALID_REQUEST'],
    [{ budgetCents: 0.5 }, 400, 'INVALID_REQUEST'],
    [{ budgetCents: Number.MAX_SAFE_INTEGER + 1 }, 400, 'INVALID_REQUEST'],
    [{ budgetCents: '400' }, 400, 'INVALID_REQUEST'],
    [{ budgetCents: undefined }, 400, 'INVALID_REQUEST'],
    [{ candidates: [] }, 400, 'INVALID_REQUEST'],
    [{ costs: [1] }, 400, 'INVALID_REQUEST'],
    [{ selectedRepairIds: [] }, 400, 'INVALID_REQUEST'],
  ] as const)('returns the expected typed error for invalid selection %#', async (patch, status, code) => {
    expect(await comparison({ ...request, ...patch })).toMatchObject({
      status, body: { ok: false, error: { code } },
    });
  });

  it('rejects a different existing node as origin', async () => {
    const alternative = fixture.scenario.nodes.find(({ id }) => id !== fixture.originNodeId);
    if (!alternative) throw new Error('Expected a second node in the planning fixture.');
    expect(await comparison({ ...request, originNodeId: alternative.id })).toMatchObject({
      status: 400, body: { ok: false, error: { code: 'INVALID_REQUEST' } },
    });
  });

  it.each(['', '{', 'null', '[]', '"text"'])('rejects malformed JSON/body shape %s', async (body) => {
    expect(await rawComparison(body)).toMatchObject({
      status: 400, body: { ok: false, error: { code: 'INVALID_REQUEST' } },
    });
  });
});

describe('invalid internal planning data', () => {
  it.each(['schema', 'relationship'] as const)('returns generic 500 for a fixture %s failure', async (kind) => {
    const invalid = structuredClone(planDemo);
    if (kind === 'schema') invalid.schemaVersion = 2;
    else invalid.scenario.edges[0].toNodeId = 'not-in-graph';
    vi.doMock('../../../src/data/curb/plan-demo.json', () => ({ default: invalid }));

    expect(await context()).toEqual(internalFailure);
    expect(await comparison()).toEqual(internalFailure);
    expect(await comparison(null)).toMatchObject({
      status: 400, body: { ok: false, error: { code: 'INVALID_REQUEST' } },
    });
  });

  it('maps request-shaped errors during context loading to generic 500', async () => {
    vi.doMock('../../../src/domain/curb/plans', async (importOriginal) => {
      const domain = await importOriginal<typeof import('../../../src/domain/curb/plans')>();
      return {
        ...domain,
        validatePlanScenario() {
          throw new domain.PlanRequestError('INVALID_REQUEST', 'Private fixture detail.');
        },
      };
    });

    expect(await context()).toEqual(internalFailure);
    expect(await comparison()).toEqual(internalFailure);
  });

  it('checks the context returned by the validator before exposing or using it', async () => {
    vi.doMock('../../../src/domain/curb/plans', async (importOriginal) => {
      const domain = await importOriginal<typeof import('../../../src/domain/curb/plans')>();
      return {
        ...domain,
        validatePlanScenario(input: unknown) {
          return { ...domain.validatePlanScenario(input), schemaVersion: 2 };
        },
      };
    });

    expect(await context()).toEqual(internalFailure);
    expect(await comparison()).toEqual(internalFailure);
  });

  it('returns generic 500 for an unexpected evaluator failure', async () => {
    vi.doMock('../../../src/domain/curb/plans', async (importOriginal) => ({
      ...await importOriginal<typeof import('../../../src/domain/curb/plans')>(),
      comparePlans() { throw new Error('Private evaluator detail.'); },
    }));
    expect(await comparison()).toEqual(internalFailure);
  });

  it('returns generic 500 if an evaluated response fails its output schema', async () => {
    vi.doMock('../../../src/domain/curb/plans', async (importOriginal) => {
      const domain = await importOriginal<typeof import('../../../src/domain/curb/plans')>();
      return {
        ...domain,
        comparePlans(...args: Parameters<typeof domain.comparePlans>) {
          const plan = domain.comparePlans(...args);
          return { ...plan, exact: { ...plan.exact, restoredCount: plan.exact.restoredCount + 1 } };
        },
      };
    });

    expect(await comparison()).toEqual(internalFailure);
  });

  it('rejects a structurally valid result for a different submitted budget', async () => {
    vi.doMock('../../../src/domain/curb/plans', async (importOriginal) => {
      const domain = await importOriginal<typeof import('../../../src/domain/curb/plans')>();
      return {
        ...domain,
        comparePlans(plan: Parameters<typeof domain.comparePlans>[0], submitted: PlanRequest) {
          submitted.budgetCents = 0;
          return PlanComparisonSchema.parse(domain.comparePlans(plan, submitted));
        },
      };
    });

    expect(await comparison()).toEqual(internalFailure);
  });

  it('rejects shape-valid results that disagree with authoritative candidate costs', async () => {
    vi.doMock('../../../src/domain/curb/plans', async (importOriginal) => {
      const domain = await importOriginal<typeof import('../../../src/domain/curb/plans')>();
      return {
        ...domain,
        comparePlans(...args: Parameters<typeof domain.comparePlans>) {
          const result = domain.comparePlans(...args);
          const eligibleRepairs = result.eligibleRepairs.map((repair) => ({
            ...repair, costCents: repair.costCents === 0 ? 0 : repair.costCents + 1,
          }));
          return PlanComparisonSchema.parse({ ...result, eligibleRepairs });
        },
      };
    });

    expect(await comparison({ ...request, budgetCents: 0 })).toEqual(internalFailure);
  });
});
