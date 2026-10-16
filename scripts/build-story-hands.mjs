// Bake cropped hand poses from the bundled CC0 Shino rig. No external assets.
import fs from 'node:fs';
import * as T from 'three';
const bytes=fs.readFileSync('public/assets/characters/sendagaya-shino.vrm');
const g=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12))),binary=28+bytes.readUInt32LE(12);
const nodes=g.nodes.map(n=>{const o=new T.Object3D();if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);return o;});
g.nodes.forEach((n,i)=>n.children?.forEach(j=>nodes[i].add(nodes[j])));
const scene=new T.Group();g.scenes[g.scene].nodes.forEach(i=>scene.add(nodes[i]));scene.updateMatrixWorld(true);
const bones=Object.fromEntries(g.extensions.VRM.humanoid.humanBones.map(b=>[b.bone,nodes[b.node]]));
const read=index=>{const a=g.accessors[index],v=g.bufferViews[a.bufferView],size={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type];const [method,width]={5126:['readFloatLE',4],5125:['readUInt32LE',4],5123:['readUInt16LE',2],5121:['readUInt8',1]}[a.componentType];return Array.from({length:a.count*size},(_,i)=>bytes[method](binary+(v.byteOffset??0)+(a.byteOffset??0)+Math.floor(i/size)*(v.byteStride??size*width)+(i%size)*width));};
const sourceNode=g.nodes.find(n=>n.mesh!==undefined&&g.meshes[n.mesh].name==='Body.baked'),skin=g.skins[sourceNode.skin];
const primitives=g.meshes[sourceNode.mesh].primitives.filter(p=>g.materials[p.material].name.endsWith('_SKIN'));
const inverse=read(skin.inverseBindMatrices),inverseMatrices=skin.joints.map((_,i)=>new T.Matrix4().fromArray(inverse,i*16));
const wrist=bones.leftHand.getWorldPosition(new T.Vector3());
const output={provenance:'Cropped from Sendagaya Shino, VRoid Project / pixiv, CC0; bundled source unchanged.'};
// Left-hand local frame: X across palm towards thumb, Y towards fingers,
// Z out of the back of the hand. Keep the forearm crop under the cuff.
const toLocal=v=>new T.Vector3(-(v.z-wrist.z),-(v.x-wrist.x),v.y-wrist.y).multiplyScalar(.9);
for(const pose of ['paper','phone']){
 for(const n of Object.values(bones))n.quaternion.identity();
 for(const [i,finger] of ['Index','Middle','Ring','Little'].entries()){
  const angles=pose==='phone'?[.30+i*.07,.75,.48]:[.15+i*.13,.35+i*.10,.20];
  ['Proximal','Intermediate','Distal'].forEach((part,j)=>bones['left'+finger+part].rotation.z=angles[j]);
 }
 // Oppose the thumb across the palm rather than extending a cylindrical hook.
 bones.leftThumbProximal.rotation.set(.45,.08,pose==='phone'?-.65:-.2);
 bones.leftThumbIntermediate.rotation.set(.2,.06,pose==='phone'?.55:-.12);
 bones.leftThumbDistal.rotation.set(.08,0,-.08);
 scene.updateMatrixWorld(true);
 const matrices=skin.joints.map((n,i)=>new T.Matrix4().multiplyMatrices(nodes[n].matrixWorld,inverseMatrices[i]));
 const positions=[],uvs=[],indices=[];
 for(const p of primitives){
  const pos=read(p.attributes.POSITION),uv=read(p.attributes.TEXCOORD_0),weight=read(p.attributes.WEIGHTS_0),joint=read(p.attributes.JOINTS_0),idx=read(p.indices),remap=new Map();
  const keep=i=>{const v=new T.Vector3().fromArray(pos,i*3);return v.x<wrist.x+.045&&v.x>wrist.x-.21&&Math.abs(v.y-wrist.y)<.10;};
  const add=i=>{if(remap.has(i))return remap.get(i);const source=new T.Vector3().fromArray(pos,i*3),v=new T.Vector3();for(let k=0;k<4;k++)if(weight[i*4+k])v.addScaledVector(source.clone().applyMatrix4(matrices[joint[i*4+k]]),weight[i*4+k]);const point=toLocal(v),id=positions.length/3;positions.push(...point.toArray().map(n=>+n.toFixed(6)));uvs.push(uv[i*2],uv[i*2+1]);remap.set(i,id);return id;};
  for(let i=0;i<idx.length;i+=3)if([idx[i],idx[i+1],idx[i+2]].every(keep))indices.push(add(idx[i]),add(idx[i+1]),add(idx[i+2]));
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 output[pose]={positions,normals:Array.from(geometry.attributes.normal.array).map(n=>+n.toFixed(5)),uvs,indices};
 console.log(pose,positions.length/3,'vertices',indices.length/3,'triangles',new T.Box3().setFromBufferAttribute(geometry.attributes.position));
}
fs.mkdirSync('src/data',{recursive:true});fs.writeFileSync('src/data/story-hands.json',JSON.stringify(output));

const material=g.materials[primitives[0].material],image=g.images[g.textures[material.pbrMetallicRoughness.baseColorTexture.index].source],view=g.bufferViews[image.bufferView];
fs.writeFileSync('public/assets/characters/story-hand-skin.png',bytes.subarray(binary+view.byteOffset,binary+view.byteOffset+view.byteLength));
