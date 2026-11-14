import { z } from 'zod';
import { ScenarioSchema } from './index';

export const TRIP_CONTRACT_VERSION = 'curb-r1' as const;
export const TRIP_SCHEMA_VERSION = 1 as const;
export const STEP_FREE_PROFILE_ID = 'step-free-demo' as const;

const TextSchema = z.string().min(1).regex(/\S/, 'Must contain a non-whitespace character.');
const IdSchema = TextSchema;
const RevisionSchema = z.number().int().nonnegative();
const UniqueIdsSchema = z.array(IdSchema).refine(
  (ids) => new Set(ids).size === ids.length,
  'IDs must not repeat.',
);

/** A single illustrative step-free profile; restrictions are declared in assumptions.
 * Assessments are authored inputs, never inferred from v0 barrier/review/evidence fields.
 * This profile makes no claim about legal compliance or safe real-world navigation.
 */
export const TripProfileSchema = z.strictObject({
  id: z.literal(STEP_FREE_PROFILE_ID),
  label: TextSchema,
  description: TextSchema,
});

export const TripEdgeKindSchema = z.enum(['walkway', 'crossing', 'entrance']);
export const TripEdgeStatusSchema = z.enum(['pass', 'blocked', 'unknown']);
// Unknown coverage may coexist with known blockers. An optimistic unknown-only
// connection still excludes edges with blockers; clearing them leaves unknown.
export const TripEdgeAssessmentSchema = z.strictObject({
  edgeId: IdSchema,
  kind: TripEdgeKindSchema,
  status: TripEdgeStatusSchema,
  blockingBarrierIds: UniqueIdsSchema,
  reason: TextSchema,
}).superRefine((assessment, context) => {
  if (assessment.status === 'pass' && assessment.blockingBarrierIds.length !== 0) {
    context.addIssue({
      code: 'custom', path: ['blockingBarrierIds'], message: 'Pass edges cannot have blockers.',
    });
  }
  if (assessment.status === 'blocked' && assessment.blockingBarrierIds.length === 0) {
    context.addIssue({
      code: 'custom', path: ['blockingBarrierIds'], message: 'Blocked edges must name a blocker.',
    });
  }
});

/** Each eligible simulation clears exactly this barrier, never unknown coverage.
 * Other blockers remain in effect. A repair changes a projection, not source evidence.
 */
export const TripRepairSchema = z.strictObject({
  id: IdSchema,
  label: TextSchema,
  barrierId: IdSchema,
  description: TextSchema,
});

export const TripDefaultsSchema = z.strictObject({
  originNodeId: IdSchema,
  destinationId: IdSchema,
});

/** Separate R1 metadata wraps the unchanged v0 graph. Domain validation must check
 * all v0 relationships, synthetic evidence, one assessment per edge, unique IDs,
 * blocker ownership, repair applicability and defaults. No topology is inferred.
 */
export const TripScenarioSchema = z.strictObject({
  schemaVersion: z.literal(TRIP_SCHEMA_VERSION),
  contractVersion: z.literal(TRIP_CONTRACT_VERSION),
  scenario: ScenarioSchema.refine((scenario) => scenario.dataKind === 'synthetic', {
    message: 'R1 uses a separately authored synthetic scenario.', path: ['dataKind'],
  }),
  profile: TripProfileSchema,
  assumptions: z.array(TextSchema).min(1),
  edgeAssessments: z.array(TripEdgeAssessmentSchema),
  repairs: z.array(TripRepairSchema),
  defaults: TripDefaultsSchema,
});

/** GET /api/curb/trip-scenario: omitted scenarioId selects the B-owned trip demo.
 * An explicit unsupported nonempty ID produces SCENARIO_NOT_FOUND, not a fallback.
 */
export const TripScenarioQuerySchema = z.strictObject({
  scenarioId: IdSchema.optional(),
});

/** POST /api/curb/trip: no omitted/defaulted selection or repair fields. */
export const TripRequestSchema = z.strictObject({
  contractVersion: z.literal(TRIP_CONTRACT_VERSION),
  scenarioId: IdSchema,
  revision: RevisionSchema,
  profileId: z.literal(STEP_FREE_PROFILE_ID),
  originNodeId: IdSchema,
  destinationId: IdSchema,
  repairId: IdSchema.nullable(),
});

const ReachableTripRouteSchema = z.strictObject({
  status: z.literal('reachable'),
  nodeIds: UniqueIdsSchema.min(1),
  edgeIds: UniqueIdsSchema,
  distanceMeters: z.number().finite().nonnegative(),
}).superRefine((route, context) => {
  if (route.nodeIds.length !== route.edgeIds.length + 1) {
    context.addIssue({
      code: 'custom', path: ['nodeIds'], message: 'A path needs one more node than edges.',
    });
  }
  if ((route.edgeIds.length === 0) !== (route.distanceMeters === 0)) {
    context.addIssue({
      code: 'custom', path: ['distanceMeters'], message: 'Only a zero-edge trip has zero distance.',
    });
  }
});

/** Failure lists describe one potential directed connection, not all alternatives.
 * Prefer an unknown-only connection before a connection requiring a blocked edge.
 * An unknown assessment with known blockers belongs in blockedEdgeIds until cleared.
 * Failure results deliberately contain no route nodes, path edges or distance.
 */
export const TripRouteResultSchema = z.discriminatedUnion('status', [
  ReachableTripRouteSchema,
  z.strictObject({
    status: z.literal('unknown'),
    blockedEdgeIds: z.array(IdSchema).length(0),
    unknownEdgeIds: UniqueIdsSchema.min(1),
  }),
  z.strictObject({
    status: z.literal('blocked'),
    blockedEdgeIds: UniqueIdsSchema.min(1),
    unknownEdgeIds: UniqueIdsSchema,
  }).superRefine((route, context) => {
    if (route.unknownEdgeIds.some((id) => route.blockedEdgeIds.includes(id))) {
      context.addIssue({
        code: 'custom', path: ['unknownEdgeIds'], message: 'Explanation edge lists must be disjoint.',
      });
    }
  }),
  z.strictObject({
    status: z.literal('disconnected'),
    blockedEdgeIds: z.array(IdSchema).length(0),
    unknownEdgeIds: z.array(IdSchema).length(0),
  }),
]);

/** Echo every request field exactly. B validates endpoints and computes directed,
 * positive-length shortest paths with stable ties; schemas do not run the solver.
 */
export const TripEvaluationSchema = z.strictObject({
  ...TripRequestSchema.shape,
  before: TripRouteResultSchema,
  after: TripRouteResultSchema,
}).superRefine((evaluation, context) => {
  for (const key of ['before', 'after'] as const) {
    const route = evaluation[key];
    if (route.status === 'reachable' && route.nodeIds[0] !== evaluation.originNodeId) {
      context.addIssue({
        code: 'custom', path: [key, 'nodeIds', 0], message: 'Path must start at the requested origin.',
      });
    }
  }
  if (evaluation.repairId === null && JSON.stringify(evaluation.before) !== JSON.stringify(evaluation.after)) {
    context.addIssue({
      code: 'custom', path: ['after'], message: 'Without a repair, before and after must match.',
    });
  }
});

export const TripErrorCodeSchema = z.enum([
  'INVALID_REQUEST',
  'SCENARIO_NOT_FOUND',
  'STALE_SCENARIO',
  'INVALID_SERVER_SCENARIO',
]);

export const TRIP_ERROR_HTTP_STATUS = {
  INVALID_REQUEST: 400,
  SCENARIO_NOT_FOUND: 404,
  STALE_SCENARIO: 409,
  INVALID_SERVER_SCENARIO: 500,
} as const satisfies Record<z.infer<typeof TripErrorCodeSchema>, number>;

export const TripFailureSchema = z.strictObject({
  contractVersion: z.literal(TRIP_CONTRACT_VERSION),
  ok: z.literal(false),
  error: z.strictObject({ code: TripErrorCodeSchema, message: TextSchema }),
});

export const TripScenarioResponseSchema = z.discriminatedUnion('ok', [
  z.strictObject({
    contractVersion: z.literal(TRIP_CONTRACT_VERSION),
    ok: z.literal(true),
    data: TripScenarioSchema,
  }),
  TripFailureSchema,
]);

export const TripResponseSchema = z.discriminatedUnion('ok', [
  z.strictObject({
    contractVersion: z.literal(TRIP_CONTRACT_VERSION),
    ok: z.literal(true),
    data: TripEvaluationSchema,
  }),
  TripFailureSchema,
]);

export type TripProfile = z.infer<typeof TripProfileSchema>;
export type TripEdgeKind = z.infer<typeof TripEdgeKindSchema>;
export type TripEdgeStatus = z.infer<typeof TripEdgeStatusSchema>;
export type TripEdgeAssessment = z.infer<typeof TripEdgeAssessmentSchema>;
export type TripRepair = z.infer<typeof TripRepairSchema>;
export type TripDefaults = z.infer<typeof TripDefaultsSchema>;
export type TripScenario = z.infer<typeof TripScenarioSchema>;
export type TripScenarioQuery = z.infer<typeof TripScenarioQuerySchema>;
export type TripRequest = z.infer<typeof TripRequestSchema>;
export type TripRouteResult = z.infer<typeof TripRouteResultSchema>;
export type TripEvaluation = z.infer<typeof TripEvaluationSchema>;
export type TripErrorCode = z.infer<typeof TripErrorCodeSchema>;
export type TripFailure = z.infer<typeof TripFailureSchema>;
export type TripScenarioResponse = z.infer<typeof TripScenarioResponseSchema>;
export type TripResponse = z.infer<typeof TripResponseSchema>;
