import test from 'node:test';
import assert from 'node:assert/strict';
import {openingFrame,OPENING_FILM_SOURCE_DURATION,createOpeningClock,OPENING_DURATION,OPENING_STAGES} from '../src/story-opening.js';
import {storyFrame,storyPerformance} from '../src/sunflower-timeline.js';
import {studentRig} from './helpers/student-rig.js';

test('chat stages keep the camera seated before the delivery sequence',()=>{
 for(const stage of ['invite','compose','typing','reply']){
  for(const elapsed of [0,10,1000]){
   const f=openingFrame({stage,elapsed});assert.equal(f.film,false);assert.equal(f.boy,false);assert.equal(f.letter,false);assert.equal(f.fade,0);
   assert.deepEqual(f.position,openingFrame().position);
  }
 }
});
test('delivery, arrival, seal opening and extraction happen in that order and meet the reading shot',()=>{
 const at=t=>openingFrame({stage:'film',elapsed:t});
 assert.equal(at(0).place,0);assert.equal(at(3.3).place,1);assert.equal(at(3.3).release,0);assert.equal(at(4.5).release,1);
 assert.ok(at(5.9).fade>.99);assert.equal(at(7).boy,false);assert.ok(at(6.4).position[2]>-22.25);assert.ok(at(9).position[2]<-22.25);
 assert.equal(at(12).pickup,1);assert.equal(at(12).open,0);assert.equal(at(14).open,1);assert.equal(at(14).extract,0);assert.equal(at(17.8).extract,1);
 assert.deepEqual(at(OPENING_FILM_SOURCE_DURATION).position,storyFrame(19.2).position);assert.deepEqual(at(OPENING_FILM_SOURCE_DURATION).target,storyFrame(19.2).target);
 for(let t=0;t<=18;t+=.02){const f=at(t);assert.ok([...f.position,...f.target,f.focus].every(Number.isFinite));assert.ok(f.fade>=0&&f.fade<=1);}
});
test('moving the boy to the desk preserves planted feet and his placing hand reaches the letter',()=>{
 const rig=studentRig({skeletonOnly:true});rig.step(.2);
 const before=['leftFoot','rightFoot'].map(n=>rig.pos(n));const old=rig.root.position.clone(),next=old.clone().addScalar(.2);
 rig.motion.relocate(next.toArray());rig.step(.2);
 for(const [i,n] of ['leftFoot','rightFoot'].entries())assert.ok(rig.pos(n).distanceTo(before[i].clone().add(next.clone().sub(old)))<.03);
 const target=rig.root.position.clone().add({x:-.30,y:.815,z:.50});
 rig.motion.setStoryPose({...storyPerformance(0),rightHandTarget:target.toArray(),rightHandWeight:1,deliveryLean:1});rig.step(.5);
 assert.ok(rig.pos('rightHand').distanceTo(target)<.08,`hand distance ${rig.pos('rightHand').distanceTo(target)}`);
});

test('the full placement path stays within fingertip reach of the authored character',()=>{
 const rig=studentRig({skeletonOnly:true,character:{position:[-33.45,.52,-25.68],height:1.78}});rig.root.rotation.y=-.44;
 for(let t=0;t<3.4;t+=1/60){
  const f=openingFrame({stage:'film',elapsed:t}),start=[-33.62,1.60,-25.40],end=[-33.89,1.31,-25.12],offset=[.12,.025,-.055];
  const target=start.map((v,i)=>v+(end[i]-v)*f.place+offset[i]);
  rig.motion.setStoryPose({...storyPerformance(0),deliveryLean:.25+.75*f.place,rightHandTarget:target,rightHandWeight:1});rig.step(1/60);
  assert.ok(rig.pos('rightHand').distanceTo({x:target[0],y:target[1],z:target[2]})<.065);
 }
});

test('shot joins preserve camera and focus, and the arrival curve has no sharp turn',()=>{
 const departing=openingFrame({stage:'leaving',elapsed:1.6}),delivery=openingFrame({stage:'film',elapsed:0});
 assert.deepEqual(departing.position,delivery.position);assert.deepEqual(departing.target,delivery.target);assert.equal(departing.focus,delivery.focus);
 const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
 for(const t of [10.6,11,14,18]){
  const before=openingFrame({stage:'film',elapsed:t-.001}),after=openingFrame({stage:'film',elapsed:t+.001});
  assert.ok(distance(before.position,after.position)<.01);assert.ok(distance(before.target,after.target)<.01);assert.ok(Math.abs(before.focus-after.focus)<.01);
 }
 // Bound acceleration through the former two-segment corner, including head bob.
 for(let t=7;t<10.5;t+=.02){
  const samples=[t-.01,t,t+.01].map(elapsed=>openingFrame({stage:'film',elapsed}).position);
  const acceleration=samples[0].map((v,i)=>(v-2*samples[1][i]+samples[2][i])/.0001);
  assert.ok(Math.hypot(...acceleration)<4);
 }
 const end=openingFrame({stage:'film',elapsed:18});assert.ok(Math.abs(end.focus-storyFrame(19.2).focus)<1e-9);
});


test('opening pauses in every shot, resumes in place, and completes only once',()=>{
 const stages=[];let completions=0;
 const clock=createOpeningClock({onStage(){stages.push(clock.state.stage);},onComplete(){completions++;}});
 clock.start();
 for(const [stage,duration] of OPENING_STAGES){
  assert.equal(clock.state.stage,stage);
  const before=clock.state;clock.pause();clock.update(20);assert.deepEqual(clock.state,before);
  clock.resume();
  let remaining=duration-before.elapsed;
  while(remaining>1e-9){const dt=Math.min(.05,remaining);clock.update(dt);remaining-=dt;}
  // Avoid floating-point boundary ambiguity without consuming a visible frame.
  clock.update(1e-9);
 }
 assert.deepEqual(stages,OPENING_STAGES.map(([stage])=>stage));
 assert.equal(completions,1);assert.equal(clock.active,false);assert.equal(clock.running,false);
 clock.resume();clock.update(1);assert.equal(completions,1);
 clock.start();assert.equal(clock.state.stage,'invite');assert.equal(clock.state.elapsed,0);
 clock.stop();clock.update(1);assert.equal(clock.active,false);
});

test('opening duration is independent of frame cadence and never completes while preloaded',()=>{
 for(const dt of [1/60,1/30,.07,.25,.5]){
  let completions=0;const clock=createOpeningClock({onComplete(){completions++;}});
  clock.update(100);assert.equal(completions,0);assert.equal(clock.active,false);
  clock.start();let time=0;
  while(clock.active){clock.update(dt);time+=dt;assert.ok(time<OPENING_DURATION+1);}
  assert.ok(Math.abs(time-OPENING_DURATION)<dt+1e-8);assert.equal(completions,1);
 }
});
