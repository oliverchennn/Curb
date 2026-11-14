export const conditions = [
  { id: 'current', label: 'Current conditions' },
  { id: 'surface-crack', label: 'Repair surface crack' },
  { id: 'raised-slab', label: 'Repair raised slab' },
];

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isText = value => typeof value === 'string' && value.trim().length > 0;
const isId = value => typeof value === 'string' && value.length > 0 && !/[^a-z0-9_-]/i.test(value);
const videoPath = /^media\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.(mp4|webm)$/i;
const imagePath = /^media\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.(jpe?g|png|webp)$/i;
const isMediaPath = (value, pattern) => typeof value === 'string' && value === value.trim() && pattern.test(value);

export function validateSurvey(survey) {
  if (!isRecord(survey)) throw new Error('The survey must be an object.');
  const { nodes, segments, destinations, findings, origin, video, label, sample } = survey;
  if (![nodes, segments, destinations, findings].every(items => Array.isArray(items) && items.every(isRecord)) ||
      !isRecord(video) || !isText(label) || typeof sample !== 'boolean' ||
      !isText(video.label) || !isMediaPath(video.src, videoPath) ||
      (video.poster !== undefined && !isMediaPath(video.poster, imagePath))) {
    throw new Error('The survey needs valid graph lists, labels, a sample flag, and local video and poster paths.');
  }
  if (nodes.some(({ id, x, y, label }) => !isId(id) || !Number.isFinite(x) || !Number.isFinite(y) ||
      x < 0 || x > 650 || y < 0 || y > 392 || (label !== undefined && !isText(label)))) {
    throw new Error('Every sidewalk node needs an ID and a position on the map.');
  }
  const nodeIds = new Set(nodes.map(({ id }) => id));
  const segmentIds = new Set(segments.map(({ id }) => id));
  const findingIds = new Set(findings.map(({ id }) => id));
  const destinationNodes = new Set(destinations.map(({ node }) => node));
  if (nodeIds.size !== nodes.length || segmentIds.size !== segments.length ||
      findingIds.size !== findings.length || destinationNodes.size !== destinations.length ||
      !nodeIds.has(origin) || destinations.some(({ node, label }) => !nodeIds.has(node) || !isText(label))) {
    throw new Error('The survey has duplicate IDs, invalid destination labels, or unknown nodes.');
  }

  let totalMeters = 0;
  for (const segment of segments) {
    if (!isId(segment.id) || !nodeIds.has(segment.from) || !nodeIds.has(segment.to) ||
        !Number.isFinite(segment.meters) || segment.meters <= 0 ||
        (segment.bidirectional !== undefined && typeof segment.bidirectional !== 'boolean')) {
      throw new Error('Every segment needs an ID, two endpoints, a positive distance, and a boolean direction when supplied.');
    }
    totalMeters += segment.meters;
  }
  if (!Number.isFinite(totalMeters)) throw new Error('The survey segment distances exceed the supported total.');

  for (const finding of findings) {
    const { id, label, location, closeUp, box, start, end, segment, source, assessment, measurement } = finding;
    if (!isId(id) || id === 'current' || !isText(label) || !isText(location) ||
        (closeUp !== undefined && !isMediaPath(closeUp, imagePath)) ||
        !segmentIds.has(segment) || !Number.isFinite(start) || !Number.isFinite(end) ||
        start < 0 || end <= start || !Array.isArray(box) || box.length !== 4 ||
        !box.every(Number.isFinite) || box[0] < 0 || box[1] < 0 ||
        box[2] <= 0 || box[3] <= 0 || box[0] + box[2] > 1 || box[1] + box[3] > 1 ||
        !['model', 'manual'].includes(source)) {
      throw new Error('A finding has an invalid ID, label, location, local close-up, timing, box, source, or segment.');
    }
    if (assessment !== undefined && (!isRecord(assessment) || typeof assessment.reviewed !== 'boolean' ||
        !['blocked', 'passable'].includes(assessment.stepFree) ||
        (assessment.reason !== undefined && !isText(assessment.reason)))) {
      throw new Error('A finding has an invalid assessment. Review status must be a boolean.');
    }
    if (measurement !== undefined && (!isRecord(measurement) || !Number.isFinite(measurement.value) ||
        measurement.value <= 0 || !['mm', 'cm', 'in'].includes(measurement.unit))) {
      throw new Error('A finding has an invalid measurement.');
    }
  }
  return survey;
}

export const isReviewedBlock = assessment => assessment?.reviewed === true && assessment.stepFree === 'blocked';

export function evaluateRoutes(survey, repair = 'current') {
  if (survey.sample !== true) return null;
  const blocked = new Set(survey.findings.filter(({ id, assessment }) =>
    id !== repair && isReviewedBlock(assessment),
  ).map(({ segment }) => segment));
  const adjacent = new Map(survey.nodes.map(({ id }) => [id, []]));
  for (const edge of survey.segments) {
    if (blocked.has(edge.id)) continue;
    adjacent.get(edge.from).push({ node: edge.to, edge });
    if (edge.bidirectional !== false) adjacent.get(edge.to).push({ node: edge.from, edge });
  }

  const routes = new Map([[survey.origin, { distance: 0, edges: [] }]]);
  const pending = new Set(adjacent.keys());
  while (pending.size) {
    let closest;
    for (const node of pending) {
      if (routes.has(node) && (closest === undefined || routes.get(node).distance < routes.get(closest).distance)) {
        closest = node;
      }
    }
    if (closest === undefined) break;
    const route = routes.get(closest);
    pending.delete(closest);
    for (const { node, edge } of adjacent.get(closest)) {
      if (!pending.has(node)) continue;
      const distance = route.distance + edge.meters;
      if (!Number.isFinite(distance)) throw new Error('A route distance exceeds the supported total.');
      if (!routes.has(node) || routes.get(node).distance > distance) {
        routes.set(node, { distance, edges: [...route.edges, edge.id] });
      }
    }
  }

  return { blocked, destinations: survey.destinations.map(destination => ({
    ...destination,
    route: routes.get(destination.node) ?? null,
  })) };
}

export function compareRoutes(survey, repair = 'current') {
  const current = evaluateRoutes(survey);
  if (!current) return null;
  const result = repair === 'current' ? current : evaluateRoutes(survey, repair);
  const destinations = result.destinations.map((destination, index) => {
    const before = current.destinations[index].route;
    const after = destination.route;
    return {
      ...destination,
      restored: !before && Boolean(after),
      saved: before && after ? Math.max(0, before.distance - after.distance) : 0,
    };
  });
  const distanceSaved = destinations.reduce((sum, item) => sum + item.saved, 0);
  if (!Number.isFinite(distanceSaved)) throw new Error('Total distance saved exceeds the supported total.');
  const currentEdges = new Set(current.destinations.flatMap(({ route }) => route?.edges ?? []));
  return { blocked: result.blocked, destinations, currentEdges, distanceSaved };
}
