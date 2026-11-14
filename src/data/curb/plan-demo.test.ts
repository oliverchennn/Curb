import { describe, expect, it } from 'vitest';
import { ScenarioSchema } from '../../contracts/curb';
import {
  PlanComparisonSchema,
  PlanScenarioSchema,
  matchesPlanRequest,
  matchesPlanScenario,
  type PlanComparison,
  type PlanDestinationOutcome,
  type PlanRequest,
  type PlanScenario,
} from '../../contracts/curb/plans';
import type { TripRouteResult } from '../../contracts/curb/trips';
import { buildScenarioView, getBarrierDetail } from '../../domain/curb';
import { comparePlans, validatePlanScenario } from '../../domain/curb/plans';
import { validateTripScenario } from '../../domain/curb/trips';
import planDemo from './plan-demo.json';
import sample from './sample.json';
import tripDemo from './trip-demo.json';

function requestFor(context: PlanScenario, budgetCents = context.defaultBudgetCents): PlanRequest {
  return {
    contractVersion: 'curb-r2',
    scenarioId: context.scenario.id,
    revision: context.scenario.revision,
    profileId: context.profile.id,
    originNodeId: context.originNodeId,
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

const bothLinksBlocked: TripRouteResult = {
  status: 'blocked', blockedEdgeIds: ['link-a', 'link-b'], unknownEdgeIds: [],
};
const linkABlocked: TripRouteResult = {
  status: 'blocked', blockedEdgeIds: ['link-a'], unknownEdgeIds: [],
};
const linkBBlocked: TripRouteResult = {
  status: 'blocked', blockedEdgeIds: ['link-b'], unknownEdgeIds: [],
};
const hallBlocked: TripRouteResult = {
  status: 'blocked', blockedEdgeIds: ['hall-link'], unknownEdgeIds: [],
};
const hallReachable: TripRouteResult = {
  status: 'reachable', nodeIds: ['arrival', 'hall-door'], edgeIds: ['hall-link'], distanceMeters: 25,
};
const libraryReachable: TripRouteResult = {
  status: 'reachable',
  nodeIds: ['arrival', 'link-mid', 'hub', 'library-door'],
  edgeIds: ['link-a', 'link-b', 'library-walk'],
  distanceMeters: 40,
};
const studentCenterReachable: TripRouteResult = {
  status: 'reachable',
  nodeIds: ['arrival', 'link-mid', 'hub', 'student-center-door'],
  edgeIds: ['link-a', 'link-b', 'student-center-walk'],
  distanceMeters: 45,
};
const studioUnknown: TripRouteResult = {
  status: 'unknown', blockedEdgeIds: [], unknownEdgeIds: ['studio-walk'],
};

// Authored witnesses are deliberately fixed, including the cafe's existing route.
function outcomes(
  library: TripRouteResult,
  studentCenter: TripRouteResult,
  hall: TripRouteResult,
  studio = studioUnknown,
): PlanDestinationOutcome[] {
  return [
    { destinationId: 'library', route: library },
    { destinationId: 'student-center', route: studentCenter },
    { destinationId: 'hall', route: hall },
    {
      destinationId: 'cafe',
      route: { status: 'reachable', nodeIds: ['arrival', 'cafe-door'], edgeIds: ['cafe-walk'], distanceMeters: 12 },
    },
    { destinationId: 'studio', route: studio },
    { destinationId: 'archive', route: { status: 'disconnected', blockedEdgeIds: [], unknownEdgeIds: [] } },
  ];
}

const baselineOutcomes = outcomes(bothLinksBlocked, bothLinksBlocked, hallBlocked);
const onlyAOutcomes = outcomes(linkBBlocked, linkBBlocked, hallBlocked);
const onlyBOutcomes = outcomes(linkABlocked, linkABlocked, hallBlocked);
const onlyCOutcomes = outcomes(bothLinksBlocked, bothLinksBlocked, hallReachable);
const bundleOutcomes = outcomes(libraryReachable, studentCenterReachable, hallBlocked);

describe('separately authored synthetic R2 repair-plan fixture', () => {
  it('parses the frozen context and validates the complete synthetic graph', () => {
    expect(PlanScenarioSchema.safeParse(planDemo).success).toBe(true);
    const context = validatePlanScenario(planDemo);

    expect(context).toEqual(PlanScenarioSchema.parse(planDemo));
    expect(context).toMatchObject({
      schemaVersion: 1,
      contractVersion: 'curb-r2',
      scenario: { schemaVersion: 1, id: 'synthetic-campus-repair-plans', revision: 1, dataKind: 'synthetic' },
      profile: { id: 'step-free-demo' },
      originNodeId: 'arrival',
      destinationIds: ['library', 'student-center', 'hall', 'cafe', 'studio', 'archive'],
      defaultBudgetCents: 400,
    });
    expect(buildScenarioView(context.scenario).counts).toEqual({
      nodes: 9, edges: 8, destinations: 6, barriers: 4, evidence: 4,
    });
    expect(context.scenario.nodes.every(({ coordinate }) =>
      coordinate.every((position) => Math.abs(position) < 0.001),
    )).toBe(true);
    expect(context.assumptions.join(' ')).toMatch(/entirely synthetic schematic/i);
    expect(context.assumptions.join(' ')).toMatch(/every destination has weight one/i);
    expect(context.assumptions.join(' ')).toMatch(/1 \(least severe\) to 5 \(most severe\)/i);
    expect(context.assumptions.join(' ')).toMatch(/illustrative assumed amounts in USD cents/i);
    expect(context.assumptions.join(' ')).toMatch(/passability is independent of evidence review status/i);
  });

  it('fixes topology, distances, directions, assessment coverage and repair targets', () => {
    const context = validatePlanScenario(planDemo);
    const assessments = new Map(context.edgeAssessments.map((assessment) => [assessment.edgeId, assessment]));

    expect(context.scenario.edges.map((edge) => {
      const assessment = assessments.get(edge.id)!;
      return [
        edge.id, edge.fromNodeId, edge.toNodeId, edge.lengthMeters, edge.bidirectional,
        assessment.kind, assessment.status, assessment.blockingBarrierIds,
      ];
    })).toEqual([
      ['link-a', 'arrival', 'link-mid', 10, true, 'crossing', 'blocked', ['link-a-curb']],
      ['link-b', 'link-mid', 'hub', 20, true, 'walkway', 'blocked', ['link-b-crate']],
      ['library-walk', 'hub', 'library-door', 10, false, 'entrance', 'pass', []],
      ['student-center-walk', 'hub', 'student-center-door', 15, false, 'entrance', 'pass', []],
      ['hall-link', 'arrival', 'hall-door', 25, false, 'entrance', 'blocked', ['hall-surface']],
      ['cafe-walk', 'arrival', 'cafe-door', 12, true, 'walkway', 'pass', []],
      ['studio-walk', 'arrival', 'studio-door', 30, false, 'walkway', 'unknown', []],
      ['studio-shortcut', 'arrival', 'studio-door', 18, false, 'walkway', 'unknown', ['studio-shortcut-crate']],
    ]);
    expect(assessments.size).toBe(context.scenario.edges.length);
    expect(context.edgeAssessments).toHaveLength(context.scenario.edges.length);
    expect(context.edgeAssessments.every(({ reason }) => /authored synthetic/i.test(reason))).toBe(true);
    expect(context.scenario.destinations.map(({ id, nodeId }) => [id, nodeId])).toEqual([
      ['library', 'library-door'], ['student-center', 'student-center-door'], ['hall', 'hall-door'],
      ['cafe', 'cafe-door'], ['studio', 'studio-door'], ['archive', 'archive-door'],
    ]);
    expect(context.repairs.map(({ id, barrierId }) => [id, barrierId])).toEqual([
      ['repair-a', 'link-a-curb'], ['repair-b', 'link-b-crate'],
      ['repair-c', 'hall-surface'], ['repair-studio', 'studio-shortcut-crate'],
    ]);
  });

  it('discloses illustrative amounts, severity rationales and the missing studio cost', () => {
    const context = validatePlanScenario(planDemo);

    expect(context.candidates.map(({ repairId, severity, cost }) => [
      repairId, severity.score, cost.status, cost.cents,
    ])).toEqual([
      ['repair-a', 3, 'assumed', 200], ['repair-b', 2, 'assumed', 200],
      ['repair-c', 5, 'assumed', 400], ['repair-studio', 4, 'unknown', null],
    ]);
    for (const { severity, cost } of context.candidates) {
      expect(severity.rationale).toMatch(/authored rating [1-5] of 5/i);
      expect(cost.source).toMatch(/synthetic author/i);
      expect(cost.source).toMatch(/USD/i);
      if (cost.status === 'assumed') expect(cost.source).toMatch(/illustrative.*not a supplier quote/i);
    }
    expect(context.candidates.find(({ repairId }) => repairId === 'repair-studio')?.cost.source)
      .toMatch(/exclude it from selection/i);
  });

  it('links exclusively synthetic evidence without deriving assessments from review status', () => {
    const context = validatePlanScenario(planDemo);
    const { scenario } = context;

    expect(scenario.barriers.map(({ id, edgeId, reviewStatus, evidenceIds }) => [
      id, edgeId, reviewStatus, evidenceIds,
    ])).toEqual([
      ['link-a-curb', 'link-a', 'accepted', ['link-a-note']],
      ['link-b-crate', 'link-b', 'rejected', ['link-b-note']],
      ['hall-surface', 'hall-link', 'pending', ['hall-note']],
      ['studio-shortcut-crate', 'studio-shortcut', 'pending', ['studio-shortcut-note']],
    ]);
    for (const barrier of scenario.barriers) {
      const detail = getBarrierDetail(scenario, barrier.id)!;
      expect(detail.evidence.map(({ id }) => id)).toEqual(barrier.evidenceIds);
      expect(detail.evidence).toHaveLength(1);
      expect(detail.evidence[0]).toMatchObject({
        kind: 'note', origin: 'synthetic', attribution: 'Curb R2 synthetic fixture authors',
      });
      expect(detail.evidence[0].caption).toMatch(/synthetic/i);
      expect(detail.evidence[0].note).toMatch(/authored illustration/i);
    }
    expect(comparePlans(context, requestFor(context)).baseline).toEqual({
      outcomes: baselineOutcomes, reachableCount: 1,
    });
  });

  it('proves the complete 400-cent golden comparison with actual single and omission witnesses', () => {
    const context = validatePlanScenario(planDemo);
    const request = requestFor(context);
    const result = comparePlans(context, request);
    const expected: PlanComparison = {
      ...request,
      baseline: { outcomes: baselineOutcomes, reachableCount: 1 },
      eligibleRepairs: [
        { repairId: 'repair-c', severityScore: 5, costCents: 400 },
        { repairId: 'repair-a', severityScore: 3, costCents: 200 },
        { repairId: 'repair-b', severityScore: 2, costCents: 200 },
      ],
      excludedUnknownCostRepairIds: ['repair-studio'],
      conditionFirst: {
        outcomes: onlyCOutcomes,
        reachableCount: 2,
        selectedRepairIds: ['repair-c'],
        spendCents: 400,
        restoredDestinationIds: ['hall'],
        restoredCount: 1,
        withoutRepair: [{ repairId: 'repair-c', outcomes: baselineOutcomes, reachableCount: 1, restoredDestinationIds: [] }],
      },
      exact: {
        outcomes: bundleOutcomes,
        reachableCount: 3,
        selectedRepairIds: ['repair-a', 'repair-b'],
        spendCents: 400,
        restoredDestinationIds: ['library', 'student-center'],
        restoredCount: 2,
        withoutRepair: [
          { repairId: 'repair-a', outcomes: onlyBOutcomes, reachableCount: 1, restoredDestinationIds: [] },
          { repairId: 'repair-b', outcomes: onlyAOutcomes, reachableCount: 1, restoredDestinationIds: [] },
        ],
      },
      singleRepairs: [
        { repairId: 'repair-a', outcomes: onlyAOutcomes, reachableCount: 1, restoredDestinationIds: [] },
        { repairId: 'repair-b', outcomes: onlyBOutcomes, reachableCount: 1, restoredDestinationIds: [] },
        { repairId: 'repair-c', outcomes: onlyCOutcomes, reachableCount: 2, restoredDestinationIds: ['hall'] },
      ],
      search: { enumeratedSubsetCount: 8, feasibleSubsetCount: 5 },
    };

    expect(result).toEqual(expected);
    expect(PlanComparisonSchema.safeParse(result).success).toBe(true);
    expect(matchesPlanRequest(result, request)).toBe(true);
    expect(matchesPlanScenario(result, context)).toBe(true);
  });

  it.each([
    { budget: 0, feasible: 1, conditionIds: [], conditionSpend: 0, conditionRestored: [], exactIds: [], exactSpend: 0, exactRestored: [] },
    { budget: 200, feasible: 3, conditionIds: ['repair-a'], conditionSpend: 200, conditionRestored: [], exactIds: [], exactSpend: 0, exactRestored: [] },
    { budget: 800, feasible: 8, conditionIds: ['repair-c', 'repair-a', 'repair-b'], conditionSpend: 800, conditionRestored: ['library', 'student-center', 'hall'], exactIds: ['repair-a', 'repair-b', 'repair-c'], exactSpend: 800, exactRestored: ['library', 'student-center', 'hall'] },
  ])('keeps all strategies and subset counts coherent at a $budget-cent budget', ({
    budget, feasible, conditionIds, conditionSpend, conditionRestored, exactIds, exactSpend, exactRestored,
  }) => {
    const context = validatePlanScenario(planDemo);
    const result = comparePlans(context, requestFor(context, budget));

    expect(result.search).toEqual({ enumeratedSubsetCount: 8, feasibleSubsetCount: feasible });
    expect(result.conditionFirst).toMatchObject({
      selectedRepairIds: conditionIds, spendCents: conditionSpend,
      restoredDestinationIds: conditionRestored, restoredCount: conditionRestored.length,
    });
    expect(result.exact).toMatchObject({
      selectedRepairIds: exactIds, spendCents: exactSpend,
      restoredDestinationIds: exactRestored, restoredCount: exactRestored.length,
    });
    expect(result.excludedUnknownCostRepairIds).toEqual(['repair-studio']);
    expect(result.baseline).toEqual({ outcomes: baselineOutcomes, reachableCount: 1 });
    expect(PlanComparisonSchema.safeParse(result).success).toBe(true);
    for (const plan of [result.conditionFirst, result.exact]) {
      expect(plan.selectedRepairIds).not.toContain('repair-studio');
      expect(plan.restoredDestinationIds).not.toContain('cafe');
      expect(plan.outcomes.slice(3)).toEqual(baselineOutcomes.slice(3));
    }
  });

  it('keeps the studio unknown after its shortcut blocker is hypothetically cleared', () => {
    const modified = structuredClone(validatePlanScenario(planDemo));
    modified.candidates.find(({ repairId }) => repairId === 'repair-studio')!.cost = {
      status: 'assumed', cents: 0,
      source: 'Synthetic test assumption only: a known zero USD-cent cost, preserving unknown coverage.',
    };
    const context = validatePlanScenario(modified);
    const result = comparePlans(context, requestFor(context, 0));
    const after = outcomes(bothLinksBlocked, bothLinksBlocked, hallBlocked, {
      status: 'unknown', blockedEdgeIds: [], unknownEdgeIds: ['studio-shortcut'],
    });

    expect(result.baseline).toEqual({ outcomes: baselineOutcomes, reachableCount: 1 });
    expect(result.conditionFirst).toEqual({
      selectedRepairIds: ['repair-studio'], spendCents: 0,
      outcomes: after, reachableCount: 1, restoredDestinationIds: [], restoredCount: 0,
      withoutRepair: [{ repairId: 'repair-studio', outcomes: baselineOutcomes, reachableCount: 1, restoredDestinationIds: [] }],
    });
    expect(result.exact).toMatchObject({ selectedRepairIds: [], spendCents: 0, restoredCount: 0 });
    expect(result.singleRepairs).toEqual([
      { repairId: 'repair-studio', outcomes: after, reachableCount: 1, restoredDestinationIds: [] },
    ]);
    expect(result.search).toEqual({ enumeratedSubsetCount: 16, feasibleSubsetCount: 2 });
    expect(result.excludedUnknownCostRepairIds).toEqual([]);
    expect(PlanComparisonSchema.safeParse(result).success).toBe(true);
    expect(planDemo.candidates.find(({ repairId }) => repairId === 'repair-studio')?.cost.status).toBe('unknown');
  });

  it('evaluates frozen inputs repeatedly without changing source costs, evidence or assessments', () => {
    const source = freezeDeep(structuredClone(planDemo));
    const sourceBefore = structuredClone(source);
    const context = freezeDeep(validatePlanScenario(source));
    const contextBefore = structuredClone(context);
    const request = freezeDeep(requestFor(context));
    const requestBefore = structuredClone(request);
    const first = comparePlans(context, request);

    expect(comparePlans(context, request)).toEqual(first);
    comparePlans(context, requestFor(context, 800));
    expect(comparePlans(context, request)).toEqual(first);
    expect(source).toEqual(sourceBefore);
    expect(context).toEqual(contextBefore);
    expect(request).toEqual(requestBefore);
    expect(first.baseline).toEqual({ outcomes: baselineOutcomes, reachableCount: 1 });
  });

  it('preserves the independently authored foundation and R1 fixture identities', () => {
    const sampleBefore = structuredClone(sample);
    const tripBefore = structuredClone(tripDemo);
    const context = validatePlanScenario(planDemo);
    comparePlans(context, requestFor(context));

    expect(sample).toEqual(sampleBefore);
    expect(tripDemo).toEqual(tripBefore);
    const foundation = buildScenarioView(ScenarioSchema.parse(sample));
    expect(foundation.scenario.id).toBe('synthetic-campus-quad');
    expect(foundation.counts).toEqual({ nodes: 9, edges: 12, destinations: 3, barriers: 4, evidence: 5 });
    const trip = validateTripScenario(tripDemo);
    expect(trip.scenario.id).toBe('synthetic-campus-links');
    expect(buildScenarioView(trip.scenario).counts).toEqual({
      nodes: 8, edges: 6, destinations: 5, barriers: 3, evidence: 3,
    });
    expect(context.scenario.id).not.toBe(trip.scenario.id);
  });
});
