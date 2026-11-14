import { describe, expect, it } from 'vitest';
import fixture from '../../data/curb/surveys/robertson-hall.json';
import { SurveySchema } from './survey';
const fresh=()=>structuredClone(fixture);
describe('curb-survey-v1 boundaries',()=>{
  it('preserves unmeasured, unplaced, AI-proposed findings and unknown route assessment',()=>{
    const s=SurveySchema.parse(fresh());
    expect(s.findings).toHaveLength(5);
    for(const f of s.findings){expect(f.measurements).toEqual([]);expect(f.mapPosition).toBeNull();expect(f.review).toMatchObject({method:'ai',status:'pending'});}
    expect(s.routeAssessment.status).toBe('unknown');
  });
  it('bounds compatible work-area combinations independently of the treatment count',()=>{
    const s=fresh();
    s.findings=Array.from({length:9},(_,i)=>({...structuredClone(s.findings[0]),id:`finding-${i}`}));
    s.workAreas=Array.from({length:9},(_,i)=>({...structuredClone(s.workAreas[0]),id:`area-${i}`,findingIds:[`finding-${i}`],recommendedOptionId:`option-${i}-a`}));
    const option=structuredClone(s.treatments[0]);
    s.treatments=s.workAreas.flatMap(a=>['a','b'].map(suffix=>({...structuredClone(option),id:`option-${a.id.slice(5)}-${suffix}`,workAreaId:a.id})));
    const result=SurveySchema.safeParse(s);
    expect(result.success).toBe(false);
    if(!result.success) expect(result.error.issues.some(i=>i.message.includes('4096'))).toBe(true);
    s.findings.pop();s.workAreas.pop();s.treatments.splice(-2);
    expect(SurveySchema.safeParse(s).success).toBe(false); // 3^8 = 6561
    s.findings.pop();s.workAreas.pop();s.treatments.splice(-2);
    expect(SurveySchema.safeParse(s).success).toBe(true); // 3^7 = 2187
  });
  it.each([
    (s:ReturnType<typeof fresh>)=>s.findings.push(s.findings[0]),
    (s:ReturnType<typeof fresh>)=>s.findings[0].track.reverse(),
    (s:ReturnType<typeof fresh>)=>s.findings[0].track[0].box=[0.9,0,0.2,0.2],
    (s:ReturnType<typeof fresh>)=>s.findings[0].evidenceTime=99,
    (s:ReturnType<typeof fresh>)=>{s.findings[0].track=s.findings[0].track.filter(k=>k.frame!==210);},
    (s:ReturnType<typeof fresh>)=>s.sources[0].url='javascript:alert(1)',
    (s:ReturnType<typeof fresh>)=>s.sources[0].url='file:///private/report',
    (s:ReturnType<typeof fresh>)=>s.findings[0].closeupSrc='/curb/surveys/robertson-hall/../secret.jpg',
    (s:ReturnType<typeof fresh>)=>s.findings[0].closeupSrc='https://example.com/image.jpg',
    (s:ReturnType<typeof fresh>)=>s.findings[0].assessment.checks[0].sourceId='missing',
    (s:ReturnType<typeof fresh>)=>s.workAreas[0].findingIds.push('defect-02'),
    (s:ReturnType<typeof fresh>)=>s.workAreas[0].recommendedOptionId='panel-02-seal',
    (s:ReturnType<typeof fresh>)=>s.treatments[0].workAreaId='missing',
    (s:ReturnType<typeof fresh>)=>{s.treatments[0].cost.quantityLow=50;s.treatments[0].cost.quantityHigh=2;},
  ])('rejects broken references, geometry, assets and timing (%#)',mutate=>{const s=fresh();mutate(s);expect(SurveySchema.safeParse(s).success).toBe(false);});
});
