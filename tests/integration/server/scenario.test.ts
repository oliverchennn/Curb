import { describe, expect, it } from 'vitest';
import { GET } from '../../../app/api/curb/scenario/route';
import { ScenarioResponseSchema } from '../../../src/contracts/curb';

const endpoint = 'http://localhost/api/curb/scenario';

describe('GET /api/curb/scenario', () => {
  it.each(['unknown', '', 'invalid-reference'])('rejects the unsupported dataset "%s"', async (dataset) => {
    const query = new URLSearchParams({ dataset });
    const response = await GET(new Request(`${endpoint}?${query}`));
    const body = ScenarioResponseSchema.parse(await response.json());
    expect(response.status).toBe(404);
    expect(body).toMatchObject({ ok: false, error: { code: 'DATASET_NOT_FOUND' } });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('uses the same behavior with no query as with sample selected', async () => {
    const unspecified = await GET(new Request(endpoint));
    const explicit = await GET(new Request(`${endpoint}?dataset=sample`));
    const body = ScenarioResponseSchema.parse(await unspecified.json());
    expect(unspecified.status).toBe(explicit.status);
    expect(body.ok).toBe(unspecified.ok);
    expect(body).toEqual(ScenarioResponseSchema.parse(await explicit.json()));
  });

  it.each(['sample', 'empty'])('serves a typed response for the %s selector', async (dataset) => {
    const response = await GET(new Request(`${endpoint}?dataset=${dataset}`));
    const body = ScenarioResponseSchema.parse(await response.json());
    expect(body.ok).toBe(response.ok);
    expect(response.headers.get('cache-control')).toBe('no-store');
    if (!body.ok) {
      expect(body.error.code).not.toBe('DATASET_NOT_FOUND');
    }
  });
});
