import test from 'node:test';
import assert from 'node:assert/strict';
import { characters } from '../src/school/characters.js';
import { studentRig } from './helpers/student-rig.js';

test('the two shipped character rigs keep independent actions and reach their own chairs',()=>{
  const [fumiriya,shino]=characters.map(character=>studentRig({character,skeletonOnly:true}));
  const maleStart=fumiriya.root.position.clone();
  shino.motion.setAction('walk');shino.step(8);fumiriya.step(8);
  assert.equal(fumiriya.motion.action,'idle');
  assert.ok(fumiriya.root.position.distanceTo(maleStart)<1e-8);
  assert.ok(shino.root.position.distanceTo(maleStart)>1);
  fumiriya.motion.setAction('wave');shino.motion.setAction('sit');
  shino.step(35);fumiriya.step(2);
  assert.equal(fumiriya.motion.action,'wave');
  assert.equal(shino.motion.label,'Seated');
  const chair=characters[1].chair,hips=shino.pos('hips');
  assert.ok(Math.abs(hips.x-chair.x)<.015);
  assert.ok(Math.abs(hips.z-chair.z)<.02);
  for(const person of [fumiriya,shino])for(const {node} of Object.values(person.humanoid.normalizedHumanBones)){
    assert.ok([...node.position,...node.quaternion].every(Number.isFinite));
  }
  shino.motion.setAction('run');shino.step(8);
  assert.equal(shino.motion.label,'Running');
  assert.equal(fumiriya.motion.action,'wave');
});

test('Shino respects reduced motion for locomotion and her separate seat',()=>{
  const character=characters[1],shino=studentRig({character,reducedMotion:true,skeletonOnly:true});
  const start=shino.root.position.clone();
  shino.motion.setAction('run');shino.step(2);
  assert.ok(shino.root.position.distanceTo(start)<1e-8);
  shino.motion.setAction('sit');shino.step(1);
  assert.equal(shino.motion.label,'Seated');
  assert.ok(Math.abs(shino.pos('hips').x-character.chair.x)<.015);
});
