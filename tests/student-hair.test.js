import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {applyCombedBackHair} from '../src/student-hair.js';

test('rear hair refit preserves the fringe, rig, atlas and original shared buffers',()=>{
  const bytes=readFileSync(new URL('../public/assets/characters/sakurada-fumiriya.vrm',import.meta.url));
  const length=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+length)),binary=28+length;
  const attributes=new Map();
  const read=index=>{
    if(attributes.has(index))return attributes.get(index);
    const a=gltf.accessors[index],view=gltf.bufferViews[a.bufferView];
    const size={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];
    const [Type,width,method]={5126:[Float32Array,4,'readFloatLE'],5123:[Uint16Array,2,'readUInt16LE'],5125:[Uint32Array,4,'readUInt32LE']}[a.componentType];
    const data=new Type(a.count*size);
    for(let i=0;i<a.count;i++)for(let j=0;j<size;j++)data[i*size+j]=bytes[method](binary+(view.byteOffset??0)+(a.byteOffset??0)+i*(view.byteStride??size*width)+j*width);
    const result=new T.BufferAttribute(data,size);attributes.set(index,result);return result;
  };
  const scene=new T.Group(),records=[];
  for(const mesh of gltf.meshes)for(const p of mesh.primitives) {
    if(!gltf.materials[p.material].name.includes('Hair'))continue;
    const geometry=new T.BufferGeometry();
    for(const [name,key] of Object.entries({position:'POSITION',normal:'NORMAL',uv:'TEXCOORD_0',skinIndex:'JOINTS_0',skinWeight:'WEIGHTS_0'}))geometry.setAttribute(name,read(p.attributes[key]));
    geometry.setIndex(read(p.indices));
    const material=new T.MeshStandardMaterial({name:gltf.materials[p.material].name,map:new T.Texture()});
    const object=new T.SkinnedMesh(geometry,material);scene.add(object);
    records.push({object,geometry,material,before:geometry.attributes.position.array.slice()});
  }
  applyCombedBackHair({scene});
  let changed=0,oldRear=0,newRear=0;
  for(const {object,geometry,material,before} of records) {
    assert.deepEqual(geometry.attributes.position.array,before,'source asset remains reusable');
    assert.equal(object.material,material);
    if(material.name.includes('HairBack')){assert.equal(object.geometry,geometry);continue;}
    for(const name of ['uv','skinIndex','skinWeight'])assert.deepEqual(object.geometry.attributes[name].array,geometry.attributes[name].array);
    assert.deepEqual(object.geometry.index.array,geometry.index.array);
    const p=object.geometry.attributes.position,n=object.geometry.attributes.normal;
    for(let i=0;i<p.count;i++) {
      const old=[...before.slice(i*3,i*3+3)],next=[p.getX(i),p.getY(i),p.getZ(i)];
      assert.ok(next.every(Number.isFinite));
      assert.ok([n.getX(i),n.getY(i),n.getZ(i)].every(Number.isFinite));
      if(old[2]<=0||old[1]>=1.905)assert.deepEqual(next,old,'front fringe and crown roots must remain intact');
      else {
        assert.ok(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<.001,'deformed normals stay normalized');
        assert.ok(next[1]<=old[1]+1e-7,'rear tips comb downward');
        if(Math.abs(next[2]-old[2])>.01)changed++;
        oldRear=Math.max(oldRear,old[2]);newRear=Math.max(newRear,next[2]);
      }
    }
  }
  assert.ok(changed>100,'reshape actual rear strands');
  assert.ok(newRear<oldRear-.025,'remove the pronounced backward projection');
});
