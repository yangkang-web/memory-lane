import * as THREE from 'three';
import { attachProp } from './props.js';
import { floorHeight } from './layout.js';

const turnRate = 4.5;
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));

// A rigged figure standing on the chapel floor. Walk clips are in place, so code moves and turns the root.
// Mixamo figures face +z: facing a direction (dx, dz) is rotation.y = atan2(dx, dz).
export function createCharacter(gltf, { prop = null } = {}) {
  const root = gltf.scene;
  root.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true;
    // Alpha-tested hair cards shadow themselves into blotches; they still cast onto the face.
    o.receiveShadow = !/Hair/.test(o.name);
    o.frustumCulled = false;
  });
  const group = new THREE.Group();
  group.add(root);
  root.updateMatrixWorld(true);
  root.position.y -= new THREE.Box3().setFromObject(root, true).min.y;
  const mixer = new THREE.AnimationMixer(root);
  const clips = new Map(gltf.animations.map(clip => [clip.name, clip]));
  let current = null;
  let heading = 0;
  let target = null;

  const character = {
    group,
    root,
    get clip() { return current?.name ?? null; },
    get heading() { return heading; },
    attach(propGltf, spec) { return attachProp(root, propGltf, spec); },
    play(name, { fade = 0.35, loop = true, speed = 1 } = {}) {
      const clip = clips.get(name);
      if (!clip) return null;
      const next = mixer.clipAction(clip);
      if (current?.action === next) return next;
      next.reset();
      next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
      next.clampWhenFinished = !loop;
      next.timeScale = speed;
      next.play();
      if (current) current.action.crossFadeTo(next, fade, false);
      current = { name, action: next };
      return next;
    },
    duration(name) { return clips.get(name)?.duration ?? 0; },
    place(x, z, facing = heading) {
      group.position.set(x, floorHeight(x, z), z);
      heading = facing;
      group.rotation.y = heading;
      target = null;
    },
    face(x, z) { heading = Math.atan2(x - group.position.x, z - group.position.z); group.rotation.y = heading; },
    // Walk towards (x, z) and stop `stopAt` metres short; `resolve` keeps the path out of the chapel's obstacles.
    walkTo(x, z, { speed = 1, stopAt = 0, resolve = null, onArrive = null } = {}) { target = { x, z, speed, stopAt, resolve, onArrive }; },
    stop() { target = null; },
    get walking() { return Boolean(target); },
    distanceTo(x, z) { return Math.hypot(x - group.position.x, z - group.position.z); },
    update(dt) {
      if (target) {
        const dx = target.x - group.position.x, dz = target.z - group.position.z, d = Math.hypot(dx, dz);
        const desired = Math.atan2(dx, dz);
        heading += wrap(desired - heading) * (1 - Math.exp(-dt * turnRate));
        group.rotation.y = heading;
        if (d <= target.stopAt + 0.02) {
          const done = target.onArrive;
          target = null;
          done?.();
        } else {
          const step = Math.min(d - target.stopAt, target.speed * dt);
          // Walk along the facing so turns arc instead of sliding sideways.
          let x = group.position.x + Math.sin(heading) * step, z = group.position.z + Math.cos(heading) * step;
          if (target.resolve) ({ x, z } = target.resolve({ x, z }));
          group.position.set(x, floorHeight(x, z), z);
        }
      }
      mixer.update(dt);
      // Procedural layers (gaze, contact) go on top of the clip's pose.
      character.layer?.(dt);
    },
    // Called after the clip has posed the skeleton each frame.
    layer: null,
    action(name) { const clip = clips.get(name); return clip ? mixer.existingAction(clip) : null; },
    dispose() { mixer.stopAllAction(); mixer.uncacheRoot(root); },
  };
  if (prop) character.attach(prop.gltf, prop.spec);
  return character;
}
