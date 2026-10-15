import * as THREE from 'three';
import { createArm } from './rig.js';

// The player's own body below the neck, seen from the eyes. The rig is never animated by clips: each frame the left arm
// is solved onto a pose target, so it can guard, show the wound and reach for him wherever the player stands, and the
// right one hangs at the side. The torso is there so that looking down finds a chest for the pendant to rest on.
// Mixamo figures face +z, so the body turns by yaw + π to look down the camera's -z.

// Pose targets in the body frame: [right, up from the floor, forward] metres.
const POSES = {
  // Hanging at the side, below the view unless the player looks down.
  rest: { wrist: [-0.23, 0.87, 0.05], pole: [-0.5, 1.15, -0.4], finger: [0.05, -1, 0.1], palm: [1, 0, 0.15], curl: 0.25 },
  // A flinch: the hand thrown up before the face, back of it towards the blade, fingers loosely open. The cut lands
  // where this exposes it, across the back of the hand.
  guard: { wrist: [0.06, 1.58, 0.36], pole: [-0.55, 1.15, 0.15], finger: [0.25, 1, 0.15], palm: [0.1, 0, 1], curl: 0.3, thumb: 0.15 },
  // Pulled in low after the cut.
  injured: { wrist: [-0.1, 1.06, 0.3], pole: [-0.5, 0.75, 0], finger: [0.55, -0.15, 0.8], palm: [0.3, -0.4, -0.2], curl: 0.45 },
  // Raised in front of the eyes, the back of the hand turned to them to show the cut.
  inspect: { wrist: [-0.02, 1.36, 0.36], pole: [-0.5, 0.85, 0.1], finger: [0.9, 0.25, 0.2], palm: [0, -0.55, 0.8], curl: 0.3 },
  // Offered towards him, palm down so he can take it from beneath; `wrist` comes from the meeting point.
  reach: { wrist: null, pole: [-0.55, 0.8, 0.1], finger: null, palm: [0, -1, 0], curl: 0.12 },
  // Fingertips raised to touch what he holds out; `wrist` comes from the point, a little short of it.
  touch: { wrist: null, pole: [-0.55, 0.9, 0], finger: null, palm: [0.2, 0.3, 1], curl: 0.2, thumb: 0.2 },
};
// The right arm only ever hangs.
const HANG = { wrist: [0.23, 0.87, 0.05], pole: [0.5, 1.15, -0.4], finger: [-0.05, -1, 0.1], palm: [-1, 0, 0.15] };
// Points on the body, from its bones, in the body frame: [right, up, forward] metres.
const ANCHORS = {
  // Where the pendant lies: on the breastbone, in the open neck of the shirt.
  chest: ['mixamorigSpine2', [0, 0.075, 0.112]],
  neck: ['mixamorigNeck', [0, 0, 0]],
  // The back of the neck, where the clasp closes.
  nape: ['mixamorigNeck', [0, 0.015, -0.062]],
};
// Along the forearm from the wrist (0) to the elbow (1): the cut crosses the back of the hand just past the wrist, where
// the skin shows, and the blood soaks the cuff, which ends at about 0.06.
const CUT = -0.12, CUFF = 0.06;

export function createArms(gltf) {
  const group = new THREE.Group();
  const root = gltf.scene;
  group.add(root);
  group.visible = false;
  root.updateMatrixWorld(true);
  const left = createArm(root, 'Left'), right = createArm(root, 'Right');
  const head = root.getObjectByName('mixamorigHead');
  const headRest = head.getWorldPosition(new THREE.Vector3());

  // The cut is painted in the skin's bind space, so it stays on the hand whatever the arm does.
  const wound = { value: 0 };
  root.traverse(o => {
    if (!o.isSkinnedMesh) return;
    o.castShadow = false;
    o.receiveShadow = false;
    o.frustumCulled = false;
    // Joint positions in the mesh's bind space, the same space as its vertices.
    const { bones, boneInverses } = o.skeleton;
    const joint = name => new THREE.Vector3().setFromMatrixPosition(boneInverses[bones.findIndex(b => b.name === name)].clone().invert());
    const wrist = joint('mixamorigLeftHand'), elbow = joint('mixamorigLeftForeArm');
    // The skin of the neck stops at the collar, so looking down finds a neckline, not the cut. Inside faces are drawn
    // near-black so the open collar reads as shadow.
    const collar = o.name === 'Ch07_Body' ? joint('mixamorigNeck').y - 0.012 : 99;
    // The back of the hand faces up in the T-pose.
    const back = new THREE.Vector3(0, 1, 0);
    const materials = Array.isArray(o.material) ? o.material : [o.material];
    o.material = materials.map(material => {
      const m = material.clone();
      m.side = THREE.DoubleSide;
      m.onBeforeCompile = shader => {
        Object.assign(shader.uniforms, {
          woundStrength: wound,
          woundWrist: { value: wrist }, woundElbow: { value: elbow }, woundBack: { value: back },
        });
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vBind;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBind = position;');
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', `#include <common>
varying vec3 vBind;
uniform float woundStrength;
uniform vec3 woundWrist, woundElbow, woundBack;
float woundWet = 0.0;`)
          .replace('#include <color_fragment>', `#include <color_fragment>
if (vBind.y > ${collar.toFixed(3)} && abs(vBind.x) < 0.3) discard;
{
  vec3 axis = woundElbow - woundWrist;
  float len = length(axis);
  axis /= len;
  vec3 rel = vBind - woundWrist;
  float t = dot(rel, axis) / len;
  vec3 radial = rel - axis * dot(rel, axis);
  float r = length(radial);
  vec3 side = normalize(cross(axis, woundBack));
  float around = atan(dot(radial, side), dot(radial, normalize(woundBack)));
  // A ragged diagonal cut over the back of the hand.
  float line = t - (${CUT.toFixed(2)}) - around * 0.09 + sin(around * 23.0) * 0.006;
  float onBack = smoothstep(1.1, 0.5, abs(around));
  float cut = smoothstep(0.03, 0.008, abs(line)) * onBack;
  float stain = smoothstep(0.14, 0.0, abs(line + 0.02 - sin(around * 5.0) * 0.02)) * smoothstep(1.5, 0.5, abs(around));
  // Runs of blood from the cut back over the wrist, and the cuff soaked through.
  float drip = smoothstep(0.03, 0.0, abs(fract(around * 2.4 + 0.3) - 0.5) - 0.36) * step(0.0, line) * smoothstep(${(CUFF - CUT).toFixed(2)}, 0.0, line) * onBack;
  float soak = smoothstep(${(CUFF - 0.02).toFixed(2)}, ${(CUFF + 0.02).toFixed(2)}, t)
    * smoothstep(${(CUFF + 0.2).toFixed(2)}, ${(CUFF + 0.03).toFixed(2)}, t + sin(around * 3.0 + 1.0) * 0.05 + sin(around * 7.0) * 0.02)
    * smoothstep(1.4, 0.3, abs(around));
  float k = woundStrength;
  woundWet = clamp(stain * 0.7 + drip + cut + soak, 0.0, 1.0) * k;
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.3, 0.015, 0.02), clamp(stain * 0.65 + drip * 0.8, 0.0, 1.0) * k);
  // Blood in dark cloth reads as a deeper, wetter dark rather than red.
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.11, 0.006, 0.012), soak * 0.9 * k);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.1, 0.0, 0.004), cut * k);
}`)
          .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.38, woundWet);')
          .replace('#include <dithering_fragment>', '#include <dithering_fragment>\nif (!gl_FrontFacing) gl_FragColor.rgb = vec3(0.006, 0.005, 0.006);');
      };
      return m;
    });
    if (o.material.length === 1) o.material = o.material[0];
  });

  const current = { wrist: new THREE.Vector3(), pole: new THREE.Vector3(), finger: new THREE.Vector3(), palm: new THREE.Vector3(), curl: 0, thumb: 0 };
  const wanted = { wrist: new THREE.Vector3(), pole: new THREE.Vector3(), finger: new THREE.Vector3(), palm: new THREE.Vector3(), curl: 0, thumb: 0 };
  const basis = { right: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), forward: new THREE.Vector3(), origin: new THREE.Vector3() };
  const world = new THREE.Vector3(), pole = new THREE.Vector3(), finger = new THREE.Vector3(), palm = new THREE.Vector3();
  let pose = 'rest', rate = 6, settled = true, reachPoint = null;
  const toBody = (point, target) => {
    const p = world.subVectors(point, basis.origin);
    return target.set(p.dot(basis.right), p.y, p.dot(basis.forward));
  };
  const toWorld = ([r, u, f], target, origin = true) => {
    target.set(0, 0, 0).addScaledVector(basis.right, r).addScaledVector(basis.up, u).addScaledVector(basis.forward, f);
    return origin ? target.add(basis.origin) : target;
  };

  function aim(name) {
    const spec = POSES[name];
    if (name === 'touch' && reachPoint) {
      toBody(reachPoint, wanted.wrist);
      // Fingers on towards the point, the wrist 9 cm short of it.
      wanted.finger.set(wanted.wrist.x + 0.2, wanted.wrist.y - 1.45, wanted.wrist.z).normalize();
      wanted.wrist.addScaledVector(wanted.finger, -0.09);
    } else if (name === 'reach' && reachPoint) {
      toBody(reachPoint, wanted.wrist);
      // Fingers run from the shoulder out towards him, level.
      wanted.finger.set(wanted.wrist.x + 0.18, 0, wanted.wrist.z).normalize();
    } else {
      wanted.wrist.fromArray(spec.wrist);
      wanted.finger.fromArray(spec.finger).normalize();
    }
    wanted.pole.fromArray(spec.pole);
    wanted.palm.fromArray(spec.palm).normalize();
    wanted.curl = spec.curl;
    wanted.thumb = spec.thumb ?? spec.curl * 0.7;
  }

  return {
    group,
    wound,
    get pose() { return pose; },
    // Down at the side and still.
    get lowered() { return pose === 'rest' && settled; },
    // How far the arm still has to travel to its pose, in metres.
    get distance() { return current.wrist.distanceTo(wanted.wrist); },
    set(name, { speed = 6, point = null, instant = false } = {}) {
      pose = name; rate = speed; reachPoint = point;
      aim(name);
      if (instant) {
        for (const key of ['wrist', 'pole', 'finger', 'palm']) current[key].copy(wanted[key]);
        current.curl = wanted.curl;
        current.thumb = wanted.thumb;
      }
      settled = false;
    },
    // World position of the middle of the palm, for whoever takes this hand.
    palm(target = new THREE.Vector3()) {
      const { finger: f, palm: p } = left.axes(finger, palm);
      return left.wrist(target).addScaledVector(f, 0.06).addScaledVector(p, 0.02);
    },
    axes() { return left.axes(new THREE.Vector3(), new THREE.Vector3()); },
    wrist: target => left.wrist(target),
    // World position of a point on the body (see ANCHORS), offset by [right, up, forward] metres.
    anchor(name, target = new THREE.Vector3(), [r, u, f] = [0, 0, 0]) {
      const [bone, offset] = ANCHORS[name];
      root.getObjectByName(bone).getWorldPosition(target);
      return target.addScaledVector(basis.right, offset[0] + r).addScaledVector(basis.up, offset[1] + u).addScaledVector(basis.forward, offset[2] + f);
    },
    // Which way the chest faces.
    get forward() { return basis.forward; },
    update(dt, camera, pose3) {
      // The body stands where the camera is, turned only by yaw, the head just behind and below the eyes.
      const yaw = pose3.yaw;
      basis.forward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
      basis.right.set(Math.cos(yaw), 0, -Math.sin(yaw));
      basis.origin.set(camera.position.x, pose3.floor, camera.position.z);
      // Looking down bends the neck, which carries the eyes a little forward over the chest.
      const bow = Math.max(0, Math.sin(-pose3.pitch)) * 0.05;
      basis.origin.addScaledVector(basis.forward, -bow);
      group.position.set(camera.position.x, camera.position.y - 0.1 - headRest.y, camera.position.z).addScaledVector(basis.forward, -0.07 - bow);
      group.rotation.set(0, yaw + Math.PI, 0);
      if ((pose === 'reach' || pose === 'touch') && reachPoint) aim(pose);
      const k = 1 - Math.exp(-dt * rate);
      for (const key of ['wrist', 'pole', 'finger', 'palm']) current[key].lerp(wanted[key], k);
      current.curl += (wanted.curl - current.curl) * k;
      current.thumb += (wanted.thumb - current.thumb) * k;
      if (pose === 'rest' && current.wrist.distanceTo(wanted.wrist) < 0.03) settled = true;
      group.visible = true;
      group.updateMatrixWorld(true);
      right.reset();
      right.solve({
        target: toWorld(HANG.wrist, new THREE.Vector3()),
        pole: toWorld(HANG.pole, pole),
        finger: toWorld(HANG.finger, finger, false).normalize(),
        palm: toWorld(HANG.palm, palm, false).normalize(),
        twist: 0.6,
      });
      right.curl(0.25);
      left.reset();
      left.solve({
        target: toWorld(current.wrist.toArray(), new THREE.Vector3()),
        pole: toWorld(current.pole.toArray(), pole),
        finger: toWorld(current.finger.toArray(), finger, false).normalize(),
        palm: toWorld(current.palm.toArray(), palm, false).normalize(),
        twist: 0.6,
      });
      left.curl(current.curl, { thumb: current.thumb });
    },
  };
}
