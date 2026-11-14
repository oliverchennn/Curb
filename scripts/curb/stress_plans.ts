/** Local, bounded Developer D stress check. No HTTP load, mocks, or fixture writes.
 * Run from the repository root: node --import tsx scripts/curb/stress_plans.ts
 * Optional --seed <uint32> --cases <1..256>. Receipts stay in .curb-local/stress-d/.
 * Synthetic domain cases are never submitted as the saved Robertson survey.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { PDFDocument, PDFDict, PDFName, PDFRawStream } from 'pdf-lib';
import { SurveySchema, type Survey, type Treatment, type Cost, type Priority, type RepairPlan } from '../../src/contracts/curb/survey';
import { buildRepairPlans } from '../../src/domain/curb/survey';
import { setAreaPriority, setReviewStatus, correctFinding } from '../../src/features/curb/survey/presentation';
import { GET } from '../../app/api/curb/survey/route';
import { POST } from '../../app/api/curb/survey/report/route';

const args = process.argv.slice(2);
let seed = 0x43555242, randomCases = 120;
for (let i = 0; i < args.length; i += 2) {
  const value = Number(args[i + 1]);
  if (args[i] === '--seed' && Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff) seed = value;
  else if (args[i] === '--cases' && Number.isInteger(value) && value >= 1 && value <= 256) randomCases = value;
  else throw new Error('Usage: --seed <uint32> --cases <1..256>');
}
let state = seed;
function random(): number { // Mulberry32; bounded deterministic input generation, not cryptography.
  let t = state += 0x6D2B79F5;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
const integer = (n: number) => Math.floor(random() * n);
const pick = <T>(xs: readonly T[]): T => xs[integer(xs.length)];
const sorted = (xs: readonly string[]) => [...xs].sort();
const priorities: Priority[] = ['high', 'medium', 'low', 'unassessed'];
const sha = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const clone = <T>(value: T): T => structuredClone(value);
const startedAt = new Date().toISOString(), start = performance.now();
const output = join(process.cwd(), '.curb-local', 'stress-d', String(seed));
await mkdir(output, { recursive: true });
const canonicalPath = 'src/data/curb/surveys/robertson-hall.json';
const canonical = SurveySchema.parse(JSON.parse(await readFile(canonicalPath, 'utf8')));
const metrics = { domainCases: 0, budgetComparisons: 0, planComparisons: 0, plannerCalls: 0,
  oracleMasks: 0, compatibleScopes: 0, assertions: 0, permutationChecks: 0, deterministicChecks: 0,
  invalidBoundaries: 0, handlerRequests: 0, htmlResponses: 0, pdfResponses: 0,
  rejectedResponses: 0, handlerPlanComparisons: 0, embeddedPhotoChecks: 0, canonicalGetChecks: 0 };
let peakRss = process.memoryUsage().rss;
const failures: { label: string; error: string; reproduction: string }[] = [];
const digest = createHash('sha256');
function equal(actual: unknown, expected: unknown, message: string) {
  metrics.assertions++; assert.deepStrictEqual(actual, expected, message);
}
function ok(condition: unknown, message: string): asserts condition {
  metrics.assertions++; assert.ok(condition, message);
}
function freeze(value: unknown) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value); for (const item of Object.values(value)) freeze(item);
  }
}
async function check(label: string, reproduction: unknown, action: () => void | Promise<void>) {
  // The harness is deliberately finite; a slow run fails rather than escalating load.
  if (performance.now() - start > 180_000) throw new Error('Local 180-second stress bound exceeded');
  try { await action(); }
  catch (error) {
    const file = `failure-${String(failures.length + 1).padStart(3, '0')}.json`;
    const message = error instanceof Error ? error.message : String(error);
    failures.push({ label, error: message, reproduction: file });
    await writeFile(join(output, file), JSON.stringify({ seed, label, input: reproduction, error: message }, null, 2) + '\n');
    console.error(`FAIL ${label}: ${message.slice(0, 300)}`);
  }
  peakRss = Math.max(peakRss, process.memoryUsage().rss);
}

// Independent money oracle: interpret JSON decimal quantities as rational values,
// then round with integer division. It does not call production costRange.
function decimal(value: number): [bigint, bigint] {
  const [mantissa, exponentText = '0'] = value.toString().toLowerCase().split('e');
  const [whole, fraction = ''] = mantissa.split('.');
  const scale = fraction.length - Number(exponentText);
  const numerator = BigInt(whole + fraction);
  return scale < 0 ? [numerator * 10n ** BigInt(-scale), 1n] : [numerator, 10n ** BigInt(scale)];
}
function range(cost: Cost): [number, number] | null {
  if (cost.status === 'quote_required') return null;
  const [lo, ld] = decimal(cost.quantityLow), [hi, hd] = decimal(cost.quantityHigh);
  return [Number(BigInt(cost.rateLowCents) * lo / ld),
    Number((BigInt(cost.rateHighCents) * hi + hd - 1n) / hd)];
}
const quote: Cost = { status: 'quote_required', reason: 'SYNTHETIC stress quote, not a field price' };
function money(low: number, high = low, quantityLow = 1, quantityHigh = quantityLow): Cost {
  return { status: 'estimated', rateLowCents: low, rateHighCents: high, quantityLow, quantityHigh,
    unit: 'synthetic unit', sourceIds: [canonical.sources[0].id],
    assumptions: ['Synthetic stress input, no observed quantity or current quote'], exclusions: [] };
}
function eligible(s: Survey) {
  return s.workAreas.filter(a => a.repairWorthy && s.findings.some(f => a.findingIds.includes(f.id) && f.review.status !== 'rejected'));
}
type Ref = { ids: string[]; areas: string[]; deferred: string[]; excluded: string[]; pending: string[];
  low: number; high: number; quotes: string[]; coverage: number[]; durability: number };
function summary(s: Survey, chosen: Treatment[]): Ref {
  const selectedAreas = chosen.map(t => t.workAreaId);
  const charges = chosen.length ? [...chosen, ...s.sharedCosts] : [];
  const amounts = charges.map(x => range(x.cost)).filter((x): x is [number, number] => x !== null);
  return { ids: sorted(chosen.map(t => t.id)), areas: sorted(selectedAreas),
    deferred: sorted(eligible(s).filter(a => !selectedAreas.includes(a.id)).map(a => a.id)),
    excluded: sorted(s.findings.filter(f => f.review.status === 'rejected').map(f => f.id)),
    pending: sorted([...new Set(s.findings.filter(f => f.review.status !== 'rejected')
      .flatMap(f => f.assessment.measurementNeeds.map(n => `${f.label}: ${n}`)))]),
    low: amounts.reduce((n, r) => n + r[0], 0), high: amounts.reduce((n, r) => n + r[1], 0),
    quotes: sorted(charges.filter(x => x.cost.status === 'quote_required').map(x => x.id)),
    coverage: priorities.map(p => eligible(s).filter(a => a.priority === p && selectedAreas.includes(a.id)).length),
    durability: chosen.reduce((n, t) => n + t.durability, 0) };
}
function compareTuple(a: (number | string)[], b: (number | string)[]): number {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  return 0;
}
function rank(r: Ref): (number | string)[] { return [...r.coverage.map(x => -x), -r.durability, r.high, r.ids.join('|')]; }
function enumerate(s: Survey): Ref[] {
  const active = new Set(eligible(s).map(a => a.id));
  const options = s.treatments.filter(t => active.has(t.workAreaId) && t.method !== 'inspect' && t.cost.status === 'estimated');
  // Deliberately distinct from production's per-area Cartesian expansion:
  // inspect every treatment bitmask and discard incompatible repeated areas.
  const rows: Ref[] = [];
  for (let mask = 0; mask < 2 ** options.length; mask++) {
    metrics.oracleMasks++;
    const chosen: Treatment[] = [], used = new Set<string>();
    let compatible = true;
    for (let i = 0; i < options.length; i++) if ((mask & (1 << i)) !== 0) {
      if (used.has(options[i].workAreaId)) { compatible = false; break; }
      used.add(options[i].workAreaId); chosen.push(options[i]);
    }
    if (compatible) rows.push(summary(s, chosen));
  }
  metrics.compatibleScopes += rows.length;
  return rows.sort((a, b) => compareTuple(rank(a), rank(b)));
}
function policies(s: Survey): Ref[] {
  const candidates = (area: string) => s.treatments.filter(t => t.workAreaId === area && t.method !== 'inspect');
  const upper = (t: Treatment) => range(t.cost)?.[1] ?? Infinity;
  const choose = (kind: 'essential' | 'balanced' | 'durable') => eligible(s).flatMap(a => {
    if (kind === 'essential' && !a.nearTerm) return [];
    const options = candidates(a.id);
    const chosen = kind === 'balanced' ? options.find(t => t.id === a.recommendedOptionId)
      : options.sort((a, b) => compareTuple(kind === 'essential' ? [upper(a), -a.durability, a.id] : [-a.durability, upper(a), a.id],
        kind === 'essential' ? [upper(b), -b.durability, b.id] : [-b.durability, upper(b), b.id]))[0];
    return chosen ? [chosen] : [];
  });
  return ['essential', 'balanced', 'durable'].map(k => summary(s, choose(k as 'essential' | 'balanced' | 'durable')));
}
function comparePlan(plan: RepairPlan, ref: Ref, s: Survey, budget?: number) {
  metrics.planComparisons++;
  equal(plan.optionIds, ref.ids, 'selected option IDs'); equal(plan.workAreaIds, ref.areas, 'selected area IDs');
  equal(sorted(plan.deferredWorkAreaIds), ref.deferred, 'deferred needs retained');
  equal(sorted(plan.excludedFindingIds), ref.excluded, 'rejected evidence retained');
  equal(sorted(plan.pendingChecks), ref.pending, 'measurement needs retained');
  equal([plan.cost.lowCents, plan.cost.highCents], [ref.low, ref.high], 'outward-rounded exact cost range');
  equal(plan.cost.isComplete, ref.quotes.length === 0, 'quote items never become a complete price');
  equal(plan.cost.unpricedItems.length, ref.quotes.length, 'each unpriced selected/shared item appears once');
  for (const id of ref.quotes) equal(plan.cost.unpricedItems.filter(x => x.includes(`(${id}):`)).length, 1, `quote ${id}`);
  equal(priorities.map(p => plan.coverage[p]), ref.coverage, 'priority coverage');
  equal(plan.durability, ref.durability, 'durability'); equal(plan.routeImpact, s.routeAssessment, 'route stays unknown');
  equal(plan.budgetCents, budget ?? null, 'budget identity');
  equal(plan.budgetFit, budget === undefined ? 'not_set' : ref.high > budget ? 'over' : ref.quotes.length ? 'partial' : 'within', 'honest budget fit');
  equal(new Set(plan.workAreaIds).size, plan.optionIds.length, 'incompatible options excluded');
}
function evaluate(s: Survey, budget?: number) { metrics.plannerCalls++; return buildRepairPlans(s, budget); }
function semantic(plans: RepairPlan[]) {
  return plans.map(p => ({ ...p, deferredWorkAreaIds: sorted(p.deferredWorkAreaIds),
    excludedFindingIds: sorted(p.excludedFindingIds), pendingChecks: sorted(p.pendingChecks),
    cost: { ...p.cost, unpricedItems: sorted(p.cost.unpricedItems) } }));
}
function synthetic(counts: number[], findingCount = counts.length): Survey {
  const s = clone(canonical);
  s.title = 'SYNTHETIC bounded planner stress — not field observations';
  s.findings = Array.from({ length: findingCount }, (_, i) => {
    const f = clone(canonical.findings[i % canonical.findings.length]);
    f.id = `stress-finding-${i}`; f.label = `Synthetic finding ${i}`;
    f.track = [f.track.find(k => k.frame === Math.floor(f.evidenceTime * s.media.fps + 1e-6))!];
    return f;
  });
  s.workAreas = counts.map((_, i) => ({ ...clone(canonical.workAreas[0]), id: `stress-area-${i}`,
    label: `Synthetic area ${i}`, findingIds: s.findings.filter((_, j) => j % counts.length === i).map(f => f.id),
    priority: priorities[i % 4], nearTerm: true, recommendedOptionId: `stress-option-${i}-0` }));
  s.treatments = counts.flatMap((count, i) => Array.from({ length: count }, (_, j) => ({
    id: `stress-option-${i}-${j}`, workAreaId: `stress-area-${i}`, label: `Synthetic option ${i}/${j}`,
    method: (['seal', 'patch', 'replace'] as const)[j % 3], durability: j % 4,
    eligibilityNote: 'Synthetic eligible option; no field suitability claim', cost: money(7 + i + j, 20 + i * 3 + j * 10),
  })));
  s.sharedCosts = [{ id: 'stress-setup', label: 'Synthetic shared setup', cost: money(3, 7) }];
  return s;
}
function generated(): Survey {
  const counts = Array.from({ length: 1 + integer(5) }, () => 1 + integer(3));
  const s = synthetic(counts, counts.length + integer(7));
  s.findings.forEach(f => { f.review = { status: pick(['accepted', 'pending', 'rejected'] as const),
    method: 'manual', reviewer: 'Synthetic D reviewer', note: 'Generated review state only' }; });
  s.workAreas.forEach(a => { a.priority = pick(priorities); a.nearTerm = random() < .6; a.repairWorthy = random() < .85;
    a.recommendedOptionId = pick(s.treatments.filter(t => t.workAreaId === a.id)).id; });
  s.treatments.forEach(t => {
    t.method = pick(['seal', 'patch', 'replace', 'inspect'] as const); t.durability = integer(4);
    const low = integer(401), high = low + integer(601);
    const q = pick([.25, .5, .75, 1, 1.25, 1.5, 2, 2.5]);
    t.cost = random() < .3 ? clone(quote) : money(low, high, q, q + pick([0, .25, 1]));
  });
  s.sharedCosts = Array.from({ length: integer(4) }, (_, i) => ({ id: `stress-shared-${i}`,
    label: `Synthetic shared ${i}`, cost: random() < .4 ? clone(quote) : money(integer(101), 200 + integer(201)) }));
  return s;
}
const named: [string, Survey][] = [];
function fixture(name: string, counts: number[], mutate: (s: Survey) => void = () => {}, findings = counts.length) {
  const s = synthetic(counts, findings); mutate(s); named.push([name, s]);
}
fixture('eighteen-options-4096-scopes', [3, 3, 3, 3, 3, 3]);
fixture('twelve-areas-4096-scopes', Array(12).fill(1));
fixture('fifty-grouped-findings', Array(12).fill(1), () => {}, 50);
fixture('eighteen-including-inspection', Array(12).fill(1), s => {
  s.treatments.slice(6).forEach(t => { t.method = 'inspect'; });
  s.treatments.push(...s.treatments.slice(0, 6).map(t => ({ ...clone(t), id: t.id + '-inspect', method: 'inspect' as const })));
});
fixture('quote-only-needs', [2, 2, 2], s => { s.treatments.forEach(t => { t.cost = clone(quote); }); });
fixture('inspection-only-needs', [2, 2, 2], s => { s.treatments.forEach(t => { t.method = 'inspect'; t.cost = money(0); }); });
fixture('zero-price-unknown-shared', [2, 2, 2], s => { s.treatments.forEach(t => { t.cost = money(0); }); s.sharedCosts[0].cost = clone(quote); });
fixture('twelve-shared-charges-once', [2, 2, 2], s => { s.sharedCosts = Array.from({ length: 12 }, (_, i) => ({
  id: `stress-shared-${i}`, label: `Shared ${i}`, cost: i % 3 ? money(i, i + 2) : clone(quote) })); });
fixture('all-rejected', [2, 2, 2], s => { s.findings.forEach(f => { f.review.status = 'rejected'; }); });
fixture('all-outside-repair-scope', [2, 2, 2], s => { s.workAreas.forEach(a => { a.repairWorthy = false; }); });
fixture('mixed-group-rejections', [2, 2], s => { s.findings[0].review.status = 'rejected'; s.findings[1].review.status = 'rejected'; }, 5);
fixture('equal-cost-durability-id-ties', [3, 3, 3], s => { s.treatments.forEach(t => { t.cost = money(5); t.durability = 2; }); s.sharedCosts = []; });
fixture('contract-cost-ceiling', [1, 1, 1], s => { s.treatments.forEach(t => { t.cost = money(100_000_000, 100_000_000, 10000); }); });
fixture('empty-catalog', [], s => { s.sharedCosts[0].cost = clone(quote); }, 0);
fixture('decimal-exact-110-cents', [1], s => { s.sharedCosts = []; s.treatments[0].cost = money(100, 100, 1.1); });
fixture('decimal-exact-29-cents', [1], s => { s.sharedCosts = []; s.treatments[0].cost = money(100, 100, .29); });

async function domainCase(name: string, s: Survey) {
  metrics.domainCases++;
  await check(`domain/${name}`, s, () => {
    SurveySchema.parse(s); const before = JSON.stringify(s); freeze(s);
    const rows = enumerate(s), referencePolicies = policies(s);
    if (name === 'eighteen-options-4096-scopes' || name === 'twelve-areas-4096-scopes' || name === 'fifty-grouped-findings') {
      equal(rows.length, 4096, 'independent oracle reaches the compatible-scope ceiling');
    }
    const totals = [...new Set(rows.map(r => r.high))].sort((a, b) => a - b);
    const threshold = totals[Math.floor(totals.length / 2)];
    const budgets = [...new Set([0, 1, 100_000_000, integer(3000), threshold - 1, threshold, threshold + 1])]
      .filter(n => Number.isSafeInteger(n) && n >= 0 && n <= 100_000_000);
    for (const budget of budgets) {
      const actual = evaluate(s, budget); equal(actual.length, 4, 'three policies plus budget');
      for (let i = 0; i < 3; i++) comparePlan(actual[i], referencePolicies[i], s);
      const best = rows.find(r => r.high <= budget)!; comparePlan(actual[3], best, s, budget);
      metrics.budgetComparisons++; digest.update(JSON.stringify([name, budget, semantic(actual)]));
    }
    const first = evaluate(s, budgets[budgets.length - 1]);
    equal(evaluate(s, budgets[budgets.length - 1]), first, 'repeat deterministic'); metrics.deterministicChecks++;
    const reordered = clone(s); reordered.findings.reverse(); reordered.workAreas.reverse(); reordered.treatments.reverse(); reordered.sharedCosts.reverse();
    equal(semantic(evaluate(reordered, budgets[budgets.length - 1])), semantic(first), 'array order does not change plan semantics'); metrics.permutationChecks++;
    equal(JSON.stringify(s), before, 'input and source evidence immutable');
  });
}

const evidencePaths = [...new Set([canonicalPath, 'src/data/curb/surveys/robertson-analysis.json',
  'src/data/curb/surveys/robertson-tracks.json', ...Object.values(canonical.media).filter((x): x is string => typeof x === 'string' && x.startsWith('/curb/')).map(x => 'public' + x),
  ...canonical.findings.map(f => 'public' + f.closeupSrc)])];
async function evidenceHashes() { return Object.fromEntries(await Promise.all(evidencePaths.map(async path => [path, sha(await readFile(path))]))); }
const hashesBefore = await evidenceHashes();
await check('oracle/calibration', null, () => {
  equal(range(money(100, 100, 1.1)), [110, 110], 'decimal integer-cent calibration');
  equal(range(money(100, 100, .29)), [29, 29], 'decimal lower-bound calibration');
  equal(range(money(101, 103, 1.1)), [111, 114], 'outward fractional-cent calibration');
  const s = synthetic([1, 1]); s.sharedCosts = [{ id: 'setup', label: 'Setup', cost: money(3) }];
  s.treatments.forEach(t => { t.cost = money(5); t.durability = 1; });
  const rows = enumerate(s);
  equal(rows.length, 4, 'two independent choices yield four legal subsets');
  equal(rows.find(r => r.high <= 7)!.ids, [], 'setup makes either option unaffordable at seven cents');
  equal(rows.find(r => r.high <= 8)!.ids, ['stress-option-0-0'], 'high-priority option beats medium at eight cents');
  equal(rows.find(r => r.high <= 13)!.ids, ['stress-option-0-0', 'stress-option-1-0'], 'setup charged once at thirteen cents');
});
for (const [name, s] of named) await domainCase(name, s);
for (let i = 0; i < randomCases; i++) {
  await domainCase(`seeded-${i}`, generated());
  if ((i + 1) % 30 === 0) console.log(`Domain progress ${i + 1}/${randomCases}; failures ${failures.length}`);
}

const invalid: [string, Survey][] = [];
const tooMany = synthetic([3, 3, 3, 3, 3, 3]);
tooMany.treatments.push({ ...clone(tooMany.treatments[0]), id: 'nineteenth-option', method: 'inspect' });
invalid.push(['nineteen-options', tooMany], ['6144-compatible-scopes', synthetic([2, ...Array(11).fill(1)])],
  ['thirteen-areas', synthetic(Array(13).fill(1))]);
const duplicate = synthetic([1, 1]); duplicate.workAreas[1].findingIds.push(duplicate.findings[0].id); invalid.push(['multiply-grouped-finding', duplicate]);
for (const [label, s] of invalid) await check(`invalid/${label}`, s, () => {
  metrics.invalidBoundaries++; equal(SurveySchema.safeParse(s).success, false, 'invalid catalog rejected');
  metrics.plannerCalls++; assert.throws(() => buildRepairPlans(s, 100));
});
for (const budget of [-1, .5, NaN, Infinity, 100_000_001]) await check(`invalid/budget-${String(budget)}`, { budget: String(budget) }, () => {
  metrics.invalidBoundaries++; metrics.plannerCalls++; assert.throws(() => buildRepairPlans(canonical, budget));
});

const photos = new Map(await Promise.all(canonical.findings.map(async f => [f.id, sha(await readFile('public' + f.closeupSrc))] as const)));
const escape = (text: string) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const moneyText = (cents: number) => '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function htmlCheck(html: string, s: Survey, budget: number) {
  const expected = [...policies(s), enumerate(s).find(r => r.high <= budget)!];
  const articles = ['essential', 'balanced', 'durable', 'budget'].map(id => html.match(new RegExp('<article class="card" id="plan-' + id + '">([\\s\\S]*?)</article>'))?.[1]);
  articles.forEach((article, i) => {
    ok(article, `HTML plan ${i} exists`); const ref = expected[i];
    const sectionIds = (start: string, end: string, prefix: string) => sorted([...article.split(start)[1].split(end)[0].matchAll(new RegExp('href="#' + prefix + '-([^"#]+)"', 'g'))].map(m => m[1]));
    equal(sectionIds('<h4>Selected work areas</h4>', '<h4>Selected treatments</h4>', 'area'), ref.areas, 'HTML selected areas');
    equal(sectionIds('<h4>Selected treatments</h4>', '<h4>Deferred work areas</h4>', 'treatment'), ref.ids, 'HTML selected options');
    equal(sectionIds('<h4>Deferred work areas</h4>', '<h4>Items requiring quotes</h4>', 'area'), ref.deferred, 'HTML deferred needs');
    ok(article.includes(`${ref.coverage[0]} high, ${ref.coverage[1]} medium, ${ref.coverage[2]} low, ${ref.coverage[3]} unassessed.`), 'HTML coverage');
    const hasPricedCharge = [...s.treatments.filter(t => ref.ids.includes(t.id)), ...s.sharedCosts].some(t => t.cost.status === 'estimated');
    if (!ref.ids.length) ok(article.includes('No work selected. No costs assigned.'), 'empty plan explicit');
    else if (!hasPricedCharge) {
      ok(article.includes('Quote required for all selected cost items.'), 'all-unpriced work stays quote-only');
      ok(!article.includes('$0.00'), 'quote-only scope is not presented as free');
    } else { ok(article.includes(moneyText(ref.low)), 'HTML low cents'); ok(article.includes(moneyText(ref.high)), 'HTML high cents'); }
    for (const id of ref.quotes) equal(article.split(`(${id}):`).length - 1, 1, 'HTML quote once');
    if (i === 3) ok(article.includes(ref.quotes.length ? 'Budget fit remains partial' : 'The estimated upper total fits'), 'HTML budget qualification');
    metrics.handlerPlanComparisons++;
  });
  const images = [...html.matchAll(/<figure><img src="data:image\/(?:jpeg|png);base64,([^"]+)"[^>]*><figcaption>([^<]+)<\/figcaption><\/figure>/g)];
  equal(images.length, canonical.findings.length, 'all original evidence retained');
  images.forEach(([_, bytes, caption], i) => { const f = canonical.findings[i];
    equal(sha(Buffer.from(bytes, 'base64')), photos.get(f.id), 'immutable photo bytes'); ok(caption.endsWith(f.id), 'immutable evidence ID'); metrics.embeddedPhotoChecks++; });
  for (const f of s.findings) {
    const article = html.match(new RegExp('<article class="card" id="finding-' + f.id + '">([\\s\\S]*?)</article>'))?.[1];
    ok(article, 'review stays attached to its evidence ID');
    for (const text of [f.label, f.kind, f.description, f.review.reviewer, f.review.note]) ok(article.includes(escape(text)), 'allowed review text preserved and escaped');
    ok(article.includes('<dt>Review status</dt><dd>' + f.review.status + '</dd>'), 'finding review status preserved');
    ok(article.includes('<dt>Review method</dt><dd>' + (f.review.method === 'ai' ? 'AI-assisted' : 'Manual') + '</dd>'), 'AI/manual attribution preserved');
  }
  ok(!/<script\b|<img\s+src="?x\b/i.test(html), 'no injected script or image elements');
  ok(html.includes('Route impact unknown.') && html.includes('Overall ADA compliance remains undetermined.'), 'field uncertainty preserved');
}
async function pdfCheck(bytes: Uint8Array) {
  const document = await PDFDocument.load(bytes), imageHashes: string[] = [];
  for (const page of document.getPages()) {
    const objects = page.node.Resources()?.lookupMaybe(PDFName.of('XObject'), PDFDict);
    if (!objects) continue;
    for (const [, ref] of objects.entries()) {
      const stream = document.context.lookup(ref);
      if (stream instanceof PDFRawStream && stream.dict.get(PDFName.of('Subtype')) === PDFName.of('Image')) imageHashes.push(sha(stream.getContents()));
    }
  }
  equal(sorted(imageHashes), sorted([...photos.values()]), 'PDF retains exactly the canonical five closeups');
  metrics.embeddedPhotoChecks += imageHashes.length;
}
async function post(survey: Survey, format: 'html' | 'pdf', budget = 150000): Promise<Response> {
  metrics.handlerRequests++;
  return POST(new Request(`http://localhost/api/curb/survey/report?format=${format}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ survey, budgetCents: budget, planId: 'budget' }),
  }));
}
async function canonicalGet() {
  metrics.canonicalGetChecks++;
  const response = await GET(new Request('http://localhost/api/curb/survey'));
  equal(response.status, 200, 'canonical GET status'); equal(response.headers.get('cache-control'), 'no-store', 'GET no-store');
  equal((await response.json()).data, canonical, 'canonical GET remains unchanged');
}
await check('handler/canonical-before', null, canonicalGet);
const allowed: [string, Survey][] = [['unchanged', clone(canonical)]];
for (let i = 0; i < 24; i++) {
  let s = clone(canonical);
  for (const f of canonical.findings) {
    const review = setReviewStatus(s, f.id, pick(['pending', 'accepted', 'rejected'] as const), 'D 王小明 <&>');
    if (!review.ok) throw new Error(review.message); s = review.survey;
  }
  const corrected = correctFinding(s, canonical.findings[i % 5].id, {
    label: `Stress ${i} <script>alert(1)</script>`, kind: 'Crack <&> reviewed',
    description: 'Unicode access review 🦽; no dimensional observation. "quoted" & <markup>',
  }, 'D 王小明');
  if (!corrected.ok) throw new Error(corrected.message); s = corrected.survey;
  for (const area of s.workAreas) {
    const edited = setAreaPriority(s, area.id, pick(priorities), 'D 王小明', `Stress review ${i}: field measurement still required.`);
    if (!edited.ok) throw new Error(edited.message); s = edited.survey;
  }
  allowed.push([`seeded-review-${i}`, s]);
}
for (const [index, [name, s]] of allowed.entries()) {
  for (const format of (index % 3 === 0 ? ['html', 'pdf'] : ['html']) as ('html' | 'pdf')[]) await check(`handler/allowed/${name}/${format}`, s, async () => {
    const before = JSON.stringify(s), budget = [0, 47799, 47800, 150000, 229400][index % 5];
    const response = await post(s, format, budget); equal(response.status, 200, 'allowed review accepted');
    equal(response.headers.get('cache-control'), 'no-store', 'report no-store');
    if (format === 'html') { metrics.htmlResponses++; htmlCheck(await response.text(), s, budget); }
    else { metrics.pdfResponses++; await pdfCheck(new Uint8Array(await response.arrayBuffer())); }
    equal(JSON.stringify(s), before, 'submitted object unchanged');
    digest.update(JSON.stringify([name, format, budget]));
  });
}

// Start from a valid, named manual review so permitted edits cannot conceal an
// immutable source mutation. These are real handlers and real disk assets.
const mutations: [string, (s: Survey) => void][] = [
  ['source-hash', s => { s.media.originalSha256 = '0'.repeat(64); }],
  ['revision', s => { s.revision++; }], ['title', s => { s.title += ' changed'; }],
  ['media-path', s => { s.media.src = s.media.annotatedSrc; }],
  ['closeup-swap', s => { s.findings[0].closeupSrc = s.findings[1].closeupSrc; }],
  ['track-box', s => { s.findings[0].track[0].box[0] += .000001; }],
  ['evidence-time', s => { s.findings[0].evidenceTime += 1 / s.media.fps; }],
  ['measurement', s => { s.findings[0].measurements.push({ property: 'gap', value: 4, unit: 'mm', method: 'invented' }); }],
  ['map-placement', s => { s.findings[0].mapPosition = { x: .5, y: .5, accuracy: 'approximate', placementReview: 'accepted', note: 'invented' }; }],
  ['assessment', s => { s.findings[0].assessment.priority = 'unassessed'; }],
  ['missing-check', s => { s.findings[0].assessment.measurementNeeds = ['invented replacement']; }],
  ['source-url', s => { s.sources[0].url = 'https://example.invalid/changed'; }],
  ['route-note', s => { s.routeAssessment.note = 'invented route impact'; }],
  ['grouping', s => { s.workAreas[0].findingIds.push(s.findings[1].id); }],
  ['near-term', s => { s.workAreas[0].nearTerm = !s.workAreas[0].nearTerm; }],
  ['repair-worthy', s => { s.workAreas[0].repairWorthy = !s.workAreas[0].repairWorthy; }],
  ['recommendation', s => { s.workAreas[0].recommendedOptionId = s.treatments.find(t => t.workAreaId === s.workAreas[0].id && t.id !== s.workAreas[0].recommendedOptionId)!.id; }],
  ['cost-rate', s => { const t = s.treatments.find(t => t.cost.status === 'estimated')!; if (t.cost.status === 'estimated') t.cost.rateHighCents++; }],
  ['cost-quantity', s => { const t = s.treatments.find(t => t.cost.status === 'estimated')!; if (t.cost.status === 'estimated') t.cost.quantityHigh++; }],
  ['shared-quote', s => { s.sharedCosts[0].cost = money(0); }],
  ['unsigned-priority', s => { s.workAreas[0].priority = 'low'; s.workAreas[0].rationale = canonical.workAreas[0].rationale; }],
  ['empty-reviewer', s => { s.findings[0].review.reviewer = ' '; }],
  ['ai-edit', s => { s.findings[0].review.method = 'ai'; s.findings[0].label += ' altered'; }],
  ['nameless-priority', s => { s.workAreas[0].rationale = 'Priority reviewed by : check'; }],
  ['reasonless-priority', s => { s.workAreas[0].rationale = 'Priority reviewed by D: '; }],
  ['removed-finding', s => { s.findings.pop(); }],
  ['reordered-findings', s => { s.findings.reverse(); }],
];
for (const [name, mutate] of mutations) {
  const s = clone(allowed[1][1]); mutate(s);
  for (const format of ['html', 'pdf'] as const) await check(`handler/rejected/${name}/${format}`, s, async () => {
    const response = await post(s, format); equal(response.status, 400, 'immutable or unattributed edit rejected');
    equal((await response.json()).error.code, 'INVALID_REQUEST', 'structured error');
    equal(response.headers.get('cache-control'), 'no-store', 'rejection no-store'); metrics.rejectedResponses++;
  });
}
await check('handler/canonical-after', null, canonicalGet);
await check('immutable-files', evidencePaths, async () => equal(await evidenceHashes(), hashesBefore, 'canonical data/provenance/media byte hashes unchanged'));
let sourceSha: string | null = null;
let sourceShaNote = 'git rev-parse HEAD';
try { sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); }
catch { sourceShaNote = 'Git subprocess unavailable; verify the checkout SHA separately. Stress evidence is retained.'; }
const receipt = { schema: 'curb-developer-d-stress-v1', seed, seedHex: '0x' + seed.toString(16), randomCases,
  sourceSha, sourceShaNote,
  startedAt, finishedAt: new Date().toISOString(), elapsedMs: Math.round(performance.now() - start),
  node: process.version, platform: process.platform, peakSampledRssBytes: peakRss, metrics,
  deterministicResultSha256: digest.digest('hex'), immutableFileHashes: hashesBefore, failures,
  limitations: ['Finite seeded inputs are not a completeness proof.', 'Synthetic domain inputs are separate from canonical handler inputs.',
    'Handler invocation is in-process with real disk reads/renderers; no HTTP concurrency, public-host load or browser claim.',
    'Sampled RSS is not a heap profile or hosting capacity estimate. PDF checks cover retained images, not visual layout.'] };
await writeFile(join(output, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
if (failures.length) process.exitCode = 1;
