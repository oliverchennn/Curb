import { describe, expect, it } from 'vitest';
import { PlanComparisonSchema, type PlanCoverage, type PlanRequest } from '../../contracts/curb/plans';
import type { TripRouteResult } from '../../contracts/curb/trips';
import { comparePlans, validatePlanScenario } from '../../domain/curb/plans';
import investmentDemo from './investment-demo.json';

const [A, B, C] = ['repair-a', 'repair-b', 'repair-c'] as const;
type RepairId = typeof A | typeof B | typeof C;
const costs = { [A]: 500_000, [B]: 500_000, [C]: 1_000_000 };
const destinationIds = ['library', 'student-center', 'hall', 'cafe'];
const defaultBudgetCents = 1_000_000;

function requestFor(budgetCents: number): PlanRequest {
  return {
    contractVersion: 'curb-r2',
    scenarioId: 'synthetic-campus-investment',
    revision: 1,
    profileId: 'step-free-demo',
    originNodeId: 'arrival',
    budgetCents,
  };
}

function freezeDeep<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

const rawFixture = freezeDeep(structuredClone(investmentDemo));
const context = freezeDeep(validatePlanScenario(rawFixture));

const blocked = (blockedEdgeIds: string[]): TripRouteResult => ({
  status: 'blocked', blockedEdgeIds, unknownEdgeIds: [],
});
const reachable = (nodeIds: string[], edgeIds: string[], distanceMeters: number): TripRouteResult => ({
  status: 'reachable', nodeIds, edgeIds, distanceMeters,
});

// These paths and their blockers are an oracle for the authored tree. They do
// not depend on fixture topology or invoke the production evaluator.
function coverageFor(funded: readonly RepairId[]): PlanCoverage & { restoredDestinationIds: string[] } {
  const sharedBlockers = [
    ...(funded.includes(A) ? [] : ['link-a']),
    ...(funded.includes(B) ? [] : ['link-b']),
  ];
  const routes = [
    sharedBlockers.length ? blocked(sharedBlockers) : reachable(
      ['arrival', 'link-mid', 'hub', 'library-door'], ['link-a', 'link-b', 'library-walk'], 50,
    ),
    sharedBlockers.length ? blocked(sharedBlockers) : reachable(
      ['arrival', 'link-mid', 'hub', 'student-center-door'], ['link-a', 'link-b', 'student-center-walk'], 50,
    ),
    funded.includes(C)
      ? reachable(['arrival', 'hall-door'], ['hall-link'], 25)
      : blocked(['hall-link']),
    reachable(['arrival', 'cafe-door'], ['cafe-walk'], 15),
  ];
  const outcomes = routes.map((route, index) => ({ destinationId: destinationIds[index], route }));
  const restoredDestinationIds = outcomes
    .filter(({ destinationId, route }) => destinationId !== 'cafe' && route.status === 'reachable')
    .map(({ destinationId }) => destinationId);
  return { outcomes, reachableCount: 1 + restoredDestinationIds.length, restoredDestinationIds };
}

const spendFor = (funded: readonly RepairId[]) => funded.reduce((sum, id) => sum + costs[id], 0);

function planFor(funded: readonly RepairId[]) {
  const coverage = coverageFor(funded);
  return {
    ...coverage,
    selectedRepairIds: funded,
    spendCents: spendFor(funded),
    restoredCount: coverage.restoredDestinationIds.length,
    withoutRepair: funded.map((repairId) => ({
      repairId,
      ...coverageFor(funded.filter((id) => id !== repairId)),
    })),
  };
}

// All eight combinations, independently of the runtime search order and masks.
const combinations = [[], [A], [B], [C], [A, B], [A, C], [B, C], [A, B, C]] as const;
const subsets = combinations.map((ids) => ({
  ids,
  spend: spendFor(ids),
  restoredCount: coverageFor(ids).restoredDestinationIds.length,
}));

const budgetCases = [
  { budget: 0, condition: [], exact: [], feasible: 1 },
  { budget: 499_999, condition: [], exact: [], feasible: 1 },
  { budget: 500_000, condition: [A], exact: [], feasible: 3 },
  { budget: 999_999, condition: [A], exact: [], feasible: 3 },
  { budget: 1_000_000, condition: [C], exact: [A, B], feasible: 5 },
  { budget: 1_499_999, condition: [C], exact: [A, B], feasible: 5 },
  { budget: 1_500_000, condition: [C, A], exact: [A, B], feasible: 7 },
  { budget: 2_000_000, condition: [C, A, B], exact: [A, B, C], feasible: 8 },
] as const;

describe('synthetic campus investment scenario', () => {
  it('uses the fixed synthetic tree, repair targets, and ordered destinations', () => {
    expect(context).toMatchObject({
      schemaVersion: 1,
      contractVersion: 'curb-r2',
      scenario: {
        id: 'synthetic-campus-investment',
        revision: 1,
        title: 'Campus investment scenario',
        dataKind: 'synthetic',
      },
      profile: { id: 'step-free-demo' },
      originNodeId: 'arrival',
      destinationIds,
      defaultBudgetCents,
    });
    expect(context.scenario.nodes.map(({ id }) => id)).toEqual([
      'arrival', 'link-mid', 'hub', 'library-door', 'student-center-door', 'hall-door', 'cafe-door',
    ]);
    expect(context.scenario.edges.map(({ id, fromNodeId, toNodeId, bidirectional }) =>
      [id, fromNodeId, toNodeId, bidirectional],
    )).toEqual([
      ['link-a', 'arrival', 'link-mid', true],
      ['link-b', 'link-mid', 'hub', true],
      ['library-walk', 'hub', 'library-door', true],
      ['student-center-walk', 'hub', 'student-center-door', true],
      ['hall-link', 'arrival', 'hall-door', true],
      ['cafe-walk', 'arrival', 'cafe-door', true],
    ]);
    expect(context.scenario.barriers.map(({ id, edgeId }) => [id, edgeId])).toEqual([
      ['link-a-curb', 'link-a'], ['link-b-surface', 'link-b'], ['hall-surface', 'hall-link'],
    ]);
    expect(context.scenario.evidence.map(({ kind, origin }) => [kind, origin]))
      .toEqual(Array.from({ length: 3 }, () => ['note', 'synthetic']));
    expect(context.repairs.map(({ id, label, barrierId }) => [id, label, barrierId])).toEqual([
      [A, 'A - Add approach ramp', 'link-a-curb'],
      [B, 'B - Repair shared path', 'link-b-surface'],
      [C, 'C - Repair Hall approach', 'hall-surface'],
    ]);
  });

  it.each(budgetCases)('matches the independent oracle at $budget cents', ({ budget, condition, exact, feasible }) => {
    const affordable = subsets.filter(({ spend }) => spend <= budget);
    const [winner] = affordable.sort((left, right) =>
      right.restoredCount - left.restoredCount ||
      left.spend - right.spend ||
      left.ids.length - right.ids.length,
    );
    expect(affordable).toHaveLength(feasible);
    expect(winner.ids).toEqual(exact);

    const request = Object.freeze(requestFor(budget));
    const actual = PlanComparisonSchema.parse(comparePlans(context, request));
    const { outcomes, reachableCount } = coverageFor([]);
    expect(actual).toEqual({
      ...request,
      baseline: { outcomes, reachableCount },
      eligibleRepairs: [
        { repairId: C, severityScore: 5, costCents: costs[C] },
        { repairId: A, severityScore: 3, costCents: costs[A] },
        { repairId: B, severityScore: 2, costCents: costs[B] },
      ],
      excludedUnknownCostRepairIds: [],
      conditionFirst: planFor(condition),
      exact: planFor(exact),
      singleRepairs: [...new Set([...condition, ...exact])].sort().map((repairId) => ({
        repairId, ...coverageFor([repairId]),
      })),
      search: { enumeratedSubsetCount: subsets.length, feasibleSubsetCount: feasible },
    });
  });

  it('preserves the raw and validated fixtures when comparisons are repeated', () => {
    const snapshot = structuredClone(context);
    const request = Object.freeze(requestFor(defaultBudgetCents));
    const first = comparePlans(context, request);
    comparePlans(context, Object.freeze(requestFor(0)));
    comparePlans(context, Object.freeze(requestFor(2_000_000)));

    expect(comparePlans(context, request)).toEqual(first);
    expect(context).toEqual(snapshot);
    expect(rawFixture).toEqual(investmentDemo);
    expect(request).toEqual(requestFor(defaultBudgetCents));
  });
});
