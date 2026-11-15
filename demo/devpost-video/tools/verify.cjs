const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const ffmpeg = process.env.CURB_DEMO_FFMPEG || 'ffmpeg';
const clip = path.join(root,'Curb-picture-edit.mp4');
const frameDir = path.join(root,'.render');
fs.mkdirSync(frameDir,{ recursive: true });
const nullDevice = process.platform === 'win32' ? 'NUL' : '/dev/null';
const paths = fs.readdirSync(path.join(root,'clips')).filter(n=>n.endsWith('.mp4')).sort().map(n=>path.join(root,'clips',n));
const stages = [
  [1.8,'01  /  ANIMATED INTRO'],[9,'02  /  FIELD FOOTAGE'],[22,'03  /  REVIEW FINDING'],
  [53,'04  /  COMPARE REPAIRS'],[86,'05  /  EXPORTED REPORT'],[97.3,'06  /  ANIMATED OUTRO'],
];

function run(args) {
  const input = args.map(x=>/^[a-z]:\\/i.test(x)?x.replaceAll('\\','/'):x);
  const task = spawnSync(ffmpeg,['-hide_banner','-y','-v','error',...input],
    {encoding:'utf8',windowsHide:true,maxBuffer:6000000});
  assert.equal(task.status,0,task.error?.message ?? task.stderr);
  return task.stdout;
}
function decodedFrames(file) {
  const progress = run(['-progress','pipe:1','-nostats','-threads','4','-i',file,'-map','0:v:0','-f','null',nullDevice]);
  return Number([...progress.matchAll(/^frame=(\d+)\s*$/gm)].at(-1)?.[1]);
}

async function main() {
  assert.equal(paths.length,6,'six numbered clips');
  const expected = [96,354,690,900,810,120,2970];
  const results = [...paths,clip].map((file,index) => {
    const n = decodedFrames(file);
    assert.equal(n,expected[index],path.basename(file)+' total decoded frame count');
    return {file:path.basename(file),frames:n,durationSeconds:n/30};
  });
  const plates = ['review-stage.png','budget-stage.png','report-stage.png'];
  for (const name of plates) {
    const shot = path.join(root,'overlays',name);
    const m = await sharp(shot).metadata();
    assert.equal(m.width,1920); assert.equal(m.height,1080); assert.equal(m.hasAlpha,true);
    const alpha = async (left,top) => (await sharp(shot).extract({left,top,width:1,height:1}).raw().toBuffer())[3];
    assert.equal(await alpha(300,300),0,name+' transparent capture opening');
    assert.equal(await alpha(1550,680),255,name+' opaque presenter rail');
  }
  const captured = path.join(root,'captures/capture.json');
  const receipt = JSON.parse(fs.readFileSync(fs.existsSync(captured) ? captured : path.join(root,'capture-receipt.json'),'utf8'));
  assert.equal(receipt.evidenceSecond,6,'actual evidence seek');
  assert.ok(receipt.budgetScreen.some(x=>x.includes('$500.00')));
  assert.ok(receipt.reportScreen.some(x=>x.includes('Supplied budget $500.00')));
  assert.ok(receipt.reportScreen.some(x=>x.includes('$72.00 to $478.00')));

  const previews = [];
  for (let i=0;i<stages.length;i++) {
    const [at] = stages[i];
    const raw = path.join(frameDir,'check-'+i+'.png');
    run(['-ss',String(at),'-i',clip,'-frames:v','1',raw]);
    previews.push(await sharp(raw).resize(488,274).toBuffer());
  }
  const width=1560, height=724;
  const labels = stages.map(([,name],i) => '<text x="'+(32+(i%3)*504)+'" y="'+(406+Math.floor(i/3)*308)+'" fill="#355d4a" font-family="Consolas, monospace" font-weight="700" font-size="15" letter-spacing="1">'+name+'</text>').join('');
  const text = '<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'">'
    + '<text x="32" y="63" fill="#1b3024" font-family="Arial,sans-serif" font-size="43" font-weight="700">Curb · Devpost video</text>'
    + '<text x="34" y="90" fill="#4e6c59" font-family="Arial,sans-serif" font-size="17">Storyboard     /     1:39 picture edit     /     Presenter camera sits in the right rail</text>'
    + labels+'</svg>';
  await sharp({create:{width,height,channels:3,background:'#faf8ef'}}).composite([
    ...previews.map((input,i)=>({input,left:32+(i%3)*504,top:111+Math.floor(i/3)*308})),
    {input:Buffer.from(text),top:0,left:0},
  ]).jpeg({quality:90}).toFile(path.join(root,'Curb-storyboard.jpg'));
  fs.writeFileSync(path.join(root,'verification.json'),JSON.stringify({
    fullDecode: results, transparentCapturePlates: plates, report:
      {budget:500, evidenceSeekSeconds:6, pricedSubtotal:[72,478], setupQuotePending:true},
  },null,2)+'\n');
  console.log(JSON.stringify(results));
}

main().catch(e=>{console.error(e.stack);process.exitCode=1});
