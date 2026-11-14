import { z } from 'zod';
import {
  STEP_FREE_PROFILE_ID,
  TripRouteResultSchema,
  TripScenarioSchema,
} from './trips';

export const PLAN_CONTRACT_VERSION = 'curb-r2' as const;
export const PLAN_SCHEMA_VERSION = 1 as const;
export const MAX_PLAN_CANDIDATES = 12;
export const MAX_PLAN_SUBSETS = 2 ** MAX_PLAN_CANDIDATES;

const TextSchema = z.string().min(1).regex(/\S/, 'Must contain a non-whitespace character.');
const IdSchema = TextSchema;
const CentsSchema = z.number().int().nonnegative();
const CountSchema = z.number().int().nonnegative();
const SeverityScoreSchema = z.number().int().min(1).max(5);
const UniqueIdsSchema = z.array(IdSchema).refine(
  (ids) => new Set(ids).size === ids.length,
  'IDs must not repeat.',
);
const RepairIdsSchema = UniqueIdsSchema.max(MAX_PLAN_CANDIDATES);

/** In the authored comparison, all cent amounts are denominated in USD. */
export const PlanRepairCostSchema = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('assumed'), cents: CentsSchema, source: TextSchema }),
  z.strictObject({ status: z.literal('quoted'), cents: CentsSchema, source: TextSchema }),
  z.strictObject({ status: z.literal('unknown'), cents: z.null(), source: TextSchema }),
]);

export const PlanCandidateSchema = z.strictObject({
  repairId: IdSchema,
  // Authored condition rating, 1 (least severe) to 5 (most severe).
  severity: z.strictObject({ score: SeverityScoreSchema, rationale: TextSchema }),
  cost: PlanRepairCostSchema,
});

const issue = (ctx: z.RefinementCtx, path: (string | number)[], message: string) =>
  ctx.addIssue({ code: 'custom', path, message });

/** Safe for nonnegative integer cent amounts. An unsafe total is never rounded. */
function sumCents(amounts: Iterable<number>): number | null {
  let sum = 0;
  for (const amount of amounts) {
    if (amount > Number.MAX_SAFE_INTEGER - sum) return null;
    sum += amount;
  }
  return sum;
}

/** Separately authored synthetic scenario. Reuse the R1 graph/profile/assessment/
 * repair schemas. B still validates complete R1 graph relationships and coverage.
 * Destinations are evaluated in the listed order, each with weight one.
 */
export const PlanScenarioSchema = z.strictObject({
  schemaVersion: z.literal(PLAN_SCHEMA_VERSION),
  contractVersion: z.literal(PLAN_CONTRACT_VERSION),
  scenario: TripScenarioSchema.shape.scenario,
  profile: TripScenarioSchema.shape.profile,
  assumptions: TripScenarioSchema.shape.assumptions,
  edgeAssessments: TripScenarioSchema.shape.edgeAssessments,
  repairs: TripScenarioSchema.shape.repairs,
  originNodeId: IdSchema,
  destinationIds: UniqueIdsSchema.min(1),
  candidates: z.array(PlanCandidateSchema).max(MAX_PLAN_CANDIDATES),
  defaultBudgetCents: CentsSchema,
}).superRefine((plan, ctx) => {
  const nodeIds = new Set(plan.scenario.nodes.map(({ id }) => id));
  const destinationIds = new Set(plan.scenario.destinations.map(({ id }) => id));
  const repairs = new Set(plan.repairs.map(({ id }) => id));
  const candidateIds = new Set<string>();
  const knownCosts: number[] = [];
  if (!nodeIds.has(plan.originNodeId)) {
    issue(ctx, ['originNodeId'], 'Origin must identify a node in the scenario.');
  }
  if (plan.scenario.evidence.some(({ origin }) => origin !== 'synthetic')) {
    issue(ctx, ['scenario', 'evidence'], 'The authored scenario must contain only synthetic evidence.');
  }
  for (const [index, id] of plan.destinationIds.entries()) {
    if (!destinationIds.has(id)) issue(ctx, ['destinationIds', index], 'Destination must exist in the scenario.');
  }
  for (const [index, candidate] of plan.candidates.entries()) {
    if (!repairs.has(candidate.repairId) || candidateIds.has(candidate.repairId)) {
      issue(ctx, ['candidates', index, 'repairId'], 'Candidate must reference a distinct declared repair.');
    }
    candidateIds.add(candidate.repairId);
    if (candidate.cost.status !== 'unknown') knownCosts.push(candidate.cost.cents);
  }
  if (sumCents(knownCosts) === null) {
    issue(ctx, ['candidates'], 'The total known cost must fit in a safe integer.');
  }
});

/** Omit scenarioId to request the sole authored example. */
export const PlanScenarioQuerySchema = z.strictObject({ scenarioId: IdSchema.optional() });

/** All costs, ratings, repairs and destination weights come from the server context.
 * originNodeId echoes the fixed context origin; it does not select a different origin.
 */
export const PlanRequestSchema = z.strictObject({
  contractVersion: z.literal(PLAN_CONTRACT_VERSION),
  scenarioId: IdSchema,
  revision: CountSchema,
  profileId: z.literal(STEP_FREE_PROFILE_ID),
  originNodeId: IdSchema,
  budgetCents: CentsSchema,
});

export const PlanDestinationOutcomeSchema = z.strictObject({
  destinationId: IdSchema,
  route: TripRouteResultSchema,
});
const OutcomesSchema = z.array(PlanDestinationOutcomeSchema).min(1);
export const PlanCoverageSchema = z.strictObject({
  outcomes: OutcomesSchema,
  reachableCount: CountSchema,
});

export const PlanRepairProjectionSchema = PlanCoverageSchema.extend({
  repairId: IdSchema,
  restoredDestinationIds: UniqueIdsSchema,
});
export const PlanSelectionSchema = PlanCoverageSchema.extend({
  // Condition-first uses purchase order. Exact uses ascending code-unit ID order.
  selectedRepairIds: RepairIdsSchema,
  spendCents: CentsSchema,
  restoredDestinationIds: UniqueIdsSchema,
  restoredCount: CountSchema,
  // One evaluation per selected repair with that repair removed from this plan.
  withoutRepair: z.array(PlanRepairProjectionSchema).max(MAX_PLAN_CANDIDATES),
});

export const PlanEligibleRepairSchema = z.strictObject({
  repairId: IdSchema,
  severityScore: SeverityScoreSchema,
  costCents: CentsSchema,
});

const compareIds = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0;

function compareConditionOrder(left: PlanEligibleRepair, right: PlanEligibleRepair): number {
  return right.severityScore - left.severityScore ||
    left.costCents - right.costCents ||
    compareIds(left.repairId, right.repairId);
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function compareIdLists(left: readonly string[], right: readonly string[]): number {
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    const compared = compareIds(left[index], right[index]);
    if (compared !== 0) return compared;
  }
  return left.length - right.length;
}

/** Computed outcomes, keyed by the same ordered destination IDs as baseline.
 * A destination's before route is in baseline. The plans, single repairs and
 * omissions each contain the after route. Exactness applies only to subsets
 * of eligibleRepairs, with the supplied assumptions and budget.
 */
export const PlanComparisonSchema = z.strictObject({
  ...PlanRequestSchema.shape,
  baseline: PlanCoverageSchema,
  eligibleRepairs: z.array(PlanEligibleRepairSchema).max(MAX_PLAN_CANDIDATES),
  excludedUnknownCostRepairIds: RepairIdsSchema,
  conditionFirst: PlanSelectionSchema,
  exact: PlanSelectionSchema,
  // One single-repair evaluation for each repair selected by either plan.
  singleRepairs: z.array(PlanRepairProjectionSchema).max(MAX_PLAN_CANDIDATES),
  search: z.strictObject({
    enumeratedSubsetCount: z.number().int().min(1).max(MAX_PLAN_SUBSETS),
    feasibleSubsetCount: z.number().int().min(1).max(MAX_PLAN_SUBSETS),
  }),
}).superRefine((result, ctx) => {
  const destinationIds = result.baseline.outcomes.map(({ destinationId }) => destinationId);
  const baselineReachable = new Set(result.baseline.outcomes
    .filter(({ route }) => route.status === 'reachable')
    .map(({ destinationId }) => destinationId));
  if (new Set(destinationIds).size !== destinationIds.length) {
    issue(ctx, ['baseline', 'outcomes'], 'Baseline destinations must be unique.');
  }

  const costs = new Map(result.eligibleRepairs.map(({ repairId, costCents }) => [repairId, costCents]));
  if (costs.size !== result.eligibleRepairs.length ||
    result.excludedUnknownCostRepairIds.some((id) => costs.has(id)) ||
    costs.size + result.excludedUnknownCostRepairIds.length > MAX_PLAN_CANDIDATES) {
    issue(ctx, ['eligibleRepairs'], 'Eligible and excluded repairs must be distinct and fit the candidate limit.');
  }
  if (!sameIds(result.excludedUnknownCostRepairIds, [...result.excludedUnknownCostRepairIds].sort(compareIds))) {
    issue(ctx, ['excludedUnknownCostRepairIds'], 'List excluded repairs in stable ID order.');
  }
  const totalCost = sumCents(costs.values());
  if (totalCost === null) {
    issue(ctx, ['eligibleRepairs'], 'The total known cost must fit in a safe integer.');
  }
  const conditionOrder = [...result.eligibleRepairs].sort(compareConditionOrder);
  if (!sameIds(result.eligibleRepairs.map(({ repairId }) => repairId), conditionOrder.map(({ repairId }) => repairId))) {
    issue(ctx, ['eligibleRepairs'], 'List eligible repairs by severity descending, then cost and stable ID ascending.');
  }
  // Every feasible subset is graph-evaluated. Only individually affordable
  // repairs can occur in one, and the empty set is always feasible.
  const affordableCount = conditionOrder.filter(({ costCents }) => costCents <= result.budgetCents).length;
  const enumerated = 2 ** costs.size;
  const { enumeratedSubsetCount, feasibleSubsetCount } = result.search;
  if (enumeratedSubsetCount !== enumerated ||
    feasibleSubsetCount < affordableCount + 1 ||
    feasibleSubsetCount > 2 ** affordableCount ||
    (totalCost !== null && totalCost <= result.budgetCents && feasibleSubsetCount !== enumerated)) {
    issue(ctx, ['search'], 'Subset counts must match the candidate bound and affordability.');
  }

  const projections = new Map<string, string>();
  function checkCoverage(
    coverage: z.infer<typeof PlanCoverageSchema>,
    selectedRepairIds: string[],
    path: (string | number)[],
  ): string[] {
    const ids = coverage.outcomes.map(({ destinationId }) => destinationId);
    if (!sameIds(ids, destinationIds)) {
      issue(ctx, [...path, 'outcomes'], 'Use every baseline destination in the same order.');
    }
    const reachable = coverage.outcomes.filter(({ route }) => route.status === 'reachable');
    if (reachable.some(({ route }) => route.status === 'reachable' && route.nodeIds[0] !== result.originNodeId)) {
      issue(ctx, [...path, 'outcomes'], 'Reachable paths must start at the requested origin.');
    }
    if (reachable.length !== coverage.reachableCount) {
      issue(ctx, [...path, 'reachableCount'], 'Reachable count must equal the reachable outcomes.');
    }
    const reachableIds = reachable.map(({ destinationId }) => destinationId);
    if ([...baselineReachable].some((id) => !reachableIds.includes(id))) {
      issue(ctx, [...path, 'outcomes'], 'Clearing blockers cannot lose a baseline reachable destination.');
    }

    const key = JSON.stringify([...selectedRepairIds].sort(compareIds));
    const projected = JSON.stringify(coverage.outcomes);
    const previous = projections.get(key);
    if (previous !== undefined && previous !== projected) {
      issue(ctx, [...path, 'outcomes'], 'The same repair set must have identical evaluated outcomes.');
    }
    projections.set(key, projected);
    return reachableIds.filter((id) => !baselineReachable.has(id));
  }

  checkCoverage(result.baseline, [], ['baseline']);
  for (const key of ['conditionFirst', 'exact'] as const) {
    const plan = result[key];
    const selected = plan.selectedRepairIds;
    const amounts = selected.map((id) => costs.get(id));
    if (key === 'exact' && !sameIds(selected, [...selected].sort(compareIds))) {
      issue(ctx, [key, 'selectedRepairIds'], 'Exact repair IDs must be in stable ID order.');
    }
    const spend = amounts.every((amount) => amount !== undefined) ? sumCents(amounts) : null;
    if (spend === null || spend !== plan.spendCents || spend > result.budgetCents) {
      issue(ctx, [key, 'spendCents'], 'Selected repairs must have known costs and sum to the reported spend within budget.');
    }
    const restored = checkCoverage(plan, selected, [key]);
    if (!sameIds(restored, plan.restoredDestinationIds) || restored.length !== plan.restoredCount) {
      issue(ctx, [key, 'restoredDestinationIds'], 'Restored IDs and count must match the newly reachable destinations.');
    }
    if (!sameIds(plan.withoutRepair.map(({ repairId }) => repairId), selected)) {
      issue(ctx, [key, 'withoutRepair'], 'Evaluate each selected repair omission in selected ID order.');
    }
    for (const [index, projection] of plan.withoutRepair.entries()) {
      const path = [key, 'withoutRepair', index];
      const smallerSet = selected.filter((id) => id !== projection.repairId);
      const omissionRestored = checkCoverage(projection, smallerSet, path);
      if (!sameIds(omissionRestored, projection.restoredDestinationIds) ||
        omissionRestored.some((id) => !restored.includes(id))) {
        issue(ctx, [...path, 'restoredDestinationIds'], 'Omission results must derive from their routes and be a subset of the full plan.');
      }
    }
  }

  const conditionSelection: string[] = [];
  let remainingBudget = result.budgetCents;
  for (const repair of conditionOrder) {
    if (repair.costCents <= remainingBudget) {
      remainingBudget -= repair.costCents;
      conditionSelection.push(repair.repairId);
    }
  }
  if (!sameIds(result.conditionFirst.selectedRepairIds, conditionSelection)) {
    issue(ctx, ['conditionFirst', 'selectedRepairIds'], 'Condition-first must select affordable repairs in the declared order.');
  }

  const selectedUnion = [...new Set([...result.conditionFirst.selectedRepairIds, ...result.exact.selectedRepairIds])]
    .sort(compareIds);
  if (!sameIds(result.singleRepairs.map(({ repairId }) => repairId), selectedUnion)) {
    issue(ctx, ['singleRepairs'], 'Evaluate each repair selected by either plan, in stable ID order.');
  }
  for (const [index, projection] of result.singleRepairs.entries()) {
    const path = ['singleRepairs', index];
    const restored = checkCoverage(projection, [projection.repairId], path);
    if (!sameIds(restored, projection.restoredDestinationIds)) {
      issue(ctx, [...path, 'restoredDestinationIds'], 'Single-repair restored IDs must match its newly reachable destinations.');
    }
    for (const key of ['conditionFirst', 'exact'] as const) {
      const plan = result[key];
      if (plan.selectedRepairIds.includes(projection.repairId) &&
        restored.some((id) => !plan.restoredDestinationIds.includes(id))) {
        issue(ctx, [...path, 'restoredDestinationIds'], 'A plan cannot lose destinations restored by a repair it includes.');
      }
    }
  }

  const exact = result.exact;
  const condition = result.conditionFirst;
  if (exact.withoutRepair.some(({ restoredDestinationIds }) => restoredDestinationIds.length === exact.restoredCount)) {
    issue(ctx, ['exact', 'withoutRepair'], 'An exact plan cannot include a repair whose omission ties the full plan.');
  }
  if (exact.restoredCount < condition.restoredCount ||
    (exact.restoredCount === condition.restoredCount &&
      (exact.spendCents - condition.spendCents ||
        exact.selectedRepairIds.length - condition.selectedRepairIds.length ||
        compareIdLists(exact.selectedRepairIds, [...condition.selectedRepairIds].sort(compareIds))) > 0)) {
    issue(ctx, ['exact'], 'Exact result must rank at least as high as the feasible condition-first plan.');
  }
});

export const PlanErrorCodeSchema = z.enum([
  'INVALID_REQUEST',
  'SCENARIO_NOT_FOUND',
  'STALE_SCENARIO',
  'INVALID_SERVER_SCENARIO',
]);

export const PLAN_ERROR_HTTP_STATUS = {
  INVALID_REQUEST: 400,
  SCENARIO_NOT_FOUND: 404,
  STALE_SCENARIO: 409,
  INVALID_SERVER_SCENARIO: 500,
} as const satisfies Record<z.infer<typeof PlanErrorCodeSchema>, number>;

export const PlanFailureSchema = z.strictObject({
  contractVersion: z.literal(PLAN_CONTRACT_VERSION),
  ok: z.literal(false),
  error: z.strictObject({ code: PlanErrorCodeSchema, message: TextSchema }),
});

export const PlanScenarioResponseSchema = z.discriminatedUnion('ok', [
  z.strictObject({
    contractVersion: z.literal(PLAN_CONTRACT_VERSION),
    ok: z.literal(true),
    data: PlanScenarioSchema,
  }),
  PlanFailureSchema,
]);

export const PlanResponseSchema = z.discriminatedUnion('ok', [
  z.strictObject({
    contractVersion: z.literal(PLAN_CONTRACT_VERSION),
    ok: z.literal(true),
    data: PlanComparisonSchema,
  }),
  PlanFailureSchema,
]);

export type PlanRepairCost = z.infer<typeof PlanRepairCostSchema>;
export type PlanCandidate = z.infer<typeof PlanCandidateSchema>;
export type PlanScenario = z.infer<typeof PlanScenarioSchema>;
export type PlanScenarioQuery = z.infer<typeof PlanScenarioQuerySchema>;
export type PlanRequest = z.infer<typeof PlanRequestSchema>;
export type PlanDestinationOutcome = z.infer<typeof PlanDestinationOutcomeSchema>;
export type PlanCoverage = z.infer<typeof PlanCoverageSchema>;
export type PlanRepairProjection = z.infer<typeof PlanRepairProjectionSchema>;
export type PlanEligibleRepair = z.infer<typeof PlanEligibleRepairSchema>;
export type PlanSelection = z.infer<typeof PlanSelectionSchema>;
export type PlanComparison = z.infer<typeof PlanComparisonSchema>;
export type PlanErrorCode = z.infer<typeof PlanErrorCodeSchema>;
export type PlanFailure = z.infer<typeof PlanFailureSchema>;
export type PlanScenarioResponse = z.infer<typeof PlanScenarioResponseSchema>;
export type PlanResponse = z.infer<typeof PlanResponseSchema>;

/** Use after parsing on the server and client to reject the wrong response tuple. */
export function matchesPlanRequest(result: PlanComparison, request: PlanRequest): boolean {
  return result.contractVersion === request.contractVersion &&
    result.scenarioId === request.scenarioId &&
    result.revision === request.revision &&
    result.profileId === request.profileId &&
    result.originNodeId === request.originNodeId &&
    result.budgetCents === request.budgetCents;
}

/** Check the already parsed result against the authored context used for evaluation.
 * This verifies identity and references, without recomputing routes or search.
 */
export function matchesPlanScenario(result: PlanComparison, plan: PlanScenario): boolean {
  if (result.scenarioId !== plan.scenario.id ||
    result.revision !== plan.scenario.revision ||
    result.profileId !== plan.profile.id ||
    result.originNodeId !== plan.originNodeId ||
    !sameIds(result.baseline.outcomes.map(({ destinationId }) => destinationId), plan.destinationIds)) {
    return false;
  }

  const eligible: PlanEligibleRepair[] = [];
  const excluded: string[] = [];
  for (const { repairId, severity, cost } of plan.candidates) {
    if (cost.status === 'unknown') {
      excluded.push(repairId);
    } else {
      eligible.push({ repairId, severityScore: severity.score, costCents: cost.cents });
    }
  }
  eligible.sort(compareConditionOrder);
  if (!sameIds(result.excludedUnknownCostRepairIds, excluded.sort(compareIds)) ||
    result.eligibleRepairs.length !== eligible.length ||
    result.eligibleRepairs.some((repair, index) => compareConditionOrder(repair, eligible[index]) !== 0)) {
    return false;
  }

  const destinations = new Map(plan.scenario.destinations.map(({ id, nodeId }) => [id, nodeId]));
  const nodes = new Set(plan.scenario.nodes.map(({ id }) => id));
  const edges = new Set(plan.scenario.edges.map(({ id }) => id));
  const projections = [
    result.baseline,
    result.conditionFirst,
    result.exact,
    ...result.conditionFirst.withoutRepair,
    ...result.exact.withoutRepair,
    ...result.singleRepairs,
  ];
  return projections.every(({ outcomes }) => outcomes.every(({ destinationId, route }) =>
    route.status === 'reachable'
      ? route.nodeIds.at(-1) === destinations.get(destinationId) &&
        route.nodeIds.every((id) => nodes.has(id)) &&
        route.edgeIds.every((id) => edges.has(id))
      : [...route.blockedEdgeIds, ...route.unknownEdgeIds].every((id) => edges.has(id))));
}
