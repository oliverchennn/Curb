import { afterEach, describe, expect, it, vi } from 'vitest';
import { CanadaReadinessError, fetchCanadaReadiness } from '../../../src/client/curb/fetchCanadaReadiness';
import {
  CANADA_READINESS_API,
  CanadaReadinessSchema,
} from '../../../src/contracts/curb/canada-readiness';
import review from '../../../research/curb/canada-2020/data-review.json';
import feasibility from '../../../research/curb/canada-2020/feasibility.json';
import projects from '../../../research/curb/canada-2020/projects.json';
import snapshot from '../../../src/data/curb/cases/canada-college-readiness.json';

afterEach(() => {
  vi.doUnmock('../../../src/data/curb/cases/canada-college-readiness.json');
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('reviewed Cañada inventory snapshot', () => {
  it('keeps all four disabled inventory estimates and exact provenance from the reviewed inputs', () => {
    const parsed = CanadaReadinessSchema.parse(snapshot);
    expect(parsed).toMatchObject({ caseId: review.caseId, disposition: review.disposition, comparisonAllowed: false });
    expect(parsed.source).toMatchObject({ sha256: review.sourceSha256, bytes: review.sourceBytes, viewerPages: review.sourceViewerPages });
    expect(parsed.review).toMatchObject({
      candidateSha: review.candidateSha,
      reviewSha: '65effc19e03c5f3bd98cbb3e781fcd9ec07c98ab',
      inputHashes: review.inputHashes,
      status: 'accepted',
      completedRequirementId: review.resolvedMissingDataIds[0],
      inventoryRecordCount: review.verifiedCounts.observations,
    });
    expect(parsed.requirements.map(({ id }) => id)).toEqual(review.openMissingDataIds);
    expect(feasibility.missingData.map(({ id }) => id)).toContain('M11');
    expect(parsed.requirements.some(({ id }) => String(id) === 'M11')).toBe(false);

    expect(parsed.records.map(({ id, estimateCents, projectEligible }) => ({ id, estimateCents, projectEligible })))
      .toEqual(projects.projects.map(({ observationIds, costCents, eligible }) => ({
        id: observationIds[0], estimateCents: costCents, projectEligible: eligible,
      })));
    expect(parsed.records.reduce((sum, record) => sum + record.estimateCents, 0)).toBe(review.rampEstimateTotalsCents.lot1Total);
    expect(parsed.records.find(({ id }) => id === 'ramp-421')).toMatchObject({
      estimateCents: 700_000,
      measurement: { label: 'Right running slope', raw: '9.8', unit: '%' },
      locator: { viewerPage: 2827, printedPage: 2826 },
    });
  });

  it('rejects duplicated inventory IDs and out-of-range printed pages', () => {
    expect(CanadaReadinessSchema.safeParse({
      ...snapshot, records: [snapshot.records[0], ...snapshot.records.slice(0, 3)],
    }).success).toBe(false);
    const invalid = { ...snapshot.records[0], locator: { viewerPage: 9999, printedPage: 9998 } };
    expect(CanadaReadinessSchema.safeParse({ ...snapshot, records: [invalid, ...snapshot.records.slice(1)] }).success).toBe(false);
  });
});

describe('GET /api/curb/cases/canada-college', () => {
  it('round-trips the validated inventory through the real GET handler and typed client', async () => {
    const { GET } = await import('../../../app/api/curb/cases/canada-college/route');
    const spy = vi.fn<typeof fetch>().mockImplementation(async () => {
      const response = GET();
      expect(response.headers.get('cache-control')).toBe('no-store');
      return response;
    });
    vi.stubGlobal('fetch', spy);
    const { signal } = new AbortController();
    await expect(fetchCanadaReadiness(signal)).resolves.toEqual(snapshot);
    expect(spy).toHaveBeenCalledExactlyOnceWith(CANADA_READINESS_API, { signal, cache: 'no-store' });
  });

  it('returns typed 500 rather than showing invalid data as an inventory', async () => {
    vi.doMock('../../../src/data/curb/cases/canada-college-readiness.json', () => ({
      default: { ...snapshot, comparisonAllowed: true },
    }));
    const { GET } = await import('../../../app/api/curb/cases/canada-college/route');
    const response = GET();
    expect(response.status).toBe(500);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ ok: false, error: 'INVALID_SNAPSHOT' });
    vi.stubGlobal('fetch', vi.fn().mockImplementation(GET));
    await expect(fetchCanadaReadiness(new AbortController().signal)).rejects.toMatchObject({ code: 'invalid_snapshot', status: 500 });
  });
});

describe('Cañada readiness transport', () => {
  it.each([
    { caseId: 'another-case' },
    { revision: 2 },
    { dataKind: 'synthetic' },
    { disposition: 'comparison_ready' },
    { graph: {} },
  ])('rejects a mismatched or expanded snapshot %o', async (patch) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ ok: true, data: { ...snapshot, ...patch } })));
    await expect(fetchCanadaReadiness(new AbortController().signal)).rejects.toMatchObject({ code: 'invalid_response', status: 200 });
  });

  it.each([
    () => new Response('<html>not data</html>'),
    () => Response.json({ ok: true, data: snapshot }, { status: 500 }),
    () => Response.json({ ok: false, error: 'INVALID_SNAPSHOT' }, { status: 200 }),
  ])('rejects malformed JSON and inconsistent HTTP status', async (response) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response()));
    await expect(fetchCanadaReadiness(new AbortController().signal)).rejects.toMatchObject({ code: 'invalid_response' });
  });

  it('distinguishes a missing case and a network failure', async () => {
    const mock = vi.fn().mockResolvedValueOnce(new Response('not found', { status: 404 }));
    const error = new TypeError('network failure');
    mock.mockRejectedValueOnce(error);
    vi.stubGlobal('fetch', mock);
    const { signal } = new AbortController();
    await expect(fetchCanadaReadiness(signal)).rejects.toMatchObject({ code: 'unavailable', status: 404 });
    await expect(fetchCanadaReadiness(signal)).rejects.toBe(error);
  });

  it('aborts early and ignores a response body once the request has been aborted', async () => {
    const mock = vi.fn();
    vi.stubGlobal('fetch', mock);
    const controller = new AbortController();
    controller.abort();
    await expect(fetchCanadaReadiness(controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(mock).not.toHaveBeenCalled();

    const inflight = new AbortController();
    mock.mockResolvedValue({
      status: 200,
      json: async () => {
        inflight.abort();
        return { ok: true, data: snapshot };
      },
    });
    await expect(fetchCanadaReadiness(inflight.signal)).rejects.not.toBeInstanceOf(CanadaReadinessError);
    expect(inflight.signal.aborted).toBe(true);
  });
});
