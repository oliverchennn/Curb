import { campusIndex } from '../../../data/curb/princeton-campus/adapter';
import type { Collection } from './model';

/** Four top-level groups replace one chip per collection. Collection IDs and deep links are unchanged. */
export type GroupId = 'downtown' | 'campus' | 'field' | 'examples';
export const GROUPS: { id: GroupId; label: string; detail: string }[] = [
  { id: 'downtown', label: 'Downtown archive', detail: 'DVRPC · 3 collections' },
  { id: 'campus', label: 'Campus (OSM)', detail: `${campusIndex.counts.selectedWays.toLocaleString('en-US')} ways · ${campusIndex.counts.sections} sections` },
  { id: 'field', label: 'Robertson field', detail: 'Actual photos' },
  { id: 'examples', label: 'Examples', detail: 'Synthetic' },
];
const DOWNTOWN = new Set(['witherspoon', 'nassau-east', 'nassau-west']);
const CAMPUS = new Set(campusIndex.sections.map(s => s.collectionId));

export function groupOf(collectionId: string): GroupId {
  if (DOWNTOWN.has(collectionId)) return 'downtown';
  if (CAMPUS.has(collectionId)) return 'campus';
  if (collectionId === 'robertson') return 'field';
  return 'examples';
}
export const isCampus = (collectionId: string | null | undefined) => Boolean(collectionId && CAMPUS.has(collectionId));
export const campusSections = campusIndex.sections;
export const campusSectionIds = campusIndex.sections.map(s => s.collectionId);

/** Collections in a group, in atlas order, limited to those the current filters still show. */
export const collectionsIn = (group: GroupId, visible: Collection[]) => visible.filter(c => groupOf(c.id) === group);

/** Display class for a source feature: OSM highway class when present, otherwise the archive feature type. */
const CLASS_NAMES: Record<string, string> = { footway: 'Footway', steps: 'Steps', path: 'Path', cycleway: 'Cycleway', pedestrian: 'Pedestrian way' };
export function sourceClass(properties: Record<string, string | number | null>, type: string): string {
  const highway = typeof properties.feat_type === 'string' && 'osm_way_id' in properties ? properties.feat_type : null;
  if (highway) return `${CLASS_NAMES[highway] ?? highway}${properties.footway === 'crossing' ? ' · crossing' : ''}`;
  return type.charAt(0).toUpperCase() + type.slice(1);
}
