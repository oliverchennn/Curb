const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { once } = require('node:events');
const { pathToFileURL } = require('node:url');
const sharp = require('sharp');

const home = path.resolve(__dirname, '..');
const worktree = path.resolve(home, '../..');
const media = path.join(worktree, 'public/curb/surveys/robertson-hall');
const ffmpeg = process.env.CURB_DEMO_FFMPEG || 'ffmpeg';
const clips = path.join(home, 'clips');
const overlays = path.join(home, 'overlays');
const captures = path.join(home, 'captures');
const temp = path.join(home, '.render');
for (const dir of [clips, overlays, temp]) fs.mkdirSync(dir, { recursive: true });

const W = 1920;
const H = 1080;
const FPS = 30;
const brand = {
  pale: '#faf8ef', paper: '#f5f2e7', dark: '#1b3024', ink: '#15271e',
  light: '#dbe9b2', green: '#355d4a', mid: '#617269', line: '#c9d0bf',
};
const durations = [3.2, 11.8, 23, 30, 27, 4];
const names = [
  '01-Curb-intro.mp4', '02-Robertson-footage.mp4', '03-Review-finding.mp4',
  '04-Compare-budget.mp4', '05-Export-report.mp4', '06-Curb-outro.mp4',
];
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const rect = (x,y,w,h,fill,extra='') => '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+fill+'" '+extra+'/>';
const circle = (x,y,r,fill,extra='') => '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+fill+'" '+extra+'/>';
const line = (x,y,x2,y2,stroke,width=1) => '<line x1="'+x+'" y1="'+y+'" x2="'+x2+'" y2="'+y2+'" stroke="'+stroke+'" stroke-width="'+width+'"/>';
function text(value,x,y,size,color, opts={}) {
  const face = opts.mono ? 'Consolas, monospace' : 'Arial, sans-serif';
  return '<text x="'+x+'" y="'+y+'" font-family="'+face+'" font-size="'+size+'" font-weight="'+(opts.weight || 400)+'" fill="'+color+'" letter-spacing="'+(opts.spacing || 0)+'">'+esc(value)+'</text>';
}
function stack(lines,x,y,size,step,color,opts) {
  return lines.map((value,i) => text(value,x,y+i*step,size,color,opts)).join('');
}
function icon(x,y,scale=1,inverse=false) {
  return '<g transform="translate('+x+' '+y+') scale('+scale+')">'
    + rect(0,0,64,64,inverse?brand.light:brand.dark,'rx="14"')
    + '<path d="M43 23a15 15 0 1 0 0 18" fill="none" stroke="'+(inverse?brand.dark:brand.pale)+'" stroke-width="8" stroke-linecap="round"/></g>';
}
function svg(body,defs='') {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><defs>'+defs+'</defs>'+body+'</svg>';
}
const mono = {mono:true, weight:700, spacing:2};
const bold = {weight:700, spacing:-1.2};
const ease = x => 1 - Math.pow(1 - Math.max(0, Math.min(1,x)), 3);
const motion = (body,amount,travel=24) => '<g opacity="'+amount.toFixed(3)+'" transform="translate(0 '+((1-amount)*travel).toFixed(2)+')">'+body+'</g>';

function titleFrame(t, end) {
  const bg = end ? brand.dark : brand.pale;
  const fg = end ? brand.pale : brand.dark;
  const sub = end ? '#d6e2c9' : '#3f5b4d';
  const gridColor = end ? '#3a5044' : '#d5dac9';
  const box = end ? '#233b2e' :'#edf0de';
  const accent = end ? '#dceca9' : '#3b6953';
  const plot = {x:1094,y:201,width:674,height:647};
  let grid = '';
  for (let x=plot.x+37; x<plot.x+plot.width; x+=40)
    for(let y=plot.y+41; y<plot.y+plot.height; y+=40) grid += circle(x,y,1.7,gridColor);
  const route = 'M 1175 687 H 1303 Q 1321 687 1321 669 V 571 Q 1321 551 1341 551 H 1504 Q 1523 551 1523 531 V 416 Q 1523 394 1545 394 H 1686';
  const progress = ease((t-0.15)/1.55);
  const dotSet = [[1175,687,'Evidence',1140,746],[1430,551,'Budget',1379,510],[1686,394,'Repair plan',1557,339]];
  const dots = dotSet.map(([x,y,n,tx,ty],i) =>
    motion(circle(x,y,18,bg,'stroke="'+accent+'" stroke-width="4"')+circle(x,y,7,accent)+text(n,tx,ty,24,fg,bold),
      ease((t-[0.23,0.63,1.03][i])/0.35),9)).join('');
  const dash = 'fill="none" pathLength="1" stroke-linejoin="round" stroke-linecap="round"';
  const footer = text('HACKPRINCETON  /  2026',144,956,21,sub,mono)
    + text('ROBERTSON HALL PILOT',1490,956,20,sub,mono);
  const key = end ? ['A repair plan', 'facilities can review.'] : ['From sidewalk evidence', 'to a repair plan.'];
  const logoRow = icon(144,173,1.15,end) + text('Curb',240,231,61,fg,bold);
  const heading = stack(key,144,end ? 462:445,end?96:77,end?102:92,fg,bold);
  const tagline = text(end ? 'curb-taupe.vercel.app' : 'CAMPUS ACCESSIBILITY  /  FACILITIES PLANNING',
    149,end?727:701,end?34:23,sub,end?bold:mono);
  return svg(rect(0,0,W,H,bg)
    + line(144,112,1768,112,gridColor,2)+line(144,902,1768,902,gridColor,2)
    + motion(logoRow,ease(t/.43),16)
    + motion(heading,ease((t-.12)/.52),35)
    + motion(tagline,ease((t-.42)/.55),26)
    + motion(footer,ease((t-.52)/.55),10)
    + rect(plot.x,plot.y,plot.width,plot.height,box,'rx="29" stroke="'+gridColor+'" stroke-width="2"')
    + grid
    + '<path d="'+route+'" '+dash+' stroke="'+gridColor+'" stroke-width="9"/>'
    + '<path d="'+route+'" '+dash+' stroke="'+accent+'" stroke-width="9" stroke-dasharray="'+progress.toFixed(6)+' 1"/>'
    + dots);
}

function chapterPlate(k, fillStage=false) {
  const chapters = {
    field:   ['THE PILOT', ['Robertson', 'Hall'], ['Actual phone footage', 'Princeton University']],
    review:  ['REVIEW FINDINGS', ['Check the','evidence'], ['AI-assisted findings', 'Site measurements pending']],
    budget:  ['COMPARE REPAIRS', ['Plan for','$500'], ['Proposed work', 'Deferred items and quotes']],
    report:  ['EXPORT REPORT', ['Hand off','the plan'], ['Selected scope', 'Evidence and inspection needs']],
  };
  const [eyebrow, heading, extra] = chapters[k];
  const stageMask = '<mask id="stage"><rect width="1920" height="1080" fill="white"/><rect x="44" y="140" width="1456" height="819" fill="black" rx="12"/></mask>';
  const base = rect(0,0,W,H,brand.paper,fillStage?'':'mask="url(#stage)"');
  const header = icon(44,42,.68)+text('Curb',103,79,37,brand.ink,bold)
    + text('ROBERTSON HALL PILOT',1539,78,20,brand.green,mono)
    + line(44,109,1870,109,brand.line,2);
  const divider = line(1518,140,1518,959,brand.line,2);
  const chapter = text(eyebrow,1544,213,21,brand.green,mono)
    + stack(heading,1541,312,63,68,brand.ink,bold)
    + line(1544,423,1865,423,brand.line,2)
    + stack(extra,1544,472,24,40,brand.green);
  const stage = fillStage
    ? rect(44,140,1456,819,brand.dark,'rx="12"')
      + text('CAMPUS FACILITIES',111,276,25,brand.light,mono)
      + stack(['A sidewalk', 'in need of repair.'],108,458,87,104,brand.pale,bold)
      + text('Robertson Hall, Princeton University',113,740,31,'#d0dfcb')
      + line(113,809,790,809,'#557062',2)
      + text('FIELD FOOTAGE',113,864,20,brand.light,mono)
    : rect(43,139,1458,821,'none','rx="13" stroke="'+brand.line+'" stroke-width="2"');
  return svg(base+header+divider+chapter+stage,stageMask);
}
function cameraFrame() {
  return svg(rect(1539,717,330,190,'none','rx="13" stroke="'+brand.dark+'" stroke-width="3"')
    + line(1544,922,1686,922,brand.green,2)
    + text('PRESENTER',1544,950,18,brand.green,mono));
}

const quiet = ['-hide_banner','-loglevel','error','-y','-filter_threads','2','-filter_complex_threads','2'];
const encode = ['-an','-c:v','libx264','-threads','5','-preset','veryfast','-crf','18',
  '-pix_fmt','yuv420p','-profile:v','high','-r','30','-movflags','+faststart'];
function run(args) {
  const normalized = args.map(value => /^[a-z]:\\/i.test(value) ? value.replaceAll('\\','/') : value);
  const res = spawnSync(ffmpeg,[...quiet,...normalized],{encoding:'utf8',windowsHide:true,maxBuffer:3_000_000});
  if (res.status !== 0) throw Error((res.error?.message || res.stderr || 'FFmpeg exited '+res.status)+'\n'+args.join(' '));
}
function png(svgText, filename) {
  return sharp(Buffer.from(svgText)).png().toFile(filename);
}
async function titleClip(name,seconds,end) {
  const proc = spawn(ffmpeg,[...quiet,'-f','image2pipe','-framerate','30','-vcodec','png','-i','pipe:0',
    ...encode,path.join(clips,name)],{stdio:['pipe','ignore','pipe'],windowsHide:true});
  let err='';
  proc.stderr.on('data', b => err+=b);
  const status = once(proc,'close');
  for(let i=0; i<Math.round(seconds*FPS); i++){
    const still=await sharp(Buffer.from(titleFrame(i/FPS,end))).png({compressionLevel:1}).toBuffer();
    if (!proc.stdin.write(still)) await once(proc.stdin,'drain');
  }
  proc.stdin.end();
  if ((await status)[0] !== 0) throw Error(err);
  console.log('Rendered',name);
}

function concatenate(inputs, output) {
  const list=path.join(temp,path.basename(output)+'.ffconcat');
  fs.writeFileSync(list,'ffconcat version 1.0\n'+inputs.map(filename =>
    "file '"+path.relative(temp,filename).replaceAll('\\','/').replaceAll("'", "'\\''")+"'").join('\n')+'\n');
  run(['-f','concat','-safe','0','-i',list,'-c','copy','-movflags','+faststart',output]);
}
function exists(directory,name) {
  const filename=path.join(directory,name);
  return fs.existsSync(filename) ? filename : null;
}
function fallback(name, second) {
  const filename = path.join(temp,'backup-'+name+'.png');
  run(['-ss',String(second),'-i',path.join(media,'demo-backup.mp4'),'-frames:v','1',filename]);
  return filename;
}
const oldFrames = {finding:36,inspection:48,plans:59,budget:72,deferred:77,export:87,report:115,'report-detail':118};
const used = {};
function source(name) {
  let filename=exists(captures,name+'.png');
  if (filename) { used[name]='Current hosted app capture'; return filename; }
  filename=fallback(name,oldFrames[name]);
  used[name]='Prior verified walkthrough, time '+oldFrames[name]+'s';
  return filename;
}
function segment(mediaArgs,plate,duration,output) {
  const composition=[
    '[0:v]fps=30,scale=1456:818:force_original_aspect_ratio=decrease,pad=1456:818:(ow-iw)/2:(oh-ih)/2:color=white,setsar=1,tpad=stop_mode=clone:stop_duration=1[v]',
    'color=c=white:s=1920x1080:r=30[base]',
    '[base][v]overlay=44:140[stage]',
    '[stage][1:v]overlay,format=yuv420p[vout]',
  ].join(';');
  run([...mediaArgs,'-loop','1','-framerate','30','-i',plate,'-t',String(duration),
    '-filter_complex',composition,'-map','[vout]',...encode,output]);
}
function chapter(name,key,takes) {
  const plate=path.join(overlays,key+'-stage.png');
  const outputs=[];
  for(let i=0;i<takes.length;i++){
    const [dynamic,still,seconds]=takes[i];
    const series=dynamic && exists(path.join(captures,dynamic),'frames.ffconcat');
    const mediaArgs=series ? ['-f','concat','-safe','0','-i',series]
      : ['-loop','1','-framerate','30','-i',source(still)];
    if (series) used[dynamic]='Current hosted app interaction recorded by Chrome';
    const out=path.join(temp,key+'-'+(i+1)+'.mp4');
    if (!process.argv.includes('--reuse-stages') || !fs.existsSync(out)) segment(mediaArgs,plate,seconds,out);
    outputs.push(out);
  }
  concatenate(outputs,path.join(clips,name));
  console.log('Rendered',name);
}

function editXml() {
  const rate='<rate><timebase>30</timebase><ntsc>FALSE</ntsc></rate>';
  const square='<width>1920</width><height>1080</height><anamorphic>FALSE</anamorphic><pixelaspectratio>square</pixelaspectratio><fielddominance>none</fielddominance>';
  let pos=0;
  const labels=['Open','Robertson footage','Review evidence','Compare budget','Export report','Close'];
  const markers=[];
  const items=names.map((name,index)=>{
    const n=index+1;
    const d=Math.round(durations[index]*FPS);
    const start=pos;
    pos+=d;
    markers.push('<marker><name>'+labels[index]+'</name><in>'+start+'</in><out>-1</out></marker>');
    return '<clipitem id="clip-'+n+'"><name>'+esc(name)+'</name><duration>'+d+'</duration>'+rate+
      '<start>'+start+'</start><end>'+pos+'</end><in>0</in><out>'+d+'</out><enabled>TRUE</enabled>'+
      '<file id="file-'+n+'"><name>'+esc(name)+'</name><pathurl>'+esc(pathToFileURL(path.join(clips,name)).href)+'</pathurl>'+
      rate+'<duration>'+d+'</duration><media><video><samplecharacteristics>'+rate+square+
      '</samplecharacteristics></video></media></file><sourcetrack><mediatype>video</mediatype><trackindex>1</trackindex></sourcetrack></clipitem>';
  }).join('\n');
  const xml='<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE xmeml>\n<xmeml version="5"><sequence id="curb-demo"><name>Curb Devpost | 99 seconds</name><duration>'+pos+'</duration>'+rate+
    '<timecode>'+rate+'<string>00:00:00:00</string><frame>0</frame><displayformat>NDF</displayformat></timecode>'+
    '<media><video><format><samplecharacteristics>'+rate+square+'</samplecharacteristics></format><track>'+items+
    '<enabled>TRUE</enabled><locked>FALSE</locked></track><track><enabled>TRUE</enabled><locked>FALSE</locked></track></video>'+
    '<audio><format><samplecharacteristics><depth>16</depth><samplerate>48000</samplerate></samplecharacteristics></format><track><enabled>TRUE</enabled><locked>FALSE</locked></track></audio></media>'+
    markers.join('\n')+'</sequence></xmeml>\n';
  fs.writeFileSync(path.join(home,'Curb-edit.xml'),xml);
}

async function main() {
  if (process.argv.includes('--timeline-only')) {
    editXml();
    console.log('Relinked all six clips to this checkout');
    return;
  }
  if (process.argv.includes('--design-preview')) {
    await png(titleFrame(2.3,false),path.join(temp,'intro-preview.png'));
    await png(titleFrame(2.7,true),path.join(temp,'outro-preview.png'));
    await png(chapterPlate('review'),path.join(temp,'review-preview.png'));
    return;
  }
  if (process.argv.includes('--titles')) {
    await titleClip(names[0],durations[0],false);
    await titleClip(names[5],durations[5],true);
    return;
  }
  for(const key of ['review','budget','report']) await png(chapterPlate(key),path.join(overlays,key+'-stage.png'));
  await png(chapterPlate('field',true),path.join(temp,'field.png'));
  await png(cameraFrame(),path.join(overlays,'camera-frame-optional.png'));
  if(!fs.existsSync(path.join(clips,names[0]))) await titleClip(names[0],durations[0],false);
  if(!fs.existsSync(path.join(clips,names[5]))) await titleClip(names[5],durations[5],true);
  if (!process.argv.includes('--reuse-stages') || !fs.existsSync(path.join(clips,names[1]))) run(['-i',path.join(media,'survey.mp4'),'-loop','1','-framerate','30','-i',path.join(temp,'field.png'),
    '-t',String(durations[1]),'-filter_complex',
    '[0:v]fps=30,scale=-2:788,setsar=1[phone];[1:v][phone]overlay=991:155:shortest=1,format=yuv420p[v]',
    '-map','[v]',...encode,path.join(clips,names[1])]);
  console.log('Rendered',names[1]);

  chapter(names[2],'review',[['evidence-click','finding',5],[null,'finding',8],[null,'inspection',10]]);
  chapter(names[3],'budget',[['budget-click','plans',6],[null,'budget',12],[null,'deferred',12]]);
  chapter(names[4],'report',[['export-click','export',6],[null,'report',10],[null,'report-detail',11]]);
  concatenate(names.map(n=>path.join(clips,n)),path.join(home,'Curb-picture-edit.mp4'));
  editXml();
  fs.writeFileSync(path.join(home,'picture-sources.json'),JSON.stringify({
    titleAndOutro:'Original animated graphics using the Curb mark and colors.',
    robertson:'Real phone video, normalized survey.mp4 from the project repository.',
    recordings: used,
    durationSeconds: durations.reduce((sum,n)=>sum+n,0),
    fps: FPS,
  },null,2)+'\n');
  console.log('Assembled 99-second picture edit and editable timeline');
}

main().catch(e=>{ console.error(e.stack);process.exitCode=1; });
