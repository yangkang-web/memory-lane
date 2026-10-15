import * as THREE from 'three';

export function createPendant({ wearable = false } = {}) {
  const group = new THREE.Group();
  const heart = new THREE.Shape();
  heart.moveTo(0, 0.6);
  heart.bezierCurveTo(-0.9, 1.55, -1.8, 0.35, -0.95, -0.4);
  heart.lineTo(0, -1.25);
  heart.lineTo(0.95, -0.4);
  heart.bezierCurveTo(1.8, 0.35, 0.9, 1.55, 0, 0.6);
  const silver = new THREE.MeshStandardMaterial({ color: 0x9aa3ab, metalness: 0.95, roughness: 0.28 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xd9e7eb, metalness: 0, roughness: 0.06, transmission: 0.94,
    thickness: 0.18, ior: 1.47, clearcoat: 1, envMapIntensity: 1.6,
  });
  const shell = new THREE.Mesh(new THREE.ExtrudeGeometry(heart, {
    depth: 0.18, bevelEnabled: true, bevelSegments: 3, steps: 1,
    bevelSize: 0.12, bevelThickness: 0.11, curveSegments: 24,
  }), glass);
  shell.position.z = -0.09;
  group.add(shell);
  const points = heart.getPoints(100).map(p => new THREE.Vector3(p.x, p.y, 0.04));
  const rim = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), 100, 0.055, 6, true), silver);
  group.add(rim);
  const liquidShape = heart.clone();
  const fill = { value: 0 };
  const dim = new THREE.Color(0x30010b), lit = new THREE.Color(0xa0101f);
  let glow = 0;
  const bloodMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x7c0719, roughness: 0.14, metalness: 0.03,
    clearcoat: 1, emissive: 0x30010b, emissiveIntensity: 0.16,
  });
  bloodMaterial.onBeforeCompile = shader => {
    shader.uniforms.bloodFill = fill;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying float vLiquidHeight;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLiquidHeight = position.y;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform float bloodFill; varying float vLiquidHeight;').replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (vLiquidHeight > mix(-1.4, 1.35, bloodFill)) discard;');
  };
  const blood = new THREE.Mesh(new THREE.ExtrudeGeometry(liquidShape, {
    depth: 0.1, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.035, bevelThickness: 0.025, curveSegments: 20,
  }), bloodMaterial);
  blood.scale.set(.88, .88, .68);
  blood.position.z = 0.025;
  group.add(blood);
  const bail = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.04, 7, 18), silver);
  bail.position.set(0, 1.04, 0);
  group.add(bail);
  const link = new THREE.TorusGeometry(0.075, 0.018, 5, 10);
  const displayLinks = [];
  for (let side of [-1, 1]) {
    for (let i = 0; i < 28; i++) {
      const mesh = new THREE.Mesh(link, silver);
      const t = i / 27;
      mesh.position.set(side * (0.1 * (1 - t) + Math.sin(Math.PI * t) * 0.7), 1.16 + t * 2.8, 0);
      mesh.rotation.z = -side * Math.atan(Math.cos(Math.PI * t) * 0.7);
      if (i % 2) mesh.rotation.y = Math.PI * 0.5;
      mesh.scale.y = 1.45;
      group.add(mesh);
      displayLinks.push(mesh);
    }
  }
  group.scale.setScalar(0.023);
  const wornChain = wearable ? new THREE.InstancedMesh(link, silver, 256) : null;
  if (wornChain) { wornChain.visible = false; wornChain.frustumCulled = false; group.add(wornChain); }
  const chainMatrix = new THREE.Matrix4(), chainQuaternion = new THREE.Quaternion();
  const chainScale = new THREE.Vector3(1, 1.45, 1);
  // Each side of the chain runs from the bail to its endpoint, bowed towards `through` (world points) when given,
  // so it can be laid round a neck instead of through it.
  function setChainEndpoints(left, right, through = null) {
    if (!wornChain) return;
    const visible = !!left && !!right;
    for (const mesh of displayLinks) mesh.visible = !visible;
    wornChain.visible = visible;
    if (!visible) return;
    group.updateWorldMatrix(true, false);
    for (const [index, side, endpoint, offset] of [[0, -1, left, 0], [1, 1, right, 128]]) {
      const end = group.worldToLocal(endpoint.clone());
      const start = new THREE.Vector3(side * .1, 1.16, 0);
      const bend = start.clone().lerp(end, .5);
      if (through) {
        // The control point that makes the curve pass through `through` halfway along.
        bend.multiplyScalar(-1).add(group.worldToLocal(through[index].clone()).multiplyScalar(2));
      } else {
        bend.x += side * .45;
        bend.y -= .5;
      }
      const curve = new THREE.QuadraticBezierCurve3(start, bend, end);
      for (let i = 0; i < 128; i++) {
        const t = i / 127;
        chainQuaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), curve.getTangent(t));
        if (i % 2) chainQuaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2));
        chainMatrix.compose(curve.getPoint(t), chainQuaternion, chainScale);
        wornChain.setMatrixAt(offset + i, chainMatrix);
      }
    }
    wornChain.instanceMatrix.needsUpdate = true;
  }
  // The heart itself can be swapped for a modelled one: a blood vial with its cap and bail, top of the bail at the
  // origin, one unit tall, face towards +z. Its dark red glass is what glows.
  let model = null;
  const glowMaterials = [];
  function setModel(scene) {
    model = scene;
    for (const mesh of [shell, rim, blood, bail]) mesh.visible = false;
    model.scale.setScalar(2.8);
    model.position.set(0, 1.18, 0);
    model.traverse(object => {
      if (!object.isMesh) return;
      const material = object.material;
      material.emissive = new THREE.Color(0x30010b);
      material.emissiveMap = material.map;
      material.envMapIntensity = 1.4;
      // Only the red of the glass and the blood in it lights up, not the metal.
      material.onBeforeCompile = shader => {
        shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance *= smoothstep(0.04, 0.16, diffuseColor.r - max(diffuseColor.g, diffuseColor.b));`);
      };
      glowMaterials.push(material);
    });
    group.add(model);
  }
  return {
    group,
    setModel,
    setChainEndpoints,
    setFill(value) { fill.value = THREE.MathUtils.clamp(value, 0, 1); blood.visible = value > 0; },
    // 0 … 1: the blood inside lit from within, beating slowly.
    setGlow(value) { glow = value; },
    update(time) {
      const beat = Math.pow(Math.max(0, Math.sin(time * 4.8)), 5);
      bloodMaterial.emissive.lerpColors(dim, lit, glow);
      bloodMaterial.emissiveIntensity = 0.15 + beat * 0.16 + glow * (1.1 + beat * 0.5);
      for (const material of glowMaterials) {
        material.emissive.lerpColors(dim, lit, glow);
        material.emissiveIntensity = 0.4 + beat * 0.3 + glow * (2.4 + beat * 1.2);
      }
    },
    dispose() {
      group.traverse(object => { if (object.isMesh) object.geometry.dispose(); });
      silver.dispose(); glass.dispose(); bloodMaterial.dispose();
      for (const material of glowMaterials) { material.map?.dispose(); material.normalMap?.dispose(); material.roughnessMap?.dispose(); material.metalnessMap?.dispose(); material.dispose(); }
    },
  };
}
