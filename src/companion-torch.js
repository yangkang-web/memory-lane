import * as T from 'three';
import { smooth } from './last-companion-timeline.js';
import { placePalm } from './companion-performance.js';

const resting = new T.Vector3(1.02, -7.991, 104.35);
const setDown = new T.Vector3(1.18, -7.991, 104.72);
const floorRotation = new T.Quaternion().setFromEuler(new T.Euler(0, Math.PI, 0));

// Only the unpinned right arm can retrieve the light. Put it down before the
// crowbar pickup, leaving its beam on the station while the right hand is busy.
export function createTorchPickup(actors, flashlight, light) {
  const { rig, playerArms: [, right] } = actors;
  const handTurn = new T.Quaternion().setFromEuler(new T.Euler(0, Math.PI / 2, 0));
  function update(t) {
    if (t < 295 || t >= 424) return;
    flashlight.visible = true;
    rig.updateWorldMatrix(true, false);
    const lift = smooth(t, 311, 313), lower = smooth(t, 317, 319);
    const held = new T.Vector3(.16, -.10, -.48);
    const position = rig.worldToLocal(resting.clone()).lerp(held, lift);
    position.lerp(rig.worldToLocal(setDown.clone()), lower);
    const rotation = rig.getWorldQuaternion(new T.Quaternion()).invert().multiply(floorRotation);
    rotation.slerp(new T.Quaternion().setFromEuler(new T.Euler(-.07, .06, 0)), lift);
    rotation.slerp(rig.getWorldQuaternion(new T.Quaternion()).invert().multiply(floorRotation), lower);
    if (t >= 337.6) {
      const roll = smooth(t, 337.6, 339);
      position.copy(rig.worldToLocal(setDown.clone().lerp(new T.Vector3(1.4, -7.991, 105.05), roll)));
      rotation.copy(rig.getWorldQuaternion(new T.Quaternion()).invert().multiply(new T.Quaternion().setFromEuler(new T.Euler(0, Math.PI + roll * 1.1, roll * 5))));
    }
    const worldPosition = rig.localToWorld(position.clone());
    flashlight.position.copy(flashlight.parent.worldToLocal(worldPosition));
    const worldRotation = rig.getWorldQuaternion(new T.Quaternion()).multiply(rotation);
    flashlight.quaternion.copy(flashlight.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(worldRotation));
    flashlight.updateWorldMatrix(true, true);
    light.intensity = t >= 338 && t < 343 ? (Math.sin(t * 29) > .2 ? 7 : .2) : t >= 343 ? .6 : 7;
    if (t < 310 || t >= 319.5) return;
    right.shoulder.position.set(.23, -.28, -.15 + lift * .10);
    const shaft = position.clone().add(new T.Vector3(0,0,.03).applyQuaternion(rotation));
    const approach = shaft.clone().sub(right.shoulder.position).applyQuaternion(rotation.clone().invert());
    const roll = new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),Math.atan2(approach.x,-approach.y));
    const palmRotation = new T.Quaternion(),contact=new T.Vector3();
    for(let i=0;i<4;i++){
      palmRotation.copy(rotation).multiply(roll).multiply(handTurn);
      contact.copy(shaft).sub(new T.Vector3(0,-.045,-.032).applyQuaternion(palmRotation));
      contact.lerp(new T.Vector3(.22,-.43,-.4),1-smooth(t,310,311));
      contact.lerp(new T.Vector3(.22,-.43,-.4),smooth(t,319,319.5));
      placePalm(right,rig,contact,palmRotation,.15+.8*smooth(t,310.7,311)*(1-smooth(t,319,319.3)));
      right.palm.updateWorldMatrix(true,false);
      const fore=rig.worldToLocal(right.palm.getWorldPosition(new T.Vector3())).sub(rig.worldToLocal(right.elbow.getWorldPosition(new T.Vector3()))).applyQuaternion(rotation.clone().invert());
      roll.setFromAxisAngle(new T.Vector3(0,0,1),Math.atan2(fore.x,-fore.y));
    }
    right.palm.userData.grip(.95 * (1 - smooth(t, 319, 319.3)), 1);
  }
  return { update };
}
