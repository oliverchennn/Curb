import { z } from 'zod';
import { CoordinateSchema } from '../../../modules/maps/src/index';

export { CoordinateSchema };

const IdSchema = z.string().min(1);
const DataKindSchema = z.enum(['synthetic', 'field']);
const LineStringSchema = z.strictObject({
  type: z.literal('LineString'),
  coordinates: z.array(CoordinateSchema).min(2),
});

export const NodeSchema = z.strictObject({
  id: IdSchema,
  coordinate: CoordinateSchema,
  label: z.string().min(1).optional(),
});

export const EdgeSchema = z.strictObject({
  id: IdSchema,
  fromNodeId: IdSchema,
  toNodeId: IdSchema,
  geometry: LineStringSchema,
  lengthMeters: z.number().finite().positive(),
  bidirectional: z.boolean(),
  barrierIds: z.array(IdSchema),
});

export const DestinationSchema = z.strictObject({
  id: IdSchema,
  label: z.string().min(1),
  nodeId: IdSchema,
});

export const BarrierSchema = z.strictObject({
  id: IdSchema,
  edgeId: IdSchema,
  kind: z.enum(['missing_ramp', 'obstruction', 'surface_issue', 'unknown']),
  reviewStatus: z.enum(['pending', 'accepted', 'rejected']),
  evidenceIds: z.array(IdSchema),
  note: z.string(),
});

export const EvidenceSchema = z.strictObject({
  id: IdSchema,
  kind: z.enum(['note', 'image']),
  origin: DataKindSchema,
  caption: z.string().min(1),
  note: z.string().optional(),
  assetPath: z.string().regex(/^\/(?!\/)[^\\?#]+$/).optional(),
  observedAt: z.iso.datetime({ offset: true }).optional(),
  attribution: z.string().min(1).optional(),
});

export const ScenarioSchema = z.strictObject({
  schemaVersion: z.literal(1),
  id: IdSchema,
  revision: z.number().int().nonnegative(),
  title: z.string().min(1),
  dataKind: DataKindSchema,
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
  destinations: z.array(DestinationSchema),
  barriers: z.array(BarrierSchema),
  evidence: z.array(EvidenceSchema),
});

const CountSchema = z.number().int().nonnegative();
export const ScenarioCountsSchema = z.strictObject({
  nodes: CountSchema,
  edges: CountSchema,
  destinations: CountSchema,
  barriers: CountSchema,
  evidence: CountSchema,
});

export const ScenarioViewSchema = z.strictObject({
  scenario: ScenarioSchema,
  counts: ScenarioCountsSchema,
}).superRefine(({ scenario, counts }, context) => {
  const collections = ['nodes', 'edges', 'destinations', 'barriers', 'evidence'] as const;
  for (const collection of collections) {
    if (counts[collection] !== scenario[collection].length) {
      context.addIssue({
        code: 'custom',
        path: ['counts', collection],
        message: 'Count must match the scenario collection.',
      });
    }
  }
});

export const BarrierDetailSchema = z.strictObject({
  barrier: BarrierSchema,
  evidence: z.array(EvidenceSchema),
});

export const ScenarioDatasetSchema = z.enum(['sample', 'empty']);
export const ScenarioErrorCodeSchema = z.enum([
  'DATASET_NOT_FOUND',
  'INVALID_SERVER_SCENARIO',
  'SCENARIO_UNAVAILABLE',
]);

export const ScenarioFailureSchema = z.strictObject({
  ok: z.literal(false),
  error: z.strictObject({
    code: ScenarioErrorCodeSchema,
    message: z.string().min(1),
  }),
});

export const ScenarioResponseSchema = z.discriminatedUnion('ok', [
  z.strictObject({ ok: z.literal(true), data: ScenarioViewSchema }),
  ScenarioFailureSchema,
]);

export type Coordinate = z.infer<typeof CoordinateSchema>;
export type Node = z.infer<typeof NodeSchema>;
export type Edge = z.infer<typeof EdgeSchema>;
export type Destination = z.infer<typeof DestinationSchema>;
export type Barrier = z.infer<typeof BarrierSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type Scenario = z.infer<typeof ScenarioSchema>;
export type ScenarioCounts = z.infer<typeof ScenarioCountsSchema>;
export type ScenarioView = z.infer<typeof ScenarioViewSchema>;
export type BarrierDetail = z.infer<typeof BarrierDetailSchema>;
export type ScenarioDataset = z.infer<typeof ScenarioDatasetSchema>;
export type ScenarioErrorCode = z.infer<typeof ScenarioErrorCodeSchema>;
export type ScenarioFailure = z.infer<typeof ScenarioFailureSchema>;
export type ScenarioResponse = z.infer<typeof ScenarioResponseSchema>;
