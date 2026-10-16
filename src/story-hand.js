import * as T from 'three';
import poses from './data/story-hands.json';

let skinMap;
const geometries=new Map();
function handGeometry(kind){
 if(!geometries.has(kind)){
  const data=poses[kind],g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute(data.positions,3));
  g.setAttribute('normal',new T.Float32BufferAttribute(data.normals,3));
  g.setAttribute('uv',new T.Float32BufferAttribute(data.uvs,2));g.setIndex(data.indices);
  geometries.set(kind,g);
 }
 return geometries.get(kind);
}

// Cropped from the existing CC0 Shino hand: continuous palm, webbing, knuckles
// and real finger proportions. Phone and paper have separately baked grips.
export function createStoryHand(parent,x,y,scale=1,kind='paper',sideName='left'){
 skinMap??=new T.TextureLoader().load('/assets/characters/story-hand-skin.png');
 skinMap.colorSpace=T.SRGBColorSpace;skinMap.flipY=false;skinMap.anisotropy=4;
 const hand=new T.Group();hand.position.set(x,y,-.008);hand.scale.setScalar(scale);parent.add(hand);
 const skin=new T.MeshStandardMaterial({map:skinMap,color:'#f6e4d9',roughness:.84});
 const handed=sideName==='right'?-1:1;
 const palm=new T.Mesh(handGeometry(kind),skin);palm.position.set((kind==='phone'?-.033:-.058)*handed,-.075,kind==='phone'?-.016:-.032);palm.rotation.z=-.45*handed;palm.rotation.x=kind==='paper'?.12:0;palm.scale.x=handed;hand.add(palm);
 const cloth=new T.MeshStandardMaterial({color:'#e9e4db',roughness:.94});
 const g=new T.CylinderGeometry(1,1,1,20,20,true);
 const sleeve=new T.Mesh(g,cloth);parent.add(sleeve);
 const cuff=new T.Mesh(new T.CylinderGeometry(.030,.032,.018,24,1,true),cloth);parent.add(cuff);
 const base=g.attributes.position.array.slice(),p=g.attributes.position;
 const wrist=new T.Vector3(),end=new T.Vector3(),anchor=new T.Vector3(),mid=new T.Vector3(),center=new T.Vector3(),tangent=new T.Vector3(),side=new T.Vector3(),normal=new T.Vector3(),firstControl=new T.Vector3(),lastSegment=new T.Vector3();
 const up=new T.Vector3(0,1,0),wristAxis=new T.Vector3();
 hand.updateMatrix();
 function updateArm(){
  sleeve.visible=cuff.visible=hand.visible;
  if(!hand.visible)return;
  hand.updateMatrix();palm.updateMatrix();
  wrist.set(0,-.016,0).applyMatrix4(palm.matrix).applyMatrix4(hand.matrix);
  wristAxis.copy(up).applyQuaternion(palm.quaternion).applyQuaternion(hand.quaternion);
  end.copy(wrist).addScaledVector(wristAxis,-.008*scale);
  // Elbow stays below the same side of the viewer when the wrist turns.
  if(kind==='phone')anchor.set(-.17,-.47,.11);
  else anchor.set(-.24*handed,-.48,-.43);
  firstControl.copy(anchor).add(new T.Vector3(0,.13,-.04));
  mid.copy(end).addScaledVector(wristAxis,-.105*scale);
  lastSegment.copy(end).sub(mid);
  for(let i=0;i<p.count;i++){
   const t=base[i*3+1]+.5,u=1-t;
   tangent.copy(firstControl).sub(anchor).multiplyScalar(u*u).addScaledVector(center.copy(mid).sub(firstControl),2*u*t).addScaledVector(lastSegment,t*t).normalize();
   center.copy(anchor).multiplyScalar(u*u*u).addScaledVector(firstControl,3*u*u*t).addScaledVector(mid,3*u*t*t).addScaledVector(end,t*t*t);
   side.set(1,0,0).addScaledVector(tangent,-tangent.x).normalize();normal.crossVectors(side,tangent).normalize();
   const r=T.MathUtils.lerp(.046,.030,t)*scale*(1+.025*Math.sin(t*28)*Math.sin(t*Math.PI));
   center.addScaledVector(side,base[i*3]*r).addScaledVector(normal,base[i*3+2]*r*.83);
   p.setXYZ(i,center.x,center.y,center.z);
  }
  p.needsUpdate=true;g.computeVertexNormals();
  cuff.position.copy(end).addScaledVector(wristAxis,-.002);cuff.quaternion.setFromUnitVectors(up,wristAxis);cuff.scale.set(scale,scale,scale*.83);
 }
 hand.userData.updateArm=updateArm;
 for(const mesh of [palm,sleeve,cuff]){mesh.castShadow=false;mesh.receiveShadow=false;mesh.renderOrder=100;mesh.layers.set(1);mesh.frustumCulled=false;}
 return hand;
}
