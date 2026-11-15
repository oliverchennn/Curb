import { findPhotoEvidence } from './photoEvidence';
import { selectionFor, type Atlas, type Filter } from './model';
import { campusSectionIds, explorerAtlas, groupOf, isCampus } from './groups';
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
  photoId?: string;
  photoHidden?: true;
};

/** The catalog’s adjacent record and feature IDs disambiguate a complete OSM way ID from longer IDs. */
export function searchable(query: string): string {
  const id = /^way\/(\d+)$/i.exec(query.trim())?.[1];
  return id ? 'record:campus-osm-way:' + id + ' campus-osm-way:' + id : query.replace(/\bway\//gi, 'way:');
}

export function readExplorerLocation(
  atlas: Atlas, search: string, hasPhoto = (id: string) => Boolean(findPhotoEvidence(id)),
): ExplorerLocation {
  const params = new URLSearchParams(search);
  const visible = explorerAtlas(atlas);
  const group = params.get('group');
  const asked = params.get('collection');
  const askedRecord = params.get('record') ?? '';
  const explicitCollection = visible.collections.find(c => c.id === asked);
  const groupCollection = group === 'downtown' || group === 'field'
    ? visible.collections.find(c => groupOf(c.id) === group) : undefined;
  const recordCollection = asked ? undefined : visible.collections.find(c => c.recordIds.includes(askedRecord)
    && (group !== 'campus' || isCampus(c.id)));
  const explicit = explicitCollection ?? groupCollection ?? recordCollection;
  const type = params.get('type');
  const retired = !explicit && (group === 'examples' || asked === 'examples' || type === 'synthetic'
    || atlas.collections.some(c => c.kind === 'synthetic' && c.recordIds.includes(askedRecord)));
  const filter: Filter = !retired && (type === 'archive' || type === 'field') ? type : 'all';
  const query = retired ? '' : (params.get('q') ?? '').slice(0, 256);
  const requested = explicit ?? visible.collections.find(c => c.id === campusSectionIds[0]) ?? visible.collections[0];
  const recordId = requested.recordIds.includes(askedRecord) ? askedRecord : requested.recordIds[0];
  const selected = selectionFor(visible, filter, searchable(query), requested.id, recordId);
  const overview = !explicit && !query.trim() && selected.collections.some(c => isCampus(c.id));
  const campusView = (!explicit || isCampus(explicit.id)) && (overview || isCampus(selected.collection?.id));
  const photoHidden = campusView && params.get('photos') === 'off';
  const askedPhoto = params.get('photo');
  const photoId = campusView && !photoHidden && askedPhoto && hasPhoto(askedPhoto) ? askedPhoto : null;
  const point = campusView ? parsePointLocation(params) : undefined;
  const panel = params.get('panel');
  return {
    collectionId: selected.collection?.id ?? requested.id,
    recordId: selected.record?.id ?? recordId,
    filter, query, panel: !photoId && !overview && (panel === 'routes' || panel === 'evidence') ? panel : 'map',
    ...(overview ? { overview: true as const } : {}),
    ...(point ? { point: scopeForView(photoId ? { ...point, node: null } : point, overview) } : {}),
    ...(photoId ? { photoId } : {}),
    ...(photoHidden ? { photoHidden: true as const } : {}),
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
  const campusView = state.overview || isCampus(state.collectionId);
  const photoHidden = campusView && state.photoHidden;
  const photoId = campusView && !photoHidden ? state.photoId : undefined;
  const point = state.point && campusView ? scopeForView(state.point, Boolean(state.overview) && !state.query.trim()) : undefined;
  for (const [key, value] of [
    ['features', point ? '1' : ''], ['node', !photoId ? point?.node?.slice('node/'.length) ?? '' : ''],
    ['photos', photoHidden ? 'off' : ''], ['photo', photoId ?? ''],
    ['featureKind', point ? POINT_CATEGORIES.filter(category => point.categories.includes(category)).join(',') : ''],
    ['featureScope', point?.scope !== 'all' ? point?.scope ?? '' : ''], ['featureQ', point?.query ?? ''],
    ['type', state.filter === 'all' ? '' : state.filter], ['q', state.query],
    ['panel', state.panel === 'map' || photoId ? '' : state.panel],
  ]) {
    if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
  }
  return url.pathname + url.search + url.hash;
}
