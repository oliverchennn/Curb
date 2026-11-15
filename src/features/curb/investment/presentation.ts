import type { PlanComparison, PlanCoverage } from '../../../contracts/curb/plans';
import { formatCents } from '../plans/presentation';

export type InvestmentMode = 'before' | 'conditionFirst' | 'exact';

export type InvestmentProjection = {
  title: string;
  coverage: PlanCoverage;
  selectedRepairIds: string[];
  spendCents: number;
  restoredDestinationIds: string[];
};

/** Presentation only: route witnesses and repair choices always come from the API. */
export function reachableEdgeIds(coverage: PlanCoverage): Set<string> {
  return new Set(coverage.outcomes.flatMap(({ route }) =>
    route.status === 'reachable' ? route.edgeIds : []));
}

export function newlyReachableDestinationIds(baseline: PlanCoverage, coverage: PlanCoverage): string[] {
  const previouslyReachable = new Set(baseline.outcomes
    .filter(({ route }) => route.status === 'reachable')
    .map(({ destinationId }) => destinationId));
  return coverage.outcomes
    .filter(({ destinationId, route }) => route.status === 'reachable' && !previouslyReachable.has(destinationId))
    .map(({ destinationId }) => destinationId);
}

const REPAIR_LABELS = new Map([['repair-a', 'A'], ['repair-b', 'B'], ['repair-c', 'C']]);

/** These are diagram labels, never a lookup table of outcomes or costs. */
export function shortRepairLabel(repairId: string): string {
  return REPAIR_LABELS.get(repairId) ?? repairId;
}

export function money(cents: number): string {
  return formatCents(cents).replace(/\.00$/, '');
}

/** Select an already evaluated view. An unavailable omission is not a successful empty plan. */
export function projectInvestment(
  comparison: PlanComparison,
  mode: InvestmentMode,
  omittedRepairId?: string | null,
): InvestmentProjection | null {
  if (mode === 'before') {
    return {
      title: 'Before repairs', coverage: comparison.baseline,
      selectedRepairIds: [], spendCents: 0, restoredDestinationIds: [],
    };
  }
  const plan = comparison[mode];
  if (mode === 'exact' && omittedRepairId) {
    if (!plan.selectedRepairIds.includes(omittedRepairId)) return null;
    const coverage = plan.withoutRepair.find(({ repairId }) => repairId === omittedRepairId);
    if (!coverage) return null;
    const selectedRepairIds = plan.selectedRepairIds.filter((id) => id !== omittedRepairId);
    const costs = new Map(comparison.eligibleRepairs.map(({ repairId, costCents }) => [repairId, costCents]));
    let spendCents = 0;
    for (const repairId of selectedRepairIds) {
      const cost = costs.get(repairId);
      if (cost === undefined || !Number.isSafeInteger(cost) || cost < 0 || cost > Number.MAX_SAFE_INTEGER - spendCents) return null;
      spendCents += cost;
    }
    return {
      title: `Recommendation without ${shortRepairLabel(omittedRepairId)}`,
      coverage, selectedRepairIds, spendCents,
      restoredDestinationIds: newlyReachableDestinationIds(comparison.baseline, coverage),
    };
  }
  return {
    title: mode === 'conditionFirst' ? 'Condition-first' : 'Curb recommendation',
    coverage: plan,
    selectedRepairIds: [...plan.selectedRepairIds],
    spendCents: plan.spendCents,
    restoredDestinationIds: newlyReachableDestinationIds(comparison.baseline, plan),
  };
}

export type DependencyNote = {
  repairId: string;
  aloneRestoredDestinationIds: string[];
  lostDestinationIds: string[];
  companionDestinationIds: string[];
};

/** Explain dependencies only when both server evaluations exist. Missing singles are unknown. */
export function dependencyNotes(comparison: PlanComparison): DependencyNote[] {
  const restored = newlyReachableDestinationIds(comparison.baseline, comparison.exact);
  return comparison.exact.selectedRepairIds.flatMap((repairId) => {
    const alone = comparison.singleRepairs.find((item) => item.repairId === repairId);
    const without = comparison.exact.withoutRepair.find((item) => item.repairId === repairId);
    if (!alone || !without) return [];
    const aloneRestoredDestinationIds = newlyReachableDestinationIds(comparison.baseline, alone);
    const withoutRestored = newlyReachableDestinationIds(comparison.baseline, without);
    const lostDestinationIds = restored.filter((id) => !withoutRestored.includes(id));
    const companionDestinationIds = lostDestinationIds.filter((id) => !aloneRestoredDestinationIds.includes(id));
    return [{ repairId, aloneRestoredDestinationIds, lostDestinationIds, companionDestinationIds }];
  });
}
