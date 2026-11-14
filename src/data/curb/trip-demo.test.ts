import { describe, expect, it } from 'vitest';
import { ScenarioSchema } from '../../contracts/curb';
import {
  TripEvaluationSchema,
  TripScenarioSchema,
  type TripRequest,
  type TripScenario,
} from '../../contracts/curb/trips';
import { buildScenarioView, getBarrierDetail } from '../../domain/curb';
import { evaluateTrip, validateTripScenario } from '../../domain/curb/trips';
import sample from './sample.json';
import tripDemo from './trip-demo.json';

function requestFor(
  context: TripScenario,
  selection: Partial<Pick<TripRequest, 'originNodeId' | 'destinationId' | 'repairId'>> = {},
): TripRequest {
  return {
    contractVersion: context.contractVersion,
    scenarioId: context.scenario.id,
    revision: context.scenario.revision,
    profileId: context.profile.id,
    originNodeId: context.defaults.originNodeId,
    destinationId: context.defaults.destinationId,
    repairId: null,
    ...selection,
  };
}

function freezeDeep<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    Object.values(value).forEach((child) => freezeDeep(child));
    Object.freeze(value);
  }
  return value;
}

describe('Curb R1 trip demo fixture', () => {
  it('validates a separate synthetic scenario with stable defaults and counts', () => {
    expect(TripScenarioSchema.safeParse(tripDemo).success).toBe(true);
    const context = validateTripScenario(tripDemo);

    expect(context).toMatchObject({
      schemaVersion: 1,
      contractVersion: 'curb-r1',
      scenario: {
        schemaVersion: 1,
        id: 'synthetic-campus-links',
        revision: 1,
        dataKind: 'synthetic',
      },
      profile: { id: 'step-free-demo' },
      defaults: { originNodeId: 'arrival', destinationId: 'library' },
    });
    expect(buildScenarioView(context.scenario).counts).toEqual({
      nodes: 8, edges: 6, destinations: 5, barriers: 3, evidence: 3,
    });
    expect(context.edgeAssessments).toHaveLength(6);
    expect(context.repairs).toHaveLength(3);
    expect(context.scenario.nodes.every(({ coordinate }) =>
      coordinate.every((position) => Math.abs(position) < 0.001),
    )).toBe(true);
    expect(context.assumptions.join(' ')).toMatch(/entirely synthetic schematic/i);
    expect(context.assumptions.join(' ')).toMatch(/step-free.*authored assessment/i);
    expect(context.assumptions.join(' ')).toMatch(/passability is independent of evidence review status/i);
  });

  it('preserves named graph endpoints, direction, distance and explicit assessment coverage', () => {
    const context = validateTripScenario(tripDemo);
    const assessments = new Map(context.edgeAssessments.map((assessment) => [assessment.edgeId, assessment]));

    expect(context.scenario.nodes.map(({ id, label }) => [id, label])).toEqual([
      ['arrival', 'Welcome court'],
      ['commons', 'Commons junction'],
      ['crossing-east', 'Library crossing east'],
      ['library-door', 'Library entry'],
      ['cafe-door', 'Cafe entry'],
      ['studio-door', 'Studio entry'],
      ['archive-door', 'Archive entry'],
      ['service-door', 'Service entry'],
    ]);
    expect(context.scenario.edges.map((edge) => {
      const assessment = assessments.get(edge.id)!;
      return [
        edge.id, edge.fromNodeId, edge.toNodeId, edge.lengthMeters, edge.bidirectional,
        assessment.kind, assessment.status, assessment.blockingBarrierIds,
      ];
    })).toEqual([
      ['arrival-walk', 'arrival', 'commons', 40, true, 'walkway', 'pass', []],
      ['library-crossing', 'commons', 'crossing-east', 12, true, 'crossing', 'blocked', ['library-crossing-curb']],
      ['library-entrance', 'crossing-east', 'library-door', 8, false, 'entrance', 'pass', []],
      ['cafe-walk', 'commons', 'cafe-door', 20, true, 'walkway', 'pass', []],
      ['studio-walk', 'commons', 'studio-door', 30, false, 'walkway', 'unknown', []],
      ['service-entrance', 'commons', 'service-door', 18, false, 'entrance', 'blocked', ['service-crate', 'service-surface']],
    ]);
    expect(context.scenario.destinations.map(({ id, nodeId }) => [id, nodeId])).toEqual([
      ['library', 'library-door'], ['cafe', 'cafe-door'], ['studio', 'studio-door'],
      ['archive', 'archive-door'], ['service', 'service-door'],
    ]);
    expect(context.edgeAssessments.every(({ reason }) => /authored|synthetic/i.test(reason))).toBe(true);
    expect(context.repairs.map(({ id, barrierId }) => [id, barrierId])).toEqual([
      ['add-library-ramp', 'library-crossing-curb'],
      ['move-service-crate', 'service-crate'],
      ['resurface-service-entry', 'service-surface'],
    ]);
  });

  it('links meaningful synthetic note evidence without inferring passability from review', () => {
    const { scenario } = validateTripScenario(tripDemo);
    expect(scenario.barriers.map(({ id, kind, reviewStatus, evidenceIds }) => ({
      id, kind, reviewStatus, evidenceIds,
    }))).toEqual([
      {
        id: 'library-crossing-curb', kind: 'missing_ramp', reviewStatus: 'accepted',
        evidenceIds: ['library-crossing-curb-note'],
      },
      {
        id: 'service-crate', kind: 'obstruction', reviewStatus: 'rejected',
        evidenceIds: ['service-crate-note'],
      },
      {
        id: 'service-surface', kind: 'surface_issue', reviewStatus: 'pending',
        evidenceIds: ['service-surface-note'],
      },
    ]);
    for (const barrier of scenario.barriers) {
      const detail = getBarrierDetail(scenario, barrier.id)!;
      expect(detail.evidence.map(({ id }) => id)).toEqual(barrier.evidenceIds);
      expect(detail.evidence).toHaveLength(1);
      expect(detail.evidence[0]).toMatchObject({
        kind: 'note', origin: 'synthetic', attribution: 'Curb R1 synthetic fixture authors',
      });
      expect(detail.evidence[0].caption).toMatch(/synthetic/i);
      expect(detail.evidence[0].note).toMatch(/authored illustration/i);
    }
    const context = validateTripScenario(tripDemo);
    expect(evaluateTrip(context, requestFor(context)).before.status).toBe('blocked');
    expect(evaluateTrip(context, requestFor(context, { destinationId: 'service' })).before.status).toBe('blocked');
  });

  it('keeps the default library trip blocked without a repair', () => {
    const context = validateTripScenario(tripDemo);
    const request = requestFor(context);
    const evaluation = evaluateTrip(context, request);

    expect(evaluation).toEqual({
      ...request,
      before: { status: 'blocked', blockedEdgeIds: ['library-crossing'], unknownEdgeIds: [] },
      after: { status: 'blocked', blockedEdgeIds: ['library-crossing'], unknownEdgeIds: [] },
    });
    expect(TripEvaluationSchema.safeParse(evaluation).success).toBe(true);
  });

  it('restores the golden 60 meter library trip only in the hypothetical repair projection', () => {
    const context = validateTripScenario(tripDemo);
    const request = requestFor(context, { repairId: 'add-library-ramp' });

    expect(evaluateTrip(context, request)).toEqual({
      ...request,
      before: { status: 'blocked', blockedEdgeIds: ['library-crossing'], unknownEdgeIds: [] },
      after: {
        status: 'reachable',
        nodeIds: ['arrival', 'commons', 'crossing-east', 'library-door'],
        edgeIds: ['arrival-walk', 'library-crossing', 'library-entrance'],
        distanceMeters: 60,
      },
    });
  });

  it('keeps the already reachable cafe trip at 60 meters before and after the library repair', () => {
    const context = validateTripScenario(tripDemo);
    const request = requestFor(context, { destinationId: 'cafe', repairId: 'add-library-ramp' });
    const route = {
      status: 'reachable',
      nodeIds: ['arrival', 'commons', 'cafe-door'],
      edgeIds: ['arrival-walk', 'cafe-walk'],
      distanceMeters: 60,
    };

    expect(evaluateTrip(context, request)).toEqual({ ...request, before: route, after: route });
  });

  it('keeps the studio unknown even though no barrier is listed and repairs are available', () => {
    const context = validateTripScenario(tripDemo);
    const route = { status: 'unknown', blockedEdgeIds: [], unknownEdgeIds: ['studio-walk'] };

    for (const repairId of [null, ...context.repairs.map(({ id }) => id)]) {
      const request = requestFor(context, { destinationId: 'studio', repairId });
      expect(evaluateTrip(context, request)).toEqual({ ...request, before: route, after: route });
    }
  });

  it('reports the isolated archive as disconnected before and after a repair', () => {
    const context = validateTripScenario(tripDemo);
    const request = requestFor(context, { destinationId: 'archive', repairId: 'add-library-ramp' });
    const route = { status: 'disconnected', blockedEdgeIds: [], unknownEdgeIds: [] };

    expect(evaluateTrip(context, request)).toEqual({ ...request, before: route, after: route });
  });

  it.each(['move-service-crate', 'resurface-service-entry'])(
    'keeps the service entrance blocked after clearing only %s',
    (repairId) => {
      const context = validateTripScenario(tripDemo);
      const request = requestFor(context, { destinationId: 'service', repairId });
      const route = { status: 'blocked', blockedEdgeIds: ['service-entrance'], unknownEdgeIds: [] };

      expect(evaluateTrip(context, request)).toEqual({ ...request, before: route, after: route });
    },
  );

  it('evaluates frozen fixture data deterministically without changing source assessments or evidence', () => {
    const source = freezeDeep(structuredClone(tripDemo));
    const originalSource = structuredClone(source);
    const context = freezeDeep(validateTripScenario(source));
    const originalContext = structuredClone(context);
    const request = freezeDeep(requestFor(context, { repairId: 'add-library-ramp' }));
    const originalRequest = structuredClone(request);
    const first = evaluateTrip(context, request);

    expect(evaluateTrip(context, request)).toEqual(first);
    evaluateTrip(context, requestFor(context, { destinationId: 'service', repairId: 'move-service-crate' }));
    expect(source).toEqual(originalSource);
    expect(context).toEqual(originalContext);
    expect(request).toEqual(originalRequest);
    expect(evaluateTrip(context, requestFor(context)).after).toEqual({
      status: 'blocked', blockedEdgeIds: ['library-crossing'], unknownEdgeIds: [],
    });
  });

  it('preserves the original foundation sample as a separate fixture', () => {
    const originalSample = structuredClone(sample);
    const context = validateTripScenario(tripDemo);
    evaluateTrip(context, requestFor(context, { repairId: 'add-library-ramp' }));

    expect(sample).toEqual(originalSample);
    const view = buildScenarioView(ScenarioSchema.parse(sample));
    expect(view.scenario.id).toBe('synthetic-campus-quad');
    expect(view.counts).toEqual({ nodes: 9, edges: 12, destinations: 3, barriers: 4, evidence: 5 });
    expect(view.scenario.barriers.find(({ id }) => id === 'library-curb')?.reviewStatus).toBe('pending');
  });
});
