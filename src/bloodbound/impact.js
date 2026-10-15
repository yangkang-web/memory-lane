export function createImpact(THREE, options = {}) {
  const T = THREE;
  const group = new T.Group();
  group.name = 'Chiselled limestone impact';
  const origin = new T.Vector3(...(options.position || [-3.3, 1.25, -2.2]));
  const count = options.count || 62;
  let seed = 713;
  const random = () => ((seed = Math.imul(1664525, seed) + 1013904223 >>> 0) / 4294967296);
  const geometry = new T.IcosahedronGeometry(1, 0);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
    const wear = .83 + .13 * Math.sin(x * 23.3 + y * 18.1 + z * 8.7);
    position.setXYZ(i, x * wear, y * wear, z * wear);
  }
  geometry.computeVertexNormals();
  const material = options.material?.clone() || new T.MeshStandardMaterial({ color: '#777d80', roughness: .96 });
  if (options.material) {
    material.onBeforeCompile = options.material.onBeforeCompile;
    material.customProgramCacheKey = options.material.customProgramCacheKey;
  }
  material.color.multiplyScalar(.9);
  const pieces = new T.InstancedMesh(geometry, material, count);
  pieces.name = 'Stone chips and splinters';
  pieces.instanceMatrix.setUsage(T.DynamicDrawUsage);
  pieces.castShadow = true;
  pieces.receiveShadow = true;
  pieces.frustumCulled = false;
  group.add(pieces);
  const particles = Array.from({ length: count }, (_, i) => {
    const scale = i < 8 ? .075 + random() * .09 : .012 + random() * .047;
    return {
      offset: new T.Vector3((random() - .5) * .42, (random() - .5) * .9, (random() - .5) * .48),
      velocity: new T.Vector3((random() - .5) * 3, 1.0 + random() * 3.4, (random() - .2) * 3.8),
      spin: new T.Vector3(random() * 5 - 2.5, random() * 5 - 2.5, random() * 5 - 2.5),
      initialRotation: new T.Vector3(random() * 6, random() * 6, random() * 6),
      scale: new T.Vector3(scale, scale * (.3 + random() * .45), scale * (.5 + random() * .5)),
    };
  });
  const dustGeometry = new T.BufferGeometry();
  const dustPositions = new Float32Array(84 * 3);
  dustGeometry.setAttribute('position', new T.BufferAttribute(dustPositions, 3));
  const dustData = Array.from({ length: 84 }, () => new T.Vector3((random() - .5) * 2.2, random() * 1.2, (random() - .5) * 2.1));
  const dustMaterial = new T.PointsMaterial({ color: '#9ca7ac', size: .12, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true });
  dustMaterial.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
      float radius = distance(gl_PointCoord, vec2(0.5));
      diffuseColor.a *= (1.0 - smoothstep(0.1, 0.5, radius)) * 0.38;
      #include <opaque_fragment>
    `);
  };
  const dust = new T.Points(dustGeometry, dustMaterial);
  dust.frustumCulled = false;
  group.add(dust);
  let start = Infinity;
  let settled = false;
  const force = new T.Vector3();
  const dummy = new T.Object3D();
  group.visible = false;

  function update(time) {
    if (start === Infinity) return;
    const elapsed = Math.max(0, time - start);
    group.visible = time >= start;
    if (!group.visible) return;
    if (settled && elapsed > 4) return;
    particles.forEach((particle, i) => {
      const p = origin.clone().add(particle.offset);
      const velocity = particle.velocity.clone().add(force);
      const floor = particle.scale.y * .7 + .012;
      const hit = (velocity.y + Math.sqrt(velocity.y ** 2 + 19.62 * Math.max(0, p.y - floor))) / 9.81;
      const flight = Math.min(elapsed, hit);
      dummy.position.copy(p).addScaledVector(velocity, flight);
      dummy.position.y -= 4.905 * flight * flight;
      if (elapsed > hit) {
        const after = elapsed - hit;
        const slide = (1 - Math.exp(-after * 3)) / 3;
        dummy.position.x += velocity.x * slide * .25;
        dummy.position.z += velocity.z * slide * .25;
        dummy.position.y = floor + Math.abs(Math.sin(after * 9)) * .065 * Math.exp(-after * 5);
      }
      const spinTime = Math.min(elapsed, hit + .3);
      dummy.rotation.set(particle.initialRotation.x + particle.spin.x * spinTime, particle.initialRotation.y + particle.spin.y * spinTime, particle.initialRotation.z + particle.spin.z * spinTime);
      dummy.scale.copy(particle.scale);
      dummy.updateMatrix();
      pieces.setMatrixAt(i, dummy.matrix);
    });
    pieces.instanceMatrix.needsUpdate = true;
    dust.visible = elapsed < 3.8;
    dustMaterial.opacity = Math.min(1, elapsed * 7) * Math.exp(-elapsed * 1.5) * .35;
    dustData.forEach((velocity, i) => {
      const spread = Math.pow(elapsed, .63);
      dustPositions[i * 3] = origin.x + velocity.x * spread;
      dustPositions[i * 3 + 1] = origin.y + velocity.y * spread - elapsed * .1;
      dustPositions[i * 3 + 2] = origin.z + velocity.z * spread;
    });
    dustGeometry.attributes.position.needsUpdate = true;
    settled = elapsed > 4;
  }

  return {
    group,
    trigger(time = 0, direction = [-1, 0, 0]) {
      start = time;
      settled = false;
      force.set(...direction).multiplyScalar(.7);
      update(time);
    },
    update,
    reset() { start = Infinity; settled = false; group.visible = false; },
    dispose() { geometry.dispose(); material.dispose(); dustGeometry.dispose(); dustMaterial.dispose(); group.clear(); },
  };
}
