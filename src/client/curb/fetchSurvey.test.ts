import { afterEach, describe, expect, it, vi } from 'vitest';
import { SurveySchema } from '../../contracts/curb/survey';
import fixture from '../../data/curb/surveys/robertson-hall.json';
import { fetchSurvey } from './fetchSurvey';

afterEach(() => vi.unstubAllGlobals());

const survey = SurveySchema.parse(fixture);

function mockResponse(body: unknown, status = 200) {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(body, { status }));
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

describe('fetchSurvey', () => {
  it('loads the validated Robertson survey with a no-store request and forwards the signal', async () => {
    const fetcher = mockResponse({ data: survey });
    const { signal } = new AbortController();

    await expect(fetchSurvey(signal)).resolves.toEqual(survey);
    expect(fetcher).toHaveBeenCalledExactlyOnceWith('/api/curb/survey?id=robertson-hall', {
      signal,
      cache: 'no-store',
    });
  });

  it.each([
    [400, 'INVALID_REQUEST'],
    [404, 'SURVEY_NOT_FOUND'],
    [500, 'SURVEY_UNAVAILABLE'],
  ])('exposes a valid HTTP %i error response', async (status, code) => {
    const message = 'Could not load the survey.';
    mockResponse({ error: { code, message } }, status);

    await expect(fetchSurvey()).rejects.toMatchObject({ name: 'SurveyFetchError', code, status, message });
  });

  it.each([
    { status: 200, body: { data: { ...survey, id: 'another-site' } } },
    { status: 200, body: { data: { ...survey, workAreas: [] } } },
    { status: 200, body: { data: survey, extra: true } },
    { status: 201, body: { data: survey } },
    { status: 404, body: { data: survey } },
    { status: 200, body: { error: { code: 'SURVEY_NOT_FOUND', message: 'Missing.' } } },
    { status: 500, body: { error: { code: 'SURVEY_NOT_FOUND', message: 'Missing.' } } },
    { status: 404, body: { error: { code: 'SURVEY_NOT_FOUND', message: '' } } },
  ])('rejects malformed or mismatched envelopes with HTTP $status', async ({ status, body }) => {
    const fetcher = mockResponse(body, status);

    await expect(fetchSurvey()).rejects.toMatchObject({ code: 'INVALID_RESPONSE', status });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('rejects a non-JSON response without retrying', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('Bad Gateway', { status: 502 }));
    vi.stubGlobal('fetch', fetcher);

    await expect(fetchSurvey()).rejects.toMatchObject({ code: 'INVALID_RESPONSE', status: 502 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('propagates fetch failures without retrying', async () => {
    const error = new TypeError('Failed to fetch');
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(error);
    vi.stubGlobal('fetch', fetcher);

    await expect(fetchSurvey()).rejects.toBe(error);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('rejects a pre-aborted signal before making a request', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetcher = mockResponse({ data: survey });

    await expect(fetchSurvey(controller.signal)).rejects.toBe(controller.signal.reason);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('does not read a response received after cancellation', async () => {
    const controller = new AbortController();
    const response = Response.json({ data: survey });
    const readBody = vi.spyOn(response, 'json');
    vi.stubGlobal('fetch', vi.fn(async () => {
      controller.abort();
      return response;
    }));

    await expect(fetchSurvey(controller.signal)).rejects.toBe(controller.signal.reason);
    expect(readBody).not.toHaveBeenCalled();
  });

  it('rejects a response body that arrives after cancellation', async () => {
    const controller = new AbortController();
    const reason = new DOMException('Load superseded', 'AbortError');
    const response = Response.json({ data: survey });
    vi.spyOn(response, 'json').mockImplementation(async () => {
      controller.abort(reason);
      return { data: survey };
    });
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(response));

    await expect(fetchSurvey(controller.signal)).rejects.toBe(reason);
  });
});
