import type { Finding, Priority, Survey, Treatment } from '../../../contracts/curb/survey';
import clipCheck from '../../../data/curb/surveys/robertson-clip.json';
import { costRange } from './services';

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

const PRIORITY_POINTS: Record<Priority, number> = { high: 100, medium: 50, low: 0, unassessed: 50 };

/** Measurement-based (reviewer) priority: the worst check decides. */
export function reviewerPriority(results: MeasureResult[]): Priority {
  const statuses = results.map((r) => r.status).filter((s): s is CheckStatus => s !== null);
  if (statuses.length === 0) return 'unassessed';
  return statuses.includes('fails') ? 'high' : statuses.includes('almost') ? 'medium' : 'low';
}

export const REVIEWER_WEIGHT = 0.7;
export const AI_WEIGHT = 0.3;

export type PriorityScore = { reviewer: Priority; ai: Priority; score: number; band: Priority };

/** 70% measurement (reviewer) priority + 30% AI travel-impact priority, on a 0–100 scale. */
export function priorityScore(finding: Finding, entries: MeasurementEntries): PriorityScore {
  const reviewer = reviewerPriority(measureResults(finding.id, entries));
  const ai = finding.assessment.priority;
  const score = Math.round(REVIEWER_WEIGHT * PRIORITY_POINTS[reviewer] + AI_WEIGHT * PRIORITY_POINTS[ai]);
  return { reviewer, ai, score, band: score >= 60 ? 'high' : score >= 40 ? 'medium' : 'low' };
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

export type ClipResult = { id: string; topLabel: string; damageScore: number; confirmsDamage: boolean };

export function clipFor(findingId: string): ClipResult | undefined {
  return clipCheck.findings.find((item) => item.id === findingId);
}

export function clipSummary(survey: Survey): { confirmed: number; total: number } {
  const total = survey.findings.length;
  const confirmed = survey.findings.filter((finding) => clipFor(finding.id)?.confirmsDamage).length;
  return { confirmed, total };
}
