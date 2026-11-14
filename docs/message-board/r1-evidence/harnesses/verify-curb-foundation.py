import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright, expect

async def main():
    evidence = {'pageErrors': [], 'httpErrors': [], 'externalRequests': []}
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        page = await browser.new_page(viewport={'width': 390, 'height': 844})
        page.on('pageerror', lambda e: evidence['pageErrors'].append(str(e)))
        page.on('response', lambda r: evidence['httpErrors'].append({'url': r.url, 'status': r.status}) if r.status >= 400 else None)
        page.on('request', lambda r: evidence['externalRequests'].append(r.url) if not r.url.startswith('http://127.0.0.1:3000/') else None)
        response = await page.request.get('http://127.0.0.1:3000/api/curb/scenario?dataset=sample')
        scenario = (await response.json())['data']['scenario']
        await page.goto('http://127.0.0.1:3000/curb')
        controls = page.get_by_role('region', name='Barriers', exact=True).get_by_role('button')
        await expect(controls).to_have_count(4)
        for index, barrier in enumerate(scenario['barriers']):
            await controls.nth(index).click()
            await expect(controls.nth(index)).to_have_attribute('aria-pressed', 'true')
            await expect(page.get_by_role('region', name='Evidence', exact=True)).to_contain_text(barrier['id'])
            for item in scenario['evidence']:
                if item['id'] in barrier['evidenceIds']:
                    await expect(page.get_by_text(item['caption'], exact=True)).to_be_visible()
        await controls.first.focus()
        await page.keyboard.press('ArrowDown')
        await expect(controls.nth(1)).to_be_focused()
        await page.keyboard.press('Enter')
        await expect(controls.nth(1)).to_have_attribute('aria-pressed', 'true')
        await page.get_by_role('button', name='Reset', exact=True).click()
        await expect(page.get_by_text('Select a barrier from the list to see its linked evidence.', exact=True)).to_be_visible()
        assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        await page.screenshot(path='/workspace/scratch/curb-r1-verification/foundation-mobile.png', full_page=True)
        await page.get_by_role('link', name='Plan a trip and compare one repair').click()
        await expect(page.get_by_role('combobox', name='Origin', exact=True)).to_have_value('arrival')
        await page.get_by_role('button', name='Compare trip', exact=True).click()
        await expect(page.get_by_role('region', name='Without a repair', exact=True)).to_be_visible()
        chunks = await page.evaluate("[...new Set(performance.getEntriesByType('resource').map(x=>x.name).filter(x=>x.includes('/_next/static/') && x.endsWith('.js')))]")
        for url in chunks:
            text = await (await page.request.get(url)).text()
            assert 'synthetic-campus-links' not in text
            assert 'Authored illustration:' not in text
        evidence['clientChunksChecked'] = len(chunks)
        assert not evidence['externalRequests'], evidence['externalRequests']
        assert not evidence['pageErrors'], evidence['pageErrors']
        assert all(item['url'].endswith('/favicon.ico') and item['status'] == 404 for item in evidence['httpErrors']), evidence['httpErrors']
        evidence['allFourBarriersKeyboardResetMobileTripLink'] = 'passed'
        Path('/workspace/scratch/curb-r1-verification/foundation-evidence.json').write_text(json.dumps(evidence, indent=2))
        await browser.close()
    print('PASS foundation regression, trip link, local-only requests and client fixture boundary; known favicon 404 retained')

asyncio.run(main())
