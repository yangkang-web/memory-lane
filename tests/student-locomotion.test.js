import test from 'node:test';
import * as T from 'three';
import assert from 'node:assert/strict';
import {studentRig} from './helpers/student-rig.js';
import {characters} from '../src/school/characters.js';
import {sampleLocomotion} from '../src/school/student-locomotion.js';

test('authored locomotion loops continuously without a quaternion seam',()=>{
  for(const run of [0,.5,1]){
    const a=sampleLocomotion(1-1e-6,run),b=sampleLocomotion(0,run);
    for(const name of ['hips','spine','chest','leftUpperArm','rightUpperArm','leftLowerArm','rightLowerArm','leftUpperLeg','rightUpperLeg','leftLowerLeg','rightLowerLeg','leftFoot','rightFoot','leftToes','rightToes'])assert.ok(a[name].angleTo(b[name])<.001,`${name}: loop seam`);
  }
});

test('steady walk has a relaxed cadence, counter-swing and controlled weight transfer',()=>{
  const r=studentRig({character:{...characters[0],waypoints:[[-7.7,.41,100]]}});
  r.motion.setAction('walk');r.step(3);
  const initialCycle=r.motion.inspect().cycle,heights=[],hands=[],feet=[],velocities=[];
  let previous=r.pos('hips').y;
  r.step(3,()=>{
    const y=r.pos('hips').y;heights.push(y);velocities.push((y-previous)*60);previous=y;
    hands.push(r.root.worldToLocal(r.pos('leftHand')).z);
    feet.push(r.root.worldToLocal(r.pos('leftFoot')).z);
  });
  const cadence=(r.motion.inspect().cycle-initialCycle)/3*120;
  assert.ok(cadence>105&&cadence<125,`cadence ${cadence}: avoid the old rapid small-step shuffle`);
  assert.ok(Math.max(...heights)-Math.min(...heights)<.045,'avoid reach-driven hip plunges');
  const handArc=Math.max(...hands)-Math.min(...hands);
  assert.ok(handArc>.16&&handArc<.28,'casual arm swing should be visible without a large marching arc');
  const mean=a=>a.reduce((s,v)=>s+v,0)/a.length,h=mean(hands),f=mean(feet);
  assert.ok(hands.reduce((s,v,i)=>s+(v-h)*(feet[i]-f),0)<0,'hand must oppose the same-side foot');
  assert.ok(Math.max(...velocities)<.35,'pelvis must not spring upward after toe-off');
});

test('walking rounds every route corner without stopping to pivot',()=>{
  const r=studentRig();r.motion.setAction('walk');r.step(3);
  let lowestSpeed=Infinity,totalTurn=0,last=r.root.rotation.y,lowestHip=Infinity,widestStep=0;
  r.step(35,()=>{lowestSpeed=Math.min(lowestSpeed,r.motion.inspect().speed);totalTurn+=Math.abs(r.root.rotation.y-last);last=r.root.rotation.y;lowestHip=Math.min(lowestHip,r.pos('hips').y-r.root.position.y);widestStep=Math.max(widestStep,r.pos('leftFoot').distanceTo(r.pos('rightFoot')));});
  assert.ok(totalTurn>Math.PI*2,'must cover a complete circuit, not just a straight segment');
  assert.ok(lowestSpeed>.85,`corner speed ${lowestSpeed}: do not return to stop-and-pivot locomotion`);
  assert.ok(widestStep<.66,`corner stride ${widestStep}: avoid the stretched trailing leg`);
  assert.ok(lowestHip>.97,`corner pelvis ${lowestHip}: avoid a reach-driven lunge`);
});


test('walking rolls through the toes while the support shoe stays grounded',()=>{
  const r=studentRig({character:{...characters[0],waypoints:[[-7.7,.41,100]]}});
  r.motion.setAction('walk');r.step(3);
  let samples=0,maxToeRoll=0,maxSwingLift=0;
  r.step(2,()=>{
    const state=r.motion.inspect();
    const vertices=r.bodyVertices(name=>/Foot|Toes/.test(name));
    for(const foot of state.feet){
      const toe=r.humanoid.getNormalizedBoneNode(foot.side+'Toes');
      maxToeRoll=Math.max(maxToeRoll,toe.quaternion.angleTo(new T.Quaternion()));
      const prefix=foot.side==='left'?'L_':'R_';
      const bottom=Math.min(...vertices.filter(v=>v.name.includes(prefix)).map(v=>v.position.y));
      if(foot.swing)maxSwingLift=Math.max(maxSwingLift,bottom-r.root.position.y);
      if(!foot.swing){
        assert.ok(bottom>=r.root.position.y-.001,'support shoe cannot enter the ground');
        assert.ok(bottom<r.root.position.y+.012,'support cannot look like a hovering foot');
        samples++;
      }
    }
  });
  assert.ok(maxSwingLift<.1,'casual walking must not turn into high-stepping');
  assert.ok(samples>100);assert.ok(maxToeRoll>.2,'forefoot must articulate during push-off');
});

test('the head anticipates corners and stopping retains a relaxed asymmetric stance',()=>{
  const r=studentRig({skeletonOnly:true});r.motion.setAction('walk');r.step(2);
  let lead=0;
  r.step(28,()=>{
    const forward=new T.Vector3(0,0,-1).applyQuaternion(r.humanoid.getNormalizedBoneNode('head').getWorldQuaternion(new T.Quaternion()));
    const offset=Math.atan2(forward.x,forward.z)-r.root.rotation.y;
    const angle=Math.atan2(Math.sin(offset),Math.cos(offset));
    lead=Math.max(lead,Math.abs(angle));
    assert.ok(Math.abs(angle)<.65,'anticipation must not wrench the neck around');
  });
  assert.ok(lead>.2,'turns need visible head anticipation');
  r.motion.setAction('idle');r.step(4);
  const feet=['left','right'].map(side=>r.root.worldToLocal(r.pos(side+'Foot')));
  assert.ok(Math.abs(feet[0].z-feet[1].z)>.03,'avoid a rigid symmetric reset after stopping');
  const anchors=r.motion.inspect().feet.map(f=>f.contact);
  r.step(3,()=>r.motion.inspect().feet.forEach((f,i)=>assert.ok(f.contact.distanceTo(anchors[i])<1e-6,'idle weight shifts cannot slide the feet')));
});


test('leaving a chair rejoins the path without a lateral lunge or pelvis drop',()=>{
  for(const character of characters){
    const r=studentRig({character,skeletonOnly:true});
    const standingHeight=r.pos('hips').y-r.root.position.y;
    r.motion.setAction('sit');r.step(25);r.motion.setAction('idle');r.step(4);
    r.motion.setAction('walk');let minHeight=Infinity,maxSpan=0;
    r.step(10,()=>{
      minHeight=Math.min(minHeight,r.pos('hips').y-r.root.position.y);
      maxSpan=Math.max(maxSpan,r.pos('leftFoot').distanceTo(r.pos('rightFoot')));
    });
    assert.ok(minHeight>standingHeight-.12,`${character.id}: pelvis drops during path re-entry`);
    assert.ok(maxSpan<standingHeight*.72,`${character.id}: excessive side step during path re-entry`);
  }
});

test('mid-stance supports the body without a persistent crouch on either avatar',()=>{
  for(const character of characters){
    const r=studentRig({character:{...character,waypoints:[[character.position[0],.41,100]]},skeletonOnly:true});
    r.motion.setAction('walk');r.step(3);let samples=0;
    r.step(3,()=>{
      for(const f of r.motion.inspect().feet){
        const foot=r.root.worldToLocal(r.pos(f.side+'Foot'));
        const socket=r.root.worldToLocal(r.pos(f.side+'UpperLeg'));
        if(f.swing||Math.abs(foot.z-socket.z)>.03)continue;
        const hip=r.pos(f.side+'UpperLeg'),knee=r.pos(f.side+'LowerLeg'),ankle=r.pos(f.side+'Foot');
        const flexion=Math.PI-hip.sub(knee).angleTo(ankle.sub(knee));
        assert.ok(flexion>.07&&flexion<.46,`${character.id}: supporting knee ${flexion*180/Math.PI} degrees`);
        samples++;
      }
    });
    assert.ok(samples>20,'must inspect weight-bearing portions of multiple steps');
  }
});

test('a standing start shifts weight before translating, then reaches a normal walking pace',()=>{
  const r=studentRig({skeletonOnly:true});
  const start=r.root.position.clone(),hips=r.pos('hips');
  r.motion.setAction('walk');r.step(.1);
  assert.ok(r.root.position.distanceTo(start)<.001,'do not translate the body before preparing the first step');
  assert.ok(Math.abs(r.pos('hips').x-hips.x)>.005,'prepare by moving weight onto the supporting side');
  r.step(.9);
  assert.ok(r.motion.inspect().speed>.8,'anticipation must not make controls feel unresponsive');
});

test('casual walking stays upright and lets each hand pass behind the hip',()=>{
  for(const character of characters){
    const r=studentRig({character:{...character,waypoints:[[character.position[0],.41,100]]},skeletonOnly:true});
    r.motion.setAction('walk');r.step(3);
    const handPositions={left:[],right:[]};
    r.step(3,()=>{
      const local=name=>r.root.worldToLocal(r.pos(name));
      const hip=local('hips'),neck=local('neck');
      const pitch=Math.atan2(neck.z-hip.z,neck.y-hip.y);
      assert.ok(Math.abs(pitch)<.065,'walking chest must not retain the bent-forward source posture');
      for(const side of ['left','right'])handPositions[side].push(local(side+'Hand').z-hip.z);
    });
    for(const positions of Object.values(handPositions)){
      assert.ok(Math.min(...positions)<-.025,'hand must swing behind the hip rather than stay held in front');
      assert.ok(Math.max(...positions)>.06&&Math.max(...positions)<.18,'front swing must remain small and readable');
    }
  }
});
