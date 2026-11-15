import { ASSUMED_METHOD, CANONICAL_UNITS, MEASURE_DIMENSIONS, REVIEWER_METHOD, toCanonical, type Finding, type MeasureDimension, type Priority, type RepairPlan, type Repair, type Survey, type Treatment } from '../../contracts/curb/survey';
import clipCheck from '../../data/curb/surveys/robertson-clip.json';
import { buildRepairPlans, planContext } from './survey';
import { ACCESS_NEED_COUNT, ACCESS_NEED_SHORT, repairOf } from './repair';

// Measurement checks, priority scoring and the suggested repair plan.
// Pure helpers: they never change the survey or the root plan evaluator.

export type MeasureKey = keyof typeof MEASURE_DIMENSIONS;
export type CheckStatus = 'meets' | 'almost' | 'fails';

export type MeasureSpec = {
  key: MeasureKey;
  label: string;
  unit: 'in' | '%';
  /** Value at or under (or, for widths, at or over) which the requirement is met. */
  meets: number;
  /** Past `meets` but within this: close, usually fixable with a small change. */
  almost: number;
  /** Higher values are better (path width); otherwise lower is better. */
  higherIsBetter?: boolean;
  rule: string;
};

export type MeasureGroup = { id: string; need: string; standard: string; why: string; specs: MeasureSpec[] };

/** Each "needs measuring" item, the ADA 2010 section behind it, and the numbers checked. */
export const MEASURE_GROUPS: MeasureGroup[] = [
  {
    id: 'opening', need: 'Gap width at the widest point', standard: 'ADA 302.3 · Openings',
    why: 'Gaps must be ½ in or less so wheels and cane tips do not drop in.',
    specs: [{ key: 'opening', label: 'Gap width', unit: 'in', meets: 0.5, almost: 0.75, rule: '≤ ½ in' }],
  },
  {
    id: 'level', need: 'Height difference across the crack', standard: 'ADA 303 · Changes in level',
    why: 'Up to ¼ in is fine; ¼–½ in must be beveled; more than ½ in is a trip edge.',
    specs: [{ key: 'level', label: 'Height difference', unit: 'in', meets: 0.25, almost: 0.5, rule: '≤ ¼ in' }],
  },
  {
    id: 'path', need: 'Path width and slope', standard: 'ADA 403 · Walking surfaces',
    why: 'The path must stay at least 36 in wide, with gentle side and forward slopes.',
    specs: [
      { key: 'clearWidth', label: 'Clear path width', unit: 'in', meets: 36, almost: 32, higherIsBetter: true, rule: '≥ 36 in' },
      { key: 'crossSlope', label: 'Side (cross) slope', unit: '%', meets: 2.08, almost: 3, rule: '≤ 2.08% (1:48)' },
      { key: 'runningSlope', label: 'Forward (running) slope', unit: '%', meets: 5, almost: 8.33, rule: '≤ 5% (1:20)' },
    ],
  },
];

export const MEASURE_SPECS: MeasureSpec[] = MEASURE_GROUPS.flatMap((group) => group.specs);

/** Estimates from the video and typical campus sidewalk construction (5 ft concrete
 * panels laid to about 1.5–2% cross slope). A reviewer's entry always replaces them. */
export const ESTIMATES: Record<string, Record<MeasureKey, number>> = {
  'defect-01': { opening: 0.4, level: 0.3, clearWidth: 60, crossSlope: 1.8, runningSlope: 2 },
  'defect-02': { opening: 0.35, level: 0.2, clearWidth: 60, crossSlope: 1.6, runningSlope: 2 },
  'defect-03': { opening: 0.25, level: 0.15, clearWidth: 60, crossSlope: 1.7, runningSlope: 2.5 },
  'defect-04': { opening: 1, level: 0.75, clearWidth: 60, crossSlope: 2.6, runningSlope: 2 },
  'defect-05': { opening: 0.3, level: 0.2, clearWidth: 60, crossSlope: 1.9, runningSlope: 3 },
};

/** Planning assumptions are prefilled for every finding and stay labeled Assumed until a
 * reviewer marks a value as measured on site. Both are stored on the survey's measurements
 * with their original unit; reads convert to inches (lengths) or percent (slopes). */
export { ASSUMED_METHOD, REVIEWER_METHOD };
export type Basis = 'assumed' | 'measured';

export function dimensionOf(key: MeasureKey): MeasureDimension | null {
  return Object.hasOwn(MEASURE_DIMENSIONS, key) ? MEASURE_DIMENSIONS[key] : null;
}

export type ParsedMeasure = { ok: true; value: number; unit: string; canonical: number } | { ok: false; message: string };

/** "0.25", "6.35 mm", "0.5ft", "2%" → value in its unit plus the canonical inches/percent. */
export function parseMeasureInput(text: string, key: MeasureKey): ParsedMeasure {
  const dimension = dimensionOf(key);
  if (dimension === null) return { ok: false, message: 'Choose a supported measurement property.' };
  const match = /^\s*(\d+(?:\.\d+)?|\.\d+)\s*([a-z%"']*)\s*$/i.exec(text);
  if (!match) return { ok: false, message: 'Enter a positive number, for example 0.25 or 6.35 mm.' };
  const value = Number(match[1]);
  const raw = match[2].toLowerCase();
  const unit = raw === '' ? CANONICAL_UNITS[dimension] : raw === '"' ? 'in' : raw === "'" ? 'ft' : raw;
  const canonical = toCanonical(dimension, value, unit);
  if (canonical === null) {
    return { ok: false, message: dimension === 'slope' ? 'Slopes use percent, for example 1.8%.' : 'Lengths use in, ft, mm, cm or m.' };
  }
  if (canonical > 1000) return { ok: false, message: 'That value is too large.' };
  return { ok: true, value, unit, canonical };
}

/** Kept for simple numeric checks: canonical value of plain or unit text, else null. */
export function parseMeasure(text: string | undefined, key: MeasureKey = 'level'): number | null {
  if (text === undefined) return null;
  const parsed = parseMeasureInput(text, key);
  return parsed.ok ? parsed.canonical : null;
}

export function checkStatus(spec: MeasureSpec, value: number): CheckStatus {
  if (spec.higherIsBetter) return value >= spec.meets ? 'meets' : value >= spec.almost ? 'almost' : 'fails';
  return value <= spec.meets ? 'meets' : value <= spec.almost ? 'almost' : 'fails';
}

export type MeasureResult = {
  spec: MeasureSpec;
  /** Canonical value (inches or percent). */
  value: number | null;
  basis: Basis;
  /** True when the value is the untouched default assumption. */
  isDefault: boolean;
  /** As recorded, e.g. "6.35 mm", for provenance. */
  recorded: string | null;
  status: CheckStatus | null;
};

function storedEntry(finding: Finding, key: MeasureKey) {
  return finding.measurements.filter((m) => m.property === key && (m.method === ASSUMED_METHOD || m.method === REVIEWER_METHOD)).at(-1);
}

export function measureResults(finding: Finding): MeasureResult[] {
  return MEASURE_SPECS.map((spec) => {
    const stored = storedEntry(finding, spec.key);
    const dimension = dimensionOf(spec.key);
    const converted = stored && dimension !== null ? toCanonical(dimension, stored.value, stored.unit) : null;
    const fallback = ESTIMATES[finding.id]?.[spec.key];
    const value = converted ?? fallback ?? null;
    return {
      spec, value,
      basis: stored?.method === REVIEWER_METHOD && converted !== null ? 'measured' : 'assumed',
      isDefault: converted === null,
      recorded: stored && converted !== null ? `${stored.value} ${stored.unit}` : null,
      status: value === null ? null : checkStatus(spec, value),
    };
  });
}

export function formatMeasure(value: number, spec: MeasureSpec): string {
  return `${Number(value.toFixed(3))}${spec.unit === '%' ? '%' : ' in'}`;
}

/** "Gap width 0.4 in (assumed) · Height difference 0.9 in (measured, recorded 22.86 mm)". */
export function dimensionSummary(finding: Finding): string {
  return measureResults(finding).filter((r) => r.value !== null).map((r) =>
    `${r.spec.label} ${formatMeasure(r.value!, r.spec)} (${r.basis}${r.recorded && !r.recorded.endsWith(r.spec.unit) ? `, recorded ${r.recorded}` : ''})`).join(' · ');
}

/** Writes one parsed value with its basis. Invalid runtime inputs leave the survey unchanged;
 * callers display parseMeasureInput's validation error before attempting an update. */
export function withMeasurement(survey: Survey, findingId: string, key: MeasureKey, input: { value: number; unit: string; basis: Basis } | null): Survey {
  const dimension = dimensionOf(key);
  if (dimension === null) return survey;
  const canonical = input ? toCanonical(dimension, input.value, input.unit) : null;
  if (input && (canonical === null || (input.basis !== 'assumed' && input.basis !== 'measured'))) return survey;
  return { ...survey, findings: survey.findings.map((finding) => {
    if (finding.id !== findingId) return finding;
    const rest = finding.measurements.filter((m) => !(m.property === key && (m.method === ASSUMED_METHOD || m.method === REVIEWER_METHOD)));
    if (!input) return { ...finding, measurements: rest };
    const unchangedAssumption = input.basis === 'assumed' && canonical === ESTIMATES[findingId]?.[key];
    return { ...finding, measurements: unchangedAssumption ? rest
      : [...rest, { property: key, value: input.value, unit: input.unit, method: input.basis === 'measured' ? REVIEWER_METHOD : ASSUMED_METHOD }] };
  }) };
}

export const STATUS_LABELS: Record<CheckStatus, string> = { meets: 'Meets', almost: 'Almost', fails: 'Does not meet' };

/** Measurement-based severity: the worst check decides. */
export function reviewerPriority(results: MeasureResult[]): Priority {
  const statuses = results.map((r) => r.status).filter((s): s is CheckStatus => s !== null);
  if (statuses.length === 0) return 'unassessed';
  return statuses.includes('fails') ? 'high' : statuses.includes('almost') ? 'medium' : 'low';
}

// ---------- Access-impact priority ----------
// All weights and points live here. The score ranks access impact, not visual urgency.

export const ACCESS_WEIGHTS = { severity: 0.45, destination: 0.3, needs: 0.25 } as const;
/** Severity mixes the worst ADA check (80%) with CLIP travel impact (20%, a weaker signal). */
export const SEVERITY_MIX = { measurement: 0.8, clip: 0.2 } as const;
const CHECK_POINTS: Record<CheckStatus | 'none', number> = { fails: 100, almost: 60, meets: 20, none: 50 };
/** Unknown is between no and yes, and never counts as yes. */
const DESTINATION_POINTS: Record<Repair['essentialDestination'], number> = { yes: 100, unknown: 30, no: 0 };
export const PRIORITY_BANDS = { high: 65, medium: 45 } as const;

export type FactorKey = 'severity' | 'destination' | 'needs';
export type Factor = { key: FactorKey; label: string; weight: number; points: number; detail: string };
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type Confidence = { level: ConfidenceLevel; reasons: string[] };
export type PriorityScore = { score: number; band: Priority; factors: Factor[]; confidence: Confidence };

const CHECK_WORDS: Record<CheckStatus, string> = { fails: 'does not meet', almost: 'almost meets', meets: 'meets' };

export function priorityScore(finding: Finding): PriorityScore {
  const repair = repairOf(finding);
  const results = measureResults(finding);
  const worst = (['fails', 'almost', 'meets'] as const).find((status) => results.some((r) => r.status === status)) ?? null;
  const worstSource = worst ? results.find((r) => r.status === worst)!.basis : null;
  const clip = clipFor(finding.id);
  const measurementPoints = CHECK_POINTS[worst ?? 'none'];
  const severity = clip ? SEVERITY_MIX.measurement * measurementPoints + SEVERITY_MIX.clip * clip.impactScore * 100 : measurementPoints;
  const needs = repair.accessNeeds.length;

  const factors: Factor[] = [
    {
      key: 'severity', label: 'Severity', weight: ACCESS_WEIGHTS.severity, points: Math.round(severity),
      detail: `${worst ? `Worst check ${CHECK_WORDS[worst]} ADA (${worstSource})` : 'No checks yet'}${clip ? `; CLIP travel impact ${Math.round(clip.impactScore * 100)}%` : ''}.`,
    },
    {
      key: 'destination', label: 'Essential destination', weight: ACCESS_WEIGHTS.destination, points: DESTINATION_POINTS[repair.essentialDestination],
      detail: repair.essentialDestination === 'yes' ? `Blocks or degrades the main route: ${repair.destinationNote}`
        : repair.essentialDestination === 'no' ? `Not on the main route to an essential place: ${repair.destinationNote}`
          : 'Unknown: no one has checked the route to an essential place yet.',
    },
    {
      key: 'needs', label: 'Access needs affected', weight: ACCESS_WEIGHTS.needs, points: Math.round((needs / ACCESS_NEED_COUNT) * 100),
      detail: `${needs} of ${ACCESS_NEED_COUNT}${needs ? `: ${repair.accessNeeds.map((need) => ACCESS_NEED_SHORT[need].toLowerCase()).join(', ')}` : ''}.`,
    },
  ];
  const score = Math.round(factors.reduce((sum, factor) => sum + factor.weight * factor.points, 0));
  return { score, band: score >= PRIORITY_BANDS.high ? 'high' : score >= PRIORITY_BANDS.medium ? 'medium' : 'low', factors, confidence: confidenceOf(finding, results, repair) };
}

/** How sure the ranking is. Low confidence never lowers severity; it is shown beside the score. */
export function confidenceOf(finding: Finding, results: MeasureResult[], repair: Repair = repairOf(finding)): Confidence {
  const measured = results.filter((r) => r.basis === 'measured').length;
  const checked = finding.review.status === 'accepted' && finding.review.method === 'manual';
  const points = (measured / Math.max(1, results.length)) * 40 + (checked ? 30 : 0)
    + (repair.locationConfidence === 'confirmed' ? 30 : repair.locationConfidence === 'approximate' ? 15 : 0);
  const reasons = [
    measured === results.length ? 'all values measured' : measured ? `${measured} of ${results.length} values measured` : 'dimensions are assumed',
    checked ? 'checked by a person' : 'not checked by a person',
    repair.locationConfidence === 'confirmed' ? 'location confirmed on site' : `location ${repair.locationConfidence}`,
  ];
  return { level: points >= 70 ? 'high' : points >= 35 ? 'medium' : 'low', reasons };
}

const BAND_WORDS: Record<Priority, string> = { high: 'High', medium: 'Medium', low: 'Low', unassessed: 'Not set' };

/** One sentence for reports: score, each factor, then confidence. */
export function priorityRationale(score: PriorityScore): string {
  const parts = score.factors.map((f) => `${f.label.toLowerCase()} ${f.points} × ${Math.round(f.weight * 100)}%`).join(', ');
  return `${BAND_WORDS[score.band]} priority (${score.score}/100): ${parts}; confidence ${score.confidence.level} (${score.confidence.reasons.join(', ')}).`;
}

// ---------- Uncertainty tags ----------

export type UncertaintyTag = 'needs_measurement' | 'professional_review' | 'quote_needed';
export const UNCERTAINTY_LABELS: Record<UncertaintyTag, string> = {
  needs_measurement: 'Needs field measurement',
  professional_review: 'Requires professional review',
  quote_needed: 'Cost unknown – quote needed',
};

export function uncertaintyTags(survey: Survey, finding: Finding, plan?: RepairPlan): UncertaintyTag[] {
  const tags: UncertaintyTag[] = [];
  if (measureResults(finding).some((r) => r.basis !== 'measured')) tags.push('needs_measurement');
  if (repairOf(finding).professionalReview) tags.push('professional_review');
  const area = survey.workAreas.find((item) => item.findingIds.includes(finding.id));
  // With a plan: unknown cost when the area has no selected treatment, or the selected one needs a quote.
  const chosen = area && plan ? survey.treatments.find((t) => t.workAreaId === area.id && plan.optionIds.includes(t.id)) : undefined;
  const reference = plan ? chosen : area ? survey.treatments.find((t) => t.id === area.recommendedOptionId) : undefined;
  if ((plan && !chosen) || reference?.cost.status === 'quote_required') tags.push('quote_needed');
  return tags;
}

// ---------- Suggested plan (work-area based; shared by the page and the reports) ----------

export type AreaRanking = {
  area: Survey['workAreas'][number];
  findings: Finding[];
  score: PriorityScore;
  /** Priced treatment chosen for this area, or null when every option needs a quote. */
  treatment: Treatment | null;
};

/** Each eligible physical work area once, ranked by its highest finding priority.
 * High priority areas get the most durable priced option; others the cheapest.
 * Deterministic: ties break on area ID, never on input order. */
export function rankWorkAreas(survey: Survey): AreaRanking[] {
  const context = planContext(survey);
  return context.areas.map((area) => {
    const findings = survey.findings.filter((f) => area.findingIds.includes(f.id) && context.active.has(f.id));
    const scores = findings.map(priorityScore);
    const score = scores.reduce((best, next) => next.score > best.score ? next : best, scores[0]);
    const priced = context.candidates.filter((t) => t.workAreaId === area.id && t.cost.status === 'estimated')
      .map((t) => ({ t, high: context.ranges.get(t.cost)!.highCents }));
    priced.sort((x, y) => score.band === 'high'
      ? y.t.durability - x.t.durability || x.high - y.high || lexical(x.t.id, y.t.id)
      : x.high - y.high || y.t.durability - x.t.durability || lexical(x.t.id, y.t.id));
    return { area, findings, score, treatment: priced[0]?.t ?? null };
  }).sort((x, y) => y.score.score - x.score.score || lexical(x.area.id, y.area.id));
}

/** The suggested RepairPlan. Areas are added in rank order while the plan's upper total,
 * including shared setup once, fits the budget. Quote-only areas stay deferred and visible. */
export function buildSuggestedPlan(survey: Survey, budgetCents: number | null = null): RepairPlan {
  const context = planContext(survey);
  let selected: Treatment[] = [];
  for (const ranked of rankWorkAreas(survey)) {
    // Use this context's own treatment object so its cost range is found.
    const treatment = ranked.treatment && context.candidates.find((t) => t.id === ranked.treatment!.id);
    if (!treatment) continue;
    const next = [...selected, treatment];
    if (budgetCents === null || context.make('suggested', next, budgetCents).cost.highCents <= budgetCents) selected = next;
  }
  return context.make('suggested', selected, budgetCents);
}

/** Every plan the page shows and the report can export, from one computation. */
export function buildAllPlans(survey: Survey, budgetCents: number | null): RepairPlan[] {
  return [buildSuggestedPlan(survey, budgetCents), ...buildRepairPlans(survey, budgetCents ?? undefined)];
}

const lexical = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

// ---------- CLIP ----------

export type ClipResult = {
  id: string; topLabel: string; damageScore: number; confirmsDamage: boolean;
  impactScore: number; impactPriority: 'high' | 'low';
};

export function clipFor(findingId: string): ClipResult | undefined {
  return (clipCheck.findings as ClipResult[]).find((item) => item.id === findingId);
}

export function clipSummary(survey: Survey): { confirmed: number; total: number } {
  const total = survey.findings.length;
  const confirmed = survey.findings.filter((finding) => clipFor(finding.id)?.confirmsDamage).length;
  return { confirmed, total };
}
