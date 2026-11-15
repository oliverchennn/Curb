import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { buildCampus, inArea, intersectsArea, joinRings, partition, MAX_SECTION_WAYS } from '../../../../scripts/import-princeton-campus.mjs';

type SourceElement = { type: string; id: number; version: number; timestamp: string; lon?: number; lat?: number; nodes?: number[]; tags?: Record<string, string> };
const read = (name: string) => JSON.parse(readFileSync(new URL(name, import.meta.url), 'utf8'));
const source = read('osm-source.json') as { elements: SourceElement[] };
const committed = read('campus.json') as typeof import('./campus.json');
const outer = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];
const inner = [[3, 3], [7, 3], [7, 7], [3, 7], [3, 3]];
const area = { outer: [outer], inner: [inner] };

describe('campus source inclusion', () => {
  it('respects holes and includes a segment crossing an area with both endpoints outside', () => {
    expect(inArea([1, 1], area)).toBe(true);
    expect(inArea([5, 5], area)).toBe(false);
    expect(intersectsArea([[4, 4], [6, 6]], area)).toBe(false);
    expect(intersectsArea([[-2, 2], [12, 2]], area)).toBe(true);
    expect(intersectsArea([[-1, -1], [0, 0]], area)).toBe(true);
    expect(intersectsArea([[-1, 11], [11, 11]], area)).toBe(false);
  });

  it('joins reversed boundary members by original node ID and fails on an unclosed ring', () => {
    const nodes = new Map([[1, { lon: 0, lat: 0 }], [2, { lon: 10, lat: 0 }], [3, { lon: 10, lat: 10 }], [4, { lon: 0, lat: 10 }]]);
    const ways = new Map([[11, { nodes: [1, 2, 3] }], [12, { nodes: [1, 4, 3] }]]);
    const members = [{ type: 'way', ref: 11, role: 'outer' }, { type: 'way', ref: 12, role: 'outer' }];
    expect(joinRings(members, ways, nodes, 'outer')).toEqual([outer]);
    expect(() => joinRings(members.slice(0, 1), ways, nodes, 'outer')).toThrow('Unclosed');
  });

  it('reproduces all committed output and reconciles every candidate with selected or excluded IDs', () => {
    expect(buildCampus(source)).toEqual(committed);
    expect(committed.counts.selectedWays).toBe(1188);
    const all = [...committed.features.map(f => f.id), ...committed.excluded.outsideArea, ...committed.excluded.pedestrianAreas];
    expect(all.length).toBe(committed.counts.candidateWays);
    expect(new Set(all).size).toBe(all.length);
    expect(committed.boundaries.map(b => b.sourceId)).toEqual([6365145, 1389673622]);
    expect(committed.boundaries[0].inner).toHaveLength(2);
    expect(committed.features.filter(f => f.area === 'meadows')).toHaveLength(40);
  });

  it('preserves every selected node coordinate, node order, source version, tag and timestamp', () => {
    const nodes = new Map(source.elements.filter(e => e.type === 'node').map(n => [n.id, n]));
    const ways = new Map(source.elements.filter(e => e.type === 'way').map(w => [w.id, w]));
    for (const f of committed.features) {
      const w = ways.get(f.id)!;
      expect(f.nodes).toEqual(w.nodes);
      expect(f.geometry.coordinates).toEqual(w.nodes!.map(id => [nodes.get(id)!.lon, nodes.get(id)!.lat]));
      expect([f.version, f.editedAt, f.tags]).toEqual([w.version, w.timestamp, w.tags]);
    }
  });

  it('covers each way exactly once in bounded spatial sections, including sparse areas', () => {
    const ids = committed.sections.flatMap(s => s.wayIds);
    expect([...ids].sort((a, b) => a - b)).toEqual(committed.features.map(f => f.id));
    expect(committed.sections.every(s => s.wayIds.length > 0 && s.wayIds.length <= MAX_SECTION_WAYS && s.id.startsWith('campus-'))).toBe(true);
    expect(committed.studyAreas.reduce((n, a) => n + a.count, 0)).toBe(1188);
    const identicalCenters = Array.from({ length: 149 }, (_, id) => ({ id, center: [1, 1] }));
    const parts = partition(identicalCenters) as { features: typeof identicalCenters }[];
    expect(parts.flatMap(p => p.features).map(f => f.id)).toEqual(identicalCenters.map(f => f.id));
    expect(parts.every(p => p.features.length <= MAX_SECTION_WAYS)).toBe(true);
  });

  it('fails closed for duplicate objects or missing nodes, instead of inventing a connector', () => {
    expect(() => buildCampus({ ...source, elements: [...source.elements, source.elements[0]] })).toThrow('Duplicate');
    const first = committed.features[0].nodes[0];
    expect(() => buildCampus({ ...source, elements: source.elements.filter(e => !(e.type === 'node' && e.id === first)) })).toThrow(/Missing|Incomplete/);
  });

  it('pins the retained source snapshot and keeps edit times distinct from absent observations', () => {
    const bytes = readFileSync(new URL('osm-source.json', import.meta.url));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(read('provenance.json').sourceSnapshotSha256);
    expect(committed.license).toBe('ODbL-1.0');
    expect(committed.counts.unknownTags).toMatchObject({ width: 1166, incline: 1169, wheelchair: 1187 });
    expect(committed.features.every(f => !('observed' in f) && !('captured' in f))).toBe(true);
  });
});
