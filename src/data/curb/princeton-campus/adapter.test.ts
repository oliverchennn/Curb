import { describe, expect, it } from 'vitest';
import { campusAtlasEntries, campusIndex } from './adapter';
import { atlasSchema, filteredRecords, locatedFeatures, recordsFor } from '../../../features/curb/explore/model';
import { createAtlas } from '../../../features/curb/explore/data';

describe('campus atlas adapter', () => {
  const entries = campusAtlasEntries();
  const campus = atlasSchema.parse({ ...entries, context: [] });
  it('joins every sidecar ID through the unchanged atlas schema with exact coverage', () => {
    expect(campus.collections).toHaveLength(22);
    expect(campus.features).toHaveLength(1188);
    expect(campus.records).toHaveLength(1188);
    for (const section of campusIndex.sections) {
      const c = campus.collections.find(c => c.id === section.collectionId)!;
      expect(c.recordIds).toEqual(section.recordIds);
      expect(locatedFeatures(campus, recordsFor(campus, c)).map(f => f.id)).toEqual(section.featureIds);
      expect(section.wayCount).toBe(c.recordIds.length);
      expect(c.recordIds.length).toBeLessThanOrEqual(64);
    }
  });
  it('retains explicit unknown dates/traversal and provides source IDs, license and retrieval separately', () => {
    expect(campus.collections.every(c => c.traversal === 'unknown')).toBe(true);
    expect(campus.records.every(r => r.kind === 'archive' && r.observed === null && r.captured === null && r.retrieved?.precision === 'instant' && r.media.status === 'none')).toBe(true);
    expect(campus.sources[0].credit).toContain('OpenStreetMap contributors');
    expect(campus.sources[0].credit).toContain('ODbL');
    expect(campusIndex.source.license).toBe('ODbL-1.0');
    expect(campus.features.every(f => f.sourceFeatureId?.startsWith('way/') && f.properties.osm_version)).toBe(true);
    const steps = campus.features.filter(f => f.properties.highway === 'steps');
    expect(steps).toHaveLength(62);
    expect(steps.every(f => f.label.startsWith('Steps') || f.label.includes('way '))).toBe(true);
    expect(campus.features.filter(f => f.type === 'ramp')).toHaveLength(0);
  });
  it('keeps all five original collection memberships and unplaced Robertson evidence intact', () => {
    const atlas = createAtlas();
    expect(atlas.collections.slice(0, 5).map(c => c.id)).toEqual(['witherspoon', 'nassau-east', 'nassau-west', 'robertson', 'examples']);
    expect(atlas.collections.slice(0, 5).map(c => c.recordIds.length)).toEqual([8, 10, 12, 5, 2]);
    const field = atlas.records.filter(r => r.kind === 'field');
    expect(field).toHaveLength(5);
    expect(locatedFeatures(atlas, field)).toEqual([]);
    expect(atlas.records.filter(r => r.conflictGroup)).toHaveLength(2);
  });
  it('makes an exact source way discoverable without renumbering section records', () => {
    const c = campus.collections.at(-1)!;
    const r = recordsFor(campus, c)[3];
    const originalId = r.featureId.split(':').at(-1)!;
    const found = filteredRecords(campus, c, 'archive', originalId);
    expect(found.map(f => f.id)).toContain(r.id);
    expect(c.recordIds.indexOf(r.id)).toBe(3);
    expect(filteredRecords(campus, c, 'field', originalId)).toEqual([]);
  });
});
