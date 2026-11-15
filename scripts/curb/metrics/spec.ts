/** Frozen evaluation contract. No production routing/search imports: audit may import this file. */
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { PlanScenarioSchema, PlanComparisonSchema, PlanDestinationOutcomeSchema, type PlanScenario, type PlanRequest } from '../../../src/contracts/curb/plans';

export const METRICS_VERSION = 'curb-metrics-v1' as const;
export const SUITE_VERSION = 'suite-v1' as const;
export const FAMILIES = ['independent', 'serial', 'shared', 'alternatives', 'mixed', 'incomplete'] as const;
export const SEEDS = [101, 202, 303, 404, 505] as const;
export const BUDGET_PERCENTAGES = [25, 50, 75, 100] as const;
export const STRATEGIES = ['exact', 'conditionFirst', 'cheapestFirst', 'greedy'] as const;
export const PRICE_SET_CENTS = [100, 200, 300, 500, 800, 1300] as const;
export const EXPECTED_COUNTS = { networks: 30, cases: 120, rows: 480, pairs: 360, controls: 8, controlRows: 32 } as const;
export const INVESTMENT_BUDGETS = [0, 499999, 500000, 999999, 1000000, 1499999, 1500000, 2000000] as const;
export const LIMITATIONS = [
  'Preregistered authored synthetic engineering suite; not a representative or held-out campus sample.',
  'Equal-weight destinations are not people; assumed costs and modeled repairs are not construction outcomes.',
  'Unknown routes provide no demonstrated access; unknown-cost candidates are excluded.',
  'Objective omits hazard reduction, partial progress and mandatory-work constraints.',
  '120 correlated budget cases arise from 30 networks; no significance or population claims.',
  'Human study observations and measured time savings are outside this benchmark.',
] as const;
export const POLICY_RULES = {
  exact: 'Actual comparePlans exact: maximize newly reachable destinations; then lower spend, fewer repairs, code-unit sorted IDs.',
  conditionFirst: 'Actual comparePlans conditionFirst: severity descending, cost ascending, code-unit ID ascending; scan affordable, skip otherwise.',
  cheapestFirst: 'Cost ascending, severity descending, code-unit ID ascending; scan affordable, skip otherwise.',
  greedy: 'Recompute marginal known reachability per dollar after every purchase; exact rational cross-products; ties higher absolute gain, lower cost, code-unit ID. Positive-gain free first; free zero gain has ratio zero. Continue zero-gain purchases until nothing fits.',
} as const;

export type Family = typeof FAMILIES[number];
export type Strategy = typeof STRATEGIES[number];
const id = z.string().min(1);
const count = z.number().int().nonnegative();
const cents = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const commit = z.string().regex(/^[a-f0-9]{40}$/);
const ids = z.array(id).refine(v => new Set(v).size === v.length, 'Duplicate IDs');
export const BudgetSchema = z.strictObject({ percent: z.union([z.literal(25), z.literal(50), z.literal(75), z.literal(100)]), cents });
export const NetworkSchema = z.strictObject({
  id, family: z.enum(FAMILIES), seed: z.number().int(), authoredBaselineDestinationId: id,
  plan: PlanScenarioSchema, eligibleCostCents: cents, budgets: z.array(BudgetSchema).length(4),
});
export type Network = z.infer<typeof NetworkSchema>;
export const SuiteSchema = z.strictObject({
  schemaVersion: z.literal(METRICS_VERSION), suiteVersion: z.literal(SUITE_VERSION),
  generator: z.strictObject({ version: z.literal(1), prng: id, derivation: id, rules: z.array(id).min(1), priceSetCents: z.array(cents), seeds: z.array(z.number().int()) }),
  policies: z.strictObject({ exact: id, conditionFirst: id, cheapestFirst: id, greedy: id }),
  metric: id, limitations: z.array(id), networks: z.array(NetworkSchema).length(30),
});
export type Suite = z.infer<typeof SuiteSchema>;

export const ResultRowSchema = z.strictObject({
  caseId: id, scenarioId: id, family: z.union([z.enum(FAMILIES), z.literal('investment-control')]),
  seed: z.number().int().nullable(), budgetPercent: z.number().nullable(), budgetCents: cents,
  eligibleCostCents: cents, eligibleCandidateCount: count, excludedUnknownCostRepairIds: ids,
  strategy: z.enum(STRATEGIES), selectedRepairIds: ids, spendCents: cents,
  baselineDestinationIds: ids, newDestinationIds: ids, totalDestinationIds: ids,
  baselineCount: count, gain: count, totalCount: count, destinationCount: count,
  gainFraction: z.number().min(0).max(1), costPerNewDestinationCents: z.number().nonnegative().nullable(),
  costPerNewDestinationReason: z.literal('zero_gain').nullable(),
  outcomes: z.array(PlanDestinationOutcomeSchema),
}).superRefine((r, ctx) => {
  const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
  const total = r.outcomes.filter(x => x.route.status === 'reachable').map(x => x.destinationId);
  const newly = total.filter(x => !r.baselineDestinationIds.includes(x));
  if (r.spendCents > r.budgetCents || r.baselineCount !== r.baselineDestinationIds.length || r.gain !== r.newDestinationIds.length || r.totalCount !== r.totalDestinationIds.length || r.destinationCount !== r.outcomes.length) fail('Invalid counts or budget');
  if (!sameIds(total, r.totalDestinationIds) || !sameIds(newly, r.newDestinationIds) || r.baselineDestinationIds.some(x => !total.includes(x))) fail('Destination sets disagree');
  if (new Set(r.outcomes.map(x => x.destinationId)).size !== r.destinationCount || r.destinationCount === 0 || r.gainFraction !== r.gain / r.destinationCount) fail('Invalid destination denominator');
  if (r.gain === 0 ? r.costPerNewDestinationCents !== null || r.costPerNewDestinationReason !== 'zero_gain' : r.costPerNewDestinationCents !== r.spendCents / r.gain || r.costPerNewDestinationReason !== null) fail('Invalid cost-per-gain denominator');
});
export type ResultRow = z.infer<typeof ResultRowSchema>;
export const ResultsSchema = z.strictObject({ schemaVersion: z.literal(METRICS_VERSION), suiteSha256: hash, rows: z.array(ResultRowSchema).length(480), controls: z.array(ResultRowSchema).length(32) });
export type Results = z.infer<typeof ResultsSchema>;
export const EngineResponsesSchema = z.strictObject({
  schemaVersion: z.literal(METRICS_VERSION),
  cases: z.array(z.strictObject({ caseId: id, response: PlanComparisonSchema })).length(120),
  controls: z.array(z.strictObject({ caseId: id, response: PlanComparisonSchema })).length(8),
  controlInput: PlanScenarioSchema,
});
export type EngineResponses = z.infer<typeof EngineResponsesSchema>;

/** Audit owner writes a check for EVERY row, case, and investment budget. report rejects omissions.
 * independentRerun is a separate-checkout verifier attestation, never populated by benchmark.ts.
 * checkedArtifactHashes bind the original inputs/engine/results CSV+JSON; report rechecks them.
 */
export const AuditSchema = z.strictObject({
  schemaVersion: z.literal(METRICS_VERSION), verifierVersion: id, status: z.enum(['passed', 'failed']),
  sourceCommit: commit, suiteSha256: hash,
  expectedCounts: z.strictObject({ networks: count, cases: count, rows: count, pairs: count, controls: count, controlRows: count }),
  actualCounts: z.strictObject({ networks: count, cases: count, rows: count, pairs: count, controls: count, controlRows: count }),
  checkedArtifactHashes: z.record(id, hash),
  caseChecks: z.array(z.strictObject({ caseId: id, passed: z.boolean(), checks: z.array(id).min(1) })),
  rowChecks: z.array(z.strictObject({ caseId: id, strategy: z.enum(STRATEGIES), passed: z.boolean(), checks: z.array(id).min(1) })),
  controlChecks: z.array(z.strictObject({ caseId: id, passed: z.boolean(), checks: z.array(id).min(1) })),
  failures: z.array(id),
  independentRerun: z.strictObject({ completed: z.boolean(), sourceCommit: commit, suiteSha256: hash, deterministicHashes: z.record(id, hash), verifier: id, receipt: id }),
});
export type Audit = z.infer<typeof AuditSchema>;
export const ManifestSchema = z.strictObject({
  schemaVersion: z.literal(METRICS_VERSION), suiteVersion: z.literal(SUITE_VERSION),
  sourceCommit: commit, frozenInputCommit: commit, suiteSha256: hash,
  inputRelationship: z.literal('inputs.json is a byte-for-byte copy of the frozen suite file'),
  sourceHashes: z.record(id, hash), artifactHashes: z.record(id, hash),
  counts: z.strictObject({ networks: count, cases: count, rows: count, pairs: count, controls: count, controlRows: count }),
  execution: z.strictObject({ utc: id, node: id, platform: id, commands: z.array(id), publishable: z.boolean() }),
  measuredScope: id, limitations: z.array(id),
});
export type Manifest = z.infer<typeof ManifestSchema>;

export function codeUnitCompare(a: string, b: string): number { return a < b ? -1 : a > b ? 1 : 0; }
export function sameIds(a: readonly string[], b: readonly string[]): boolean { return a.length === b.length && a.every((x, i) => x === b[i]); }
export function stableStringify(value: unknown): string {
  const canonical = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(canonical);
    if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort(codeUnitCompare).map(k => [k, canonical((v as Record<string, unknown>)[k])]));
    return v;
  };
  return JSON.stringify(canonical(value), null, 2) + '\n';
}
export function sha256(bytes: string | Uint8Array): string { return createHash('sha256').update(bytes).digest('hex'); }
export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') { Object.values(value).forEach(deepFreeze); Object.freeze(value); }
  return value;
}
export function requestFor(plan: PlanScenario, budgetCents: number): PlanRequest {
  return { contractVersion: 'curb-r2', scenarioId: plan.scenario.id, revision: plan.scenario.revision, profileId: plan.profile.id, originNodeId: plan.originNodeId, budgetCents };
}
export function eligibleCost(plan: PlanScenario): number {
  return plan.candidates.reduce((sum, r) => sum + (r.cost.status === 'unknown' ? 0 : r.cost.cents), 0);
}
export function budgetsFor(plan: PlanScenario): Network['budgets'] {
  const k = eligibleCost(plan);
  const budgets = BUDGET_PERCENTAGES.map(percent => ({ percent, cents: Math.floor(k * percent / 100) }));
  if (!Number.isSafeInteger(k) || k <= 0 || budgets.some(x => x.cents <= 0) || new Set(budgets.map(x => x.cents)).size !== 4) throw new Error('Invalid distinct positive suite budgets');
  return budgets;
}
export function caseId(networkId: string, percent: number): string { return `${networkId}@${percent}`; }
export function controlCaseId(budget: number): string { return `investment@${budget}`; }

/** Structural suite validation only: never computes any policy outcome. */
export function validateSuite(input: unknown): Suite {
  const suite = SuiteSchema.parse(input);
  const fail = (message: string): never => { throw new Error(message); };
  if (stableStringify(suite.policies) !== stableStringify(POLICY_RULES) || !sameIds(suite.generator.priceSetCents.map(String), PRICE_SET_CENTS.map(String)) || !sameIds(suite.generator.seeds.map(String), SEEDS.map(String))) fail('Frozen rules differ');
  const expected = FAMILIES.flatMap(family => SEEDS.map(seed => `${family}-${seed}`));
  if (!sameIds(suite.networks.map(x => x.id), expected)) fail('Missing, duplicate, or reordered suite network');
  for (const n of suite.networks) {
    const p = n.plan;
    if (n.id !== `${n.family}-${n.seed}` || p.scenario.id !== n.id || p.scenario.dataKind !== 'synthetic') fail('Scenario identity mismatch');
    if (p.scenario.nodes.length < 12 || p.scenario.nodes.length > 30 || p.destinationIds.length !== 8 || p.scenario.destinations.length !== 8 || new Set(p.scenario.destinations.map(d => d.nodeId)).size !== 8 || !p.destinationIds.includes(n.authoredBaselineDestinationId)) fail('Network size/destination contract');
    if (p.candidates.length < 6 || p.candidates.length > 10 || p.repairs.length !== p.candidates.length) fail('Candidate bound');
    if (p.candidates.some(c => c.cost.status !== 'unknown' && (c.cost.status !== 'assumed' || !PRICE_SET_CENTS.includes(c.cost.cents as typeof PRICE_SET_CENTS[number])))) fail('Cost distribution changed');
    const unknownCosts = p.candidates.filter(c => c.cost.status === 'unknown').length;
    const unknownEdges = p.edgeAssessments.filter(a => a.status === 'unknown').length;
    if (unknownCosts !== (n.family === 'incomplete' ? 1 : 0) || unknownEdges !== (n.family === 'incomplete' ? 2 : 0)) fail('Unknown information counts');
    if (n.eligibleCostCents !== eligibleCost(p) || stableStringify(n.budgets) !== stableStringify(budgetsFor(p))) fail('Budget derivation mismatch');
    // The declared baseline has a direct known pass edge; no exact baseline count is imposed.
    const dest = p.scenario.destinations.find(d => d.id === n.authoredBaselineDestinationId)!;
    if (!p.scenario.edges.some(e => e.fromNodeId === p.originNodeId && e.toNodeId === dest.nodeId && p.edgeAssessments.some(a => a.edgeId === e.id && a.status === 'pass' && a.blockingBarrierIds.length === 0))) fail('Authored baseline is not known reachable');
  }
  return suite;
}
export function isMain(url: string): boolean { return Boolean(process.argv[1]) && url === pathToFileURL(resolve(process.argv[1])).href; }
export function cliArgs(args = process.argv.slice(2)): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!args[i].startsWith('--') || !args[i + 1] || args[i + 1].startsWith('--') || args[i] in result) throw new Error('Expected unique --key value arguments');
    result[args[i]] = args[i + 1];
  }
  return result;
}
