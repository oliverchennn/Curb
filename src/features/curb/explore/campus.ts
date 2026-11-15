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

export const campusWayStyles = {
  steps: { label: 'Steps', color: '#b83324', dash: '2 4' },
  crossing: { label: 'Crossings', color: '#7a36a8', dash: '7 4' },
  cycleway: { label: 'Cycleways', color: '#2259b6', dash: '12 3 2 3' },
  sidewalk: { label: 'Sidewalks', color: '#007b87', dash: undefined },
  footway: { label: 'Footways & paths', color: '#278344', dash: undefined },
  unclassified: { label: 'Unclassified', color: '#575b60', dash: '10 6' },
} as const;

export type CampusWayType = keyof typeof campusWayStyles;
export const campusWayTypes = Object.keys(campusWayStyles) as CampusWayType[];
type SourceProperties = Atlas['features'][number]['properties'];

export function campusWayType({ highway, footway }: SourceProperties): CampusWayType {
  if (highway === 'steps') return 'steps';
  if (highway !== 'footway' && highway !== 'path' && highway !== 'cycleway') return 'unclassified';
  if (footway === 'crossing') return 'crossing';
  if (highway === 'cycleway') return 'cycleway';
  if (footway === 'sidewalk') return 'sidewalk';
  return 'footway';
}

const adapterFields = new Set(['osm_way_id', 'osm_version', 'osm_edited_at', 'material', 'feat_type', 'captured']);

export function campusSourceTags(properties: SourceProperties) {
  return Object.entries(properties).filter(([key, value]) => !adapterFields.has(key) && typeof value === 'string');
}

/** Aggregate paths by source class. Each source geometry is drawn once in the overview. */
export function campusPaths(atlas: Atlas) {
  const byId = new Map(atlas.features.map(feature => [feature.id, feature]));
  const parts = Object.fromEntries(campusWayTypes.map(type => [type, [] as string[]])) as Record<CampusWayType, string[]>;
  for (const section of campusIndex.sections) {
    for (const id of section.featureIds) {
      const feature = byId.get(id);
      if (feature?.geometry?.type !== 'LineString') continue;
      parts[campusWayType(feature.properties)].push(feature.geometry.coordinates.map((point, i) =>
        (i ? 'L' : 'M') + project(point).map(value => value.toFixed(2)).join(',')).join(''));
    }
  }
  const ways = campusWayTypes.map(type => ({ type, count: parts[type].length, path: parts[type].join('') }));
  return { ways, all: ways.map(way => way.path).join('') };
}

/** Section membership audit: every selected way is drawn in exactly one section. */
export function sectionMembership(atlas: Atlas) {
  const seen = new Map<string, number>();
  for (const s of campusIndex.sections) for (const id of s.featureIds) seen.set(id, (seen.get(id) ?? 0) + 1);
  const campusFeatures = atlas.features.filter(f => f.id.startsWith('campus-osm-way:'));
  return { features: campusFeatures.length, joined: campusFeatures.filter(f => seen.get(f.id) === 1).length,
    duplicates: [...seen.values()].filter(n => n > 1).length, largest: Math.max(...campusIndex.sections.map(s => s.featureIds.length)) };
}
