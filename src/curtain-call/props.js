import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { hash } from './tracks.js';

// Things Emochi performs with: the question mark from the reference model, the heart it becomes, five orbs (one
// keepsake for each kind of work that made it) and the confetti and sparkle that close the show.

function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.18, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.12)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
const GLOW = glowTexture();
function glowSprite(color, size) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: new THREE.Color(color), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }));
  sprite.scale.setScalar(size);
  sprite.renderOrder = 7;
  return sprite;
}

function heartShape(size = 1) {
  const shape = new THREE.Shape();
  const s = size;
  shape.moveTo(0, -0.5 * s);
  shape.bezierCurveTo(0.18 * s, -0.32 * s, 0.58 * s, -0.08 * s, 0.56 * s, 0.2 * s);
  shape.bezierCurveTo(0.54 * s, 0.46 * s, 0.22 * s, 0.56 * s, 0, 0.3 * s);
  shape.bezierCurveTo(-0.22 * s, 0.56 * s, -0.54 * s, 0.46 * s, -0.56 * s, 0.2 * s);
  shape.bezierCurveTo(-0.58 * s, -0.08 * s, -0.18 * s, -0.32 * s, 0, -0.5 * s);
  return shape;
}
/** A puffy heart, one unit tall, centred, face towards +z. */
function heartGeometry() {
  const geometry = new THREE.ExtrudeGeometry(heartShape(0.78), { depth: 0.08, bevelEnabled: true, bevelThickness: 0.17, bevelSize: 0.13, bevelSegments: 14, curveSegments: 64 });
  geometry.center();
  geometry.computeVertexNormals();
  return geometry;
}

// Keepsakes, each about 0.3 units across and centred, for the inside of an orb: the nights, the edits, the retries,
// the takes and the hard parts that made Emochi.
const glowing = (color, strength) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(strength), toneMapped: false });

/** A desk lamp left on late at night. */
function deskLamp() {
  const group = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: '#2f3a56', metalness: 0.6, roughness: 0.35 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.022, 32), metal);
  base.position.set(-0.04, -0.12, 0);
  group.add(base);
  const arm = (from, to) => {
    const length = from.distanceTo(to);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, length, 10), metal);
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    group.add(mesh);
    const joint = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 8), metal);
    joint.position.copy(to);
    group.add(joint);
  };
  const foot = new THREE.Vector3(-0.04, -0.11, 0), elbow = new THREE.Vector3(-0.08, 0.04, 0), head = new THREE.Vector3(0.04, 0.12, 0);
  arm(foot, elbow);
  arm(elbow, head);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.07, 0.08, 32, 1, true), new THREE.MeshStandardMaterial({ color: '#3d4a6e', metalness: 0.5, roughness: 0.3, side: THREE.DoubleSide }));
  const hood = new THREE.Group();
  hood.position.copy(head);
  hood.rotation.z = -0.75;
  shade.position.y = -0.035;
  hood.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 12), glowing('#ffe2a0', 3));
  bulb.position.y = -0.06;
  hood.add(bulb);
  const pool = glowSprite('#ffd27a', 0.22);
  pool.position.y = -0.09;
  hood.add(pool);
  group.add(hood);
  return group;
}

/** A pencil, sharpened down and rubbed out more than once. */
function pencil() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.24, 6), new THREE.MeshStandardMaterial({ color: '#ffc928', roughness: 0.45, emissive: '#6a4200', emissiveIntensity: 0.4, flatShading: true }));
  group.add(body);
  const wood = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.06, 6), new THREE.MeshStandardMaterial({ color: '#e8c08a', roughness: 0.8, flatShading: true }));
  wood.position.y = -0.15;
  wood.rotation.x = Math.PI;
  group.add(wood);
  const lead = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.02, 8), new THREE.MeshStandardMaterial({ color: '#2a2a30', roughness: 0.4, metalness: 0.4 }));
  lead.position.y = -0.172;
  lead.rotation.x = Math.PI;
  group.add(lead);
  const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.03, 16), new THREE.MeshStandardMaterial({ color: '#d8dce6', metalness: 1, roughness: 0.3 }));
  ferrule.position.y = 0.135;
  group.add(ferrule);
  const eraser = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.03, 16), new THREE.MeshStandardMaterial({ color: '#ff8fa6', roughness: 0.7 }));
  eraser.position.y = 0.163;
  group.add(eraser);
  group.rotation.z = -0.7;
  return group;
}

/** A sheet balled up after another try. */
function paperBall() {
  const geometry = mergeVertices(new THREE.IcosahedronGeometry(0.12, 3));
  const position = geometry.attributes.position, point = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    point.fromBufferAttribute(position, i);
    point.multiplyScalar(0.8 + 0.32 * hash(i * 0.37 + 2));
    position.setXYZ(i, point.x, point.y, point.z);
  }
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.85, emissive: '#55506a', emissiveIntensity: 0.3, flatShading: true }));
}

/** A clapperboard, for every "one more take". */
function clapperboard() {
  const group = new THREE.Group();
  const slate = new THREE.MeshStandardMaterial({ color: '#1d1b22', roughness: 0.55 });
  const chalk = new THREE.MeshStandardMaterial({ color: '#f2efe8', roughness: 0.6, emissive: '#3a3a3a', emissiveIntensity: 0.4 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.17, 0.016), slate);
  board.position.y = -0.04;
  group.add(board);
  for (const [y, width] of [[0.0, 0.2], [-0.045, 0.14], [-0.09, 0.17]]) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(width, 0.008, 0.004), chalk);
    line.position.set(-0.11 + width / 2 + 0.01, y, 0.009);
    group.add(line);
  }
  const stick = (open) => {
    const hinge = new THREE.Group();
    hinge.position.set(-0.13, open ? 0.06 : 0.045, 0);
    hinge.rotation.z = open ? 0.38 : 0;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.03, 0.016), slate);
    bar.position.x = 0.13;
    hinge.add(bar);
    for (let k = 0; k < 5; k++) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.034, 0.004), chalk);
      stripe.position.set(0.025 + k * 0.05, 0, 0.009);
      stripe.rotation.z = 0.6;
      hinge.add(stripe);
    }
    group.add(hinge);
  };
  stick(false);
  stick(true);
  return group;
}

/** A few steps up, a little flag on the top one: the hard parts, climbed together. */
function steps() {
  const group = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: '#cfe9d6', roughness: 0.5, emissive: '#2c5a3a', emissiveIntensity: 0.35 });
  for (let k = 0; k < 4; k++) {
    const height = 0.05 + k * 0.05;
    const block = new THREE.Mesh(new RoundedBoxGeometry(0.065, height, 0.12, 2, 0.01), stone);
    block.position.set(-0.1 + k * 0.066, -0.13 + height / 2, 0);
    group.add(block);
  }
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.11, 8), new THREE.MeshStandardMaterial({ color: '#e0b964', metalness: 1, roughness: 0.3 }));
  pole.position.set(0.1, 0.125, 0);
  group.add(pole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.034), new THREE.MeshStandardMaterial({ color: '#ff6b8a', side: THREE.DoubleSide, emissive: '#a01838', emissiveIntensity: 0.6 }));
  flag.position.set(0.127, 0.16, 0);
  group.add(flag);
  group.rotation.y = -0.5;
  return group;
}

export const MEMORIES = [
  { key: 'nights', title: '一个个夜晚', en: 'Late nights', color: '#ffd27a', make: deskLamp },
  { key: 'edits', title: '改了又改', en: 'Rewrites', color: '#7cc8ff', make: pencil },
  { key: 'tries', title: '试了又试', en: 'Retries', color: '#c9a8ff', make: paperBall },
  { key: 'takes', title: '「再来一次」', en: '“One more take”', color: '#ff7a96', make: clapperboard },
  { key: 'hard', title: '难关', en: 'Hurdles', color: '#8ee6a8', make: steps },
];

export function createProps({ questionMark }) {
  const group = new THREE.Group();

  // The question mark keeps the reference's polished silver.
  const chrome = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.86, 0.88, 0.92), metalness: 1, roughness: 0.12, clearcoat: 0.5, envMapIntensity: 1.6 });
  const mark = new THREE.Group();
  questionMark.traverse(object => { if (object.isMesh) { object.material = chrome; object.castShadow = true; } });
  mark.add(questionMark);
  group.add(mark);

  const heartMaterial = new THREE.MeshPhysicalMaterial({
    color: '#ff3d6a', roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 0.6, sheenColor: new THREE.Color('#ffb3c6'),
    emissive: new THREE.Color('#ff1f52'), emissiveIntensity: 0.5, envMapIntensity: 1.2,
  });
  const heart = new THREE.Group();
  const heartMesh = new THREE.Mesh(heartGeometry(), heartMaterial);
  heartMesh.castShadow = false; // It glows; a hard shadow of it on Emochi reads as a painted decal.
  heart.add(heartMesh);
  const heartGlow = glowSprite('#ff5c8a', 1.9);
  heart.add(heartGlow);
  group.add(heart);

  // Orbs: glass bubbles with a keepsake turning inside and a soft halo of its own colour.
  const glass = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', roughness: 0.04, transmission: 1, thickness: 0.35, ior: 1.32, iridescence: 0.6, iridescenceIOR: 1.3,
    clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.5, transparent: true, opacity: 1, specularIntensity: 1,
  });
  const bubble = new THREE.SphereGeometry(1, 48, 32);
  const orbs = MEMORIES.map(memory => {
    const orb = new THREE.Group();
    const shell = new THREE.Mesh(bubble, glass);
    orb.add(shell);
    const keepsake = memory.make();
    const holder = new THREE.Group();
    holder.add(keepsake);
    holder.scale.setScalar(3.2);
    orb.add(holder);
    const halo = glowSprite(memory.color, 1.25);
    orb.add(halo);
    const core = glowSprite(memory.color, 0.5);
    orb.add(core);
    group.add(orb);
    return { orb, shell, holder, halo, core, memory };
  });

  // Confetti: a burst from the heart and a slow fall from the fly loft. Positions are worked out from time alone.
  const confettiCount = 900, burstCount = 420;
  const confetti = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.05, 0.03), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, metalness: 0.1, roughness: 0.55, emissive: '#3a2a20', emissiveIntensity: 0.6 }), confettiCount);
  confetti.frustumCulled = false;
  const palette = ['#f7d58a', '#f0c060', '#fff3e0', '#ff9fb8', '#d9b8ff', '#ffd2a8'].map(c => new THREE.Color(c));
  for (let i = 0; i < confettiCount; i++) confetti.setColorAt(i, palette[Math.floor(hash(i + 0.5) * palette.length)]);
  group.add(confetti);
  const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), euler = new THREE.Euler(), position = new THREE.Vector3(), scale = new THREE.Vector3();
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);

  // Sparkles: short-lived points of light, for the moment the question mark becomes a heart and for the burst.
  const sparkleCount = 420;
  const sparkleGeometry = new THREE.BufferGeometry();
  const sparklePositions = new Float32Array(sparkleCount * 3), sparkleAlpha = new Float32Array(sparkleCount);
  sparkleGeometry.setAttribute('position', new THREE.BufferAttribute(sparklePositions, 3).setUsage(THREE.DynamicDrawUsage));
  sparkleGeometry.setAttribute('alpha', new THREE.BufferAttribute(sparkleAlpha, 1).setUsage(THREE.DynamicDrawUsage));
  const sparkles = new THREE.Points(sparkleGeometry, new THREE.ShaderMaterial({
    uniforms: { uPixel: { value: 1 }, uMap: { value: GLOW } },
    vertexShader: 'attribute float alpha; uniform float uPixel; varying float vAlpha; void main(){ vAlpha = alpha; vec4 view = modelViewMatrix * vec4(position, 1.0); gl_PointSize = uPixel * (0.05 + alpha * 0.06) / -view.z; gl_Position = projectionMatrix * view; }',
    fragmentShader: 'uniform sampler2D uMap; varying float vAlpha; void main(){ vec4 g = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(vec3(1.0, 0.9, 0.78) * g.a * vAlpha * 2.2, 1.0); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  sparkles.frustumCulled = false;
  sparkles.renderOrder = 8;
  group.add(sparkles);

  /**
   * state: { time, mark: { position, scale, spin, visible }, heart: { position, scale, glow, visible },
   * orbs: [{ position, scale, glow }], burst: { time, origin }, rain: { start, span }, flashes: [{ time, origin, radius, count }] }
   */
  function update(state) {
    const t = state.time;
    mark.visible = state.mark.scale > 0.002;
    mark.position.copy(state.mark.position);
    mark.scale.setScalar(Math.max(1e-4, state.mark.scale));
    mark.rotation.set(Math.sin(t * 1.3) * 0.08, state.mark.spin, Math.sin(t * 0.9) * 0.1);

    heart.visible = state.heart.scale > 0.002;
    heart.position.copy(state.heart.position);
    heart.scale.setScalar(Math.max(1e-4, state.heart.scale));
    heart.rotation.set(0, Math.sin(t * 1.6) * 0.35 + state.heart.spin, Math.sin(t * 1.1) * 0.06);
    const beat = Math.pow(Math.max(0, Math.sin(t * Math.PI * 2 * 0.8)), 6);
    heartMaterial.emissiveIntensity = 0.25 + state.heart.glow * (0.4 + beat * 0.5);
    heartGlow.material.opacity = Math.min(1, state.heart.glow) * (0.22 + beat * 0.16);
    heartMesh.scale.setScalar(1 + beat * 0.05 * state.heart.glow);

    for (const [i, o] of orbs.entries()) {
      const s = state.orbs[i];
      o.orb.visible = s.scale > 0.002;
      o.orb.position.copy(s.position);
      o.orb.scale.setScalar(Math.max(1e-4, s.scale));
      o.holder.rotation.set(Math.sin(t * 0.8 + i) * 0.25, t * 0.9 + i * 1.3, Math.sin(t * 0.6 + i * 2) * 0.15);
      o.halo.material.opacity = s.glow * (0.45 + 0.15 * Math.sin(t * 2.2 + i * 1.7));
      o.core.material.opacity = s.glow * 0.5;
      o.shell.visible = s.shell ?? true;
    }

    // Confetti.
    const burst = state.burst;
    for (let i = 0; i < confettiCount; i++) {
      let visible = false;
      const seed = i * 1.618;
      const spinRate = 3 + hash(seed + 4) * 7;
      if (i < burstCount && burst && t >= burst.time) {
        const tau = t - burst.time, k = 2.6, fall = 0.42 + hash(seed + 9) * 0.3;
        const theta = hash(seed) * Math.PI * 2, up = 0.25 + hash(seed + 1) * 0.75;
        const speed = 2.4 + hash(seed + 2) * 3.4;
        const horizontal = Math.sqrt(1 - up * up) * speed, vertical = up * speed;
        const spread = (1 - Math.exp(-k * tau)) / k;
        position.set(burst.origin.x + Math.cos(theta) * horizontal * spread, 0, burst.origin.z + Math.sin(theta) * horizontal * spread * 0.7);
        position.y = burst.origin.y + (vertical + fall) * spread - fall * tau;
        position.x += Math.sin(tau * (2 + hash(seed + 5) * 2) + seed) * 0.08 * Math.min(1, tau);
        visible = true;
      } else if (i >= burstCount && state.rain && t >= state.rain.start) {
        const delay = hash(seed + 6) * state.rain.span;
        const tau = t - state.rain.start - delay;
        if (tau >= 0) {
          const fall = 0.45 + hash(seed + 7) * 0.4;
          position.set((hash(seed + 8) - 0.5) * 9, 6.4 - fall * tau, -1.6 + hash(seed + 10) * 3.9);
          position.x += Math.sin(tau * (1.4 + hash(seed + 11)) + seed) * 0.18;
          position.z += Math.cos(tau * (1.1 + hash(seed + 12)) + seed) * 0.1;
          visible = true;
        }
      }
      if (!visible) { confetti.setMatrixAt(i, hidden); continue; }
      const landed = position.y <= 0.004;
      if (landed) {
        position.y = 0.003 + hash(seed + 13) * 0.002;
        euler.set(-Math.PI / 2, 0, hash(seed + 14) * Math.PI * 2);
      } else {
        euler.set(t * spinRate * 0.7 + seed, t * spinRate * 0.4 + seed * 2, t * spinRate * 0.25);
      }
      quaternion.setFromEuler(euler);
      scale.setScalar(0.8 + hash(seed + 15) * 0.5);
      confetti.setMatrixAt(i, matrix.compose(position, quaternion, scale));
    }
    confetti.instanceMatrix.needsUpdate = true;

    // Sparkles: each flash owns a fixed run of the pool, so a new flash never reshuffles one still fading.
    sparkleAlpha.fill(0);
    let offset = 0;
    for (const [f, flash] of state.flashes.entries()) {
      const tau = t - flash.time;
      if (tau >= 0 && tau < 2.2) for (let k = 0; k < flash.count; k++) {
        const i = (offset + k) % sparkleCount, seed = f * 31.7 + k;
        const life = 0.8 + hash(seed + 0.3) * 1.2;
        if (tau > life) continue;
        const theta = hash(seed) * Math.PI * 2, phi = Math.acos(2 * hash(seed + 0.7) - 1);
        const reach = flash.radius * (0.35 + hash(seed + 0.9) * 0.9) * (1 - Math.exp(-3.4 * tau));
        sparklePositions[i * 3] = flash.origin[0] + Math.sin(phi) * Math.cos(theta) * reach;
        sparklePositions[i * 3 + 1] = flash.origin[1] + Math.cos(phi) * reach - tau * tau * 0.22;
        sparklePositions[i * 3 + 2] = flash.origin[2] + Math.sin(phi) * Math.sin(theta) * reach;
        sparkleAlpha[i] = (1 - tau / life) * (0.55 + 0.45 * Math.sin(tau * 28 + seed));
      }
      offset += flash.count;
    }
    sparkleGeometry.attributes.position.needsUpdate = true;
    sparkleGeometry.attributes.alpha.needsUpdate = true;
  }

  return {
    group, update, orbs,
    setPixelRatio(value) { sparkles.material.uniforms.uPixel.value = value * 900; },
  };
}
