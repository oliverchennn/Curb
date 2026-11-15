const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const sharp = require('sharp');
const {cut, timeline, subtitles, teleprompter, FPS} = require('./cut.cjs');
const {readActive,INVESTMENT_IMAGES,PRESENTER_IMAGES}=require('./capture-store.cjs');
const proof=require('../benchmark-proof.json');

const root = path.resolve(__dirname, '..');
const ffmpeg = process.env.CURB_DEMO_FFMPEG || 'ffmpeg';
const clip = path.join(root,'Curb-picture-edit.mp4');
const frameDir = path.join(root,'.render');
fs.mkdirSync(frameDir,{ recursive: true });
const nullDevice = process.platform === 'win32' ? 'NUL' : '/dev/null';
const paths = cut.map(shot=>path.join(root,'clips',shot.file));
const sampleTimes = [1.8,9,35,40,57,75,88,96,107,114.3];
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
  assert.equal(active.seconds,116,'cut and four-second headroom');
  assert.deepEqual(active.team,{start:0,end:7});
  assert.deepEqual(active.voice,{start:7,end:112});
  assert.equal(active.clips[0].file,'01-Team-camera-placeholder.mp4');
  assert.equal(active.clips[2].start,15);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,'timeline.json'),'utf8')),active);
  assert.equal(fs.readFileSync(path.join(root,'captions-draft.srt'),'utf8').replace(/\r\n/g,'\n'),subtitles());
  assert.equal(fs.readFileSync(path.join(root,'TELEPROMPTER.md'),'utf8').replace(/\r\n/g,'\n'),teleprompter());
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
  const plates = ['review-stage.png','compare-stage.png','omissions-stage.png','tie-stage.png'];
  for (const name of plates) {
    const shot = path.join(root,'overlays',name);
    const m = await sharp(shot).metadata();
    assert.equal(m.width,1920); assert.equal(m.height,1080); assert.equal(m.hasAlpha,true);
    const alpha = async (left,top) => (await sharp(shot).extract({left,top,width:1,height:1}).raw().toBuffer())[3];
    assert.equal(await alpha(300,300),0,name+' transparent capture opening');
    assert.equal(await alpha(1550,680),255,name+' opaque presenter rail');
  }
  const {receipt:presenter}=readActive(path.join(root,'source-captures/presenter'),PRESENTER_IMAGES);
  assert.ok(Number.isFinite(presenter.evidenceSecond) && Math.abs(presenter.evidenceSecond-6)<0.02,'actual frame-180 seek');
  assert.equal(presenter.sourceFrame,180);
  assert.equal(presenter.counts,'1 accepted · 4 pending · 0 rejected');
  assert.equal(presenter.fieldImpact,'unknown');
  assert.deepEqual(presenter.overlay,{pending:'dashed',accepted:'solid'});
  const {receipt:investment}=readActive(path.join(root,'source-captures/investment'),INVESTMENT_IMAGES);
  assert.match(investment.states.compare[0],/1 newly reachable destination.*Hall.*C \$10,000/);
  assert.match(investment.states.compare[1],/2 newly reachable destinations.*Library and Student center.*A \+ B \$10,000/);
  assert.match(investment.states['omit-a'],/without A.*0 newly reachable destinations/);
  assert.match(investment.states['omit-b'],/without B.*0 newly reachable destinations/);
  assert.ok(investment.states.tie.every(t=>/3 newly reachable destinations.*\$20,000 assumed spend/.test(t)));
  assert.match(investment.states.brief,/Synthetic scenario.*\$10,000.*Library and Student center/);
  assert.equal(proof.approved,true);
  assert.equal(proof.wins+proof.ties,proof.budgetCases);
  assert.equal(proof.networks*proof.budgetPercent.length,proof.budgetCases);
  assert.deepEqual([proof.wins,proof.ties],[58,62]);
  assert.match(subtitles(),/fifty-eight synthetic budget cases/);
  assert.match(subtitles(),/The other sixty-two tied/);

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
    + '<text x="34" y="90" fill="#4e6c59" font-family="Arial,sans-serif" font-size="17">Storyboard     /     1:56 picture edit     /     Full-screen team opening and separate voiceover</text>'
    + labels+'</svg>';
  await sharp({create:{width,height,channels:3,background:'#faf8ef'}}).composite([
    ...previews.map((input,i)=>({input,left:32+(i%3)*504,top:111+Math.floor(i/3)*308})),
    {input:Buffer.from(text),top:0,left:0},
  ]).jpeg({quality:90}).toFile(path.join(root,'Curb-storyboard.jpg'));
  fs.writeFileSync(path.join(root,'verification.json'),JSON.stringify({
    fullDecode:results, pictureAudio:'Silent by design', teamSlot:{frames:210,start:0,end:7,status:'Real team recording pending'},
    voiceover:{start:7,end:112}, captionsAndTeleprompter:'Match the cut manifest', transparentCapturePlates:plates,
    robertson:{revision:presenter.revision,evidenceSeekSeconds:6,frame:presenter.sourceFrame,
      counts:presenter.counts,fieldImpact:presenter.fieldImpact,overlay:presenter.overlay},
    investment:{revision:investment.revision,basis:investment.basis,at10000:[1,2],removeA:0,removeB:0,at20000:[3,3],brief:'Verified canonical recommendation'},
    proof:{ledger:proof.ledger,networks:proof.networks,cases:proof.budgetCases,wins:proof.wins,ties:proof.ties},
  },null,2)+'\n');
  console.log(JSON.stringify(results));
}

main().catch(e=>{console.error(e.stack);process.exitCode=1});
