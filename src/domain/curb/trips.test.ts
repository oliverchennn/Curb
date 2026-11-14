import { describe, expect, it } from 'vitest';
import type { Edge } from '../../contracts/curb';
import {
  TripEvaluationSchema,
  type TripRequest,
  type TripScenario,
} from '../../contracts/curb/trips';
import tripDemo from '../../data/curb/trip-demo.json';
import {
  evaluateTrip,
  InvalidTripScenarioError,
  prepareTripEvaluator,
  TripRequestError,
  validateTripScenario,
} from './trips';

const context = () => validateTripScenario(tripDemo);
const request = (input: TripScenario, overrides: Partial<TripRequest> = {}): TripRequest => ({
  contractVersion: input.contractVersion,
  scenarioId: input.scenario.id,
  revision: input.scenario.revision,
  profileId: input.profile.id,
  ...input.defaults,
  repairId: null,
  ...overrides,
});

describe('prepared route projections', () => {
  it('uses the R1 route core for multiple cleared blockers and ordered destinations', () => {
    const input = context();
    const evaluator = prepareTripEvaluator(input);
    const target = input.scenario.destinations.find(({ id }) => id === 'service')!.nodeId;
    const blockers = ['move-service-crate', 'resurface-service-entry'].map((id) =>
      input.repairs.find((repair) => repair.id === id)!.barrierId);
    const before = evaluator.evaluateRoutes(input.defaults.originNodeId, [target], new Set())[0];
    expect(before).toEqual(evaluateTrip(input, request(input, { destinationId: 'service' })).before);
    for (const blocker of blockers) {
      expect(evaluator.evaluateRoutes(input.defaults.originNodeId, [target], new Set([blocker]))[0]).toEqual(before);
    }
    const routes = evaluator.evaluateRoutes(input.defaults.originNodeId, [target, input.defaults.originNodeId], new Set(blockers));
    expect(routes[0].status).toBe('reachable');
    expect(routes[1]).toEqual({ status: 'reachable', nodeIds: [input.defaults.originNodeId], edgeIds: [], distanceMeters: 0 });
    expect(evaluator.evaluateRoutes(input.defaults.originNodeId, [target], new Set())[0]).toEqual(before);
  });

  it('snapshots mutable graph inputs and returns independent route results', () => {
    const input = graph([{ id: 'edge', fromNodeId: 'origin', toNodeId: 'destination', lengthMeters: 2 }]);
    const evaluator = prepareTripEvaluator(input);
    expect(Object.isFrozen(evaluator)).toBe(true);
    input.scenario.edges[0].lengthMeters = 999;
    input.scenario.edges[0].toNodeId = 'a';
    input.edgeAssessments[0].status = 'unknown';
    input.edgeAssessments[0].blockingBarrierIds.push('later-blocker');
    const expected = { status: 'reachable', nodeIds: ['origin', 'destination'], edgeIds: ['edge'], distanceMeters: 2 };
    const first = evaluator.evaluateRoutes('origin', ['destination'], new Set())[0];
    expect(first).toEqual(expected);
    if (first.status === 'reachable') first.nodeIds.reverse();
    expect(evaluator.evaluateRoutes('origin', ['destination'], new Set())[0]).toEqual(expected);
  });

  it('retains the existing R1 context error when route lengths overflow', () => {
    const input = graph([
      { id: 'first', fromNodeId: 'origin', toNodeId: 'a', lengthMeters: Number.MAX_VALUE },
      { id: 'second', fromNodeId: 'a', toNodeId: 'destination', lengthMeters: Number.MAX_VALUE },
    ]);
    expect(() => evaluateTrip(input, request(input))).toThrow(InvalidTripScenarioError);
  });
});

function freezeDeep(value: unknown): void {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const child of Object.values(value)) freezeDeep(child);
  }
}

type TestEdge = Pick<Edge, 'id' | 'fromNodeId' | 'toNodeId' | 'lengthMeters'> & { bidirectional?: boolean };
function graph(edges: TestEdge[]): TripScenario {
  const input = context();
  input.scenario.nodes = ['origin', 'a', 'b', 'destination'].map((id, index) => ({
    id, label: `Synthetic ${id}`, coordinate: [index / 1000, 0],
  }));
  input.scenario.edges = edges.map((edge) => ({
    ...edge,
    bidirectional: edge.bidirectional ?? false,
    barrierIds: [],
    geometry: { type: 'LineString', coordinates: [[0, 0], [0.001, 0]] },
  }));
  input.scenario.destinations = [{ id: 'target', label: 'Synthetic target', nodeId: 'destination' }];
  input.scenario.barriers = [];
  input.scenario.evidence = [];
  input.edgeAssessments = edges.map(({ id }) => ({
    edgeId: id, kind: 'walkway', status: 'pass', blockingBarrierIds: [], reason: 'Authored synthetic test assumption.',
  }));
  input.repairs = [];
  input.defaults = { originNodeId: 'origin', destinationId: 'target' };
  return validateTripScenario(input);
}

describe('validateTripScenario', () => {
  it('returns an independently parsed valid context without mutating it', () => {
    const original = structuredClone(tripDemo);
    freezeDeep(original);
    const parsed = validateTripScenario(original);
    expect(parsed).toEqual(original);
    expect(parsed).not.toBe(original);
    parsed.assumptions.push('Independent caller copy.');
    expect(original).toEqual(tripDemo);
  });

  it.each([
    ['unknown metadata', (input: TripScenario) => Object.assign(input, { inferredPassability: true })],
    ['missing assessment', (input: TripScenario) => input.edgeAssessments.pop()],
    ['duplicate assessment', (input: TripScenario) => input.edgeAssessments.push(input.edgeAssessments[0])],
    ['orphan assessment', (input: TripScenario) => { input.edgeAssessments[0].edgeId = 'absent-edge'; }],
    ['duplicate repair', (input: TripScenario) => input.repairs.push(input.repairs[0])],
    ['missing repair barrier', (input: TripScenario) => { input.repairs[0].barrierId = 'absent-barrier'; }],
    ['missing default origin', (input: TripScenario) => { input.defaults.originNodeId = 'absent-node'; }],
    ['missing default destination', (input: TripScenario) => { input.defaults.destinationId = 'absent-destination'; }],
    ['missing endpoint', (input: TripScenario) => { input.scenario.edges[0].toNodeId = 'absent-node'; }],
    ['duplicate node', (input: TripScenario) => input.scenario.nodes.push(input.scenario.nodes[0])],
    ['missing evidence', (input: TripScenario) => input.scenario.evidence.pop()],
    ['unlinked barrier', (input: TripScenario) => { input.scenario.edges.find((edge) => edge.id === 'library-crossing')!.barrierIds = []; }],
    ['field evidence', (input: TripScenario) => { input.scenario.evidence[0].origin = 'field'; }],
    ['field scenario', (input: TripScenario) => { input.scenario.dataKind = 'field'; }],
    ['no assumptions', (input: TripScenario) => { input.assumptions = []; }],
    ['blank assumptions', (input: TripScenario) => { input.assumptions = [' ']; }],
    ['zero edge length', (input: TripScenario) => { input.scenario.edges[0].lengthMeters = 0; }],
    ['infinite edge length', (input: TripScenario) => { input.scenario.edges[0].lengthMeters = Infinity; }],
    ['NaN edge length', (input: TripScenario) => { input.scenario.edges[0].lengthMeters = NaN; }],
  ])('rejects %s with the context error type', (_label, mutate) => {
    const input = context();
    mutate(input);
    expect(() => validateTripScenario(input)).toThrow(InvalidTripScenarioError);
  });

  it('requires every blocker to belong to its assessed edge', () => {
    const input = context();
    input.edgeAssessments.find((assessment) => assessment.edgeId === 'library-crossing')!.blockingBarrierIds = ['service-crate'];
    expect(() => validateTripScenario(input)).toThrow(InvalidTripScenarioError);
    input.edgeAssessments.find((assessment) => assessment.edgeId === 'library-crossing')!.blockingBarrierIds = ['missing'];
    expect(() => validateTripScenario(input)).toThrow(InvalidTripScenarioError);
  });

  it('rejects repairs for listed barriers that are not assessment blockers', () => {
    const input = context();
    const assessment = input.edgeAssessments.find((record) => record.edgeId === 'library-crossing')!;
    assessment.status = 'pass';
    assessment.blockingBarrierIds = [];
    expect(() => validateTripScenario(input)).toThrow(InvalidTripScenarioError);
    input.repairs = input.repairs.filter((repair) => repair.id !== 'add-library-ramp');
    expect(validateTripScenario(input)).toEqual(input);
  });

  it.each(['pass-with-blockers', 'blocked-without-blockers', 'repeated-blocker'] as const)(
    'rejects inconsistent assessment %s', (kind) => {
      const input = context();
      const assessment = input.edgeAssessments.find((record) => record.edgeId === 'library-crossing')!;
      if (kind === 'pass-with-blockers') assessment.status = 'pass';
      if (kind === 'blocked-without-blockers') assessment.blockingBarrierIds = [];
      if (kind === 'repeated-blocker') assessment.blockingBarrierIds.push(assessment.blockingBarrierIds[0]);
      expect(() => validateTripScenario(input)).toThrow(InvalidTripScenarioError);
    },
  );

  it('checks synthetic origin even for unlinked evidence', () => {
    const input = context();
    input.scenario.evidence.push({ id: 'unlinked-field', origin: 'field', kind: 'note', caption: 'Invalid field attribution.' });
    expect(() => validateTripScenario(input)).toThrow(InvalidTripScenarioError);
  });

  it('keeps the context error name fixed', () => {
    expect(new InvalidTripScenarioError('Invalid context.').name).toBe('InvalidTripScenarioError');
  });
});

describe('evaluateTrip request boundary', () => {
  it.each([
    ['profile', { profileId: 'another-profile' }],
    ['contract', { contractVersion: 'curb-v0' }],
    ['origin', { originNodeId: 'missing-origin' }],
    ['destination', { destinationId: 'missing-destination' }],
    ['repair', { repairId: 'missing-repair' }],
    ['multiple repairs', { repairId: ['add-library-ramp', 'move-service-crate'] }],
    ['extra fields', { inferred: true }],
    ['blank ID', { originNodeId: ' ' }],
  ])('rejects invalid %s', (_label, overrides) => {
    const input = context();
    expect(() => evaluateTrip(input, { ...request(input), ...overrides } as TripRequest)).toThrow(
      expect.objectContaining({ name: 'TripRequestError', code: 'INVALID_REQUEST' }),
    );
  });

  it('rejects an omitted repair selection rather than defaulting it', () => {
    const input = context();
    const incomplete: Partial<TripRequest> = request(input);
    delete incomplete.repairId;
    expect(() => evaluateTrip(input, incomplete as TripRequest)).toThrow(TripRequestError);
  });

  it('distinguishes missing scenario and stale revision', () => {
    const input = context();
    expect(() => evaluateTrip(input, request(input, { scenarioId: 'missing-scenario' }))).toThrow(
      expect.objectContaining({ code: 'SCENARIO_NOT_FOUND' }),
    );
    expect(() => evaluateTrip(input, request(input, { revision: input.scenario.revision + 1 }))).toThrow(
      expect.objectContaining({ code: 'STALE_SCENARIO' }),
    );
  });

  it('validates server context before evaluating any request', () => {
    const input = context();
    input.edgeAssessments.pop();
    expect(() => evaluateTrip(input, request(input))).toThrow(InvalidTripScenarioError);
  });

  it('exposes the agreed code/message constructor', () => {
    const error = new TripRequestError('STALE_SCENARIO', 'Reload this example.');
    expect(error).toMatchObject({ name: 'TripRequestError', code: 'STALE_SCENARIO', message: 'Reload this example.' });
  });
});

describe('directed shortest trip paths', () => {
  it('chooses total length rather than number of edges', () => {
    const input = graph([
      { id: 'direct', fromNodeId: 'origin', toNodeId: 'destination', lengthMeters: 10 },
      { id: 'via-a', fromNodeId: 'origin', toNodeId: 'a', lengthMeters: 2 },
      { id: 'via-b', fromNodeId: 'a', toNodeId: 'b', lengthMeters: 2 },
      { id: 'finish', fromNodeId: 'b', toNodeId: 'destination', lengthMeters: 2 },
    ]);
    expect(evaluateTrip(input, request(input)).before).toEqual({
      status: 'reachable', nodeIds: ['origin', 'a', 'b', 'destination'],
      edgeIds: ['via-a', 'via-b', 'finish'], distanceMeters: 6,
    });
  });

  it('respects one-way edges and permits authored bidirectional reverse travel', () => {
    const input = graph([{ id: 'reverse', fromNodeId: 'destination', toNodeId: 'origin', lengthMeters: 3 }]);
    expect(evaluateTrip(input, request(input)).before.status).toBe('disconnected');
    input.scenario.edges[0].bidirectional = true;
    expect(evaluateTrip(input, request(input)).before).toEqual({
      status: 'reachable', nodeIds: ['origin', 'destination'], edgeIds: ['reverse'], distanceMeters: 3,
    });
  });

  it('returns a zero-edge, zero-distance same-node trip', () => {
    const input = context();
    const result = evaluateTrip(input, request(input, { originNodeId: 'library-door' }));
    expect(result.before).toEqual({ status: 'reachable', nodeIds: ['library-door'], edgeIds: [], distanceMeters: 0 });
    expect(result.after).toEqual(result.before);
    expect(TripEvaluationSchema.safeParse(result).success).toBe(true);
  });

  it('breaks equal-length ties by full ordered edge IDs independent of input order', () => {
    const input = graph([
      { id: 'z-first', fromNodeId: 'origin', toNodeId: 'a', lengthMeters: 2 },
      { id: 'a-finish', fromNodeId: 'a', toNodeId: 'destination', lengthMeters: 2 },
      { id: 'a-first', fromNodeId: 'origin', toNodeId: 'b', lengthMeters: 1 },
      { id: 'z-finish', fromNodeId: 'b', toNodeId: 'destination', lengthMeters: 3 },
      { id: 'a-parallel', fromNodeId: 'origin', toNodeId: 'b', lengthMeters: 1 },
    ]);
    const expected = evaluateTrip(input, request(input));
    expect(expected.before).toMatchObject({ edgeIds: ['a-first', 'z-finish'], distanceMeters: 4 });
    input.scenario.nodes.reverse();
    input.scenario.edges.reverse();
    input.scenario.destinations.reverse();
    input.edgeAssessments.reverse();
    expect(evaluateTrip(input, request(input))).toEqual(expected);
  });

  it('uses locale-independent ID comparison', () => {
    const input = graph([
      { id: 'a', fromNodeId: 'origin', toNodeId: 'destination', lengthMeters: 1 },
      { id: 'Z', fromNodeId: 'origin', toNodeId: 'destination', lengthMeters: 1 },
    ]);
    expect(evaluateTrip(input, request(input)).before).toMatchObject({ edgeIds: ['Z'] });
  });

  it('ignores positive loops and does not treat geometric intersections as connections', () => {
    const input = graph([
      { id: 'loop', fromNodeId: 'origin', toNodeId: 'origin', lengthMeters: 1, bidirectional: true },
      { id: 'left', fromNodeId: 'origin', toNodeId: 'a', lengthMeters: 1 },
      { id: 'right', fromNodeId: 'b', toNodeId: 'destination', lengthMeters: 1 },
    ]);
    expect(evaluateTrip(input, request(input)).before).toEqual({ status: 'disconnected', blockedEdgeIds: [], unknownEdgeIds: [] });
  });
});

describe('repair projections and failure witnesses', () => {
  it('clears only one named blocker on an edge with two conditions', () => {
    const input = context();
    for (const repairId of ['move-service-crate', 'resurface-service-entry']) {
      const result = evaluateTrip(input, request(input, { destinationId: 'service', repairId }));
      expect(result.before).toEqual({ status: 'blocked', blockedEdgeIds: ['service-entrance'], unknownEdgeIds: [] });
      expect(result.after).toEqual(result.before);
    }
  });

  it('keeps an unknown edge with a known blocker blocked until cleared, then unknown', () => {
    const input = context();
    input.edgeAssessments.find((assessment) => assessment.edgeId === 'library-crossing')!.status = 'unknown';
    const result = evaluateTrip(input, request(input, { repairId: 'add-library-ramp' }));
    expect(result.before).toEqual({ status: 'blocked', blockedEdgeIds: ['library-crossing'], unknownEdgeIds: [] });
    expect(result.after).toEqual({ status: 'unknown', blockedEdgeIds: [], unknownEdgeIds: ['library-crossing'] });
    expect(TripEvaluationSchema.safeParse(result).success).toBe(true);
  });

  it('does not convert unrelated unknown coverage or rejected barriers to passability', () => {
    const input = context();
    input.scenario.barriers.forEach((barrier) => { barrier.reviewStatus = 'rejected'; });
    const result = evaluateTrip(input, request(input, { destinationId: 'studio', repairId: 'add-library-ramp' }));
    expect(result.before).toEqual({ status: 'unknown', blockedEdgeIds: [], unknownEdgeIds: ['studio-walk'] });
    expect(result.after).toEqual(result.before);
    expect(evaluateTrip(input, request(input)).before.status).toBe('blocked');
  });

  it('prefers a longer unknown-only potential connection to a shorter blocked connection', () => {
    const input = context();
    const crossing = input.scenario.edges.find((edge) => edge.id === 'library-crossing')!;
    input.scenario.edges.push({
      ...crossing, id: 'unreviewed-detour', lengthMeters: 100,
      fromNodeId: 'commons', toNodeId: 'library-door', barrierIds: [], bidirectional: false,
    });
    input.edgeAssessments.push({
      edgeId: 'unreviewed-detour', kind: 'walkway', status: 'unknown',
      blockingBarrierIds: [], reason: 'Unassessed synthetic detour.',
    });
    const result = evaluateTrip(input, request(input));
    expect(result.before).toEqual({ status: 'unknown', blockedEdgeIds: [], unknownEdgeIds: ['unreviewed-detour'] });
    expect(result.after).toEqual(result.before);
  });

  it('reports disjoint blocked/unknown witness lists without a plausible route or distance', () => {
    const input = context();
    input.edgeAssessments.find((assessment) => assessment.edgeId === 'library-entrance')!.status = 'unknown';
    const result = evaluateTrip(input, request(input));
    expect(result.before).toEqual({
      status: 'blocked', blockedEdgeIds: ['library-crossing'], unknownEdgeIds: ['library-entrance'],
    });
    expect(result.before).not.toHaveProperty('nodeIds');
    expect(result.before).not.toHaveProperty('edgeIds');
    expect(result.before).not.toHaveProperty('distanceMeters');
    expect(TripEvaluationSchema.safeParse(result).success).toBe(true);
  });

  it('keeps witness choice deterministic under metadata and graph reorderings', () => {
    const input = context();
    const selection = request(input, { destinationId: 'service', repairId: 'move-service-crate' });
    const expected = evaluateTrip(input, selection);
    input.scenario.nodes.reverse();
    input.scenario.edges.reverse();
    input.scenario.barriers.reverse();
    input.scenario.evidence.reverse();
    input.edgeAssessments.reverse();
    input.edgeAssessments.forEach((assessment) => assessment.blockingBarrierIds.reverse());
    input.repairs.reverse();
    expect(evaluateTrip(input, selection)).toEqual(expected);
  });

  it('repeated repairs leave frozen evidence, source assessments and requests unchanged', () => {
    const input = context();
    const selection = request(input, { repairId: 'add-library-ramp' });
    const snapshot = structuredClone(input);
    const requestSnapshot = structuredClone(selection);
    freezeDeep(input);
    freezeDeep(selection);
    const first = evaluateTrip(input, selection);
    expect(first.before.status).toBe('blocked');
    expect(first.after.status).toBe('reachable');
    expect(evaluateTrip(input, selection)).toEqual(first);
    expect(evaluateTrip(input, request(input)).before.status).toBe('blocked');
    expect(input).toEqual(snapshot);
    expect(selection).toEqual(requestSnapshot);
    expect(first).toMatchObject(selection);
    expect(TripEvaluationSchema.safeParse(first).success).toBe(true);
  });
});
