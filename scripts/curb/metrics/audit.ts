import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PlanScenarioSchema, type PlanComparison, type PlanCoverage } from '../../../src/contracts/curb/plans';
import { prepareOracle, requireCheck, type Oracle, type Projection } from './oracle';
import {
  AuditSchema, BUDGET_PERCENTAGES, EngineResponsesSchema, EXPECTED_COUNTS, INVESTMENT_BUDGETS,
  METRICS_VERSION, ManifestSchema, ResultsSchema, STRATEGIES,
  caseId, cliArgs, codeUnitCompare, controlCaseId, isMain, requestFor, sameIds, sha256, stableStringify, validateSuite,
  type Audit, type EngineResponses, type Manifest, type ResultRow, type Results, type Strategy, type Suite,
} from './spec';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const SUITE_FILE = 'benchmarks/curb-metrics/suite-v1.json';
const INVESTMENT_FILE = 'src/data/curb/investment-demo.json';
const FROZEN_SHA256 = 'd639296a53e17c1298436b63f358ecb026358d46e7fef6bd1f00812c18daed55';
const VERIFIER = 'independent-directed-bfs-v1';
export const CORE_ARTIFACTS = ['inputs.json', 'engine-responses.json', 'results.json', 'results.csv'] as const;
const RUN_ARTIFACTS = [...CORE_ARTIFACTS, 'run.log'];
const CSV_FIELDS = [
  'caseId', 'scenarioId', 'family', 'seed', 'budgetPercent', 'budgetCents', 'strategy',
  'eligibleCostCents', 'eligibleCandidateCount', 'excludedUnknownCostRepairIds', 'selectedRepairIds',
  'spendCents', 'baselineDestinationIds', 'newDestinationIds', 'totalDestinationIds', 'baselineCount',
  'gain', 'totalCount', 'destinationCount', 'gainFraction', 'costPerNewDestinationCents', 'costPerNewDestinationReason',
] as const satisfies readonly (keyof ResultRow)[];
const sourceRoots = [
  'scripts/curb/metrics', 'benchmarks/curb-metrics', 'src/domain/curb', 'src/contracts/curb', INVESTMENT_FILE,
  'modules/maps/src', 'package.json', 'package-lock.json', 'tsconfig.json', 'vitest.config.ts',
];

const same = (a: unknown, b: unknown) => stableStringify(a) === stableStringify(b);
function equal(actual: unknown, expected: unknown, what: string): void {
  requireCheck(same(actual, expected), what + ' differs from its independent expectation');
}

function json(bytes: Uint8Array): unknown {
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

/** Independently reconstruct the exact transport representation and bind it to results.json. */
export function validateCsv(text: string, rows: readonly ResultRow[]): void {
  function quote(value: ResultRow[typeof CSV_FIELDS[number]]): string {
    let cell = '';
    if (Array.isArray(value)) cell = JSON.stringify(value);
    else if (value !== null) cell = String(value);
    return '"' + cell.replaceAll('"', '""') + '"';
  }
  const csv = CSV_FIELDS.join(',') + '\n' +
    rows.map(row => CSV_FIELDS.map(key => quote(row[key])).join(',') + '\n').join('');
  requireCheck(text === csv, 'results.csv does not match the prescribed transport of results.json');
}

export function verifyArtifactHashes(files: ReadonlyMap<string, Uint8Array>, hashes: Record<string, string>) {
  const expected = new Set(RUN_ARTIFACTS);
  requireCheck(files.size === expected.size && [...files.keys()].every(name => expected.has(name)),
    'Missing or extra benchmark artifact');
  equal(Object.keys(hashes).sort(codeUnitCompare), [...expected].sort(codeUnitCompare), 'Manifest artifact names');
  for (const [name, bytes] of files) requireCheck(sha256(bytes) === hashes[name], 'Artifact SHA-256 mismatch: ' + name);
  return Object.fromEntries(CORE_ARTIFACTS.map(name => [name, hashes[name]]));
}

function readGit(args: string[]): Buffer {
  return execFileSync('git', ['-C', ROOT, ...args], { maxBuffer: 32 * 1024 * 1024 });
}

function committedBytes(commit: string, file: string): Buffer {
  const parts = file.split('/');
  requireCheck(/^[A-Za-z0-9._/-]+$/.test(file) && parts.every(part => part && part !== '.' && part !== '..'),
    'Invalid source path: ' + file);
  return readGit(['show', commit + ':' + file]);
}

function verifySource(manifest: Manifest) {
  requireCheck(manifest.execution.publishable, 'Benchmark was not recorded as publishable');
  requireCheck(manifest.execution.commands.length > 0 && Number.isFinite(Date.parse(manifest.execution.utc)),
    'Missing or invalid execution command/time');
  readGit(['merge-base', '--is-ancestor', manifest.frozenInputCommit, manifest.sourceCommit]);
  const frozen = committedBytes(manifest.frozenInputCommit, SUITE_FILE);
  const source = committedBytes(manifest.sourceCommit, SUITE_FILE);
  requireCheck(sha256(frozen) === FROZEN_SHA256 && source.equals(frozen),
    'Claimed commits do not contain the frozen suite bytes');
  const sourceFiles = readGit(['ls-tree', '-r', '--name-only', '-z', manifest.sourceCommit, '--', ...sourceRoots])
    .toString('utf8').split('\0').filter(Boolean).sort(codeUnitCompare);
  equal(Object.keys(manifest.sourceHashes).sort(codeUnitCompare), sourceFiles, 'Manifest tracked source file names');
  requireCheck(sourceFiles.includes(INVESTMENT_FILE) && sourceFiles.includes('scripts/curb/metrics/benchmark.ts'),
    'Required benchmark source files are absent');
  for (const [name, digest] of Object.entries(manifest.sourceHashes)) {
    requireCheck(sha256(committedBytes(manifest.sourceCommit, name)) === digest, 'Source SHA-256 mismatch: ' + name);
  }
  return PlanScenarioSchema.parse(json(committedBytes(manifest.sourceCommit, INVESTMENT_FILE)));
}

type Run = {
  manifest: Manifest; suite: Suite; engine: EngineResponses; results: Results; checkedArtifactHashes: Record<string, string>;
};

function readRun(directory: string): Run {
  const entries = readdirSync(directory, { withFileTypes: true });
  requireCheck(entries.every(entry => entry.isFile()), 'Benchmark package may contain only regular files');
  requireCheck(entries.some(entry => entry.name === 'manifest.json'), 'Missing manifest.json');
  const manifest = ManifestSchema.parse(json(readFileSync(join(directory, 'manifest.json'))));
  const files = new Map(entries.filter(x => x.name !== 'manifest.json')
    .map(entry => [entry.name, readFileSync(join(directory, entry.name))]));
  const checkedArtifactHashes = verifyArtifactHashes(files, manifest.artifactHashes);
  requireCheck(checkedArtifactHashes['inputs.json'] === FROZEN_SHA256 && manifest.suiteSha256 === FROZEN_SHA256,
    'Input snapshot differs from the frozen suite');
  const suite = validateSuite(json(files.get('inputs.json')!));
  const engine = EngineResponsesSchema.parse(json(files.get('engine-responses.json')!));
  const results = ResultsSchema.parse(json(files.get('results.json')!));
  const investment = verifySource(manifest);
  equal(engine.controlInput, investment, 'Investment control fixture');
  requireCheck(results.suiteSha256 === manifest.suiteSha256, 'Result rows refer to the wrong suite');
  equal(manifest.counts, EXPECTED_COUNTS, 'Manifest counts');
  validateCsv(new TextDecoder('utf-8', { fatal: true }).decode(files.get('results.csv')!), results.rows);
  return { manifest, suite, engine, results, checkedArtifactHashes };
}

function validateProjection(oracle: Oracle, coverage: PlanCoverage, selected: readonly string[], label: string) {
  const actual = oracle.validateOutcomes(coverage.outcomes, selected, label);
  const expected = oracle.project(selected);
  equal(coverage.reachableCount, actual.length, label + ' count');
  return expected;
}

export function validateEngine(
  response: PlanComparison, oracle: Oracle, budget: number, evaluation: ReturnType<Oracle['evaluate']>,
) {
  const request = requestFor(oracle.plan, budget);
  for (const [name, value] of Object.entries(request)) equal(response[name as keyof typeof request], value, 'Engine ' + name);
  equal(response.eligibleRepairs, oracle.eligibleRepairs, 'Engine eligible repair identities, severity and costs');
  equal(response.excludedUnknownCostRepairIds, oracle.excludedUnknownCostRepairIds, 'Engine unknown-cost exclusions');
  equal(response.search, evaluation.search, 'Engine subset counts');
  validateProjection(oracle, response.baseline, [], 'Engine baseline');
  for (const key of ['exact', 'conditionFirst'] as const) {
    const actual = response[key], expected = evaluation.policies[key];
    equal(actual.selectedRepairIds, expected.selectedRepairIds, key + ' selection');
    equal(actual.spendCents, expected.spendCents, key + ' spend');
    equal(actual.restoredCount, expected.newDestinationIds.length, key + ' gain');
    equal(actual.restoredDestinationIds, expected.newDestinationIds, key + ' new destinations');
    validateProjection(oracle, actual, expected.selectedRepairIds, key);
    equal(actual.withoutRepair.map(x => x.repairId), expected.selectedRepairIds, key + ' omissions');
    for (const item of actual.withoutRepair) {
      const id = item.repairId;
      const subset = expected.selectedRepairIds.filter(repair => repair !== id);
      const projection = validateProjection(oracle, item, subset, key + ' without ' + id);
      equal(item.restoredDestinationIds, projection.newDestinationIds, key + ' omission destinations');
    }
  }
  const singleIds = [...new Set([...evaluation.policies.exact.selectedRepairIds,
    ...evaluation.policies.conditionFirst.selectedRepairIds])].sort(codeUnitCompare);
  equal(response.singleRepairs.map(x => x.repairId), singleIds, 'Engine singleton repair identities');
  for (const item of response.singleRepairs) {
    const expected = validateProjection(oracle, item, [item.repairId], 'Engine singleton ' + item.repairId);
    equal(item.restoredDestinationIds, expected.newDestinationIds, 'Engine singleton new destinations');
  }
}

type RowIdentity = Pick<ResultRow, 'caseId' | 'family' | 'seed' | 'budgetPercent' | 'budgetCents' | 'strategy'>;
export function validateRow(row: ResultRow, id: RowIdentity, oracle: Oracle, policy: Projection, engine?: PlanComparison) {
  equal({
    caseId: row.caseId, family: row.family, seed: row.seed, budgetPercent: row.budgetPercent,
    budgetCents: row.budgetCents, strategy: row.strategy,
  }, id, 'Row identity');
  const gain = policy.newDestinationIds.length;
  const denominator = oracle.plan.destinationIds.length;
  equal(row.scenarioId, oracle.plan.scenario.id, 'Row scenario');
  equal(row.eligibleCostCents, oracle.eligibleCostCents, 'Row eligible cents');
  equal(row.eligibleCandidateCount, oracle.eligibleRepairs.length, 'Row eligible candidate count');
  equal(row.excludedUnknownCostRepairIds, oracle.excludedUnknownCostRepairIds, 'Row unknown-cost repair IDs');
  equal(row.selectedRepairIds, policy.selectedRepairIds, 'Row selected repair IDs');
  equal(row.spendCents, policy.spendCents, 'Row spend');
  requireCheck(policy.spendCents <= id.budgetCents, 'Row violates budget');
  equal(row.baselineDestinationIds, oracle.baselineDestinationIds, 'Row baseline destinations');
  equal(row.totalDestinationIds, policy.totalDestinationIds, 'Row total destinations');
  equal(row.newDestinationIds, policy.newDestinationIds, 'Row newly reachable destinations');
  equal(row.baselineCount, oracle.baselineDestinationIds.length, 'Row baseline count');
  equal(row.gain, gain, 'Row gain');
  equal(row.totalCount, policy.totalDestinationIds.length, 'Row total reachability count');
  equal(row.destinationCount, denominator, 'Row destination denominator');
  equal(row.gainFraction, gain / denominator, 'Row gain fraction');
  equal(row.costPerNewDestinationCents, gain > 0 ? policy.spendCents / gain : null, 'Row cost per gain');
  equal(row.costPerNewDestinationReason, gain > 0 ? null : 'zero_gain', 'Row nullable price reason');
  oracle.validateOutcomes(row.outcomes, policy.selectedRepairIds, 'Row ' + row.strategy);
  if (engine && (row.strategy === 'exact' || row.strategy === 'conditionFirst')) {
    equal(row.outcomes, engine[row.strategy].outcomes, 'Row binding to untouched engine response');
  }
}

const authoredControls = [
  { condition: [], exact: [], feasible: 1, gain: [0, 0] },
  { condition: [], exact: [], feasible: 1, gain: [0, 0] },
  { condition: ['repair-a'], exact: [], feasible: 3, gain: [0, 0] },
  { condition: ['repair-a'], exact: [], feasible: 3, gain: [0, 0] },
  { condition: ['repair-c'], exact: ['repair-a', 'repair-b'], feasible: 5, gain: [1, 2] },
  { condition: ['repair-c'], exact: ['repair-a', 'repair-b'], feasible: 5, gain: [1, 2] },
  { condition: ['repair-c', 'repair-a'], exact: ['repair-a', 'repair-b'], feasible: 7, gain: [1, 2] },
  { condition: ['repair-c', 'repair-a', 'repair-b'], exact: ['repair-a', 'repair-b', 'repair-c'], feasible: 8, gain: [3, 3] },
] as const;

function checkIllustration(index: number, oracle: Oracle, evaluated: ReturnType<Oracle['evaluate']>) {
  const control = authoredControls[index];
  const { exact, conditionFirst, cheapestFirst } = evaluated.policies;
  equal(oracle.baselineDestinationIds, ['cafe'], 'Authored investment baseline');
  equal(conditionFirst.selectedRepairIds, control.condition, 'Authored condition-first selection');
  equal(exact.selectedRepairIds, control.exact, 'Authored exact selection');
  equal([conditionFirst.newDestinationIds.length, exact.newDestinationIds.length], control.gain, 'Authored gains');
  equal(evaluated.search, { enumeratedSubsetCount: 8, feasibleSubsetCount: control.feasible }, 'Authored search counts');
  if (INVESTMENT_BUDGETS[index] !== 1_000_000) return;
  equal(conditionFirst.newDestinationIds, ['hall'], 'Authored Hall restoration');
  equal(exact.newDestinationIds, ['library', 'student-center'], 'Authored shared restorations');
  equal([conditionFirst.spendCents, exact.spendCents], [1_000_000, 1_000_000], 'Authored equal spend');
  equal(cheapestFirst, exact, 'Authored cheapest-first tie');
  for (const repair of ['repair-a', 'repair-b']) {
    equal(oracle.project([repair]).newDestinationIds, [], 'Authored singleton / omission ' + repair);
  }
}

export function auditResults(run: Run): Audit {
  const { suite, engine, results, manifest, checkedArtifactHashes } = run;
  const failures: string[] = [];
  const caseChecks: Audit['caseChecks'] = [];
  const rowChecks: Audit['rowChecks'] = [];
  const controlChecks: Audit['controlChecks'] = [];
  function check(label: string, descriptions: string[], work: () => void) {
    try { work(); return { passed: true, checks: descriptions }; }
    catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      failures.push(label + ': ' + detail);
      return { passed: false, checks: [...descriptions, detail] };
    }
  }

  function evaluateCase(
    id: Omit<RowIdentity, 'strategy'>, oracle: Oracle, raw: EngineResponses['cases'][number],
    rows: ResultRow[], checks: Audit['caseChecks'], maxPossible: readonly string[], investmentIndex?: number,
  ): number {
    const evaluated = oracle.evaluate(id.budgetCents);
    const result = check(id.caseId, ['identity and eligibility', 'independent exact optimum and search counts',
      'baseline, singleton, omission and directed path witnesses'], () => {
      equal(raw.caseId, id.caseId, 'Engine case identity/order');
      validateEngine(raw.response, oracle, id.budgetCents, evaluated);
      if (id.budgetCents === oracle.eligibleCostCents) {
        for (const strategy of STRATEGIES) equal(evaluated.policies[strategy].totalDestinationIds, maxPossible, strategy + ' full funding');
      }
      if (investmentIndex !== undefined) checkIllustration(investmentIndex, oracle, evaluated);
    });
    const strategyChecks = STRATEGIES.map((strategy, index) => {
      const rowResult = check(id.caseId + '/' + strategy, ['identity', 'selection and cost', 'destination metrics', 'route witness'], () => {
        validateRow(rows[index], { ...id, strategy }, oracle, evaluated.policies[strategy], raw.response);
      });
      if (investmentIndex === undefined) rowChecks.push({ caseId: id.caseId, strategy, ...rowResult });
      return rowResult;
    });
    checks.push({
      caseId: id.caseId,
      passed: result.passed && strategyChecks.every(row => row.passed),
      checks: investmentIndex === undefined ? result.checks : [
        ...result.checks, 'authored investment oracle',
        ...STRATEGIES.map((strategy, index) => strategy + ': ' + strategyChecks[index].checks.join(', ')),
      ],
    });
    return evaluated.policies.exact.newDestinationIds.length;
  }

  for (const [networkIndex, network] of suite.networks.entries()) {
    const oracle = prepareOracle(network.plan);
    const max = oracle.project(oracle.eligibleRepairs.map(r => r.repairId)).totalDestinationIds;
    let previousGain = -1;
    for (const [budgetIndex, budget] of network.budgets.entries()) {
      const index = networkIndex * BUDGET_PERCENTAGES.length + budgetIndex;
      const rowIndex = index * STRATEGIES.length;
      const id = { caseId: caseId(network.id, budget.percent), family: network.family, seed: network.seed,
        budgetPercent: budget.percent, budgetCents: budget.cents };
      const gain = evaluateCase(id, oracle, engine.cases[index], results.rows.slice(rowIndex, rowIndex + STRATEGIES.length),
        caseChecks, max);
      if (gain < previousGain) {
        failures.push(id.caseId + ': exact reachability fell as budget increased');
        caseChecks[index].passed = false;
      } else caseChecks[index].checks.push('exact gain is monotone in budget');
      previousGain = gain;
    }
  }
  const investment = prepareOracle(engine.controlInput);
  const max = investment.project(investment.eligibleRepairs.map(r => r.repairId)).totalDestinationIds;
  for (const [index, budget] of INVESTMENT_BUDGETS.entries()) {
    const offset = index * STRATEGIES.length;
    evaluateCase({ caseId: controlCaseId(budget), family: 'investment-control', seed: null, budgetPercent: null,
      budgetCents: budget }, investment, engine.controls[index], results.controls.slice(offset, offset + STRATEGIES.length),
    controlChecks, max, index);
  }
  const actualCounts = {
    networks: suite.networks.length, cases: caseChecks.length, rows: rowChecks.length,
    pairs: rowChecks.filter(row => row.strategy !== 'exact').length,
    controls: controlChecks.length, controlRows: results.controls.length,
  };
  equal(actualCounts, EXPECTED_COUNTS, 'Audited counts');
  return AuditSchema.parse({
    schemaVersion: METRICS_VERSION, verifierVersion: VERIFIER, status: failures.length ? 'failed' : 'passed',
    sourceCommit: manifest.sourceCommit, suiteSha256: manifest.suiteSha256,
    expectedCounts: EXPECTED_COUNTS, actualCounts, checkedArtifactHashes, caseChecks, rowChecks, controlChecks, failures,
    independentRerun: { completed: false, sourceCommit: manifest.sourceCommit, suiteSha256: manifest.suiteSha256,
      deterministicHashes: {}, verifier: VERIFIER, receipt: 'Independent reproduction has not been run.' },
  });
}

function reproduce(original: Run, destination: string): Audit['independentRerun'] {
  requireCheck(!existsSync(destination), 'Independent run output must be a new directory');
  const current = readGit(['rev-parse', 'HEAD']).toString().trim();
  requireCheck(current === original.manifest.sourceCommit, 'Checkout HEAD differs from benchmark source');
  requireCheck(readGit(['status', '--porcelain', '--untracked-files=no']).length === 0,
    'Independent runner requires a clean tracked checkout');
  execFileSync(process.execPath, ['--import', 'tsx', 'scripts/curb/metrics/benchmark.ts',
    '--suite', SUITE_FILE, '--out', destination], { cwd: ROOT, stdio: 'inherit' });

  const rerun = readRun(destination);
  equal(rerun.manifest.sourceCommit, original.manifest.sourceCommit, 'Independent source commit');
  equal(rerun.manifest.frozenInputCommit, original.manifest.frozenInputCommit, 'Independent frozen commit');
  equal(rerun.manifest.suiteSha256, original.manifest.suiteSha256, 'Independent suite hash');
  equal(rerun.manifest.sourceHashes, original.manifest.sourceHashes, 'Independent source file hashes');
  equal(rerun.checkedArtifactHashes, original.checkedArtifactHashes, 'Independently reproduced artifact hashes');
  requireCheck(auditResults(rerun).status === 'passed', 'Independent rerun failed the separate oracle');
  return { completed: true, sourceCommit: current, suiteSha256: rerun.manifest.suiteSha256,
    deterministicHashes: rerun.checkedArtifactHashes, verifier: VERIFIER, receipt: 'verification.md' };
}

function receipt(audit: Audit): string {
  const hashes = CORE_ARTIFACTS.map(name => '- ' + name + ' `' + audit.independentRerun.deterministicHashes[name] + '`').join('\n');
  return `# Independent benchmark verification

Source commit \`${audit.sourceCommit}\`. Frozen suite SHA-256 \`${audit.suiteSha256}\`.

The independent verifier launched a fresh benchmark from that commit and audited both packages against a separate directed BFS and exhaustive subset oracle. The actual run exited 0. All 120 cases, 480 strategy rows and 32 rows across eight separate investment controls passed. The four deterministic files matched byte for byte.

Command: \`node --import tsx scripts/curb/metrics/benchmark.ts --suite benchmarks/curb-metrics/suite-v1.json --out <independent-run-directory>\`.

${hashes}

This verifies authored synthetic reachability, selection and route witnesses. Human task time and field outcomes were outside this run.
`;
}

function main() {
  const args = cliArgs();
  if (!args['--run'] || Object.keys(args).some(key => key !== '--run' && key !== '--reproduce')) {
    throw new Error('Usage: audit.ts --run <directory> [--reproduce <fresh-directory>]');
  }
  const directory = resolve(args['--run']);
  const run = readRun(directory);
  const audit = auditResults(run);
  if (audit.status === 'passed' && args['--reproduce']) {
    audit.independentRerun = reproduce(run, resolve(args['--reproduce']));
  }
  const auditText = stableStringify(AuditSchema.parse(audit));
  const manifest = structuredClone(run.manifest);
  manifest.artifactHashes['audit.json'] = sha256(auditText);
  if (audit.independentRerun.completed) {
    const text = receipt(audit);
    writeFileSync(join(directory, 'verification.md'), text, { encoding: 'utf8', flag: 'wx' });
    manifest.artifactHashes['verification.md'] = sha256(text);
  }
  const manifestNext = join(directory, 'manifest-audited.tmp');
  writeFileSync(manifestNext, stableStringify(ManifestSchema.parse(manifest)), { encoding: 'utf8', flag: 'wx' });
  writeFileSync(join(directory, 'audit.json'), auditText, { encoding: 'utf8', flag: 'wx' });
  renameSync(manifestNext, join(directory, 'manifest.json'));
  if (audit.status === 'failed') throw new Error('Audit failed: ' + audit.failures[0]);
  process.stdout.write(audit.independentRerun.completed
    ? 'Audit passed and an independent benchmark reproduced the four deterministic artifacts.\n'
    : 'Audit passed. Independent reproduction is pending; the report gate remains closed.\n');
}

if (isMain(import.meta.url)) {
  try { main(); }
  catch (error) {
    process.stderr.write((error instanceof Error ? error.message : String(error)) + '\n');
    process.exitCode = 1;
  }
}
