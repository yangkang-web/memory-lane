import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { strideFoot, posePursuit, finalePursuer, STRIDE_DISTANCE, STANCE } from '../src/infected-locomotion.js';
import { giantBeat, poseGiant, GIANT_IMPACT } from '../src/giant-impact.js';
import { createStoryActors } from '../src/story-actors.js';
import { createCharacterAssets } from '../src/story-character-assets.js';
import { editStateAt } from '../src/last-companion-edit.js';
import { loadGeometry } from './helpers/character-glb.js';

test('stance foot stays planted in world space as the root advances, and swing clears the road',()=>{
  for(let actor=0;actor<5;actor++)for(let side=0;side<2;side++){
    let previous=null;for(let d=0;d<8;d+=.005){const f=strideFoot(d,side,actor),worldZ=f.position.z-d;
      if(f.planted&&previous?.planted&&f.phase>previous.phase)assert.ok(Math.abs(worldZ-previous.worldZ)<1e-8);
      assert.ok(f.position.y>=.105-1e-8);previous={...f,worldZ};
    }
  }
  assert.ok(strideFoot(STRIDE_DISTANCE*(STANCE+(1-STANCE)/2),0).position.y>.4);
});

test('delivered infected skin plants its sole, supports a flight phase, and rewinds without drift',async()=>{
  const previousDocument=globalThis.document;let actors;
  globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},putImageData(){},createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})})})};
  const scene=new T.Scene(),camera=new T.PerspectiveCamera();
  try{actors=createStoryActors(scene,camera);}finally{globalThis.document=previousDocument;}
  const assets=createCharacterAssets(actors,loadGeometry);
  try{
    await assets.ready;const actor=actors.enemies[0];actors.enemies.forEach(a=>a.root.visible=a===actor);
    const model=actor.root.getObjectByName('LokitoBlu / infected 1');let skin;model.traverse(o=>{if(o.isSkinnedMesh)skin=o;});
    // Only the giant gets the heavier derivative; ordinary pursuers retain their mesh.
    const giant=actors.enemies[8].root.getObjectByName('LokitoBlu / infected 9');
    let giantSkin;giant.traverse(o=>{if(o.isSkinnedMesh&&o.name===skin.name)giantSkin=o;});
    assert.ok(giantSkin);assert.notEqual(giantSkin.geometry,skin.geometry);
    assert.deepEqual(giantSkin.geometry.attributes.uv.array,skin.geometry.attributes.uv.array,'sculpt preserves authored UVs');
    const original=skin.geometry.attributes.position,sculpt=giantSkin.geometry.attributes.position;
    const shirt=model.getObjectByName('Object_3').geometry.attributes.position,heavyShirt=giant.getObjectByName('Object_3').geometry.attributes.position;
    let originalWidth=0,sculptWidth=0,samples=0;
    for(let i=0;i<shirt.count;i++)if(shirt.getY(i)>1&&shirt.getY(i)<1.3&&Math.abs(shirt.getX(i))<.22){originalWidth+=Math.abs(shirt.getX(i));sculptWidth+=Math.abs(heavyShirt.getX(i));samples++;}
    assert.ok(samples>100&&sculptWidth>originalWidth*1.3,'torso is substantially fuller, not just uniformly scaled');
    for(const attr of [sculpt,...giantSkin.geometry.morphAttributes.position,...giantSkin.geometry.morphAttributes.normal]){
      assert.equal(attr.count,original.count);assert.ok(attr.array.every(Number.isFinite));
    }
    assert.equal(giantSkin.geometry.morphAttributes.position.length,skin.geometry.morphAttributes.position.length+1,'grip shapes survive alongside the impact settle');
    const footId=skin.skeleton.bones.findIndex(b=>b.name==='footL'),indices=[],j=skin.geometry.attributes.skinIndex,w=skin.geometry.attributes.skinWeight;
    for(let i=0;i<j.count;i++)for(let k=0;k<4;k++)if(j.getComponent(i,k)===footId&&w.getComponent(i,k)>.9){indices.push(i);break;}
    assert.ok(indices.length>20);
    function sample(d){actor.root.position.set(0,.23,-d);actor.root.rotation.set(0,0,0);actor.root.userData.floorY=.23;actor.pose(d,'run');posePursuit(actor,d,3.8,0);assets.update();scene.updateMatrixWorld(true);skin.skeleton.update();const center=new T.Vector3(),p=new T.Vector3();let min=Infinity;for(const i of indices){skin.getVertexPosition(i,p).applyMatrix4(skin.matrixWorld);center.add(p);min=Math.min(min,p.y);}center.divideScalar(indices.length);return {center,min};}
    const initial=sample(.1);for(const distance of [.2,.35,.5,.6]){const f=sample(distance);assert.ok(Math.abs(f.center.z-initial.center.z)<.003,'rendered support foot must not skate');assert.ok(Math.abs(f.min-.23)<.012,'rendered sole must meet the road');}
    assert.ok(sample(.9).min>.24,'swinging feet need a flight phase above the road');
    sample(4);assert.ok(sample(.1).center.distanceTo(initial.center)<1e-6,'seek must not accumulate a foot correction');
    const heavy=actors.enemies[8];actors.enemies.forEach(a=>a.root.visible=a===heavy);
    const triangle=new T.Triangle(),closest=new T.Vector3();
    for(const time of [14.45,14.65,14.85,15,15.2,15.4,15.6,15.8,16,16.1]){
      heavy.pose(time,'idle');poseGiant(heavy,time);assets.update();scene.updateMatrixWorld(true);
      const eye=new T.Vector3(...editStateAt(time).camera);let clearance=Infinity;
      giant.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;mesh.skeleton.update();
        const vertices=Array.from({length:mesh.geometry.attributes.position.count},(_,i)=>mesh.getVertexPosition(i,new T.Vector3()).applyMatrix4(mesh.matrixWorld));
        const index=mesh.geometry.index?.array||vertices.map((_,i)=>i);
        for(let i=0;i<index.length;i+=3){triangle.set(vertices[index[i]],vertices[index[i+1]],vertices[index[i+2]]);triangle.closestPointToPoint(eye,closest);clearance=Math.min(clearance,closest.distanceTo(eye));}
      });
      assert.ok(clearance>.18,`fall camera must clear the rendered giant at ${time}: ${clearance}`);
    }

  }finally{assets.dispose();actors.dispose();}
});

test('giant accelerates into the crater before compressing, and chase has staggered lanes and phases',()=>{
  const before=giantBeat(GIANT_IMPACT-.001),hit=giantBeat(GIANT_IMPACT),absorb=giantBeat(GIANT_IMPACT+.18);
  assert.ok(before.y>0&&before.y<.1);assert.ok(Math.abs(hit.y)<1e-10);assert.ok(absorb.compression>.99);assert.ok((hit.x/3.2)**2+((hit.z-100)/3.9)**2<1);
  assert.ok(giantBeat(14.3).y-giantBeat(14.4).y>giantBeat(13.7).y-giantBeat(13.8).y,'gravity accelerates descent');
  const runners=Array.from({length:5},(_,i)=>finalePursuer(54,i));
  assert.ok(new Set(runners.map(r=>r.z.toFixed(1))).size===5);
  for(let i=0;i<5;i++)assert.ok(finalePursuer(56,i).z<runners[i].z-7,'pursuers cover real ground');
});
