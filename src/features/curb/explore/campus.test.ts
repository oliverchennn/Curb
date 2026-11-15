import { describe, expect, it } from 'vitest';
import { createAtlas } from './data';
import { layoutCampusPointMarkers } from './CampusPointMarkers';
import { aerial, campusAerial, countFailedTiles, overviewResolution, tileExtent, visibleTiles } from './aerial';
import { campusExtent, campusPaths, sectionMembership } from './campus';
import { GROUPS, campusSectionIds, collectionsIn, groupOf, sourceClass } from './groups';
import { explorerLocationUrl, getCampusPointRecords, readExplorerLocation, searchable } from './location';
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

describe('optional campus point layer', () => {
  const records = getCampusPointRecords();
  const selected = records.find(point => point.sourceFeatureId === 'node/10828764207')!;
  const plot = { left: -10_000, right: 10_000, top: -10_000, bottom: 10_000 };

  it('keeps whole-fit markers limited to the eligible selection without changing coordinates', () => {
    const overview = layoutCampusPointMarkers(records, null, plot, 1, false, []);
    expect(overview).toMatchObject({ eligible: 329, markers: [] });
    const placed = layoutCampusPointMarkers(records, selected, plot, 1, false, []);
    const [x, y] = project(selected.geometry!.coordinates);
    expect(placed.markers).toEqual([{ point: selected, x, y, selected: true, interactive: false }]);
    const unplaced = records.find(point => point.sourceFeatureId === 'node/8776287626')!;
    expect(layoutCampusPointMarkers(records, unplaced, plot, 1, false, []).markers).toHaveLength(0);
  });

  it('reserves existing targets and keeps a colliding selection as a passive symbol', () => {
    const [x, y] = project(selected.geometry!.coordinates);
    const bounds = { left: x - 60, right: x + 60, top: y - 60, bottom: y + 60 };
    const reserved = [{ x, y }];
    const layout = layoutCampusPointMarkers([selected, selected], selected, bounds, 1, true, reserved);
    expect(layout.eligible).toBe(1);
    expect(layout.markers).toEqual([{ point: selected, x, y, selected: true, interactive: false }]);
  });

  it('gives the selection priority, limits close-zoom targets and never overlaps their hit areas', () => {
    const unit = 0.2;
    const layout = layoutCampusPointMarkers(records, selected, plot, unit, true, []);
    expect(layout.markers).toHaveLength(24);
    expect(layout.markers[0]).toMatchObject({ point: selected, interactive: true });
    const ordered = layout.markers.slice(1).map(marker => marker.point.sourceNode.id);
    expect(ordered).toEqual([...ordered].sort((a, b) => a - b));
    const width = 44 * unit;
    for (const [index, marker] of layout.markers.entries()) {
      const overlaps = layout.markers.slice(0, index).some(other => Math.abs(other.x - marker.x) < width && Math.abs(other.y - marker.y) < width);
      expect(overlaps).toBe(false);
    }
  });

  it('round-trips an exact point link with independent filters and preserves line state', () => {
    const query = '?collection=campus-east-b&record=record:campus-osm-way:284117254&type=archive&panel=evidence&node=8776287626&featureKind=kerb,crossing,kerb,bogus&featureScope=review&featureQ=node%2F8776287626';
    const state = readExplorerLocation(atlas, query);
    expect(state).toMatchObject({
      collectionId: 'campus-east-b', recordId: 'record:campus-osm-way:284117254', panel: 'evidence', filter: 'archive',
      point: { node: 'node/8776287626', categories: ['crossing', 'kerb'], scope: 'review', query: 'node/8776287626' },
    });
    const url = new URL(explorerLocationUrl('https://curb.example/curb/explore?keep=1#map', state), 'https://curb.example');
    expect(url.searchParams.get('keep')).toBe('1');
    expect(url.hash).toBe('#map');
    expect(readExplorerLocation(atlas, url.search)).toEqual(state);
  });

  it('honors legacy precedence and clears point URL fields when disabled', () => {
    const direct = readExplorerLocation(atlas, '?node=10828764207&featureScope=section');
    expect(direct).toMatchObject({ overview: true, point: { node: 'node/10828764207', scope: 'all' } });
    const invalid = readExplorerLocation(atlas, '?group=campus&node=1082876420');
    expect(invalid.point).toBeUndefined();
    const legacy = readExplorerLocation(atlas, '?collection=robertson&record=record:robertson:defect-05&panel=evidence&node=10828764207');
    expect(legacy).toMatchObject({ collectionId: 'robertson', recordId: 'record:robertson:defect-05', panel: 'evidence' });
    expect(legacy.point).toBeUndefined();
    const url = new URL(explorerLocationUrl('https://curb.example/curb/explore?features=1&node=10828764207&featureKind=kerb&featureScope=context&featureQ=kerb', {
      ...direct, point: undefined,
    }), 'https://curb.example');
    expect([...url.searchParams.keys()]).toEqual(['group']);
  });
});
