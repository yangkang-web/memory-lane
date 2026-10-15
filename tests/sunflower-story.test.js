import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {storyFrame,STORY_DURATION,cameraKeys} from '../src/school/sunflower-timeline.js';
const voice=JSON.parse(fs.readFileSync(new URL('../src/school/data/sunflower-voice.json',import.meta.url)));
test('the four story chapters have deterministic boundaries, rewind and final hold',()=>{
 for(const [time,chapter] of [[0,0],[14.99,0],[15,1],[29.99,1],[30,2],[45,3],[60,3]])assert.equal(storyFrame(time).chapter,chapter);
 assert.deepEqual(storyFrame(24),storyFrame(24));assert.deepEqual(storyFrame(99),storyFrame(60));assert.deepEqual(storyFrame(-1),storyFrame(0));
 assert.equal(storyFrame(24).letter,true);assert.equal(storyFrame(33).back,true);assert.ok(Math.abs(storyFrame(30.1).flip-.5)<1e-10);assert.equal(storyFrame(60).ending,true);
});
test('camera stays within the classroom and its final walking segment follows the clear window aisle',()=>{
 for(let t=0;t<=60;t+=.1){const f=storyFrame(t);assert.ok(f.position.every(Number.isFinite));assert.ok(f.position[0]>-36.8&&f.position[0]<-26);assert.ok(f.position[2]>-34&&f.position[2]<-22.25);}
 for(const k of cameraKeys.filter(k=>k[0]>=55.3&&k[0]<60))assert.ok(k[1][0]<-35.4);
 assert.ok(storyFrame(60).position[2]<-31.8);
});
test('the English Puck audio lasts sixty seconds with nonoverlapping lines and timed vowels',()=>{
 assert.equal(voice.duration,STORY_DURATION);assert.equal(voice.voice,'am_puck');assert.equal(voice.language,'en-US');assert.equal(voice.lines.length,7);
 voice.lines.forEach((line,i)=>{assert.ok(line.end>line.start&&line.end<=60);if(i)assert.ok(line.start>=voice.lines[i-1].end);});
 voice.cues.forEach((cue,i)=>{assert.ok(cue.end>cue.start);assert.ok(['aa','ih','ou','ee','oh'].includes(cue.shape));assert.ok(voice.lines.some(l=>cue.start>=l.start&&cue.end<=l.end+.05));if(i)assert.ok(cue.start>=voice.cues[i-1].start);});
 const wav=fs.readFileSync(new URL('../public/assets/voices/sunflower-story-en.wav',import.meta.url));assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.readUInt32LE(24),24000);
 let offset=12,data;while(offset<wav.length){const length=wav.readUInt32LE(offset+4);if(wav.toString('ascii',offset,offset+4)==='data'){data=wav.subarray(offset+8,offset+8+length);break;}offset+=8+length+(length%2);}
 assert.equal(data.length/2/24000,60);
 for(const line of voice.lines){let peak=0;for(let i=Math.ceil(line.start*24000);i<Math.floor(line.end*24000);i++)peak=Math.max(peak,Math.abs(data.readInt16LE(i*2)));assert.ok(peak>1000);}
});
