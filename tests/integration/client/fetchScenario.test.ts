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
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: true, data: view }));
    vi.stubGlobal('fetch', fetcher);
    const { signal } = new AbortController();

    await expect(fetchScenario(dataset, signal)).resolves.toEqual(view);
    expect(fetcher).toHaveBeenCalledWith(`/api/curb/scenario?dataset=${dataset}`, { signal });
    expect(fetcher.mock.calls[0]?.[1]?.signal).toBe(signal);
  });

  it.each([
    [404, 'DATASET_NOT_FOUND'],
    [500, 'INVALID_SERVER_SCENARIO'],
    [501, 'SCENARIO_UNAVAILABLE'],
  ] as const)('exposes the typed HTTP %i failure to callers', async (status, code) => {
    const message = 'The requested scenario could not be loaded.';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(
      { ok: false, error: { code, message } },
      { status },
    )));
    await expect(fetchScenario('sample', new AbortController().signal)).rejects.toMatchObject({
      name: 'ScenarioFetchError',
      code,
      message,
      status,
    });
  });

  it.each([
    { status: 201, ok: true },
    { status: 404, ok: true },
    { status: 200, ok: false },
    { status: 500, ok: false },
  ])('rejects HTTP $status with an incompatible ok=$ok envelope', async ({ status, ok }) => {
    const envelope = ok
      ? { ok: true, data: buildScenarioView(ScenarioSchema.parse(empty)) }
      : { ok: false, error: { code: 'DATASET_NOT_FOUND', message: 'Dataset not found.' } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(envelope, { status })));

    await expect(fetchScenario('empty', new AbortController().signal)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
      status,
    });
  });

  it('rejects a malformed envelope', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ ok: true })));

    await expect(fetchScenario('sample', new AbortController().signal)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
      status: 200,
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

  it('propagates a network rejection without retrying with sample data', async () => {
    const networkError = new TypeError('Failed to fetch');
    const fetcher = vi.fn().mockRejectedValue(networkError);
    vi.stubGlobal('fetch', fetcher);

    await expect(fetchScenario('empty', new AbortController().signal)).rejects.toBe(networkError);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('rejects an already-aborted load before fetching', async () => {
    const controller = new AbortController();
    const reason = new DOMException('Load superseded', 'AbortError');
    controller.abort(reason);
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);

    await expect(fetchScenario('sample', controller.signal)).rejects.toBe(reason);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('rejects an aborted load even if the response arrives afterward', async () => {
    const view = buildScenarioView(ScenarioSchema.parse(sample));
    const response = Response.json({ ok: true, data: view });
    const readBody = vi.spyOn(response, 'json');
    const controller = new AbortController();
    const fetcher = vi.fn(async () => {
      controller.abort();
      return response;
    });
    vi.stubGlobal('fetch', fetcher);

    await expect(fetchScenario('sample', controller.signal)).rejects.toBe(controller.signal.reason);
    expect(readBody).not.toHaveBeenCalled();
  });

  it('rejects when delayed JSON completes after the load is aborted', async () => {
    const view = buildScenarioView(ScenarioSchema.parse(sample));
    const response = Response.json({ ok: true, data: view });
    const readOriginalBody = response.json.bind(response);
    let finishBody!: () => void;
    const delayBody = new Promise<void>((resolve) => {
      finishBody = resolve;
    });
    const readBody = vi.spyOn(response, 'json').mockImplementation(async () => {
      await delayBody;
      return readOriginalBody();
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    const controller = new AbortController();

    const load = fetchScenario('sample', controller.signal);
    await vi.waitFor(() => expect(readBody).toHaveBeenCalledTimes(1));
    controller.abort();
    finishBody();

    await expect(load).rejects.toBe(controller.signal.reason);
  });
});
