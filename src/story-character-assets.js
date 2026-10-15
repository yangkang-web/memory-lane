import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { createInjuredArm } from './injured-arm.js';
import { addInfectedHandGrips } from './infected-hand-grip.js';
import { sculptGiant } from './giant-body.js';

const down = new T.Vector3(0, -1, 0);
const axisX = new T.Vector3(1, 0, 0);

// The authored contact rig remains authoritative. Imported skin follows it after
// all performance modules have run, so rewinds and exact prop contacts still work.
export function createCharacterAssets(actors, load = url => new GLTFLoader().loadAsync(url)) {
  const resources = [], updates = [];
  let disposed = false;
  function prepare(model) {
    model.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = o.receiveShadow = true;
      o.frustumCulled = false;
      const materials = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of materials) {
        m.roughness = Math.max(.8, m.roughness || 0); m.metalness = 0;
        if (m.map) m.map.anisotropy = 8;
      }
    });
    return model;
  }
  function conceal(group) { group.traverse(o => { if (o.isMesh) o.visible = false; }); }
  function boneBy(model, name) {
    let found; model.traverse(o => { if (o.isBone && o.name === name) found = o; });
    if (!found) throw new Error(`Character bone missing: ${name}`);
    return found;
  }
  const position = new T.Vector3(), rotation = new T.Quaternion(), scale = new T.Vector3();
  const desired = new T.Matrix4(), inverse = new T.Matrix4();
  function drive(bone, target, correction, size, offset = null) {
    target.updateWorldMatrix(true, false);
    target.getWorldPosition(position); target.getWorldQuaternion(rotation);
    target.getWorldScale(scale);
    if (offset) position.add(offset.clone().multiply(scale).applyQuaternion(rotation));
    rotation.multiply(correction);
    scale.multiplyScalar(size);
    desired.compose(position, rotation, scale);
    bone.parent.updateWorldMatrix(true, false);
    inverse.copy(bone.parent.matrixWorld).invert();
    desired.premultiply(inverse).decompose(bone.position, bone.quaternion, bone.scale);
    bone.updateWorldMatrix(false, false);
  }
  function installArms(source, reflection=false) {
    const rig=reflection?actors.companion.root:actors.rig, playerArms=reflection?actors.companion.arms:actors.playerArms;
    const model = prepare(clone(source)); model.name = reflection?'DJMaesen / reflected gloves':'DJMaesen / skinned first-person arms';
    model.scale.setScalar(.0095); rig.add(model); model.updateWorldMatrix(true, true);
    let armMesh; model.traverse(o=>{if(o.isSkinnedMesh)armMesh=o;});
    const parts=[[],[],[],[]],geometry=armMesh.geometry.clone(),indices=geometry.index;
    const joints=geometry.attributes.skinIndex,weights=geometry.attributes.skinWeight;
    for(let triangle=0;triangle<indices.count;triangle+=3){
      const totals=[0,0,0,0];let handWeight=0,totalWeight=0;
      for(let vertex=0;vertex<3;vertex++){const id=indices.getX(triangle+vertex);for(let influence=0;influence<4;influence++){
        const bone=armMesh.skeleton.bones[joints.getComponent(id,influence)],weight=weights.getComponent(id,influence);
        if(!bone)continue;totalWeight+=weight;if(!bone.name.includes('_arm_')&&!bone.name.includes('_elbow_'))handWeight+=weight;const side=bone.name.startsWith('R_')?2:0;
        totals[side+(bone.name.includes('_arm_')?0:1)]+=weight;
      }}
      if(reflection&&handWeight<totalWeight*.5)continue;
      const part=totals.indexOf(Math.max(...totals));for(let v=0;v<3;v++)parts[part].push(indices.getX(triangle+v));
    }
    geometry.setIndex(parts.flat());geometry.clearGroups();let start=0;
    parts.forEach((part,i)=>{geometry.addGroup(start,part.length,i);start+=part.length;});
    const armMaterials=parts.map(()=>armMesh.material.clone());armMesh.geometry=geometry;armMesh.material=armMaterials;
    // A closed cloth sleeve replaces the cut skin section after the injury.
    // Never leave triangles spanning hidden forearm joints at the stump.
    const stump=createInjuredArm();playerArms[0].shoulder.add(stump);
    resources.push(stump);
    // Replace the source's open torso flaps with closed, wrinkled upper sleeves.
    // The authored forearms, gloves and finger skin remain unchanged.
    const sleeveMaterial=new T.MeshStandardMaterial({color:'#191c1b',roughness:.87});
    const weave=new Uint8Array(64*64*4);
    for(let i=0;i<64*64;i++){const x=i%64,y=Math.floor(i/64),v=125+((x*73+y*37)%17)+(x%3===0?15:0)+(y%4===0?10:0);weave.set([v,v,v,255],i*4);}
    const weaveMap=new T.DataTexture(weave,64,64);weaveMap.wrapS=weaveMap.wrapT=T.RepeatWrapping;weaveMap.repeat.set(4,3);weaveMap.needsUpdate=true;
    sleeveMaterial.bumpMap=weaveMap;sleeveMaterial.bumpScale=.0007;
    const sleeves=playerArms.map(arm=>{
      const profile=[];for(let ring=0;ring<=36;ring++){
        const y=-.35+ring*.012,radius=ring<30?T.MathUtils.lerp(.061,.082,ring/30):.082*Math.sqrt(Math.max(0,1-((ring-30)/6)**2));
        profile.push(new T.Vector2(radius,y));
      }
      const sleeveGeometry=new T.LatheGeometry(profile,48),v=sleeveGeometry.attributes.position;
      for(let i=0;i<v.count;i++){const y=v.getY(i),a=Math.atan2(v.getZ(i),v.getX(i));const fold=1+Math.sin(y*78+a*3)*.038+Math.sin(y*127-a*5)*.022;v.setX(i,v.getX(i)*fold);v.setZ(i,v.getZ(i)*fold);}
      sleeveGeometry.computeVertexNormals();const sleeve=new T.Mesh(sleeveGeometry,sleeveMaterial);sleeve.castShadow=sleeve.receiveShadow=true;arm.shoulder.add(sleeve);resources.push(sleeve);return sleeve;
    });
    const bindings = [];
    for (const [i, prefix] of ['L', 'R'].entries()) {
      const arm = playerArms[i], side = i ? 1 : -1;
      const find = word => { let result; model.traverse(o => { if(o.isBone && o.name.startsWith(`${prefix}_${word}_`)) result=o; }); if(!result) throw new Error(`Missing ${prefix} ${word}`); return result; };
      const shoulder=find('arm'), elbow=find('elbow'), wrist=find('wrist');
      const index=find('point1'), pink=find('pink1'), middle=find('middle1');
      const palmX=index.getWorldPosition(new T.Vector3()).sub(pink.getWorldPosition(new T.Vector3())).multiplyScalar(-side).normalize();
      function correction(bone,next) {
        const y=bone.getWorldPosition(new T.Vector3()).sub(next.getWorldPosition(new T.Vector3())).normalize();
        const z=new T.Vector3().crossVectors(palmX,y).normalize();
        const x=new T.Vector3().crossVectors(y,z).normalize();
        return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z)).invert().multiply(bone.getWorldQuaternion(new T.Quaternion()));
      }
      const shoulderCorrection=correction(shoulder,elbow),elbowCorrection=correction(elbow,wrist),palmCorrection=correction(wrist,middle);
      const fingers=[];
      for(const [fingerIndex,word] of ['point','middle','ring','pink','thumb'].entries()) for(let segment=1;segment<=3;segment++) {
        const bone=find(word+segment),next=find(word+(segment+1));
        const driver=word==='thumb'?arm.palm.userData.thumb:segment===1?arm.palm.userData.fingers[i?fingerIndex:3-fingerIndex].finger:arm.palm.userData.fingers[i?fingerIndex:3-fingerIndex].tip;
        const offset=word==='thumb'?new T.Vector3(0,-(segment-1)*.022,0):segment===3?new T.Vector3(0,-.014,0):null;
        fingers.push({bone,driver,offset,correction:correction(bone,next)});
      }
      arm.shoulder.traverse(o=>{if(o.userData.contactSkin)o.visible=false;});
      bindings.push({arm,shoulder,elbow,wrist,shoulderCorrection,elbowCorrection,palmCorrection,fingers});
    }
    updates.push(() => {
      model.visible = reflection||actors.rig.visible;
      armMaterials[0].visible=armMaterials[2].visible=false;
      armMaterials[1].visible=playerArms[0].elbow.visible;
      sleeves[0].visible=!reflection&&playerArms[0].elbow.visible;
      sleeves[1].visible=!reflection;
      stump.visible=!reflection&&!playerArms[0].elbow.visible;
      armMaterials[3].visible=playerArms[1].elbow.visible;
      for (const b of bindings) {
        const {arm}=b;
        drive(b.shoulder,arm.shoulder,b.shoulderCorrection,.0125);
        drive(b.elbow,arm.elbow,b.elbowCorrection,.0115);
        drive(b.wrist,arm.palm,b.palmCorrection,.0068);
        for(const f of b.fingers)drive(f.bone,f.driver,f.correction,.0078,f.offset);

      }
      model.updateWorldMatrix(true,true);
    });
    resources.push(model);
  }
  function installZombie(source) {
    // A consistent 1.79 m base keeps the existing bite/pipe/knee contact staging.
    const base=prepare(source);
    addInfectedHandGrips(base);
    base.traverse(o=>{if(o.isMesh){o.material.roughness=.87;o.material.metalness=0;o.material.envMapIntensity=.35;}});
    base.rotation.y=Math.PI; base.updateMatrixWorld(true);
    const bounds=new T.Box3().setFromObject(base), size=1.79/(bounds.max.y-bounds.min.y);
    base.scale.setScalar(size); base.position.y=-bounds.min.y*size; base.updateMatrixWorld(true);
    for(const [index,actor] of actors.enemies.entries()) {
      const model=clone(base);
      if(index===8)sculptGiant(model);
      model.traverse(o=>{if(o.isMesh){const original=o.material;o.material=original.clone();o.material.onBeforeCompile=original.onBeforeCompile;o.material.customProgramCacheKey=original.customProgramCacheKey;o.material.color.set(['#b9afa4','#a8b1a6','#b7a795','#9ca9a8'][index%4]);}});
      model.name=`LokitoBlu / infected ${index+1}`;
      // Hide only the original renderables; preserve the entire contact/collision hierarchy.
      conceal(actor.body); actor.root.add(model); model.updateWorldMatrix(true,true);
      const entries=[];
      const add=(name,target,mode='limb',offset=null)=>{
        const bone=boneBy(model,name),rest=bone.getWorldQuaternion(new T.Quaternion());
        let correction=rest;
        if(mode==='limb') {
          const child=bone.children.find(o=>o.isBone);
          const direction=child?child.getWorldPosition(new T.Vector3()).sub(bone.getWorldPosition(new T.Vector3())).normalize():new T.Vector3(0,1,0).applyQuaternion(rest);
          correction=new T.Quaternion().setFromUnitVectors(direction,down).multiply(rest);
          if(name.startsWith('hand')){
            // This asset's palms lie in X/Z in bind pose. Align their normal
            // as well as their fingers, so curling closes around the contact.
            const y=direction.clone().negate(),z=new T.Vector3(0,1,0);
            const x=new T.Vector3().crossVectors(y,z).normalize();
            correction=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z)).invert().multiply(rest);
          }
        }
        entries.push({bone,target,correction,offset,foot:mode==='foot',rest:{p:bone.position.clone(),q:bone.quaternion.clone(),s:bone.scale.clone()},boneScale:bone.getWorldScale(new T.Vector3()).x*(name.startsWith('hand')?.76:1)});
      };
      const hips=boneBy(model,'hips').getWorldPosition(new T.Vector3());
      hips.y=.84;add('hips',actor.body,'body',hips);
      // Original head starts at the neck. Retain the neck-to-face offset.
      const headPosition=boneBy(model,'head').getWorldPosition(new T.Vector3());
      add('head',actor.head,'body',new T.Vector3(0,headPosition.y-1.70,headPosition.z));
      for(const [i,suffix] of ['L','R'].entries()) {
        const arm=actor.arms[i],leg=actor.legs[i];
        add(`upper_arm${suffix}`,arm.shoulder);
        add(`forearm${suffix}`,arm.elbow);
        add(`hand${suffix}`,arm.palm);
        add(`thigh${suffix}`,leg.hip);
        add(`shin${suffix}`,leg.knee);
        add(`foot${suffix}`,leg.foot,'foot');
      }
      const restPosition=model.position.clone(),soleSamples=[];
      model.traverse(o=>{if(o.isSkinnedMesh){const indices=[];const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)if(p.getY(i)<.13)indices.push(i);soleSamples.push({mesh:o,indices});}});
      // Imported feet use their actual skinned sole, not the old box proxy.

      updates.push(()=>{
        if(!actor.root.visible)return;
        model.visible=true;model.position.copy(restPosition);
        if(index===8)model.traverse(o=>{if(o.userData.giantSettle!==undefined)o.morphTargetInfluences[o.userData.giantSettle]=actor.root.userData.giantSettle||0;});
        model.traverse(o=>{if(o.userData.infectedGrip)for(let i=0;i<2;i++)o.morphTargetInfluences[i]=T.MathUtils.clamp((actor.arms[i].palm.userData.gripValue||0)*1.5,0,1);});
        for(const b of entries){if(b.foot&&!actor.root.userData.contactRun){b.bone.position.copy(b.rest.p);b.bone.quaternion.copy(b.rest.q);b.bone.scale.copy(b.rest.s);continue;}drive(b.bone,b.target,b.correction,b.boneScale,b.offset);}
        model.updateWorldMatrix(true,true);
        if(Number.isFinite(actor.root.userData.floorY)){
          let sole=Infinity;const point=new T.Vector3();
          for(const {mesh,indices} of soleSamples){mesh.updateMatrixWorld(true);mesh.skeleton.update();const contactIndices=Math.abs(actor.body.rotation.x)>.45?Array.from({length:mesh.geometry.attributes.position.count},(_,i)=>i):indices;for(const i of contactIndices){mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld);sole=Math.min(sole,point.y);}}
          if(Number.isFinite(sole)){model.position.y+=(actor.root.userData.floorY+(actor.root.userData.flightHeight||0)-sole)/actor.root.scale.y;model.updateWorldMatrix(true,true);}
        }
      });
      resources.push(model);
    }
  }
  function installSurvivor(source) {
    const actor=actors.companion, model=prepare(source);
    model.name='codersan / survivor reflection'; model.rotation.y=Math.PI;
    model.updateMatrixWorld(true);
    const bounds=new T.Box3().setFromObject(model), size=1.79/(bounds.max.y-bounds.min.y);
    model.scale.setScalar(size);model.position.y=-bounds.min.y*size;model.updateMatrixWorld(true);
    const find=word=>{let result;model.traverse(o=>{if(o.isBone&&o.name.startsWith(`mixamorig${word}_`))result=o;});if(!result)throw new Error(`Survivor bone missing: ${word}`);return result;};
    const bindings=[];
    function bind(word,target,limb=false,offset=null){
      const bone=find(word),rest=bone.getWorldQuaternion(new T.Quaternion());let correction=rest;
      if(limb){const next=bone.children.find(o=>o.isBone);const direction=next.getWorldPosition(new T.Vector3()).sub(bone.getWorldPosition(new T.Vector3())).normalize();correction=new T.Quaternion().setFromUnitVectors(direction,down).multiply(rest);}
      bindings.push({bone,target,correction,size:bone.getWorldScale(new T.Vector3()).x,offset});
    }
    bind('Hips',actor.body,false,find('Hips').getWorldPosition(new T.Vector3()));
    bind('Head',actor.head,false,find('Head').getWorldPosition(new T.Vector3()).sub(actor.head.position));
    for(const [i,side] of ['Left','Right'].entries()){
      bind(side+'Arm',actor.arms[i].shoulder,true);
      bind(side+'ForeArm',actor.arms[i].elbow,true);
      bind(side+'Hand',actor.arms[i].palm,true);
      bind(side+'UpLeg',actor.legs[i].hip,true);
      bind(side+'Leg',actor.legs[i].knee,true);
    }
    model.traverse(o=>{if(o.isSkinnedMesh){
      const g=o.geometry,kept=[],j=g.attributes.skinIndex,w=g.attributes.skinWeight;
      for(let t=0;t<g.index.count;t+=3){let hand=0,total=0;
        for(let v=0;v<3;v++){const id=g.index.getX(t+v);for(let k=0;k<4;k++){const weight=w.getComponent(id,k);total+=weight;if(o.skeleton.bones[j.getComponent(id,k)].name.includes('Hand'))hand+=weight;}}
        if(hand<total*.5)for(let v=0;v<3;v++)kept.push(g.index.getX(t+v));
      }g.setIndex(kept);
    }});
    conceal(actor.body);actor.root.add(model);resources.push(model);
    // Reflection visibility is enabled only inside Reflector.onBeforeRender.
    // Update its bones even while the normal camera hides this actor.
    updates.push(()=>{for(const b of bindings)drive(b.bone,b.target,b.correction,b.size*(b.bone.name.includes('Hand_')?.76:1),b.offset);model.updateWorldMatrix(true,true);});
  }
  const armsReady=load('/assets/story/characters/fps-arms.glb').then(g=>{resources.push(g.scene);if(!disposed)installArms(g.scene);else dispose();return g.scene;});
  const ready = Promise.all([
    armsReady,
    load('/assets/story/characters/survivor.glb').then(async g=>{resources.push(g.scene);if(!disposed){installSurvivor(g.scene);const arms=await armsReady;if(!disposed)installArms(arms,true);}else dispose();}),
    load('/assets/story/characters/infected-detailed.glb').then(g=>{resources.push(g.scene);if(!disposed)installZombie(g.scene);else dispose();}),
  ]);
  function dispose(){
    disposed=true;
    const geometries=new Set(),materials=new Set(),textures=new Set(),skeletons=new Set();
    for(const model of resources){model.removeFromParent();model.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.skeleton)skeletons.add(o.skeleton);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}});}
    geometries.forEach(g=>g.dispose()); materials.forEach(m=>m.dispose()); textures.forEach(t=>t.dispose()); skeletons.forEach(s=>s.dispose());
  }
  return {ready,update(){updates.forEach(fn=>fn());},dispose};
}
