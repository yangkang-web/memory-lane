import * as THREE from 'three';

export async function loadChapelTextures() {
  const loader = new THREE.TextureLoader();
  const textures = {};
  await Promise.all(['stone', 'wall', 'floor'].map(async kind => {
    textures[kind] = {};
    await Promise.all([['color', 'map'], ['normal', 'normalMap'], ['roughness', 'roughnessMap']].map(async ([suffix, field]) => {
      const map = await loader.loadAsync(`/assets/bloodbound/chapel-${kind}-${suffix}.jpg`);
      map.colorSpace = suffix === 'color' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      map.anisotropy = 4;
      textures[kind][field] = map;
    }));
  }));
  return textures;
}
