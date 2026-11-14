import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../../../app/api/health/route';

afterEach(() => vi.unstubAllEnvs());

describe('deployment identity in GET /api/health', () => {
  it.each([
    ['git-revision', 'archive-revision', '1', 'git-revision'],
    ['', 'archive-revision', '1', 'archive-revision'],
    ['   ', ' archive-revision ', '1', 'archive-revision'],
    [undefined, 'archive-revision', '1', 'archive-revision'],
    ['', '', '1', 'unknown'],
    [undefined, undefined, '1', 'unknown'],
    [undefined, undefined, undefined, 'local'],
  ])('reports a meaningful revision for Git=%j, archive=%j, hosted=%j', async (git, archive, hosted, expected) => {
    vi.stubEnv('VERCEL_GIT_COMMIT_SHA', git);
    vi.stubEnv('APP_REVISION', archive);
    vi.stubEnv('VERCEL', hosted);
    const response = GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ status: 'alive', service: 'web', revision: expected });
  });
});
