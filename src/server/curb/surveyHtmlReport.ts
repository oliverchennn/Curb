import { Buffer } from 'node:buffer';
import type { Cost, Finding, PlanId, RepairPlan, Survey } from '../../contracts/curb/survey';
import { costRange } from '../../domain/curb/survey';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const pngMagic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const policy: Record<PlanId, string> = {
  essential: 'Lowest-priced options for near-term work areas, subject to field confirmation of suitability.',
  balanced: 'Recommended repair options for eligible work areas.',
  durable: 'Highest-durability repair options for eligible work areas.',
  budget: 'Prioritizes high, then medium, low and unassessed work areas within the known upper cost bound. Quote-only treatments are outside the numerical budget selection.',
};

const budgetFit: Record<RepairPlan['budgetFit'], string> = {
  within: 'The estimated upper total fits the supplied budget.',
  partial: 'The known upper subtotal fits. Budget fit remains partial until quotes are obtained.',
  over: 'The known upper subtotal exceeds the supplied budget.',
  not_set: '',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => entities[character]);
}

function dollars(cents: number): string {
  return money.format(cents / 100);
}

function moneyRange(low: number, high: number): string {
  return low === high ? dollars(low) : dollars(low) + ' to ' + dollars(high);
}

function textList(items: readonly string[]): string {
  return items.length ? '<ul>' + items.map(item => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul>' : '<p>None.</p>';
}

function anchor(prefix: string, id: string, label = id): string {
  return '<a href="#' + escapeHtml(prefix + '-' + id) + '">' + escapeHtml(label) + '</a>';
}

function itemList(ids: string[], prefix: string, items: ReadonlyMap<string, { label: string }>): string {
  if (!ids.length) return '<p>None.</p>';
  return '<ul>' + ids.map(id => {
    const item = items.get(id)!;
    return '<li>' + anchor(prefix, id, item.label + ' (' + id + ')') + '</li>';
  }).join('') + '</ul>';
}

function sourceLink(value: string, title: string): string {
  const url = URL.parse(value);
  if (url?.protocol === 'https:' || url?.protocol === 'http:') {
    return '<a href="' + escapeHtml(url.href) + '" rel="noreferrer">' + escapeHtml(title) + '</a>';
  }
  return escapeHtml(title);
}

function closeupUri(id: string, bytes: Uint8Array | undefined): string {
  if (!bytes) throw new Error('Missing report close-up for ' + id);
  let mime: string;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) mime = 'image/jpeg';
  else if (pngMagic.every((byte, index) => bytes[index] === byte)) mime = 'image/png';
  else throw new Error('Unsupported report close-up for ' + id);
  return 'data:' + mime + ';base64,' + Buffer.from(bytes).toString('base64');
}

function planCostText(plan: RepairPlan, hasPricedItems: boolean): string {
  if (!plan.optionIds.length) return 'No work selected. No costs assigned.';
  const amount = moneyRange(plan.cost.lowCents, plan.cost.highCents);
  if (plan.cost.isComplete) return 'Complete estimate of ' + amount + '.';
  if (!hasPricedItems) return 'Quote required for all selected cost items.';
  return 'Partial estimate of ' + amount + ' for known costs, plus required quotes.';
}

function renderPlan(
  plan: RepairPlan,
  selected: boolean,
  areas: ReadonlyMap<string, Survey['workAreas'][number]>,
  treatments: ReadonlyMap<string, Survey['treatments'][number]>,
  sharedCosts: Survey['sharedCosts'],
): string {
  const { high, medium, low, unassessed } = plan.coverage;
  const applicableCosts = plan.optionIds.length ? [...plan.optionIds.map(id => treatments.get(id)!), ...sharedCosts] : [];
  const priced = applicableCosts.some(item => item.cost.status === 'estimated');
  const estimate = planCostText(plan, priced);
  return [
    '<article class="card" id="plan-' + plan.id + '">',
    '<h3>' + escapeHtml(plan.title) + '</h3>',
    selected ? '<p class="status"><strong>Selected plan for this report</strong></p>' : '',
    '<p>' + escapeHtml(policy[plan.id]) + '</p>',
    '<p><strong>' + escapeHtml(estimate) + '</strong></p>',
    plan.budgetCents !== null ? '<p><strong>Supplied budget</strong> ' + dollars(plan.budgetCents) + '. ' + escapeHtml(budgetFit[plan.budgetFit]) + '</p>' : '',
    '<p><strong>Work area coverage</strong> ' + high + ' high, ' + medium + ' medium, ' + low + ' low, ' + unassessed + ' unassessed.</p>',
    '<h4>Selected work areas</h4>' + itemList(plan.workAreaIds, 'area', areas),
    '<h4>Selected treatments</h4>' + itemList(plan.optionIds, 'treatment', treatments),
    '<h4>Deferred work areas</h4>' + itemList(plan.deferredWorkAreaIds, 'area', areas),
    '<h4>Items requiring quotes</h4>' + textList(plan.cost.unpricedItems),
    '</article>',
  ].join('\n');
}

function renderCost(cost: Cost): string {
  if (cost.status === 'quote_required') return '<p><strong>Quote required.</strong> ' + escapeHtml(cost.reason) + '</p>';
  const amount = costRange(cost)!;
  const quantity = cost.quantityLow === cost.quantityHigh ? String(cost.quantityLow) : cost.quantityLow + ' to ' + cost.quantityHigh;
  return [
    '<dl>',
    '<dt>Estimated item range</dt><dd>' + moneyRange(amount.lowCents, amount.highCents) + '</dd>',
    '<dt>Unit rate</dt><dd>' + moneyRange(cost.rateLowCents, cost.rateHighCents) + ' per ' + escapeHtml(cost.unit) + '</dd>',
    '<dt>Assumed quantity</dt><dd>' + quantity + ' (' + escapeHtml(cost.unit) + ')</dd>',
    '<dt>Estimate assumptions</dt><dd>' + textList(cost.assumptions) + '</dd>',
    '<dt>Estimate exclusions</dt><dd>' + textList(cost.exclusions) + '</dd>',
    '<dt>Cost sources</dt><dd>' + cost.sourceIds.map(id => anchor('source', id)).join(', ') + '</dd>',
    '</dl>',
  ].join('\n');
}

function renderArea(
  area: Survey['workAreas'][number],
  findings: ReadonlyMap<string, Finding>,
  treatments: Survey['treatments'],
): string {
  const active = area.findingIds.some(id => findings.get(id)!.review.status !== 'rejected');
  return [
    '<article class="card" id="area-' + escapeHtml(area.id) + '">',
    '<h3>' + escapeHtml(area.label) + '</h3>',
    '<p class="meta">Work area ID ' + escapeHtml(area.id) + '</p>',
    '<p><strong>Work-area planning priority</strong> ' + escapeHtml(area.priority) + (area.priority === 'unassessed' ? '. Prioritize field inspection.' : '.') + '</p>',
    '<p>' + escapeHtml(area.rationale) + '</p>',
    area.repairWorthy ? '' : '<p>Outside the current repair candidate scope.</p>',
    active ? '' : '<p>All associated findings were rejected. Area excluded from repair selection.</p>',
    '<h4>Associated findings</h4>' + itemList(area.findingIds, 'finding', findings),
    ...treatments.map(treatment => [
      '<div id="treatment-' + escapeHtml(treatment.id) + '" class="treatment">',
      '<h4>' + escapeHtml(treatment.label) + '</h4>',
      '<p class="meta">Treatment ID ' + escapeHtml(treatment.id)
        + ' · Method ' + escapeHtml(treatment.method) + ' · Relative durability ' + treatment.durability + '/3</p>',
      '<p>' + escapeHtml(treatment.eligibilityNote) + '</p>',
      renderCost(treatment.cost),
      '</div>',
    ].join('\n')),
    '</article>',
  ].join('\n');
}

function renderFinding(finding: Finding, area: Survey['workAreas'][number] | undefined, imageUri: string, fps: number): string {
  const { review, assessment, measurements } = finding;
  const evidenceTime = finding.evidenceTime.toFixed(2);
  const frame = Math.floor(finding.evidenceTime * fps + 1e-6);
  const alt = 'Video close-up of the walking surface. Recorded feature: ' + finding.kind + '.';
  return [
    '<article class="card" id="finding-' + escapeHtml(finding.id) + '">',
    '<h3>' + escapeHtml(finding.label) + '</h3>',
    '<p class="meta">Finding ID ' + escapeHtml(finding.id) + ' · Work area ' + (area ? anchor('area', area.id, area.label + ' (' + area.id + ')') : 'unassigned') + '</p>',
    '<p><strong>' + escapeHtml(finding.kind) + '</strong></p>',
    '<p>' + escapeHtml(finding.description) + '</p>',
    '<figure><img src="' + imageUri + '" alt="' + escapeHtml(alt) + '"><figcaption>Source video at '
      + evidenceTime + ' seconds, displayed frame ' + frame + ' · ' + escapeHtml(finding.id) + '</figcaption></figure>',
    '<h4>Finding review</h4>',
    '<dl><dt>Review status</dt><dd>' + escapeHtml(review.status)
      + '</dd><dt>Review method</dt><dd>' + (review.method === 'ai' ? 'AI-assisted' : 'Manual')
      + '</dd><dt>Reviewer</dt><dd>' + escapeHtml(review.reviewer)
      + '</dd><dt>Review note</dt><dd>' + escapeHtml(review.note) + '</dd></dl>',
    review.status === 'rejected' ? '<p>Excluded from repair selection. Evidence retained for review.</p>' : '',
    '<h4>Provisional finding priority</h4>',
    '<p><strong>' + escapeHtml(assessment.priority) + '</strong> · ' + escapeHtml(assessment.rationale) + '</p>',
    '<h4>Possible accessibility effects</h4>' + textList(assessment.accessImpacts),
    '<h4>Recorded measurements</h4>',
    measurements.length ? textList(measurements.map(m => m.property + ' · ' + m.value + ' ' + m.unit + ' · Method ' + m.method))
      : '<p>Measurements unknown. The survey contains no recorded values.</p>',
    '<h4>Site measurement checklist</h4>' + textList(assessment.measurementNeeds),
    '<h4>Technical references and checks</h4>',
    '<ul>' + assessment.checks.map(check => '<li>' + anchor('source', check.sourceId) + ' · ' + escapeHtml(check.section) + ' · '
      + (check.status === 'needs_measurement' ? 'Measurement needed' : 'Not assessed') + '. ' + escapeHtml(check.note) + '</li>').join('') + '</ul>',
    '<p>' + (finding.mapPosition ? 'Approximate map position. ' + escapeHtml(finding.mapPosition.note) : 'Finding position on map unknown.') + '</p>',
    '</article>',
  ].join('\n');
}

const styles = `
  :root { color-scheme: light; --paper: #fcfaf3; --ink: #243128; --forest: #234336; --soft: #edece2; --rule: #b3bcad; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--paper); color: var(--ink); font: 1rem/1.55 system-ui, sans-serif; overflow-wrap: anywhere; }
  header, main, .skip { width: min(100% - 2rem, 68rem); margin-inline: auto; }
  header { padding-block: 1.25rem; border-bottom: 1px solid var(--rule); }
  main { padding-bottom: 2.5rem; }
  h1, h2, h3, h4, dt { color: var(--forest); line-height: 1.25; }
  h1 { font-size: clamp(1.7rem, 5vw, 2.7rem); margin: .65rem 0; }
  h2 { font-size: 1.55rem; margin-top: 2rem; }
  h3 { font-size: 1.25rem; margin: 0 0 .5rem; }
  h4 { font-size: 1.05rem; margin: .95rem 0 .25rem; }
  p, ul, dl { margin: .35rem 0 .65rem; }
  ul { padding-inline-start: 1.5rem; }
  nav ul { display: flex; flex-wrap: wrap; gap: .4rem 1.25rem; }
  a { color: #174a63; text-decoration: underline; text-underline-offset: .15em; }
  a:focus-visible, main:focus-visible { outline: 3px solid #854700; outline-offset: 3px; }
  .skip { display: block; margin-top: .5rem; }
  .meta { color: #46534a; }
  .status { color: #764210; }
  .card { padding: 1rem; margin: .75rem 0 1rem; background: #fff; border: 1px solid var(--rule); border-radius: .35rem; }
  .treatment, .shared { margin-top: .9rem; padding-top: .75rem; border-top: 1px solid var(--rule); }
  dt { font-weight: 650; margin-top: .4rem; }
  dd { margin: 0 0 .4rem; }
  figure { margin: .8rem 0; }
  img { display: block; max-width: 100%; max-height: 22rem; object-fit: contain; }
  figcaption { margin-top: .4rem; color: #46534a; }
  code { overflow-wrap: anywhere; }
  :target { scroll-margin-block: 1rem; }
  @page { margin: 14mm; }
  @media print {
    body { font-size: 10pt; color: #000; background: #fff; }
    .skip, nav { display: none; }
    header, main { width: auto; }
    .card { border-radius: 0; padding: .7rem; }
    h1, h2, h3, h4, dt { break-after: avoid; }
    figure { break-inside: avoid; }
    img { max-height: 55mm; }
  }
`;

export function renderSurveyHtmlReport(
  survey: Survey,
  plans: RepairPlan[],
  selectedPlanId: PlanId,
  closeups: ReadonlyMap<string, Uint8Array>,
): string {
  const selected = plans.find(plan => plan.id === selectedPlanId);
  if (!selected) throw new Error('Selected plan is missing from the survey report');
  const orderedPlans = [selected, ...plans.filter(plan => plan.id !== selectedPlanId)];
  const areas = new Map(survey.workAreas.map(area => [area.id, area]));
  const treatments = new Map(survey.treatments.map(item => [item.id, item]));
  const findings = new Map(survey.findings.map(finding => [finding.id, finding]));
  const areasByFinding = new Map(survey.workAreas.flatMap(area => area.findingIds.map(id => [id, area] as const)));
  const pending = survey.findings.filter(finding => finding.review.status === 'pending').length;
  const rejected = survey.findings.filter(finding => finding.review.status === 'rejected');

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data:; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'">',
    '<title>' + escapeHtml(survey.title) + ' | Curb repair report</title>',
    '<style>' + styles + '</style>',
    '</head>',
    '<body>',
    '<a class="skip" href="#main">Skip to report</a>',
    '<header>',
    '<h1>' + escapeHtml(survey.title) + '</h1>',
    '<p class="meta">' + escapeHtml(survey.site.name) + ' · Survey ' + escapeHtml(survey.id) + ' · Revision ' + survey.revision + '</p>',
    '<nav aria-label="Report sections"><ul>',
    '<li><a href="#plans">Plan comparison</a></li>',
    '<li><a href="#work-areas">Work areas and estimates</a></li>',
    '<li><a href="#findings">Finding evidence</a></li>',
    '<li><a href="#sources">Sources and provenance</a></li>',
    '</ul></nav>',
    '</header>',
    '<main id="main" tabindex="-1">',
    '<section id="plans" aria-labelledby="plans-heading">',
    '<h2 id="plans-heading">Plan comparison</h2>',
    '<p>' + escapeHtml(survey.site.locationNote) + '</p>',
    '<p><strong>Route impact unknown.</strong> ' + escapeHtml(survey.routeAssessment.note) + '</p>',
    '<p>Overall ADA compliance remains undetermined. Confirm applicability, measurements and treatment suitability in the field.</p>',
    pending ? '<p><strong>Provisional plans.</strong> ' + pending + (pending === 1 ? ' finding remains' : ' findings remain') + ' pending review.</p>' : '',
    rejected.length ? '<p><strong>Rejected evidence excluded from planning.</strong> ' + rejected.map(f => anchor('finding', f.id, f.label + ' (' + f.id + ')')).join(', ') + '</p>' : '',
    orderedPlans.some(plan => plan.cost.unpricedItems.length) ? '<p>Partial subtotals cannot rank full project costs while items still need quotes.</p>' : '',
    ...orderedPlans.map(plan => renderPlan(plan, plan.id === selectedPlanId, areas, treatments, survey.sharedCosts)),
    '</section>',
    '<section id="work-areas" aria-labelledby="work-areas-heading">',
    '<h2 id="work-areas-heading">Work areas and estimates</h2>',
    '<p>Estimate ranges use assumed quantities. Source records below describe benchmark scope and dates.</p>',
    survey.workAreas.length ? '' : '<p>No work areas are recorded.</p>',
    ...survey.workAreas.map(area => renderArea(area, findings, survey.treatments.filter(treatment => treatment.workAreaId === area.id))),
    survey.sharedCosts.length ? '<h3>Shared site costs</h3><p>Each shared item applies once per plan with selected work.</p>' : '',
    ...survey.sharedCosts.map(item => '<div class="shared"><h4>' + escapeHtml(item.label) + '</h4><p class="meta">Shared cost ID '
      + escapeHtml(item.id) + '</p>' + renderCost(item.cost) + '</div>'),
    '</section>',
    '<section id="findings" aria-labelledby="findings-heading">',
    '<h2 id="findings-heading">Finding evidence</h2>',
    survey.findings.length ? '' : '<p>No findings are recorded for this survey.</p>',
    ...survey.findings.map(finding => renderFinding(finding, areasByFinding.get(finding.id), closeupUri(finding.id, closeups.get(finding.id)), survey.media.fps)),
    '</section>',
    '<section id="sources" aria-labelledby="sources-heading">',
    '<h2 id="sources-heading">Sources and provenance</h2>',
    '<h3>Source register</h3>',
    survey.sources.map(source => '<div class="shared" id="source-' + escapeHtml(source.id) + '"><h4>' + sourceLink(source.url, source.title) + '</h4><p class="meta">'
      + escapeHtml(source.id) + ' · ' + escapeHtml(source.kind) + ' · ' + escapeHtml(source.asOf)
      + '</p><p>' + escapeHtml(source.scopeNote) + '</p><p class="meta">' + escapeHtml(source.url) + '</p></div>').join('\n'),
    '<div class="shared"><h3>Video and analysis provenance</h3>',
    '<p>Original video SHA-256 <code>' + escapeHtml(survey.media.originalSha256) + '</code></p>',
    '<p>Analysis model ' + escapeHtml(survey.analysis.model) + ' · <time datetime="' + escapeHtml(survey.analysis.createdAt) + '">'
      + escapeHtml(survey.analysis.createdAt) + '</time></p>',
    '<p>' + escapeHtml(survey.analysis.method) + '</p>',
    '<p>' + escapeHtml(survey.analysis.note) + '</p></div>',
    '</section>',
    '</main>',
    '</body>',
    '</html>',
  ].join('\n');
}
