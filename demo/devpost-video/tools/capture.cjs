const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const output = path.resolve(__dirname, '../captures');
const base = (process.env.CURB_DEMO_URL || 'https://curb-taupe.vercel.app').replace(/\/+$/, '');
const receipt = { source: base, viewport: [1456, 819], images: {}, browserClips: {} };
fs.mkdirSync(output, { recursive: true });

async function main() {
  const browser = await chromium.launch({
    ...(process.env.CURB_DEMO_CHROME
      ? { executablePath: process.env.CURB_DEMO_CHROME }
      : { channel: 'chrome' }),
    headless: true,
    timeout: 18000,
    args: ['--disable-background-networking', '--no-first-run', '--disable-sync'],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1456, height: 819 },
      deviceScaleFactor: 1,
      acceptDownloads: true,
    });
    page.setDefaultTimeout(5000);
    page.on('pageerror', e => console.warn('Page error:', e.message));
    const response = await page.goto(base + '/curb/surveys/robertson-hall', { waitUntil: 'domcontentloaded', timeout: 18000 });
    if (response?.status() !== 200) throw new Error('Survey page HTTP ' + response?.status());
    const review = page.getByRole('tab', { name: /Review findings/i });
    const compare = page.getByRole('tab', { name: /Compare repairs/i });
    const exportTab = page.getByRole('tab', { name: /Export report/i });
    await review.waitFor();
    await page.evaluate(() => document.fonts.ready);
    console.log('Live survey loaded');
    await page.addStyleTag({content:'html{scrollbar-width:none} ::-webkit-scrollbar{display:none}'});

    async function snapshot(name, target) {
      if (target) await target.evaluate(el => el.scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(260);
      const filename = path.join(output, name + '.png');
      await page.screenshot({ path: filename, animations: 'disabled' });
      receipt.images[name] = path.basename(filename);
      console.log('Captured', name);
    }

    const cdp = await page.context().newCDPSession(page);
    async function record(name, take) {
      const frames = [];
      const start = performance.now();
      const collect = event => {
        frames.push({ data: event.data, seconds: (performance.now() - start) / 1000 });
        cdp.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => {});
      };
      cdp.on('Page.screencastFrame', collect);
      await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1456, maxHeight: 819 });
      try {
        await take();
      } finally {
        await cdp.send('Page.stopScreencast');
        cdp.off('Page.screencastFrame', collect);
        const runtime = (performance.now() - start) / 1000;
        if (frames.length > 2) {
          const child = path.join(output, name);
          fs.mkdirSync(child, { recursive: true });
          const manifest = ['ffconcat version 1.0'];
          frames.forEach((f, i) => {
            const filename = String(i).padStart(4, '0') + '.jpg';
            const next = frames[i + 1]?.seconds ?? runtime;
            fs.writeFileSync(path.join(child, filename), Buffer.from(f.data, 'base64'));
            manifest.push("file '" + filename + "'", 'duration ' + Math.max(0.020, next - f.seconds).toFixed(4));
          });
          manifest.push("file '" + String(frames.length - 1).padStart(4, '0') + ".jpg'");
          fs.writeFileSync(path.join(child, 'frames.ffconcat'), manifest.join('\n') + '\n');
          receipt.browserClips[name] = { frames: frames.length, seconds: runtime };
        }
        console.log('Recorded', name, frames.length, 'browser frames');
        fs.writeFileSync(path.join(output, 'capture.json'), JSON.stringify(receipt, null, 2));
      }
    }

    const evidence = page.getByRole('navigation', { name: /Jump to finding evidence/i })
      .getByRole('button', { name: /Defect 04.*Surface breakup/i });
    await record('evidence-click', async () => {
      await page.waitForTimeout(1100);
      await evidence.click();
      await page.waitForTimeout(1900);
      await snapshot('finding');
      receipt.evidenceSecond = await page.locator('video').first().evaluate(v => v.currentTime);
      const inspection = page.getByText(/Needs measuring|What to measure|Field measurements/i).first();
      if (await inspection.count()) await snapshot('inspection', inspection);
      await page.waitForTimeout(1200);
    });

    await page.evaluate(() => window.scrollTo(0, 0));
    await record('budget-click', async () => {
      await page.waitForTimeout(900);
      await compare.click();
      await snapshot('plans');
      const budget = page.getByRole('textbox', { name: /Budget.*dollars/i })
        .or(page.getByRole('spinbutton', { name: /Budget/i })).first();
      await budget.fill('500');
      await page.waitForTimeout(1100);
      const matching = page.getByRole('button', { name: /(?:Select|Choose).*Budget scenario/i });
      if (await matching.count()) await matching.first().click();
      await snapshot('budget', budget);
      const section = page.getByText(/Deferred needs|Deferred areas|Outside budget/i).first();
      if (await section.count()) await snapshot('deferred', section);
      const selected = await page.locator('main').innerText();
      receipt.budgetScreen = selected.split('\n').filter(x => /\$500|deferred|quote|selected/i.test(x)).slice(0,24);
      await page.waitForTimeout(1000);
    });

    await page.evaluate(() => window.scrollTo(0, 0));
    await record('export-click', async () => {
      await page.waitForTimeout(900);
      await exportTab.click();
      await snapshot('export');
      const report = page.getByRole('button', { name: /Download (?:accessible )?HTML/i });
      if (await report.count()) {
        const [download] = await Promise.all([
          page.waitForEvent('download', { timeout: 12000 }), report.first().click(),
        ]);
        const htmlPath = path.join(output, 'demo-budget-report.html');
        await download.saveAs(htmlPath);
        receipt.report = path.basename(htmlPath);
      }
      await page.waitForTimeout(1000);
    });

    if (receipt.report) {
      const { pathToFileURL } = require('node:url');
      await page.goto(pathToFileURL(path.join(output, receipt.report)).href, { waitUntil: 'load' });
      await snapshot('report');
      const section = page.getByRole('heading', { name: 'Your budget', exact: true });
      if (await section.count()) {
        await section.evaluate(e => { e.scrollIntoView({ block: 'start' }); window.scrollBy(0, -28); });
        await snapshot('report-detail');
      }
      receipt.reportScreen = (await page.locator('body').innerText()).split('\n')
        .filter(x => /\$500|deferred|quote|selected/i.test(x)).slice(0,24);
    }
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(output, 'capture.json'), JSON.stringify(receipt, null, 2));
  }
}

main().catch(e => { console.error(e.stack); process.exitCode = 1; });
