import * as THREE from 'three';
import { createAbandonedHome } from './abandoned-home.js';
import { createWorldLighting } from './world-lighting.js';
import { createScenePost } from './scene-post.js';
import { WEATHER } from './weather-state.js';

// Reuse the actual apocalypse room. No need to load the city or story actors
// for this fixed, inward-facing transition.
export function createApocalypseWall(canvas, camera) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = WEATHER.exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  const scene = new THREE.Scene();
  const lighting = createWorldLighting(scene);
  lighting.applyWeather(WEATHER);
  const home = createAbandonedHome(scene);
  const post = createScenePost(renderer, scene, camera, lighting);
  let ready = false, disposed = false;

  function render() {
    if (!ready || disposed) return;
    lighting.update(camera);
    renderer.shadowMap.needsUpdate = true;
    post.render();
  }

  return {
    ready: home.artworkReady.then(() => { ready = true; }),
    render,
    resize(width, height, dpr) {
      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height);
      post.resize(width, height, dpr);
    },
    dispose() {
      disposed = true;
      const geometries = new Set(), materials = new Set(), textures = new Set();
      scene.traverse(object => {
        if (object.isMesh) { geometries.add(object.geometry); materials.add(object.material); }
      });
      materials.forEach(material => {
        Object.values(material).forEach(value => { if (value?.isTexture) textures.add(value); });
        material.dispose();
      });
      geometries.forEach(geometry => geometry.dispose());
      textures.forEach(texture => texture.dispose());
      lighting.dispose();
      post.dispose();
      renderer.dispose();
    },
  };
}
