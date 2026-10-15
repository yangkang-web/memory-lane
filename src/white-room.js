import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { HOME, HOME_WALLS } from './walk-layout.js';
import { worldWipeAt, wipeClip } from './world-wipe.js';
import { createWorldFracture } from './world-fracture.js';
import './white-room.css';

document.title = '白墙 · Memory Lane';
document.querySelector('meta[name="description"]').content = '空白世界里的一面白墙，挂着梵高的《向日葵》。';
document.querySelector('#app').innerHTML = `
  <canvas id="white-room-canvas" aria-label="白墙上的梵高向日葵，拖动查看，滚轮缩放" tabindex="0"></canvas>
  <div id="apocalypse-reveal" aria-hidden="true">
    <canvas id="apocalypse-wall-canvas"></canvas>
  </div>
  <canvas id="world-fracture" aria-hidden="true"></canvas>
  <nav class="white-room-controls" aria-label="白墙场景控制">
    <a href="/">← 首页</a><button id="white-room-reset" type="button">回到白墙</button>
    <button id="world-transition" type="button" disabled>准备世界…</button>
  </nav>
  <footer class="white-room-credit">梵高《向日葵》，1888 · 公共领域
    <a href="https://commons.wikimedia.org/wiki/File:Vincent_van_Gogh_-_Sunflowers_(1888,_National_Gallery_London).jpg" target="_blank" rel="noopener">画作出处 ↗</a>
  </footer>
  <p id="white-room-status" role="status">正在加载画作…</p>
`;

const canvas = document.querySelector('#white-room-canvas');
const status = document.querySelector('#white-room-status');
const resetButton = document.querySelector('#white-room-reset');
const transitionButton = document.querySelector('#world-transition');
const reveal = document.querySelector('#apocalypse-reveal');
const app = document.querySelector('#app');
const apocalypseCanvas = document.querySelector('#apocalypse-wall-canvas');
let fracture;
let renderer, controls, disposed = false;
let apocalypse, animationFrame, preparationFrame, elapsed = 0, lastFrame = null, running = false, autoPlay = true;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#fafaf8');
// Match the apocalypse walk-in view, including eye height and vertical field of view.
const camera = new THREE.PerspectiveCamera(64, 1, .08, 520);
const textures = [];

function render() {
  if (!disposed && renderer) {
    renderer.render(scene, camera);
    apocalypse?.render();
    if (worldReady) fracture?.capture(canvas, apocalypseCanvas);
  }
}

function showWipe(sample) {
  reveal.style.clipPath = wipeClip(sample.center);
  app.dataset.world = sample.phase;
  fracture?.draw(sample, elapsed);
}

function tick(now) {
  if (!running || disposed) return;
  if (!document.hidden && lastFrame !== null) elapsed += now - lastFrame;
  lastFrame = document.hidden ? null : now;
  const sample = worldWipeAt(elapsed);
  showWipe(sample);
  if (sample.phase === 'apocalypse') {
    running = false;
    transitionButton.disabled = false;
    transitionButton.textContent = '重播过渡';
    canvas.setAttribute('aria-label', '末世墙上的梵高向日葵');
    // Keep the matched opening camera fixed in the completed scene too.
    return;
  }
  animationFrame = requestAnimationFrame(tick);
}

function startTransition() {
  if (!worldReady || disposed) return;
  cancelAnimationFrame(animationFrame);
  controls.enabled = false;
  resetView();
  elapsed = 0;
  lastFrame = null;
  running = true;
  transitionButton.disabled = true;
  transitionButton.textContent = '世界切换中…';
  showWipe(worldWipeAt(0));
  animationFrame = requestAnimationFrame(tick);
}

function returnToWhite() {
  autoPlay = false;
  running = false;
  cancelAnimationFrame(animationFrame);
  controls.enabled = true;
  showWipe(worldWipeAt(0));
  transitionButton.disabled = !worldReady;
  transitionButton.textContent = worldReady ? '切换到末世' : '准备世界…';
  canvas.setAttribute('aria-label', '白墙上的梵高向日葵，拖动查看，滚轮缩放');
  resetView();
}

let worldReady = false;
function onVisibilityChange() { lastFrame = null; }
async function prepareTransition() {
  try {
    const { createApocalypseWall } = await import('./apocalypse-wall.js');
    if (disposed) return;
    apocalypse = createApocalypseWall(apocalypseCanvas, camera);
    await apocalypse.ready;
    if (disposed) return;
    worldReady = true;
    resize();
    transitionButton.disabled = false;
    transitionButton.textContent = '切换到末世';
    if (autoPlay) startTransition();
  } catch (error) {
    if (disposed) return;
    console.error('Could not prepare world transition', error);
    status.hidden = false;
    status.textContent = '末世场景加载失败，请刷新后重试。';
    transitionButton.textContent = '末世未加载';
    apocalypse?.dispose();
    apocalypse = null;
  }
}

function resetView() {
  camera.position.set(HOME.spawn.x, HOME.floor + 1.68, HOME.spawn.z);
  controls.target.fromArray(HOME.lookAt);
  controls.update();
  render();
}

function resize() {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  fracture?.resize(window.innerWidth, window.innerHeight, renderer.getPixelRatio());
  apocalypse?.resize(window.innerWidth, window.innerHeight, renderer.getPixelRatio());
  render();
  if (running) showWipe(worldWipeAt(elapsed));
}

function box(w, h, d, material, x, y, z, parent = scene) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  try {
    fracture = createWorldFracture(document.querySelector('#world-fracture'));
  } catch (error) {
    // Constrained GPUs can still play the aligned two-world wipe.
    document.querySelector('#world-fracture').hidden = true;
    console.warn('Refraction unavailable; using the world wipe', error);
  }
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const white = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .95 });
  const wall = HOME_WALLS[0];
  box(wall.w, wall.h, wall.d, white, wall.x, wall.y, wall.z).receiveShadow = true;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), white);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(wall.x, HOME.floor, wall.z);
  floor.receiveShadow = true;
  scene.add(floor);

  // Same local reproduction, dimensions, placement and slight tilt as abandoned-home.js.
  const frame = new THREE.Group();
  frame.position.set(-22.25, 2.54, 36.24);
  frame.rotation.z = -.018;
  scene.add(frame);
  const artW = 1.38, artH = artW * 1221 / 960;
  const wood = new THREE.MeshStandardMaterial({ color: '#514635', roughness: .9 });
  const brass = new THREE.MeshStandardMaterial({ color: '#74664c', metalness: .22, roughness: .92 });
  box(artW + .24, artH + .24, .1, wood, 0, 0, 0, frame).castShadow = true;
  for (const side of [-1, 1]) {
    box(.075, artH + .2, .1, brass, side * (artW / 2 + .055), 0, .065, frame).castShadow = true;
    box(artW + .2, .075, .1, brass, 0, side * (artH / 2 + .055), .065, frame).castShadow = true;
  }
  const artTexture = new THREE.TextureLoader().load('/assets/art/sunflowers-1888.jpg', () => {
    if (disposed) return;
    status.hidden = true;
    render();
    // Let the white opening paint before constructing the second room.
    preparationFrame = requestAnimationFrame(() => {
      preparationFrame = requestAnimationFrame(prepareTransition);
    });
  }, undefined, () => {
    if (!disposed) status.textContent = '画作加载失败，请刷新页面重试。';
  });
  textures.push(artTexture);
  artTexture.colorSpace = THREE.SRGBColorSpace;
  artTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const painting = new THREE.Mesh(new THREE.PlaneGeometry(artW, artH),
    new THREE.MeshBasicMaterial({ map: artTexture, toneMapped: false }));
  painting.position.z = .12;
  frame.add(painting);

  scene.add(new THREE.HemisphereLight('#ffffff', '#e3e1da', 2));
  const light = new THREE.DirectionalLight('#ffffff', 2.5);
  light.position.set(-25, 8, 42);
  light.target.position.copy(frame.position);
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  Object.assign(light.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: .1, far: 30 });
  light.shadow.normalBias = .015;
  scene.add(light, light.target);

  controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.minDistance = 2;
  controls.maxDistance = 9;
  controls.minAzimuthAngle = -.65;
  controls.maxAzimuthAngle = .65;
  controls.minPolarAngle = .75;
  controls.maxPolarAngle = 1.8;
  controls.addEventListener('change', render);
  resetButton.addEventListener('click', returnToWhite);
  transitionButton.addEventListener('click', startTransition);
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', onVisibilityChange);
  resetView();
  showWipe(worldWipeAt(0));
  resize();
} catch (error) {
  console.error('Could not create white room', error);
  status.hidden = false;
  status.textContent = '场景无法显示，请使用支持 WebGL2 并开启硬件加速的浏览器。';
  resetButton.disabled = true;
}

if (import.meta.hot) import.meta.hot.dispose(() => {
  disposed = true;
  cancelAnimationFrame(animationFrame);
  cancelAnimationFrame(preparationFrame);
  fracture?.dispose();
  apocalypse?.dispose();
  window.removeEventListener('resize', resize);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  resetButton.removeEventListener('click', returnToWhite);
  transitionButton.removeEventListener('click', startTransition);
  controls?.dispose();
  const geometries = new Set(), materials = new Set();
  scene.traverse(object => {
    if (object.isMesh) { geometries.add(object.geometry); materials.add(object.material); }
    if (object.isLight) object.dispose?.();
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
  textures.forEach(texture => texture.dispose());
  renderer?.dispose();
});
