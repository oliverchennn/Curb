const FPS = 30;
const HOOK_SOURCE = 'https://www.cdc.gov/places/measure-definitions/disability.html';
const benchmark = require('../benchmark-proof.json');

// Every spoken block, clip and marker shares this clock. Proof copy can be
// replaced without retiming either side of that slot.
const cut = [
  { key:'intro', end:3.2, file:'01-Curb-intro.mp4', title:'Animated introduction' },
  { key:'field', end:15, file:'02-Robertson-footage.mp4', title:'The problem',
    cues:[
      [3.3,'Campus teams have limited repair budgets.'],
      [7,'In 2022, about one in eight U.S. adults reported\nserious difficulty walking or climbing stairs.'],
    ] },
  { key:'review', end:38, file:'03-Review-finding.mp4', title:'Robertson Hall · real presenter review',
    cues:[
      [15,'Here’s the original footage from Robertson Hall.'],
      [19.7,'In Review, Curb overlays the prepared AI findings.'],
      [23.8,'Jump to Surface breakup at six seconds,\nframe 180.'],
      [29.0,'I can accept the visible damage.'],
      [33.0,'One accepted, four pending.\nRoute impact stays unknown.'],
    ] },
  { key:'transition', end:42, file:'04-Synthetic-transition.mp4', title:'Separate simulated campus',
    cues:[[38.1,'For the budget test, we switch\nto a separate simulated campus.']] },
  { key:'compare', end:65, file:'05-Investment-10000.mp4', title:'$10,000 · C versus A+B',
    cues:[
      [42.2,'Give both plans ten thousand dollars.'],
      [46,'Worst condition first funds repair C\nand opens one destination, Hall.'],
      [51.6,'Curb picks two linked repairs, A and B,\nand opens the Library and Student center.'],
      [59.4,'Same budget, two newly reachable destinations\nversus one in this example.'],
    ] },
  { key:'omissions', end:81, file:'06-Investment-omissions.mp4', title:'Omit A · Omit B',
    cues:[
      [65.1,'Take A away and both new trips disappear.'],
      [70.8,'Put A back and take B away.\nThe same thing happens.'],
      [76.2,'The shared route needs both repairs.'],
    ] },
  { key:'tie', end:92, file:'07-Investment-20000.mp4', title:'$20,000 · Both plans tie',
    cues:[
      [81.2,'At twenty thousand dollars,\nboth plans can fund all three repairs.'],
      [87.3,'They tie at three newly reachable destinations.'],
    ] },
  { key:'proof', end:100, file:'08-Synthetic-benchmark.mp4', title:'Audited synthetic benchmark',
    cues:[[92.15,'Across '+benchmark.budgetCases+' synthetic budget cases,\nCurb beat condition-first '+benchmark.wins+' times and tied '+benchmark.ties+'.']] },
  { key:'buyer', end:112, file:'09-Buyer-and-validation.mp4', title:'Buyer and next validation',
    cues:[
      [100.15,'The buyer is campus facilities.'],
      [103.15,'Next, we’d walk the crossings with disabled campus users\nand accessibility staff, measure them, and get quotes.'],
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
  return {fps:FPS, seconds:cut.at(-1).end, presenter:{start:cut[0].end,end:cut.at(-1).start,x:1544,y:722,width:320,height:180},
    clips:cut.map(({key,title,file,start,end})=>({key,title,file,start,end}))};
}

module.exports = { cut, timeline, subtitles, HOOK_SOURCE, FPS };
