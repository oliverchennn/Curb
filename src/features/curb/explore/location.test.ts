import { describe, expect, it } from 'vitest';
import { createAtlas } from './data';
import { explorerLocationUrl, readExplorerLocation } from './location';
import { selectionFor } from './model';

const atlas = createAtlas();
describe('restorable explorer locations', () => {
  it('round-trips the final unplaced field photo and mobile evidence panel', () => {
    const state = { collectionId: 'robertson', recordId: 'record:robertson:defect-05', filter: 'field' as const, query: '', panel: 'evidence' as const };
    const url = new URL(explorerLocationUrl('https://curb.example/curb/explore?campaign=demo#main', state), 'https://curb.example');
    expect(readExplorerLocation(atlas, url.search)).toEqual(state);
    expect(url.searchParams.get('campaign')).toBe('demo');
    expect(url.hash).toBe('#main');
  });
  it('rejects unknown collection, cross-collection record, filter and panel values', () => {
    const state = readExplorerLocation(atlas, '?collection=missing&record=record:robertson:defect-05&type=passable&panel=missing');
    expect(state).toEqual(readExplorerLocation(atlas, ''));
    expect(readExplorerLocation(atlas, '?collection=robertson&record=record:lines:889957').recordId).toBe('record:robertson:defect-01');
  });
  it('restores a filtered snapshot and keeps a no-results query instead of substituting data', () => {
    const state = readExplorerLocation(atlas, '?collection=nassau-east&record=record:ramps:461092&type=archive&q=461092');
    expect(state.recordId).toBe('record:ramps:461092');
    const none = readExplorerLocation(atlas, '?collection=robertson&q=no-such-record-999999');
    expect(selectionFor(atlas, none.filter, none.query, none.collectionId, none.recordId).record).toBeNull();
    expect(readExplorerLocation(atlas, new URL(explorerLocationUrl('https://curb.example/curb/explore', none), 'https://curb.example').search)).toEqual(none);
  });
  it('encodes search punctuation as data and removes cleared optional fields', () => {
    const state = { ...readExplorerLocation(atlas, ''), query: 'Nassau & clinic? #1' };
    const url = new URL(explorerLocationUrl('https://curb.example/curb/explore?type=field&panel=evidence', state), 'https://curb.example');
    expect(url.searchParams.get('q')).toBe(state.query);
    expect(url.searchParams.has('type')).toBe(false);
    expect(url.searchParams.has('panel')).toBe(false);
    expect(url.hash).toBe('');
  });
});

it('defaults to Campus and clears retired example filters without changing unrelated URL state', () => {
  const initial = readExplorerLocation(atlas, '');
  expect(initial).toMatchObject({ overview: true, filter: 'all', panel:'map' });
  expect(readExplorerLocation(atlas, '?collection=examples&record=record:example:a&type=synthetic&q=example&panel=evidence')).toEqual(initial);
  const normalized = new URL(explorerLocationUrl('https://curb.example/curb/explore?group=examples&type=synthetic&campaign=demo#map', initial), 'https://curb.example');
  expect(normalized.searchParams.get('group')).toBe('campus');
  expect(normalized.searchParams.has('type')).toBe(false);
  expect(normalized.searchParams.get('campaign')).toBe('demo');
  expect(normalized.hash).toBe('#map');
});

it('round-trips exact photo selections for overview and section without opening another drawer', () => {
  const hasPhoto = (id: string) => id === 'photo-a';
  for (const search of [
    '?group=campus&photo=photo-a&node=10828764207',
    '?collection=campus-east-b&photo=photo-a&panel=evidence',
  ]) {
    const selected = readExplorerLocation(atlas, search, hasPhoto);
    expect(selected).toMatchObject({ photoId: 'photo-a', panel: 'map' });
    expect(selected.point?.node).toBeFalsy();
    const url = new URL(explorerLocationUrl('https://curb.example/curb/explore?campaign=demo#stage', selected), 'https://curb.example');
    expect(readExplorerLocation(atlas, url.search, hasPhoto)).toEqual(selected);
    expect(url.searchParams.get('campaign')).toBe('demo');
    expect(url.hash).toBe('#stage');
  }
});

it('normalizes unknown photo IDs, persists layer-off, and clears photo state outside Campus', () => {
  const hasPhoto = (id: string) => id === 'photo-a';
  expect(readExplorerLocation(atlas, '?photo=photo-missing', hasPhoto).photoId).toBeUndefined();
  const hidden = readExplorerLocation(atlas, '?photos=off&photo=photo-a', hasPhoto);
  expect(hidden.photoHidden).toBe(true);
  expect(hidden.photoId).toBeUndefined();
  const cleanUrl = explorerLocationUrl('https://curb.example/curb/explore?photo=photo-a', hidden);
  expect(cleanUrl).toBe('/curb/explore?group=campus&photos=off');
  expect(readExplorerLocation(atlas, '?collection=robertson&photo=photo-a&photos=off', hasPhoto).photoHidden).toBeUndefined();
  expect(readExplorerLocation(atlas, '?collection=robertson&photo=photo-a', hasPhoto).photoId).toBeUndefined();
});

it('keeps explicit real groups, Robertson links, way records and point links', () => {
  expect(readExplorerLocation(atlas, '?group=downtown').collectionId).toBe('witherspoon');
  expect(readExplorerLocation(atlas, '?group=field').collectionId).toBe('robertson');
  expect(readExplorerLocation(atlas, '?record=record:robertson:defect-05&panel=evidence&type=synthetic')).toMatchObject({ collectionId:'robertson', recordId:'record:robertson:defect-05', panel:'evidence', filter:'all' });
  expect(readExplorerLocation(atlas, '?record=record:campus-osm-way:284117254').collectionId).toBe('campus-east-b');
  expect(readExplorerLocation(atlas, '?q=way/284117254')).toMatchObject({ collectionId:'campus-east-b', recordId:'record:campus-osm-way:284117254' });
  expect(readExplorerLocation(atlas, '?node=10828764207')).toMatchObject({ overview:true, point:{ node:'node/10828764207' } });
});
