import { WORKFLOW_ORDER, workflowIssue, type AccessNeed, type Finding, type Repair, type Survey, type WorkflowStatus, type WorkflowStep } from '../../contracts/curb/survey';

// Repair-handoff fields and the remediation workflow. Pure helpers.

export const ACCESS_NEED_LABELS: Record<AccessNeed, string> = {
  mobility_device: 'wheelchair or mobility device',
  low_vision_cane: 'low vision or cane',
  walker: 'walker',
  stroller: 'stroller',
};
export const ACCESS_NEED_SHORT: Record<AccessNeed, string> = {
  mobility_device: 'Wheelchair', low_vision_cane: 'Cane', walker: 'Walker', stroller: 'Stroller',
};
export const ACCESS_NEED_COUNT = 4;

export const LOCATION_CONFIDENCE_LABELS: Record<Repair['locationConfidence'], string> = {
  confirmed: 'Confirmed on site',
  approximate: 'Approximate (GPS or video)',
  unknown: 'Unknown',
};

export const WORKFLOW_LABELS: Record<WorkflowStatus, string> = {
  submitted: 'Submitted', reviewed: 'Reviewed', planned: 'Planned', completed: 'Completed', reverified: 'Re-verified',
};

/** The finding's repair fields, or conservative defaults for v1 data without them. */
export function repairOf(finding: Finding, survey?: Pick<Survey, 'site' | 'analysis'>): Repair {
  return finding.repair ?? {
    obstacle: finding.kind,
    location: survey?.site.name ?? 'Location not recorded',
    locationConfidence: 'unknown',
    accessNeeds: [],
    owner: null,
    essentialDestination: 'unknown',
    destinationNote: null,
    professionalReview: false,
    workflow: [{ status: 'submitted', action: 'advance', by: finding.review.reviewer, at: survey?.analysis.createdAt ?? '1970-01-01T00:00:00Z', note: 'Recorded in the survey.', evidence: null }],
  };
}

export function workflowStatus(finding: Finding): WorkflowStatus {
  return repairOf(finding).workflow.at(-1)!.status;
}

/** Statuses a finding can move to next (forward one step), and whether it can be reopened. */
export function nextWorkflowStatus(finding: Finding): WorkflowStatus | null {
  if (finding.review.status === 'rejected') return null;
  const current = WORKFLOW_ORDER.indexOf(workflowStatus(finding));
  const next = WORKFLOW_ORDER[current + 1] ?? null;
  // Reviewed means a person accepted the finding.
  if (next === 'reviewed' && finding.review.status !== 'accepted') return null;
  return next;
}

export function canReopen(finding: Finding): boolean {
  return finding.review.status !== 'rejected' && WORKFLOW_ORDER.indexOf(workflowStatus(finding)) >= WORKFLOW_ORDER.indexOf('planned');
}

export type WorkflowEdit = { ok: true; survey: Survey } | { ok: false; message: string };

function clean(text: string | null | undefined): string | null {
  const value = text?.trim() ?? '';
  return value.length >= 1 && value.length <= 4000 ? value : null;
}

function updateRepair(survey: Survey, findingId: string, update: (repair: Repair, finding: Finding) => Repair): Survey {
  return { ...survey, findings: survey.findings.map((finding) => finding.id === findingId ? { ...finding, repair: update(repairOf(finding, survey), finding) } : finding) };
}

/** Move a finding one step forward, or reopen it to reviewed. Records who, when and why. */
export function moveWorkflow(survey: Survey, findingId: string, input: {
  action: 'advance' | 'reopen'; by: string; note: string; evidence?: string; at?: string;
}): WorkflowEdit {
  const finding = survey.findings.find((item) => item.id === findingId);
  if (!finding) return { ok: false, message: 'That finding is no longer in this survey.' };
  const by = clean(input.by);
  if (!by) return { ok: false, message: 'Enter a reviewer name before changing the repair status.' };
  const note = clean(input.note);
  if (!note) return { ok: false, message: 'Add a short note about this step.' };
  const status: WorkflowStatus | null = input.action === 'reopen' ? (canReopen(finding) ? 'reviewed' : null) : nextWorkflowStatus(finding);
  if (!status) {
    return { ok: false, message: finding.review.status === 'rejected'
      ? 'Rejected findings are out of the repair workflow.'
      : input.action === 'reopen' ? 'Only planned or later repairs can be reopened.'
        : workflowStatus(finding) === 'submitted' ? 'Accept the finding first; that marks it reviewed.' : 'This repair is already re-verified.' };
  }
  const evidence = clean(input.evidence);
  if (status === 'reverified' && !evidence) return { ok: false, message: 'Re-verifying needs fresh evidence: a new measurement or a photo/video reference.' };
  const step: WorkflowStep = { status, action: input.action, by, at: input.at ?? new Date().toISOString(), note, evidence: status === 'reverified' ? evidence : evidence ?? null };
  const history = [...repairOf(finding, survey).workflow, step];
  const issue = workflowIssue(history);
  if (issue) return { ok: false, message: issue };
  return { ok: true, survey: updateRepair(survey, findingId, (repair) => ({ ...repair, workflow: history })) };
}

/** Accepting a submitted finding records the review step in the workflow. */
export function markReviewed(survey: Survey, findingId: string, by: string, at?: string): Survey {
  const finding = survey.findings.find((item) => item.id === findingId);
  if (!finding || finding.review.status !== 'accepted' || workflowStatus(finding) !== 'submitted') return survey;
  const result = moveWorkflow(survey, findingId, { action: 'advance', by, note: 'Accepted as a real defect.', at });
  return result.ok ? result.survey : survey;
}

export function setOwner(survey: Survey, findingId: string, owner: string): Survey {
  return updateRepair(survey, findingId, (repair) => ({ ...repair, owner: clean(owner) }));
}

export function setEssentialDestination(survey: Survey, findingId: string, answer: Repair['essentialDestination'], note: string): WorkflowEdit {
  const text = clean(note);
  if (answer !== 'unknown' && !text) return { ok: false, message: 'Name the destination or explain the answer.' };
  return { ok: true, survey: updateRepair(survey, findingId, (repair) => ({ ...repair, essentialDestination: answer, destinationNote: answer === 'unknown' ? null : text })) };
}

export function setLocationConfidence(survey: Survey, findingId: string, confidence: Repair['locationConfidence']): Survey {
  return updateRepair(survey, findingId, (repair) => ({ ...repair, locationConfidence: confidence }));
}

/** "1 re-verified, 1 planned, 3 submitted" — rejected findings are counted separately. */
export function workflowSummary(survey: Survey): { counts: Record<WorkflowStatus, number>; rejected: number; text: string } {
  const counts = Object.fromEntries(WORKFLOW_ORDER.map((status) => [status, 0])) as Record<WorkflowStatus, number>;
  let rejected = 0;
  for (const finding of survey.findings) {
    if (finding.review.status === 'rejected') rejected++;
    else counts[workflowStatus(finding)]++;
  }
  const parts = [...WORKFLOW_ORDER].reverse().filter((status) => counts[status]).map((status) => `${counts[status]} ${WORKFLOW_LABELS[status].toLowerCase()}`);
  if (rejected) parts.push(`${rejected} rejected`);
  return { counts, rejected, text: parts.join(', ') || 'No findings' };
}

/** Steps added beyond the published history need a person's review of the finding first,
 * so a pending AI finding cannot become reviewed or planned by importing or posting JSON. */
export function appendedWorkflowIssue(edited: Finding, published: Finding | undefined): string | null {
  const before = published ? repairOf(published).workflow.length : 1;
  const after = repairOf(edited).workflow.length;
  if (after <= before) return null;
  if (edited.review.method !== 'manual') return `${edited.label}: repair steps need a person's review first`;
  return null;
}
