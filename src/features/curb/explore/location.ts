import { selectionFor, type Atlas, type Filter } from './model';

export type ExplorerPanel = 'map' | 'routes' | 'evidence';
export type ExplorerLocation = {
  collectionId: string; recordId: string; filter: Filter; query: string; panel: ExplorerPanel;
};

export function readExplorerLocation(atlas: Atlas, search: string): ExplorerLocation {
  const params = new URLSearchParams(search);
  const type = params.get('type');
  const filter: Filter = type === 'archive' || type === 'field' || type === 'synthetic' ? type : 'all';
  const query = (params.get('q') ?? '').slice(0, 256);
  const first = atlas.collections[0];
  const requested = atlas.collections.find(c => c.id === params.get('collection')) ?? first;
  const recordId = requested.recordIds.includes(params.get('record') ?? '') ? params.get('record')! : requested.recordIds[0];
  const selected = selectionFor(atlas, filter, query, requested.id, recordId);
  const panel = params.get('panel');
  return {
    collectionId: selected.collection?.id ?? requested.id,
    recordId: selected.record?.id ?? recordId,
    filter, query, panel: panel === 'routes' || panel === 'evidence' ? panel : 'map',
  };
}

/** Only replace owned fields, preserving unrelated parameters and the hash. */
export function explorerLocationUrl(href: string, state: ExplorerLocation): string {
  const url = new URL(href);
  url.searchParams.set('collection', state.collectionId);
  url.searchParams.set('record', state.recordId);
  for (const [key, value] of [
    ['type', state.filter === 'all' ? '' : state.filter], ['q', state.query],
    ['panel', state.panel === 'map' ? '' : state.panel],
  ]) {
    if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
  }
  return url.pathname + url.search + url.hash;
}
