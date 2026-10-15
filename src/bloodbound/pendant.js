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
  group.scale.setScalar(0.023);
  // The chain is one thin silver wire, as on the modelled necklace: a tube laid along a curve each frame, kinked a
  // little at fixed points so it reads as worked metal rather than a perfect line.
  const wire = { rings: 44, sides: 5, radius: 0.024 };
  const kinks = Array.from({ length: wire.rings }, (_, i) => [Math.sin(i * 12.99) * 0.018, Math.sin(i * 78.23 + 1) * 0.018]);
  function createWire() {
    const count = wire.rings * wire.sides;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage));
    const index = [];
    for (let i = 0; i < wire.rings - 1; i++) for (let j = 0; j < wire.sides; j++) {
      const a = i * wire.sides + j, b = i * wire.sides + (j + 1) % wire.sides;
      index.push(a, a + wire.sides, b, b, a + wire.sides, b + wire.sides);
    }
    geometry.setIndex(index);
    const mesh = new THREE.Mesh(geometry, silver);
    mesh.frustumCulled = false;
    group.add(mesh);
    return mesh;
  }
  const strands = [createWire(), createWire()];
  const w = { p: new THREE.Vector3(), t: new THREE.Vector3(), n: new THREE.Vector3(), b: new THREE.Vector3(), o: new THREE.Vector3() };
  function lay(mesh, curve) {
    const position = mesh.geometry.attributes.position, normal = mesh.geometry.attributes.normal;
    curve.getTangent(0, w.t);
    w.n.set(0, 0, 1).cross(w.t);
    if (w.n.lengthSq() < 1e-6) w.n.set(1, 0, 0);
    w.n.normalize();
    for (let i = 0; i < wire.rings; i++) {
      const t = i / (wire.rings - 1);
      curve.getPoint(t, w.p);
      curve.getTangent(t, w.t);
      // Carry the ring's frame along the curve so the tube does not twist.
      w.n.addScaledVector(w.t, -w.n.dot(w.t)).normalize();
      w.b.crossVectors(w.t, w.n);
      const ends = i === 0 || i === wire.rings - 1 ? 0 : 1;
      w.p.addScaledVector(w.n, kinks[i][0] * ends).addScaledVector(w.b, kinks[i][1] * ends);
      for (let j = 0; j < wire.sides; j++) {
        const angle = (j / wire.sides) * Math.PI * 2;
        w.o.copy(w.n).multiplyScalar(Math.cos(angle)).addScaledVector(w.b, Math.sin(angle));
        const k = i * wire.sides + j;
        normal.setXYZ(k, w.o.x, w.o.y, w.o.z);
        position.setXYZ(k, w.p.x + w.o.x * wire.radius, w.p.y + w.o.y * wire.radius, w.p.z + w.o.z * wire.radius);
      }
    }
    position.needsUpdate = true;
    normal.needsUpdate = true;
  }
  const curves = [-1, 1].map(() => new THREE.QuadraticBezierCurve3(new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()));
  // Hanging free, the two sides rise from the bail and meet above it.
  function layDisplay() {
    for (const [i, side] of [-1, 1].entries()) {
      curves[i].v0.set(side * 0.1, 1.16, 0); curves[i].v1.set(side * 1.4, 2.56, 0); curves[i].v2.set(0, 3.96, 0);
      lay(strands[i], curves[i]);
    }
  }
  layDisplay();
  // The lobster clasp and its extender chain, from the modelled necklace; hangs from the end of the right side.
  let clasp = null;
  const claspAt = new THREE.Vector3(), claspQuaternion = new THREE.Quaternion(), groupQuaternion = new THREE.Quaternion();
  const basis = new THREE.Matrix4(), faceAxis = new THREE.Vector3(), sideAxis = new THREE.Vector3(), down = new THREE.Vector3(0, -1, 0);
  // Each side of the chain runs from the bail to its endpoint, bowed towards `through` (world points) when given,
  // so it can be laid round a neck instead of through it.
  function setChainEndpoints(left, right, through = null) {
    if (!wearable) return;
    if (!left || !right) { layDisplay(); if (clasp) clasp.visible = false; return; }
    group.updateWorldMatrix(true, false);
    for (const [index, side, endpoint] of [[0, -1, left], [1, 1, right]]) {
      const curve = curves[index];
      const end = group.worldToLocal(curve.v2.copy(endpoint));
      const start = curve.v0.set(side * .1, 1.16, 0);
      const bend = curve.v1.copy(start).lerp(end, .5);
      if (through) {
        // The control point that makes the curve pass through `through` halfway along.
        bend.multiplyScalar(-1).add(group.worldToLocal(claspAt.copy(through[index])).multiplyScalar(2));
      } else {
        bend.x += side * .45;
        bend.y -= .5;
      }
      lay(strands[index], curve);
    }
    if (clasp) {
      // Straight down from the end, its face turned the way the pendant's is.
      clasp.visible = true;
      clasp.position.copy(curves[1].v2);
      group.getWorldQuaternion(groupQuaternion);
      faceAxis.set(0, 0, 1).applyQuaternion(groupQuaternion).setY(0);
      if (faceAxis.lengthSq() < 1e-6) faceAxis.set(0, 0, 1);
      faceAxis.normalize();
      sideAxis.crossVectors(down, faceAxis).negate();
      basis.makeBasis(sideAxis, claspAt.copy(down).negate(), faceAxis);
      claspQuaternion.setFromRotationMatrix(basis);
      clasp.quaternion.copy(groupQuaternion.invert().multiply(claspQuaternion));
    }
  }
  // A small light kept just above and in front of the heart, so its glass always carries a highlight. It lives in the
  // scene rather than the group: hiding the group must not change how many lights the scene's shaders are built for.
  const light = new THREE.PointLight(0xfff1e4, 0, 0.5, 2);
  const lightOffset = new THREE.Vector3(1.6, 2.2, 4.2);
  // The heart itself can be swapped for a modelled one: a blood vial with its cap and bail, top of the bail at the
  // origin, one unit tall, face towards +z. Its blood lights up faintly with the beat, and drains from the top down:
  // above the fill level the red of the blood gives way to the bare grey-violet of the glass.
  let model = null;
  const glowMaterials = [];
  // Heights in the model, top of the bail at 0: the bottom of the glass, where the blood stands when the vial is
  // full, and the top of the glass. The texture paints streaks of blood all through the glass; they only show below
  // the surface, which rises from FLOOR to POOL as it fills, with the streaks above it up to BRIM.
  const FLOOR = -1.0, POOL = -0.6, BRIM = -0.3;
  function vialMaterial(source, vial) {
    const material = new THREE.MeshPhysicalMaterial({
      map: source.map, normalMap: source.normalMap, roughnessMap: source.roughnessMap, metalnessMap: source.metalnessMap,
      metalness: 1, roughness: 1, side: THREE.DoubleSide, clearcoat: 0.8, clearcoatRoughness: 0.06,
      emissive: 0xffffff, emissiveMap: source.map, emissiveIntensity: 0, envMapIntensity: 1.25,
    });
    material.onBeforeCompile = shader => {
      shader.uniforms.bloodFill = vial ? fill : { value: 1 };
      shader.uniforms.bloodPool = { value: vial ? 1 : 0 };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vVial;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvVial = position;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float bloodFill, bloodPool; varying vec3 vVial;')
        .replace('#include <map_fragment>', `#include <map_fragment>
// The blood is dark in the texture, so tell it from the violet glass by how red it is, not how bright.
float bloodRed = smoothstep(0.35, 0.6, (diffuseColor.r - max(diffuseColor.g, diffuseColor.b)) / max(diffuseColor.r, 0.001));
float bloodLuma = dot(diffuseColor.rgb, vec3(0.3, 0.5, 0.2));
float bloodLevel = mix(${FLOOR.toFixed(2)}, ${POOL.toFixed(2)}, bloodFill) + sin(vVial.x * 9.0) * 0.008;
float bloodStreaks = mix(${FLOOR.toFixed(2)}, ${BRIM.toFixed(2)}, bloodFill);
float bloodAbove = smoothstep(bloodStreaks - 0.012, bloodStreaks + 0.012, vVial.y) * step(bloodFill, 0.999);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.06, 0.035, 0.055) + bloodLuma * 0.3, bloodRed * bloodAbove);
// Below the surface the glass is full of blood, darkest at the bottom.
float bloodBelow = (1.0 - smoothstep(bloodLevel - mix(0.03, 0.14, bloodFill), bloodLevel + 0.015, vVial.y)) * step(0.001, bloodFill) * bloodPool;
vec3 bloodColor = vec3(0.42, 0.006, 0.025) * (0.3 + bloodLuma * 7.0) * mix(0.6, 1.0, smoothstep(-1.0, -0.65, vVial.y));
diffuseColor.rgb = mix(diffuseColor.rgb, bloodColor, bloodBelow * 0.78);
// The surface of the blood, a bright line where it meets the glass.
float bloodSurface = (1.0 - smoothstep(0.0, 0.018, abs(vVial.y - bloodLevel))) * step(0.001, bloodFill) * step(bloodFill, 0.999) * bloodPool;
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.1, 0.12), bloodSurface * 0.45);`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance = mix(totalEmissiveRadiance * bloodRed * (1.0 - bloodAbove), emissive * vec3(0.3, 0.006, 0.025), bloodBelow);`);
    };
    glowMaterials.push(material);
    return material;
  }
  // Drops of blood falling into the vial from above, in world space like the light. Each falls from where it was let
  // go and is drawn in over the last of its fall, so the stream lands in the glass.
  const DROPS = 24;
  const dropMaterial = new THREE.MeshPhysicalMaterial({ color: 0x5c0410, roughness: 0.12, clearcoat: 1, emissive: 0x3a0008, emissiveIntensity: 0.8 });
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), dropMaterial, DROPS);
  drops.frustumCulled = false;
  drops.count = 0;
  const falling = [];
  const mouth = new THREE.Vector3(), dropMatrix = new THREE.Matrix4(), dropScale = new THREE.Vector3(), noTurn = new THREE.Quaternion();
  let spawn = 0;
  // `from` is where the blood leaves the skin, or null once it stops; drops already falling still land.
  function pour(from, dt) {
    group.updateWorldMatrix(true, false);
    group.localToWorld(mouth.set(0, 0.45, 0));
    if (from && dt > 0) {
      spawn += dt * 18;
      for (; spawn >= 1; spawn--) if (falling.length < DROPS) falling.push({ p: from.clone().add(new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).multiplyScalar(0.003)), v: 0.15 + Math.random() * 0.1, size: 0.0021 + Math.random() * 0.0014 });
    } else spawn = 0;
    for (let i = falling.length - 1; i >= 0; i--) {
      const drop = falling[i];
      drop.v += 9.8 * dt;
      drop.p.y -= drop.v * dt;
      const k = 1 - Math.exp(-dt * 9);
      drop.p.x += (mouth.x - drop.p.x) * k;
      drop.p.z += (mouth.z - drop.p.z) * k;
      if (drop.p.y < mouth.y) falling.splice(i, 1);
    }
    for (const [i, drop] of falling.entries()) {
      // Stretched along the fall the faster it goes.
      drops.setMatrixAt(i, dropMatrix.compose(drop.p, noTurn, dropScale.set(drop.size, drop.size * (1 + drop.v * 2.2), drop.size)));
    }
    drops.count = falling.length;
    drops.instanceMatrix.needsUpdate = true;
    drops.visible = falling.length > 0;
  }
  function setModel(scene) {
    model = scene;
    for (const mesh of [shell, rim, blood, bail]) mesh.visible = false;
    model.scale.setScalar(2.8);
    model.position.set(0, 1.18, 0);
    const source = scene.getObjectByName('HeartPendant') ?? scene;
    source.traverse(object => { if (object.isMesh) object.material = vialMaterial(object.material, true); });
    const found = scene.getObjectByName('Clasp');
    if (found) {
      found.removeFromParent();
      clasp = found;
      clasp.material = vialMaterial(found.material, false);
      clasp.scale.setScalar(2.8);
      clasp.visible = false;
      group.add(clasp);
    }
    group.add(model);
  }
  return {
    group,
    light,
    drops,
    pour,
    stopPour() { falling.length = 0; drops.count = 0; drops.visible = false; },
    setModel,
    setChainEndpoints,
    setFill(value) { fill.value = THREE.MathUtils.clamp(value, 0, 1); blood.visible = !model && value > 0; },
    // 0 … 1: the blood inside lit from within, beating slowly.
    setGlow(value) { glow = value; },
    update(time) {
      const beat = Math.pow(Math.max(0, Math.sin(time * 4.8)), 5);
      bloodMaterial.emissive.lerpColors(dim, lit, glow);
      bloodMaterial.emissiveIntensity = 0.15 + beat * 0.16 + glow * (1.1 + beat * 0.5);
      for (const material of glowMaterials) {
        // The map gives the colour; the blood is dark in it, and lit from within it reads as the red it is.
        material.emissiveIntensity = 0.55 + beat * 0.08 + glow * (0.6 + beat * 0.5);
      }
      group.updateWorldMatrix(true, false);
      light.position.copy(lightOffset).applyMatrix4(group.matrixWorld);
      light.intensity = group.visible && model ? 0.1 : 0;
    },
    dispose() {
      group.traverse(object => { if (object.isMesh) object.geometry.dispose(); });
      light.removeFromParent();
      drops.removeFromParent(); drops.geometry.dispose(); dropMaterial.dispose(); drops.dispose();
      silver.dispose(); glass.dispose(); bloodMaterial.dispose();
      for (const material of glowMaterials) { material.map?.dispose(); material.normalMap?.dispose(); material.roughnessMap?.dispose(); material.metalnessMap?.dispose(); material.dispose(); }
    },
  };
}
