import {
  PlanRequestSchema,
  PlanScenarioSchema,
  type PlanComparison,
  type PlanCoverage,
  type PlanEligibleRepair,
  type PlanRepairProjection,
  type PlanRequest,
  type PlanScenario,
  type PlanSelection,
} from '../../contracts/curb/plans';
import {
  InvalidTripScenarioError,
  prepareTripEvaluator,
  validateTripScenario,
} from './trips';

export class InvalidPlanScenarioError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPlanScenarioError';
  }
}

export class PlanRequestError extends Error {
  constructor(
    public readonly code: 'INVALID_REQUEST' | 'SCENARIO_NOT_FOUND' | 'STALE_SCENARIO',
    message: string,
  ) {
    super(message);
    this.name = 'PlanRequestError';
  }
}

/** Reuse complete R1 topology, assessment and repair-target validation. */
export function validatePlanScenario(input: unknown): PlanScenario {
  const parsed = PlanScenarioSchema.safeParse(input);
  if (!parsed.success) throw new InvalidPlanScenarioError(parsed.error.message);
  const context = parsed.data;
  try {
    validateTripScenario({
      schemaVersion: 1,
      contractVersion: 'curb-r1',
      scenario: context.scenario,
      profile: context.profile,
      assumptions: context.assumptions,
      edgeAssessments: context.edgeAssessments,
      repairs: context.repairs,
      defaults: { originNodeId: context.originNodeId, destinationId: context.destinationIds[0] },
    });
  } catch (error) {
    if (error instanceof InvalidTripScenarioError) throw new InvalidPlanScenarioError(error.message);
    throw error;
  }
  return context;
}

const compareIds = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0;

function compareIdLists(left: readonly string[], right: readonly string[]): number {
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    const difference = compareIds(left[index], right[index]);
    if (difference) return difference;
  }
  return left.length - right.length;
}

/** Compare every affordable subset on the same immutable routing snapshot. */
export function comparePlans(input: PlanScenario, request: PlanRequest): PlanComparison {
  const context = validatePlanScenario(input);
  const parsed = PlanRequestSchema.safeParse(request);
  if (!parsed.success) throw new PlanRequestError('INVALID_REQUEST', 'Plan request is invalid.');
  const selection = parsed.data;
  if (selection.scenarioId !== context.scenario.id) {
    throw new PlanRequestError('SCENARIO_NOT_FOUND', 'Plan scenario does not exist.');
  }
  if (selection.revision !== context.scenario.revision) {
    throw new PlanRequestError('STALE_SCENARIO', 'Plan scenario revision has changed.');
  }
  if (selection.originNodeId !== context.originNodeId) {
    throw new PlanRequestError('INVALID_REQUEST', 'Plan origin must match the fixed scenario origin.');
  }

  const eligibleRepairs: PlanEligibleRepair[] = [];
  const excludedUnknownCostRepairIds: string[] = [];
  for (const { repairId, severity, cost } of context.candidates) {
    if (cost.status === 'unknown') excludedUnknownCostRepairIds.push(repairId);
    else eligibleRepairs.push({ repairId, severityScore: severity.score, costCents: cost.cents });
  }
  eligibleRepairs.sort((left, right) => right.severityScore - left.severityScore
    || left.costCents - right.costCents || compareIds(left.repairId, right.repairId));
  excludedUnknownCostRepairIds.sort(compareIds);

  const evaluator = prepareTripEvaluator(context);
  const destinationNodes = new Map(context.scenario.destinations.map(({ id, nodeId }) => [id, nodeId]));
  const destinationNodeIds = context.destinationIds.map((id) => destinationNodes.get(id)!);
  const barriers = new Map(context.repairs.map(({ id, barrierId }) => [id, barrierId]));
  const indices = new Map(eligibleRepairs.map(({ repairId }, index) => [repairId, index]));
  const cache = new Map<number, PlanCoverage>();
  const evaluate = (mask: number): PlanCoverage => {
    const cached = cache.get(mask);
    if (cached) return cached;
    const cleared = new Set(eligibleRepairs.filter((_, index) => mask & (1 << index))
      .map(({ repairId }) => barriers.get(repairId)!));
    let routes;
    try {
      routes = evaluator.evaluateRoutes(context.originNodeId, destinationNodeIds, cleared);
    } catch (error) {
      if (error instanceof InvalidTripScenarioError) throw new InvalidPlanScenarioError(error.message);
      throw error;
    }
    const outcomes = routes.map((route, index) => ({ destinationId: context.destinationIds[index], route }));
    const coverage = { outcomes, reachableCount: routes.filter(({ status }) => status === 'reachable').length };
    cache.set(mask, coverage);
    return coverage;
  };
  const baseline = evaluate(0);
  const initiallyReachable = new Set(baseline.outcomes.filter(({ route }) => route.status === 'reachable')
    .map(({ destinationId }) => destinationId));
  const restored = (coverage: PlanCoverage) => coverage.outcomes
    .filter(({ destinationId, route }) => route.status === 'reachable' && !initiallyReachable.has(destinationId))
    .map(({ destinationId }) => destinationId);
  const maskFor = (ids: string[]) => ids.reduce((mask, id) => mask | (1 << indices.get(id)!), 0);

  let remaining = selection.budgetCents;
  const conditionIds: string[] = [];
  for (const { repairId, costCents } of eligibleRepairs) {
    if (costCents <= remaining) {
      conditionIds.push(repairId);
      remaining -= costCents;
    }
  }

  let best = { restoredCount: 0, spendCents: 0, ids: [] as string[] };
  let feasibleSubsetCount = 0;
  const enumeratedSubsetCount = 2 ** eligibleRepairs.length;
  for (let mask = 0; mask < enumeratedSubsetCount; mask += 1) {
    const subset = eligibleRepairs.filter((_, index) => mask & (1 << index));
    const spendCents = subset.reduce((sum, { costCents }) => sum + costCents, 0);
    if (spendCents > selection.budgetCents) continue;
    feasibleSubsetCount += 1;
    const coverage = evaluate(mask);
    const restoredCount = restored(coverage).length;
    const ids = subset.map(({ repairId }) => repairId).sort(compareIds);
    if (restoredCount > best.restoredCount || (restoredCount === best.restoredCount &&
      (spendCents - best.spendCents || ids.length - best.ids.length || compareIdLists(ids, best.ids)) < 0)) {
      best = { restoredCount, spendCents, ids };
    }
  }

  const projection = (mask: number, repairId: string): PlanRepairProjection => {
    const coverage = evaluate(mask);
    return { repairId, ...coverage, restoredDestinationIds: restored(coverage) };
  };
  const plan = (ids: string[], spendCents: number): PlanSelection => {
    const mask = maskFor(ids);
    const coverage = evaluate(mask);
    const restoredDestinationIds = restored(coverage);
    return {
      ...coverage, selectedRepairIds: ids, spendCents, restoredDestinationIds,
      restoredCount: restoredDestinationIds.length,
      withoutRepair: ids.map((id) => projection(mask & ~(1 << indices.get(id)!), id)),
    };
  };
  return {
    ...selection, baseline, eligibleRepairs, excludedUnknownCostRepairIds,
    conditionFirst: plan(conditionIds, selection.budgetCents - remaining),
    exact: plan(best.ids, best.spendCents),
    singleRepairs: [...new Set([...conditionIds, ...best.ids])].sort(compareIds)
      .map((id) => projection(1 << indices.get(id)!, id)),
    search: { enumeratedSubsetCount, feasibleSubsetCount },
  };
}
