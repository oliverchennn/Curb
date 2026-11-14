import type { Box, Finding, Priority, RepairPlan, Survey } from '../../../contracts/curb/survey';

// Pure display and edit helpers. They never compute plans, costs or tracks:
// those come from the root evaluator through ./services.

/** The contract's Money ceiling, in cents. */
export const MAX_BUDGET_CENTS = 100_000_000;
const TEXT_MAX = 4000;

export type BudgetParse = { ok: true; cents: number | null } | { ok: false; message: string };

const BUDGET_PATTERN = /^\$?\s*(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d*))?$/;

/** USD text → exact integer cents. Empty means "no budget". Never rounds. */
export function parseBudgetInput(input: string): BudgetParse {
  const text = input.trim();
  if (text === '') return { ok: true, cents: null };
  if (text.startsWith('-')) return { ok: false, message: 'The budget cannot be negative.' };
  const match = BUDGET_PATTERN.exec(text);
  if (!match) return { ok: false, message: 'Use a dollar amount such as 2500 or 2,500.00.' };
  const fraction = match[2] ?? '';
  if (fraction.length > 2) return { ok: false, message: 'Use at most two decimal places; cents are never rounded.' };
  const cents = BigInt(match[1].replaceAll(',', '')) * 100n + BigInt(fraction.padEnd(2, '0') || '0');
  if (cents > BigInt(MAX_BUDGET_CENTS)) return { ok: false, message: `The budget can be at most ${formatCents(MAX_BUDGET_CENTS)}.` };
  return { ok: true, cents: Number(cents) };
}

/** Exact USD from nonnegative safe-integer cents, e.g. 123456 → "$1,234.56". */
export function formatCents(cents: number): string {
  const dollars = Math.floor(cents / 100);
  return `$${new Intl.NumberFormat('en-US').format(dollars)}.${String(cents % 100).padStart(2, '0')}`;
}

export function centsToInput(cents: number): string {
  return formatCents(cents).slice(1).replaceAll(',', '');
}

export function formatCentsRange(lowCents: number, highCents: number): string {
  return lowCents === highCents ? formatCents(lowCents) : `${formatCents(lowCents)}–${formatCents(highCents)}`;
}

/** 7.25 → "0:07.3" */
export function formatTime(seconds: number): string {
  const tenths = Math.round(seconds * 10);
  const minutes = Math.floor(tenths / 600);
  const rest = (tenths % 600) / 10;
  return `${minutes}:${rest.toFixed(1).padStart(4, '0')}`;
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: 'High priority',
  medium: 'Medium priority',
  low: 'Low priority',
  unassessed: 'Not yet assessed',
};

export const REVIEW_LABELS: Record<Finding['review']['status'], string> = {
  pending: 'Pending review',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

export const METHOD_LABELS: Record<Finding['review']['method'], string> = {
  ai: 'AI suggestion',
  manual: 'Manual review',
};

export const BUDGET_FIT_LABELS: Record<RepairPlan['budgetFit'], string> = {
  not_set: 'No budget set',
  within: 'Within budget (upper estimate)',
  partial: 'Partly priced — needs quotes to confirm fit',
  over: 'Over budget at the upper estimate',
};

export const PLAN_ORDER: RepairPlan['id'][] = ['essential', 'balanced', 'durable', 'budget'];

// ---------- Review edits (immutable) ----------

export type ReviewerInput = { reviewer: string };

function cleanText(value: string): string | null {
  const text = value.trim();
  return text.length >= 1 && text.length <= TEXT_MAX ? text : null;
}

function updateFinding(survey: Survey, findingId: string, update: (finding: Finding) => Finding): Survey {
  return { ...survey, findings: survey.findings.map((finding) => finding.id === findingId ? update(finding) : finding) };
}

export type EditResult = { ok: true; survey: Survey } | { ok: false; message: string };

export function setReviewStatus(
  survey: Survey,
  findingId: string,
  status: 'accepted' | 'rejected' | 'pending',
  reviewerName: string,
): EditResult {
  const reviewer = cleanText(reviewerName);
  if (!reviewer) return { ok: false, message: 'Enter a reviewer name before recording a decision.' };
  const note = status === 'accepted'
    ? 'Accepted by manual review in the Curb survey workspace.'
    : status === 'rejected'
      ? 'Rejected by manual review in the Curb survey workspace; excluded from plans, kept in the record.'
      : 'Returned to pending by manual review in the Curb survey workspace.';
  return {
    ok: true,
    survey: updateFinding(survey, findingId, (finding) => ({ ...finding, review: { status, reviewer, method: 'manual', note } })),
  };
}

export type FindingCorrection = { label: string; kind: string; description: string };

export function correctFinding(survey: Survey, findingId: string, correction: FindingCorrection, reviewerName: string): EditResult {
  const reviewer = cleanText(reviewerName);
  if (!reviewer) return { ok: false, message: 'Enter a reviewer name before saving a correction.' };
  const label = cleanText(correction.label);
  const kind = cleanText(correction.kind);
  const description = cleanText(correction.description);
  if (!label || !kind || !description) {
    return { ok: false, message: `Label, kind and description are required (1–${TEXT_MAX} characters).` };
  }
  const current = survey.findings.find((finding) => finding.id === findingId);
  if (!current) return { ok: false, message: 'That finding is no longer in this survey.' };
  if (current.label === label && current.kind === kind && current.description === description) {
    return { ok: false, message: 'Nothing changed.' };
  }
  return {
    ok: true,
    survey: updateFinding(survey, findingId, (finding) => ({
      ...finding, label, kind, description,
      review: {
        status: finding.review.status, reviewer, method: 'manual',
        note: 'Label, kind or description corrected by manual review in the Curb survey workspace.',
      },
    })),
  };
}

export function setAreaPriority(survey: Survey, areaId: string, priority: Priority, reviewerName: string, rationaleText: string): EditResult {
  const reviewer = cleanText(reviewerName);
  if (!reviewer) return { ok: false, message: 'Enter a reviewer name before recording an accessibility priority.' };
  const rationale = cleanText(rationaleText);
  if (!rationale || rationale.length > 3500) return { ok: false, message: 'Explain the access need behind this priority (1–3500 characters).' };
  if (!survey.workAreas.some(area => area.id === areaId)) return { ok: false, message: 'That work area is no longer in this survey.' };
  return { ok: true, survey: { ...survey, workAreas: survey.workAreas.map((area) => area.id === areaId
    ? { ...area, priority, rationale: `Priority reviewed by ${reviewer.slice(0, 400)}: ${rationale}` } : area) } };
}

export function isEdited(original: Survey, current: Survey): boolean {
  return JSON.stringify(original) !== JSON.stringify(current);
}

/** Finding IDs whose review or text differs from the original analysis. */
export function editedFindingIds(original: Survey, current: Survey): string[] {
  const before = new Map(original.findings.map((finding) => [finding.id, JSON.stringify(finding)]));
  return current.findings.filter((finding) => before.get(finding.id) !== JSON.stringify(finding)).map((finding) => finding.id);
}

// ---------- Lookups ----------

export function areaForFinding(survey: Survey, findingId: string): Survey['workAreas'][number] | undefined {
  return survey.workAreas.find((area) => area.findingIds.includes(findingId));
}

export function labelForId(survey: Survey, id: string): string {
  return survey.findings.find((item) => item.id === id)?.label
    ?? survey.workAreas.find((item) => item.id === id)?.label
    ?? survey.treatments.find((item) => item.id === id)?.label
    ?? survey.sharedCosts.find((item) => item.id === id)?.label
    ?? id;
}

export function splitByPlacement(survey: Survey): { placed: Finding[]; unplaced: Finding[] } {
  return {
    placed: survey.findings.filter((finding) => finding.mapPosition !== null),
    unplaced: survey.findings.filter((finding) => finding.mapPosition === null),
  };
}

/** Slider ceiling: the known upper estimates of every treatment and shared cost,
 * rounded up to $100, at least $1,000 and never above the contract ceiling. */
export function sliderMaxCents(survey: Survey, costRange: (cost: Survey['treatments'][number]['cost']) => { highCents: number } | null): number {
  let total = 0;
  for (const item of [...survey.treatments, ...survey.sharedCosts]) total += costRange(item.cost)?.highCents ?? 0;
  const rounded = Math.ceil(total / 10_000) * 10_000;
  return Math.min(MAX_BUDGET_CENTS, Math.max(100_000, rounded));
}

// ---------- Video geometry ----------

export type Rect = { left: number; top: number; width: number; height: number };

/** The displayed picture inside a box rendered with object-fit: contain. */
export function containedRect(boxWidth: number, boxHeight: number, mediaWidth: number, mediaHeight: number): Rect {
  if (boxWidth <= 0 || boxHeight <= 0 || mediaWidth <= 0 || mediaHeight <= 0) return { left: 0, top: 0, width: 0, height: 0 };
  const scale = Math.min(boxWidth / mediaWidth, boxHeight / mediaHeight);
  const width = mediaWidth * scale;
  const height = mediaHeight * scale;
  return { left: (boxWidth - width) / 2, top: (boxHeight - height) / 2, width, height };
}

/** Normalized [x, y, w, h] → pixel rect inside the displayed picture. */
export function boxToRect(box: Box, picture: Rect): Rect {
  const [x, y, w, h] = box;
  return { left: picture.left + x * picture.width, top: picture.top + y * picture.height, width: w * picture.width, height: h * picture.height };
}

// ---------- Exports ----------

export function surveyJson(survey: Survey): string {
  return `${JSON.stringify(survey, null, 2)}\n`;
}

export function exportFileName(survey: Survey, extension: 'json' | 'csv' | 'pdf', edited: boolean): string {
  return `curb-${survey.id}-r${survey.revision}${edited ? '-reviewed' : ''}.${extension}`;
}
