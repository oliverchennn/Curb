import { afterEach, describe, expect, it, vi } from 'vitest';
import { ScenarioSchema } from '../../../src/contracts/curb';
import empty from '../../../src/data/curb/empty.json';
import sample from '../../../src/data/curb/sample.json';
import { buildScenarioView } from '../../../src/domain/curb';
import { fetchScenario } from '../../../src/client/curb/fetchScenario';

afterEach(() => vi.unstubAllGlobals());

describe('fetchScenario', () => {
  it.each([
    ['sample', sample],
    ['empty', empty],
  ] as const)('loads the %s dataset and forwards AbortSignal', async (dataset, fixture) => {
    const view = buildScenarioView(ScenarioSchema.parse(fixture));
    const fetcher = vi.fn().mockResolvedValue(Response.json({ ok: true, data: view }));
    vi.stubGlobal('fetch', fetcher);
    const { signal } = new AbortController();

    await expect(fetchScenario(dataset, signal)).resolves.toEqual(view);
    expect(fetcher).toHaveBeenCalledWith(`/api/curb/scenario?dataset=${dataset}`, { signal });
  });

  it('exposes the typed API failure to callers', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(
      { ok: false, error: { code: 'INVALID_SERVER_SCENARIO', message: 'Scenario data is invalid.' } },
      { status: 500 },
    )));
    await expect(fetchScenario('sample', new AbortController().signal)).rejects.toMatchObject({
      name: 'ScenarioFetchError',
      code: 'INVALID_SERVER_SCENARIO',
      status: 500,
    });
  });

  it('rejects a success envelope with invalid counts without a fallback', async () => {
    const view = buildScenarioView(ScenarioSchema.parse(empty));
    view.counts.barriers = 1;
    const fetcher = vi.fn().mockResolvedValue(Response.json({ ok: true, data: view }));
    vi.stubGlobal('fetch', fetcher);
    await expect(fetchScenario('empty', new AbortController().signal)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('rejects a non-JSON HTTP error without a fallback', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Service unavailable', { status: 503 })));
    await expect(fetchScenario('sample', new AbortController().signal)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
      status: 503,
    });
  });

  it('rejects an aborted load even if the response arrives afterward', async () => {
    const view = buildScenarioView(ScenarioSchema.parse(sample));
    const controller = new AbortController();
    const fetcher = vi.fn(async () => {
      controller.abort();
      return Response.json({ ok: true, data: view });
    });
    vi.stubGlobal('fetch', fetcher);
    await expect(fetchScenario('sample', controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});
