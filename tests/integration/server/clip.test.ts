import { describe, expect, it } from 'vitest';
import { GET } from '../../../app/api/curb/survey/clip/route';
import canonical from '../../../src/data/curb/surveys/robertson-hall.json';
import { ClipCheckSchema } from '../../../src/server/curb/clip';

describe('GET /api/curb/survey/clip', () => {
  it('serves a validated CLIP check for every finding', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const { data } = await response.json() as { data: unknown };
    const clip = ClipCheckSchema.parse(data);
    expect(clip.model).toMatch(/CLIP/);
    expect(clip.findings.map((f) => f.id).sort()).toEqual(canonical.findings.map((f) => f.id).sort());
  });
});
