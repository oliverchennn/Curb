"""R1 production-browser acceptance and fault injection; outside product tree."""
import asyncio
import json
import re
from pathlib import Path
from playwright.async_api import async_playwright, expect

BASE = 'http://127.0.0.1:3000'
OUT = Path('/workspace/scratch/curb-r1-verification')
OUT.mkdir(exist_ok=True)

async def main():
    evidence = {'checks': [], 'pageErrors': [], 'consoleErrors': []}
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        context = await browser.new_context(viewport={'width': 1440, 'height': 1050})
        page = await context.new_page()
        page.on('pageerror', lambda error: evidence['pageErrors'].append(str(error)))
        page.on('console', lambda message: evidence['consoleErrors'].append(message.text) if message.type == 'error' else None)
        await page.goto(BASE + '/curb')
        await expect(page.get_by_role('link', name='Plan a trip and compare one repair')).to_be_visible()
        await page.get_by_role('link', name='Plan a trip and compare one repair').click()
        await expect(page.get_by_role('combobox', name='Origin', exact=True)).to_have_value('arrival')
        await expect(page.get_by_role('combobox', name='Destination', exact=True)).to_have_value('library')
        await expect(page.get_by_role('combobox', name='Hypothetical repair', exact=True)).to_have_value('')
        await expect(page.get_by_role('region', name='Before repair', exact=True)).to_have_count(0)
        evidence['checks'].append('Foundation link and explicit initial controls; no automatic comparison')

        async def compare(before, after, repaired=True):
            await page.get_by_role('button', name='Compare trip', exact=True).click()
            left = page.get_by_role('region', name='Before repair', exact=True)
            right = page.get_by_role('region', name='After hypothetical repair' if repaired else 'Without a repair', exact=True)
            await expect(left.get_by_text(before, exact=True).first).to_be_visible()
            await expect(right.get_by_text(after, exact=True).first).to_be_visible()
            return left, right

        await compare('Blocked', 'Blocked', False)
        await page.get_by_role('combobox', name='Hypothetical repair', exact=True).select_option('add-library-ramp')
        await expect(page.get_by_role('region', name='Before repair', exact=True)).to_have_count(0)
        await expect(page.get_by_role('combobox', name='Barrier evidence', exact=True)).to_have_value('library-crossing-curb')
        await expect(page.get_by_text('Synthetic library crossing curb', exact=True)).to_be_visible()
        left, right = await compare('Blocked', 'Reachable')
        await expect(right.get_by_text('60 m', exact=False).first).to_be_visible()
        await expect(right.get_by_role('list', name='After hypothetical repair route connections').locator('li')).to_have_count(3)
        assert await left.locator('svg polyline[stroke="#215aba"]').count() == 0
        assert await right.locator('svg polyline[stroke="#215aba"]').count() == 3
        await page.screenshot(path=str(OUT / 'trip-desktop.png'), full_page=True)
        evidence['checks'].append('Golden library repair: blocked to 60 m; three route edges; original linked evidence')

        for destination, state in [('cafe', 'Reachable'), ('studio', 'Unknown'), ('archive', 'Disconnected')]:
            await page.get_by_role('combobox', name='Destination', exact=True).select_option(destination)
            left, right = await compare(state, state)
            if state != 'Reachable':
                assert await left.locator('svg polyline[stroke="#215aba"]').count() == 0
                assert await right.locator('svg polyline[stroke="#215aba"]').count() == 0
                await expect(left.get_by_text('No route returned', exact=True)).to_be_visible()
            evidence['checks'].append(f'{destination}: before/after {state}; truthful route rendering')
        await page.get_by_role('combobox', name='Destination', exact=True).select_option('service')
        for repair in ['move-service-crate', 'resurface-service-entry']:
            await page.get_by_role('combobox', name='Hypothetical repair', exact=True).select_option(repair)
            left, right = await compare('Blocked', 'Blocked')
            await expect(right.get_by_role('button', name=re.compile('View evidence:'))).to_have_count(1)
        evidence['checks'].append('Both single service repairs leave the other blocker and its evidence')
        await page.get_by_role('combobox', name='Origin', exact=True).select_option('library-door')
        await page.get_by_role('combobox', name='Destination', exact=True).select_option('library')
        await page.get_by_role('combobox', name='Hypothetical repair', exact=True).select_option('')
        left, right = await compare('Reachable', 'Reachable', False)
        await expect(right.get_by_text('You are already at this destination. No edges are needed.', exact=True)).to_be_visible()
        await page.get_by_role('combobox', name='Destination', exact=True).select_option('cafe')
        await compare('Disconnected', 'Disconnected', False)
        evidence['checks'].append('Same-node 0 m and one-way entrance prevents reverse trip')

        await page.get_by_role('button', name='Reset', exact=True).click()
        await expect(page.get_by_role('combobox', name='Origin', exact=True)).to_have_value('arrival')
        await expect(page.get_by_role('combobox', name='Destination', exact=True)).to_have_value('library')
        await expect(page.get_by_role('combobox', name='Hypothetical repair', exact=True)).to_have_value('')
        await expect(page.get_by_role('combobox', name='Barrier evidence', exact=True)).to_have_value('')
        await expect(page.get_by_role('region', name='Before repair', exact=True)).to_have_count(0)
        await page.get_by_role('combobox', name='Hypothetical repair', exact=True).focus()
        await page.keyboard.press('ArrowDown')
        await page.keyboard.press('Tab')
        await expect(page.get_by_role('button', name='Compare trip', exact=True)).to_be_focused()
        await page.keyboard.press('Enter')
        await expect(page.get_by_role('region', name='After hypothetical repair', exact=True)).to_be_visible()
        evidence['checks'].append('Reset clears simulation/evidence; native keyboard selection and submit')
        await page.set_viewport_size({'width': 390, 'height': 844})
        await page.screenshot(path=str(OUT / 'trip-mobile.png'), full_page=True)
        dimensions = await page.evaluate('({scroll:document.documentElement.scrollWidth, width:innerWidth})')
        assert dimensions['scroll'] <= dimensions['width'], dimensions
        evidence['checks'].append('390 px layout has no horizontal overflow with comparison/evidence')
        baseline_console_errors = list(evidence['consoleErrors'])

        # Fail real HTTP requests; the normal retry must recover through the actual API.
        await page.route('**/api/curb/trip-scenario', lambda route: route.abort('failed'))
        await page.reload()
        await expect(page.get_by_role('alert').first).to_contain_text('could not be loaded')
        await page.unroute('**/api/curb/trip-scenario')
        await page.get_by_role('button', name='Retry loading', exact=True).click()
        await expect(page.get_by_role('combobox', name='Origin', exact=True)).to_have_value('arrival')
        await page.route('**/api/curb/trip', lambda route: route.abort('failed'))
        await page.get_by_role('button', name='Compare trip', exact=True).click()
        await expect(page.get_by_role('alert').first).to_contain_text('could not be completed')
        await page.unroute('**/api/curb/trip')
        await page.get_by_role('button', name='Try comparison again', exact=True).click()
        await expect(page.get_by_role('region', name='Without a repair', exact=True)).to_be_visible()
        evidence['checks'].append('Context and comparison transport failures show error and recover on retry')

        async def wrong_tuple(route):
            response = await route.fetch()
            body = await response.json()
            body['data']['revision'] += 1
            await route.fulfill(response=response, json=body)
        await page.route('**/api/curb/trip', wrong_tuple)
        await page.get_by_role('button', name='Compare trip', exact=True).click()
        await expect(page.get_by_role('alert').first).to_contain_text('response could not be read')
        await expect(page.get_by_role('region', name='Before repair', exact=True)).to_have_count(0)
        await page.unroute('**/api/curb/trip')
        evidence['checks'].append('Response with mismatched revision is rejected without stale output')

        # Delay real API responses and deliberately ignore AbortSignal to exercise late completion.
        await page.add_init_script("""(() => {
          const realFetch = window.fetch.bind(window);
          window.__tripTest = {defer:false, pending:[]};
          window.fetch = async (input, init) => {
            if (String(input) === '/api/curb/trip' && window.__tripTest.defer) {
              const response = await realFetch(input, {...init, signal:undefined});
              await new Promise(resolve => window.__tripTest.pending.push(resolve));
              return response;
            }
            return realFetch(input, init);
          };
        })();""")
        await page.reload()
        await expect(page.get_by_role('combobox', name='Origin', exact=True)).to_have_value('arrival')

        async def hold_comparison():
            await page.evaluate('window.__tripTest.defer = true')
            await page.get_by_role('button', name='Compare trip', exact=True).click()
            await page.wait_for_function('window.__tripTest.pending.length === 1')
        async def release_comparison():
            await page.evaluate('window.__tripTest.defer = false; window.__tripTest.pending.splice(0).forEach(resolve=>resolve())')
            await page.wait_for_timeout(150)

        await hold_comparison()
        await page.get_by_role('combobox', name='Destination', exact=True).select_option('cafe')
        await page.evaluate('window.__tripTest.defer = false')
        await compare('Reachable', 'Reachable', False)
        await release_comparison()
        await expect(page.get_by_role('heading', name='Welcome court → Cafe', exact=True)).to_be_visible()
        evidence['checks'].append('Late old library response cannot replace latest cafe selection/result')
        await hold_comparison()
        await page.get_by_role('button', name='Reset', exact=True).click()
        await release_comparison()
        await expect(page.get_by_role('region', name='Before repair', exact=True)).to_have_count(0)
        await expect(page.get_by_role('combobox', name='Destination', exact=True)).to_have_value('library')
        await hold_comparison()
        await page.get_by_role('button', name='Cancel comparison', exact=True).click()
        await release_comparison()
        await expect(page.get_by_role('region', name='Before repair', exact=True)).to_have_count(0)
        await expect(page.get_by_text('Comparison cancelled. Your choices are ready to compare again.', exact=True)).to_be_visible()
        evidence['checks'].append('Reset and explicit cancel suppress late responses')
        await page.clock.install()
        await hold_comparison()
        await page.clock.fast_forward(10_001)
        await expect(page.get_by_role('alert').first).to_contain_text('comparison took too long')
        await release_comparison()
        await expect(page.get_by_role('region', name='Before repair', exact=True)).to_have_count(0)
        await page.get_by_role('button', name='Try comparison again', exact=True).click()
        await expect(page.get_by_role('region', name='Without a repair', exact=True)).to_be_visible()
        evidence['checks'].append('10 s comparison deadline, late response rejection, successful retry')

        # Context cancellation and timeout use a separate page to keep the clock isolated.
        load_page = await context.new_page()
        await load_page.route('**/api/curb/trip-scenario', lambda route: None)
        await load_page.goto(BASE + '/curb/trips')
        await expect(load_page.get_by_role('button', name='Cancel loading', exact=True)).to_be_visible()
        await load_page.clock.install()
        await load_page.get_by_role('button', name='Cancel loading', exact=True).click()
        await expect(load_page.get_by_role('alert').first).to_contain_text('Loading cancelled')
        await load_page.get_by_role('button', name='Retry loading', exact=True).click()
        await load_page.clock.fast_forward(10_001)
        await expect(load_page.get_by_role('alert').first).to_contain_text('Loading took too long')
        await load_page.unroute('**/api/curb/trip-scenario')
        await load_page.get_by_role('button', name='Retry loading', exact=True).click()
        await expect(load_page.get_by_role('combobox', name='Origin', exact=True)).to_have_value('arrival')
        evidence['checks'].append('Context loading cancel, 10 s deadline, and real API retry')
        await load_page.close()
        evidence['browserVersion'] = browser.version
        evidence['normalConsoleErrors'] = baseline_console_errors
        assert not evidence['pageErrors'], evidence['pageErrors']
        (OUT / 'browser-evidence.json').write_text(json.dumps(evidence, indent=2))
        await browser.close()
    print(f"PASS {len(evidence['checks'])} browser checks; no page exceptions; expected injected network errors recorded separately")

asyncio.run(main())
