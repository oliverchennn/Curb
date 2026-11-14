import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScenarioResponseSchema } from '../../../src/contracts/curb';
import invalidReference from '../../../src/data/curb/invalid-reference.json';

const endpoint = 'http://localhost/api/curb/scenario';

async function requestScenario(dataset?: string) {
  const { GET } = await import('../../../app/api/curb/scenario/route');
  const url = new URL(endpoint);
  if (dataset !== undefined) {
    url.searchParams.set('dataset', dataset);
  }

  const response = await GET(new Request(url));
  expect(response.headers.get('cache-control')).toBe('no-store');
  return { status: response.status, body: ScenarioResponseSchema.parse(await response.json()) };
}

describe('GET /api/curb/scenario', () => {
  it.each(['unknown', '', 'invalid-reference'])('rejects the unsupported dataset "%s"', async (dataset) => {
    expect(await requestScenario(dataset)).toMatchObject({
      status: 404,
      body: { ok: false, error: { code: 'DATASET_NOT_FOUND' } },
    });
  });

  it('serves the synthetic sample with its golden counts and references', async () => {
    expect(await requestScenario('sample')).toMatchObject({
      status: 200,
      body: {
        ok: true,
        data: {
          counts: { nodes: 9, edges: 12, destinations: 3, barriers: 4, evidence: 5 },
          scenario: {
            schemaVersion: 1,
            id: 'synthetic-campus-quad',
            revision: 1,
            dataKind: 'synthetic',
            destinations: [{ id: 'library' }, { id: 'student-center' }, { id: 'science-hall' }],
            barriers: [
              { id: 'library-curb', evidenceIds: ['library-curb-note'] },
              { id: 'quad-obstruction', evidenceIds: ['quad-obstruction-note', 'quad-obstruction-review'] },
              { id: 'science-surface', evidenceIds: ['science-surface-note'] },
              { id: 'east-walk-unknown', evidenceIds: ['east-walk-review'] },
            ],
          },
        },
      },
    });
  });

  it('serves the synthetic empty dataset with zero counts', async () => {
    expect(await requestScenario('empty')).toMatchObject({
      status: 200,
      body: {
        ok: true,
        data: {
          counts: { nodes: 0, edges: 0, destinations: 0, barriers: 0, evidence: 0 },
          scenario: { schemaVersion: 1, id: 'synthetic-empty-campus', revision: 1, dataKind: 'synthetic' },
        },
      },
    });
  });

  it('defaults to the same sample before and after an empty request', async () => {
    const explicit = await requestScenario('sample');
    expect(await requestScenario()).toEqual(explicit);
    await requestScenario('empty');
    expect(await requestScenario()).toEqual(explicit);
  });

  describe('invalid server scenarios', () => {
    const invalidScenarioResponse = {
      status: 500,
      body: {
        ok: false,
        error: { code: 'INVALID_SERVER_SCENARIO', message: 'The scenario dataset is invalid.' },
      },
    };

    beforeEach(() => vi.resetModules());

    afterEach(() => {
      vi.doUnmock('../../../src/data/curb/sample.json');
      vi.doUnmock('../../../src/domain/curb');
      vi.resetModules();
    });

    it('rejects a structurally invalid fixture before calling the domain helper', async () => {
      const buildScenarioView = vi.fn();
      vi.doMock('../../../src/data/curb/sample.json', () => ({ default: { schemaVersion: 2 } }));
      vi.doMock('../../../src/domain/curb', () => ({ buildScenarioView }));

      expect(await requestScenario('sample')).toEqual(invalidScenarioResponse);
      expect(buildScenarioView).not.toHaveBeenCalled();
    });

    it('rejects a dangling fixture reference and continues to serve the other dataset', async () => {
      vi.doMock('../../../src/data/curb/sample.json', () => ({ default: invalidReference }));

      expect(await requestScenario()).toEqual(invalidScenarioResponse);
      expect(await requestScenario('empty')).toMatchObject({
        status: 200,
        body: { ok: true, data: { scenario: { id: 'synthetic-empty-campus' } } },
      });
    });

    it('rejects a domain result with inconsistent counts before responding', async () => {
      vi.doMock(import('../../../src/domain/curb'), async (importOriginal) => {
        const domain = await importOriginal();
        return {
          ...domain,
          buildScenarioView(input) {
            const view = domain.buildScenarioView(input);
            return { ...view, counts: { ...view.counts, nodes: view.counts.nodes + 1 } };
          },
        };
      });

      expect(await requestScenario('sample')).toEqual(invalidScenarioResponse);
    });
  });
});
