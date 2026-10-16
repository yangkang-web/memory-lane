import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SCHOOL_EDITS,SCHOOL_STORY_SECONDS,SCHOOL_AUDIO_SECONDS,schoolSourceTime,schoolEndingFade,openingSceneState} from '../src/school-short-edit.js';
import {OPENING_DURATION,OPENING_FILM_DURATION} from '../src/story-opening.js';
import {letterFront,voiceCaptions,storyFrame} from '../src/sunflower-timeline.js';

test('the complete automatic school story, including the phone opening, is under one minute',()=>{
 const wav=fs.readFileSync(new URL('../public/assets/voices/sunflower-story-short.wav',import.meta.url));
 assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.readUInt32LE(24),24000);
 assert.equal((wav.length-44)/48000,SCHOOL_AUDIO_SECONDS);
 assert.equal(SCHOOL_STORY_SECONDS,OPENING_DURATION+SCHOOL_AUDIO_SECONDS);
 assert.ok(SCHOOL_STORY_SECONDS>58&&SCHOOL_STORY_SECONDS<60);
 assert.equal(openingSceneState({stage:'film',elapsed:OPENING_FILM_DURATION}).elapsed,18);
});
test('the removed sentence is absent from paper, captions and the edited playback',()=>{
 assert.doesNotMatch(letterFront.join(' '),/try a little harder/);
 assert.ok(voiceCaptions.every(([, ,text])=>!text.includes('try a little harder')));
 for(let t=0;t<SCHOOL_AUDIO_SECONDS;t+=.01){const source=schoolSourceTime(t);assert.ok(source<=21.12||source>=24.43);}
 assert.equal(schoolSourceTime(0),19.2);assert.equal(schoolSourceTime(SCHOOL_AUDIO_SECONDS),68);
});
test('retained dialogue keeps its timing and the final camera cut is hidden under a full fade',()=>{
 for(const range of [[19.3,20.95],[24.56,27.32],[31,38.59],[47.1,49.31],[51,53.38],[56.8,58.43]]){
  const clip=SCHOOL_EDITS.find(e=>range[0]>=e.from&&range[1]<=e.to);assert.ok(clip);
  assert.ok(Math.abs(clip.seconds-(clip.to-clip.from))<1e-8);
 }
 const last=SCHOOL_EDITS.at(-1);assert.ok(storyFrame(schoolSourceTime(last.start-.001)).fade>.99);
 assert.equal(schoolEndingFade(last.start),1);assert.equal(schoolEndingFade(last.start+.75),0);
 assert.ok(storyFrame(schoolSourceTime(SCHOOL_AUDIO_SECONDS)).ending);
});
