import { describe, expect, it } from 'vitest';
import { SurveySchema, type Survey } from '../../../contracts/curb/survey';
import {
  boxToRect,
  centsToInput,
  containedRect,
  correctFinding,
  editedFindingIds,
  exportFileName,
  formatCents,
  formatCentsRange,
  formatTime,
  isEdited,
  labelForId,
  MAX_BUDGET_CENTS,
  parseBudgetInput,
  setAreaPriority,
  setReviewStatus,
  sliderMaxCents,
  splitByPlacement,
  surveyJson,
} from './presentation';

// Test-only survey authored here and validated against the frozen contract.
// It is not the Robertson Hall analysis and is never imported by the UI.
const TEST_SURVEY: Survey = SurveySchema.parse({
  contractVersion: 'curb-survey-v1', id: 'robertson-hall', revision: 3, title: 'Test survey',
  site: { name: 'Test site', kind: 'campus_path', latitude: 40.35, longitude: -74.65, locationNote: 'Test location.' },
  media: {
    src: '/curb/surveys/robertson-hall/test.mp4', sourceSrc: '/curb/surveys/robertson-hall/source/test.MOV',
    annotatedSrc: '/curb/surveys/robertson-hall/test-annotated.mp4', posterSrc: '/curb/surveys/robertson-hall/test.jpg',
    durationSeconds: 10, fps: 30, width: 1080, height: 1920, originalSha256: 'a'.repeat(64),
  },
  analysis: { method: 'Test', model: 'Test', createdAt: '2026-11-14T12:00:00Z', note: 'Test.' },
  sources: [{ id: 'std', title: 'Standard', url: 'https://example.org/std', kind: 'standard', asOf: '2026', scopeNote: 'Test.' }],
  findings: ['crack', 'gap'].map((id, index) => ({
    id, label: `Finding ${id}`, kind: 'surface', description: 'Test description.', color: '#aa5500',
    evidenceTime: 2 + index, closeupSrc: `/curb/surveys/robertson-hall/${id}.jpg`,
    review: { status: 'pending', reviewer: 'Model', method: 'ai', note: 'AI suggestion.' },
    assessment: {
      priority: 'high', rationale: 'Test.', accessImpacts: ['Test impact.'], measurementNeeds: ['Height.'],
      checks: [{ sourceId: 'std', section: '1', status: 'needs_measurement', note: 'Test.' }],
    },
    measurements: [],
    mapPosition: index === 0 ? { x: 0.25, y: 0.5, accuracy: 'approximate', placementReview: 'accepted', note: 'Approx.' } : null,
    track: [{ frame: (2 + index) * 30, box: [0.1, 0.2, 0.3, 0.4] }],
  })),
  workAreas: [{ id: 'area-a', label: 'Area A', findingIds: ['crack', 'gap'], priority: 'high', nearTerm: true, repairWorthy: true, rationale: 'Test.', recommendedOptionId: 'patch-a' }],
  treatments: [{
    id: 'patch-a', workAreaId: 'area-a', label: 'Patch A', method: 'patch', durability: 2, eligibilityNote: 'Test.',
    cost: { status: 'estimated', rateLowCents: 1000, rateHighCents: 2500, quantityLow: 2, quantityHigh: 4, unit: 'sq ft', sourceIds: ['std'], assumptions: ['Test.'], exclusions: [] },
  }],
  sharedCosts: [{ id: 'setup', label: 'Setup', cost: { status: 'quote_required', reason: 'Test.' } }],
  routeAssessment: { status: 'unknown', note: 'No reviewed route graph.' },
});

describe('parseBudgetInput', () => {
  it('parses exact cents and treats empty as no budget', () => {
    expect(parseBudgetInput('')).toEqual({ ok: true, cents: null });
    expect(parseBudgetInput('2500')).toEqual({ ok: true, cents: 250_000 });
    expect(parseBudgetInput('$2,500.05')).toEqual({ ok: true, cents: 250_005 });
    expect(parseBudgetInput('0')).toEqual({ ok: true, cents: 0 });
  });
  it('rejects rounding, negatives, junk and the contract ceiling', () => {
    for (const input of ['1.005', '-5', 'abc', 'NaN', '1e3', '1,23', '.5', 'Infinity']) {
      expect(parseBudgetInput(input).ok, input).toBe(false);
    }
    expect(parseBudgetInput('1000000')).toEqual({ ok: true, cents: MAX_BUDGET_CENTS });
    expect(parseBudgetInput('1000000.01').ok).toBe(false);
    expect(parseBudgetInput('99999999999999999999').ok).toBe(false);
  });
});

describe('formatting', () => {
  it('formats cents, ranges and times', () => {
    expect(formatCents(0)).toBe('$0.00');
    expect(formatCents(123_456)).toBe('$1,234.56');
    expect(centsToInput(123_456)).toBe('1234.56');
    expect(formatCentsRange(100, 100)).toBe('$1.00');
    expect(formatCentsRange(100, 250)).toBe('$1.00–$2.50');
    expect(formatTime(7.25)).toBe('0:07.3');
    expect(formatTime(65)).toBe('1:05.0');
    expect(formatTime(0)).toBe('0:00.0');
  });
});

describe('review edits', () => {
  it('records manual accept/reject without mutating the original', () => {
    const before = surveyJson(TEST_SURVEY);
    const result = setReviewStatus(TEST_SURVEY, 'crack', 'rejected', '  Pat Reviewer ');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.survey.findings[0].review).toMatchObject({ status: 'rejected', reviewer: 'Pat Reviewer', method: 'manual' });
    expect(result.survey.findings[1]).toBe(TEST_SURVEY.findings[1]);
    expect(surveyJson(TEST_SURVEY)).toBe(before);
    expect(SurveySchema.safeParse(result.survey).success).toBe(true);
    expect(isEdited(TEST_SURVEY, result.survey)).toBe(true);
    expect(editedFindingIds(TEST_SURVEY, result.survey)).toEqual(['crack']);
  });

  it('requires a reviewer and valid corrected text', () => {
    expect(setReviewStatus(TEST_SURVEY, 'crack', 'accepted', '   ').ok).toBe(false);
    expect(correctFinding(TEST_SURVEY, 'crack', { label: ' ', kind: 'x', description: 'y' }, 'Pat').ok).toBe(false);
    expect(correctFinding(TEST_SURVEY, 'crack', { label: 'x'.repeat(4001), kind: 'x', description: 'y' }, 'Pat').ok).toBe(false);
    expect(correctFinding(TEST_SURVEY, 'crack', { label: 'Finding crack', kind: 'surface', description: 'Test description.' }, 'Pat'))
      .toEqual({ ok: false, message: 'Nothing changed.' });
    const fixed = correctFinding(TEST_SURVEY, 'gap', { label: ' Wide gap ', kind: 'joint', description: 'Corrected.' }, 'Pat');
    expect(fixed.ok).toBe(true);
    if (!fixed.ok) return;
    const gap = fixed.survey.findings[1];
    expect(gap).toMatchObject({ label: 'Wide gap', kind: 'joint', description: 'Corrected.' });
    expect(gap.review).toMatchObject({ status: 'pending', method: 'manual', reviewer: 'Pat' });
    expect(SurveySchema.safeParse(fixed.survey).success).toBe(true);
  });

  it('changes area priority immutably', () => {
    expect(setAreaPriority(TEST_SURVEY, 'area-a', 'low', '', 'Alternate path available.').ok).toBe(false);
    expect(setAreaPriority(TEST_SURVEY, 'area-a', 'low', 'Pat', '').ok).toBe(false);
    const next = setAreaPriority(TEST_SURVEY, 'area-a', 'low', 'Pat', 'Alternate path available; verify clear width.');
    expect(next.ok).toBe(true);
    if (!next.ok) return;
    expect(next.survey.workAreas[0]).toMatchObject({priority:'low',rationale:'Priority reviewed by Pat: Alternate path available; verify clear width.'});
    expect(SurveySchema.safeParse(next.survey).success).toBe(true);
    expect(TEST_SURVEY.workAreas[0].priority).toBe('high');
  });
});

describe('lookups and geometry', () => {
  it('splits placed and unplaced findings without inventing positions', () => {
    const { placed, unplaced } = splitByPlacement(TEST_SURVEY);
    expect(placed.map(({ id }) => id)).toEqual(['crack']);
    expect(unplaced.map(({ id }) => id)).toEqual(['gap']);
    expect(labelForId(TEST_SURVEY, 'patch-a')).toBe('Patch A');
    expect(labelForId(TEST_SURVEY, 'setup')).toBe('Setup');
    expect(labelForId(TEST_SURVEY, 'missing')).toBe('missing');
  });

  it('maps normalized boxes into the contained portrait picture', () => {
    const picture = containedRect(800, 800, 1080, 1920);
    expect(picture).toEqual({ left: 175, top: 0, width: 450, height: 800 });
    expect(boxToRect([0.1, 0.2, 0.3, 0.4], picture)).toEqual({ left: 220, top: 160, width: 135, height: 320 });
    expect(containedRect(0, 100, 10, 10)).toEqual({ left: 0, top: 0, width: 0, height: 0 });
  });

  it('caps the budget slider from known upper costs only', () => {
    const costRange = (cost: Survey['treatments'][number]['cost']) => cost.status === 'estimated'
      ? { lowCents: cost.rateLowCents * cost.quantityLow, highCents: cost.rateHighCents * cost.quantityHigh } : null;
    expect(sliderMaxCents(TEST_SURVEY, costRange)).toBe(100_000);
    expect(exportFileName(TEST_SURVEY, 'csv', true)).toBe('curb-robertson-hall-r3-reviewed.csv');
  });
});
