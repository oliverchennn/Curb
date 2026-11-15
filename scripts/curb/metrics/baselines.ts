import type { PlanCoverage, PlanEligibleRepair, PlanScenario } from '../../../src/contracts/curb/plans';
import { validatePlanScenario } from '../../../src/domain/curb/plans';
import { prepareTripEvaluator } from '../../../src/domain/curb/trips';
import { codeUnitCompare } from './spec';

export interface BaselineSelection extends PlanCoverage {
  selectedRepairIds: string[];
  spendCents: number;
}

function validBudget(budget: number): void {
  if (!Number.isSafeInteger(budget) || budget < 0) throw new Error('Budget must be nonnegative safe integer cents');
}

function prepare(plan: PlanScenario) {
  const context = validatePlanScenario(plan);
  const eligible: PlanEligibleRepair[] = context.candidates.flatMap(c => c.cost.status === 'unknown' ? [] : [{
    repairId: c.repairId, costCents: c.cost.cents, severityScore: c.severity.score,
  }]);
  const eligibleIds = new Set(eligible.map(c => c.repairId));
  const barriers = new Map(context.repairs.map(r => [r.id, r.barrierId]));
  const destinationNodes = new Map(context.scenario.destinations.map(d => [d.id, d.nodeId]));
  const evaluator = prepareTripEvaluator(context);
  const evaluate = (selectedRepairIds: readonly string[]): PlanCoverage => {
    if (new Set(selectedRepairIds).size !== selectedRepairIds.length || selectedRepairIds.some(r => !eligibleIds.has(r))) {
      throw new Error('Selection must contain distinct eligible known-cost repair IDs');
    }
    const routes = evaluator.evaluateRoutes(context.originNodeId, context.destinationIds.map(d => destinationNodes.get(d)!),
      new Set(selectedRepairIds.map(r => barriers.get(r)!)));
    return {
      outcomes: routes.map((route, i) => ({ destinationId: context.destinationIds[i], route })),
      reachableCount: routes.filter(r => r.status === 'reachable').length,
    };
  };
  return { eligible, evaluate };
}

/** Production route semantics, without invoking a selection policy or modifying the input. */
export function evaluateSelection(plan: PlanScenario, selectedRepairIds: readonly string[]): PlanCoverage {
  return prepare(plan).evaluate(selectedRepairIds);
}

export function cheapestFirst(plan: PlanScenario, budgetCents: number): BaselineSelection {
  validBudget(budgetCents);
  const { eligible, evaluate } = prepare(plan);
  const ordered = eligible.sort((a, b) => a.costCents - b.costCents || b.severityScore - a.severityScore || codeUnitCompare(a.repairId, b.repairId));
  const selectedRepairIds: string[] = [];
  let spendCents = 0;
  for (const candidate of ordered) {
    if (candidate.costCents <= budgetCents - spendCents) {
      selectedRepairIds.push(candidate.repairId);
      spendCents += candidate.costCents;
    }
  }
  return { selectedRepairIds, spendCents, ...evaluate(selectedRepairIds) };
}

export interface MarginalCandidate { repairId: string; costCents: number; gain: number }

/** Negative means a precedes b. Infinite positive free gains precede finite ratios;
 * a free zero-gain repair has ratio zero. No rounded floating ratios are used. */
export function compareMarginal(a: MarginalCandidate, b: MarginalCandidate): number {
  for (const candidate of [a, b]) {
    if (!Number.isSafeInteger(candidate.costCents) || candidate.costCents < 0 || !Number.isSafeInteger(candidate.gain) || candidate.gain < 0) {
      throw new Error('Marginal cost and gain must be nonnegative safe integers');
    }
  }
  const aInfinite = a.costCents === 0 && a.gain > 0;
  const bInfinite = b.costCents === 0 && b.gain > 0;
  if (aInfinite !== bInfinite) return aInfinite ? -1 : 1;
  if (!aInfinite) {
    const lhs = BigInt(a.gain) * BigInt(b.costCents || 1);
    const rhs = BigInt(b.gain) * BigInt(a.costCents || 1);
    if (lhs !== rhs) return lhs > rhs ? -1 : 1;
  }
  return b.gain - a.gain || a.costCents - b.costCents || codeUnitCompare(a.repairId, b.repairId);
}

export function greedy(plan: PlanScenario, budgetCents: number): BaselineSelection {
  validBudget(budgetCents);
  const { eligible, evaluate } = prepare(plan);
  const selectedRepairIds: string[] = [];
  const remaining = new Map(eligible.map(c => [c.repairId, c]));
  let coverage = evaluate([]);
  let spendCents = 0;
  while (remaining.size) {
    let winner: (MarginalCandidate & { coverage: PlanCoverage }) | undefined;
    for (const candidate of remaining.values()) {
      if (candidate.costCents > budgetCents - spendCents) continue;
      const candidateCoverage = evaluate([...selectedRepairIds, candidate.repairId]);
      const choice = { repairId: candidate.repairId, costCents: candidate.costCents, gain: candidateCoverage.reachableCount - coverage.reachableCount, coverage: candidateCoverage };
      if (!winner || compareMarginal(choice, winner) < 0) winner = choice;
    }
    if (!winner) break;
    // Deliberately continue zero-gain choices: complements may become useful later.
    selectedRepairIds.push(winner.repairId);
    spendCents += winner.costCents;
    coverage = winner.coverage;
    remaining.delete(winner.repairId);
  }
  return { selectedRepairIds, spendCents, ...coverage };
}
