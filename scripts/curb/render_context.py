"""Render retained OpenStreetMap geometry into a network-free context map."""
import json
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
data = json.loads((ROOT / 'src/data/curb/surveys/robertson-context.geojson').read_text())
# Local equirectangular display. No graph, route or defect position is inferred.
W, E, S, N = -74.6562, -74.6531, 40.3474, 40.3493
def xy(point):
    lon, lat = point
    return ((lon-W)/(E-W)*720, (N-lat)/(N-S)*580)
def path(coords):
    return ' '.join(('M' if i == 0 else 'L')+f'{x:.1f},{y:.1f}' for i,(x,y) in enumerate(map(xy,coords)))
svg = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 580" role="img" aria-labelledby="title desc">',
       '<title id="title">Robertson Hall and nearby campus streets</title>',
       '<desc id="desc">OpenStreetMap building and path context. Phone GPS is approximate. Accessibility and individual finding locations have not been verified.</desc>',
       '<defs><clipPath id="bounds"><rect width="720" height="580" rx="12"/></clipPath></defs>',
       '<g clip-path="url(#bounds)"><rect width="720" height="580" fill="#e9eee3"/>']
for f in data['features']:
    p,g=f['properties'],f['geometry']
    if g['type']!='Polygon': continue
    hero=p.get('name')=='Robertson Hall'
    svg.append(f'<path d="{path(g["coordinates"][0])}Z" fill="{"#b9cdb9" if hero else "#d3d8c9"}" stroke="{"#1d4634" if hero else "#b6bfae"}" stroke-width="{2 if hero else 1}"/>')
roads=[]
for f in data['features']:
    p,g=f['properties'],f['geometry']
    if 'highway' not in p or g['type']!='LineString': continue
    walk=p['highway'] in ['footway','path','steps','pedestrian']
    road=path(g['coordinates'])
    if walk: svg.append(f'<path d="{road}" fill="none" stroke="#fffdf7" stroke-width="5" stroke-linecap="round"/>')
    else: roads.append((road,p))
for road,p in roads:
    width=23 if p['highway'] in ['primary','secondary','residential'] else 12
    svg.append(f'<path d="{road}" fill="none" stroke="#cbd0c4" stroke-width="{width+3}"/><path d="{road}" fill="none" stroke="#faf9f1" stroke-width="{width}"/>')
svg.append('</g><g font-family="system-ui,sans-serif" fill="#284936" text-anchor="middle">')
labels=[('Robertson Hall',-74.65487,40.34839,20),('Corwin Hall',-74.65422,40.34891,16),('Wallace Hall',-74.65364,40.34916,16),('1879 Hall',-74.65542,40.34783,16),('Julis Romo Rabinowitz',-74.65555,40.34913,13)]
for label,lon,lat,size in labels:
    x,y=xy((lon,lat)); svg.append(f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" font-weight="650" paint-order="stroke" stroke="#edf1e7" stroke-width="4">{escape(label)}</text>')
# Label placement is editorial; street lines above are retained source geometry.
svg.append('<text x="133" y="335" transform="rotate(-77 133 335)" font-size="15" fill="#687566">WASHINGTON ROAD</text>')
svg.append('<text x="493" y="450" transform="rotate(-16 493 450)" font-size="15" fill="#687566">PROSPECT AVENUE</text>')
x,y=xy((-74.6541,40.3482))
svg.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="23" fill="#b7770f" fill-opacity=".14"/><circle cx="{x:.1f}" cy="{y:.1f}" r="6" fill="#94600d" stroke="#fffdf7" stroke-width="3"/><text x="{x+95:.1f}" y="{y-27:.1f}" paint-order="stroke" stroke="#edf1e7" stroke-width="4" font-size="15" font-weight="650">Phone GPS · approximate</text>')
svg.append('<path d="M681 51L681 24M675 33L681 24L687 33" fill="none" stroke="#284936" stroke-width="2"/><text x="681" y="19" font-size="12">N</text>')
svg.append('<rect x="12" y="533" width="696" height="35" rx="7" fill="#fffdf7" fill-opacity=".95"/><text x="360" y="556" font-size="13">Mapped paths · access unverified · © OpenStreetMap contributors</text></g></svg>')
out=ROOT/'public/curb/surveys/robertson-hall/site-context.svg'
out.write_text('\n'.join(svg)+'\n')
print(out)
