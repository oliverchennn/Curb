// Client-safe entry point: this graph contains the public projection, never the internal handoff.
import catalog from './catalog.json';
import { campusPointCatalogSchema } from './contract';

export type { CampusPoint, CampusPointCatalog, CampusPointCounts, PointCategory, PointBounds } from './contract';
export type { CampusPointFilter } from './selectors';
export { POINT_CATEGORIES, CATEGORY_LABELS } from './contract';
export { findCampusPoint, selectCampusPoints, mapCampusPoints, countCampusPoints } from './selectors';

/** A fresh validated value; callers cannot mutate another consumer's catalog. No network or runtime registration. */
export function createCampusPointCatalog() {
  return campusPointCatalogSchema.parse(catalog);
}
