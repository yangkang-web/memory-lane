import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {speechPose,mouthShapes} from '../src/school/student-gestures.js';
import {studentRig} from './helpers/student-rig.js';
import {characters} from '../src/school/characters.js';

test('silent syllables cover five mouth shapes with bounded weights and closed pauses',()=>{
  const seen=new Set();let pauses=0;
  for(let t=0;t<4;t+=.01){const pose=speechPose(t);let sum=0;
    for(const name of mouthShapes){assert.ok(pose[name]>=0&&pose[name]<=.6);if(pose[name]>.2)seen.add(name);sum+=pose[name];}
    assert.ok(sum<=.6);if(sum===0)pauses++;
  }
  assert.equal(seen.size,5);assert.ok(pauses>50);
});

for(const character of characters)test(character.shortName+' offers with planted feet, a supported palm and a smooth return',()=>{
  const r=studentRig({character,skeletonOnly:true});r.step(1);
  const feet=['left','right'].map(s=>r.pos(s+'Foot'));
  r.motion.setAction('give');let last=r.pos('rightHand'),jump=0;
  r.step(1.7,()=>{const p=r.pos('rightHand');jump=Math.max(jump,p.distanceTo(last));last=p;});
  assert.ok(r.motion.inspect().giveMix>.99);assert.ok(jump<.04,`hand frame displacement ${jump}`);
  const hand=r.root.worldToLocal(r.pos('rightHand'));
  assert.ok(hand.z>.25,'hand should extend ahead of the body');
  const q=r.humanoid.getNormalizedBoneNode('rightHand').getWorldQuaternion(new T.Quaternion());
  assert.ok(new T.Vector3(0,-1,0).applyQuaternion(q).y>.85,'palm should support the book from below');
  ['left','right'].forEach((s,i)=>assert.ok(r.pos(s+'Foot').distanceTo(feet[i])<.002));
  r.step(4);assert.equal(r.motion.action,'idle');assert.ok(r.motion.inspect().giveMix<.001);
  r.motion.setAction('give');r.step(.6);r.motion.setAction('walk');r.step(4);
  assert.equal(r.motion.label,'Walking');assert.ok(r.motion.inspect().giveMix<.001);
});

test('talking layers over gestures and fades to a closed mouth when stopped',()=>{
  const r=studentRig({skeletonOnly:true});r.motion.setSpeaking(true);r.motion.setAction('give');
  let peak=0;r.step(2,()=>{peak=Math.max(peak,...Object.values(r.motion.inspect().mouth));});
  assert.ok(peak>.3);assert.equal(r.motion.action,'give');assert.equal(r.motion.speaking,true);
  r.motion.setSpeaking(false);r.step(.6);
  assert.ok(Object.values(r.motion.inspect().mouth).every(v=>v<.00001));
  const reduced=studentRig({skeletonOnly:true,reducedMotion:true});reduced.motion.setSpeaking(true);reduced.step(2);
  assert.ok(Object.values(reduced.motion.inspect().mouth).every(v=>v===0));
});

test('offering waits for a walking stop or a chair rise, and tolerates sitting interruption',()=>{
  const r=studentRig({skeletonOnly:true});
  r.motion.setAction('walk');r.step(2);r.motion.setAction('give');
  assert.equal(r.motion.inspect().giveMix,0);
  let reached=false;r.step(7,()=>{if(r.motion.inspect().giveMix>.9)reached=true;});assert.ok(reached);
  r.motion.setAction('sit');r.step(30);assert.equal(r.motion.label,'Seated');
  r.motion.setAction('give');r.step(.3);assert.ok(r.motion.inspect().giveMix<.001);
  r.step(2);assert.ok(r.motion.inspect().giveMix>.9);
  r.motion.setAction('sit');r.step(30);assert.equal(r.motion.label,'Seated');assert.ok(r.motion.inspect().giveMix<.001);
});

test('audio mouth frames override the silent loop and buffering closes the mouth',()=>{
  const r=studentRig({skeletonOnly:true});
  r.motion.setSpeechFrame({oh:.6});r.motion.setSpeaking(true);r.step(.4);
  assert.ok(r.motion.inspect().mouth.oh>.59);
  assert.ok(r.motion.inspect().mouth.aa<.001);
  r.motion.setSpeechFrame({});r.step(.4);
  assert.ok(Object.values(r.motion.inspect().mouth).every(v=>v<.001));
  r.motion.setSpeechFrame({aa:.6});r.motion.setSpeaking(false);r.step(.4);
  assert.ok(Object.values(r.motion.inspect().mouth).every(v=>v<.001));
});
