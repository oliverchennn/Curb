// Offline build boundary. Client code imports adapter/contract/selectors, never this module.
import { z } from 'zod';
import { campusPointCatalogSchema, originalNodeSchema, responseSchema, retrievalSchema, pointBoundsSchema,
  POINT_CATEGORIES, LOCATION_REVIEW_NODE_IDS, POINT_SOURCE_SHA256, CATEGORY_LABELS, countCampusPoints, sourcePositionBounds } from './contract';
import type { CampusPoint, CampusPointCatalog } from './contract';

const sourceRecordSchema = originalNodeSchema.extend({
  sourceFeatureId: z.string(), categories: z.array(z.enum(POINT_CATEGORIES)),
  boundaryStatus: z.enum(['interior', 'retained-way-context']), insideAcquisitionEnvelope: z.literal(true),
  inSanitizedSource: z.boolean(), selectedWayIds: z.array(z.number().int().positive()),
  sectionCollectionIds: z.array(z.string()), studyAreaIds: z.array(z.string()), unlinkedAuditStudyAreaId: z.string().nullable(),
  sourceResponseIds: z.array(z.string()), retrieval: retrievalSchema, observedAt: z.null(), capturedAt: z.null(), currentTraversal: z.literal('unknown'),
});
// Parse only the input fields used by the public projection. The exact full wrapper is hash-tested offline.
const sourceSchema = z.object({
  schemaId: z.literal('curb-campus-point-source'), schemaVersion: z.literal(1),
  acquisitionEnvelope: pointBoundsSchema,
  license: z.strictObject({ id: z.literal('ODbL-1.0'), credit: z.literal('© OpenStreetMap contributors'),
    copyrightUrl: z.literal('https://www.openstreetmap.org/copyright'), licenseUrl: z.literal('https://opendatacommons.org/licenses/odbl/1-0/') }),
  records: z.array(sourceRecordSchema).length(333), responses: z.array(responseSchema).length(13),
});

/** Explicit allowlist: no spreading of the raw handoff, records, metadata or response objects. */
export function buildPublicPointCatalog(input: unknown): CampusPointCatalog {
  const source = sourceSchema.parse(input);
  const records = source.records.map((r): CampusPoint => {
    const review = (LOCATION_REVIEW_NODE_IDS as readonly number[]).includes(r.id);
    const categories = [...r.categories].sort();
    return {
      id: `campus-osm-node:${r.id}`, kind: 'archive', sourceFeatureId: r.sourceFeatureId, sourceMatch: 'exact-source-node',
      label: `${r.tags.name || categories.map(c => CATEGORY_LABELS[c]).join(' / ')} · node ${r.id}`, categories,
      sourceNode: { type: r.type, id: r.id, lon: r.lon, lat: r.lat, version: r.version, timestamp: r.timestamp,
        tags: Object.fromEntries(Object.entries(r.tags).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) },
      boundaryStatus: r.boundaryStatus, insideAcquisitionEnvelope: r.insideAcquisitionEnvelope, inSanitizedSource: r.inSanitizedSource,
      selectedWayIds: [...r.selectedWayIds].sort((a, b) => a - b), sectionCollectionIds: [...r.sectionCollectionIds].sort(), studyAreaIds: [...r.studyAreaIds].sort(),
      auditGrouping: r.unlinkedAuditStudyAreaId === null ? null : { studyAreaId: r.unlinkedAuditStudyAreaId, basis: 'authored-coordinate-audit-only' },
      sourceResponseIds: [...r.sourceResponseIds].sort(),
      retrieval: { earliestKnownAt: r.retrieval.earliestKnownAt, latestKnownAt: r.retrieval.latestKnownAt,
        hasResponseWithUnknownRetrievalTime: r.retrieval.hasResponseWithUnknownRetrievalTime },
      observedAt: r.observedAt, capturedAt: r.capturedAt, currentTraversal: r.currentTraversal,
      locationStatus: review ? 'location-review-needed' : 'source-position', locationReviewNote: review ? r.tags.fixme : null,
      geometry: review ? null : { type: 'Point', coordinates: [r.lon, r.lat] },
    };
  }).sort((a, b) => a.sourceNode.id - b.sourceNode.id);
  return campusPointCatalogSchema.parse({
    schemaId: 'curb-campus-point-catalog', schemaVersion: 1,
    source: { id: 'osm-princeton-campus-points', title: 'Princeton campus mapped point features · OpenStreetMap snapshot',
      credit: source.license.credit, license: source.license.id, copyrightUrl: source.license.copyrightUrl,
      licenseUrl: source.license.licenseUrl, pointSourceSha256: POINT_SOURCE_SHA256 },
    bounds: sourcePositionBounds(records), acquisitionBounds: [...source.acquisitionEnvelope],
    semantics: {
      scope: 'University campus boundary baseline plus explicit retained-way perimeter context; not a complete campus inventory. Acquisition bounds are not a campus ownership boundary.',
      coordinates: 'Original OSM WGS84 longitude/latitude degrees. Bounds enclose all source positions, including unplaced location-review records; no snapping or measured accuracy.',
      categories: 'Crossing: highway=crossing or crossing key; kerb: barrier=kerb or kerb key; entrance: entrance key; transit: highway=bus_stop or public_transport key. Categories overlap and do not count unique physical facilities.',
      joins: 'Way, section and study-area memberships come only from exact node IDs in selected ways. Empty joins stay empty. Authored coordinate audit groupings are not connections or official neighborhoods.',
      dates: 'sourceNode.timestamp is an OSM edit time. Response retrieval dates are not field observation or capture dates; unrecorded dates remain null. Tags are archive assertions, not measured accessibility or current traversal.',
      placement: 'Four source location-fixme records remain in inventory with original coordinates but null normal map geometry pending location review. Source matching and eligible placement are not passability assessments.',
    },
    responses: source.responses.map(r => ({ id: r.id, kind: r.kind, url: r.url, sha256: r.sha256, bytes: r.bytes,
      ...(r.bbox ? { bbox: [...r.bbox] } : {}), retrievedAt: r.retrievedAt, retrievalTimeStatus: r.retrievalTimeStatus })).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    records, counts: countCampusPoints(records),
  });
}
