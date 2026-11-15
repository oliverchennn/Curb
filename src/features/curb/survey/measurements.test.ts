import { describe, expect, it } from 'vitest';
import survey from '../../../data/curb/surveys/robertson-hall.json';
import { SurveySchema } from '../../../contracts/curb/survey';
import { buildRepairPlans } from '../../../domain/curb/survey';
import { checkStatus, clipFor, clipSummary, entriesFromSurvey, MEASURE_SPECS, measureResults, parseMeasure, priorityRationale, priorityScore, reviewerPriority, suggestPlan, uncertaintyTags, withMeasurement } from './measurements';

const s = SurveySchema.parse(survey);
const spec = (key: string) => MEASURE_SPECS.find((item) => item.key === key)!;
const finding = (id: string) => s.findings.find((item) => item.id === id)!;

describe('measurement checks', () => {
  it('grades against ADA thresholds in both directions', () => {
    expect(checkStatus(spec('opening'), 0.5)).toBe('meets');
    expect(checkStatus(spec('opening'), 0.6)).toBe('almost');
    expect(checkStatus(spec('opening'), 0.8)).toBe('fails');
    expect(checkStatus(spec('clearWidth'), 36)).toBe('meets');
    expect(checkStatus(spec('clearWidth'), 33)).toBe('almost');
    expect(checkStatus(spec('clearWidth'), 30)).toBe('fails');
  });

  it('parses only plain nonnegative numbers', () => {
    expect(parseMeasure(' 0.25 ')).toBe(0.25);
    expect(parseMeasure('.5')).toBe(0.5);
    for (const bad of ['', '-1', 'abc', '1e3', '1,5', undefined]) expect(parseMeasure(bad)).toBeNull();
  });

  it('prefers a reviewer measurement over the estimate', () => {
    const before = measureResults('defect-02', {}).find((r) => r.spec.key === 'level')!;
    expect(before).toMatchObject({ source: 'estimate', status: 'meets' });
    const after = measureResults('defect-02', { 'defect-02': { level: '0.9' } }).find((r) => r.spec.key === 'level')!;
    expect(after).toMatchObject({ source: 'measured', value: 0.9, status: 'fails' });
  });
});

describe('access-impact priority', () => {
  it('ranks Defect 04 first and high from the current data', () => {
    const scores = s.findings.map((f) => [f.id, priorityScore(f, {})] as const);
    expect(Object.fromEntries(scores.map(([id, p]) => [id, p.band]))).toEqual({
      'defect-01': 'medium', 'defect-02': 'low', 'defect-03': 'low', 'defect-04': 'high', 'defect-05': 'low',
    });
    expect([...scores].sort((x, y) => y[1].score - x[1].score)[0][0]).toBe('defect-04');
  });

  it('breaks the score into weighted factors that add up', () => {
    const p = priorityScore(finding('defect-04'), {});
    expect(p.factors.map((f) => f.key)).toEqual(['severity', 'destination', 'needs']);
    expect(p.score).toBe(Math.round(p.factors.reduce((sum, f) => sum + f.weight * f.points, 0)));
    expect(priorityRationale(p)).toMatch(/^High priority \(77\/100\): severity 95 × 45%, essential destination 30 × 30%, access needs affected 100 × 25%; confidence low/);
  });

  it('never treats an unknown essential destination as yes', () => {
    const base = finding('defect-03');
    const withAnswer = (answer: 'yes' | 'no' | 'unknown') => priorityScore({ ...base, repair: { ...base.repair!, essentialDestination: answer, destinationNote: answer === 'unknown' ? null : 'Main entrance' } }, {});
    expect(withAnswer('unknown').score).toBeLessThan(withAnswer('yes').score);
    expect(withAnswer('unknown').score).toBeGreaterThan(withAnswer('no').score);
    expect(withAnswer('yes').band).toBe('medium');
  });

  it('raises severity, not confidence, when a measurement fails', () => {
    const before = priorityScore(finding('defect-02'), {});
    const after = priorityScore(finding('defect-02'), { 'defect-02': { opening: '2' } });
    expect(after.factors[0].points).toBeGreaterThan(before.factors[0].points);
    expect(after.confidence.reasons[0]).toBe('1 of 5 values measured');
    expect(reviewerPriority([])).toBe('unassessed');
  });

  it('flags open questions', () => {
    expect(uncertaintyTags(s, finding('defect-04'), {})).toEqual(['needs_measurement', 'professional_review', 'quote_needed']);
    expect(uncertaintyTags(s, finding('defect-01'), {})).toEqual(['needs_measurement']);
  });

  it('stores reviewer measurements on the survey and reads them back', () => {
    const edited = withMeasurement(s, 'defect-01', 'level', '0.1');
    expect(entriesFromSurvey(edited)).toEqual({ 'defect-01': { level: '0.1' } });
    expect(entriesFromSurvey(withMeasurement(edited, 'defect-01', 'level', ''))).toEqual({});
    expect(SurveySchema.safeParse(edited).success).toBe(true);
  });
});

describe('suggested plan', () => {
  it('orders by priority and includes everything without a budget', () => {
    const plan = suggestPlan(s, {}, null);
    expect(plan.steps[0].finding.id).toBe('defect-04');
    expect(plan.steps[0].treatment.method).toBe('replace');
    expect(plan.steps.slice(1).every((step) => step.treatment.method === 'seal')).toBe(true);
    expect(plan.included).toBe(5);
  });

  it('adds repairs in priority order while the upper estimate fits the budget', () => {
    const plan = suggestPlan(s, {}, 150_000);
    expect(plan.highCents).toBeLessThanOrEqual(150_000);
    expect(plan.steps[0]).toMatchObject({ included: true });
    expect(plan.skipped).toBeGreaterThan(0);
    expect(suggestPlan(s, {}, 0).included).toBe(0);
  });

  it('skips rejected findings', () => {
    const edited = { ...s, findings: s.findings.map((f) => f.id === 'defect-04' ? { ...f, review: { ...f.review, status: 'rejected' as const } } : f) };
    expect(suggestPlan(edited, {}, null).steps.map((step) => step.finding.id)).not.toContain('defect-04');
  });

  it('leaves the root plan evaluator unchanged', () => {
    expect(buildRepairPlans(s).map((plan) => plan.id)).toEqual(['essential', 'balanced', 'durable']);
  });
});

describe('CLIP check', () => {
  it('covers every finding', () => {
    expect(clipSummary(s)).toEqual({ confirmed: 5, total: 5 });
  });

  it('rates only Defect 04 as high travel impact', () => {
    expect(s.findings.map((f) => clipFor(f.id)?.impactPriority)).toEqual(['low', 'low', 'low', 'high', 'low']);
  });
});
