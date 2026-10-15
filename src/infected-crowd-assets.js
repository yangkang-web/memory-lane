import { strideFoot, solveKnee, STRIDE_DISTANCE } from './infected-locomotion.js';
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Bake the licensed low-detail skin into a small pose atlas once. The crowd then
// uses instancing: no per-frame vertex skinning or 56 independent skeletons.
export function createInfectedCrowdAssets(root, capacity=56, load=url=>new GLTFLoader().loadAsync(url)) {
  const batches=[], sourceResources=[];
  let disposed=false;
  const ready=load('/assets/story/characters/infected-crowd.glb').then(({scene})=>{
    scene.traverse(o=>{if(o.isMesh)sourceResources.push(o);});
    if(disposed){dispose();return;}
    scene.rotation.y=Math.PI;scene.updateMatrixWorld(true);
    const bounds=new T.Box3().setFromObject(scene), size=1.79/(bounds.max.y-bounds.min.y);
    scene.scale.setScalar(size);scene.position.y=-bounds.min.y*size;scene.updateMatrixWorld(true);
    let skin;scene.traverse(o=>{if(o.isSkinnedMesh)skin=o;});
    if(!skin)throw new Error('Crowd asset has no skin');
    const bones=skin.skeleton.bones;
    const rests=bones.map(b=>({bone:b,p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone()}));
    const restWorld=new Map(bones.map(b=>[b.name,b.getWorldQuaternion(new T.Quaternion())]));
    const directions=new Map(bones.map(b=>{const child=b.children.find(c=>c.isBone);return [b.name,child?child.getWorldPosition(new T.Vector3()).sub(b.getWorldPosition(new T.Vector3())).normalize():new T.Vector3(0,1,0)];}));
    const boneBy=name=>bones.find(b=>b.name===name);
    function aim(name, direction){
      const b=boneBy(name);b.parent.updateWorldMatrix(true,false);
      b.quaternion.copy(b.parent.getWorldQuaternion(new T.Quaternion()).invert())
        .multiply(new T.Quaternion().setFromUnitVectors(directions.get(name),direction.normalize()))
        .multiply(restWorld.get(name));
      b.updateWorldMatrix(false,true);
    }
    const material=skin.material.clone();material.roughness=.98;material.metalness=0;
    material.color.set('#b4aaa0');if(material.map)material.map.anisotropy=8;
    material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
      diffuseColor.rgb = pow(min(diffuseColor.rgb, vec3(0.12)), vec3(0.90));
    `);};material.customProgramCacheKey=()=> 'crowd-dry-skin-v2';
    for(let frame=0;frame<40;frame++){
      rests.forEach(({bone,p,q,s})=>{bone.position.copy(p);bone.quaternion.copy(q);bone.scale.copy(s);});scene.updateMatrixWorld(true);
      const walking=frame<32, phase=walking?frame/32*Math.PI*2:(frame-32)/8*Math.PI*2;
      const distance=frame/32*STRIDE_DISTANCE;
      if(walking)aim('hips',new T.Vector3(0,1,-.31));
      const stride=Math.sin(phase)*(walking?.86:.025);
      for(const [i,side] of ['L','R'].entries()){
        const sign=i?1:-1, step=stride*sign;
        if(walking){
          const foot=strideFoot(distance,i),hip=new T.Vector3(i?.125:-.125,.77,0),knee=solveKnee(hip,foot.position);
          aim('thigh'+side,knee.clone().sub(hip));aim('shin'+side,foot.position.clone().sub(knee));
          aim('foot'+side,new T.Vector3(0,0,-1));
        }else{aim('thigh'+side,new T.Vector3(sign*.025,-1,-Math.sin(step)));aim('shin'+side,new T.Vector3(0,-1,Math.max(0,-step)*.65));}
        const swing=-.18+Math.sin(phase-.7+i*Math.PI)*.68;
        aim('upper_arm'+side,new T.Vector3(sign*.055,-Math.cos(swing),-Math.sin(swing)));
        aim('forearm'+side,new T.Vector3(sign*.025,-Math.cos(swing+1),-Math.sin(swing+1)));
        aim('hand'+side,new T.Vector3(0,-Math.cos(swing+1),-Math.sin(swing+1)));
      }
      const head=boneBy('head');head.rotation.z+=Math.sin(phase)*.055;
      scene.updateMatrixWorld(true);skin.skeleton.update();
      const geometry=skin.geometry.clone(), positions=geometry.attributes.position, point=new T.Vector3();
      for(let v=0;v<positions.count;v++){skin.getVertexPosition(v,point).applyMatrix4(skin.matrixWorld);positions.setXYZ(v,point.x,point.y,point.z);}
      geometry.deleteAttribute('skinIndex');geometry.deleteAttribute('skinWeight');
      geometry.computeVertexNormals();geometry.computeBoundingBox();
      // Ground every baked pose at its lowest sole, not at the source origin.
      const flight=walking?Math.min(strideFoot(distance,0).position.y,strideFoot(distance,1).position.y)-.105:0;
      geometry.translate(0,-geometry.boundingBox.min.y+flight,0);geometry.computeBoundingSphere();
      const mesh=new T.InstancedMesh(geometry,material,capacity);
      mesh.name=`Rosswet Mobile / crowd pose ${frame}`;mesh.count=0;
      mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);root.add(mesh);batches.push(mesh);
    }
  });
  const color=new T.Color();
  const palette=['#bec2af','#a6b6a8','#c0ad96','#98a9a4','#b5b1a3','#a89c90'];
  return {ready,
    begin(){batches.forEach(b=>{b.count=0;});},
    write(index,time,moving,fast,matrix,distance=null){
      if(!batches.length)return;
      const cycle=(distance??time*(fast?3.8:1.6))/STRIDE_DISTANCE+index*.173;
      const frame=moving?Math.floor(((cycle%1)+1)%1*32):32+((index+Math.floor(time*.8))%8);
      const batch=batches[frame],slot=batch.count++;
      batch.setMatrixAt(slot,matrix);batch.setColorAt(slot,color.set(palette[index%palette.length]));
    },
    end(){batches.forEach(b=>{b.instanceMatrix.needsUpdate=true;if(b.instanceColor)b.instanceColor.needsUpdate=true;});},
    dispose,
  };
  function dispose(){
    disposed=true;const geometries=new Set(),materials=new Set(),textures=new Set();
    for(const o of [...batches,...sourceResources]){o.removeFromParent();geometries.add(o.geometry);materials.add(o.material);o.skeleton?.dispose();}
    for(const m of materials)for(const v of Object.values(m))if(v?.isTexture)textures.add(v);
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
  }
}
