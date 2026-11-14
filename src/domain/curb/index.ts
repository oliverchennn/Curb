import { ScenarioSchema, type BarrierDetail, type Scenario, type ScenarioView } from '../../contracts/curb';

export class InvalidScenarioError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidScenarioError';
  }
}

function indexById<T extends { id: string }>(records: T[], collection: string) {
  const index = new Map<string, T>();
  for (const record of records) {
    if (index.has(record.id)) {
      throw new InvalidScenarioError(`Duplicate ${collection} ID "${record.id}".`);
    }
    index.set(record.id, record);
  }
  return index;
}

function validateScenario(input: Scenario) {
  const result = ScenarioSchema.safeParse(input);
  if (!result.success) {
    throw new InvalidScenarioError(result.error.message);
  }

  const scenario = result.data;
  const nodes = indexById(scenario.nodes, 'node');
  const edges = indexById(scenario.edges, 'edge');
  const barriers = indexById(scenario.barriers, 'barrier');
  const evidence = indexById(scenario.evidence, 'evidence');
  indexById(scenario.destinations, 'destination');

  for (const edge of scenario.edges) {
    for (const nodeId of [edge.fromNodeId, edge.toNodeId]) {
      if (!nodes.has(nodeId)) {
        throw new InvalidScenarioError(`Edge "${edge.id}" references missing node "${nodeId}".`);
      }
    }
  }

  for (const destination of scenario.destinations) {
    if (!nodes.has(destination.nodeId)) {
      throw new InvalidScenarioError(
        `Destination "${destination.id}" references missing node "${destination.nodeId}".`,
      );
    }
  }

  const linkedBarriers = new Set<string>();
  for (const edge of scenario.edges) {
    for (const barrierId of edge.barrierIds) {
      const barrier = barriers.get(barrierId);
      if (!barrier) {
        throw new InvalidScenarioError(`Edge "${edge.id}" references missing barrier "${barrierId}".`);
      }
      if (barrier.edgeId !== edge.id) {
        throw new InvalidScenarioError(`Barrier "${barrierId}" does not belong to edge "${edge.id}".`);
      }
      if (linkedBarriers.has(barrierId)) {
        throw new InvalidScenarioError(`Edge "${edge.id}" repeats barrier "${barrierId}".`);
      }
      linkedBarriers.add(barrierId);
    }
  }

  const evidenceByBarrier = new Map<string, BarrierDetail['evidence']>();
  for (const barrier of scenario.barriers) {
    if (!edges.has(barrier.edgeId)) {
      throw new InvalidScenarioError(`Barrier "${barrier.id}" references missing edge "${barrier.edgeId}".`);
    }
    if (!linkedBarriers.has(barrier.id)) {
      throw new InvalidScenarioError(`Edge "${barrier.edgeId}" omits barrier "${barrier.id}".`);
    }

    const linkedEvidence = new Set<string>();
    const barrierEvidence = barrier.evidenceIds.map((evidenceId) => {
      const record = evidence.get(evidenceId);
      if (!record) {
        throw new InvalidScenarioError(`Barrier "${barrier.id}" references missing evidence "${evidenceId}".`);
      }
      if (linkedEvidence.has(evidenceId)) {
        throw new InvalidScenarioError(`Barrier "${barrier.id}" repeats evidence "${evidenceId}".`);
      }
      linkedEvidence.add(evidenceId);
      return record;
    });
    evidenceByBarrier.set(barrier.id, barrierEvidence);
  }

  return { scenario, barriers, evidenceByBarrier };
}

export function buildScenarioView(input: Scenario): ScenarioView {
  const { scenario } = validateScenario(input);
  return {
    scenario,
    counts: {
      nodes: scenario.nodes.length,
      edges: scenario.edges.length,
      destinations: scenario.destinations.length,
      barriers: scenario.barriers.length,
      evidence: scenario.evidence.length,
    },
  };
}

export function getBarrierDetail(input: Scenario, barrierId: string): BarrierDetail | null {
  const { barriers, evidenceByBarrier } = validateScenario(input);
  const barrier = barriers.get(barrierId);
  const evidence = evidenceByBarrier.get(barrierId);
  return barrier && evidence ? { barrier, evidence } : null;
}
