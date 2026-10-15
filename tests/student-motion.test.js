import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {studentRig} from './helpers/student-rig.js';
import {STUDENT_CHAIR} from '../src/school/student-motion.js';

const angle=(a,b,c)=>a.clone().sub(b).angleTo(c.clone().sub(b));
test('original VRM legs keep their lengths, bend forward, and reach planted feet through walking turns',()=>{
  const r=studentRig(),lengths=['left','right'].map(s=>[r.pos(s+'UpperLeg').distanceTo(r.pos(s+'LowerLeg')),r.pos(s+'LowerLeg').distanceTo(r.pos(s+'Foot'))]);
  r.motion.setAction('walk');let previous=new Map(),samples=0;
  r.step(35,()=>{
    const state=r.motion.inspect();assert.ok(state.feet.some(f=>!f.swing),'walking must retain support');
    for(const [i,f] of state.feet.entries()) {
      const a=r.pos(f.side+'UpperLeg'),b=r.pos(f.side+'LowerLeg'),c=r.pos(f.side+'Foot');
      assert.ok(Math.abs(a.distanceTo(b)-lengths[i][0])<1e-6);
      assert.ok(Math.abs(b.distanceTo(c)-lengths[i][1])<1e-6);
      assert.ok(c.distanceTo(f.target)<.002,'foot must reach its contact target');
      const ac=c.clone().sub(a).normalize(),bend=b.clone().sub(a);bend.addScaledVector(ac,-bend.dot(ac));
      const forward=new T.Vector3(0,0,1).applyQuaternion(r.root.quaternion);
      assert.ok(bend.dot(forward)>-.001,'knee must not bend backwards');
      if(!f.swing&&previous.get(f.side)?.swing===false)assert.ok(f.contact.distanceTo(previous.get(f.side).contact)<.001,'stance anchor must stay fixed');
      previous.set(f.side,f);samples++;
    }
  });assert.ok(samples>4000);
});

test('running adds a flight phase and higher speed while keeping reachable legs',()=>{
  const r=studentRig();r.motion.setAction('run');let flight=false,contact=false,maxSpeed=0;
  r.step(25,()=>{const s=r.motion.inspect();flight ||= s.feet.every(f=>f.swing);contact ||= s.feet.some(f=>!f.swing);maxSpeed=Math.max(maxSpeed,s.speed);
    for(const f of s.feet)assert.ok(r.pos(f.side+'Foot').distanceTo(f.target)<.002);
  });assert.ok(flight&&contact);assert.ok(maxSpeed>2.3);
});

test('stopping decelerates without resetting yaw and settles feet onto the ground',()=>{
  const r=studentRig();r.motion.setAction('run');for(let i=0;i<600&&r.motion.inspect().speed<2;i++)r.step(1/60);assert.ok(r.motion.inspect().speed>=2);const yaw=r.root.rotation.y,pos=r.root.position.clone();
  r.motion.setAction('idle');assert.equal(r.root.rotation.y,yaw);let previous=r.motion.inspect().speed;
  r.step(4,()=>{const s=r.motion.inspect();assert.ok(s.speed<=previous+1e-8);previous=s.speed;assert.ok(Math.abs(r.root.rotation.y-yaw)<1e-8);});
  assert.equal(r.motion.label,'Standing');assert.ok(r.root.position.distanceTo(pos)>.05);
  for(const f of r.motion.inspect().feet)assert.ok(Math.abs(f.target.y-r.pos(f.side+'Foot').y)<.001);
});

test('chair approach, sitting, rising and interrupts stay continuous and place hips over the seat',()=>{
  const r=studentRig();r.motion.setAction('walk');r.step(12);r.motion.setAction('sit');
  let last=r.pos('hips'),maxJump=0;
  r.step(25,()=>{const p=r.pos('hips');maxJump=Math.max(maxJump,p.distanceTo(last));last=p;});
  assert.equal(r.motion.label,'Seated');assert.ok(maxJump<.055,`hip jump ${maxJump}`);
  const hips=r.pos('hips');assert.ok(Math.abs(hips.x-STUDENT_CHAIR.x)<.01);assert.ok(Math.abs(hips.z-STUDENT_CHAIR.z)<.015);
  assert.ok(Math.abs(hips.y-(STUDENT_CHAIR.y+STUDENT_CHAIR.seatHeight+.125))<.01);
  for(const side of ['left','right'])assert.ok(angle(r.pos(side+'UpperLeg'),r.pos(side+'LowerLeg'),r.pos(side+'Foot'))<2,'knees must bend for sitting');
  r.motion.setAction('idle');r.step(.45);assert.equal(r.motion.label,'Standing up');
  r.motion.setAction('sit');r.step(2);assert.equal(r.motion.label,'Seated');
  const beforeRun=r.root.position.clone();let runSpeed=0;
  r.motion.setAction('run');r.step(8,()=>{runSpeed=Math.max(runSpeed,r.motion.inspect().speed);});assert.equal(r.motion.label,'Running');
  assert.ok(runSpeed>1.5);assert.ok(r.root.position.distanceTo(beforeRun)>.5);
});

test('rapid action changes and invalid time deltas do not break the rig',()=>{
  const r=studentRig();for(const a of ['walk','sit','wave','run','idle','sit','walk','run','sit']){r.motion.setAction(a);r.step(.2);}
  for(const dt of [NaN,Infinity,-1,4,0])r.motion.update(dt);
  r.step(25);assert.equal(r.motion.label,'Seated');
  for(const {node} of Object.values(r.humanoid.normalizedHumanBones))assert.ok([...node.position,...node.quaternion].every(Number.isFinite));
});

test('reduced motion uses static poses with no locomotion',()=>{
  const r=studentRig({reducedMotion:true});const p=r.root.position.clone();
  for(const a of ['walk','run','wave']){r.motion.setAction(a);r.step(2);assert.ok(r.root.position.distanceTo(p)<1e-8);}
  r.motion.setAction('sit');r.step(1);assert.equal(r.motion.label,'Seated');
  r.motion.setAction('idle');r.step(1);assert.equal(r.motion.label,'Standing');assert.equal(r.motion.inspect().seat,0);
});


test('reversing sit and rise mid-motion keeps the pelvis continuous',()=>{
  const r=studentRig();r.motion.setAction('sit');r.step(15);
  for(const wait of [.2,.45,.7]) {
    r.motion.setAction('idle');r.step(wait);
    const p=r.pos('hips');r.motion.setAction('sit');r.step(1/60);
    assert.ok(r.pos('hips').distanceTo(p)<.018,'reversal must preserve transition progress');
    r.step(2);
  }
});

test('standing relaxes the knees and leaving the chair moves forward before returning to the route',()=>{
  const r=studentRig();
  for(const side of ['left','right'])assert.ok(angle(r.pos(side+'UpperLeg'),r.pos(side+'LowerLeg'),r.pos(side+'Foot'))>2.8);
  r.motion.setAction('sit');r.step(20);assert.equal(r.motion.label,'Seated');
  r.motion.setAction('run');let cleared=false;
  r.step(5,()=>{const s=r.motion.inspect();if(s.stage==='moving'&&!cleared){assert.ok(r.root.position.z>=STUDENT_CHAIR.z+.33,'must not run through the seat');cleared=r.root.position.z>STUDENT_CHAIR.z+.9;}});
  assert.ok(cleared);
});
