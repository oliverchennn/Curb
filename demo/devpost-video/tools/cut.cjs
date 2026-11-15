const FPS = 30;
const HOOK_SOURCE = 'https://www.cdc.gov/places/measure-definitions/disability.html';

// Every spoken block, clip and marker shares this clock. Proof copy can be
// replaced without retiming either side of that slot.
const cut = [
  { key:'intro', end:7, file:'01-Team-camera-placeholder.mp4', title:'Team camera · replace before export',
    cues:[
      [0.15,'Hey, we built Curb to help campuses'],
      [3.1,'figure out which accessibility repairs to fund.'],
    ] },
  { key:'field', end:15, file:'02-Robertson-footage.mp4', title:'The problem',
    cues:[
      [7.1,'In 2022, about one in eight U.S. adults reported\nserious difficulty walking or climbing stairs.'],
    ] },
  { key:'review', end:38, file:'03-Review-finding.mp4', title:'Robertson Hall · real presenter review',
    cues:[
      [15,'We filmed this outside Robertson Hall.'],
      [18.3,'When I click Review,\nyou can see what the analysis flagged.'],
      [23.8,'I’ll jump to this patch of broken pavement\nand confirm what I see.'],
      [30.8,'We’d still need to measure it on site\nto know how it affects the route.'],
    ] },
  { key:'transition', end:42, file:'04-Synthetic-transition.mp4', title:'Separate simulated campus',
    cues:[[38.1,'Now let’s look at a simulated campus.']] },
  { key:'compare', end:65, file:'05-Investment-10000.mp4', title:'$10,000 · C versus A+B',
    cues:[
      [42.2,'Say we’ve got ten grand.'],
      [45.4,'Fix the worst spot first\nand the whole budget goes to opening Hall.'],
      [51.4,'Curb puts five thousand into the ramp\nand five into the shared path.'],
      [57.3,'That gets us to the Library and Student Center.'],
      [61.2,'Same money, two new destinations instead of one.'],
    ] },
  { key:'omissions', end:81, file:'06-Investment-omissions.mp4', title:'Omit A · Omit B',
    cues:[
      [65.1,'Here’s the catch.\nTake out the ramp and neither route opens.'],
      [71.0,'Put the ramp back and skip the path repair.'],
      [75.0,'Same problem. You need both to get through.'],
    ] },
  { key:'tie', end:92, file:'07-Investment-20000.mp4', title:'$20,000 · Both plans tie',
    cues:[
      [81.2,'If we had twenty grand,\nwe could do all three repairs.'],
      [86.5,'Then both plans reach the same three new destinations.'],
    ] },
  { key:'proof', end:100, file:'08-Synthetic-benchmark.mp4', title:'Audited synthetic benchmark',
    cues:[
      [92.15,'Curb reached more destinations than condition-first\nin fifty-eight synthetic budget cases.'],
      [97.65,'The other sixty-two tied.'],
    ] },
  { key:'buyer', end:112, file:'09-Buyer-and-validation.mp4', title:'Buyer and next validation',
    cues:[
      [100.15,'Facilities can take this plan into a budget meeting.'],
      [104.3,'Next, we’d walk and measure a real route\nwith disabled campus users, then get quotes.'],
    ] },
  { key:'outro', end:116, file:'10-Curb-outro.mp4', title:'Animated close' },
].map((shot,index,all)=>{
  const start = all[index-1]?.end ?? 0;
  return {...shot,start,seconds:Math.round((shot.end-start)*FPS)/FPS};
});

function srtTime(seconds) {
  const n = Math.round(seconds * 1000);
  const hh = String(Math.floor(n / 3600000)).padStart(2,'0');
  const mm = String(Math.floor(n / 60000) % 60).padStart(2,'0');
  const ss = String(Math.floor(n / 1000) % 60).padStart(2,'0');
  return hh+':'+mm+':'+ss+','+String(n%1000).padStart(3,'0');
}
function subtitles() {
  let i=0;
  return cut.flatMap(shot=>(shot.cues ?? []).map(([start,body],j,all)=>
    (++i)+'\n'+srtTime(start)+' --> '+srtTime((all[j+1]?.[0] ?? shot.end)-0.1)+'\n'+body)).join('\n\n')+'\n';
}
function timeline() {
  return {fps:FPS, width:1920, height:1080, sampleRate:48000, seconds:cut.at(-1).end,
    team:{start:0,end:cut[0].end}, voice:{start:cut[0].end,end:cut.at(-1).start},
    presenter:{start:cut[0].end,end:cut.at(-1).start,x:1544,y:722,width:320,height:180},
    clips:cut.map(({key,title,file,start,end})=>({key,title,file,start,end}))};
}

function teleprompter() {
  const mark=seconds=>Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
  const parts=cut.filter(shot=>shot.cues).map((shot,index)=>
    '### '+mark(shot.start)+'–'+mark(shot.end)+(index===0?' · Team camera':'')+'\n\n'+
    shot.cues.map(([,line])=>line.replace(/\n/g,' ')).join(' '));
  return '# Curb · read-aloud script\n\n'+parts[0]+
    '\n\n## Voiceover\n\n'+parts.slice(1).join('\n\n')+
    '\n\n### 1:52–1:56\n\nSilent outro.\n';
}

module.exports = { cut, timeline, subtitles, teleprompter, HOOK_SOURCE, FPS };
