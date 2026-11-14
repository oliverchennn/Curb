import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';
import { decodePDFRawStream, PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFRawStream, PDFString, StandardFonts } from 'pdf-lib';
import { ExportRequestSchema, SurveySchema, type Finding, type PlanId, type RepairPlan, type Survey } from '../../src/contracts/curb/survey';
import { buildRepairPlans } from '../../src/domain/curb/survey';
import { surveyToCsv } from '../../src/domain/curb/surveyExports';
import { renderSurveyHtmlReport } from '../../src/server/curb/surveyHtmlReport';

const project = fileURLToPath(new URL('../../', import.meta.url));
const cases = ['default', 'budget', 'edited'] as const;
const extensions = ['request.json', 'json', 'csv', 'html', 'pdf'] as const;
const utf8 = new TextDecoder('utf-8', { fatal: true });
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const money = (cents: number) => usd.format(cents / 100);
const sha256 = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');
const normalize = (value: string) => value.replace(/\s+/gu, ' ').trim();
const sorted = (values: Iterable<string>) => [...values].sort();

function requireMatch(actual: unknown, expected: unknown, message: string) {
  // Keep failures concise, even when comparing entire surveys or HTML with embedded photos.
  assert.ok(isDeepStrictEqual(actual, expected), message);
}

function checkReviewedSurvey(edited: Survey, canonical: Survey) {
  const findings = edited.findings.map((finding, index) => {
    const original = canonical.findings[index];
    if (!original) throw new Error('unexpected additional finding');
    const { label, kind, description, review, ...evidence } = finding;
    if (!isDeepStrictEqual({ label, kind, description, review }, {
      label: original.label, kind: original.kind, description: original.description, review: original.review,
    })) {
      requireMatch(review.method, 'manual', 'changed finding lacks manual review');
    }
    return { ...evidence, label: original.label, kind: original.kind, description: original.description, review: original.review };
  });
  const workAreas = edited.workAreas.map((area, index) => {
    const original = canonical.workAreas[index];
    if (!original) throw new Error('unexpected additional work area');
    if (area.priority !== original.priority || area.rationale !== original.rationale) {
      // Match the final v1 report boundary introduced after this verifier's base.
      // This is self-reported attribution, not proof of reviewer identity.
      const prefix = 'Priority reviewed by ';
      const separator = area.rationale.indexOf(': ', prefix.length);
      assert.ok(area.rationale.startsWith(prefix) && separator >= prefix.length
        && area.rationale.slice(prefix.length, separator).trim().length > 0
        && area.rationale.slice(separator + 2).trim().length > 0
        && area.rationale !== original.rationale, 'changed work-area priority lacks named review and rationale');
    }
    return { ...area, priority: original.priority, rationale: original.rationale };
  });
  requireMatch({ ...edited, findings, workAreas }, canonical, 'request changed immutable survey evidence, costs, grouping, or sources');
}

function checkCsv(csv: string, survey: Survey) {
  requireMatch(csv, surveyToCsv(survey), 'CSV differs from the reviewed records and canonical quoting');
  // Quoted cells can contain commas, embedded quotes and newlines. Check each
  // serialized cell separately so formula protection is not assumed from equality.
  let offset = 0;
  const cells = /(?:"((?:[^"]|"")*)"|([^",\r\n]*))(,|\r\n)/gy;
  for (const cell of csv.matchAll(cells)) {
    offset += cell[0].length;
    if (cell[1] !== undefined) {
      assert.ok(!/^\s*[=+@＝＋－＠\t\r\n-]/u.test(cell[1]), 'CSV contains a formula-capable unprotected text cell');
    }
  }
  requireMatch(offset, csv.length, 'CSV contains malformed quoting or record separators');
}

function checkHtml(html: string, survey: Survey, plans: RepairPlan[], selected: PlanId, photos: ReadonlyMap<string, Buffer>) {
  // Verify format semantics independently of the final exact-render comparison.
  assert.ok(/<!doctype html>\s*<html lang="en(?:-US)?">/i.test(html), 'HTML document or language missing');
  requireMatch([...html.matchAll(/<h1\b/g)].length, 1, 'HTML needs one main heading');
  for (const section of ['plans', 'work-areas', 'findings', 'sources']) {
    assert.ok(html.includes('href="#' + section + '"') && html.includes('<section id="' + section + '"'), 'HTML navigation missing ' + section);
  }
  const links = [...html.matchAll(/\bhref="([^"]+)"/g)].map(match => match[1]);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  requireMatch(new Set(ids).size, ids.length, 'HTML has duplicate IDs');
  const approvedLinks = new Set(survey.sources.map(source => new URL(source.url).href.replaceAll('&', '&amp;')));
  for (const link of links) {
    assert.ok(link.startsWith('#') ? ids.includes(link.slice(1)) : approvedLinks.has(link), 'HTML has an unregistered link or broken anchor');
  }
  assert.ok(!/<(?:script|iframe|object|embed|link|base|video|audio|form)\b/i.test(html), 'HTML includes an active or external resource element');
  const figures = [...html.matchAll(/<figure><img src="data:image\/(jpeg|png);base64,([^"]+)" alt="([^"]+)"><figcaption>([^<]+)<\/figcaption><\/figure>/g)];
  requireMatch(figures.length, photos.size, 'HTML missing a photo, alt text, or caption');
  requireMatch([...html.matchAll(/<img\b/gi)].length, photos.size, 'HTML includes an extra or nonembedded image');
  for (const [index, finding] of survey.findings.entries()) {
    const [, , bytes, , caption] = figures[index];
    assert.ok(caption.endsWith(finding.id), 'HTML caption differs for ' + finding.id);
    requireMatch(sha256(Buffer.from(bytes, 'base64')), sha256(photos.get(finding.id)!), 'HTML photo differs for ' + finding.id);
  }
  // This generator has a fixed offline format. Matching its canonical render
  // catches altered values and additional attributes, CSS or automatic requests.
  requireMatch(html, renderSurveyHtmlReport(survey, plans, selected, photos), 'HTML differs from the recomputed report');
}

const winAnsi = '€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008dŽ\u008f\u0090‘’“”•–—˜™š›œ\u009džŸ';
function decodeVisibleText(hex: string) {
  return Array.from(Buffer.from(hex, 'hex'), byte =>
    byte >= 0x80 && byte <= 0x9f ? winAnsi[byte - 0x80] : String.fromCharCode(byte)).join('');
}

function pdfText(document: PDFDocument, page: ReturnType<PDFDocument['getPages']>[number]) {
  const contents = page.node.Contents();
  const refs = contents instanceof PDFArray ? contents.asArray() : contents ? [contents] : [];
  return refs.map(ref => {
    const stream = document.context.lookup(ref);
    assert.ok(stream instanceof PDFRawStream, 'PDF contains an unreadable page stream');
    return Buffer.from(decodePDFRawStream(stream).decode()).toString('latin1');
  }).join('\n');
}

function pdfPrintable(text: string, supported: Set<number>) {
  const singleLine = text.normalize('NFC').replace(/[\u2010-\u2015\u2212]/gu, '-')
    .replace(/[\s\u0000-\u001f\u007f-\u009f]+/gu, ' ').trim();
  return Array.from(singleLine, character => {
    const point = character.codePointAt(0)!;
    return supported.has(point) ? character : '[U+' + point.toString(16).toUpperCase().padStart(4, '0') + ']';
  }).join('');
}

function exactIds(text: string, expected: string[], label: string) {
  const ids = [...text.matchAll(/\(([a-z][a-z0-9-]*)\)/g)].map(match => match[1]);
  requireMatch(ids, expected, label + ' differs from the recomputed plan');
}

function readField(text: string, start: string, end?: string) {
  const open = text.indexOf(start);
  if (open < 0) throw new Error('PDF is missing ' + start.trim());
  const value = text.slice(open + start.length);
  const close = end === undefined ? -1 : value.indexOf(end);
  return close === -1 ? value : value.slice(0, close);
}

async function checkPdf(bytes: Buffer, survey: Survey, plans: RepairPlan[], selected: PlanId, photos: ReadonlyMap<string, Buffer>) {
  assert.ok(bytes.subarray(0, 5).toString() === '%PDF-', 'invalid PDF signature');
  const document = await PDFDocument.load(bytes);
  requireMatch(document.getTitle(), survey.title + ' | Curb repair report', 'PDF title differs from the survey');
  const fontDocument = await PDFDocument.create();
  const font = await fontDocument.embedFont(StandardFonts.Helvetica);
  const supported = new Set(font.getCharacterSet());
  const evidence = new Map<string, { parts: string[]; images: string[] }>();
  const comparison: string[] = [];
  const sources = new Set<string>();

  for (const page of document.getPages()) {
    const code = pdfText(document, page);
    const lines = [...code.matchAll(/<([0-9a-f]+)>\s*Tj/gi)].map(match => decodeVisibleText(match[1]));
    const content = normalize(lines.slice(1).join(' ').split('SURVEY REPORT / FACILITIES PLANNING')[0]);
    if (/PLAN COMPARISON$/.test(lines[0] ?? '')) comparison.push(content);
    const finding = lines[0]?.match(/FINDING EVIDENCE\s*\/\s*([A-Z0-9-]+)$/)?.[1]?.toLowerCase();
    if (finding) {
      const group = evidence.get(finding) ?? { parts: [], images: [] };
      group.parts.push(content);
      const objects = page.node.Resources()?.lookupMaybe(PDFName.of('XObject'), PDFDict);
      for (const [, name] of code.matchAll(/\/([A-Za-z0-9-]+)\s+Do\b/g)) {
        const object = document.context.lookup(objects?.get(PDFName.of(name)));
        assert.ok(object instanceof PDFRawStream && object.dict.get(PDFName.of('Subtype')) === PDFName.of('Image'),
          'unexpected PDF evidence resource');
        group.images.push(sha256(object.getContents()));
      }
      evidence.set(finding, group);
    }
    for (const ref of page.node.Annots()?.asArray() ?? []) {
      const annotation = document.context.lookup(ref, PDFDict);
      if (annotation.get(PDFName.of('Subtype')) !== PDFName.of('Link')) continue;
      const action = annotation.lookupMaybe(PDFName.of('A'), PDFDict);
      assert.ok(action?.get(PDFName.of('S')) === PDFName.of('URI'), 'PDF includes a non-URI link action');
      const uri = action.get(PDFName.of('URI'));
      assert.ok(uri instanceof PDFHexString || uri instanceof PDFString, 'PDF includes an unreadable source link');
      sources.add(utf8.decode(uri.asBytes()));
    }
  }

  requireMatch(sorted(sources), sorted(new Set(survey.sources.map(source => new URL(source.url).href))), 'PDF source links differ');
  requireMatch([...evidence.keys()], survey.findings.map(finding => finding.id), 'PDF finding order or IDs differ');
  for (const finding of survey.findings) {
    const group = evidence.get(finding.id)!;
    requireMatch(group.images, [sha256(photos.get(finding.id)!)], 'PDF photo differs for ' + finding.id);
    const content = group.parts.join(' ');
    checkPdfFinding(content, finding, supported);
  }

  const summary = comparison.join(' ');
  const rejected = survey.findings.filter(finding => finding.review.status === 'rejected').map(finding => finding.id);
  if (rejected.length) assert.ok(summary.includes('Rejected evidence IDs excluded from planning ' + rejected.join(', ')), 'PDF exclusions differ');
  else assert.ok(!summary.includes('Rejected evidence IDs excluded from planning'), 'PDF contains unexpected exclusions');
  const ordered = [plans.find(plan => plan.id === selected)!, ...plans.filter(plan => plan.id !== selected)];
  const titles = ordered.map(plan => plan.title + ' / ' + plan.id);
  assert.ok(summary.includes('REPORT FOCUS ' + titles[0]), 'PDF selected plan differs');
  const budget = plans.find(plan => plan.id === 'budget');
  if (budget?.budgetCents != null) {
    assert.ok(summary.includes('Budget supplied ' + money(budget.budgetCents)), 'PDF budget amount differs');
  } else {
    assert.ok(!summary.includes('Budget supplied '), 'PDF unexpectedly reports a budget');
  }
  const positions = titles.map(title => summary.indexOf(title));
  assert.ok(positions.every((position, index) => position >= 0 && (index === 0 || position > positions[index - 1])), 'PDF policies are missing or out of order');
  for (const [index, plan] of ordered.entries()) {
    const part = summary.slice(positions[index], positions[index + 1]);
    exactIds(readField(part, 'Selected work areas ', 'Deferred work areas '), plan.workAreaIds, titles[index] + ' selected areas');
    exactIds(readField(part, 'Deferred work areas ', 'Selected treatments '), plan.deferredWorkAreaIds, titles[index] + ' deferred areas');
    exactIds(readField(part, 'Selected treatments ', 'Items requiring quotes '), plan.optionIds, titles[index] + ' selected treatments');
    const items = plan.optionIds.length ? [...survey.treatments.filter(item => plan.optionIds.includes(item.id)), ...survey.sharedCosts] : [];
    const quoteIds = items.filter(item => item.cost.status === 'quote_required').map(item => item.id);
    const quoteText = part.includes('Items requiring quotes ') ? readField(part, 'Items requiring quotes ') : '';
    requireMatch(sorted([...quoteText.matchAll(/\(([a-z][a-z0-9-]*)\)/g)].map(match => match[1])), sorted(quoteIds), titles[index] + ' quote items differ');
    const { lowCents, highCents, isComplete } = plan.cost;
    const range = lowCents === highCents ? money(lowCents) : money(lowCents) + ' to ' + money(highCents);
    const cost = !items.length ? 'No work selected. No costs assigned.' :
      isComplete ? 'Complete estimate ' + range :
      items.some(item => item.cost.status === 'estimated') ? 'Partial estimate ' + range + ' known subtotal, plus required quotes.' :
      'Quote required for all selected cost items.';
    assert.ok(part.includes(cost), titles[index] + ' amount or completeness differs');
  }

  return document.getPageCount();
}

function checkPdfFinding(text: string, finding: Finding, supported: Set<number>) {
  const { review } = finding;
  const method = review.method === 'manual' ? 'Manual' : 'AI-assisted';
  for (const expected of [
    finding.label, finding.kind, finding.description, review.note,
    'Review status ' + review.status.toUpperCase() + ' / ' + method + ' / ' + review.reviewer,
    'Video close-up at ' + finding.evidenceTime.toFixed(2) + ' s / ' + finding.id,
    'Provisional finding priority ' + finding.assessment.priority,
    ...finding.measurements.map(m => 'Recorded ' + m.property + ' / ' + m.value + ' ' + m.unit + ' / ' + m.method),
  ]) {
    assert.ok(text.includes(pdfPrintable(expected, supported)), 'PDF evidence or review differs for ' + finding.id);
  }
}

async function verify(directory: string) {
  const canonicalPath = join(project, 'src', 'data', 'curb', 'surveys', 'robertson-hall.json');
  const saved = await readFile(canonicalPath);
  const canonical = SurveySchema.parse(JSON.parse(utf8.decode(saved)));
  const photos = new Map(await Promise.all(canonical.findings.map(async finding =>
    [finding.id, await readFile(join(project, 'public', finding.closeupSrc))] as const)));
  const variants = [];
  for (const name of cases) {
    try {
      const files = Object.fromEntries(await Promise.all(extensions.map(async ext =>
        [ext, await readFile(join(directory, name + '.' + ext))] as const))) as Record<typeof extensions[number], Buffer>;
      const request = ExportRequestSchema.parse(JSON.parse(utf8.decode(files['request.json'])));
      const survey = SurveySchema.parse(JSON.parse(utf8.decode(files.json)));
      checkReviewedSurvey(request.survey, canonical);
      requireMatch(survey, request.survey, 'JSON differs from the submitted review');
      if (name === 'edited') assert.ok(!isDeepStrictEqual(survey, canonical), 'edited sample lacks a review change');
      else requireMatch(survey, canonical, 'default and budget samples must use the canonical survey');
      if (name === 'default') assert.ok(request.budgetCents === null && request.planId !== 'budget', 'default sample unexpectedly uses a budget');
      if (name === 'budget') assert.ok(request.budgetCents !== null && request.planId === 'budget', 'budget sample lacks a focused budget plan');
      const plans = buildRepairPlans(survey, request.budgetCents ?? undefined);
      assert.ok(plans.some(plan => plan.id === request.planId), 'request selects a plan that does not exist');
      checkCsv(utf8.decode(files.csv), survey);
      checkHtml(utf8.decode(files.html), survey, plans, request.planId, photos);
      const pdfPages = await checkPdf(files.pdf, survey, plans, request.planId, photos);
      variants.push({ name, focus: request.planId, budgetCents: request.budgetCents, pdfPages,
        totals: plans.map(plan => ({ plan: plan.id, lowCents: plan.cost.lowCents, highCents: plan.cost.highCents, complete: plan.cost.isComplete })),
        sha256: Object.fromEntries(extensions.map(ext => [ext, sha256(files[ext])])) });
    } catch (error) {
      throw new Error(name + ': ' + (error instanceof Error ? error.message : String(error)));
    }
  }
  return { surveyId: canonical.id, revision: canonical.revision, surveySha256: sha256(saved),
    photoSha256: Object.fromEntries([...photos].map(([id, bytes]) => [id, sha256(bytes)])),
    checks: ['published evidence', 'reviewed JSON and CSV', 'offline HTML', 'PDF content and photos'], variants };
}

try {
  if (process.argv.length !== 3) throw new Error('usage: node --import tsx scripts/curb/verify_report_bundle.ts <artifact-directory>');
  console.log(JSON.stringify(await verify(resolve(process.argv[2])), null, 2));
} catch (error) {
  console.error('Report bundle verification failed: ' + (error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
}
