import { z } from 'zod';

export const CANADA_CASE_ID = 'canada-college-2020';
export const CANADA_READINESS_REVISION = 1;
export const CANADA_READINESS_API = '/api/curb/cases/canada-college';

const text = z.string().trim().min(1);
const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const commit = z.string().regex(/^[a-f0-9]{40}$/);
const sourceUrl = z.literal('https://smccd.edu/ada2020/19029%20SMCCCD%20ADA%20Self-Evaluation%20and%20Transition%20Plan%20FINAL%20Nov2020%20sm.pdf');
const recordId = z.enum(['ramp-404', 'ramp-405', 'ramp-421', 'ramp-422']);
const requirementId = z.enum(['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10']);
const cents = z.number().int().positive().max(Math.floor(Number.MAX_SAFE_INTEGER / 4));
const positiveInt = z.number().int().positive();

const rampRecord = z.strictObject({
  id: recordId,
  area: text,
  measurement: z.strictObject({
    label: text,
    raw: z.string().regex(/^\d+(?:\.\d+)?$/),
    unit: z.enum(['in', '%']),
  }),
  assemblyType: z.enum(['perpendicular', 'parallel', 'blended_transition']),
  action: text,
  estimateCents: cents,
  projectEligible: z.literal(false),
  locator: z.strictObject({
    viewerPage: positiveInt,
    printedPage: positiveInt,
  }),
});

export const CanadaReadinessSchema = z.strictObject({
  schemaVersion: z.literal(1),
  caseId: z.literal(CANADA_CASE_ID),
  revision: z.literal(CANADA_READINESS_REVISION),
  dataKind: z.literal('historical_audit'),
  disposition: z.literal('inventory_only'),
  comparisonAllowed: z.literal(false),
  area: text,
  source: z.strictObject({
    title: text,
    publisher: text,
    version: z.literal('FINAL November 2020'),
    url: sourceUrl,
    sha256,
    bytes: positiveInt,
    viewerPages: positiveInt,
    estimateYear: z.literal(2020),
  }),
  review: z.strictObject({
    status: z.literal('accepted'),
    candidateSha: commit,
    reviewSha: commit,
    reviewedAt: z.iso.datetime(),
    inventoryRecordCount: positiveInt,
    inputHashes: z.strictObject({
      'coverage.json': sha256,
      'graph.json': sha256,
      'observations.json': sha256,
      'projects.json': sha256,
      'sources.json': sha256,
      'feasibility.json': sha256,
    }),
    completedRequirementId: z.literal('M11'),
  }),
  records: rampRecord.array().length(recordId.options.length),
  requirements: z.strictObject({ id: requirementId, title: text, description: text })
    .array().length(requirementId.options.length),
}).superRefine((snapshot, ctx) => {
  if (new Set(snapshot.records.map(({ id }) => id)).size !== recordId.options.length) {
    ctx.addIssue({ code: 'custom', path: ['records'], message: 'Inventory IDs must be unique.' });
  }
  if (new Set(snapshot.requirements.map(({ id }) => id)).size !== requirementId.options.length) {
    ctx.addIssue({ code: 'custom', path: ['requirements'], message: 'Open requirement IDs must be unique.' });
  }
  snapshot.records.forEach(({ locator }, index) => {
    if (locator.viewerPage > snapshot.source.viewerPages || locator.printedPage !== locator.viewerPage - 1) {
      ctx.addIssue({ code: 'custom', path: ['records', index, 'locator'], message: 'Invalid final report locator.' });
    }
  });
});

export const CanadaReadinessResponseSchema = z.discriminatedUnion('ok', [
  z.strictObject({ ok: z.literal(true), data: CanadaReadinessSchema }),
  z.strictObject({ ok: z.literal(false), error: z.literal('INVALID_SNAPSHOT') }),
]);

export type CanadaReadiness = z.infer<typeof CanadaReadinessSchema>;
