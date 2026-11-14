import { describe, expect, it } from 'vitest';
import fixture from '../../data/curb/surveys/robertson-hall.json';
import { buildRepairPlans, costRange, getBoxAtTime, validateSurvey } from './survey';

const fullSurvey = () => validateSurvey(structuredClone(fixture));
// Preserve the original three-area pricing scenario as a regression fixture.
const fresh = () => {
  const s = fullSurvey();
  s.findings = s.findings.slice(0,3); s.workAreas = s.workAreas.slice(0,3);
  s.treatments = s.treatments.filter(t => s.workAreas.some(a => a.id === t.workAreaId));
  return validateSurvey(s);
};

describe('Robertson maintenance planning', () => {
  it('includes both user-identified omissions as separate grouped scopes', () => {
    const s=fullSurvey(); expect(s.findings.map(f=>f.id)).toEqual(['defect-01','defect-02','defect-03','defect-04','defect-05']);
    expect(s.treatments.some(t=>t.id==='panel-04-seal')).toBe(false);
    const [essential,balanced,durable]=buildRepairPlans(s);
    expect(essential.optionIds).toEqual(['panel-01-seal','panel-02-seal','panel-04-replace']);
    expect(essential.cost).toMatchObject({lowCents:29400,highCents:229400,isComplete:false});
    expect(balanced.optionIds).toEqual(['panel-01-seal','panel-02-patch','panel-03-seal','panel-04-patch','panel-05-seal']);
    expect(balanced.cost).toMatchObject({lowCents:21600,highCents:143400,isComplete:false});
    expect(balanced.cost.unpricedItems).toHaveLength(3);
    expect(new Set(balanced.cost.unpricedItems).size).toBe(3);
    expect(balanced.cost.unpricedItems.join(' ')).toContain('panel-04-patch');
    expect(durable.workAreaIds).toHaveLength(5);
    expect(durable.cost).toMatchObject({lowCents:60000,highCents:490600,isComplete:false});
  });
  it('computes distinct policy scopes and honest partial subtotals from actual data', () => {
    const [essential, balanced, durable] = buildRepairPlans(fresh());
    expect(essential.optionIds).toEqual(['panel-01-seal', 'panel-02-seal']);
    expect(balanced.optionIds).toEqual(['panel-01-seal', 'panel-02-patch', 'panel-03-seal']);
    expect(durable.optionIds).toEqual(['panel-01-replace', 'panel-02-replace', 'panel-03-replace']);
    expect(essential.cost).toMatchObject({ lowCents: 14400, highCents: 95600, isComplete: false });
    expect(balanced.cost.unpricedItems).toHaveLength(2);
    expect(durable.cost).toMatchObject({ lowCents: 33750, highCents: 267600, isComplete: false });
    expect(essential.deferredWorkAreaIds).toEqual(['panel-03']);
    for (const p of [essential, balanced, durable]) expect(p.routeImpact.status).toBe('unknown');
  });
  it('uses upper bounds, never claims a complete budget fit with unknown setup cost', () => {
    expect(buildRepairPlans(fresh(), 47799)[3].optionIds).toEqual([]);
    const one = buildRepairPlans(fresh(), 47800)[3];
    expect(one.optionIds).toEqual(['panel-01-seal']);
    expect(one.budgetFit).toBe('partial');
    expect(one.deferredWorkAreaIds).toHaveLength(2);
    expect(buildRepairPlans(fresh(), 95600)[3].coverage).toMatchObject({ high: 2, medium: 0 });
  });
  it('prioritizes accessibility coverage over a more durable repair to only one area', () => {
    const p = buildRepairPlans(fresh(), 95600)[3];
    expect(p.optionIds).toEqual(['panel-01-seal','panel-02-seal']);
  });
  it('upgrades durability after equal-priority coverage, then uses stable IDs', () => {
    const p = buildRepairPlans(fresh(), 184800)[3];
    expect(p.coverage).toMatchObject({ high: 2, medium: 1 });
    expect(p.optionIds).toEqual(['panel-01-replace','panel-02-seal','panel-03-seal']);
    expect(p.durability).toBe(5);
  });
  it('a manually changed area priority changes the budget allocation', () => {
    const s=fresh();s.workAreas[0].priority='low';s.workAreas[2].priority='high';
    expect(buildRepairPlans(s,95600)[3].optionIds).toEqual(['panel-02-seal','panel-03-seal']);
  });
  it('charges one known setup fee for the selected scope, never per finding', () => {
    const s=fresh();s.sharedCosts[0].cost={...s.treatments[0].cost as Extract<typeof s.treatments[0]['cost'],{status:'estimated'}>,rateLowCents:10000,rateHighCents:10000,quantityLow:1,quantityHigh:1};
    const p=buildRepairPlans(s,105600)[3];
    expect(p.optionIds).toHaveLength(2);expect(p.cost.highCents).toBe(105600);expect(p.budgetFit).toBe('within');
    expect(buildRepairPlans(s,0)[3].cost.highCents).toBe(0);
  });
  it('rejects a finding without deleting its evidence and excludes its work area', () => {
    const s=fresh();s.findings[0].review.status='rejected';
    for(const p of buildRepairPlans(s,999999)) {
      expect(p.excludedFindingIds).toEqual(['defect-01']);expect(p.workAreaIds).not.toContain('panel-01');
      expect(p.pendingChecks.some(x=>x.startsWith('Defect 01:'))).toBe(false);
    }
    expect(s.findings[0].track.length).toBeGreaterThan(1);
  });
  it('groups two findings into one work area without two replacements', () => {
    const s=fresh();s.workAreas[0].findingIds.push('defect-02');s.workAreas.splice(1,1);s.treatments=s.treatments.filter(t=>t.workAreaId!=='panel-02');
    const p=buildRepairPlans(s)[2];expect(p.workAreaIds).toHaveLength(2);expect(p.optionIds).toHaveLength(2);
    s.findings[0].review.status='rejected';expect(buildRepairPlans(s)[2].workAreaIds).toContain('panel-01');
  });
  it('never chooses mutually exclusive options or treats unknown-priced patches as free', () => {
    for(const budget of [0,47800,95600,143400,184800,267600,999999]) {
      const s=fresh(),p=buildRepairPlans(s,budget)[3];
      const options=p.optionIds.map(id=>s.treatments.find(t=>t.id===id)!);
      expect(new Set(options.map(t=>t.workAreaId)).size).toBe(options.length);
      expect(options.every(t=>t.cost.status==='estimated')).toBe(true);
      expect(p.cost.highCents).toBeLessThanOrEqual(budget);
    }
  });
  it('does not mutate the input and is deterministic when candidate arrays are shuffled', () => {
    const s=fresh(),before=JSON.stringify(s),p=buildRepairPlans(s,184800);
    expect(JSON.stringify(s)).toBe(before);
    s.treatments.reverse();expect(buildRepairPlans(s,184800)).toEqual(p);
  });
  it.each([-1,NaN,Infinity,1.5,100000001])('rejects invalid budget %s', budget=>expect(()=>buildRepairPlans(fresh(),budget)).toThrow());
  it('cost uncertainty rounds outward and unknown remains null',()=>{
    const s=fresh(), c=s.treatments[0].cost;
    if(c.status!=='estimated')throw Error('fixture');
    expect(costRange({...c,rateLowCents:101,rateHighCents:103,quantityLow:1.1,quantityHigh:1.1})).toEqual({lowCents:111,highCents:114});
    expect(costRange({status:'quote_required',reason:'Unmeasured'})).toBeNull();
  });
});

describe('time-driven evidence',()=>{
  it('seeks to each finding evidence and returns that exact frame box',()=>{
    const s=fullSurvey();for(const f of s.findings){
      const frame=Math.floor(f.evidenceTime*s.media.fps);
      expect(getBoxAtTime(f,f.evidenceTime,s.media.fps)).toEqual(f.track.find(k=>k.frame===frame)?.box);
      expect(getBoxAtTime(f,(f.track[0].frame-1)/30,30)).toBeNull();
      expect(getBoxAtTime(f,(f.track.at(-1)!.frame+1)/30,30)).toBeNull();
    }
  });
  it('does not bridge missing frames, and backward seeking has no accumulated state',()=>{
    const f=fresh().findings[0];const n=f.track[5].frame;f.track.splice(5,1);
    expect(getBoxAtTime(f,n/30,30)).toBeNull();
    expect(getBoxAtTime(f,(n+1)/30,30)).not.toBeNull();
    expect(getBoxAtTime(f,(n-1)/30,30)).not.toBeNull();
    expect(getBoxAtTime(f,n/30,30)).toBeNull();
  });
  it('hides rejected findings and invalid time inputs',()=>{
    const f=fresh().findings[0];for(const n of [-1,NaN,Infinity])expect(getBoxAtTime(f,n,30)).toBeNull();
    f.review.status='rejected';expect(getBoxAtTime(f,f.evidenceTime,30)).toBeNull();
  });
});
