import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {applySummerUniform} from '../src/student-outfit.js';

test('summer shirt preserves skin weights and isolates shared body buffers',()=>{
  const bytes=readFileSync(new URL('../public/assets/characters/sakurada-fumiriya.vrm',import.meta.url));
  const jsonLength=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+jsonLength));
  const binaryStart=28+jsonLength;
  const accessor=index=>{
    const a=gltf.accessors[index],view=gltf.bufferViews[a.bufferView];
    const size={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];
    const [ArrayType,width,read]={5126:[Float32Array,4,'readFloatLE'],5123:[Uint16Array,2,'readUInt16LE'],5125:[Uint32Array,4,'readUInt32LE']}[a.componentType];
    const values=new ArrayType(a.count*size);
    for(let i=0;i<values.length;i++)values[i]=bytes[read](binaryStart+(view.byteOffset??0)+(a.byteOffset??0)+Math.floor(i/size)*(view.byteStride??size*width)+(i%size)*width);
    return new T.BufferAttribute(values,size);
  };
  const scene=new T.Group(),meshes=[];
  const primitive=gltf.meshes[1].primitives.find(p=>gltf.materials[p.material].name.includes('_Tops_'));
  const shared=Object.fromEntries(Object.entries({position:'POSITION',normal:'NORMAL',uv:'TEXCOORD_0',skinIndex:'JOINTS_0',skinWeight:'WEIGHTS_0'}).map(([key,value])=>[key,accessor(primitive.attributes[value])]));
  for(const p of gltf.meshes[1].primitives) {
    const geometry=new T.BufferGeometry();
    for(const [key,value] of Object.entries(shared))geometry.setAttribute(key,value);
    geometry.setIndex(accessor(p.indices));
    const material=new T.MeshPhysicalMaterial({name:gltf.materials[p.material].name+' · campus fabric',map:new T.Texture()});
    const mesh=new T.SkinnedMesh(geometry,material);scene.add(mesh);meshes.push(mesh);
  }
  const originalPositions=shared.position.array.slice();
  const top=meshes.find(m=>m.material.name.includes('_Tops_'));
  const oldGeometry=top.geometry;
  const updateSeat=applySummerUniform({scene});
  assert.notEqual(top.geometry,oldGeometry);
  assert.deepEqual(shared.position.array,originalPositions,'changing the hem must not move body/pants vertices');
  for(const attr of ['skinIndex','skinWeight','uv'])assert.deepEqual(top.geometry.attributes[attr].array.subarray(0,shared[attr].array.length),shared[attr].array);
  assert.equal(top.geometry.index.count,oldGeometry.index.count*4,'refine the cloth without dropping panels');
  const joints=top.geometry.attributes.skinIndex,weights=top.geometry.attributes.skinWeight;
  for(let i=0;i<weights.count;i++) {
    let total=0;
    for(let j=0;j<4;j++) {
      total+=weights.array[i*4+j];
      assert.ok(Number.isInteger(joints.array[i*4+j]));
    }
    assert.ok(Math.abs(total-1)<.001,'new fabric vertices must have normalized bone weights');
  }
  for(const value of top.geometry.attributes.position.array)assert.ok(Number.isFinite(value));
  // A shirt should hang through the stomach, not retain the inflated vest's
  // stomach ridge. Check the real front/back rows, independent of the refit formula.
  const front=[],back=[],p=top.geometry.attributes.position;
  for(const i of new Set(oldGeometry.index.array)) {
    const x=shared.position.getX(i),y=shared.position.getY(i),z=shared.position.getZ(i);
    if(Math.abs(x)<.012&&y>1.16&&y<1.42) {
      if(z<-.06)front.push(p.getZ(i));
      if(z>.04)back.push(p.getZ(i));
    }
  }
  for(const rows of [front,back]) {
    assert.ok(rows.length>5);
    assert.ok(Math.max(...rows)-Math.min(...rows)<.009,'waist rows must not form a protruding band');
  }
  // The upper chest should retain modest cloth clearance, not the roughly
  // 23 mm outward balloon produced by overlapping ease and waist refitting.
  const rest=top.geometry.attributes.garmentRestPosition;
  let chestSamples=0;
  for(const i of new Set(top.geometry.index.array)) {
    if(Math.abs(rest.getX(i))<.08&&rest.getY(i)>1.48&&rest.getY(i)<1.535&&rest.getZ(i)<-.07) {
      chestSamples++;
      assert.ok(rest.getZ(i)-p.getZ(i)<.015,'upper chest must not balloon beyond 15 mm of added ease');
    }
  }
  assert.ok(chestSamples>10,'inspect real upper-chest vertices');
  updateSeat(1);
  assert.equal(top.morphTargetInfluences[0],1);
  let lifted=0;
  for(const i of new Set(top.geometry.index.array)) {
    const lift=top.geometry.morphAttributes.position[0].getY(i);
    assert.ok(lift>=0&&lift<=.095001,'seated tail must lift within the bounded correction');
    if(lift>.025)lifted++;
  }
  assert.ok(lifted>10,'support the front tail on the thighs');
  updateSeat(.4);assert.equal(top.morphTargetInfluences[0],.4);
  updateSeat(0);assert.equal(top.morphTargetInfluences[0],0);
  assert.equal(top.material.map,null,'old vest artwork must not survive');
  assert.equal(top.material.emissive.getHex(),0,'white cotton still relies on scene light');
  assert.equal(meshes.find(m=>m.material.name.includes('_Accessory_')).visible,false);
  assert.ok(meshes.filter(m=>!m.material.name.includes('_Accessory_')).every(m=>m.visible));
  for(const mesh of meshes.filter(m=>m!==top))assert.equal(mesh.geometry.attributes.position,shared.position);
});
