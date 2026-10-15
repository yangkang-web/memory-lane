import * as THREE from 'three';
import { EMOCHI, REST_POSE } from './emochi-rig.js';
import { STAGE } from './stage.js';
import { clamp, mix, smooth, smoother, easeOutBack, easeOutCubic, easeInCubic, window01, pulse, track } from './tracks.js';

// The running order of the curtain call. 96 BPM, twelve bars of 2.5 s; every beat below lands on the score in music.js.
//
//  0.0  House dark. A single seat's view of a closed curtain.
//  2.5  Follow spot hits the curtain; it parts and Emochi is found mid-thought, the question mark hanging over it.
//  5.0  It notices us, ponders once more, then walks down to its mark.
//  8.1  One memory from each world of Memory Lane drifts in and Emochi greets each one.
// 15.0  A little dance; the memories circle it.
// 17.5  The question mark comes down into its hands, the memories pour into it and it turns into a heart.
// 19.1  A hug, a lift, a release. 21.25 the heart bursts into confetti and the house warms up.
// 22.6  A deep bow, a goodbye wave, the curtain closes. 28.2 title card.

export const DURATION = 30;
export const BEAT = 60 / 96;
export const SCALE = 0.66;
const HOME = 0.78, START = -0.4;
const TAU = Math.PI * 2;

export const ORB_TIMES = [8.125, 9.375, 10.625, 11.875, 13.125];
const SLOTS = [[-1.5, 1.3, 0.58], [-0.86, 1.86, 0.36], [0, 2.32, 0.22], [0.86, 1.86, 0.36], [1.5, 1.3, 0.58]];
const FROM = [[-6.2, 3.2, 0.6], [-4.2, 6.4, -1.8], [0, 7.4, -2.6], [4.2, 6.4, -1.8], [6.2, 3.2, 0.6]];
const MERGE = [18.25, 18.35, 18.45, 18.55, 18.65];
const BURST = 21.25;

export const SUBTITLES = [
  { start: 3.0, end: 5.5, zh: '欢迎回到最后一幕。', en: 'Welcome back to the final act.' },
  { start: 5.8, end: 8.0, zh: '我一直在想——回忆到底是什么？', en: 'I keep wondering — what is a memory, really?' },
  { start: 8.2, end: 10.3, zh: '是向日葵教室里的阳光，是海边小屋的风，', en: 'Sunlight in the sunflower classroom, wind at the seaside cottage,' },
  { start: 10.5, end: 12.6, zh: '是废墟里那句「我在」，是月下教堂的誓言，', en: 'an “I’m here” among the ruins, a vow in the moonlit chapel,' },
  { start: 12.8, end: 15.2, zh: '还有那间装满故事的回忆小屋。', en: 'and the little house that keeps all these stories.' },
  { start: 17.6, end: 20.1, zh: '原来答案，一直都在这里。', en: 'So the answer was right here all along.' },
  { start: 20.3, end: 22.5, zh: '谢谢你，陪我走完这一程。', en: 'Thank you for walking all this way with me.' },
  { start: 22.8, end: 25.3, zh: '这些回忆会发光，是因为有你在。', en: 'These memories glow because you were there.' },
  { start: 25.6, end: 28.0, zh: '下一段回忆，我们再见。', en: 'See you in the next memory.' },
];
export const END_CARD = 28.2;

const BLINKS = [1.3, 4.2, 6.2, 9.7, 12.4, 14.5, 17.1, 23.0, 25.9, 27.4];
const HOPS = [{ time: 15.0, length: 0.5, height: 0.2 }, { time: 16.25, length: 0.56, height: 0.27 }, { time: 21.42, length: 0.44, height: 0.15 }];
const SPIN = { time: 16.25, length: 0.56 };

// Walking down to the mark: each plant is [time, z], the foot leaving STEP seconds before it lands.
const STEP = 0.34;
const PLANTS = [
  [[7.3, 0.2], [8.0, HOME]],
  [[6.95, -0.1], [7.65, 0.5], [8.28, HOME]],
];
const FOOT = { x: 0.3 * SCALE, splay: 0.16 };

function footAlong(plants, time) {
  let z = START, lift = 0, phase = 0;
  for (const [at, to] of plants) {
    if (time >= at) { z = to; continue; }
    if (time > at - STEP) {
      const u = (time - (at - STEP)) / STEP;
      z = mix(z, to, smoother(u));
      lift = Math.sin(Math.PI * u);
      phase = u;
    }
    break;
  }
  return { z, lift, phase };
}

function hop(time) {
  let lift = 0, squash = 0, crouch = 0;
  for (const h of HOPS) {
    const u = (time - h.time) / h.length;
    if (u > 0 && u < 1) { lift += 4 * h.height * u * (1 - u); squash += 0.09 * Math.sin(Math.PI * u); }
    crouch += pulse(time, h.time - 0.2, h.time - 0.07, h.time - 0.03, h.time + 0.06) + 0.8 * pulse(time, h.time + h.length - 0.02, h.time + h.length + 0.05, h.time + h.length + 0.09, h.time + h.length + 0.32);
  }
  return { lift, squash: squash - 0.12 * crouch, crouch };
}

// Each memory flies in on a curve from the wings or the fly loft and lands in its slot on the arc.
const v3 = (a, out = new THREE.Vector3()) => out.set(a[0], a[1], a[2]);
const scratchA = new THREE.Vector3(), scratchB = new THREE.Vector3(), scratchC = new THREE.Vector3();
function orbFlight(i, time, out) {
  const land = ORB_TIMES[i], u = easeOutCubic((time - (land - 1.05)) / 1.05);
  const from = v3(FROM[i], scratchA), to = v3(SLOTS[i], scratchB);
  const control = scratchC.copy(from).lerp(to, 0.5);
  control.y += 1.2;
  control.z += 1.4;
  const s = 1 - u;
  out.set(0, 0, 0).addScaledVector(from, s * s).addScaledVector(control, 2 * s * u).addScaledVector(to, u * u);
  out.y += 0.05 * Math.sin(time * 1.3 + i * 1.9) * window01(time, land - 0.3, land + 0.6);
  return out;
}
function orbOrbit(i, time, radius, out) {
  const angle = i * (TAU / 5) - 0.4 + (time - 14.6) * 1.35 + 2.4 * easeInCubic(window01(time, 17.3, 18.7, t => t));
  // The ring is tilted: bubbles pass in front of Emochi low, at its belly, and behind it high, so none crosses the face.
  const front = Math.cos(angle);
  return out.set(Math.sin(angle) * radius, 1.2 - 0.5 * front + 0.12 * Math.sin(time * 2.4 + i * 1.3), HOME + front * radius * 0.72);
}

const camera = {
  position: track([
    [0, [0, 1.25, 11.8], 'hold'], [2.5, [0, 1.38, 10.4]], [5.0, [0.35, 1.42, 7.7]], [6.6, [-0.45, 1.25, 6.6]],
    [8.0, [0, 1.32, 6.25]], [10.6, [0.55, 1.55, 6.55]], [13.1, [-0.45, 1.48, 6.9]], [15.0, [0, 1.12, 7.5]],
    [17.4, [1.15, 1.42, 6.6]], [18.8, [0.25, 1.18, 4.75]], [20.4, [0, 1.25, 5.3]], [21.25, [0, 1.42, 6.9]],
    [22.6, [0, 1.38, 7.6]], [25.2, [0, 1.42, 8.3]], [28.2, [0, 1.5, 9.6]], [30, [0, 1.52, 9.9], 'hold'],
  ]),
  target: track([
    [0, [0, 2.3, 0.8], 'hold'], [2.5, [0, 2.15, 1.4]], [5.0, [0, 1.3, -0.3]], [6.6, [0, 1.0, -0.1]],
    [8.0, [0, 1.25, 0.6]], [10.6, [0, 1.62, 0.5]], [13.1, [0, 1.6, 0.4]], [15.0, [0, 1.25, 0.6]],
    [17.4, [0, 1.25, 0.7]], [18.8, [0, 0.98, 0.95]], [20.4, [0, 1.45, 0.95]], [21.25, [0, 1.85, 0.7]],
    [22.6, [0, 1.35, 0.6]], [25.2, [0, 1.3, 0.6]], [28.2, [0, 2.2, 1.2]], [30, [0, 2.2, 1.2], 'hold'],
  ]),
  fov: track([[0, 36, 'hold'], [5, 34], [8, 33], [15, 36], [18.8, 30], [21.25, 37], [25.2, 35], [30, 36, 'hold']]),
};

const PALE = '#ffe8cc';
const flashes = [
  ...ORB_TIMES.map((time, i) => ({ time, origin: SLOTS[i], radius: 0.42, count: 26 })),
  ...MERGE.map(time => ({ time, origin: [0, (EMOCHI.PELVIS + 0.45) * SCALE, HOME + 0.86 * SCALE], radius: 0.3, count: 14 })),
  { time: 18.72, origin: [0, (EMOCHI.PELVIS + 0.5) * SCALE, HOME + 0.9 * SCALE], radius: 1.35, count: 130 },
  { time: BURST, origin: [0, 2.55, 1.15], radius: 2.2, count: 160 },
];

export function createShow() {
  const pose = structuredClone(REST_POSE);
  pose.hands = REST_POSE.hands.map(h => [...h]);
  pose.handTwist = [0, 0];
  pose.look = [0, 0];
  const place = { x: 0, y: 0, z: START, yaw: 0, scale: SCALE, feet: [{ x: 0, y: 0, z: 0, yaw: 0, pitch: 0 }, { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 }] };
  const light = name => ({ intensity: 0, target: [0, 0, 0], beam: 0, color: null, name });
  const stage = {
    time: 0, curtain: { top: 0, bottom: 0, motion: 0 }, house: 0.3, foot: 0, festoons: 0,
    cyc: { glow: 0, top: '#090616', bottom: '#2a0f22' },
    lights: { follow: light('follow'), rimL: light('rimL'), rimR: light('rimR'), moverL: light('moverL'), moverR: light('moverR'), wash: { intensity: 0 } },
  };
  const props = {
    time: 0,
    mark: { position: new THREE.Vector3(), scale: 0, spin: 0 },
    heart: { position: new THREE.Vector3(), scale: 0, glow: 0, spin: 0 },
    orbs: SLOTS.map(() => ({ position: new THREE.Vector3(), scale: 0, glow: 0 })),
    burst: { time: BURST, origin: new THREE.Vector3(0, 2.55, 1.15) },
    rain: { start: BURST + 0.1, span: 4.5 },
    flashes,
  };
  const view = { position: new THREE.Vector3(), target: new THREE.Vector3(), fov: 36, exposure: 1 };
  const frame = { time: 0, pose, place, stage, props, camera: view, labels: [0, 0, 0, 0, 0], subtitle: -1, endCard: 0 };
  const orbWorld = SLOTS.map(() => new THREE.Vector3());
  const tmp = new THREE.Vector3(), held = new THREE.Vector3(), lifted = new THREE.Vector3(), released = new THREE.Vector3(0, 1.78, 1.14);

  function setHand(i, target, w) { if (w > 0) for (let j = 0; j < 3; j++) pose.hands[i][j] = mix(pose.hands[i][j], target[j], w); }
  function toward(w, spec) {
    if (w <= 0) return;
    for (const key in spec) {
      const value = spec[key];
      if (key === 'hands') { setHand(0, value[0] ?? pose.hands[0], w); setHand(1, value[1] ?? pose.hands[1], w); }
      else if (Array.isArray(value)) for (let j = 0; j < value.length; j++) pose[key][j] = mix(pose[key][j], value[j], w);
      else pose[key] = mix(pose[key], value, w);
    }
  }
  // A world point in Emochi's body frame, ignoring lean (pointing only happens upright).
  function toBody(world, out) {
    const dx = world.x - place.x, dz = world.z - place.z, c = Math.cos(-place.yaw), s = Math.sin(-place.yaw);
    return out.set((dx * c + dz * s) / SCALE, (world.y - place.y) / SCALE - EMOCHI.PELVIS - pose.bob, (-dx * s + dz * c) / SCALE);
  }
  // Hand reaching from the shoulder towards a world point.
  function reach(i, world, distance = 0.74) {
    const side = i === 0 ? -1 : 1;
    toBody(world, tmp).sub(scratchA.set(side * 0.84, EMOCHI.BODY.b - 0.06, 0)).normalize();
    return [side * 0.84 + tmp.x * distance, EMOCHI.BODY.b - 0.06 + tmp.y * distance, tmp.z * distance];
  }

  function orbs(t) {
    for (let i = 0; i < SLOTS.length; i++) {
      const o = props.orbs[i], land = ORB_TIMES[i];
      orbFlight(i, t, orbWorld[i]);
      const circle = window01(t, 14.6, 15.6);
      const pull = smoother(window01(t, 17.3 + i * 0.12, MERGE[i], t => t));
      if (circle > 0) {
        orbOrbit(i, t, 1.55 * (1 - pull * 0.85), tmp);
        orbWorld[i].lerp(tmp, circle);
        orbWorld[i].lerp(props.mark.position, easeInCubic(pull));
      }
      o.position.copy(orbWorld[i]);
      const arrive = smooth(window01(t, land - 1.05, land - 0.25, t => t));
      const pop = 1 + 0.18 * pulse(t, land - 0.05, land + 0.05, land + 0.12, land + 0.45);
      o.scale = 0.27 * arrive * pop * (1 - 0.65 * pull) * (1 - smooth(window01(t, MERGE[i] - 0.18, MERGE[i], t => t)));
      o.glow = arrive;
      frame.labels[i] = pulse(t, land - 0.15, land + 0.25, land + 1.3, land + 1.7);
    }
  }

  /** Everything except the props that ride on Emochi's hands. */
  function evaluate(t) {
    frame.time = stage.time = props.time = t;

    // —— Emochi ——
    Object.assign(pose, { bob: 0, lean: 0.02, twist: 0, roll: 0, squash: 0, blink: 0, happy: 0, smile: 0.35, open: 0, blush: 0 });
    pose.hands[0].splice(0, 3, -1.08, 0.24 + 0.02 * Math.sin(t * 1.3), 0.12);
    pose.hands[1].splice(0, 3, 1.08, 0.24 + 0.02 * Math.sin(t * 1.3 + 1), 0.12);
    pose.handTwist[0] = pose.handTwist[1] = 0;
    pose.look[0] = 0; pose.look[1] = 0.08;
    const breath = Math.sin(t * TAU / 2.5);
    pose.squash += 0.012 * breath;
    pose.bob += 0.006 * breath;

    // Thinking, as the reference model is posed: chin on one mitten, the other scratching its head.
    const think = 1 - window01(t, 4.95, 5.55);
    const scratch = Math.sin(t * 15) * 0.035 * (pulse(t, 0.9, 1.1, 2.0, 2.2) + pulse(t, 3.3, 3.5, 4.3, 4.5));
    toward(think, {
      hands: [[-0.2, 0.73, 0.58], [0.72 + scratch, 1.6 + scratch * 0.5, 0.12]],
      roll: 0.22 + 0.04 * Math.sin(t * 1.2), twist: 0.08 + 0.05 * Math.sin(t * 0.9), lean: 0.03, look: [0.35, 0.55], smile: -0.2,
    });
    // It notices the audience, a little startled, then ponders once more.
    const notice = pulse(t, 4.95, 5.35, 5.75, 6.1);
    const startle = pulse(t, 5.0, 5.12, 5.3, 5.7);
    toward(notice, { hands: [[-0.98, 0.42, 0.34], [0.98, 0.42, 0.34]], look: [0, 0.12], smile: 0.6, roll: -0.04, lean: -0.04 });
    pose.open += 0.6 * startle;
    pose.squash += 0.07 * startle;
    const ponder = pulse(t, 5.75, 6.1, 6.5, 6.85);
    toward(ponder, { hands: [[-0.22, 0.74, 0.58], null], look: [-0.4, 0.5], smile: 0.05, roll: -0.12 });

    // Walk down to the spike mark.
    const feet = PLANTS.map(plants => footAlong(plants, t));
    const walking = pulse(t, 6.55, 6.75, 8.1, 8.4);
    const swing = Math.sin(TAU * (t - 6.6) / (2 * STEP + 0.01));
    toward(walking, { hands: [[-1.04, 0.26, 0.12 + 0.3 * swing], [1.04, 0.26, 0.12 - 0.3 * swing]], lean: 0.07, look: [0, 0.1], smile: 0.5 });
    pose.bob += walking * (-0.03 + 0.05 * Math.max(feet[0].lift, feet[1].lift));
    pose.roll += 0.05 * swing * walking;

    // Greeting each memory as it lands: look, lean in, point with the nearer hand (both hands for the one overhead).
    for (let i = 0; i < SLOTS.length; i++) {
      const land = ORB_TIMES[i];
      const w = pulse(t, land - 0.6, land - 0.2, land + 0.55, land + 0.95);
      if (w <= 0) continue;
      orbFlight(i, t, orbWorld[i]);
      toBody(orbWorld[i], scratchB);
      const lx = clamp(scratchB.x / 2.2, -1, 1);
      const delight = pulse(t, land, land + 0.1, land + 0.4, land + 0.7);
      const hands = i === 2 ? [reach(0, orbWorld[i], 0.7), reach(1, orbWorld[i], 0.7)]
        : i < 2 ? [reach(0, orbWorld[i]), [1.0, 0.3, 0.3]] : [[-1.0, 0.3, 0.3], reach(1, orbWorld[i])];
      toward(w, { hands, look: [lx, clamp((scratchB.y - 1.2) / 1.1, -0.3, 1)], twist: 0.22 * lx, smile: 0.85, lean: -0.03 });
      pose.happy = Math.max(pose.happy, 0.85 * delight);
      pose.squash += 0.05 * delight;
    }

    // Taking them all in.
    const admire = pulse(t, 13.75, 14.2, 14.7, 14.95);
    toward(admire, { hands: [[-0.2, 0.5, 0.6], [0.2, 0.5, 0.6]], look: [0, 0.75], smile: 0.9, roll: 0.1 * Math.sin(t * 2.5), happy: 0.4, blush: 0.4 });

    // Dance: arms on the beat, two hops (the second spins).
    const dance = pulse(t, 14.8, 14.95, 17.25, 17.55);
    const beats = (t - 15) / BEAT, sway = Math.sin(Math.PI * beats);
    toward(dance, {
      hands: [[-1.0, 0.72 + 0.4 * Math.max(0, sway), 0.32], [1.0, 0.72 + 0.4 * Math.max(0, -sway), 0.32]],
      roll: 0.12 * sway, twist: 0.12 * Math.sin(Math.PI * beats / 2), smile: 1, look: [0.2 * sway, 0.25],
    });
    const armsUp = Math.max(pulse(t, 14.92, 15.04, 15.4, 15.62), pulse(t, 16.17, 16.3, 16.78, 17.0));
    toward(armsUp, { hands: [[-0.86, 1.8, 0.24], [0.86, 1.8, 0.24]], happy: 1, open: 0.45 });

    // The question mark comes down into its hands.
    const receive = pulse(t, 17.3, 17.8, 18.72, 19.0);
    toward(receive, { hands: [[-0.27, 0.36, 0.8], [0.27, 0.36, 0.8]], look: [0, mix(0.6, -0.2, window01(t, 17.4, 18.4))], smile: 0.55, open: 0.25, lean: 0.07 });
    const wow = pulse(t, 18.75, 18.85, 19.0, 19.4);
    pose.open += 0.7 * wow;
    pose.squash += 0.09 * wow;

    // Hug, lift, release.
    const hug = pulse(t, 18.95, 19.25, 19.95, 20.15);
    toward(hug, { hands: [[-0.3, 0.44, 0.76], [0.3, 0.44, 0.76]], happy: 1, blush: 1, smile: 1, roll: 0.12 * Math.sin(TAU * (t - 19.1) / 1.25), lean: -0.05, look: [0, 0], open: 0 });
    pose.squash -= 0.04 * pulse(t, 19.2, 19.35, 19.45, 19.7);
    const lift = pulse(t, 19.95, 20.35, 20.58, 20.85);
    toward(lift, { hands: [[-0.3, 1.95, 0.66], [0.3, 1.95, 0.66]], look: [0, 1], lean: -0.12, smile: 0.9, happy: 0.4, blush: 0.6 });
    pose.squash += 0.05 * lift;
    const watch = pulse(t, 20.55, 20.85, 21.2, 21.4);
    toward(watch, { hands: [[-0.85, 1.6, 0.36], [0.85, 1.6, 0.36]], look: [0, 1], open: 0.35, lean: -0.1, blush: 0.4 });

    // Celebrate the burst.
    const cheer = pulse(t, 21.2, 21.32, 22.3, 22.7);
    toward(cheer, { hands: [[-0.9, 1.74 + 0.08 * Math.sin(t * 12), 0.3], [0.9, 1.74 + 0.08 * Math.sin(t * 12 + Math.PI), 0.3]], happy: 1, smile: 1, open: 0.5, blush: 0.6, look: [0, 0.4] });

    // Bow: one mitten on the tummy, the other swept out.
    const bowing = pulse(t, 22.5, 22.8, 24.9, 25.3);
    const bow = window01(t, 22.65, 23.45) * (1 - window01(t, 24.35, 25.1));
    toward(bowing, { hands: [[-0.36, 0.6, 0.55], [1.06, 0.52, 0.46]], smile: 0.8, look: [0, -0.1], blush: 0.3 });
    pose.lean = mix(pose.lean, 0.85, bow);
    pose.happy = Math.max(pose.happy, 0.8 * bow);
    pose.bob -= 0.04 * bow;

    // Goodbye wave.
    const waving = pulse(t, 25.2, 25.6, 27.6, 28.0);
    const wave = Math.sin(TAU * 1.9 * (t - 25.6));
    toward(waving, { hands: [[-1.05, 0.3, 0.15], [0.95 + 0.14 * wave, 1.55, 0.36]], handTwist: [0, 0.35 * wave], roll: -0.08 + 0.04 * wave, look: [0, 0.12], smile: 1, blush: 0.35 });
    pose.happy = Math.max(pose.happy, 0.6 * pulse(t, 26.0, 26.2, 26.8, 27.1));

    for (const at of BLINKS) pose.blink = Math.max(pose.blink, pulse(t, at, at + 0.06, at + 0.09, at + 0.17));

    // —— Placement and feet ——
    const jump = hop(t);
    pose.squash += jump.squash;
    pose.bob -= 0.05 * jump.crouch;
    place.y = jump.lift;
    place.yaw = TAU * smoother((t - SPIN.time) / SPIN.length);
    const walkingDone = t >= 8.4;
    place.z = walkingDone ? HOME : (feet[0].z + feet[1].z) / 2;
    place.x = 0;
    const c = Math.cos(place.yaw), s = Math.sin(place.yaw);
    for (const [i, side] of [-1, 1].entries()) {
      const foot = place.feet[i];
      let lx = side * FOOT.x, lz = 0, y = jump.lift, pitch = 0;
      if (!walkingDone) { lz = feet[i].z - place.z; y += feet[i].lift * 0.09; pitch = -0.35 * Math.sin(TAU * feet[i].phase) * (feet[i].lift > 0 ? 1 : 0); }
      if (i === 1) { y += 0.05 * think; pitch += 0.45 * think; lz -= 0.05 * think; }
      pitch -= 0.25 * Math.sin(Math.PI * clamp((t - HOPS[0].time) / HOPS[0].length)) + 0.25 * Math.sin(Math.PI * clamp((t - HOPS[1].time) / HOPS[1].length));
      foot.x = place.x + lx * c + lz * s;
      foot.z = place.z - lx * s + lz * c;
      foot.y = y;
      foot.yaw = place.yaw + side * -FOOT.splay;
      foot.pitch = pitch;
    }

    // —— Stage ——
    const opening = window01(t, 2.9, 4.65), openingLow = window01(t, 3.12, 4.95);
    const closing = window01(t, 26.0, 28.0), closingLow = window01(t, 26.2, 28.2);
    stage.curtain.top = opening * (1 - closing);
    stage.curtain.bottom = openingLow * (1 - closingLow);
    stage.curtain.motion = pulse(t, 2.9, 3.4, 4.4, 5.3) + pulse(t, 26.0, 26.5, 27.7, 28.6);
    stage.house = mix(0.32, 0.08, window01(t, 0.4, 2.4)) + 0.1 * window01(t, 21.2, 22.5) + 0.12 * window01(t, 28.2, 29.5);

    const hit = window01(t, 2.42, 2.56, smooth);
    const onEmochi = window01(t, 3.3, 4.8) * (1 - window01(t, 26.2, 28.0));
    const follow = stage.lights.follow;
    follow.intensity = 300 * hit * (1 - 0.3 * pulse(t, 14.8, 15.1, 17.3, 17.8)) * (1 - 0.25 * window01(t, 21.25, 22.4));
    follow.beam = hit * mix(0.13, 0.045, onEmochi) * (1 - 0.4 * window01(t, 21.25, 22.4));
    follow.target[0] = mix(0, place.x, onEmochi);
    follow.target[1] = mix(1.6, 0.85 + place.y, onEmochi);
    follow.target[2] = mix(STAGE.curtainZ, place.z, onEmochi);
    follow.color = PALE;

    const rims = window01(t, 4.4, 5.6) * (1 - 0.6 * window01(t, 26.0, 28.0));
    const rimBoost = 1 + 0.3 * pulse(t, 15, 15.3, 17.2, 17.6) + 0.35 * pulse(t, 21.2, 21.4, 22.6, 24);
    for (const [name, side] of [['rimL', -1], ['rimR', 1]]) {
      const l = stage.lights[name];
      l.intensity = 150 * rims * rimBoost;
      l.beam = 0.05 * rims * rimBoost;
      l.target.splice(0, 3, place.x + side * 0.2, 0.9, place.z + 0.1);
    }
    const movers = Math.max(pulse(t, 14.7, 15.0, 17.4, 17.9), pulse(t, 21.2, 21.3, 24.6, 25.6));
    for (const [name, side] of [['moverL', -1], ['moverR', 1]]) {
      const l = stage.lights[name];
      const phase = t * 2.1 + (side > 0 ? Math.PI : 0);
      l.intensity = 170 * movers;
      l.beam = 0.09 * movers;
      l.target.splice(0, 3, side * 0.4 + 1.9 * Math.sin(phase), 0, HOME - 0.2 + 0.9 * Math.cos(phase * 0.7));
    }
    stage.lights.wash.intensity = 165 * window01(t, BURST, BURST + 0.6) * (1 - 0.55 * window01(t, 26.4, 28.4));
    stage.foot = 0.32 * window01(t, 4.4, 5.8) + 0.4 * pulse(t, BURST, BURST + 0.3, 24.5, 26.5) - 0.18 * window01(t, 26.6, 28.4);
    stage.festoons = 0.32 * window01(t, 4.8, 7.5) + 0.68 * window01(t, BURST, BURST + 1.2);
    stage.cyc.glow = 0.35 * window01(t, 4.4, 6) + 0.25 * pulse(t, 18.6, 19.0, 20.5, 21.2) + 0.35 * window01(t, BURST, BURST + 0.8) - 0.25 * window01(t, 26.2, 28.4);
    stage.cyc.bottom = t < BURST ? '#2a0f22' : '#46182c';

    // —— Camera ——
    view.position.fromArray(camera.position(t));
    view.target.fromArray(camera.target(t));
    view.fov = camera.fov(t);
    view.exposure = 1 + 0.08 * pulse(t, BURST - 0.05, BURST + 0.05, BURST + 0.3, BURST + 1.6);

    // —— Text ——
    frame.subtitle = SUBTITLES.findIndex(line => t >= line.start && t < line.end);
    frame.endCard = window01(t, END_CARD, END_CARD + 1.1);
    return frame;
  }

  /** Props carried by Emochi; call after the rig has been posed for this frame. */
  function carry(t, rig) {
    // Question mark: hangs beside its head, bounces through the dance, comes down to the mitten and turns.
    const mark = props.mark;
    mark.position.set(place.x + 0.5, 1.9 + place.y + 0.05 * Math.sin(t * 1.6), place.z + 0.1);
    mark.position.y += 0.08 * Math.abs(Math.sin(Math.PI * (t - 15) / BEAT)) * pulse(t, 14.8, 15, 17.2, 17.5);
    // Down beside the head first, then in to the mittens at chest height, so it never crosses the face.
    rig.bodyPoint(0, 0.4, 0.86, held);
    const down = smoother(window01(t, 17.45, 18.2, t => t)), inward = smoother(window01(t, 17.85, 18.45, t => t));
    mark.position.set(mix(mark.position.x, held.x, inward), mix(mark.position.y, held.y, down), mix(mark.position.z, held.z, down));
    mark.scale = 0.44 * window01(t, 2.6, 3.4) * (1 - easeInCubic(window01(t, 18.55, 18.82, t => t)) * 0.999);
    mark.spin = 0.35 * Math.sin(t * 0.7) - 0.25 + TAU * smooth(window01(t, 16.25, 16.81, t => t)) + 16 * easeInCubic(window01(t, 18.1, 18.82, t => t));

    orbs(t);

    // Heart.
    const heart = props.heart;
    rig.bodyPoint(0, 0.5, 0.9, held);
    rig.bodyPoint(0, 2.15, 0.8, lifted);
    // Up in front of the face, not through it: the path bows out towards the audience on the way up.
    const rise = smoother(window01(t, 20.0, 20.5));
    heart.position.copy(held).lerp(lifted, rise);
    heart.position.z += 0.42 * Math.sin(Math.PI * rise);
    heart.position.lerp(released, smoother(window01(t, 20.35, 20.6)));
    if (t > 20.6) heart.position.lerp(tmp.set(0, 2.55, 1.15), easeOutCubic(window01(t, 20.6, BURST, t => t)));
    const swell = 1 + 0.18 * window01(t, BURST - 0.25, BURST, easeInCubic);
    heart.scale = mix(0.36, 0.46, smoother(window01(t, 20.0, 20.5))) * easeOutBack(window01(t, 18.72, 19.08, t => t), 2.6) * swell * (1 - window01(t, BURST, BURST + 0.07, t => t));
    heart.glow = window01(t, 18.72, 19.0) * (1 + 0.8 * window01(t, 20.6, BURST));
    heart.spin = TAU * smoother(window01(t, 20.55, BURST));
    props.burst.origin.set(0, 2.55, 1.15);
    return props;
  }

  return { evaluate, carry };
}
