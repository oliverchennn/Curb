import type { Edge } from '../../../contracts/curb';
import type { TripEdgeAssessment, TripScenario } from '../../../contracts/curb/trips';

export function nodeName(context: TripScenario, nodeId: string): string {
  return context.scenario.nodes.find((node) => node.id === nodeId)?.label
    ?? context.scenario.destinations.find((destination) => destination.nodeId === nodeId)?.label
    ?? nodeId;
}

export function edgeName(context: TripScenario, edge: Edge): string {
  return `${nodeName(context, edge.fromNodeId)} ${edge.bidirectional ? '↔' : '→'} ${nodeName(context, edge.toNodeId)}`;
}

export function formatDistance(meters: number): string {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(meters)} m`;
}

// This is a display projection of explicit assessments, not a route search.
// Clearing one barrier leaves other blockers and unknown coverage in place.
export function projectedAssessment(
  context: TripScenario,
  edgeId: string,
  repairId: string | null,
): TripEdgeAssessment | undefined {
  const assessment = context.edgeAssessments.find((item) => item.edgeId === edgeId);
  if (!assessment || !repairId) return assessment;
  const repair = context.repairs.find((item) => item.id === repairId);
  const blockingBarrierIds = assessment.blockingBarrierIds.filter((id) => id !== repair?.barrierId);
  return {
    ...assessment,
    blockingBarrierIds,
    status: assessment.status === 'blocked' && blockingBarrierIds.length === 0 ? 'pass' : assessment.status,
  };
}
