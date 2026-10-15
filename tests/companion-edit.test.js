import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CHAPTERS,CUES,DURATION,LINES,SHOTS,editStateAt,playbackAt } from '../src/last-companion-edit.js';

test('the edited journey stays sixty seconds with a continuous physical route',()=>{
  assert.equal(DURATION,60);assert.equal(SHOTS[0].start,0);assert.equal(SHOTS.at(-1).end,60);
  SHOTS.forEach((shot,i)=>{if(i)assert.equal(shot.start,SHOTS[i-1].end);assert.ok(shot.end>shot.start);});
  for(let t=0;t<60;t+=1/120){const a=editStateAt(t),b=editStateAt(t+1/120);assert.ok(Math.hypot(...a.camera.map((v,i)=>b.camera[i]-v))<.1,`camera teleports at ${t}`);}
  for(const chapter of CHAPTERS)assert.equal(CHAPTERS[editStateAt(chapter.start).editChapter],chapter);
  assert.equal(editStateAt(100).playbackTime,60);assert.equal(editStateAt(60).t,480);assert.equal(editStateAt(60).blackout,1);
});

test('cuts remove the shop and cigarette while retaining collapse, injury and escape',()=>{
  for(const removed of [60,99,120,180,195,445,450])assert.equal(playbackAt(removed),null);
  const moments=[288,301,319,334,340,358,370,390,410,464,478].map(playbackAt);
  moments.forEach((t,i)=>{assert.ok(t!==null);if(i)assert.ok(t>moments[i-1]);});
  assert.equal(editStateAt(31).leftArm,true);assert.equal(editStateAt(32).leftArm,false);
  assert.equal(editStateAt(51).sunset,false);assert.equal(editStateAt(55).sunset,true);
  assert.deepEqual(editStateAt(27).camera,editStateAt(29).camera,'levering has a steady camera');
  assert.deepEqual(editStateAt(54).camera,editStateAt(58).camera,'goodbye has breathing room');
  const expected=editStateAt(20);editStateAt(60);assert.deepEqual(editStateAt(20),expected);
  assert.equal(editStateAt(20).leftArm,true);assert.equal(editStateAt(0).storeOnly,false);
  assert.equal(editStateAt(0).camera[2],83.6);assert.equal(editStateAt(55).camera[2],141.3);
});

test('the edit triggers only retained sound cues and gives complete local voices usable speaking slots',()=>{
  assert.ok(CUES.length>10&&CUES.length<120);
  CUES.forEach(([at],i)=>{assert.ok(at>=0&&at<60);if(i)assert.ok(at>=CUES[i-1][0]);});
  assert.equal(CUES.filter(([,cue])=>cue==='collapse').length,2);
  assert.ok(!CUES.some(([,cue])=>['blast','lighter'].includes(cue)));
  assert.equal(LINES.length,7);
  for(const line of LINES){
    const bytes=readFileSync(new URL(`../public/assets/story/voice/${String(line.index).padStart(2,'0')}.wav`,import.meta.url));
    let byteRate=0,size=0;
    for(let offset=12;offset+8<=bytes.length;){const n=bytes.readUInt32LE(offset+4),id=bytes.toString('ascii',offset,offset+4);if(id==='fmt ')byteRate=bytes.readUInt32LE(offset+16);if(id==='data')size=n;offset+=8+n+n%2;}
    assert.ok(size/byteRate/(line.end-line.start)<=1,`rushed line: ${line.line[3]}`);
    const state=editStateAt((line.start+line.end)/2);assert.equal(state.voice.index,line.index);assert.ok(state.voice.elapsed>=0&&state.voice.elapsed<state.voice.duration);
  }
  assert.equal(LINES.at(-1).line[3],'……听得到吗？');
});

// Test the active edit, not the obsolete long-form camera path.
test('edited metro route clears the beam and crosses the maintenance doorway',()=>{
  for(let t=18;t<26;t+=.025){const [x,y,z]=editStateAt(t).camera;assert.ok(!(x> -1.6&&x<.95&&y> -7.85&&y< -7.15&&z>103.78&&z<104.42),`camera enters pinned beam at ${t}`);}
  for(let t=42;t<44;t+=.01){const [x,,z]=editStateAt(t).camera;assert.ok(!(x>3.78&&x<8.2&&Math.abs(z-121)<.32),`front wall at ${t}`);if(Math.abs(x-4)<.22)assert.ok(z>122.25&&z<123.75,`doorway missed at ${t}`);}
  for(let t=47;t<52;t+=.025){const [x,y,z]=editStateAt(t).camera;if(z<126.325||z>139.525)continue;const step=Math.min(23,Math.floor((z-126.325)/.55));assert.ok(y-(-6.8+step*.29+.145)>.65);assert.ok(x>7&&x<9);}
});
