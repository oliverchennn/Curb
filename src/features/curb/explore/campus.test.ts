import { describe, expect, it } from 'vitest';
import { createAtlas } from './data';
import { aerial, campusAerial, countFailedTiles, overviewResolution, tileExtent, visibleTiles } from './aerial';
import { campusExtent, campusPaths, sectionMembership } from './campus';
import { GROUPS, campusSectionIds, collectionsIn, groupOf, sourceClass } from './groups';
import { explorerLocationUrl, readExplorerLocation, searchable } from './location';
import { placeBadges, placeSectionTargets } from './labels';
import { locatedFeatures, project, recordsFor, selectionFor, traversalText } from './model';

const atlas = createAtlas();

describe('campus sections', () => {
  it('joins all 1,188 source ways through 22 sections exactly once, largest 63', () => {
    const m = sectionMembership(atlas);
    expect(m.features).toBe(1188);
    expect(m.joined).toBe(1188);
    expect(m.duplicates).toBe(0);
    expect(m.largest).toBe(63);
    expect(campusSectionIds).toHaveLength(22);
    for (const id of campusSectionIds) {
      const c = atlas.collections.find(x => x.id === id)!;
      expect(locatedFeatures(atlas, recordsFor(atlas, c))).toHaveLength(c.recordIds.length);
      expect(traversalText(c)).toBe('Current traversal: Unknown');
    }
  });
  it('draws the overview as 22 aggregated paths covering every way', () => {
    const p = campusPaths(atlas);
    expect(p.sections.size).toBe(22);
    const moves = (d: string) => (d.match(/M/g) ?? []).length;
    expect([...p.sections.values()].reduce((n, d) => n + moves(d), 0)).toBe(1188);
    expect(moves(p.all)).toBe(1188);
  });
  it('keeps every campus record an archive assertion with unknown capture and observation', () => {
    const records = atlas.records.filter(r => r.featureId.startsWith('campus-osm-way:'));
    expect(records).toHaveLength(1188);
    expect(records.every(r => r.kind === 'archive' && r.captured === null && r.observed === null && r.retrieved !== null)).toBe(true);
  });
});

describe('groups', () => {
  it('replaces 27 collection chips with four groups and keeps the five original IDs', () => {
    expect(GROUPS.map(g => g.id)).toEqual(['downtown', 'campus', 'field', 'examples']);
    expect(['witherspoon', 'nassau-east', 'nassau-west'].map(groupOf)).toEqual(['downtown', 'downtown', 'downtown']);
    expect(groupOf('robertson')).toBe('field');
    expect(groupOf('examples')).toBe('examples');
    expect(collectionsIn('campus', atlas.collections)).toHaveLength(22);
  });
  it('names source classes in words, especially steps', () => {
    const steps = atlas.features.find(f => f.properties.feat_type === 'steps' && 'osm_way_id' in f.properties)!;
    expect(sourceClass(steps.properties, steps.type)).toMatch(/^Steps/);
    expect(sourceClass({ status: 'EXISTING' }, 'ramp')).toBe('Ramp');
  });
});

describe('campus overview location', () => {
  it('restores exact source-ID search and does not guess a longer way ID for a prefix', () => {
    const result = readExplorerLocation(atlas, '?group=campus&q=way%2F284117254');
    expect(result.recordId).toBe('record:campus-osm-way:284117254');
    expect(result.collectionId).toBe('campus-east-b');
    expect(selectionFor(atlas, 'all', searchable('way/28411725'), result.collectionId, result.recordId).records).toEqual([]);
  });
  it('round-trips ?group=campus and keeps old collection links working', () => {
    const o = readExplorerLocation(atlas, '?group=campus');
    expect(o.overview).toBe(true);
    const url = new URL(explorerLocationUrl('https://curb.example/curb/explore?collection=witherspoon', o), 'https://curb.example');
    expect(url.searchParams.get('group')).toBe('campus');
    expect(url.searchParams.has('collection')).toBe(false);
    expect(readExplorerLocation(atlas, url.search).overview).toBe(true);
    const section = readExplorerLocation(atlas, '?group=campus&collection=campus-central-aaa');
    expect(section.overview).toBeUndefined();
    expect(section.collectionId).toBe('campus-central-aaa');
    for (const id of ['witherspoon', 'nassau-east', 'nassau-west', 'robertson', 'examples']) {
      expect(readExplorerLocation(atlas, `?collection=${id}`).collectionId).toBe(id);
      expect(readExplorerLocation(atlas, `?collection=${id}`).overview).toBeUndefined();
    }
  });
});

describe('campus aerial tiles', () => {
  const ext = campusExtent();
  it('loads no detail tile at whole-campus scale', () => {
    const view: [number, number, number, number] = [ext.x, ext.y, ext.width, ext.height];
    expect(visibleTiles(view, 900 / ext.width)).toEqual([]);
  });
  it('loads only intersecting tiles once zoom needs them, including across a tile boundary', () => {
    const t = campusAerial.tiles[0], e = tileExtent(t);
    const inside: [number, number, number, number] = [e.x + 10, e.y + 10, 100, 80];
    const ppu = overviewResolution() * 3;
    expect(visibleTiles(inside, ppu).map(x => x.id)).toEqual([t.id]);
    const corner: [number, number, number, number] = [e.x + e.width - 50, e.y + e.height - 50, 100, 100];
    expect(visibleTiles(corner, ppu).length).toBe(4);
  });
  it('counts only visible campus tiles, excluding failed corridor and offscreen images', () => {
    const [visible, offscreen] = campusAerial.tiles;
    expect(countFailedTiles([visible], new Set([offscreen.src, aerial.src, campusAerial.overview.src]))).toBe(0);
    expect(countFailedTiles([visible], new Set([visible.src, offscreen.src, aerial.src]))).toBe(1);
  });
  it('places tiles through the existing projection, edge to edge', () => {
    const [a, b] = [campusAerial.tiles[0], campusAerial.tiles[1]];
    expect(tileExtent(a).x + tileExtent(a).width).toBeCloseTo(tileExtent(b).x, 6);
    expect(tileExtent(a).x).toBeCloseTo(project([a.bounds.west, a.bounds.north])[0], 9);
  });
});

describe('overview pointer targets', () => {
  it('keeps 22 touch targets independent even if section centers coincide', () => {
    const anchors = Array.from({ length: 22 }, (_, i) => ({ id: String(i), x: 170, y: 140 }));
    const targets = [...placeSectionTargets(anchors, { left: 0, right: 350, top: 0, bottom: 440 }, 1).values()];
    expect(targets).toHaveLength(22);
    expect(targets.every(({ x, y }) => x >= 22 && x <= 328 && y >= 22 && y <= 418)).toBe(true);
    expect(targets.every((a, i) => targets.slice(0, i).every(b => Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) >= 44))).toBe(true);
  });
});

describe('dense badges', () => {
  it('hides crowded secondary badges but never the selected one', () => {
    const anchors = Array.from({ length: 30 }, (_, i) => ({ id: `r${i}`, x: i % 3, y: Math.floor(i / 3), dy: -5 }));
    const placed = placeBadges(anchors, 20, [], { left: -60, top: -60, right: 60, bottom: 60 }, { hideCrowded: true, keep: 'r29' });
    expect(placed.has('r29')).toBe(true);
    expect(placed.size).toBeLessThan(30);
    const spots = [...placed.values()];
    for (let i = 0; i < spots.length; i++) for (let j = i + 1; j < spots.length; j++) {
      if (![...placed.keys()][i].startsWith('r29') && ![...placed.keys()][j].startsWith('r29')) {
        expect(Math.hypot(spots[i].x - spots[j].x, spots[i].y - spots[j].y)).toBeGreaterThanOrEqual(20 * 2.25 - 1e-9);
      }
    }
  });
});
