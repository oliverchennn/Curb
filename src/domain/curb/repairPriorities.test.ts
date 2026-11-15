import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import type { Priority, Survey } from '../../contracts/curb/survey';
import fixture from '../../data/curb/surveys/robertson-hall.json';
import { buildRepairPriorities } from './repairPriorities';
import { validateSurvey } from './survey';

const fresh = (): Survey => validateSurvey(structuredClone(fixture));
const rankedIds = (survey: Survey) => buildRepairPriorities(survey).ranked.map(item => item.workAreaId);

function removeArea(survey: Survey, id: string): void {
  survey.workAreas = survey.workAreas.filter(area => area.id !== id);
  survey.treatments = survey.treatments.filter(treatment => treatment.workAreaId !== id);
}

function renameArea(survey: Survey, previous: string, next: string): void {
  survey.workAreas.find(area => area.id === previous)!.id = next;
  for (const treatment of survey.treatments) {
    if (treatment.workAreaId === previous) treatment.workAreaId = next;
  }
}

function freezeDeep(value: unknown): void {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
}

function permutations<T>(values: T[]): T[][] {
  if (values.length === 0) return [[]];
  return values.flatMap((value, index) => permutations(values.filter((_, i) => i !== index))
    .map(rest => [value, ...rest]));
}

describe('damage-first repair priorities', () => {
  it('orders the five actual Robertson areas and gives contiguous one-based ranks', () => {
    const result = buildRepairPriorities(fresh());
    expect(result.ranked.map(({ workAreaId, rank, priority, nearTerm, findingIds }) =>
      ({ workAreaId, rank, priority, nearTerm, findingIds }))).toEqual([
      { workAreaId: 'panel-01', rank: 1, priority: 'high', nearTerm: true, findingIds: ['defect-01'] },
      { workAreaId: 'panel-02', rank: 2, priority: 'high', nearTerm: true, findingIds: ['defect-02'] },
      { workAreaId: 'panel-04', rank: 3, priority: 'high', nearTerm: true, findingIds: ['defect-04'] },
      { workAreaId: 'panel-03', rank: 4, priority: 'medium', nearTerm: false, findingIds: ['defect-03'] },
      { workAreaId: 'panel-05', rank: 5, priority: 'medium', nearTerm: false, findingIds: ['defect-05'] },
    ]);
    expect(result.needsAssessment).toEqual([]);
    expect(result.monitoring).toEqual([]);
    expect(result.excludedFindingIds).toEqual([]);
    expect(result.ungroupedFindingIds).toEqual([]);
  });

  it('is identical for every permutation of the five areas and does not mutate frozen input', () => {
    const survey = fresh();
    const expected = buildRepairPriorities(survey);
    for (const areas of permutations(survey.workAreas)) {
      const shuffled = structuredClone(survey);
      shuffled.workAreas = structuredClone(areas);
      shuffled.findings.reverse();
      shuffled.treatments.reverse();
      shuffled.sources.reverse();
      shuffled.sharedCosts.reverse();
      const before = JSON.stringify(shuffled);
      freezeDeep(shuffled);
      expect(buildRepairPriorities(shuffled)).toEqual(expected);
      expect(JSON.stringify(shuffled)).toBe(before);
    }
  });

  it('ranks high before medium before low regardless of price, review status or near-term flag', () => {
    const survey = fresh();
    for (const area of survey.workAreas) { area.priority = 'low'; area.nearTerm = true; }
    survey.workAreas[4].priority = 'high'; survey.workAreas[4].nearTerm = false;
    survey.workAreas[2].priority = 'medium'; survey.workAreas[2].nearTerm = false;
    for (const finding of survey.findings) finding.review.status = 'accepted';
    survey.findings[4].review.status = 'pending';
    const sourceId = survey.sources[0].id;
    for (const treatment of survey.treatments) treatment.cost = {
      status: 'estimated', rateLowCents: treatment.workAreaId === 'panel-05' ? 100_000_000 : 0,
      rateHighCents: treatment.workAreaId === 'panel-05' ? 100_000_000 : 0,
      quantityLow: 1, quantityHigh: 1, unit: 'test allowance', sourceIds: [sourceId],
      assumptions: ['Test-only costs, not field estimates.'], exclusions: [],
    };
    expect(rankedIds(survey)).toEqual(['panel-05', 'panel-03', 'panel-01', 'panel-02', 'panel-04']);
  });

  it('uses near-term only within a priority tier, ahead of the stable ID', () => {
    const survey = fresh();
    for (const area of survey.workAreas) { area.priority = 'medium'; area.nearTerm = false; }
    survey.workAreas[4].nearTerm = true;
    survey.workAreas[2].nearTerm = true;
    expect(rankedIds(survey)).toEqual(['panel-03', 'panel-05', 'panel-01', 'panel-02', 'panel-04']);
  });

  it('breaks ties using ASCII IDs, without numeric or locale collation', () => {
    const survey = fresh();
    const ids = ['panel-2', 'panel-10', 'panel-a', 'panel-1', 'panel--a'];
    survey.workAreas.forEach((area, index) => {
      renameArea(survey, area.id, ids[index]);
      area.priority = 'high'; area.nearTerm = false;
    });
    expect(rankedIds(survey)).toEqual(['panel--a', 'panel-1', 'panel-10', 'panel-2', 'panel-a']);
  });

  it('does not use costs, treatment choices, durability or accepted-versus-pending status', () => {
    const survey = fresh(), expected = buildRepairPriorities(survey);
    for (const finding of survey.findings) finding.review.status = 'accepted';
    for (const treatment of survey.treatments) {
      treatment.cost = { status: 'quote_required', reason: 'Quantity and price are unknown.' };
      treatment.durability = 0;
    }
    for (const area of survey.workAreas) {
      area.recommendedOptionId = survey.treatments.filter(treatment => treatment.workAreaId === area.id).at(-1)!.id;
    }
    expect(buildRepairPriorities(survey)).toEqual(expected);
    for (const finding of survey.findings) finding.review.status = 'pending';
    expect(buildRepairPriorities(survey)).toEqual(expected);
  });

  it('uses assessed work-area priority without inferring severity from finding labels or images', () => {
    const survey = fresh(), expected = buildRepairPriorities(survey);
    for (const finding of survey.findings) {
      finding.assessment.priority = 'unassessed';
      finding.label = 'Illustrative crack label'; finding.kind = 'crack';
      finding.description = 'No measured severity is established by this label.';
      finding.closeupSrc = survey.findings[0].closeupSrc;
    }
    expect(buildRepairPriorities(survey)).toEqual(expected);
  });

  it('filters rejected evidence, keeps mixed groups once, and sorts active finding IDs', () => {
    const survey = fresh();
    survey.workAreas[0].findingIds = ['defect-04', 'defect-02', 'defect-01'];
    removeArea(survey, 'panel-02'); removeArea(survey, 'panel-04');
    survey.findings[0].review.status = 'rejected';
    survey.findings[1].review.status = 'accepted';
    survey.findings[3].review.status = 'pending';
    const expected = buildRepairPriorities(survey);
    expect(expected.ranked.map(item => item.workAreaId)).toEqual(['panel-01', 'panel-03', 'panel-05']);
    expect(expected.ranked[0].findingIds).toEqual(['defect-02', 'defect-04']);
    expect(expected.excludedFindingIds).toEqual(['defect-01']);
    survey.workAreas[0].findingIds.reverse(); survey.workAreas.reverse(); survey.findings.reverse();
    expect(buildRepairPriorities(survey)).toEqual(expected);
  });

  it('removes all-rejected areas from every bucket and sorts excluded IDs', () => {
    const survey = fresh();
    survey.workAreas[1].priority = 'unassessed';
    survey.workAreas[2].repairWorthy = false;
    for (const finding of survey.findings) finding.review.status = 'rejected';
    survey.findings.reverse();
    expect(buildRepairPriorities(survey)).toEqual({
      ranked: [], needsAssessment: [], monitoring: [], ungroupedFindingIds: [],
      excludedFindingIds: ['defect-01', 'defect-02', 'defect-03', 'defect-04', 'defect-05'],
    });
  });

  it('keeps unassessed repair-worthy areas out of the low tier and orders them by near-term then ID', () => {
    const survey = fresh();
    for (const area of survey.workAreas) { area.priority = 'unassessed'; area.nearTerm = false; }
    survey.workAreas[0].priority = 'low';
    survey.workAreas[4].nearTerm = true; survey.workAreas[2].nearTerm = true;
    const result = buildRepairPriorities(survey);
    expect(result.ranked.map(item => item.workAreaId)).toEqual(['panel-01']);
    expect(result.needsAssessment.map(item => item.workAreaId)).toEqual(['panel-03', 'panel-05', 'panel-02', 'panel-04']);
    for (const item of result.needsAssessment) {
      expect(item.priority).toBe('unassessed'); expect(item).not.toHaveProperty('rank');
      expect(item.reason).toContain('not treated as low priority');
    }
  });

  it('keeps non-repair-worthy areas in monitoring regardless of assessed priority', () => {
    const survey = fresh();
    const priorities: Priority[] = ['high', 'unassessed', 'low', 'medium', 'high'];
    survey.workAreas.forEach((area, index) => {
      area.repairWorthy = false; area.priority = priorities[index]; area.nearTerm = index === 3;
    });
    const result = buildRepairPriorities(survey);
    expect(result.ranked).toEqual([]); expect(result.needsAssessment).toEqual([]);
    expect(result.monitoring.map(item => item.workAreaId)).toEqual(['panel-04', 'panel-01', 'panel-02', 'panel-03', 'panel-05']);
    expect(result.monitoring.find(item => item.workAreaId === 'panel-02')!.priority).toBe('unassessed');
    expect(result.monitoring.every(item => !('rank' in item))).toBe(true);
  });

  it('lists active ungrouped findings separately without putting rejected ones in that list', () => {
    const survey = fresh();
    removeArea(survey, 'panel-01'); removeArea(survey, 'panel-02'); removeArea(survey, 'panel-05');
    survey.findings[0].review.status = 'pending'; survey.findings[4].review.status = 'accepted';
    survey.findings[1].review.status = 'rejected'; survey.findings.reverse();
    const result = buildRepairPriorities(survey);
    expect(result.ranked.map(item => item.workAreaId)).toEqual(['panel-04', 'panel-03']);
    expect(result.ungroupedFindingIds).toEqual(['defect-01', 'defect-05']);
    expect(result.excludedFindingIds).toEqual(['defect-02']);
  });

  it('keeps all output buckets deterministic when they coexist', () => {
    const survey = fresh();
    survey.workAreas[0].priority = 'unassessed'; survey.workAreas[1].priority = 'unassessed';
    survey.workAreas[2].repairWorthy = false; survey.workAreas[3].repairWorthy = false;
    removeArea(survey, 'panel-05');
    const expected = buildRepairPriorities(survey);
    survey.workAreas.reverse(); survey.findings.reverse(); survey.treatments.reverse();
    freezeDeep(survey);
    expect(buildRepairPriorities(survey)).toEqual(expected);
  });

  it('explains the actual sort keys and provisional evidence without making route claims', () => {
    const survey = fresh();
    survey.workAreas[2].priority = 'unassessed'; survey.workAreas[4].repairWorthy = false;
    const result = buildRepairPriorities(survey);
    for (const item of [...result.ranked, ...result.needsAssessment, ...result.monitoring]) {
      expect(item.reason).toContain('near-term first');
      expect(item.reason).toContain('ASCII work-area ID ascending for ties');
      expect(item.reason).toContain('Pending evidence remains provisional');
      expect(item.reason).toContain('acceptance does not verify priority or passability');
    }
    expect(result.ranked[0].reason).toContain('high > medium > low');
    expect(result.ranked[0].reason).toContain('within a priority tier');
  });

  it('accepts an empty valid survey and returns empty collections', () => {
    const survey = fresh(); survey.findings = []; survey.workAreas = []; survey.treatments = [];
    expect(buildRepairPriorities(survey)).toEqual({
      ranked: [], needsAssessment: [], monitoring: [], excludedFindingIds: [], ungroupedFindingIds: [],
    });
  });

  it('returns detached data that cannot mutate the input or later calls', () => {
    const survey = fresh(), before = structuredClone(survey), expected = buildRepairPriorities(survey);
    const changed = buildRepairPriorities(survey);
    changed.ranked[0].findingIds.push('not-a-real-finding');
    changed.ranked[0].priority = 'low'; changed.ranked.reverse();
    changed.excludedFindingIds.push('defect-01');
    expect(survey).toEqual(before); expect(buildRepairPriorities(survey)).toEqual(expected);
  });

  it.each([null, undefined, {}, { ...fixture, contractVersion: 'curb-survey-v2' },
    { ...fixture, workAreas: undefined }, { ...fixture, unexpected: true }])
    ('rejects malformed top-level input through the survey validator: %j', input => {
      expect(() => buildRepairPriorities(input as unknown as Survey)).toThrow(ZodError);
    });

  it.each<[string, (survey: Survey) => void]>([
    ['unknown priority', survey => { survey.workAreas[0].priority = 'critical' as Priority; }],
    ['non-boolean nearTerm', survey => { survey.workAreas[0].nearTerm = 1 as unknown as boolean; }],
    ['missing finding', survey => { survey.workAreas[0].findingIds = ['not-present']; }],
    ['duplicate area', survey => { survey.workAreas[1].id = survey.workAreas[0].id; }],
    ['multiply grouped finding', survey => { survey.workAreas[1].findingIds = ['defect-01']; }],
    ['duplicate finding within area', survey => { survey.workAreas[0].findingIds.push('defect-01'); }],
    ['invalid recommendation', survey => { survey.workAreas[0].recommendedOptionId = 'not-present'; }],
    ['invalid cost even though costs do not rank', survey => {
      const treatment = survey.treatments.find(item => item.cost.status === 'estimated')!;
      if (treatment.cost.status === 'estimated') treatment.cost.rateLowCents = -1;
    }],
  ])('rejects malformed survey references or fields: %s', (_label, change) => {
    const survey = fresh(); change(survey);
    expect(() => buildRepairPriorities(survey)).toThrow(ZodError);
  });
});
