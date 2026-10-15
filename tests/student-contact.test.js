import test from 'node:test';
import assert from 'node:assert/strict';
import {studentRig} from './helpers/student-rig.js';
import {clothingAudit} from './helpers/mesh-contacts.js';
import {STUDENT_CHAIR as chair} from '../src/school/student-motion.js';

// Exercise turns, backwards chair approach, and changes of action on the real
// shipped mesh; checking only bone endpoints misses fingers and shoe soles.
const sequence=[['walk',12],['run',12],['sit',30],['idle',3],['wave',3],['run',12],['sit',30]];
test('posed shoes and clothing stay outside the floor and chair during transitions',()=>{
  const r=studentRig();let samples=0;
  for(const [action,seconds] of sequence){
    r.motion.setAction(action);let frame=0;
    r.step(seconds,()=>{
      if(frame++%6)return;
      const state=r.motion.inspect();
      for(const {name,position:p} of r.bodyVertices(n=>/Hips|Leg|Foot|Toes/.test(n))){
        if(/Foot|Toes/.test(name))assert.ok(p.y>=chair.y-.001,`${action} ${state.stage}: sole below floor`);
        const overSeat=Math.abs(p.x-chair.x)<.224&&Math.abs(p.z-chair.z)<.214;
        assert.ok(!(overSeat&&p.y>chair.y+chair.seatHeight-.034&&p.y<chair.y+chair.seatHeight-.002),`${action} ${state.stage} cycle ${state.cycle} root ${r.root.position.toArray()} point ${p.toArray()}: ${name} inside chair seat`);
      }
      samples++;
    });
  }
  assert.ok(samples>900);
});

test('hands clear garments, including every fingertip in the final seated pose',()=>{
  const r=studentRig(),audit=clothingAudit(r);
  for(const [action,seconds] of [['idle',1],['walk',8],['run',8],['sit',25],['idle',3],['wave',3]]){
    r.motion.setAction(action);
    for(let i=0;i<seconds*5;i++){
      r.step(.2);const hits=audit(12);
      assert.equal(hits.length,0,`${action} ${r.motion.inspect().stage}: ${hits[0]?.name} penetrates garment`);
    }
    if(action==='sit')assert.equal(audit(1).length,0,'all seated fingers must clear trousers');
  }
});

test('knees keep their hinge, legs stay apart, and wrists and transitions remain bounded',()=>{
  const r=studentRig(),previous=new Map();
  for(const [action,seconds] of sequence){
    r.motion.setAction(action);
    r.step(seconds,()=>{
      for(const side of ['left','right']){
        const knee=r.humanoid.getNormalizedBoneNode(side+'LowerLeg').quaternion;
        assert.ok(2*Math.asin(Math.min(1,Math.hypot(knee.y,knee.z)))<.12,'knee must not twist sideways');
        const hand=r.humanoid.getNormalizedBoneNode(side+'Hand').quaternion;
        assert.ok(2*Math.acos(Math.min(1,Math.abs(hand.w)))<.581,'wrist must not fold excessively');
        for(const joint of ['UpperArm','LowerArm','Hand','UpperLeg','LowerLeg','Foot']){
          const name=side+joint,q=r.humanoid.getNormalizedBoneNode(name).quaternion;
          if(previous.has(name))assert.ok(q.angleTo(previous.get(name))<Math.PI/12,`${action} ${r.motion.inspect().stage} cycle ${r.motion.inspect().cycle}: ${name} jumps ${q.angleTo(previous.get(name))} between frames`);
          previous.set(name,q.clone());
        }
      }
      const l0=r.pos('leftLowerLeg'),l1=r.pos('leftFoot'),r0=r.pos('rightLowerLeg'),r1=r.pos('rightFoot');
      for(let i=0;i<=5;i++)for(let j=0;j<=5;j++)assert.ok(l0.clone().lerp(l1,i/5).distanceTo(r0.clone().lerp(r1,j/5))>.105,'calves must not cross during turns');
    });
  }
});
