import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { validateSurvey, getBoxAtTime } from '../../src/domain/curb/survey';

const s=validateSurvey(JSON.parse(readFileSync('src/data/curb/surveys/robertson-hall.json','utf8')));
const tracks=JSON.parse(readFileSync('src/data/curb/surveys/robertson-tracks.json','utf8'));
const path=(asset:string)=>resolve('public',asset.slice(1));
const hashes: Record<string,{bytes:number;sha256:string}>={};
for(const asset of new Set([s.media.sourceSrc,s.media.src,s.media.annotatedSrc,s.media.posterSrc,...s.findings.map(f=>f.closeupSrc)])) {
  const file=path(asset),data=readFileSync(file);
  hashes[asset]={bytes:statSync(file).size,sha256:createHash('sha256').update(data).digest('hex')};
}
assert.equal(hashes[s.media.sourceSrc].sha256,s.media.originalSha256);
for(const asset of [s.media.src,s.media.annotatedSrc]) {
  const info=JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','v:0','-count_frames','-show_entries','stream=width,height,nb_read_frames,r_frame_rate,color_transfer,color_primaries','-of','json',path(asset)],{encoding:'utf8'}));
  const stream=info.streams[0];
  assert.equal(stream.width,s.media.width);assert.equal(stream.height,s.media.height);
  assert.equal(stream.nb_read_frames,String(tracks.frameCount));assert.equal(stream.r_frame_rate,'30/1');
  assert.equal(stream.color_transfer,'bt709');assert.equal(stream.color_primaries,'bt709');
}
for(const f of s.findings) {
  const retained=tracks.findings.find((t:{id:string})=>t.id===f.id);
  assert.deepEqual(f.track,retained.track);
  assert.ok(getBoxAtTime(f,f.evidenceTime,s.media.fps));
  assert.equal(f.mapPosition,null);assert.deepEqual(f.measurements,[]);
}
console.log(JSON.stringify({status:'passed',frameCount:tracks.frameCount,findings:s.findings.length,hashes},null,2));
