import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import type { PlanScenario } from '../../../src/contracts/curb/plans';
import { validatePlanScenario, comparePlans } from '../../../src/domain/curb/plans';
import { cheapestFirst, greedy, evaluateSelection, compareMarginal } from './baselines';
import { generateSuite, writeSuite } from './generate';
import { measureCase, measureSuite, resultsCsv, runBenchmark, sourceProvenance } from './benchmark';
import { METRICS_VERSION, ResultRowSchema, ResultsSchema, EXPECTED_COUNTS, INVESTMENT_BUDGETS, deepFreeze, stableStringify, sha256, validateSuite, requestFor } from './spec';
import { validateAudit, validateCompleteResults, summarize, generateReport, buildClaims } from './report';

type Edge = { from: string; to: string; blockers?: string[]; unknown?: boolean; bidirectional?: boolean };
function tiny(edges: Edge[], candidates: { id: string; cost: number | null; severity?: number }[], destinations = ['goal']): PlanScenario {
  const nodes = [...new Set(['origin', ...destinations, ...edges.flatMap(e => [e.from, e.to])])];
  return validatePlanScenario({
    schemaVersion: 1, contractVersion: 'curb-r2',
    scenario: {
      schemaVersion: 1, id: 'tiny-control', revision: 1, title: 'Tiny synthetic test only', dataKind: 'synthetic',
      nodes: nodes.map((id, i) => ({ id, coordinate: [i / 1000, 0] })),
      edges: edges.map((e, i) => ({ id: `e${i}`, fromNodeId: e.from, toNodeId: e.to, lengthMeters: 1, bidirectional: e.bidirectional ?? false, barrierIds: e.blockers ?? [], geometry: { type: 'LineString', coordinates: [[0, 0], [0.001, 0]] } })),
      destinations: destinations.map(id => ({ id, nodeId: id, label: id })),
      barriers: edges.flatMap((e, i) => (e.blockers ?? []).map(id => ({ id, edgeId: `e${i}`, kind: 'obstruction', reviewStatus: 'accepted', evidenceIds: [], note: 'Synthetic control' }))), evidence: [],
    },
    profile: { id: 'step-free-demo', label: 'Control', description: 'Synthetic control' }, assumptions: ['Synthetic control, not field data.'],
    edgeAssessments: edges.map((e, i) => ({ edgeId: `e${i}`, kind: 'walkway', status: e.unknown ? 'unknown' : e.blockers?.length ? 'blocked' : 'pass', blockingBarrierIds: e.blockers ?? [], reason: 'Synthetic control' })),
    repairs: edges.flatMap(e => (e.blockers ?? []).map(id => ({ id, barrierId: id, label: id, description: 'Clear only this blocker' }))),
    originNodeId: 'origin', destinationIds: destinations,
    candidates: candidates.map(c => ({ repairId: c.id, severity: { score: c.severity ?? 3, rationale: 'Assumed' }, cost: c.cost === null ? { status: 'unknown', cents: null, source: 'Unknown' } : { status: 'assumed', cents: c.cost, source: 'Assumed' } })), defaultBudgetCents: 100,
  });
}
const identity = { caseId: 'control', family: 'investment-control' as const, seed: null, budgetPercent: null };
const investment = () => JSON.parse(readFileSync(new URL('../../../src/data/curb/investment-demo.json', import.meta.url), 'utf8'));

describe('comparator rules on tiny controls (outside aggregate)', () => {
  it('continues through zero gain to complete a serial dependency', () => {
    const p = tiny([{ from: 'origin', to: 'mid', blockers: ['a'] }, { from: 'mid', to: 'goal', blockers: ['b'] }], [{ id: 'a', cost: 2 }, { id: 'b', cost: 3 }]);
    expect(greedy(p, 5)).toMatchObject({ selectedRepairIds: ['a', 'b'], spendCents: 5, reachableCount: 1 });
    expect(greedy(p, 2)).toMatchObject({ selectedRepairIds: ['a'], reachableCount: 0 });
  });
  it('buys positive free repairs first and free zero-gain repairs before paid zero-gain', () => {
    const p = tiny([{ from: 'origin', to: 'goal', blockers: ['free'] }, { from: 'x', to: 'y', blockers: ['zero'] }, { from: 'u', to: 'v', blockers: ['paid'] }], [{ id: 'free', cost: 0 }, { id: 'zero', cost: 0 }, { id: 'paid', cost: 2 }]);
    expect(greedy(p, 2)).toMatchObject({ selectedRepairIds: ['free', 'zero', 'paid'], reachableCount: 1 });
    expect(comparePlans(p, requestFor(p, 0)).exact.selectedRepairIds).toEqual(['free']);
  });
  it('uses BigInt exact ratios and all documented ties', () => {
    const c = (repairId: string, costCents: number, gain: number) => ({ repairId, costCents, gain });
    expect(compareMarginal(c('a', 3, 2), c('b', 6, 4))).toBeGreaterThan(0);
    expect(compareMarginal(c('a', 0, 1), c('b', 1, 100))).toBeLessThan(0);
    expect(compareMarginal(c('a', 0, 0), c('b', 1, 1))).toBeGreaterThan(0);
    expect(compareMarginal(c('a', 0, 0), c('b', 2, 0))).toBeLessThan(0);
    expect(compareMarginal(c('Z', 3, 1), c('a', 3, 1))).toBeLessThan(0);
    expect(compareMarginal(c('a', Number.MAX_SAFE_INTEGER, 2), c('b', Number.MAX_SAFE_INTEGER - 1, 2))).toBeGreaterThan(0);
  });
  it('cheapest sorts cost, descending severity, code-unit ID; scans unaffordable candidates', () => {
    const p = tiny(['a', 'Z', 'low', 'expensive'].map(id => ({ from: 'origin', to: id, blockers: [id] })), [{ id: 'a', cost: 2, severity: 5 }, { id: 'Z', cost: 2, severity: 5 }, { id: 'low', cost: 2, severity: 1 }, { id: 'expensive', cost: 20 }], ['a', 'Z', 'low', 'expensive']);
    expect(cheapestFirst(p, 6).selectedRepairIds).toEqual(['Z', 'a', 'low']);
    expect(cheapestFirst(p, 0).selectedRepairIds).toEqual([]);
  });
  it('handles no candidates, disconnected nodes, directed edges, unknown costs and unknown assessment after clearing', () => {
    const p = tiny([{ from: 'goal', to: 'origin' }, { from: 'origin', to: 'unknown', blockers: ['u'], unknown: true }, { from: 'origin', to: 'uncosted', blockers: ['c'] }], [{ id: 'u', cost: 1 }, { id: 'c', cost: null }], ['goal', 'unknown', 'uncosted', 'disconnected']);
    expect(greedy(p, 100).selectedRepairIds).toEqual(['u']);
    expect(evaluateSelection(p, ['u']).outcomes.map(x => x.route.status)).toEqual(['disconnected', 'unknown', 'blocked', 'disconnected']);
    expect(() => evaluateSelection(p, ['c'])).toThrow();
    expect(() => evaluateSelection(p, ['u', 'u'])).toThrow();
    const empty = tiny([], []);
    for (const policy of [cheapestFirst, greedy]) expect(policy(empty, 10)).toMatchObject({ selectedRepairIds: [], reachableCount: 0 });
  });
  it('requires every blocker and preserves immutable input', () => {
    const p = deepFreeze(tiny([{ from: 'origin', to: 'goal', blockers: ['a', 'b'] }], [{ id: 'a', cost: 2 }, { id: 'b', cost: 3 }]));
    const before = stableStringify(p);
    expect(evaluateSelection(p, ['a']).reachableCount).toBe(0);
    expect(evaluateSelection(p, ['a', 'b']).reachableCount).toBe(1);
    for (const policy of [cheapestFirst, greedy]) policy(p, 5);
    measureCase(p, identity, 5);
    expect(stableStringify(p)).toBe(before);
  });
  it('retains zero-gain null denominators and rejects arithmetic tampering', () => {
    const row = measureCase(tiny([], []), identity, 0).rows[0];
    expect(row).toMatchObject({ gain: 0, costPerNewDestinationCents: null, costPerNewDestinationReason: 'zero_gain' });
    expect(() => ResultRowSchema.parse({ ...row, costPerNewDestinationCents: 0 })).toThrow();
    expect(() => ResultRowSchema.parse({ ...row, gain: 1 })).toThrow();
    expect(() => ResultRowSchema.parse({ ...row, spendCents: 1 })).toThrow();
  });
  it('rejects invalid budgets', () => {
    for (const policy of [cheapestFirst, greedy]) for (const b of [-1, 0.2, Infinity, NaN]) expect(() => policy(tiny([], []), b)).toThrow();
  });
  it('preserves repair reachability and exact gain monotonicity without requiring nested plans', () => {
    const p = tiny([{ from: 'origin', to: 'mid', blockers: ['a'] }, { from: 'mid', to: 'goal', blockers: ['b'] }, { from: 'origin', to: 'other', blockers: ['c'] }], [{ id: 'a', cost: 2 }, { id: 'b', cost: 2 }, { id: 'c', cost: 3 }], ['goal', 'other']);
    for (let mask = 0; mask < 8; mask++) {
      const selected = ['a', 'b', 'c'].filter((_, i) => mask & (1 << i));
      const before = evaluateSelection(p, selected).outcomes.filter(o => o.route.status === 'reachable').map(o => o.destinationId);
      for (const added of ['a', 'b', 'c'].filter(id => !selected.includes(id))) {
        const after = evaluateSelection(p, [...selected, added]).outcomes.filter(o => o.route.status === 'reachable').map(o => o.destinationId);
        expect(before.every(id => after.includes(id))).toBe(true);
      }
    }
    const gains = Array.from({ length: 8 }, (_, budget) => comparePlans(p, requestFor(p, budget)).exact.restoredCount);
    expect(gains.every((gain, i) => i === 0 || gain >= gains[i - 1])).toBe(true);
    const tied = tiny([{ from: 'origin', to: 'goal', blockers: ['a'] }, { from: 'origin', to: 'goal', blockers: ['Z'] }], [{ id: 'a', cost: 1 }, { id: 'Z', cost: 1 }]);
    expect(comparePlans(tied, requestFor(tied, 1)).exact.selectedRepairIds).toEqual(['Z']);
  });
});

describe('frozen materialized suite', () => {
  it('regenerates byte-identically and validates all contracts/references/counts', () => {
    const first = generateSuite();
    const second = generateSuite();
    const bytes = readFileSync(new URL('../../../benchmarks/curb-metrics/suite-v1.json', import.meta.url), 'utf8');
    expect(stableStringify(first)).toBe(stableStringify(second));
    expect(stableStringify(first)).toBe(bytes);
    expect(first.networks).toHaveLength(EXPECTED_COUNTS.networks);
    first.networks.forEach(n => expect(() => validatePlanScenario(n.plan)).not.toThrow());
  });
  it('fails missing networks, unknown counts, invalid costs, references, or budgets', () => {
    const p = generateSuite();
    const changed = (f: (s: typeof p) => void) => { const s = structuredClone(p); f(s); return s; };
    expect(() => validateSuite(changed(s => { s.networks.pop(); }))).toThrow();
    expect(() => validateSuite(changed(s => { s.networks[0].budgets[0].cents = 0; }))).toThrow();
    expect(() => validateSuite(changed(s => { s.networks[0].plan.candidates[0].cost = { status: 'assumed', cents: 0, source: 'bad' }; }))).toThrow();
    expect(() => validatePlanScenario(changed(s => { s.networks[0].plan.scenario.edges[0].toNodeId = 'missing'; }).networks[0].plan)).toThrow();
    expect(() => validateSuite(changed(s => { s.networks[25].plan.edgeAssessments.find(a => a.status === 'unknown')!.status = 'blocked'; }))).toThrow();
  });
  it('refuses replacing different frozen input bytes', () => {
    const dir = mkdtempSync(resolve(tmpdir(), 'metrics-input-test-'));
    try { const path = resolve(dir, 'suite.json'); writeSuite(path); expect(writeSuite(path).networks).toBe(30); writeFileSync(path, '{}'); expect(() => writeSuite(path)).toThrow(/overwrite/); }
    finally { rmSync(dir, { recursive: true }); }
  });
});

describe('actual released investment controls', () => {
  it.each(INVESTMENT_BUDGETS)('checks budget %i against authored expected gain', budget => {
    const p = validatePlanScenario(investment());
    const measured = measureCase(deepFreeze(p), { ...identity, caseId: `investment@${budget}` }, budget);
    const expectedGain = budget < 1000000 ? 0 : budget < 2000000 ? 2 : 3;
    expect(measured.rows[0].gain).toBe(expectedGain);
    if (budget === 1000000) {
      expect(measured.response.conditionFirst.selectedRepairIds).toEqual(['repair-c']);
      expect(measured.response.exact.selectedRepairIds).toEqual(['repair-a', 'repair-b']);
      expect(measured.rows[2].gain).toBe(2);
      expect(measured.rows[2].selectedRepairIds).toEqual(['repair-a', 'repair-b']);
      expect(measured.response.exact.withoutRepair.every(r => r.restoredDestinationIds.length === 0)).toBe(true);
    }
    if (budget === 500000) expect(measured.response.exact.selectedRepairIds).toEqual([]);
    if (budget === 2000000) expect(new Set(measured.rows.map(r => r.gain))).toEqual(new Set([3]));
  });
});

// This full-suite test is executed only AFTER the schema/generator/materialized inputs
// have been published. It is author regression verification, not independent acceptance.
describe('complete comparative contents after input publication', () => {
  it('retains all rows, is deterministic, and rejects missing data', () => {
    const suite = generateSuite();
    const suiteHash = sha256(stableStringify(suite));
    const first = measureSuite(suite, suiteHash, investment());
    const second = measureSuite(suite, suiteHash, investment());
    expect(stableStringify(first)).toBe(stableStringify(second));
    expect(first.results.rows).toHaveLength(480);
    expect(first.engine.cases).toHaveLength(120);
    expect(first.results.controls).toHaveLength(32);
    expect(first.engine.controls).toHaveLength(8);
    expect(resultsCsv(first.results.rows).split('\n')).toHaveLength(482);
    expect(() => ResultsSchema.parse({ ...first.results, rows: first.results.rows.slice(1) })).toThrow();
    expect(first.results.schemaVersion).toBe(METRICS_VERSION);
  }, 30000);
});

/** Fabricated receipts below are isolated test data ONLY; never acceptance evidence. */
function testBundle() {
  const suite = generateSuite();
  const inputBytes = stableStringify(suite);
  const suiteHash = sha256(inputBytes);
  const { results, engine } = measureSuite(suite, suiteHash, investment());
  const bytes = {
    'inputs.json': inputBytes,
    'results.json': stableStringify(results),
    'engine-responses.json': stableStringify(engine),
    'results.csv': resultsCsv(results.rows),
    'verification.md': '# TEST ONLY\nFabricated regression fixture; not independent verification.\n',
  };
  const hashes = Object.fromEntries(Object.entries(bytes).map(([name, value]) => [name, sha256(value)]));
  const counts = { ...EXPECTED_COUNTS };
  const source = '1'.repeat(40);
  const manifest = {
    schemaVersion: METRICS_VERSION, suiteVersion: 'suite-v1', sourceCommit: source, frozenInputCommit: '2'.repeat(40), suiteSha256: suiteHash,
    inputRelationship: 'inputs.json is a byte-for-byte copy of the frozen suite file', sourceHashes: {}, artifactHashes: hashes, counts,
    execution: { utc: '2000-01-01T00:00:00Z', node: 'test-only', platform: 'test-only', commands: ['test only'], publishable: true }, measuredScope: 'TEST ONLY', limitations: ['TEST ONLY'],
  };
  const audit = {
    schemaVersion: METRICS_VERSION, verifierVersion: 'TEST ONLY — fabricated regression fixture', status: 'passed', sourceCommit: source, suiteSha256: suiteHash,
    expectedCounts: counts, actualCounts: counts, checkedArtifactHashes: hashes,
    caseChecks: engine.cases.map(c => ({ caseId: c.caseId, passed: true, checks: ['TEST ONLY'] })),
    rowChecks: results.rows.map(r => ({ caseId: r.caseId, strategy: r.strategy, passed: true, checks: ['TEST ONLY'] })),
    controlChecks: engine.controls.map(c => ({ caseId: c.caseId, passed: true, checks: ['TEST ONLY'] })), failures: [],
    independentRerun: { completed: true, sourceCommit: source, suiteSha256: suiteHash, deterministicHashes: hashes, verifier: 'TEST ONLY', receipt: 'TEST ONLY; no independent acceptance' },
  };
  return { suite, results, engine, bytes, manifest, audit };
}

describe('fail-closed reporting (fabricated regression receipts, never official acceptance)', () => {
  it('rejects missing/failed/incomplete audit, count, identity, rerun and hash tampering', () => {
    const b = testBundle();
    expect(() => validateAudit(b.audit, b.manifest, b.suite, b.results, b.bytes)).not.toThrow();
    const variants = [
      undefined, { ...b.audit, status: 'failed' }, { ...b.audit, failures: ['failure'] },
      { ...b.audit, caseChecks: b.audit.caseChecks.slice(1) },
      { ...b.audit, rowChecks: [...b.audit.rowChecks.slice(1), b.audit.rowChecks[1]] },
      { ...b.audit, controlChecks: [] },
      { ...b.audit, actualCounts: { ...EXPECTED_COUNTS, rows: 479 } },
      { ...b.audit, sourceCommit: '3'.repeat(40) },
      { ...b.audit, checkedArtifactHashes: {} },
      { ...b.audit, independentRerun: { ...b.audit.independentRerun, completed: false } },
      { ...b.audit, independentRerun: { ...b.audit.independentRerun, deterministicHashes: {} } },
    ];
    for (const invalid of variants) expect(() => validateAudit(invalid, b.manifest, b.suite, b.results, b.bytes)).toThrow();
    expect(() => validateAudit(b.audit, b.manifest, b.suite, b.results, { ...b.bytes, 'results.csv': b.bytes['results.csv'] + 'tampered' })).toThrow();
    expect(() => validateAudit(b.audit, b.manifest, b.suite, b.results, { ...b.bytes, 'verification.md': 'tampered' })).toThrow();
  }, 30000);
  it('rejects selected ID, spend, destination, route and row identity alterations', () => {
    const b = testBundle();
    const tamper = (mutate: (r: typeof b.results) => void) => { const r = structuredClone(b.results); mutate(r); return r; };
    const variants = [
      tamper(r => { r.rows[0].selectedRepairIds = ['missing']; }),
      tamper(r => { r.rows[0].spendCents += 1; }),
      tamper(r => { r.rows[0].newDestinationIds.push('invented'); }),
      tamper(r => { const route = r.rows[0].outcomes.find(o => o.route.status === 'reachable')!.route; if (route.status === 'reachable') route.edgeIds[0] = 'invented'; }),
      tamper(r => { r.rows[0] = r.rows[1]; }),
    ];
    for (const invalid of variants) expect(() => validateCompleteResults(b.suite, invalid, b.engine)).toThrow();
  }, 30000);
  it('recomputes weighted numerators/denominators and keeps claims pending acceptance', () => {
    const b = testBundle();
    const summary = summarize(b.suite, b.results);
    for (const comparator of ['conditionFirst', 'cheapestFirst', 'greedy']) {
      const c = summary.comparisons[comparator];
      expect(c.allBudgets.pairCount).toBe(120);
      expect(c.allBudgets.meanDifference.denominator).toBe(30);
      expect(c.constrainedBudgets.pairCount).toBe(90);
      expect(c.allBudgets.scenarioMeans.every(s => s.denominator === 4)).toBe(true);
      expect(c.allBudgets.meanDifference.value).toBe(c.allBudgets.scenarioMeans.reduce((sum, s) => sum + s.value, 0) / 30);
      expect(Object.values(c.perFamily).every(f => f.meanDifference.denominator === 5)).toBe(true);
    }
    expect(buildClaims(summary, b.manifest as Parameters<typeof buildClaims>[1]).claims_verified).toBe(false);
  }, 30000);
  it('requires an audit before creating outputs and refuses overwrite', () => {
    const b = testBundle();
    const dir = mkdtempSync(resolve(tmpdir(), 'metrics-report-TEST-ONLY-'));
    try {
      for (const [name, bytes] of Object.entries(b.bytes)) writeFileSync(resolve(dir, name), bytes);
      writeFileSync(resolve(dir, 'manifest.json'), stableStringify(b.manifest));
      expect(() => generateReport(dir)).toThrow();
      writeFileSync(resolve(dir, 'audit.json'), stableStringify(b.audit));
      const report = generateReport(dir);
      expect(report.summary.caseTable).toHaveLength(120);
      expect(readFileSync(resolve(dir, 'report.html'), 'utf8')).toContain('TEST ONLY');
      expect(() => generateReport(dir)).toThrow(/overwrite/);
    } finally { rmSync(dir, { recursive: true }); }
  }, 30000);
});

describe('source provenance', () => {
  it('requires committed canonical inputs and rejects dirty relevant files', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'metrics-git-TEST-ONLY-'));
    const git = (...args: string[]) => execFileSync('git', args, { cwd: root, stdio: 'pipe' });
    try {
      git('init');
      for (const path of ['benchmarks/curb-metrics', 'scripts/curb/metrics']) mkdirSync(resolve(root, path), { recursive: true });
      const suitePath = resolve(root, 'benchmarks/curb-metrics/suite-v1.json');
      writeFileSync(suitePath, '{}\n');
      writeFileSync(resolve(root, 'scripts/curb/metrics/spec.ts'), '// test\n');
      writeFileSync(resolve(root, 'scripts/curb/metrics/generate.ts'), '// test\n');
      git('add', '.');
      git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-m', 'test fixture');
      const p = sourceProvenance(root, suitePath);
      expect(p.frozenInputCommit).toBe(p.sourceCommit);
      expect(p.suiteSha256).toBe(sha256('{}\n'));
      writeFileSync(resolve(root, 'scripts/curb/metrics/spec.ts'), '// modified\n');
      expect(() => sourceProvenance(root, suitePath)).toThrow(/dirty/);
    } finally { rmSync(root, { recursive: true }); }
  });
});
