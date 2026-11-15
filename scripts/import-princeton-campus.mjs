#!/usr/bin/env node
/** Offline, reproducible OSM campus selection. No routing or accessibility inference.
 * --prepare DIR consumes saved API responses + receipts; --check verifies committed output.
 * The snapshot is ODbL-1.0 data. This importer is repository-licensed code.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const directory = resolve(root, 'src/data/curb/princeton-campus');
const highways = new Set(['footway', 'path', 'pedestrian', 'steps', 'cycleway']);
export const MAX_SECTION_WAYS = 64;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => JSON.stringify(value) + '\n';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
function assert(condition, message) { if (!condition) throw new Error(message); }
const position = n => [n.lon, n.lat];
const bounds = coordinates => [
  Math.min(...coordinates.map(c => c[0])), Math.min(...coordinates.map(c => c[1])),
  Math.max(...coordinates.map(c => c[0])), Math.max(...coordinates.map(c => c[1])),
];

/** -1 outside, 0 boundary, 1 inside. Boundary inclusion is explicit, not a snap. */
export function inRing(p, ring) {
  let inside = false;
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i], b = ring[i + 1];
    const cross = (p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0]);
    if (Math.abs(cross) < 1e-13 && p[0] >= Math.min(a[0], b[0]) - 1e-12 && p[0] <= Math.max(a[0], b[0]) + 1e-12 &&
      p[1] >= Math.min(a[1], b[1]) - 1e-12 && p[1] <= Math.max(a[1], b[1]) + 1e-12) return 0;
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside ? 1 : -1;
}
export function inArea(p, area) {
  return area.outer.some(r => inRing(p, r) >= 0) && !area.inner.some(r => inRing(p, r) === 1);
}
function cross(a, b, c) { return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); }
function intersects(a, b, c, d) {
  if (Math.max(a[0], b[0]) + 1e-12 < Math.min(c[0], d[0]) || Math.max(c[0], d[0]) + 1e-12 < Math.min(a[0], b[0]) ||
    Math.max(a[1], b[1]) + 1e-12 < Math.min(c[1], d[1]) || Math.max(c[1], d[1]) + 1e-12 < Math.min(a[1], b[1])) return false;
  const sign = n => Math.abs(n) < 1e-13 ? 0 : Math.sign(n);
  return sign(cross(a, b, c)) * sign(cross(a, b, d)) <= 0 && sign(cross(c, d, a)) * sign(cross(c, d, b)) <= 0;
}
/** Includes crossings with no vertex inside and boundary-touching ways; excludes ways wholly in holes. */
export function intersectsArea(coordinates, area) {
  if (coordinates.some(p => inArea(p, area))) return true;
  return area.outer.some(ring => coordinates.slice(1).some((b, i) =>
    ring.slice(1).some((d, j) => intersects(coordinates[i], b, ring[j], d))));
}

/** Join relation members by their original node IDs; never close an incomplete ring with a guessed edge. */
export function joinRings(members, ways, nodes, role) {
  const pending = members.filter(m => m.role === role).map(m => {
    assert(m.type === 'way' && ways.has(m.ref), `Missing boundary member ${m.ref}`);
    return [...ways.get(m.ref).nodes];
  });
  const rings = [];
  while (pending.length) {
    const ring = pending.shift();
    while (ring[0] !== ring.at(-1)) {
      const next = pending.findIndex(n => n[0] === ring.at(-1) || n.at(-1) === ring.at(-1));
      assert(next >= 0, `Unclosed ${role} boundary at node ${ring.at(-1)}`);
      const part = pending.splice(next, 1)[0];
      if (part.at(-1) === ring.at(-1)) part.reverse();
      ring.push(...part.slice(1));
    }
    assert(ring.length >= 4, 'Degenerate boundary ring');
    rings.push(ring.map(id => { assert(nodes.has(id), `Missing boundary node ${id}`); return position(nodes.get(id)); }));
  }
  return rings;
}

/** Spatial ordering only. These authored study areas are neither legal boundaries nor routes. */
function studyArea(feature, meadows) {
  if (intersectsArea(feature.geometry.coordinates, meadows)) return 'meadows';
  const [x, y] = feature.center;
  if (y >= 40.3515) return 'north';
  if (x < -74.663) return 'west';
  if (x >= -74.6505 && y >= 40.341) return 'east';
  if (y >= 40.345) return 'central';
  return 'south';
}
const areaNames = {
  north: 'Northern university areas', west: 'Graduate College / west campus',
  central: 'Central campus', east: 'East campus / athletics',
  south: 'Southern university areas', meadows: 'Meadows Neighborhood',
};
/** Median spatial bisection retains every feature once, without clipping or simplifying any way. */
export function partition(features, prefix = '') {
  if (features.length <= MAX_SECTION_WAYS) return [{ key: prefix || '0', features: [...features].sort((a, b) => a.id - b.id) }];
  const b = bounds(features.map(f => f.center));
  const axis = (b[2] - b[0]) * Math.cos(40.35 * Math.PI / 180) >= b[3] - b[1] ? 0 : 1;
  const sorted = [...features].sort((a, b) => a.center[axis] - b.center[axis] || a.id - b.id);
  const middle = Math.floor(sorted.length / 2);
  return [...partition(sorted.slice(0, middle), prefix + 'a'), ...partition(sorted.slice(middle), prefix + 'b')];
}

export function buildCampus(snapshot) {
  const seen = new Set();
  for (const e of snapshot.elements) {
    assert(Number.isSafeInteger(e.id) && e.id > 0, 'Invalid source ID');
    const key = `${e.type}/${e.id}`;
    assert(!seen.has(key), `Duplicate source object ${key}`); seen.add(key);
    if (e.type === 'node') assert(Number.isFinite(e.lon) && Number.isFinite(e.lat) && Math.abs(e.lon) <= 180 && Math.abs(e.lat) <= 90, `Invalid coordinate ${key}`);
  }
  const nodes = new Map(snapshot.elements.filter(e => e.type === 'node').map(e => [e.id, e]));
  const ways = new Map(snapshot.elements.filter(e => e.type === 'way').map(e => [e.id, e]));
  const relation = snapshot.elements.find(e => e.type === 'relation' && e.id === 6365145);
  const meadow = ways.get(1389673622);
  assert(relation?.tags.name === 'Princeton University' && relation.tags.type === 'multipolygon', 'University relation changed');
  assert(meadow?.tags.operator === 'Princeton University' && meadow.tags.amenity === 'university', 'Meadows source identity changed');
  const campus = { id: 'osm-relation-6365145', sourceType: 'relation', sourceId: relation.id, version: relation.version,
    editedAt: relation.timestamp, name: relation.tags.name,
    outer: joinRings(relation.members, ways, nodes, 'outer'), inner: joinRings(relation.members, ways, nodes, 'inner') };
  const meadows = { id: 'osm-way-1389673622', sourceType: 'way', sourceId: meadow.id, version: meadow.version,
    editedAt: meadow.timestamp, name: meadow.tags.name,
    outer: joinRings([{ type: 'way', role: 'outer', ref: meadow.id }], ways, nodes, 'outer'), inner: [] };
  const areas = [campus, meadows];
  const candidates = [...ways.values()].filter(w => highways.has(w.tags?.highway)).sort((a, b) => a.id - b.id);
  const features = [], excluded = { outsideArea: [], pedestrianAreas: [] };
  for (const w of candidates) {
    assert(w.nodes.length >= 2 && w.nodes.every(id => nodes.has(id)), `Incomplete original way ${w.id}`);
    const coordinates = w.nodes.map(id => position(nodes.get(id)));
    if (!areas.some(a => intersectsArea(coordinates, a))) { excluded.outsideArea.push(w.id); continue; }
    if (w.tags.area === 'yes') { excluded.pedestrianAreas.push(w.id); continue; }
    const b = bounds(coordinates);
    const feature = { id: w.id, version: w.version, editedAt: w.timestamp, nodes: w.nodes, tags: w.tags,
      geometry: { type: 'LineString', coordinates }, center: [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2] };
    features.push({ ...feature, area: studyArea(feature, meadows) });
  }
  assert(features.length > 0, 'Empty campus extract');
  const sections = [];
  const studyAreas = Object.entries(areaNames).map(([id, name]) => {
    const selected = features.filter(f => f.area === id);
    if (!selected.length) return { id, name, count: 0, bounds: null, sectionIds: [] };
    const parts = partition(selected);
    const areaSections = parts.map((part, index) => ({ id: `campus-${id}-${part.key}`, area: id, name,
      section: index + 1, sections: parts.length, areaCount: selected.length,
      bounds: bounds(part.features.flatMap(f => f.geometry.coordinates)), wayIds: part.features.map(f => f.id) }));
    sections.push(...areaSections);
    return { id, name, count: selected.length, bounds: bounds(selected.flatMap(f => f.geometry.coordinates)), sectionIds: areaSections.map(s => s.id) };
  });
  const sectionIds = sections.flatMap(s => s.wayIds);
  assert(sectionIds.length === features.length && new Set(sectionIds).size === features.length, 'Partition lost or duplicated ways');
  return { schemaVersion: 1, license: 'ODbL-1.0', attribution: '© OpenStreetMap contributors',
    licenseUrl: 'https://www.openstreetmap.org/copyright', retrievedAt: snapshot.retrievedAt,
    inclusion: 'Complete pedestrian ways intersecting OSM university relation 6365145 or Meadows way 1389673622, respecting relation holes. Not a legal campus boundary or completeness claim.',
    bounds: bounds(features.flatMap(f => f.geometry.coordinates)), boundaries: areas,
    studyAreaRule: 'Meadows intersection first; then way bounding-box center: north latitude ≥40.3515; west longitude <-74.663; east longitude ≥-74.6505 and latitude ≥40.341; central latitude ≥40.345; remaining south. Spatial median bisection into ≤64-way sections. Study divisions are authored browsing aids, not source-named routes.',
    counts: { candidateWays: candidates.length, selectedWays: features.length, sections: sections.length,
      excludedOutsideArea: excluded.outsideArea.length, excludedPedestrianAreas: excluded.pedestrianAreas.length,
      classes: Object.fromEntries([...highways].map(h => [h, features.filter(f => f.tags.highway === h).length])),
      unknownTags: Object.fromEntries(['width', 'incline', 'wheelchair', 'surface', 'lit'].map(t => [t, features.filter(f => f.tags[t] === undefined).length])) },
    studyAreas, sections, features: features.map(({ center, ...f }) => f), excluded };
}

function prepare(input) {
  const elements = new Map(), responses = [];
  const add = data => {
    for (const e of data.elements) {
      const key = `${e.type}/${e.id}`, old = elements.get(key);
      assert(!old || JSON.stringify(old) === JSON.stringify(e), `Source changed between responses: ${key}`);
      elements.set(key, e);
    }
  };
  for (const file of readdirSync(resolve(input, 'osm-tiles')).filter(f => /^\d-\d\.json$/.test(f)).sort()) {
    const bytes = readFileSync(resolve(input, 'osm-tiles', file));
    const receipt = read(resolve(input, 'osm-tiles', file.replace('.json', '-receipt.json')));
    assert(sha(bytes) === receipt.sha256, `Receipt mismatch ${file}`);
    responses.push(receipt); add(JSON.parse(bytes));
  }
  assert(responses.length === 12, 'Expected all 12 bounded source responses');
  const boundaryBytes = readFileSync(resolve(input, 'osm-relation.json'));
  // The relation response can use a different JSON key order but must agree on source content.
  const boundary = JSON.parse(boundaryBytes);
  for (const e of boundary.elements) {
    const old = elements.get(`${e.type}/${e.id}`);
    assert(!old || (old.version === e.version && old.timestamp === e.timestamp), `Boundary version conflict ${e.type}/${e.id}`);
    elements.set(`${e.type}/${e.id}`, e);
  }
  const relation = elements.get('relation/6365145');
  assert(relation, 'Missing university boundary');
  const requiredWays = new Set([...elements.values()].filter(e => e.type === 'way' && highways.has(e.tags?.highway)).map(e => e.id));
  relation.members.forEach(m => { assert(m.type === 'way', 'Unexpected boundary member'); requiredWays.add(m.ref); });
  requiredWays.add(1389673622);
  const requiredNodes = new Set([...requiredWays].flatMap(id => {
    const w = elements.get(`way/${id}`); assert(w, `Missing source way ${id}`); return w.nodes;
  }));
  const keep = [...elements.values()].filter(e => e.type === 'node' ? requiredNodes.has(e.id) : e.type === 'way' ? requiredWays.has(e.id) : e.id === 6365145)
    .map(e => Object.fromEntries(['type', 'id', 'version', 'timestamp', 'lat', 'lon', 'nodes', 'members', 'tags'].filter(k => k in e).map(k => [k, e[k]])))
    .sort((a, b) => a.type.localeCompare(b.type) || a.id - b.id);
  const retrievedAt = responses.map(r => r.retrievedAt).sort().at(-1);
  const snapshot = { schemaVersion: 1, license: 'ODbL-1.0', retrievedAt,
    note: 'Original geometry/node order, tags, IDs, edit versions and timestamps retained for all candidate pedestrian ways and campus boundary members. Unrelated objects and editor user names/UIDs/changesets omitted. Edit time is not an observation or capture date.', elements: keep };
  const bytes = json(snapshot);
  writeFileSync(resolve(directory, 'osm-source.json'), bytes);
  writeFileSync(resolve(directory, 'provenance.json'), JSON.stringify({ schemaVersion: 1, retrievalEnvelope: [-74.676, 40.318, -74.625, 40.356],
    sourceUrl: 'https://www.openstreetmap.org', licenseUrl: 'https://opendatacommons.org/licenses/odbl/1-0/', attribution: '© OpenStreetMap contributors',
    retrievalDateIsObservation: false, responses, boundaryResponse: { url: 'https://api.openstreetmap.org/api/0.6/relation/6365145/full.json', sha256: sha(boundaryBytes), version: relation.version, editedAt: relation.timestamp },
    sourceSnapshotSha256: sha(bytes) }, null, 2) + '\n');
}

/** Explicit one-off refresh, never called by the app/build/check. Bounded, serial public API reads. */
async function fetchSnapshot(destination) {
  mkdirSync(resolve(destination, 'osm-tiles'), { recursive: true });
  const xs = [-74.676, -74.659, -74.642, -74.625], ys = [40.318, 40.3275, 40.337, 40.3465, 40.356];
  for (let y = 0; y < ys.length - 1; y++) for (let x = 0; x < xs.length - 1; x++) {
    const bbox = [xs[x], ys[y], xs[x + 1], ys[y + 1]], name = `${x}-${y}`;
    const url = `https://api.openstreetmap.org/api/0.6/map.json?bbox=${bbox.join(',')}`;
    const response = await fetch(url, { headers: { 'User-Agent': 'Curb-campus-research/1.0' }, signal: AbortSignal.timeout(45000) });
    assert(response.ok, `OSM ${response.status}: ${url}; no partial snapshot will be imported`);
    const bytes = Buffer.from(await response.arrayBuffer()), data = JSON.parse(bytes.toString());
    assert(Array.isArray(data.elements), 'Missing OSM elements');
    writeFileSync(resolve(destination, 'osm-tiles', `${name}.json`), bytes);
    writeFileSync(resolve(destination, 'osm-tiles', `${name}-receipt.json`), JSON.stringify({ name, bbox, url,
      retrievedAt: new Date().toISOString(), bytes: bytes.length, sha256: sha(bytes), elements: data.elements.length }, null, 2) + '\n');
  }
  const url = 'https://api.openstreetmap.org/api/0.6/relation/6365145/full.json';
  const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
  assert(response.ok, `OSM boundary ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  writeFileSync(resolve(destination, 'osm-relation.json'), bytes);
  writeFileSync(resolve(destination, 'osm-relation-receipt.json'), JSON.stringify({ url, retrievedAt: new Date().toISOString(), sha256: sha(bytes) }, null, 2) + '\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args[0] === '--fetch') { assert(args.length === 2, 'Usage: --fetch DIRECTORY'); await fetchSnapshot(resolve(args[1])); prepare(resolve(args[1])); }
  else if (args[0] === '--prepare') { assert(args.length === 2, 'Usage: --prepare DIRECTORY'); prepare(resolve(args[1])); }
  else assert(args.length === 0 || (args.length === 1 && args[0] === '--check'), 'Usage: [--check | --prepare DIRECTORY | --fetch DIRECTORY]');
  const source = readFileSync(resolve(directory, 'osm-source.json'));
  assert(sha(source) === read(resolve(directory, 'provenance.json')).sourceSnapshotSha256, 'Source snapshot hash mismatch');
  const data = buildCampus(JSON.parse(source));
  const bytes = json(data), output = resolve(directory, 'campus.json');
  const index = { schemaVersion: 1, group: { id: 'campus', label: 'Campus (OSM)' },
    counts: data.counts, bounds: data.bounds, retrievedAt: data.retrievedAt,
    source: { id: 'osm-princeton-campus', license: data.license, credit: data.attribution, copyrightUrl: data.licenseUrl,
      licenseUrl: 'https://opendatacommons.org/licenses/odbl/1-0/', datasetSha256: sha(bytes) },
    studyAreas: data.studyAreas,
    sections: data.sections.map((s, i) => ({ collectionId: s.id, code: `C${String(i + 1).padStart(2, '0')}`, areaId: s.area,
      areaLabel: s.name, section: s.section, sectionsInArea: s.sections, areaWayCount: s.areaCount,
      bounds: s.bounds, wayCount: s.wayIds.length, featureIds: s.wayIds.map(id => `campus-osm-way:${id}`),
      recordIds: s.wayIds.map(id => `record:campus-osm-way:${id}`) })) };
  const indexPath = resolve(directory, 'campus-index.json'), indexBytes = JSON.stringify(index, null, 2) + '\n';
  if (args[0] === '--check') {
    assert(readFileSync(output, 'utf8') === bytes, 'Generated campus data differs; run importer and review');
    assert(readFileSync(indexPath, 'utf8') === indexBytes, 'Campus sidecar index differs');
  } else { writeFileSync(output, bytes); writeFileSync(indexPath, indexBytes); }
  console.log(JSON.stringify({ ...data.counts, bounds: data.bounds, sha256: sha(bytes), verified: args[0] === '--check' }, null, 2));
}
