import type { Barrier, Edge, Scenario } from '../../../contracts/curb';

const BARRIER_KIND_LABELS: Record<Barrier['kind'], string> = {
  missing_ramp: 'Missing ramp',
  obstruction: 'Obstruction',
  surface_issue: 'Surface issue',
  unknown: 'Unclassified',
};

export function barrierKindLabel(kind: Barrier['kind']) {
  return BARRIER_KIND_LABELS[kind];
}

/** Returns a lookup that resolves a node ID to its label, falling back to the ID itself. */
export function nodeLabeler(scenario: Scenario) {
  const labels = new Map(scenario.nodes.map((node) => [node.id, node.label ?? node.id]));
  return (nodeId: string) => labels.get(nodeId) ?? nodeId;
}

export function describeEdge(edge: Edge | undefined, edgeId: string, labelFor: (nodeId: string) => string) {
  if (!edge) return `Path ${edgeId}`;
  return `${labelFor(edge.fromNodeId)} → ${labelFor(edge.toNodeId)}`;
}
