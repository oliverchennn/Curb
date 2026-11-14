export const conditions = [
  { id: 'current', label: 'Current conditions' },
  { id: 'surface-crack', label: 'Repair surface crack' },
  { id: 'raised-slab', label: 'Repair raised slab' },
];

export function validateSurvey(survey) {
  const { nodes, segments, destinations, findings, origin, video } = survey;
  if (![nodes, segments, destinations, findings].every(Array.isArray) || !video?.src) {
    throw new Error('The survey is missing its graph, findings, or video.');
  }
  if (nodes.some(({ x, y }) => !Number.isFinite(x) || !Number.isFinite(y))) {
    throw new Error('Every sidewalk node needs a valid map position.');
  }
  const nodeIds = new Set(nodes.map(({ id }) => id));
  const segmentIds = new Set(segments.map(({ id }) => id));
  const findingIds = new Set(findings.map(({ id }) => id));
  if (nodeIds.size !== nodes.length || segmentIds.size !== segments.length ||
      findingIds.size !== findings.length || !nodeIds.has(origin) ||
      destinations.some(({ node }) => !nodeIds.has(node))) {
    throw new Error('The survey has duplicate IDs or references an unknown node.');
  }
  for (const segment of segments) {
    if (!nodeIds.has(segment.from) || !nodeIds.has(segment.to) ||
        !Number.isFinite(segment.meters) || segment.meters <= 0) {
      throw new Error('Every segment needs two valid endpoints and a positive distance.');
    }
  }
  for (const finding of findings) {
    const { box, start, end, segment, source, assessment, measurement } = finding;
    if (!segmentIds.has(segment) || !Number.isFinite(start) || !Number.isFinite(end) ||
        start < 0 || end <= start || !Array.isArray(box) || box.length !== 4 ||
        !box.every(Number.isFinite) || box[0] < 0 || box[1] < 0 ||
        box[2] <= 0 || box[3] <= 0 || box[0] + box[2] > 1 || box[1] + box[3] > 1 ||
        !['model', 'manual'].includes(source) ||
        (assessment && !['blocked', 'passable'].includes(assessment.stepFree)) ||
        (measurement && (!Number.isFinite(measurement.value) || measurement.value <= 0 ||
          !['mm', 'cm', 'in'].includes(measurement.unit)))) {
      throw new Error('A finding has invalid timing, box, source, measurement, or segment data.');
    }
  }
  return survey;
}

export function evaluateRoutes(survey, repair = 'current') {
  const blocked = new Set(
    survey.findings.filter(({ id, assessment }) =>
      id !== repair && assessment?.reviewed === true && assessment.stepFree === 'blocked',
    ).map(({ segment }) => segment),
  );
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

export function compareRoutes(survey, repair) {
  const current = evaluateRoutes(survey);
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
  const currentEdges = new Set(current.destinations.flatMap(({ route }) => route?.edges ?? []));
  return { blocked: result.blocked, destinations, currentEdges };
}
