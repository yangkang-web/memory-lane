import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { createEmochi } from './emochi.js';
import './emochi-studio.css';

document.title = 'Emochi · A little ball of sunshine';
document.querySelector('meta[name="description"]').content = 'Meet Emochi: an interactive 3D mascot with round hands, round feet and a little wave.';
document.querySelector('#app').innerHTML = `
  <canvas id="emochi-canvas" aria-label="Interactive 3D Emochi. Drag to rotate and scroll to zoom."></canvas>
  <header class="studio-header"><div class="studio-brand"><i aria-hidden="true"></i>emochi<span style="font-size:11px;letter-spacing:1px;font-weight:400;margin-left:7px;color:#858872">STUDIO</span></div><a href="/school">Back to campus ↗</a></header>
  <section class="studio-heading"><div class="studio-kicker">SMALL FRIEND. BIG FEELINGS.</div><h1>A little ball <br>of sunshine.</h1><p>Round hands. Tiny feet.<br>Always happy to see you.</p><div class="studio-tag"><i></i>MEET EMOCHI / 001</div></section>
  <div class="studio-side" role="group" aria-label="View controls"><button id="emochi-spin" aria-label="Auto rotate" title="Auto rotate" aria-pressed="false">↻</button><button id="emochi-reset" aria-label="Reset view" title="Reset view">⌂</button></div>
  <nav class="studio-bottom" aria-label="Emochi actions"><button data-pose="idle" aria-pressed="true">Relax</button><button data-pose="wave" aria-pressed="false">Say hello</button><button data-pose="bounce" aria-pressed="false">Little hop</button><button class="studio-export" id="emochi-export">↓ Model</button></nav>
  <div class="studio-edition">THE EMOCHI COLLECTION<br>VOLUME 01 — ORIGINAL</div><div class="studio-status" role="status" aria-live="polite"></div>
  <div class="studio-help">Drag to orbit &nbsp; · &nbsp; Scroll to zoom &nbsp; · &nbsp; Made to make you smile</div>`;

try {
  const canvas = document.querySelector('#emochi-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f5f3ec');
  scene.fog = new THREE.Fog('#f5f3ec', 12, 35);
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 60);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 3.4;
  controls.maxDistance = 9;
  controls.minPolarAngle = .25;
  controls.maxPolarAngle = Math.PI / 2 + .025;
  controls.autoRotateSpeed = 1.3;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const status = document.querySelector('.studio-status');
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .04);
  scene.environment = environment.texture;
  scene.environmentIntensity = .4;
  room.dispose();
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight('#ffffff', '#d4c9a4', 1.1));
  // A large softbox gives the micrograin a broad, soft studio highlight.
  RectAreaLightUniformsLib.init();
  const softbox = new THREE.RectAreaLight('#fff9ec', 2.5, 4, 4);
  softbox.position.set(-3, 4, 4);
  softbox.lookAt(0, 1.2, 0);
  scene.add(softbox);
  const key = new THREE.DirectionalLight('#fff7df', 1.5);
  key.position.set(-3.5, 6, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: .1, far: 16 });
  key.shadow.normalBias = .025;
  key.shadow.bias = -.0001;
  key.shadow.radius = 4;
  scene.add(key);
  const fill = new THREE.DirectionalLight('#ffffff', 1.1);
  fill.position.set(4, 3, -2);
  scene.add(fill);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#f5f3ec', roughness: 1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -.005;
  floor.receiveShadow = true;
  scene.add(floor);
  // A soft ambient contact patch supplements the real directional shadow.
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const context = shadowCanvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 2, 64, 64, 64);
  gradient.addColorStop(0, '#37331b42');
  gradient.addColorStop(1, '#37331b00');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.8), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }));
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = .002;
  scene.add(contact);
  const emochi = createEmochi();
  scene.add(emochi.root);
  let elapsed = 0, previous = performance.now(), disposed = false;
  function resetView() {
    const mobile = innerWidth < 600;
    const compact = innerWidth < 900;
    controls.target.set(0, mobile ? 1.25 : 1.1, 0);
    const distance = Math.max(mobile ? 7.4 : compact ? 7.5 : 6.5, 1.58 / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect));
    camera.position.set(.5, mobile ? 2.1 : 2.4, distance);
    controls.minDistance = distance * .6;
    controls.maxDistance = distance * 1.65;
    controls.update();
  }
  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.clearViewOffset();
    // Move the subject right on desktop and below the heading on narrow screens.
    camera.setViewOffset(width, height, innerWidth < 600 ? 0 : -width * .105, innerWidth < 600 ? -height * .075 : 0, width, height);
    camera.updateProjectionMatrix();
    resetView();
  }
  resize();
  addEventListener('resize', resize);
  document.querySelector('#emochi-reset').onclick = () => {
    controls.autoRotate = false;
    document.querySelector('#emochi-spin').setAttribute('aria-pressed', 'false');
    resetView();
  };
  document.querySelector('#emochi-spin').onclick = event => {
    controls.autoRotate = !controls.autoRotate;
    event.currentTarget.setAttribute('aria-pressed', String(controls.autoRotate));
  };
  document.querySelectorAll('[data-pose]').forEach(button => {
    button.onclick = () => {
      emochi.setAction(button.dataset.pose, elapsed);
      document.querySelectorAll('[data-pose]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      status.textContent = reduced.matches ? 'Reduced motion is on. Poses stay still.' : '';
    };
  });
  document.querySelector('#emochi-export').onclick = async event => {
    const button = event.currentTarget;
    button.disabled = true;
    status.textContent = 'Preparing your model…';
    let model;
    try {
      const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
      model = createEmochi();
      model.pose(0, true);
      const data = await new GLTFExporter().parseAsync(model.root, { binary: true });
      const url = URL.createObjectURL(new Blob([data], { type: 'model/gltf-binary' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'emochi.glb';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      status.textContent = 'Model ready · emochi.glb';
    } catch (error) {
      console.error(error);
      status.textContent = 'Could not export. Please try again.';
    } finally {
      if (model) disposeObject(model.root);
      button.disabled = false;
    }
  };
  function disposeObject(object) {
    const geometries = new Set(), materials = new Set(), textures = new Set();
    object.traverse(child => { if (child.geometry) geometries.add(child.geometry); if (child.material) materials.add(child.material); });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => {
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      material.dispose();
    });
    textures.forEach(texture => texture.dispose());
  }
  renderer.setAnimationLoop(now => {
    if (disposed) return;
    const delta = Math.min((now - previous) / 1000, .05);
    previous = now;
    if (document.hidden) return;
    elapsed += delta;
    emochi.pose(elapsed, reduced.matches);
    contact.material.opacity = 1 - emochi.root.position.y * 1.5;
    controls.update(delta);
    renderer.render(scene, camera);
  });
  addEventListener('pagehide', event => {
    if (event.persisted) return;
    disposed = true;
    renderer.setAnimationLoop(null);
    removeEventListener('resize', resize);
    controls.dispose();
    disposeObject(scene);
    environment.dispose();
    renderer.dispose();
  });
} catch (error) {
  console.error(error);
  document.querySelector('#app').insertAdjacentHTML('beforeend', '<div class="studio-error" role="alert">Emochi needs a browser with WebGL 2. Please enable hardware acceleration and refresh, or <a href="/school">return to campus</a>.</div>');
  document.querySelectorAll('button').forEach(button => { button.disabled = true; });
}
