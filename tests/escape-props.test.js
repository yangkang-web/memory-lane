import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {dragFence} from '../src/companion-fence.js';
import {gatePose,maintenanceAngle} from '../src/companion-door-escape.js';
import {metroCrowdPosition} from '../src/companion-horde.js';
import {stateAt} from '../src/last-companion-timeline.js';

test('station extras remain outside the maintenance room and clear its camera route',()=>{
  for(let t=381;t<=402;t+=.1)for(let i=0;i<20;i++){
    const p=metroCrowdPosition(i,t),camera=stateAt(t).camera;
    assert.ok(p.x<4||p.z<120.4,'background pursuer entered the maintenance room');
    assert.ok(Math.hypot(p.x-camera[0],p.z-camera[2])>1.1,'background pursuer intersects the near camera');
  }
});

test('dragged fence stays in the hand while its trailing rail rests on the plaza',()=>{
  const fence=new T.Group();
  for(const height of [1.8,2.2,2.5])for(const t of [433,440,468]){
    const hand=new T.Vector3(.9,height,176-(t-433)*.14);
    dragFence(fence,hand,t);
    assert.ok(fence.localToWorld(new T.Vector3(-1.6,.15,0)).distanceTo(hand)<1e-6);
    for(const y of [0,.15,1.2])assert.ok(Math.abs(fence.localToWorld(new T.Vector3(1.6,y,0)).y-.25)<1e-6);
  }
});

test('the exit stays closed for two impacts, loses its lock on the third, and rewinds',()=>{
  assert.equal(gatePose(414).fall,0);assert.equal(gatePose(417).fall,0);
  assert.equal(gatePose(414).lock,0);assert.equal(gatePose(417).lock,1);
  assert.ok(gatePose(420).fall>1.4);assert.equal(gatePose(420).broken,1);
  assert.deepEqual(gatePose(411),{fall:0,shake:0,lock:0,broken:0});
  assert.equal(maintenanceAngle(394),0);assert.ok(maintenanceAngle(410)>1);
});
