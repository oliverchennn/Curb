import type { Edge } from '../../contracts/curb';
import {
  TripRequestSchema,
  TripScenarioSchema,
  type TripEdgeStatus,
  type TripEvaluation,
  type TripRequest,
  type TripRouteResult,
  type TripScenario,
} from '../../contracts/curb/trips';
import { buildScenarioView, InvalidScenarioError } from './index';

export class InvalidTripScenarioError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTripScenarioError';
  }
}

export class TripRequestError extends Error {
  constructor(
    public readonly code: 'INVALID_REQUEST' | 'SCENARIO_NOT_FOUND' | 'STALE_SCENARIO',
    message: string,
  ) {
    super(message);
    this.name = 'TripRequestError';
  }
}

/** Validate authored trip assumptions separately from evidence review state. */
export function validateTripScenario(input: unknown): TripScenario {
  const parsed = TripScenarioSchema.safeParse(input);
  if (!parsed.success) {
    throw new InvalidTripScenarioError(parsed.error.message);
  }
  const context = parsed.data;
  try {
    buildScenarioView(context.scenario);
  } catch (error) {
    if (error instanceof InvalidScenarioError) {
      throw new InvalidTripScenarioError(error.message);
    }
    throw error;
  }

  const edges = new Map(context.scenario.edges.map((edge) => [edge.id, edge]));
  const barriers = new Map(context.scenario.barriers.map((barrier) => [barrier.id, barrier]));
  const assessments = new Map<string, TripScenario['edgeAssessments'][number]>();
  for (const assessment of context.edgeAssessments) {
    const edge = edges.get(assessment.edgeId);
    if (!edge) {
      throw new InvalidTripScenarioError(`Assessment references missing edge "${assessment.edgeId}".`);
    }
    if (assessments.has(assessment.edgeId)) {
      throw new InvalidTripScenarioError(`Edge "${assessment.edgeId}" has more than one assessment.`);
    }
    assessments.set(assessment.edgeId, assessment);
    for (const barrierId of assessment.blockingBarrierIds) {
      const barrier = barriers.get(barrierId);
      if (!barrier || barrier.edgeId !== edge.id || !edge.barrierIds.includes(barrierId)) {
        throw new InvalidTripScenarioError(`Blocker "${barrierId}" does not belong to edge "${edge.id}".`);
      }
    }
  }
  for (const edge of context.scenario.edges) {
    if (!assessments.has(edge.id)) {
      throw new InvalidTripScenarioError(`Edge "${edge.id}" has no assessment.`);
    }
  }

  const repairIds = new Set<string>();
  for (const repair of context.repairs) {
    if (repairIds.has(repair.id)) {
      throw new InvalidTripScenarioError(`Duplicate repair ID "${repair.id}".`);
    }
    repairIds.add(repair.id);
    const barrier = barriers.get(repair.barrierId);
    if (!barrier || !assessments.get(barrier.edgeId)?.blockingBarrierIds.includes(barrier.id)) {
      throw new InvalidTripScenarioError(`Repair "${repair.id}" must target a named edge blocker.`);
    }
  }

  if (context.scenario.evidence.some((record) => record.origin !== 'synthetic')) {
    throw new InvalidTripScenarioError('Trip evidence must be explicitly synthetic.');
  }
  if (!context.scenario.nodes.some((node) => node.id === context.defaults.originNodeId)) {
    throw new InvalidTripScenarioError('Default trip origin does not exist.');
  }
  if (!context.scenario.destinations.some((destination) => destination.id === context.defaults.destinationId)) {
    throw new InvalidTripScenarioError('Default trip destination does not exist.');
  }
  return context;
}

type Path = { nodeIds: string[]; edgeIds: string[]; distanceMeters: number };
type Arc = { edge: Edge; toNodeId: string };

// Use code-unit ID ordering, independent of input order and host locale.
function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareIdLists(left: string[], right: string[]): number {
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    const difference = compareIds(left[index], right[index]);
    if (difference !== 0) return difference;
  }
  return left.length - right.length;
}

function comparePaths(left: Path, right: Path): number {
  return left.distanceMeters - right.distanceMeters
    || compareIdLists(left.edgeIds, right.edgeIds)
    || compareIdLists(left.nodeIds, right.nodeIds);
}

function buildAdjacency(context: TripScenario): Map<string, Arc[]> {
  const adjacency = new Map(context.scenario.nodes.map((node) => [node.id, [] as Arc[]]));
  for (const edge of context.scenario.edges) {
    adjacency.get(edge.fromNodeId)!.push({ edge, toNodeId: edge.toNodeId });
    if (edge.bidirectional && edge.fromNodeId !== edge.toNodeId) {
      adjacency.get(edge.toNodeId)!.push({ edge, toNodeId: edge.fromNodeId });
    }
  }
  return adjacency;
}

/** Dijkstra for the small demo graph; equal distances prefer ordered edge IDs. */
function shortestPath(
  adjacency: Map<string, Arc[]>,
  originNodeId: string,
  destinationNodeId: string,
  permits: (edgeId: string) => boolean,
): Path | null {
  const candidates = new Map<string, Path>([[originNodeId, {
    nodeIds: [originNodeId], edgeIds: [], distanceMeters: 0,
  }]]);
  const settled = new Set<string>();
  while (candidates.size > 0) {
    let next: { nodeId: string; path: Path } | undefined;
    for (const [nodeId, path] of candidates) {
      if (!next || comparePaths(path, next.path) < 0) next = { nodeId, path };
    }
    const { nodeId, path } = next!;
    candidates.delete(nodeId);
    settled.add(nodeId);
    if (nodeId === destinationNodeId) return path;

    for (const { edge, toNodeId } of adjacency.get(nodeId)!) {
      if (!permits(edge.id) || settled.has(toNodeId)) continue;
      const distanceMeters = path.distanceMeters + edge.lengthMeters;
      if (!Number.isFinite(distanceMeters)) {
        throw new InvalidTripScenarioError('Trip path length exceeds the finite distance range.');
      }
      const candidate: Path = {
        nodeIds: [...path.nodeIds, toNodeId],
        edgeIds: [...path.edgeIds, edge.id],
        distanceMeters,
      };
      const previous = candidates.get(toNodeId);
      if (!previous || comparePaths(candidate, previous) < 0) candidates.set(toNodeId, candidate);
    }
  }
  return null;
}

function effectiveStatuses(context: TripScenario, clearedBarrierId: string | null): Map<string, TripEdgeStatus> {
  return new Map(context.edgeAssessments.map((assessment) => {
    const hasBlockers = assessment.blockingBarrierIds.some((id) => id !== clearedBarrierId);
    const status: TripEdgeStatus = hasBlockers ? 'blocked'
      : assessment.status === 'unknown' ? 'unknown' : 'pass';
    return [assessment.edgeId, status];
  }));
}

function evaluateRoute(
  adjacency: Map<string, Arc[]>,
  statuses: Map<string, TripEdgeStatus>,
  originNodeId: string,
  destinationNodeId: string,
): TripRouteResult {
  const reachable = shortestPath(adjacency, originNodeId, destinationNodeId, (id) => statuses.get(id) === 'pass');
  if (reachable) return { status: 'reachable', ...reachable };

  const potential = shortestPath(adjacency, originNodeId, destinationNodeId, (id) => statuses.get(id) !== 'blocked');
  if (potential) {
    return {
      status: 'unknown', blockedEdgeIds: [],
      unknownEdgeIds: potential.edgeIds.filter((id) => statuses.get(id) === 'unknown'),
    };
  }
  const structural = shortestPath(adjacency, originNodeId, destinationNodeId, () => true);
  if (!structural) return { status: 'disconnected', blockedEdgeIds: [], unknownEdgeIds: [] };
  return {
    status: 'blocked',
    blockedEdgeIds: structural.edgeIds.filter((id) => statuses.get(id) === 'blocked'),
    unknownEdgeIds: structural.edgeIds.filter((id) => statuses.get(id) === 'unknown'),
  };
}

/** Project at most one repair without changing assessments, barriers or evidence. */
export function evaluateTrip(input: TripScenario, request: TripRequest): TripEvaluation {
  const context = validateTripScenario(input);
  const parsed = TripRequestSchema.safeParse(request);
  if (!parsed.success) throw new TripRequestError('INVALID_REQUEST', 'Trip request is invalid.');
  const selection = parsed.data;
  if (selection.scenarioId !== context.scenario.id) {
    throw new TripRequestError('SCENARIO_NOT_FOUND', 'Trip scenario does not exist.');
  }
  if (selection.revision !== context.scenario.revision) {
    throw new TripRequestError('STALE_SCENARIO', 'Trip scenario revision has changed.');
  }
  if (!context.scenario.nodes.some((node) => node.id === selection.originNodeId)) {
    throw new TripRequestError('INVALID_REQUEST', 'Trip origin does not exist.');
  }
  const destination = context.scenario.destinations.find((record) => record.id === selection.destinationId);
  if (!destination) throw new TripRequestError('INVALID_REQUEST', 'Trip destination does not exist.');
  const repair = selection.repairId === null ? null : context.repairs.find((record) => record.id === selection.repairId);
  if (repair === undefined) throw new TripRequestError('INVALID_REQUEST', 'Trip repair does not exist.');

  const adjacency = buildAdjacency(context);
  const before = evaluateRoute(adjacency, effectiveStatuses(context, null), selection.originNodeId, destination.nodeId);
  const after = repair
    ? evaluateRoute(adjacency, effectiveStatuses(context, repair.barrierId), selection.originNodeId, destination.nodeId)
    : before;
  return { ...selection, before, after };
}
