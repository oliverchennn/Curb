import { readFile, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import {
  ExportRequestSchema,
  SurveyResponseSchema,
  type Survey,
} from '../../contracts/curb/survey';
import { buildRepairPlans, validateSurvey } from '../../domain/curb/survey';
import { renderSurveyHtmlReport } from './surveyHtmlReport';
import { renderSurveyReport } from './surveyReport';

const surveyId = 'robertson-hall';
const maxReportBytes = 2 * 1024 * 1024;
const headers = { 'cache-control': 'no-store' };
const utf8 = new TextDecoder('utf-8', { fatal: true });

const failure = {
  400: { code: 'INVALID_REQUEST', message: 'The survey request is invalid.' },
  404: { code: 'SURVEY_NOT_FOUND', message: 'This survey is not available.' },
  413: { code: 'BODY_TOO_LARGE', message: 'The report request exceeds 2 MB.' },
  500: { code: 'SURVEY_UNAVAILABLE', message: 'The saved survey or its report evidence could not be loaded.' },
} as const;

function fail(status: keyof typeof failure, message: string = failure[status].message): Response {
  return Response.json({ error: { code: failure[status].code, message } }, { status, headers });
}

async function loadSurvey(): Promise<Survey> {
  const bytes = await readFile(join(process.cwd(), 'src', 'data', 'curb', 'surveys', 'robertson-hall.json'));
  return validateSurvey(JSON.parse(utf8.decode(bytes)));
}

export async function getSurveyResponse(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const ids = params.getAll('id');
  const id = ids[0] ?? surveyId;
  if (ids.length > 1 || [...params.keys()].some(key => key !== 'id') || !/^[a-z][a-z0-9-]{0,79}$/.test(id)) {
    return fail(400);
  }
  if (id !== surveyId) return fail(404);

  try {
    const body = SurveyResponseSchema.parse({ data: await loadSurvey() });
    return Response.json(body, { headers });
  } catch {
    return fail(500);
  }
}

/** The published survey is authoritative for evidence, quantities, rates and sources. */
function isReviewOf(edited: Survey, saved: Survey): boolean {
  const findingsById = new Map(saved.findings.map(finding => [finding.id, finding]));
  const areasById = new Map(saved.workAreas.map(area => [area.id, area]));
  const findings = edited.findings.map(finding => {
    const original = findingsById.get(finding.id);
    if (!original) return finding;

    const { label, kind, description, review } = finding;
    const reviewChanged = !isDeepStrictEqual(review, original.review);
    const textChanged = label !== original.label || kind !== original.kind || description !== original.description;
    if ((reviewChanged || textChanged) && review.method !== 'manual') return finding;

    return {
      ...finding,
      label: original.label,
      kind: original.kind,
      description: original.description,
      review: original.review,
    };
  });
  const workAreas = edited.workAreas.map(area => ({
    ...area,
    priority: areasById.get(area.id)?.priority ?? area.priority,
    rationale: areasById.get(area.id)?.rationale ?? area.rationale,
  }));

  return isDeepStrictEqual({ ...edited, findings, workAreas }, saved);
}

async function readReportBody(request: Request): Promise<{ body: unknown } | { response: Response }> {
  const length = request.headers.get('content-length');
  if (length !== null) {
    if (!/^\d+$/.test(length)) return { response: fail(400) };
    if (Number(length) > maxReportBytes) return { response: fail(413) };
  }
  const contentType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'application/json' || !request.body) return { response: fail(400) };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxReportBytes) {
        // Do not wait on a producer that takes time to acknowledge cancellation.
        void reader.cancel().catch(() => {});
        return { response: fail(413) };
      }
      chunks.push(value);
    }
    return { body: JSON.parse(utf8.decode(Buffer.concat(chunks, total))) };
  } catch {
    return { response: fail(400) };
  } finally {
    reader.releaseLock();
  }
}

async function loadCloseups(saved: Survey): Promise<ReadonlyMap<string, Uint8Array>> {
  const root = await realpath(process.cwd());
  const media = join(root, 'public', 'curb', 'surveys', surveyId);
  const assets = await Promise.all(saved.findings.map(async ({ id, closeupSrc }) => {
    const match = /^\/curb\/surveys\/robertson-hall\/((?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:jpg|png))$/.exec(closeupSrc);
    if (!match) throw new Error('Invalid saved close-up path');
    const expectedPath = join(media, ...match[1].split('/'));
    const actualPath = await realpath(expectedPath);
    if (actualPath !== expectedPath) throw new Error('Close-up does not resolve to its registered file');
    return [id, await readFile(actualPath)] as const;
  }));
  return new Map(assets);
}

export async function postSurveyReportResponse(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const formats = params.getAll('format');
  const format = formats[0] ?? 'pdf';
  if (formats.length > 1 || [...params.keys()].some(key => key !== 'format') || (format !== 'html' && format !== 'pdf')) {
    return fail(400, 'Choose one report format: PDF or HTML.');
  }

  const input = await readReportBody(request);
  if ('response' in input) return input.response;

  const parsed = ExportRequestSchema.safeParse(input.body);
  if (!parsed.success) return fail(400);
  const { survey, budgetCents, planId } = parsed.data;
  if (planId === 'budget' && budgetCents === null) return fail(400, 'Choose a budget to export the budget plan.');

  try {
    const saved = await loadSurvey();
    if (!isReviewOf(survey, saved)) {
      return fail(400, 'The submitted review does not match the published survey and allowed review fields.');
    }
    const plans = buildRepairPlans(survey, budgetCents ?? undefined);
    const closeups = await loadCloseups(saved);
    if (format === 'html') {
      return new Response(renderSurveyHtmlReport(survey, plans, planId, closeups), {
        headers: {
          ...headers,
          'content-type': 'text/html; charset=utf-8',
          'content-disposition': 'attachment; filename="robertson-hall-repair-report.html"',
          'content-security-policy': "default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'",
          'x-content-type-options': 'nosniff',
        },
      });
    }
    const pdf = await renderSurveyReport(survey, plans, planId, closeups);
    return new Response(new Uint8Array(pdf), {
      headers: {
        ...headers,
        'content-type': 'application/pdf',
        'content-disposition': 'attachment; filename="robertson-hall-repair-report.pdf"',
      },
    });
  } catch {
    return fail(500);
  }
}
