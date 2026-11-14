import { describe, expect, it } from 'vitest';
import { ScenarioSchema } from '../../contracts/curb';
import empty from '../../data/curb/empty.json';
import sample from '../../data/curb/sample.json';
import { buildScenarioView, getBarrierDetail, InvalidScenarioError } from './index';

describe('Curb domain', () => {
  it('derives scenario counts from its collections without mutating the input', () => {
    const scenario = ScenarioSchema.parse(sample);
    const original = structuredClone(scenario);
    const view = buildScenarioView(scenario);

    expect(view.scenario).toEqual(original);
    expect(view.counts).toEqual({
      nodes: original.nodes.length,
      edges: original.edges.length,
      destinations: original.destinations.length,
      barriers: original.barriers.length,
      evidence: original.evidence.length,
    });
    expect(scenario).toEqual(original);
  });

  it('returns only linked evidence in reference order without mutating the input', () => {
    const scenario = ScenarioSchema.parse(sample);
    const reviewIndex = scenario.evidence.findIndex(({ id }) => id === 'quad-obstruction-review');
    const [review] = scenario.evidence.splice(reviewIndex, 1);
    scenario.evidence.unshift(review);
    const original = structuredClone(scenario);

    const detail = getBarrierDetail(scenario, 'quad-obstruction');

    expect(detail?.barrier.id).toBe('quad-obstruction');
    expect(detail?.evidence.map(({ id }) => id)).toEqual([
      'quad-obstruction-note',
      'quad-obstruction-review',
    ]);
    expect(scenario).toEqual(original);
  });

  it('returns null for an absent barrier in a valid scenario', () => {
    expect(getBarrierDetail(ScenarioSchema.parse(sample), 'missing-barrier')).toBeNull();
    expect(getBarrierDetail(ScenarioSchema.parse(empty), 'missing-barrier')).toBeNull();
  });

  it.each(['nodes', 'edges', 'destinations', 'barriers', 'evidence'] as const)(
    'rejects duplicate IDs in %s',
    (collection) => {
      const scenario = ScenarioSchema.parse(sample);
      const records = scenario[collection];
      const record = collection === 'edges'
        ? scenario.edges.find(({ barrierIds }) => barrierIds.length === 0)!
        : records[0];
      const invalid = { ...scenario, [collection]: [...records, record] };

      expect(() => buildScenarioView(invalid)).toThrow(InvalidScenarioError);
    },
  );

  it('rejects edges whose starting nodes are missing', () => {
    const scenario = ScenarioSchema.parse(sample);
    scenario.edges[0].fromNodeId = 'missing-node';
    expect(() => buildScenarioView(scenario)).toThrow(InvalidScenarioError);
  });

  it('rejects destinations whose nodes are missing', () => {
    const scenario = ScenarioSchema.parse(sample);
    scenario.destinations[0].nodeId = 'missing-node';
    expect(() => buildScenarioView(scenario)).toThrow(InvalidScenarioError);
  });

  it('rejects edges that omit a barrier assigned to them', () => {
    const scenario = ScenarioSchema.parse(sample);
    const barrier = scenario.barriers[0];
    const edge = scenario.edges.find(({ id }) => id === barrier.edgeId)!;
    edge.barrierIds = edge.barrierIds.filter((id) => id !== barrier.id);
    expect(() => buildScenarioView(scenario)).toThrow(InvalidScenarioError);
  });

  it('rejects edges that list a barrier belonging to another edge', () => {
    const scenario = ScenarioSchema.parse(sample);
    const barrier = scenario.barriers[0];
    const owningEdge = scenario.edges.find(({ id }) => id === barrier.edgeId)!;
    const otherEdge = scenario.edges.find(({ id }) => id !== barrier.edgeId)!;
    owningEdge.barrierIds = owningEdge.barrierIds.filter((id) => id !== barrier.id);
    otherEdge.barrierIds.push(barrier.id);
    expect(() => buildScenarioView(scenario)).toThrow(InvalidScenarioError);
  });

  it('rejects edges that reference a missing barrier', () => {
    const scenario = ScenarioSchema.parse(sample);
    scenario.edges[0].barrierIds.push('missing-barrier');
    expect(() => buildScenarioView(scenario)).toThrow(InvalidScenarioError);
  });

  it('rejects barriers that reference a missing edge', () => {
    const scenario = ScenarioSchema.parse(sample);
    const barrier = scenario.barriers[0];
    scenario.edges = scenario.edges.filter(({ id }) => id !== barrier.edgeId);
    expect(() => buildScenarioView(scenario)).toThrow(InvalidScenarioError);
  });

  it('rejects repeated barrier references on one edge', () => {
    const scenario = ScenarioSchema.parse(sample);
    const edge = scenario.edges.find(({ barrierIds }) => barrierIds.length > 0)!;
    edge.barrierIds.push(edge.barrierIds[0]);
    expect(() => buildScenarioView(scenario)).toThrow(InvalidScenarioError);
  });

  it('rejects repeated evidence references on one barrier', () => {
    const scenario = ScenarioSchema.parse(sample);
    const barrier = scenario.barriers.find(({ evidenceIds }) => evidenceIds.length > 0)!;
    barrier.evidenceIds.push(barrier.evidenceIds[0]);
    expect(() => buildScenarioView(scenario)).toThrow(InvalidScenarioError);
  });

  it('rejects missing evidence even when looking up another barrier or an absent one', () => {
    const scenario = ScenarioSchema.parse(sample);
    scenario.evidence = scenario.evidence.filter(({ id }) => id !== 'library-curb-note');
    expect(() => buildScenarioView(scenario)).toThrow(InvalidScenarioError);
    expect(() => getBarrierDetail(scenario, 'library-curb')).toThrow(InvalidScenarioError);
    expect(() => getBarrierDetail(scenario, 'quad-obstruction')).toThrow(InvalidScenarioError);
    expect(() => getBarrierDetail(scenario, 'missing-barrier')).toThrow(InvalidScenarioError);
  });

  it('rejects nodes with out-of-bounds coordinates', () => {
    const scenario = ScenarioSchema.parse(sample);
    scenario.nodes[0].coordinate = [0, 91];
    expect(() => buildScenarioView(scenario)).toThrow(InvalidScenarioError);
  });

  it('rejects out-of-bounds coordinates inside an edge LineString', () => {
    const scenario = ScenarioSchema.parse(sample);
    scenario.edges[0].geometry.coordinates.splice(1, 0, [-181, 0]);
    expect(() => buildScenarioView(scenario)).toThrow(InvalidScenarioError);
  });

  it.each([0, -1, Infinity, NaN])('rejects an edge with length %s', (lengthMeters) => {
    const scenario = ScenarioSchema.parse(sample);
    scenario.edges[0].lengthMeters = lengthMeters;
    expect(() => buildScenarioView(scenario)).toThrow(InvalidScenarioError);
  });
});
