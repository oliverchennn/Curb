"""Bounded production Chromium acceptance. Uses an already installed Playwright/Chromium.

Start the production server, then run:
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
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument('--base', default='http://127.0.0.1:3186')
parser.add_argument('--chromium', default='/usr/bin/chromium')
args = parser.parse_args()
assert urlparse(args.base).hostname in ('localhost', '127.0.0.1'), 'Use a local production server.'
root = Path(__file__).resolve().parents[4]
out = root / 'public/curb/explore/verification'
out.mkdir(parents=True, exist_ok=True)
receipt = {'startedAt': datetime.now(timezone.utc).isoformat(), 'baseUrl': args.base,
           'implementationBase': '6b2b11040eed8d3d620743bc4e12e112f9ebfa90',
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
    run['primaryFontPixels'] = page.locator('[data-collection] strong, [data-collection] small, [data-snapshot]>strong, [data-snapshot]>span, [data-snapshot]>small, [data-record]>span').evaluate_all('(es)=>[...new Set(es.map(e=>parseFloat(getComputedStyle(e).fontSize)))]')
    check(run['label'] + ': primary name, type and snapshot date labels at least 14px', min(run['primaryFontPixels']) >= 14)


def map_clearance(page, label):
    result = page.locator('svg[aria-label^="Archive map."]').evaluate('''(svg) => {
      const r = svg.getBoundingClientRect();
      const controls = svg.parentElement.querySelector('[aria-label="Map controls"]').getBoundingClientRect();
      const features = [...svg.querySelectorAll('[data-feature]')].map(e => e.getBoundingClientRect());
      return {count:features.length, clear: features.every(f => f.left>=r.left-1 && f.right<=r.right+1 && f.top>=r.top-1 && f.bottom<=r.bottom+1 && f.top>=controls.bottom)};
    }''')
    check(label + ': fitted source features remain visible below map controls', result['clear'])


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


def route(page, name, mobile=False):
    if mobile:
        page.get_by_role('tab', name='Collections', exact=True).click()
    page.locator('[data-collection="' + name + '"]').click()


def selected(page):
    return page.locator('[data-snapshot][aria-pressed="true"]').get_attribute('data-snapshot')


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
        shot(page, 'desktop-1366.png')
        for name, count, markers in [('witherspoon', 8, 7), ('nassau-east', 10, 7), ('nassau-west', 12, 9), ('robertson', 5, 0), ('examples', 2, 0)]:
            route(page, name)
            expect(page.locator('[data-snapshot]')).to_have_count(count)
            expect(page.locator('[data-feature]')).to_have_count(markers)
            expect(page.locator('#explorer-map').get_by_text('Current traversal: Unknown', exact=True)).to_be_visible()
            check(name + ': record, geometry and traversal counts')
            if markers:
                map_clearance(page, name)
        expect(page.locator('[data-record="example:a"]')).to_be_visible()
        expect(page.locator('[data-record="example:b"]')).to_be_visible()
        check('Conflict cards are side by side', page.locator('[data-record="example:a"]').bounding_box()['x'] < page.locator('[data-record="example:b"]').bounding_box()['x'])
        expect(page.get_by_text('Records disagree.', exact=True)).to_be_visible()
        check('Separate withheld and unavailable example copy', 'withheld' in page.locator('[data-record="example:b"]').inner_text().lower() and 'unavailable' in page.locator('[data-record="example:a"]').inner_text().lower())
        shot(page, 'conflicting-examples.png')
        search = page.get_by_role('searchbox')
        search.fill('example:a')
        expect(page.locator('[data-snapshot]')).to_have_count(2)
        check('Searching one conflicting ID retains both records')
        page.get_by_role('button', name='Clear filters', exact=True).click()
        route(page, 'nassau-east')
        search.fill('834108')
        expect(page.locator('[data-snapshot]')).to_have_count(1)
        check('Stable source ID search finds exactly the target', '834108' in selected(page))
        page.get_by_role('combobox').select_option('archive')
        check('Type filter preserves an eligible selected identity', '834108' in selected(page))
        expect(page.get_by_text('11 unplaced records · 2 illustrative conflict records in the atlas.', exact=False)).to_be_visible()
        check('Hidden unplaced/conflict counts remain explicit')
        search.fill('no-matching-source-xyz')
        expect(page.locator('[data-snapshot]')).to_have_count(0)
        expect(page.locator('#explorer-map').get_by_role('heading', name='No matching records', exact=True).first).to_be_visible()
        page.get_by_role('button', name='Reset search & filters').first.click()
        expect(page.locator('[data-collection]')).to_have_count(5)
        check('No-results reset restores every collection')
        route(page, 'witherspoon')
        search.fill('library-door')
        expect(page.locator('[data-feature]')).to_have_count(0)
        expect(page.locator('[data-snapshot]')).to_have_count(1)
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
        check('Selected snapshot scrolls within strip', page.locator('[data-snapshot][aria-pressed="true"]').evaluate('(b)=>{const r=b.getBoundingClientRect(),p=b.parentElement.getBoundingClientRect();return r.left>=p.left&&r.right<=p.right}'))
        marker = page.locator('[data-feature="ramps:568004"]')
        marker.focus(); marker.press('Enter')
        check('Marker Enter selects exact source', selected(page) == 'record:ramps:568004')
        other = page.locator('[data-feature="ramps:448038"]')
        other.focus(); other.press('Space')
        check('Marker Space selects exact source', selected(page) == 'record:ramps:448038')
        marker.locator('circle').last.click()
        check('Pointer marker selection', selected(page) == 'record:ramps:568004')
        svg = page.locator('svg[aria-label^="Archive map."]')
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
        page.keyboard.press('ArrowDown'); page.keyboard.press('Enter')
        expect(page.locator('[data-collection="nassau-east"]')).to_have_attribute('aria-pressed', 'true')
        check('Collection arrow and Enter keyboard equivalent')
        check('Collection change fits its own extent', svg.get_attribute('viewBox') != initial_view)
        route(page, 'robertson')
        for i in range(5):
            snapshot = page.locator('[data-snapshot]').nth(i)
            snapshot.click()
            image = page.locator('[data-record] img')
            expect(image).to_be_visible()
            image.evaluate('(img)=>img.decode()')
            check('Robertson photo ' + str(i + 1) + ' loads locally without a marker', image.evaluate('(img)=>img.complete&&img.naturalWidth>0') and page.locator('[data-feature]').count() == 0)
        shot(page, 'robertson-field-detail.png')
        clean_run(run)
        for event, handler in listeners[page].items():
            page.remove_listener(event, handler)
        run = watch(page, 'existing-survey-and-media-handoff')
        clip_link = page.locator('[data-record] a').filter(has_text='Open source clip')
        clip_href = clip_link.get_attribute('href')
        with context.expect_page() as event:
            clip_link.click(modifiers=['Control'])
        video_page = event.value
        video_page.wait_for_load_state('domcontentloaded')
        video = video_page.locator('video')
        expect(video).to_be_visible()
        video_page.wait_for_function('document.querySelector("video").readyState >= 1')
        check('Actual media-fragment clip navigation reaches a local video', '#t=' in video_page.url and video.evaluate('(v)=>v.duration') > 13)
        video_page.close()
        page.locator('[data-record]').get_by_role('link', name='Review Robertson survey', exact=False).click()
        page.wait_for_load_state('networkidle')
        check('Real survey page navigation', urlparse(page.url).path == '/curb/surveys/robertson-hall')
        expect(page.locator('video')).to_be_visible()
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
                tab = page.get_by_role('tab', name='Map & snapshots', exact=True)
                tab.focus(); tab.press('ArrowRight')
                expect(page.get_by_role('tab', name='Collections', exact=True)).to_be_focused()
                expect(page.locator('#explorer-routes')).to_be_visible()
                expect(page.locator('#explorer-map')).not_to_be_visible()
                check('Mobile arrow selects and focuses next tab')
                page.keyboard.press('End')
                expect(page.get_by_role('tab', name='Evidence', exact=True)).to_be_focused()
                page.keyboard.press('Home')
                expect(tab).to_be_focused()
                check('Mobile tabs support Home and End')
                for name in ('witherspoon', 'nassau-east', 'nassau-west', 'robertson', 'examples'):
                    route(page, name, True)
                    expect(page.locator('#explorer-map')).to_be_visible()
                    if page.locator('[data-feature]').count():
                        map_clearance(page, '390: ' + name)
                    expect(page.get_by_role('tab', name='Map & snapshots', exact=True)).to_be_focused()
                    check('390: ' + name + ' selection keeps keyboard focus visible')
                    page.get_by_role('button', name='Open selected evidence', exact=False).click()
                    expect(page.locator('#explorer-evidence')).to_be_visible()
                    expect(page.get_by_role('tab', name='Evidence', exact=True)).to_be_focused()
                    check('390: ' + name + ' collection and evidence reachable')
                    metrics(page, run)
                shot(page, 'mobile-conflicts.png')
                route(page, 'robertson', True)
                page.get_by_role('button', name='Next snapshot', exact=True).click()
                page.get_by_role('button', name='Open selected evidence', exact=False).click()
                page.locator('[data-record] img').evaluate('(img)=>img.decode()')
                shot(page, 'mobile-field-detail.png')
                check('Mobile full record list exposes every field frame', page.locator('#explorer-evidence details').last.locator('button').count() == 5)
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
        route(page, 'nassau-west', True)
        page.get_by_role('button', name='Open selected evidence', exact=False).click()
        expect(page.locator('#explorer-evidence')).to_be_visible()
        check('200% zoom navigation and evidence reachable')
        shot(page, 'zoom-200-percent.png')
        clean_run(run); zoom.close(); shutil.rmtree(profile)

        # Deliberately abort the first real photo in a fresh context; record separately from clean runs.
        context = browser.new_context(viewport={'width': 1366, 'height': 768})
        context.route('**/defect-01.jpg', lambda request: request.abort())
        page = context.new_page(); run = watch(page, 'injected-local-photo-failure')
        load(page); route(page, 'robertson')
        expect(page.locator('[data-record]').get_by_text('Photo unavailable — the local file could not be loaded.', exact=True)).to_be_visible()
        expect(page.locator('[data-record] img')).to_have_count(0)
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
