import { describe, expect, it } from 'vitest';
import { createCampusPointCatalog, findCampusPoint, selectCampusPoints, mapCampusPoints, countCampusPoints } from './adapter';
import type { PointBounds } from './contract';

const { records, acquisitionBounds } = createCampusPointCatalog();
describe('independent inventory and marker selection', () => {
  it('exposes all 333 campus records by default and resolves exact source identities only', () => {
    expect(selectCampusPoints(records)).toHaveLength(333);
    expect(findCampusPoint(records, 'node/8776287626')?.geometry).toBeNull();
    expect(findCampusPoint(records, 'node/10828764207')?.categories).toEqual(['crossing', 'kerb']);
    for (const invalid of ['8776287626', 'node/08776287626', 'way/8776287626', ' node/8776287626', 'node/nope']) expect(findCampusPoint(records, invalid)).toBeNull();
  });
  it('keeps location-review and empty-join records searchable regardless of the displayed line section', () => {
    const section = selectCampusPoints(records, { sectionCollectionIds: ['campus-central-aaa'] });
    expect(section.length).toBeGreaterThan(0);
    const unlinked = selectCampusPoints(records, { linkStatus: 'unlinked' });
    expect(unlinked).toHaveLength(38);
    for (const r of unlinked) {
      expect(selectCampusPoints(records, { query: r.sourceFeatureId }).map(p => p.id)).toEqual([r.id]);
      expect(selectCampusPoints(records, { nodeIds: [r.sourceNode.id], sectionCollectionIds: ['campus-central-aaa'] })).toEqual([]);
    }
    expect(selectCampusPoints(records, { query: 'confim exact location' })).toHaveLength(4);
    expect(mapCampusPoints(records, { query: 'confim exact location' })).toEqual([]);
  });
  it('distinguishes context and unlinked membership without treating source tags as traversal', () => {
    expect(selectCampusPoints(records, { boundaryStatus: 'retained-way-context' })).toHaveLength(60);
    expect(selectCampusPoints(records, { boundaryStatus: 'interior' })).toHaveLength(273);
    expect(selectCampusPoints(records, { boundaryStatus: 'retained-way-context', linkStatus: 'unlinked' })).toEqual([]);
    expect(selectCampusPoints(records, { locationStatus: 'location-review-needed' })).toHaveLength(4);
    expect(records.every(r => r.currentTraversal === 'unknown')).toBe(true);
  });
  it('deduplicates crossing/kerb unions and reports category memberships separately', () => {
    const crossing = selectCampusPoints(records, { categories: ['crossing'] });
    const kerb = selectCampusPoints(records, { categories: ['kerb'] });
    expect(crossing).toHaveLength(232); expect(kerb).toHaveLength(44);
    expect(selectCampusPoints(records, { categories: ['crossing', 'kerb', 'kerb'] })).toHaveLength(275);
    const counts = countCampusPoints([...crossing, ...kerb, ...crossing]);
    expect(counts.total).toBe(275); expect(counts.categoryMemberships.crossing + counts.categoryMemberships.kerb).toBe(276);
    expect(countCampusPoints([...records, ...records]).total).toBe(333);
  });
  it('deduplicates overlapping way/section/study-area membership using exact joins', () => {
    const shared = findCampusPoint(records, 'node/8948926332')!;
    expect(shared.studyAreaIds).toEqual(['central', 'east']);
    const byWays = selectCampusPoints(records, { selectedWayIds: [...shared.selectedWayIds, ...shared.selectedWayIds] });
    const bySections = selectCampusPoints(records, { sectionCollectionIds: shared.sectionCollectionIds });
    expect(byWays.filter(r => r.id === shared.id)).toHaveLength(1);
    expect(bySections.filter(r => r.id === shared.id)).toHaveLength(1);
    const union = selectCampusPoints(records, { studyAreaIds: ['central', 'east'] });
    expect(union.filter(r => r.id === shared.id)).toHaveLength(1);
    expect(countCampusPoints([...byWays, ...bySections]).total).toBe(new Set([...byWays, ...bySections].map(r => r.id)).size);
  });
  it('defines omitted lists as unrestricted and empty/unknown list selections as no matches', () => {
    expect(selectCampusPoints(records, { categories: [] })).toEqual([]);
    expect(selectCampusPoints(records, { selectedWayIds: [] })).toEqual([]);
    expect(selectCampusPoints(records, { sectionCollectionIds: ['campus-not-real'] })).toEqual([]);
    expect(selectCampusPoints(records, { query: '   ' })).toHaveLength(333);
    expect(countCampusPoints([])).toEqual({ total: 0, mapEligible: 0, locationReviewNeeded: 0, interior: 0, context: 0,
      linked: 0, unlinked: 0, selectedWayMemberships: 0, categoryMemberships: { crossing: 0, entrance: 0, kerb: 0, transit: 0 } });
  });
  it('uses inclusive [west,south,east,north] viewport bounds on normal geometry only', () => {
    expect(mapCampusPoints(records)).toHaveLength(329);
    expect(selectCampusPoints(records, { bounds: acquisitionBounds })).toHaveLength(329);
    const first = records[0]; const [x, y] = first.geometry!.coordinates;
    expect(mapCampusPoints(records, { bounds: [x, y, x, y] }).map(r => r.id)).toContain(first.id);
    for (const r of records.filter(r => !r.geometry)) {
      expect(selectCampusPoints([r], { bounds: [r.sourceNode.lon, r.sourceNode.lat, r.sourceNode.lon, r.sourceNode.lat] })).toEqual([]);
    }
    expect(mapCampusPoints([...records, ...records], { bounds: acquisitionBounds })).toHaveLength(329);
    expect(mapCampusPoints(records, { locationStatus: 'location-review-needed' })).toEqual([]);
  });
  it.each([[1, 0, -1, 1], [0, 2, 1, 1], [NaN, 0, 1, 1], [0, 0, Infinity, 1], [-181, 0, 1, 1], [0, -91, 1, 1], [0, 0, 1]])('rejects invalid viewport %j instead of silently returning all records', (...bounds) => {
    expect(() => selectCampusPoints(records, { bounds: bounds as unknown as PointBounds })).toThrow();
  });
  it('returns ascending numeric node IDs independent of source/filter order and never mutates input', () => {
    const original = JSON.stringify(records);
    const selected = selectCampusPoints([...records].reverse().concat(records), { categories: ['transit', 'crossing'] });
    const expected = records.filter(r => r.categories.includes('transit') || r.categories.includes('crossing'));
    expect(selected).toEqual(expected); expect(JSON.stringify(records)).toBe(original);
  });
});
