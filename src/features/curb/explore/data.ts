import archive from './archive.json';
import survey from '../../../data/curb/surveys/robertson-hall.json';
import { campusAtlasEntries } from '../../../data/curb/princeton-campus/adapter';
import { atlasSchema, featureSchema, type EvidenceRecord, type Feature } from './model';

const repository = 'https://github.com/oliverchennn/Curb';
const pinned = `${repository}/blob/6b2b11040eed8d3d620743bc4e12e112f9ebfa90`;
const titles: Record<string, string> = {
  '889957': 'Plaza approach sidewalk', '834112': 'Spring Street crossing', '809875': 'East Witherspoon sidewalk',
  '986574': 'Northeast corner link', '834108': 'Nassau east crossing', '1010009': 'Witherspoon crossing',
  '1004047': 'Northwest corner link', '957434': 'Nassau west crossing', '942676': 'South sidewalk return', '951724': 'Eastward Nassau sidewalk',
  '568004': 'Plaza-side archive endpoint', '448038': 'Spring north landing', '454485': 'Spring south landing',
  '496163': 'Witherspoon east landing', '461092': 'Nassau east · north landing', '554811': 'Nassau east · south landing',
  '562921': 'Witherspoon west landing', '501839': 'Nassau west · north landing', '577885': 'Nassau west · south landing', '478465': 'Eastward archive endpoint',
};
export function createAtlas() {
  const sources = archive.sources.map((s, i) => ({ id: i ? 'dvrpc-ramps' : 'dvrpc-lines', title: s.file,
    kind: 'archive', url: s.source_url, credit: 'Delaware Valley Regional Planning Commission (DVRPC)', sha256: s.sha256, catalogDate: archive.snapshotDate }));
  sources.push(...archive.primarySources.map(s => ({ id: s.id, title: s.id === 'nassau-access' ? 'AccessAble · Nassau Hall guide' : s.id.replaceAll('-', ' '),
    kind: 'archive', url: s.finalUrl, credit: s.id.startsWith('library') ? 'Princeton Public Library' : s.id === 'nassau-access' ? 'AccessAble USA' : 'Princeton University', sha256: s.sha256, catalogDate: '' })));
  const features: Feature[] = [...archive.lines.map(f => ({ id: `lines:${f.id}`, label: titles[f.id], geometry: f.geometry,
    sourceId: 'dvrpc-lines', sourceFeatureId: String(f.id), type: f.properties.line_type === 2 ? 'crossing' : 'path', properties: f.properties })),
  ...archive.ramps.map(f => ({ id: `ramps:${f.id}`, label: titles[f.id], geometry: f.geometry, sourceId: 'dvrpc-ramps',
    sourceFeatureId: String(f.id), type: 'ramp', properties: f.properties }))].map(f => featureSchema.parse(f));
  const records: EvidenceRecord[] = features.map(f => ({ id: `record:${f.id}`, featureId: f.id, kind: 'archive', title: f.label,
    note: f.type === 'ramp' ? `DVRPC status: ${f.properties.status} (archived label). No field observation or current ramp condition is established.` :
      'Aerial-derived source geometry. Matching endpoints establish archive association only; direction, physical continuity and current use have not been inspected.',
    sourceId: f.sourceId, observed: null, captured: null, retrieved: null, attachment: 'source-matched', conflictGroup: null,
    media: { status: 'none', reason: 'No photograph in this archive record. The snapshot below is source geometry.' } }));
  const unplaced = [
    ['library-door', 'Library front door', 'library-plaza', 'The source places Hinds Plaza beside the library. Its door and plaza-to-sidewalk connection have not been located.'],
    ['fitzrandolph-gate', 'FitzRandolph Gate', 'fitzrandolph-gate', 'Historical entrance guidance does not establish today’s opening. No gate coordinate or sidewalk attachment has been inferred.'],
    ['campus-approach', 'Gate-to-hall campus approach', 'facilities-maps', 'The campus path between the gate and elevator-lobby entrance is unverified. This missing connection is not drawn.'],
    ['nassau-elevator', 'Nassau Hall elevator-lobby door', 'nassau-access', 'The guide distinguishes the west-side level G elevator-lobby entrance from the separately named west entrance with steps. Exact location, opening and access restrictions remain unknown.'],
  ];
  for (const [id, label, sourceId, note] of unplaced) {
    const source = archive.primarySources.find(s => s.id === sourceId)!;
    features.push({ id: `unplaced:${id}`, label, geometry: null, sourceId, sourceFeatureId: null, type: 'unplaced', properties: {} });
    records.push({ id: `record:unplaced:${id}`, featureId: `unplaced:${id}`, kind: 'archive', title: label, note, sourceId,
      observed: null, captured: null, retrieved: { precision: 'instant', value: source.checkedAtUtc }, attachment: 'pending', conflictGroup: null,
      media: { status: 'none', reason: 'Source guidance only. No project photograph or verified position.' } });
  }
  for (const f of survey.findings) {
    features.push({ id: `robertson:${f.id}`, label: f.label, geometry: null, sourceId: 'robertson-clip', sourceFeatureId: f.id, type: 'finding', properties: {} });
    records.push({ id: `record:robertson:${f.id}`, featureId: `robertson:${f.id}`, kind: 'field', title: f.label,
      note: `${f.description} AI-assisted proposal from actual footage; human field review is pending. Clip time is not a capture date.`,
      sourceId: 'robertson-clip', observed: null, captured: null, retrieved: null, attachment: 'pending', conflictGroup: null,
      media: { status: 'available', src: f.closeupSrc, alt: `${f.label}. Frame from the supplied Robertson Hall clip; dimensions are unmeasured.` }, clipSeconds: f.evidenceTime });
  }
  features.push({ id: 'example:unplaced', label: 'Illustrative attachment', geometry: null, sourceId: 'example-guide', sourceFeatureId: null, type: 'example', properties: {} });
  records.push(...(['a', 'b'] as const).map((id, i): EvidenceRecord => ({ id: `example:${id}`, featureId: 'example:unplaced', kind: 'synthetic',
    title: i ? 'Example B · conflicting note' : 'Example A · archive assertion',
    note: i ? 'Illustrative counter-assertion: “no ramp represented.” This is an invented UI case, not a field observation or a statement about a Princeton feature.' :
      'Illustrative assertion: “ramp represented.” Accepting an attachment does not establish traversal. This example has no real geographic position.',
    sourceId: 'example-guide', observed: null, captured: null, retrieved: null, attachment: i ? 'pending' : 'accepted', conflictGroup: 'example-disagreement',
    media: { status: i ? 'withheld' : 'unavailable', reason: i ? 'Photo withheld pending publication review — illustrative state; no photo is stored.' : 'Photo unavailable — illustrative missing-file state; no photo is stored.' } })));
  const ids = (...features: string[]) => features.map(id => `record:${id}`);
  const campus = ['unplaced:fitzrandolph-gate', 'unplaced:campus-approach', 'unplaced:nassau-elevator'];
  const campusArchive = campusAtlasEntries();
  return atlasSchema.parse({ sources: [...sources.map(s => ({ ...s, catalogDate: s.catalogDate || null })),
    { id: 'robertson-clip', title: 'Robertson Hall · supplied video', kind: 'field', url: `${pinned}/public/curb/surveys/robertson-hall/source/IMG_0699.MOV`,
      credit: 'Video supplied by Oliver; local AI-assisted proposals, human review pending.', sha256: survey.media.originalSha256, catalogDate: null },
    { id: 'example-guide', title: 'Evidence UI worked examples', kind: 'synthetic', url: `${repository}/blob/ed6472de87d19703f8f9a69768ca532f37015748/docs/planning/R3_EVIDENCE_UX.md`,
      credit: 'Curb · clearly illustrative interaction examples, adapted from the historical UX proposal.', sha256: null, catalogDate: null }, ...campusArchive.sources],
    features: [...features, ...campusArchive.features], records: [...records, ...campusArchive.records],
    context: archive.contextLines.map(f => ({ id: `lines:${f.id}`, geometry: f.geometry })),
    collections: [
      { id: 'witherspoon', code: '01', name: 'Library / Witherspoon', subtitle: 'Plaza approach → Spring Street', kind: 'archive', color: '#27745e', traversal: 'unknown',
        note: 'An archive chain, not a navigation recommendation. The library door and plaza attachment remain unplaced.',
        recordIds: ids('lines:889957', 'lines:834112', 'lines:809875', 'ramps:568004', 'ramps:448038', 'ramps:454485', 'ramps:496163', 'unplaced:library-door') },
      { id: 'nassau-east', code: '02', name: 'Nassau / east crossing', subtitle: 'Northeast corner → south landing', kind: 'archive', color: '#ab602b', traversal: 'unknown',
        note: 'Known archive geometry stops short of a verified gate-to-hall connection. The gate, campus approach and elevator-lobby door remain unplaced.',
        recordIds: ids('lines:986574', 'lines:834108', 'lines:951724', 'ramps:496163', 'ramps:461092', 'ramps:554811', 'ramps:478465', ...campus) },
      { id: 'nassau-west', code: '03', name: 'Nassau / west crossing', subtitle: 'Alternate archive chain', kind: 'archive', color: '#4e68a0', traversal: 'unknown',
        note: 'Both west-crossing ramp records say ASSUMED. This is an alternate archive chain, not a suggested detour or a ranking of access.',
        recordIds: ids('lines:1010009', 'lines:1004047', 'lines:957434', 'lines:942676', 'ramps:496163', 'ramps:562921', 'ramps:501839', 'ramps:577885', 'ramps:554811', ...campus) },
      { id: 'robertson', code: '04', name: 'Robertson Hall', subtitle: 'Five frames · actual supplied footage', kind: 'field', color: '#815e83', traversal: 'unknown',
        note: 'A separate field-media collection. All five finding positions are unknown. Photographs are not attached to Nassau or Witherspoon geometry.', recordIds: survey.findings.map(f => `record:robertson:${f.id}`) },
      { id: 'examples', code: '05', name: 'Evidence examples', subtitle: 'Illustrative conflict & photo states', kind: 'synthetic', color: '#68766a', traversal: 'unknown',
        note: 'Synthetic UI examples only, with no real coordinates or photographs. Conflicting records are shown together; neither is treated as current.', recordIds: ['example:a', 'example:b'] },
      ...campusArchive.collections,
    ] });
}
