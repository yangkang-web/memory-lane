import * as THREE from 'three';
import { ALTAR, START, resolve } from './layout.js';
import { createArm, createGaze } from './rig.js';

const DEG = Math.PI / 180;
const HUNTER_RADIUS = 0.3;
const LUCIEN_RADIUS = 0.28;
const PILLAR = { x: -3.3, z: -2.2 };
// Shown once the player has spent this long in a segment without moving the story on.
const STUCK = {
  explore: '沿着中殿走到祭坛前',
  danger: '转过身，找到声音的来处',
  wound: '低头看看你的手臂',
  intimacy: '看着他，向他伸出手',
  gift: '看向他手里的项链，接受它',
};
const touchDevice = () => matchMedia('(pointer: coarse)').matches;
const smooth = t => { const k = Math.min(1, Math.max(0, t)); return k * k * (3 - 2 * k); };
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));

// What happens in each story segment, driven by where the player is and what they do.
export function createDirector({ player, flow, interact, lucien, hunter, arms, chapel, pendant, sound, ui, onAccept, onComplete, brisk = false }) {
  let cues = [];
  let clock = 0;
  let holdTime = 0;
  let spoken = new Set();
  let stuckShown = false;
  let seen = false;
  let warned = false;
  let warnEnd = Infinity;
  let hunterMoving = false;
  let woundLooked = 0, woundTalked = false, woundDone = false;
  const view = new THREE.Vector3();
  const yawTo = (x, z) => Math.atan2(-(x - player.pose.x), -(z - player.pose.z));
  const at = (time, fn) => cues.push({ time, fn });
  const after = (seconds, fn) => at(flow.elapsed + seconds, fn);
  const distance = character => character.distanceTo(player.pose.x, player.pose.z);
  const say = id => { spoken.add(id); return ui.say(id); };
  const self = () => ({ x: player.pose.x, z: player.pose.z, r: 0.26 });
  const hunterResolve = point => resolve(point, HUNTER_RADIUS, [self()]);
  const lucienResolve = point => resolve(point, LUCIEN_RADIUS, [self()]);

  // Procedural layers: his right arm takes the hunter's wrist and later the player's hand; his head follows his eyes.
  const lucienArm = createArm(lucien.root, 'Right');
  const gaze = createGaze(lucien.root, { rate: 2.2, yawLimit: 1.0, pitchLimit: 0.75 });
  const gazePoint = new THREE.Vector3();
  const hunterHand = hunter.root.getObjectByName('mixamorigRightHand');
  const hunterElbow = hunter.root.getObjectByName('mixamorigRightForeArm');
  const hunterHips = hunter.root.getObjectByName('mixamorigHips');
  const hunterHead = hunter.root.getObjectByName('mixamorigHead');
  const hunterArms = { right: createArm(hunter.root, 'Right'), left: createArm(hunter.root, 'Left') };
  const hunterPose = { weight: 0 };
  // `mode` is what his hand is doing; `weight` eases towards `goal`.
  const contact = { mode: null, weight: 0, goal: 0, rate: 6 };
  const tmp = { a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), d: new THREE.Vector3(), e: new THREE.Vector3(), f: new THREE.Vector3() };
  const up = new THREE.Vector3(0, 1, 0);

  // Moves that are timed, not walked: his dash in, the hunter's flight into the pillar, a half-step back.
  let dash = null;
  let flight = null;
  let slide = null;
  // The hunter's slash, held raised for the second strike.
  let slash = null;

  lucien.layer = dt => {
    lucien.root.updateMatrixWorld(true);
    relax(dt);
    if (rite) riteLean();
    if (hunger) lean(hungerPose().lean);
    gaze.update(dt);
    if (rite) { lucien.root.updateMatrixWorld(true); riteLean(true); }
    if (rite) lids(rite.kind === 'wear' ? 0.9 * ramp(rite.time, 4.4, 0.5) * (1 - smooth(rite.gap / 0.03)) : 0);
    if (hunger) { const h = hungerPose(); lids(h.lids); feed(h); }
    contact.weight += (contact.goal - contact.weight) * (1 - Math.exp(-dt * contact.rate));
    if (contact.weight >= 0.01 && contact.mode) {
      lucien.root.updateMatrixWorld(true);
      if (contact.mode === 'grip') grip(contact.weight);
      else if (contact.mode === 'cradle') cradle(contact.weight);
    }
    if (rite) { lucien.root.updateMatrixWorld(true); riteHands(dt); }
  };
  hunter.layer = dt => {
    if (flight) fly();
    // The idle and walk clips are two-handed: on his narrow frame they fold both arms into his chest. Over them his
    // right hand carries the estoc low and forward, the left hangs free and swings with the stride.
    const free = !flight && !slash && (hunter.clip === 'idle' || hunter.clip === 'walk');
    hunterPose.weight += ((free ? 1 : 0) - hunterPose.weight) * (1 - Math.exp(-dt * 5));
    if (hunterPose.weight > 0.01) carry(hunterPose.weight);
  };

  const facing = (character, target) => target.set(Math.sin(character.heading), 0, Math.cos(character.heading));
  const rightOf = (forward, target) => target.set(-forward.z, 0, forward.x);

  // The gift and the clasp. One clock, `rite.time` in seconds from the start of the segment, drives both his hands,
  // his lean, his eyes and the pendant, so each moment looks the same however it is reached.
  let rite = null;
  const lucienArms = { right: lucienArm, left: createArm(lucien.root, 'Left') };
  const lucienSpine = ['Spine', 'Spine1', 'Spine2'].map(name => lucien.root.getObjectByName(`mixamorig${name}`));
  const pinchBones = side => ['HandIndex2', 'HandThumb3'].map(name => lucien.root.getObjectByName(`mixamorig${side}${name}`));
  const pinchOf = { right: pinchBones('Right'), left: pinchBones('Left') };
  const eye = new THREE.Vector3();
  // One side of the necklace, bail to clasp; held out, he has most of it gathered in his fingers.
  const CHAIN = 0.25, GATHERED = 0.15;
  // How far apart you stand: while he reaches round your neck, and forehead to forehead.
  const CLASP_GAP = 0.44, BROW_GAP = 0.38;
  const rv = Array.from({ length: 12 }, () => new THREE.Vector3());
  const rq = [new THREE.Quaternion(), new THREE.Quaternion(), new THREE.Quaternion()];
  const basisMatrix = new THREE.Matrix4(), solved = new THREE.Quaternion();
  // The player's frame for this frame: `pf` from the player towards him, `pr` the player's right as they face him.
  const F = { pf: new THREE.Vector3(), pr: new THREE.Vector3(), neck: new THREE.Vector3(), nape: new THREE.Vector3(), chest: new THREE.Vector3() };
  const off = (out, base, [f, r, u]) => out.copy(base).addScaledVector(F.pf, f).addScaledVector(F.pr, r).addScaledVector(up, u);
  const dir = (out, [f, r, u]) => out.set(0, 0, 0).addScaledVector(F.pf, f).addScaledVector(F.pr, r).addScaledVector(up, u).normalize();
  // Hand poses in the player's frame, [towards him, player's right, up]: `p` is where the pinch of finger and thumb
  // goes, `f` the way the fingers run, `n` the way the palm faces. `s` is -1 for his right hand, which is on the
  // player's left, and 1 for his left.
  const HANDS = {
    // Inside his coat, over his heart.
    coat: () => ({ p: off(new THREE.Vector3(), lucien.group.position, [-0.13, 0.06, 1.3]), f: [0, 0.5, -0.8], n: [1, 0, 0], curl: 0.35 }),
    // Holding the empty vial upright under your cut hand to catch what runs off it, pinched by its neck from his side
    // and above, so the glass hangs clear of his fingers where you can see it fill.
    catch: () => ({ p: catchAt.clone(), f: [-0.8, 0.35, -0.1], n: [0.15, 0.3, -0.94], curl: 0.5, thumb: 0.6, each: [0.38, 0.62, 0.78, 0.9] }),
    // Held up between you by the clasp, low and to the side of his face; the pendant hangs from his fingers.
    // Pinched between finger and thumb, palm down and in, the other fingers folding away one after another.
    offer: () => ({ p: off(new THREE.Vector3(), eye, [0.36, -0.12, 0.0]), f: [-0.75, 0.3, 0.1], n: [0, 0.6, -0.8], curl: 0.5, thumb: 0.6, each: [0.38, 0.62, 0.78, 0.9] }),
    // One end of the chain in each hand, spread before your face.
    open: s => ({ p: off(new THREE.Vector3(), eye, [0.27, s * 0.1, -0.04]), f: [-0.75, s * 0.15, 0.3], n: [0, -s, 0], curl: 0.5, thumb: 0.75 }),
    // Past either side of your neck.
    side: s => ({ p: off(new THREE.Vector3(), F.neck, [0.03, s * 0.16, 0.05]), f: [-1, 0, 0], n: [0, -s, 0], curl: 0.5, thumb: 0.75 }),
    // Meeting behind it.
    nape: s => ({ p: off(new THREE.Vector3(), F.nape, [-0.02, s * 0.03, 0.01]), f: [-0.3, -s * 0.9, 0], n: [0.7, -s * 0.3, 0], curl: 0.5, thumb: 0.75 }),
    // Resting on your shoulders, fingers over the top of them.
    shoulder: s => ({ p: off(new THREE.Vector3(), F.neck, [0.02, s * 0.15, 0.02]), f: [-0.75, 0, -0.5], n: [0, -s * 0.2, -0.85], curl: 0.3, thumb: 0.3 }),
  };
  // The gift's beats, seconds into the segment: the blood runs from your hand into the vial from `pour` until `full`.
  const GIFT = { inspect: 0.9, pour: 2.2, full: 5.2, offered: 6.0 };
  // Inside the journey the memory has a fixed minute, so the gift and the clasp play quicker: his hands move faster
  // and the pauses between the lines close up, but every line is still said whole.
  const PACE = brisk ? { gift: 1.6, wear: 1.25 } : {};
  const catchAt = new THREE.Vector3(), dripAt = new THREE.Vector3();
  // [time, pose] for each hand; before the first key the hand comes in from the clip, after the last it stays.
  const KEYS = {
    gift: { right: [[0.8, 'coat'], [1.1, 'coat'], [2.0, 'catch'], [GIFT.full, 'catch'], [GIFT.full + 1.0, 'offer']], left: [] },
    wear: {
      right: [[0, 'offer'], [0.2, 'offer'], [1.2, 'open'], [1.5, 'open'], [2.4, 'side'], [3.1, 'nape'], [3.9, 'nape'], [4.8, 'shoulder']],
      left: [[1.2, 'open'], [1.5, 'open'], [2.4, 'side'], [3.1, 'nape'], [3.9, 'nape'], [4.8, 'shoulder']],
    },
  };
  const ramp = (t, from, length) => smooth((t - from) / length);

  function pinch(side, target) {
    const [index, thumb] = pinchOf[side];
    return index.getWorldPosition(target).add(thumb.getWorldPosition(rv[11])).multiplyScalar(0.5);
  }
  // The hand's pose at `time` from its keys, and how much of it is laid over the clip.
  function handPose(side, time) {
    const keys = KEYS[rite.kind]?.[side];
    if (!keys?.length) return null;
    const s = side === 'right' ? -1 : 1;
    let i = keys.findIndex(([at]) => at > time);
    if (i === -1) i = keys.length;
    const a = keys[Math.max(0, i - 1)], b = keys[Math.min(keys.length - 1, i)];
    const k = a === b ? 1 : smooth((time - a[0]) / (b[0] - a[0]));
    const A = HANDS[a[1]](s), B = HANDS[b[1]](s);
    const pose = {
      p: A.p.lerp(B.p, k),
      f: dir(new THREE.Vector3(), A.f).lerp(dir(rv[10], B.f), k).normalize(),
      n: dir(new THREE.Vector3(), A.n).lerp(dir(rv[10], B.n), k).normalize(),
      curl: A.curl + (B.curl - A.curl) * k,
      thumb: (A.thumb ?? A.curl * 0.6) + ((B.thumb ?? B.curl * 0.6) - (A.thumb ?? A.curl * 0.6)) * k,
      each: [0, 1, 2, 3].map(i => (A.each?.[i] ?? A.curl) + ((B.each?.[i] ?? B.curl) - (A.each?.[i] ?? A.curl)) * k),
    };
    // Fumbling the clasp closed.
    if (a[1] === 'nape' && b[1] === 'nape') pose.p.addScaledVector(up, Math.sin(time * 19 + s) * 0.004).addScaledVector(F.pr, Math.sin(time * 13) * 0.004);
    if (a[1] === 'offer' && b[1] === 'offer') pose.p.y += Math.sin(time * 1.3) * 0.006;
    const into = rite.kind === 'gift' ? ramp(time, 0, 1.0) : side === 'left' ? ramp(time, 0.2, 1.0) : 1;
    return { pose, weight: into * (1 - ramp(time, Math.min(rite.release, rite.back ?? Infinity), 1.2)) };
  }
  // Puts his pinch on `pose.p`, the elbow out to the side and down; a couple of passes take up the hand's length.
  function hold(side, pose, weight) {
    if (weight < 0.01) return;
    const arm = lucienArms[side], bones = [arm.upper, arm.lower, arm.hand];
    bones.forEach((bone, i) => rq[i].copy(bone.quaternion));
    const forward = facing(lucien, rv[0]), right = rightOf(forward, rv[1]);
    const shoulder = arm.shoulder(rv[2]);
    const pole = rv[3].copy(shoulder).addScaledVector(right, side === 'right' ? 0.5 : -0.5).addScaledVector(up, -0.45).addScaledVector(forward, -0.15);
    const target = rv[4].copy(pose.p).addScaledVector(pose.f, -0.085);
    arm.curl(pose.curl, { thumb: pose.thumb, each: pose.each, weight });
    for (let pass = 0; pass < 3; pass++) {
      arm.solve({ target, pole, finger: pose.f, palm: pose.n, twist: 0.5 });
      target.add(rv[5].copy(pose.p).sub(pinch(side, rv[6])));
    }
    if (weight < 1) {
      bones.forEach((bone, i) => { solved.copy(bone.quaternion); bone.quaternion.copy(rq[i]).slerp(solved, weight); });
      arm.upper.updateMatrixWorld(true);
    }
  }
  // Bows him from the waist by `angle`, shared over the three spine joints.
  function lean(angle) {
    if (Math.abs(angle) < 1e-4) return;
    const right = rightOf(facing(lucien, rv[0]), rv[1]);
    const turn = rq[0].setFromAxisAngle(right, -angle / lucienSpine.length);
    for (const bone of lucienSpine) {
      bone.getWorldQuaternion(rq[1]).premultiply(turn);
      bone.parent.getWorldQuaternion(rq[2]);
      bone.quaternion.copy(rq[2].invert().multiply(rq[1]));
      bone.updateMatrixWorld(true);
    }
  }
  // How far he must bow, from the clip's pose, for his brow to meet the player's, `gap` short of it.
  function browLean(gap, [low, high] = [0, 0.6]) {
    const forward = facing(lucien, rv[0]);
    const pivot = lucienSpine[1].getWorldPosition(rv[1]);
    // The front of his brow sits well forward of the head joint, which is at the top of the neck.
    const brow = gaze.head.getWorldPosition(rv[2]).addScaledVector(forward, 0.15).addScaledVector(up, 0.1).sub(pivot);
    const hf = brow.dot(forward), hu = brow.y, reach = Math.hypot(hf, hu);
    const want = off(rv[3], eye, [0.085 + gap, 0, 0.05]).sub(pivot).dot(forward);
    return THREE.MathUtils.clamp(Math.asin(THREE.MathUtils.clamp(want / reach, -1, 1)) - Math.atan2(hf, hu), low, high);
  }
  // He bends to reach round your neck, then further, until his brow rests on yours. The spine joints do not turn
  // about the point the estimate assumes and his head tilts after it, so `correct` takes up what is left.
  function riteLean(correct = false) {
    if (rite.kind !== 'wear') return;
    const t = rite.time, out = 1 - ramp(t, Math.min(rite.release, rite.back ?? Infinity), 1.2), brow = ramp(t, 3.9, 1.1);
    if (correct) { if (brow * out > 0) lean(browLean(rite.gap, [-0.15, 0.15]) * brow * out); return; }
    const clasp = 0.22 * ramp(t, 1.3, 1.1);
    lean((clasp + (browLean(rite.gap) - clasp) * brow) * out);
  }
  // His eyes close as his brow meets yours and open again to look at you.
  const lidMeshes = [];
  lucien.root.traverse(o => { if (o.morphTargetDictionary?.blinkLeft != null) lidMeshes.push(o); });
  function lids(value) {
    for (const mesh of lidMeshes) for (const name of ['blinkLeft', 'blinkRight']) mesh.morphTargetInfluences[mesh.morphTargetDictionary[name]] = value;
  }
  // The hunger in him: his eyes go red, his lips part and the fangs come down behind them. All of it is driven by one
  // value per part (see `hungerPose`) so it can come and go in any order.
  let hunger = null;
  // The model has no teeth, only the back of the throat far behind the lips, so the open mouth is given an upper row
  // along the arch, in the head joint's frame (centimetres, facing +z, up +y, the mouth centred at x 0.37), the roots
  // hidden behind the lip. The canines are his fangs and grow down from the root. A lower row only ever showed as loose
  // flecks over the lower lip, so there is none.
  // A tooth is turned from a profile, [radius, down] from the root, then flattened front to back; `hook` bends the tip
  // back, as canines are.
  function toothGeometry(profile, { flat = 0.45, hook = 0 } = {}) {
    const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, -y)), 14);
    const p = g.attributes.position, colors = [];
    const length = profile.at(-1)[1];
    for (let i = 0; i < p.count; i++) {
      const s = -p.getY(i) / length;
      p.setZ(i, p.getZ(i) * flat - hook * s * s);
      // Shadowed at the gum and where each tooth turns away into the gap beside the next, ivory down the crown, and a
      // little grey at the thin, translucent edge.
      const side = Math.abs(Math.atan2(p.getX(i), p.getZ(i)) / Math.PI * 2 - Math.sign(p.getX(i)));
      const k = THREE.MathUtils.smoothstep(s, 0.05, 0.7) * (1 - 0.4 * THREE.MathUtils.smoothstep(s, 0.85, 1)) * (0.45 + 0.55 * THREE.MathUtils.smoothstep(side, 0.15, 0.6));
      colors.push(0.38 + 0.4 * k, 0.32 + 0.41 * k, 0.27 + 0.4 * k);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }
  const square = (w, h) => [[0, 0], [w * 0.92, 0.05], [w, h * 0.45], [w * 0.95, h * 0.86], [w * 0.65, h * 0.97], [0, h]];
  const pointed = (w, h) => [[0, 0], [w * 0.95, 0.05], [w, h * 0.3], [w * 0.78, h * 0.58], [w * 0.4, h * 0.84], [w * 0.1, h * 0.98], [0, h]];
  const toothMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, envMapIntensity: 0.4 });
  // Inside his head no light from behind reaches them, but they take no shadow, so the rim light behind him would
  // outline every edge; direct light is let in only where a surface faces the eye.
  toothMaterial.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
float toothFacing = smoothstep(0.2, 0.65, abs(dot(normal, normalize(vViewPosition))));
reflectedLight.directDiffuse *= toothFacing;
reflectedLight.directSpecular *= toothFacing * toothFacing;`);
  };
  const teeth = new THREE.Group();
  teeth.visible = false;
  gaze.head.add(teeth);
  // [x from the middle, half-width, length, shape].
  const ROOT = 3.0, FRONT = 13.4, CURVE = 0.3;
  const TEETH = [[0.4, 0.42, 1.5, square], [0.98, 0.31, 1.32, square], [1.42, 0.27, 1.3, pointed]];
  const fangs = [];
  for (const [x, w, h, shape] of TEETH) {
    const fang = shape === pointed;
    const geometry = toothGeometry(shape(w, h), { flat: fang ? 0.7 : 0.42, hook: fang ? 0.35 : 0.05 });
    for (const s of [-1, 1]) {
      const tooth = new THREE.Mesh(geometry, toothMaterial);
      const at = s * x;
      tooth.position.set(0.37 + at, ROOT, FRONT - CURVE * at * at);
      // Turned to follow the arch, the crowns leaning a little in.
      tooth.rotation.set(-0.08, Math.atan(2 * CURVE * at), -s * (fang ? 0.07 : 0.02));
      tooth.castShadow = false;
      teeth.add(tooth);
      if (fang) fangs.push(tooth);
    }
  }
  // The back of the throat is painted a flat pink; it takes the dark of a mouth seen into, deepest at its middle.
  const headMaterial = lucien.root.getObjectByName('Lucien_Head')?.material;
  if (headMaterial?.map) {
    headMaterial.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
if (vMapUv.x > 0.74 && vMapUv.y > 0.84 && diffuseColor.r > diffuseColor.g * 1.45) {
  float edge = smoothstep(0.0, 0.05, min(vMapUv.y - 0.86, 0.09 - abs(vMapUv.x - 0.845)));
  diffuseColor.rgb = mix(vec3(0.075, 0.016, 0.018), vec3(0.018, 0.004, 0.006), edge);
}`);
    };
    headMaterial.customProgramCacheKey = () => 'bloodbound-lucien-mouth';
    headMaterial.needsUpdate = true;
  }
  // Only the irises take the thirst, two discs in the eye texture: their own grain kept, turned a dark wine, with no
  // glow, so the change reads in the close shots without the eyes lighting up.
  const thirst = { value: 0 };
  const eyeMaterial = lucien.root.getObjectByName('Lucien_Eyes')?.material;
  if (eyeMaterial) {
    eyeMaterial.onBeforeCompile = shader => {
      shader.uniforms.thirst = thirst;
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float thirst;')
        .replace('#include <map_fragment>', `#include <map_fragment>
float iris = max(smoothstep(0.112, 0.1, distance(vMapUv, vec2(0.705, 0.296))), smoothstep(0.112, 0.1, distance(vMapUv, vec2(0.291, 0.701))));
float grain = dot(diffuseColor.rgb, vec3(0.3, 0.5, 0.2));
diffuseColor.rgb = mix(diffuseColor.rgb, grain * vec3(0.62, 0.16, 0.16), iris * thirst * 0.8);`);
    };
    eyeMaterial.customProgramCacheKey = () => 'bloodbound-lucien-irises';
    eyeMaterial.needsUpdate = true;
  }
  const mouthMorphs = lidMeshes.map(mesh => ['jawOpen', 'mouthPart', 'upperLipRaise'].map(name => mesh.morphTargetDictionary[name]));
  function feed({ red = 0, mouth = 0, fang = 0 } = {}) {
    thirst.value = red;
    for (const [i, mesh] of lidMeshes.entries()) {
      const [jaw, part, lip] = mouthMorphs[i];
      mesh.morphTargetInfluences[jaw] = 0.3 * mouth;
      mesh.morphTargetInfluences[part] = 0.75 * mouth;
      mesh.morphTargetInfluences[lip] = 1.0 * mouth;
    }
    teeth.visible = mouth > 0.01;
    for (const tooth of fangs) tooth.scale.set(1 + 0.12 * fang, 1 + 0.75 * fang, 1 + 0.1 * fang);
  }
  // Seconds from "Every drop.": he lifts your hand to his mouth, his eyes redden, the fangs come; he holds there; then
  // he shuts his eyes, the fangs go, his mouth closes, and he turns his face away before he looks back at you.
  const HUNGER = { lift: 2.6, red: 3.2, mouth: 4.0, fang: 4.5, master: 8.4, away: 9.4, back: 12.2, done: 13.6 };
  function hungerPose(t = hunger.time) {
    const H = HUNGER, closing = 1 - ramp(t, H.master, 0.7);
    return {
      lift: ramp(t, H.lift, 1.5) * (1 - ramp(t, H.away, 1.8)),
      red: ramp(t, H.red, 1.0) * (1 - ramp(t, H.master + 0.4, 1.2)),
      mouth: ramp(t, H.mouth, 0.9) * (1 - ramp(t, H.master + 0.2, 0.7)),
      fang: ramp(t, H.fang, 0.8) * closing,
      lean: (0.26 * ramp(t, H.lift + 0.2, 1.6) + 0.2 * ramp(t, H.fang + 0.6, 2.4)) * (1 - ramp(t, H.master + 0.4, 1.6)) + Math.sin(t * 7) * 0.004 * ramp(t, H.fang, 1) * closing,
      lids: ramp(t, H.master, 0.35) * (1 - ramp(t, H.away + 1.4, 0.5)),
      away: ramp(t, H.away, 1.0) * (1 - ramp(t, H.back, 1.2)),
    };
  }
  function riteGaze(target) {
    const t = rite.time;
    if (rite.kind === 'gift') return t > 0.8 && t < GIFT.full + 0.4 ? target.copy(pendant.group.position) : target.copy(eye).addScaledVector(up, -0.05);
    if (t > 1.5 && t < 3.9) return off(target, F.neck, [0.05, 0, 0.02]);
    // Head bowed a little with his brow against yours, then up to your eyes for the last line.
    if (t >= 3.9 && t < rite.release) return rite.gap > 0.02 ? target.copy(eye) : off(target, eye, [-0.4, 0, -0.1]);
    return target.copy(eye).addScaledVector(up, -0.05);
  }

  // The pendant swings from whatever holds it: a pendulum from the point it hangs from.
  const bob = { at: new THREE.Vector3(), last: new THREE.Vector3(), ready: false };
  function swing(anchor, length, dt) {
    if (!bob.ready) { bob.at.copy(anchor).addScaledVector(up, -length); bob.last.copy(bob.at); bob.ready = true; }
    if (dt > 0) {
      const velocity = rv[8].subVectors(bob.at, bob.last).multiplyScalar(Math.pow(0.25, dt));
      bob.last.copy(bob.at);
      bob.at.add(velocity).addScaledVector(up, -9.8 * dt * dt);
    }
    bob.at.sub(anchor).setLength(length).add(anchor);
    return bob.at;
  }
  // Pendant orientation with its top along `top` and its face towards `face`.
  function orient(target, top, face) {
    const z = rv[9].copy(face).addScaledVector(top, -face.dot(top)).normalize();
    basisMatrix.makeBasis(rv[10].crossVectors(top, z), top, z);
    return target.setFromRotationMatrix(basisMatrix);
  }
  // Where the pendant lies once it is on: on the chest, tilted back with it, the chain round the neck to the clasp.
  function wornPose(quaternion, ends, through) {
    const forward = arms.forward;
    const top = rv[0].copy(up).multiplyScalar(Math.cos(0.55)).addScaledVector(forward, -Math.sin(0.55));
    orient(quaternion, top, forward);
    arms.anchor('nape', ends[0], [0.012, 0, 0]); arms.anchor('nape', ends[1], [-0.012, 0, 0]);
    arms.anchor('neck', through[0], [0.07, 0.025, 0]); arms.anchor('neck', through[1], [-0.07, 0.025, 0]);
    return arms.anchor('chest', rv[1]);
  }
  const ends = [new THREE.Vector3(), new THREE.Vector3()], through = [new THREE.Vector3(), new THREE.Vector3()];
  const wornEnds = [new THREE.Vector3(), new THREE.Vector3()], wornThrough = [new THREE.Vector3(), new THREE.Vector3()];
  const hangQuaternion = new THREE.Quaternion(), wornQuaternion = new THREE.Quaternion();
  function placePendant(dt) {
    const t = rite.time;
    pendant.group.visible = rite.kind !== 'gift' || t > 0.95;
    if (!pendant.group.visible) return;
    const worn = rite.kind === 'end';
    if (worn) {
      pendant.setGlow(smooth(t / 2.2));
      pendant.group.position.copy(wornPose(pendant.group.quaternion, wornEnds, wornThrough));
      pendant.setChainEndpoints(wornEnds[0], wornEnds[1], wornThrough);
      return;
    }
    const right = pinch('right', rv[2]);
    // The chain's two ends: his left hand's (the player's right) first, as `setChainEndpoints` takes them.
    if (rite.kind === 'gift') { ends[0].copy(right); ends[1].copy(right); }
    else { ends[1].copy(right); ends[0].copy(right).lerp(pinch('left', rv[3]), ramp(t, 0.5, 0.7)); }
    const mid = rv[4].addVectors(ends[0], ends[1]).multiplyScalar(0.5);
    const half = ends[0].distanceTo(ends[1]) / 2;
    const length = rite.kind === 'wear' ? GATHERED + (CHAIN - GATHERED) * ramp(t, 0.2, 1.0) : GATHERED;
    const hanging = swing(mid, Math.sqrt(Math.max(0.0025, length * length - half * half)), dt);
    // Its face is to you while he holds it out; it turns on the chain as he opens it.
    const face = rv[7].copy(F.pf).negate().applyAxisAngle(up, Math.PI * (rite.kind === 'wear' ? ramp(t, 0.3, 1.1) : 0));
    orient(hangQuaternion, rv[5].subVectors(mid, hanging).normalize(), face);
    const on = rite.kind === 'wear' ? ramp(t, 1.6, 1.0) : 0;
    const chest = wornPose(wornQuaternion, wornEnds, wornThrough);
    pendant.group.position.copy(hanging).lerp(chest, on);
    pendant.group.quaternion.slerpQuaternions(hangQuaternion, wornQuaternion, on);
    // While it fills he holds the vial itself, upright, its face to you; then lets it down onto its chain.
    const cup = rite.kind === 'gift' ? 1 - ramp(t, GIFT.full, 0.9) : 0;
    if (cup > 0) {
      pendant.group.position.lerp(rv[5].copy(right).addScaledVector(up, -0.004).addScaledVector(F.pf, -0.012), cup);
      pendant.group.quaternion.slerp(orient(rq[0], up, rv[6].copy(F.pf).negate()), cup);
    }
    // The ends go to the clasp as it closes; on the way round, the chain is laid over the neck rather than through it.
    const clasp = rite.kind === 'wear' ? ramp(t, 3.1, 0.5) : 0;
    ends[0].lerp(wornEnds[0], clasp); ends[1].lerp(wornEnds[1], clasp);
    const around = rite.kind === 'wear' ? ramp(t, 1.7, 0.7) : 0;
    pendant.group.updateMatrixWorld(true);
    const bail = pendant.group.localToWorld(rv[6].set(0, 1.16, 0));
    for (const i of [0, 1]) through[i].addVectors(bail, ends[i]).multiplyScalar(0.5).lerp(wornThrough[i], around);
    pendant.setChainEndpoints(ends[0], ends[1], through);
  }
  function riteHands(dt) {
    for (const side of ['right', 'left']) {
      const held = handPose(side, rite.time);
      if (held) hold(side, held.pose, held.weight);
    }
    placePendant(dt);
  }
  function riteFrame() {
    const { x, z } = lucien.group.position;
    F.pf.set(x - player.pose.x, 0, z - player.pose.z).normalize();
    rightOf(F.pf, F.pr);
    arms.anchor('neck', F.neck); arms.anchor('nape', F.nape);
    if (rite.kind === 'gift') catchAt.copy(arms.drip(dripAt)).addScaledVector(up, -0.095).addScaledVector(F.pf, 0.015);
  }
  // Slides him along the line between you to `gap` from the player.
  function closeTo(gap, duration) {
    const { x, z } = lucien.group.position;
    const dx = x - player.pose.x, dz = z - player.pose.z, d = Math.hypot(dx, dz) || 1;
    slide = { from: { x, z }, to: { x: player.pose.x + dx / d * gap, z: player.pose.z + dz / d * gap }, time: 0, duration };
  }


  // His fingers close around the hunter's forearm just below the wrist.
  function grip(weight) {
    const { a: wrist, b: elbow, c: shoulder, d: finger, e: palm, f: pole } = tmp;
    hunterHand.getWorldPosition(wrist);
    hunterElbow.getWorldPosition(elbow);
    const along = elbow.sub(wrist).normalize();
    const point = wrist.addScaledVector(along, 0.07);
    lucienArm.shoulder(shoulder);
    palm.subVectors(point, shoulder).normalize();
    finger.crossVectors(along, palm).normalize();
    if (finger.y < 0) finger.negate();
    const target = point.clone().addScaledVector(palm, -0.045).addScaledVector(finger, -0.06);
    const forward = facing(lucien, new THREE.Vector3());
    rightOf(forward, pole);
    pole.multiplyScalar(0.6).add(shoulder).addScaledVector(up, -0.5);
    lucienArm.solve({ target, pole, finger, palm, weight, twist: 0.5 });
    lucienArm.curl(0.78, { weight, thumb: 0.9 });
  }

  // His palm turned up beneath the player's, fingers running back under it towards their wrist.
  function cradle(weight) {
    const { a: point, b: shoulder, c: finger, d: palm, f: pole } = tmp;
    const hand = arms.axes();
    arms.palm(point);
    lucienArm.shoulder(shoulder);
    finger.copy(hand.finger).negate().setY(0).normalize();
    palm.copy(hand.palm).negate();
    // His rig's palm normal leans towards the little finger; roll it back so the knuckles lie level under theirs.
    palm.applyAxisAngle(finger, -0.5);
    // Palm centre 4.2 cm below theirs, the thickness of two hands, and centred across their hand.
    const across = tmp.e.crossVectors(hand.finger, hand.palm).normalize();
    const target = point.clone().addScaledVector(hand.palm, 0.042).addScaledVector(finger, -0.065).addScaledVector(across, -0.03);
    const forward = facing(lucien, new THREE.Vector3());
    rightOf(forward, pole);
    // Elbow down beside his ribs and a little behind, never across his chest.
    pole.multiplyScalar(0.4).add(shoulder).addScaledVector(up, -0.8).addScaledVector(forward, -0.25);
    lucienArm.solve({ target, pole, finger, palm, weight, twist: 0.6 });
    // Fingers curling a little round the edge of their hand, the thumb laid over its back.
    lucienArm.curl(0.3, { weight, thumb: 0.45, spread: 0.04, each: [0.24, 0.3, 0.36, 0.42] });
  }

  // His idle and walk clips hold the hands crossed before him, which on the long coat reads as two stiff rods. Over
  // them his arms hang loose at his sides, elbows a little bent, palms in to the thighs, and swing against his stride:
  // the swing comes from where his feet are, so it is always in step with the clip. Offsets as in CARRY below.
  // The wrist is placed out from his hips' centre line, not from the shoulder: the clip carries his chest off to one side.
  const HANG = { wrist: [0.2, -0.47, 0.08], pole: [0.35, -0.25, -0.45], finger: [0.04, -1, 0.16], palm: [-1, 0, 0.1] };
  const lucienFeet = ['LeftFoot', 'RightFoot'].map(name => lucien.root.getObjectByName(`mixamorig${name}`));
  const lucienHips = lucien.root.getObjectByName('mixamorigHips');
  const loose = { weight: 0, swing: 0, time: 0 };
  function relax(dt) {
    const free = lucien.clip === 'idle' || lucien.clip === 'walk';
    loose.weight += ((free ? 1 : 0) - loose.weight) * (1 - Math.exp(-dt * 4));
    if (loose.weight < 0.01) return;
    loose.time += dt;
    const { a: forward, b: right, c: shoulder, d: target, e: pole, f: finger } = tmp;
    facing(lucien, forward);
    rightOf(forward, right);
    const stride = lucien.clip === 'walk'
      ? lucienFeet[1].getWorldPosition(rv[0]).sub(lucienFeet[0].getWorldPosition(rv[1])).dot(forward) : 0;
    loose.swing += (stride - loose.swing) * (1 - Math.exp(-dt * 10));
    const breath = Math.sin(loose.time * 1.6) * 0.006;
    for (const side of ['right', 'left']) {
      const arm = lucienArms[side], s = side === 'right' ? 1 : -1;
      const frame = (out, [r, u, f], origin) => (origin ? out.copy(origin) : out.set(0, 0, 0)).addScaledVector(right, r * s).addScaledVector(up, u).addScaledVector(forward, f);
      arm.shoulder(shoulder);
      const centre = lucienHips.getWorldPosition(rv[3]);
      const across = rv[4].subVectors(shoulder, centre).dot(right) * s;
      // Each arm swings forward as the opposite foot does.
      const swing = loose.swing * 0.38 * -s;
      frame(target, [HANG.wrist[0] - across, HANG.wrist[1], HANG.wrist[2]], shoulder).addScaledVector(forward, swing).addScaledVector(up, breath + Math.abs(swing) * 0.15);
      frame(pole, HANG.pole, shoulder);
      frame(finger, HANG.finger).addScaledVector(forward, swing * 1.2).normalize();
      const palm = frame(rv[2], HANG.palm).normalize();
      arm.solve({ target, pole, finger, palm, weight: loose.weight, twist: 0.6 });
      arm.curl(0.32, { weight: loose.weight, thumb: 0.3, spread: 0.04 });
    }
  }

  // Offsets from each shoulder in his body frame: [right, up, forward] metres. His hands have no finger bones, so the
  // sword hand is turned directly: the blade (the hand's +X) points ahead and low, the knuckles (+Y) down.
  const CARRY = {
    right: { wrist: [0.06, -0.5, 0.26], pole: [0.5, -0.3, -0.35], blade: [-0.05, -0.3, 0.95], knuckles: [0, -1, 0.2] },
    left: { wrist: [-0.1, -0.56, 0.06], pole: [-0.5, -0.3, -0.4] },
  };
  const hunterSwordHand = hunterArms.right.hand;
  const bladeBasis = new THREE.Matrix4(), bladeTurn = new THREE.Quaternion(), bladeParent = new THREE.Quaternion();
  function carry(weight) {
    const { a: forward, b: right, c: shoulder, d: target, e: pole, f: finger } = tmp;
    facing(hunter, forward);
    rightOf(forward, right);
    const frame = (out, [r, u, f], origin) => (origin ? out.copy(origin) : out.set(0, 0, 0)).addScaledVector(right, r).addScaledVector(up, u).addScaledVector(forward, f);
    const action = hunter.clip === 'walk' && hunter.action('walk');
    const swing = action ? Math.sin(action.time / hunter.duration('walk') * Math.PI * 2) * 0.09 : 0;
    hunter.root.updateMatrixWorld(true);
    for (const side of ['right', 'left']) {
      const spec = CARRY[side], arm = hunterArms[side];
      arm.shoulder(shoulder);
      frame(target, spec.wrist, shoulder).addScaledVector(forward, side === 'left' ? swing : -swing * 0.3);
      frame(pole, spec.pole, shoulder);
      arm.solve({ target, pole, weight });
    }
    const blade = frame(finger, CARRY.right.blade).normalize();
    const knuckles = frame(tmp.e, CARRY.right.knuckles);
    knuckles.addScaledVector(blade, -knuckles.dot(blade)).normalize();
    bladeBasis.makeBasis(blade, knuckles, tmp.d.crossVectors(blade, knuckles));
    hunterSwordHand.parent.getWorldQuaternion(bladeParent);
    bladeTurn.setFromRotationMatrix(bladeBasis).premultiply(bladeParent.invert());
    hunterSwordHand.quaternion.slerp(bladeTurn, weight);
    hunterSwordHand.updateMatrixWorld(true);
  }

  // The hunter is flung backwards past the pillar's flank: his hips follow a path that grazes it, whatever the clip's
  // own root motion does, and the pillar breaks when he reaches it.
  function planFlight(from) {
    const away = new THREE.Vector3(from.x - PILLAR.x, 0, from.z - PILLAR.z);
    const span = away.length();
    away.normalize();
    const side = rightOf(away, new THREE.Vector3());
    // Pass on whichever flank of the pillar is nearer the line he is thrown along.
    const sign = Math.sign(side.x * (from.x - PILLAR.x) + side.z * (from.z - PILLAR.z)) || 1;
    const hit = span < 4.2
      ? new THREE.Vector3(PILLAR.x, 0, PILLAR.z).addScaledVector(away, 0.3).addScaledVector(side, 0.62 * sign)
      : new THREE.Vector3(from.x, 0, from.z).addScaledVector(away, -1.4);
    return { start: new THREE.Vector3(from.x, 0, from.z), hit, away, smash: span < 4.2, time: 0, impact: 1.0, struck: false };
  }
  function fly() {
    const action = hunter.action('knocked');
    if (!action) return;
    flight.time = action.time;
    hunter.group.updateMatrixWorld(true);
    const hips = hunterHips.getWorldPosition(tmp.a);
    const motion = tmp.b.set(hips.x - hunter.group.position.x, 0, hips.z - hunter.group.position.z);
    if (flight.reference == null && flight.time >= flight.impact) flight.reference = motion.clone();
    const k = 1 - Math.pow(1 - Math.min(1, flight.time / flight.impact), 1.6);
    const path = tmp.c.lerpVectors(flight.start, flight.hit, k);
    // After the blow the rest of his fall is damped, and pushed away from the stone so he lies beside it.
    if (flight.reference) path.addScaledVector(tmp.d.subVectors(motion, flight.reference), 0.35).addScaledVector(flight.away, 0.12 * smooth((flight.time - flight.impact) / 0.4));
    hunter.group.position.x = path.x - motion.x;
    hunter.group.position.z = path.z - motion.z;
    if (!flight.struck && flight.time >= flight.impact) {
      flight.struck = true;
      if (flight.smash) {
        chapel.smash(clock);
        sound.play('pillar-impact', 0, 0, 'effects', 0.85);
        ui.shake(1.2);
      }
      sound.play('blade-fall', 0.35, 0, 'effects', 0.6);
    }
  }
  function lieDown(from) {
    flight = planFlight(from);
    flight.struck = true;
    flight.reference = null;
    hunter.place(from.x, from.z, Math.atan2(flight.away.x, flight.away.z));
    const action = hunter.play('knocked', { fade: 0, loop: false });
    action.time = hunter.duration('knocked');
    hunter.group.visible = true;
    // Pose him at the blow first so the damped rest of the fall is measured from the clip, then at the end.
    action.time = flight.impact;
    hunter.update(0);
    action.time = hunter.duration('knocked') - 0.001;
    hunter.update(0);
  }

  // Every segment can be entered cold (checkpoint, menu jump); `jump` rebuilds the scene that leads into it.
  function enter(id, { jump = false } = {}) {
    cues = [];
    holdTime = 0;
    woundLooked = 0; woundTalked = woundDone = false;
    stuckShown = false;
    seen = warned = hunterMoving = false;
    warnEnd = Infinity;
    dash = slide = slash = null;
    if (hunger) { hunger = null; feed(); lids(0); }
    if (!['gift', 'wear', 'end'].includes(id)) rite = null;
    interact.clear();
    player.limitLook(null);
    player.movable = true;
    player.passageOpen = false;
    ui.matte(['rescue', 'wound', 'intimacy', 'gift', 'wear'].includes(id));
    if (jump) stage(id);
    segments[id]?.();
  }

  function stage(id) {
    const order = ['explore', 'danger', 'rescue', 'wound', 'intimacy', 'gift', 'wear', 'end'];
    const index = order.indexOf(id);
    spoken = new Set();
    chapel.reset();
    if (index > order.indexOf('rescue')) chapel.smash(clock - 10);
    hunter.group.visible = false;
    lucien.group.visible = false;
    pendant.group.visible = false;
    pendant.setFill(1);
    pendant.stopPour();
    pendant.setChainEndpoints(null, null);
    pendant.setGlow(0);
    rite = null;
    lids(0);
    bob.ready = false;
    flight = null;
    contact.mode = null; contact.weight = contact.goal = 0;
    gaze.release();
    arms.wound.value = index > order.indexOf('rescue') ? 1 : 0;
    arms.set(index > order.indexOf('rescue') && index < order.indexOf('gift') ? 'injured' : 'rest', { instant: true });
    ui.fade(0, true);
    if (id === 'explore') { player.setPose(START); return; }
    if (index <= order.indexOf('danger')) { player.setPose({ x: 0, z: -2.2, yaw: 0 }); return; }
    if (id === 'rescue') {
      player.setPose({ x: 0, z: -2.2, yaw: yawTo(-1.1, -2.0) });
      hunter.place(-1.1, -2.0);
      hunter.face(player.pose.x, player.pose.z);
      hunter.group.visible = true;
      hunter.play('idle', { fade: 0 });
      return;
    }
    // From the wound on, the scene is the aftermath: the hunter down by the broken pillar, the two of you near it.
    lieDown({ x: -1.3, z: -2.0 });
    player.setPose({ x: -0.3, z: -2.9, yaw: yawTo(-1.4, -2.6) });
    lucien.group.visible = true;
    lucien.play('idle', { fade: 0 });
    if (id === 'wound') { lucien.place(-1.75, -2.1); lucien.face(-2.6, -2.0); }
    else { lucien.place(-1.05, -2.6); lucien.face(player.pose.x, player.pose.z); player.setPose({ x: -0.3, z: -2.9, yaw: yawTo(-1.05, -2.6) }); }
    if (id === 'wear' || id === 'end') pendant.group.visible = true;
    // After the rite he has stepped back a little from you.
    if (id === 'end') {
      const { x, z } = lucien.group.position, dx = x - player.pose.x, dz = z - player.pose.z, d = Math.hypot(dx, dz);
      lucien.place(player.pose.x + dx / d * 0.6, player.pose.z + dz / d * 0.6);
      lucien.face(player.pose.x, player.pose.z);
    }
  }

  const segments = {
    explore() {
      after(0.8, () => { if (flow.segment === 'explore') ui.narrate('arrival', 6.4); });
      after(20, () => { if (flow.segment === 'explore') ui.hint('祭坛那边有光'); });
      after(45, () => { if (flow.segment === 'explore') ui.hint('祭坛那边有光 · 沿着中殿往前走'); });
    },

    danger() {
      // He steps out from behind the pillar on the player's left, where the moonlight does not reach, and waits there
      // until he is seen.
      hunter.place(-4.3, -1.9, Math.atan2(1, 0));
      hunter.face(player.pose.x, player.pose.z);
      hunter.group.visible = true;
      hunter.play('draw', { fade: 0, loop: false });
      sound.play('silver-blade', 0.5, 0, 'effects', 0.6, false, pan(hunter));
      after(0.55, () => { if (hunter.clip === 'draw') { hunter.play('idle', { fade: 0.3 }); hunter.face(player.pose.x, player.pose.z); } });
      // Until he is seen, the blade sounds again every few seconds from where he stands, with the side named.
      const cue = first => {
        if (seen || flow.segment !== 'danger') return;
        if (!first) sound.play('silver-blade', 0, 0, 'effects', 0.45, false, pan(hunter));
        const side = wrap(yawTo(hunter.group.position.x, hunter.group.position.z) - player.pose.yaw);
        ui.hint(Math.abs(side) > 2.3 ? '身后有声音' : side > 0 ? '左边有声音' : '右边有声音', 4);
        after(7, () => cue(false));
      };
      after(1.6, () => cue(true));
    },

    rescue() {
      player.movable = false;
      const start = hunter.group.position.clone();
      player.limitLook({ yaw: yawTo(start.x, start.z), range: 35 * DEG, pitch: 30 * DEG });
      hunter.stop();
      hunter.face(player.pose.x, player.pose.z);
      const swing = hunter.play('slash', { fade: 0.12, loop: false });
      swing.time = 0.15;
      slash = { phase: 'swing' };
      // You see the blade go up; your forearm comes up across your face just before it falls.
      after(0.22, () => arms.set('guard', { speed: 13 }));
      after(0.45, () => sound.play('rescue-whoosh', 0, 0, 'effects', 0.5));
      after(0.62, () => {
        arms.wound.value = 1;
        ui.flash(0.6, 'blood');
        ui.shake(0.9);
        sound.play('blade-block', 0, 0.05, 'effects', 0.35);
        sound.play('heartbeat', 0.1, 0, 'effects', 0.35);
        // The cut knocks you back half a step.
        const dx = player.pose.x - hunter.group.position.x, dz = player.pose.z - hunter.group.position.z, d = Math.hypot(dx, dz) || 1;
        stagger = { from: { x: player.pose.x, z: player.pose.z }, to: resolve({ x: player.pose.x + dx / d * 0.5, z: player.pose.z + dz / d * 0.5 }), time: 0, duration: 0.45 };
      });
      after(0.85, () => arms.set('injured', { speed: 4 }));
      // He comes from your left, the hunter's sword side, out of sight, fast.
      after(1.0, () => {
        const hx = hunter.group.position.x, hz = hunter.group.position.z;
        const toHunter = new THREE.Vector3(hx - player.pose.x, 0, hz - player.pose.z).normalize();
        const left = new THREE.Vector3(toHunter.z, 0, -toHunter.x);
        const from = lucienResolve({ x: player.pose.x + left.x * 2.6 - toHunter.x * 0.6, z: player.pose.z + left.z * 2.6 - toHunter.z * 0.6 });
        const hunterForward = new THREE.Vector3(player.pose.x - hx, 0, player.pose.z - hz).normalize();
        const hunterRight = rightOf(hunterForward, new THREE.Vector3());
        // He ends beside the hunter's sword arm, side-on to you, so you see his face and the hand on the wrist.
        const to = resolve({ x: hx + hunterForward.x * 0.3 + hunterRight.x * 0.72, z: hz + hunterForward.z * 0.3 + hunterRight.z * 0.72 }, LUCIEN_RADIUS, [{ x: hx, z: hz, r: HUNTER_RADIUS }, self()]);
        lucien.place(from.x, from.z, Math.atan2(to.x - from.x, to.z - from.z));
        lucien.group.visible = true;
        lucien.play('sprint', { fade: 0, speed: 1.3 });
        dash = { from, to, time: 0, duration: Math.max(0.45, Math.hypot(to.x - from.x, to.z - from.z) / 5.5), onArrive: () => {
          lucien.play('idle', { fade: 0.18 });
          hunterHand.getWorldPosition(tmp.a);
          lucien.face(tmp.a.x, tmp.a.z);
          contact.mode = 'grip'; contact.goal = 1; contact.rate = 18;
          gaze.lookAt(hunterHead.getWorldPosition(gazePoint), 1);
          slash.phase = 'held';
          sound.play('blade-block', 0, 0, 'effects', 0.65);
          ui.shake(0.5);
          const length = say('lucien-warning');
          // A held beat after the line, the two of them locked, before he throws.
          after(Math.max(2.8, length + 1.5), throwHunter);
        } };
        sound.play('rescue-whoosh', 0.15, 0, 'effects', 0.7, false, 0.6);
      });
    },

    wound() {
      player.movable = false;
      lucien.play('walk', { fade: 0.4 });
      gaze.lookAt(gazePoint, 1);
      approach();
      // The player can lift the cut arm to look at it; he is looking at it already.
      interact.add({
        id: 'arm', hold: true, label: '看看伤口', holdingLabel: '看着伤口',
        radius: 0.5, maxDistance: 1,
        enabled: () => player.pose.pitch < -0.3,
        position: target => target.copy(view.set(player.pose.x, player.pose.floor + 1.0, player.pose.z).addScaledVector(tmp.f.set(-Math.sin(player.pose.yaw), 0, -Math.cos(player.pose.yaw)), 0.3)),
        sticky: () => true,
        onHold: () => { flow.progress(); ui.hint('', 0); arms.set('inspect', { speed: 5 }); },
        onRelease: () => { if (flow.segment === 'wound') arms.set('injured', { speed: 4 }); },
      });
      after(2.5, () => { if (flow.segment === 'wound' && arms.pose === 'injured') ui.hint('你的手臂在流血 · 低头看看', 5); });
    },

    intimacy() {
      player.movable = false;
      lucien.face(player.pose.x, player.pose.z);
      gaze.lookAt(gazePoint, 1);
      arms.set('injured', { speed: 3 });
      let reaching = false;
      // Where he stands to take your hand; he gives back half a step when you let go and returns when you reach again.
      const home = { x: lucien.group.position.x, z: lucien.group.position.z };
      interact.add({
        id: 'lucien', hold: true, label: '向他伸出手', holdingLabel: '握着他的手 · 别松开',
        radius: 0.42, maxDistance: 1.7,
        position: target => lucien.group.getWorldPosition(target).setY(lucien.group.position.y + 1.25),
        // Once he has your hand, looking about does not take it back; letting go of the key does.
        sticky: () => contact.mode === 'cradle' && contact.goal === 1,
        onHold: () => {
          if (flow.segment !== 'intimacy') return;
          flow.progress();
          reaching = true;
          ui.hint('', 0);
          const { x, z } = lucien.group.position;
          slide = Math.hypot(x - home.x, z - home.z) > 0.02 ? { from: { x, z }, to: home, time: 0, duration: 0.7 } : null;
          arms.set('reach', { point: meeting(new THREE.Vector3(), home), speed: 4.2 });
          sound.play('heartbeat', 0, 0, 'effects', 0.3);
        },
        onRelease: () => {
          if (flow.segment !== 'intimacy' || !reaching || hunger) return;
          reaching = false;
          const wasHeld = contact.goal === 1;
          holdTime = 0;
          arms.set('injured', { speed: 3.5 });
          contact.goal = 0; contact.rate = 5;
          player.limitLook(null);
          lucien.play('idle', { fade: 0.5 });
          if (wasHeld && !spoken.has('every-drop')) {
            // He lets you go and gives back half a step.
            const { x, z } = lucien.group.position;
            const dx = x - player.pose.x, dz = z - player.pose.z, d = Math.hypot(dx, dz) || 1;
            slide = { from: { x, z }, to: lucienResolve({ x: x + dx / d * 0.2, z: z + dz / d * 0.2 }), time: 0, duration: 0.8 };
            ui.hint('他松开了手 · 想再伸手，就再按住', 4);
          }
        },
      });
      intimacyReach = () => reaching;
      after(1.5, () => {
        if (flow.segment === 'intimacy' && !interact.held) ui.hint(touchDevice() ? '看着他，按住准星旁的按钮，向他伸出手' : '看着他，按住 E，向他伸出手', 8);
      });
    },

    gift() {
      player.movable = false;
      interact.clear();
      contact.goal = 0; contact.rate = 4;
      arms.set('injured', { speed: 3 });
      player.limitLook({ yaw: yawTo(lucien.group.position.x, lucien.group.position.z), range: 45 * DEG, pitch: 40 * DEG, down: 1.2 });
      lucien.play('idle', { fade: 0.6 });
      gaze.lookAt(gazePoint, 1);
      // He takes an empty vial from inside his coat and holds it under your hand while the blood runs into it, then
      // holds it up between you by the clasp.
      rite = { kind: 'gift', time: 0, release: Infinity, gap: 0, gapGoal: 0 };
      bob.ready = false;
      pendant.setFill(0);
      pendant.setGlow(0);
      let accepted = false;
      // A step in, and your cut hand comes up over the glass.
      after(0.3, () => { if (flow.segment === 'gift') closeTo(0.6, 1.3); });
      after(GIFT.inspect / (PACE.gift ?? 1), () => { if (flow.segment === 'gift') arms.set('bleed', { speed: 3.5 }); });
      after(GIFT.pour / (PACE.gift ?? 1), () => { if (flow.segment === 'gift') sound.play('heartbeat', 0, 0, 'effects', 0.35); });
      after(GIFT.pour / (PACE.gift ?? 1), () => { if (flow.segment === 'gift') ui.narrate('pour', (GIFT.full - GIFT.pour) / (PACE.gift ?? 1) - 0.1); });
      after(GIFT.full / (PACE.gift ?? 1), () => { if (flow.segment === 'gift') { arms.set('rest', { speed: 3 }); sound.play('crystal-bloom', 0, 0, 'effects', 0.4); } });
      after(GIFT.full / (PACE.gift ?? 1), () => { if (flow.segment === 'gift') ui.narrate('full', brisk ? 2.4 : 3.6); });
      after(GIFT.offered / (PACE.gift ?? 1) + 1.5, () => { if (flow.segment === 'gift' && !accepted) ui.hint(touchDevice() ? '他把项链递到你眼前 · 按准星旁的按钮接受' : '他把项链递到你眼前 · 按 E 接受', 6); });
      interact.add({
        id: 'pendant', label: '接受他的项链', radius: 0.14, maxDistance: 1.5,
        enabled: () => !accepted && rite?.kind === 'gift' && rite.time > GIFT.offered,
        position: target => target.copy(pendant.group.position),
        onUse: () => {
          if (flow.segment !== 'gift' || accepted) return;
          accepted = true;
          flow.progress();
          ui.hint('', 0);
          // Your fingertips find the heart, set it swinging, and you nod.
          arms.set('touch', { point: pendant.group.position, speed: 4 });
          after(brisk ? 0.6 : 0.85, () => {
            sound.play('necklace-touch', 0, 0, 'effects', 0.35);
            bob.last.addScaledVector(F.pf, -0.006);
            arms.set('rest', { speed: 3 });
            onAccept();
          });
          after(brisk ? 0.9 : 1.3, () => flow.advance('gift'));
        },
      });
    },

    wear() {
      player.movable = false;
      interact.clear();
      arms.set('rest', { speed: 3 });
      player.limitLook({ yaw: yawTo(lucien.group.position.x, lucien.group.position.z), range: 45 * DEG, pitch: 50 * DEG, down: 1.38 });
      lucien.play('idle', { fade: 0.4 });
      gaze.lookAt(gazePoint, 1);
      // He opens the chain, reaches round your neck and fastens it at the back, then rests his brow on yours.
      rite = { kind: 'wear', time: 0, release: Infinity, gap: 0, gapGoal: 0 };
      if (!pendant.group.visible) { pendant.group.visible = true; bob.ready = false; }
      closeTo(CLASP_GAP, 1.1);
      after(3.6 / (PACE.wear ?? 1), () => { if (flow.segment === 'wear') { sound.play('necklace-touch', 0, 0, 'effects', 0.4); ui.shake(0.08); } });
      after(3.9 / (PACE.wear ?? 1), () => { if (flow.segment === 'wear') closeTo(BROW_GAP, 1.1); });
      // The three closing lines, the first while he opens the chain and each after the last has finished; for the last
      // he straightens and steps back to arm's length to look at you, rather than speaking from a hand's width away.
      let delay = brisk ? 0.6 : 1.3;
      for (const [id, gap] of brisk ? [['lose-control', 0.15], ['protect', 0.15], ['not-me', 0]] : [['lose-control', 0.35], ['protect', 0.3], ['not-me', 0.25]]) {
        const start = delay;
        if (id === 'not-me') after(start - 0.9, () => { if (rite) { rite.gapGoal = 0.05; rite.back = rite.time; closeTo(0.62, 1.4); } });
        after(start, () => say(id));
        delay = start + Math.max(sound.duration(id), 1.5) + gap;
      }
      after(delay, () => {
        if (flow.segment !== 'wear') return;
        rite.release = rite.time;
        closeTo(0.6, 2.2);
      });
      after(delay + (brisk ? 0.4 : 0.9), () => flow.advance('wear'));
    },

    end() {
      player.movable = false;
      interact.clear();
      player.limitLook({ yaw: yawTo(lucien.group.position.x, lucien.group.position.z), range: 60 * DEG, pitch: 50 * DEG, down: 1.38 });
      gaze.lookAt(gazePoint, 1);
      // The heart lights on your chest; the story closes once you have looked down at it, or after a while if you don't.
      rite = { kind: 'end', time: 0, release: 0, gap: 0, gapGoal: 0, looked: 0, done: false };
      pendant.group.visible = true;
      after(0.4, () => sound.play('crystal-bloom', 0, 0, 'effects', 0.35));
      after(2.2, () => { if (flow.segment === 'end' && !rite.looked) ui.hint('胸前的吊坠亮了起来', 4); });
    },
  };
  let stagger = null;
  let intimacyReach = () => false;
  // Where your hand goes as he lifts it towards his mouth.
  const lifted = new THREE.Vector3();
  function lift(amount) {
    meeting(lifted);
    const { x, z } = lucien.group.position;
    const forward = facing(lucien, tmp.b);
    lifted.lerp(tmp.c.set(x, lucien.group.position.y + 1.5, z).addScaledVector(forward, 0.27), amount * 0.75);
  }

  // Where the two hands meet: a little in front of the player, towards him, below his shoulder and on the player's
  // left, in front of his right shoulder, so his arm comes forward from his side with the elbow down.
  function meeting(target, { x, z } = lucien.group.position) {
    const dx = x - player.pose.x, dz = z - player.pose.z, d = Math.hypot(dx, dz) || 1;
    const out = Math.min(0.45, d * 0.55);
    return target.set(player.pose.x + dx / d * out, player.pose.floor + 1.3, player.pose.z + dz / d * out)
      .addScaledVector(tmp.e.set(-dz / d, 0, dx / d), -0.14);
  }

  // Stereo position of a character relative to where the player looks: -1 left … 1 right.
  const pan = character => -Math.sin(wrap(yawTo(character.group.position.x, character.group.position.z) - player.pose.yaw)) * 0.8;

  function startHunter() {
    if (hunterMoving || flow.segment !== 'danger') return;
    hunterMoving = true;
    hunter.face(player.pose.x, player.pose.z);
    hunter.play('walk');
    hunter.walkTo(player.pose.x, player.pose.z, { speed: 0.7, stopAt: hunterGap(), resolve: hunterResolve });
    sound.play('hunter-footsteps', 0, 0, 'effects', 0.7, false, pan(hunter));
  }

  // Whether a line from the player's eyes to his head is clear of the chapel's stone.
  const sight = new THREE.Raycaster(), eyes = new THREE.Vector3(), towards = new THREE.Vector3();
  let seenAt = 0;
  function hunterVisible() {
    eyes.set(player.pose.x, player.pose.floor + 1.6, player.pose.z);
    hunterHead.getWorldPosition(towards).sub(eyes);
    const far = towards.length();
    sight.set(eyes, towards.normalize());
    sight.far = far - 0.2;
    return sight.intersectObject(chapel.group, true).length === 0;
  }
  // He keeps his distance until he has spoken, then closes in.
  const hunterGap = () => (warnEnd < flow.elapsed ? 1.05 : 1.7);
  function warn() {
    if (warned || flow.segment !== 'danger') return;
    warned = true;
    const length = say('hunter-warning');
    warnEnd = flow.elapsed + length;
    after(length + 4, () => flow.advance('danger'));
  }

  // Lucien swings the hunter round by the wrist and lets go towards the pillar.
  function throwHunter() {
    if (flow.segment !== 'rescue') return;
    const action = lucien.play('throw', { fade: 0.15, loop: false });
    action.time = 0.5;
    after(0.42, () => {
      contact.goal = 0; contact.rate = 7;
      slash = null;
      const start = hunter.group.position.clone();
      flight = planFlight(start);
      hunter.face(start.x + flight.away.x, start.z + flight.away.z);
      hunter.play('knocked', { fade: 0.1, loop: false });
      sound.play('rescue-whoosh', 0, 0, 'effects', 0.55);
      gaze.lookAt(hunterHips.getWorldPosition(gazePoint), 1);
      player.limitLook({ yaw: yawTo((start.x + flight.hit.x) / 2, (start.z + flight.hit.z) / 2), range: 40 * DEG, pitch: 30 * DEG });
      after(1.0 + 2.2, () => flow.advance('rescue'));
    });
    after(1.9, () => { if (lucien.clip === 'throw') lucien.play('idle', { fade: 0.5 }); });
  }

  // Is (x, z) within `range` of where the player is looking?
  const inView = (x, z, range = 30 * DEG) => Math.abs(wrap(yawTo(x, z) - player.pose.yaw)) < range;

  // Lucien walks to stand 0.8 m from the player, following if they step away.
  function approach() {
    lucien.walkTo(player.pose.x, player.pose.z, {
      speed: 0.6, stopAt: 0.8, resolve: lucienResolve,
      onArrive: () => {
        if (flow.segment !== 'wound') return;
        lucien.play('idle', { fade: 0.4 });
        lucien.face(player.pose.x, player.pose.z);
        flow.progress();
        if (spoken.has('bleeding')) return;
        const length = say('bleeding');
        after(length + 0.4, () => { woundTalked = true; });
      },
    });
  }

  function update(dt, time) {
    clock = time;
    const due = cues.filter(cue => cue.time <= flow.elapsed);
    if (due.length) { cues = cues.filter(cue => cue.time > flow.elapsed); for (const cue of due) cue.fn(); }
    const segment = flow.segment;
    const obstacles = [];
    if (hunter.group.visible) {
      // Once he is down, the obstacle is where his body lies, not where his feet started.
      const body = flight ? hunterHips.getWorldPosition(tmp.a) : hunter.group.position;
      obstacles.push({ x: body.x, z: body.z, r: flight ? 0.5 : HUNTER_RADIUS });
    }
    if (lucien.group.visible) obstacles.push({ x: lucien.group.position.x, z: lucien.group.position.z, r: LUCIEN_RADIUS });
    player.obstacles = obstacles;

    if (segment === 'explore' && Math.hypot(player.pose.x - ALTAR.x, player.pose.z - ALTAR.z) < 3) flow.advance('explore');
    else if (segment === 'danger') {
      if (!seen && inView(hunter.group.position.x, hunter.group.position.z)) { seen = true; seenAt = flow.elapsed; flow.progress(); after(0.4, startHunter); }
      // He speaks once he has stepped clear of the pillar, not while it still hides him.
      if (seen && !warned && flow.elapsed - seenAt > 0.9 && (flow.elapsed - seenAt > 2.5 || hunterVisible())) warn();
      if (hunterMoving) {
        if (hunter.walking) hunter.walkTo(player.pose.x, player.pose.z, { speed: 0.7, stopAt: hunterGap(), resolve: hunterResolve });
        else if (hunter.clip === 'walk') { hunter.play('idle'); hunter.face(player.pose.x, player.pose.z); }
        else if (hunter.clip === 'idle' && distance(hunter) > hunterGap() + 0.25) { hunter.play('walk'); hunter.walkTo(player.pose.x, player.pose.z, { speed: 0.7, stopAt: hunterGap(), resolve: hunterResolve }); }
        if (distance(hunter) < 1.2) flow.advance('danger');
      }
    } else if (segment === 'wound') {
      // The story moves on once he has spoken and the player has held the cut up long enough to see it.
      if (interact.held === 'arm' && arms.distance < 0.05) woundLooked += dt;
      if (woundTalked && woundLooked > 1.8 && !woundDone) { woundDone = true; after(0.8, () => flow.advance('wound')); }
      if (!lucien.walking && distance(lucien) > 1.05 && !spoken.has('bleeding')) { lucien.play('walk'); approach(); }
      else if (lucien.walking) approach();
    } else if (segment === 'intimacy') {
      if (intimacyReach() && interact.held === 'lucien') {
        flow.progress();
        // He takes your hand once it is nearly out to him.
        if (contact.goal === 0 && arms.distance < 0.14) {
          contact.mode = 'cradle'; contact.goal = 1; contact.rate = 6;
          lucien.play('idle', { fade: 0.4 });
          player.limitLook({ yaw: yawTo(lucien.group.position.x, lucien.group.position.z), range: 45 * DEG, pitch: 40 * DEG });
        }
        if (contact.goal === 1 && contact.weight > 0.85) {
          holdTime += dt;
          if (holdTime > 1.6 && !spoken.has('every-drop')) {
            say('every-drop');
            // Once he has said it the moment is his; letting go no longer takes your hand back.
            hunger = { time: 0 };
            interact.remove('lucien');
            arms.set('reach', { point: lifted.copy(meeting(tmp.a)), speed: 5 });
            // Half a step in as he draws your hand up to him.
            after(HUNGER.lift, () => closeTo(0.66, 1.8));
            after(HUNGER.red, () => sound.play('heartbeat', 0, 0, 'effects', 0.55));
            after(HUNGER.fang + 0.6, () => sound.play('heartbeat', 0, 0, 'effects', 0.7));
            // What the player cannot hear him think: the want, and the holding back.
            after(HUNGER.fang, () => { if (flow.segment === 'intimacy') ui.narrate('fangs', HUNGER.master - HUNGER.fang - 0.2); });
            after(HUNGER.master, () => { if (flow.segment === 'intimacy') ui.narrate('restraint', HUNGER.done - HUNGER.master - 0.4); });
            after(HUNGER.done, () => flow.advance('intimacy'));
          }
        }
      }
    }

    if (segment === 'end' && rite?.kind === 'end' && !rite.done) {
      if (rite.looked > 1.4 || rite.time > 7) { rite.done = true; onComplete(); }
    }
    // Once you walk on, he turns where he stands to keep you in view.
    if (rite?.free) {
      const { x, z } = lucien.group.position;
      const want = Math.atan2(player.pose.x - x, player.pose.z - z);
      lucien.place(x, z, lucien.heading + wrap(want - lucien.heading) * (1 - Math.exp(-dt * 1.6)));
    }
    if (!stuckShown && STUCK[segment] && flow.idle > 45) { stuckShown = true; ui.hint(STUCK[segment]); }
    pendant.update(time);
  }

  // Runs after the player has moved, so arms, his hands and his eyes land on where the player is this frame.
  function animate(dt, camera) {
    if (stagger) {
      stagger.time += dt;
      const k = smooth(stagger.time / stagger.duration);
      player.setPose({ x: stagger.from.x + (stagger.to.x - stagger.from.x) * k, z: stagger.from.z + (stagger.to.z - stagger.from.z) * k, yaw: player.pose.yaw, pitch: player.pose.pitch });
      if (stagger.time >= stagger.duration) stagger = null;
    }
    arms.update(dt, camera, player.pose);
    if (dash) {
      dash.time += dt;
      const k = Math.min(1, dash.time / dash.duration), e = 1 - (1 - k) * (1 - k) * 0.6 - 0.4 * (1 - k);
      lucien.group.position.set(dash.from.x + (dash.to.x - dash.from.x) * e, lucien.group.position.y, dash.from.z + (dash.to.z - dash.from.z) * e);
      if (k >= 1) { const done = dash.onArrive; dash = null; done(); }
    }
    if (slide) {
      slide.time += dt;
      const k = smooth(slide.time / slide.duration);
      lucien.group.position.x = slide.from.x + (slide.to.x - slide.from.x) * k;
      lucien.group.position.z = slide.from.z + (slide.to.z - slide.from.z) * k;
      if (slide.time >= slide.duration) slide = null;
    }
    if (slash) {
      // Swing through, draw back up to the raised guard, then hold there straining against his grip. The strain is
      // slow and small: his hand is locked to the wrist it holds, so any fast shake would carry both arms with it.
      const action = hunter.action('slash');
      if (action) {
        if (slash.phase === 'swing' && action.time >= 1.05) { slash.phase = 'raise'; action.timeScale = -1.6; }
        if (slash.phase === 'raise' && action.time <= 0.4) { slash.phase = 'hover'; slash.at = clock; }
        if (slash.phase === 'hover' || slash.phase === 'held') {
          action.timeScale = 0;
          const strain = slash.phase === 'held' ? 0.006 : 0.012;
          action.time = 0.4 + Math.sin((clock - (slash.at ?? clock)) * 2.1) * strain;
          action.paused = false;
        }
      }
      if (slash.phase === 'held' && flight == null) {
        // He is turned, slowly, by the wrist, until his back is to the pillar.
        const away = Math.atan2(hunter.group.position.x - PILLAR.x, hunter.group.position.z - PILLAR.z);
        hunter.place(hunter.group.position.x, hunter.group.position.z, hunter.heading + wrap(away - hunter.heading) * (1 - Math.exp(-dt * 1.2)));
      }
    }
    // What his eyes are on this frame.
    const segment = flow.segment;
    if (segment === 'wound' || (segment === 'intimacy' && contact.mode === 'cradle' && contact.goal === 1)) arms.wrist(gazePoint);
    else if (segment === 'intimacy') gazePoint.copy(camera.position).y -= 0.05;
    else if (segment === 'rescue' && slash) hunterHead.getWorldPosition(gazePoint);
    else if (segment === 'rescue' && flight) hunterHips.getWorldPosition(gazePoint);
    if (hunger) {
      hunger.time += dt;
      const h = hungerPose();
      lift(h.lift);
      // On your hand while it rises to him; away over his shoulder while he masters himself; then back to you.
      if (h.away > 0.01) {
        const forward = facing(lucien, tmp.a), side = rightOf(forward, tmp.b);
        const away = tmp.c.copy(lucien.group.position).addScaledVector(forward, 0.6).addScaledVector(side, 1.4).setY(lucien.group.position.y + 1.3);
        if (hunger.time > HUNGER.back) gazePoint.copy(camera.position).y -= 0.05;
        gazePoint.lerp(away, h.away);
      }
    }
    // On entering the wound, before the arm is in view, he looks at where the arm hangs.
    if (segment === 'wound' && arms.lowered) gazePoint.set(player.pose.x, player.pose.floor + 1.0, player.pose.z);
    if (rite) {
      rite.time += dt * (PACE[rite.kind] ?? 1);
      rite.gap += (rite.gapGoal - rite.gap) * (1 - Math.exp(-dt * 2.5));
      eye.copy(camera.position);
      riteFrame();
      riteGaze(gazePoint);
      // Counts the time the lit heart is well inside the view.
      if (rite.kind === 'end' && rite.time > 1.2) {
        const p = view.copy(pendant.group.position).project(camera);
        if (p.z < 1 && Math.abs(p.x) < 0.8 && p.y > -0.75 && p.y < 0.8) rite.looked += dt;
      }
    }
    // Held still while paused: the mixer only rewrites a bone when its clip value changes, so with no time passing the
    // procedural layers would stack on last frame's pose and twist him further every frame.
    if (dt > 0) {
      hunter.update(dt);
      lucien.update(dt);
    }
    // The blood runs off your hand into the glass, and the glass fills.
    const pouring = rite?.kind === 'gift' && rite.time > GIFT.pour && rite.time < GIFT.full - 0.25;
    pendant.pour(pouring ? arms.drip(dripAt) : null, dt);
    if (rite?.kind === 'gift') {
      const filled = THREE.MathUtils.clamp((rite.time - GIFT.pour - 0.15) / (GIFT.full - GIFT.pour), 0, 1);
      pendant.setFill(filled);
      pendant.setGlow(filled * 0.3);
    }
  }

  // After the ending card: free to walk again, the heart still on your chest, and the way east open.
  function release() {
    if (rite?.kind !== 'end' || !rite.done) return false;
    rite.free = true;
    interact.clear();
    player.movable = true;
    player.limitLook(null);
    player.passageOpen = true;
    return true;
  }

  return { enter, update, animate, release, feed, get holdTime() { return holdTime; }, get rite() { return rite; }, contact, gaze };
}
