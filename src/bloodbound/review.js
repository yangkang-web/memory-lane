import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { ESTOC, attachProp } from './props.js';

const CHARACTERS = {
  lucien: { file: '/assets/bloodbound/characters/v3/lucien.glb', credit: 'Body, coat and rig: "Alucard" by SpatialNeglect (Sketchfab, Free Standard). Head: MakeHuman / MPFB (CC0), project edits.' },
  hunter: { file: '/assets/bloodbound/characters/v3/hunter.glb', credit: '"Old Hunter" by Blue Spirit (Sketchfab, CC-BY 4.0), project edits. Estoc: Poly Haven (CC0).', prop: ESTOC },
  // Only the arms survive, so the model keeps its native height instead of being dropped to the floor.
  arms: { file: '/assets/bloodbound/characters/v3/arms.glb', credit: 'Player arms: Mixamo "Louise" (Adobe), reduced to arms and hands, sleeves darkened.', keepHeight: true },
};

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.AgXToneMapping;
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0a0c);
const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.02, 50);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const pmrem = new THREE.PMREMGenerator(renderer);
new HDRLoader().load('/assets/bloodbound/chapel-lighting.hdr', (hdr) => {
  scene.environment = pmrem.fromEquirectangular(hdr).texture;
  hdr.dispose();
});

const floor = new THREE.Mesh(new THREE.CircleGeometry(12, 64), new THREE.MeshStandardMaterial({ color: 0x1a171b, roughness: 1, envMapIntensity: 0.2 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const rigs = {
  studio: () => {
    const g = new THREE.Group();
    const key = new THREE.DirectionalLight(0xfff1e6, 2.4); key.position.set(1.5, 2.6, 2.2); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.camera.left = key.shadow.camera.bottom = -1.5; key.shadow.camera.right = key.shadow.camera.top = 1.5;
    const fill = new THREE.DirectionalLight(0xc8d4ff, 0.7); fill.position.set(-2, 1.5, 1.5);
    const rim = new THREE.DirectionalLight(0xffffff, 1.6); rim.position.set(0, 2.5, -2.5);
    g.add(key, fill, rim, new THREE.HemisphereLight(0x8a8aa0, 0x201a18, 0.35));
    return { group: g, env: 0.5 };
  },
  chapel: () => {
    const g = new THREE.Group();
    const moon = new THREE.DirectionalLight(0x9fb2ff, 0.9); moon.position.set(-2.2, 3.5, -1.5); moon.castShadow = true; moon.shadow.bias = -0.0004; moon.shadow.normalBias = 0.02;
    const candle = new THREE.PointLight(0xff9a4a, 6, 6, 2); candle.position.set(0.7, 1.4, 1.1); candle.castShadow = true; candle.shadow.bias = -0.0005; candle.shadow.normalBias = 0.02;
    const blood = new THREE.PointLight(0xa0142a, 3, 6, 2); blood.position.set(-1, 2.2, -1.2);
    g.add(moon, candle, blood, new THREE.HemisphereLight(0x302838, 0x0a0808, 0.25));
    return { group: g, env: 0.18 };
  },
};
let lightRig = null;
function setLight(name) {
  if (lightRig) scene.remove(lightRig.group);
  lightRig = rigs[name]();
  scene.add(lightRig.group);
  scene.environmentIntensity = lightRig.env;
  for (const b of document.querySelectorAll('#light button')) b.classList.toggle('on', b.dataset.k === name);
}

let current = null, mixer = null, bounds = null;
const loader = new GLTFLoader();
const clock = new THREE.Clock();

function frame(view) {
  if (!bounds) return;
  const { min, max } = bounds;
  const h = max.y - min.y, cx = (min.x + max.x) / 2, cz = (min.z + max.z) / 2;
  // Height limits a standing figure, width the flat T-posed arms; both then fill the frame.
  const d = Math.max(h * 2.8, (max.x - min.x) * 1.4, (max.z - min.z) * 1.4);
  const head = current.getObjectByName('mixamorigHead');
  const hp = new THREE.Vector3();
  if (head) head.getWorldPosition(hp); else hp.set(cx, max.y - h * 0.07, cz);
  const eyes = current.getObjectByName('Lucien_Eyes');
  const face = eyes ? new THREE.Box3().setFromObject(eyes).getCenter(new THREE.Vector3()).add(new THREE.Vector3(0, -0.03, 0)) : hp.clone().add(new THREE.Vector3(0, 0.07, 0));
  const hand = current.getObjectByName('mixamorigRightHand')?.getWorldPosition(new THREE.Vector3()) ?? hp;
  // Player's eye: a little above and in front of the head joint, looking forward and down at the hands.
  const eye = hp.clone().add(new THREE.Vector3(0, 0.08, 0.1));
  const views = {
    fp: [eye, eye.clone().add(new THREE.Vector3(0, -0.4, 1))],
    hand: [hand.clone().add(new THREE.Vector3(-0.35, 0.15, 0.9)), hand],
    front: [new THREE.Vector3(cx, min.y + h * 0.55, cz + d), new THREE.Vector3(cx, min.y + h * 0.5, cz)],
    side: [new THREE.Vector3(cx + d, min.y + h * 0.55, cz), new THREE.Vector3(cx, min.y + h * 0.5, cz)],
    back: [new THREE.Vector3(cx, min.y + h * 0.55, cz - d), new THREE.Vector3(cx, min.y + h * 0.5, cz)],
    bust: [face.clone().add(new THREE.Vector3(0.45, -0.1, 1.4)), face.clone().add(new THREE.Vector3(0, -0.18, 0))],
    face: [face.clone().add(new THREE.Vector3(0, 0, 0.75)), face],
    face34: [face.clone().add(new THREE.Vector3(0.45, 0.02, 0.6)), face],
    profile: [face.clone().add(new THREE.Vector3(0.75, 0, 0)), face],
  };
  const [pos, target] = views[view];
  camera.fov = view === 'fp' ? 70 : 30;
  camera.updateProjectionMatrix();
  camera.position.copy(pos);
  controls.target.copy(target);
  controls.update();
}

function load(key) {
  if (current) scene.remove(current);
  mixer = null;
  for (const b of document.querySelectorAll('#chars button')) b.classList.toggle('on', b.dataset.k === key);
  document.getElementById('credit').textContent = CHARACTERS[key].credit;
  loader.load(CHARACTERS[key].file, (gltf) => {
    current = gltf.scene;
    let tris = 0, meshes = 0;
    const morphMeshes = [];
    current.traverse((o) => {
      if (!o.isMesh) return;
      meshes++;
      o.castShadow = true;
      // Alpha-tested hair cards shadow themselves into blotches; they still cast onto the face.
      o.receiveShadow = !/Hair/.test(o.name);
      o.frustumCulled = false;
      const g = o.geometry;
      tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
      if (o.morphTargetDictionary) morphMeshes.push(o);
    });
    scene.add(current);
    if (CHARACTERS[key].prop) {
      const owner = current;
      loader.load(CHARACTERS[key].prop.file, (p) => { if (current === owner) window.__prop = attachProp(owner, p, CHARACTERS[key].prop); });
    }
    current.updateMatrixWorld(true);
    bounds = new THREE.Box3().setFromObject(current, true);
    if (!CHARACTERS[key].keepHeight) current.position.y -= bounds.min.y;
    current.updateMatrixWorld(true);
    bounds = new THREE.Box3().setFromObject(current, true);
    const height = bounds.max.y - bounds.min.y;
    document.getElementById('stats').textContent =
      `高度 ${height.toFixed(2)} m\n三角面 ${Math.round(tris).toLocaleString()}\n网格 ${meshes}\n动画 ${gltf.animations.length}`;
    const morphs = document.getElementById('morphs');
    morphs.innerHTML = '';
    const names = [...new Set(morphMeshes.flatMap((m) => Object.keys(m.morphTargetDictionary)))];
    for (const name of names) {
      const row = document.createElement('label');
      row.innerHTML = `<span>${name}</span><input type="range" min="0" max="1" step="0.01" value="0">`;
      row.querySelector('input').addEventListener('input', (e) => {
        for (const m of morphMeshes) {
          const i = m.morphTargetDictionary[name];
          if (i !== undefined) m.morphTargetInfluences[i] = +e.target.value;
        }
      });
      morphs.appendChild(row);
    }
    const anims = document.getElementById('anims');
    anims.innerHTML = '';
    if (gltf.animations.length) {
      mixer = new THREE.AnimationMixer(current);
      for (const clip of gltf.animations) {
        const b = document.createElement('button');
        b.textContent = clip.name;
        b.onclick = () => { mixer.stopAllAction(); mixer.clipAction(clip).play(); };
        anims.appendChild(b);
      }
      const rest = document.createElement('button');
      rest.textContent = 'T-pose';
      rest.onclick = () => { mixer.stopAllAction(); current.traverse((o) => o.isSkinnedMesh && o.skeleton.pose()); };
      anims.appendChild(rest);
    }
    frame(new URLSearchParams(location.search).get('view') || (key === 'arms' ? 'fp' : 'front'));
    window.__review = { ready: true, key, tris, meshes, height, mixer, frame, camera, controls };
  });
}

const addButtons = (id, items, fn) => {
  const el = document.getElementById(id);
  for (const [k, label] of items) {
    const b = document.createElement('button');
    b.textContent = label; b.dataset.k = k; b.onclick = () => fn(k);
    el.appendChild(b);
  }
};
addButtons('chars', [['lucien', 'Lucien'], ['hunter', '猎人'], ['arms', '玩家双臂']], load);
addButtons('views', [['front', '正面'], ['side', '侧面'], ['back', '背面'], ['bust', '半身'], ['face', '脸'], ['face34', '脸 3/4'], ['profile', '侧脸'], ['hand', '右手'], ['fp', '第一人称']], frame);
addButtons('light', [['studio', '棚拍光'], ['chapel', '教堂光']], setLight);
setLight(new URLSearchParams(location.search).get('light') || 'studio');
load(new URLSearchParams(location.search).get('char') || 'lucien');
window.__frame = frame;
window.__scene = scene;

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  if (mixer) mixer.update(dt);
  controls.update();
  renderer.render(scene, camera);
});
