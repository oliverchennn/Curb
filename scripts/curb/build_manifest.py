"""Build the editable Robertson survey from retained AI proposals and tracked frames."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'src/data/curb/surveys'
MEDIA = '/curb/surveys/robertson-hall/'
tracks = json.loads((DATA / 'robertson-tracks.json').read_text())
analysis = json.loads((DATA / 'robertson-analysis.json').read_text())
sources = [
    dict(id='ada-2010', title='U.S. Access Board: ADA Accessibility Standards', url='https://www.access-board.gov/ada/', kind='standard', asOf='2010 standards; reference checked 2026-11-14', scopeNote='Sections 302/303/403 are technical references for campus-path inspection. Site applicability and measurements require review; no overall compliance determination.'),
    dict(id='fhwa-maintenance', title='FHWA Guide for Maintaining Active Transportation Infrastructure', url='https://highways.dot.gov/sites/fhwa.dot.gov/files/2024-10/Guide_for_Maintaining_Active_Transportation_FHWA-SA-23-005.pdf', kind='treatment', asOf='2024', scopeNote='Treatment options depend on observed failure mode, movement, level change and underlying cause. Not a site-specific repair design.'),
    dict(id='palmyra-2026', title='Palmyra road program bid tabulation, March 24, 2026', url='https://erinj.com/wp-content/uploads/2026/04/44538-00-2026-03-24-bid-summary.pdf', kind='cost', asOf='2026-03-24', scopeNote='Page 1, alternate A1.6: four-inch concrete sidewalk, 20 SY, first four bids $75-$223/SY. Selected published bidder range, not all bids or a small campus-job quote. Removal, base remediation and minimum mobilization are not assumed included.'),
    dict(id='njdot-seal-2021', title='NJDOT contract 21132 concrete joint/crack sealing benchmark', url='https://nj.gov/transportation/contribute/business/procurement/ConstrServ/documents/BidTabsDP21132_Redacted.pdf', kind='cost', asOf='2021-10-05 (historical benchmark)', scopeNote='Item 0083 / 456006M, concrete pavement joint/crack cleaning and sealing, 200 LF: page 74 selected bidders 4/5 at $18 and $59.75/LF. This is a selected reference range, not the full spread; page 12 other bidders are $20/$3.35/$74. Historical roadway work, not a 2026 sidewalk quote; no inflation adjustment or small-job minimum inferred.'),
    dict(id='princeton-access', title='Princeton campus accessibility information', url='https://accessibility.princeton.edu/campus', kind='context', asOf='Reference checked 2026-11-14', scopeNote='Campus context only. This clip does not establish a complete accessible route to any building entrance.'),
    dict(id='osm-context', title='OpenStreetMap local buildings, roads and paths', url='https://www.openstreetmap.org/copyright', kind='context', asOf='Local snapshot 2026-11-14', scopeNote='Copyright OpenStreetMap contributors, ODbL 1.0. Retained geometry is context only. Paths are not a verified routing graph or access assessment; the single phone GPS tag is approximate, and findings have no accepted map placements.'),
]
findings = []
for i, f in enumerate(tracks['findings']):
    impacts = [
        ['The open, irregular edge may interrupt smooth travel for small wheelchair or walker wheels.', 'Uneven footing or a cane-tip catch is possible; the video does not establish the opening or level difference.'],
        ['A branching or loose edge may affect wheel contact and stable foot placement.', 'Check whether the fragment moves and whether there is a continuous clear passage around it.'],
        ['A cross-path crack may affect wheel or cane contact if the opening or level difference is significant.', 'The visible line alone does not establish a blocked route.'],
    ][i]
    needs = ['Measure opening width at the widest point.', 'Measure vertical level difference and edge stability.', 'Record affected area, remaining clear width and running/cross slope.']
    priority = 'high' if i < 2 else 'medium'
    findings.append(dict(id=f['id'], label=f['label'], kind=f['kind'], description=f['description'], color=f['color'], evidenceTime=f['seedFrame']/30,
        closeupSrc=MEDIA+f['id']+'.jpg', review=dict(status='pending', reviewer='Codex AI-assisted visual review', method='ai', note='Proposed from the actual footage; human field review and measurements pending.'),
        assessment=dict(priority=priority, rationale='Provisional inspection/repair priority based on visible irregular edges crossing the walking line; not a measured hazard or ADA finding.', accessImpacts=impacts, measurementNeeds=needs,
            checks=[dict(sourceId='ada-2010', section='302.3 Surface openings', status='needs_measurement', note='Opening width and orientation are unmeasured.'), dict(sourceId='ada-2010', section='303 Changes in level', status='needs_measurement', note='No vertical displacement measurement or scale is available.'), dict(sourceId='ada-2010', section='403 Walking surfaces', status='not_assessed', note='Clear width, running slope and cross slope were not measured.')]),
        measurements=[], mapPosition=None, track=f['track']))

areas, treatments = [], []
for i, f in enumerate(findings):
    area = f'panel-{i+1:02}'
    areas.append(dict(id=area, label=f'Work area {i+1:02}', findingIds=[f['id']], priority=f['assessment']['priority'], nearTerm=i<2, repairWorthy=True,
        rationale='Proposed work area defined by the visible panel. Verify actual panel boundaries, condition and dimensions on site before procurement.',
        recommendedOptionId=f'{area}-patch' if i==1 else f'{area}-seal'))
    treatments.extend([
        dict(id=f'{area}-seal', workAreaId=area, label='Prepare and seal suitable cracks', method='seal', durability=1,
            eligibilityNote='Conditional: only if inspection finds sound, stable edges and no level change requiring a different treatment. Sealing does not correct displacement or restore a loose fragment.',
            cost=dict(status='estimated',rateLowCents=1800,rateHighCents=5975,quantityLow=4,quantityHigh=8,unit='linear foot',sourceIds=['njdot-seal-2021'],
                assumptions=['Assumed 4-8 linear feet of treatment in this work area; this is a budget scenario, not a video measurement.', 'Uses a historical 2021 roadway bid range without inflation adjustment; obtain a current sidewalk quote.'],
                exclusions=['Mobilization and small-job minimum', 'Site measurements and treatment design', 'Repair of displacement, loose concrete or base failure'])),
        dict(id=f'{area}-patch', workAreaId=area, label='Localized edge repair after inspection',method='patch',durability=2,
            eligibilityNote='Conditional: remove unsound material and specify a compatible localized repair only after checking depth, movement and sound substrate. If not suitable, replace the panel.',
            cost=dict(status='quote_required',reason='Patch depth, preparation, materials and quantity are unknown; obtain a measured scope and current quote.')),
        dict(id=f'{area}-replace',workAreaId=area,label='Replace affected concrete panel',method='replace',durability=3,
            eligibilityNote='Conditional renewal option if movement, deterioration or displacement makes localized treatment unsuitable. Verify thickness, base, drainage and finish requirements.',
            cost=dict(status='estimated',rateLowCents=7500,rateHighCents=22300,quantityLow=1.5,quantityHigh=4,unit='square yard',sourceIds=['palmyra-2026'],
                assumptions=['Assumed 1.5-4 square yards per panel (13.5-36 square feet); not measured from the video.', 'Four-inch sidewalk bid item is a pricing reference, not a specified thickness for this site.'],
                exclusions=['Removal and disposal unless included in the confirmed quote', 'Base/root/drainage remediation', 'Mobilization and small-job minimum', 'Temporary accessible passage during works']))
    ])

survey = dict(contractVersion='curb-survey-v1',id='robertson-hall',revision=1,title='Robertson Hall sidewalk survey',
    site=dict(name='Robertson Hall, Princeton',kind='campus_path',latitude=40.3482,longitude=-74.6541,
        locationNote='Location supplied by Oliver, with one approximate phone GPS tag. Exact surveyed path, property boundary and per-defect positions are not yet verified.'),
    media=dict(src=MEDIA+'survey.mp4',sourceSrc=MEDIA+'source/IMG_0699.MOV',annotatedSrc=MEDIA+'annotated.mp4',posterSrc=MEDIA+'poster.jpg',durationSeconds=tracks['frameCount']/30,fps=30,width=720,height=1280,originalSha256=analysis['sourceSha256']),
    analysis=dict(method='AI visual proposals followed by forward/backward-checked optical-flow tracking and visual contact-sheet review. Local preprocessed analysis; no live inference.',model=analysis['model'],createdAt=analysis['createdAt'],
        note='Three distinct cross-path findings selected from the full clip. Ordinary control joints excluded. All priorities and treatment options are provisional. Dimensions, damage cause, route passability and ADA compliance were not inferred.'),
    sources=sources,findings=findings,workAreas=areas,treatments=treatments,
    sharedCosts=[dict(id='site-setup',label='Site verification, mobilization and accessible work-zone provision',cost=dict(status='quote_required',reason='One shared allowance requires a site quote; it is not counted once per defect.'))],
    routeAssessment=dict(status='unknown',note='No complete surveyed graph or reviewed traversal assessment exists for this clip. Proposed maintenance is not a verified route opening.'))
(DATA/'robertson-hall.json').write_text(json.dumps(survey,indent=2)+'\n')
print(DATA/'robertson-hall.json')
