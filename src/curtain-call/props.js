import * as THREE from 'three';
import { hash } from './tracks.js';

// Things Emochi performs with: the question mark from the reference model, the heart it becomes, five memory orbs
// (one keepsake from each world of Memory Lane) and the confetti and sparkle that close the show.

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

// Keepsakes, each about 0.3 units across and centred, for the inside of an orb.
function sunflower() {
  const group = new THREE.Group();
  const petal = new THREE.MeshStandardMaterial({ color: '#ffc21a', roughness: 0.5, emissive: '#7a4800', emissiveIntensity: 0.6 });
  const centre = new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 12), new THREE.MeshStandardMaterial({ color: '#4a2a10', roughness: 0.9 }));
  centre.scale.z = 0.45;
  group.add(centre);
  const geometry = new THREE.SphereGeometry(1, 16, 10);
  for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 13; i++) {
    const a = (i / 13) * Math.PI * 2 + ring * 0.24;
    const mesh = new THREE.Mesh(geometry, petal);
    mesh.scale.set(0.034, 0.075, 0.012);
    mesh.position.set(Math.cos(a) * 0.12, Math.sin(a) * 0.12, -0.01 - ring * 0.01);
    mesh.rotation.z = a - Math.PI / 2;
    group.add(mesh);
  }
  return group;
}
function paperBoat() {
  const p = [
    [-0.2, 0.0, 0], [0.2, 0.0, 0], [0.13, -0.08, 0.05], [-0.13, -0.08, 0.05], [0.13, -0.08, -0.05], [-0.13, -0.08, -0.05],
    [0, 0.16, 0],
  ];
  const faces = [[0, 3, 2], [0, 2, 1], [0, 1, 4], [0, 4, 5], [3, 5, 4], [3, 4, 2], [0, 5, 3], [1, 2, 4], [0, 1, 6]];
  const positions = [];
  for (const face of faces) for (const k of face) positions.push(...p[k]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: '#eef6ff', roughness: 0.7, side: THREE.DoubleSide, emissive: '#3b6a9a', emissiveIntensity: 0.35, flatShading: true }));
}
function flame() {
  const points = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    points.push(new THREE.Vector2(Math.sin(Math.PI * t) ** 0.9 * 0.08 * (1 - t * 0.55), -0.1 + t * 0.26));
  }
  const group = new THREE.Group();
  const outer = new THREE.Mesh(new THREE.LatheGeometry(points, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff8a2a').multiplyScalar(2.2), toneMapped: false, transparent: true, opacity: 0.9 }));
  const inner = new THREE.Mesh(new THREE.LatheGeometry(points, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff0b0').multiplyScalar(2.6), toneMapped: false }));
  inner.scale.setScalar(0.55);
  inner.position.y = -0.04;
  group.add(outer, inner);
  return group;
}
function teacup() {
  const group = new THREE.Group();
  const china = new THREE.MeshPhysicalMaterial({ color: '#fbf8f2', roughness: 0.25, clearcoat: 0.6 });
  const gold = new THREE.MeshStandardMaterial({ color: '#e0b964', metalness: 1, roughness: 0.25 });
  const profile = [[0, -0.07], [0.05, -0.07], [0.055, -0.06], [0.09, 0.02], [0.105, 0.07], [0.098, 0.072], [0.085, 0.02], [0.045, -0.055], [0, -0.055]].map(([x, y]) => new THREE.Vector2(x, y));
  group.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 40), china));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.102, 0.005, 6, 48), gold);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.071;
  group.add(rim);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.011, 8, 24, Math.PI * 1.3), china);
  handle.position.set(0.105, 0.005, 0);
  handle.rotation.z = -Math.PI * 0.65;
  group.add(handle);
  const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.1, 0.018, 40), china);
  saucer.position.y = -0.08;
  group.add(saucer);
  const tea = new THREE.Mesh(new THREE.CircleGeometry(0.09, 32), new THREE.MeshStandardMaterial({ color: '#8a4b1c', roughness: 0.2, emissive: '#3a1606', emissiveIntensity: 0.5 }));
  tea.rotation.x = -Math.PI / 2;
  tea.position.y = 0.055;
  group.add(tea);
  group.rotation.x = 0.35;
  return group;
}

export const MEMORIES = [
  { key: 'school', title: '向日葵教室', color: '#ffc75a', make: sunflower },
  { key: 'seaside', title: '海边小屋', color: '#7cc8ff', make: paperBoat },
  { key: 'companion', title: '「我在」', color: '#ff9a4a', make: flame },
  { key: 'chapel', title: '月下教堂', color: '#ff4f6e', make: null },
  { key: 'tea', title: '六点的茶会', color: '#d8b2ff', make: teacup },
];

export function createProps({ questionMark, pendant }) {
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

  // Memory orbs: glass bubbles with a keepsake turning inside and a soft halo of their world's colour.
  const glass = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', roughness: 0.04, transmission: 1, thickness: 0.35, ior: 1.32, iridescence: 0.6, iridescenceIOR: 1.3,
    clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.5, transparent: true, opacity: 1, specularIntensity: 1,
  });
  const bubble = new THREE.SphereGeometry(1, 48, 32);
  const orbs = MEMORIES.map(memory => {
    const orb = new THREE.Group();
    const shell = new THREE.Mesh(bubble, glass);
    orb.add(shell);
    let keepsake;
    if (memory.make) keepsake = memory.make();
    else {
      keepsake = pendant.clone(true);
      // The pendant from BLOODBOUND without its chain or crystal shell (the orb is already the glass).
      keepsake.traverse(object => {
        if (/Chain|Crystal|Bail/.test(object.name)) object.visible = false;
        if (object.isMesh && /Blood/.test(object.material?.name ?? '')) {
          object.material = object.material.clone();
          object.material.emissive.set('#ff1838');
          object.material.emissiveIntensity = 0.9;
        }
      });
      keepsake.updateMatrixWorld(true);
      const box = new THREE.Box3();
      keepsake.traverseVisible(object => { if (object.isMesh) box.expandByObject(object); });
      const size = box.getSize(new THREE.Vector3()), centre = box.getCenter(new THREE.Vector3());
      const fit = 0.3 / Math.max(size.x, size.y, size.z, 1e-6);
      keepsake.scale.multiplyScalar(fit);
      keepsake.position.copy(centre.sub(keepsake.position).multiplyScalar(-fit));
    }
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
