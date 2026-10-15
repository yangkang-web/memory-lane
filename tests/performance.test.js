import { createShelfFall } from '../src/companion-shelf-fall.js';
import { createStoreAmbush } from '../src/companion-store-ambush.js';
import { createCarVault } from '../src/companion-car-vault.js';
import { createSingleArmEscape } from '../src/companion-single-arm.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createStoryActors } from '../src/story-actors.js';
import { createCompanionPerformance } from '../src/companion-performance.js';
import { groundStreetActor } from '../src/companion-street-response.js';
import { stateAt } from '../src/last-companion-timeline.js';
import { createCrowbarPickup } from '../src/companion-crowbar.js';
import { createFinalePerformance } from '../src/companion-finale.js';
import { createAisleFight } from '../src/companion-aisle-fight.js';
import { createTorchPickup } from '../src/companion-torch.js';
import { createBackpackStruggle } from '../src/companion-backpack.js';

// Geometry/IK checks only. The canvas stub does not render or validate textures.
function fixture() {
  const oldDocument = globalThis.document;
  globalThis.document = { createElement: () => ({ getContext: () => ({
    fillRect() {}, putImageData() {}, createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  }) }) };
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(64, 1.8, .05, 500);
  let actors;
  try { actors = createStoryActors(scene, camera); } finally { globalThis.document = oldDocument; }
  const props = new T.Group(), roll = new T.Mesh(new T.TorusGeometry(.039, .016), new T.MeshStandardMaterial());
  actors.rig.add(props, roll);
  const performance = createCompanionPerformance(actors, props, roll, []);
  return { scene, camera, actors, props, roll, performance, dispose() { performance.dispose(); actors.dispose(); } };
}

test('the backpack strike contacts the pursuer and both grips follow the actual straps',()=>{
  const f=fixture(),bag=new T.Group(),placeholder=new T.Group();f.scene.add(bag);
  const struggle=createBackpackStruggle(f.camera,f.actors,bag,f.props,placeholder),enemy=f.actors.enemies[3];
  function sample(t){const s=stateAt(t);f.camera.position.fromArray(s.camera);f.camera.lookAt(new T.Vector3(...s.look));f.props.position.set(.23,-.37,-.55);f.props.rotation.set(.4,-.15,-.35);f.actors.playerArms[1].shoulder.position.set(.27,-.42,.1);f.scene.updateMatrixWorld(true);struggle.update(t);f.scene.updateMatrixWorld(true);}
  try{
    for(const t of [164.5,166,168]){
      sample(t);const strap=bag.localToWorld(new T.Vector3(-.14,.4,-.13));
      const fingers=f.actors.playerArms[0].palm.localToWorld(new T.Vector3(0,-.078,-.032));
      assert.ok(strap.distanceTo(fingers)<.025,`player misses backpack strap at ${t}`);
      if(t<167.4)assert.ok(bag.localToWorld(new T.Vector3(.14,.27,-.22)).distanceTo(enemy.arms[1].palm.localToWorld(new T.Vector3(0,-.078,-.032)))<.03,`pursuer misses backpack at ${t}: ${bag.localToWorld(new T.Vector3(.14,.27,-.22)).distanceTo(enemy.arms[1].palm.localToWorld(new T.Vector3(0,-.078,-.032)))}`);
    }
    sample(168);const chest=enemy.body.localToWorld(new T.Vector3(0,1.2,-.17));
    assert.ok(chest.distanceTo(bag.localToWorld(new T.Vector3(0,.22,-.13)))<.001,'backpack swing misses the chest');
    const impact=bag.getWorldPosition(new T.Vector3());
    sample(169.6);assert.ok(f.props.localToWorld(new T.Vector3(0,0,-.4)).distanceTo(enemy.body.localToWorld(new T.Vector3(.02,1.27,-.18)))<.001,'follow-up pipe misses');
    for(let t=168.8;t<170.81;t+=.1){sample(t);const fingers=f.actors.playerArms[1].palm.localToWorld(new T.Vector3(0,-.078,-.032));assert.ok(fingers.distanceTo(f.props.localToWorld(new T.Vector3(0,0,.24)))<.03,`pipe loses the grip at ${t}: ${fingers.distanceTo(f.props.localToWorld(new T.Vector3(0,0,.24)))}, shaft ${f.actors.rig.worldToLocal(f.props.localToWorld(new T.Vector3(0,0,.24))).toArray()}`);}
    sample(168);assert.ok(bag.getWorldPosition(new T.Vector3()).distanceTo(impact)<.001,'rewind retains the retreat pose');
    assert.equal(placeholder.visible,false);
  }finally{f.dispose();}
});

test('the lighter rests on the plaza, is held by the only hand and rewinds without duplicate props',()=>{
  const f=fixture(),finale=createFinalePerformance(f.actors);
  const sample=t=>{
    const state=stateAt(t);f.camera.position.fromArray(state.camera);f.camera.lookAt(new T.Vector3(...state.look));
    f.actors.playerArms[0].elbow.visible=state.leftArm;
    const right=f.actors.playerArms[1];right.shoulder.position.set(.27,-.42,.1);
    right.reach(new T.Vector3(.22,-.43,-.4));
    if(t>=471)right.reach(new T.Vector3(.24,-.28,-.45));
    f.scene.updateMatrixWorld(true);finale.update(t);f.scene.updateMatrixWorld(true);
  };
  try{
    sample(447.7);const rest=finale.lighter.getWorldPosition(new T.Vector3());
    assert.ok(Math.abs(new T.Box3().setFromObject(finale.lighter).min.y-.17)<.02,'lighter does not rest on the actual fountain slab');
    sample(448.2);assert.ok(finale.lighter.getWorldPosition(new T.Vector3()).distanceTo(rest)<1e-6,'resting lighter follows the camera');
    for(const t of [448.3,448.7,449.7,450.5,451.4]){
      sample(t);
      const fingers=f.actors.playerArms[1].palm.localToWorld(new T.Vector3(0,-.078,-.032));
      assert.ok(fingers.distanceTo(finale.lighter.getWorldPosition(new T.Vector3()))<.025,`lighter hand misses at ${t}`);
      assert.equal(f.actors.playerArms[0].elbow.visible,false);
    }
    sample(450.5);assert.equal(finale.flame.visible,true);
    assert.ok(finale.flame.localToWorld(new T.Vector3(0,1,0)).distanceTo(finale.cigarette.localToWorld(new T.Vector3(0,0,-.043)))<.012,'flame does not meet the cigarette tip');
    const flameBase=finale.lighter.localToWorld(new T.Vector3(0,.04,0)).project(f.camera);
    assert.ok(flameBase.y>-.8&&flameBase.y<.8,'flame base is cropped into the lower control strip');
    const filterAnchor=f.actors.rig.worldToLocal(finale.cigarette.localToWorld(new T.Vector3(0,0,.044)));
    assert.ok(filterAnchor.distanceTo(new T.Vector3(.035,-.08,-.111))<.001,'lighting lifts the mouth end into mid-air');
    sample(449.7);assert.equal(finale.flame.visible,false,'rewind keeps successful flame lit');
    sample(464);assert.equal(finale.lighter.visible,false,'lighter occupies the terminal hand');
    sample(474);assert.equal(finale.root.visible,false);
    sample(447.7);assert.ok(finale.lighter.getWorldPosition(new T.Vector3()).distanceTo(rest)<1e-6);
    sample(446.999);const before=finale.lighter.getWorldPosition(new T.Vector3()),rotation=finale.lighter.getWorldQuaternion(new T.Quaternion());
    sample(447.001);assert.ok(finale.lighter.getWorldPosition(new T.Vector3()).distanceTo(before)<.005,'lighter jumps at release');
    assert.ok(finale.lighter.getWorldQuaternion(new T.Quaternion()).angleTo(rotation)<.03,'lighter snaps flat at release');
    sample(472.999);const lastGrip=finale.cigarette.getWorldPosition(new T.Vector3());
    sample(473.001);assert.ok(finale.cigarette.getWorldPosition(new T.Vector3()).distanceTo(lastGrip)<.01,'cigarette jumps out of the hand');
    sample(473.8);assert.ok(Math.abs(new T.Box3().setFromObject(finale.cigarette).min.y-.17)<.006,'dropped cigarette does not rest on the stone');
  }finally{finale.dispose();f.dispose();}
});

test('the crowbar remains on the track until grasped, lifts with the right hand and restores on rewind',()=>{
  const f=fixture(),hook=new T.Group(),floor=new T.Group();
  f.props.add(hook);f.scene.add(floor);
  const pickup=createCrowbarPickup(f.actors,f.props,hook,floor);
  function sample(t){
    const s=stateAt(t);f.camera.position.fromArray(s.camera);f.camera.lookAt(new T.Vector3(...s.look));
    f.actors.rig.position.set(0,0,0);f.actors.playerArms[1].shoulder.position.set(.27,-.42,.1);
    f.props.position.set(.23,-.37,-.55);f.props.rotation.set(.4,-.15,-.35);
    f.scene.updateMatrixWorld(true);pickup.update(t);f.scene.updateMatrixWorld(true);
    return f.props.getWorldPosition(new T.Vector3());
  }
  try{
    const rest=sample(321),after=sample(324);
    assert.ok(rest.distanceTo(after)<1e-6,'bar moved before the fingers closed');
    assert.equal(floor.visible,false,'duplicate floor bar remains visible');
    assert.ok(Math.abs(rest.y-(-8.015))<1e-6,'bar floats above the track slab');
    for(const t of [324,325,326,356,357,358]){
      sample(t);
      const shaft=f.props.localToWorld(new T.Vector3(0,0,.18));
      const fingers=f.actors.playerArms[1].palm.localToWorld(new T.Vector3(0,-.078,-.032));
      assert.ok(shaft.distanceTo(fingers)<.025,`pickup grip misses the shaft at ${t}: ${shaft.distanceTo(fingers)}`);
    }
    const dropped=sample(342);assert.ok(dropped.distanceTo(new T.Vector3(1.4,-8.015,105.9))<1e-6);
    assert.ok(sample(321).distanceTo(rest)<1e-6,'rewinding retains the later pickup position');
    assert.ok(sample(323.999).distanceTo(sample(324.001))<.005,'pickup jumps at contact');
    sample(443.299);const release=f.props.getWorldPosition(new T.Vector3());
    sample(443.301);assert.ok(release.distanceTo(f.props.getWorldPosition(new T.Vector3()))<.006,'final drop jumps at release');
    const landed=sample(444.3);assert.ok(landed.distanceTo(new T.Vector3(4.05,.188,158.45))<.001,'bar does not land on the basin slab');
    assert.ok(sample(465).distanceTo(landed)<.001,'dropped bar follows the later camera');
    assert.ok(sample(443.299).distanceTo(release)<.001,'rewind does not restore the held bar');
  }finally{f.dispose();}
});

test('the two authored counter blows contact the actor and remain in the gripping hand', () => {
  const f = fixture();
  try {
    for (const t of [135, 138]) {
      const s = stateAt(t);
      f.camera.position.fromArray(s.camera);f.camera.lookAt(new T.Vector3(...s.look));
      const enemy = f.actors.enemies[1];enemy.root.position.set(21.75, .3, 43.12);
      enemy.root.rotation.y = Math.atan2(21.75 - s.camera[0], 43.12 - s.camera[2]);enemy.pose(t, 'idle');
      f.scene.updateMatrixWorld(true);
      f.performance.combat(t, 'pipe-counter');f.scene.updateMatrixWorld(true);
      const tip = f.props.localToWorld(new T.Vector3(0, 0, -.4));
      const contact = enemy.head.localToWorld(new T.Vector3(t === 138 ? -.035 : .04, -.02, -.105));
      assert.ok(tip.distanceTo(contact) < .002, `missed hit at ${t}`);
      const handle = f.props.localToWorld(new T.Vector3(0, 0, .24));
      const palm = f.actors.playerArms[1].palm.localToWorld(new T.Vector3(0, -.078, -.032));
      assert.ok(handle.distanceTo(palm) < .018, `hand detached at ${t}: ${handle.distanceTo(palm)}`);
    }
  } finally { f.dispose(); }
});

test('both dressing scenes press onto the sleeve and keep the roll attached after reverse seeks', () => {
  const f = fixture();
  try {
    for (const t of [218, 353, 218]) {
      const s = stateAt(t), left = f.actors.playerArms[0], right = f.actors.playerArms[1];
      f.camera.position.fromArray(s.camera);f.camera.lookAt(new T.Vector3(...s.look));
      left.elbow.visible = s.leftArm;f.scene.updateMatrixWorld(true);
      f.performance.dressing(t, s.action);f.scene.updateMatrixWorld(true);
      const wound = left.shoulder.localToWorld(new T.Vector3(.097, -.235, 0));
      const palm = right.palm.localToWorld(new T.Vector3(0, -.033, 0));
      assert.ok(wound.distanceTo(palm) < .006, `palm misses the sleeve at ${t}`);
      assert.ok(f.roll.getWorldPosition(new T.Vector3()).distanceTo(right.palm.localToWorld(new T.Vector3(.04, -.056, -.018))) < .001);
      assert.equal(left.elbow.visible, s.leftArm);
    }
  } finally { f.dispose(); }
});

test('the lever stays in the right hand throughout the beam lift', () => {
  const f = fixture();
  try {
    for (const t of [332, 333, 334, 335, 336, 337]) {
      const s = stateAt(t);
      f.camera.position.fromArray(s.camera);f.camera.lookAt(new T.Vector3(...s.look));
      f.scene.updateMatrixWorld(true);f.performance.combat(t, 'lever-beam');f.scene.updateMatrixWorld(true);
      const handle = f.props.localToWorld(new T.Vector3(0, 0, .24));
      const palm = f.actors.playerArms[1].palm.localToWorld(new T.Vector3(0, -.078, -.032));
      assert.ok(handle.distanceTo(palm) < .018, `hand detached from lever at ${t}: ${handle.distanceTo(palm)}`);
      const arm=f.actors.playerArms[1];
      const forearm=arm.palm.getWorldPosition(new T.Vector3()).sub(arm.elbow.getWorldPosition(new T.Vector3())).normalize();
      const handAxis=new T.Vector3(0,-1,0).applyQuaternion(arm.palm.getWorldQuaternion(new T.Quaternion()));
      assert.ok(forearm.dot(handAxis)>Math.cos(70*Math.PI/180),`lever wrist bends beyond 70 degrees at ${t}`);
    }
  } finally { f.dispose(); }
});

test('street runners plant a boot on asphalt after leaving the higher pavement',()=>{
  const f=fixture(),actor=f.actors.enemies[7];
  try{
    for(const x of [12,10,-4])for(const t of [243,266,267]){
      actor.root.position.set(x,.24,91);actor.pose(t,'run');groundStreetActor(actor);actor.root.updateWorldMatrix(true,true);
      const sole=Math.min(...actor.legs.map(l=>l.knee.localToWorld(new T.Vector3(0,-.404,-.055)).y));
      assert.ok(Math.abs(sole-(x>11.5?.24:.08))<1e-6);
    }
  }finally{f.dispose();}
});

test('the same crowbar is seated behind the maintenance handle and rewinds to the hand',async()=>{
  const {createDoorEscapePerformance}=await import('../src/companion-door-escape.js');
  const f=fixture(),door=new T.Group(),anchor=new T.Group(),handle=new T.Group();
  f.scene.add(door);door.position.set(4,-6.9,122);door.add(anchor,handle);
  anchor.position.set(.10,1.38,1.79);handle.position.set(.15,1.38,1.55);
  const controller=createDoorEscapePerformance(f.actors,f.props,{items:{maintenanceDoor:door,doorBar:anchor,maintenanceGrip:handle}});
  try{
    for(const t of [391.7,393.2,394,391.7]){
      const state=stateAt(t);f.camera.position.fromArray(state.camera);f.camera.lookAt(new T.Vector3(...state.look));
      f.props.position.set(.23,-.37,-.55);f.props.rotation.set(.4,-.15,-.35);f.scene.updateMatrixWorld(true);
      controller.update(t);f.scene.updateMatrixWorld(true);
      assert.ok(f.props.getWorldPosition(new T.Vector3()).distanceTo(anchor.getWorldPosition(new T.Vector3()))<1e-6);
      // The shaft is between the door face and the loop, not embedded in the loop.
      const shaft=door.worldToLocal(f.props.localToWorld(new T.Vector3(0,0,-.24)));
      assert.ok(shaft.x>.07&&shaft.x<.125);
      if(t<392||t>=394){
        const grip=f.props.localToWorld(new T.Vector3(0,0,-.16));
        const fingers=f.actors.playerArms[1].palm.localToWorld(new T.Vector3(0,-.078,-.032));
        assert.ok(grip.distanceTo(fingers)<.025,`right hand misses the bar at ${t}: ${grip.distanceTo(fingers)}`);
      }
    }
  }finally{f.dispose();}
});


test('the pinned protagonist picks up and sets down the same torch with only the right hand',()=>{
  const f=fixture(),flashlight=new T.Group(),light=new T.SpotLight();f.scene.add(flashlight);flashlight.add(light);
  const pickup=createTorchPickup(f.actors,flashlight,light);
  const sample=t=>{const s=stateAt(t);f.camera.position.fromArray(s.camera);f.camera.lookAt(new T.Vector3(...s.look));f.actors.playerArms[0].reach(new T.Vector3(-.2,-.4,-.3));f.scene.updateMatrixWorld(true);const leftBefore=f.actors.playerArms[0].palm.getWorldPosition(new T.Vector3());pickup.update(t);f.scene.updateMatrixWorld(true);assert.ok(leftBefore.distanceTo(f.actors.playerArms[0].palm.getWorldPosition(new T.Vector3()))<1e-6,'pinned arm moves to hold the torch');return flashlight.getWorldPosition(new T.Vector3());};
  try{
    const rest=sample(309);assert.ok(rest.distanceTo(sample(311))<1e-6,'torch moves before grasp');
    for(const t of [311,312,313,315,317,318,319]){sample(t);const fingers=f.actors.playerArms[1].palm.localToWorld(new T.Vector3(0,-.078,-.032));assert.ok(fingers.distanceTo(flashlight.localToWorld(new T.Vector3(0,0,.03)))<.03,`torch slips from right hand at ${t}: ${fingers.distanceTo(flashlight.localToWorld(new T.Vector3(0,0,.03)))}`);}
    const down=sample(320);assert.ok(down.x-.059>1.05,'torch overlaps the ends of the track sleepers');assert.ok(down.distanceTo(sample(330))<1e-6,'set-down torch follows the camera');
    sample(339);assert.ok(sample(309).distanceTo(rest)<1e-6,'reverse seek retains second collapse torch position');
    assert.ok(sample(310.999).distanceTo(sample(311.001))<.005,'torch jumps at lift');
    assert.ok(sample(318.999).distanceTo(sample(319.001))<.005,'torch jumps at set-down');
  }finally{f.dispose();}
});


test('the aisle struggle grips the sleeve, kicks the next pursuer and rewinds the shelf',()=>{
 const f=fixture(),shelf=new T.Group();f.scene.add(shelf);shelf.position.set(25,.3,43.3);
 const fight=createAisleFight(f.camera,f.actors,f.props,shelf);
 const sample=t=>{const s=stateAt(t);f.camera.position.fromArray(s.camera);f.camera.lookAt(new T.Vector3(...s.look));f.scene.updateMatrixWorld(true);fight.update(t);f.scene.updateMatrixWorld(true);};
 try{
  for(const t of [156.5,157,157.5,157.8]){sample(t);const cloth=f.actors.playerArms[1].elbow.localToWorld(new T.Vector3(0,-.25,.055)),fingers=f.actors.enemies[2].arms[0].palm.localToWorld(new T.Vector3(0,-.078,-.032));assert.ok(cloth.distanceTo(fingers)<.035,`sleeve grip misses at ${t}: ${cloth.distanceTo(fingers)} cloth ${cloth.toArray()} fingers ${fingers.toArray()}`);}
  for(let t=154;t<163;t+=.1){sample(t);const fingers=f.actors.playerArms[1].palm.localToWorld(new T.Vector3(0,-.078,-.032));assert.ok(fingers.distanceTo(f.props.localToWorld(new T.Vector3(0,0,.24)))<.035,`pipe detached at ${t}`);}
  sample(160);assert.ok(fight.kick.localToWorld(new T.Vector3(0,-.078,-.03)).distanceTo(f.actors.enemies[5].body.localToWorld(new T.Vector3(0,.95,-.17)))<.001,'kick misses torso');
  sample(161);assert.ok(f.actors.enemies[5].body.position.y<-.5,'kick does not cause a fall');assert.ok(shelf.rotation.z<-.04,'shelf does not react');
  sample(150);assert.ok(Math.abs(shelf.rotation.z)<1e-8);assert.equal(fight.kick.visible,false);
 }finally{f.dispose();}
});


test('the single-arm escape keeps the bar in the right hand and contacts the first pursuer',()=>{
 const f=fixture(),bag=new T.Group(),placeholder=new T.Group();f.scene.add(bag);
 const escape=createSingleArmEscape(f.camera,f.actors,f.props,bag,placeholder);
 const sample=t=>{const s=stateAt(t);f.camera.position.fromArray(s.camera);f.camera.lookAt(new T.Vector3(...s.look));f.actors.playerArms[0].elbow.visible=false;f.scene.updateMatrixWorld(true);escape.update(t);f.scene.updateMatrixWorld(true);};
 try{
  for(let t=360;t<386;t+=.1){sample(t);const grip=f.actors.playerArms[1].palm.localToWorld(new T.Vector3(0,-.078,-.032));assert.ok(grip.distanceTo(f.props.localToWorld(new T.Vector3(0,0,.24)))<.035,`right hand loses crowbar at ${t}`);assert.equal(f.actors.playerArms[0].elbow.visible,false);}
  sample(362);assert.ok(f.props.localToWorld(new T.Vector3(0,0,-.4)).distanceTo(f.actors.enemies[0].body.localToWorld(new T.Vector3(0,1.25,-.17)))<.001);
  sample(363);assert.ok(f.actors.enemies[0].body.rotation.x>1.2);assert.ok(new T.Box3().setFromObject(f.actors.enemies[0].body).min.y>=-6.901,'fallen pursuer sinks into the platform');
  sample(379);assert.ok(escape.tornCloth.getWorldPosition(new T.Vector3()).distanceTo(f.actors.enemies[4].arms[0].palm.localToWorld(new T.Vector3(0,-.078,-.032)))<.035,'grab misses cloth');
  for(const t of [381,382,383]){sample(t);assert.ok(bag.localToWorld(new T.Vector3(0,.50,0)).distanceTo(f.actors.enemies[5].arms[1].palm.localToWorld(new T.Vector3(0,-.078,-.032)))<.035,`bag strap not gripped at ${t}`);}
  sample(381);assert.equal(bag.parent,f.actors.root);assert.equal(placeholder.visible,false);assert.equal(escape.tornCloth.visible,false);
  const released=f.actors.enemies[4].root.position.clone();sample(385);assert.ok(released.distanceTo(f.actors.enemies[4].root.position)<.001,'released pursuer follows camera');assert.ok(f.actors.enemies[5].root.position.z<121,'bag thief enters maintenance wall');
  sample(360);assert.equal(escape.tornCloth.visible,false);
 }finally{escape.dispose();f.dispose();}
});


test('reused infected actors clear prior head and hand poses before another scene',()=>{
  const f=fixture(),actor=f.actors.enemies[0];
  const snapshot=()=>{const out=[];for(const root of [actor.head,...actor.arms.map(a=>a.palm)])root.traverse(o=>out.push(...o.position.toArray(),...o.quaternion.toArray()));return out;};
  try{
    actor.pose(320,'walk');const baseline=snapshot();
    actor.head.rotation.y=2.3;actor.eyeLook(1);
    for(const arm of actor.arms){arm.palm.rotation.set(.8,.6,-.5);arm.palm.userData.grip(.95,1);}
    actor.pose(320,'walk');assert.deepEqual(snapshot(),baseline,'a later scene retains the clerk turn or an old grip');
    actor.pose(435,'run');actor.head.rotation.y=-1.5;actor.pose(320,'walk');assert.deepEqual(snapshot(),baseline,'reverse seeking retains a later pose');
  }finally{f.dispose();}
});


test('the overhead attacker clears the crouched camera and lands above the track floor',()=>{
  const f=fixture(),bag=new T.Group(),placeholder=new T.Group();f.scene.add(bag);
  const escape=createSingleArmEscape(f.camera,f.actors,f.props,bag,placeholder);
  const sample=t=>{const state=stateAt(t);f.camera.position.fromArray(state.camera);f.camera.lookAt(new T.Vector3(...state.look));f.scene.updateMatrixWorld(true);escape.update(t);f.scene.updateMatrixWorld(true);};
  try{
    for(let t=372;t<=374;t+=.025){sample(t);const head=f.actors.enemies[3].head.getWorldPosition(new T.Vector3());assert.ok(head.distanceTo(f.camera.position)>.45,'attacker face intersects the viewpoint');if(Math.hypot(head.x-f.camera.position.x,head.z-f.camera.position.z)<.65)assert.ok(head.y>f.camera.position.y+.45,'attacker fails to clear the lowered head');}
    sample(375);const bounds=new T.Box3().setFromObject(f.actors.enemies[3].body);assert.ok(bounds.min.y>=-8.05,'fallen arms pass through the track bed');assert.ok(bounds.max.y<-6.9,'attacker does not fall below platform level');
    const landed=f.actors.enemies[3].head.getWorldPosition(new T.Vector3());sample(370);sample(375);assert.ok(landed.distanceTo(f.actors.enemies[3].head.getWorldPosition(new T.Vector3()))<.001,'rewinding changes the landing');
  }finally{escape.dispose();f.dispose();}
});


test('car vault plants the palm on the bonnet, retains the pipe and clears the vehicle',()=>{
  const f=fixture(),car=new T.Group();car.position.set(-8,.1,81.3);car.rotation.y=Math.PI/2;f.scene.add(car);
  const vault=createCarVault(f.actors,f.props,car);
  function sample(t){const s=stateAt(t);f.camera.position.fromArray(s.camera);f.camera.lookAt(new T.Vector3(...s.look));f.scene.updateMatrixWorld(true);vault.update(t);f.scene.updateMatrixWorld(true);}
  try{
    for(let t=251.9;t<=252.65;t+=.05){sample(t);const palm=f.actors.playerArms[0].palm.localToWorld(new T.Vector3(0,-.033,0)),support=car.localToWorld(new T.Vector3(.62,.96,1.72));assert.ok(palm.distanceTo(support)<.025,`palm slips off bonnet at ${t}: ${palm.distanceTo(support)}`);const back=new T.Vector3(0,0,1).applyQuaternion(f.actors.playerArms[0].palm.getWorldQuaternion(new T.Quaternion()));assert.ok(back.y>.99,'the back of the hand faces the bonnet instead of the sky');}
    for(let t=250.5;t<258;t+=.05){sample(t);const hand=f.actors.playerArms[1].palm.localToWorld(new T.Vector3(0,-.078,-.032));assert.ok(hand.distanceTo(f.props.localToWorld(new T.Vector3(0,0,.24)))<.03,`pipe grip lost at ${t}`);if(vault.legs.visible)for(const foot of [vault.legs.children[0],vault.legs.children[2]]){const bounds=new T.Box3().setFromObject(foot);if(bounds.max.z>80.4&&bounds.min.z<82.2)assert.ok(bounds.min.y>1.05,`foot enters bonnet at ${t}: ${bounds.min.y}`);}}
    sample(254);const before=vault.legs.children[0].getWorldPosition(new T.Vector3());sample(258);assert.equal(vault.legs.visible,false);sample(254);assert.ok(vault.legs.children[0].getWorldPosition(new T.Vector3()).distanceTo(before)<1e-6);
  }finally{vault.dispose();f.dispose();}
});


test('store ambush keeps the face outside the camera and connects the block and knee strike',()=>{
  const f=fixture(),ambush=createStoreAmbush(f.camera,f.actors,f.props),enemy=f.actors.enemies[1];
  function sample(t){const s=stateAt(t);f.camera.position.fromArray(s.camera);f.camera.lookAt(new T.Vector3(...s.look));f.props.position.set(.23,-.37,-.55);f.props.rotation.set(.4,-.15,-.35);f.scene.updateMatrixWorld(true);ambush.update(t);f.scene.updateMatrixWorld(true);}
  try{
    for(let t=120;t<134;t+=.05){sample(t);assert.ok(enemy.head.getWorldPosition(new T.Vector3()).distanceTo(f.camera.position)>.4,`face enters camera at ${t}`);assert.ok(new T.Box3().setFromObject(enemy.body).min.y>=.299,`enemy sinks into store floor at ${t}`);}
    for(const t of [123,125,127.2,129.9]){sample(t);assert.ok(f.props.getWorldPosition(new T.Vector3()).distanceTo(enemy.body.localToWorld(new T.Vector3(0,1.25,-.23)))<.002,'pipe misses torso');for(const [i,z]of [[0,-.25],[1,.24]]){const fingers=f.actors.playerArms[i].palm.localToWorld(new T.Vector3(0,-.078,-.032));assert.ok(fingers.distanceTo(f.props.localToWorld(new T.Vector3(0,0,z)))<.03,`blocking hand ${i} loses pipe at ${t}`);}}
    for(const t of [126.8,127.8]){sample(t);const mouth=enemy.head.localToWorld(new T.Vector3(0,-.083,-.14)),wrist=f.actors.playerArms[0].palm.localToWorld(new T.Vector3(0,.012,0));assert.ok(mouth.distanceTo(wrist)>.05&&mouth.distanceTo(wrist)<.14,'teeth do not close beside the wrist');for(const [i,z]of [[0,-.25],[1,.24]]){const fingers=f.actors.playerArms[i].palm.localToWorld(new T.Vector3(0,-.078,-.032));assert.ok(fingers.distanceTo(f.props.localToWorld(new T.Vector3(0,0,z)))<.03,`bite block hand ${i} leaves pipe`);}}
    sample(130);const front=ambush.knee.getWorldPosition(new T.Vector3()).add(new T.Vector3(0,0,-.12).applyQuaternion(f.actors.rig.getWorldQuaternion(new T.Quaternion()))),contact=enemy.body.localToWorld(new T.Vector3(0,.97,-.20));assert.ok(front.distanceTo(contact)<.001,`knee misses abdomen: ${front.distanceTo(contact)}`);
    const hit=enemy.root.getWorldPosition(new T.Vector3());sample(130.6);assert.ok(enemy.root.getWorldPosition(new T.Vector3()).distanceTo(hit)>.5,'enemy does not recoil');sample(130);assert.ok(enemy.root.getWorldPosition(new T.Vector3()).distanceTo(hit)<1e-6);
    sample(134);assert.equal(ambush.leg.visible,false);
  }finally{ambush.dispose();f.dispose();}
});


test('toppled shelf pivots on the floor and bottles detach, break, and restore on rewind',()=>{
  const parent=new T.Group(),shelf=new T.Group();shelf.position.set(25,.3,38.2);parent.add(shelf);
  const material=new T.MeshStandardMaterial(),bodyGeometry=new T.BoxGeometry(4.9,1.9,.67),body=new T.Mesh(bodyGeometry,material);body.position.y=.95;shelf.add(body);
  const bottleGeometry=new T.CylinderGeometry(.04,.06,.35),bottles=Array.from({length:12},(_,i)=>{const b=new T.Group();b.add(new T.Mesh(bottleGeometry,material));b.position.set(-2.2+i*.4,1.82,.24);shelf.add(b);return b;});
  const fall=createShelfFall(shelf,bottles,parent);
  try{
    for(let t=121;t<=126;t+=.1){fall.update(t);parent.updateMatrixWorld(true);assert.ok(new T.Box3().setFromObject(body).min.y>=.299,'shelf cuts through floor');}
    fall.update(122.1);parent.updateMatrixWorld(true);assert.equal(bottles[0].parent,parent);assert.equal(bottles[0].visible,true);const released=bottles[0].getWorldPosition(new T.Vector3());assert.ok(released.z<38.3,'rear bottle crosses player instead of falling away');
    fall.update(126);assert.ok(bottles.every(b=>!b.visible));const m=new T.Matrix4();fall.shards.getMatrixAt(0,m);assert.ok(Math.abs(m.elements[13]-.306)<1e-6,'glass fragments do not settle on floor');
    fall.update(120);assert.equal(fall.shards.visible,false);assert.ok(bottles.every(b=>b.parent===shelf&&b.visible));assert.ok(shelf.position.distanceTo(new T.Vector3(25,.3,38.2))<1e-6);fall.update(122.1);parent.updateMatrixWorld(true);assert.ok(bottles[0].getWorldPosition(new T.Vector3()).distanceTo(released)<1e-6);
  }finally{fall.dispose();bodyGeometry.dispose();bottleGeometry.dispose();material.dispose();}
});
