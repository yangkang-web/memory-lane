import * as THREE from 'three';

// Emochi rebuilt for performance from the user-supplied white-character.blend: a tilted porcelain pebble with
// rubber-hose limbs, glossy ink eyes and a short pill of a mouth. The .blend is one fused, posed mesh with no rig, so
// its measured proportions are rebuilt here as parts that can move. Units are half the .blend's; +z faces forward,
// the character's right is -x. The root sits on the floor between the feet.

const BODY = { a: 0.955, b: 0.875, c: 0.474 };
const PELVIS = 0.62;
const ARM = { length: 0.8, radius: 0.082 };
const LEG = { length: 0.68, radius: 0.092 };
const ANKLE = 0.1;
const FACE = { eyeX: 0.193, eyeY: 0.31, mouthY: 0.105, mouthHalf: 0.122 };

/** Front surface of the body, in its own frame (origin at the bottom of the pebble). */
function surface(x, y, out = new THREE.Vector3()) {
  const u = x / BODY.a, v = (y - BODY.b) / BODY.b;
  return out.set(x, y, BODY.c * Math.sqrt(Math.max(0.02, 1 - u * u - v * v)));
}
function surfaceNormal(point, out = new THREE.Vector3()) {
  return out.set(point.x / BODY.a ** 2, (point.y - BODY.b) / BODY.b ** 2, point.z / BODY.c ** 2).normalize();
}

/** A round-ended tube laid along points each frame, its rings carried along without twisting. */
function createTube(material, rings, sides, caps = true) {
  const count = rings * sides;
  const geometry = new THREE.BufferGeometry();
  const position = new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const normal = new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', position);
  geometry.setAttribute('normal', normal);
  const index = [];
  for (let i = 0; i < rings - 1; i++) for (let j = 0; j < sides; j++) {
    const a = i * sides + j, b = i * sides + (j + 1) % sides;
    index.push(a, b, a + sides, b, b + sides, a + sides);
  }
  geometry.setIndex(index);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  const group = new THREE.Group();
  group.add(mesh);
  const ends = caps ? [0, 1].map(() => {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), material);
    cap.castShadow = true;
    group.add(cap);
    return cap;
  }) : [];
  const t = new THREE.Vector3(), n = new THREE.Vector3(), b = new THREE.Vector3(), o = new THREE.Vector3();
  /** points: Vector3[rings]; radius: number or (u) => number. */
  function lay(points, radius) {
    const r = typeof radius === 'function' ? radius : () => radius;
    t.subVectors(points[1], points[0]).normalize();
    n.set(0, 0, 1).cross(t);
    if (n.lengthSq() < 1e-6) n.set(1, 0, 0).cross(t);
    n.normalize();
    for (let i = 0; i < rings; i++) {
      const prev = points[Math.max(0, i - 1)], next = points[Math.min(rings - 1, i + 1)];
      t.subVectors(next, prev);
      if (t.lengthSq() < 1e-12) t.set(0, 1, 0);
      t.normalize();
      n.addScaledVector(t, -n.dot(t));
      if (n.lengthSq() < 1e-8) n.set(1, 0, 0).cross(t);
      n.normalize();
      b.crossVectors(t, n);
      const radiusHere = r(i / (rings - 1));
      for (let j = 0; j < sides; j++) {
        const angle = (j / sides) * Math.PI * 2;
        o.copy(n).multiplyScalar(Math.cos(angle)).addScaledVector(b, Math.sin(angle));
        const k = i * sides + j;
        normal.setXYZ(k, o.x, o.y, o.z);
        position.setXYZ(k, points[i].x + o.x * radiusHere, points[i].y + o.y * radiusHere, points[i].z + o.z * radiusHere);
      }
    }
    position.needsUpdate = normal.needsUpdate = true;
    if (caps) {
      ends[0].position.copy(points[0]); ends[0].scale.setScalar(Math.max(1e-4, r(0)));
      ends[1].position.copy(points[rings - 1]); ends[1].scale.setScalar(Math.max(1e-4, r(1)));
    }
    group.visible = r(0.5) > 1e-4;
  }
  return { group, lay, points: Array.from({ length: rings }, () => new THREE.Vector3()) };
}

function blushTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(255,140,150,0.85)');
  gradient.addColorStop(0.55, 'rgba(255,150,160,0.35)');
  gradient.addColorStop(1, 'rgba(255,160,170,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export const REST_POSE = Object.freeze({
  bob: 0, lean: 0, twist: 0, roll: 0, squash: 0,
  hands: [[-1.1, BODY.b - 0.66, 0.1], [1.1, BODY.b - 0.66, 0.1]],
  handTwist: [0, 0],
  look: [0, 0], blink: 0, happy: 0, smile: 0, open: 0, blush: 0,
});

export function createEmochiRig() {
  const porcelain = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0.98, 0.97, 0.95), roughness: 0.36, clearcoat: 0.32, clearcoatRoughness: 0.3,
    sheen: 0.45, sheenRoughness: 0.55, sheenColor: new THREE.Color('#fff4ee'), envMapIntensity: 0.9,
  });
  const ink = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.007, 0.008, 0.009), roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.4 });

  const root = new THREE.Group();
  root.name = 'Emochi';
  const pivot = new THREE.Group();
  pivot.rotation.order = 'YXZ';
  root.add(pivot);
  const squash = new THREE.Group();
  pivot.add(squash);

  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 72), porcelain);
  body.scale.set(BODY.a, BODY.b, BODY.c);
  body.position.y = BODY.b;
  body.castShadow = body.receiveShadow = true;
  squash.add(body);

  const eyeGeometry = new THREE.SphereGeometry(1, 32, 24);
  const eyes = [-1, 1].map(() => { const eye = new THREE.Mesh(eyeGeometry, ink); eye.castShadow = true; squash.add(eye); return eye; });
  const arcs = [-1, 1].map(() => { const arc = createTube(ink, 14, 10); squash.add(arc.group); return arc; });
  const mouth = createTube(ink, 18, 10);
  squash.add(mouth.group);
  const openMouth = new THREE.Mesh(eyeGeometry, ink);
  squash.add(openMouth);
  const blushMaterial = new THREE.MeshBasicMaterial({ map: blushTexture(), transparent: true, depthWrite: false, opacity: 0, polygonOffset: true, polygonOffsetFactor: -4 });
  const blush = [-1, 1].map(side => {
    const patch = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.17), blushMaterial);
    const at = surface(side * 0.38, BODY.b + 0.12);
    patch.position.copy(at).addScaledVector(surfaceNormal(at), 0.004);
    patch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), surfaceNormal(at));
    squash.add(patch);
    return patch;
  });

  const limbs = new THREE.Group();
  root.add(limbs);
  const arms = [-1, 1].map(() => { const tube = createTube(porcelain, 30, 16, false); limbs.add(tube.group); return tube; });
  const legs = [-1, 1].map(() => { const tube = createTube(porcelain, 24, 16, false); limbs.add(tube.group); return tube; });
  const handGeometry = new THREE.SphereGeometry(1, 32, 24);
  const hands = [-1, 1].map(side => {
    const hand = new THREE.Group();
    const mitten = new THREE.Mesh(handGeometry, porcelain);
    mitten.scale.set(0.13, 0.15, 0.115);
    mitten.position.y = 0.06;
    const thumb = new THREE.Mesh(handGeometry, porcelain);
    thumb.scale.set(0.055, 0.075, 0.055);
    thumb.position.set(-side * 0.1, 0.02, 0.04);
    thumb.rotation.z = side * 0.6;
    for (const part of [mitten, thumb]) { part.castShadow = part.receiveShadow = true; hand.add(part); }
    limbs.add(hand);
    return hand;
  });
  const feet = [-1, 1].map(() => {
    const foot = new THREE.Group();
    const shoe = new THREE.Mesh(handGeometry, porcelain);
    shoe.scale.set(0.15, 0.1, 0.22);
    shoe.position.set(0, 0, 0.07);
    shoe.castShadow = shoe.receiveShadow = true;
    foot.add(shoe);
    limbs.add(foot);
    return foot;
  });

  const v = { a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), d: new THREE.Vector3(), e: new THREE.Vector3(), n: new THREE.Vector3(), q: new THREE.Quaternion(), up: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };

  // A limb from `start` to `end` (root space) that keeps roughly its own length by bowing towards `hint`.
  function bend(tube, start, end, length, hint, radius, startTangent = null) {
    const chord = v.a.subVectors(end, start);
    const distance = chord.length();
    const bow = 0.55 * Math.sqrt(Math.max(0, length * length - distance * distance));
    v.n.copy(hint).addScaledVector(chord, -hint.dot(chord) / Math.max(distance * distance, 1e-6));
    if (v.n.lengthSq() < 1e-8) v.n.set(0, 0, 1);
    v.n.normalize();
    // Quadratic through the bowed midpoint; a start tangent, when given, pulls the root of the limb out of the body.
    const control = v.b.addVectors(start, end).multiplyScalar(0.5).addScaledVector(v.n, bow * 2);
    if (startTangent) control.addScaledVector(startTangent, distance * 0.18);
    const count = tube.points.length;
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1), s = 1 - t;
      tube.points[i].set(0, 0, 0).addScaledVector(start, s * s).addScaledVector(control, 2 * s * t).addScaledVector(end, t * t);
    }
    tube.lay(tube.points, radius);
    return v.c.subVectors(tube.points[count - 1], tube.points[count - 3]).normalize();
  }

  function placeOnFace(object, x, y, scale, lift = 0) {
    const at = surface(x, y, v.d);
    surfaceNormal(at, v.n);
    object.position.copy(at).addScaledVector(v.n, lift);
    object.quaternion.setFromUnitVectors(v.z, v.n);
    object.scale.set(...scale);
  }

  const toRoot = point => root.worldToLocal(squash.localToWorld(point));
  const handPoint = new THREE.Vector3(), shoulder = new THREE.Vector3(), hip = new THREE.Vector3(), ankle = new THREE.Vector3();
  const hint = new THREE.Vector3(), out = new THREE.Vector3(), yAxis = new THREE.Vector3(), twistQ = new THREE.Quaternion();
  const footEuler = new THREE.Euler(0, 0, 0, 'YXZ'), bodyToRoot = new THREE.Matrix4();

  /**
   * Applies a pose. `place` holds world placement: x, z (metres), y (lift), yaw, scale, and feet: two
   * { x, y, z, yaw, pitch } in world metres (y is the sole's height above the floor).
   */
  function apply(pose, place) {
    root.position.set(place.x, place.y ?? 0, place.z);
    root.rotation.y = place.yaw ?? 0;
    root.scale.setScalar(place.scale);
    pivot.position.set(0, PELVIS + pose.bob, 0);
    pivot.rotation.set(pose.lean, pose.twist, pose.roll);
    const stretch = 1 + pose.squash, wide = 1 / Math.sqrt(stretch);
    squash.scale.set(wide, stretch, wide);
    root.updateMatrixWorld(true);

    // Face. Looking moves the whole face a little across the pebble, as the round reference does.
    const [lx, ly] = pose.look;
    const happy = pose.happy, open = pose.open;
    for (const [i, side] of [-1, 1].entries()) {
      const ex = side * FACE.eyeX + lx * 0.07, ey = BODY.b + FACE.eyeY + ly * 0.05;
      const dot = (1 - happy) * (1 - pose.blink * 0.92);
      placeOnFace(eyes[i], ex, ey, [0.068 * (1 - happy * 0.6) + 1e-4, 0.072 * dot + 1e-4, 0.036], -0.006);
      eyes[i].visible = dot > 0.02;
      const arc = arcs[i];
      for (let k = 0; k < arc.points.length; k++) {
        const u = k / (arc.points.length - 1) * 2 - 1;
        surface(ex + u * 0.068, ey - 0.012 + 0.04 * (1 - u * u), arc.points[k]);
        arc.points[k].addScaledVector(surfaceNormal(arc.points[k], v.n), 0.012);
      }
      arc.lay(arc.points, 0.021 * happy);
    }
    const half = FACE.mouthHalf * (1 + 0.18 * Math.max(0, pose.smile)) * (1 - open * 0.55);
    for (let k = 0; k < mouth.points.length; k++) {
      const u = k / (mouth.points.length - 1) * 2 - 1;
      surface(u * half + lx * 0.05, BODY.b + FACE.mouthY + ly * 0.03 - pose.smile * 0.05 * (1 - u * u), mouth.points[k]);
      mouth.points[k].addScaledVector(surfaceNormal(mouth.points[k], v.n), 0.012);
    }
    mouth.lay(mouth.points, 0.028 * (1 - open * 0.9) + 1e-4);
    placeOnFace(openMouth, lx * 0.05, BODY.b + FACE.mouthY - 0.01 + ly * 0.03, [0.075 * open + 1e-4, 0.07 * open + 1e-4, 0.03], -0.012);
    openMouth.visible = open > 0.02;
    blushMaterial.opacity = pose.blush * 0.75;

    // Arms: from inside the shoulder to the mitten; elbows bow outwards and a little back.
    bodyToRoot.copy(root.matrixWorld).invert().multiply(squash.matrixWorld);
    for (const [i, side] of [-1, 1].entries()) {
      toRoot(shoulder.set(side * 0.84, BODY.b - 0.06, 0));
      toRoot(handPoint.set(...pose.hands[i]));
      hint.set(side, -0.35, -0.45).transformDirection(bodyToRoot);
      out.set(side, 0.15, 0).transformDirection(bodyToRoot);
      const tangent = bend(arms[i], shoulder, handPoint, ARM.length, hint, u => ARM.radius * (1 - 0.14 * u), out);
      hands[i].position.copy(handPoint);
      hands[i].quaternion.setFromUnitVectors(v.up, tangent);
      twistQ.setFromAxisAngle(tangent, pose.handTwist[i]);
      hands[i].quaternion.premultiply(twistQ);
    }
    // Legs: hips inside the bottom of the pebble to the ankles, knees bowing forward and out.
    for (const [i, side] of [-1, 1].entries()) {
      const foot = place.feet[i];
      ankle.set(foot.x, (foot.y ?? 0) + ANKLE * place.scale, foot.z);
      root.worldToLocal(ankle);
      toRoot(hip.set(side * 0.3, 0.14, 0.02));
      hint.set(side * 0.35, 0, 1);
      bend(legs[i], hip, ankle, LEG.length, hint, u => LEG.radius * (1 + 0.06 * u));
      feet[i].position.copy(ankle);
      footEuler.set(foot.pitch ?? 0, (foot.yaw ?? 0) - root.rotation.y, 0);
      feet[i].quaternion.setFromEuler(footEuler);
    }
  }

  /** World position of a point in the body frame (e.g. above the head), for props that follow Emochi. */
  function bodyPoint(x, y, z, target = new THREE.Vector3()) {
    return squash.localToWorld(target.set(x, y, z));
  }

  return {
    root, apply, bodyPoint, body: BODY,
    pickables: [body],
    dispose() {
      root.traverse(object => { if (object.isMesh) object.geometry.dispose(); });
      porcelain.dispose(); ink.dispose(); blushMaterial.map.dispose(); blushMaterial.dispose();
    },
  };
}

export const EMOCHI = { BODY, PELVIS, ANKLE };
