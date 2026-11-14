import { describe, expect, it } from 'vitest';
import {
  MAX_PLAN_CANDIDATES,
  MAX_PLAN_SUBSETS,
  PLAN_CONTRACT_VERSION,
  PLAN_ERROR_HTTP_STATUS,
  PlanComparisonSchema,
  PlanRepairCostSchema,
  PlanRequestSchema,
  PlanResponseSchema,
  PlanScenarioQuerySchema,
  PlanScenarioResponseSchema,
  PlanScenarioSchema,
  matchesPlanRequest,
  matchesPlanScenario,
  type PlanComparison,
  type PlanDestinationOutcome,
  type PlanRequest,
  type PlanSelection,
} from '../../../src/contracts/curb/plans';
import { STEP_FREE_PROFILE_ID, TripScenarioSchema } from '../../../src/contracts/curb/trips';
import tripDemo from '../../../src/data/curb/trip-demo.json';

const cost = (cents: number) => ({
  status: 'assumed' as const,
  cents,
  source: 'Authored scenario estimate.',
});

const candidate = (repairId: string, cents: number) => ({
  repairId,
  severity: { score: 3, rationale: 'Authored condition rating for comparison.' },
  cost: cost(cents),
});

const validContext = () => {
  const trip = TripScenarioSchema.parse(tripDemo);
  return {
    schemaVersion: 1,
    contractVersion: PLAN_CONTRACT_VERSION,
    scenario: trip.scenario,
    profile: trip.profile,
    assumptions: trip.assumptions,
    edgeAssessments: trip.edgeAssessments,
    repairs: trip.repairs,
    originNodeId: trip.defaults.originNodeId,
    destinationIds: trip.scenario.destinations.map(({ id }) => id),
    candidates: trip.repairs.map(({ id }) => candidate(id, 200)),
    defaultBudgetCents: 400,
  };
};

const request: PlanRequest = {
  contractVersion: PLAN_CONTRACT_VERSION,
  scenarioId: 'bundle-test',
  revision: 1,
  profileId: STEP_FREE_PROFILE_ID,
  originNodeId: 'origin',
  budgetCents: 400,
};

function reached(destinationId: string, links: string[]): PlanDestinationOutcome {
  return {
    destinationId,
    route: {
      status: 'reachable',
      nodeIds: ['origin', ...links.slice(0, -1).map((id) => id + '-node'), destinationId],
      edgeIds: links,
      distanceMeters: links.length * 10,
    },
  };
}

function blocked(destinationId: string, links: string[]): PlanDestinationOutcome {
  return {
    destinationId,
    route: { status: 'blocked', blockedEdgeIds: links, unknownEdgeIds: [] },
  };
}

const baseline = () => ({
  outcomes: [
    reached('arrival', ['arrival-link']),
    blocked('library', ['link-a', 'link-b']),
    blocked('studio', ['link-a', 'link-b']),
    blocked('hall', ['link-c']),
  ],
  reachableCount: 1,
});

function single(repairId: string) {
  const projection = { repairId, ...baseline(), restoredDestinationIds: [] as string[] };
  if (repairId === 'a' || repairId === 'b') {
    const remainingBlocker = repairId === 'a' ? 'link-b' : 'link-a';
    projection.outcomes[1] = blocked('library', [remainingBlocker]);
    projection.outcomes[2] = blocked('studio', [remainingBlocker]);
  } else if (repairId === 'c') {
    projection.outcomes[3] = reached('hall', ['link-c']);
    projection.reachableCount = 2;
    projection.restoredDestinationIds = ['hall'];
  }
  return projection;
}

function comparison(): PlanComparison {
  const condition = single('c');
  const bundled = baseline();
  bundled.outcomes[1] = reached('library', ['link-a', 'link-b', 'library-link']);
  bundled.outcomes[2] = reached('studio', ['link-a', 'link-b', 'studio-link']);
  return {
    ...request,
    baseline: baseline(),
    eligibleRepairs: [
      { repairId: 'c', severityScore: 5, costCents: 400 },
      { repairId: 'a', severityScore: 3, costCents: 200 },
      { repairId: 'b', severityScore: 3, costCents: 200 },
    ],
    excludedUnknownCostRepairIds: ['survey-first'],
    conditionFirst: {
      outcomes: condition.outcomes,
      reachableCount: condition.reachableCount,
      selectedRepairIds: ['c'],
      spendCents: 400,
      restoredDestinationIds: ['hall'],
      restoredCount: 1,
      withoutRepair: [{ repairId: 'c', ...baseline(), restoredDestinationIds: [] }],
    },
    exact: {
      ...bundled,
      reachableCount: 3,
      selectedRepairIds: ['a', 'b'],
      spendCents: 400,
      restoredDestinationIds: ['library', 'studio'],
      restoredCount: 2,
      withoutRepair: [
        { ...single('b'), repairId: 'a' },
        { ...single('a'), repairId: 'b' },
      ],
    },
    singleRepairs: ['a', 'b', 'c'].map(single),
    search: { enumeratedSubsetCount: 8, feasibleSubsetCount: 5 },
  };
}

const noRepairs = (): PlanSelection => ({
  ...baseline(),
  selectedRepairIds: [],
  spendCents: 0,
  restoredDestinationIds: [],
  restoredCount: 0,
  withoutRepair: [],
});

describe('curb-r2 plan context', () => {
  it('composes the R1 graph schemas while leaving the R1 contract unchanged', () => {
    const input = validContext();
    expect(PlanScenarioSchema.parse(input)).toEqual(input);
    expect(PlanScenarioSchema.safeParse(tripDemo).success).toBe(false);
    expect(TripScenarioSchema.safeParse(input).success).toBe(false);
  });

  it('represents a zero default budget and an empty candidate set', () => {
    expect(PlanScenarioSchema.safeParse({ ...validContext(), defaultBudgetCents: 0, candidates: [] }).success).toBe(true);
  });

  it('requires authored synthetic data and synthetic evidence', () => {
    const input = validContext();
    expect(PlanScenarioSchema.safeParse({ ...input, scenario: { ...input.scenario, dataKind: 'field' } }).success).toBe(false);
    input.scenario.evidence[0].origin = 'field';
    expect(PlanScenarioSchema.safeParse(input).success).toBe(false);
  });

  it('requires a real origin and distinct existing destinations', () => {
    const input = validContext();
    const [destination] = input.destinationIds;
    expect(PlanScenarioSchema.safeParse({ ...input, originNodeId: 'missing-node' }).success).toBe(false);
    expect(PlanScenarioSchema.safeParse({ ...input, destinationIds: [destination, destination] }).success).toBe(false);
    expect(PlanScenarioSchema.safeParse({ ...input, destinationIds: ['unknown-destination'] }).success).toBe(false);
    expect(PlanScenarioSchema.safeParse({ ...input, destinationIds: [] }).success).toBe(false);
  });

  it('requires distinct declared repair IDs, documented severity and at most 12 candidates', () => {
    const input = validContext();
    const [realCandidate] = input.candidates;
    expect(PlanScenarioSchema.safeParse({ ...input, candidates: [candidate('unknown', 100)] }).success).toBe(false);
    expect(PlanScenarioSchema.safeParse({ ...input, candidates: [realCandidate, realCandidate] }).success).toBe(false);
    expect(PlanScenarioSchema.safeParse({
      ...input, candidates: [{ ...realCandidate, severity: { score: 6, rationale: ' ' } }],
    }).success).toBe(false);
    const repairs = Array.from({ length: MAX_PLAN_CANDIDATES + 1 }, (_, index) => ({
      ...input.repairs[0], id: 'repair-' + index,
    }));
    const candidates = repairs.map(({ id }) => candidate(id, 1));
    expect(PlanScenarioSchema.safeParse({ ...input, repairs, candidates: candidates.slice(0, MAX_PLAN_CANDIDATES) }).success).toBe(true);
    expect(PlanScenarioSchema.safeParse({ ...input, repairs, candidates }).success).toBe(false);
    expect(MAX_PLAN_SUBSETS).toBe(4096);
  });

  it('requires an explicit unknown amount and source and accepts precise known cents', () => {
    expect(PlanRepairCostSchema.safeParse({ status: 'unknown', cents: null, source: 'Waiting for estimate' }).success).toBe(true);
    expect(PlanRepairCostSchema.safeParse({ status: 'unknown', cents: 0, source: 'Waiting for estimate' }).success).toBe(false);
    expect(PlanRepairCostSchema.safeParse({ status: 'unknown', source: 'Waiting for estimate' }).success).toBe(false);
    expect(PlanRepairCostSchema.safeParse({ status: 'quoted', cents: 203, source: 'Synthetic quote' }).success).toBe(true);
    expect(PlanRepairCostSchema.safeParse({ status: 'quoted', cents: 203, source: ' ' }).success).toBe(false);
    for (const cents of [-1, 0.5, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      expect(PlanRepairCostSchema.safeParse(cost(cents)).success).toBe(false);
    }
  });

  it('rejects an unsafe total of individually safe candidate costs', () => {
    const input = validContext();
    const [first, second] = input.repairs;
    expect(PlanScenarioSchema.safeParse({
      ...input, candidates: [candidate(first.id, Number.MAX_SAFE_INTEGER), candidate(second.id, 1)],
    }).success).toBe(false);
  });
});

describe('curb-r2 request, identity and envelopes', () => {
  it('accepts an omitted GET selector and rejects blank or invented query fields', () => {
    expect(PlanScenarioQuerySchema.parse({})).toEqual({});
    expect(PlanScenarioQuerySchema.safeParse({ scenarioId: ' ' }).success).toBe(false);
    expect(PlanScenarioQuerySchema.safeParse({ budgetCents: 400 }).success).toBe(false);
  });

  it('requires the full request tuple and forbids client costs, choices and priorities', () => {
    expect(PlanRequestSchema.parse({ ...request, budgetCents: 0 }).budgetCents).toBe(0);
    for (const patch of [
      { budgetCents: -1 }, { budgetCents: 1.5 }, { budgetCents: Number.MAX_SAFE_INTEGER + 1 },
      { budgetCents: undefined }, { revision: undefined }, { revision: -1 }, { profileId: 'other' },
      { scenarioId: ' ' }, { originNodeId: undefined }, { contractVersion: 'curb-r1' },
      { costs: [1, 2] }, { selectedRepairIds: ['a'] }, { destinationWeights: [2] },
    ]) {
      expect(PlanRequestSchema.safeParse({ ...request, ...patch }).success).toBe(false);
    }
  });

  it('checks every response identity field against the request', () => {
    const result = comparison();
    expect(matchesPlanRequest(result, request)).toBe(true);
    for (const patch of [
      { scenarioId: 'other' }, { revision: 2 }, { originNodeId: 'different' }, { budgetCents: 401 },
    ]) {
      expect(matchesPlanRequest(result, { ...request, ...patch })).toBe(false);
    }
  });

  it('rejects a consistent response for a different context or graph references', () => {
    const trip = TripScenarioSchema.parse(tripDemo);
    const context = PlanScenarioSchema.parse({ ...validContext(), candidates: [] });
    const { scenario, profile } = context;
    const firstDestination = scenario.destinations[0];
    context.originNodeId = firstDestination.nodeId;
    const coverage = {
      outcomes: context.destinationIds.map((destinationId): PlanDestinationOutcome => ({
        destinationId,
        route: { status: 'disconnected', blockedEdgeIds: [], unknownEdgeIds: [] },
      })),
      reachableCount: 0,
    };
    coverage.outcomes[0].route = {
      status: 'reachable', nodeIds: [firstDestination.nodeId], edgeIds: [], distanceMeters: 0,
    };
    coverage.reachableCount = 1;
    const selection = { ...noRepairs(), ...coverage };
    const result = PlanComparisonSchema.parse({
      ...request, scenarioId: scenario.id, revision: scenario.revision, profileId: profile.id,
      originNodeId: context.originNodeId, baseline: coverage, conditionFirst: selection, exact: selection,
      eligibleRepairs: [], excludedUnknownCostRepairIds: [], singleRepairs: [],
      search: { enumeratedSubsetCount: 1, feasibleSubsetCount: 1 },
    });
    expect(matchesPlanScenario(result, context)).toBe(true);
    expect(matchesPlanScenario({ ...result, revision: result.revision + 1 }, context)).toBe(false);
    expect(matchesPlanScenario(result, { ...context, destinationIds: [...context.destinationIds].reverse() })).toBe(false);
    expect(matchesPlanScenario(result, {
      ...context, candidates: [candidate(trip.repairs[0].id, 200)],
    })).toBe(false);
    result.baseline.outcomes[0].route = {
      status: 'blocked', blockedEdgeIds: ['not-in-graph'], unknownEdgeIds: [],
    };
    expect(matchesPlanScenario(result, context)).toBe(false);
  });

  it('keeps strict versioned response envelopes and the four status codes', () => {
    expect(PLAN_ERROR_HTTP_STATUS).toEqual({
      INVALID_REQUEST: 400, SCENARIO_NOT_FOUND: 404, STALE_SCENARIO: 409, INVALID_SERVER_SCENARIO: 500,
    });
    for (const code of Object.keys(PLAN_ERROR_HTTP_STATUS)) {
      const failure = { contractVersion: PLAN_CONTRACT_VERSION, ok: false, error: { code, message: 'Failure' } };
      expect(PlanScenarioResponseSchema.safeParse(failure).success).toBe(true);
      expect(PlanResponseSchema.safeParse(failure).success).toBe(true);
      expect(PlanResponseSchema.safeParse({ ...failure, data: comparison() }).success).toBe(false);
    }
    expect(PlanScenarioResponseSchema.safeParse({ contractVersion: 'curb-r2', ok: true, data: validContext() }).success).toBe(true);
    expect(PlanResponseSchema.safeParse({ contractVersion: 'curb-r2', ok: true, data: comparison() }).success).toBe(true);
    expect(PlanResponseSchema.safeParse({ contractVersion: 'curb-r1', ok: true, data: comparison() }).success).toBe(false);
  });
});

describe('curb-r2 comparison invariants', () => {
  it('represents real bundle complementarity without attributing additive scores', () => {
    const parsed = PlanComparisonSchema.parse(comparison());
    expect(parsed.baseline.reachableCount).toBe(1);
    expect(parsed.conditionFirst.restoredDestinationIds).toEqual(['hall']);
    expect(parsed.exact.restoredDestinationIds).toEqual(['library', 'studio']);
    expect(parsed.exact.withoutRepair.map(({ restoredDestinationIds }) => restoredDestinationIds)).toEqual([[], []]);
    expect(parsed.singleRepairs.slice(0, 2).map(({ restoredDestinationIds }) => restoredDestinationIds)).toEqual([[], []]);
  });

  it('represents zero budget with no affordable purchases and the empty eligible set', () => {
    const result = comparison();
    result.budgetCents = 0;
    result.conditionFirst = noRepairs();
    result.exact = noRepairs();
    result.singleRepairs = [];
    result.search.feasibleSubsetCount = 1;
    expect(PlanComparisonSchema.safeParse(result).success).toBe(true);
    result.eligibleRepairs = [];
    result.search.enumeratedSubsetCount = 1;
    expect(PlanComparisonSchema.safeParse(result).success).toBe(true);
  });

  it('allows genuine zero-cost projects and keeps condition-first purchase order', () => {
    const result = comparison();
    result.budgetCents = 0;
    result.eligibleRepairs = [
      { repairId: 'z', severityScore: 5, costCents: 0 },
      { repairId: 'a', severityScore: 1, costCents: 0 },
    ];
    const project = (repairId: string) => ({ repairId, ...baseline(), restoredDestinationIds: [] });
    result.conditionFirst = {
      ...noRepairs(),
      selectedRepairIds: ['z', 'a'],
      withoutRepair: ['z', 'a'].map(project),
    };
    result.exact = noRepairs();
    result.singleRepairs = ['a', 'z'].map(project);
    result.search = { enumeratedSubsetCount: 4, feasibleSubsetCount: 4 };
    expect(PlanComparisonSchema.safeParse(result).success).toBe(true);
    result.conditionFirst.selectedRepairIds.reverse();
    result.conditionFirst.withoutRepair.reverse();
    expect(PlanComparisonSchema.safeParse(result).success).toBe(false);
  });

  it.each<[string, (result: PlanComparison) => void]>([
    ['duplicate baseline destination', (p) => { p.baseline.outcomes[1] = p.baseline.outcomes[0]; }],
    ['inconsistent reachable count', (p) => { p.exact.reachableCount += 1; }],
    ['inconsistent restored count', (p) => { p.exact.restoredCount -= 1; }],
    ['inconsistent restored IDs', (p) => { p.conditionFirst.restoredDestinationIds = ['library']; }],
    ['outcomes with an unknown destination', (p) => { p.exact.outcomes[0].destinationId = 'other'; }],
    ['a route from the wrong origin', (p) => {
      const route = p.exact.outcomes[0].route;
      if (route.status === 'reachable') route.nodeIds[0] = 'wrong-origin';
    }],
    ['loss of baseline reachability', (p) => { p.exact.outcomes[0] = blocked('arrival', ['arrival-link']); }],
    ['unknown-cost selection', (p) => { p.exact.selectedRepairIds = ['a', 'survey-first']; }],
    ['duplicate selected repair', (p) => { p.exact.selectedRepairIds = ['a', 'a']; }],
    ['unstable selected repair order', (p) => { p.exact.selectedRepairIds = ['b', 'a']; }],
    ['misreported spend', (p) => { p.exact.spendCents = 399; }],
    ['overspend', (p) => { p.budgetCents = 399; }],
    ['duplicate eligible/excluded repair', (p) => { p.excludedUnknownCostRepairIds.push('a'); }],
    ['unsafe eligible cost total', (p) => { p.eligibleRepairs[0].costCents = Number.MAX_SAFE_INTEGER; }],
    ['wrong eligibility ordering', (p) => { p.eligibleRepairs.reverse(); }],
    ['wrong affordable-first plan', (p) => { p.conditionFirst = noRepairs(); }],
    ['missing omission', (p) => { p.exact.withoutRepair.pop(); }],
    ['incorrect single-repair restored ID', (p) => { p.singleRepairs[0].restoredDestinationIds = ['studio']; }],
    ['missing single-repair result', (p) => { p.singleRepairs.pop(); }],
    ['inconsistent result for the same repair subset', (p) => {
      p.exact.withoutRepair[0].outcomes[1] = blocked('library', ['different-link']);
    }],
    ['too few enumerated subsets', (p) => { p.search.enumeratedSubsetCount = 7; }],
    ['too few feasible subsets for all affordable singletons', (p) => { p.search.feasibleSubsetCount = 3; }],
    ['too many feasible subsets', (p) => { p.search.feasibleSubsetCount = 9; }],
    ['an exact result worse than condition-first', (p) => { p.exact = noRepairs(); }],
    ['an exact repair with a tied omission', (p) => {
      const { outcomes, reachableCount, restoredDestinationIds } = p.exact;
      const tied = { outcomes, reachableCount, restoredDestinationIds };
      p.singleRepairs[0] = { repairId: 'a', ...tied };
      p.exact.withoutRepair[1] = { repairId: 'b', ...tied };
    }],
  ])('rejects %s', (_case, corrupt) => {
    const value = comparison();
    corrupt(value);
    expect(PlanComparisonSchema.safeParse(value).success).toBe(false);
  });
});
