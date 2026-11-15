import type { Finding, Priority, Repair, Survey, Treatment } from '../../contracts/curb/survey';
import clipCheck from '../../data/curb/surveys/robertson-clip.json';
import { costRange } from './survey';
import { ACCESS_NEED_COUNT, ACCESS_NEED_SHORT, repairOf } from './repair';

// Measurement checks, priority scoring and the suggested repair plan.
// Pure helpers: they never change the survey or the root plan evaluator.

export type MeasureKey = 'opening' | 'level' | 'clearWidth' | 'crossSlope' | 'runningSlope';
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

/** Reviewer-entered values: findingId → measure → raw text. Blank means "use the estimate". */
export type MeasurementEntries = Record<string, Partial<Record<MeasureKey, string>>>;

export function parseMeasure(text: string | undefined): number | null {
  if (text === undefined) return null;
  const trimmed = text.trim();
  if (trimmed === '' || !/^\d+(?:\.\d+)?$|^\.\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) && value <= 1000 ? value : null;
}

export function checkStatus(spec: MeasureSpec, value: number): CheckStatus {
  if (spec.higherIsBetter) return value >= spec.meets ? 'meets' : value >= spec.almost ? 'almost' : 'fails';
  return value <= spec.meets ? 'meets' : value <= spec.almost ? 'almost' : 'fails';
}

export type MeasureResult = { spec: MeasureSpec; value: number | null; source: 'measured' | 'estimate' | 'none'; status: CheckStatus | null };

export function measureResults(findingId: string, entries: MeasurementEntries): MeasureResult[] {
  return MEASURE_SPECS.map((spec) => {
    const measured = parseMeasure(entries[findingId]?.[spec.key]);
    const estimate = ESTIMATES[findingId]?.[spec.key];
    const value = measured ?? estimate ?? null;
    return { spec, value, source: measured !== null ? 'measured' : estimate !== undefined ? 'estimate' : 'none', status: value === null ? null : checkStatus(spec, value) };
  });
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

export function priorityScore(finding: Finding, entries: MeasurementEntries): PriorityScore {
  const repair = repairOf(finding);
  const results = measureResults(finding.id, entries);
  const worst = (['fails', 'almost', 'meets'] as const).find((status) => results.some((r) => r.status === status)) ?? null;
  const worstSource = worst ? (results.find((r) => r.status === worst)!.source === 'measured' ? 'measured' : 'estimate') : null;
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
  const measured = results.filter((r) => r.source === 'measured').length;
  const checked = finding.review.status === 'accepted' && finding.review.method === 'manual';
  const points = (measured / Math.max(1, results.length)) * 40 + (checked ? 30 : 0)
    + (repair.locationConfidence === 'confirmed' ? 30 : repair.locationConfidence === 'approximate' ? 15 : 0);
  const reasons = [
    measured === results.length ? 'all values measured' : measured ? `${measured} of ${results.length} values measured` : 'values are estimates',
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

export function uncertaintyTags(survey: Survey, finding: Finding, entries: MeasurementEntries): UncertaintyTag[] {
  const tags: UncertaintyTag[] = [];
  if (measureResults(finding.id, entries).some((r) => r.source !== 'measured')) tags.push('needs_measurement');
  if (repairOf(finding).professionalReview) tags.push('professional_review');
  const area = survey.workAreas.find((item) => item.findingIds.includes(finding.id));
  const recommended = area ? survey.treatments.find((t) => t.id === area.recommendedOptionId) : undefined;
  if (recommended?.cost.status === 'quote_required') tags.push('quote_needed');
  return tags;
}

/** Reviewer measurements stored on the survey, as measurement-table entries. */
export const REVIEWER_METHOD = 'Reviewer field measurement';
export function entriesFromSurvey(survey: Survey): MeasurementEntries {
  const entries: MeasurementEntries = {};
  for (const finding of survey.findings) {
    for (const m of finding.measurements) {
      if (m.method === REVIEWER_METHOD && MEASURE_SPECS.some((spec) => spec.key === m.property)) {
        (entries[finding.id] ??= {})[m.property as MeasureKey] = String(m.value);
      }
    }
  }
  return entries;
}

/** Writes one reviewer measurement onto the survey (or removes it when the text is blank or invalid). */
export function withMeasurement(survey: Survey, findingId: string, key: MeasureKey, text: string): Survey {
  const spec = MEASURE_SPECS.find((item) => item.key === key)!;
  const value = parseMeasure(text);
  return { ...survey, findings: survey.findings.map((finding) => {
    if (finding.id !== findingId) return finding;
    const rest = finding.measurements.filter((m) => !(m.method === REVIEWER_METHOD && m.property === key));
    return { ...finding, measurements: value === null ? rest : [...rest, { property: key, value, unit: spec.unit, method: REVIEWER_METHOD }] };
  }) };
}

// ---------- Suggested plan ----------

export type PlanStep = {
  finding: Finding;
  areaLabel: string;
  treatment: Treatment;
  score: PriorityScore;
  lowCents: number;
  highCents: number;
  included: boolean;
};

export type SuggestedPlan = {
  steps: PlanStep[];
  lowCents: number;
  highCents: number;
  included: number;
  skipped: number;
  sharedQuote: string[];
};

/** Highest priority first. High priority gets the most durable priced repair; the
 * rest get the cheapest priced repair. With a budget, repairs are added in priority
 * order while the upper estimate still fits; anything that does not fit is left out. */
export function suggestPlan(survey: Survey, entries: MeasurementEntries, budgetCents: number | null): SuggestedPlan {
  const candidates = survey.findings
    .filter((finding) => finding.review.status !== 'rejected')
    .flatMap((finding) => {
      const area = survey.workAreas.find((item) => item.findingIds.includes(finding.id));
      if (!area || !area.repairWorthy) return [];
      const score = priorityScore(finding, entries);
      const priced = survey.treatments
        .filter((t) => t.workAreaId === area.id && t.method !== 'inspect')
        .flatMap((t) => { const range = costRange(t.cost); return range ? [{ t, range }] : []; });
      if (priced.length === 0) return [];
      priced.sort((a, b) => score.band === 'high'
        ? b.t.durability - a.t.durability || a.range.highCents - b.range.highCents
        : a.range.highCents - b.range.highCents || b.t.durability - a.t.durability);
      const pick = priced[0];
      return [{ finding, areaLabel: area.label, treatment: pick.t, score, lowCents: pick.range.lowCents, highCents: pick.range.highCents }];
    })
    .sort((a, b) => b.score.score - a.score.score || survey.findings.indexOf(a.finding) - survey.findings.indexOf(b.finding));

  let spent = 0;
  let low = 0;
  const steps: PlanStep[] = candidates.map((step) => {
    const included = budgetCents === null || spent + step.highCents <= budgetCents;
    if (included) { spent += step.highCents; low += step.lowCents; }
    return { ...step, included };
  });
  const included = steps.filter((step) => step.included).length;
  return {
    steps, lowCents: low, highCents: spent, included, skipped: steps.length - included,
    sharedQuote: included > 0 ? survey.sharedCosts.filter((c) => c.cost.status === 'quote_required').map((c) => c.label) : [],
  };
}

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
