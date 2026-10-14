import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { ROAD_FRACTURES, nearFracture } from '../src/ruin-layout.js';
import { fracturedAvenue } from '../src/urban-decay.js';
import { HOME, canOccupy } from '../src/walk-layout.js';
const meshes=[],obstacles=[],material=new T.MeshStandardMaterial();
fracturedAvenue({mesh(geometry,mat,x,y,z){const m=new T.Mesh(geometry,mat);m.position.set(x,y,z);meshes.push(m);return m;},asphalt:material,soil:material,concrete:material,range:(a,b)=>(a+b)/2,obstacles});
const top=meshes[0];top.updateMatrixWorld(true);
function surfaceAt(x,z){const ray=new T.Raycaster(new T.Vector3(x,2,z),new T.Vector3(0,-1,0));return ray.intersectObject(top).length>0;}
test('fractures remove real road triangles and leave intact road beside them',()=>{
  for(const f of ROAD_FRACTURES)for(const [x,z]of f.points.slice(1,-1)){assert.equal(surfaceAt(x,z),false);assert.equal(nearFracture(x,z),true);}
  assert.equal(surfaceAt(0,40.9),true);assert.equal(surfaceAt(4,62),true);
});
test('raised root slabs preserve the complete doorway approach',()=>{
  for(let i=1;i<HOME.route.length;i++){const a=HOME.route[i-1],b=HOME.route[i];for(let n=0;n<=30;n++)assert(canOccupy(a.x+(b.x-a.x)*n/30,a.z+(b.z-a.z)*n/30,obstacles));}
  assert(obstacles.length>0);assert.equal(canOccupy(10.1,46.8,obstacles),false);
});
test('fractured road meshes have finite vertices and normals',()=>{
  for(const mesh of meshes)for(const key of ['position','normal','uv'])assert([...mesh.geometry.attributes[key].array].every(Number.isFinite));
});
