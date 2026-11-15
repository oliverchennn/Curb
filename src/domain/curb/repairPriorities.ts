import type { Priority, Survey } from '../../contracts/curb/survey';
import { validateSurvey } from './survey';

export interface RepairPriorityItem {
  workAreaId: string;
  findingIds: string[];
  priority: Priority;
  nearTerm: boolean;
  reason: string;
}

export interface RankedRepairPriorityItem extends RepairPriorityItem {
  rank: number;
}

export interface RepairPriorities {
  ranked: RankedRepairPriorityItem[];
  needsAssessment: RepairPriorityItem[];
  monitoring: RepairPriorityItem[];
  excludedFindingIds: string[];
  ungroupedFindingIds: string[];
}

type AssessedPriority = Exclude<Priority, 'unassessed'>;
type AssessedItem = RepairPriorityItem & { priority: AssessedPriority };
const priorityOrder: Record<AssessedPriority, number> = { high: 0, medium: 1, low: 2 };
const evidenceLimit = 'Pending evidence remains provisional; acceptance does not verify priority or passability.';

// Contract IDs are ASCII. Do not use locale-dependent or numeric collation.
const compareIds = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;
const compareNearTermThenId = (a: RepairPriorityItem, b: RepairPriorityItem): number =>
  Number(b.nearTerm) - Number(a.nearTerm) || compareIds(a.workAreaId, b.workAreaId);

/**
 * Orders recorded work-area priorities, without estimating severity, cost or route benefit.
 * Throws the existing survey validation error for malformed curb-survey-v1 input.
 */
export function buildRepairPriorities(input: Survey): RepairPriorities {
  const survey = validateSurvey(input);
  const activeFindingIds = new Set(survey.findings
    .filter(finding => finding.review.status !== 'rejected')
    .map(finding => finding.id));
  const groupedFindingIds = new Set(survey.workAreas.flatMap(area => area.findingIds));
  const assessed: AssessedItem[] = [];
  const needsAssessment: RepairPriorityItem[] = [];
  const monitoring: RepairPriorityItem[] = [];

  for (const area of survey.workAreas) {
    const findingIds = area.findingIds.filter(id => activeFindingIds.has(id)).sort(compareIds);
    if (findingIds.length === 0) continue;

    const nearTermReason = area.nearTerm ? 'Near-term attention marked.' : 'Not marked near-term.';
    const item = {
      workAreaId: area.id,
      findingIds,
      priority: area.priority,
      nearTerm: area.nearTerm,
    };
    if (!area.repairWorthy) {
      monitoring.push({
        ...item,
        reason: `Marked not repair-worthy; retained for monitoring. ${nearTermReason} Monitoring order: near-term first, then ASCII work-area ID ascending for ties. ${evidenceLimit}`,
      });
    } else if (area.priority === 'unassessed') {
      needsAssessment.push({
        ...item,
        reason: `Repair-worthy with unassessed priority; needs assessment before ranking, not treated as low priority. ${nearTermReason} Assessment order: near-term first, then ASCII work-area ID ascending for ties. ${evidenceLimit}`,
      });
    } else {
      assessed.push({
        ...item,
        priority: area.priority,
        reason: `Recorded ${area.priority} work-area priority. ${nearTermReason} Ranked by priority (high > medium > low), then near-term first within a priority tier, then ASCII work-area ID ascending for ties. ${evidenceLimit}`,
      });
    }
  }

  assessed.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || compareNearTermThenId(a, b));
  return {
    ranked: assessed.map((item, index) => ({ ...item, rank: index + 1 })),
    needsAssessment: needsAssessment.sort(compareNearTermThenId),
    monitoring: monitoring.sort(compareNearTermThenId),
    excludedFindingIds: survey.findings
      .filter(finding => finding.review.status === 'rejected')
      .map(finding => finding.id).sort(compareIds),
    ungroupedFindingIds: [...activeFindingIds].filter(id => !groupedFindingIds.has(id)).sort(compareIds),
  };
}
