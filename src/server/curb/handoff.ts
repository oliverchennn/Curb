import type { Cost, Finding, Repair, RepairPlan, Survey } from '../../contracts/curb/survey';
import { entriesFromSurvey, priorityRationale, priorityScore, type PriorityScore, type UncertaintyTag, uncertaintyTags } from '../../domain/curb/measurements';
import { repairOf } from '../../domain/curb/repair';
import { costRange } from '../../domain/curb/survey';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export type HandoffRow = {
  finding: Finding;
  repair: Repair;
  score: PriorityScore;
  rationale: string;
  tags: UncertaintyTag[];
  action: string;
  cost: string;
};

function costText(cost: Cost | undefined): string {
  if (!cost) return 'Unknown – no repair selected in this plan';
  if (cost.status === 'quote_required') return 'Unknown – quote needed. ' + cost.reason;
  const { lowCents, highCents } = costRange(cost)!;
  const low = money.format(lowCents / 100);
  const high = money.format(highCents / 100);
  return (low === high ? low : low + ' to ' + high) + ' (estimate)';
}

/** Facilities handoff rows for active findings, highest access-impact priority first.
 * Shared by the HTML and PDF reports. Unknown costs stay unknown, never zero. */
export function buildHandoff(survey: Survey, plan: RepairPlan): { rows: HandoffRow[]; rejected: Finding[] } {
  const entries = entriesFromSurvey(survey);
  const treatments = new Map(survey.treatments.map(item => [item.id, item]));
  const rows = survey.findings.filter(finding => finding.review.status !== 'rejected').map(finding => {
    const area = survey.workAreas.find(item => item.findingIds.includes(finding.id));
    const treatment = area ? plan.optionIds.map(id => treatments.get(id)!).find(item => item.workAreaId === area.id) : undefined;
    const repair = repairOf(finding, survey);
    const score = priorityScore(finding, entries);
    const tags = uncertaintyTags(survey, finding, entries);
    if ((!treatment || treatment.cost.status === 'quote_required') && !tags.includes('quote_needed')) tags.push('quote_needed');
    const action = treatment
      ? treatment.label + (repair.professionalReview ? ' – requires professional review' : '')
      : 'Not in the selected plan (deferred). ' + (repair.professionalReview ? 'Requires professional review.' : 'Inspect before choosing a repair.');
    return { finding, repair, score, rationale: priorityRationale(score), tags, action, cost: costText(treatment?.cost) };
  }).sort((a, b) => b.score.score - a.score.score || survey.findings.indexOf(a.finding) - survey.findings.indexOf(b.finding));
  return { rows, rejected: survey.findings.filter(finding => finding.review.status === 'rejected') };
}
