import { describe, expect, it } from 'vitest';
import fixture from '../../data/curb/surveys/robertson-hall.json';
import { SurveySchema } from './survey';
const fresh=()=>structuredClone(fixture);
describe('curb-survey-v1 boundaries',()=>{
  it('preserves unmeasured, unplaced, AI-proposed findings and unknown route assessment',()=>{
    const s=SurveySchema.parse(fresh());
    expect(s.findings).toHaveLength(3);
    for(const f of s.findings){expect(f.measurements).toEqual([]);expect(f.mapPosition).toBeNull();expect(f.review).toMatchObject({method:'ai',status:'pending'});}
    expect(s.routeAssessment.status).toBe('unknown');
  });
  it.each([
    (s:ReturnType<typeof fresh>)=>s.findings.push(s.findings[0]),
    (s:ReturnType<typeof fresh>)=>s.findings[0].track.reverse(),
    (s:ReturnType<typeof fresh>)=>s.findings[0].track[0].box=[0.9,0,0.2,0.2],
    (s:ReturnType<typeof fresh>)=>s.findings[0].evidenceTime=99,
    (s:ReturnType<typeof fresh>)=>s.findings[0].closeupSrc='/curb/surveys/robertson-hall/../secret.jpg',
    (s:ReturnType<typeof fresh>)=>s.findings[0].closeupSrc='https://example.com/image.jpg',
    (s:ReturnType<typeof fresh>)=>s.findings[0].assessment.checks[0].sourceId='missing',
    (s:ReturnType<typeof fresh>)=>s.workAreas[0].findingIds.push('defect-02'),
    (s:ReturnType<typeof fresh>)=>s.workAreas[0].recommendedOptionId='panel-02-seal',
    (s:ReturnType<typeof fresh>)=>s.treatments[0].workAreaId='missing',
    (s:ReturnType<typeof fresh>)=>{s.treatments[0].cost.quantityLow=50;s.treatments[0].cost.quantityHigh=2;},
  ])('rejects broken references, geometry, assets and timing (%#)',mutate=>{const s=fresh();mutate(s);expect(SurveySchema.safeParse(s).success).toBe(false);});
});
