import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { PlanComparisonSchema, type PlanComparison, type PlanCoverage, type PlanScenario } from '../../../src/contracts/curb/plans';
import { comparePlans, validatePlanScenario } from '../../../src/domain/curb/plans';
import { cheapestFirst, greedy, type BaselineSelection } from './baselines';
import {
  METRICS_VERSION, SUITE_VERSION, EXPECTED_COUNTS, STRATEGIES, INVESTMENT_BUDGETS, LIMITATIONS,
  ResultRowSchema, ResultsSchema, EngineResponsesSchema, ManifestSchema,
  type Network, type ResultRow, type Results, type EngineResponses, type Manifest,
  validateSuite, requestFor, eligibleCost, caseId, controlCaseId, stableStringify, sha256, deepFreeze,
  codeUnitCompare, cliArgs, isMain,
} from './spec';

export const RELEVANT_SOURCE_PATHS = [
  'scripts/curb/metrics', 'benchmarks/curb-metrics', 'src/domain/curb', 'src/contracts/curb',
  'src/data/curb/investment-demo.json', 'modules/maps/src', 'package.json', 'package-lock.json',
  'tsconfig.json', 'vitest.config.ts',
];
const CORE_ARTIFACTS = ['inputs.json', 'engine-responses.json', 'results.json', 'results.csv'] as const;

function makeRow(
  plan: PlanScenario, identity: Pick<ResultRow, 'caseId' | 'family' | 'seed' | 'budgetPercent'>,
  budgetCents: number, strategy: ResultRow['strategy'], baseline: PlanCoverage,
  selected: BaselineSelection, response: PlanComparison,
): ResultRow {
  const baselineDestinationIds = baseline.outcomes.filter(x => x.route.status === 'reachable').map(x => x.destinationId);
  const totalDestinationIds = selected.outcomes.filter(x => x.route.status === 'reachable').map(x => x.destinationId);
  const newDestinationIds = totalDestinationIds.filter(x => !baselineDestinationIds.includes(x));
  const gain = newDestinationIds.length;
  return ResultRowSchema.parse({
    ...identity, scenarioId: plan.scenario.id, budgetCents, strategy,
    eligibleCostCents: eligibleCost(plan), eligibleCandidateCount: response.eligibleRepairs.length,
    excludedUnknownCostRepairIds: response.excludedUnknownCostRepairIds,
    selectedRepairIds: selected.selectedRepairIds, spendCents: selected.spendCents,
    baselineDestinationIds, newDestinationIds, totalDestinationIds,
    baselineCount: baselineDestinationIds.length, gain, totalCount: totalDestinationIds.length,
    destinationCount: plan.destinationIds.length, gainFraction: gain / plan.destinationIds.length,
    costPerNewDestinationCents: gain ? selected.spendCents / gain : null,
    costPerNewDestinationReason: gain ? null : 'zero_gain', outcomes: selected.outcomes,
  });
}

/** Only call after suite/source preregistration. Keeps the actual engine response unmodified. */
export function measureCase(plan: PlanScenario, identity: Pick<ResultRow, 'caseId' | 'family' | 'seed' | 'budgetPercent'>, budget: number) {
  const before = stableStringify(plan);
  const response = comparePlans(plan, deepFreeze(requestFor(plan, budget)));
  PlanComparisonSchema.parse(response);
  const selections = { exact: response.exact, conditionFirst: response.conditionFirst,
    cheapestFirst: cheapestFirst(plan, budget), greedy: greedy(plan, budget) };
  const rows = STRATEGIES.map(strategy => makeRow(plan, identity, budget, strategy, response.baseline, selections[strategy], response));
  if (rows.some(r => r.gain > rows[0].gain)) throw new Error(`Exact objective loss in ${identity.caseId}`);
  if (stableStringify(plan) !== before) throw new Error(`Input mutation in ${identity.caseId}`);
  return { response, rows };
}

export function measureSuite(suiteInput: unknown, suiteSha256: string, investmentInput: unknown): { results: Results; engine: EngineResponses } {
  const suite = deepFreeze(validateSuite(suiteInput));
  suite.networks.forEach(n => validatePlanScenario(n.plan));
  const controlInput = deepFreeze(validatePlanScenario(investmentInput));
  const results: Results = { schemaVersion: METRICS_VERSION, suiteSha256, rows: [], controls: [] };
  const engine: EngineResponses = { schemaVersion: METRICS_VERSION, cases: [], controls: [], controlInput };
  for (const n of suite.networks) {
    let previousExactGain = -1;
    for (const budget of n.budgets) {
      const id = caseId(n.id, budget.percent);
      const measured = measureCase(n.plan, { caseId: id, family: n.family, seed: n.seed, budgetPercent: budget.percent }, budget.cents);
      if (measured.rows[0].gain < previousExactGain) throw new Error(`Exact gain decreases with budget in ${n.id}`);
      previousExactGain = measured.rows[0].gain;
      if (budget.percent === 100 && measured.rows.some(r => r.gain !== measured.rows[0].gain)) throw new Error(`Full-budget reachability mismatch in ${n.id}`);
      engine.cases.push({ caseId: id, response: measured.response });
      results.rows.push(...measured.rows);
    }
  }
  for (const budget of INVESTMENT_BUDGETS) {
    const id = controlCaseId(budget);
    const measured = measureCase(controlInput, { caseId: id, family: 'investment-control', seed: null, budgetPercent: null }, budget);
    engine.controls.push({ caseId: id, response: measured.response });
    results.controls.push(...measured.rows);
  }
  ResultsSchema.parse(results);
  EngineResponsesSchema.parse(engine);
  return { results, engine };
}

const CSV_FIELDS = [
  'caseId', 'scenarioId', 'family', 'seed', 'budgetPercent', 'budgetCents', 'strategy',
  'eligibleCostCents', 'eligibleCandidateCount', 'excludedUnknownCostRepairIds', 'selectedRepairIds',
  'spendCents', 'baselineDestinationIds', 'newDestinationIds', 'totalDestinationIds',
  'baselineCount', 'gain', 'totalCount', 'destinationCount', 'gainFraction',
  'costPerNewDestinationCents', 'costPerNewDestinationReason',
] as const;
export function resultsCsv(rows: readonly ResultRow[]): string {
  const cell = (v: unknown) => {
    const value = v === null ? '' : Array.isArray(v) ? JSON.stringify(v) : String(v);
    return '"' + value.replaceAll('"', '""') + '"';
  };
  return CSV_FIELDS.join(',') + '\n' + rows.map(row => CSV_FIELDS.map(key => cell(row[key])).join(',')).join('\n') + '\n';
}

function git(root: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
export function sourceProvenance(root: string, suitePath: string): Pick<Manifest, 'sourceCommit' | 'frozenInputCommit' | 'suiteSha256' | 'sourceHashes'> {
  const suiteRelative = relative(root, suitePath).split(sep).join('/');
  if (suiteRelative !== 'benchmarks/curb-metrics/suite-v1.json') throw new Error('Publishable runs require the canonical frozen suite path');
  if (git(root, 'status', '--porcelain', '--untracked-files=all', '--', ...RELEVANT_SOURCE_PATHS)) throw new Error('Relevant benchmark/engine/contract sources are dirty; commit before a publishable run');
  const sourceCommit = git(root, 'rev-parse', 'HEAD');
  const frozenInputCommit = git(root, 'log', '-1', '--format=%H', '--', suiteRelative);
  if (!/^[a-f0-9]{40}$/.test(frozenInputCommit)) throw new Error('Frozen input must be committed');
  git(root, 'merge-base', '--is-ancestor', frozenInputCommit, sourceCommit);
  const bytes = readFileSync(suitePath);
  const frozenBytes = execFileSync('git', ['show', `${frozenInputCommit}:${suiteRelative}`], { cwd: root });
  if (!bytes.equals(frozenBytes)) throw new Error('Frozen input bytes differ from the recorded commit');
  for (const path of ['scripts/curb/metrics/spec.ts', 'scripts/curb/metrics/generate.ts']) git(root, 'cat-file', '-e', `${frozenInputCommit}:${path}`);
  const files = git(root, 'ls-files', '--', ...RELEVANT_SOURCE_PATHS).split('\n').filter(Boolean).sort(codeUnitCompare);
  const sourceHashes = Object.fromEntries(files.map(path => [path, sha256(readFileSync(resolve(root, path)))]));
  return { sourceCommit, frozenInputCommit, suiteSha256: sha256(bytes), sourceHashes };
}

/** Atomic directory reservation refuses reuse, including failed prior runs. No official audit is authored here. */
export function runBenchmark(options: { root?: string; suite: string; out: string }): Manifest {
  const root = resolve(options.root ?? git(process.cwd(), 'rev-parse', '--show-toplevel'));
  const suitePath = resolve(options.suite);
  const out = resolve(options.out);
  const provenance = sourceProvenance(root, suitePath);
  const suiteBytes = readFileSync(suitePath);
  const suite = validateSuite(JSON.parse(suiteBytes.toString('utf8')));
  suite.networks.forEach((n: Network) => validatePlanScenario(n.plan));
  const investment = JSON.parse(readFileSync(resolve(root, 'src/data/curb/investment-demo.json'), 'utf8'));
  mkdirSync(dirname(out), { recursive: true });
  mkdirSync(out, { recursive: false });
  writeFileSync(resolve(out, 'inputs.json'), suiteBytes, { flag: 'wx' });
  try {
    const { results, engine } = measureSuite(suite, provenance.suiteSha256, investment);
    const artifacts: Record<string, string | Uint8Array> = {
      'engine-responses.json': stableStringify(engine),
      'results.json': stableStringify(results),
      // CSV has aggregate rows ONLY. The 32 demonstration-control rows remain separately identified in results.json.
      'results.csv': resultsCsv(results.rows),
    };
    for (const [name, bytes] of Object.entries(artifacts)) writeFileSync(resolve(out, name), bytes, { flag: 'wx' });
    const nativeRelativeOut = relative(root, out);
    const relativeOut = nativeRelativeOut.split(sep).join('/');
    const publicOut = relativeOut && !isAbsolute(nativeRelativeOut) && relativeOut !== '..' && !relativeOut.startsWith('../') ? relativeOut : '<run-directory>';
    const runCommand = `node --import tsx scripts/curb/metrics/benchmark.ts --suite benchmarks/curb-metrics/suite-v1.json --out ${publicOut}`;
    const log = `${runCommand}\nexitCode=0\nnetworks=30 cases=120 strategyRows=480 pairedComparisons=360\ncontrolCases=8 controlRows=32\naudit=pending; report=blocked pending independent audit and separate-checkout rerun\n`;
    writeFileSync(resolve(out, 'run.log'), log, { flag: 'wx' });
    const manifest: Manifest = ManifestSchema.parse({
      schemaVersion: METRICS_VERSION, suiteVersion: SUITE_VERSION, ...provenance,
      inputRelationship: 'inputs.json is a byte-for-byte copy of the frozen suite file',
      sourceHashes: provenance.sourceHashes,
      artifactHashes: Object.fromEntries([...CORE_ARTIFACTS, 'run.log'].map(name => [name, sha256(readFileSync(resolve(out, name)))])),
      counts: EXPECTED_COUNTS,
      execution: { utc: new Date().toISOString(), node: process.version, platform: process.platform, commands: [runCommand], publishable: true },
      measuredScope: 'Known modeled destination access at equal assumed repair budget; controls excluded from aggregate. Execution command uses a portable placeholder for the reserved output directory.',
      limitations: [...LIMITATIONS],
    });
    writeFileSync(resolve(out, 'manifest.json'), stableStringify(manifest), { flag: 'wx' });
    return manifest;
  } catch (error) {
    // Preserve failed runs instead of silently overwriting or selecting survivors. No machine paths in receipt.
    const reason = error instanceof Error ? error.message.replaceAll(root, '<source>').replaceAll(out, '<run-directory>') : 'Unknown benchmark failure';
    writeFileSync(resolve(out, 'run.log'), `exitCode=1\nsourceCommit=${provenance.sourceCommit}\nfrozenInputCommit=${provenance.frozenInputCommit}\nsuiteSha256=${provenance.suiteSha256}\nreason=${reason}\nNo accepted results or headline. Retain inputs and this failed receipt.\n`, { flag: 'a' });
    throw error;
  }
}

if (isMain(import.meta.url)) {
  try {
    const args = cliArgs();
    if (!args['--suite'] || !args['--out'] || Object.keys(args).some(k => !['--suite', '--out'].includes(k))) throw new Error('Usage: benchmark.ts --suite <suite-v1.json> --out <new-run-directory>');
    const manifest = runBenchmark({ suite: args['--suite'], out: args['--out'] });
    console.log(stableStringify({ sourceCommit: manifest.sourceCommit, frozenInputCommit: manifest.frozenInputCommit, suiteSha256: manifest.suiteSha256, counts: manifest.counts, audit: 'pending' }));
  } catch (error) { console.error(error instanceof Error ? error.message : 'Benchmark failed'); process.exitCode = 1; }
}
