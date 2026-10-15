import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createPendant } from '../src/bloodbound/pendant.js';

// GLTFExporter uses FileReader for its binary Blob; no browser or renderer is needed.
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then(result => {
        this.result = result;
        this.onload?.({ target: this });
        this.onloadend?.({ target: this });
      }).catch(error => {
        this.error = error;
        this.onerror?.({ target: this });
      });
    }
  };
}

const target = fileURLToPath(new URL('../public/assets/bloodbound/blood-heart-pendant.glb', import.meta.url));
const pendant = createPendant();
pendant.setFill(1);
pendant.group.name = 'BloodHeartPendant';
pendant.group.userData = {
  keepsakeId: 'blood-heart-pendant',
  source: 'Memory Lane original procedural geometry: src/bloodbound/pendant.js',
  units: 'meter',
  upAxis: '+Y',
  frontAxis: '+Z',
  fill: 1,
  origin: 'center of the heart design, chain extends toward +Y',
};
const partNames = ['CrystalShell', 'SilverHeartRim', 'BloodHeart', 'SilverBail'];
pendant.group.children.forEach((child, index) => {
  child.name = partNames[index] ?? `Chain_${index < 32 ? 'Left' : 'Right'}_${String((index - 4) % 28 + 1).padStart(2, '0')}`;
  if (child.material.transmission > 0) child.material.name = 'HeartCrystalGlass';
  else if (child.material.metalness > .9) child.material.name = 'SilverFrameAndChain';
  else {
    child.material.name = 'PreservedBloodHeart';
    // At full fill the shader discards nothing; export the complete solid interior.
    child.material.onBeforeCompile = () => {};
  }
});
pendant.group.updateMatrixWorld(true);
const originalBounds = new THREE.Box3().setFromObject(pendant.group);
const result = await new GLTFExporter().parseAsync(pendant.group, {
  binary: true,
  trs: true,
  onlyVisible: true,
  copyright: 'Memory Lane contributors. Original procedural pendant; see project LICENSE.',
});
assert(result instanceof ArrayBuffer, 'Expected a binary GLB');
const bytes = Buffer.from(result);
assert.equal(bytes.readUInt32LE(0), 0x46546c67, 'GLB magic');
assert.equal(bytes.readUInt32LE(4), 2, 'glTF 2.0');
assert.equal(bytes.readUInt32LE(8), bytes.length, 'GLB total length');
const jsonLength = bytes.readUInt32LE(12);
assert.equal(bytes.readUInt32LE(16), 0x4e4f534a, 'JSON chunk');
const json = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength).trim());
const binaryOffset = 20 + jsonLength;
assert.equal(bytes.readUInt32LE(binaryOffset + 4), 0x004e4942, 'BIN chunk');
assert.equal(binaryOffset + 8 + bytes.readUInt32LE(binaryOffset), bytes.length, 'Binary chunk bounds');
assert.equal(json.asset.version, '2.0');
assert.equal(json.buffers.length, 1);
assert(!json.buffers[0].uri && !json.images?.length, 'No external files');
for (const extension of ['KHR_materials_transmission', 'KHR_materials_volume', 'KHR_materials_ior']) {
  assert(json.extensionsUsed.includes(extension), `Missing ${extension}`);
}
const glass = json.materials.find(material => material.name === 'HeartCrystalGlass');
assert.equal(glass.extensions.KHR_materials_transmission.transmissionFactor, .94);
assert.equal(glass.extensions.KHR_materials_volume.thicknessFactor, .18);
assert.equal(glass.extensions.KHR_materials_ior.ior, 1.47);
assert.equal(glass.alphaMode ?? 'OPAQUE', 'OPAQUE', 'Physical transmission does not need alpha blending');
assert(json.nodes.some(node => node.name === 'BloodHeart'));
assert.equal(json.nodes.filter(node => node.name?.startsWith('Chain_')).length, 56);

const loaded = await new GLTFLoader().parseAsync(result, '');
loaded.scene.updateMatrixWorld(true);
const loadedBounds = new THREE.Box3().setFromObject(loaded.scene);
assert(loadedBounds.min.distanceTo(originalBounds.min) < 1e-7);
assert(loadedBounds.max.distanceTo(originalBounds.max) < 1e-7);
let triangles = 0, meshInstances = 0;
loaded.scene.traverse(object => {
  if (!object.isMesh) return;
  meshInstances++;
  triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3;
  for (const value of object.geometry.attributes.position.array) assert(Number.isFinite(value));
});
await mkdir(dirname(target), { recursive: true });
await writeFile(target, bytes);
console.log(JSON.stringify({
  file: target,
  bytes: bytes.length,
  sha256: createHash('sha256').update(bytes).digest('hex'),
  meshInstances,
  uniqueMeshes: json.meshes.length,
  materials: json.materials.length,
  triangles,
  dimensionsMeters: originalBounds.getSize(new THREE.Vector3()).toArray(),
  boundsMeters: { min: originalBounds.min.toArray(), max: originalBounds.max.toArray() },
  extensions: json.extensionsUsed,
  roundTrip: 'passed',
}, null, 2));
pendant.dispose();
