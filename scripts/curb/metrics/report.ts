import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { PlanScenario } from '../../../src/contracts/curb/plans';
import {
  AuditSchema, BUDGET_PERCENTAGES, EngineResponsesSchema, EXPECTED_COUNTS, FAMILIES,
  INVESTMENT_BUDGETS, LIMITATIONS, ManifestSchema, METRICS_VERSION, ResultsSchema,
  STRATEGIES, caseId, cliArgs, codeUnitCompare, controlCaseId, eligibleCost, isMain,
  sameIds, sha256, stableStringify, validateSuite,
  type Audit, type EngineResponses, type Family, type Manifest, type ResultRow, type Results,
  type Strategy, type Suite,
} from './spec';

export const REQUIRED_AUDITED_ARTIFACTS = ['inputs.json', 'engine-responses.json', 'results.json', 'results.csv'] as const;
const comparators = STRATEGIES.filter(s => s !== 'exact');
const strategyNames: Record<Strategy, string> = { exact: 'Curb exact', conditionFirst: 'Condition-first', cheapestFirst: 'Cheapest-first', greedy: 'Greedy marginal access per dollar' };
function requireTrue(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
const rowKey = (row: Pick<ResultRow, 'caseId' | 'strategy'>) => `${row.caseId}/${row.strategy}`;
function requireKeys(actual: readonly string[], expected: readonly string[], label: string): void {
  requireTrue(actual.length === expected.length && new Set(actual).size === actual.length && sameIds([...actual].sort(codeUnitCompare), [...expected].sort(codeUnitCompare)), `${label}: missing, duplicate, or unexpected IDs`);
}

/** Strict gate, deliberately exported for malformed/tampered audit regression tests.
 * Receipt contents attest to independent work; code cannot establish human identity. */
export function validateAudit(auditInput: unknown, manifestInput: unknown, suite: Suite, results: Results, bytes: Readonly<Record<string, string | Uint8Array>>): Audit {
  const audit = AuditSchema.parse(auditInput);
  const manifest = ManifestSchema.parse(manifestInput);
  requireTrue(manifest.execution.publishable, 'Report requires a clean publishable source run');
  requireTrue(audit.status === 'passed' && audit.failures.length === 0, 'Complete successful independent audit required');
  requireTrue(stableStringify(audit.expectedCounts) === stableStringify(EXPECTED_COUNTS) && stableStringify(audit.actualCounts) === stableStringify(EXPECTED_COUNTS) && stableStringify(manifest.counts) === stableStringify(EXPECTED_COUNTS), 'Audit/manifest count mismatch');
  requireTrue(audit.sourceCommit === manifest.sourceCommit && audit.suiteSha256 === manifest.suiteSha256 && results.suiteSha256 === manifest.suiteSha256, 'Audit/source/input identity mismatch');
  const rerun = audit.independentRerun;
  requireTrue(rerun.completed && rerun.sourceCommit === manifest.sourceCommit && rerun.suiteSha256 === manifest.suiteSha256, 'Independent separate-checkout rerun required');
  for (const filename of REQUIRED_AUDITED_ARTIFACTS) {
    requireTrue(bytes[filename] !== undefined, `Missing artifact: ${filename}`);
    const actual = sha256(bytes[filename]);
    requireTrue(manifest.artifactHashes[filename] === actual && audit.checkedArtifactHashes[filename] === actual && rerun.deterministicHashes[filename] === actual, `Artifact checksum/rerun mismatch: ${filename}`);
  }
  requireTrue(bytes['verification.md'] !== undefined && manifest.artifactHashes['verification.md'] === sha256(bytes['verification.md']), 'Independent verification.md receipt file and manifest hash required');
  requireTrue(sha256(bytes['inputs.json']) === manifest.suiteSha256, 'Frozen input byte hash mismatch');
  const expectedCases = suite.networks.flatMap(n => n.budgets.map(b => caseId(n.id, b.percent)));
  const expectedRows = expectedCases.flatMap(id => STRATEGIES.map(strategy => `${id}/${strategy}`));
  const expectedControls = INVESTMENT_BUDGETS.map(controlCaseId);
  requireKeys(results.rows.map(rowKey), expectedRows, 'Results');
  requireKeys(results.controls.map(rowKey), expectedControls.flatMap(id => STRATEGIES.map(strategy => `${id}/${strategy}`)), 'Control results');
  requireKeys(audit.caseChecks.map(c => c.caseId), expectedCases, 'Audit case checks');
  requireKeys(audit.rowChecks.map(rowKey), expectedRows, 'Audit row checks');
  requireKeys(audit.controlChecks.map(c => c.caseId), expectedControls, 'Audit control checks');
  requireTrue([...audit.caseChecks, ...audit.rowChecks, ...audit.controlChecks].every(c => c.passed), 'Audit contains a failed check');
  return audit;
}

function validateRowAgainstInput(row: ResultRow, plan: PlanScenario, baselineIds: string[]): void {
  const eligible = plan.candidates.filter(c => c.cost.status !== 'unknown');
  const cost = new Map(eligible.map(c => [c.repairId, c.cost.cents!]));
  const excluded = plan.candidates.filter(c => c.cost.status === 'unknown').map(c => c.repairId).sort(codeUnitCompare);
  requireTrue(row.scenarioId === plan.scenario.id && row.eligibleCostCents === eligibleCost(plan) && row.eligibleCandidateCount === eligible.length, `Case metadata mismatch: ${rowKey(row)}`);
  requireTrue(sameIds(row.excludedUnknownCostRepairIds, excluded) && sameIds(row.baselineDestinationIds, baselineIds), `Eligibility/baseline mismatch: ${rowKey(row)}`);
  requireTrue(sameIds(row.outcomes.map(o => o.destinationId), plan.destinationIds), `Destination identity mismatch: ${rowKey(row)}`);
  requireTrue(row.selectedRepairIds.every(id => cost.has(id)) && row.selectedRepairIds.reduce((sum, id) => sum + cost.get(id)!, 0) === row.spendCents, `Selection/spend mismatch: ${rowKey(row)}`);
}

export function validateCompleteResults(suite: Suite, resultsInput: unknown, engineInput: unknown): { results: Results; engine: EngineResponses } {
  const results = ResultsSchema.parse(resultsInput);
  const engine = EngineResponsesSchema.parse(engineInput);
  const expectedCases = suite.networks.flatMap(n => n.budgets.map(b => caseId(n.id, b.percent)));
  const expectedControls = INVESTMENT_BUDGETS.map(controlCaseId);
  requireKeys(results.rows.map(rowKey), expectedCases.flatMap(id => STRATEGIES.map(strategy => `${id}/${strategy}`)), 'Results');
  requireKeys(results.controls.map(rowKey), expectedControls.flatMap(id => STRATEGIES.map(strategy => `${id}/${strategy}`)), 'Controls');
  requireKeys(engine.cases.map(c => c.caseId), expectedCases, 'Engine cases');
  requireKeys(engine.controls.map(c => c.caseId), expectedControls, 'Engine controls');
  const engineByCase = new Map([...engine.cases, ...engine.controls].map(c => [c.caseId, c.response]));
  for (const row of [...results.rows, ...results.controls]) {
    const response = engineByCase.get(row.caseId)!;
    const baselineIds = response.baseline.outcomes.filter(o => o.route.status === 'reachable').map(o => o.destinationId);
    const network = suite.networks.find(n => n.id === row.scenarioId);
    if (row.family === 'investment-control') {
      requireTrue(row.caseId === controlCaseId(row.budgetCents) && row.seed === null && row.budgetPercent === null, 'Control tuple mismatch');
      validateRowAgainstInput(row, engine.controlInput, baselineIds);
    } else {
      requireTrue(network, `Unknown scenario: ${row.scenarioId}`);
      const budget = network.budgets.find(b => b.percent === row.budgetPercent);
      requireTrue(budget && row.caseId === caseId(network.id, budget.percent) && row.budgetCents === budget.cents && row.seed === network.seed && row.family === network.family, 'Network/budget tuple mismatch');
      validateRowAgainstInput(row, network.plan, baselineIds);
    }
    requireTrue(response.scenarioId === row.scenarioId && response.budgetCents === row.budgetCents, 'Production response identity mismatch');
    if (row.strategy === 'exact' || row.strategy === 'conditionFirst') {
      const selection = response[row.strategy];
      requireTrue(sameIds(selection.selectedRepairIds, row.selectedRepairIds) && selection.spendCents === row.spendCents && selection.restoredCount === row.gain && stableStringify(selection.outcomes) === stableStringify(row.outcomes), 'Result differs from unmodified production response');
    }
  }
  for (const id of [...expectedCases, ...expectedControls]) {
    const group = [...results.rows, ...results.controls].filter(r => r.caseId === id);
    const exact = group.find(r => r.strategy === 'exact')!;
    requireTrue(group.every(r => r.gain <= exact.gain), `Exact loss blocks report: ${id}`);
    if (exact.budgetPercent === 100) requireTrue(group.every(r => r.gain === exact.gain), `Full-budget policy reachability mismatch: ${id}`);
  }
  // These are released demonstration assertions, separate from every suite aggregate.
  const investmentAt = (budget: number, strategy: Strategy) => results.controls.find(r => r.caseId === controlCaseId(budget) && r.strategy === strategy)!;
  const demoExact = investmentAt(1000000, 'exact');
  const demoCheapest = investmentAt(1000000, 'cheapestFirst');
  const demoCondition = investmentAt(1000000, 'conditionFirst');
  requireTrue(sameIds(demoExact.selectedRepairIds, ['repair-a', 'repair-b']) && demoExact.gain === 2 && demoExact.spendCents === 1000000 && demoExact.totalCount === 3 && sameIds(demoExact.baselineDestinationIds, ['cafe']), 'Released Investment exact control mismatch');
  requireTrue(sameIds(demoCheapest.selectedRepairIds, demoExact.selectedRepairIds) && demoCheapest.gain === demoExact.gain && demoCheapest.spendCents === demoExact.spendCents, 'Released Investment cheapest-first tie mismatch');
  requireTrue(sameIds(demoCondition.selectedRepairIds, ['repair-c']) && demoCondition.gain === 1 && demoCondition.spendCents === 1000000, 'Released Investment condition-first control mismatch');
  requireTrue(investmentAt(500000, 'exact').selectedRepairIds.length === 0 && investmentAt(500000, 'exact').gain === 0, 'Released Investment partial-budget empty optimum mismatch');
  const demoResponse = engineByCase.get(controlCaseId(1000000))!;
  requireTrue(demoResponse.exact.withoutRepair.every(p => p.restoredDestinationIds.length === 0) && ['repair-a', 'repair-b'].every(id => demoResponse.singleRepairs.some(p => p.repairId === id && p.restoredDestinationIds.length === 0)), 'Released Investment serial-barrier control mismatch');
  requireTrue(STRATEGIES.every(s => investmentAt(2000000, s).gain === 3), 'Released Investment full-budget tie mismatch');
  return { results, engine };
}

/** Check the CSV itself, not just its checksum. Its canonical encoding contains the
 * 480 aggregate rows only; controls remain in results.json and separate HTML tables. */
export function validateResultsCsv(results: Results, bytes: string | Uint8Array): void {
  const fields = ['caseId', 'scenarioId', 'family', 'seed', 'budgetPercent', 'budgetCents', 'strategy',
    'eligibleCostCents', 'eligibleCandidateCount', 'excludedUnknownCostRepairIds', 'selectedRepairIds',
    'spendCents', 'baselineDestinationIds', 'newDestinationIds', 'totalDestinationIds',
    'baselineCount', 'gain', 'totalCount', 'destinationCount', 'gainFraction',
    'costPerNewDestinationCents', 'costPerNewDestinationReason'] as const;
  const csvCell = (value: unknown) => '"' + (value === null ? '' : Array.isArray(value) ? JSON.stringify(value) : String(value)).replaceAll('"', '""') + '"';
  const expected = fields.join(',') + '\n' + results.rows.map(row => fields.map(key => csvCell(row[key])).join(',')).join('\n') + '\n';
  const actual = typeof bytes === 'string' ? bytes : Buffer.from(bytes).toString('utf8');
  requireTrue(actual === expected, 'CSV does not exactly encode all 480 JSON strategy rows');
}

type NumericMetric = { value: number; numerator: number; denominator: number; definition: string; filter: string; pointers: string[] };
export function summarize(suite: Suite, results: Results) {
  const indexed = new Map(results.rows.map((row, i) => [rowKey(row), { row, index: i }]));
  const paired = (strategy: Exclude<Strategy, 'exact'>, percentages: readonly number[], family?: Family) => {
    const networks = suite.networks.filter(n => family === undefined || n.family === family);
    let wins = 0, ties = 0, losses = 0;
    const scenarioMeans = networks.map(n => {
      const differences = percentages.map(percent => {
        const exact = indexed.get(`${caseId(n.id, percent)}/exact`)!;
        const comparator = indexed.get(`${caseId(n.id, percent)}/${strategy}`)!;
        const difference = exact.row.gain - comparator.row.gain;
        if (difference > 0) wins++; else if (difference < 0) losses++; else ties++;
        return { percent, difference, pointers: [`results.json#/rows/${exact.index}/gain`, `results.json#/rows/${comparator.index}/gain`] };
      });
      const numerator = differences.reduce((sum, d) => sum + d.difference, 0);
      return { scenarioId: n.id, numerator, denominator: differences.length, value: numerator / differences.length, differences };
    });
    requireTrue(losses === 0, 'Exact loss blocks summary');
    const numerator = scenarioMeans.reduce((sum, s) => sum + s.value, 0);
    const filter = `family=${family ?? 'all'}; budgetPercent in [${percentages.join(',')}]; comparator=${strategy}; investment controls excluded`;
    const meanDifference: NumericMetric = { value: numerator / networks.length, numerator, denominator: networks.length, definition: 'Mean across networks of each network mean of G(exact)-G(comparator); absolute destination-count difference, not relative percent', filter, pointers: scenarioMeans.flatMap(s => s.differences.flatMap(d => d.pointers)) };
    return { meanDifference, wins, ties, losses, pairCount: wins + ties + losses, scenarioMeans };
  };
  const comparisons = Object.fromEntries(comparators.map(strategy => [strategy, {
    allBudgets: paired(strategy, BUDGET_PERCENTAGES),
    constrainedBudgets: paired(strategy, [25, 50, 75]),
    perFamily: Object.fromEntries(FAMILIES.map(family => [family, paired(strategy, BUDGET_PERCENTAGES, family)])),
  }]));
  const budgetCurve = BUDGET_PERCENTAGES.map(percent => ({ percent, fraction: percent / 100, strategies: Object.fromEntries(STRATEGIES.map(strategy => {
    const rows = results.rows.map((row, index) => ({ row, index })).filter(({ row }) => row.budgetPercent === percent && row.strategy === strategy);
    const numerator = rows.reduce((sum, { row }) => sum + row.gain, 0);
    return [strategy, { value: numerator / rows.length, numerator, denominator: rows.length, definition: 'Mean newly reachable destinations', filter: `budgetPercent=${percent}; strategy=${strategy}; investment controls excluded`, pointers: rows.map(({ index }) => `results.json#/rows/${index}/gain`) } satisfies NumericMetric];
  })) }));
  return {
    schemaVersion: METRICS_VERSION,
    suiteSha256: results.suiteSha256,
    counts: EXPECTED_COUNTS,
    metric: 'G(S) = count of known reachable destination IDs after S minus baseline reachable destination IDs; each destination weight one',
    weighting: 'Average four paired budget differences within each network, then average the 30 network means. Secondary view uses 25/50/75% budgets. All 100% budget ties remain in the primary view.',
    comparisons, budgetCurve,
    caseTable: suite.networks.flatMap(n => n.budgets.map(b => ({ caseId: caseId(n.id, b.percent), family: n.family, seed: n.seed, budgetPercent: b.percent, budgetCents: b.cents, strategies: Object.fromEntries(STRATEGIES.map(strategy => [strategy, indexed.get(`${caseId(n.id, b.percent)}/${strategy}`)!.row])) }))),
    investmentControls: results.controls,
    limitations: LIMITATIONS,
  };
}
export type Summary = ReturnType<typeof summarize>;

const escapeHtml = (value: unknown): string => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
const displayNumber = (value: number): string => value.toFixed(3).replace(/\.?0+$/, '');
function curveSvg(summary: Summary): string {
  const colors = ['#174a67', '#a13230', '#526329', '#774a96'];
  const patterns = ['', '9 4', '3 4', '10 3 2 3'];
  const x = (fraction: number) => 70 + (fraction - 0.25) / 0.75 * 600;
  const y = (gain: number) => 300 - gain / 8 * 240;
  const grids = Array.from({ length: 9 }, (_, gain) => `<line x1="70" x2="670" y1="${y(gain)}" y2="${y(gain)}" stroke="#ddd"/><text x="57" y="${y(gain) + 4}" text-anchor="end">${gain}</text>`).join('');
  const curves = STRATEGIES.map((strategy, i) => {
    const points = summary.budgetCurve.map(point => `${x(point.fraction)},${y(point.strategies[strategy].value)}`).join(' ');
    return `<polyline points="${points}" fill="none" stroke="${colors[i]}" stroke-width="3" stroke-dasharray="${patterns[i]}"/>${summary.budgetCurve.map(p => `<circle cx="${x(p.fraction)}" cy="${y(p.strategies[strategy].value)}" r="4" fill="${colors[i]}"><title>${escapeHtml(strategyNames[strategy])}: ${p.percent}% budget, ${displayNumber(p.strategies[strategy].value)} mean new destinations</title></circle>`).join('')}`;
  }).join('');
  return `<svg viewBox="0 0 740 400" role="img" aria-labelledby="curve-title curve-desc"><title id="curve-title">Budget fraction versus mean newly reachable destinations</title><desc id="curve-desc">All four policies on all 30 synthetic networks. Exact data appear in the following accessible table. Costs are assumed, and destinations are not people.</desc>${grids}${curves}${BUDGET_PERCENTAGES.map(p => `<text x="${x(p / 100)}" y="323" text-anchor="middle">${p}%</text>`).join('')}<text x="370" y="346" text-anchor="middle">Budget / total eligible assumed cost</text><text x="14" y="190" transform="rotate(-90 14 190)" text-anchor="middle">Mean newly reachable destinations</text>${STRATEGIES.map((s, i) => `<line x1="${20 + (i % 2) * 360}" x2="${50 + (i % 2) * 360}" y1="${369 + Math.floor(i / 2) * 21}" y2="${369 + Math.floor(i / 2) * 21}" stroke="${colors[i]}" stroke-width="3" stroke-dasharray="${patterns[i]}"/><text x="${57 + (i % 2) * 360}" y="${374 + Math.floor(i / 2) * 21}">${escapeHtml(strategyNames[s])}</text>`).join('')}</svg>`;
}

export function renderHtml(summary: Summary, manifest: Manifest, audit: Audit): string {
  const comparisonRows = comparators.map(strategy => {
    const comparison = summary.comparisons[strategy];
    return `<tr><th scope="row">${escapeHtml(strategyNames[strategy])}</th><td>${displayNumber(comparison.allBudgets.meanDifference.value)}</td><td>${comparison.allBudgets.wins}</td><td>${comparison.allBudgets.ties}</td><td>${comparison.allBudgets.losses}</td><td>${displayNumber(comparison.constrainedBudgets.meanDifference.value)}</td><td>${comparison.constrainedBudgets.wins}/${comparison.constrainedBudgets.ties}/${comparison.constrainedBudgets.losses}</td></tr>`;
  }).join('');
  const familyRows = FAMILIES.map(family => `<tr><th scope="row">${family}</th>${comparators.map(s => `<td>${displayNumber(summary.comparisons[s].perFamily[family].meanDifference.value)}</td>`).join('')}</tr>`).join('');
  const curveRows = summary.budgetCurve.map(p => `<tr><th scope="row">${p.percent}%</th>${STRATEGIES.map(s => `<td>${displayNumber(p.strategies[s].value)} (${p.strategies[s].numerator}/${p.strategies[s].denominator})</td>`).join('')}</tr>`).join('');
  const rowsHtml = (rows: ResultRow[]) => rows.map(r => `<tr><th scope="row">${escapeHtml(r.caseId)}</th><td>${escapeHtml(strategyNames[r.strategy])}</td><td>${r.budgetCents}</td><td>${r.spendCents}</td><td>${escapeHtml(r.selectedRepairIds.join(', ') || 'None')}</td><td>${r.baselineCount}</td><td>${r.gain}</td><td>${r.totalCount}/${r.destinationCount}</td><td>${r.costPerNewDestinationCents === null ? 'Undefined: zero gain' : displayNumber(r.costPerNewDestinationCents)}</td></tr>`).join('');
  const tableHead = '<tr><th scope="col">Case</th><th scope="col">Policy</th><th scope="col">Budget cents</th><th scope="col">Spent cents</th><th scope="col">Selected repairs</th><th scope="col">Baseline</th><th scope="col">New</th><th scope="col">Total</th><th scope="col">Cents / new destination</th></tr>';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Curb synthetic benchmark evidence</title><style>body{font:16px/1.5 system-ui,sans-serif;max-width:1120px;margin:32px auto;padding:0 24px;color:#172b34}h1,h2{line-height:1.2}h1{font-size:32px}h2{margin-top:32px;font-size:23px}table{border-collapse:collapse;width:100%;font-size:13px;margin:16px 0}caption{text-align:left;font-weight:650;padding:8px 0}th,td{border:1px solid #b9c7ce;padding:7px;text-align:left;vertical-align:top}thead{background:#eef3f5}tbody tr:nth-child(even){background:#f7f9fa}code{overflow-wrap:anywhere;font-size:12px}.note{border-left:4px solid #174a67;background:#eef3f5;padding:12px 16px}svg{display:block;width:100%;max-width:850px;margin:auto}svg text{font:12px system-ui,sans-serif}a{color:#14577b}.table-wrap{overflow-x:auto}footer{margin-top:28px;font-size:13px}@media print{@page{size:landscape;margin:12mm}body{max-width:none;margin:0;padding:0;font-size:10pt}h1{font-size:22pt}h2{font-size:16pt}table{font-size:8pt}th,td{padding:4px}thead{display:table-header-group}tr,svg,.note{break-inside:avoid}.table-wrap{overflow:visible}a{color:inherit;text-decoration:none}h2{break-after:avoid}}</style></head><body>
<h1>Curb synthetic benchmark evidence</h1><p class="note">Complete independent audit and separate-checkout rerun passed for 30 authored synthetic networks, 120 budget cases and all 480 strategy rows. Investment controls are separate. Numerical claims below are proposed for coordinator review; this report does not grant presenter approval.</p>
<p><strong>Objective:</strong> new known reachable destinations at the same assumed repair budget. Each destination has weight one. Actual assumed spend is reported separately. Zero-gain cost per destination is undefined. No measured human time saving is asserted.</p>
<p>Source <code>${manifest.sourceCommit}</code><br>Frozen input <code>${manifest.frozenInputCommit}</code><br>Suite SHA-256 <code>${manifest.suiteSha256}</code><br>Verifier <code>${escapeHtml(audit.verifierVersion)}</code>; independent receipt <code>${escapeHtml(audit.independentRerun.receipt)}</code></p>
<h2>All budgets, including full-budget ties</h2><p>${escapeHtml(summary.weighting)} Positive differences favor exact; values are destination counts, not relative percentages. The primary view has 120 paired cases per comparator and 30 equally weighted networks. The predefined secondary view has 90 paired cases.</p>
<div class="table-wrap"><table><caption>Exact minus each comparator: scenario-weighted mean destination gain differences</caption><thead><tr><th scope="col">Comparator</th><th scope="col">All-budget mean difference</th><th scope="col">Wins</th><th scope="col">Ties</th><th scope="col">Losses</th><th scope="col">25/50/75% mean difference</th><th scope="col">Secondary W/T/L</th></tr></thead><tbody>${comparisonRows}</tbody></table></div>
<table><caption>Per-family means across all four budgets and five networks per family</caption><thead><tr><th scope="col">Family</th>${comparators.map(s => `<th scope="col">Exact minus ${escapeHtml(strategyNames[s])}</th>`).join('')}</tr></thead><tbody>${familyRows}</tbody></table>
<h2>Budget and modeled access</h2>${curveSvg(summary)}<table><caption>Mean new destinations, with summed gains / 30 networks</caption><thead><tr><th scope="col">Budget fraction</th>${STRATEGIES.map(s => `<th scope="col">${escapeHtml(strategyNames[s])}</th>`).join('')}</tr></thead><tbody>${curveRows}</tbody></table>
<h2>Scope and limitations</h2><ul>${LIMITATIONS.map(l => `<li>${escapeHtml(l)}</li>`).join('')}</ul><p><strong>States:</strong> demo_verified and benchmark_verified are supported by the supplied complete audit; study_ready and study_observed are outside this report; claims_verified remains pending coordinator acceptance.</p>
<h2>Complete benchmark table</h2><p>All 480 rows are retained. Costs are synthetic cents. Complete baseline/new/total destination IDs and path witnesses are in <a href="results.json">results.json</a>; unmodified production responses are in <a href="engine-responses.json">engine-responses.json</a>.</p><div class="table-wrap"><table><caption>30 networks × four budgets × four strategies</caption><thead>${tableHead}</thead><tbody>${rowsHtml(summary.caseTable.flatMap(c => STRATEGIES.map(s => c.strategies[s])))}</tbody></table></div>
<h2>Authored Investment controls</h2><p>The released illustration is excluded from every benchmark mean. At its $10,000 assumed budget, cheapest-first ties exact; it is not evidence of superiority over every comparator.</p><div class="table-wrap"><table><caption>Eight Investment control budgets × four strategies</caption><thead>${tableHead}</thead><tbody>${rowsHtml(summary.investmentControls)}</tbody></table></div>
<footer><a href="summary.json">Machine-readable summary and field pointers</a> · <a href="claims.json">Proposed claim ledger</a> · <a href="audit.json">Full audit</a> · <a href="manifest.json">Hashes and provenance</a>. This file works offline and is printable without external resources.</footer></body></html>\n`;
}

export function buildClaims(summary: Summary, manifest: Manifest) {
  return { schemaVersion: METRICS_VERSION, status: 'proposed_pending_coordinator_acceptance', claims_verified: false,
    sourceCommit: manifest.sourceCommit, frozenInputCommit: manifest.frozenInputCommit, suiteSha256: manifest.suiteSha256,
    claims: comparators.map(strategy => ({
      id: `synthetic-mean-${strategy}`, approved: false, evidenceClass: 'independently_audited_synthetic_benchmark',
      wording: `Across 30 authored synthetic networks and four budgets each, Curb exact yielded a scenario-weighted mean of ${displayNumber(summary.comparisons[strategy].allBudgets.meanDifference.value)} additional newly reachable destinations versus ${strategyNames[strategy]}, with ${summary.comparisons[strategy].allBudgets.wins} wins, ${summary.comparisons[strategy].allBudgets.ties} ties and ${summary.comparisons[strategy].allBudgets.losses} losses across 120 paired budget cases.`,
      pointers: [`summary.json#/comparisons/${strategy}/allBudgets/meanDifference`, `summary.json#/comparisons/${strategy}/allBudgets/wins`, `summary.json#/comparisons/${strategy}/allBudgets/ties`, `summary.json#/comparisons/${strategy}/allBudgets/losses`],
      numerator: summary.comparisons[strategy].allBudgets.meanDifference.numerator,
      denominator: summary.comparisons[strategy].allBudgets.meanDifference.denominator,
      pairedCaseDenominator: summary.comparisons[strategy].allBudgets.pairCount,
      pairedCaseDenominatorPointer: `summary.json#/comparisons/${strategy}/allBudgets/pairCount`,
      filter: summary.comparisons[strategy].allBudgets.meanDifference.filter, limitations: LIMITATIONS,
    })), limitations: LIMITATIONS };
}

export function generateReport(runDirectory: string): { summary: Summary; outputHashes: Record<string, string> } {
  const dir = resolve(runDirectory);
  const outputNames = ['summary.json', 'report.html', 'claims.json'];
  requireTrue(outputNames.every(name => !existsSync(join(dir, name))), 'Refusing to overwrite an existing report output');
  const read = (name: string) => readFileSync(join(dir, name));
  const manifest = ManifestSchema.parse(JSON.parse(read('manifest.json').toString('utf8')));
  const bytes = Object.fromEntries([...REQUIRED_AUDITED_ARTIFACTS, 'verification.md'].map(name => [name, read(name)]));
  const suite = validateSuite(JSON.parse(bytes['inputs.json'].toString('utf8')));
  const { results } = validateCompleteResults(suite, JSON.parse(bytes['results.json'].toString('utf8')), JSON.parse(bytes['engine-responses.json'].toString('utf8')));
  validateResultsCsv(results, bytes['results.csv']);
  const auditBytes = read('audit.json');
  const audit = validateAudit(JSON.parse(auditBytes.toString('utf8')), manifest, suite, results, bytes);
  // Validate every manifest-listed artifact, including any independent receipt/log.
  for (const [name, expected] of Object.entries(manifest.artifactHashes)) {
    requireTrue(!name.includes('..') && !name.includes('/') && !name.includes('\\') && name !== 'manifest.json', 'Unsafe or circular artifact name');
    requireTrue(sha256(read(name)) === expected, `Manifest artifact checksum mismatch: ${name}`);
  }
  const summary = summarize(suite, results);
  const contents: Record<string, string> = {
    'summary.json': stableStringify(summary),
    'report.html': renderHtml(summary, manifest, audit),
    'claims.json': stableStringify(buildClaims(summary, manifest)),
  };
  const outputHashes: Record<string, string> = { 'audit.json': sha256(auditBytes) };
  for (const [name, content] of Object.entries(contents)) { writeFileSync(join(dir, name), content, { flag: 'wx' }); outputHashes[name] = sha256(content); }
  writeFileSync(join(dir, 'manifest.json'), stableStringify({ ...manifest, artifactHashes: { ...manifest.artifactHashes, ...outputHashes } }));
  return { summary, outputHashes };
}

if (isMain(import.meta.url)) {
  try {
    const args = cliArgs();
    requireTrue(Object.keys(args).length === 1 && args['--run'], 'Usage: report.ts --run <run-directory>');
    const result = generateReport(args['--run']);
    console.log(stableStringify({ status: 'audited_report_created_claims_pending_acceptance', counts: result.summary.counts, outputHashes: result.outputHashes }).trim());
  } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
