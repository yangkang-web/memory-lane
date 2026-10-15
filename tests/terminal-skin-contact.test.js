import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createStoryActors} from '../src/story-actors.js';
import {createCharacterAssets} from '../src/story-character-assets.js';
import {createCompanionInteractions} from '../src/companion-interactions.js';
import {stateAt} from '../src/last-companion-timeline.js';
import {editStateAt} from '../src/last-companion-edit.js';
import {loadGeometry} from './helpers/character-glb.js';

// Tests actual imported skin vertices, not only proxy wrist locations.
test('terminal grip and connector press keep the rendered skin outside the device',async()=>{
const previousDocument=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},putImageData(){},createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})})})};
const scene=new T.Scene(),camera=new T.PerspectiveCamera(),actors=createStoryActors(scene,camera),assets=createCharacterAssets(actors,loadGeometry),room=new T.Group();scene.add(room);await assets.ready;
const make=()=>{const g=new T.Group();room.add(g);g.position.set(-19.5,1.21,44.35);return g;};
const items={tin:make(),halfWater:make(),bag:make(),power:make(),water:[make(),make()],bandage:make(),biscuits:make(),lemons:make(),terminal:make(),cable:make()};
const interaction=createCompanionInteractions(camera,{items},actors,new T.Group());
let skin;actors.rig.getObjectByName('DJMaesen / skinned first-person arms').traverse(o=>{if(o.isSkinnedMesh)skin=o;});
const samples=[];for(let t=18.5;t<=33;t+=.1)samples.push(stateAt(t));
for(const t of [0,.8,1.5,2.5,53,54,55,57,1.5])samples.push(editStateAt(t));
for(const s of samples){const t=s.t;
camera.position.fromArray(s.camera);camera.lookAt(new T.Vector3(...s.look));actors.firstPerson(t,'lower');actors.rig.visible=true;scene.updateMatrixWorld(true);interaction.update(s);assets.update();scene.updateMatrixWorld(true);skin.skeleton.update();const inv=items.terminal.matrixWorld.clone().invert(),v=new T.Vector3();let inside=0,L=0,R=0;let lo=1,hi=-1;
for(let i=0;i<skin.geometry.attributes.position.count;i++){skin.getVertexPosition(i,v).applyMatrix4(skin.matrixWorld).applyMatrix4(inv);if(Math.abs(v.x)<.092&&Math.abs(v.y)<.142){lo=Math.min(lo,v.z);hi=Math.max(hi,v.z);if(Math.abs(v.z)<.016){inside++;const name=skin.skeleton.bones[skin.geometry.attributes.skinIndex.getX(i)].name;if(name.startsWith("L"))L++;else R++;}}}
assert.equal(inside,0,`skin penetrates terminal at source ${t}, playback ${s.playbackTime}`);
}assets.dispose();actors.dispose();globalThis.document=previousDocument;

});
