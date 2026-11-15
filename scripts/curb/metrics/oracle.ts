import { PlanScenarioSchema, type PlanDestinationOutcome, type PlanEligibleRepair } from '../../../src/contracts/curb/plans';
import { codeUnitCompare, sameIds, type Strategy } from './spec';

export type Projection = {
  selectedRepairIds: string[];
  spendCents: number;
  totalDestinationIds: string[];
  newDestinationIds: string[];
};

type Candidate = PlanEligibleRepair;
type Edge = ReturnType<typeof PlanScenarioSchema.parse>['scenario']['edges'][number];
type Arc = { edgeId: string; next: string };

export function requireCheck(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

function indexUnique<T>(values: readonly T[], key: (value: T) => string, label: string): Map<string, T> {
  const result = new Map(values.map(value => [key(value), value]));
  requireCheck(result.size === values.length, 'Duplicate ' + label);
  return result;
}

const conditionOrder = (a: Candidate, b: Candidate) =>
  b.severityScore - a.severityScore || a.costCents - b.costCents || codeUnitCompare(a.repairId, b.repairId);
const cheapestOrder = (a: Candidate, b: Candidate) =>
  a.costCents - b.costCents || b.severityScore - a.severityScore || codeUnitCompare(a.repairId, b.repairId);

function compareIdLists(a: readonly string[], b: readonly string[]): number {
  for (let index = 0; index < Math.min(a.length, b.length); index++) {
    const difference = codeUnitCompare(a[index], b[index]);
    if (difference !== 0) return difference;
  }
  return a.length - b.length;
}

function exactRank(a: Projection, b: Projection): number {
  return b.newDestinationIds.length - a.newDestinationIds.length ||
    a.spendCents - b.spendCents || a.selectedRepairIds.length - b.selectedRepairIds.length ||
    compareIdLists(a.selectedRepairIds, b.selectedRepairIds);
}

function marginalOrder(a: { candidate: Candidate; gain: number }, b: typeof a): number {
  const first = a.candidate.costCents === 0 && a.gain > 0;
  const second = b.candidate.costCents === 0 && b.gain > 0;
  if (first !== second) return first ? -1 : 1;
  if (!first) {
    const aScaled = BigInt(a.gain) * BigInt(b.candidate.costCents || 1);
    const bScaled = BigInt(b.gain) * BigInt(a.candidate.costCents || 1);
    if (aScaled !== bScaled) return aScaled > bScaled ? -1 : 1;
  }
  return b.gain - a.gain || a.candidate.costCents - b.candidate.costCents ||
    codeUnitCompare(a.candidate.repairId, b.candidate.repairId);
}

/** Directed reachability and subset search used only by the independent audit. */
export function prepareOracle(input: unknown) {
  const plan = PlanScenarioSchema.parse(input);
  const nodes = indexUnique(plan.scenario.nodes, node => node.id, 'node');
  const destinations = indexUnique(plan.scenario.destinations, dest => dest.id, 'destination');
  const edges = indexUnique(plan.scenario.edges, edge => edge.id, 'edge');
  const assessments = indexUnique(plan.edgeAssessments, value => value.edgeId, 'edge assessment');
  const barriers = indexUnique(plan.scenario.barriers, value => value.id, 'barrier');
  const repairs = indexUnique(plan.repairs, value => value.id, 'repair');
  const adjacency = new Map<string, Arc[]>();
  for (const node of nodes.keys()) adjacency.set(node, []);
  for (const dest of destinations.values()) requireCheck(nodes.has(dest.nodeId), 'Invalid destination node: ' + dest.id);
  requireCheck(assessments.size === edges.size, 'Wrong number of edge assessments');
  for (const edge of edges.values()) {
    requireCheck(nodes.has(edge.fromNodeId) && nodes.has(edge.toNodeId), 'Invalid edge endpoints: ' + edge.id);
    const assessment = assessments.get(edge.id);
    requireCheck(assessment, 'Missing edge assessment: ' + edge.id);
    requireCheck(edge.barrierIds.every(id => barriers.get(id)?.edgeId === edge.id), 'Wrong edge barrier reference: ' + edge.id);
    requireCheck(assessment.blockingBarrierIds.every(id => edge.barrierIds.includes(id)), 'Wrong edge blocker: ' + edge.id);
    adjacency.get(edge.fromNodeId)!.push({ edgeId: edge.id, next: edge.toNodeId });
    if (edge.bidirectional) adjacency.get(edge.toNodeId)!.push({ edgeId: edge.id, next: edge.fromNodeId });
  }
  for (const repair of repairs.values()) {
    const barrier = barriers.get(repair.barrierId);
    requireCheck(barrier && assessments.get(barrier.edgeId)?.blockingBarrierIds.includes(barrier.id),
      'Repair does not target an authored blocker: ' + repair.id);
  }

  const eligibleRepairs: Candidate[] = [];
  const excludedUnknownCostRepairIds: string[] = [];
  for (const candidate of plan.candidates) {
    if (candidate.cost.status === 'unknown') excludedUnknownCostRepairIds.push(candidate.repairId);
    else eligibleRepairs.push({
      repairId: candidate.repairId, severityScore: candidate.severity.score, costCents: candidate.cost.cents,
    });
  }
  eligibleRepairs.sort(conditionOrder);
  const cheapest = [...eligibleRepairs].sort(cheapestOrder);
  const canonical = [...eligibleRepairs].sort((a, b) => codeUnitCompare(a.repairId, b.repairId));
  excludedUnknownCostRepairIds.sort(codeUnitCompare);
  const costs = new Map(eligibleRepairs.map(({ repairId, costCents }) => [repairId, costCents]));
  const eligibleCostCents = eligibleRepairs.reduce((sum, repair) => sum + repair.costCents, 0);

  function clearedBy(ids: readonly string[]): Set<string> {
    requireCheck(new Set(ids).size === ids.length, 'Repeated selected repair');
    const cleared = new Set<string>();
    for (const id of ids) {
      requireCheck(costs.has(id), 'Ineligible selected repair: ' + id);
      cleared.add(repairs.get(id)!.barrierId);
    }
    return cleared;
  }

  function available(edgeId: string, cleared: ReadonlySet<string>): boolean {
    const assessment = assessments.get(edgeId)!;
    return assessment.status !== 'unknown' && assessment.blockingBarrierIds.every(id => cleared.has(id));
  }

  function reachable(ids: readonly string[]): string[] {
    const cleared = clearedBy(ids);
    const visited = new Set([plan.originNodeId]);
    const queue = [plan.originNodeId];
    for (let index = 0; index < queue.length; index++) {
      for (const arc of adjacency.get(queue[index])!) {
        if (visited.has(arc.next) || !available(arc.edgeId, cleared)) continue;
        visited.add(arc.next);
        queue.push(arc.next);
      }
    }
    return plan.destinationIds.filter(id => visited.has(destinations.get(id)!.nodeId));
  }

  const baselineDestinationIds = reachable([]);
  const baseline = new Set(baselineDestinationIds);

  function project(ids: readonly string[]): Projection {
    const totalDestinationIds = reachable(ids);
    return {
      selectedRepairIds: [...ids], spendCents: ids.reduce((sum, id) => sum + costs.get(id)!, 0),
      totalDestinationIds, newDestinationIds: totalDestinationIds.filter(id => !baseline.has(id)),
    };
  }

  function scan(order: readonly Candidate[], budget: number): Projection {
    const funded: string[] = [];
    for (const repair of order) {
      if (repair.costCents > budget) continue;
      funded.push(repair.repairId);
      budget -= repair.costCents;
    }
    return project(funded);
  }

  function greedy(budget: number): Projection {
    const funded: string[] = [];
    let coverage = baseline.size;
    while (true) {
      const affordable = canonical.filter(c => !funded.includes(c.repairId) && c.costCents <= budget);
      const ordered = affordable.map(candidate => ({
        candidate, gain: reachable([...funded, candidate.repairId]).length - coverage,
      })).sort(marginalOrder);
      const next = ordered[0];
      if (!next) return project(funded);
      funded.push(next.candidate.repairId);
      budget -= next.candidate.costCents;
      coverage += next.gain;
    }
  }

  function evaluate(budget: number) {
    requireCheck(Number.isSafeInteger(budget) && budget >= 0, 'Invalid oracle budget');
    let best = project([]);
    let feasibleSubsetCount = 0;
    const ids: string[] = [];
    // Every combination is unique and lexical. A branch pruned for cost cannot contain a feasible subset.
    function enumerate(start: number, spend: number) {
      feasibleSubsetCount++;
      const projection = project(ids);
      if (exactRank(projection, best) < 0) best = projection;
      for (let next = start; next < canonical.length; next++) {
        const candidate = canonical[next];
        if (candidate.costCents > budget - spend) continue;
        ids.push(candidate.repairId);
        enumerate(next + 1, spend + candidate.costCents);
        ids.pop();
      }
    }
    enumerate(0, 0);
    const policies: Record<Strategy, Projection> = {
      exact: best, conditionFirst: scan(eligibleRepairs, budget),
      cheapestFirst: scan(cheapest, budget), greedy: greedy(budget),
    };
    return { policies, search: { enumeratedSubsetCount: 2 ** canonical.length, feasibleSubsetCount } };
  }

  function validateOutcomes(outcomes: readonly PlanDestinationOutcome[], ids: readonly string[], label: string) {
    const expected = reachable(ids);
    const actual = outcomes.filter(x => x.route.status === 'reachable').map(x => x.destinationId);
    requireCheck(sameIds(outcomes.map(x => x.destinationId), plan.destinationIds), label + ': Wrong destination list or order');
    requireCheck(sameIds(actual, expected), label + ': Reachable destination IDs differ from directed BFS');
    const cleared = clearedBy(ids);
    for (const { destinationId, route } of outcomes) {
      const context = label + '/' + destinationId;
      if (route.status !== 'reachable') {
        for (const id of [...route.blockedEdgeIds, ...route.unknownEdgeIds]) {
          requireCheck(edges.has(id), context + ': Unknown explanation edge ' + id);
        }
        continue;
      }
      const lastNode = destinations.get(destinationId)!.nodeId;
      requireCheck(route.nodeIds[0] === plan.originNodeId && route.nodeIds.at(-1) === lastNode &&
        route.nodeIds.length === route.edgeIds.length + 1, context + ': Invalid route endpoints or path length');
      let distance = 0;
      for (const [index, id] of route.edgeIds.entries()) {
        const edge: Edge | undefined = edges.get(id);
        const from = route.nodeIds[index], to = route.nodeIds[index + 1];
        requireCheck(edge && (
          edge.fromNodeId === from && edge.toNodeId === to ||
          edge.bidirectional && edge.toNodeId === from && edge.fromNodeId === to
        ), context + ': Broken directed witness at edge ' + id);
        requireCheck(available(id, cleared), context + ': Witness contains a blocked or unknown edge ' + id);
        distance += edge.lengthMeters;
      }
      requireCheck(distance === route.distanceMeters, context + ': Incorrect route witness distance');
    }
    return actual;
  }

  return {
    plan, eligibleRepairs, excludedUnknownCostRepairIds, eligibleCostCents,
    baselineDestinationIds, project, evaluate, validateOutcomes,
  };
}

export type Oracle = ReturnType<typeof prepareOracle>;
