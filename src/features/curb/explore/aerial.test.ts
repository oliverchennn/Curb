import { describe, expect, it } from 'vitest';
import metadata from '../../../../public/curb/explore/aerial/princeton-2020.json';
import { createAtlas } from './data';
import { aerial, aerialExtent, insideAerial } from './aerial';
import { placeBadges } from './labels';
import { locatedFeatures, recordsFor, vertices } from './model';

describe('aerial context', () => {
  it('maps the degree raster through the existing projection, matching root registration', () => {
    const e = aerialExtent();
    expect(e.x).toBeCloseTo(metadata.projectionCheck.x, 6);
    expect(e.y).toBeCloseTo(metadata.projectionCheck.y, 6);
    expect(e.width).toBeCloseTo(metadata.projectionCheck.width, 6);
    expect(e.height).toBeCloseTo(metadata.projectionCheck.height, 6);
  });
  it('covers every located archive vertex in all three archive collections', () => {
    const a = createAtlas();
    const archive = a.collections.filter(c => c.kind === 'archive');
    expect(archive).toHaveLength(3);
    for (const c of archive) {
      const points = locatedFeatures(a, recordsFor(a, c)).flatMap(vertices) as [number, number][];
      expect(points.length).toBeGreaterThan(0);
      expect(points.every(p => insideAerial(p))).toBe(true);
    }
  });
  it('keeps the capture date unknown and the source local', () => {
    expect(aerial.capturedAt).toBeNull();
    expect(aerial.captureYear).toBe(2020);
    expect(aerial.src.startsWith('/curb/explore/aerial/')).toBe(true);
  });
});

describe('badge placement', () => {
  it('leaves isolated badges at their default position', () => {
    const p = placeBadges([{ id: 'a', x: 0, y: 0, dy: -10 }, { id: 'b', x: 100, y: 0, dy: -10 }], 8);
    expect(p.get('a')).toEqual({ x: 0, y: -10, moved: false });
    expect(p.get('b')).toEqual({ x: 100, y: -10, moved: false });
  });
  it('separates coincident anchors without moving the anchors themselves', () => {
    const anchors = [1, 2, 3, 4].map(i => ({ id: String(i), x: 5, y: 5, dy: -10 }));
    const p = [...placeBadges(anchors, 8).values()];
    for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) expect(Math.hypot(p[i].x - p[j].x, p[i].y - p[j].y)).toBeGreaterThanOrEqual(8 * 2.25 - 1e-9);
    expect(p.filter(x => x.moved)).toHaveLength(3);
    expect(anchors.every(a => a.x === 5 && a.y === 5)).toBe(true);
  });
  it('never places a badge on another stop’s point marker', () => {
    const markers = [{ id: 'ramp', x: 0, y: -12 }];
    const p = placeBadges([{ id: 'line', x: 0, y: 0, dy: -12 }, { id: 'ramp', x: 0, y: -12, dy: -15 }], 8, markers);
    const b = p.get('line')!;
    expect(Math.hypot(b.x - 0, b.y + 12)).toBeGreaterThanOrEqual(8 * 1.9 - 1e-9);
    expect(b.moved).toBe(true);
  });
  it('is deterministic', () => {
    const anchors = [{ id: 'a', x: 0, y: 0, dy: -10 }, { id: 'b', x: 2, y: 1, dy: -10 }, { id: 'c', x: 1, y: 3, dy: -10 }];
    expect([...placeBadges(anchors, 8)]).toEqual([...placeBadges(anchors, 8)]);
  });
});
