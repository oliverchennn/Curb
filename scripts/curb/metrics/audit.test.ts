import { describe, expect, it } from 'vitest';
import {
  PlanScenarioSchema, type PlanComparison, type PlanDestinationOutcome, type PlanScenario,
} from '../../../src/contracts/curb/plans';
import { CORE_ARTIFACTS, validateCsv, validateEngine, validateRow, verifyArtifactHashes } from './audit';
import { prepareOracle } from './oracle';
import { ResultRowSchema, deepFreeze, requestFor, sha256, type ResultRow } from './spec';

type Blocker = [repairId: string, cost: number | null, severity?: number];
type Link = [id: string, from: string, to: string, blockers?: Blocker[], status?: 'unknown', bidirectional?: boolean];

function tiny(links: Link[], destinationNodes: string[]): PlanScenario {
  const origin = 'start';
  const nodeIds = [...new Set([origin, ...links.flatMap(([, from, to]) => [from, to]), ...destinationNodes])];
  const coordinate = (nodeId: string) => [nodeIds.indexOf(nodeId) / 1000, 0];
  const destinations = destinationNodes.map(nodeId => ({ id: nodeId, nodeId, label: nodeId }));
  const entries = links.flatMap(([edge, , , blockers = []]) => blockers.map((blocker) => ({ edge, blocker })));
  return PlanScenarioSchema.parse({
    schemaVersion: 1, contractVersion: 'curb-r2', originNodeId: origin,
    profile: { id: 'step-free-demo', label: 'Tiny', description: 'Synthetic route test.' },
    assumptions: ['Authored synthetic test only.'], defaultBudgetCents: 10,
    destinationIds: destinations.map(({ id }) => id),
    scenario: {
      schemaVersion: 1, id: 'tiny', revision: 3, title: 'Tiny', dataKind: 'synthetic', destinations, evidence: [],
      nodes: nodeIds.map(id => ({ id, coordinate: coordinate(id) })),
      edges: links.map(([id, from, to, blockers = [], , bidirectional = false]) => ({
        id, fromNodeId: from, toNodeId: to, bidirectional, lengthMeters: 7,
        geometry: { type: 'LineString', coordinates: [coordinate(from), coordinate(to)] },
        barrierIds: blockers.map(([repair]) => 'block-' + repair),
      })),
      barriers: entries.map(({ edge, blocker: [repair] }) => ({
        id: 'block-' + repair, edgeId: edge, kind: 'obstruction',
        reviewStatus: 'pending', evidenceIds: [], note: 'Authored blocker.',
      })),
    },
    edgeAssessments: links.map(([edgeId, , , blockers = [], status]) => ({
      edgeId, kind: 'walkway', status: status ?? (blockers.length ? 'blocked' : 'pass'),
      blockingBarrierIds: blockers.map(([repair]) => 'block-' + repair), reason: 'Authored assessment.',
    })),
    repairs: entries.map(({ blocker: [id] }) => ({ id, label: id, barrierId: 'block-' + id, description: 'Test repair.' })),
    candidates: entries.map(({ blocker: [repairId, cost, score = 1] }) => ({
      repairId, severity: { score, rationale: 'Authored score.' },
      cost: { status: cost === null ? 'unknown' : 'assumed', cents: cost, source: 'Test assumption.' },
    })),
  });
}

describe('independent directed BFS and policies', () => {
  it('requires all blockers, excludes unknown cost, and keeps an unknown edge unknown after its free repair', () => {
    const plan = deepFreeze(tiny([
      ['base', 'start', 'cafe'],
      ['double', 'start', 'hall', [['a-free', 0], ['b-paid', 7]]],
      ['unverified', 'start', 'unknown', [['c-free-unknown', 0]], 'unknown'],
      ['reverse-only', 'reverse', 'start'],
      ['unpriced', 'start', 'unpriced', [['d-unknown-cost', null]]],
    ], ['hall', 'cafe', 'unknown', 'reverse', 'disconnected', 'unpriced']));
    const snapshot = structuredClone(plan);
    const oracle = prepareOracle(plan);
    expect(oracle.baselineDestinationIds).toEqual(['cafe']);
    expect(oracle.project(['a-free']).newDestinationIds).toEqual([]);
    expect(oracle.project(['b-paid', 'c-free-unknown']).newDestinationIds).toEqual([]);
    expect(() => oracle.project(['d-unknown-cost'])).toThrow(/Ineligible/);
    expect(oracle.excludedUnknownCostRepairIds).toEqual(['d-unknown-cost']);
    expect(oracle.evaluate(6).search).toEqual({ enumeratedSubsetCount: 8, feasibleSubsetCount: 4 });
    expect(oracle.evaluate(6).policies.exact.selectedRepairIds).toEqual([]);
    const evaluated = oracle.evaluate(7);
    expect(evaluated.search).toEqual({ enumeratedSubsetCount: 8, feasibleSubsetCount: 8 });
    expect(evaluated.policies.exact).toEqual({
      selectedRepairIds: ['a-free', 'b-paid'], spendCents: 7,
      newDestinationIds: ['hall'], totalDestinationIds: ['hall', 'cafe'],
    });
    expect(evaluated.policies.greedy.selectedRepairIds).toEqual(['a-free', 'b-paid', 'c-free-unknown']);
    expect(plan).toEqual(snapshot);
  });

  it('continues through a paid zero-gain plateau and purchases a free positive-gain repair first', () => {
    const oracle = prepareOracle(tiny([
      ['first', 'start', 'mid', [['a', 2]]],
      ['second', 'mid', 'target', [['b', 2]]],
      ['free', 'start', 'free-dest', [['z-free', 0]]],
    ], ['target', 'free-dest']));
    expect(oracle.evaluate(4).policies.greedy.selectedRepairIds).toEqual(['z-free', 'a', 'b']);
    expect(oracle.evaluate(2).policies.exact.selectedRepairIds).toEqual(['z-free']);
    expect(oracle.evaluate(0).policies.exact.newDestinationIds).toEqual(['free-dest']);
  });

  it('uses exact ratios, then larger absolute gains, and recomputes gains after buying', () => {
    const oracle = prepareOracle(tiny([
      ['single', 'start', 'one', [['a-one', 3]]],
      ['pair', 'start', 'hub', [['z-two', 6]]],
      ['first-dest', 'hub', 'two'],
      ['shared-dest', 'hub', 'one'],
      ['different', 'start', 'three', [['b-other', 3]]],
    ], ['one', 'two', 'three']));
    expect(oracle.evaluate(9).policies.greedy.selectedRepairIds).toEqual(['z-two', 'b-other']);
  });

  it('breaks exact ties by spend, repair count, then code-unit IDs while comparators follow their own orders', () => {
    const oracle = prepareOracle(tiny([
      ['chain-a', 'start', 'mid', [['a-chain', 1]]],
      ['chain-b', 'mid', 'target', [['b-chain', 1]]],
      ['cheap-z', 'start', 'target', [['z-direct', 2, 5]]],
      ['cheap-c', 'start', 'target', [['c-direct', 2, 3]]],
      ['pricey', 'start', 'target', [['expensive', 3, 5]]],
    ], ['target']));
    const result = oracle.evaluate(3);
    expect(result.policies.exact.selectedRepairIds).toEqual(['c-direct']);
    expect(result.policies.conditionFirst.selectedRepairIds).toEqual(['z-direct', 'a-chain']);
    expect(result.policies.cheapestFirst.selectedRepairIds).toEqual(['a-chain', 'b-chain']);
    expect(result.policies.greedy.selectedRepairIds).toEqual(['c-direct', 'a-chain']);
  });

  it('counts the empty subset once when there are no candidates', () => {
    const oracle = prepareOracle(tiny([['known', 'start', 'end']], ['end', 'isolated']));
    expect(oracle.evaluate(0).search).toEqual({ enumeratedSubsetCount: 1, feasibleSubsetCount: 1 });
    expect(oracle.evaluate(0).policies.exact).toEqual({
      selectedRepairIds: [], spendCents: 0, totalDestinationIds: ['end'], newDestinationIds: [],
    });
  });
});

const plan = tiny([
  ['base', 'start', 'cafe'],
  ['repairable', 'start', 'hall', [['curb', 3]]],
  ['still-unknown', 'start', 'hall', [], 'unknown'],
  ['reversed', 'hall', 'start'],
], ['cafe', 'hall']);
const oracle = prepareOracle(plan);
const evaluation = oracle.evaluate(3);
const cafe = { destinationId: 'cafe', route: {
  status: 'reachable', nodeIds: ['start', 'cafe'], edgeIds: ['base'], distanceMeters: 7,
} } satisfies PlanDestinationOutcome;
const hall = { destinationId: 'hall', route: {
  status: 'reachable', nodeIds: ['start', 'hall'], edgeIds: ['repairable'], distanceMeters: 7,
} } satisfies PlanDestinationOutcome;
const base = { reachableCount: 1, outcomes: [cafe, {
  destinationId: 'hall', route: { status: 'unknown', blockedEdgeIds: [], unknownEdgeIds: ['still-unknown'] },
}] } satisfies PlanComparison['baseline'];
const selection = {
  reachableCount: 2, outcomes: [cafe, hall], restoredCount: 1, restoredDestinationIds: ['hall'],
  selectedRepairIds: ['curb'], spendCents: 3,
  withoutRepair: [{ ...base, repairId: 'curb', restoredDestinationIds: [] }],
};
const raw: PlanComparison = {
  ...requestFor(plan, 3), baseline: base, eligibleRepairs: [{ repairId: 'curb', severityScore: 1, costCents: 3 }],
  excludedUnknownCostRepairIds: [], exact: selection, conditionFirst: structuredClone(selection),
  singleRepairs: [{ outcomes: [cafe, hall], reachableCount: 2, repairId: 'curb', restoredDestinationIds: ['hall'] }],
  search: { enumeratedSubsetCount: 2, feasibleSubsetCount: 2 },
};
const id = { caseId: 'tiny@25', family: 'independent', seed: 101, budgetPercent: 25, budgetCents: 3, strategy: 'exact' } as const;
const row = ResultRowSchema.parse({
  ...id, scenarioId: 'tiny', eligibleCostCents: 3, eligibleCandidateCount: 1, excludedUnknownCostRepairIds: [],
  selectedRepairIds: ['curb'], spendCents: 3, baselineDestinationIds: ['cafe'],
  newDestinationIds: ['hall'], totalDestinationIds: ['cafe', 'hall'], baselineCount: 1, gain: 1, totalCount: 2,
  destinationCount: 2, gainFraction: 0.5, costPerNewDestinationCents: 3, costPerNewDestinationReason: null,
  outcomes: [cafe, hall],
});
const rowTampering: Array<[string, (row: ResultRow) => void, RegExp]> = [
  ['selected repair', copy => { copy.selectedRepairIds = ['invented']; }, /selected repair IDs/],
  ['spend', copy => { copy.spendCents = 2; }, /Row spend/],
  ['restored destination', copy => { copy.newDestinationIds = ['cafe']; }, /newly reachable/],
  ['reverse edge', copy => {
    if (copy.outcomes[1].route.status === 'reachable') copy.outcomes[1].route.edgeIds = ['reversed'];
  }, /Broken directed witness/],
  ['unknown edge', copy => {
    if (copy.outcomes[1].route.status === 'reachable') copy.outcomes[1].route.edgeIds = ['still-unknown'];
  }, /blocked or unknown edge/],
  ['distance', copy => {
    if (copy.outcomes[1].route.status === 'reachable') copy.outcomes[1].route.distanceMeters = 9;
  }, /witness distance/],
];

describe('audit tamper rejection', () => {
  it('validates the independently specified row and raw engine response', () => {
    expect(() => validateEngine(raw, oracle, 3, evaluation)).not.toThrow();
    expect(() => validateRow(row, id, oracle, evaluation.policies.exact, raw)).not.toThrow();
  });

  it.each(rowTampering)('rejects an altered %s even if hashes were refreshed', (_label, mutate, message) => {
    const corrupt = structuredClone(row);
    mutate(corrupt);
    expect(() => validateRow(corrupt, id, oracle, evaluation.policies.exact, raw)).toThrow(message);
  });

  it('rejects changed raw request identity, subset count and an omission witness', () => {
    const changedIdentity = { ...raw, scenarioId: 'unrelated' };
    expect(() => validateEngine(changedIdentity, oracle, 3, evaluation)).toThrow(/Engine scenarioId/);
    const changedSearch = { ...raw, search: { enumeratedSubsetCount: 2, feasibleSubsetCount: 1 } };
    expect(() => validateEngine(changedSearch, oracle, 3, evaluation)).toThrow(/subset counts/);
    const changedOmission = structuredClone(raw);
    changedOmission.exact.withoutRepair[0].outcomes = [cafe, hall];
    expect(() => validateEngine(changedOmission, oracle, 3, evaluation)).toThrow(/without curb.*directed BFS/);
  });

  it('binds CSV transport fields to each ordered JSON row', () => {
    const csv = [
      'caseId,scenarioId,family,seed,budgetPercent,budgetCents,strategy,eligibleCostCents,eligibleCandidateCount,excludedUnknownCostRepairIds,selectedRepairIds,spendCents,baselineDestinationIds,newDestinationIds,totalDestinationIds,baselineCount,gain,totalCount,destinationCount,gainFraction,costPerNewDestinationCents,costPerNewDestinationReason',
      '"tiny@25","tiny","independent","101","25","3","exact","3","1","[]","[""curb""]","3","[""cafe""]","[""hall""]","[""cafe"",""hall""]","1","1","2","2","0.5","3",""',
      '',
    ].join('\n');
    expect(() => validateCsv(csv, [row])).not.toThrow();
    expect(() => validateCsv(csv.replace('0.5', '0.6'), [row])).toThrow(/results.csv/);
    expect(() => validateCsv(csv, [])).toThrow(/results.csv/);
  });

  it('rejects a file hash change and missing or extra artifacts or manifest entries', () => {
    const files = new Map([...CORE_ARTIFACTS, 'run.log'].map(name => [name, Buffer.from(name)]));
    const hashes = Object.fromEntries([...files].map(([name, bytes]) => [name, sha256(bytes)]));
    expect(Object.keys(verifyArtifactHashes(files, hashes))).toEqual([...CORE_ARTIFACTS]);
    expect(() => verifyArtifactHashes(files, { ...hashes, 'results.csv': '0'.repeat(64) })).toThrow(/SHA-256.*results.csv/);
    expect(() => verifyArtifactHashes(new Map([...files, ['extra.txt', Buffer.from('')]]), hashes)).toThrow(/extra/);
    expect(() => verifyArtifactHashes(new Map([...files].slice(1)), hashes)).toThrow(/Missing/);
    expect(() => verifyArtifactHashes(files, { ...hashes, extra: '0'.repeat(64) })).toThrow(/artifact names/);
  });
});
