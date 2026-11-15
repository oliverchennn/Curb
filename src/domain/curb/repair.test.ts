import { describe, expect, it } from 'vitest';
import survey from '../../data/curb/surveys/robertson-hall.json';
import { SurveySchema, workflowIssue, type Survey, type WorkflowStep } from '../../contracts/curb/survey';
import { canReopen, markReviewed, moveWorkflow, nextWorkflowStatus, repairOf, setEssentialDestination, setOwner, workflowStatus, workflowSummary } from './repair';

const base = SurveySchema.parse(survey);
const at = (minute: number) => `2026-11-20T10:${String(minute).padStart(2, '0')}:00-05:00`;

function accepted(s: Survey, id: string): Survey {
  return markReviewed({ ...s, findings: s.findings.map((f) => f.id === id ? { ...f, review: { status: 'accepted', reviewer: 'Pat', method: 'manual', note: 'Real.' } } : f) }, id, 'Pat', at(1));
}

function ok(result: ReturnType<typeof moveWorkflow>): Survey {
  if (!result.ok) throw new Error(result.message);
  return result.survey;
}

describe('remediation workflow', () => {
  it('starts every Robertson finding at submitted', () => {
    expect(base.findings.map(workflowStatus)).toEqual(Array(5).fill('submitted'));
    expect(workflowSummary(base).text).toBe('5 submitted');
  });

  it('moves submitted → re-verified with notes, who and when', () => {
    let s = accepted(base, 'defect-04');
    expect(workflowStatus(s.findings[3])).toBe('reviewed');
    s = ok(moveWorkflow(s, 'defect-04', { action: 'advance', by: 'Pat', note: 'Scheduled with Grounds.', at: at(2) }));
    s = ok(moveWorkflow(s, 'defect-04', { action: 'advance', by: 'Sam', note: 'Panel replaced.', at: at(3) }));
    expect(moveWorkflow(s, 'defect-04', { action: 'advance', by: 'Pat', note: 'Looks fine.', at: at(4) }))
      .toEqual({ ok: false, message: expect.stringMatching(/fresh evidence/) });
    s = ok(moveWorkflow(s, 'defect-04', { action: 'advance', by: 'Pat', note: 'Rechecked.', evidence: 'Height difference 0.1 in; photo IMG_0815', at: at(4) }));
    const history = repairOf(s.findings[3]).workflow;
    expect(history.map((step) => step.status)).toEqual(['submitted', 'reviewed', 'planned', 'completed', 'reverified']);
    expect(history[3]).toMatchObject({ by: 'Sam', note: 'Panel replaced.' });
    expect(nextWorkflowStatus(s.findings[3])).toBeNull();
    expect(workflowSummary(s).text).toBe('1 re-verified, 4 submitted');
    expect(SurveySchema.safeParse(s).success).toBe(true);
  });

  it('needs an accepted review before reviewed, a name and a note for every step', () => {
    expect(nextWorkflowStatus(base.findings[0])).toBeNull();
    const s = accepted(base, 'defect-01');
    expect(moveWorkflow(s, 'defect-01', { action: 'advance', by: ' ', note: 'x' }).ok).toBe(false);
    expect(moveWorkflow(s, 'defect-01', { action: 'advance', by: 'Pat', note: ' ' }).ok).toBe(false);
  });

  it('reopens planned or later work to reviewed and keeps the history', () => {
    let s = accepted(base, 'defect-01');
    expect(canReopen(s.findings[0])).toBe(false);
    s = ok(moveWorkflow(s, 'defect-01', { action: 'advance', by: 'Pat', note: 'Planned.', at: at(2) }));
    s = ok(moveWorkflow(s, 'defect-01', { action: 'reopen', by: 'Pat', note: 'Crack spread.', at: at(3) }));
    expect(repairOf(s.findings[0]).workflow.map((step) => `${step.action}:${step.status}`))
      .toEqual(['advance:submitted', 'advance:reviewed', 'advance:planned', 'reopen:reviewed']);
  });

  it('takes rejected findings out of the workflow', () => {
    const s = { ...base, findings: base.findings.map((f, i) => i === 1 ? { ...f, review: { ...f.review, status: 'rejected' as const } } : f) };
    expect(nextWorkflowStatus(s.findings[1])).toBeNull();
    expect(moveWorkflow(s, 'defect-02', { action: 'advance', by: 'Pat', note: 'x' }).ok).toBe(false);
    expect(workflowSummary(s).text).toBe('4 submitted, 1 rejected');
  });

  it('rejects skipped, backward or out-of-order histories in the contract', () => {
    const step = (status: WorkflowStep['status'], minute: number, action: WorkflowStep['action'] = 'advance', evidence: string | null = null): WorkflowStep =>
      ({ status, action, by: 'Pat', at: at(minute), note: 'n', evidence });
    expect(workflowIssue([step('submitted', 0), step('planned', 1)])).toMatch(/cannot move/);
    expect(workflowIssue([step('submitted', 0), step('reviewed', 1), step('submitted', 2)])).toMatch(/cannot move/);
    expect(workflowIssue([step('submitted', 0), step('reviewed', 1, 'reopen')])).toMatch(/Reopen/);
    expect(workflowIssue([step('submitted', 2), step('reviewed', 1)])).toMatch(/time order/);
    expect(workflowIssue([step('reviewed', 0)])).toMatch(/start at submitted/);
    expect(workflowIssue([step('submitted', 0), step('reviewed', 1), step('planned', 2), step('completed', 3), step('reverified', 4)])).toMatch(/evidence/);
  });
});

describe('repair fields', () => {
  it('accepts v1 surveys without repair fields and fills safe defaults', () => {
    const v1 = structuredClone(survey) as { findings: Record<string, unknown>[] };
    for (const finding of v1.findings) delete finding.repair;
    const parsed = SurveySchema.parse(v1);
    const repair = repairOf(parsed.findings[0], parsed);
    expect(repair).toMatchObject({ owner: null, essentialDestination: 'unknown', locationConfidence: 'unknown', accessNeeds: [] });
    expect(workflowStatus(parsed.findings[0])).toBe('submitted');
  });

  it('records an owner and needs a note for a yes or no destination answer', () => {
    const owned = setOwner(base, 'defect-04', 'Facilities – Grounds');
    expect(repairOf(owned.findings[3]).owner).toBe('Facilities – Grounds');
    expect(repairOf(setOwner(owned, 'defect-04', '  ').findings[3]).owner).toBeNull();
    expect(setEssentialDestination(base, 'defect-04', 'yes', '').ok).toBe(false);
    const answered = setEssentialDestination(base, 'defect-04', 'yes', 'Only step-free route to the Robertson entrance');
    expect(answered.ok && repairOf(answered.survey.findings[3]).destinationNote).toBe('Only step-free route to the Robertson entrance');
    const bad = structuredClone(base);
    bad.findings[0].repair!.essentialDestination = 'yes';
    expect(SurveySchema.safeParse(bad).success).toBe(false);
  });
});
