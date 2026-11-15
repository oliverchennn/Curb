"""Bounded production Chromium acceptance. Uses an already installed Playwright/Chromium.

Start the integrated explorer production server (including finding deep links), then run:
  python src/features/curb/explore/verify_browser.py --base http://127.0.0.1:3186
No hosted service, external source link or collection-page dependency is exercised.
"""
import argparse
import base64
import hashlib
import json
import math
from pathlib import Path
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone
from urllib.parse import parse_qs, urlparse
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument('--base', default='http://127.0.0.1:3186')
parser.add_argument('--chromium', default='/usr/bin/chromium')
args = parser.parse_args()
assert urlparse(args.base).hostname in ('localhost', '127.0.0.1'), 'Use a local production server.'
root = Path(__file__).resolve().parents[4]
out = root / '.curb-local/verification/explorer-aerial'
out.mkdir(parents=True, exist_ok=True)
receipt = {'startedAt': datetime.now(timezone.utc).isoformat(), 'baseUrl': args.base,
           'head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip(),
           'checks': [], 'runs': [], 'screenshots': []}
receipt['productSha256'] = {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest()
                          for p in sorted((root / 'src/features/curb/explore').glob('*'))
                          if p.suffix in ('.tsx', '.ts', '.json', '.css') and '.test.' not in p.name}
receipt['productSha256']['app/curb/explore/page.tsx'] = hashlib.sha256((root / 'app/curb/explore/page.tsx').read_bytes()).hexdigest()
listeners = {}


def check(name, condition=True):
    assert condition, name
    receipt['checks'].append(name)


def watch(page, label):
    run = {'label': label, 'pageErrors': [], 'consoleErrors': [], 'externalRequests': [], 'failedRequests': [], 'cancelledRequests': []}
    receipt['runs'].append(run)
    listeners[page] = {
        'pageerror': lambda e: run['pageErrors'].append(str(e)),
        'console': lambda m: run['consoleErrors'].append({'text': m.text, 'location': m.location}) if m.type == 'error' else None,
        'request': lambda r: run['externalRequests'].append(r.url) if urlparse(r.url).scheme in ('http', 'https') and urlparse(r.url).netloc != urlparse(args.base).netloc else None,
        'requestfailed': lambda r: run['cancelledRequests' if r.failure == 'net::ERR_ABORTED' else 'failedRequests'].append({'url': r.url, 'failure': r.failure}),
    }
    for event, handler in listeners[page].items():
        page.on(event, handler)
    return run


def load(page):
    page.goto(args.base + '/curb/explore')
    page.wait_for_load_state('networkidle')
    expect(page.get_by_role('heading', name='Route explorer.')).to_be_visible()


def metrics(page, run):
    run['viewport'] = page.evaluate('({innerWidth, innerHeight, outerWidth, outerHeight, dpr:devicePixelRatio, scrollWidth:document.documentElement.scrollWidth})')
    check(run['label'] + ': no page horizontal overflow', run['viewport']['scrollWidth'] <= run['viewport']['innerWidth'])


def primary_fonts(page, run):
    run['primaryFontPixels'] = page.locator('[data-collection] strong, [aria-label="Selected record"] span').evaluate_all('(es)=>[...new Set(es.map(e=>parseFloat(getComputedStyle(e).fontSize)))]')
    check(run['label'] + ': collection name and selected record labels at least 14px', min(run['primaryFontPixels']) >= 14)


def map_clearance(page, label):
    result = page.locator('svg[aria-label^="Archive map on"]').evaluate('''(svg) => {
      const r = svg.getBoundingClientRect();
      const controls = svg.parentElement.querySelector('[aria-label="Map controls"]').getBoundingClientRect();
      const features = [...svg.querySelectorAll('[data-feature]')].map(e => e.getBoundingClientRect());
      return {
        count: features.length,
        clear: features.every(f => {
          const inPlot = f.left >= r.left - 1 && f.right <= r.right + 1 && f.top >= r.top - 1 && f.bottom <= r.bottom + 1;
          const underTools = f.left < controls.right && f.right > controls.left && f.top < controls.bottom && f.bottom > controls.top;
          return inPlot && !underTools;
        })
      };
    }''')
    check(label + ': fitted source features stay within the plot and clear of the map controls', result['clear'])


def shot(page, name):
    # Playwright's screenshot clip uses CSS width under native page zoom. Use the
    # unmodified Chromium viewport capture for the zoom artifact, without cropping.
    if name == 'zoom-200-percent.png':
        cdp = page.context.new_cdp_session(page)
        receipt['nativeZoomMetrics'] = cdp.send('Page.getLayoutMetrics')
        result = cdp.send('Page.captureScreenshot', {'format': 'png', 'fromSurface': True, 'captureBeyondViewport': False})
        (out / name).write_bytes(base64.b64decode(result['data']))
        cdp.detach()
    else:
        page.screenshot(path=str(out / name), full_page=True)
    receipt['screenshots'].append(name)


def clean_run(run):
    for key in ('pageErrors', 'consoleErrors', 'externalRequests', 'failedRequests'):
        check(run['label'] + ': ' + key + ' empty', not run[key])


def route(page, name):
    page.locator('[data-collection="' + name + '"]').click()


def navigator(page):
    return page.get_by_role('group', name='Selected record', exact=True)


def selected(page):
    return parse_qs(urlparse(page.url).query).get('record', [''])[0]


try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=args.chromium, headless=True, args=['--no-sandbox'])
        receipt['browser'] = browser.version
        context = browser.new_context(viewport={'width': 1366, 'height': 768}, reduced_motion='reduce')
        page = context.new_page()
        run = watch(page, 'desktop-1366-production')
        load(page)
        metrics(page, run)
        primary_fonts(page, run)
        map_clearance(page, run['label'])
        check('Reduced-motion preference is active', page.evaluate('matchMedia("(prefers-reduced-motion: reduce)").matches'))
        check('No active explorer animations', page.locator('#explorer-map').evaluate('(e)=>e.getAnimations({subtree:true}).length') == 0)
        svg = page.locator('svg[aria-label^="Archive map on"]')
        expect(svg.locator('image')).to_have_attribute('href', '/curb/explore/aerial/princeton-2020.jpg')
        expect(page.get_by_text('Aerial 2020 · NJ Office of GIS', exact=True)).to_be_visible()
        page.get_by_role('button', name='Diagram', exact=True).click()
        expect(svg.locator('image')).to_have_count(0)
        page.get_by_role('button', name='Aerial', exact=True).click()
        expect(svg.locator('image')).to_have_count(1)
        check('Aerial shows the local cutout, and Diagram remains available')
        shot(page, 'desktop-1366.png')
        for name, count, markers in [('witherspoon', 8, 7), ('nassau-east', 10, 7), ('nassau-west', 12, 9), ('robertson', 5, 0), ('examples', 2, 0)]:
            route(page, name)
            expect(navigator(page)).to_contain_text(f' / {count}')
            expect(page.locator('[data-feature]')).to_have_count(markers)
            expect(page.locator('#explorer-map').get_by_text('Current traversal: Unknown', exact=True)).to_be_visible()
            check(name + ': record, geometry and traversal counts')
            if markers:
                map_clearance(page, name)
        pair = page.locator('[data-mode="conflict"]')
        expect(pair.locator('[data-record="example:a"]')).to_be_visible()
        expect(pair.locator('[data-record="example:b"]')).to_be_visible()
        check('Conflict cards are side by side', pair.locator('[data-record="example:a"]').bounding_box()['x'] < pair.locator('[data-record="example:b"]').bounding_box()['x'])
        expect(pair.get_by_text('Records disagree.', exact=True)).to_be_visible()
        check('Separate withheld and unavailable example copy', 'withheld' in pair.locator('[data-record="example:b"]').inner_text().lower() and 'unavailable' in pair.locator('[data-record="example:a"]').inner_text().lower())
        shot(page, 'conflicting-examples.png')
        page.get_by_role('button', name='Filter', exact=True).click()
        search = page.get_by_role('searchbox')
        search.fill('example:a')
        expect(navigator(page)).to_contain_text(' / 2')
        check('Searching one conflicting ID retains both records')
        page.get_by_role('button', name='Clear filters', exact=True).click()
        route(page, 'nassau-east')
        search.fill('834108')
        expect(navigator(page)).to_contain_text('1 / 1')
        check('Stable source ID search finds exactly the target', '834108' in selected(page))
        page.get_by_role('combobox').select_option('archive')
        check('Type filter preserves an eligible selected identity', '834108' in selected(page))
        collection_text = page.locator('#explorer-map').inner_text()
        check('Full-collection coverage counts remain explicit under filtering', all(text in collection_text for text in ('10 records', '7 on map', '3 not on map')))
        search.fill('no-matching-source-xyz')
        expect(navigator(page)).to_have_count(0)
        expect(page.locator('#explorer-map').get_by_role('heading', name='No matching evidence', exact=True).first).to_be_visible()
        page.get_by_role('button', name='Show the complete atlas', exact=True).first.click()
        expect(page.locator('[data-collection]')).to_have_count(5)
        check('No-results reset restores every collection')
        route(page, 'witherspoon')
        search.fill('library-door')
        expect(page.locator('[data-feature]')).to_have_count(0)
        expect(navigator(page)).to_contain_text('1 / 1')
        check('An unplaced entrance is selectable without inventing a marker')
        page.get_by_role('button', name='Clear filters', exact=True).click()
        route(page, 'witherspoon')
        first = selected(page)
        page.get_by_role('button', name='Next snapshot', exact=True).click()
        check('Next snapshot changes identity', selected(page) != first)
        page.get_by_role('button', name='Previous snapshot', exact=True).click()
        check('Previous snapshot restores identity', selected(page) == first)
        page.get_by_role('button', name='Previous snapshot', exact=True).click()
        check('Previous snapshot wraps to last record', selected(page) == 'record:unplaced:library-door')
        marker = page.locator('[data-feature="ramps:568004"]')
        marker.focus(); marker.press('Enter')
        check('Marker Enter selects exact source', selected(page) == 'record:ramps:568004')
        other = page.locator('[data-feature="ramps:448038"]')
        other.focus(); other.press('Space')
        check('Marker Space selects exact source', selected(page) == 'record:ramps:448038')
        marker.locator('circle').last.click()
        check('Pointer marker selection', selected(page) == 'record:ramps:568004')
        svg = page.locator('svg[aria-label^="Archive map on"]')
        initial_view = svg.get_attribute('viewBox')
        page.get_by_role('button', name='Zoom in', exact=True).click()
        check('Zoom in changes extent only', float(svg.get_attribute('viewBox').split()[2]) < float(initial_view.split()[2]) and selected(page) == 'record:ramps:568004')
        page.get_by_role('button', name='Zoom out', exact=True).click()
        page.get_by_role('button', name='Fit collection', exact=True).click()
        check('Fit restores collection extent', svg.get_attribute('viewBox') == initial_view)
        svg.focus(); svg.press('ArrowRight')
        check('Keyboard pan changes extent', svg.get_attribute('viewBox') != initial_view)
        svg.press('+')
        check('Keyboard plus zooms', float(svg.get_attribute('viewBox').split()[2]) < float(initial_view.split()[2]))
        svg.press('Home')
        check('Home fits collection', svg.get_attribute('viewBox') == initial_view)
        box = svg.bounding_box()
        page.mouse.move(box['x'] + box['width'] * .65, box['y'] + box['height'] * .65)
        page.mouse.down(); page.mouse.move(box['x'] + box['width'] * .65 + 50, box['y'] + box['height'] * .65 + 35, steps=10); page.mouse.up()
        check('Pointer drag pans without selecting another record', svg.get_attribute('viewBox') != initial_view and selected(page) == 'record:ramps:568004')
        svg.focus(); svg.press('Home')
        page.locator('[data-collection="witherspoon"]').focus()
        page.keyboard.press('ArrowRight'); page.keyboard.press('Enter')
        expect(page.locator('[data-collection="nassau-east"]')).to_have_attribute('aria-pressed', 'true')
        check('Collection arrow and Enter keyboard equivalent')
        check('Collection change fits its own extent', svg.get_attribute('viewBox') != initial_view)
        route(page, 'robertson')
        for i in range(5):
            if i:
                page.get_by_role('button', name='Next snapshot', exact=True).click()
            expect(navigator(page)).to_contain_text(f'{i + 1} / 5')
            image = page.locator('#explorer-map [aria-label*="Photo inspection:"] img')
            expect(image).to_be_visible()
            image.evaluate('(img)=>img.decode()')
            check('Robertson photo ' + str(i + 1) + ' loads locally without a marker', image.evaluate('(img)=>img.complete&&img.naturalWidth>0') and page.locator('[data-feature]').count() == 0)
        shot(page, 'robertson-field-detail.png')
        clean_run(run)
        for event, handler in listeners[page].items():
            page.remove_listener(event, handler)
        run = watch(page, 'existing-survey-and-media-handoff')
        clip_link = page.locator('[data-record] a').filter(has_text='Open source clip')
        with context.expect_page() as event:
            clip_link.click(modifiers=['Control'])
        video_page = event.value
        video_page.wait_for_load_state('domcontentloaded')
        video = video_page.locator('video')
        expect(video).to_be_visible()
        video_page.wait_for_function('document.querySelector("video").readyState >= 1')
        check('Actual media-fragment clip navigation reaches a local video', '#t=' in video_page.url and video.evaluate('(v)=>v.duration') > 13)
        video_page.close()
        page.locator('#explorer-evidence [data-record]').get_by_role('link', name='Review this finding in the survey', exact=False).click()
        page.wait_for_load_state('networkidle')
        check('Real survey page navigation', urlparse(page.url).path == '/curb/surveys/robertson-hall')
        expect(page.locator('video')).to_be_visible()
        check('Field link identifies the canonical final finding', parse_qs(urlparse(page.url).query).get('finding') == ['defect-05'])
        page.wait_for_function('document.querySelector("video").readyState >= 1 && document.querySelector("video").currentTime > 13.8')
        check('Field link seeks the matching final evidence frame')
        check('Existing survey handoff has no page exception or external request', not run['pageErrors'] and not run['externalRequests'])
        check('Existing survey handoff has no resource failure except its known missing root favicon', not run['failedRequests'] and all(e['location'].get('url') == args.base + '/favicon.ico' for e in run['consoleErrors']))
        context.close()

        for width, height in [(1920, 1080), (390, 844)]:
            context = browser.new_context(viewport={'width': width, 'height': height}, reduced_motion='reduce')
            page = context.new_page(); run = watch(page, str(width) + '-production')
            load(page); metrics(page, run)
            primary_fonts(page, run)
            map_clearance(page, run['label'])
            shot(page, 'desktop-1920.png' if width == 1920 else 'mobile-map.png')
            if width == 390:
                for name in ('witherspoon', 'nassau-east', 'nassau-west', 'robertson', 'examples'):
                    route(page, name)
                    chip = page.locator(f'[data-collection="{name}"]')
                    expect(chip).to_be_focused()
                    if page.locator('[data-feature]').count():
                        map_clearance(page, '390: ' + name)
                    toggle = navigator(page).get_by_role('button', name='Show details', exact=True)
                    toggle.click()
                    drawer = page.locator('#explorer-evidence')
                    expect(drawer).to_be_visible()
                    drawer.get_by_role('button', name='Hide details', exact=True).click()
                    expect(drawer).not_to_be_visible()
                    expect(toggle).to_be_focused()
                    check('390: ' + name + ' details close returns focus to the navigator')
                    metrics(page, run)
                shot(page, 'mobile-conflicts.png')
                route(page, 'robertson')
                page.get_by_role('button', name='Next snapshot', exact=True).click()
                page.locator('#explorer-map [aria-label*="Photo inspection:"] img').evaluate('(img)=>img.decode()')
                shot(page, 'mobile-field-stage.png')
                page.get_by_role('button', name='Play clip from', exact=False).click()
                page.wait_for_function('document.querySelector("#explorer-map video")?.paused === false')
                video = page.locator('#explorer-map video').element_handle()
                page.get_by_role('button', name='Next snapshot', exact=True).click()
                expect(page.locator('#explorer-map video')).to_have_count(0)
                check('Changing the field record pauses the detached clip', video.evaluate('(clip) => clip.paused'))
                shot(page, 'mobile-field-detail.png')
                drawer.locator('summary').filter(has_text='All 5 records in source order').click()
                check('Mobile full record list exposes every field frame', drawer.locator('details').last.locator('button').count() == 5)
            clean_run(run); context.close()

        # Browser preference changes actual page zoom, not CSS scale or a claimed viewport equivalent.
        profile = Path(tempfile.mkdtemp(prefix='curb-explorer-zoom-', dir='/tmp'))
        (profile / 'Default').mkdir()
        (profile / 'Default/Preferences').write_text(json.dumps({'partition': {'default_zoom_level': {'x': math.log(2) / math.log(1.2)}}}))
        zoom = p.chromium.launch_persistent_context(str(profile), executable_path=args.chromium, headless=True,
               no_viewport=True, args=['--no-sandbox', '--window-size=1366,768'], reduced_motion='reduce')
        page = zoom.pages[0]; run = watch(page, 'actual-200-percent-zoom')
        load(page); metrics(page, run)
        check('Actual 200% browser zoom doubles devicePixelRatio', run['viewport']['dpr'] == 2)
        route(page, 'nassau-west')
        navigator(page).get_by_role('button', name='Show details', exact=True).click()
        expect(page.locator('#explorer-evidence')).to_be_visible()
        check('200% zoom navigation and evidence reachable')
        shot(page, 'zoom-200-percent.png')
        clean_run(run); zoom.close(); shutil.rmtree(profile)

        context = browser.new_context(viewport={'width': 1366, 'height': 768})
        context.route('**/princeton-2020.jpg', lambda request: request.abort())
        page = context.new_page(); run = watch(page, 'injected-local-aerial-failure')
        load(page)
        expect(page.get_by_text('Aerial image unavailable', exact=False)).to_be_visible()
        expect(page.locator('[data-base="diagram"]')).to_be_visible()
        expect(page.locator('[data-feature]')).to_have_count(7)
        check('Failed aerial falls back to the diagram with all archive features')
        check('Injected aerial failure is local', bool(run['failedRequests']) and not run['externalRequests'] and not run['pageErrors'])
        context.close()

        # Deliberately abort the first real photo in a fresh context; record separately from clean runs.
        context = browser.new_context(viewport={'width': 1366, 'height': 768})
        context.route('**/defect-01.jpg', lambda request: request.abort())
        page = context.new_page(); run = watch(page, 'injected-local-photo-failure')
        load(page); route(page, 'robertson')
        photo = page.locator('#explorer-map [aria-label*="Photo inspection:"]')
        expect(photo.get_by_text('Photo unavailable — the local file could not be loaded.', exact=False)).to_be_visible()
        expect(photo.locator('img')).to_have_count(0)
        check('Broken local photo shows honest failure and no substitute image')
        check('Injected failure is local and produces no page exception', bool(run['failedRequests']) and not run['externalRequests'] and not run['pageErrors'])
        context.close(); browser.close()
    receipt['outcome'] = 'passed'
except Exception as error:
    receipt['outcome'] = 'failed'
    receipt['failure'] = str(error)
    raise
finally:
    receipt['completedAt'] = datetime.now(timezone.utc).isoformat()
    receipt['checkCount'] = len(receipt['checks'])
    (out / 'browser-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
    print(json.dumps({'outcome': receipt['outcome'], 'checks': len(receipt['checks']), 'receipt': str(out / 'browser-receipt.json')}))
