import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { createStudentMotion } from './student-motion.js';
import { adaptStudentMaterials, createStudentContactShadows } from './student-materials.js';
import { applySummerUniform } from './student-outfit.js';
import { applyNaturalComplexion } from './student-appearance.js';
import { createOfferBook } from './student-props.js';
import { applyCombedBackHair } from './student-hair.js';
import { createStudentStability } from './student-stability.js';

// Campus characters, VRoid Project / pixiv, CC0. See ASSET-LICENSES.md.
// Retain the original rig and expressions; adapt clothing to campus lighting.
export function createStudent(scene, { character, reducedMotion = false } = {}) {
  const root = new T.Group();
  root.name = character.name;
  root.position.fromArray(character.position);
  root.rotation.y=character.yaw||0;
  scene.add(root);
  let vrm, motion, stability, updateContactShadows, updateOutfit, status='loading', pending;
  const listeners=new Set();
  const updateBook=createOfferBook(scene);
  let previousLabel='';
  const chair=new T.Group();
  chair.name=character.shortName+' preview chair';
  chair.position.set(character.chair.x,character.chair.y,character.chair.z);
  const wood=new T.MeshStandardMaterial({color:0xb68451,roughness:.48});
  const metal=new T.MeshStandardMaterial({color:0x78827e,metalness:.7,roughness:.3});
  function part(geometry,material,x,y,z){const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;chair.add(mesh);return mesh;}
  part(new T.BoxGeometry(.45,.035,.43),wood,0,.4425,0);
  part(new T.BoxGeometry(.43,.21,.028),wood,0,.72,-.205);
  for(const x of [-.19,.19])for(const z of [-.17,.17])part(new T.CylinderGeometry(.013,.013,.43,10),metal,x,.215,z);
  for(const x of [-.19,.19])part(new T.CylinderGeometry(.012,.012,.43,10),metal,x,.625,-.2);
  chair.visible=character.previewChair!==false;
  scene.add(chair);
  const loader=new GLTFLoader();
  loader.register(parser=>new VRMLoaderPlugin(parser));

  async function load() {
    if(vrm)return true;
    if(pending)return pending;
    status='loading';
    listeners.forEach(fn=>fn());
    pending=(async()=>{
      try {
        const gltf=await loader.loadAsync(character.file);
        const model=gltf.userData.vrm;
        if(!model?.humanoid)throw new Error('The character has no VRM humanoid rig.');
        VRMUtils.rotateVRM0(model);
        model.scene.updateMatrixWorld(true);
        const bounds=new T.Box3().setFromObject(model.scene);
        const height=bounds.max.y-bounds.min.y;
        if(!Number.isFinite(height)||height<=0)throw new Error('Invalid character dimensions.');
        const scale=character.height/height;
        const display=new T.Group();
        display.visible=false;
        display.scale.setScalar(scale);
        display.position.y=-bounds.min.y*scale;
        display.add(model.scene);
        adaptStudentMaterials(model,{hairColor:character.id==='fumiriya'?'#493025':undefined});
        if(character.id==='fumiriya'){
          updateOutfit=applySummerUniform(model);
          applyNaturalComplexion(model);
          applyCombedBackHair(model);
        }
        vrm=model;
        root.add(display);
        stability=createStudentStability(model,root,{reducedMotion});
        motion=createStudentMotion(root,model,{reducedMotion,chair:character.chair,waypoints:character.waypoints});
        stability.update(0);
        updateOutfit?.(motion.inspect().seat);
        updateContactShadows=createStudentContactShadows(scene,model,root.position.y);
        updateContactShadows();
        display.visible=true;
        status='ready';
        return true;
      } catch(error) {
        status='error';
        console.error('Unable to load '+character.name+':',error);
        return false;
      } finally { pending=null;listeners.forEach(fn=>fn()); }
    })();
    return pending;
  }
  function setAction(value) {motion?.setAction(value);}
  function update(dt) {
    if(!vrm)return;
    motion.update(dt);
    stability.update(dt);
    updateOutfit?.(motion.inspect().seat);
    updateBook(vrm.humanoid.getNormalizedBoneNode('rightHand'),motion.inspect().giveMix);
    updateContactShadows();
    if(previousLabel!==motion.label){previousLabel=motion.label;listeners.forEach(fn=>fn());}
  }
  const ready=load();
  return {character,root,update,setAction,load,ready,resetSecondaryMotion(){stability?.reset();},relocate(position){if(root.position.distanceToSquared(new T.Vector3(...position))>1e-8)stability?.reset();motion?.relocate(position);},setStoryPose(value){motion?.setStoryPose(value);},setSpeechFrame(value){motion?.setSpeechFrame(value);},setSpeaking(value){motion?.setSpeaking(value);listeners.forEach(fn=>fn());},get speaking(){return motion?.speaking??false;},subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
    get action(){return motion?.action??'idle';},get label(){return motion?.label??'Loading…';},get status(){return status;}};
}
