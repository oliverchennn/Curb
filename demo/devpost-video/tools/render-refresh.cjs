const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {cut,subtitles,timeline,HOOK_SOURCE}=require('./cut.cjs');
const {readActive,activateCapture,INVESTMENT_IMAGES,PRESENTER_IMAGES}=require('./capture-store.cjs');
const M=require('./render.cjs');
const {home,media,temp,brand,rect,line,text,stack,icon,svg,mono,bold,encode,run,png,titleClip,concatenate,segment,cameraFrame,editXml}=M;
const preview = process.argv.includes('--preview');
const output = preview ? path.join(temp,'preview-kit') : home;
const clips = path.join(output,'clips');
const overlays = path.join(output,'overlays');
const investmentRoot = path.join(home,'source-captures/investment');
const presenterRoot = path.join(home,'source-captures/presenter');
const whites = {heading:brand.pale, detail:'#d0dfcb',rule:'#5c7867'};
const seconds = timeline().seconds;
const byKey = Object.fromEntries(cut.map(x=>[x.key,x]));
for(const dir of [clips,overlays]) fs.mkdirSync(dir,{recursive:true});

function metadata(relocatable) {
  editXml(cut,{directory:clips,output:path.join(output,'Curb-edit.xml'),neutral:relocatable});
  fs.writeFileSync(path.join(output,'captions-draft.srt'),subtitles());
  fs.writeFileSync(path.join(output,'timeline.json'),JSON.stringify(timeline(),null,2)+'\n');
}
function checkInvestment(receipt) {
  assert.match(receipt.revision,/^[\da-f]{40}$/);
  assert.match(receipt.acceptance,/^https:\/\/github\.com\/oliverchennn\/Curb\/issues\/1#issuecomment-\d+$/);
  assert.match(receipt.basis,/^accepted (deployed build|merged build captured locally)$/);
  assert.match(receipt.states.compare[0],/1 newly reachable destination.*Hall.*C \$10,000/);
  assert.match(receipt.states.compare[1],/2 newly reachable destinations.*Library and Student center.*A \+ B \$10,000/);
  for(const key of ['omit-a','omit-b']) assert.match(receipt.states[key],/0 newly reachable destinations/);
  for(const row of receipt.states.tie) assert.match(row,/3 newly reachable destinations.*\$20,000 assumed spend/);
  assert.match(receipt.states.brief,/Synthetic scenario.*\$10,000.*Library and Student center/i);
}
function checkPresenter(receipt) {
  assert.match(receipt.revision,/^[a-f0-9]{40}$/);
  assert.match(receipt.acceptance,/^https:\/\/github\.com\/oliverchennn\/Curb\/issues\/1#issuecomment-\d+$/);
  assert.equal(receipt.sourceFrame,180);
  assert.ok(Number.isFinite(receipt.evidenceSecond) && Math.abs(receipt.evidenceSecond-6)<0.02,'frame-180 video seek');
  assert.equal(receipt.counts,'1 accepted · 4 pending · 0 rejected');
  assert.equal(receipt.fieldImpact,'unknown');
  assert.deepEqual(receipt.overlay,{pending:'dashed',accepted:'solid'});
  assert.match(receipt.cropSha256,/^[a-f0-9]{64}$/);
}
function importCapture(presenter) {
  const name=presenter?'presenter':'investment';
  const active=activateCapture(path.join(home,'captures',name),
    presenter?presenterRoot:investmentRoot,
    presenter?PRESENTER_IMAGES:INVESTMENT_IMAGES,
    presenter?checkPresenter:checkInvestment);
  console.log('Activated a verified '+name+' capture at',active.receipt.revision);
}
function readProof() {
  const proof=JSON.parse(fs.readFileSync(path.join(home,'benchmark-proof.json'),'utf8'));
  assert.equal(proof.approved,true);
  assert.equal(proof.evidenceClass,'independently_audited_synthetic_benchmark');
  assert.equal(proof.comparator,'condition-first');
  assert.equal(proof.claimId,'synthetic-mean-conditionFirst');
  assert.match(proof.sourceRevision,/^[a-f0-9]{40}$/);
  assert.match(proof.ledgerRevision,/^[a-f0-9]{40}$/);
  assert.equal(proof.ledger,'https://github.com/oliverchennn/Curb/blob/'+proof.ledgerRevision+'/docs/evaluation/METRICS_CLAIMS.md');
  assert.deepEqual(proof.budgetPercent,[25,50,75,100]);
  assert.equal(proof.budgetCases,proof.networks*proof.budgetPercent.length);
  assert.equal(proof.budgetCases,proof.wins+proof.ties);
  assert.equal(proof.caption,proof.networks+' authored synthetic networks / '+proof.budgetCases+
    ' budget cases / '+proof.wins+' wins and '+proof.ties+' ties versus condition-first.');
  return proof;
}
function activeSources() {
  const investment=readActive(investmentRoot,INVESTMENT_IMAGES);
  const presenter=readActive(presenterRoot,PRESENTER_IMAGES);
  checkInvestment(investment.receipt);
  checkPresenter(presenter.receipt);
  return {investment,presenter,proof:readProof()};
}
function shell(phase) {
  return icon(44,42,.68)+text('Curb',103,79,37,brand.ink,bold)
    + text(phase,1539,78,20,brand.green,mono)
    + line(44,109,1870,109,brand.line,2)
    + line(1518,140,1518,959,brand.line,2);
}
const mask = '<mask id="stage"><rect width="1920" height="1080" fill="white"/><rect x="44" y="140" width="1456" height="819" fill="black" rx="12"/></mask>';
function right(label,headline,notes) {
  return text(label,1544,213,21,brand.green,mono)
    + stack(headline,1541,304,56,65,brand.ink,bold)
    + line(1544,413,1865,413,brand.line,2)
    + stack(notes,1544,470,24,38,brand.green);
}
const cases = {
  review:['SOURCE FOOTAGE',['Visual','review'],['Surface breakup / 0:06','Route impact unknown']],
  compare:['SHARED BUDGET',['$10,000'],['Condition-first: 1','Curb: 2 new destinations']],
  omissions:['TEST THE PAIR',['A and B','work together'],['Omit A: 0 new','Omit B: 0 new']],
  tie:['SHARED BUDGET',['$20,000'],['Both plans: 3 new','Both spend $20,000']],
};
function plate(key) {
  const [label,headline,notes]=cases[key];
  return svg(rect(0,0,1920,1080,brand.paper,'mask="url(#stage)"')
    +shell(key==='review'?'ROBERTSON HALL PILOT':'SYNTHETIC CAMPUS')+right(label,headline,notes)
    +rect(43,139,1458,821,'none','rx="13" stroke="'+brand.line+'" stroke-width="2"'),mask);
}
function panel(phase,rightText,contents) {
  return svg(rect(0,0,1920,1080,brand.paper)+shell(phase)+right(...rightText)
    +rect(44,140,1456,819,brand.dark,'rx="12"')+contents);
}
function fieldGraphic() {
  return panel('ROBERTSON HALL PILOT',['REAL FOOTAGE',['Robertson','Hall'],['Princeton University','Actual phone video']],
    text('CAMPUS FACILITIES',112,274,24,brand.light,mono)
    +stack(['What should we','repair first?'],108,395,82,89,whites.heading,bold)
    +text('12.2%',108,655,125,brand.light,bold)
    +stack(['of U.S. adults reported serious difficulty','walking or climbing stairs.'],115,720,34,44,whites.heading)
    +line(113,815,886,815,whites.rule,2)+text('CDC  /  2022 BRFSS',113,861,23,brand.light,mono));
}
function transitionGraphic(){
  return panel('SYNTHETIC CAMPUS',['BUDGET TEST',['Separate','campus'],['Modeled connections','Assumed repair costs']],
    text('FROM EVIDENCE TO A FUNDING DECISION',120,302,24,brand.light,mono)
    +stack(['A separate','simulated campus.'],112,490,112,122,whites.heading,bold)
    +text('We compare two plans on the same modeled network.',120,758,34,whites.detail));
}
function buyerGraphic(){
  return panel('PILOT VALIDATION',['NEXT STEP',['Campus','facilities'],['With disabled users','and accessibility staff']],
    text('BEFORE FUNDING REAL WORK',118,304,24,brand.light,mono)
    +stack(['Walk the crossings.','Measure the barriers.','Price the work.'],112,463,83,109,whites.heading,bold)
    +text('Validate routes and costs with the people who use and maintain them.',120,820,30,whites.detail));
}
function benchmarkGraphic(proof) {
  return panel('SYNTHETIC BENCHMARK',['AUDITED SUITE',['Synthetic','benchmark'],['Versus condition-first','Same assumed budgets']],
    text(proof.networks+' AUTHORED SYNTHETIC NETWORKS  /  '+proof.budgetCases+' BUDGET CASES',112,281,26,brand.light,mono)
    +text(String(proof.wins),106,559,164,whites.heading,bold)
    +text('wins',115,644,56,brand.light,bold)
    +line(596,390,596,662,whites.rule,2)
    +text(String(proof.ties),670,559,164,whites.heading,bold)
    +text('ties',680,644,56,brand.light,bold)
    +text('A win means more newly reachable destinations at the same budget.',112,772,31,whites.detail)
    +text('All four budget levels included, through 100%.',112,826,28,whites.detail));
}
function placeholder(key){
  return panel('EDIT PREVIEW',['SHOT RESERVED',['Evidence','pending'],['Use the accepted source','before final export']],
    text('SOURCE VERIFICATION',122,320,24,brand.light,mono)
    +text(cases[key]?.[0] ?? 'AUDITED BENCHMARK',115,540,78,whites.heading,bold)
    +text('Placeholder for the accepted source.',123,720,38,whites.detail));
}
async function still(image,shot) {
  const file=path.join(temp,'refresh-'+shot.key+'.png');
  await png(image,file);
  run(['-loop','1','-framerate','30','-i',file,'-t',String(shot.seconds),...encode,path.join(clips,shot.file)]);
}
async function appShot(shot,takes,source) {
  const overlay=path.join(overlays,shot.key+'-stage.png');
  await png(plate(shot.key),overlay);
  const parts=takes.map(([name,duration],i)=>{
    const file=path.join(temp,'refresh-'+shot.key+'-'+i+'.mp4');
    segment(['-loop','1','-framerate','30','-i',path.join(source,name+'.png')],overlay,duration,file);
    return file;
  });
  concatenate(parts,path.join(clips,shot.file));
  console.log('Rendered',shot.key);
}
function assemble(){
  const master=path.join(output,preview?'Curb-structure-preview.mp4':'Curb-picture-edit.mp4');
  concatenate(cut.map(x=>path.join(clips,x.file)),master);
  metadata(!preview);
  return master;
}
async function main(){
  if(process.argv.includes('--metadata-only')){
    metadata(!process.argv.includes('--timeline-only'));
    return;
  }
  if(process.argv.includes('--timeline-only')){
    metadata(false);
    console.log('Relinked '+cut.length+' clips');
    return;
  }
  if(process.argv.includes('--import-capture')){
    importCapture(false);
    return;
  }
  if(process.argv.includes('--import-presenter')){
    importCapture(true);
    return;
  }
  if(process.argv.includes('--titles')){
    await titleClip(byKey.intro.file,byKey.intro.seconds,false,clips);
    await titleClip(byKey.outro.file,byKey.outro.seconds,true,clips);
    return;
  }
  if(process.argv.includes('--assemble-only')){
    assert.ok(!preview,'Only a complete source cut can be reassembled');
    activeSources();
    console.log('Assembled',assemble());
    return;
  }
  const sources=preview ? null : activeSources();
  for(const key of ['intro','outro']){
    const file=path.join(clips,byKey[key].file);
    if(!fs.existsSync(file)) {
      if(key==='intro' && preview) fs.copyFileSync(path.join(M.clips,byKey[key].file),file);
      else await titleClip(byKey[key].file,byKey[key].seconds,key==='outro',clips);
    }
  }
  await png(cameraFrame(),path.join(overlays,'camera-frame-optional.png'));
  const field=path.join(temp,'refresh-field.png');
  await png(fieldGraphic(),field);
  run(['-i',path.join(media,'survey.mp4'),'-loop','1','-framerate','30','-i',field,'-t',String(byKey.field.seconds),
    '-filter_complex','[0:v]fps=30,scale=-2:788,setsar=1[phone];[1:v][phone]overlay=991:155:shortest=1,format=yuv420p[v]',
    '-map','[v]',...encode,path.join(clips,byKey.field.file)]);
  await still(transitionGraphic(),byKey.transition);
  const sequences = {
    review:[['original',4.7],['review',4.1],['crop',6.7],['accepted',7.5]],
    compare:[['compare',4],['condition',6],['exact',13]],
    omissions:[['omit-a',6],['exact',2],['omit-b',8]],
    tie:[['tie',11]],
  };
  for(const [key,takes] of Object.entries(sequences)){
    assert.equal(Math.round(takes.reduce((n,[,duration])=>n+duration,0)*30),Math.round(byKey[key].seconds*30),key+' shot timing');
    if(sources) await appShot(byKey[key],takes,(key==='review'?sources.presenter:sources.investment).directory);
    else await still(placeholder(key),byKey[key]);
  }
  await still(sources?benchmarkGraphic(sources.proof):placeholder('proof'),byKey.proof);
  await still(buyerGraphic(),byKey.buyer);
  const master=assemble();
  fs.writeFileSync(path.join(output,'picture-sources.json'),JSON.stringify({
    version:'Presenter and audited benchmark refresh',durationSeconds:seconds,fps:30,
    statistic:{value:'12.2%',population:'U.S. adults',year:2022,source:HOOK_SOURCE},
    robertson:{footage:'public/curb/surveys/robertson-hall/survey.mp4',
      ...(sources?describe(sources.presenter):{review:'Editing placeholder pending accepted capture'})},
    investment:sources?describe(sources.investment):{status:'Editing placeholder pending capture'},
    proof:sources?{window:[92,100],claim:'benchmark-proof.json',ledger:sources.proof.ledger}
      :{window:[92,100],content:'Editing placeholder'},
    audio:'Silent picture edit with draft narration and captions. Presenter audio recorded separately.',
  },null,2)+'\n');
  console.log('Rendered',master);
}
function describe(snapshot) {
  const {revision,basis,acceptance,source}=snapshot.receipt;
  return {revision,basis,acceptance,source,
    receipt:path.relative(home,path.join(snapshot.directory,'receipt.json')).replaceAll('\\','/')};
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
