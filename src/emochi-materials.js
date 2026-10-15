import * as THREE from 'three';

// Seamless, deterministic micrograin: surface relief only, with no speckled pigment.
function softVinylMaps() {
  const size = 256;
  const noise = new Float32Array(size * size);
  let seed = 47219;
  for (let i = 0; i < noise.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    noise[i] = seed / 4294967296;
  }
  const height = new Float32Array(noise.length);
  const at = (data, x, y) => data[((y + size) % size) * size + (x + size) % size];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let value = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      value += at(noise, x + dx, y + dy) * (dx === 0 ? 2 : 1) * (dy === 0 ? 2 : 1);
    }
    height[y * size + x] = value / 16;
  }
  const normals = new Uint8Array(size * size * 4);
  const roughness = new Uint8Array(normals.length);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    const nx = (at(height, x - 1, y) - at(height, x + 1, y)) * 2.2;
    const ny = (at(height, x, y - 1) - at(height, x, y + 1)) * 2.2;
    const length = Math.hypot(nx, ny, 1);
    normals.set([Math.round((nx / length * .5 + .5) * 255), Math.round((ny / length * .5 + .5) * 255), Math.round((1 / length * .5 + .5) * 255), 255], i);
    const grain = Math.round(210 + (height[y * size + x] - .5) * 75);
    // glTF packs roughness in green and metalness in blue; the vinyl is nonmetallic.
    roughness.set([255, grain, 0, 255], i);
  }
  const texture = (data, name) => {
    const map = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    map.name = name;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(3, 3);
    map.magFilter = THREE.LinearFilter;
    map.minFilter = THREE.LinearMipmapLinearFilter;
    map.generateMipmaps = true;
    map.anisotropy = 4;
    map.needsUpdate = true;
    return map;
  };
  const roughnessMap = texture(roughness, 'Satin micro-roughness');
  return { normalMap: texture(normals, 'Fine soft-vinyl grain'), roughnessMap, metalnessMap: roughnessMap };
}

export function createEmochiMaterials() {
  const maps = softVinylMaps();
  const yellow = new THREE.MeshPhysicalMaterial({
    ...maps, color: '#ffe600', roughness: .76, metalness: 0,
    normalScale: new THREE.Vector2(.16, .16),
    ior: 1.42, specularIntensity: .65,
    clearcoat: .08, clearcoatRoughness: .62,
    sheen: .12, sheenColor: '#fff1a8', sheenRoughness: .85,
  });
  yellow.name = 'Lemon soft-touch vinyl';
  const white = new THREE.MeshPhysicalMaterial({
    ...maps, color: '#fffaf0', roughness: .85,
    normalScale: new THREE.Vector2(.1, .1), ior: 1.4,
    specularIntensity: .5, sheen: .08, sheenColor: '#fffaf0', sheenRoughness: .9,
  });
  white.name = 'Warm ivory matte silicone';
  const ink = new THREE.MeshStandardMaterial({
    ...maps, color: '#242321', roughness: .72, normalScale: new THREE.Vector2(.08, .08),
  });
  ink.name = 'Charcoal satin rubber';
  return { yellow, white, ink };
}
