import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('public/assets/models');
for(const id of ['tree_small_02','fern_02','nettle_plant','dead_tree_trunk'])test(`${id}: local references, finite vertices and valid optimized indices`,()=>{
  const dir=path.join(root,id),g=JSON.parse(fs.readFileSync(path.join(dir,`${id}.gltf`)));
  for(const resource of [...g.buffers,...g.images]){assert(!/^(https?:|\/|data:)/.test(resource.uri));assert(path.resolve(dir,resource.uri).startsWith(dir+path.sep));assert(fs.statSync(path.join(dir,resource.uri)).size>0);}
  const buffers=g.buffers.map(b=>fs.readFileSync(path.join(dir,b.uri)));
  function read(id){const a=g.accessors[id],v=g.bufferViews[a.bufferView],b=buffers[v.buffer],n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],bytes={5126:4,5125:4,5123:2}[a.componentType],out=[];for(let i=0;i<a.count;i++)for(let k=0;k<n;k++){const offset=(v.byteOffset||0)+(a.byteOffset||0)+i*(v.byteStride||bytes*n)+k*bytes;assert(offset+bytes<=b.length);out.push(a.componentType===5126?b.readFloatLE(offset):a.componentType===5125?b.readUInt32LE(offset):b.readUInt16LE(offset));}return out;}
  for(const m of g.meshes)for(const p of m.primitives){const positions=read(p.attributes.POSITION);assert(positions.every(Number.isFinite));const indices=read(p.indices);assert.equal(indices.length%3,0);assert(indices.every(i=>i>=0&&i<positions.length/3));}
  if(id==='tree_small_02'){assert(g.asset.extras.optimized);assert(g.asset.extras.triangles<180000);assert(g.buffers[0].byteLength<11e6);}
});
