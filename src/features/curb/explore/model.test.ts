import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createAtlas } from './data';
import subset from './archive.json';
import survey from '../../../data/curb/surveys/robertson-hall.json';
import audit from '../../../../docs/research/PRINCETON_SOURCE_AUDIT.json';
import { atlasSchema, dateText, filteredRecords, fitFeatures, locatedFeatures, recordsFor, selectionFor, traversalText, type Atlas } from './model';

describe('explorer provenance and semantic boundaries', () => {
  it('binds the extracted snapshot to the actual original ZIP and audited layer hashes', () => {
    expect(createHash('sha256').update(readFileSync('docs/source/Curb_Research_and_Data.zip')).digest('hex')).toBe(subset.archiveSha256);
    for (const source of subset.sources) expect(audit.archive.members.find(m => m.name === source.file)?.sha256).toBe(source.sha256);
    for (const f of [...audit.selected_crossings, ...audit.selected_connecting_paths]) expect(subset.lines.find(x => x.id === f.feature.id)).toEqual(f.feature);
    for (const f of audit.selected_ramps) expect(subset.ramps.find(x => x.id === f.feature.id)).toEqual(f.feature);
    expect(subset.lines.map(f => f.id).sort()).toEqual([889957, 834112, 809875, 986574, 834108, 1010009, 1004047, 957434, 942676, 951724].sort());
    expect(subset.ramps).toHaveLength(10);
  });
  it('has three independent archive chains and keeps every actual Robertson photo unplaced', () => {
    // Scoped to the original DVRPC archive; the separately sourced OSM campus sections are covered in campus.test.ts.
    const a = createAtlas(); expect(a.collections.filter(c => c.kind === 'archive' && !c.id.startsWith('campus-'))).toHaveLength(3);
    const field = recordsFor(a, a.collections.find(c => c.id === 'robertson')!);
    expect(field).toHaveLength(5); expect(locatedFeatures(a, field)).toEqual([]);
    expect(field.map(r => r.media.status === 'available' && r.media.src)).toEqual(survey.findings.map(f => f.closeupSrc));
    expect(field.map(r => r.clipSeconds)).toEqual(survey.findings.map(f => f.evidenceTime));
    expect(field.every(r => r.captured === null && r.observed === null)).toBe(true);
  });
  it('never constructs markers or connectors for missing door, gate or campus positions', () => {
    const a = createAtlas(), missing = a.features.filter(f => f.type === 'unplaced');
    expect(missing).toHaveLength(4);
    for (const c of a.collections) {
      const located = locatedFeatures(a, recordsFor(a, c));
      expect(located.every(f => f.geometry !== null)).toBe(true);
      expect(located.some(f => missing.includes(f))).toBe(false);
    }
    expect(a.features.filter(f => f.geometry?.type === 'LineString' && f.sourceId === 'dvrpc-lines')).toHaveLength(10);
  });
  it('does not turn accepted attachment review into traversal or a preferred conflict winner', () => {
    const a = createAtlas(); a.records.forEach(r => { r.attachment = 'accepted'; });
    expect(atlasSchema.parse(a).collections.every(c => c.traversal === 'unknown')).toBe(true);
    for (const c of a.collections) expect(traversalText(c)).toBe('Current traversal: Unknown');
    const c = a.collections.find(c => c.id === 'examples')!;
    expect(filteredRecords(a, c, 'synthetic', 'Example A').map(r => r.id)).toEqual(['example:a', 'example:b']);
  });
  it('retains eligible selected IDs through filtering and never substitutes a hidden record', () => {
    const a = createAtlas(), id = 'record:ramps:461092';
    const s = selectionFor(a, 'archive', '461092', 'nassau-east', id);
    expect(s.collection?.id).toBe('nassau-east'); expect(s.record?.id).toBe(id);
    const changed = selectionFor(a, 'field', '', 'nassau-east', id);
    expect(changed.collection?.id).toBe('robertson'); expect(changed.record?.kind).toBe('field');
    const none = selectionFor(a, 'all', 'no-such-source-99999999', 'witherspoon', id);
    expect(none.collections).toEqual([]); expect(none.record).toBeNull();
  });
  it('searches unplaced records and collection names without requiring geometry', () => {
    const a = createAtlas();
    const s = selectionFor(a, 'all', 'unplaced:library-door', 'witherspoon', '');
    expect(s.records.map(r => r.featureId)).toEqual(['unplaced:library-door']); expect(locatedFeatures(a, s.records)).toEqual([]);
    expect(selectionFor(a, 'all', 'Robertson Hall', 'witherspoon', '').records).toHaveLength(5);
  });
  it('keeps date-only precision and unknown capture separate from dated retrieval', () => {
    expect(dateText(null)).toBe('Unknown'); expect(dateText({ precision: 'date', value: '2026-11-13' })).toBe('2026-11-13');
    const r = createAtlas().records.find(r => r.id === 'record:unplaced:library-door')!;
    expect(r.captured).toBeNull(); expect(r.observed).toBeNull(); expect(r.retrieved?.precision).toBe('instant');
    expect(dateText(r.retrieved)).toContain('2026');
    for (const r of createAtlas().records.filter(r => r.sourceId.startsWith('dvrpc'))) expect([r.captured, r.observed, r.retrieved]).toEqual([null, null, null]);
  });
  it('separates withheld, unavailable and absent photos without remote substitution', () => {
    const a = createAtlas();
    expect(a.records.find(r => r.id === 'example:a')?.media.status).toBe('unavailable');
    expect(a.records.find(r => r.id === 'example:b')?.media.status).toBe('withheld');
    expect(a.records.filter(r => r.kind === 'archive').every(r => r.media.status === 'none')).toBe(true);
  });
  it('fits all selected source vertices with finite bounds, including unplaced-only collections', () => {
    const a = createAtlas(); for (const c of a.collections) { const fit = fitFeatures(locatedFeatures(a, recordsFor(a, c))); expect(fit.every(Number.isFinite)).toBe(true); expect(fit[2]).toBeGreaterThan(0); expect(fit[3]).toBeGreaterThan(0); }
  });
  const bad: [string, (a: Atlas) => void][] = [
    ['duplicate record', a => { a.records.push(a.records[0]); }], ['duplicate feature', a => { a.features.push(a.features[0]); }],
    ['broken feature reference', a => { a.records[0].featureId = 'absent'; }], ['broken source reference', a => { a.records[0].sourceId = 'absent'; }],
    ['cross-provenance collection', a => { a.collections[0].recordIds.push('record:robertson:defect-01'); }],
    ['missing collection record', a => { a.collections[0].recordIds.push('absent'); }],
    ['invented field marker', a => { a.features.find(f => f.type === 'finding')!.geometry = { type: 'Point', coordinates: [0, 0] }; }],
    ['invented campus connector', a => { a.features.find(f => f.type === 'unplaced')!.geometry = { type: 'LineString', coordinates: [[0, 0], [1, 1]] }; }],
    ['nonfinite coordinate', a => { const f = a.features.find(f => f.geometry?.type === 'Point')!; if (f.geometry?.type === 'Point') f.geometry.coordinates[0] = Infinity; }],
    ['archive date becomes observation', a => { a.records[0].observed = { precision: 'date', value: '2026-11-13' }; }],
    ['invalid calendar date', a => { a.records[0].captured = { precision: 'date', value: '2026-02-30' }; }],
    ['date-only carries invented clock', a => { a.records[0].captured = { precision: 'date', value: '2026-11-13T00:00:00Z' }; }],
    ['synthetic borrows real photo', a => { a.records.find(r => r.kind === 'synthetic')!.media = { status: 'available', src: '/curb/surveys/robertson-hall/defect-01.jpg', alt: 'Not real evidence' }; }],
    ['remote photo', a => { a.records[0].media = { status: 'available', src: 'https://example.com/photo.jpg', alt: 'Remote' }; }],
    ['path traversal photo', a => { a.records[0].media = { status: 'available', src: '/curb/../private.jpg', alt: 'Invalid' }; }],
    ['orphaned conflict', a => { a.records[0].conflictGroup = 'alone'; }],
    ['conflict spans unrelated features', a => { a.records[0].conflictGroup = a.records[1].conflictGroup = 'wrong-target'; }],
    ['conflict hidden in one collection', a => { a.collections.find(c => c.id === 'examples')!.recordIds.pop(); }],
  ];
  it.each(bad)('rejects %s', (_, mutate) => { const a = createAtlas(); mutate(a); expect(atlasSchema.safeParse(a).success).toBe(false); });
});

describe('explorer v2 coverage, stop numbers and archive metadata', () => {
  const a = createAtlas();
  const byId = (id: string) => a.collections.find(c => c.id === id)!;
  it('derives coverage from the full collection, counting records and unique mapped features', async () => {
    const { coverage } = await import('./model');
    expect(coverage(a, byId('witherspoon'))).toEqual({ records: 8, mappedRecords: 7, mappedFeatures: 7, unplacedRecords: 1, photos: 0, conflictRecords: 0 });
    expect(coverage(a, byId('nassau-east'))).toMatchObject({ records: 10, mappedRecords: 7, unplacedRecords: 3, photos: 0 });
    expect(coverage(a, byId('nassau-west'))).toMatchObject({ records: 12, mappedRecords: 9, unplacedRecords: 3 });
    expect(coverage(a, byId('robertson'))).toEqual({ records: 5, mappedRecords: 0, mappedFeatures: 0, unplacedRecords: 5, photos: 5, conflictRecords: 0 });
    expect(coverage(a, byId('examples'))).toEqual({ records: 2, mappedRecords: 0, mappedFeatures: 0, unplacedRecords: 2, photos: 0, conflictRecords: 2 });
    for (const c of a.collections) { const k = coverage(a, c); expect(k.mappedRecords + k.unplacedRecords).toBe(k.records); expect(k.mappedFeatures).toBeLessThanOrEqual(k.mappedRecords); }
  });
  it('keeps stop numbers stable in source order when filters hide records', async () => {
    const { stopNumbers } = await import('./model');
    const c = byId('nassau-west'), stops = stopNumbers(c);
    expect([...stops.values()]).toEqual(c.recordIds.map((_, i) => i + 1));
    const filtered = filteredRecords(a, c, 'all', '957434');
    expect(filtered.length).toBeLessThan(c.recordIds.length);
    for (const r of filtered) expect(stops.get(r.id)).toBe(c.recordIds.indexOf(r.id) + 1);
  });
  it('labels exactly three ASSUMED archive ramps and never exposes compliance-like fields', async () => {
    const { archiveStatus, archiveAttributes } = await import('./model');
    expect(a.features.filter(f => archiveStatus(f) === 'ASSUMED')).toHaveLength(3);
    for (const f of a.features) {
      const attrs = archiveAttributes(f).map(([k]) => k);
      expect(attrs.some(k => /ada|compl|dws/i.test(k))).toBe(false);
      if (f.geometry === null) expect(attrs).toEqual([]);
    }
  });
});
