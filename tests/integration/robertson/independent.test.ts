import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import fixture from '../../../src/data/curb/surveys/robertson-hall.json';
import analysis from '../../../src/data/curb/surveys/robertson-analysis.json';
import tracks from '../../../src/data/curb/surveys/robertson-tracks.json';
import { SurveySchema, type Cost, type Survey, type Treatment } from '../../../src/contracts/curb/survey';
import { buildRepairPlans, getBoxAtTime } from '../../../src/domain/curb/survey';

// Independent test implementation: Cartesian recursion over work areas, not
// production's bitmask over treatments. No production cost/scoring helpers.
const fresh = (): Survey => SurveySchema.parse(structuredClone(fixture));
const priorities = ['high', 'medium', 'low', 'unassessed'] as const;
const sorted = (xs: string[]) => [...xs].sort();
const quote = { status: 'quote_required', reason: 'Independent unpriced test item' } as const;
function money(low: number, high = low): Cost {
  return { status: 'estimated', rateLowCents: low, rateHighCents: high,
    quantityLow: 1, quantityHigh: 1, unit: 'test item', sourceIds: ['palmyra-2026'],
    assumptions: ['Independent test amounts; not field estimates'], exclusions: [] };
}
function eligible(s: Survey) {
  return s.workAreas.filter(a => a.repairWorthy && s.findings.some(
    f => a.findingIds.includes(f.id) && f.review.status !== 'rejected'));
}
function enumerate(s: Survey): Treatment[][] {
  const areas = eligible(s), combinations: Treatment[][] = [];
  function visit(index: number, selected: Treatment[]) {
    if (index === areas.length) { combinations.push([...selected]); return; }
    visit(index + 1, selected);
    for (const option of s.treatments) {
      if (option.workAreaId === areas[index].id && option.cost.status === 'estimated') {
        selected.push(option); visit(index + 1, selected); selected.pop();
      }
    }
  }
  visit(0, []);
  return combinations;
}
function summarize(s: Survey, chosen: Treatment[]) {
  const charges = chosen.length ? [...chosen, ...s.sharedCosts] : [];
  const priced = charges.flatMap(x => x.cost.status === 'estimated' ? [x.cost] : []);
  const low = priced.reduce((sum, c) => sum + Math.floor(c.quantityLow * c.rateLowCents), 0);
  const high = priced.reduce((sum, c) => sum + Math.ceil(c.quantityHigh * c.rateHighCents), 0);
  const areaIds = new Set(chosen.map(t => t.workAreaId));
  const counts = priorities.map(priority => eligible(s).filter(
    a => areaIds.has(a.id) && a.priority === priority).length);
  const optionIds = sorted(chosen.map(t => t.id));
  const durability = chosen.reduce((sum, t) => sum + t.durability, 0);
  return { optionIds, areaIds: sorted([...areaIds]), low, high, counts, durability,
    unknownCount: charges.filter(x => x.cost.status === 'quote_required').length };
}
function oracle(s: Survey, budget: number) {
  const candidates = enumerate(s).map(xs => summarize(s, xs)).filter(x => x.high <= budget);
  // Rank a tuple with independent stable sorting, per the published priorities.
  candidates.sort((a, b) => {
    const left = [...a.counts, a.durability, -a.high];
    const right = [...b.counts, b.durability, -b.high];
    const first = left.findIndex((n, i) => n !== right[i]);
    if (first !== -1) return right[first] - left[first];
    const aid = a.optionIds.join('|'), bid = b.optionIds.join('|');
    return aid === bid ? 0 : aid < bid ? -1 : 1;
  });
  return candidates[0];
}
function boundaryBudgets(s: Survey) {
  return [...new Set([0, 100_000_000, ...enumerate(s).flatMap(xs => {
    const high = summarize(s, xs).high;
    return [high - 1, high, high + 1];
  })])].filter(n => n >= 0 && n <= 100_000_000).sort((a, b) => a - b);
}
function compare(s: Survey, budgets = boundaryBudgets(s)) {
  const before = JSON.stringify(s);
  for (const budget of budgets) {
    const reference = oracle(s, budget);
    const actual = buildRepairPlans(s, budget)[3];
    expect(actual.optionIds, `selected options at ${budget} cents`).toEqual(reference.optionIds);
    expect(actual.workAreaIds).toEqual(reference.areaIds);
    expect(actual.cost).toMatchObject({ lowCents: reference.low, highCents: reference.high,
      isComplete: reference.unknownCount === 0 });
    expect(actual.cost.unpricedItems).toHaveLength(reference.unknownCount);
    expect(priorities.map(p => actual.coverage[p])).toEqual(reference.counts);
    expect(actual.durability).toBe(reference.durability);
    expect(actual.budgetFit).toBe(reference.unknownCount ? 'partial' : 'within');
    expect(sorted(actual.deferredWorkAreaIds)).toEqual(sorted(eligible(s)
      .filter(a => !reference.areaIds.includes(a.id)).map(a => a.id)));
    expect(sorted(actual.excludedFindingIds)).toEqual(sorted(s.findings
      .filter(f => f.review.status === 'rejected').map(f => f.id)));
    expect(actual.routeImpact).toEqual(s.routeAssessment);
  }
  expect(JSON.stringify(s), 'the input survey/evidence must remain unchanged').toBe(before);
  return budgets.length;
}

describe('Developer D independent area-choice budget oracle', () => {
  it('matches all authored affordability boundaries and documented policy subtotals', () => {
    const s = fresh(); expect(enumerate(s)).toHaveLength(27);
    expect(compare(s)).toBeGreaterThan(20);
    const [essential, balanced, durable] = buildRepairPlans(s);
    expect(essential.optionIds).toEqual(['panel-01-seal', 'panel-02-seal']);
    expect(balanced.optionIds).toEqual(['panel-01-seal', 'panel-02-patch', 'panel-03-seal']);
    expect(durable.optionIds).toEqual(['panel-01-replace', 'panel-02-replace', 'panel-03-replace']);
    expect([essential, balanced, durable].map(p => [p.cost.lowCents, p.cost.highCents,
      p.cost.isComplete, p.cost.unpricedItems.length])).toEqual([
      [14400, 95600, false, 1], [14400, 95600, false, 2], [33750, 267600, false, 1],
    ]);
  });
  it('charges multiple known/unknown shared items once, including fractional outward rounding', () => {
    const s = fresh();
    s.sharedCosts = [{ id: 'known-setup', label: 'Known setup', cost: money(301, 701) },
      { id: 'unknown-setup', label: 'Unknown setup', cost: quote }];
    s.treatments[0].cost = { ...money(101, 103) as Extract<Cost, {status: 'estimated'}>,
      quantityLow: 1.1, quantityHigh: 1.25 };
    compare(s);
    s.sharedCosts.pop(); compare(s);
  });
  it('retains one grouped area while another finding is rejected, then removes the empty group', () => {
    const s = fresh();
    s.workAreas[0].findingIds.push('defect-02');
    s.workAreas.splice(1, 1); s.treatments = s.treatments.filter(t => t.workAreaId !== 'panel-02');
    s.findings[0].review = { status: 'rejected', method: 'manual', reviewer: 'D test', note: 'Test rejection' };
    compare(s);
    expect(buildRepairPlans(s, 999999)[3].workAreaIds).toContain('panel-01');
    s.findings[1].review.status = 'rejected'; compare(s);
    expect(buildRepairPlans(s, 999999)[3].workAreaIds).not.toContain('panel-01');
  });
  it('covers every review mask, repair-worthy exclusion and manual priority edit', () => {
    for (let mask = 0; mask < 8; mask++) {
      const s = fresh();
      s.findings.forEach((f, i) => { if (Math.floor(mask / 2 ** i) % 2) f.review.status = 'rejected'; });
      compare(s, [0, 47799, 47800, 95600, 184800, 267600]);
    }
    const s = fresh(); s.workAreas[0].repairWorthy = false;
    s.workAreas[1].priority = 'unassessed'; s.workAreas[2].priority = 'high'; compare(s);
  });
  it('keeps unpriced treatments out of numerical optimization, including an all-unpriced survey', () => {
    const s = fresh(); s.treatments.forEach(t => { t.cost = quote; });
    compare(s, [0, 1, 100_000_000]);
    for (const p of buildRepairPlans(s)) {
      expect(p.cost.isComplete).toBe(false); expect(p.cost.unpricedItems.length).toBeGreaterThan(1);
    }
  });
  it('supports true zero prices without pretending the shared quote is zero', () => {
    const s = fresh();
    for (const t of s.treatments) if (t.cost.status === 'estimated') t.cost = money(0);
    compare(s, [0, 1]);
    expect(buildRepairPlans(s, 0)[3].budgetFit).toBe('partial');
    s.sharedCosts = []; compare(s, [0, 1]);
    expect(buildRepairPlans(s, 0)[3].budgetFit).toBe('within');
  });
  it('tests priority, durability, price and ID tie ordering under reordered candidate arrays', () => {
    const s = fresh(); s.sharedCosts = [];
    s.workAreas.forEach((a, i) => { a.priority = priorities[(i + 1) % priorities.length]; });
    s.treatments.forEach((t, i) => { t.cost = money(50, i % 2 ? 100 : 200); t.durability = 2; });
    compare(s); const before = buildRepairPlans(s, 300);
    s.treatments.reverse(); s.workAreas.reverse(); s.findings.reverse();
    compare(s);
    expect(buildRepairPlans(s, 300)[3].optionIds).toEqual(before[3].optionIds);
  });
  it('cross-checks 16 deterministic edited price/priority/availability scenarios', () => {
    for (let scenario = 0; scenario < 16; scenario++) {
      const s = fresh();
      s.sharedCosts[0].cost = scenario % 3 ? money(50, 125) : quote;
      s.workAreas.forEach((a, i) => { a.priority = priorities[(scenario + i) % 4]; a.nearTerm = (scenario + i) % 2 === 0; });
      s.treatments.forEach((t, i) => {
        t.cost = (scenario + i) % 5 === 0 ? quote : money(50 + (i * 31 + scenario * 17) % 200,
          300 + (i * 43 + scenario * 71) % 600);
        t.durability = (i + scenario) % 4;
      });
      compare(s, [0, 124, 125, 400, 700, 1000, 1500, 2500, 5000]);
    }
  });
  it('exercises the maximum 12 treatment boundary using four choices per work area', () => {
    const s = fresh();
    for (const a of s.workAreas) s.treatments.push({ ...s.treatments.find(t => t.workAreaId === a.id)!,
      id: `${a.id}-inspection`, method: 'inspect', durability: 0, cost: money(1000, 2000) });
    expect(s.treatments).toHaveLength(12); expect(enumerate(s)).toHaveLength(64);
    compare(s, [0, 1999, 2000, 5999, 6000, 47800, 95600, 143400, 184800, 267600]);
  });
  it.each([-1, 0.5, NaN, Infinity, 100_000_001])('rejects invalid budget %s without source mutation', budget => {
    const s = fresh(), before = JSON.stringify(s);
    expect(() => buildRepairPlans(s, budget)).toThrow(); expect(JSON.stringify(s)).toBe(before);
  });
});

describe('Developer D evidence/unknown boundary review', () => {
  it('keeps source hashes and exact track IDs/boxes aligned across provenance and canonical data', () => {
    const s = fresh();
    const bytes = readFileSync(new URL('../../../public/curb/surveys/robertson-hall/source/IMG_0699.MOV', import.meta.url));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(s.media.originalSha256);
    expect(analysis.sourceSha256).toBe(s.media.originalSha256);
    expect(tracks.frameCount).toBe(419);
    expect(tracks.fps).toBe(s.media.fps); expect(tracks.width).toBe(s.media.width); expect(tracks.height).toBe(s.media.height);
    expect(s.media.durationSeconds).toBe(419 / 30);
    expect(sorted(analysis.findings.map(f => f.id))).toEqual(sorted(s.findings.map(f => f.id)));
    for (const f of s.findings) {
      expect(f.track).toEqual(tracks.findings.find(t => t.id === f.id)?.track);
      expect(f.evidenceTime * s.media.fps).toBe(analysis.findings.find(t => t.id === f.id)?.seedFrame);
      expect(f.mapPosition).toBeNull(); expect(f.measurements).toEqual([]);
      expect(f.review).toMatchObject({ method: 'ai', status: 'pending' });
      expect(f.assessment.checks.every(c => ['needs_measurement', 'not_assessed'].includes(c.status))).toBe(true);
      readFileSync(new URL(`../../../public${f.closeupSrc}`, import.meta.url));
    }
  });
  it('checks every displayed frame, backward seeks, visibility boundaries and rejected overlays', () => {
    const s = fresh();
    for (const f of s.findings) {
      const lookup = new Map(f.track.map(k => [k.frame, k.box]));
      for (let frame = 419; frame >= 0; frame--) {
        expect(getBoxAtTime(f, frame / 30, 30)).toEqual(lookup.get(frame) ?? null);
      }
      const rejected = structuredClone(f); rejected.review.status = 'rejected';
      expect(getBoxAtTime(rejected, f.evidenceTime, 30)).toBeNull();
    }
  });
  it('keeps historical rates, assumed quantities, quote needs and route uncertainty explicit', () => {
    const s = fresh();
    expect(s.sources.find(x => x.id === 'njdot-seal-2021')?.asOf).toMatch(/2021.*historical/i);
    for (const t of s.treatments) if (t.cost.status === 'estimated') {
      expect(t.cost.assumptions.join(' ')).toMatch(/not.*measure|not.*video measurement/i);
      expect(t.cost.exclusions.length).toBeGreaterThan(0);
    }
    expect(s.routeAssessment.status).toBe('unknown');
    for (const p of buildRepairPlans(s, 100_000_000)) expect(p.routeImpact.status).toBe('unknown');
  });
  it('does not invent a missing evidence-frame overlay from its neighboring frames', () => {
    const s = fresh(), f = s.findings[0];
    f.track = f.track.filter(k => k.frame !== Math.floor(f.evidenceTime * s.media.fps));
    expect(getBoxAtTime(f, f.evidenceTime, s.media.fps)).toBeNull();
  });
  // D1-01: expected failure is an explicit open finding, NOT acceptance. After
  // root corrects the validator, remove .fails; an unexpected pass fails CI.
  it.fails('D1-01 rejects a missing evidence frame even when neighboring track frames remain', () => {
    const s = fresh(), f = s.findings[0];
    f.track = f.track.filter(k => k.frame !== Math.floor(f.evidenceTime * s.media.fps));
    expect(SurveySchema.safeParse(s).success).toBe(false);
  });
});
