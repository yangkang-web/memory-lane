import * as T from 'three';
import { VRMHumanoid } from '@pixiv/three-vrm';
import {readFileSync} from 'node:fs';
import {createStudentMotion} from '../../src/student-motion.js';
import {relaxedShirtPosition,subdivideShirt,seatedShirtOffset} from '../../src/student-outfit.js';

// Use the shipped skeleton and geometry bounds, rather than an idealized rig.
export function studentRig(options={}) {
  const character=options.character;
  const bytes=readFileSync(new URL('../../public'+(character?.file??'/assets/characters/sakurada-fumiriya.vrm'),import.meta.url));
  const g=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  const nodes=g.nodes.map(n=>{const o=new T.Object3D();if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);return o;});
  g.nodes.forEach((n,i)=>n.children?.forEach(j=>nodes[i].add(nodes[j])));
  const scene=new T.Group();g.scenes[g.scene].nodes.forEach(i=>scene.add(nodes[i]));scene.updateMatrixWorld(true);
  const bounds=new T.Box3();
  g.nodes.forEach((n,i)=>{if(n.mesh===undefined)return;for(const p of g.meshes[n.mesh].primitives){const a=g.accessors[p.attributes.POSITION];bounds.union(new T.Box3(new T.Vector3().fromArray(a.min),new T.Vector3().fromArray(a.max)).applyMatrix4(nodes[i].matrixWorld));}});
  const thumbNames={leftThumbProximal:'leftThumbMetacarpal',leftThumbIntermediate:'leftThumbProximal',rightThumbProximal:'rightThumbMetacarpal',rightThumbIntermediate:'rightThumbProximal'};
  const bones=Object.fromEntries(g.extensions.VRM.humanoid.humanBones.map(b=>[thumbNames[b.bone]??b.bone,{node:nodes[b.node]}]));
  const humanoid=new VRMHumanoid(bones);scene.add(humanoid.normalizedHumanBonesRoot);scene.rotation.y=Math.PI;
  const display=new T.Group(),root=new T.Group();
  display.scale.setScalar((character?.height??1.78)/(bounds.max.y-bounds.min.y));display.position.y=-bounds.min.y*display.scale.y;
  display.add(scene);root.add(display);root.position.fromArray(character?.position??[-7.7,.41,25]);root.updateMatrixWorld(true);
  const motion=createStudentMotion(root,{humanoid},{...options,chair:character?.chair,waypoints:character?.waypoints});
  const pos=name=>humanoid.getNormalizedBoneNode(name).getWorldPosition(new T.Vector3());
  const step=(seconds,callback)=>{for(let i=0;i<Math.ceil(seconds*60);i++){motion.update(1/60);humanoid.update();root.updateMatrixWorld(true);callback?.();}};
  if(options.skeletonOnly)return {root,motion,pos,step,humanoid};
  const binaryStart=28+bytes.readUInt32LE(12);
  const readAccessor=index=>{
    const a=g.accessors[index],view=g.bufferViews[a.bufferView],size={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type];
    const [read,width]={5126:['readFloatLE',4],5125:['readUInt32LE',4],5123:['readUInt16LE',2],5121:['readUInt8',1]}[a.componentType];
    return Array.from({length:a.count*size},(_,i)=>bytes[read](binaryStart+(view.byteOffset??0)+(a.byteOffset??0)+Math.floor(i/size)*(view.byteStride??size*width)+(i%size)*width));
  };
  const bodyNode=g.nodes.find(n=>n.mesh===1),skin=g.skins[bodyNode.skin],attrs=g.meshes[1].primitives[0].attributes;
  let vertices=readAccessor(attrs.POSITION),weights=readAccessor(attrs.WEIGHTS_0),jointIndices=readAccessor(attrs.JOINTS_0);
  const inverse=readAccessor(skin.inverseBindMatrices);
  const primitives=g.meshes[1].primitives.map(p=>({indices:readAccessor(p.indices),material:g.materials[p.material].name}));
  const seatedOffsets=new Map();
  // Contact audits must exercise the displayed garment, including its ease.
  if(!character||character.id==='fumiriya') {
    const top=primitives.find(p=>p.material==='M00_001_01_Tops_01_CLOTH');
    const input=new T.BufferGeometry();
    input.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
    input.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
    input.setAttribute('skinIndex',new T.Uint16BufferAttribute(jointIndices,4));
    input.setIndex(top.indices);
    const refined=subdivideShirt(input);
    vertices=Array.from(refined.attributes.position.array);
    weights=Array.from(refined.attributes.skinWeight.array);
    jointIndices=Array.from(refined.attributes.skinIndex.array);
    top.indices=Array.from(refined.index.array);
    for(const i of new Set(top.indices)) {
      seatedOffsets.set(i,seatedShirtOffset(...vertices.slice(i*3,i*3+3)));
      const next=relaxedShirtPosition(...vertices.slice(i*3,i*3+3));
      vertices.splice(i*3,3,...next);
    }
  }
  const inverseMatrices=skin.joints.map((_,i)=>new T.Matrix4().fromArray(inverse,i*16));
  const skinMatrices=skin.joints.map(()=>new T.Matrix4());
  const influenceNames=skin.joints.map(n=>g.nodes[n].name);
  function bodyVertices(filter=()=>true) {
    const seat=motion.inspect().seat;
    skin.joints.forEach((n,i)=>skinMatrices[i].multiplyMatrices(nodes[n].matrixWorld,inverseMatrices[i]));
    const result=[];
    for(let i=0;i<vertices.length/3;i++){
      let dominant=0;for(let j=1;j<4;j++)if(weights[i*4+j]>weights[i*4+dominant])dominant=j;
      const name=influenceNames[jointIndices[i*4+dominant]];
      if(!filter(name,i))continue;
      const original=new T.Vector3().fromArray(vertices,i*3),position=new T.Vector3();
      if(seatedOffsets.has(i))original.addScaledVector(new T.Vector3().fromArray(seatedOffsets.get(i)),seat);
      for(let j=0;j<4;j++){const w=weights[i*4+j];if(w)position.addScaledVector(original.clone().applyMatrix4(skinMatrices[jointIndices[i*4+j]]),w);}
      result.push({index:i,name,position});
    }
    return result;
  }
  return {root,motion,pos,step,humanoid,bodyVertices,geometry:{vertices,weights,jointIndices,influenceNames,primitives}};
}
