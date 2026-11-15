const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { writeReceipt } = require('./capture-store.cjs');

const base = (process.env.CURB_DEMO_URL || 'https://curb-taupe.vercel.app').replace(/\/+$/, '');
const expectedRevision = process.env.CURB_DEMO_REVISION;
const acceptance = process.env.CURB_DEMO_ACCEPTANCE;
const local = ['localhost','127.0.0.1','[::1]'].includes(new URL(base).hostname);
const output = path.resolve(__dirname,'../captures/investment');

async function main() {
  assert.match(expectedRevision || '', /^[a-f0-9]{40}$/, 'Set CURB_DEMO_REVISION to the approved full source SHA');
  assert.match(acceptance || '', /^https:\/\/github\.com\/oliverchennn\/Curb\/issues\/1#issuecomment-\d+$/,
    'Set CURB_DEMO_ACCEPTANCE to the board receipt for this merged build or hosted acceptance');
  fs.mkdirSync(output,{recursive:true});
  // An interrupted run must not pair new screenshots with an old receipt.
  fs.rmSync(path.join(output,'receipt.json'),{force:true});
  const browser = await chromium.launch({
    ...(process.env.CURB_DEMO_CHROME
      ? {executablePath:process.env.CURB_DEMO_CHROME}
      : {channel:'chrome'}),
    headless:true, timeout:18000,
    args:['--disable-background-networking','--no-first-run','--disable-sync'],
  });
  try {
    const viewport = {width:1456,height:819};
    const page = await browser.newPage({viewport,deviceScaleFactor:1,reducedMotion:'reduce'});
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror',e=>errors.push(e.message));
    const firstHealth = await page.request.get(base+'/api/health');
    assert.equal(firstHealth.status(),200);
    assert.equal((await firstHealth.json()).revision,expectedRevision,'visible app revision');
    const receipt = {
      source:base, revision:expectedRevision, acceptance,
      basis:local?'accepted merged build captured locally':'accepted deployed build',
      capturedAt:new Date().toISOString(), viewport, photographs:'Robertson footage is a separate source.',
      images:{}, states:{},
    };
    const navigate = await page.goto(base+'/curb/investment-demo',{waitUntil:'domcontentloaded'});
    assert.equal(navigate.status(),200);
    await page.getByRole('heading',{name:'Which repairs should we fund?'}).waitFor();
    await page.getByText('Synthetic scenario · assumed costs and route conditions',{exact:true}).first().waitFor();
    await page.evaluate(()=>document.fonts.ready);
    await page.addStyleTag({content:'html{scrollbar-width:none} ::-webkit-scrollbar{display:none}'});

    const checklist = page.getByRole('region',{name:'Two ways to use the same budget'});
    const network = page.getByRole('region',{name:'Connected repairs, shared access'});
    const status = network.getByRole('status');
    const button = name=>page.getByRole('button',{name,exact:true});
    const closeup = async locator=> {
      await locator.evaluate(el=>{el.scrollIntoView({block:'start'});window.scrollBy(0,-22)});
      await page.waitForTimeout(250);
    };
    async function shot(name, target) {
      if(target) await closeup(target);
      await page.screenshot({path:path.join(output,name+'.png'), animations:'disabled'});
      receipt.images[name]=name+'.png';
      console.log('Captured',name);
    }
    async function cards(budget, shape) {
      await checklist.getByText('Submitted budget '+budget,{exact:true}).first().waitFor();
      const articles=checklist.getByRole('article');
      const values=(await articles.allInnerTexts()).map(t=>t.replace(/\s+/g,' ').trim());
      assert.equal(values.length,2);
      for(let i=0;i<values.length;i++){
        assert.match(values[i],shape[i].count);
        assert.match(values[i],shape[i].names);
        assert.match(values[i],shape[i].repairs);
        assert.ok(values[i].includes(budget+' assumed spend'));
      }
      return values;
    }
    async function mapState(name, label, expected, snapshotTarget=network) {
      await status.filter({hasText:label}).waitFor();
      const visible=(await status.innerText()).replace(/\s+/g,' ').trim();
      assert.match(visible,expected);
      receipt.states[name]=visible;
      await shot(name,snapshotTarget);
    }
    receipt.states.compare=await cards('$10,000',[
      {count:/1 newly reachable destination\b/,names:/\bHall\b/,repairs:/\bC \$10,000/},
      {count:/2 newly reachable destinations/,names:/Library and Student center/,repairs:/A \+ B \$10,000/},
    ]);
    await shot('compare',checklist);
    await button('Condition-first').click();
    await mapState('condition','Condition-first',/1 newly reachable destination\b.*\bHall\b/);
    await button('Curb recommendation').click();
    await mapState('exact','Curb recommendation',/2 newly reachable destinations.*Library and Student center/);
    for(const repair of ['A','B']) {
      await button('Omit '+repair).click();
      await mapState('omit-'+repair.toLowerCase(),'Recommendation without '+repair,/0 newly reachable destinations/);
      assert.equal(await button('Omit '+repair).getAttribute('aria-pressed'),'true');
      await button('Restore recommendation').click();
      await status.filter({hasText:/Curb recommendation.*2 newly reachable destinations/}).waitFor();
    }
    await button('$20,000').click();
    receipt.states.tie=await cards('$20,000',[
      {count:/3 newly reachable destinations/,names:/Library.*Student center.*Hall|Hall.*Library.*Student center/,repairs:/C \+ A \+ B \$20,000/},
      {count:/3 newly reachable destinations/,names:/Library.*Student center.*Hall|Hall.*Library.*Student center/,repairs:/A \+ B \+ C \$20,000/},
    ]);
    await checklist.getByText('Both restore the same number of destinations at the same spend.',{exact:false}).waitFor();
    await shot('tie',checklist);
    await button('$10,000').click();
    await checklist.getByText('Submitted budget $10,000',{exact:true}).first().waitFor();
    await button('Omit A').click();
    await status.filter({hasText:'Recommendation without A'}).waitFor();
    await page.emulateMedia({media:'print'});
    const brief = page.getByRole('region',{name:'Recommended investment'});
    await brief.waitFor();
    const briefText=(await brief.innerText()).replace(/\s+/g,' ').trim();
    assert.match(briefText,/Library and Student center/);
    assert.match(briefText,/\$10,000/);
    assert.match(briefText,/Synthetic scenario/i);
    assert.doesNotMatch(briefText,/Recommendation without A/);
    receipt.states.brief=briefText;
    await shot('brief',brief);
    const lastHealth = await page.request.get(base+'/api/health');
    assert.equal((await lastHealth.json()).revision,expectedRevision,'revision stayed pinned throughout');
    assert.deepEqual(errors,[],'page errors');
    writeReceipt(output,receipt,Object.keys(receipt.images));
    console.log('Investment capture verified at',expectedRevision);
  } finally {await browser.close();}
}

main().catch(e=>{console.error(e.stack);process.exitCode=1;});
