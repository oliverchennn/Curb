import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { decodePDFRawStream, PDFArray, PDFDocument, PDFName, PDFRawStream } from 'pdf-lib';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { GET } from '../../../app/api/curb/survey/route';
import { POST } from '../../../app/api/curb/survey/report/route';
import { SurveyResponseSchema, SurveySchema, type PlanId, type Survey } from '../../../src/contracts/curb/survey';
import { surveyToCsv } from '../../../src/domain/curb/surveyExports';
import { surveyJson } from '../../../src/features/curb/survey/presentation';

vi.mock('node:fs/promises', async (original) => {
  const fs = await original<typeof import('node:fs/promises')>();
  return { ...fs, readFile: vi.fn(fs.readFile) };
});

const endpoint = 'http://localhost/api/curb/survey';
const policyIds = ['essential', 'balanced', 'durable'] as const;
const expectedFindingIds = ['defect-01', 'defect-02', 'defect-03', 'defect-04', 'defect-05'];
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const publishedFile = join('src', 'data', 'curb', 'surveys', 'robertson-hall.json');
const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const priorities = ['high', 'medium', 'low', 'unassessed'] as const;

let canonical: Survey;

async function getCanonical(): Promise<Survey> {
  const response = await GET(new Request(endpoint + '?id=robertson-hall'));
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  return SurveyResponseSchema.parse(await response.json()).data;
}

beforeAll(async () => { canonical = await getCanonical(); });
afterEach(() => {
  vi.mocked(readFile).mockClear();
  vi.unstubAllGlobals();
});

function request(body: BodyInit | null, query = '?format=html', headers: HeadersInit = {}): Request {
  return new Request(endpoint + '/report' + query, {
    method: 'POST',
    body,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

function report(survey: Survey, budgetCents: number | null, planId: PlanId, query?: string) {
  return POST(request(JSON.stringify({ survey, budgetCents, planId }), query));
}

function editRejections(survey: Survey, mask: number): Survey {
  const edited = structuredClone(survey);
  for (const [index, finding] of edited.findings.entries()) {
    if (mask & (1 << index)) {
      finding.review = { status: 'rejected', method: 'manual', reviewer: 'Facilities', note: 'Review in the field.' };
    }
  }
  return edited;
}

const ledger = {
  'panel-01-seal': [7200, 47800],
  'panel-01-replace': [11250, 89200],
  'panel-02-seal': [7200, 47800],
  'panel-02-replace': [11250, 89200],
  'panel-03-seal': [7200, 47800],
  'panel-03-replace': [11250, 89200],
  'panel-04-replace': [15000, 133800],
  'panel-05-seal': [7200, 47800],
  'panel-05-replace': [11250, 89200],
} as const;

const policyTreatments = {
  essential: ['panel-01-seal', 'panel-02-seal', 'panel-04-replace'],
  balanced: ['panel-01-seal', 'panel-02-patch', 'panel-03-seal', 'panel-04-patch', 'panel-05-seal'],
  durable: ['panel-01-replace', 'panel-02-replace', 'panel-03-replace', 'panel-04-replace', 'panel-05-replace'],
} as const;

function areaId(optionId: string) {
  return optionId.slice(0, optionId.lastIndexOf('-'));
}

function eligibleAreas(survey: Survey) {
  const liveFindings = new Set(survey.findings.filter(finding => finding.review.status !== 'rejected').map(finding => finding.id));
  return survey.workAreas.filter(area => area.findingIds.some(id => liveFindings.has(id)));
}

function sumOptions(optionIds: string[]) {
  const quoted = optionIds.flatMap(id => id.endsWith('-patch') ? [id] : []);
  const priced = optionIds.flatMap(id => id in ledger ? [ledger[id as keyof typeof ledger]] : []);
  return {
    low: priced.reduce((sum, [low]) => sum + low, 0),
    high: priced.reduce((sum, [, high]) => sum + high, 0),
    quotes: optionIds.length ? [...quoted, 'site-setup'] : [],
  };
}

/**
 * The checked-in ordinary panels have identical seal prices and upgrade deltas.
 * For each of the two choices for panel 04, cover as many ordinary panels as
 * possible in priority order, then upgrade as many as the remaining budget permits.
 */
function expectedBudgetSelection(areas: Survey['workAreas'], budget: number): string[] {
  const ordinary = areas.filter(area => area.id !== 'panel-04').sort((a, b) =>
    priorities.indexOf(a.priority) - priorities.indexOf(b.priority) || a.id.localeCompare(b.id));
  const includeSpecial = areas.some(area => area.id === 'panel-04') && budget >= 133800;
  const candidates = (includeSpecial ? [0, 133800] : [0]).map(specialCost => {
    const remaining = budget - specialCost;
    const selected = ordinary.slice(0, Math.floor(remaining / 47800)).map(area => area.id).sort();
    const upgrades = Math.min(selected.length, Math.floor((remaining - selected.length * 47800) / 41400));
    const optionIds = selected.map((id, index) => id + (index < upgrades ? '-replace' : '-seal'));
    if (specialCost) {
      selected.push('panel-04');
      optionIds.push('panel-04-replace');
    }
    const score = priorities.map(priority =>
      areas.filter(area => area.priority === priority && selected.includes(area.id)).length);
    score.push(
      selected.length + 2 * (upgrades + Number(Boolean(specialCost))),
      -(specialCost + selected.filter(id => id !== 'panel-04').length * 47800 + upgrades * 41400),
    );
    return { optionIds: optionIds.sort(), score };
  });
  candidates.sort((a, b) => {
    const difference = b.score.map((value, index) => value - a.score[index]).find(value => value !== 0);
    return difference ?? a.optionIds.join('|').localeCompare(b.optionIds.join('|'));
  });
  return candidates[0].optionIds;
}

async function html(response: Response): Promise<string> {
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
  expect(response.headers.get('cache-control')).toBe('no-store');
  return response.text();
}

function readPlan(document: string, id: PlanId) {
  const article = document.match(new RegExp('<article[^>]+id="plan-' + id + '">([\\s\\S]*?)</article>'))?.[1];
  if (!article) throw new Error('Missing rendered plan ' + id);
  const parts = article.split(/<h4>.*?<\/h4>/);
  const links = (part: string, prefix: string) =>
    Array.from(part.matchAll(new RegExp('href="#' + prefix + '-([a-z0-9-]+)"', 'g')), match => match[1]);
  return {
    article,
    selected: links(parts[1], 'area'),
    options: links(parts[2], 'treatment'),
    deferred: links(parts[3], 'area'),
    quotes: Array.from(parts[4].matchAll(/\((panel-[a-z0-9-]+|site-setup)\):/g), match => match[1]),
  };
}

function expectPlan(
  document: string,
  planId: PlanId,
  eligible: Survey['workAreas'],
  options: string[],
  costs = sumOptions(options),
) {
  const plan = readPlan(document, planId);
  const selected = options.map(areaId).sort();
  expect(plan.selected).toEqual(selected);
  expect(plan.options).toEqual(options);
  expect(plan.deferred).toEqual(eligible.map(area => area.id).filter(id => !selected.includes(id)));
  expect(plan.quotes.sort()).toEqual([...costs.quotes].sort());
  const coverage = priorities.map(priority => eligible.filter(area => area.priority === priority && selected.includes(area.id)).length);
  expect(plan.article).toContain(coverage.map((count, index) => count + ' ' + priorities[index]).join(', '));
  if (options.length === 0) {
    expect(plan.article).toContain('No work selected. No costs assigned.');
  } else if (costs.low === 0 && costs.high === 0 && costs.quotes.length > 0) {
    expect(plan.article).toContain('Quote required for all selected cost items.');
  } else {
    const low = money.format(costs.low / 100);
    const high = money.format(costs.high / 100);
    expect(plan.article).toContain(costs.low === costs.high ? low : low + ' to ' + high);
    expect(plan.article).toContain(costs.quotes.length ? 'Partial estimate' : 'Complete estimate');
  }
  return plan.article;
}

function checkBudget(document: string, eligible: Survey['workAreas'], budget: number) {
  const expected = expectedBudgetSelection(eligible, budget);
  const article = expectPlan(document, 'budget', eligible, expected);
  expect(article).toContain(money.format(budget / 100));
  expect(article).toContain(expected.length ? 'Budget fit remains partial' : 'estimated upper total fits');
  expect(article).toContain('Selected plan for this report');
}

function findingArticles(document: string) {
  return Array.from(document.matchAll(/<article class="card" id="finding-([a-z0-9-]+)">([\s\S]*?)<\/article>/g), match => ({
    id: match[1],
    content: match[2],
  }));
}

async function expectFailure(response: Response, status = 400, code = 'INVALID_REQUEST') {
  expect(response.status).toBe(status);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(response.headers.get('content-disposition')).toBeNull();
  expect(await response.json()).toStrictEqual({ error: { code, message: expect.any(String) } });
}

describe('Robertson reports recompute the submitted review', () => {
  it.each(Array.from({ length: 32 }, (_, mask) => [mask.toString(2).padStart(5, '0'), mask] as const))(
    'matches the independent policies and budgets for rejection mask %s',
    async (_, mask) => {
      const edited = editRejections(canonical, mask);
      const eligible = eligibleAreas(edited);
      for (const budget of [0, 47800, 229400]) {
        const document = await html(await report(edited, budget, 'budget'));
        for (const planId of policyIds) {
          const expected = policyTreatments[planId].filter(id => eligible.some(area => area.id === areaId(id)));
          expectPlan(document, planId, eligible, expected);
        }
        checkBudget(document, eligible, budget);
        const findings = findingArticles(document);
        expect(findings.map(finding => finding.id)).toEqual(expectedFindingIds);
        expect(findings.filter(finding => finding.content.includes('<dt>Review status</dt><dd>rejected</dd>')).map(finding => finding.id))
          .toEqual(expectedFindingIds.filter((_, index) => mask & (1 << index)));
        expect(document).toContain('Route impact unknown.');
        expect(document).toContain('Overall ADA compliance remains undetermined.');
      }
    },
  );

  it.each([47799, 47800, 95599, 95600, 133799, 133800, 229399, 229400, 490599, 490600])(
    'changes budget selections only as eligible cents allow at %i',
    async budget => checkBudget(await html(await report(canonical, budget, 'budget')), canonical.workAreas, budget),
  );

  it('keeps grouped evidence active, defers an inspection-only area, and charges a priced shared item once', async () => {
    const published = structuredClone(canonical);
    published.workAreas[0].findingIds.push('defect-03');
    published.workAreas = published.workAreas.filter(area => area.id !== 'panel-03');
    published.treatments = published.treatments
      .filter(item => item.workAreaId !== 'panel-03' && item.id !== 'panel-04-replace')
      .map(item => item.workAreaId === 'panel-05' ? { ...item, method: 'inspect' } : item);
    const seal = published.treatments[0].cost;
    if (seal.status !== 'estimated') throw new Error('Published seal estimate is missing');
    published.sharedCosts[0].cost = { ...seal, rateLowCents: 10000, rateHighCents: 10000, quantityLow: 1, quantityHigh: 1 };
    const saved = SurveySchema.parse(published);
    const edited = editRejections(saved, 1);
    vi.mocked(readFile).mockResolvedValueOnce(Buffer.from(JSON.stringify(saved)));
    const document = await html(await report(edited, 105600, 'budget'));
    const eligible = eligibleAreas(edited);
    expectPlan(document, 'essential', eligible, ['panel-01-seal', 'panel-02-seal', 'panel-04-patch'], {
      low: 24400, high: 105600, quotes: ['panel-04-patch'],
    });
    expectPlan(document, 'balanced', eligible, ['panel-01-seal', 'panel-02-patch', 'panel-04-patch'], {
      low: 17200, high: 57800, quotes: ['panel-02-patch', 'panel-04-patch'],
    });
    expectPlan(document, 'durable', eligible, ['panel-01-replace', 'panel-02-replace', 'panel-04-patch'], {
      low: 32500, high: 188400, quotes: ['panel-04-patch'],
    });
    const article = expectPlan(document, 'budget', eligible, ['panel-01-seal', 'panel-02-seal'], {
      low: 24400, high: 105600, quotes: [],
    });
    expect(article).toContain('estimated upper total fits the supplied budget');
    expect(readPlan(document, 'budget').deferred).toEqual(['panel-04', 'panel-05']);
    const findings = findingArticles(document);
    expect(findings[0].content).toContain('href="#area-panel-01"');
    expect(findings[2].content).toContain('href="#area-panel-01"');
  });
});

async function pdf(response: Response) {
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('application/pdf');
  const document = await PDFDocument.load(await response.arrayBuffer());
  const chunks = document.getPages().flatMap(page => {
    const contents = page.node.Contents();
    return contents instanceof PDFArray ? contents.asArray() : contents ? [contents] : [];
  });
  const text = chunks.flatMap(chunk => {
    const stream = document.context.lookup(chunk);
    if (!(stream instanceof PDFRawStream)) return [];
    const code = Buffer.from(decodePDFRawStream(stream).decode()).toString('latin1');
    return Array.from(code.matchAll(/<([0-9A-F]+)>\s*Tj/gi), match => Buffer.from(match[1], 'hex').toString('latin1'));
  }).join(' ').replace(/\s+/g, ' ');
  const photos = document.context.enumerateIndirectObjects()
    .filter(([, object]) => object instanceof PDFRawStream && object.dict.get(PDFName.of('Subtype')) === PDFName.of('Image'));
  expect(photos).toHaveLength(5);
  return text;
}

describe('Robertson cross-format review and evidence', () => {
  it('keeps default policy subtotals, quote rows and all five evidence IDs in the PDF', async () => {
    const text = await pdf(await report(canonical, null, 'balanced', ''));
    expect(text).toContain('REPORT FOCUS Balanced plan / balanced');
    expect(text).toContain('$294.00 to $2,294.00 known subtotal');
    expect(text).toContain('$216.00 to $1,434.00 known subtotal');
    expect(text).toContain('$600.00 to $4,906.00 known subtotal');
    for (const id of [...expectedFindingIds, 'panel-02-patch', 'panel-04-patch', 'site-setup']) expect(text).toContain(id);
    expect(text).toContain('Route impact unknown.');
  });

  it('keeps the below-threshold budget empty in PDF and HTML while retaining its deferred scope', async () => {
    const budget = 47799;
    const text = await pdf(await report(canonical, budget, 'budget', '?format=pdf'));
    const excerpt = text.split('Your budget / budget')[1]?.split('Essential repairs / essential')[0];
    expect(excerpt).toContain('No work selected. No costs assigned.');
    expect(excerpt).toContain('Selected treatments None');
    expect(excerpt).toMatch(/Deferred work areas.*panel-01.*panel-02.*panel-03.*panel-04.*panel-05/);
    checkBudget(await html(await report(canonical, budget, 'budget')), canonical.workAreas, budget);
  });

  it('keeps one allowed review edit across JSON, CSV, HTML and PDF, with canonical photos', async () => {
    const edited = editRejections(canonical, 2);
    const [finding] = edited.findings;
    finding.label = '<b>Évaluation & 測</b>';
    finding.kind = '"Edge" & <small>surface</small>';
    finding.review = { status: 'accepted', method: 'manual', reviewer: '王小明', note: '=1 + 2' };
    edited.workAreas[0].priority = 'low';
    edited.workAreas[0].rationale = '  Vérifier l’accès, puis mesurer.  '.trim();

    const roundTrip = SurveySchema.parse(JSON.parse(surveyJson(edited)));
    expect(roundTrip).toEqual(edited);
    const csv = surveyToCsv(roundTrip);
    expect(csv).toContain('"<b>Évaluation & 測</b>"');
    expect(csv).toContain('"accepted","王小明","manual","\'=1 + 2","low","Vérifier l’accès, puis mesurer."');
    expect(csv).toContain('"rejected","Facilities","manual"');
    for (const id of expectedFindingIds) expect(csv).toContain('"' + id + '"');
    const budget = 47800;
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const response = await report(roundTrip, budget, 'budget');
    expect(response.headers.get('content-security-policy')).toContain("default-src 'none'");
    expect(response.headers.get('content-disposition')).toContain('attachment;');
    const document = await html(response);
    checkBudget(document, eligibleAreas(edited), budget);
    expect(readPlan(document, 'budget').options).toEqual(['panel-03-seal']);
    expect(document).toContain('&lt;b&gt;Évaluation &amp; 測&lt;/b&gt;');
    expect(document).toContain('&quot;Edge&quot; &amp; &lt;small&gt;surface&lt;/small&gt;');
    expect(document).toContain('<dt>Reviewer</dt><dd>王小明</dd><dt>Review note</dt><dd>=1 + 2</dd>');
    expect(document).not.toContain(finding.label);
    expect(document).not.toContain('<small>surface</small>');
    expect(document).not.toMatch(/<script\b|<img[^>]+src="(?!data:image\/jpeg;base64,)/);
    const articles = findingArticles(document);
    expect(articles.map(article => article.id)).toEqual(expectedFindingIds);
    for (const [index, article] of articles.entries()) {
      const image = article.content.match(/<img src="data:image\/jpeg;base64,([^"]+)" alt="[^"]+">/);
      expect(image).not.toBeNull();
      expect(article.content).toContain('<figcaption>');
      const source = await readFile(join(process.cwd(), 'public' + canonical.findings[index].closeupSrc));
      expect(digest(Buffer.from(image![1], 'base64'))).toBe(digest(source));
    }
    const pdfText = await pdf(await report(roundTrip, budget, 'budget', ''));
    expect(pdfText).toContain('REPORT FOCUS Your budget / budget');
    expect(pdfText).toContain('Budget supplied $478.00');
    expect(pdfText).toMatch(/Selected treatments [^()]+\(panel-03-seal\)/);
    expect(pdfText).toContain('Rejected evidence IDs excluded from planning defect-02');
    expect(pdfText).toContain('[U+6E2C]');
    expect(pdfText).toContain('Download the accessible HTML report for the original text.');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(await getCanonical()).toEqual(canonical);
  });
});

describe('Robertson report request boundary', () => {
  const unexpectedQueries = [
    '?format=HTML', '?format=%20html', '?format=html&f%6Frmat=pdf', '?format=html&price=0',
  ];
  it.each(unexpectedQueries)('rejects ambiguous or unsupported selector %s before reading data', async query => {
    await expectFailure(await report(canonical, null, 'balanced', query));
    expect(vi.mocked(readFile)).not.toHaveBeenCalled();
  });

  it.each([
    ['broken JSON', () => request('{"survey":')],
    ['invalid UTF-8', () => request(new Uint8Array([0x7b, 0xff, 0x7d]))],
    ['no body', () => request(null)],
    ['content type', () => request('{}', '?format=html', { 'content-type': 'text/plain' })],
    ['invalid content length', () => request('{}', '', { 'content-length': '0x20' })],
  ] as const)('rejects %s before reading data', async (_, makeRequest) => {
    await expectFailure(await POST(makeRequest()));
    expect(vi.mocked(readFile)).not.toHaveBeenCalled();
  });

  it('enforces the byte boundary for HTML regardless of the declared length', async () => {
    const json = JSON.stringify({ survey: canonical, budgetCents: 0, planId: 'budget' });
    const limit = 2 * 1024 * 1024;
    const exact = json + ' '.repeat(limit - Buffer.byteLength(json));
    expect(Buffer.byteLength(exact)).toBe(limit);
    const result = await html(await POST(request(exact)));
    checkBudget(result, canonical.workAreas, 0);

    vi.mocked(readFile).mockClear();
    const tooBig = request(exact + ' ', '?format=html', { 'content-length': String(limit) });
    await expectFailure(await POST(tooBig), 413, 'BODY_TOO_LARGE');
    expect(vi.mocked(readFile)).not.toHaveBeenCalled();
  });

  it.each([
    ['unknown plan', { planId: 'different' }],
    ['budget without amount', { planId: 'budget', budgetCents: null }],
    ['fractional budget', { budgetCents: 47800.1 }],
    ['negative budget', { budgetCents: -1 }],
    ['unbounded budget', { budgetCents: 100_000_001 }],
    ['client-computed totals and selection', { totalCents: 0, selected: ['panel-01-seal'] }],
  ] as const)('rejects %s before reading data', async (_, changes) => {
    const body = { survey: canonical, planId: 'balanced', budgetCents: null, ...changes };
    await expectFailure(await POST(request(JSON.stringify(body))));
    expect(vi.mocked(readFile)).not.toHaveBeenCalled();
  });

  const immutableCases: [string, (draft: Survey) => void][] = [
    ['AI label rewrite', draft => { draft.findings[0].label = 'New draft label'; }],
    ['AI rejection', draft => { draft.findings[0].review.status = 'rejected'; }],
    ['valid but different revision', draft => { draft.revision += 1; }],
    ['valid but different source hash', draft => { draft.media.originalSha256 = '0'.repeat(64); }],
    ['empty measurements filled from the client', draft => { draft.findings[0].measurements.push({ property: 'Slope', value: 4, unit: '%', method: 'Example' }); }],
    ['registered close-up reassigned', draft => { draft.findings[0].closeupSrc = draft.findings[1].closeupSrc; }],
    ['plausible unregistered close-up path', draft => { draft.findings[0].closeupSrc = '/curb/surveys/robertson-hall/unknown.jpg'; }],
    ['remote close-up', draft => { draft.findings[0].closeupSrc = 'https://example.invalid/photo.jpg'; }],
    ['same-prefix dot-segment path', draft => { draft.findings[0].closeupSrc = '/curb/surveys/robertson-hall/../example.jpg'; }],
    ['changed source URI', draft => { draft.sources[0].url = 'https://example.invalid/changed'; }],
    ['non-web source URI', draft => { draft.sources[0].url = 'mailto:survey@example.invalid'; }],
    ['changed rate', draft => {
      const cost = draft.treatments[0].cost;
      if (cost.status !== 'estimated') throw new Error('Missing rate fixture');
      cost.rateLowCents = 0;
    }],
    ['changed work-area grouping', draft => { draft.workAreas[0].findingIds.push('defect-02'); }],
    ['cross-area recommendation', draft => { draft.workAreas[0].recommendedOptionId = 'panel-02-seal'; }],
    ['oversized treatment catalog', draft => {
      for (let index = 0; index < 5; index += 1) {
        draft.treatments.push({ ...draft.treatments[0], id: 'extra-treatment-' + index });
      }
    }],
  ];

  it.each(immutableCases)('rejects %s without resolving or reading evidence bytes', async (_, mutate) => {
    const submitted = structuredClone(canonical);
    mutate(submitted);
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    await expectFailure(await report(submitted, 47800, 'budget'));
    const files = vi.mocked(readFile).mock.calls.map(([path]) => basename(String(path)));
    expect(files.length).toBeLessThanOrEqual(1);
    expect(files.every(name => name === basename(publishedFile))).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('serves the same published survey and close-up bytes after a rejected review', async () => {
    const capture = async () => Promise.all(
      [publishedFile, ...canonical.findings.map(finding => 'public' + finding.closeupSrc)]
        .map(async file => digest(await readFile(join(process.cwd(), file)))),
    );
    const hashes = await capture();
    const submitted = editRejections(canonical, 31);
    submitted.findings[0].track[0].frame += 1;
    await expectFailure(await report(submitted, 47800, 'budget', '?format=pdf'));
    expect(await getCanonical()).toEqual(canonical);
    expect(await capture()).toEqual(hashes);
  });
});
