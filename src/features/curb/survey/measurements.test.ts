import { describe, expect, it } from 'vitest';
import survey from '../../../data/curb/surveys/robertson-hall.json';
import { SurveySchema } from '../../../contracts/curb/survey';
import { buildRepairPlans } from '../../../domain/curb/survey';
import { checkStatus, clipSummary, MEASURE_SPECS, measureResults, parseMeasure, priorityScore, reviewerPriority, suggestPlan } from './measurements';

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

describe('priority score', () => {
  it('ranks only Defect 04 as high from the estimates', () => {
    const bands = Object.fromEntries(s.findings.map((f) => [f.id, priorityScore(f, {}).band]));
    expect(bands).toEqual({ 'defect-01': 'low', 'defect-02': 'low', 'defect-03': 'low', 'defect-04': 'high', 'defect-05': 'low' });
    expect(priorityScore(finding('defect-04'), {}).score).toBe(100);
  });

  it('weights measurements 70% and AI travel impact 30%', () => {
    expect(priorityScore(finding('defect-01'), {})).toMatchObject({ reviewer: 'medium', ai: 'low', score: 35 });
    expect(priorityScore(finding('defect-02'), { 'defect-02': { opening: '2' } })).toMatchObject({ reviewer: 'high', ai: 'low', score: 70, band: 'high' });
    expect(reviewerPriority([])).toBe('unassessed');
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
});
