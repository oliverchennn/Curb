import { z } from 'zod';

export const kindLabels = { archive: 'Aerial or archive record', field: 'Field observation', synthetic: 'Synthetic example' } as const;
export type Kind = keyof typeof kindLabels;
export type Filter = Kind | 'all';
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s => !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s, 'Invalid date');
const dateSchema = z.union([z.null(), z.object({ precision: z.literal('date'), value: dateOnly }).strict(),
  z.object({ precision: z.literal('instant'), value: z.iso.datetime({ offset: true }) }).strict()]);
export type EvidenceDate = z.infer<typeof dateSchema>;
const coordinate = z.tuple([z.number().finite().min(-180).max(180), z.number().finite().min(-90).max(90)]);
const geometrySchema = z.union([z.null(), z.object({ type: z.literal('Point'), coordinates: coordinate }).strict(),
  z.object({ type: z.literal('LineString'), coordinates: z.array(coordinate).min(2) }).strict()]);
export const featureSchema = z.object({ id: z.string().min(1), label: z.string().min(1), geometry: geometrySchema,
  sourceId: z.string(), sourceFeatureId: z.string().nullable(), type: z.enum(['path', 'crossing', 'ramp', 'unplaced', 'finding', 'example']),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.null()])) }).strict();
const mediaSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('available'), src: z.string().regex(/^\/curb\/(?!.*\.\.)(?!.*[?#]).+\.(jpg|png|webp)$/), alt: z.string().min(1) }).strict(),
  z.object({ status: z.enum(['none', 'unavailable', 'withheld']), reason: z.string().min(1) }).strict(),
]);
const recordSchema = z.object({ id: z.string().min(1), featureId: z.string(), kind: z.enum(['archive', 'field', 'synthetic']),
  title: z.string().min(1), note: z.string().min(1), sourceId: z.string(), observed: dateSchema, captured: dateSchema,
  retrieved: dateSchema, attachment: z.enum(['source-matched', 'pending', 'accepted']), conflictGroup: z.string().nullable(),
  media: mediaSchema, clipSeconds: z.number().nonnegative().optional() }).strict();
const sourceSchema = z.object({ id: z.string(), title: z.string(), kind: z.enum(['archive', 'field', 'synthetic']),
  url: z.url().refine(s => /^https:\/\//.test(s)), credit: z.string(), sha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  catalogDate: dateOnly.nullable() }).strict();
const collectionSchema = z.object({ id: z.string(), code: z.string(), name: z.string(), subtitle: z.string(), note: z.string(),
  kind: z.enum(['archive', 'field', 'synthetic']), color: z.string().regex(/^#[a-f0-9]{6}$/i), recordIds: z.array(z.string()).min(1),
  traversal: z.literal('unknown') }).strict();
export const atlasSchema = z.object({ sources: z.array(sourceSchema), features: z.array(featureSchema), records: z.array(recordSchema),
  collections: z.array(collectionSchema), context: z.array(z.object({ id: z.string(), geometry: geometrySchema })).refine(fs => fs.every(f => f.geometry?.type === 'LineString')) }).strict().superRefine((a, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
  for (const [name, list] of Object.entries({ sources: a.sources, features: a.features, records: a.records, collections: a.collections, context: a.context })) {
    if (new Set(list.map(x => x.id)).size !== list.length) issue(`Duplicate ${name} IDs`);
  }
  const sources = new Map(a.sources.map(s => [s.id, s])), features = new Map(a.features.map(f => [f.id, f])), records = new Map(a.records.map(r => [r.id, r]));
  for (const f of a.features) {
    if (!sources.has(f.sourceId)) issue(`Missing feature source ${f.id}`);
    if (['unplaced', 'finding', 'example'].includes(f.type) && f.geometry !== null) issue(`Unplaced feature must not acquire geometry: ${f.id}`);
    if (f.geometry && !f.sourceFeatureId) issue(`Mapped feature needs original ID: ${f.id}`);
    if ((f.type === 'ramp' && f.geometry?.type !== 'Point') || (['path', 'crossing'].includes(f.type) && f.geometry?.type !== 'LineString')) issue(`Geometry type mismatch: ${f.id}`);
  }
  for (const r of a.records) {
    const f = features.get(r.featureId), source = sources.get(r.sourceId);
    if (!f || !source || source.kind !== r.kind || f.sourceId !== r.sourceId) issue(`Invalid record association ${r.id}`);
    if (r.kind === 'archive' && r.observed !== null) issue(`Archive date cannot become observation: ${r.id}`);
    if (r.kind === 'synthetic' && (r.media.status === 'available' || f?.geometry)) issue(`Synthetic examples cannot borrow photos or geography: ${r.id}`);
  }
  for (const c of a.collections) {
    if (new Set(c.recordIds).size !== c.recordIds.length) issue(`Duplicate collection records ${c.id}`);
    if (c.recordIds.some(id => !records.has(id) || records.get(id)?.kind !== c.kind)) issue(`Collection provenance mismatch ${c.id}`);
  }
  for (const group of new Set(a.records.map(r => r.conflictGroup).filter(Boolean))) {
    const members = a.records.filter(r => r.conflictGroup === group);
    if (members.length < 2 || new Set(members.map(r => r.featureId)).size !== 1) issue(`Invalid conflict group ${group}`);
    for (const c of a.collections) if (members.some(r => c.recordIds.includes(r.id)) && !members.every(r => c.recordIds.includes(r.id))) issue(`Split conflict group ${group}`);
  }
});
export type Atlas = z.infer<typeof atlasSchema>;
export type Feature = Atlas['features'][number];
export type EvidenceRecord = Atlas['records'][number];
export type Collection = Atlas['collections'][number];
export function dateText(d: EvidenceDate): string {
  if (!d) return 'Unknown';
  if (d.precision === 'date') return d.value;
  return new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(d.value));
}
export function recordsFor(a: Atlas, c: Collection) { return c.recordIds.map(id => a.records.find(r => r.id === id)!); }
export function filteredRecords(a: Atlas, c: Collection, filter: Filter, query: string): EvidenceRecord[] {
  const all = recordsFor(a, c), q = query.trim().toLowerCase();
  const matched = all.filter(r => (filter === 'all' || r.kind === filter) &&
    [c.name, c.code, r.id, r.featureId, r.title].join(' ').toLowerCase().includes(q));
  const groups = new Set(matched.map(r => r.conflictGroup).filter(Boolean));
  return all.filter(r => matched.includes(r) || (r.conflictGroup && groups.has(r.conflictGroup)));
}
export function selectionFor(a: Atlas, filter: Filter, query: string, collectionId: string, recordId: string) {
  const collections = a.collections.filter(c => filteredRecords(a, c, filter, query).length > 0);
  const collection = collections.find(c => c.id === collectionId) ?? collections[0] ?? null;
  const records = collection ? filteredRecords(a, collection, filter, query) : [];
  return { collections, collection, records, record: records.find(r => r.id === recordId) ?? records[0] ?? null };
}
export function locatedFeatures(a: Atlas, records: EvidenceRecord[]) {
  const ids = new Set(records.map(r => r.featureId));
  return a.features.filter(f => ids.has(f.id) && f.geometry !== null);
}
export const traversalText = (_collection: Collection) => 'Current traversal: Unknown';
export const project = ([lon, lat]: [number, number]) => [(lon + 74.6597) * Math.cos(40.35 * Math.PI / 180) * 100000, (40.3502 - lat) * 100000] as [number, number];
export function vertices(f: Feature) { return f.geometry?.type === 'Point' ? [f.geometry.coordinates] : f.geometry?.coordinates ?? []; }
export function fitFeatures(features: Feature[]): [number, number, number, number] {
  const points = features.flatMap(vertices).map(project);
  if (!points.length) return [-100, -160, 230, 260];
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  const w = Math.max(65, Math.max(...xs) - Math.min(...xs) + 55), h = Math.max(65, Math.max(...ys) - Math.min(...ys) + 55);
  return [(Math.max(...xs) + Math.min(...xs) - w) / 2, (Math.max(...ys) + Math.min(...ys) - h) / 2, w, h];
}
