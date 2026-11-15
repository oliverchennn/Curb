import { z } from 'zod';

export const POINT_CATEGORIES = ['crossing', 'entrance', 'kerb', 'transit'] as const;
export const LOCATION_REVIEW_NODE_IDS = [8776287626, 11124620711, 12785065968, 12785065969] as const;
export const POINT_SOURCE_SHA256 = 'eb7f4eece8ed2b95e842a4cc09c5fa25cfade8478ece6120fd83443aaa25ca84';
export const CATEGORY_LABELS = { crossing: 'Crossing', entrance: 'Entrance', kerb: 'Kerb', transit: 'Transit' } as const;

export type PointCategory = typeof POINT_CATEGORIES[number];
export type PointBounds = readonly [west: number, south: number, east: number, north: number];
const nodeId = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const instant = z.iso.datetime();
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const longitude = z.number().min(-180).max(180);
const latitude = z.number().min(-90).max(90);
export const pointBoundsSchema = z.tuple([longitude, latitude, longitude, latitude])
  .refine(b => b[0] <= b[2] && b[1] <= b[3], 'Bounds must be ordered west/south/east/north');
export const originalNodeSchema = z.strictObject({
  type: z.literal('node'), id: nodeId, lat: latitude, lon: longitude,
  version: z.number().int().positive(), timestamp: instant, tags: z.record(z.string(), z.string()),
});
export const responseSchema = z.strictObject({
  id: z.string().min(1), kind: z.enum(['map-response', 'relation-full-response']),
  url: z.url().refine(url => url.startsWith('https://api.openstreetmap.org/api/0.6/'), 'Expected public OSM source URL'),
  sha256: digest, bytes: z.number().int().positive(), bbox: pointBoundsSchema.optional(),
  retrievedAt: instant.nullable(),
  retrievalTimeStatus: z.enum(['recorded', 'not-recorded-in-original-receipt']),
}).refine(r => (r.retrievedAt !== null) === (r.retrievalTimeStatus === 'recorded'), 'Retrieval status/date mismatch');
export const retrievalSchema = z.strictObject({
  earliestKnownAt: instant.nullable(), latestKnownAt: instant.nullable(),
  hasResponseWithUnknownRetrievalTime: z.boolean(),
});

export function categoriesForTags(tags: Readonly<Record<string, string>>): PointCategory[] {
  return POINT_CATEGORIES.filter(c => {
    switch (c) {
      case 'crossing': return tags.highway === 'crossing' || Object.hasOwn(tags, 'crossing');
      case 'entrance': return Object.hasOwn(tags, 'entrance');
      case 'kerb': return tags.barrier === 'kerb' || Object.hasOwn(tags, 'kerb');
      case 'transit': return tags.highway === 'bus_stop' || Object.hasOwn(tags, 'public_transport');
    }
  });
}

const unique = <T>(values: readonly T[]) => new Set(values).size === values.length;
const sameSet = <T>(a: readonly T[], b: readonly T[]) => a.length === b.length && a.every(v => b.includes(v));
const geometrySchema = z.strictObject({ type: z.literal('Point'), coordinates: z.tuple([longitude, latitude]) });
export const campusPointSchema = z.strictObject({
  id: z.string(), kind: z.literal('archive'), sourceFeatureId: z.string(), sourceMatch: z.literal('exact-source-node'),
  label: z.string().min(1), categories: z.array(z.enum(POINT_CATEGORIES)).min(1), sourceNode: originalNodeSchema,
  boundaryStatus: z.enum(['interior', 'retained-way-context']), insideAcquisitionEnvelope: z.literal(true),
  inSanitizedSource: z.boolean(), selectedWayIds: z.array(nodeId),
  sectionCollectionIds: z.array(z.string().startsWith('campus-')), studyAreaIds: z.array(z.string().min(1)),
  auditGrouping: z.strictObject({ studyAreaId: z.string().min(1), basis: z.literal('authored-coordinate-audit-only') }).nullable(),
  sourceResponseIds: z.array(z.string().min(1)).min(1), retrieval: retrievalSchema,
  observedAt: z.null(), capturedAt: z.null(), currentTraversal: z.literal('unknown'),
  locationStatus: z.enum(['source-position', 'location-review-needed']), locationReviewNote: z.string().nullable(),
  geometry: geometrySchema.nullable(),
}).superRefine((r, ctx) => {
  const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
  if (r.id !== `campus-osm-node:${r.sourceNode.id}` || r.sourceFeatureId !== `node/${r.sourceNode.id}`) fail('Source identity mismatch');
  if (!sameSet(r.categories, categoriesForTags(r.sourceNode.tags)) || !unique(r.categories)) fail('Category membership mismatch');
  for (const list of [r.selectedWayIds, r.sectionCollectionIds, r.studyAreaIds, r.sourceResponseIds]) {
    if (!unique<string | number>(list)) fail('Duplicate join or response membership');
  }
  const linked = r.selectedWayIds.length > 0;
  if (linked !== (r.sectionCollectionIds.length > 0) || linked !== (r.studyAreaIds.length > 0)
    || linked !== r.inSanitizedSource || linked === (r.auditGrouping !== null)) fail('Linked/unlinked membership mismatch');
  if (!linked && r.boundaryStatus !== 'interior') fail('Unlinked records must not acquire retained-way context');
  const review = (LOCATION_REVIEW_NODE_IDS as readonly number[]).includes(r.sourceNode.id);
  if (review) {
    if (r.locationStatus !== 'location-review-needed' || r.geometry !== null
      || r.sourceNode.tags.fixme !== 'confim exact location' || r.locationReviewNote !== r.sourceNode.tags.fixme) fail('Location-review curation mismatch');
  } else if (r.locationStatus !== 'source-position' || r.locationReviewNote !== null || r.geometry === null
    || r.geometry.coordinates[0] !== r.sourceNode.lon || r.geometry.coordinates[1] !== r.sourceNode.lat) fail('Normal geometry must equal the original source position');
});
export type CampusPoint = z.infer<typeof campusPointSchema>;

/** Counts deduplicate source identities; category and join totals are memberships. */
export function countCampusPoints(records: readonly CampusPoint[]) {
  const distinct = [...new Map(records.map(r => [r.sourceFeatureId, r])).values()];
  return {
    total: distinct.length,
    mapEligible: distinct.filter(r => r.geometry !== null).length,
    locationReviewNeeded: distinct.filter(r => r.locationStatus === 'location-review-needed').length,
    interior: distinct.filter(r => r.boundaryStatus === 'interior').length,
    context: distinct.filter(r => r.boundaryStatus === 'retained-way-context').length,
    linked: distinct.filter(r => r.selectedWayIds.length > 0).length,
    unlinked: distinct.filter(r => r.selectedWayIds.length === 0).length,
    selectedWayMemberships: distinct.reduce((sum, r) => sum + r.selectedWayIds.length, 0),
    categoryMemberships: {
      crossing: distinct.filter(r => r.categories.includes('crossing')).length,
      entrance: distinct.filter(r => r.categories.includes('entrance')).length,
      kerb: distinct.filter(r => r.categories.includes('kerb')).length,
      transit: distinct.filter(r => r.categories.includes('transit')).length,
    },
  };
}
export type CampusPointCounts = ReturnType<typeof countCampusPoints>;
const count = z.number().int().nonnegative();
const countsSchema = z.strictObject({
  total: count, mapEligible: count, locationReviewNeeded: count, interior: count, context: count,
  linked: count, unlinked: count, selectedWayMemberships: count,
  categoryMemberships: z.strictObject({ crossing: count, entrance: count, kerb: count, transit: count }),
});

export function sourcePositionBounds(records: readonly CampusPoint[]): [number, number, number, number] {
  if (!records.length) throw new Error('Cannot bound an empty inventory');
  return [Math.min(...records.map(r => r.sourceNode.lon)), Math.min(...records.map(r => r.sourceNode.lat)),
    Math.max(...records.map(r => r.sourceNode.lon)), Math.max(...records.map(r => r.sourceNode.lat))];
}

export const campusPointCatalogSchema = z.strictObject({
  schemaId: z.literal('curb-campus-point-catalog'), schemaVersion: z.literal(1),
  source: z.strictObject({
    id: z.literal('osm-princeton-campus-points'), title: z.string().min(1), credit: z.literal('© OpenStreetMap contributors'),
    license: z.literal('ODbL-1.0'), licenseUrl: z.literal('https://opendatacommons.org/licenses/odbl/1-0/'),
    copyrightUrl: z.literal('https://www.openstreetmap.org/copyright'), pointSourceSha256: z.literal(POINT_SOURCE_SHA256),
  }),
  bounds: pointBoundsSchema, acquisitionBounds: pointBoundsSchema,
  semantics: z.strictObject({ scope: z.string(), coordinates: z.string(), categories: z.string(), joins: z.string(), dates: z.string(), placement: z.string() }),
  responses: z.array(responseSchema).length(13), records: z.array(campusPointSchema).length(333), counts: countsSchema,
}).superRefine((catalog, ctx) => {
  const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
  if (!unique(catalog.records.map(r => r.sourceFeatureId))) fail('Duplicate source node');
  if (!unique(catalog.responses.map(r => r.id))) fail('Duplicate response ID');
  if (JSON.stringify(catalog.counts) !== JSON.stringify(countCampusPoints(catalog.records))) fail('Catalog count mismatch');
  if (catalog.records.length && !catalog.bounds.every((v, i) => v === sourcePositionBounds(catalog.records)[i])) fail('Source bounds mismatch');
  const responses = new Map(catalog.responses.map(r => [r.id, r]));
  for (const r of catalog.records) {
    const receipts = r.sourceResponseIds.map(id => responses.get(id));
    if (receipts.some(receipt => !receipt)) { fail(`Missing response for ${r.sourceFeatureId}`); continue; }
    const dates = receipts.flatMap(receipt => receipt?.retrievedAt ? [receipt.retrievedAt] : []).sort();
    if (r.retrieval.earliestKnownAt !== (dates[0] ?? null) || r.retrieval.latestKnownAt !== (dates.at(-1) ?? null)
      || r.retrieval.hasResponseWithUnknownRetrievalTime !== receipts.some(receipt => receipt?.retrievedAt === null)) fail(`Retrieval lineage mismatch for ${r.sourceFeatureId}`);
    const [w, s, e, n] = catalog.acquisitionBounds;
    if (r.sourceNode.lon < w || r.sourceNode.lon > e || r.sourceNode.lat < s || r.sourceNode.lat > n) fail('Source position outside acquisition bounds');
  }
});
export type CampusPointCatalog = z.infer<typeof campusPointCatalogSchema>;
