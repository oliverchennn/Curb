import { z } from 'zod';

const Id = z.string().regex(/^[a-z][a-z0-9-]{0,79}$/);
const Text = z.string().trim().min(1).max(4000);
const Money = z.number().int().nonnegative().max(100_000_000);
const Asset = z.string().regex(/^\/curb\/surveys\/robertson-hall\/[a-zA-Z0-9_/-]+\.(?:mp4|MOV|jpg|png|json|pdf)$/).refine(s => !s.includes('//'));
export const PrioritySchema = z.enum(['high', 'medium', 'low', 'unassessed']);
export const ReviewSchema = z.strictObject({
  status: z.enum(['pending', 'accepted', 'rejected']),
  reviewer: Text,
  method: z.enum(['ai', 'manual']),
  note: Text,
});
export const BoxSchema = z.tuple([z.number().min(0).max(1), z.number().min(0).max(1), z.number().positive().max(1), z.number().positive().max(1)])
  .refine(([x, y, w, h]) => x + w <= 1.000001 && y + h <= 1.000001, 'Box must fit the displayed video');
export const FindingSchema = z.strictObject({
  id: Id, label: Text, kind: Text, description: Text,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  evidenceTime: z.number().nonnegative(), closeupSrc: Asset,
  review: ReviewSchema,
  assessment: z.strictObject({
    priority: PrioritySchema, rationale: Text,
    accessImpacts: z.array(Text).min(1), measurementNeeds: z.array(Text).min(1),
    checks: z.array(z.strictObject({ sourceId: Id, section: Text, status: z.enum(['needs_measurement', 'not_assessed']), note: Text })).min(1),
  }),
  measurements: z.array(z.strictObject({ property: Text, value: z.number().finite(), unit: Text, method: Text })),
  mapPosition: z.strictObject({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), accuracy: z.literal('approximate'), placementReview: z.literal('accepted'), note: Text }).nullable(),
  track: z.array(z.strictObject({ frame: z.number().int().nonnegative(), box: BoxSchema })).min(1).max(20_000),
});
export const CostSchema = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('estimated'), rateLowCents: Money, rateHighCents: Money,
    quantityLow: z.number().positive().max(10_000), quantityHigh: z.number().positive().max(10_000),
    unit: Text, sourceIds: z.array(Id).min(1), assumptions: z.array(Text).min(1), exclusions: z.array(Text) }),
  z.strictObject({ status: z.literal('quote_required'), reason: Text }),
]);
export const TreatmentSchema = z.strictObject({
  id: Id, workAreaId: Id, label: Text,
  method: z.enum(['inspect', 'seal', 'patch', 'replace']),
  durability: z.number().int().min(0).max(3), eligibilityNote: Text,
  cost: CostSchema,
});
export const SurveySchema = z.strictObject({
  contractVersion: z.literal('curb-survey-v1'), id: z.literal('robertson-hall'), revision: z.number().int().nonnegative(), title: Text,
  site: z.strictObject({ name: Text, kind: z.enum(['campus_path', 'public_right_of_way', 'unknown']),
    latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), locationNote: Text }),
  media: z.strictObject({ src: Asset, sourceSrc: Asset, annotatedSrc: Asset, posterSrc: Asset,
    durationSeconds: z.number().positive().max(600), fps: z.number().positive().max(120),
    width: z.number().int().positive(), height: z.number().int().positive(), originalSha256: z.string().regex(/^[a-f0-9]{64}$/) }),
  analysis: z.strictObject({ method: Text, model: Text, createdAt: z.iso.datetime({ offset: true }), note: Text }),
  sources: z.array(z.strictObject({ id: Id, title: Text, url: z.url(), kind: z.enum(['standard', 'treatment', 'cost', 'context']), asOf: Text, scopeNote: Text })).min(1),
  findings: z.array(FindingSchema).max(50),
  workAreas: z.array(z.strictObject({ id: Id, label: Text, findingIds: z.array(Id).min(1),
    priority: PrioritySchema, nearTerm: z.boolean(), repairWorthy: z.boolean(), rationale: Text,
    recommendedOptionId: Id })).max(12),
  treatments: z.array(TreatmentSchema).max(12),
  sharedCosts: z.array(z.strictObject({ id: Id, label: Text, cost: CostSchema })).max(12),
  routeAssessment: z.strictObject({ status: z.literal('unknown'), note: Text }),
}).superRefine((s, ctx) => {
  const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
  for (const [label, values] of [['finding', s.findings], ['work area', s.workAreas], ['treatment', s.treatments], ['source', s.sources], ['shared cost', s.sharedCosts]] as const) {
    if (new Set(values.map(v => v.id)).size !== values.length) fail(`Duplicate ${label} IDs`);
  }
  const findings = new Set(s.findings.map(f => f.id));
  const areas = new Set(s.workAreas.map(a => a.id));
  const sources = new Set(s.sources.map(x => x.id));
  const assigned = new Set<string>();
  for (const f of s.findings) {
    if (f.evidenceTime >= s.media.durationSeconds) fail(`Evidence outside video: ${f.id}`);
    if (!f.track.some(k => Math.abs(k.frame / s.media.fps - f.evidenceTime) < 0.15)) fail(`Evidence needs a visible track: ${f.id}`);
    let previous = -1;
    for (const k of f.track) {
      if (k.frame <= previous || k.frame / s.media.fps >= s.media.durationSeconds) fail(`Invalid track order/duration: ${f.id}`);
      previous = k.frame;
    }
    for (const check of f.assessment.checks) if (!sources.has(check.sourceId)) fail(`Unknown standards source: ${check.sourceId}`);
  }
  for (const a of s.workAreas) {
    for (const id of a.findingIds) {
      if (!findings.has(id) || assigned.has(id)) fail(`Unknown or multiply grouped finding: ${id}`);
      assigned.add(id);
    }
    if (!s.treatments.some(t => t.id === a.recommendedOptionId && t.workAreaId === a.id)) fail(`Invalid recommended option: ${a.id}`);
  }
  for (const t of s.treatments) if (!areas.has(t.workAreaId)) fail(`Unknown work area: ${t.id}`);
  for (const item of [...s.treatments, ...s.sharedCosts]) {
    const c = item.cost;
    if (c.status === 'estimated') {
      if (c.rateLowCents > c.rateHighCents || c.quantityLow > c.quantityHigh) fail(`Reversed cost range: ${item.id}`);
      if (!Number.isSafeInteger(Math.ceil(c.rateHighCents * c.quantityHigh))) fail(`Cost overflow: ${item.id}`);
      for (const id of c.sourceIds) if (!sources.has(id)) fail(`Unknown cost source: ${id}`);
    }
  }
});

export type Survey = z.infer<typeof SurveySchema>;
export type Finding = z.infer<typeof FindingSchema>;
export type Treatment = z.infer<typeof TreatmentSchema>;
export type Cost = z.infer<typeof CostSchema>;
export type Priority = z.infer<typeof PrioritySchema>;
export type Box = z.infer<typeof BoxSchema>;
export type PlanId = 'essential' | 'balanced' | 'durable' | 'budget';
export interface RepairPlan {
  id: PlanId;
  title: string;
  optionIds: string[];
  workAreaIds: string[];
  deferredWorkAreaIds: string[];
  excludedFindingIds: string[];
  pendingChecks: string[];
  cost: { lowCents: number; highCents: number; isComplete: boolean; unpricedItems: string[] };
  coverage: { high: number; medium: number; low: number; unassessed: number };
  durability: number;
  budgetCents: number | null;
  budgetFit: 'not_set' | 'within' | 'partial' | 'over';
  routeImpact: { status: 'unknown'; note: string };
}

export const SurveyResponseSchema = z.strictObject({ data: SurveySchema });
export const ExportRequestSchema = z.strictObject({ survey: SurveySchema, budgetCents: Money.nullable(), planId: z.enum(['essential', 'balanced', 'durable', 'budget']) });
