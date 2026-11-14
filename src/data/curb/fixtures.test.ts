import { describe, expect, it } from 'vitest';
import { ScenarioSchema, ScenarioViewSchema } from '../../contracts/curb';
import { buildScenarioView, InvalidScenarioError } from '../../domain/curb';
import empty from './empty.json';
import invalidReference from './invalid-reference.json';
import sample from './sample.json';

describe('Curb fixtures', () => {
  it('publishes a synthetic sample with stable identity and counts', () => {
    const view = buildScenarioView(ScenarioSchema.parse(sample));
    expect(view.scenario).toMatchObject({
      schemaVersion: 1,
      id: 'synthetic-campus-quad',
      revision: 1,
      dataKind: 'synthetic',
    });
    expect(view.counts).toEqual({ nodes: 9, edges: 12, destinations: 3, barriers: 4, evidence: 5 });
    expect(view.scenario.evidence.every(({ origin }) => origin === 'synthetic')).toBe(true);
    expect(ScenarioViewSchema.safeParse(view).success).toBe(true);
  });

  it('preserves the sample destinations and barrier evidence links', () => {
    const { destinations, barriers } = ScenarioSchema.parse(sample);
    expect(destinations.map(({ id }) => id).sort()).toEqual([
      'library',
      'science-hall',
      'student-center',
    ]);
    expect(Object.fromEntries(barriers.map(({ id, evidenceIds }) => [id, evidenceIds]))).toEqual({
      'library-curb': ['library-curb-note'],
      'quad-obstruction': ['quad-obstruction-note', 'quad-obstruction-review'],
      'science-surface': ['science-surface-note'],
      'east-walk-unknown': ['east-walk-review'],
    });
  });

  it('keeps the empty dataset synthetic and valid with zero counts', () => {
    const view = buildScenarioView(ScenarioSchema.parse(empty));
    expect(view.scenario).toMatchObject({
      schemaVersion: 1,
      id: 'synthetic-empty-campus',
      revision: 1,
      dataKind: 'synthetic',
    });
    expect(view.counts).toEqual({ nodes: 0, edges: 0, destinations: 0, barriers: 0, evidence: 0 });
  });

  it('keeps the invalid fixture structurally valid with one dangling edge endpoint', () => {
    const scenario = ScenarioSchema.parse(invalidReference);
    expect(scenario).toMatchObject({
      schemaVersion: 1,
      id: 'synthetic-invalid-reference',
      revision: 1,
      dataKind: 'synthetic',
    });
    expect(scenario.edges).toHaveLength(1);
    const [edge] = scenario.edges;
    expect(edge).toMatchObject({ id: 'dangling-edge', toNodeId: 'missing-node' });
    expect(() => buildScenarioView(scenario)).toThrow(InvalidScenarioError);

    const repairedView = buildScenarioView({
      ...scenario,
      edges: [{ ...edge, toNodeId: edge.fromNodeId }],
    });
    expect(repairedView.counts).toEqual({ nodes: 1, edges: 1, destinations: 0, barriers: 0, evidence: 0 });
  });

  it('enforces longitude/latitude bounds and positive lengths', () => {
    const scenario = ScenarioSchema.parse(sample);
    scenario.nodes[0].coordinate = [181, 0];
    expect(ScenarioSchema.safeParse(scenario).success).toBe(false);
    scenario.nodes[0].coordinate = [0, -91];
    expect(ScenarioSchema.safeParse(scenario).success).toBe(false);
    scenario.nodes[0].coordinate = [180, -90];
    expect(ScenarioSchema.safeParse(scenario).success).toBe(true);
    scenario.edges[0].lengthMeters = 0;
    expect(ScenarioSchema.safeParse(scenario).success).toBe(false);
  });
});
