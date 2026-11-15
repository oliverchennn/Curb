import {
  PDFDocument, PDFHexString, StandardFonts, rgb,
  type PDFFont, type PDFImage, type PDFPage,
} from 'pdf-lib';
import type { Cost, Finding, PlanId, RepairPlan, Survey } from '../../contracts/curb/survey';
import { costRange } from '../../domain/curb/survey';

const pageWidth = 612;
const pageHeight = 792;
const inset = 48;
const bodyWidth = pageWidth - 2 * inset;
const bottom = 58;
const forest = rgb(0.13, 0.25, 0.21);
const ink = rgb(0.16, 0.20, 0.18);
const muted = rgb(0.31, 0.36, 0.32);
const paper = rgb(0.99, 0.98, 0.95);
const rule = rgb(0.80, 0.82, 0.76);
const amber = rgb(0.62, 0.35, 0.10);
const linkColor = rgb(0.11, 0.33, 0.41);
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const policyDescription: Record<PlanId, string> = {
  essential: 'Lowest-priced options for near-term work areas, subject to field confirmation of suitability.',
  balanced: 'Recommended options for eligible work areas.',
  durable: 'Highest-durability options for eligible work areas.',
  budget: 'Prioritizes high, then medium, low and unassessed work areas within the known cost upper bound. Quote-only treatments are outside the budget calculation.',
};

const styles = {
  title: { size: 29, leading: 34, bold: true, color: forest },
  heading: { size: 18, leading: 23, bold: true, color: forest },
  subheading: { size: 13, leading: 17, bold: true, color: forest },
  body: { size: 11, leading: 15, bold: false, color: ink },
  detail: { size: 10, leading: 14, bold: false, color: muted },
  focus: { size: 10, leading: 14, bold: true, color: amber },
  planHeading: { size: 15, leading: 19, bold: true, color: forest },
  planTotal: { size: 11, leading: 14, bold: true, color: forest },
  planDetail: { size: 10, leading: 12, bold: false, color: ink },
  planAlert: { size: 10, leading: 12, bold: true, color: amber },
  link: { size: 10, leading: 14, bold: false, color: linkColor },
};

function printable(text: string, characterSet: Set<number>): { text: string; substituted: boolean } {
  let substituted = false;
  const safe = Array.from(
    text.normalize('NFC').replace(/[\u2010-\u2015\u2212]/gu, '-').replace(/[\s\u0000-\u001f\u007f-\u009f]+/gu, ' ').trim(),
    character => {
      const point = character.codePointAt(0)!;
      if (characterSet.has(point)) return character;
      substituted = true;
      return '[U+' + point.toString(16).toUpperCase().padStart(4, '0') + ']';
    },
  ).join('');
  return { text: safe, substituted };
}

function wrap(text: string, font: PDFFont, size: number): string[] {
  const lines: string[] = [];
  let line = '';
  const width = (value: string) => font.widthOfTextAtSize(value, size);
  for (const word of text.split(' ')) {
    const candidate = line ? line + ' ' + word : word;
    if (width(candidate) <= bodyWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = '';
    // Long URLs and arbitrary review text can contain words wider than the page.
    for (const character of word) {
      if (width(line + character) > bodyWidth) {
        lines.push(line);
        line = '';
      }
      line += character;
    }
  }
  if (line) lines.push(line);
  return lines;
}

class ReportLayout {
  private page!: PDFPage;
  private y = 0;
  private section = '';
  private hasSubstitutions = false;
  private readonly regularCharacterSet: Set<number>;
  private readonly boldCharacterSet: Set<number>;

  constructor(private readonly doc: PDFDocument, private readonly font: PDFFont, private readonly bold: PDFFont) {
    this.regularCharacterSet = new Set(font.getCharacterSet());
    this.boldCharacterSet = new Set(bold.getCharacterSet());
  }

  start(section: string): void {
    this.section = section;
    this.newPage();
  }

  private newPage(): void {
    this.page = this.doc.addPage([pageWidth, pageHeight]);
    this.page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: paper });
    this.page.drawRectangle({ x: 0, y: pageHeight - 8, width: pageWidth, height: 8, color: forest });
    this.page.drawText('CURB  /  ' + this.section.toUpperCase(), {
      x: inset, y: pageHeight - 42, font: this.bold, size: 10, color: forest,
    });
    this.y = pageHeight - 67;
  }

  reserve(height: number): void {
    if (this.y - height < bottom) this.newPage();
  }

  gap(height: number): void {
    this.y -= height;
  }

  divider(color = rule, space = 10): void {
    this.page.drawRectangle({ x: inset, y: this.y - 1, width: bodyWidth, height: 1, color });
    this.gap(space);
  }

  text(text: string, preset: keyof typeof styles = 'body', href?: string): void {
    const style = styles[preset];
    const font = style.bold ? this.bold : this.font;
    const characterSet = style.bold ? this.boldCharacterSet : this.regularCharacterSet;
    const safe = printable(text, characterSet);
    this.hasSubstitutions ||= safe.substituted;
    const lines = wrap(safe.text, font, style.size);
    for (const line of lines) {
      this.reserve(style.leading);
      this.y -= style.leading;
      this.page.drawText(line, { x: inset, y: this.y + 3, size: style.size, font, color: style.color });
      if (href) this.addLink(href, font.widthOfTextAtSize(line, style.size), style.size);
    }
  }

  private addLink(href: string, width: number, size: number): void {
    // Use a byte string for URI syntax, so literal PDF string delimiters are inert.
    const bytes = new TextEncoder().encode(href);
    const uri = PDFHexString.of(Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join(''));
    const annotation = this.doc.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [inset, this.y + 1, inset + width, this.y + 4 + size],
      Border: [0, 0, 0],
      A: { S: 'URI', URI: uri },
    });
    this.page.node.addAnnot(this.doc.context.register(annotation));
    this.page.drawLine({
      start: { x: inset, y: this.y + 1 },
      end: { x: inset + width, y: this.y + 1 },
      thickness: 0.45,
      color: linkColor,
    });
  }

  image(image: PDFImage): void {
    const { width, height } = image.scaleToFit(bodyWidth, 160);
    this.reserve(height + 12);
    this.page.drawRectangle({ x: inset, y: this.y - height, width: bodyWidth, height, color: forest });
    this.page.drawImage(image, { x: (pageWidth - width) / 2, y: this.y - height, width, height });
    this.gap(height + 7);
  }

  finish(): void {
    const pages = this.doc.getPages();
    for (const [index, page] of pages.entries()) {
      page.drawLine({ start: { x: inset, y: 43 }, end: { x: pageWidth - inset, y: 43 }, thickness: 1, color: rule });
      page.drawText('SURVEY REPORT  /  FACILITIES PLANNING', { x: inset, y: 27, font: this.bold, size: 8, color: muted });
      const label = String(index + 1) + ' / ' + pages.length;
      page.drawText(label, { x: pageWidth - inset - this.font.widthOfTextAtSize(label, 9), y: 27, font: this.font, size: 9, color: muted });
      if (this.hasSubstitutions) {
        page.drawText('Some characters appear as [U+XXXX]. Download the accessible HTML report for the original text.', {
          x: inset, y: 15, font: this.font, size: 8, color: muted,
        });
      }
    }
  }
}

function money(cents: number): string {
  return currency.format(cents / 100);
}

function range(lowCents: number, highCents: number): string {
  return lowCents === highCents ? money(lowCents) : money(lowCents) + ' to ' + money(highCents);
}

function labels(ids: string[]): string {
  return ids.length ? ids.join(', ') : 'None';
}

function costStatus(plan: RepairPlan, hasPricedItems: boolean): string {
  const { lowCents, highCents, isComplete } = plan.cost;
  if (!plan.optionIds.length) return 'No work selected. No costs assigned.';
  if (isComplete) return 'Complete estimate  ' + range(lowCents, highCents);
  if (!hasPricedItems) return 'Quote required for all selected cost items.';
  return 'Partial estimate  ' + range(lowCents, highCents) + ' known subtotal, plus required quotes.';
}

function showCost(layout: ReportLayout, cost: Cost): void {
  if (cost.status === 'quote_required') {
    layout.text('Quote required. ' + cost.reason, 'focus');
    return;
  }
  const amount = costRange(cost)!;
  layout.text('Estimated item range  ' + range(amount.lowCents, amount.highCents));
  layout.text('Unit rate  ' + range(cost.rateLowCents, cost.rateHighCents) + ' per ' + cost.unit, 'detail');
  layout.text('Assumed quantity  ' + cost.quantityLow + ' to ' + cost.quantityHigh + ' (' + cost.unit + ').', 'detail');
  for (const assumption of cost.assumptions) layout.text('Assumption  ' + assumption, 'detail');
  for (const exclusion of cost.exclusions) layout.text('Exclusion  ' + exclusion, 'detail');
  layout.text('Cost source IDs  ' + labels(cost.sourceIds), 'detail');
}

function showFinding(layout: ReportLayout, finding: Finding, workAreaId: string | undefined, closeup: PDFImage): void {
  const { review, assessment, measurements, mapPosition } = finding;
  const method = review.method === 'ai' ? 'AI-assisted' : 'Manual';
  layout.text(finding.label, 'heading');
  layout.text(finding.id + '  /  Work area ' + (workAreaId ?? 'unassigned'), 'detail');
  layout.text(finding.kind, 'subheading');
  layout.text(finding.description);
  layout.gap(7);
  layout.image(closeup);
  layout.text('Video close-up at ' + finding.evidenceTime.toFixed(2) + ' s  /  ' + finding.id, 'detail');
  layout.gap(7);
  layout.text('Review status  ' + review.status.toUpperCase() + '  /  ' + method + '  /  ' + review.reviewer, 'subheading');
  layout.text(review.note);
  if (review.status === 'rejected') layout.text('Excluded from repair selection. Evidence retained for review.', 'focus');
  layout.gap(7);
  layout.text('Provisional finding priority  ' + assessment.priority, 'subheading');
  layout.text(assessment.rationale);
  for (const impact of assessment.accessImpacts) layout.text('- ' + impact);
  layout.gap(7);
  layout.text('Site measurement checklist', 'subheading');
  if (!measurements.length) layout.text('Measurements unknown. The survey contains no recorded values.');
  for (const measurement of measurements) {
    layout.text('Recorded  ' + measurement.property + '  /  ' + measurement.value + ' ' + measurement.unit + '  /  ' + measurement.method);
  }
  for (const need of assessment.measurementNeeds) layout.text('- ' + need);
  for (const check of assessment.checks) {
    const status = check.status === 'needs_measurement' ? 'Measurement needed' : 'Not assessed';
    layout.text(status + '  /  ' + check.sourceId + '  /  ' + check.section + '  /  ' + check.note, 'detail');
  }
  layout.gap(7);
  layout.text(mapPosition ? 'Approximate map position  ' + mapPosition.note : 'Finding position on map unknown.', 'detail');
}

async function embedCloseup(pdf: PDFDocument, id: string, bytes: Uint8Array | undefined): Promise<PDFImage> {
  if (bytes?.[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return pdf.embedJpg(bytes);
  const pngMagic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes && pngMagic.every((byte, index) => bytes[index] === byte)) return pdf.embedPng(bytes);
  throw new Error('Missing or unsupported report close-up for ' + id);
}

function httpLink(value: string): string | undefined {
  const url = new URL(value);
  if (url.protocol === 'https:' || url.protocol === 'http:') return url.href;
  return undefined;
}

export async function renderSurveyReport(
  survey: Survey,
  plans: RepairPlan[],
  selectedPlanId: PlanId,
  closeups: ReadonlyMap<string, Uint8Array>,
): Promise<Uint8Array> {
  const selected = plans.find(plan => plan.id === selectedPlanId);
  if (!selected) throw new Error('Selected plan is missing from the survey report');
  const orderedPlans = [selected, ...plans.filter(plan => plan.id !== selectedPlanId)];
  const pdf = await PDFDocument.create();
  pdf.setTitle(survey.title + ' | Curb repair report');
  pdf.setAuthor('Curb');
  pdf.setSubject('Evidence and provisional accessibility repair planning');
  pdf.setLanguage('en-US');

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const layout = new ReportLayout(pdf, font, bold);
  const treatments = new Map(survey.treatments.map(treatment => [treatment.id, treatment]));
  const workAreas = new Map(survey.workAreas.map(area => [area.id, area]));
  const named = ({ label, id }: { label: string; id: string }) => label + ' (' + id + ')';
  const excludedFindings = survey.findings.filter(finding => finding.review.status === 'rejected').map(finding => finding.id);
  const pendingCount = survey.findings.filter(finding => finding.review.status === 'pending').length;
  const findingsById = new Map(survey.findings.map(finding => [finding.id, finding]));
  const areasByFinding = new Map(survey.workAreas.flatMap(area => area.findingIds.map(id => [id, area.id] as const)));
  const budget = plans.find(plan => plan.id === 'budget');

  layout.start('Plan comparison');
  layout.text(survey.title, 'title');
  layout.text(survey.site.name + '  /  ' + survey.id + '  /  Revision ' + survey.revision, 'detail');
  layout.gap(5);
  layout.text(survey.site.locationNote, 'planDetail');
  layout.text('Route impact unknown. ' + survey.routeAssessment.note, 'planDetail');
  layout.text('Overall ADA compliance undetermined. Confirm applicability, measurements and treatment suitability in the field.', 'planDetail');
  if (orderedPlans.some(plan => plan.cost.unpricedItems.length)) layout.text('Partial subtotals cannot rank full project costs while items still need quotes.', 'planAlert');
  if (pendingCount) layout.text(pendingCount + ' finding(s) pending review. Plans using them are provisional.', 'planAlert');
  if (excludedFindings.length) layout.text('Rejected evidence IDs excluded from planning  ' + labels(excludedFindings), 'planDetail');
  if (budget && budget.budgetCents !== null) {
    layout.text('Budget supplied  ' + money(budget.budgetCents), 'subheading');
  }

  for (const plan of orderedPlans) {
    layout.reserve(113);
    layout.gap(5);
    const focused = plan.id === selectedPlanId;
    layout.divider(focused ? amber : rule, 6);
    if (focused) layout.text('REPORT FOCUS', 'planAlert');
    layout.text(plan.title + '  /  ' + plan.id, 'planHeading');
    layout.text(policyDescription[plan.id], 'planDetail');
    const items = plan.optionIds.length ? [...plan.optionIds.map(id => treatments.get(id)!), ...survey.sharedCosts] : [];
    layout.text(costStatus(plan, items.some(item => item.cost.status === 'estimated')), 'planTotal');
    if (plan.budgetFit === 'partial') layout.text('Known upper subtotal fits the budget. Budget fit remains partial until quoted.', 'planAlert');
    if (plan.budgetFit === 'within') layout.text('Estimated upper total fits the supplied budget.', 'planDetail');
    if (plan.budgetFit === 'over') layout.text('Known upper subtotal exceeds the supplied budget.', 'planAlert');
    const { high, medium, low, unassessed } = plan.coverage;
    layout.text('Work area priority coverage  ' + high + ' high, ' + medium + ' medium, ' + low + ' low, ' + unassessed + ' unassessed', 'planDetail');
    layout.text('Selected work areas  ' + labels(plan.workAreaIds.map(id => named(workAreas.get(id)!))), 'planDetail');
    layout.text('Deferred work areas  ' + labels(plan.deferredWorkAreaIds.map(id => named(workAreas.get(id)!))), 'planDetail');
    layout.text('Selected treatments  ' + labels(plan.optionIds.map(id => named(treatments.get(id)!))), 'planDetail');
    const unpricedItems = items.filter(item => item.cost.status === 'quote_required');
    if (unpricedItems.length) layout.text('Items requiring quotes  ' + labels(unpricedItems.map(named)), 'planAlert');
  }

  layout.start('Work areas and estimates');
  layout.text('Work areas and estimates', 'heading');
  layout.text('Estimate ranges use assumed quantities. The source register describes benchmark scope and dates.');
  if (!survey.workAreas.length) layout.text('No work areas are recorded.', 'detail');
  function showSharedCosts() {
    if (!survey.sharedCosts.length) return;
    layout.reserve(84);
    layout.gap(8);
    layout.divider();
    layout.text('Site costs shared across selected work', 'subheading');
    layout.text('Each shared item applies once per plan with selected work.', 'detail');
    for (const item of survey.sharedCosts) {
      layout.reserve(34);
      layout.text(item.label + '  /  ' + item.id, 'subheading');
      showCost(layout, item.cost);
    }
  }
  for (const [index, area] of survey.workAreas.entries()) {
    if (index > 0) layout.start('Work areas and estimates  /  ' + area.id);
    else layout.gap(12);
    layout.text(area.label + '  /  ' + area.id, 'heading');
    const active = area.findingIds.some(id => findingsById.get(id)!.review.status !== 'rejected');
    const priority = area.priority === 'unassessed' ? 'unassessed (prioritize field inspection)' : area.priority;
    layout.text('Work-area planning priority  ' + priority + '  /  Evidence IDs  ' + labels(area.findingIds), 'detail');
    layout.text(area.rationale);
    if (!area.repairWorthy) layout.text('Outside the current repair candidate scope.', 'detail');
    if (!active) layout.text('All associated findings were rejected. Area excluded from repair selection.', 'detail');
    for (const treatment of survey.treatments.filter(item => item.workAreaId === area.id)) {
      layout.reserve(77);
      layout.gap(8);
      layout.text(treatment.label + '  /  ' + treatment.id, 'subheading');
      const use = orderedPlans.filter(plan => plan.optionIds.includes(treatment.id)).map(plan => plan.id);
      layout.text('Selected by  ' + labels(use) + '  /  Method  ' + treatment.method + '  /  Relative durability  ' + treatment.durability + '/3', 'detail');
      layout.text(treatment.eligibilityNote);
      showCost(layout, treatment.cost);
    }
  }

  if (!survey.findings.length) {
    layout.start('Finding evidence');
    layout.text('Finding evidence', 'heading');
    layout.text('No findings are recorded for this survey.');
  }
  for (const finding of survey.findings) {
    layout.start('Finding evidence  /  ' + finding.id);
    const closeup = await embedCloseup(pdf, finding.id, closeups.get(finding.id));
    showFinding(layout, finding, areasByFinding.get(finding.id), closeup);
  }

  layout.start('Sources and provenance');
  layout.text('Source register', 'heading');
  for (const source of survey.sources) {
    layout.reserve(57);
    layout.gap(5);
    const href = httpLink(source.url);
    layout.text(source.title, 'subheading', href);
    layout.text(source.id + '  /  ' + source.kind + '  /  ' + source.asOf, 'detail');
    layout.text(source.scopeNote, 'detail');
  }
  layout.reserve(54);
  layout.gap(8);
  layout.divider();
  layout.text('Video and analysis provenance', 'subheading');
  layout.text('Original video SHA-256  ' + survey.media.originalSha256, 'detail');
  layout.text(survey.analysis.model + '  /  ' + survey.analysis.createdAt, 'detail');
  layout.text(survey.analysis.method, 'detail');
  layout.text(survey.analysis.note, 'detail');
  showSharedCosts();
  layout.finish();
  return pdf.save();
}
