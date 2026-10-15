import * as THREE from 'three';

// Poly Haven "Antique Estoc" (CC0). Model space: blade along +Y, guard at the origin.
export const ESTOC = {
  file: '/assets/bloodbound/chapel-antique-estoc/antique_estoc_1k.gltf',
  bone: 'mixamorigRightHand',
  // Grip in the hand bone's frame (metres, radians); tuned on the review page.
  // Mixamo hand: +Y runs along the fingers, the fist closes towards +Z, so the blade lies along +X.
  position: [0.055, 0.075, 0.03],
  rotation: [0, 0, -Math.PI / 2],
  scale: 0.78,
};

export function attachProp(root, gltf, spec = ESTOC) {
  const hand = root.getObjectByName(spec.bone);
  if (!hand) return null;
  const prop = gltf.scene;
  prop.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  // The bone may carry the FBX centimetre scale; cancel it so the prop keeps real size.
  root.updateMatrixWorld(true);
  const s = new THREE.Vector3(); hand.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), s);
  const holder = new THREE.Group(); holder.name = 'PropHolder';
  holder.scale.setScalar(1 / s.x);
  const grip = new THREE.Group(); grip.name = 'PropGrip';
  grip.position.fromArray(spec.position);
  grip.rotation.fromArray(spec.rotation);
  grip.scale.setScalar(spec.scale);
  grip.add(prop); holder.add(grip); hand.add(holder);
  return grip;
}
