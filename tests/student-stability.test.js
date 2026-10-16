import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {VRMSpringBoneJoint,VRMSpringBoneManager} from '@pixiv/three-vrm';
import {createStudentStability,createStudentFade} from '../src/student-stability.js';
import {studentRig} from './helpers/student-rig.js';

function fixture(){
 const rig=studentRig({skeletonOnly:true});
 const head=rig.humanoid.getRawBoneNode('head'),hair=new T.Bone(),tip=new T.Bone();
 hair.position.set(.04,.06,.03);tip.position.set(0,-.14,.025);head.add(hair);hair.add(tip);
 rig.root.updateWorldMatrix(true,true);
 const springs=new VRMSpringBoneManager();
 springs.addJoint(new VRMSpringBoneJoint(hair,tip,{stiffness:.8,gravityPower:.2,dragForce:.4}));springs.setInitState();
 const model={springBoneManager:springs,update(dt){rig.humanoid.update();springs.update(dt);}};
 const stability=createStudentStability(model,rig.root);
 return {...rig,hair,tip,head,stability};
}

test('teleporting a settled character yields the same hair pose as initializing at the destination',()=>{
 const moved=fixture(),fresh=fixture();moved.stability.update(0);
 for(let i=0;i<60;i++)moved.stability.update(1/60);
 for(const rig of [moved,fresh]){rig.motion.relocate([-33.45,.52,-25.68]);rig.root.rotation.y=-.44;rig.motion.update(0);rig.stability.reset();rig.stability.update(0);}
 assert.ok(moved.hair.quaternion.angleTo(fresh.hair.quaternion)<1e-6);
 assert.ok(moved.tip.getWorldPosition(new T.Vector3()).distanceTo(fresh.tip.getWorldPosition(new T.Vector3()))<1e-6);
 const held=moved.hair.quaternion.clone();for(let i=0;i<20;i++)moved.stability.update(0);
 assert.ok(held.angleTo(moved.hair.quaternion)<1e-6,'paused physics must not settle further');
});

test('a slow frame uses the same stable spring steps as three normal frames',()=>{
 const slow=fixture(),normal=fixture();for(const rig of [slow,normal]){rig.stability.update(0);rig.root.position.x+=.025;}
 slow.stability.update(.05);for(let i=0;i<3;i++)normal.stability.update(1/60);
 assert.ok(slow.hair.quaternion.angleTo(normal.hair.quaternion)<1e-6);
});

test('eye bones retain their position relative to the head through a story relocation',()=>{
 const rig=fixture();rig.stability.update(0);
 const localEyes=()=>['leftEye','rightEye'].map(name=>rig.head.worldToLocal(rig.humanoid.getRawBoneNode(name).getWorldPosition(new T.Vector3())));
 const before=localEyes();rig.motion.relocate([-33.45,.52,-25.68]);rig.motion.update(0);rig.stability.reset();rig.stability.update(0);
 localEyes().forEach((eye,i)=>assert.ok(eye.distanceTo(before[i])<1e-6));
});

test('character fades retain face occlusion and restore the original cutout materials',()=>{
 const root=new T.Group(),skin=new T.MeshStandardMaterial(),hair=new T.MeshStandardMaterial({transparent:true,depthWrite:false,alphaTest:.5,opacity:.8,alphaToCoverage:true});
 root.add(new T.Mesh(new T.BoxGeometry(),skin),new T.Mesh(new T.BoxGeometry(),hair));
 const fade=createStudentFade(root);fade(.25);
 for(const m of [skin,hair]){assert.equal(m.depthWrite,true);assert.equal(m.transparent,false);assert.equal(m.alphaHash,true);assert.equal(m.alphaTest,0);}
 assert.equal(hair.opacity,.2);fade(1);
 assert.equal(skin.transparent,false);assert.equal(skin.depthWrite,true);assert.equal(skin.alphaHash,false);
 assert.equal(hair.transparent,true);assert.equal(hair.depthWrite,false);assert.equal(hair.alphaTest,.5);assert.equal(hair.alphaToCoverage,true);assert.equal(hair.opacity,.8);
});
