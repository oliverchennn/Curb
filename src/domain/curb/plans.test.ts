import { describe, expect, it } from 'vitest';
import {
  MAX_PLAN_CANDIDATES,
  MAX_PLAN_SUBSETS,
  PlanComparisonSchema,
  PlanScenarioSchema,
  matchesPlanRequest,
  matchesPlanScenario,
  type PlanRequest,
  type PlanScenario,
} from '../../contracts/curb/plans';
import { comparePlans, InvalidPlanScenarioError, PlanRequestError, validatePlanScenario } from './plans';

type EdgeSpec = {
  id: string; from: string; to: string; length?: number; reverse?: boolean;
  blockers?: string[]; unknown?: boolean;
};
type CandidateSpec = { id: string; cost: number | null; severity?: number };

function graph(
  edges: EdgeSpec[],
  destinations: [string, string][],
  candidates: CandidateSpec[],
): PlanScenario {
  const nodes = [...new Set(['origin', ...edges.flatMap(({ from, to }) => [from, to]),
    ...destinations.map(([, node]) => node)])];
  return {
    schemaVersion: 1, contractVersion: 'curb-r2',
    scenario: {
      schemaVersion: 1, id: 'synthetic-test-plan', revision: 1, title: 'Synthetic planning test', dataKind: 'synthetic',
      nodes: nodes.map((id, index) => ({ id, coordinate: [index / 1000, 0] })),
      edges: edges.map(({ id, from, to, length = 1, reverse = false, blockers = [] }) => ({
        id, fromNodeId: from, toNodeId: to, lengthMeters: length, bidirectional: reverse,
        barrierIds: blockers.map((repair) => `barrier-${repair}`),
        geometry: { type: 'LineString', coordinates: [[0, 0], [0.001, 0]] },
      })),
      destinations: destinations.map(([id, nodeId]) => ({ id, nodeId, label: `Synthetic ${id}` })),
      barriers: edges.flatMap(({ id: edgeId, blockers = [] }) => blockers.map((repair) => ({
        id: `barrier-${repair}`, edgeId, kind: 'obstruction', reviewStatus: 'pending', evidenceIds: [], note: 'Synthetic blocker.',
      }))),
      evidence: [],
    },
    profile: { id: 'step-free-demo', label: 'Synthetic profile', description: 'Declared synthetic assumptions only.' },
    assumptions: ['All costs and conditions are authored test assumptions.'],
    edgeAssessments: edges.map(({ id: edgeId, blockers = [], unknown }) => ({
      edgeId, kind: 'walkway', status: unknown ? 'unknown' : blockers.length ? 'blocked' : 'pass',
      blockingBarrierIds: blockers.map((repair) => `barrier-${repair}`), reason: 'Authored test condition.',
    })),
    repairs: edges.flatMap(({ blockers = [] }) => blockers.map((id) => ({
      id, label: `Synthetic ${id}`, barrierId: `barrier-${id}`, description: 'Clear this authored blocker.',
    }))),
    originNodeId: 'origin', destinationIds: destinations.map(([id]) => id),
    candidates: candidates.map(({ id: repairId, cost, severity = 3 }) => ({
      repairId, severity: { score: severity, rationale: 'Authored condition rating.' },
      cost: cost === null ? { status: 'unknown', cents: null, source: 'No authored estimate.' }
        : { status: 'assumed', cents: cost, source: 'Illustrative USD cents.' },
    })),
    defaultBudgetCents: 400,
  };
}

function demo(): PlanScenario {
  return graph([
    { id: 'link-a', from: 'origin', to: 'middle', blockers: ['a'] },
    { id: 'link-b', from: 'middle', to: 'fork', blockers: ['b'] },
    { id: 'left', from: 'fork', to: 'left' },
    { id: 'right', from: 'fork', to: 'right' },
    { id: 'hall', from: 'origin', to: 'hall', blockers: ['c'] },
    { id: 'cafe', from: 'origin', to: 'cafe' },
    { id: 'studio', from: 'origin', to: 'studio', blockers: ['u'], unknown: true },
  ], [['right', 'right'], ['cafe', 'cafe'], ['left', 'left'], ['hall', 'hall'],
    ['studio', 'studio'], ['archive', 'archive'], ['home', 'origin']],
  [{ id: 'a', cost: 200, severity: 3 }, { id: 'b', cost: 200, severity: 2 },
    { id: 'c', cost: 400, severity: 5 }, { id: 'u', cost: null, severity: 4 }]);
}

const request = (context: PlanScenario, budgetCents = context.defaultBudgetCents): PlanRequest => ({
  contractVersion: 'curb-r2', scenarioId: context.scenario.id, revision: context.scenario.revision,
  profileId: context.profile.id, originNodeId: context.originNodeId, budgetCents,
});

function freezeDeep(value: unknown): void {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    Object.values(value).forEach(freezeDeep);
  }
}

// Independent oracle: directed flood fill and recursive subset generation. It
// does not call any routing, validation or comparison implementation for answers.
function oracle(context: PlanScenario, budget: number) {
  function reachable(ids: string[]): string[] {
    const cleared = new Set(context.repairs.filter(({ id }) => ids.includes(id)).map(({ barrierId }) => barrierId));
    const reached = new Set([context.originNodeId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const edge of context.scenario.edges) {
        const assessment = context.edgeAssessments.find(({ edgeId }) => edgeId === edge.id)!;
        if (assessment.status === 'unknown' || assessment.blockingBarrierIds.some((id) => !cleared.has(id))) continue;
        if (reached.has(edge.fromNodeId) && !reached.has(edge.toNodeId)) {
          reached.add(edge.toNodeId); changed = true;
        }
        if (edge.bidirectional && reached.has(edge.toNodeId) && !reached.has(edge.fromNodeId)) {
          reached.add(edge.fromNodeId); changed = true;
        }
      }
    }
    return context.destinationIds.filter((id) => reached.has(context.scenario.destinations.find((d) => d.id === id)!.nodeId));
  }
  const baseline = reachable([]);
  const candidates = context.candidates.filter(({ cost }) => cost.status !== 'unknown');
  const feasible: { ids: string[]; spend: number; restored: string[] }[] = [];
  let enumerated = 0;
  function visit(index: number, ids: string[], spend: number): void {
    if (index < candidates.length) {
      visit(index + 1, ids, spend);
      visit(index + 1, [...ids, candidates[index].repairId], spend + candidates[index].cost.cents!);
    } else {
      enumerated += 1;
      if (spend <= budget) feasible.push({ ids: ids.sort(), spend, restored: reachable(ids).filter((id) => !baseline.includes(id)) });
    }
  }
  visit(0, [], 0);
  feasible.sort((left, right) => {
    const score = right.restored.length - left.restored.length || left.spend - right.spend || left.ids.length - right.ids.length;
    if (score) return score;
    for (let i = 0; i < left.ids.length; i += 1) {
      if (left.ids[i] !== right.ids[i]) return left.ids[i] < right.ids[i] ? -1 : 1;
    }
    return 0;
  });
  return { best: feasible[0], enumerated, feasible: feasible.length, reachable };
}

describe('equal-budget comparison', () => {
  it('evaluates complementary repairs, singleton and omission outcomes in destination order', () => {
    const context = demo();
    const result = comparePlans(context, request(context));
    expect(result.baseline.reachableCount).toBe(2);
    expect(result.baseline.outcomes.map(({ destinationId }) => destinationId)).toEqual(context.destinationIds);
    expect(result.conditionFirst).toMatchObject({ selectedRepairIds: ['c'], spendCents: 400, restoredDestinationIds: ['hall'], restoredCount: 1 });
    expect(result.exact).toMatchObject({ selectedRepairIds: ['a', 'b'], spendCents: 400, restoredDestinationIds: ['right', 'left'], restoredCount: 2 });
    expect(result.exact.withoutRepair.map(({ repairId, restoredDestinationIds }) => ({ repairId, restoredDestinationIds })))
      .toEqual([{ repairId: 'a', restoredDestinationIds: [] }, { repairId: 'b', restoredDestinationIds: [] }]);
    expect(result.singleRepairs.map(({ repairId, restoredDestinationIds }) => ({ repairId, restoredDestinationIds })))
      .toEqual([{ repairId: 'a', restoredDestinationIds: [] }, { repairId: 'b', restoredDestinationIds: [] }, { repairId: 'c', restoredDestinationIds: ['hall'] }]);
    expect(result.excludedUnknownCostRepairIds).toEqual(['u']);
    expect(result.search).toEqual({ enumeratedSubsetCount: 8, feasibleSubsetCount: 5 });
    const parsed = PlanComparisonSchema.parse(result);
    expect(matchesPlanRequest(parsed, request(context))).toBe(true);
    expect(matchesPlanScenario(parsed, PlanScenarioSchema.parse(context))).toBe(true);
  });

  it('keeps known unaffordable candidates and skips them while preserving purchase order', () => {
    const context = demo();
    const result = comparePlans(context, request(context, 200));
    expect(result.eligibleRepairs.map(({ repairId }) => repairId)).toEqual(['c', 'a', 'b']);
    expect(result.conditionFirst.selectedRepairIds).toEqual(['a']);
    expect(result.exact.selectedRepairIds).toEqual([]);
    expect(result.search).toEqual({ enumeratedSubsetCount: 8, feasibleSubsetCount: 3 });
    expect(PlanComparisonSchema.safeParse(result).success).toBe(true);
  });

  it('orders equal-condition candidates by cost then code-unit ID, and exclusions by ID', () => {
    const ids = ['expensive', 'a', 'Z', 'unknown-z', 'unknown-Z'];
    const context = graph(ids.map((id) => ({ id, from: 'origin', to: id, blockers: [id] })),
      ids.map((id) => [id, id]), ids.map((id, index) => ({ id, severity: 4, cost: index > 2 ? null : index === 0 ? 100 : 50 })));
    const result = comparePlans(context, request(context, 100));
    expect(result.eligibleRepairs.map(({ repairId }) => repairId)).toEqual(['Z', 'a', 'expensive']);
    expect(result.conditionFirst.selectedRepairIds).toEqual(['Z', 'a']);
    expect(result.excludedUnknownCostRepairIds).toEqual(['unknown-Z', 'unknown-z']);
    expect(PlanComparisonSchema.safeParse(result).success).toBe(true);
  });

  it('handles empty candidates, no affordable candidates and zero budgets without treating unknown costs as free', () => {
    const context = demo();
    for (const candidates of [[], context.candidates.filter(({ cost }) => cost.status === 'unknown'), context.candidates]) {
      const input = { ...context, candidates };
      const result = comparePlans(input, request(input, 0));
      expect(result.exact.selectedRepairIds).toEqual([]);
      expect(result.conditionFirst.selectedRepairIds).toEqual([]);
      expect(result.search).toEqual({ enumeratedSubsetCount: 2 ** candidates.filter(({ cost }) => cost.status !== 'unknown').length, feasibleSubsetCount: 1 });
      expect(result.conditionFirst.outcomes).toEqual(result.baseline.outcomes);
      expect(PlanComparisonSchema.safeParse(result).success).toBe(true);
    }
  });

  it('purchases genuine zero-cost repairs while exact discards redundant free repairs', () => {
    const context = demo();
    context.candidates.forEach((candidate) => { if (candidate.cost.status !== 'unknown') candidate.cost.cents = 0; });
    const result = comparePlans(context, request(context, 0));
    expect(result.conditionFirst.selectedRepairIds).toEqual(['c', 'a', 'b']);
    expect(result.exact.selectedRepairIds).toEqual(['a', 'b', 'c']);
    expect(result.exact.restoredCount).toBe(3);
    expect(result.search.feasibleSubsetCount).toBe(8);
    const redundant = graph([{ id: 'edge', from: 'origin', to: 'target', blockers: ['Z', 'a'] }],
      [['already', 'origin']], [{ id: 'Z', cost: 0 }, { id: 'a', cost: 0 }]);
    const emptyBest = comparePlans(redundant, request(redundant, 0));
    expect(emptyBest.conditionFirst.selectedRepairIds).toEqual(['Z', 'a']);
    expect(emptyBest.exact.selectedRepairIds).toEqual([]);
    expect(emptyBest.exact.restoredDestinationIds).toEqual([]);
  });

  it('requires every blocker to be cleared and never clears unknown coverage', () => {
    const context = graph([
      { id: 'multi', from: 'origin', to: 'target', blockers: ['a', 'b'] },
      { id: 'uncertain', from: 'origin', to: 'unknown', blockers: ['u'], unknown: true },
    ], [['target', 'target'], ['unknown', 'unknown'], ['isolated', 'isolated']],
    [{ id: 'a', cost: 1 }, { id: 'b', cost: 1 }, { id: 'u', cost: 0, severity: 5 }]);
    const result = comparePlans(context, request(context, 2));
    expect(result.exact.selectedRepairIds).toEqual(['a', 'b']);
    expect(result.singleRepairs.find(({ repairId }) => repairId === 'a')!.outcomes[0].route.status).toBe('blocked');
    expect(result.baseline.outcomes[1].route).toEqual({ status: 'blocked', blockedEdgeIds: ['uncertain'], unknownEdgeIds: [] });
    expect(result.conditionFirst.outcomes[1].route).toEqual({ status: 'unknown', blockedEdgeIds: [], unknownEdgeIds: ['uncertain'] });
    expect(result.exact.outcomes[1].route.status).toBe('blocked');
    expect(result.exact.outcomes[2].route.status).toBe('disconnected');
    expect(PlanComparisonSchema.safeParse(result).success).toBe(true);
  });

  it('respects direction and stable route ties after graph and metadata reorderings', () => {
    const context = graph([
      { id: 'z', from: 'origin', to: 'target', length: 2 },
      { id: 'Z', from: 'origin', to: 'middle', length: 1 },
      { id: 'a', from: 'middle', to: 'target', length: 1 },
      { id: 'one-way', from: 'backwards', to: 'origin' },
      { id: 'reverse', from: 'reverse', to: 'origin', reverse: true },
    ], [['target', 'target'], ['backwards', 'backwards'], ['reverse', 'reverse']], []);
    const expected = comparePlans(context, request(context));
    expect(expected.baseline.outcomes.map(({ route }) => route.status)).toEqual(['reachable', 'disconnected', 'reachable']);
    expect(expected.baseline.outcomes[0].route).toMatchObject({ edgeIds: ['Z', 'a'], distanceMeters: 2 });
    context.scenario.edges.reverse(); context.scenario.nodes.reverse(); context.scenario.destinations.reverse();
    context.edgeAssessments.reverse(); context.candidates.reverse(); context.repairs.reverse();
    expect(comparePlans(context, request(context))).toEqual(expected);
  });

  it('breaks objective ties by spend, repair count, then code-unit IDs', () => {
    const context = graph([
      { id: 'expensive', from: 'origin', to: 'target', blockers: ['expensive'] },
      { id: 'pair-one', from: 'origin', to: 'middle', blockers: ['pair-one'] },
      { id: 'pair-two', from: 'middle', to: 'target', blockers: ['pair-two'] },
      { id: 'upper', from: 'origin', to: 'target', blockers: ['Z'] },
      { id: 'lower', from: 'origin', to: 'target', blockers: ['a'] },
    ], [['target', 'target']], [{ id: 'expensive', cost: 3, severity: 5 },
      { id: 'pair-one', cost: 1 }, { id: 'pair-two', cost: 1 }, { id: 'Z', cost: 2 }, { id: 'a', cost: 2 }]);
    const expected = comparePlans(context, request(context, 3));
    expect(expected.exact.selectedRepairIds).toEqual(['Z']);
    expect(expected.exact.spendCents).toBe(2);
    context.candidates.reverse(); context.repairs.reverse(); context.edgeAssessments.reverse(); context.scenario.edges.reverse();
    expect(comparePlans(context, request(context, 3))).toEqual(expected);
  });

  it('counts all 4096 masks including empty at the frozen twelve-candidate bound', () => {
    const ids = Array.from({ length: MAX_PLAN_CANDIDATES }, (_, i) => `repair-${i}`);
    const context = graph([{ id: 'blocked', from: 'origin', to: 'target', blockers: ids }],
      [['target', 'target']], ids.map((id) => ({ id, cost: 1 })));
    const result = comparePlans(context, request(context, 0));
    expect(result.search).toEqual({ enumeratedSubsetCount: MAX_PLAN_SUBSETS, feasibleSubsetCount: 1 });
    const allFeasible = comparePlans(context, request(context, 12));
    expect(allFeasible.search.feasibleSubsetCount).toBe(MAX_PLAN_SUBSETS);
    expect(allFeasible.exact.selectedRepairIds).toEqual([...ids].sort());
    expect(PlanComparisonSchema.safeParse(allFeasible).success).toBe(true);
  });

  it('agrees with independent exhaustive connectivity/search across budgets and graph variations', () => {
    for (let variant = 0; variant < 12; variant += 1) {
      const ids = ['Z', 'a', 'b', 'c', 'd'];
      const edges: EdgeSpec[] = ids.map((id, index) => ({
        id: `candidate-${id}`, from: index === 0 ? 'origin' : `n${index - 1}`, to: `n${index}`,
        blockers: [id], reverse: (variant + index) % 3 === 0, unknown: (variant + index) % 7 === 0,
      }));
      edges.push({ id: 'shortcut', from: variant % 2 ? 'origin' : 'n3', to: variant % 2 ? 'n3' : 'origin', reverse: variant % 3 === 0 });
      edges.push({ id: 'branch', from: 'n1', to: 'n4', unknown: variant % 4 === 0 });
      const context = graph(edges, [['four', 'n4'], ['one', 'n1'], ['same', 'origin'], ['three', 'n3'], ['isolated', 'isolated']],
        ids.map((id, index) => ({ id, cost: variant % 5 === index ? null : (variant + index) % 4, severity: index + 1 })));
      for (const budget of [0, 1, 2, 4, 8]) {
        const expected = oracle(context, budget);
        const result = comparePlans(context, request(context, budget));
        expect(result.exact.selectedRepairIds).toEqual(expected.best.ids);
        expect(result.exact.spendCents).toBe(expected.best.spend);
        expect(result.exact.restoredDestinationIds).toEqual(expected.best.restored);
        expect(result.search).toEqual({ enumeratedSubsetCount: expected.enumerated, feasibleSubsetCount: expected.feasible });
        for (const plan of [result.conditionFirst, result.exact]) {
          expect(plan.outcomes.filter(({ route }) => route.status === 'reachable').map(({ destinationId }) => destinationId))
            .toEqual(expected.reachable(plan.selectedRepairIds));
        }
        expect(PlanComparisonSchema.safeParse(result).success).toBe(true);
      }
    }
  });

  it('is deterministic with deeply frozen source and request and detached evaluation snapshots', () => {
    const context = demo();
    const selection = request(context);
    const original = structuredClone(context);
    freezeDeep(context); freezeDeep(selection);
    const first = comparePlans(context, selection);
    expect(comparePlans(context, selection)).toEqual(first);
    expect(context).toEqual(original);
    first.exact.outcomes[0].destinationId = 'changed-result';
    expect(comparePlans(context, selection).exact.outcomes[0].destinationId).toBe('right');
    expect(context).toEqual(original);
  });
});

describe('plan scenario and request boundaries', () => {
  it('returns a separately parsed valid context', () => {
    const input = demo(); freezeDeep(input);
    const parsed = validatePlanScenario(input);
    expect(parsed).toEqual(input); expect(parsed).not.toBe(input);
    parsed.assumptions.push('Caller change.');
    expect(input.assumptions).toHaveLength(1);
  });

  it.each([
    ['topology', (c: PlanScenario) => { c.scenario.edges[0].toNodeId = 'missing'; }],
    ['duplicate node', (c: PlanScenario) => { c.scenario.nodes.push(c.scenario.nodes[0]); }],
    ['assessment coverage', (c: PlanScenario) => { c.edgeAssessments.pop(); }],
    ['duplicate assessment', (c: PlanScenario) => { c.edgeAssessments.push(c.edgeAssessments[0]); }],
    ['foreign blocker', (c: PlanScenario) => { c.edgeAssessments[0].blockingBarrierIds = ['barrier-c']; }],
    ['non-blocker repair', (c: PlanScenario) => { c.edgeAssessments[0].status = 'pass'; c.edgeAssessments[0].blockingBarrierIds = []; }],
    ['duplicate repair', (c: PlanScenario) => { c.repairs.push(c.repairs[0]); }],
    ['missing barrier reference', (c: PlanScenario) => { c.scenario.edges[0].barrierIds = []; }],
    ['evidence reference', (c: PlanScenario) => { c.scenario.barriers[0].evidenceIds.push('missing'); }],
    ['field evidence', (c: PlanScenario) => { c.scenario.evidence.push({ id: 'field', origin: 'field', kind: 'note', caption: 'Field note.' }); }],
    ['missing origin', (c: PlanScenario) => { c.originNodeId = 'missing'; }],
    ['missing destination', (c: PlanScenario) => { c.destinationIds.push('missing'); }],
    ['duplicate destination', (c: PlanScenario) => { c.destinationIds.push(c.destinationIds[0]); }],
    ['missing candidate repair', (c: PlanScenario) => { c.candidates[0].repairId = 'missing'; }],
    ['duplicate candidate', (c: PlanScenario) => { c.candidates.push(c.candidates[0]); }],
    ['unsafe aggregate', (c: PlanScenario) => { c.candidates[0].cost = { status: 'assumed', cents: Number.MAX_SAFE_INTEGER, source: 'Test.' }; }],
  ])('wraps invalid %s as InvalidPlanScenarioError', (_label, mutate) => {
    const input = demo(); mutate(input);
    expect(() => validatePlanScenario(input)).toThrow(InvalidPlanScenarioError);
    expect(() => comparePlans(input, request(input))).toThrow(InvalidPlanScenarioError);
  });

  it.each([-1, 0.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1])('rejects invalid cost %s', (cents) => {
    const input = demo(); input.candidates[0].cost = { status: 'quoted', cents, source: 'Invalid test amount.' };
    expect(() => validatePlanScenario(input)).toThrow(InvalidPlanScenarioError);
  });

  it('rejects unknown costs that claim a numeric amount and too many candidates', () => {
    const input = demo();
    const invalid = { ...input, candidates: [{ ...input.candidates[0], cost: { status: 'unknown', cents: 0, source: 'Unknown.' } }] };
    expect(() => validatePlanScenario(invalid)).toThrow(InvalidPlanScenarioError);
    input.candidates = Array.from({ length: 13 }, () => input.candidates[0]);
    expect(() => validatePlanScenario(input)).toThrow(InvalidPlanScenarioError);
  });

  it.each([
    { profileId: 'wrong' }, { contractVersion: 'curb-r1' }, { originNodeId: 'cafe' },
    { originNodeId: 'missing' }, { budgetCents: -1 }, { budgetCents: 0.1 },
    { budgetCents: Number.MAX_SAFE_INTEGER + 1 }, { budgetCents: Infinity },
    { selectedRepairIds: ['c'] }, { weights: [2] },
  ])('rejects malformed or inconsistent requests %j', (overrides) => {
    const input = demo();
    expect(() => comparePlans(input, { ...request(input), ...overrides } as PlanRequest))
      .toThrow(expect.objectContaining({ name: 'PlanRequestError', code: 'INVALID_REQUEST' }));
  });

  it('distinguishes missing scenarios, stale requests and invalid server contexts', () => {
    const input = demo();
    expect(() => comparePlans(input, { ...request(input), scenarioId: 'other' })).toThrow(expect.objectContaining({ code: 'SCENARIO_NOT_FOUND' }));
    expect(() => comparePlans(input, { ...request(input), revision: 2 })).toThrow(expect.objectContaining({ code: 'STALE_SCENARIO' }));
    input.edgeAssessments.pop();
    expect(() => comparePlans(input, null as unknown as PlanRequest)).toThrow(InvalidPlanScenarioError);
    expect(new PlanRequestError('STALE_SCENARIO', 'Reload.')).toMatchObject({ name: 'PlanRequestError', code: 'STALE_SCENARIO', message: 'Reload.' });
    expect(new InvalidPlanScenarioError('Invalid.').name).toBe('InvalidPlanScenarioError');
  });

  it('keeps valid safe-integer cents exact and wraps finite route arithmetic failures', () => {
    const input = graph([{ id: 'edge', from: 'origin', to: 'target', blockers: ['repair'] }],
      [['target', 'target']], [{ id: 'repair', cost: Number.MAX_SAFE_INTEGER }]);
    expect(comparePlans(input, request(input, Number.MAX_SAFE_INTEGER)).exact.spendCents).toBe(Number.MAX_SAFE_INTEGER);
    const overflow = graph([
      { id: 'first', from: 'origin', to: 'middle', length: Number.MAX_VALUE },
      { id: 'last', from: 'middle', to: 'target', length: Number.MAX_VALUE },
    ], [['target', 'target']], []);
    expect(() => comparePlans(overflow, request(overflow))).toThrow(InvalidPlanScenarioError);
  });
});
