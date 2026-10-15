import * as THREE from 'three';

export function createAtmosphere() {
  const group = new THREE.Group();
  const origin = new THREE.Vector3(-5.1, 5.9, -0.5);
  const destination = new THREE.Vector3(-1.4, 0.4, -3.8);
  const direction = origin.clone().sub(destination);
  const beamMaterial = new THREE.ShaderMaterial({
    uniforms: { tint: { value: new THREE.Color(0xaccce9) } },
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 vWorld,vNormal;varying vec2 vUv;void main(){vUv=uv;vWorld=(modelMatrix*vec4(position,1.)).xyz;vNormal=mat3(modelMatrix)*normal;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`,
    fragmentShader: `varying vec3 vWorld,vNormal;varying vec2 vUv;uniform vec3 tint;void main(){float facing=abs(dot(normalize(vNormal),normalize(cameraPosition-vWorld)));float fade=sin(vUv.y*3.14159265);gl_FragColor=vec4(tint,pow(facing,3.)*fade*fade*.022);}`,
  });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(1.6, direction.length(), 32, 1, true), beamMaterial);
  beam.position.addVectors(origin, destination).multiplyScalar(0.5);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  group.add(beam);
  const positions = new Float32Array(60 * 3);
  let seed = 121;
  const random = () => ((seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) / 4294967296);
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] = random() * 4 - 2;
    positions[i + 1] = random() * 3.5 + 0.3;
    positions[i + 2] = random() * 7 - 5;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const dust = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xd0e2ee, size: 0.008, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending }));
  group.add(dust);
  return { group, update(time) { dust.position.y = Math.sin(time * 0.17) * 0.035; } };
}
