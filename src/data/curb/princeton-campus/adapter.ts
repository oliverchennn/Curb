import campus from './campus.json';
import index from './campus-index.json';
import type { Atlas, EvidenceRecord, Feature } from '../../../features/curb/explore/model';

/** Sidecar metadata; the strict atlas contract remains unchanged. No duplicate geometry here. */
export const campusIndex = index;
const sourceId = 'osm-princeton-campus';
const colors: Record<string, string> = { north: '#28715d', west: '#665c91', central: '#236d83', east: '#935b2d', south: '#43754a', meadows: '#8b536d' };
const classNames: Record<string, string> = { footway: 'Footway', steps: 'Steps', path: 'Path', cycleway: 'Cycleway', pedestrian: 'Pedestrian way' };

export function campusAtlasEntries(): Pick<Atlas, 'sources' | 'features' | 'records' | 'collections'> {
  const areas = new Map(index.studyAreas.map(a => [a.id, a.name]));
  const features: Feature[] = campus.features.map(f => {
    const tags: Record<string, string> = {};
    for (const [key, value] of Object.entries(f.tags)) if (typeof value === 'string') tags[key] = value;
    const type = tags.footway === 'crossing' ? 'crossing' : 'path';
    const label = `${tags.name || classNames[tags.highway]} · ${areas.get(f.area)} · way ${f.id}`;
    return { id: `campus-osm-way:${f.id}`, label, sourceId, sourceFeatureId: `way/${f.id}`, type,
      geometry: { type: 'LineString', coordinates: f.geometry.coordinates.map(c => [c[0], c[1]]) },
      properties: { ...tags, osm_way_id: f.id, osm_version: f.version, osm_edited_at: f.editedAt,
        material: tags.surface ?? null, feat_type: tags.highway, captured: 'OpenStreetMap contributor mapping; capture method unknown' } };
  });
  const records: EvidenceRecord[] = features.map(f => ({ id: `record:${f.id}`, featureId: f.id, kind: 'archive', title: f.label,
    sourceId, observed: null, captured: null, retrieved: { precision: 'instant', value: campus.retrievedAt },
    attachment: 'source-matched', conflictGroup: null,
    note: `OpenStreetMap ${f.sourceFeatureId}, version ${f.properties.osm_version}. Class: ${f.properties.feat_type}${f.properties.material ? `; surface tag: ${f.properties.material}` : '; surface tag unknown'}. ` +
      `Archive access tag: ${f.properties.access ?? 'Unknown'}; foot tag: ${f.properties.foot ?? 'Unknown'}; direction tag: ${f.properties['oneway:foot'] ?? f.properties.oneway ?? 'Unknown'}. ` +
      'Source tags and edit times are archive assertions, not field measurements. Current access, direction, continuity and traversal are Unknown. Complete source geometry is retained, including any part outside the mapped campus area.',
    media: { status: 'none', reason: 'No field photograph in this mapping record. This is an OpenStreetMap geometry snapshot.' } }));
  return {
    sources: [{ id: sourceId, title: 'Princeton campus pedestrian ways · OpenStreetMap snapshot', kind: 'archive',
      url: index.source.copyrightUrl, credit: `${index.source.credit} · Open Database License (ODbL) 1.0.`,
      sha256: index.source.datasetSha256, catalogDate: null }],
    features, records,
    collections: index.sections.map(s => ({ id: s.collectionId, code: s.code,
      name: `${s.areaLabel} · section ${s.section}/${s.sectionsInArea}`,
      subtitle: `${s.wayCount} mapped ways · ${s.areaWayCount} across this study area`,
      note: `${s.wayCount} of ${s.areaWayCount} ways in this authored browsing area; ${index.counts.selectedWays} across the campus snapshot. ` +
        'Sections divide source geometry for inspection. They are not routes, official neighborhood boundaries, or proof of complete coverage. © OpenStreetMap contributors · ODbL 1.0.',
      kind: 'archive', color: colors[s.areaId], traversal: 'unknown', recordIds: s.recordIds })),
  };
}
