import * as THREE from 'three';
import { createEmochiMaterials } from './emochi-materials.js';

/** Original procedural mascot, based on the user-supplied Emochi icon. +Z faces forward. */
export function createEmochi() {
  const root = new THREE.Group();
  root.name = 'Emochi';
  const torso = new THREE.Group();
  torso.name = 'Body rig';
  root.add(torso);
  const { yellow, white, ink } = createEmochiMaterials();
  const sphere = new THREE.SphereGeometry(1, 64, 48);
  function oval(name, material, position, scale, parent = torso) {
    const mesh = new THREE.Mesh(sphere, material);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  // Broad, nearly spherical mochi proportions match the rounded concept render.
  const body = { x: 1.04, y: .92, z: .8, centerY: 1.18 };
  const faceY = 1.38;
  oval('Soft yellow body', yellow, [0, body.centerY, 0], [body.x, body.y, body.z]);
  // Face surfaces follow the body curvature; the dark border remains visible in profile.
  const surface = (x, y) => body.z * Math.sqrt(Math.max(.015, 1 - (x / body.x) ** 2 - ((y - body.centerY) / body.y) ** 2));
  function facePatch(name, width, height, offset, material) {
    const positions = [0, faceY, surface(0, faceY) + offset];
    const uvs = [.5, .5];
    const indices = [];
    const segments = 128, rings = 18;
    for (let ring = 1; ring <= rings; ring++) {
      for (let i = 0; i < segments; i++) {
        const a = i / segments * Math.PI * 2;
        const x = Math.sign(Math.cos(a)) * Math.abs(Math.cos(a)) ** .76 * width * ring / rings;
        const y = faceY + Math.sign(Math.sin(a)) * Math.abs(Math.sin(a)) ** .76 * height * ring / rings;
        positions.push(x, y, surface(x, y) + offset);
        uvs.push(.5 + x / (width * 2), .5 + (y - faceY) / (height * 2));
        const current = 1 + (ring - 1) * segments + i;
        const next = 1 + (ring - 1) * segments + (i + 1) % segments;
        if (ring === 1) indices.push(0, current, next);
        else indices.push(current - segments, current, next, current - segments, next, next - segments);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.receiveShadow = true;
    torso.add(mesh);
  }
  facePatch('Charcoal face outline', .59, .438, .014, ink);
  facePatch('Warm white face', .544, .392, .021, white);
  const eyes = [-1, 1].map(side => oval(side < 0 ? 'Left eye' : 'Right eye', ink, [side * .23, 1.45, surface(.23, 1.45) + .044], [.061, .066, .025]));
  const mouth = new THREE.Mesh(new THREE.CapsuleGeometry(.027, .207, 10, 24), ink);
  mouth.name = 'Little straight mouth';
  mouth.rotation.z = Math.PI / 2;
  mouth.position.set(0, 1.225, surface(0, 1.225) + .038);
  torso.add(mouth);
  const arms = [-1, 1].map(side => {
    const pivot = new THREE.Group();
    pivot.name = side < 0 ? 'Left shoulder' : 'Right shoulder';
    pivot.position.set(side * .92, 1.18, 0);
    pivot.rotation.z = side * .38;
    torso.add(pivot);
    oval(side < 0 ? 'Left round mitten' : 'Right round mitten', yellow, [0, -.18, .015], [.22, .31, .23], pivot);
    return pivot;
  });
  const feet = [-1, 1].map(side => oval(side < 0 ? 'Left round foot' : 'Right round foot', yellow, [side * .4, .18, .1], [.285, .18, .34], root));
  let action = 'idle', started = 0;
  function pose(time, reducedMotion = false) {
    const t = Math.max(0, time - started);
    const idle = reducedMotion ? 0 : Math.sin(time * 2) * .012;
    root.position.y = 0;
    root.rotation.set(0, 0, 0);
    torso.position.y = idle;
    torso.scale.set(1, 1, 1);
    arms[0].rotation.z = -.38;
    arms[1].rotation.z = .38;
    feet.forEach(foot => { foot.rotation.x = 0; });
    const blink = !reducedMotion && time % 4.8 > 4.62 ? .14 : 1;
    eyes.forEach(eye => { eye.scale.y = .066 * blink; });
    if (action === 'wave') {
      const blend = reducedMotion ? 1 : THREE.MathUtils.smoothstep(t, 0, .35);
      arms[0].rotation.z = THREE.MathUtils.lerp(-.38, -2.35 + (reducedMotion ? 0 : Math.sin(t * 9) * .22), blend);
    } else if (action === 'bounce' && !reducedMotion) {
      const phase = t % 1.7;
      const flight = Math.max(0, Math.sin(Math.min(1, phase / 1.1) * Math.PI));
      root.position.y = flight * .4;
      arms[0].rotation.z -= flight * .6;
      arms[1].rotation.z += flight * .6;
      const squash = phase > 1.1 ? Math.sin((phase - 1.1) / .6 * Math.PI) * .065 : 0;
      torso.scale.set(1 + squash, 1 - squash, 1 + squash);
    }
  }
  return { root, pose, setAction(value, time = 0) { action = value; started = time; } };
}
