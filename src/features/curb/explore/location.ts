import { selectionFor, type Atlas, type Filter } from './model';
import { campusSectionIds, isCampus } from './groups';
import { createCampusPointCatalog, findCampusPoint, POINT_CATEGORIES, type CampusPoint, type PointCategory } from '../../../data/curb/princeton-campus-points/adapter';

const POINT_SCOPES = ['all', 'section', 'context', 'unlinked', 'review'] as const;
export type PointScope = typeof POINT_SCOPES[number];
export type CampusPointLocation = { node: string | null; categories: PointCategory[]; scope: PointScope; query: string };
export const DEFAULT_POINT_LOCATION: CampusPointLocation = { node: null, categories: [], scope: 'all', query: '' };

let pointRecords: readonly CampusPoint[] | undefined;
export function getCampusPointRecords() {
  return pointRecords ??= createCampusPointCatalog().records;
}

function parsePointLocation(params: URLSearchParams): CampusPointLocation | undefined {
  const rawNode = params.get('node') ?? '';
  const node = /^[1-9]\d{0,15}$/.test(rawNode) ? findCampusPoint(getCampusPointRecords(), 'node/' + rawNode)?.sourceFeatureId ?? null : null;
  if (params.get('features') !== '1' && !node) return;
  const scope = POINT_SCOPES.find(value => value === params.get('featureScope')) ?? 'all';
  const requestedCategories = (params.get('featureKind') ?? '').split(',');
  return {
    node, scope, categories: POINT_CATEGORIES.filter(category => requestedCategories.includes(category)),
    query: (params.get('featureQ') ?? '').slice(0, 256),
  };
}

export type ExplorerPanel = 'map' | 'routes' | 'evidence';
/** `overview` (present only when true) is the campus overview: `?group=campus` with no campus section. */
export type ExplorerLocation = {
  collectionId: string; recordId: string; filter: Filter; query: string; panel: ExplorerPanel; overview?: true;
  point?: CampusPointLocation;
};

/** The catalog’s adjacent record and feature IDs disambiguate a complete OSM way ID from longer IDs. */
export function searchable(query: string): string {
  const id = /^way\/(\d+)$/i.exec(query.trim())?.[1];
  return id ? 'record:campus-osm-way:' + id + ' campus-osm-way:' + id : query.replace(/\bway\//gi, 'way:');
}

export function readExplorerLocation(atlas: Atlas, search: string): ExplorerLocation {
  const params = new URLSearchParams(search);
  const type = params.get('type');
  const filter: Filter = type === 'archive' || type === 'field' || type === 'synthetic' ? type : 'all';
  const query = (params.get('q') ?? '').slice(0, 256);
  const first = atlas.collections[0];
  const asked = params.get('collection');
  const explicitLegacyCollection = atlas.collections.some(c => c.id === asked && !isCampus(c.id));
  const point = explicitLegacyCollection ? undefined : parsePointLocation(params);
  // A valid node may open campus on its own. An explicit collection retains its existing view.
  const overview = !explicitLegacyCollection && !isCampus(asked) && (params.get('group') === 'campus' || Boolean(point?.node));
  const fallback = overview ? atlas.collections.find(c => c.id === campusSectionIds[0]) ?? first : first;
  const requested = atlas.collections.find(c => c.id === asked) ?? fallback;
  const recordId = requested.recordIds.includes(params.get('record') ?? '') ? params.get('record')! : requested.recordIds[0];
  const selected = selectionFor(atlas, filter, searchable(query), requested.id, recordId);
  const panel = params.get('panel');
  return {
    collectionId: selected.collection?.id ?? requested.id,
    recordId: selected.record?.id ?? recordId,
    filter, query, panel: panel === 'routes' || panel === 'evidence' ? panel : 'map',
    ...(overview ? { overview: true as const } : {}),
    ...(point && (isCampus(selected.collection?.id) || (overview && !query.trim() && selected.collections.some(c => isCampus(c.id))))
      ? { point: scopeForView(point, overview && !query.trim()) } : {}),
  };
}

function scopeForView(point: CampusPointLocation, overview: boolean) {
  return overview && point.scope === 'section' ? { ...point, scope: 'all' as const } : point;
}

/** Only replace owned fields, preserving unrelated parameters and the hash. */
export function explorerLocationUrl(href: string, state: ExplorerLocation): string {
  const url = new URL(href);
  if (state.overview) {
    url.searchParams.set('group', 'campus');
    url.searchParams.delete('collection');
    url.searchParams.delete('record');
  } else {
    url.searchParams.delete('group');
    url.searchParams.set('collection', state.collectionId);
    url.searchParams.set('record', state.recordId);
  }
  const point = state.point && (state.overview || isCampus(state.collectionId)) ? scopeForView(state.point, Boolean(state.overview) && !state.query.trim()) : undefined;
  for (const [key, value] of [
    ['features', point ? '1' : ''], ['node', point?.node?.slice('node/'.length) ?? ''],
    ['featureKind', point ? POINT_CATEGORIES.filter(category => point.categories.includes(category)).join(',') : ''],
    ['featureScope', point?.scope !== 'all' ? point?.scope ?? '' : ''], ['featureQ', point?.query ?? ''],
    ['type', state.filter === 'all' ? '' : state.filter], ['q', state.query],
    ['panel', state.panel === 'map' ? '' : state.panel],
  ]) {
    if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
  }
  return url.pathname + url.search + url.hash;
}
