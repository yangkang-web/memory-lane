import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {MToonMaterial} from '@pixiv/three-vrm';
import {adaptStudentMaterials} from '../src/school/student-materials.js';

// Exercise the real material roster of both bundled models. No texture decode
// or WebGL context is needed to check the lighting/alpha/rig contract.
for(const file of ['sakurada-fumiriya','sendagaya-shino'])test(`${file}: every surface responds to scene light without losing alpha or expressions`,()=>{
  const bytes=readFileSync(new URL(`../public/assets/characters/${file}.vrm`,import.meta.url));
  const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  const scene=new T.Group(),records=[];
  for(const definition of gltf.materials) {
    const source=new MToonMaterial({name:definition.name,map:new T.Texture(),
      transparent:definition.alphaMode==='BLEND',alphaTest:definition.alphaMode==='MASK'?.5:0,
      depthWrite:definition.alphaMode!=='BLEND',emissive:new T.Color(.4,.2,.1)});
    source.color.fromArray(definition.pbrMetallicRoughness.baseColorFactor);
    const outline=source.clone();outline.isOutline=true;
    const mesh=new T.SkinnedMesh(new T.BufferGeometry(),[source,outline]);
    mesh.morphTargetInfluences=[.3,.7];
    const record={mesh,source,geometry:mesh.geometry,expression:mesh.morphTargetInfluences};
    records.push(record);scene.add(mesh);
  }
  adaptStudentMaterials({scene});
  for(const {mesh,source,geometry,expression} of records) {
    assert.ok(mesh.material.isMeshStandardMaterial,source.name+' must share campus lighting');
    assert.equal(mesh.material.emissive.getHex(),0,'no illumination-independent glow');
    assert.equal(mesh.receiveShadow,true,'environment must be able to shade the surface');
    assert.equal(mesh.material.map,source.map,'preserve original painted details and alpha');
    assert.equal(mesh.material.transparent,source.transparent);
    assert.equal(mesh.material.alphaTest,source.alphaTest);
    assert.equal(mesh.geometry,geometry);assert.equal(mesh.morphTargetInfluences,expression);
    if(/_FACE$|_EYE$/.test(source.name))assert.equal(mesh.castShadow,false,'face decals must not cast opaque cards');
    if(source.name.includes('HairBack'))assert.equal(mesh.customDepthMaterial.alphaTest,.5,'scalp shadow must respect alpha');
  }
  const front=records.find(r=>r.source.name==='F00_000_Hair_00_HAIR_01').mesh.material;
  const rear=records.find(r=>r.source.name==='F00_000_Hair_00_HAIR_02').mesh.material;
  assert.ok(front.color.equals(rear.color),'retain the unified front/rear hair color');
});
