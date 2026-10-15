import test from 'node:test';
import assert from 'node:assert/strict';
import {createStudentVoice,voicePose} from '../src/student-voice.js';
import {readFileSync} from 'node:fs';

const cues=[{start:.1,end:.3,shape:'aa'},{start:.5,end:.8,shape:'ou'}];
class AudioStub extends EventTarget {
  currentTime=0;paused=true;pending=[];
  play(){this.paused=false;return new Promise((resolve,reject)=>this.pending.push({resolve,reject}));}
  pause(){const changed=!this.paused;this.paused=true;if(changed)this.dispatchEvent(new Event('pause'));}
  emit(name){this.dispatchEvent(new Event(name));}
}
function setup(){
  const audio=new AudioStub();let pose={},state,callback;
  const voice=createStudentVoice(audio,cues,{onState:s=>state=s,onPose:p=>pose=p,requestFrame:fn=>{callback=fn;return 1;},cancelFrame:()=>{callback=null;}});
  return {audio,voice,get pose(){return pose;},get state(){return state;},tick(){callback?.();}};
}
test('voice cues leave gaps silent and do not wrap after the line ends',()=>{
  assert.equal(voicePose(.2,cues).aa,.62);
  assert.equal(voicePose(.6,cues).ou,.62);
  for(const time of [-1,0,.4,.9,10])assert.ok(Object.values(voicePose(time,cues)).every(v=>v===0));
});
test('mouth waits for actual playback and follows the audio clock through buffering and completion',async()=>{
  const r=setup();const played=r.voice.play();assert.equal(r.state,'loading');assert.deepEqual(r.pose,{});
  r.audio.currentTime=.2;r.audio.emit('playing');assert.equal(r.state,'playing');assert.equal(r.pose.aa,.62);
  r.audio.currentTime=.6;r.tick();assert.equal(r.pose.ou,.62);
  r.audio.emit('waiting');assert.equal(r.state,'loading');assert.deepEqual(r.pose,{});
  r.audio.emit('playing');r.audio.pending[0].resolve();await played;
  r.audio.emit('ended');assert.equal(r.state,'idle');assert.equal(r.audio.paused,true);assert.deepEqual(r.pose,{});
});
test('stop during load ignores a stale rejection, and a failed play can be retried',async()=>{
  const r=setup();const first=r.voice.play();r.voice.stop();r.audio.pending[0].reject(new Error('aborted'));await first;
  assert.equal(r.state,'idle');assert.deepEqual(r.pose,{});
  const second=r.voice.play();r.audio.pending[1].reject(new Error('blocked'));await second;
  assert.equal(r.state,'error');assert.deepEqual(r.pose,{});
  const third=r.voice.play();r.audio.currentTime=.2;r.audio.emit('playing');r.audio.pending[2].resolve();await third;
  assert.equal(r.pose.aa,.62);r.voice.stop();assert.equal(r.state,'idle');assert.equal(r.audio.currentTime,0);
});

test('English greeting has audible PCM audio and ordered cues within its real duration',()=>{
  const line=JSON.parse(readFileSync(new URL('../src/data/fumiriya-voice.json',import.meta.url)));
  const wav=readFileSync(new URL('../public/assets/voices/fumiriya-greeting-en.wav',import.meta.url));
  assert.equal(line.language,'en-US');assert.match(line.text,/Good morning/);assert.match(line.text,/^[\x20-\x7e]+$/);
  assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.toString('ascii',8,12),'WAVE');
  let format,data;
  for(let offset=12;offset+8<=wav.length;){
    const size=wav.readUInt32LE(offset+4),chunk=wav.subarray(offset+8,offset+8+size);
    if(wav.toString('ascii',offset,offset+4)==='fmt ')format=chunk;
    if(wav.toString('ascii',offset,offset+4)==='data')data=chunk;
    offset+=8+size+(size%2);
  }
  assert.equal(format.readUInt16LE(0),1);assert.equal(format.readUInt16LE(14),16);
  const duration=data.length/format.readUInt32LE(8);
  assert.ok(duration>3&&duration<15);assert.ok(Math.abs(duration-line.duration)<.001);
  let peak=0;for(let i=0;i<data.length;i+=2)peak=Math.max(peak,Math.abs(data.readInt16LE(i))/32768);
  assert.ok(peak>.1&&peak<.99,'audio should be audible and not clipped');
  let last=0;assert.ok(line.cues.length>15);
  for(const cue of line.cues){assert.ok(cue.start>=last&&cue.end>cue.start&&cue.end<=duration);last=cue.end;}
  assert.ok(Object.values(voicePose(duration+.1,line.cues)).every(v=>v===0));
});
