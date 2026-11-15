import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { campusOverviewBounds } from './campus';
import { project } from './model';
import { getPhotoEvidence, layoutPhotoMarkers, loadPhotoEvidence, photoDateText, photoManifestSchema, photoPin } from './photoEvidence';

const camera: [number, number] = [-74.656, 40.349];
const physical: [number, number] = [-74.656, 40.3489];
const unknown = { precision: 'unknown', value: null } as const;
function example() {
  return {
    schemaId: 'curb-campus-photo-evidence', schemaVersion: 1,
    images: [{
      id: 'image-a', alt: 'A curb by a crossing',
      availability: { status: 'available', path: '/curb/explore/photo-evidence/example.jpg', permission: { basis: 'Owned photo', licenseUrl: null, changes: null } },
      source: { kind: 'captured-photo', credit: 'Staff photo', url: null, captured: unknown, retrieved: { precision: 'month', value: '2026-11' } },
    }],
    findings: [{
      id: 'finding-a', visibleCondition: 'The approach ends at a raised edge.', condition: 'missing-curb-ramp',
      status: 'possible-concern', modelSuggestion: { source: 'Model', description: 'Possible missing ramp.' },
      review: { status: 'pending', note: 'Check the other crossing end.' },
    }],
    locations: [{
      id: 'location-a', camera: { coordinates: [...camera], basis: 'original-capture-location', note: 'Original capture coordinates.' } as null | { coordinates: number[]; basis: string; note: string },
      finding: null as null | { coordinates: number[]; basis: string; note: string },
      unplacedReason: 'Crossing end not independently located.' as string | null,
    }],
    records: [{ id: 'photo-a', title: 'Example record', imageId: 'image-a', findingId: 'finding-a', locationId: 'location-a' }],
  };
}
const putFinding = (data: ReturnType<typeof example>, basis = 'independent-survey', coordinates = physical) => {
  data.locations[0].finding = { coordinates: [...coordinates], basis, note: 'Checked on the ground.' };
  data.locations[0].unplacedReason = null;
};

describe('photo manifest and placement', () => {
  it('joins stable IDs and places the camera as a viewpoint even with an access concern suggestion', () => {
    const [record] = loadPhotoEvidence(example());
    expect(record.image.id).toBe('image-a');
    expect(record.finding.modelSuggestion?.description).toBe('Possible missing ramp.');
    expect(photoDateText(record.image.source.captured)).toBe('Unknown');
    expect(photoDateText(record.image.source.retrieved)).toBe('2026-11');
    expect(photoPin(record)).toMatchObject({ kind: 'viewpoint', coordinates: camera });
  });

  it('only maps a warning at a supported physical position and requires manual review for the octagon', () => {
    const input = example();
    putFinding(input);
    expect(photoPin(loadPhotoEvidence(input)[0])).toMatchObject({ kind: 'possible-concern', coordinates: physical });
    input.findings[0].status = 'reviewed-barrier';
    expect(photoManifestSchema.safeParse(input).success).toBe(false);
    input.findings[0].review.status = 'reviewed';
    expect(photoPin(loadPhotoEvidence(input)[0])).toMatchObject({ kind: 'reviewed-barrier', coordinates: physical });
  });

  it('maintains unplaced records and refuses copied camera coordinates or camera-only placement basis', () => {
    const input = example();
    input.locations = [{ id: 'location-a', camera: null, finding: null, unplacedReason: 'Location unresolved.' }];
    expect(photoPin(loadPhotoEvidence(input)[0])).toBeNull();
    const copied = example();
    putFinding(copied, 'independent-survey', camera);
    expect(photoManifestSchema.safeParse(copied).success).toBe(false);
    putFinding(copied, 'original-capture-location');
    expect(photoManifestSchema.safeParse(copied).success).toBe(false);
  });

  it.each(['flush-edge', 'inconclusive', 'entrance=staircase', 'kerb-absent'])('refuses to turn %s into a barrier', (code) => {
    const input = example();
    input.findings[0].condition = code;
    putFinding(input);
    expect(photoManifestSchema.safeParse(input).success).toBe(false);
  });

  it.each(['generated-illustration', 'unresolved'])('does not let %s media establish a real map anchor', (kind) => {
    const input = example();
    input.images[0].source.kind = kind;
    expect(photoManifestSchema.safeParse(input).success).toBe(false);
  });

  it('rejects dangling references, duplicate IDs, invalid dates, out-of-area coordinates, and nonlocal image paths', () => {
    const malformed = [
      (data: ReturnType<typeof example>) => { data.records[0].imageId = 'missing'; },
      (data: ReturnType<typeof example>) => { data.records.push(data.records[0]); },
      (data: ReturnType<typeof example>) => { data.images[0].source.retrieved.value = '2026-13'; },
      (data: ReturnType<typeof example>) => { data.locations[0].camera!.coordinates = [-122, 38]; },
      (data: ReturnType<typeof example>) => { data.images[0].availability.path = '/curb/explore/photo-evidence/../test.jpg'; },
      (data: ReturnType<typeof example>) => { data.images[0].availability.path = 'https://example.com/test.jpg'; },
    ];
    for (const mutate of malformed) {
      const data = example();
      mutate(data);
      expect(photoManifestSchema.safeParse(data).success).toBe(false);
    }
  });

  it('keeps a selected marker visible in overlap without snapping any anchor', () => {
    const [record] = loadPhotoEvidence(example());
    const neighbor = { ...record, id: 'photo-b' };
    const [x, y] = project(camera);
    const [left, top, width, height] = campusOverviewBounds();
    const bounds = { left, top, right: left + width, bottom: top + height };
    expect(layoutPhotoMarkers([record, neighbor], neighbor.id, bounds, 1, [{ x, y }])).toEqual([
      expect.objectContaining({ id: neighbor.id, x, y, selected: true }),
    ]);
    const fallback = layoutPhotoMarkers([record], null, bounds, 1, [{ x, y }]);
    expect(fallback).toEqual([expect.objectContaining({ id: record.id, anchor: { x, y }, selected: false })]);
    expect(Math.hypot(fallback[0].x - x, fallback[0].y - y)).toBeLessThanOrEqual(54);
    expect(layoutPhotoMarkers([record], null, { left: x + 30, right: x + 90, top: y + 30, bottom: y + 90 }, 1, [])).toEqual([]);
  });

  it('publishes the selected archives at camera positions only and retains all reviewed findings', () => {
    const records = getPhotoEvidence();
    const cameras = new Set(records.filter(record => photoPin(record)?.kind === 'viewpoint').map(record => record.locationId));
    const images = new Set(records.flatMap(record => record.image.availability.status === 'available' ? [record.image.availability.path] : []));
    expect(cameras.size).toBe(5);
    expect(records.filter(record => photoPin(record) === null)).toHaveLength(16);
    expect(new Set(records.map(record => record.findingId)).size).toBe(24);
    expect(records.every(record => record.location.finding === null)).toBe(true);
    expect(readdirSync('public/curb/explore/photo-evidence').sort()).toEqual([...images].map(path => path.split('/').at(-1)).sort());
    for (const path of images) {
      const bytes = readFileSync('public' + path);
      expect(bytes.subarray(0, 2).toString('hex'), path).toBe('ffd8');
    }
    const west = records.filter(record => record.findingId.endsWith('-f22'));
    expect(west.map(record => record.image.source.captured.value)).toEqual([null, '2011-06']);
    expect(west.every(record => record.image.source.captureNote?.includes('September 2017'))).toBe(true);
  });
});
