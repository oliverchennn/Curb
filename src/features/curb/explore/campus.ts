import { campusIndex } from '../../../data/curb/princeton-campus/adapter';
import { campusAerial, tileExtent } from './aerial';
import { project, type Atlas } from './model';

type Bounds = [number, number, number, number];
export type CampusSection = (typeof campusIndex.sections)[number];
export const campusCounts = campusIndex.counts;
export const campusRetrievedAt = campusIndex.retrievedAt;

/** SVG-space box for [west, south, east, north] degrees, through the existing affine project(). */
export function boundsExtent([w, s, e, n]: Bounds) {
  const [x1, y1] = project([w, n]), [x2, y2] = project([e, s]);
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}
export const campusExtent = () => boundsExtent(campusIndex.bounds as Bounds);
export const sectionExtent = (s: CampusSection) => boundsExtent(s.bounds as Bounds);

export type ProjectedView = [number, number, number, number];

/** Center the full rectangle using one world-to-screen scale and a screen-space gutter. */
export function fitProjectedView([x, y, w, h]: ProjectedView, [width, height]: readonly number[]): ProjectedView {
  const gutter = Math.min(14, width / 8, height / 8);
  const unit = Math.max(w / (width - gutter * 2), h / (height - gutter * 2));
  const vw = width * unit, vh = height * unit;
  return [x + (w - vw) / 2, y + (h - vh) / 2, vw, vh];
}

export function campusOverviewBounds(): ProjectedView {
  const raster = tileExtent(campusAerial.overview), ways = campusExtent();
  const left = Math.min(raster.x, ways.x), top = Math.min(raster.y, ways.y);
  const right = Math.max(raster.x + raster.width, ways.x + ways.width);
  const bottom = Math.max(raster.y + raster.height, ways.y + ways.height);
  return [left, top, right - left, bottom - top];
}

/** One aggregated, non-interactive path per section (and one for the whole campus): the overview draws
 *  every source way without 1,188 separate elements, markers or tab stops. Geometry is not simplified. */
export function campusPaths(atlas: Atlas) {
  const byId = new Map(atlas.features.map(f => [f.id, f]));
  const sections = new Map<string, string>();
  for (const s of campusIndex.sections) {
    const parts: string[] = [];
    for (const id of s.featureIds) {
      const g = byId.get(id)?.geometry;
      if (g?.type === 'LineString') parts.push(g.coordinates.map((c, i) => `${i ? 'L' : 'M'}${project(c).map(v => v.toFixed(2)).join(',')}`).join(''));
    }
    sections.set(s.collectionId, parts.join(''));
  }
  return { sections, all: [...sections.values()].join('') };
}

/** Section membership audit: every selected way is drawn in exactly one section. */
export function sectionMembership(atlas: Atlas) {
  const seen = new Map<string, number>();
  for (const s of campusIndex.sections) for (const id of s.featureIds) seen.set(id, (seen.get(id) ?? 0) + 1);
  const campusFeatures = atlas.features.filter(f => f.id.startsWith('campus-osm-way:'));
  return { features: campusFeatures.length, joined: campusFeatures.filter(f => seen.get(f.id) === 1).length,
    duplicates: [...seen.values()].filter(n => n > 1).length, largest: Math.max(...campusIndex.sections.map(s => s.featureIds.length)) };
}
