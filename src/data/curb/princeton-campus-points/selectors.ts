import { countCampusPoints, pointBoundsSchema } from './contract';
import type { CampusPoint, PointBounds, PointCategory } from './contract';

export { countCampusPoints };
export interface CampusPointFilter {
  categories?: readonly PointCategory[];
  nodeIds?: readonly number[];
  selectedWayIds?: readonly number[];
  sectionCollectionIds?: readonly string[];
  studyAreaIds?: readonly string[];
  boundaryStatus?: CampusPoint['boundaryStatus'];
  linkStatus?: 'linked' | 'unlinked';
  locationStatus?: CampusPoint['locationStatus'];
  query?: string;
  bounds?: PointBounds;
}

/** Exact original OSM identity only: no fuzzy match, coercion, nearest-node or inferred join. */
export function findCampusPoint(records: readonly CampusPoint[], sourceFeatureId: string): CampusPoint | null {
  return records.find(r => r.sourceFeatureId === sourceFeatureId) ?? null;
}

/** OR within a list, AND across filters. Omitted lists are unrestricted; [] selects none.
 * Bounds include edges and inspect eligible geometry only, never an unplaced source coordinate.
 */
export function selectCampusPoints(records: readonly CampusPoint[], filter: CampusPointFilter = {}): CampusPoint[] {
  const bounds = filter.bounds === undefined ? undefined : pointBoundsSchema.parse(filter.bounds);
  const tokens = (filter.query ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  const intersects = <T>(values: readonly T[], wanted: readonly T[] | undefined) => wanted === undefined || wanted.some(v => values.includes(v));
  const distinct = [...new Map(records.map(r => [r.sourceFeatureId, r])).values()];
  return distinct.filter(r => {
    if (!intersects(r.categories, filter.categories) || !intersects([r.sourceNode.id], filter.nodeIds)
      || !intersects(r.selectedWayIds, filter.selectedWayIds) || !intersects(r.sectionCollectionIds, filter.sectionCollectionIds)
      || !intersects(r.studyAreaIds, filter.studyAreaIds)) return false;
    if (filter.boundaryStatus && r.boundaryStatus !== filter.boundaryStatus) return false;
    if (filter.linkStatus && (r.selectedWayIds.length ? 'linked' : 'unlinked') !== filter.linkStatus) return false;
    if (filter.locationStatus && r.locationStatus !== filter.locationStatus) return false;
    if (bounds) {
      if (!r.geometry) return false;
      const [x, y] = r.geometry.coordinates;
      if (x < bounds[0] || y < bounds[1] || x > bounds[2] || y > bounds[3]) return false;
    }
    if (tokens.length) {
      const text = [r.id, r.sourceFeatureId, r.label, ...r.categories, ...r.sectionCollectionIds,
        ...r.studyAreaIds, ...r.selectedWayIds, ...Object.entries(r.sourceNode.tags).flat()].join(' ').toLowerCase();
      if (!tokens.every(token => text.includes(token))) return false;
    }
    return true;
  }).sort((a, b) => a.sourceNode.id - b.sourceNode.id);
}

export function mapCampusPoints(records: readonly CampusPoint[], filter: CampusPointFilter = {}) {
  return selectCampusPoints(records, filter).filter((r): r is CampusPoint & { geometry: NonNullable<CampusPoint['geometry']> } => r.geometry !== null);
}
