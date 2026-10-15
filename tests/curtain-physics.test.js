import test from 'node:test';
import assert from 'node:assert/strict';
import { createCurtainSimulation } from '../src/school/curtain-physics.js';

test('cloth moves under wind while hooks and tie remain fixed and the sill stays clear',()=>{
  const cloth=createCurtainSimulation();
  for(let i=0;i<600;i++)cloth.step(1/60);
  let displacement=0;
  for(let i=0;i<cloth.pinned.length;i++) {
    for(let axis=0;axis<3;axis++) {
      const n=i*3+axis;
      assert.ok(Number.isFinite(cloth.positions[n]));
      if(cloth.pinned[i])assert.equal(cloth.positions[n],cloth.rest[n]);
      else displacement=Math.max(displacement,Math.abs(cloth.positions[n]-cloth.rest[n]));
    }
    assert.ok(cloth.positions[i*3+2]>=-.070001 && cloth.positions[i*3+2]<=.380001);
    assert.ok(cloth.positions[i*3+1]>=-1.707);
  }
  assert.ok(displacement>.01 && displacement<.5);
  const before=cloth.positions.slice();
  for(let i=0;i<120;i++)cloth.step(1/60);
  assert.ok(cloth.positions.some((p,i)=>Math.abs(p-before[i])>.002));
});

test('fixed steps agree across frame rates, long gaps are bounded, reset restores the drape',()=>{
  const fast=createCurtainSimulation(),slow=createCurtainSimulation();
  for(let i=0;i<240;i++)fast.step(1/120);
  for(let i=0;i<60;i++)slow.step(1/30);
  assert.deepEqual(fast.positions,slow.positions);
  const resumed=createCurtainSimulation(),bounded=createCurtainSimulation();
  resumed.step(30);bounded.step(.05);assert.deepEqual(resumed.positions,bounded.positions);
  resumed.reset();assert.deepEqual(resumed.positions,resumed.rest);
  assert.equal(resumed.step(Number.NaN),false);
});


test('window panels retain their anchors and clearance under different wind strengths',()=>{
  const sheltered=createCurtainSimulation({windStrength:.65,phase:.8});
  const exposed=createCurtainSimulation({windStrength:1,phase:.8});
  for(let i=0;i<300;i++){sheltered.step(1/60);exposed.step(1/60);}
  assert.ok(sheltered.positions.some((v,i)=>Math.abs(v-exposed.positions[i])>.001));
  for(const cloth of [sheltered,exposed])for(let i=0;i<cloth.pinned.length;i++){
    assert.ok(Number.isFinite(cloth.positions[i*3+2]));
    assert.ok(cloth.positions[i*3+2]>=-.070001&&cloth.positions[i*3+2]<=.380001);
    if(cloth.pinned[i])for(let axis=0;axis<3;axis++)assert.equal(cloth.positions[i*3+axis],cloth.rest[i*3+axis]);
  }
});
