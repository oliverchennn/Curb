import { campusIndex } from '../../../data/curb/princeton-campus/adapter';
import type { Atlas, Collection } from './model';
import { campusWayStyles, campusWayType } from './campus';

export type GroupId = 'campus' | 'downtown' | 'field';
export const GROUPS: { id: GroupId; label: string; detail: string }[] = [
  { id: 'campus', label: 'Campus (OSM)', detail: `${campusIndex.counts.selectedWays.toLocaleString('en-US')} ways · ${campusIndex.counts.sections} sections` },
  { id: 'downtown', label: 'Downtown archive', detail: 'DVRPC · 3 collections' },
  { id: 'field', label: 'Robertson field', detail: 'Actual photos' },
];
const DOWNTOWN = new Set(['witherspoon', 'nassau-east', 'nassau-west']);
const CAMPUS = new Set(campusIndex.sections.map(s => s.collectionId));

export function groupOf(collectionId: string): GroupId | null {
  if (DOWNTOWN.has(collectionId)) return 'downtown';
  if (CAMPUS.has(collectionId)) return 'campus';
  if (collectionId === 'robertson') return 'field';
  return null;
}
export const isCampus = (collectionId: string | null | undefined) => Boolean(collectionId && CAMPUS.has(collectionId));
export const campusSections = campusIndex.sections;
export const campusSectionIds = campusIndex.sections.map(s => s.collectionId);

/** Keep the Explorer collection picker and search on real evidence. */
export function explorerAtlas(atlas: Atlas): Atlas {
  return { ...atlas, collections: atlas.collections.filter(collection => groupOf(collection.id) !== null) };
}

/** Collections in a group, in atlas order, limited to those the current filters still show. */
export const collectionsIn = (group: GroupId, visible: Collection[]) => visible.filter(c => groupOf(c.id) === group);

/** Display the source-tag classification for OSM ways and the feature type for other records. */
export function sourceClass(properties: Record<string, string | number | null>, type: string): string {
  if ('osm_way_id' in properties) return campusWayStyles[campusWayType(properties)].label;
  return type.charAt(0).toUpperCase() + type.slice(1);
}
