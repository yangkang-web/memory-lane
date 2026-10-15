import * as T from 'three';
import { smooth } from './last-companion-timeline.js';

const palmCenter = new T.Vector3(0, -.033, 0);
const pipeAxis = new T.Vector3(0, 0, 1);

// Reach solves the wrist, while contacts are specified at the centre of the palm.
// Setting the palm's orientation afterwards keeps the fingers on the prop even
// when the elbow bends or the camera looks down.
export function placePalm(arm, rig, center, orientation, grip = .8, elbowPole = null) {
  arm.reach(center.clone().sub(palmCenter.clone().applyQuaternion(orientation)), elbowPole);
  arm.elbow.updateWorldMatrix(true, false);
  const world = rig.getWorldQuaternion(new T.Quaternion()).multiply(orientation);
  arm.palm.quaternion.copy(arm.elbow.getWorldQuaternion(new T.Quaternion()).invert().multiply(world));
  arm.palm.userData.grip(grip);
}

export function createCompanionPerformance(actors, props, dressingRoll, wraps) {
  const { rig, playerArms: [left, right] } = actors;
  const cloth = dressingRoll.material;
  const stripGeometry = new T.BufferGeometry();
  stripGeometry.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(18), 3));
  const strip = new T.Mesh(stripGeometry, cloth);
  strip.frustumCulled = false;
  rig.add(strip);

  function gripWeapon(tip, direction, twoHands = false, alignWrist = false) {
    props.quaternion.setFromUnitVectors(pipeAxis, direction.clone().normalize());
    props.position.copy(tip).addScaledVector(direction.clone().normalize(), .4);
    props.updateMatrix();
    right.shoulder.position.set(.23, -.33, -.05);
    const roll=new T.Quaternion();
    if(alignWrist){
      const shaft=new T.Vector3(0,0,.24).applyMatrix4(props.matrix);
      const approach=shaft.sub(right.shoulder.position).applyQuaternion(props.quaternion.clone().invert());
      roll.setFromAxisAngle(pipeAxis,Math.atan2(approach.x,-approach.y));
    }
    const orientation = props.quaternion.clone().multiply(roll).multiply(new T.Quaternion().setFromEuler(new T.Euler(0, Math.PI / 2, 0)));
    // The shaft belongs inside the curled fingers, below the palm centre.
    const hand = new T.Vector3(.032, .045, 0).applyQuaternion(roll).add(new T.Vector3(0,0,.24)).applyMatrix4(props.matrix);
    placePalm(right, rig, hand, orientation, .95);
    if(alignWrist)for(let i=0;i<3;i++){
      right.palm.updateWorldMatrix(true,false);
      const fore=rig.worldToLocal(right.palm.getWorldPosition(new T.Vector3())).sub(rig.worldToLocal(right.elbow.getWorldPosition(new T.Vector3()))).applyQuaternion(props.quaternion.clone().invert());
      roll.setFromAxisAngle(pipeAxis,Math.atan2(fore.x,-fore.y));
      hand.set(.032,.045,0).applyQuaternion(roll).add(new T.Vector3(0,0,.24)).applyMatrix4(props.matrix);
      orientation.copy(props.quaternion).multiply(roll).multiply(new T.Quaternion().setFromEuler(new T.Euler(0,Math.PI/2,0)));
      placePalm(right,rig,hand,orientation,.95);
    }
    if(alignWrist)right.palm.userData.grip(.95,1);
    if (twoHands) {
      left.shoulder.position.set(-.23, -.33, -.05);
      placePalm(left, rig, new T.Vector3(.032, .045, -.23).applyMatrix4(props.matrix), orientation, .92);
    }
  }

  function combat(t, action) {
    if (action === 'shelf-impact') {
      gripWeapon(new T.Vector3(-.4, -.12, -.49), new T.Vector3(1, 0, 0), true);
      return;
    }
    if (action === 'crowbar-block') {
      gripWeapon(new T.Vector3(-.4, -.1, -.55), new T.Vector3(1, 0, 0), false);
      return;
    }
    if (t >= 332 && t < 337.4) {
      const lift = smooth(t, 332, 335);
      const tip = rig.worldToLocal(new T.Vector3(.2, -7.65 + lift * .12, 104.32));
      const handle = rig.worldToLocal(new T.Vector3(.59, -7.23 - lift * .06, 104.66));
      gripWeapon(tip, handle.sub(tip),false,true);
      return;
    }
    if (action !== 'pipe-counter') return;
    const second = t >= 136.4;
    const hit = second ? 138 : 135;
    const enemy = actors.enemies[1];
    enemy.head.updateWorldMatrix(true, false);
    const contact = rig.worldToLocal(enemy.head.localToWorld(new T.Vector3(second ? -.035 : .04, -.02, -.105)));
    const ready = new T.Vector3(second ? .25 : .6, second ? .48 : .2, -.37);
    const follow = contact.clone().add(new T.Vector3(second ? -.16 : -.42, -.23, .1));
    let tip = ready.clone().lerp(contact, smooth(t, hit - .42, hit));
    if (t > hit) tip.copy(contact).lerp(follow, smooth(t, hit, hit + .24));
    if (t > hit + .24) tip.lerp(new T.Vector3(.25, .1, -.58), smooth(t, hit + .24, hit + 1.1));
    const handle = new T.Vector3(.25, -.26, -.25);
    gripWeapon(tip, handle.sub(tip));
  }

  function dressing(t, action, compact=false) {
    const active = action === 'bandage' || action === 'one-hand-bandage';
    const oneHand = action === 'one-hand-bandage';
    const start = oneHand ? 349 : 214;
    const elapsed = t - start;
    strip.visible = active && elapsed >= 4.5 && elapsed < 9;
    dressingRoll.visible = active && elapsed < 9.5;
    wraps.forEach((m, i) => m.visible = t >= 219 + i * .8 && (t < 338 || t >= 352 + i * .65));
    if (!active) return;

    left.shoulder.position.set(-.27, -.04, -.18);
    left.shoulder.rotation.set(1.35, 0, .4);
    left.elbow.rotation.set(-.2, 0, 0);
    right.shoulder.position.set(.16, -.27, -.14);
    left.shoulder.updateWorldMatrix(true, false);
    // First press directly onto the wet sleeve. Only then pass the roll around it.
    const angle = smooth(elapsed, 4.5, 8.8) * Math.PI * (compact?1.5:5);
    const point = new T.Vector3(.097 * Math.cos(angle), -.235, .097 * Math.sin(angle));
    const center = rig.worldToLocal(left.shoulder.localToWorld(point));
    const outward = new T.Vector3(Math.cos(angle), 0, Math.sin(angle));
    const normal = outward.applyQuaternion(left.shoulder.quaternion);
    const orientation = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 0, -1), normal.clone().negate());
    const approach = smooth(elapsed, .5, 1.6);
    center.lerp(new T.Vector3(.13, -.36, -.4), 1 - approach);
    // Shaking is kept tangential to the wound, not away from it.
    center.y += Math.sin(t * 21) * .0025;
    placePalm(right, rig, center, orientation, elapsed < 4.5 ? .12 : .62);
    right.palm.updateWorldMatrix(true, false);
    const rollPosition = rig.worldToLocal(right.palm.localToWorld(new T.Vector3(.04, -.056, -.018)));
    dressingRoll.position.copy(rollPosition);
    dressingRoll.quaternion.copy(orientation);
    const anchor = rig.worldToLocal(left.shoulder.localToWorld(new T.Vector3(.086, -.235, 0)));
    const edge = new T.Vector3(0, .018, 0).applyQuaternion(left.shoulder.quaternion);
    const a = anchor.clone().add(edge), b = anchor.clone().sub(edge);
    const c = rollPosition.clone().add(edge), d = rollPosition.clone().sub(edge);
    const positions = stripGeometry.attributes.position;
    [a, b, c, b, d, c].forEach((v, i) => positions.setXYZ(i, v.x, v.y, v.z));
    positions.needsUpdate = true;
    stripGeometry.computeVertexNormals();
  }

  return { combat, dressing, dispose() { strip.removeFromParent(); stripGeometry.dispose(); } };
}
