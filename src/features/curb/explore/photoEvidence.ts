import { z } from 'zod';
import manifest from '../../../data/curb/campus-photo-evidence/manifest.json';
import { campusOverviewBounds, type ProjectedView } from './campus';
import type { BadgeBounds } from './labels';
import { project } from './model';

const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(72);
const note = z.string().trim().min(1).max(640);
const coords = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);
const date = z.discriminatedUnion('precision', [
  z.strictObject({ precision: z.literal('unknown'), value: z.null() }),
  z.strictObject({ precision: z.literal('year'), value: z.string().regex(/^[1-9]\d{3}$/) }),
  z.strictObject({ precision: z.literal('month'), value: z.string().regex(/^[1-9]\d{3}-(0[1-9]|1[0-2])$/) }),
  z.strictObject({ precision: z.literal('day'), value: z.iso.date() }),
]);
const localImage = /^\/curb\/explore\/photo-evidence\/[a-z0-9][a-z0-9-]*\.(?:avif|jpg|jpeg|png|webp)$/;
const https = z.url({ protocol: /^https$/ });
const permission = z.strictObject({ basis: note, licenseUrl: https.nullable(), changes: note.nullable() });
const availability = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('available'), path: z.string().regex(localImage), permission }),
  z.strictObject({ status: z.literal('unavailable'), reason: note }),
]);
const imageSchema = z.strictObject({
  id, alt: note, availability,
  source: z.strictObject({
    kind: z.enum(['captured-photo', 'generated-illustration', 'unresolved']),
    credit: note, url: https.nullable(), captured: date, retrieved: date,
  }),
});
const concerns = ['missing-curb-ramp', 'obstruction', 'damaged-surface', 'abrupt-level-change'] as const;
const condition = z.enum([...concerns, 'flush-edge', 'ramp-visible', 'inconclusive']);
export const conditionLabels: Record<z.infer<typeof condition>, string> = {
  'missing-curb-ramp': 'Missing curb ramp', obstruction: 'Obstruction',
  'damaged-surface': 'Damaged surface', 'abrupt-level-change': 'Abrupt level change',
  'flush-edge': 'Flush edge', 'ramp-visible': 'Ramp visible', inconclusive: 'Inconclusive',
};
const findingSchema = z.strictObject({
  id, visibleCondition: note, condition,
  status: z.enum(['context', 'possible-concern', 'reviewed-barrier']),
  modelSuggestion: z.strictObject({ source: note, description: note }).nullable(),
  review: z.strictObject({ status: z.enum(['pending', 'reviewed', 'inconclusive']), note }),
});
const basis = z.enum(['original-capture-location', 'independent-survey', 'independent-licensed-reference']);
const locationSchema = z.strictObject({
  id,
  camera: z.strictObject({ coordinates: coords, basis, note }).nullable(),
  finding: z.strictObject({
    coordinates: coords, basis: basis.exclude(['original-capture-location']), note,
  }).nullable(),
  unplacedReason: note.nullable(),
});
const recordSchema = z.strictObject({
  id, title: note, imageId: id, findingId: id, locationId: id,
});
type Image = z.infer<typeof imageSchema>;
type Finding = z.infer<typeof findingSchema>;
type Location = z.infer<typeof locationSchema>;
type RecordRef = z.infer<typeof recordSchema>;
export type PhotoEvidence = RecordRef & { image: Image; finding: Finding; location: Location };
export type PhotoMarker = 'viewpoint' | 'possible-concern' | 'reviewed-barrier';
export const photoMarkerLabels: Record<PhotoMarker, string> = {
  viewpoint: 'Photo viewpoint — finding position unverified',
  'possible-concern': 'Possible access concern',
  'reviewed-barrier': 'Reviewed source-image barrier',
};

function referenceIndex<T extends { id: string }>(
  rows: readonly T[], name: string, ctx: z.RefinementCtx,
) {
  const index = new Map<string, T>();
  rows.forEach((row, i) => {
    if (index.has(row.id)) ctx.addIssue({ code: 'custom', path: [name, i, 'id'], message: 'Duplicate ID' });
    index.set(row.id, row);
  });
  return index;
}

function isConcern(value: Finding['condition']) {
  return concerns.some(code => code === value);
}

export const photoManifestSchema = z.strictObject({
  schemaId: z.literal('curb-campus-photo-evidence'), schemaVersion: z.literal(1),
  images: z.array(imageSchema).max(100), findings: z.array(findingSchema).max(100),
  locations: z.array(locationSchema).max(100), records: z.array(recordSchema).max(100),
}).superRefine((data, ctx) => {
  const images = referenceIndex(data.images, 'images', ctx);
  const findings = referenceIndex(data.findings, 'findings', ctx);
  const locations = referenceIndex(data.locations, 'locations', ctx);
  referenceIndex(data.records, 'records', ctx);
  const referenced = { images: new Set<string>(), findings: new Set<string>(), locations: new Set<string>() };
  const [left, top, width, height] = campusOverviewBounds();
  data.records.forEach((record, index) => {
    const { imageId, findingId, locationId } = record;
    const image = images.get(imageId), finding = findings.get(findingId), location = locations.get(locationId);
    const problem = (field: 'imageId' | 'findingId' | 'locationId', message: string) =>
      ctx.addIssue({ code: 'custom', path: ['records', index, field], message });
    if (!image) problem('imageId', 'Unknown image'); else referenced.images.add(imageId);
    if (!finding) problem('findingId', 'Unknown finding'); else referenced.findings.add(findingId);
    if (!location) problem('locationId', 'Unknown location'); else referenced.locations.add(locationId);
    if (!image || !finding || !location) return;
    const { camera, finding: placedFinding, unplacedReason } = location;
    const isPhoto = image.source.kind === 'captured-photo';
    if (!isPhoto && (camera || placedFinding || finding.status === 'reviewed-barrier')) {
      problem('locationId', 'Only captured source photos can establish mapped evidence or a reviewed barrier');
    }
    if (!isPhoto && image.source.captured.precision !== 'unknown') {
      problem('imageId', 'Only captured source photos have a capture date');
    }
    if (image.source.kind === 'unresolved' && image.availability.status === 'available') {
      problem('imageId', 'Unresolved provenance cannot be served as a local asset');
    }
    if (finding.status !== 'context' && !isConcern(finding.condition)) {
      problem('findingId', 'Context or an inconclusive condition cannot become a barrier');
    }
    if (finding.status === 'reviewed-barrier' && finding.review.status !== 'reviewed') {
      problem('findingId', 'A reviewed barrier requires completed manual review');
    }
    if (placedFinding && (finding.status === 'context' || finding.review.status === 'inconclusive')) {
      problem('locationId', 'Only a supported access concern can carry a finding marker');
    }
    if (placedFinding && camera && placedFinding.coordinates.every((n, i) => n === camera.coordinates[i])) {
      problem('locationId', 'Do not reuse a camera coordinate as a finding coordinate');
    }
    if ((camera || placedFinding) && image.availability.status !== 'available') {
      problem('locationId', 'A mapped record needs an available photo with documented use permission');
    }
    if (!placedFinding && !unplacedReason) problem('locationId', 'Explain why the finding remains unplaced');
    if (placedFinding && unplacedReason) problem('locationId', 'A supported finding cannot also be unplaced');
    for (const anchor of [camera, placedFinding]) {
      if (anchor) {
        const [x, y] = project(anchor.coordinates);
        if (x < left || y < top || x > left + width || y > top + height) {
          problem('locationId', 'Map anchors must be within the campus overview extent');
        }
      }
    }
  });
  for (const name of ['images', 'findings', 'locations'] as const) {
    data[name].forEach((row, i) => {
      if (!referenced[name].has(row.id)) ctx.addIssue({
        code: 'custom', path: [name, i, 'id'], message: 'Unreferenced manifest entry',
      });
    });
  }
});

export function loadPhotoEvidence(input: unknown): PhotoEvidence[] {
  const data = photoManifestSchema.parse(input);
  const images = new Map(data.images.map(value => [value.id, value]));
  const findings = new Map(data.findings.map(value => [value.id, value]));
  const locations = new Map(data.locations.map(value => [value.id, value]));
  return data.records.map(record => ({
    ...record, image: images.get(record.imageId)!, finding: findings.get(record.findingId)!,
    location: locations.get(record.locationId)!,
  }));
}

const records = loadPhotoEvidence(manifest);
const byId = new Map(records.map(record => [record.id, record]));
export const getPhotoEvidence = (): readonly PhotoEvidence[] => records;
export const findPhotoEvidence = (recordId: string | null) => recordId ? byId.get(recordId) ?? null : null;
export const photoDateText = ({ value }: z.infer<typeof date>) => value ?? 'Unknown';

export function photoPin(record: PhotoEvidence): { kind: PhotoMarker; coordinates: [number, number]; note: string } | null {
  if (record.location.finding && record.finding.status !== 'context') {
    return { kind: record.finding.status, ...record.location.finding };
  }
  return record.location.camera ? { kind: 'viewpoint', ...record.location.camera } : null;
}

export const PHOTO_TARGET = 44;
type XY = { x: number; y: number };
type LayoutMarker = XY & { id: string; title: string; kind: PhotoMarker; interactive: boolean; selected: boolean };
export function layoutPhotoMarkers(
  records: readonly PhotoEvidence[], selectedId: string | null, bounds: BadgeBounds, unit: number,
  reserved: readonly XY[],
): LayoutMarker[] {
  const radius = PHOTO_TARGET * unit / 2;
  const occupied = [...reserved];
  const candidates = records.flatMap(record => {
    const pin = photoPin(record);
    if (!pin) return [];
    const [x, y] = project(pin.coordinates);
    if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) return [];
    return [{ id: record.id, title: record.title, kind: pin.kind, x, y }];
  });
  const active = candidates.find(marker => marker.id === selectedId);
  // Keep the selected symbol readable at its real anchor; other targets never cover it.
  if (active) occupied.push(active);
  const markers: LayoutMarker[] = [];
  for (const candidate of candidates) {
    if (candidate === active) continue;
    if (candidate.x - radius < bounds.left || candidate.x + radius > bounds.right ||
        candidate.y - radius < bounds.top || candidate.y + radius > bounds.bottom) continue;
    if (occupied.some(other => Math.abs(candidate.x - other.x) < 2 * radius && Math.abs(candidate.y - other.y) < 2 * radius)) continue;
    markers.push({ ...candidate, selected: false, interactive: true });
    occupied.push(candidate);
  }
  if (!markers.length && !active && candidates[0]) {
    const first = candidates[0];
    // Keep an in-view photo selectable at campus scale even among section labels.
    // Its compact hit box overlays only its visible symbol.
    markers.push({ ...first, selected: false, interactive: false });
  }
  if (active) markers.push({ ...active, selected: true, interactive: false });
  return markers;
}

export function photoView(coordinates: [number, number]): ProjectedView {
  const [x, y] = project(coordinates);
  return [x - 90, y - 90, 180, 180];
}
