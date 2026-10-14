import test from 'node:test';
import assert from 'node:assert/strict';
import { HOME, HOME_OBSTACLES, canOccupy, moveWithCollisions, floorHeight } from '../src/walk-layout.js';

test('the interior spawn and the full doorway route are walkable both ways',()=>{
  assert.ok(canOccupy(HOME.spawn.x,HOME.spawn.z,HOME_OBSTACLES));
  for(const route of [HOME.route,[...HOME.route].reverse()]) {
    let position={...route[0]};
    for(const destination of route.slice(1)) {
      position=moveWithCollisions(position,destination.x-position.x,destination.z-position.z,HOME_OBSTACLES);
      assert.ok(Math.hypot(position.x-destination.x,position.z-destination.z)<.001,`Blocked on route to ${JSON.stringify(destination)}`);
    }
  }
});
test('a long movement cannot tunnel through the dirty north wall',()=>{
  const position=moveWithCollisions({x:-24,z:38},0,-12,HOME_OBSTACLES);
  assert.ok(position.z>=36.39&&position.z<36.5);
});
test('the open doorway passes a person, but adjacent wall and door leaf remain solid',()=>{
  const doorway=moveWithCollisions({x:-20.3,z:40.9},5.3,0,HOME_OBSTACLES);
  assert.ok(Math.abs(doorway.x+15)<.001);
  const wall=moveWithCollisions({x:-23,z:43.1},10,0,HOME_OBSTACLES);
  assert.ok(wall.x< -17.38);
  const leaf=moveWithCollisions({x:-21.5,z:39.9},6,0,HOME_OBSTACLES);
  assert.ok(leaf.x< -19.49);
});
test('diagonal movement slides along walls instead of locking the player',()=>{
  const position=moveWithCollisions({x:-26.9,z:42},-2,1,HOME_OBSTACLES);
  assert.ok(position.x> -27.12);
  assert.ok(position.z>42.9);
});
test('eye height follows the house and pavement onto the lower street',()=>{
  assert.equal(floorHeight(HOME.spawn),.3);
  assert.equal(floorHeight({x:-15,z:40.9}),.3);
  assert.equal(floorHeight({x:-8,z:40.9}),.08);
  assert.equal(canOccupy(NaN,0,HOME_OBSTACLES),false);
  assert.equal(canOccupy(300,0,HOME_OBSTACLES),false);
});
test('the expanded avenue and cross street continue beyond the old map limits',()=>{
  assert.ok(canOccupy(0,220,HOME_OBSTACLES));
  assert.ok(canOccupy(210,19,HOME_OBSTACLES));
  assert.equal(floorHeight({x:150,z:31}),.3);
  assert.equal(floorHeight({x:150,z:19}),.08);
  assert.equal(canOccupy(0,300,HOME_OBSTACLES),false);
});
