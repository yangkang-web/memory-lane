import * as THREE from 'three';

// Procedural layers on top of the Mixamo clips: two-bone arm IK, hand orientation, finger curl and head gaze.
// Everything is measured from the rig's rest pose at creation, so the same code serves Lucien, the hunter and the
// player's arms without per-rig axis tables. Call these after the mixer has posed the skeleton for the frame.

const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), v4 = new THREE.Vector3();
const f1 = new THREE.Vector3(), f2 = new THREE.Vector3();
const q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), q3 = new THREE.Quaternion();
const m1 = new THREE.Matrix4(), m2 = new THREE.Matrix4();
const FINGERS = ['Index', 'Middle', 'Ring', 'Pinky'];

const worldPos = (bone, target) => bone.getWorldPosition(target);
function setWorldQuaternion(bone, world) {
  bone.parent.getWorldQuaternion(q3);
  bone.quaternion.copy(q3.invert().multiply(world));
  bone.updateMatrixWorld(true);
}
// Rotation that takes the orthonormal frame (a, b, a×b) onto (A, B, A×B).
function frameRotation(a, b, A, B, target) {
  const c = f1.crossVectors(a, b).normalize();
  m1.makeBasis(a, f2.crossVectors(c, a).normalize(), c);
  const C = f1.crossVectors(A, B).normalize();
  m2.makeBasis(A, f2.crossVectors(C, A).normalize(), C);
  return target.setFromRotationMatrix(m2.multiply(m1.transpose()));
}
const orthogonal = (v, axis) => v.sub(v4.copy(axis).multiplyScalar(v.dot(axis))).normalize();

// One arm: upper arm, forearm, hand and fingers, found by Mixamo name ('Left' or 'Right').
export function createArm(root, side) {
  const bone = name => root.getObjectByName(`mixamorig${side}${name}`);
  const upper = bone('Arm'), lower = bone('ForeArm'), hand = bone('Hand');
  root.updateMatrixWorld(true);
  const rest = new Map();
  const remember = b => b && rest.set(b, b.quaternion.clone());
  // Directions in each bone's own frame, from the rest (T) pose: palms down, thumbs forward.
  const along = b => b.children.find(c => c.isBone)?.position.clone().normalize() ?? new THREE.Vector3(0, 1, 0);
  const upperAlong = along(upper), lowerAlong = along(lower);
  const middle = bone('HandMiddle1') ?? bone('HandIndex1');
  const thumb = bone('HandThumb1');
  const fingerLocal = middle.position.clone().normalize();
  const thumbLocal = thumb ? orthogonal(thumb.position.clone(), fingerLocal) : null;
  // Palm normal in hand space from the hand's chirality: finger × thumb on the left hand, thumb × finger on the right.
  let palmLocal = null, curlLocal = null;
  if (thumbLocal) {
    palmLocal = new THREE.Vector3().crossVectors(fingerLocal, thumbLocal).normalize();
    if (side === 'Right') palmLocal.negate();
    curlLocal = new THREE.Vector3().crossVectors(fingerLocal, palmLocal).normalize();
  }
  // The elbow bends towards the thumb side; its hinge in the upper arm's frame.
  let hingeLocal;
  {
    upper.getWorldQuaternion(q1);
    const armWorld = v1.copy(upperAlong).applyQuaternion(q1);
    const thumbWorld = thumbLocal ? v2.copy(thumbLocal).applyQuaternion(hand.getWorldQuaternion(q2)) : v2.set(0, 0, 1);
    hingeLocal = new THREE.Vector3().crossVectors(armWorld, thumbWorld).normalize().applyQuaternion(q1.invert());
  }
  const handRestLocal = hand.quaternion.clone();
  // Each finger joint's curl axis in its own frame, so a curl angle closes the hand towards the palm.
  const fingers = [];
  if (curlLocal) {
    for (const [digit, name] of FINGERS.entries()) {
      const chain = [1, 2, 3].map(i => bone(`Hand${name}${i}`)).filter(Boolean);
      let acc = new THREE.Quaternion();
      for (const [i, b] of chain.entries()) {
        acc = acc.clone().multiply(b.quaternion);
        fingers.push({ bone: b, axis: curlLocal.clone().applyQuaternion(acc.clone().invert()), joint: i, digit, rest: b.quaternion.clone() });
      }
    }
    const thumbs = [1, 2, 3].map(i => bone(`HandThumb${i}`)).filter(Boolean);
    const thumbAxisHand = new THREE.Vector3().crossVectors(thumbLocal, palmLocal).normalize();
    let acc = new THREE.Quaternion();
    for (const [i, b] of thumbs.entries()) {
      acc = acc.clone().multiply(b.quaternion);
      fingers.push({ bone: b, axis: thumbAxisHand.clone().applyQuaternion(acc.clone().invert()), joint: i, thumb: true, rest: b.quaternion.clone() });
    }
  }
  [upper, lower, hand].forEach(remember);
  const lengths = [upper, lower].map(b => along(b) && b.children.find(c => c.isBone).position.length());

  const out = { upper: new THREE.Quaternion(), lower: new THREE.Quaternion(), hand: new THREE.Quaternion() };
  const anim = { upper: new THREE.Quaternion(), lower: new THREE.Quaternion(), hand: new THREE.Quaternion() };
  const A = new THREE.Vector3(), D = new THREE.Vector3(), N = new THREE.Vector3(), T = new THREE.Vector3(), elbow = new THREE.Vector3();

  return {
    upper, lower, hand, side,
    get reach() { return (lengths[0] + lengths[1]) * worldScale(upper); },
    shoulder: target => worldPos(upper, target),
    wrist: target => worldPos(hand, target),
    // Hand axes in world space for the current pose.
    axes(finger = new THREE.Vector3(), palm = new THREE.Vector3()) {
      hand.getWorldQuaternion(q1);
      finger.copy(fingerLocal).applyQuaternion(q1);
      if (palmLocal) palm.copy(palmLocal).applyQuaternion(q1);
      return { finger, palm };
    },
    // Put the wrist at `target` with the elbow bent towards `pole`; optionally turn the hand so its fingers run
    // along `finger` with the palm facing `palm`. `weight` blends from the clip's pose.
    solve({ target, pole, finger = null, palm = null, weight = 1, twist = 0.55 }) {
      if (weight <= 0) return;
      anim.upper.copy(upper.quaternion); anim.lower.copy(lower.quaternion); anim.hand.copy(hand.quaternion);
      const scale = worldScale(upper);
      const l1 = lengths[0] * scale, l2 = lengths[1] * scale;
      worldPos(upper, A);
      T.copy(target);
      const toTarget = v1.subVectors(T, A);
      const d = Math.min(Math.max(toTarget.length(), Math.abs(l1 - l2) + 1e-3), (l1 + l2) * 0.999);
      const dir = D.copy(toTarget).normalize();
      T.copy(A).addScaledVector(dir, d);
      const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
      const bend = N.copy(pole).sub(A);
      orthogonal(bend, dir);
      elbow.copy(A).addScaledVector(dir, a).addScaledVector(bend, h);
      // Upper arm: point at the elbow with its hinge across the bend plane.
      const upperDir = v1.subVectors(elbow, A).normalize().clone();
      const hinge = v2.crossVectors(bend, dir).normalize().clone();
      upper.parent.getWorldQuaternion(q2);
      frameRotation(upperAlong, hingeLocal, upperDir, hinge, q1);
      upper.quaternion.copy(q2.invert().multiply(q1));
      upper.updateMatrixWorld(true);
      // Forearm: swing from straight onto the wrist target.
      lower.quaternion.copy(rest.get(lower));
      lower.updateMatrixWorld(true);
      lower.getWorldQuaternion(q1);
      const current = v1.copy(lowerAlong).applyQuaternion(q1);
      const wanted = v2.subVectors(T, elbow).normalize();
      setWorldQuaternion(lower, q2.setFromUnitVectors(current, wanted).multiply(q1));
      if (finger && palmLocal) {
        // Hand: absolute orientation; the forearm takes part of the roll so the wrist does not wring.
        frameRotation(fingerLocal, palmLocal, v3.copy(finger).normalize(), v4.copy(palm).normalize(), q1);
        if (twist > 0) {
          lower.getWorldQuaternion(q2);
          hand.parent.getWorldQuaternion(q3);
          const restHandWorld = q3.clone().multiply(handRestLocal);
          const palmNow = v1.copy(palmLocal).applyQuaternion(restHandWorld);
          const palmWanted = v2.copy(palmLocal).applyQuaternion(q1);
          const axis = v3.copy(lowerAlong).applyQuaternion(q2).normalize();
          orthogonal(palmNow, axis); orthogonal(palmWanted, axis);
          const angle = Math.atan2(v4.crossVectors(palmNow, palmWanted).dot(axis), palmNow.dot(palmWanted));
          setWorldQuaternion(lower, q2.premultiply(new THREE.Quaternion().setFromAxisAngle(axis, angle * twist)));
        }
        setWorldQuaternion(hand, q1);
      }
      out.upper.copy(upper.quaternion); out.lower.copy(lower.quaternion); out.hand.copy(hand.quaternion);
      if (weight < 1) {
        upper.quaternion.slerpQuaternions(anim.upper, out.upper, weight);
        lower.quaternion.slerpQuaternions(anim.lower, out.lower, weight);
        hand.quaternion.slerpQuaternions(anim.hand, finger ? out.hand : anim.hand, weight);
        upper.updateMatrixWorld(true);
      }
    },
    // Close the fingers by `amount` (0 open … 1 fist) over whatever the clip did, blended by `weight`.
    // `each` gives index, middle, ring and little finger their own amounts instead.
    curl(amount, { weight = 1, thumb = amount * 0.6, spread = 0, each = null } = {}) {
      if (weight <= 0) return;
      for (const f of fingers) {
        const k = f.thumb ? 0 : each ? each[f.digit] : amount;
        const angle = f.thumb ? thumb * (f.joint === 0 ? 0.35 : 0.8) : k * (f.joint === 0 ? 1.1 : 1.35) + (f.joint === 0 ? -spread : 0);
        q1.copy(f.rest).multiply(q2.setFromAxisAngle(f.axis, angle));
        f.bone.quaternion.slerp(q1, weight);
      }
      hand.updateMatrixWorld(true);
    },
    reset() { for (const [b, q] of rest) b.quaternion.copy(q); for (const f of fingers) f.bone.quaternion.copy(f.rest); upper.updateMatrixWorld(true); },
  };
}

function worldScale(bone) { bone.getWorldScale(v4); return v4.x; }

// Turns the neck and head towards a point, never faster than `rate` radians per second and never further than the
// limits from the body's facing. `weight` fades the whole layer in and out.
export function createGaze(root, { rate = 2.4, yawLimit = 1.1, pitchLimit = 0.6 } = {}) {
  const head = root.getObjectByName('mixamorigHead'), neck = root.getObjectByName('mixamorigNeck');
  root.updateMatrixWorld(true);
  // Rigs face +z at rest; that facing in the head's own frame.
  root.getWorldQuaternion(q1);
  const forwardWorld = new THREE.Vector3(0, 0, 1).applyQuaternion(q1);
  const forwardLocal = forwardWorld.applyQuaternion(head.getWorldQuaternion(q2).invert()).clone();
  const look = new THREE.Vector3(0, 0, 1);
  let weight = 0, initialised = false;
  const state = { target: null, weight: 0 };
  return {
    state,
    head,
    lookAt(point, w = 1) { state.target = point; state.weight = w; },
    release() { state.weight = 0; },
    update(dt) {
      weight += (state.weight - weight) * (1 - Math.exp(-dt * 4));
      if (weight < 0.005 || !state.target) { initialised = false; return; }
      head.getWorldQuaternion(q1);
      const current = v1.copy(forwardLocal).applyQuaternion(q1).normalize();
      worldPos(head, v2);
      const wanted = v3.subVectors(state.target, v2).normalize();
      // Clamp against the body's facing so he never looks over his own shoulder.
      root.getWorldQuaternion(q2);
      const body = v4.set(0, 0, 1).applyQuaternion(q2).setY(0).normalize();
      let yaw = Math.atan2(wanted.x, wanted.z) - Math.atan2(body.x, body.z);
      yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
      yaw = Math.max(-yawLimit, Math.min(yawLimit, yaw));
      const pitch = Math.max(-pitchLimit, Math.min(pitchLimit, Math.asin(Math.max(-1, Math.min(1, wanted.y)))));
      const heading = Math.atan2(body.x, body.z) + yaw;
      wanted.set(Math.sin(heading) * Math.cos(pitch), Math.sin(pitch), Math.cos(heading) * Math.cos(pitch));
      if (!initialised) { look.copy(current); initialised = true; }
      const angle = look.angleTo(wanted), step = rate * dt;
      if (angle > 1e-4) look.applyQuaternion(q3.setFromUnitVectors(look, angle <= step ? wanted : v2.copy(look).lerp(wanted, step / angle).normalize()));
      // Neck takes a third, the head the rest.
      const full = q2.setFromUnitVectors(current, v2.copy(current).lerp(look, weight).normalize());
      const part = new THREE.Quaternion().slerp(full, 0.35);
      neck.getWorldQuaternion(q1);
      setWorldQuaternion(neck, part.multiply(q1));
      head.getWorldQuaternion(q1);
      const now = v1.copy(forwardLocal).applyQuaternion(q1).normalize();
      const rest = q2.setFromUnitVectors(now, v2.copy(now).lerp(look, weight).normalize());
      setWorldQuaternion(head, rest.multiply(q1));
    },
  };
}
