import { describe, expect, it } from 'vitest';
import { ScenarioSchema } from '../../contracts/curb';
import sample from '../../data/curb/sample.json';
import { buildScenarioView, getBarrierDetail, InvalidScenarioError } from './index';

describe('Curb domain', () => {
  it('derives scenario counts from its collections', () => {
    const scenario = ScenarioSchema.parse(sample);
    const view = buildScenarioView(scenario);
    expect(view.scenario).toEqual(scenario);
    expect(view.counts).toEqual({
      nodes: scenario.nodes.length,
      edges: scenario.edges.length,
      destinations: scenario.destinations.length,
      barriers: scenario.barriers.length,
      evidence: scenario.evidence.length,
    });
  });

  it('returns linked evidence in reference order and null for an absent barrier', () => {
    const scenario = ScenarioSchema.parse(sample);
    const detail = getBarrierDetail(scenario, 'quad-obstruction');
    expect(detail?.barrier.id).toBe('quad-obstruction');
    expect(detail?.evidence.map(({ id }) => id)).toEqual([
      'quad-obstruction-note',
      'quad-obstruction-review',
    ]);
    expect(getBarrierDetail(scenario, 'missing-barrier')).toBeNull();
  });

  it('rejects duplicate record IDs', () => {
    const scenario = ScenarioSchema.parse(sample);
    scenario.nodes.push(scenario.nodes[0]);
    expect(() => buildScenarioView(scenario)).toThrow(InvalidScenarioError);
  });

  it('rejects destinations whose nodes are missing', () => {
    const scenario = ScenarioSchema.parse(sample);
    scenario.destinations[0].nodeId = 'missing-node';
    expect(() => buildScenarioView(scenario)).toThrow(InvalidScenarioError);
  });

  it('rejects inconsistent barrier and edge references', () => {
    const scenario = ScenarioSchema.parse(sample);
    const barrier = scenario.barriers[0];
    const edge = scenario.edges.find(({ id }) => id === barrier.edgeId)!;
    edge.barrierIds = [];
    expect(() => buildScenarioView(scenario)).toThrow(InvalidScenarioError);
  });

  it('rejects missing evidence even when looking up an absent barrier', () => {
    const scenario = ScenarioSchema.parse(sample);
    scenario.evidence = scenario.evidence.filter(({ id }) => id !== 'library-curb-note');
    expect(() => buildScenarioView(scenario)).toThrow(InvalidScenarioError);
    expect(() => getBarrierDetail(scenario, 'library-curb')).toThrow(InvalidScenarioError);
    expect(() => getBarrierDetail(scenario, 'missing-barrier')).toThrow(InvalidScenarioError);
  });

  it('rejects malformed records at runtime', () => {
    const scenario = ScenarioSchema.parse(sample);
    scenario.edges[0].lengthMeters = 0;
    expect(() => buildScenarioView(scenario)).toThrow(InvalidScenarioError);
  });
});
