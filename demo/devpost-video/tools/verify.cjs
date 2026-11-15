const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const sharp = require('sharp');
const {cut, timeline, subtitles, FPS} = require('./cut.cjs');

const root = path.resolve(__dirname, '..');
const ffmpeg = process.env.CURB_DEMO_FFMPEG || 'ffmpeg';
const clip = path.join(root,'Curb-picture-edit.mp4');
const frameDir = path.join(root,'.render');
fs.mkdirSync(frameDir,{ recursive: true });
const nullDevice = process.platform === 'win32' ? 'NUL' : '/dev/null';
const paths = cut.map(shot=>path.join(root,'clips',shot.file));
const sampleTimes = [1.8,9,22,40,57,75,88,96,107,114.3];
const stages = cut.map((shot,i)=>[sampleTimes[i],String(i+1).padStart(2,'0')+'  /  '+shot.title.toUpperCase()]);

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
  const active = timeline();
  assert.ok(active.seconds < 120,'cut must be below the video cap');
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,'timeline.json'),'utf8')),active);
  assert.equal(fs.readFileSync(path.join(root,'captions-draft.srt'),'utf8').replace(/\r\n/g,'\n'),subtitles());
  const expected = [...cut.map(shot=>Math.round(shot.seconds*FPS)),Math.round(active.seconds*FPS)];
  const results = [...paths,clip].map((file,index) => {
    const n = decodedFrames(file);
    assert.equal(n,expected[index],path.basename(file)+' total decoded frame count');
    return {file:path.basename(file),frames:n,durationSeconds:n/FPS};
  });
  const info=spawnSync(ffmpeg,['-hide_banner','-i',clip,'-t','0','-f','null',nullDevice],{encoding:'utf8',windowsHide:true});
  assert.equal(info.status,0,info.stderr);
  assert.match(info.stderr,/Stream .*Video:.*1920x1080.*30 fps/);
  assert.doesNotMatch(info.stderr,/Stream .*Audio:/,'the picture edit must be silent for the presenter track');
  const plates = ['review-stage.png','compare-stage.png','omissions-stage.png','tie-stage.png','proof-stage.png'];
  for (const name of plates) {
    const shot = path.join(root,'overlays',name);
    const m = await sharp(shot).metadata();
    assert.equal(m.width,1920); assert.equal(m.height,1080); assert.equal(m.hasAlpha,true);
    const alpha = async (left,top) => (await sharp(shot).extract({left,top,width:1,height:1}).raw().toBuffer())[3];
    assert.equal(await alpha(300,300),0,name+' transparent capture opening');
    assert.equal(await alpha(1550,680),255,name+' opaque presenter rail');
  }
  const receipt = JSON.parse(fs.readFileSync(path.join(root,'capture-receipt.json'),'utf8'));
  assert.equal(receipt.evidenceSecond,6,'actual evidence seek');
  const investment = JSON.parse(fs.readFileSync(path.join(root,'source-captures/investment/receipt.json'),'utf8'));
  assert.match(investment.states.compare[0],/1 newly reachable destination.*Hall.*C \$10,000/);
  assert.match(investment.states.compare[1],/2 newly reachable destinations.*Library and Student center.*A \+ B \$10,000/);
  assert.match(investment.states['omit-a'],/without A.*0 newly reachable destinations/);
  assert.match(investment.states['omit-b'],/without B.*0 newly reachable destinations/);
  assert.ok(investment.states.tie.every(t=>/3 newly reachable destinations.*\$20,000 assumed spend/.test(t)));
  assert.match(investment.states.brief,/Synthetic scenario.*\$10,000.*Library and Student center/);

  const previews = [];
  for (let i=0;i<stages.length;i++) {
    const [at] = stages[i];
    const raw = path.join(frameDir,'check-'+i+'.png');
    run(['-ss',String(at),'-i',clip,'-frames:v','1',raw]);
    previews.push(await sharp(raw).resize(488,274).toBuffer());
  }
  const width=1560, height=111+Math.ceil(stages.length/3)*308+6;
  const labels = stages.map(([,name],i) => '<text x="'+(32+(i%3)*504)+'" y="'+(406+Math.floor(i/3)*308)+'" fill="#355d4a" font-family="Consolas, monospace" font-weight="700" font-size="15" letter-spacing="1">'+name.replaceAll('&','&amp;')+'</text>').join('');
  const text = '<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'">'
    + '<text x="32" y="63" fill="#1b3024" font-family="Arial,sans-serif" font-size="43" font-weight="700">Curb · Devpost video</text>'
    + '<text x="34" y="90" fill="#4e6c59" font-family="Arial,sans-serif" font-size="17">Storyboard     /     1:56 picture edit     /     Presenter camera sits in the right rail</text>'
    + labels+'</svg>';
  await sharp({create:{width,height,channels:3,background:'#faf8ef'}}).composite([
    ...previews.map((input,i)=>({input,left:32+(i%3)*504,top:111+Math.floor(i/3)*308})),
    {input:Buffer.from(text),top:0,left:0},
  ]).jpeg({quality:90}).toFile(path.join(root,'Curb-storyboard.jpg'));
  fs.writeFileSync(path.join(root,'verification.json'),JSON.stringify({
    fullDecode:results, pictureAudio:'Silent by design', captions:'Match the cut manifest', transparentCapturePlates:plates,
    robertson:{evidenceSeekSeconds:6},
    investment:{revision:investment.revision,basis:investment.basis,at10000:[1,2],removeA:0,removeB:0,at20000:[3,3],brief:'Verified canonical recommendation'},
  },null,2)+'\n');
  console.log(JSON.stringify(results));
}

main().catch(e=>{console.error(e.stack);process.exitCode=1});
