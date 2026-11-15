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
const temp = path.join(home, '.render');
for (const dir of [clips, overlays, temp]) fs.mkdirSync(dir, { recursive: true });

const W = 1920;
const H = 1080;
const FPS = 30;
const brand = {
  pale: '#faf8ef', paper: '#f5f2e7', dark: '#1b3024', ink: '#15271e',
  light: '#dbe9b2', green: '#355d4a', mid: '#617269', line: '#c9d0bf',
};
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
  const tagline = text(end ? 'Evidence, routes and repair budgets' : 'CAMPUS ACCESSIBILITY  /  FACILITIES PLANNING',
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
async function titleClip(name,seconds,end,destination=clips) {
  const proc = spawn(ffmpeg,[...quiet,'-f','image2pipe','-framerate','30','-vcodec','png','-i','pipe:0',
    ...encode,path.join(destination,name)],{stdio:['pipe','ignore','pipe'],windowsHide:true});
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
function editXml(shots, {
  directory=clips, output=path.join(home,'Curb-edit.xml'), neutral=false,
}={}) {
  const rate='<rate><timebase>30</timebase><ntsc>FALSE</ntsc></rate>';
  const square='<width>1920</width><height>1080</height><anamorphic>FALSE</anamorphic><pixelaspectratio>square</pixelaspectratio><fielddominance>none</fielddominance>';
  let pos=0;
  const markers=[];
  const items=shots.map(({file:name,seconds,title},index)=>{
    const n=index+1;
    const d=Math.round(seconds*FPS);
    const start=pos;
    pos+=d;
    markers.push('<marker><name>'+esc(title ?? name)+'</name><in>'+start+'</in><out>-1</out></marker>');
    const uri = neutral ? 'file://localhost/curb-devpost-video/clips/'+name : pathToFileURL(path.join(directory,name)).href;
    return '<clipitem id="clip-'+n+'"><name>'+esc(name)+'</name><duration>'+d+'</duration>'+rate+
      '<start>'+start+'</start><end>'+pos+'</end><in>0</in><out>'+d+'</out><enabled>TRUE</enabled>'+
      '<file id="file-'+n+'"><name>'+esc(name)+'</name><pathurl>'+esc(uri)+'</pathurl>'+
      rate+'<duration>'+d+'</duration><media><video><samplecharacteristics>'+rate+square+
      '</samplecharacteristics></video></media></file><sourcetrack><mediatype>video</mediatype><trackindex>1</trackindex></sourcetrack></clipitem>';
  }).join('\n');
  const xml='<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE xmeml>\n<xmeml version="5"><sequence id="curb-demo"><name>Curb Devpost | '+(pos/FPS)+' seconds</name><duration>'+pos+'</duration>'+rate+
    '<timecode>'+rate+'<string>00:00:00:00</string><frame>0</frame><displayformat>NDF</displayformat></timecode>'+
    '<media><video><format><samplecharacteristics>'+rate+square+'</samplecharacteristics></format><track>'+items+
    '<enabled>TRUE</enabled><locked>FALSE</locked></track><track><enabled>TRUE</enabled><locked>FALSE</locked></track></video>'+
    '<audio><format><samplecharacteristics><depth>16</depth><samplerate>48000</samplerate></samplecharacteristics></format><track><enabled>TRUE</enabled><locked>FALSE</locked></track></audio></media>'+
    markers.join('\n')+'</sequence></xmeml>\n';
  fs.writeFileSync(output,xml);
}

module.exports={home,media,clips,overlays,temp,brand,rect,circle,line,text,stack,icon,svg,mono,bold,
  encode,run,png,titleClip,concatenate,segment,cameraFrame,editXml};
