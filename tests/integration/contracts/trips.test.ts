import { describe, expect, it } from 'vitest';
import { ScenarioSchema } from '../../../src/contracts/curb';
import {
  STEP_FREE_PROFILE_ID,
  TRIP_CONTRACT_VERSION,
  TRIP_ERROR_HTTP_STATUS,
  TripEdgeAssessmentSchema,
  TripEvaluationSchema,
  TripFailureSchema,
  TripRepairSchema,
  TripRequestSchema,
  TripResponseSchema,
  TripRouteResultSchema,
  TripScenarioQuerySchema,
  TripScenarioResponseSchema,
  TripScenarioSchema,
  type TripEvaluation,
  type TripRequest,
  type TripRouteResult,
  type TripScenario,
} from '../../../src/contracts/curb/trips';

function makeScenario(): TripScenario {
  return {
    schemaVersion: 1,
    contractVersion: TRIP_CONTRACT_VERSION,
    scenario: {
      schemaVersion: 1,
      id: 'synthetic-contract-trip',
      revision: 1,
      title: 'Synthetic contract example',
      dataKind: 'synthetic',
      nodes: [
        { id: 'origin', coordinate: [-74.65, 40.34] },
        { id: 'entrance', coordinate: [-74.65, 40.341] },
      ],
      edges: [{
        id: 'crossing', fromNodeId: 'origin', toNodeId: 'entrance',
        geometry: { type: 'LineString', coordinates: [[-74.65, 40.34], [-74.65, 40.341]] },
        lengthMeters: 12, bidirectional: false, barrierIds: ['curb'],
      }],
      destinations: [{ id: 'library', label: 'Example library', nodeId: 'entrance' }],
      barriers: [{
        id: 'curb', edgeId: 'crossing', kind: 'missing_ramp',
        reviewStatus: 'pending', evidenceIds: ['curb-note'], note: 'Invented curb.',
      }],
      evidence: [{ id: 'curb-note', kind: 'note', origin: 'synthetic', caption: 'Invented evidence.' }],
    },
    profile: {
      id: STEP_FREE_PROFILE_ID,
      label: 'Step-free demo',
      description: 'Illustrative step-free trip using explicit assessments only.',
    },
    assumptions: ['Invented conditions; no measured slope or legal compliance claim.'],
    edgeAssessments: [{
      edgeId: 'crossing', kind: 'crossing', status: 'blocked',
      blockingBarrierIds: ['curb'], reason: 'The invented curb blocks the demo profile.',
    }],
    repairs: [{ id: 'repair-curb', label: 'Clear the curb', barrierId: 'curb', description: 'Assume this blocker is cleared.' }],
    defaults: { originNodeId: 'origin', destinationId: 'library' },
  };
}

const request: TripRequest = {
  contractVersion: TRIP_CONTRACT_VERSION,
  scenarioId: 'synthetic-contract-trip',
  revision: 1,
  profileId: STEP_FREE_PROFILE_ID,
  originNodeId: 'origin',
  destinationId: 'library',
  repairId: 'repair-curb',
};

const blocked: TripRouteResult = { status: 'blocked', blockedEdgeIds: ['crossing'], unknownEdgeIds: [] };
const reachable: TripRouteResult = {
  status: 'reachable', nodeIds: ['origin', 'entrance'], edgeIds: ['crossing'], distanceMeters: 12,
};
const evaluation: TripEvaluation = { ...request, before: blocked, after: reachable };

describe('curb-r1 synthetic trip context', () => {
  it('wraps an unchanged v0 scenario with separately authored trip metadata', () => {
    const input = makeScenario();
    expect(TripScenarioSchema.parse(input)).toEqual(input);
    expect(ScenarioSchema.parse(input.scenario)).toEqual(input.scenario);
    expect(ScenarioSchema.safeParse(input).success).toBe(false);
    expect(TripScenarioSchema.safeParse(input.scenario).success).toBe(false);
  });

  it('requires explicit versions, synthetic data and the one documented profile', () => {
    const input = makeScenario();
    for (const invalid of [
      { ...input, schemaVersion: 2 },
      { ...input, contractVersion: 'curb-v0' },
      { ...input, scenario: { ...input.scenario, dataKind: 'field' } },
      { ...input, profile: { ...input.profile, id: 'any-profile' } },
      { ...input, profile: { ...input.profile, description: '' } },
      { ...input, assumptions: [] },
      { ...input, assumptions: ['   '] },
      { ...input, defaults: { originNodeId: '', destinationId: 'library' } },
    ]) {
      expect(TripScenarioSchema.safeParse(invalid).success).toBe(false);
    }
  });

  it('rejects unknown fields at the wrapper and nested object boundaries', () => {
    const input = makeScenario();
    for (const invalid of [
      { ...input, optimizer: {} },
      { ...input, scenario: { ...input.scenario, profileId: STEP_FREE_PROFILE_ID } },
      { ...input, profile: { ...input.profile, compliance: true } },
      { ...input, defaults: { ...input.defaults, repairId: null } },
      { ...input, repairs: [{ ...input.repairs[0], cost: 10 }] },
      { ...input, edgeAssessments: [{ ...input.edgeAssessments[0], verified: true }] },
    ]) {
      expect(TripScenarioSchema.safeParse(invalid).success).toBe(false);
    }
  });

  it('validates declared assessment semantics without inferring status from v0 data', () => {
    const input = makeScenario();
    const assessment = input.edgeAssessments[0];
    for (const kind of ['walkway', 'crossing', 'entrance']) {
      expect(TripEdgeAssessmentSchema.safeParse({ ...assessment, kind }).success).toBe(true);
    }
    expect(TripEdgeAssessmentSchema.safeParse({ ...assessment, status: 'pass' }).success).toBe(false);
    expect(TripEdgeAssessmentSchema.safeParse({ ...assessment, blockingBarrierIds: [] }).success).toBe(false);
    expect(TripEdgeAssessmentSchema.safeParse({ ...assessment, status: 'pass', blockingBarrierIds: [] }).success).toBe(true);
    expect(TripEdgeAssessmentSchema.safeParse({ ...assessment, status: 'unknown', blockingBarrierIds: [] }).success).toBe(true);
    expect(TripEdgeAssessmentSchema.safeParse({ ...assessment, status: 'unknown' }).success).toBe(true);
    for (const invalid of [
      { ...assessment, kind: 'road' },
      { ...assessment, status: 'verified' },
      { ...assessment, blockingBarrierIds: ['curb', 'curb'] },
      { ...assessment, reason: '' },
      { ...assessment, edgeId: ' ' },
    ]) {
      expect(TripEdgeAssessmentSchema.safeParse(invalid).success).toBe(false);
    }
    input.scenario.barriers[0].reviewStatus = 'rejected';
    expect(TripScenarioSchema.parse(input).edgeAssessments[0].status).toBe('blocked');
  });

  it('represents each eligible repair with exactly one explicit barrier', () => {
    const repair = makeScenario().repairs[0];
    expect(TripRepairSchema.parse(repair)).toEqual(repair);
    for (const invalid of [
      { ...repair, barrierId: ['curb', 'obstruction'] },
      { ...repair, barrierId: '' },
      { ...repair, barrierIds: ['curb'] },
    ]) {
      expect(TripRepairSchema.safeParse(invalid).success).toBe(false);
    }
  });

  it('accepts only an optional nonempty GET scenario selector, without inserting a fallback', () => {
    expect(TripScenarioQuerySchema.parse({})).toEqual({});
    expect(TripScenarioQuerySchema.parse({ scenarioId: 'not-found' })).toEqual({ scenarioId: 'not-found' });
    expect(TripScenarioQuerySchema.safeParse({ scenarioId: '' }).success).toBe(false);
    expect(TripScenarioQuerySchema.safeParse({ dataset: 'sample' }).success).toBe(false);
  });
});

describe('curb-r1 trip request and result', () => {
  it('requires all identity and version fields and an explicit nullable single repair', () => {
    expect(TripRequestSchema.parse(request)).toEqual(request);
    expect(TripRequestSchema.parse({ ...request, repairId: null }).repairId).toBeNull();
    for (const key of Object.keys(request)) {
      const incomplete: Record<string, unknown> = { ...request };
      delete incomplete[key];
      expect(TripRequestSchema.safeParse(incomplete).success).toBe(false);
    }
    for (const invalid of [
      { ...request, revision: -1 },
      { ...request, revision: 1.5 },
      { ...request, scenarioId: '' },
      { ...request, originNodeId: ' ' },
      { ...request, destinationId: '' },
      { ...request, repairId: '' },
      { ...request, repairId: ['repair-curb'] },
      { ...request, repairIds: [] },
      { ...request, profileId: 'other' },
      { ...request, contractVersion: 'curb-v0' },
    ]) {
      expect(TripRequestSchema.safeParse(invalid).success).toBe(false);
    }
    expect(TripRequestSchema.parse({ ...request, scenarioId: ' exact identity ' }).scenarioId).toBe(' exact identity ');
  });

  it.each<TripRouteResult>([
    reachable,
    { status: 'reachable', nodeIds: ['origin'], edgeIds: [], distanceMeters: 0 },
    { status: 'unknown', blockedEdgeIds: [], unknownEdgeIds: ['unreviewed-crossing'] },
    blocked,
    { status: 'blocked', blockedEdgeIds: ['crossing'], unknownEdgeIds: ['unreviewed-entrance'] },
    { status: 'disconnected', blockedEdgeIds: [], unknownEdgeIds: [] },
  ])('accepts a structurally valid $status result', (route) => {
    expect(TripRouteResultSchema.parse(route)).toEqual(route);
  });

  it('rejects plausible path fields on every failure result', () => {
    for (const route of [
      blocked,
      { status: 'unknown', blockedEdgeIds: [], unknownEdgeIds: ['crossing'] },
      { status: 'disconnected', blockedEdgeIds: [], unknownEdgeIds: [] },
    ]) {
      for (const field of [{ nodeIds: ['origin'] }, { edgeIds: ['crossing'] }, { distanceMeters: 12 }]) {
        expect(TripRouteResultSchema.safeParse({ ...route, ...field }).success).toBe(false);
      }
    }
  });

  it('rejects contradictory, repeated or incomplete result fields', () => {
    for (const invalid of [
      { ...reachable, nodeIds: [] },
      { ...reachable, nodeIds: ['origin'] },
      { ...reachable, nodeIds: ['origin', 'origin'] },
      { ...reachable, distanceMeters: 0 },
      { ...reachable, distanceMeters: -1 },
      { ...reachable, distanceMeters: Infinity },
      { ...reachable, blockedEdgeIds: [] },
      { status: 'reachable', nodeIds: ['origin'], edgeIds: [], distanceMeters: 1 },
      { ...blocked, blockedEdgeIds: [] },
      { ...blocked, blockedEdgeIds: ['crossing', 'crossing'] },
      { ...blocked, unknownEdgeIds: ['crossing'] },
      { status: 'unknown', blockedEdgeIds: [], unknownEdgeIds: [] },
      { status: 'unknown', blockedEdgeIds: ['crossing'], unknownEdgeIds: ['entrance'] },
      { status: 'disconnected', blockedEdgeIds: [], unknownEdgeIds: ['crossing'] },
      { status: 'blocked', blockedEdgeIds: ['crossing'] },
    ]) {
      expect(TripRouteResultSchema.safeParse(invalid).success).toBe(false);
    }
  });

  it('echoes the exact request identity and rejects the wrong reachable origin', () => {
    const parsed = TripEvaluationSchema.parse(evaluation);
    const { before, after, ...identity } = parsed;
    expect(identity).toEqual(request);
    expect(before).toEqual(blocked);
    expect(after).toEqual(reachable);
    expect(TripEvaluationSchema.safeParse({ ...evaluation, originNodeId: 'another-node' }).success).toBe(false);
    expect(TripEvaluationSchema.safeParse({ ...evaluation, before: { ...reachable, nodeIds: ['another-node', 'entrance'] } }).success).toBe(false);
    expect(TripEvaluationSchema.safeParse({ ...evaluation, aiSummary: '' }).success).toBe(false);
  });

  it('requires identical before/after when repairId is null, including zero-length trips', () => {
    expect(TripEvaluationSchema.safeParse({ ...evaluation, repairId: null }).success).toBe(false);
    expect(TripEvaluationSchema.parse({ ...request, repairId: null, before: blocked, after: blocked }).after).toEqual(blocked);
    const zeroLength = { status: 'reachable', nodeIds: ['origin'], edgeIds: [], distanceMeters: 0 };
    expect(TripEvaluationSchema.safeParse({ ...request, repairId: null, before: zeroLength, after: zeroLength }).success).toBe(true);
  });
});

describe('curb-r1 API envelopes', () => {
  it('uses the same versioned success envelope for context and evaluation', () => {
    expect(TripScenarioResponseSchema.parse({ contractVersion: TRIP_CONTRACT_VERSION, ok: true, data: makeScenario() }).ok).toBe(true);
    expect(TripResponseSchema.parse({ contractVersion: TRIP_CONTRACT_VERSION, ok: true, data: evaluation }).ok).toBe(true);
    expect(TripResponseSchema.safeParse({ ok: true, data: evaluation }).success).toBe(false);
    expect(TripResponseSchema.safeParse({ contractVersion: 'curb-v0', ok: true, data: evaluation }).success).toBe(false);
  });

  it.each(Object.entries(TRIP_ERROR_HTTP_STATUS))('accepts the shared %s error envelope (HTTP %i)', (code) => {
    const failure = { contractVersion: TRIP_CONTRACT_VERSION, ok: false, error: { code, message: 'Explicit failure.' } };
    expect(TripFailureSchema.parse(failure)).toEqual(failure);
    expect(TripScenarioResponseSchema.parse(failure)).toEqual(failure);
    expect(TripResponseSchema.parse(failure)).toEqual(failure);
  });

  it('freezes HTTP code agreement and rejects malformed or mixed envelopes', () => {
    expect(TRIP_ERROR_HTTP_STATUS).toEqual({
      INVALID_REQUEST: 400, SCENARIO_NOT_FOUND: 404, STALE_SCENARIO: 409, INVALID_SERVER_SCENARIO: 500,
    });
    const failure = { contractVersion: TRIP_CONTRACT_VERSION, ok: false, error: { code: 'INVALID_REQUEST', message: 'Invalid selection.' } };
    for (const invalid of [
      { ...failure, error: { code: 'SCENARIO_UNAVAILABLE', message: 'Unsupported code.' } },
      { ...failure, error: { code: 'INVALID_REQUEST', message: '' } },
      { ...failure, error: { code: 'INVALID_REQUEST', message: 'Bad request.', stack: 'private' } },
      { ...failure, data: evaluation },
      { ...failure, ok: true },
      { contractVersion: TRIP_CONTRACT_VERSION, ok: true },
      { contractVersion: TRIP_CONTRACT_VERSION, ok: true, data: evaluation, fallback: true },
    ]) {
      expect(TripResponseSchema.safeParse(invalid).success).toBe(false);
    }
  });
});
