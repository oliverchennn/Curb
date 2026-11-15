import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import raw from './point-source.json';
import publicData from './catalog.json';
import lines from '../princeton-campus/campus.json';
import index from '../princeton-campus/campus-index.json';
import lineSource from '../princeton-campus/osm-source.json';
import { buildPublicPointCatalog } from './build-catalog';
import { campusPointCatalogSchema, POINT_SOURCE_SHA256, LOCATION_REVIEW_NODE_IDS } from './contract';
import { createCampusPointCatalog } from './adapter';

const catalog = createCampusPointCatalog();
const bytes = (path: string) => readFileSync(new URL(path, import.meta.url));
const sha = (value: Buffer) => createHash('sha256').update(value).digest('hex');
const canonical = (value: unknown) => JSON.stringify(value, null, 2) + '\n';

describe('frozen point source and public projection', () => {
  it('keeps the handoff and four unchanged line-data hashes intact, retaining the prior audit digest', () => {
    expect(bytes('./point-source.json').length).toBe(358056);
    expect(sha(bytes('./point-source.json'))).toBe(POINT_SOURCE_SHA256);
    for (const [file, expected] of [
      ['campus.json', raw.inputs.lineDataset.sha256], ['osm-source.json', raw.inputs.sanitizedLineSource.sha256],
      ['provenance.json', raw.inputs.lineProvenance.sha256], ['campus-index.json', raw.inputs.browseIndex.sha256],
    ]) expect(sha(bytes(`../princeton-campus/${file}`))).toBe(expected);
    expect(raw.inputs.coverageAudit.sha256).toBe('57d3c0824ca8d450b8d264475faa92d49b871995d82a1d53b6e322d925d77c34');
  });

  it('reproduces the public bytes with no clock/network dependence', () => {
    expect(canonical(buildPublicPointCatalog(raw))).toBe(bytes('./catalog.json').toString('utf8'));
    expect(buildPublicPointCatalog(raw)).toEqual(catalog);
    expect(campusPointCatalogSchema.parse(publicData)).toEqual(catalog);
  });

  it('keeps every original node field, all tags, all categories and source identities', () => {
    expect(catalog.records).toHaveLength(333);
    expect(new Set(catalog.records.map(r => r.sourceFeatureId)).size).toBe(333);
    for (const original of raw.records) {
      const point = catalog.records.find(r => r.sourceNode.id === original.id)!;
      const { type, id, lat, lon, version, timestamp, tags } = original;
      expect(point.sourceNode).toEqual({ type, id, lat, lon, version, timestamp, tags });
      expect(point.sourceFeatureId).toBe(original.sourceFeatureId);
      expect(point.categories).toEqual(original.categories);
      expect(point.sourceMatch).toBe('exact-source-node');
      expect(point.boundaryStatus).toBe(original.boundaryStatus);
    }
  });

  it('independently reconciles every exact way, section and study-area membership against the line snapshot', () => {
    let joins = 0;
    for (const point of catalog.records) {
      const ways = lines.features.filter(w => w.nodes.includes(point.sourceNode.id));
      joins += ways.length;
      expect(point.selectedWayIds).toEqual(ways.map(w => w.id).sort((a, b) => a - b));
      expect(point.studyAreaIds).toEqual([...new Set(ways.map(w => w.area))].sort());
      const features = new Set(ways.map(w => `campus-osm-way:${w.id}`));
      expect(point.sectionCollectionIds).toEqual(index.sections.filter(s => s.featureIds.some(id => features.has(id))).map(s => s.collectionId).sort());
      for (const way of ways) expect(way.geometry.coordinates[way.nodes.indexOf(point.sourceNode.id)]).toEqual([point.sourceNode.lon, point.sourceNode.lat]);
    }
    expect(joins).toBe(330);
    expect(lines.features).toHaveLength(1188);
    expect(index.sections).toHaveLength(22);
  });

  it('reconciles 295 existing source nodes and 38 recovered unlinked nodes without invented joins', () => {
    const existing = new Map(lineSource.elements.filter(e => e.type === 'node').map(e => [e.id, e]));
    expect(catalog.records.filter(r => r.inSanitizedSource)).toHaveLength(295);
    const unlinked = catalog.records.filter(r => !r.inSanitizedSource);
    expect(unlinked).toHaveLength(38);
    for (const r of catalog.records) {
      if (r.inSanitizedSource) expect(existing.get(r.sourceNode.id)).toEqual(r.sourceNode);
      else {
        expect(existing.has(r.sourceNode.id)).toBe(false);
        expect([r.selectedWayIds, r.sectionCollectionIds, r.studyAreaIds]).toEqual([[], [], []]);
        expect(r.auditGrouping).toEqual({ studyAreaId: raw.records.find(n => n.id === r.sourceNode.id)!.unlinkedAuditStudyAreaId, basis: 'authored-coordinate-audit-only' });
      }
    }
  });

  it('preserves all response URL/hash/date lineage, including five nodes with an undated relation receipt', () => {
    expect(catalog.responses).toEqual(raw.responses);
    expect(catalog.records.filter(r => r.retrieval.hasResponseWithUnknownRetrievalTime)).toHaveLength(5);
    for (const r of catalog.records) {
      const original = raw.records.find(n => n.id === r.sourceNode.id)!;
      expect(r.sourceResponseIds).toEqual(original.sourceResponseIds);
      expect(r.retrieval).toEqual(original.retrieval);
      expect(r.observedAt).toBeNull(); expect(r.capturedAt).toBeNull(); expect(r.currentTraversal).toBe('unknown');
    }
    expect(catalog.responses.find(r => r.kind === 'relation-full-response')!.retrievedAt).toBeNull();
  });

  it('curates precisely four unresolved source locations out of normal map geometry, retaining exact coordinates and notes', () => {
    const review = catalog.records.filter(r => r.geometry === null);
    expect(review.map(r => r.sourceNode.id)).toEqual(LOCATION_REVIEW_NODE_IDS);
    for (const r of review) {
      expect(r.locationStatus).toBe('location-review-needed');
      expect(r.locationReviewNote).toBe('confim exact location');
      expect(r.sourceNode.tags.fixme).toBe(r.locationReviewNote);
      expect(r.sourceNode.lon).toBeTypeOf('number'); expect(r.sourceNode.lat).toBeTypeOf('number');
    }
    for (const r of catalog.records.filter(r => r.geometry)) {
      expect(r.geometry!.coordinates).toEqual([r.sourceNode.lon, r.sourceNode.lat]);
      expect(r.locationStatus).toBe('source-position'); expect(r.locationReviewNote).toBeNull();
    }
  });

  it('publishes truthful distinct counts, overlapping membership totals, licensing and original-position bounds', () => {
    expect(catalog.counts).toEqual({ total: 333, mapEligible: 329, locationReviewNeeded: 4, interior: 273, context: 60,
      linked: 295, unlinked: 38, selectedWayMemberships: 330,
      categoryMemberships: { crossing: 232, entrance: 38, kerb: 44, transit: 20 } });
    expect(catalog.source.credit).toBe('© OpenStreetMap contributors');
    expect(catalog.source.license).toBe('ODbL-1.0');
    expect(catalog.source.pointSourceSha256).toBe(POINT_SOURCE_SHA256);
    expect(catalog.bounds).toEqual([Math.min(...raw.records.map(r => r.lon)), Math.min(...raw.records.map(r => r.lat)), Math.max(...raw.records.map(r => r.lon)), Math.max(...raw.records.map(r => r.lat))]);
  });

  it('uses an allowlist: no handoff wrapper/private repository/task/branch/chat metadata enters public data', () => {
    const text = JSON.stringify(catalog);
    expect(text).not.toMatch(/github\.com|codex\/|\/workspace|6af808fa|CURB-CAMPUS-POINT-SOURCE|Source handoff only/);
    for (const key of ['inputs', 'task', 'baseCommit', 'purpose', 'branch', 'session']) expect(catalog).not.toHaveProperty(key);
    const poisoned = { ...raw, inputs: { privatePath: '/private/repository' }, purpose: 'INTERNAL-ONLY', task: 'INTERNAL-ONLY', extraInternal: 'INTERNAL-ONLY' };
    expect(buildPublicPointCatalog(poisoned)).toEqual(catalog);
  });

  it('keeps the client entry graph independent of the raw handoff and offline generator', () => {
    for (const file of ['adapter.ts', 'contract.ts', 'selectors.ts']) {
      const imports = [...bytes(`./${file}`).toString('utf8').matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)].map(m => m[1]);
      expect(imports.some(path => /point-source|build-catalog|generate|node:/.test(path))).toBe(false);
    }
    expect(bytes('./adapter.ts').toString('utf8')).toContain("from './catalog.json'");
  });

  it('normalizes input order without mutating the source, and returns independent consumer values', () => {
    const shuffled = structuredClone(raw); shuffled.records.reverse(); shuffled.responses.reverse();
    for (const r of shuffled.records) {
      r.categories.reverse(); r.selectedWayIds.reverse(); r.sectionCollectionIds.reverse(); r.studyAreaIds.reverse(); r.sourceResponseIds.reverse();
    }
    const before = canonical(shuffled);
    expect(canonical(buildPublicPointCatalog(shuffled))).toBe(canonical(catalog));
    expect(canonical(shuffled)).toBe(before);
    const consumer = createCampusPointCatalog(); consumer.records[0].sourceNode.tags.extra = 'local edit';
    expect(createCampusPointCatalog()).toEqual(catalog);
  });
});

describe('catalog boundary rejects contradictory evidence', () => {
  it.each([
    ['empty inventory', (c: typeof catalog) => { c.records = []; }],
    ['missing receipt catalog', (c: typeof catalog) => { c.responses = []; }],
    ['duplicate source ID', (c: typeof catalog) => { c.records[1] = c.records[0]; }],
    ['invented passability', (c: typeof catalog) => { (c.records[0] as unknown as { currentTraversal: string }).currentTraversal = 'pass'; }],
    ['invented observation date', (c: typeof catalog) => { (c.records[0] as unknown as { observedAt: string }).observedAt = c.records[0].sourceNode.timestamp; }],
    ['moved geometry', (c: typeof catalog) => { c.records[0].geometry!.coordinates[0] += .001; }],
    ['placed fixme', (c: typeof catalog) => { const r = c.records.find(r => !r.geometry)!; r.geometry = { type: 'Point', coordinates: [r.sourceNode.lon, r.sourceNode.lat] }; }],
    ['missing receipt', (c: typeof catalog) => { c.records[0].sourceResponseIds = ['missing']; }],
    ['invented retrieval date', (c: typeof catalog) => { c.records[0].retrieval.earliestKnownAt = c.records[0].sourceNode.timestamp; }],
    ['wrong category', (c: typeof catalog) => { c.records[0].categories = ['transit']; }],
    ['duplicate membership', (c: typeof catalog) => { c.records[0].selectedWayIds.push(c.records[0].selectedWayIds[0]); }],
    ['inferred section for unlinked node', (c: typeof catalog) => { c.records.find(r => !r.selectedWayIds.length)!.sectionCollectionIds = ['campus-central-aaa']; }],
    ['wrong counts', (c: typeof catalog) => { c.counts.total = 334; }],
    ['nonfinite source coordinate', (c: typeof catalog) => { c.records[0].sourceNode.lon = NaN; }],
  ])('rejects %s', (_, mutate) => {
    const altered = structuredClone(catalog); mutate(altered);
    expect(campusPointCatalogSchema.safeParse(altered).success).toBe(false);
  });
});
