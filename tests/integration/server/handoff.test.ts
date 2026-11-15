import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { POST } from '../../../app/api/curb/survey/report/route';
import canonical from '../../../src/data/curb/surveys/robertson-hall.json';
import { SurveySchema, type Survey } from '../../../src/contracts/curb/survey';
import { buildRepairPlans } from '../../../src/domain/curb/survey';
import { ASSUMED_METHOD, buildSuggestedPlan, dimensionSummary, REVIEWER_METHOD, withMeasurement } from '../../../src/domain/curb/measurements';
import { appendedWorkflowIssue, markReviewed, moveWorkflow, setOwner } from '../../../src/domain/curb/repair';
import { surveyToCsv } from '../../../src/domain/curb/surveyExports';
import { FindingReview } from '../../../src/features/curb/survey/FindingReview';
import { setReviewStatus } from '../../../src/features/curb/survey/presentation';
import { renderSurveyHtmlReport } from '../../../src/server/curb/surveyHtmlReport';

const base = SurveySchema.parse(canonical);

async function closeups(survey: Survey) {
  return new Map(await Promise.all(survey.findings.map(async (f) => [f.id, await readFile(join(process.cwd(), 'public', f.closeupSrc))] as const)));
}

function reviewed(): Survey {
  let s: Survey = { ...base, findings: base.findings.map((f) => f.id === 'defect-04'
    ? { ...f, review: { status: 'accepted', reviewer: 'Pat', method: 'manual', note: 'Real.' } }
    : f.id === 'defect-03' ? { ...f, review: { status: 'rejected', reviewer: 'Pat', method: 'manual', note: 'Shadow.' } } : f) };
  s = markReviewed(s, 'defect-04', 'Pat', '2026-11-20T10:01:00-05:00');
  const planned = moveWorkflow(s, 'defect-04', { action: 'advance', by: 'Pat', note: 'Scheduled with Grounds.', at: '2026-11-20T10:02:00-05:00' });
  if (!planned.ok) throw new Error(planned.message);
  s = setOwner(planned.survey, 'defect-04', 'Facilities – Grounds');
  return withMeasurement(s, 'defect-04', 'level', { value: 0.9, unit: 'in', basis: 'measured' });
}

function report(survey: unknown, planId = 'balanced', budgetCents: number | null = null, format: 'html' | 'pdf' = 'html') {
  return POST(new Request(`http://curb.test/api/curb/survey/report?format=${format}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ survey, budgetCents, planId }),
  }));
}

describe('facilities handoff report', () => {
  it('lists every active finding with photo, link, owner, status, action, rationale and cost', async () => {
    const s = reviewed();
    const html = renderSurveyHtmlReport(s, buildRepairPlans(s), 'balanced', await closeups(s), 'https://curb.example');
    const section = html.slice(html.indexOf('<section id="handoff"'), html.indexOf('<section id="plans"'));
    expect(section).toContain('<h2 id="handoff-heading">Facilities handoff</h2>');
    expect(section).toContain('Not an ADA compliance determination.');
    expect(section).toContain('<caption>Repairs for facilities, highest priority first</caption>');
    expect(section.match(/<th scope="col">/g)).toHaveLength(6);
    // Highest priority first: Defect 04 leads the table.
    expect(section.indexOf('<a href="#handoff-defect-04">')).toBeLessThan(section.indexOf('<a href="#handoff-defect-01">'));
    expect(section.match(/<img src="data:image\/jpeg;base64,[^"]+" alt="Close-up photo of [^"]+">/g)).toHaveLength(4);
    expect(section).toContain('href="https://curb.example/curb/surveys/robertson-hall?finding=defect-04"');
    expect(section).toContain('<dt>Owner</dt><dd>Facilities – Grounds</dd>');
    expect(section).toContain('<dt>Owner</dt><dd>Unassigned</dd>');
    expect(section).toContain('Repair Planned');
    expect(section).toContain('Requires professional review');
    expect(section).toMatch(/<dt>Priority rationale<\/dt><dd>High priority \(\d+\/100\): severity \d+ × 45%/);
    // Defect 02's recommended repair has no price: the cost stays unknown, never zero.
    const card02 = section.slice(section.indexOf('id="handoff-defect-02"'));
    expect(card02).toMatch(/<dt>Cost<\/dt><dd>Unknown – quote needed\. /);
    expect(section).not.toMatch(/\$0\.00/);
    // The rejected finding is named but not handed off.
    expect(section).not.toContain('id="handoff-defect-03"');
    expect(section).toContain('<strong>Rejected, not handed off:</strong> Defect 03');
    expect(section).toContain('Scheduled with Grounds.');
  });

  it('accepts reviewer repair edits through the report API', async () => {
    const response = await report(reviewed());
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('href="http://curb.test/curb/surveys/robertson-hall?finding=defect-04"');
  });

  it('rejects changes to the published obstacle, access needs or earlier history', async () => {
    const changedObstacle = structuredClone(reviewed());
    changedObstacle.findings[0].repair!.obstacle = 'Nothing to see';
    expect((await report(changedObstacle)).status).toBe(400);
    const fewerNeeds = structuredClone(reviewed());
    fewerNeeds.findings[3].repair!.accessNeeds = ['walker'];
    expect((await report(fewerNeeds)).status).toBe(400);
    const rewritten = structuredClone(reviewed());
    rewritten.findings[3].repair!.workflow[0].by = 'Someone else';
    expect((await report(rewritten)).status).toBe(400);
    const fakeMeasurement = structuredClone(reviewed());
    fakeMeasurement.findings[0].measurements.push({ property: 'level', value: 0, unit: 'in', method: 'Laser scan' });
    expect((await report(fakeMeasurement)).status).toBe(400);
  });

  it('carries repair fields into the CSV export', () => {
    const csv = surveyToCsv(reviewed());
    const [header, ...rows] = csv.trim().split('\r\n');
    for (const column of ['obstacle', 'location_confidence', 'owner', 'access_priority_score', 'priority_rationale', 'repair_status', 'repair_history']) {
      expect(header.split(',')).toContain(column);
    }
    expect(rows[3]).toContain('"Facilities – Grounds"');
    expect(rows[3]).toContain('"planned"');
    expect(rows[2]).toContain('"rejected"');
  });

  it('exports the same suggested plan the page shows, with the same assumed dimensions', async () => {
    const s = withMeasurement(reviewed(), 'defect-01', 'opening', { value: 1, unit: 'in', basis: 'assumed' });
    for (const budget of [null, 60_000]) {
      const plan = buildSuggestedPlan(s, budget);
      const html = await (await report(s, 'suggested', budget)).text();
      expect(html).toContain('<article class="card" id="plan-suggested">');
      const selected = html.slice(html.indexOf('id="plan-suggested"'), html.indexOf('</article>', html.indexOf('id="plan-suggested"')));
      expect(selected).toContain('Selected plan for this report');
      const listed = [...selected.slice(selected.indexOf('Selected treatments')).matchAll(/href="#treatment-([a-z0-9-]+)"/g)].map(m => m[1]);
      expect(listed.slice(0, plan.optionIds.length)).toEqual(plan.optionIds);
      const handoff = html.slice(html.indexOf('<section id="handoff"'), html.indexOf('<section id="plans"'));
      for (const finding of s.findings.filter(f => f.review.status !== 'rejected')) {
        expect(handoff).toContain('<dt>Dimensions</dt><dd>' + dimensionSummary(finding).replaceAll('&', '&amp;') + '.');
      }
    }
  });

  it('accepts metric input converted to inches, never read as inches', async () => {
    const s = structuredClone(base);
    s.findings[1].measurements.push({ property: 'level', value: 0.2, unit: 'm', method: REVIEWER_METHOD });
    const response = await report(s, 'suggested');
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('Height difference 7.874 in (measured, recorded 0.2 m)');
  });

  it('rejects unsupported or mismatched dimension units', async () => {
    for (const [property, unit] of [['level', 'kg'], ['crossSlope', 'in']] as const) {
      const s = structuredClone(base);
      s.findings[0].measurements.push({ property, value: 1, unit, method: ASSUMED_METHOD });
      expect((await report(s)).status).toBe(400);
    }
  });

  it.each([
    ['pending', 'ai', 400], ['pending', 'manual', 400], ['accepted', 'ai', 400], ['accepted', 'manual', 200],
  ] as const)('checks %s/%s new progress at both report formats', async (status, method, expected) => {
    const s = structuredClone(base);
    s.findings[0].review = { status, method, reviewer: 'Pat', note: 'Review metadata.' };
    s.findings[0].repair!.workflow.push(
      { status: 'reviewed', action: 'advance', by: 'Someone', at: '2026-11-20T10:01:00-05:00', note: 'x', evidence: null },
      { status: 'planned', action: 'advance', by: 'Someone', at: '2026-11-20T10:02:00-05:00', note: 'x', evidence: null },
    );
    expect(SurveySchema.safeParse(s).success).toBe(true);
    for (const format of ['html', 'pdf'] as const) {
      const response = await report(s, 'balanced', null, format);
      expect(response.status).toBe(expected);
      if (expected === 400) expect(await response.json()).toMatchObject({ error: { code: 'INVALID_REQUEST' } });
    }
  });

  it('preserves exports after a planned finding is later rejected', async () => {
    const s = reviewed();
    const history = structuredClone(s.findings[3].repair!.workflow);
    s.findings[3].review = { status: 'rejected', method: 'manual', reviewer: 'Pat', note: 'Later review rejected this finding.' };
    for (const format of ['html', 'pdf'] as const) {
      const response = await report(s, 'balanced', null, format);
      expect(response.status).toBe(200);
      if (format === 'html') {
        const html = await response.text();
        const excluded = html.match(/<strong>Rejected, not handed off:<\/strong>([^<]*)/)?.[1];
        expect(excluded).toContain(s.findings[2].label);
        expect(excluded).toContain(s.findings[3].label);
        expect(html.includes('id="handoff-defect-04"')).toBe(false);
      }
    }
    expect(s.findings[3].repair!.workflow).toEqual(history);
  });

  it.each(['pending', 'rejected'] as const)('exports a manual %s review without new repair progress', async status => {
    const s = structuredClone(base);
    s.findings[0].review = { status, method: 'manual', reviewer: 'Pat', note: 'Review updated without changing repair history.' };
    expect((await report(s)).status).toBe(200);
  });
});

describe('pending review controls preserve exportable repair history', () => {
  const id = 'defect-01';

  function decide(s: Survey, status: 'accepted' | 'rejected' | 'pending'): Survey {
    const result = setReviewStatus(s, id, status, 'Pat');
    if (!result.ok) throw new Error(result.message);
    return result.survey;
  }

  function acceptAndProgress(planned: boolean): Survey {
    const accepted = markReviewed(decide(base, 'accepted'), id, 'Pat', '2026-11-20T10:01:00-05:00');
    if (!planned) return accepted;
    const result = moveWorkflow(accepted, id, { action: 'advance', by: 'Pat', note: 'Scheduled.', at: '2026-11-20T10:02:00-05:00' });
    if (!result.ok) throw new Error(result.message);
    return result.survey;
  }

  function reviewMarkup(survey: Survey, original: Pick<Survey, 'findings'> = base) {
    return renderToStaticMarkup(createElement(FindingReview, {
      survey, original, plan: undefined, editedIds: [id], selectedFindingId: id,
      onSelectFinding: () => {}, onChange: () => {}, onMeasure: () => {},
    }));
  }

  function pendingButtonAttributes(html: string) {
    const attributes = html.match(/<button\b([^>]*)>Mark pending<\/button>/)?.[1];
    expect(attributes).toBeDefined();
    return attributes!;
  }

  it.each([
    ['Accept auto-review', false, false],
    ['Accept then Plan', true, false],
    ['Plan then Reject', true, true],
  ] as const)('explains why Mark pending is unavailable after %s and preserves valid exports', async (_label, planned, rejected) => {
    const progressed = acceptAndProgress(planned);
    const current = rejected ? decide(progressed, 'rejected') : progressed;
    const saved = SurveySchema.parse(JSON.parse(JSON.stringify(current)));
    const finding = saved.findings[0];
    expect(appendedWorkflowIssue(finding, base.findings[0])).toBeNull();

    const html = reviewMarkup(saved);
    const attributes = pendingButtonAttributes(html);
    expect(attributes).toContain('aria-disabled="true"');
    const descriptionId = attributes.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(descriptionId).toBeDefined();
    const description = html.match(new RegExp(`<[^>]+id="${descriptionId}"[^>]*>([\\s\\S]*?)</[^>]+>`))?.[1];
    expect(description).toContain('new repair steps');

    const pending = decide(saved, 'pending');
    expect(appendedWorkflowIssue(pending.findings[0], base.findings[0])).toMatch(/accepted manual review/);
    for (const format of ['html', 'pdf'] as const) expect((await report(saved, 'balanced', null, format)).status).toBe(200);
    expect(saved).toEqual(current);
  });

  it('allows fresh Reject → Mark pending while keeping JSON and both report formats valid', async () => {
    const rejected = decide(base, 'rejected');
    expect(pendingButtonAttributes(reviewMarkup(rejected))).not.toContain('aria-disabled="true"');
    const pending = decide(rejected, 'pending');
    const restored = SurveySchema.parse(JSON.parse(JSON.stringify(pending)));
    expect(appendedWorkflowIssue(restored.findings[0], base.findings[0])).toBeNull();
    expect(restored.findings[0].repair!.workflow).toEqual(base.findings[0].repair!.workflow);
    for (const format of ['html', 'pdf'] as const) expect((await report(restored, 'balanced', null, format)).status).toBe(200);
  });

  it('allows Mark pending when progressed history already belongs to the published survey', () => {
    const published = acceptAndProgress(true);
    const current = decide(published, 'rejected');
    expect(pendingButtonAttributes(reviewMarkup(current, published))).not.toContain('aria-disabled="true"');
    const pending = decide(current, 'pending');
    expect(appendedWorkflowIssue(pending.findings[0], published.findings[0])).toBeNull();
    expect(pending.findings[0].repair!.workflow).toEqual(published.findings[0].repair!.workflow);
    expect(published.findings[0].review.status).toBe('accepted');
  });
});
