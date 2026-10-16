import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {storyFrame,storyChapters} from '../src/sunflower-timeline.js';
import {SCHOOL_STORY_SECONDS as STORY_DURATION,SCHOOL_AUDIO_SECONDS,schoolSourceTime,openingProgress,openingSceneState,schoolEndingFade} from '../src/school-short-edit.js';
import {mountStoryOpening,openingFrame,OPENING_DURATION} from '../src/story-opening.js';

// Exercise the real player and opening with a controllable media/animation clock.
async function playerFixture({failPlayback=false,frameSeconds=.05}={}){
 const nodes=new Map(),frames=new Map(),events=[],updates=[];let now=0,nextFrame=0,adapter,disposed=false;
 class Element {
  constructor(){this.hidden=false;this.style={removeProperty(){}};this.listeners=new Map();this.classList={add(){},remove(){},toggle(){}};}
  querySelector(selector){if(!nodes.has(selector))nodes.set(selector,new Element());return nodes.get(selector);}
  append(){} setAttribute(){} contains(){return false;} focus(){} blur(){}
  addEventListener(type,callback){if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push(callback);}
  emit(type){for(const callback of this.listeners.get(type)||[])callback();}
 }
 const app=new Element(),audio=new Element();nodes.set('#story-audio',audio);
 Object.assign(audio,{currentTime:0,paused:true,ended:false,readyState:4,src:'',
  load(){queueMicrotask(()=>audio.emit('loadedmetadata'));},
  pause(){this.paused=true;},async play(){if(failPlayback)throw new Error('autoplay denied');this.paused=false;},
 });
 const document={createElement:()=>new Element(),querySelector:()=>app,addEventListener(){},hidden:false};
 // The DOM-only opening module uses the same lightweight document as the player.
 const previous=globalThis.document;globalThis.document=document;
 const world={prepareStory:async()=>true,startStory(){},stopStory(){},updateStory(...args){updates.push(args);},captureStory(){return 'frame';},dispose(){disposed=true;}};
 const context={document,world,onEnter(){},onExit(){},inSequence:true,playMode:false,installSequence(value){adapter=value;},sequenceEvent(type,detail){events.push({type,detail});},
  storyFrame,storyChapters,STORY_DURATION,SCHOOL_AUDIO_SECONDS,schoolSourceTime,openingProgress,openingSceneState,schoolEndingFade,OPENING_DURATION,mountStoryOpening,openingFrame,voice:{lines:[]},
  performance:{now:()=>now},requestAnimationFrame(fn){frames.set(++nextFrame,fn);return nextFrame;},cancelAnimationFrame(id){frames.delete(id);},
  fetch:async()=>({ok:true,blob:async()=>({})}),URL:{createObjectURL:()=> 'blob:voice',revokeObjectURL(){}},URLSearchParams,
  window:{addEventListener(){}},addEventListener(){},location:{search:'?sequence=1'},HTMLButtonElement:Element,
 };
 const source=fs.readFileSync(new URL('../src/sunflower-player.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function','function');
 try{vm.runInNewContext(source+'\nmountSunflowerPlayer(world,{onEnter,onExit});',context);await adapter.ready;}finally{globalThis.document=previous;}
 async function advance(seconds){
  for(let remaining=seconds;remaining>1e-9;){
   const dt=Math.min(frameSeconds,remaining);remaining-=dt;now+=dt*1000;
   if(!audio.paused){audio.currentTime=Math.min(SCHOOL_AUDIO_SECONDS,audio.currentTime+dt);if(audio.currentTime===SCHOOL_AUDIO_SECONDS){audio.ended=audio.paused=true;audio.emit('ended');}}
   const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(now));await Promise.resolve();
  }
 }
 return {adapter,audio,events,updates,advance,get disposed(){return disposed;}};
}

test('journey preloads school without playing, resumes its opening, then finishes the whole voice track',async()=>{
 const f=await playerFixture();await f.advance(2);assert.equal(f.audio.paused,true);assert.equal(f.events.length,0);
 f.adapter.start();await f.advance(4);const opening=f.updates.at(-1)[2];assert.equal(opening.stage,'compose');
 f.adapter.pause();await f.advance(2);assert.deepEqual(f.updates.at(-1)[2],opening);assert.equal(f.audio.paused,true);
 await f.adapter.resume();await f.advance(OPENING_DURATION-4+.05);
 assert.ok(f.audio.currentTime>=0&&f.audio.currentTime<.1);
 assert.equal(f.audio.paused,false);assert.equal(f.events.length,0);
 f.adapter.pause();const pausedTime=f.audio.currentTime;await f.advance(1);assert.equal(f.audio.currentTime,pausedTime);
 await f.adapter.resume();await f.advance(SCHOOL_AUDIO_SECONDS-1);assert.ok(f.audio.currentTime>SCHOOL_AUDIO_SECONDS-1.1);assert.equal(f.events.length,0);
 await f.advance(9);assert.equal(f.audio.currentTime,SCHOOL_AUDIO_SECONDS);assert.deepEqual(f.events.map(e=>e.type),['done']);
 assert.equal(f.adapter.capture(),'frame');f.adapter.dispose();assert.equal(f.disposed,true);
 const count=f.updates.length;await f.advance(1);assert.equal(f.updates.length,count);
});

test('journey receives a visible error if audio is blocked after the automatic opening',async()=>{
 const f=await playerFixture({failPlayback:true});f.adapter.start();await f.advance(OPENING_DURATION+.1);
 assert.deepEqual(f.events.map(e=>e.type),['error']);assert.match(f.events[0].detail.message,/autoplay denied/);f.adapter.dispose();
});

test('uninterrupted playback completes the opening and ending before one minute',async()=>{
 for(const frameSeconds of [.05,.25,.5]){
  const f=await playerFixture({frameSeconds});f.adapter.start();
  await f.advance(58);assert.equal(f.events.length,0);
  await f.advance(1.9);assert.deepEqual(f.events.map(e=>e.type),['done']);
  assert.equal(f.audio.currentTime,SCHOOL_AUDIO_SECONDS);f.adapter.dispose();
 }
});
