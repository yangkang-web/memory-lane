import * as T from 'three';
import { smooth, stateAt } from './last-companion-timeline.js';
import { placePalm } from './companion-performance.js';

const firstRest = new T.Vector3(1.25, -8.015, 104.35);
const secondRest = new T.Vector3(1.4, -8.015, 105.9);
const firstRotation = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), -Math.PI / 2);
const secondRotation = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), -1.05);

// The held mesh is also the resting mesh: no frame swaps between duplicate bars.
// Every pose is sampled from time so seeking backwards restores the same object.
export function createCrowbarPickup(actors, props, hook, floorCrowbar) {
  const { rig, playerArms: [, right] } = actors;
  const handTurn = new T.Quaternion().setFromEuler(new T.Euler(0, Math.PI / 2, 0));
  function worldPose(position, rotation) {
    props.position.copy(rig.worldToLocal(position.clone()));
    props.quaternion.copy(rig.getWorldQuaternion(new T.Quaternion()).invert().multiply(rotation));
  }
  function update(t) {
    if(t>=442.8){
      props.visible=hook.visible=true;
      const releaseAt=443.3,dropEnd=444;
      const heldPosition=new T.Vector3(.23,-.37,-.55);
      const heldRotation=new T.Quaternion().setFromEuler(new T.Euler(.4,-.15,-.35));
      if(t<releaseAt){
        props.position.copy(heldPosition);props.quaternion.copy(heldRotation);props.updateMatrix();
        const contact=new T.Vector3(.032,.045,.18).applyMatrix4(props.matrix);
        placePalm(right,rig,contact,heldRotation.clone().multiply(handTurn),.9);
      }else{
        const state=stateAt(releaseAt),eye=new T.Vector3(...state.camera);
        const view=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().lookAt(eye,new T.Vector3(...state.look),new T.Vector3(0,1,0)));
        const release=heldPosition.clone().applyQuaternion(view).add(eye);
        const fall=Math.min(1,Math.max(0,(t-releaseAt)/(dropEnd-releaseAt)));
        const rest=new T.Vector3(4.05,.188,158.45);
        const position=release.clone().lerp(rest,fall*fall);
        // Small settling bounce after the first contact, on the basin's .17m slab.
        if(t>dropEnd&&t<444.25)position.y+=Math.sin((t-dropEnd)/.25*Math.PI)*.025;
        const rotation=view.multiply(heldRotation).slerp(new T.Quaternion().setFromEuler(new T.Euler(0,.7,0)),smooth(t,releaseAt,dropEnd));
        worldPose(position,rotation);
        right.palm.userData.grip(.1);
      }
      return;
    }
    if (t < 300 || t >= 360) return;
    floorCrowbar.visible = false;
    if (t >= 327 && t < 337.4) return;
    props.visible = hook.visible = true;
    const heldPosition = props.position.clone(), heldRotation = props.quaternion.clone();
    const first = t < 327;
    const grasp = first ? 324 : 356;
    const liftEnd = first ? 326.8 : 357.7;
    worldPose(first ? firstRest : secondRest, first ? firstRotation : secondRotation);
    if (t >= 337.4 && t < 339.3) {
      const drop = smooth(t, 337.4, 339.3);
      const tip = new T.Vector3(.2, -7.53, 104.32);
      const direction = new T.Vector3(.39, .24, .34).normalize();
      const release = tip.addScaledVector(direction, .4);
      const position = release.lerp(secondRest, drop);
      position.y += Math.sin(drop * Math.PI) * .13;
      const rotation = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 0, 1), direction).slerp(secondRotation, drop);
      worldPose(position, rotation);
      return;
    }
    const lift = smooth(t, grasp, liftEnd);
    props.position.lerp(heldPosition, lift);
    props.quaternion.slerp(heldRotation, lift);
    if (t < grasp - 2) return;
    right.shoulder.position.set(.23, -.28, -.18 + lift * .13);
    props.updateMatrix();
    const shaft = new T.Vector3(0, 0, .18).applyMatrix4(props.matrix);
    const approachDirection = shaft.clone().sub(right.shoulder.position).applyQuaternion(props.quaternion.clone().invert());
    const roll = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), Math.atan2(approachDirection.x, -approachDirection.y));
    const approach = smooth(t, grasp - 2, grasp - .2),grip=.12+smooth(t,grasp-.3,grasp)*.82;
    const contact=new T.Vector3(),orientation=new T.Quaternion();
    // Bring the elbow out to the side, then align the wrist to the forearm so
    // the sleeve does not cover the closed fingers when looking down.
    const elbowPole=new T.Vector3(.95,-.25,.15);
    for(let i=0;i<4;i++){
      orientation.copy(props.quaternion).multiply(roll).multiply(handTurn);
      contact.copy(shaft).sub(new T.Vector3(0,-.045,-.032).applyQuaternion(orientation));
      contact.lerp(new T.Vector3(.22,-.43,-.4),1-approach);
      placePalm(right,rig,contact,orientation,grip,elbowPole);
      right.palm.updateWorldMatrix(true,false);
      const fore=rig.worldToLocal(right.palm.getWorldPosition(new T.Vector3())).sub(rig.worldToLocal(right.elbow.getWorldPosition(new T.Vector3()))).applyQuaternion(props.quaternion.clone().invert());
      roll.setFromAxisAngle(new T.Vector3(0,0,1),Math.atan2(fore.x,-fore.y));
    }
    right.palm.userData.grip(grip,smooth(t,grasp-.3,grasp));
  }
  return { update };
}
