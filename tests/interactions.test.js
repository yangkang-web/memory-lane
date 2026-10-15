import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createCompanionInteractions } from '../src/companion-interactions.js';
import { stateAt } from '../src/last-companion-timeline.js';

test('carried props rewind to their original parent and pose, and leave no props in free roam',()=>{
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(),room=new T.Group(),rig=new T.Group();scene.add(camera,room);camera.add(rig);
  const make=()=>{const o=new T.Group();room.add(o);o.position.set(1,2,3);return o;};
  const items={tin:make(),halfWater:make(),bag:make(),power:make(),water:[make(),make()],bandage:make(),biscuits:make(),lemons:make(),terminal:make(),cable:make()};
  const arms=[0,1].map(()=>{const elbow=new T.Group(),palm=new T.Group();rig.add(elbow);elbow.add(palm);palm.userData.grip=()=>{};return {elbow,palm,reach(p){elbow.position.copy(p);}};});
  const interactions=createCompanionInteractions(camera,{items},{rig,playerArms:arms},new T.Group());
  function frame(t){camera.updateMatrixWorld(true);interactions.update(stateAt(t));scene.updateMatrixWorld(true);}
  frame(9);const pose=items.tin.matrixWorld.clone();assert.equal(items.tin.parent,camera);
  frame(23);frame(85);frame(9);assert.deepEqual(items.tin.matrixWorld.elements,pose.elements);
  frame(0);for(const o of [items.tin,items.halfWater,items.bag,items.power,...items.water,items.bandage,items.biscuits,items.lemons]){assert.equal(o.parent,room);assert.deepEqual(o.position.toArray(),[1,2,3]);}
  frame(65);assert.equal(items.water[0].parent,camera);frame(66.65);assert.equal(items.water[0].visible,false,'bottle is hidden only after insertion');
  frame(23);interactions.hide();assert.equal(items.power.parent,room);assert.equal(camera.children.filter(o=>o.visible&&o!==rig).length,1,'only the existing terminal remains; connection is hidden');
  interactions.dispose();
});
