import { describe, expect, it } from 'vitest';
import survey from '../../../data/curb/surveys/robertson-hall.json';
import { SurveySchema, toCanonical, type Survey } from '../../../contracts/curb/survey';
import { buildRepairPlans, costRange } from '../../../domain/curb/survey';
import {
  ASSUMED_METHOD, buildAllPlans, buildSuggestedPlan, checkStatus, clipFor, clipSummary, dimensionSummary, MEASURE_SPECS,
  measureResults, parseMeasure, parseMeasureInput, priorityRationale, priorityScore, rankWorkAreas, REVIEWER_METHOD,
  reviewerPriority, uncertaintyTags, withMeasurement,
} from './measurements';
import { PRIORITY_EXPLANATION } from './PlanCompare';

const s = SurveySchema.parse(survey);
const spec = (key: string) => MEASURE_SPECS.find((item) => item.key === key)!;
const finding = (id: string, from: Survey = s) => from.findings.find((item) => item.id === id)!;
const result = (id: string, key: string, from: Survey = s) => measureResults(finding(id, from)).find((r) => r.spec.key === key)!;
const clone = (): Survey => structuredClone(s);

describe('measurement checks', () => {
  it('grades against ADA thresholds in both directions', () => {
    expect(checkStatus(spec('opening'), 0.5)).toBe('meets');
    expect(checkStatus(spec('opening'), 0.6)).toBe('almost');
    expect(checkStatus(spec('opening'), 0.8)).toBe('fails');
    expect(checkStatus(spec('clearWidth'), 36)).toBe('meets');
    expect(checkStatus(spec('clearWidth'), 33)).toBe('almost');
    expect(checkStatus(spec('clearWidth'), 30)).toBe('fails');
  });

  it('parses numbers with optional supported units', () => {
    expect(parseMeasure(' 0.25 ')).toBe(0.25);
    expect(parseMeasure('.5')).toBe(0.5);
    for (const bad of ['', '-1', 'abc', '1e3', '1,5', undefined]) expect(parseMeasure(bad)).toBeNull();
  });
});

describe('assumed dimensions', () => {
  it('prefills every finding with labeled assumptions, not field measurements', () => {
    expect(result('defect-02', 'level')).toMatchObject({ value: 0.2, basis: 'assumed', isDefault: true, status: 'meets' });
    expect(s.findings.every((f) => f.measurements.length === 0)).toBe(true);
  });

  it('stores an edited assumption as assumed, never as a field measurement', () => {
    const edited = withMeasurement(s, 'defect-02', 'level', { value: 0.9, unit: 'in', basis: 'assumed' });
    expect(finding('defect-02', edited).measurements).toEqual([{ property: 'level', value: 0.9, unit: 'in', method: ASSUMED_METHOD }]);
    expect(result('defect-02', 'level', edited)).toMatchObject({ value: 0.9, basis: 'assumed', isDefault: false, status: 'fails' });
  });

  it('records a field measurement only when marked measured', () => {
    const measured = withMeasurement(s, 'defect-02', 'level', { value: 0.1, unit: 'in', basis: 'measured' });
    expect(finding('defect-02', measured).measurements[0].method).toBe(REVIEWER_METHOD);
    expect(result('defect-02', 'level', measured).basis).toBe('measured');
  });

  it('does not store an unchanged assumption, and clearing restores the default', () => {
    expect(withMeasurement(s, 'defect-02', 'level', { value: 0.2, unit: 'in', basis: 'assumed' })).toEqual(s);
    const edited = withMeasurement(s, 'defect-02', 'level', { value: 0.9, unit: 'in', basis: 'assumed' });
    expect(withMeasurement(edited, 'defect-02', 'level', null)).toEqual(s);
  });

  it('keeps edited values and their basis through a JSON save and reload', () => {
    let edited = withMeasurement(s, 'defect-01', 'level', { value: 6.35, unit: 'mm', basis: 'measured' });
    edited = withMeasurement(edited, 'defect-03', 'crossSlope', { value: 2.5, unit: '%', basis: 'assumed' });
    const reloaded = SurveySchema.parse(JSON.parse(JSON.stringify(edited)));
    expect(dimensionSummary(finding('defect-01', reloaded))).toBe(dimensionSummary(finding('defect-01', edited)));
    expect(result('defect-01', 'level', reloaded)).toMatchObject({ value: 0.25, basis: 'measured', recorded: '6.35 mm' });
    expect(result('defect-03', 'crossSlope', reloaded)).toMatchObject({ value: 2.5, basis: 'assumed' });
  });
});

describe('units', () => {
  it('treats 0.25 in, 6.35 mm, 0.635 cm and 0.00635 m as the same threshold value', () => {
    for (const [value, unit] of [[0.25, 'in'], [6.35, 'mm'], [0.635, 'cm'], [0.00635, 'm']] as const) {
      expect(toCanonical('length', value, unit)).toBe(0.25);
      const edited = withMeasurement(s, 'defect-02', 'level', { value, unit, basis: 'measured' });
      expect(result('defect-02', 'level', edited)).toMatchObject({ value: 0.25, status: 'meets' });
    }
    expect(toCanonical('length', 0.5, 'ft')).toBe(6);
  });

  it('never reads metres as inches: 0.2 m is 7.874 in', () => {
    const edited = clone();
    finding('defect-02', edited).measurements.push({ property: 'level', value: 0.2, unit: 'm', method: REVIEWER_METHOD });
    const parsed = SurveySchema.parse(edited);
    expect(result('defect-02', 'level', parsed)).toMatchObject({ value: 7.874015748, status: 'fails' });
  });

  it('rejects unsupported or mismatched units at the contract boundary', () => {
    for (const [property, unit] of [['level', '%'], ['clearWidth', 'kg'], ['crossSlope', 'in'], ['runningSlope', 'deg'], ['opening', 'IN']] as const) {
      const bad = clone();
      finding('defect-01', bad).measurements.push({ property, value: 1, unit, method: ASSUMED_METHOD });
      expect(SurveySchema.safeParse(bad).success, `${property} in ${unit}`).toBe(false);
    }
  });

  it('parses typed input with units and refuses the wrong kind', () => {
    expect(parseMeasureInput('6.35 mm', 'level')).toMatchObject({ ok: true, value: 6.35, unit: 'mm', canonical: 0.25 });
    expect(parseMeasureInput('0.5ft', 'clearWidth')).toMatchObject({ ok: true, canonical: 6 });
    expect(parseMeasureInput('1.8%', 'crossSlope')).toMatchObject({ ok: true, canonical: 1.8 });
    expect(parseMeasureInput('2 in', 'crossSlope').ok).toBe(false);
    expect(parseMeasureInput('2%', 'level').ok).toBe(false);
    expect(parseMeasureInput('-1', 'level').ok).toBe(false);
  });
});

describe('access-impact priority', () => {
  it('ranks Defect 04 first and high from the current data', () => {
    const scores = s.findings.map((f) => [f.id, priorityScore(f)] as const);
    expect(Object.fromEntries(scores.map(([id, p]) => [id, p.band]))).toEqual({
      'defect-01': 'medium', 'defect-02': 'low', 'defect-03': 'low', 'defect-04': 'high', 'defect-05': 'low',
    });
    expect([...scores].sort((x, y) => y[1].score - x[1].score)[0][0]).toBe('defect-04');
  });

  it('breaks the score into weighted factors that add up', () => {
    const p = priorityScore(finding('defect-04'));
    expect(p.factors.map((f) => f.key)).toEqual(['severity', 'destination', 'needs']);
    expect(p.score).toBe(Math.round(p.factors.reduce((sum, f) => sum + f.weight * f.points, 0)));
    expect(priorityRationale(p)).toMatch(/^High priority \(77\/100\): severity 95 × 45%, essential destination 30 × 30%, access needs affected 100 × 25%; confidence low \(dimensions are assumed/);
  });

  it('explains the actual weights on the plan tab', () => {
    expect(PRIORITY_EXPLANATION).toBe('Ranked by access impact: severity 45% (ADA checks 80%, CLIP travel impact 20%), essential destination 30%, access needs affected 25%.');
  });

  it('never treats an unknown essential destination as yes', () => {
    const base = finding('defect-03');
    const withAnswer = (answer: 'yes' | 'no' | 'unknown') => priorityScore({ ...base, repair: { ...base.repair!, essentialDestination: answer, destinationNote: answer === 'unknown' ? null : 'Main entrance' } });
    expect(withAnswer('unknown').score).toBeLessThan(withAnswer('yes').score);
    expect(withAnswer('unknown').score).toBeGreaterThan(withAnswer('no').score);
  });

  it('raises severity, not confidence, for an assumed failing value', () => {
    const before = priorityScore(finding('defect-02'));
    const after = priorityScore(finding('defect-02', withMeasurement(s, 'defect-02', 'opening', { value: 2, unit: 'in', basis: 'assumed' })));
    expect(after.factors[0].points).toBeGreaterThan(before.factors[0].points);
    expect(after.confidence.reasons[0]).toBe('dimensions are assumed');
    expect(reviewerPriority([])).toBe('unassessed');
  });

  it('flags open questions against the plan in use', () => {
    const [suggested] = buildAllPlans(s, null);
    expect(uncertaintyTags(s, finding('defect-04'), suggested)).toEqual(['needs_measurement', 'professional_review']);
    expect(uncertaintyTags(s, finding('defect-01'), suggested)).toEqual(['needs_measurement']);
    const balanced = buildRepairPlans(s).find((p) => p.id === 'balanced')!;
    expect(uncertaintyTags(s, finding('defect-04'), balanced)).toContain('quote_needed');
  });
});

describe('suggested plan (one work-area plan for page and report)', () => {
  it('is a RepairPlan built first, with each eligible area ranked', () => {
    const plans = buildAllPlans(s, null);
    expect(plans.map((p) => p.id)).toEqual(['suggested', 'essential', 'balanced', 'durable']);
    expect(rankWorkAreas(s)[0].area.id).toBe('panel-04');
    expect(plans[0].optionIds).toEqual(['panel-01-seal', 'panel-02-seal', 'panel-03-seal', 'panel-04-replace', 'panel-05-seal']);
  });

  it('charges a work area once even when it holds several findings', () => {
    const grouped = clone();
    grouped.workAreas = grouped.workAreas.filter((a) => a.id !== 'panel-02');
    grouped.workAreas.find((a) => a.id === 'panel-01')!.findingIds.push('defect-02');
    grouped.treatments = grouped.treatments.filter((t) => t.workAreaId !== 'panel-02');
    const plan = buildSuggestedPlan(SurveySchema.parse(grouped));
    expect(plan.optionIds.filter((id) => id.startsWith('panel-01'))).toEqual(['panel-01-seal']);
    const total = plan.optionIds.reduce((sum, id) => sum + costRange(grouped.treatments.find((t) => t.id === id)!.cost)!.highCents, 0);
    expect(plan.cost.highCents).toBe(total);
  });

  it('counts priced shared setup once inside the budget', () => {
    const withSetup = clone();
    withSetup.sharedCosts = [{ id: 'site-setup', label: 'Site setup', cost: { status: 'estimated', rateLowCents: 10_000, rateHighCents: 10_000, quantityLow: 1, quantityHigh: 1, unit: 'job', sourceIds: ['palmyra-2026'], assumptions: ['One mobilization.'], exclusions: [] } }];
    const parsed = SurveySchema.parse(withSetup);
    const full = buildSuggestedPlan(parsed);
    const scopeOnly = full.cost.highCents - 10_000;
    expect(full.cost.isComplete).toBe(true);
    const tight = buildSuggestedPlan(parsed, scopeOnly);
    expect(tight.cost.highCents).toBeLessThanOrEqual(scopeOnly);
    expect(tight.deferredWorkAreaIds.length).toBeGreaterThan(0);
    expect(buildSuggestedPlan(parsed, full.cost.highCents).optionIds).toEqual(full.optionIds);
  });

  it('keeps quote-only areas visible as deferred', () => {
    const quoteOnly = clone();
    for (const t of quoteOnly.treatments) if (t.workAreaId === 'panel-01') t.cost = { status: 'quote_required', reason: 'Needs a site quote.' };
    const parsed = SurveySchema.parse(quoteOnly);
    const plan = buildSuggestedPlan(parsed);
    expect(plan.deferredWorkAreaIds).toContain('panel-01');
    expect(rankWorkAreas(parsed).find((r) => r.area.id === 'panel-01')).toMatchObject({ treatment: null });
    expect(plan.workAreaIds.length + plan.deferredWorkAreaIds.length).toBe(5);
  });

  it('charges nothing, setup included, when nothing is selected', () => {
    const empty = buildSuggestedPlan(s, 0);
    expect(empty).toMatchObject({ optionIds: [], workAreaIds: [], cost: { lowCents: 0, highCents: 0, unpricedItems: [] } });
    expect(empty.deferredWorkAreaIds).toHaveLength(5);
  });

  it('does not depend on the order of findings, areas or treatments', () => {
    const shuffled = clone();
    shuffled.findings.reverse();
    shuffled.workAreas.reverse();
    shuffled.treatments.reverse();
    const parsed = SurveySchema.parse(shuffled);
    for (const budget of [null, 50_000, 150_000]) {
      const a = buildSuggestedPlan(s, budget);
      const b = buildSuggestedPlan(parsed, budget);
      // Selection, totals and fit are identical; listing order of deferred areas and checks follows the input.
      const norm = (p: typeof a) => ({ ...p, deferredWorkAreaIds: [...p.deferredWorkAreaIds].sort(), pendingChecks: [...p.pendingChecks].sort() });
      expect(norm(b)).toEqual(norm(a));
    }
  });

  it('recomputes after edits and rejection', () => {
    const rejected = clone();
    finding('defect-04', rejected).review = { status: 'rejected', reviewer: 'Pat', method: 'manual', note: 'Shadow.' };
    expect(buildSuggestedPlan(SurveySchema.parse(rejected)).workAreaIds).not.toContain('panel-04');
    const raised = withMeasurement(s, 'defect-03', 'opening', { value: 2, unit: 'in', basis: 'assumed' });
    expect(rankWorkAreas(raised).findIndex((r) => r.area.id === 'panel-03')).toBeLessThan(rankWorkAreas(s).findIndex((r) => r.area.id === 'panel-03'));
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
