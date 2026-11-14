import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../../../app/api/curb/survey/route';
import { POST } from '../../../app/api/curb/survey/report/route';
import canonical from '../../../src/data/curb/surveys/robertson-hall.json';
import { SurveyResponseSchema, SurveySchema } from '../../../src/contracts/curb/survey';
import { setAreaPriority } from '../../../src/features/curb/survey/presentation';

vi.mock('node:fs/promises', async (original) => {
  const fs = await original<typeof import('node:fs/promises')>();
  return { ...fs, readFile: vi.fn(fs.readFile) };
});

const endpoint = 'http://localhost/api/curb/survey';
const survey = SurveySchema.parse(canonical);
const payload = { survey, budgetCents: 50_000, planId: 'budget' };

function report(input: unknown, query = '') {
  return POST(new Request(`${endpoint}/report${query}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  }));
}

async function expectError(response: Response, status: number, code: string) {
  expect(response.status).toBe(status);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(await response.json()).toEqual({ error: { code, message: expect.any(String) } });
}

afterEach(() => vi.mocked(readFile).mockClear());

describe('Robertson survey GET', () => {
  it.each(['', '?id=robertson-hall'])('serves the canonical survey (%s)', async (query) => {
    const response = await GET(new Request(endpoint + query));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(SurveyResponseSchema.parse(await response.json()).data).toEqual(survey);
  });

  it.each(['?id=', '?id=wrong%20format', '?id=robertson-hall&id=robertson-hall', '?view=edit'])(
    'rejects invalid selectors (%s)',
    async (query) => expectError(await GET(new Request(endpoint + query)), 400, 'INVALID_REQUEST'),
  );

  it('reports an unregistered site', async () => {
    await expectError(await GET(new Request(`${endpoint}?id=another-site`)), 404, 'SURVEY_NOT_FOUND');
  });

  it('fails when the published snapshot is missing or corrupt', async () => {
    vi.mocked(readFile).mockRejectedValueOnce(new Error('ENOENT'));
    await expectError(await GET(new Request(endpoint)), 500, 'SURVEY_UNAVAILABLE');
    vi.mocked(readFile).mockResolvedValueOnce(Buffer.from('{}'));
    await expectError(await GET(new Request(endpoint)), 500, 'SURVEY_UNAVAILABLE');
  });
});

describe('Robertson report POST', () => {
  it.each(['?format=html', '?format=pdf'])('requires a named priority rationale at the API boundary (%s)', async query => {
    for (const rationale of [survey.workAreas[0].rationale, 'Unattributed change', 'Priority reviewed by : Recheck access.', 'Priority reviewed by Facilities: ']) {
      const edited = structuredClone(survey);
      edited.workAreas[0].priority = 'low';
      edited.workAreas[0].rationale = rationale;
      await expectError(await report({ ...payload, survey: edited }, query), 400, 'INVALID_REQUEST');
    }
    const edited = setAreaPriority(survey, 'panel-01', 'low', '王小明', 'Confirm wheel contact and measure the opening.');
    expect(edited.ok).toBe(true);
    if (!edited.ok) throw new Error(edited.message);
    expect((await report({ ...payload, survey: edited.survey }, query)).status).toBe(200);
  });

  it.each(['?format=', '?format=csv', '?format=html&format=html', '?format=pdf&format=html', '?extra=pdf', '?format=html&extra=1'])(
    'rejects an invalid report selector (%s) before reading saved data',
    async (query) => {
      await expectError(await report(payload, query), 400, 'INVALID_REQUEST');
      expect(vi.mocked(readFile)).not.toHaveBeenCalled();
    },
  );

  it('serves an explicit PDF with the existing attachment headers', async () => {
    const response = await report(payload, '?format=pdf');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(response.headers.get('content-disposition')).toMatch(/\.pdf"$/);
  });

  it('renders an offline HTML attachment from approved and reviewed survey data', async () => {
    const edited = structuredClone(survey);
    edited.findings[0].label = '裂缝检查 <em>A & B</em>';
    edited.findings[0].review = {
      status: 'accepted', method: 'manual', reviewer: '王小明', note: 'Keep "A & B" as text.',
    };
    edited.findings[1].review = {
      status: 'rejected', method: 'manual', reviewer: 'Facilities', note: 'Recheck on site.',
    };
    edited.workAreas[0].priority = 'low';
    edited.workAreas[0].rationale = 'Priority reviewed by 王小明: verify access.';
    const response = await report({ ...payload, survey: edited }, '?format=html');
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(response.headers.get('content-disposition')).toMatch(/^attachment; filename="robertson-hall-repair-report\.html"$/);
    expect(response.headers.get('content-security-policy')).toContain("default-src 'none'");
    const text = await response.text();
    expect(text).toContain('裂缝检查 &lt;em&gt;A &amp; B&lt;/em&gt;');
    expect(text).toContain('王小明');
    expect(text).not.toContain('<em>A & B</em>');
    expect(text.match(/<img\b/g)).toHaveLength(5);
    expect(text.match(/src="data:image\/jpeg;base64,/g)).toHaveLength(5);
    expect(text.match(/<figcaption\b/g)).toHaveLength(5);
    expect(text).toContain('Provisional finding priority');
    expect(text).toContain('Work-area planning priority');
    expect(text).toContain('panel-01');
    expect(text).toContain('defect-02');
    expect(text).not.toMatch(/<script\b|src="https?:/i);
  });

  it('uses the same body limit and saved-evidence validation for HTML', async () => {
    const differentAsset = structuredClone(survey);
    differentAsset.findings[0].closeupSrc = survey.findings[1].closeupSrc;
    await expectError(await report({ ...payload, survey: differentAsset }, '?format=html'), 400, 'INVALID_REQUEST');
    const oversized = new Request(`${endpoint}/report?format=html`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': '2097153' },
      body: '{}',
    });
    await expectError(await POST(oversized), 413, 'BODY_TOO_LARGE');
  });

  it('generates an attachment from accepted and rejected manual edits', async () => {
    const edited = structuredClone(survey);
    edited.findings[0].label = 'Reviewed crack';
    edited.findings[0].review = { status: 'accepted', method: 'manual', reviewer: 'Facilities', note: 'Checked video.' };
    edited.findings[1].review = { status: 'rejected', method: 'manual', reviewer: 'Facilities', note: 'Recheck on site.' };
    edited.workAreas[0].priority = 'low';
    edited.workAreas[0].rationale = 'Priority reviewed by Facilities: Confirm the impact in the field.';

    const response = await report({ ...payload, survey: edited });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('content-disposition')).toMatch(/^attachment; filename="robertson-hall-repair-report.pdf"$/);
    const document = await PDFDocument.load(await response.arrayBuffer());
    expect(document.getPageCount()).toBeGreaterThan(0);
  });

  it('rejects extra client totals and absent budget for the budget plan', async () => {
    await expectError(await report({ ...payload, totals: { highCents: 0 } }), 400, 'INVALID_REQUEST');
    await expectError(await report({ ...payload, budgetCents: null }), 400, 'INVALID_REQUEST');
  });

  it('rejects reassigned evidence and changes to saved cost assumptions', async () => {
    const differentAsset = structuredClone(survey);
    differentAsset.findings[0].closeupSrc = survey.findings[1].closeupSrc;
    await expectError(await report({ ...payload, survey: differentAsset }), 400, 'INVALID_REQUEST');
    expect(vi.mocked(readFile)).toHaveBeenCalledTimes(1);

    const differentCost = structuredClone(survey);
    const treatment = differentCost.treatments.find(item => item.cost.status === 'estimated');
    if (!treatment || treatment.cost.status !== 'estimated') throw new Error('Expected an estimated treatment');
    treatment.cost.rateLowCents = 0;
    await expectError(await report({ ...payload, survey: differentCost }), 400, 'INVALID_REQUEST');
  });

  it('rejects a changed label before manual review', async () => {
    const draft = structuredClone(survey);
    draft.findings[0].label = 'Unchecked edit';
    await expectError(await report({ ...payload, survey: draft }), 400, 'INVALID_REQUEST');
  });

  it('returns 400 for malformed JSON and the wrong content type', async () => {
    for (const type of ['application/json', 'text/plain']) {
      const response = await POST(new Request(`${endpoint}/report`, {
        method: 'POST',
        headers: { 'content-type': type },
        body: '{',
      }));
      await expectError(response, 400, 'INVALID_REQUEST');
    }
  });

  it('returns 413 for declared or streamed requests beyond 2 MiB', async () => {
    const options = { method: 'POST', headers: { 'content-type': 'application/json' } };
    const declared = new Request(`${endpoint}/report`, {
      ...options,
      headers: { ...options.headers, 'content-length': '2097153' },
      body: '{}',
    });
    await expectError(await POST(declared), 413, 'BODY_TOO_LARGE');

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(2 * 1024 * 1024));
        controller.enqueue(new Uint8Array([1]));
      },
    });
    const requestInit = { ...options, body: stream, duplex: 'half' };
    await expectError(await POST(new Request(`${endpoint}/report`, requestInit)), 413, 'BODY_TOO_LARGE');
  });

  it('returns 500 if a registered close-up cannot be loaded', async () => {
    vi.mocked(readFile).mockResolvedValueOnce(Buffer.from(JSON.stringify(survey)));
    vi.mocked(readFile).mockRejectedValueOnce(new Error('Missing close-up'));
    await expectError(await report(payload), 500, 'SURVEY_UNAVAILABLE');
  });
});
