import { describe, expect, it } from 'vitest';
import {
  PlanComparisonSchema,
  type PlanComparison,
  type PlanCoverage,
  type PlanRepairProjection,
} from '../../../contracts/curb/plans';
import type { TripRouteResult } from '../../../contracts/curb/trips';
import {
  dependencyNotes,
  money,
  newlyReachableDestinationIds,
  projectInvestment,
  reachableEdgeIds,
  shortRepairLabel,
} from './presentation';

// Authored API-response witnesses, not a client optimizer or imported scenario fixture.
const destinations = ['library', 'student-center', 'hall', 'cafe'];
const reachedRoutes: Record<string, TripRouteResult> = {
  library: { status: 'reachable', nodeIds: ['arrival', 'link-mid', 'hub', 'library-door'], edgeIds: ['link-a', 'link-b', 'library-walk'], distanceMeters: 60 },
  'student-center': { status: 'reachable', nodeIds: ['arrival', 'link-mid', 'hub', 'student-center-door'], edgeIds: ['link-a', 'link-b', 'student-center-walk'], distanceMeters: 65 },
  hall: { status: 'reachable', nodeIds: ['arrival', 'hall-door'], edgeIds: ['hall-link'], distanceMeters: 40 },
  cafe: { status: 'reachable', nodeIds: ['arrival', 'cafe-door'], edgeIds: ['cafe-walk'], distanceMeters: 25 },
};

function coverage(newIds: string[], sharedBlockers = ['link-a', 'link-b']): PlanCoverage {
  const reachable = new Set([...newIds, 'cafe']);
  return {
    reachableCount: reachable.size,
    outcomes: destinations.map((destinationId) => ({
      destinationId,
      route: reachable.has(destinationId) ? structuredClone(reachedRoutes[destinationId]) : {
        status: 'blocked', blockedEdgeIds: destinationId === 'hall' ? ['hall-link'] : [...sharedBlockers], unknownEdgeIds: [],
      },
    })),
  };
}

function omission(repairId: string, newIds: string[], blockers?: string[]): PlanRepairProjection {
  return { repairId, ...coverage(newIds, blockers), restoredDestinationIds: newIds };
}

function response(): PlanComparison {
  return PlanComparisonSchema.parse({
    contractVersion: 'curb-r2', scenarioId: 'synthetic-campus-investment', revision: 1,
    profileId: 'step-free-demo', originNodeId: 'arrival', budgetCents: 1_000_000,
    baseline: coverage([]),
    eligibleRepairs: [
      { repairId: 'repair-c', costCents: 1_000_000, severityScore: 5 },
      { repairId: 'repair-a', costCents: 500_000, severityScore: 3 },
      { repairId: 'repair-b', costCents: 500_000, severityScore: 2 },
    ],
    excludedUnknownCostRepairIds: [],
    conditionFirst: {
      ...coverage(['hall']), selectedRepairIds: ['repair-c'], spendCents: 1_000_000,
      restoredDestinationIds: ['hall'], restoredCount: 1, withoutRepair: [omission('repair-c', [])],
    },
    exact: {
      ...coverage(['library', 'student-center']), selectedRepairIds: ['repair-a', 'repair-b'], spendCents: 1_000_000,
      restoredDestinationIds: ['library', 'student-center'], restoredCount: 2,
      withoutRepair: [omission('repair-a', [], ['link-a']), omission('repair-b', [], ['link-b'])],
    },
    singleRepairs: [omission('repair-a', [], ['link-b']), omission('repair-b', [], ['link-a']), omission('repair-c', ['hall'])],
    search: { enumeratedSubsetCount: 8, feasibleSubsetCount: 5 },
  });
}

function freeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

describe('investment response projections', () => {
  it('starts with baseline coverage and no selected repairs, spend or new destinations', () => {
    const comparison = response();
    const projected = projectInvestment(comparison, 'before');
    expect(projected).toEqual({ title: 'Before repairs', coverage: comparison.baseline, selectedRepairIds: [], spendCents: 0, restoredDestinationIds: [] });
    expect([...reachableEdgeIds(projected!.coverage)]).toEqual(['cafe-walk']);
  });

  it('projects both server plans without including baseline Cafe in the benefits', () => {
    const comparison = response();
    expect(projectInvestment(comparison, 'conditionFirst')).toMatchObject({ title: 'Condition-first', selectedRepairIds: ['repair-c'], spendCents: 1_000_000, restoredDestinationIds: ['hall'] });
    expect(projectInvestment(comparison, 'exact')).toMatchObject({ title: 'Curb recommendation', selectedRepairIds: ['repair-a', 'repair-b'], spendCents: 1_000_000, restoredDestinationIds: ['library', 'student-center'] });
    expect(newlyReachableDestinationIds(comparison.baseline, comparison.exact).length).toBe(comparison.exact.reachableCount - comparison.baseline.reachableCount);
  });

  it.each([
    ['repair-a', 'repair-b', 'Recommendation without A'],
    ['repair-b', 'repair-a', 'Recommendation without B'],
  ])('projects the returned omission of %s without changing the canonical recommendation', (omitted, remaining, title) => {
    const comparison = freeze(response());
    const before = JSON.stringify(comparison);
    const projected = projectInvestment(comparison, 'exact', omitted);
    expect(projected).toMatchObject({ title, selectedRepairIds: [remaining], spendCents: 500_000, restoredDestinationIds: [] });
    expect(projected!.coverage).toBe(comparison.exact.withoutRepair.find(({ repairId }) => repairId === omitted));
    expect([...reachableEdgeIds(projected!.coverage)]).toEqual(['cafe-walk']);
    expect(JSON.stringify(comparison)).toBe(before);
    expect(projectInvestment(comparison, 'exact')!.restoredDestinationIds).toEqual(['library', 'student-center']);
  });

  it('does not allow an omitted repair outside the canonical selected set', () => {
    expect(projectInvestment(response(), 'exact', 'repair-c')).toBeNull();
  });

  it('does not invent success when an omission evaluation or remaining cost is missing', () => {
    const comparison = response();
    comparison.exact.withoutRepair = [];
    expect(projectInvestment(comparison, 'exact', 'repair-a')).toBeNull();
    const missingCost = response();
    missingCost.eligibleRepairs = missingCost.eligibleRepairs.filter(({ repairId }) => repairId !== 'repair-b');
    expect(projectInvestment(missingCost, 'exact', 'repair-a')).toBeNull();
  });

  it('ignores an obsolete omission in a different strategy', () => {
    const comparison = response();
    expect(projectInvestment(comparison, 'before', 'repair-a')!.coverage).toBe(comparison.baseline);
    expect(projectInvestment(comparison, 'conditionFirst', 'repair-a')!.coverage).toBe(comparison.conditionFirst);
  });

  it('deduplicates returned reachable edges and never highlights blocked or unknown witness edges', () => {
    const comparison = response();
    expect([...reachableEdgeIds(comparison.exact)]).toEqual(['link-a', 'link-b', 'library-walk', 'student-center-walk', 'cafe-walk']);
    const mixed: PlanCoverage = {
      reachableCount: 1,
      outcomes: [
        comparison.baseline.outcomes[3],
        { destinationId: 'unknown', route: { status: 'unknown', blockedEdgeIds: [], unknownEdgeIds: ['mystery-edge'] } },
        { destinationId: 'blocked', route: { status: 'blocked', blockedEdgeIds: ['hall-link'], unknownEdgeIds: ['another-edge'] } },
        { destinationId: 'disconnected', route: { status: 'disconnected', blockedEdgeIds: [], unknownEdgeIds: [] } },
      ],
    };
    expect([...reachableEdgeIds(mixed)]).toEqual(['cafe-walk']);
  });

  it('does not infer geometry from a destination name or count', () => {
    const comparison = response();
    const altered = structuredClone(comparison.exact);
    altered.outcomes[0].route = { status: 'reachable', nodeIds: ['arrival', 'library-door'], edgeIds: ['server-returned-alternate'], distanceMeters: 20 };
    expect([...reachableEdgeIds(altered)]).toContain('server-returned-alternate');
    expect([...reachableEdgeIds(altered)]).not.toContain('library-walk');
  });

  it('shows a valid empty recommendation from an alternate server response', () => {
    const comparison = response();
    comparison.budgetCents = 500_000;
    comparison.conditionFirst = { ...coverage([], ['link-b']), selectedRepairIds: ['repair-a'], spendCents: 500_000, restoredDestinationIds: [], restoredCount: 0, withoutRepair: [omission('repair-a', [])] };
    comparison.exact = { ...coverage([]), selectedRepairIds: [], spendCents: 0, restoredDestinationIds: [], restoredCount: 0, withoutRepair: [] };
    comparison.singleRepairs = [omission('repair-a', [], ['link-b'])];
    comparison.search.feasibleSubsetCount = 3;
    const checked = PlanComparisonSchema.parse(comparison);
    expect(projectInvestment(checked, 'exact')).toMatchObject({ selectedRepairIds: [], spendCents: 0, restoredDestinationIds: [] });
    expect(projectInvestment(checked, 'conditionFirst')).toMatchObject({ selectedRepairIds: ['repair-a'], spendCents: 500_000, restoredDestinationIds: [] });
    expect(projectInvestment(checked, 'exact', 'repair-a')).toBeNull();
  });

  it('uses server costs for omission spend instead of a fixed A/B price', () => {
    const comparison = response();
    comparison.eligibleRepairs.find(({ repairId }) => repairId === 'repair-b')!.costCents = 123_456;
    expect(projectInvestment(comparison, 'exact', 'repair-a')!.spendCents).toBe(123_456);
  });

  it('derives new destinations from coverage, even when the baseline is not Cafe', () => {
    const baseline = coverage(['library']);
    const after = coverage(['library', 'hall']);
    expect(newlyReachableDestinationIds(baseline, after)).toEqual(['hall']);
  });
});

describe('dependency explanations', () => {
  it('uses both singleton and omission witnesses to explain the pair', () => {
    const notes = dependencyNotes(freeze(response()));
    expect(notes.map(({ repairId }) => repairId)).toEqual(['repair-a', 'repair-b']);
    for (const note of notes) {
      expect(note.aloneRestoredDestinationIds).toEqual([]);
      expect(note.lostDestinationIds).toEqual(['library', 'student-center']);
      expect(note.companionDestinationIds).toEqual(['library', 'student-center']);
    }
  });

  it('does not turn an unavailable singleton or omission into a zero-gain claim', () => {
    const comparison = response();
    comparison.singleRepairs = comparison.singleRepairs.filter(({ repairId }) => repairId !== 'repair-a');
    expect(dependencyNotes(comparison).map(({ repairId }) => repairId)).toEqual(['repair-b']);
    comparison.exact.withoutRepair = [];
    expect(dependencyNotes(comparison)).toEqual([]);
  });
});

describe('display labels', () => {
  it('preserves exact cents and formats whole-dollar budgets compactly', () => {
    expect(money(1_000_000)).toBe('$10,000');
    expect(money(499_999)).toBe('$4,999.99');
    expect(money(0)).toBe('$0');
  });

  it('labels known repairs without confusing arbitrary IDs for object properties', () => {
    expect(shortRepairLabel('repair-a')).toBe('A');
    expect(shortRepairLabel('repair-b')).toBe('B');
    expect(shortRepairLabel('repair-c')).toBe('C');
    expect(shortRepairLabel('constructor')).toBe('constructor');
  });
});
