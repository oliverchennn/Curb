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
