import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { loadGeometry } from './helpers/character-glb.js';
import { createStoryActors } from '../src/story-actors.js';
import { createInfectedCrowdAssets } from '../src/infected-crowd-assets.js';
import { createCharacterAssets } from '../src/story-character-assets.js';

// Parse the delivered vertex/bone buffers. Only image decoding is omitted in Node;
// actual materials and visual acceptance are checked in the browser.

test('delivered skinned assets follow contact joints, stay finite, rewind, and hide the amputated forearm',async()=>{
  const original=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},putImageData(){},createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})})})};
  let actors;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera();
  try{actors=createStoryActors(scene,camera);}finally{globalThis.document=original;}
  const assets=createCharacterAssets(actors,loadGeometry);
  try{
    await assets.ready;
    const survivor=actors.companion.root.getObjectByName('codersan / survivor reflection');assert.ok(survivor);
    const mirrorHands=actors.companion.root.getObjectByName('DJMaesen / reflected gloves');assert.ok(mirrorHands);
    const model=actors.rig.getObjectByName('DJMaesen / skinned first-person arms');assert.ok(model);
    let skin;model.traverse(o=>{if(o.isSkinnedMesh)skin=o;});
    function pose(t){actors.rig.visible=true;actors.firstPerson(24+t,'pull');actors.enemies.forEach((a,i)=>{a.root.visible=i===1;a.pose(t,'run');});assets.update();scene.updateMatrixWorld(true);skin.skeleton.update();}
    pose(0);
    const initial=skin.skeleton.bones.map(b=>b.matrixWorld.toArray());
    pose(3);pose(0);
    assert.deepEqual(skin.skeleton.bones.map(b=>b.matrixWorld.toArray()),initial,'replay must not accumulate bone transforms');
    const enemy=actors.enemies[1],infected=enemy.root.getObjectByName('LokitoBlu / infected 2');
    let hands;infected.traverse(o=>{if(o.userData.infectedGrip)hands=o;});assert.ok(hands,'authored fingers need a grip deformation');
    enemy.arms[0].palm.userData.grip(.8);enemy.arms[1].palm.userData.grip(0);assets.update();
    assert.deepEqual(hands.morphTargetInfluences,[1,0],'left grip must not curl the released right hand');
    const rest=hands.geometry.attributes.position,closed=hands.geometry.morphAttributes.position[0];let curled=0;
    for(let i=0;i<rest.count;i++){
      if(rest.getX(i)>.89&&rest.getZ(i)<-.018){assert.ok(closed.getX(i)<rest.getX(i));curled++;}
      if(rest.getX(i)<0)assert.equal(closed.getX(i),rest.getX(i),'left shape must preserve right-hand vertices');
    }
    assert.ok(curled>30,'grip must deform the delivered fingertips, not just a proxy');
    pose(0);assert.ok(hands.morphTargetInfluences.every(v=>Math.abs(v-.675)<1e-6),'rewind must restore the running grip');
    const wrist=skin.skeleton.bones.find(b=>b.name.startsWith('R_wrist_'));
    assert.ok(wrist.getWorldPosition(new T.Vector3()).distanceTo(actors.playerArms[1].palm.getWorldPosition(new T.Vector3()))<1e-6);
    const p=new T.Vector3();
    scene.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();for(let i=0;i<o.geometry.attributes.position.count;i+=13){o.getVertexPosition(i,p);assert.ok(p.toArray().every(Number.isFinite),`invalid skin vertex in ${o.name}`);}}});
    actors.playerArms[0].elbow.visible=false;assets.update();assert.equal(skin.material[0].visible,false);assert.equal(skin.material[1].visible,false);assert.equal(skin.material[3].visible,true);
    actors.playerArms[0].elbow.visible=true;assets.update();assert.equal(skin.material[1].visible,true);
    const giant=actors.enemies[8];giant.root.visible=true;giant.pose(0,'idle');giant.root.scale.set(1,1,1);assets.update();
    const giantSkin=giant.root.getObjectByName('LokitoBlu / infected 9');let hips;giantSkin.traverse(o=>{if(o.isBone&&o.name==='hips')hips=o;});
    const restHip=giant.body.worldToLocal(hips.getWorldPosition(new T.Vector3()));
    giant.root.scale.set(1.8,2.2,1.8);assets.update();
    const scaled=giant.body.worldToLocal(hips.getWorldPosition(new T.Vector3()));
    assert.ok(restHip.distanceTo(scaled)<1e-5,'giant torso must preserve its local offset under nonuniform scaling');
  }finally{assets.dispose();actors.dispose();}
});


test('crowd atlas contains grounded textured-mesh poses and deterministically instances all 56 actors',async()=>{
  const root=new T.Group(),assets=createInfectedCrowdAssets(root,56,loadGeometry);
  try{
    await assets.ready;assert.ok(root.children.length>=32);
    for(const mesh of root.children){
      assert.ok(mesh.isInstancedMesh);assert.ok(mesh.geometry.index.count>=9000);
      const p=mesh.geometry.attributes.position;
      for(const value of p.array)assert.ok(Number.isFinite(value),'finite baked vertices');
      mesh.geometry.computeBoundingBox();const box=mesh.geometry.boundingBox;
      assert.ok(box.min.y>=-1e-5&&box.min.y<.3);assert.ok(box.max.y>1.5&&box.max.y<2.2);
    }
    const matrix=new T.Matrix4();
    const fill=time=>{assets.begin();for(let i=0;i<56;i++)assets.write(i,time,true,false,matrix.makeTranslation(i,0,0));assets.end();};
    fill(350);const counts=root.children.map(m=>m.count);assert.equal(counts.reduce((a,b)=>a+b,0),56);
    const snapshot=root.children.map(m=>Array.from(m.instanceMatrix.array.slice(0,m.count*16)));
    fill(351);fill(350);assert.deepEqual(root.children.map(m=>Array.from(m.instanceMatrix.array.slice(0,m.count*16))),snapshot);
    assets.begin();assets.end();assert.equal(root.children.reduce((n,m)=>n+m.count,0),0);
  }finally{assets.dispose();}assert.equal(root.children.length,0);
});

test('detailed infected skin stays grounded across large world moves and collapsed poses',async()=>{
  const original=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},putImageData(){},createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})})})};
  const scene=new T.Scene(),camera=new T.PerspectiveCamera();let actors;
  try{actors=createStoryActors(scene,camera);}finally{globalThis.document=original;}
  const assets=createCharacterAssets(actors,loadGeometry);
  try{
    await assets.ready;const actor=actors.enemies[1],model=actor.root.getObjectByName('LokitoBlu / infected 2');
    actors.enemies.forEach(a=>a.root.visible=a===actor);
    for(const [x,floor,z,time,pose] of [[30,.3,40,0,'idle'],[37,.3,45,1,'run'],[3,-6.9,114,2,'walk'],[28,.3,44,3,'down'],[30,.3,40,0,'idle']]){
      actor.root.position.set(x,floor,z);actor.root.rotation.y=time;actor.root.userData.floorY=floor;actor.pose(time,pose);
      assets.update();scene.updateMatrixWorld(true);
      let lowest=Infinity;const point=new T.Vector3();
      model.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();for(let i=0;i<o.geometry.attributes.position.count;i++){o.getVertexPosition(i,point).applyMatrix4(o.matrixWorld);assert.ok(point.toArray().every(Number.isFinite));lowest=Math.min(lowest,point.y);}}});
      assert.ok(Math.abs(lowest-floor)<.015,`${pose}: sole ${lowest}, floor ${floor}`);
    }
  }finally{assets.dispose();actors.dispose();}
});
