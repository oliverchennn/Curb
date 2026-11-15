const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {cut,subtitles,timeline,HOOK_SOURCE}=require('./cut.cjs');
const M=require('./render.cjs');
const {home,media,temp,brand,rect,line,text,stack,icon,svg,mono,bold,encode,run,png,titleClip,concatenate,segment,cameraFrame,editXml}=M;
const preview = process.argv.includes('--preview');
const output = preview ? path.join(temp,'preview-kit') : home;
const clips = path.join(output,'clips');
const overlays = path.join(output,'overlays');
const captures = path.join(home,'source-captures/investment');
const captured = path.join(home,'captures/investment');
const sourceNames = ['compare','condition','exact','omit-a','omit-b','tie','brief'];
const whites = {heading:brand.pale, detail:'#d0dfcb',rule:'#5c7867'};
const seconds = timeline().seconds;
const byKey = Object.fromEntries(cut.map(x=>[x.key,x]));
for(const dir of [clips,overlays]) fs.mkdirSync(dir,{recursive:true});

function metadata(relocatable) {
  editXml(cut,{directory:clips,output:path.join(output,'Curb-edit.xml'),neutral:relocatable});
  fs.writeFileSync(path.join(output,'captions-draft.srt'),subtitles());
  fs.writeFileSync(path.join(output,'timeline.json'),JSON.stringify(timeline(),null,2)+'\n');
}
function checkCapture(dir) {
  const receipt=JSON.parse(fs.readFileSync(path.join(dir,'receipt.json'),'utf8'));
  assert.match(receipt.revision,/^[\da-f]{40}$/);
  assert.match(receipt.acceptance,/^https:\/\/github\.com\/oliverchennn\/Curb\/issues\/1#issuecomment-\d+$/);
  assert.match(receipt.basis,/^accepted (deployed build|merged build captured locally)$/);
  for(const name of sourceNames) assert.ok(fs.existsSync(path.join(dir,name+'.png')),'Missing '+name+' source');
  assert.match(receipt.states.compare[0],/1 newly reachable destination.*Hall.*C \$10,000/);
  assert.match(receipt.states.compare[1],/2 newly reachable destinations.*Library and Student center.*A \+ B \$10,000/);
  for(const key of ['omit-a','omit-b']) assert.match(receipt.states[key],/0 newly reachable destinations/);
  for(const row of receipt.states.tie) assert.match(row,/3 newly reachable destinations.*\$20,000 assumed spend/);
  assert.match(receipt.states.brief,/Synthetic scenario.*\$10,000.*Library and Student center/i);
  return receipt;
}
function importCapture() {
  const receipt = checkCapture(captured);
  fs.mkdirSync(captures,{recursive:true});
  for(const file of ['receipt.json',...sourceNames.map(x=>x+'.png')])
    fs.copyFileSync(path.join(captured,file),path.join(captures,file));
  console.log('Imported complete accepted capture at',receipt.revision);
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
  compare:['SHARED BUDGET',['$10,000'],['Condition-first: 1','Curb: 2 new destinations']],
  omissions:['TEST THE PAIR',['A and B','work together'],['Omit A: 0 new','Omit B: 0 new']],
  tie:['SHARED BUDGET',['$20,000'],['Both plans: 3 new','Both spend $20,000']],
  proof:['DECISION BRIEF',['Review','the plan'],['Assumed costs','Site checks still needed']],
};
function plate(key) {
  const [label,headline,notes]=cases[key];
  return svg(rect(0,0,1920,1080,brand.paper,'mask="url(#stage)"')
    +shell('SYNTHETIC CAMPUS')+right(label,headline,notes)
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
function placeholder(key){
  return panel('EDIT PREVIEW',['SHOT RESERVED',['App capture','pending'],['Use accepted source','before final export']],
    text('SYNTHETIC CAMPUS',122,320,24,brand.light,mono)
    +text(cases[key][0],115,540,92,whites.heading,bold)
    +text('Placeholder for the accepted Investment screen.',123,720,38,whites.detail));
}
async function still(image,shot) {
  const file=path.join(temp,'refresh-'+shot.key+'.png');
  await png(image,file);
  run(['-loop','1','-framerate','30','-i',file,'-t',String(shot.seconds),...encode,path.join(clips,shot.file)]);
}
async function appShot(shot,takes) {
  const overlay=path.join(overlays,shot.key+'-stage.png');
  await png(plate(shot.key),overlay);
  const parts=takes.map(([name,duration],i)=>{
    const file=path.join(temp,'refresh-'+shot.key+'-'+i+'.mp4');
    segment(['-loop','1','-framerate','30','-i',path.join(captures,name+'.png')],overlay,duration,file);
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
    importCapture();
    return;
  }
  if(process.argv.includes('--titles')){
    await titleClip(byKey.intro.file,byKey.intro.seconds,false,clips);
    await titleClip(byKey.outro.file,byKey.outro.seconds,true,clips);
    return;
  }
  if(process.argv.includes('--assemble-only')){
    assert.ok(!preview,'Only a complete source cut can be reassembled');
    checkCapture(captures);
    console.log('Assembled',assemble());
    return;
  }
  const receipt=preview ? null : checkCapture(captures);
  if(preview) fs.copyFileSync(path.join(M.clips,byKey.review.file),path.join(clips,byKey.review.file));
  assert.ok(fs.existsSync(path.join(clips,byKey.review.file)),'Keep the accepted Robertson chapter, or replace it with reviewed same-length footage');
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
    compare:[['compare',4],['condition',6],['exact',13]],
    omissions:[['omit-a',6],['exact',2],['omit-b',8]],
    tie:[['tie',11]], proof:[['brief',8]],
  };
  for(const [key,takes] of Object.entries(sequences)){
    assert.equal(takes.reduce((n,[,duration])=>n+duration,0),byKey[key].seconds,key+' shot timing');
    if(receipt) await appShot(byKey[key],takes);
    else await still(placeholder(key),byKey[key]);
  }
  await still(buyerGraphic(),byKey.buyer);
  const master=assemble();
  fs.writeFileSync(path.join(output,'picture-sources.json'),JSON.stringify({
    version:'Investment refresh',durationSeconds:seconds,fps:30,
    statistic:{value:'12.2%',population:'U.S. adults',year:2022,source:HOOK_SOURCE},
    robertson:{footage:'public/curb/surveys/robertson-hall/survey.mp4',review:'Accepted PR23 evidence chapter, Defect 04 at 6 seconds',
      receipt:'capture-receipt.json',replacement:'Compact survey presenter capture and narration awaiting separate accepted release'},
    investment:receipt?{revision:receipt.revision,basis:receipt.basis,acceptance:receipt.acceptance,source:receipt.source,
      receipt:'source-captures/investment/receipt.json'}:{status:'Editing placeholder pending capture'},
    proof:{window:[92,100],content:receipt?'Actual printable synthetic decision brief':'Editing placeholder',benchmark:'Awaiting accepted metrics; no benchmark in this cut'},
    audio:'Silent picture edit with draft narration and captions. Presenter audio recorded separately.',
  },null,2)+'\n');
  console.log('Rendered',master);
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
