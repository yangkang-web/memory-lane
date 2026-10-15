import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { hash } from './tracks.js';

// The theatre: a small proscenium stage seen from the one occupied seat. Stage floor is y = 0, the front of the stage
// is z = 2.4, the audience floor sits below it and the house runs towards +z.

export const STAGE = {
  front: 2.4,
  pit: -0.95,
  opening: { half: 4.6, height: 5.6 },
  curtainZ: 1.45,
};

function canvasTexture(width, height, draw, color = true) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

/** Stage boards: dark walnut planks running across the stage, with grain, seams and worn tracks. */
function floorMaterial() {
  const size = 1024, planks = 16;
  const tone = [], seed = i => hash(i * 7.31);
  for (let i = 0; i < planks; i++) tone.push(0.82 + seed(i) * 0.32);
  const drawPlanks = (context, w, h, rough) => {
    const plank = h / planks;
    for (let i = 0; i < planks; i++) {
      const y = i * plank;
      const base = rough ? 150 + seed(i + 40) * 40 : 0;
      if (rough) context.fillStyle = `rgb(${base},${base},${base})`;
      else {
        const t = tone[i];
        context.fillStyle = `rgb(${Math.round(62 * t)},${Math.round(38 * t)},${Math.round(24 * t)})`;
      }
      context.fillRect(0, y, w, plank);
      // Grain: long wavy streaks along the plank.
      for (let k = 0; k < 46; k++) {
        const gy = y + seed(i * 97 + k) * plank;
        context.strokeStyle = rough ? `rgba(255,255,255,${0.05 + seed(k + i) * 0.08})` : `rgba(${seed(k) > 0.5 ? '20,10,6' : '110,72,44'},${0.08 + seed(k * 3 + i) * 0.14})`;
        context.lineWidth = 0.6 + seed(k * 5 + i) * 1.6;
        context.beginPath();
        for (let x = 0; x <= w; x += 16) {
          const wave = Math.sin(x * 0.006 + seed(k * 11 + i) * 6) * 2.2 + Math.sin(x * 0.021 + k) * 0.7;
          if (x === 0) context.moveTo(x, gy + wave); else context.lineTo(x, gy + wave);
        }
        context.stroke();
      }
      // Butt joints at staggered lengths.
      for (let x = seed(i + 9) * 300; x < w; x += 360 + seed(i * 13 + x) * 260) {
        context.fillStyle = rough ? 'rgba(255,255,255,0.4)' : 'rgba(8,4,2,0.75)';
        context.fillRect(x, y, 2, plank);
      }
      context.fillStyle = rough ? 'rgba(255,255,255,0.45)' : 'rgba(6,3,2,0.85)';
      context.fillRect(0, y, w, 2);
    }
  };
  const map = canvasTexture(size, size, (c, w, h) => drawPlanks(c, w, h, false));
  const roughnessMap = canvasTexture(size, size, (c, w, h) => drawPlanks(c, w, h, true), false);
  for (const texture of [map, roughnessMap]) texture.repeat.set(3, 2.2);
  return new THREE.MeshPhysicalMaterial({ map, roughnessMap, roughness: 0.62, clearcoat: 0.35, clearcoatRoughness: 0.32, envMapIntensity: 0.7 });
}

// The drape: a plane laid out from its outer edge, gathered towards it as it opens. The bottom lags the top while it
// moves and the pleats deepen as the cloth bunches. Normals come from neighbouring points of the same surface.
const DRAPE_GLSL = /* glsl */ `
uniform float uOpenTop, uOpenBottom, uTime, uMotion;
uniform vec2 uSize;
uniform float uOuter;
varying float vFold;
float foldNoise(float n) { return fract(sin(n * 91.7) * 43758.5); }
vec3 drape(vec2 uv) {
  float open = mix(uOpenBottom, uOpenTop, pow(uv.y, 1.4));
  float gather = mix(1.0, 0.17, open);
  float along = uv.x * uSize.x;
  float theta = along * 6.2831 / 0.36;
  float n = foldNoise(floor(theta / 6.2831));
  float depth = (0.055 + 0.21 * (1.0 - gather)) * (0.75 + 0.5 * n) * (0.85 + 0.3 * (1.0 - uv.y));
  float z = depth * (sin(theta) + 0.22 * sin(2.0 * theta + 0.8));
  z += uMotion * 0.16 * sin(theta * 0.5 - uTime * 7.0 + uv.y * 3.0) * (1.0 - uv.y);
  z += 0.012 * sin(uTime * 0.7 + uv.x * 9.0 + uv.y * 4.0);
  z += 0.05 * (1.0 - smoothstep(0.0, 0.06, uv.y));
  return vec3(uOuter + along * gather, uv.y * uSize.y, z);
}
`;

function curtainMaterial(uniforms) {
  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#7a0c1f'), roughness: 0.8, sheen: 1, sheenRoughness: 0.32, sheenColor: new THREE.Color('#ff7b8e'),
    side: THREE.DoubleSide, envMapIntensity: 0.4,
  });
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${DRAPE_GLSL}`)
      .replace('#include <beginnormal_vertex>', `
vec2 fabric = position.xy / uSize + 0.5;
vec3 drapePoint = drape(fabric);
vec3 drapeU = drape(fabric + vec2(0.002, 0.0)) - drapePoint;
vec3 drapeV = drape(fabric + vec2(0.0, 0.004)) - drapePoint;
vec3 objectNormal = normalize(cross(drapeU, drapeV));
vFold = sin(fabric.x * uSize.x * 6.2831 / 0.36);
#ifdef USE_TANGENT
vec3 objectTangent = vec3(1.0, 0.0, 0.0);
#endif`)
      .replace('#include <begin_vertex>', 'vec3 transformed = drapePoint;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vFold;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= mix(0.42, 1.0, smoothstep(-1.0, 0.9, vFold));');
  };
  return material;
}

/** Swagged border across the top of the opening, with a gold fringe along its scallops. */
function createValance(curtainUniforms) {
  const width = 10.6, height = 1.25, swags = 5;
  const geometry = new THREE.PlaneGeometry(width, height, 240, 32);
  const position = geometry.attributes.position;
  const fringe = [];
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), v = 0.5 - position.getY(i) / height;
    const s = ((x / width + 0.5) * swags) % 1;
    const dip = Math.sin(Math.PI * s);
    const y = -v * (0.55 + 0.5 * dip);
    const z = 0.14 * dip * v + 0.028 * Math.sin(v * 26 + dip * 3) * dip + 0.05 * Math.sin(x * 9) * (1 - dip) * v;
    position.setXYZ(i, x, y, z);
  }
  geometry.computeVertexNormals();
  const material = new THREE.MeshPhysicalMaterial({ color: new THREE.Color('#6a0a1a'), roughness: 0.82, sheen: 1, sheenRoughness: 0.3, sheenColor: new THREE.Color('#ff7b8e'), side: THREE.DoubleSide, envMapIntensity: 0.4 });
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geometry, material));
  for (let k = 0; k < 520; k++) {
    const x = (k / 519 - 0.5) * width;
    const s = ((x / width + 0.5) * swags) % 1;
    const dip = Math.sin(Math.PI * s);
    fringe.push([x, -(0.55 + 0.5 * dip), 0.14 * dip + 0.01]);
  }
  const strand = new THREE.CylinderGeometry(0.006, 0.004, 0.13, 4, 1);
  strand.translate(0, -0.065, 0);
  const gold = new THREE.MeshStandardMaterial({ color: '#d8b06a', metalness: 1, roughness: 0.32 });
  const tassels = new THREE.InstancedMesh(strand, gold, fringe.length);
  const matrix = new THREE.Matrix4();
  fringe.forEach(([x, y, z], k) => {
    matrix.makeRotationZ((hash(k) - 0.5) * 0.12).setPosition(x, y + 0.01, z);
    tassels.setMatrixAt(k, matrix);
  });
  group.add(tassels);
  return { group, uniforms: curtainUniforms };
}

/** Additive beam of haze for a spotlight: apex at the origin, opening down -y, one unit long. */
function createBeam(color) {
  const geometry = new THREE.CylinderGeometry(0.02, 1, 1, 48, 24, true);
  geometry.translate(0, -0.5, 0);
  const material = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uStrength: { value: 0 }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying float vAlong; varying vec3 vNormalView; varying vec3 vView; varying vec3 vWorld;
      void main() {
        vAlong = -position.y;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        vec4 view = viewMatrix * world;
        vView = view.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * view;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uStrength, uTime;
      varying float vAlong; varying vec3 vNormalView; varying vec3 vView; varying vec3 vWorld;
      void main() {
        float facing = abs(dot(normalize(vNormalView), normalize(-vView)));
        float edge = pow(facing, 2.2);
        float haze = 0.75 + 0.25 * sin(vWorld.y * 2.3 + uTime * 0.6 + sin(vWorld.x * 1.7 - uTime * 0.4) * 1.5);
        float fade = smoothstep(0.0, 0.08, vAlong) * (1.0 - smoothstep(0.62, 1.0, vAlong));
        float alpha = uStrength * edge * fade * haze * mix(1.0, 0.35, vAlong);
        gl_FragColor = vec4(uColor * alpha, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  const down = new THREE.Vector3(0, -1, 0), dir = new THREE.Vector3();
  return {
    mesh, material,
    aim(from, to, angle, strength, extend = 1.15) {
      dir.subVectors(to, from);
      const length = dir.length() * extend;
      dir.normalize();
      mesh.position.copy(from);
      mesh.quaternion.setFromUnitVectors(down, dir);
      const radius = Math.tan(angle) * length;
      mesh.scale.set(radius, length, radius);
      material.uniforms.uStrength.value = strength;
      mesh.visible = strength > 0.002;
    },
  };
}

/** Motes drifting in the haze; they only show where a beam passes through them. */
function createDust(count = 2200) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3), seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (hash(i) - 0.5) * 10;
    positions[i * 3 + 1] = hash(i + 0.37) * 6.2;
    positions[i * 3 + 2] = -3.2 + hash(i + 0.71) * 6;
    seeds[i] = hash(i + 0.13);
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));
  const beams = 5;
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uPixel: { value: 1 },
      uApex: { value: Array.from({ length: beams }, () => new THREE.Vector3()) },
      uDir: { value: Array.from({ length: beams }, () => new THREE.Vector3(0, -1, 0)) },
      uCos: { value: new Array(beams).fill(0.9) },
      uColor: { value: Array.from({ length: beams }, () => new THREE.Color()) },
    },
    vertexShader: /* glsl */ `
      #define BEAMS ${beams}
      attribute float seed;
      uniform float uTime, uPixel;
      uniform vec3 uApex[BEAMS]; uniform vec3 uDir[BEAMS]; uniform float uCos[BEAMS]; uniform vec3 uColor[BEAMS];
      varying vec3 vColor; varying float vTwinkle;
      void main() {
        vec3 p = position;
        p.x += sin(uTime * (0.07 + seed * 0.08) + seed * 40.0) * 0.35;
        p.y = mod(position.y + uTime * (0.025 + seed * 0.03), 6.2);
        p.z += cos(uTime * (0.05 + seed * 0.06) + seed * 17.0) * 0.3;
        vec3 light = vec3(0.0);
        for (int i = 0; i < BEAMS; i++) {
          vec3 d = p - uApex[i];
          float c = dot(normalize(d), uDir[i]);
          light += uColor[i] * smoothstep(uCos[i], mix(uCos[i], 1.0, 0.45), c) / (1.0 + dot(d, d) * 0.02);
        }
        vColor = light;
        vTwinkle = 0.6 + 0.4 * sin(uTime * (1.0 + seed * 2.0) + seed * 30.0);
        vec4 view = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = uPixel * (0.35 + seed * 0.45) / -view.z;
        gl_Position = projectionMatrix * view;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor; varying float vTwinkle;
      void main() {
        float r = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, r);
        gl_FragColor = vec4(vColor * a * vTwinkle * 1.4, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 6;
  return { points, material, beams };
}

/** Back wall: a soft gradient sky with a glow behind the performer. */
function createCyclorama() {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTop: { value: new THREE.Color('#090616') }, uBottom: { value: new THREE.Color('#2a0f22') },
      uGlow: { value: new THREE.Color('#ff9a7a') }, uGlowStrength: { value: 0 }, uTime: { value: 0 },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */ `
      uniform vec3 uTop, uBottom, uGlow; uniform float uGlowStrength, uTime; varying vec2 vUv;
      void main() {
        vec3 color = mix(uBottom, uTop, smoothstep(0.0, 0.85, vUv.y));
        float d = length((vUv - vec2(0.5, 0.36)) * vec2(1.6, 1.0));
        color += uGlow * uGlowStrength * (exp(-d * d * 9.0) * 0.9 + exp(-d * 3.0) * 0.25);
        // A few faint stars high on the cloth.
        vec2 cell = floor(vUv * vec2(90.0, 48.0));
        float star = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
        vec2 f = fract(vUv * vec2(90.0, 48.0)) - 0.5;
        float twinkle = 0.5 + 0.5 * sin(uTime * (1.0 + star * 3.0) + star * 50.0);
        color += vec3(1.0, 0.92, 0.85) * step(0.985, star) * smoothstep(0.12, 0.0, length(f)) * smoothstep(0.35, 0.9, vUv.y) * twinkle * 0.6;
        gl_FragColor = vec4(color, 1.0);
      }`,
    fog: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(14, 8.5), material);
  mesh.position.set(0, 3.6, -4.4);
  return { mesh, material };
}

/** Strings of warm festoon bulbs hung across the back of the stage. */
function createFestoons() {
  const strands = [
    { from: [-5.2, 4.9, -3.7], to: [5.2, 4.7, -3.7], sag: 1.1, count: 30 },
    { from: [-5, 4.3, -3.2], to: [5, 4.4, -3.3], sag: 0.9, count: 28 },
    { from: [-4.8, 5.3, -2.6], to: [4.8, 5.2, -2.6], sag: 1.25, count: 26 },
  ];
  const bulbs = [];
  const group = new THREE.Group();
  const wire = new THREE.MeshBasicMaterial({ color: '#050304' });
  for (const strand of strands) {
    const points = [];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const p = new THREE.Vector3().lerpVectors(new THREE.Vector3(...strand.from), new THREE.Vector3(...strand.to), t);
      p.y -= strand.sag * 4 * t * (1 - t);
      points.push(p);
    }
    const curve = new THREE.CatmullRomCurve3(points);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.008, 4), wire));
    for (let i = 0; i < strand.count; i++) {
      const p = curve.getPoint((i + 0.5) / strand.count);
      p.y -= 0.05;
      bulbs.push(p);
    }
  }
  const material = new THREE.MeshBasicMaterial({ toneMapped: false });
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.04, 12, 8), material, bulbs.length);
  const matrix = new THREE.Matrix4();
  bulbs.forEach((p, i) => { matrix.makeTranslation(p.x, p.y, p.z); mesh.setMatrixAt(i, matrix); mesh.setColorAt(i, new THREE.Color()); });
  group.add(mesh);
  const color = new THREE.Color(), warm = new THREE.Color('#ffb46b');
  return {
    group,
    update(time, level) {
      for (let i = 0; i < bulbs.length; i++) {
        // The strings light from the centre outwards as `level` rises, each bulb with its own slow shimmer.
        const reach = Math.abs(bulbs[i].x) / 5.3;
        const on = THREE.MathUtils.smoothstep(level * 1.25 - reach, 0, 0.25);
        const shimmer = 0.82 + 0.18 * Math.sin(time * (1.3 + hash(i) * 1.7) + hash(i + 3) * 20);
        color.copy(warm).multiplyScalar(0.06 + on * 3.2 * shimmer);
        mesh.setColorAt(i, color);
      }
      mesh.instanceColor.needsUpdate = true;
    },
  };
}

function createAuditorium() {
  const group = new THREE.Group();
  const velvet = new THREE.MeshStandardMaterial({ color: '#3a0a14', roughness: 0.9 });
  const back = new RoundedBoxGeometry(0.52, 0.72, 0.1, 3, 0.04);
  back.translate(0, 0.62, -0.18);
  const seat = new RoundedBoxGeometry(0.5, 0.1, 0.42, 3, 0.04);
  seat.translate(0, 0.42, 0.02);
  const rows = 9, perRow = 18, seats = [];
  for (let r = 0; r < rows; r++) for (let s = 0; s < perRow; s++) {
    const x = (s - (perRow - 1) / 2) * 0.62 + (s >= perRow / 2 ? 0.5 : -0.5);
    seats.push([x, STAGE.pit + r * 0.16, 4.3 + r * 1.0]);
  }
  for (const geometry of [back, seat]) {
    const mesh = new THREE.InstancedMesh(geometry, velvet, seats.length);
    const matrix = new THREE.Matrix4();
    seats.forEach(([x, y, z], i) => { matrix.makeTranslation(x, y, z); mesh.setMatrixAt(i, matrix); });
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  const house = new THREE.Mesh(new THREE.PlaneGeometry(16, 14), new THREE.MeshStandardMaterial({ color: '#120a0c', roughness: 0.95 }));
  house.rotation.x = -Math.PI / 2;
  house.position.set(0, STAGE.pit, 9.4);
  group.add(house);
  return group;
}

function createProscenium() {
  const group = new THREE.Group();
  const wall = new THREE.MeshStandardMaterial({ color: '#170b11', roughness: 0.75 });
  const gold = new THREE.MeshStandardMaterial({ color: '#caa15c', metalness: 1, roughness: 0.3, envMapIntensity: 1.2 });
  const { half, height } = STAGE.opening;
  const z = 1.9;
  const add = (geometry, material, x, y, zz = z) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, zz); mesh.receiveShadow = true; group.add(mesh); return mesh; };
  for (const side of [-1, 1]) {
    add(new THREE.BoxGeometry(2.4, 9, 0.7), wall, side * (half + 1.2), 3.6 + STAGE.pit / 2);
    // Gilded inner edge: a rounded bead with a thinner line set back from it.
    add(new THREE.CylinderGeometry(0.07, 0.07, height + 0.1, 20), gold, side * (half + 0.05), height / 2, z + 0.36);
    add(new THREE.CylinderGeometry(0.025, 0.025, height, 12), gold, side * (half + 0.32), height / 2, z + 0.37);
  }
  add(new THREE.BoxGeometry(14, 2.6, 0.7), wall, 0, height + 1.3);
  const top = add(new THREE.CylinderGeometry(0.07, 0.07, half * 2 + 0.24, 20), gold, 0, height + 0.05, z + 0.36);
  top.rotation.z = Math.PI / 2;
  const line = add(new THREE.CylinderGeometry(0.025, 0.025, half * 2 + 0.6, 12), gold, 0, height + 0.32, z + 0.37);
  line.rotation.z = Math.PI / 2;
  // A small gilded crest above the opening: a ring around a four-point star.
  const crest = new THREE.Group();
  crest.add(new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 12, 64), gold));
  const star = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.07 : 0.24;
    if (i === 0) star.moveTo(Math.cos(a) * r, Math.sin(a) * r); else star.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  crest.add(new THREE.Mesh(new THREE.ExtrudeGeometry(star, { depth: 0.03, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 3 }), gold));
  crest.position.set(0, height + 0.95, z + 0.4);
  group.add(crest);
  // Front of the stage down to the house floor, with a gilded lip.
  add(new THREE.BoxGeometry(12, -STAGE.pit, 0.2), wall, 0, STAGE.pit / 2, STAGE.front + 0.1);
  const lip = add(new THREE.CylinderGeometry(0.04, 0.04, 12, 12), gold, 0, -0.02, STAGE.front + 0.2);
  lip.rotation.z = Math.PI / 2;
  // Dark wings either side of the stage.
  for (const side of [-1, 1]) add(new THREE.BoxGeometry(0.2, 7, 6), wall, side * 6.2, 3.5, -1.2);
  return group;
}

function createFootlights() {
  const group = new THREE.Group();
  const hood = new THREE.MeshStandardMaterial({ color: '#2a1d14', metalness: 0.8, roughness: 0.4 });
  const bulbMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc58a'), toneMapped: false });
  const shell = new THREE.SphereGeometry(0.11, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  shell.rotateX(-Math.PI / 2 - 0.5);
  const bulb = new THREE.SphereGeometry(0.035, 10, 8);
  const count = 15;
  for (let i = 0; i < count; i++) {
    const x = (i - (count - 1) / 2) * 0.62;
    const cap = new THREE.Mesh(shell, hood);
    cap.position.set(x, 0.02, STAGE.front - 0.12);
    group.add(cap);
    const glow = new THREE.Mesh(bulb, bulbMaterial);
    glow.position.set(x, 0.05, STAGE.front - 0.16);
    group.add(glow);
  }
  return { group, bulbMaterial };
}

/** A dark environment with a few warm and coloured sources, for reflections in glossy things on stage. */
function stageEnvironment(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#050306');
  const panel = (color, strength, w, h, position) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(strength), side: THREE.DoubleSide }));
    mesh.position.set(...position);
    mesh.lookAt(0, 1, 0);
    scene.add(mesh);
  };
  panel('#ffe2c0', 6, 1.6, 1.6, [0, 7, 8]);
  panel('#ff6fa8', 2.2, 3, 1.4, [-4, 5, -4]);
  panel('#6fc0ff', 2.2, 3, 1.4, [4, 5, -4]);
  panel('#ffb06b', 1.2, 10, 0.5, [0, 0.3, 3]);
  panel('#2a1830', 1, 20, 6, [0, 2, -9]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(scene, 0.04);
  pmrem.dispose();
  return target;
}

export function createStage(renderer) {
  RectAreaLightUniformsLib.init();
  const group = new THREE.Group();

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(13, 7.4), floorMaterial());
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, STAGE.front - 3.7);
  floor.receiveShadow = true;
  group.add(floor);
  // Spike marks on the boards: where the performer is meant to stand.
  const tape = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd9a0').multiplyScalar(0.6) });
  for (const [x, z] of [[0, 0.78]]) for (const angle of [Math.PI / 4, -Math.PI / 4]) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.035), tape);
    strip.rotation.set(-Math.PI / 2, 0, angle);
    strip.position.set(x, 0.002, z);
    group.add(strip);
  }

  group.add(createProscenium());
  group.add(createAuditorium());
  const cyclorama = createCyclorama();
  group.add(cyclorama.mesh);
  const festoons = createFestoons();
  group.add(festoons.group);
  const footlights = createFootlights();
  group.add(footlights.group);

  // Main traveller curtain: the right half is the left half mirrored, so both gather towards their own side.
  const curtainUniforms = {
    uOpenTop: { value: 0 }, uOpenBottom: { value: 0 }, uTime: { value: 0 }, uMotion: { value: 0 },
    uSize: { value: new THREE.Vector2(5.3, 5.9) }, uOuter: { value: -5.08 },
  };
  const drape = curtainMaterial(curtainUniforms);
  const curtains = [-1, 1].map(side => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(5.3, 5.9, 280, 70), drape);
    mesh.frustumCulled = false;
    mesh.receiveShadow = true;
    mesh.scale.x = side;
    mesh.position.set(0, 0.01, STAGE.curtainZ + (side > 0 ? 0.05 : 0));
    group.add(mesh);
    return mesh;
  });
  const valance = createValance(curtainUniforms);
  valance.group.position.set(0, STAGE.opening.height + 0.35, STAGE.curtainZ + 0.28);
  group.add(valance.group);

  // Lights.
  const hemi = new THREE.HemisphereLight('#3a2c48', '#120a0c', 0.3);
  group.add(hemi);
  const spot = (color, angle, penumbra, shadow = false) => {
    const light = new THREE.SpotLight(color, 0, 0, angle, penumbra, 2);
    if (shadow) {
      light.castShadow = true;
      light.shadow.mapSize.set(2048, 2048);
      light.shadow.bias = -0.00008;
      light.shadow.normalBias = 0.02;
      light.shadow.radius = 5;
      light.shadow.camera.near = 4;
      light.shadow.camera.far = 22;
    }
    group.add(light, light.target);
    return light;
  };
  const lights = {
    hemi,
    follow: spot('#ffe8cc', 0.15, 0.55, true),
    rimL: spot('#ff5f9e', 0.3, 0.8),
    rimR: spot('#62bfff', 0.3, 0.8),
    moverL: spot('#b07bff', 0.13, 0.5),
    moverR: spot('#ffb35e', 0.13, 0.5),
    wash: spot('#ffd6ac', 0.62, 1),
    heart: new THREE.PointLight('#ff6f96', 0, 5, 2),
    foot: new THREE.RectAreaLight('#ffb978', 0, 9.5, 0.25),
  };
  lights.follow.position.set(0, 7.8, 10.5);
  lights.rimL.position.set(-3.6, 6.4, -3.2);
  lights.rimR.position.set(3.6, 6.4, -3.2);
  lights.moverL.position.set(-4.3, 6.9, 0.6);
  lights.moverR.position.set(4.3, 6.9, 0.6);
  lights.wash.position.set(0, 9.5, 7.5);
  lights.foot.position.set(0, 0.06, STAGE.front - 0.1);
  lights.foot.lookAt(0, 1.6, -1.2);
  group.add(lights.heart, lights.foot);

  const beams = {
    follow: createBeam('#ffe2c2'), rimL: createBeam('#ff5f9e'), rimR: createBeam('#62bfff'),
    moverL: createBeam('#b07bff'), moverR: createBeam('#ffb35e'),
  };
  for (const beam of Object.values(beams)) group.add(beam.mesh);
  const dust = createDust();
  group.add(dust.points);

  const environment = stageEnvironment(renderer);

  const scratch = new THREE.Vector3();
  const beamOrder = ['follow', 'rimL', 'rimR', 'moverL', 'moverR'];
  /**
   * state: { time, curtain: { top, bottom, motion }, lights: { name: { intensity, target: [x,y,z], beam } }, foot,
   * festoons, cyc: { glow, top, bottom } }.
   */
  function update(state) {
    curtainUniforms.uOpenTop.value = state.curtain.top;
    curtainUniforms.uOpenBottom.value = state.curtain.bottom;
    curtainUniforms.uMotion.value = state.curtain.motion;
    curtainUniforms.uTime.value = state.time;
    hemi.intensity = state.house;
    for (const [i, name] of beamOrder.entries()) {
      const light = lights[name], setting = state.lights[name], beam = beams[name];
      light.intensity = setting.intensity;
      light.target.position.set(...setting.target);
      if (setting.color) light.color.set(setting.color);
      light.target.updateMatrixWorld();
      beam.material.uniforms.uTime.value = state.time;
      if (setting.color) beam.material.uniforms.uColor.value.set(setting.color);
      beam.aim(light.position, light.target.position, light.angle * 0.92, setting.beam);
      const u = dust.material.uniforms;
      u.uApex.value[i].copy(light.position);
      u.uDir.value[i].copy(scratch.subVectors(light.target.position, light.position).normalize());
      u.uCos.value[i] = Math.cos(light.angle * 0.95);
      u.uColor.value[i].copy(beam.material.uniforms.uColor.value).multiplyScalar(setting.beam * 1.6);
    }
    lights.wash.intensity = state.lights.wash.intensity;
    lights.wash.target.position.set(0, 0.6, 0);
    lights.wash.target.updateMatrixWorld();
    lights.foot.intensity = state.foot * 9;
    footlights.bulbMaterial.color.setRGB(1, 0.77, 0.54).multiplyScalar(0.15 + state.foot * 3.2);
    festoons.update(state.time, state.festoons);
    const cyc = cyclorama.material.uniforms;
    cyc.uTime.value = state.time;
    cyc.uGlowStrength.value = state.cyc.glow;
    cyc.uTop.value.set(state.cyc.top);
    cyc.uBottom.value.set(state.cyc.bottom);
    dust.material.uniforms.uTime.value = state.time;
  }

  return {
    group, lights, update, environment,
    setPixelRatio(value) { dust.material.uniforms.uPixel.value = value * 110; },
  };
}
