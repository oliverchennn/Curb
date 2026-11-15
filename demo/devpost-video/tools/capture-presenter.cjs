const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const dns=require('node:dns/promises');
const {isIPv4}=require('node:net');
const {chromium}=require('playwright');
const {writeReceipt,PRESENTER_IMAGES:names}=require('./capture-store.cjs');

const output=path.resolve(__dirname,'../captures/presenter');
const base=(process.env.CURB_DEMO_URL || 'https://curb-taupe.vercel.app').replace(/\/+$/,'');
const revision=process.env.CURB_DEMO_REVISION;
const acceptance=process.env.CURB_DEMO_ACCEPTANCE;
const expectedCrop='/curb/surveys/robertson-hall/presenter-v1/defect-04-crop.jpg';
const expectedCropSha='b1e199f667d280942998a7c08e8641df133306b28fe17e4efe90d6f329c729b6';

async function main(){
  assert.equal(new URL(base).protocol,'https:','Present the accepted HTTPS deployment');
  assert.match(revision || '',/^[a-f0-9]{40}$/,'Set the exact production revision');
  assert.match(acceptance || '',/^https:\/\/github\.com\/oliverchennn\/Curb\/issues\/1#issuecomment-\d+$/,'Set the exact Presenter release receipt');
  fs.mkdirSync(output,{recursive:true});
  fs.rmSync(path.join(output,'receipt.json'),{force:true});
  const args=['--disable-background-networking','--no-first-run','--disable-sync'];
  const address=process.env.CURB_DEMO_IPV4;
  if(address){
    const host=new URL(base).hostname;
    assert.ok(isIPv4(address) && (await dns.resolve4(host)).includes(address),'Use a current public A record for this hostname');
    args.push('--host-resolver-rules=MAP '+host+' '+address);
  }
  const browser=await chromium.launch({
    ...(process.env.CURB_DEMO_CHROME ? {executablePath:process.env.CURB_DEMO_CHROME} : {channel:'chrome'}),
    headless:true, timeout:18000,
    args,
  });
  try{
    const viewport={width:1456,height:819};
    const context=await browser.newContext({viewport,deviceScaleFactor:1,reducedMotion:'reduce'});
    const page=await context.newPage();
    page.setDefaultTimeout(12000);
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    async function health(){
      const probe=await context.newPage();
      try{
        const r=await probe.goto(base+'/api/health',{waitUntil:'domcontentloaded',timeout:12000});
        assert.equal(r.status(),200);
        const data=JSON.parse(await probe.locator('body').innerText());
        assert.equal(data.revision,revision,'Presenter public health');
      }finally{await probe.close();}
    }
    async function shot(name){
      await page.evaluate(()=>window.scrollTo(0,0));
      await page.waitForTimeout(200);
      await page.screenshot({path:path.join(output,name+'.png'),animations:'disabled'});
      console.log('Captured',name);
    }
    await health();
    const route='/curb/surveys/robertson-hall?present=1';
    const response=await page.goto(base+route,{waitUntil:'domcontentloaded'});
    assert.equal(response.status(),200);
    await page.getByRole('button',{name:'Full review',exact:true}).waitFor();
    await page.getByRole('heading',{name:/Surface breakup/i}).waitFor();
    const counts=page.locator('[aria-label="Finding review counts"]');
    await counts.getByText('0 accepted · 5 pending · 0 rejected',{exact:true}).waitFor();
    const original=page.getByRole('button',{name:'Original: footage without boxes',exact:true});
    const review=page.getByRole('button',{name:'Review: editable finding overlays',exact:true});
    assert.equal(await original.getAttribute('aria-pressed'),'true');
    const video=page.locator('video');
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForFunction(()=>document.querySelector('video')?.readyState>=2);
    await video.evaluate(async v=>{v.muted=true;await v.play()});
    await page.waitForFunction(()=>document.querySelector('video')?.currentTime>=0.65);
    await video.evaluate(v=>v.pause());
    assert.match(await page.locator('#survey-video-note').innerText(),/Plain footage, no boxes/);
    const originalSecond=await video.evaluate(v=>v.currentTime);
    await shot('original');

    await review.click();
    assert.equal(await review.getAttribute('aria-pressed'),'true');
    assert.match(await page.locator('#survey-video-note').innerText(),/in view right now/);
    await shot('review');
    await page.getByRole('button',{name:'Jump to evidence',exact:true}).click();
    await page.waitForFunction(()=>{const v=document.querySelector('video');return v&&!v.seeking&&Math.abs(v.currentTime-6)<0.02});
    const evidenceSecond=await video.evaluate(v=>v.currentTime);
    const crop=page.getByRole('img',{name:/Extracted source close-up of .*Surface breakup, frame 180/i});
    await crop.waitFor();
    await crop.evaluate(img=>img.decode());
    const cropUrl=new URL(await crop.getAttribute('src'),base);
    assert.equal(cropUrl.pathname,expectedCrop);
    const cropResponse=await page.evaluate(async url=>{
      const response=await fetch(url);
      const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',await response.arrayBuffer()));
      return {status:response.status,digest:Array.from(bytes,value=>value.toString(16).padStart(2,'0')).join('')};
    },cropUrl.href);
    assert.equal(cropResponse.status,200);
    assert.equal(cropResponse.digest,expectedCropSha,'approved frame 180 crop bytes');
    await page.getByText(/^Source frame 180 · 0:06/).waitFor();
    const selected=page.locator('[data-video-frame] [class*="boxSelected"]');
    await selected.waitFor({state:'visible'});
    assert.equal(await selected.evaluate(el=>el.style.borderStyle),'dashed');
    await shot('crop');

    // The real guarded decision stays in this isolated browser tab.
    const reviewer='Demo reviewer';
    await page.getByRole('textbox',{name:'Reviewer',exact:true}).fill(reviewer);
    await page.getByRole('button',{name:'Accept finding',exact:true}).click();
    await counts.getByText('1 accepted · 4 pending · 0 rejected',{exact:true}).waitFor();
    const acceptedLabel=(await page.locator('[aria-label="Selected finding review status"]').textContent()).replace(/\s+/g,' ').trim();
    assert.match(acceptedLabel,/^Accepted\s*·\s*Demo reviewer$/i);
    await page.getByText('Field measurements pending · Route impact unknown.',{exact:true}).waitFor();
    assert.equal(await selected.evaluate(el=>el.style.borderStyle),'solid');
    await shot('accepted');
    await health();
    assert.deepEqual(errors,[]);
    writeReceipt(output,{
      source:base,route,revision,acceptance,viewport,basis:'accepted deployed build',capturedAt:new Date().toISOString(),
      originalSecond,evidenceSecond,sourceFrame:180,cropPath:expectedCrop,cropSha256:expectedCropSha,
      reviewer,acceptedLabel,decision:'actual in-tab visual review',fieldImpact:'unknown',overlay:{pending:'dashed',accepted:'solid'},
      counts:(await counts.innerText()).trim(),fieldMeasurements:'pending',
    },names);
    console.log('Presenter captured and verified at',revision);
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
