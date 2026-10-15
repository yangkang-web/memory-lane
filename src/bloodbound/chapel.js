import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createImpact } from './impact.js';

export function createChapel(THREE, options = {}) {
  const T = THREE;
  const group = new T.Group();
  group.name = 'Bloodbound · Saintless chapel';
  const batches = new Map();
  const pillarBatches = new Map();
  let activeBatches = batches;
  let assemblyMatrix = null;
  let disposed = false;
  const materials = new Set();
  const textures = new Set();
  const metersPerTile = { stone: 1, wall: 2, floor: 1.5, ...options.metersPerTile };
  const V = (x, y, z = 0) => new T.Vector3(x, y, z);
  // The doorway in the east wall, the passage beyond it and the door at its end, in world metres (see layout.js).
  const DOOR = { z: -4.45, width: 1.6, spring: 2.3, rise: .85 };
  const END = { width: 1.1, spring: 1.95, rise: .5 };
  const PASSAGE_END = 12.75;
  let seed = 14831;
  const random = () => ((seed = Math.imul(1664525, seed) + 1013904223 >>> 0) / 4294967296);

  function texture(width, height, paint) {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return null;
    paint(context, width, height);
    const result = new T.CanvasTexture(canvas);
    result.colorSpace = T.SRGBColorSpace;
    result.wrapS = result.wrapT = T.RepeatWrapping;
    result.anisotropy = 4;
    textures.add(result);
    return result;
  }

  const stoneMap = texture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#aaaead';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 80; i++) {
      const x = random() * w, y = random() * h, radius = 10 + random() * 100;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, i % 3 ? 'rgba(37,49,53,.012)' : 'rgba(229,226,208,.025)');
      gradient.addColorStop(1, 'rgba(100,110,110,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    for (let i = 0; i < 32000; i++) {
      ctx.fillStyle = i % 3 ? 'rgba(17,28,31,.065)' : 'rgba(247,247,231,.09)';
      const radius = .25 + random() * .8;
      ctx.fillRect(random() * w, random() * h, radius, radius);
    }
    ctx.lineWidth = .5;
    ctx.strokeStyle = 'rgba(47,56,60,.045)';
    for (let i = 0; i < 12; i++) {
      let x = random() * w, y = random() * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let j = 0; j < 5; j++) {
        x += random() * 22 - 11;
        y += random() * 13;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  });

  const stoneRelief = texture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#858585';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 30000; i++) {
      const value = 100 + Math.floor(random() * 60);
      ctx.fillStyle = `rgb(${value},${value},${value})`;
      const size = .3 + random() * 1.1;
      ctx.fillRect(random() * w, random() * h, size, size);
    }
    for (let i = 0; i < 110; i++) {
      ctx.fillStyle = 'rgba(32,32,32,.16)';
      ctx.beginPath();
      ctx.ellipse(random() * w, random() * h, .4 + random() * .8, .2 + random() * .5, random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  if (stoneRelief) stoneRelief.colorSpace = T.NoColorSpace;

  const wallMap = texture(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#737a7c';
    ctx.fillRect(0, 0, w, h);
    for (let row = 0; row < 10; row++) {
      for (let col = -1; col < 5; col++) {
        const x = col * 256 + (row % 2) * 128, y = row * 102.4;
        const value = 137 + Math.floor(random() * 8);
        ctx.fillStyle = `rgb(${value},${value + 6},${value + 8})`;
        ctx.fillRect(x + 1.1, y + 1.1, 253.8, 100.2);
        ctx.fillStyle = 'rgba(226,231,226,.06)';
        ctx.fillRect(x + 2, y + 2, 251, .7);
      }
    }
    for (let i = 0; i < 20000; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(11,23,29,.045)' : 'rgba(235,232,209,.07)';
      ctx.fillRect(random() * w, random() * h, 1 + random() * 2, 1 + random() * 2);
    }
    for (let i = 0; i < 70; i++) {
      const x = random() * w, y = random() * h, length = 20 + random() * 170;
      const streak = ctx.createLinearGradient(0, y, 0, y + length);
      streak.addColorStop(0, 'rgba(45,53,51,.055)');
      streak.addColorStop(1, 'rgba(45,53,51,0)');
      ctx.fillStyle = streak;
      ctx.fillRect(x, y, 1 + random() * 5, length);
    }
  });

  const glassMap = texture(256, 768, (ctx, w, h) => {
    ctx.fillStyle = '#101f2c';
    ctx.fillRect(0, 0, w, h);
    const colors = ['#3e586c', '#354d61', '#4d6274', '#2c455b', '#3a5161', '#586469'];
    for (let row = -1; row < 36; row++) {
      for (let col = -1; col < 13; col++) {
        const x = col * 24 + (row % 2) * 12, y = row * 24;
        ctx.beginPath();
        ctx.moveTo(x, y - 21);
        ctx.lineTo(x + 11.5, y);
        ctx.lineTo(x, y + 21);
        ctx.lineTo(x - 11.5, y);
        ctx.closePath();
        ctx.fillStyle = colors[Math.floor(random() * colors.length)];
        ctx.fill();
        ctx.strokeStyle = '#172b39';
        ctx.lineWidth = .75;
        ctx.stroke();
      }
    }
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(225,234,237,.045)' : 'rgba(5,21,37,.09)';
      ctx.fillRect(random() * w, random() * h, 1, 2);
    }
    ctx.strokeStyle = '#57707e';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(w / 2, 35);
    ctx.lineTo(w / 2, h - 35);
    ctx.stroke();
    for (const y of [160, 350, 540]) {
      for (let petal = 0; petal < 4; petal++) {
        ctx.save();
        ctx.translate(w / 2, y);
        ctx.rotate(petal * Math.PI / 2);
        ctx.beginPath();
        ctx.ellipse(0, -24, 13, 27, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  });

  function material(options) {
    const result = new T.MeshStandardMaterial(options);
    materials.add(result);
    return result;
  }

  const stone = material({ color: '#9aa5ac', map: stoneMap, bumpMap: stoneRelief, bumpScale: .004, roughness: .89 });
  const paleStone = material({ color: '#b4b9b9', map: stoneMap, bumpMap: stoneRelief, bumpScale: .003, roughness: .83 });
  const shadowStone = material({ color: '#626e76', map: stoneMap, roughness: .93 });
  const wall = material({ color: '#8f9aa2', map: wallMap, bumpMap: wallMap, bumpScale: .006, roughness: .94, side: T.DoubleSide });
  const ceiling = material({ color: '#434f58', map: wallMap, roughness: .98, side: T.DoubleSide });
  const mortar = material({ color: '#3b454b', roughness: 1 });
  const metal = material({ color: '#44515a', metalness: .65, roughness: .61 });
  const glass = material({
    color: '#7999b0', map: glassMap, emissive: '#a5c8e6', emissiveMap: glassMap,
    emissiveIntensity: .24, roughness: .45, metalness: .12, side: T.DoubleSide,
  });
  const floors = ['#6f797e', '#747d81', '#717b81', '#788086'].map(color => material({
    color, map: stoneMap, bumpMap: stoneRelief, bumpScale: .003, roughness: .7, metalness: .035,
  }));
  const surfaceGroups = { stone: [stone, paleStone, shadowStone], wall: [wall, ceiling], floor: floors };
  for (const [kind, targets] of Object.entries(surfaceGroups)) {
    const source = options.textures?.[kind];
    const maps = {};
    for (const key of ['map', 'normalMap', 'roughnessMap', 'aoMap']) {
      if (!source?.[key]) continue;
      maps[key] = source[key].clone();
      maps[key].wrapS = maps[key].wrapT = T.RepeatWrapping;
      maps[key].colorSpace = key === 'map' ? T.SRGBColorSpace : T.NoColorSpace;
      maps[key].anisotropy = 4;
      maps[key].needsUpdate = true;
      textures.add(maps[key]);
    }
    for (const mat of targets) {
      mat.userData.surface = kind;
      Object.assign(mat, maps);
      if (maps.normalMap) {
        mat.bumpMap = null;
        mat.normalScale.setScalar(kind === 'wall' ? .65 : .5);
      }
      if (maps.aoMap) mat.aoMapIntensity = .65;
      if (maps.map) {
        if (kind === 'floor') mat.color.set('#adb5ba');
        else if (mat === ceiling) mat.color.set('#8e9aa1');
        else if (mat === shadowStone) mat.color.set('#858f95');
        else if (mat === paleStone) mat.color.set('#c8ced0');
        else if (kind === 'wall') mat.color.set('#aab5bc');
        else mat.color.set('#bac0c3');
        mat.onBeforeCompile = shader => {
          const sample = T.ShaderChunk.map_fragment.replace('diffuseColor *= sampledDiffuseColor;', `
            float limestoneLuma = dot(sampledDiffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
            sampledDiffuseColor.rgb = mix(vec3(limestoneLuma), sampledDiffuseColor.rgb, 0.18);
            diffuseColor *= sampledDiffuseColor;
          `);
          shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', sample);
        };
        mat.customProgramCacheKey = () => 'bloodbound-limestone-saturation-018';
      }
      mat.needsUpdate = true;
    }
  }
  const contactMap = texture(128, 128, (ctx, w, h) => {
    const shadow = ctx.createRadialGradient(w / 2, h / 2, 9, w / 2, h / 2, w / 2);
    shadow.addColorStop(0, 'rgba(5,10,14,.7)');
    shadow.addColorStop(.4, 'rgba(5,10,14,.46)');
    shadow.addColorStop(.67, 'rgba(5,10,14,.14)');
    shadow.addColorStop(1, 'rgba(5,10,14,0)');
    ctx.fillStyle = shadow;
    ctx.fillRect(0, 0, w, h);
  });
  const contactMaterial = new T.MeshBasicMaterial({
    map: contactMap, color: '#17212a', transparent: true, opacity: .65,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  });
  materials.add(contactMaterial);
  const patinaMap = texture(256, 512, (ctx, w, h) => {
    for (let i = 0; i < 70; i++) {
      const x = random() * w, start = random() * h * .35, length = h * (.35 + random() * .6);
      const line = ctx.createLinearGradient(0, start, 0, start + length);
      line.addColorStop(0, 'rgba(65,71,66,0)');
      line.addColorStop(.18, `rgba(65,71,66,${.03 + random() * .11})`);
      line.addColorStop(1, 'rgba(65,71,66,0)');
      ctx.fillStyle = line;
      ctx.fillRect(x, start, 1 + random() * 8, length);
    }
    const damp = ctx.createRadialGradient(w / 2, h * 1.04, 12, w / 2, h * 1.04, h * .65);
    damp.addColorStop(0, 'rgba(37,47,43,.52)');
    damp.addColorStop(.45, 'rgba(42,50,46,.21)');
    damp.addColorStop(1, 'rgba(42,50,46,0)');
    ctx.fillStyle = damp;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'destination-in';
    const edge = ctx.createLinearGradient(0, 0, w, 0);
    edge.addColorStop(0, 'rgba(0,0,0,0)');
    edge.addColorStop(.15, '#000');
    edge.addColorStop(.85, '#000');
    edge.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, w, h);
  });
  const patina = material({map:patinaMap, color:'#69716c', transparent:true, opacity:.38, depthWrite:false, roughness:1, polygonOffset:true, polygonOffsetFactor:-1, polygonOffsetUnits:-1});

  function add(geometry, mat, position = V(0, 0, 0), rotation = null, scale = null) {
    const quaternion = new T.Quaternion();
    if (rotation) quaternion.setFromEuler(new T.Euler(...rotation));
    geometry.applyMatrix4(new T.Matrix4().compose(position, quaternion, scale || V(1, 1, 1)));
    if (assemblyMatrix) geometry.applyMatrix4(assemblyMatrix);
    const items = activeBatches.get(mat) || [];
    items.push(geometry);
    activeBatches.set(mat, items);
  }

  function box(w, h, d, mat, x, y, z, rotation = null) {
    const geometry = new T.BoxGeometry(w, h, d);
    const positions = geometry.attributes.position, normals = geometry.attributes.normal;
    const scale = metersPerTile[mat.userData.surface] || 1;
    const uvs = [];
    for (let i = 0; i < positions.count; i++) {
      const axisX = Math.abs(normals.getX(i)) > .5, axisY = Math.abs(normals.getY(i)) > .5;
      const u = axisX ? positions.getZ(i) + z : positions.getX(i) + x;
      const v = axisY ? -positions.getZ(i) - z : positions.getY(i) + y;
      uvs.push(u / scale, v / scale);
    }
    geometry.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
    add(geometry, mat, V(x, y, z), rotation);
  }

  function cylinder(top, bottom, h, mat, x, y, z, segments = 16) {
    const geometry = new T.CylinderGeometry(top, bottom, h, segments);
    const uvs = geometry.attributes.uv;
    const scale = metersPerTile[mat.userData.surface] || 1;
    for (let i = 0; i < uvs.count; i++) uvs.setXY(i, uvs.getX(i) * Math.PI * (top + bottom) / scale, uvs.getY(i) * h / scale);
    add(geometry, mat, V(x, y, z));
  }

  function carvedBox(w, h, d, mat, x, y, z, edge = .012) {
    const shape = new T.Shape();
    shape.moveTo(-w / 2 + edge, -h / 2 + edge);
    shape.lineTo(w / 2 - edge, -h / 2 + edge);
    shape.lineTo(w / 2 - edge, h / 2 - edge);
    shape.lineTo(-w / 2 + edge, h / 2 - edge);
    shape.closePath();
    const geometry = new T.ExtrudeGeometry(shape, {
      depth: d - edge * 2, bevelEnabled: true, bevelSize: edge,
      bevelThickness: edge, bevelSegments: 1, steps: 1,
    });
    geometry.translate(0, 0, -d / 2 + edge);
    const wornPositions = geometry.attributes.position;
    for (let i = 0; i < wornPositions.count; i++) {
      const px = wornPositions.getX(i), py = wornPositions.getY(i), pz = wornPositions.getZ(i);
      const edgeCount = Number(Math.abs(px) > w / 2 - edge * 1.2) + Number(Math.abs(py) > h / 2 - edge * 1.2) + Number(Math.abs(pz) > d / 2 - edge * 1.2);
      if (edgeCount < 2) continue;
      const wear = Math.sin((px + x) * 37.7 + (py + y) * 29.3 + (pz + z) * 43.1) * edge * .22;
      wornPositions.setXYZ(i, px - Math.sign(px) * Math.abs(wear), py + wear * .4, pz - Math.sign(pz) * Math.abs(wear));
    }
    geometry.computeVertexNormals();
    const positions = geometry.attributes.position, normals = geometry.attributes.normal, uvs = [];
    for (let i = 0; i < positions.count; i++) {
      const u = Math.abs(normals.getX(i)) > .6 ? positions.getZ(i) + z : positions.getX(i) + x;
      const v = Math.abs(normals.getY(i)) > .6 ? -positions.getZ(i) - z : positions.getY(i) + y;
      const scale = metersPerTile[mat.userData.surface] || 1;
      uvs.push(u / scale, v / scale);
    }
    geometry.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
    add(geometry, mat, V(x, y, z));
  }

  function lathe(profile, mat, x, z, scale = 1, segments = 24) {
    const points = profile.map(([radius, height]) => new T.Vector2(radius * scale, height));
    const geometry = new T.LatheGeometry(points, segments);
    const uvs = geometry.attributes.uv, tileScale = metersPerTile[mat.userData.surface] || 1;
    const radius = Math.max(...profile.map(point => point[0])) * scale;
    const height = profile.at(-1)[1] - profile[0][1];
    for (let i = 0; i < uvs.count; i++) uvs.setXY(i, uvs.getX(i) * radius * Math.PI * 2 / tileScale, uvs.getY(i) * height / tileScale);
    add(geometry, mat, V(x, 0, z));
  }

  function carvedLeaf(x, y, z, angle, height = .24, width = .12) {
    const vertices = [], uv = [], indices = [];
    for (let row = 0; row <= 8; row++) {
      const t = row / 8;
      const spread = Math.sin(Math.PI * t) * width / 2;
      const outward = Math.sin(t * Math.PI * .85) * .062;
      const curled = t > .78 ? (t - .78) * .12 : 0;
      for (let col = 0; col < 3; col++) {
        const cross = col - 1;
        vertices.push(cross * spread, t * height - curled, outward + (col === 1 ? .014 : 0));
        uv.push(col / 2 * width, t * height);
      }
      if (row < 8) {
        for (let col = 0; col < 2; col++) {
          const n = row * 3 + col;
          indices.push(n, n + 1, n + 3, n + 1, n + 4, n + 3);
        }
      }
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    add(geometry, paleStone, V(x, y, z), [0, angle, 0]);
  }

  function tube(points, radius, mat = stone, segments = 44, radial = 6) {
    const curve = new T.CatmullRomCurve3(points, false, 'centripetal');
    const geometry = new T.TubeGeometry(curve, segments, radius, radial, false);
    const uvs = geometry.attributes.uv, scale = metersPerTile[mat.userData.surface] || 1;
    const length = curve.getLength();
    for (let i = 0; i < uvs.count; i++) uvs.setXY(i, uvs.getX(i) * length / scale, uvs.getY(i) * Math.PI * 2 * radius / scale);
    add(geometry, mat);
  }

  function mouldedRib(points, size = .1) {
    const path = new T.CatmullRomCurve3(points, false, 'centripetal');
    const profile = new T.Shape([
      [-1.28,-.42],[-1.28,.05],[-.88,.05],[-.67,.42],[-.36,.42],[-.2,.82],
      [.2,.82],[.36,.42],[.67,.42],[.88,.05],[1.28,.05],[1.28,-.42],
    ].map(([x, y]) => new T.Vector2(x * size, y * size)));
    const geometry = new T.ExtrudeGeometry(profile, {extrudePath:path, steps:90, bevelEnabled:false, curveSegments:1});
    const positions = geometry.attributes.position, normals = geometry.attributes.normal, uvs = [];
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
      uvs.push((Math.abs(normals.getZ(i)) > .5 ? x : z) / metersPerTile.stone, y / metersPerTile.stone);
    }
    geometry.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
    add(geometry, stone);
  }

  function contactShadow(x, z, width, depth) {
    add(new T.PlaneGeometry(width, depth), contactMaterial, V(x, .012, z), [-Math.PI / 2, 0, 0]);
  }

  function archPoints(x, base, width, rise, z, count = 32) {
    const points = [];
    for (let i = 0; i <= count; i++) {
      const angle = Math.PI - (Math.PI / 3) * (i / count);
      points.push(V(x + width / 2 + width * Math.cos(angle), base + width * Math.sin(angle) * rise / (width * Math.sqrt(3) / 2), z));
    }
    for (let i = 1; i <= count; i++) {
      const angle = Math.PI / 3 * (1 - i / count);
      points.push(V(x - width / 2 + width * Math.cos(angle), base + width * Math.sin(angle) * rise / (width * Math.sqrt(3) / 2), z));
    }
    return points;
  }

  function outline(x, bottom, spring, width, rise, z) {
    return [V(x - width / 2, bottom, z), ...archPoints(x, spring, width, rise, z), V(x + width / 2, bottom, z)];
  }

  function pointedShape(x, bottom, spring, width, rise) {
    const points = outline(x, bottom, spring, width, rise, 0);
    return new T.Shape(points.map(point => new T.Vector2(point.x, point.y)));
  }

  function archRecess(x, bottom, spring, width, rise, z, border = .16) {
    const shape = pointedShape(x, bottom - border, spring, width + border * 2, rise + border * 1.15);
    const hole = new T.Path(outline(x, bottom, spring, width, rise, 0).map(point => new T.Vector2(point.x, point.y)));
    shape.holes.push(hole);
    const geometry = new T.ExtrudeGeometry(shape, {depth:.13, bevelEnabled:true, bevelSize:.009, bevelThickness:.007, bevelSegments:1, curveSegments:24});
    const uvs = geometry.attributes.uv;
    for (let i = 0; i < uvs.count; i++) uvs.setXY(i, uvs.getX(i) / metersPerTile.stone, uvs.getY(i) / metersPerTile.stone);
    add(geometry, stone, V(0, 0, z));
  }

  function windowPanel(x, bottom, spring, width, rise, z) {
    const geometry = new T.ShapeGeometry(pointedShape(x, bottom, spring, width, rise), 24);
    const position = geometry.attributes.position;
    const uvs = [];
    for (let i = 0; i < position.count; i++) {
      uvs.push((position.getX(i) - x + width / 2) / width, (position.getY(i) - bottom) / (spring + rise - bottom));
    }
    geometry.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
    add(geometry, glass, V(0, 0, z));
    archRecess(x, bottom, spring, width, rise, z + .27);
    for (let layer = 0; layer < 3; layer++) {
      tube(outline(x, bottom - .04, spring, width + layer * .13, rise + layer * .07, z + .36 + layer * .035), layer === 2 ? .045 : .038, layer === 1 ? shadowStone : stone, 72);
    }
    carvedBox(width + .34, .14, .34, paleStone, x, bottom - .09, z + .31);
    carvedBox(width + .43, .07, .4, stone, x, bottom - .18, z + .31, .008);
    for (const y of [bottom + .65, bottom + 1.4, bottom + 2.15]) {
      if (y < spring) box(width, .025, .035, metal, x, y, z + .02);
    }
    for (const side of [-1, 1]) tube(outline(x + side * width * .235, bottom + .03, spring - .72, width * .43, .52, z + .44), .019, stone, 64, 7);
    const rosette = [];
    for (let i = 0; i <= 80; i++) {
      const angle = i / 80 * Math.PI * 2;
      const radius = width * (.195 + .035 * Math.cos(angle * 4));
      rosette.push(V(x + Math.sin(angle) * radius, spring + .29 + Math.cos(angle) * radius, z + .445));
    }
    tube(rosette, .022, paleStone, 80, 7);
  }

  function column(x, z, spring = 3.65, scale = 1) {
    const s = scale * .86;
    contactShadow(x, z, 1.7 * s, 1.7 * s);
    carvedBox(.91 * s, .15, .91 * s, shadowStone, x, .075, z, .018);
    carvedBox(.85 * s, .09, .85 * s, stone, x, .195, z, .013);
    lathe([[.44,.24],[.44,.27],[.42,.285],[.41,.3],[.41,.33],[.38,.35],[.37,.375],[.37,.4],[.35,.415],[.31,.45],[.3,.47],[.31,.49],[.31,.515],[.29,.54]], paleStone, x, z, s);
    const courseCount = Math.ceil((spring - .9) / .54);
    const courseHeight = (spring - .9) / courseCount;
    for (let course = 0; course < courseCount; course++) {
      const base = .54 + course * courseHeight;
      const radius = .278 - course / courseCount * .012;
      lathe([[radius - .004,base+.002],[radius,base+.012],[radius,base+courseHeight-.009],[radius-.003,base+courseHeight-.002]], stone, x, z, s, 24);
    }
    for (let k = 0; k < 6; k++) {
      const angle = k * Math.PI / 3;
      const px = x + Math.sin(angle) * .268 * s;
      const pz = z + Math.cos(angle) * .268 * s;
      cylinder(.074 * s, .087 * s, spring - .94, stone, px, (spring + .15) / 2, pz, 12);
      lathe([[.12,.49],[.124,.515],[.12,.54],[.102,.555],[.096,.58],[.087,.6]], paleStone, px, pz, s, 12);
      lathe([[.077,spring-.46],[.086,spring-.43],[.087,spring-.405],[.105,spring-.38],[.13,spring-.32]], stone, px, pz, s, 12);
    }
    lathe([[.285,spring-.46],[.3,spring-.43],[.3,spring-.395],[.32,spring-.37],[.36,spring-.18],[.39,spring-.14],[.39,spring-.11],[.42,spring-.075],[.42,spring-.035]], stone, x, z, s);
    for (let leaf = 0; leaf < 12; leaf++) {
      const angle = leaf / 12 * Math.PI * 2;
      carvedLeaf(x + Math.sin(angle) * .318 * s, spring - .38, z + Math.cos(angle) * .318 * s, angle, .22, .13 * s);
      if (leaf % 2 === 0) carvedLeaf(x + Math.sin(angle + .24) * .342 * s, spring - .27, z + Math.cos(angle + .24) * .342 * s, angle + .24, .15, .105 * s);
    }
    carvedBox(.88 * s, .09, .88 * s, paleStone, x, spring + .02, z, .014);
    carvedBox(.94 * s, .055, .94 * s, stone, x, spring + .095, z, .01);
  }

  box(12.4, .13, 16.5, mortar, 0, -.11, -.3);
  if (options.textures?.floor?.map) {
    const floorGeometry = new T.PlaneGeometry(12.4, 16.5, 20, 26);
    floorGeometry.rotateX(-Math.PI / 2);
    const positions = floorGeometry.attributes.position, uvs = [];
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), z = positions.getZ(i) - .3;
      positions.setXYZ(i, x, .003 + Math.sin(x * 2.1 + z * .67) * .001, z);
      uvs.push(x / metersPerTile.floor, -z / metersPerTile.floor);
    }
    floorGeometry.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
    floorGeometry.computeVertexNormals();
    add(floorGeometry, floors[0]);
  } else {
    const tile = .83;
    for (let row = 0; row < 19; row++) {
      for (let col = 0; col < 14; col++) {
        const x = (col - 6.5) * tile;
        const z = (row - 9) * tile - .6;
        carvedBox(tile - .006, .06, tile - .006, floors[Math.floor(random() * floors.length)], x, -.024 + random() * .0015, z, .004);
      }
    }
  }
  for (const x of options.textures?.floor?.map ? [] : [-2.35, 2.35]) {
    box(.035, .004, 14.8, shadowStone, x, .008, -.6);
    box(.012, .004, 14.8, paleStone, x + .07, .008, -.6);
  }

  const rear = new T.Shape([new T.Vector2(-5.7, 0), new T.Vector2(5.7, 0), new T.Vector2(5.7, 8.1), new T.Vector2(-5.7, 8.1)]);
  for (const x of [-1.45, 0, 1.45]) {
    const hole = new T.Path(outline(x, 1.65, 5.3, 1.12, 1.01, 0).map(point => new T.Vector2(point.x, point.y)));
    rear.holes.push(hole);
    windowPanel(x, 1.65, 5.3, 1.12, 1.01, -7.42);
  }
  const rearGeometry = new T.ExtrudeGeometry(rear, { depth: .35, bevelEnabled: false, curveSegments: 12 });
  rearGeometry.deleteAttribute('uv');
  const rearPositions = rearGeometry.attributes.position;
  const rearUvs = [];
  for (let i = 0; i < rearPositions.count; i++) rearUvs.push(rearPositions.getX(i) / metersPerTile.wall, rearPositions.getY(i) / metersPerTile.wall);
  rearGeometry.setAttribute('uv', new T.Float32BufferAttribute(rearUvs, 2));
  add(rearGeometry, wall, V(0, 0, -7.5));
  for (const x of [-1.45, 0, 1.45]) add(new T.PlaneGeometry(1.6, 1.3), patina, V(x, .79, -7.139));
  box(11.5, .26, .48, shadowStone, 0, .14, -7.1);
  box(11.5, .11, .42, stone, 0, 1.08, -7.12);
  box(11.5, .075, .47, paleStone, 0, 1.17, -7.12);

  // The west wall closes the nave behind the player, with the door they came in by shut.
  const doorWood = material({ color: '#6a5442', map: wallMap, bumpMap: wallMap, bumpScale: .004, roughness: .82 });
  // The doorway is a notch in the outline rather than a hole, since a hole may not touch the edge.
  const front = new T.Shape([
    new T.Vector2(-5.7, 0), ...outline(0, 0, 2.55, 1.9, 1.15, 0).map(point => new T.Vector2(point.x, point.y)),
    new T.Vector2(5.7, 0), new T.Vector2(5.7, 8.1), new T.Vector2(-5.7, 8.1),
  ]);
  const frontGeometry = new T.ExtrudeGeometry(front, { depth: .35, bevelEnabled: false, curveSegments: 16 });
  const frontPositions = frontGeometry.attributes.position;
  const frontUvs = [];
  for (let i = 0; i < frontPositions.count; i++) frontUvs.push(frontPositions.getX(i) / metersPerTile.wall, frontPositions.getY(i) / metersPerTile.wall);
  frontGeometry.setAttribute('uv', new T.Float32BufferAttribute(frontUvs, 2));
  add(frontGeometry, wall, V(0, 0, 6.85));
  add(new T.ExtrudeGeometry(pointedShape(0, 0, 2.55, 1.9, 1.15), { depth: .08, bevelEnabled: false, curveSegments: 16 }), doorWood, V(0, 0, 7.02));
  box(.035, 3.6, .04, shadowStone, 0, 1.8, 7.0);
  for (const y of [.55, 1.45, 2.3]) box(1.86, .05, .03, metal, 0, y, 7.0);
  for (const side of [-1, 1]) box(.05, .32, .03, metal, side * .16, 1.15, 6.99);
  for (let layer = 0; layer < 3; layer++) tube(outline(0, 0, 2.55, 1.95 + layer * .14, 1.17 + layer * .07, 6.84 - layer * .03), layer === 2 ? .05 : .07, layer % 2 ? paleStone : stone, 64, 8);
  for (const x of [-1, 1]) {
    box(4.4, .26, .4, shadowStone, x * 3.32, .14, 6.82);
    box(4.4, .1, .36, stone, x * 3.32, 1.08, 6.83);
  }

  for (const side of [-1, 1]) {
    if (side === -1) {
      const flank = new T.Shape([new T.Vector2(-6.9,0),new T.Vector2(7.3,0),new T.Vector2(7.3,7.8),new T.Vector2(-6.9,7.8)]);
      flank.holes.push(new T.Path(outline(4.3,1.5,4.55,2.5,1.6,0).map(point=>new T.Vector2(point.x,point.y))));
      assemblyMatrix = new T.Matrix4().makeRotationY(Math.PI / 2).setPosition(-5.86,0,0);
      const flankGeometry = new T.ExtrudeGeometry(flank,{depth:.42,bevelEnabled:false,curveSegments:20});
      const positions = flankGeometry.attributes.position;
      const uvs = [];
      for(let i=0;i<positions.count;i++)uvs.push(positions.getX(i)/metersPerTile.wall,positions.getY(i)/metersPerTile.wall);
      flankGeometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
      add(flankGeometry,wall);
      windowPanel(4.3,1.5,4.55,2.5,1.6,.14);
      assemblyMatrix = null;
    } else {
      // The east wall with the doorway into the passage notched out of its foot.
      const flank = new T.Shape([new T.Vector2(-6.9,0), ...outline(-DOOR.z,0,DOOR.spring,DOOR.width,DOOR.rise,0).map(point=>new T.Vector2(point.x,point.y)), new T.Vector2(7.3,0),new T.Vector2(7.3,7.8),new T.Vector2(-6.9,7.8)]);
      assemblyMatrix = new T.Matrix4().makeRotationY(Math.PI / 2).setPosition(5.44,0,0);
      const flankGeometry = new T.ExtrudeGeometry(flank,{depth:.42,bevelEnabled:false,curveSegments:20});
      const positions = flankGeometry.attributes.position;
      const uvs = [];
      for(let i=0;i<positions.count;i++)uvs.push((positions.getX(i)+positions.getZ(i))/metersPerTile.wall,positions.getY(i)/metersPerTile.wall);
      flankGeometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
      add(flankGeometry,wall);
      assemblyMatrix = null;
    }
    // Plinth and moulding along the wall's foot, broken by the doorway on the east side.
    const runs = side === 1 ? [[-7.25, DOOR.z - DOOR.width / 2 - .12], [DOOR.z + DOOR.width / 2 + .12, 6.85]] : [[-7.25, 6.85]];
    for (const [from, to] of runs) {
      box(.64, .28, to - from, shadowStone, side * 5.5, .14, (from + to) / 2);
      box(.54, .1, to - from, stone, side * 5.51, 1.13, (from + to) / 2);
    }
    for (const z of [-6.7, -2.2, 2.3, 6.5]) column(side * 5.22, z, 4.5, .72);
    for (const z of side === 1 ? [.1, 4.4] : [-4.3, .1, 4.4]) add(new T.PlaneGeometry(2.8, 1.8), patina, V(side * 5.432, 1.1, z), [0, -side * Math.PI / 2, 0]);
  }

  const bayDepths = [-6.7, -2.2, 2.3];
  for (const z of bayDepths) {
    for (const side of [-1, 1]) {
      activeBatches = side === -1 && z === -2.2 ? pillarBatches : batches;
      column(side * 3.3, z, 3.65);
    }
    activeBatches = batches;
    mouldedRib(archPoints(0, 3.8, 6.6, 3.35, z), .125);
    for (const rib of [-1, 1]) tube(archPoints(0, 3.8, 6.6, 3.35, z + rib * .18), .038, paleStone, 90, 8);
    for (const side of [-1, 1]) {
      tube(archPoints(side * 4.25, 3.8, 1.7, 1.5, z), .09, stone, 52, 8);
      tube(archPoints(side * 4.25, 3.8, 1.94, 1.6, z + .12), .045, paleStone, 52);
    }
  }

  for (const [center, width, rise] of [[0,6.6,3.35],[-4.5,2.4,1.55],[4.5,2.4,1.55]]) {
    const vaultPoints = archPoints(center, 3.82, width, rise, 0, 48);
    const vaultVertices = [], vaultUvs = [], vaultIndices = [];
    let distance = 0;
    vaultPoints.forEach((point, i) => {
      if (i) distance += point.distanceTo(vaultPoints[i - 1]);
      vaultVertices.push(point.x, point.y, -7.15, point.x, point.y, 6.85);
      vaultUvs.push(distance / metersPerTile.wall, 0, distance / metersPerTile.wall, 14 / metersPerTile.wall);
      if (i < vaultPoints.length - 1) {
        const n = i * 2;
        vaultIndices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
      }
    });
    const vaultGeometry = new T.BufferGeometry();
    vaultGeometry.setAttribute('position', new T.Float32BufferAttribute(vaultVertices, 3));
    vaultGeometry.setAttribute('uv', new T.Float32BufferAttribute(vaultUvs, 2));
    vaultGeometry.setIndex(vaultIndices);
    vaultGeometry.computeVertexNormals();
    add(vaultGeometry, ceiling);
  }
  for (let i = 0; i < bayDepths.length - 1; i++) {
    const front = bayDepths[i + 1], back = bayDepths[i], mid = (front + back) / 2;
    for (const direction of [-1, 1]) {
      tube([V(-3.3 * direction, 3.8, front), V(-2.5 * direction, 5.7, front - .65), V(0, 7.14, mid), V(2.5 * direction, 5.7, back + .65), V(3.3 * direction, 3.8, back)], .068, stone, 64, 7);
    }
    cylinder(.18, .23, .09, paleStone, 0, 7.07, mid, 12);
  }

  for (const [w, depth, y, z] of [[5.4, 3.1, .075, -5.8], [4.95, 2.8, .2, -5.95], [4.5, 2.5, .325, -6.1]]) {
    carvedBox(w, .15, depth, stone, 0, y, z, .016);
    box(w + .045, .035, .085, paleStone, 0, y + .08, z + depth / 2 - .015);
  }
  contactShadow(0, -5.8, 6.5, 4.1);
  carvedBox(2.14, .15, .94, shadowStone, 0, .49, -5.5);
  carvedBox(1.98, .1, .83, paleStone, 0, .61, -5.5);
  carvedBox(1.8, .89, .72, stone, 0, 1.08, -5.5, .018);
  carvedBox(2.08, .1, .91, shadowStone, 0, 1.53, -5.5);
  carvedBox(2.2, .09, 1.02, paleStone, 0, 1.625, -5.5);
  carvedBox(2.27, .045, 1.06, stone, 0, 1.69, -5.5, .009);
  for (const x of [-.72, .72]) {
    box(.1, .84, .075, paleStone, x, 1.08, -5.106);
    box(.18, .07, .09, paleStone, x, .68, -5.095);
    box(.16, .07, .1, paleStone, x, 1.47, -5.09);
  }
  const altarRecess = new T.ShapeGeometry(pointedShape(0, .69, 1.12, .98, .3), 18);
  add(altarRecess, shadowStone, V(0, 0, -5.13));
  tube(outline(0, .69, 1.12, 1.04, .35, -5.105), .036, paleStone, 56);
  tube(outline(0, .71, 1.11, .87, .3, -5.09), .014, stone, 56, 5);
  for (const x of [-.53, .53]) {
    tube([V(x, .76, -5.09), V(x, 1.23, -5.09)], .012, paleStone, 2, 5);
    const flower = [];
    for (let i = 0; i <= 48; i++) {
      const angle = i / 48 * Math.PI * 2;
      const radius = .041 + Math.cos(angle * 4) * .012;
      flower.push(V(x + Math.cos(angle) * radius, 1.32 + Math.sin(angle) * radius, -5.09));
    }
    tube(flower, .007, paleStone, 48, 5);
  }
  for (let i = 0; i < 28; i++) {
    const x = random() * 2.15 - 1.075, width = .006 + random() * .018;
    const y = i % 2 ? 1.709 : 1.63;
    const z = i % 2 ? -4.968 : -4.988;
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute([
      x, y, z, x + width * .3, y - .004 - random() * .008, z, x + width, y, z,
    ], 3));
    geometry.computeVertexNormals();
    add(geometry, shadowStone);
  }

  // The passage east to the next memory. Built in a frame turned a quarter about y, so that it reads like the nave:
  // local x is world -z across the passage, local z is world x along it.
  assemblyMatrix = new T.Matrix4().makeRotationY(Math.PI / 2);
  {
    const across = -DOOR.z, half = DOOR.width / 2, from = 5.86, to = PASSAGE_END, length = to - from, mid = (from + to) / 2;
    // Mouldings round the doorway on the nave face, and its threshold.
    for (let layer = 0; layer < 3; layer++) tube(outline(across, 0, DOOR.spring, DOOR.width + .16 + layer * .13, DOOR.rise + .08 + layer * .07, 5.42 - layer * .03), layer === 2 ? .045 : .065, layer % 2 ? paleStone : stone, 64, 8);
    for (const s of [-1, 1]) box(.16, .3, .5, shadowStone, across + s * (half + .14), .15, 5.42);
    box(DOOR.width + .1, .05, .5, paleStone, across, .025, 5.64);
    // Flagstones, two abreast.
    for (let row = 0; row * .8 < to - 5.86 - .05; row++) for (const s of [-1, 1]) {
      const depth = Math.min(.8, to - 5.86 - row * .8);
      carvedBox(half - .006, .06, depth - .006, floors[Math.floor(random() * floors.length)], across + s * half / 2, -.024 + random() * .0015, 5.86 + row * .8 + depth / 2, .004);
    }
    // Side walls to the spring of the vault, with a low plinth, and the vault over them.
    for (const s of [-1, 1]) {
      box(.3, 3.6, length + .02, wall, across + s * (half + .15), 1.8, mid);
      // Starting clear of where the nave doors fold back.
      box(.07, .22, to - 6.7, shadowStone, across + s * (half - .035), .11, (6.7 + to) / 2);
    }
    box(DOOR.width + .6, .3, length, wall, across, DOOR.spring + DOOR.rise + .15, mid);
    const vault = archPoints(across, DOOR.spring, DOOR.width, DOOR.rise, 0, 24);
    const vertices = [], vaultUvs = [], indices = [];
    let distance = 0;
    vault.forEach((point, i) => {
      if (i) distance += point.distanceTo(vault[i - 1]);
      vertices.push(point.x, point.y, from, point.x, point.y, to);
      vaultUvs.push(distance / metersPerTile.wall, from / metersPerTile.wall, distance / metersPerTile.wall, to / metersPerTile.wall);
      if (i < vault.length - 1) indices.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    });
    const vaultGeometry = new T.BufferGeometry();
    vaultGeometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
    vaultGeometry.setAttribute('uv', new T.Float32BufferAttribute(vaultUvs, 2));
    vaultGeometry.setIndex(indices);
    vaultGeometry.computeVertexNormals();
    add(vaultGeometry, ceiling);
    // Transverse ribs on flat pilasters every few metres.
    for (const z of [7.6, 9.6, 11.6]) {
      tube(archPoints(across, DOOR.spring, DOOR.width - .1, DOOR.rise - .05, z), .055, stone, 44, 7);
      for (const s of [-1, 1]) box(.07, DOOR.spring, .2, stone, across + s * (half - .035), DOOR.spring / 2, z);
    }
    // The end wall and its smaller door, which stands ajar on the light beyond.
    const end = new T.Shape([new T.Vector2(across - half - .3, 0), ...outline(across, 0, END.spring, END.width, END.rise, 0).map(point => new T.Vector2(point.x, point.y)), new T.Vector2(across + half + .3, 0), new T.Vector2(across + half + .3, 3.6), new T.Vector2(across - half - .3, 3.6)]);
    const endGeometry = new T.ExtrudeGeometry(end, { depth: .3, bevelEnabled: false, curveSegments: 16 });
    const positions = endGeometry.attributes.position, endUvs = [];
    for (let i = 0; i < positions.count; i++) endUvs.push((positions.getX(i) + positions.getZ(i)) / metersPerTile.wall, positions.getY(i) / metersPerTile.wall);
    endGeometry.setAttribute('uv', new T.Float32BufferAttribute(endUvs, 2));
    add(endGeometry, wall, V(0, 0, to));
    for (let layer = 0; layer < 2; layer++) tube(outline(across, 0, END.spring, END.width + .12 + layer * .12, END.rise + .06 + layer * .06, to - .02 - layer * .02), .045, layer ? paleStone : stone, 56, 7);
    box(END.width + .1, .04, .34, paleStone, across, .02, to + .15);
  }
  assemblyMatrix = null;

  for (const side of [1]) {
    contactShadow(side * 4.75, .15, 1.4, 2.8);
    box(.56, .15, 2.1, paleStone, side * 4.75, .56, .15);
    for (const z of [-.5, .8]) box(.39, .43, .31, stone, side * 4.75, .25, z);
  }

  for (const x of [-4.25]) {
    add(new T.ShapeGeometry(pointedShape(x,.5,2.2,1.24,.79),24),shadowStone,V(0,0,-7.12));
    archRecess(x,.48,2.2,1.24,.79,-6.99,.12);
    tube(outline(x,.47,2.2,1.5,.91,-6.86),.046,paleStone,72,8);
    carvedBox(1.4,.12,1.29,stone,x,.48,-6.46,.014);
    carvedBox(1.34,.07,1.23,paleStone,x,.575,-6.46,.008);
    contactShadow(x,-6.5,1.6,1.4);
  }

  let triangles = 0;
  function mergeBatch(source, target, label) {
    for (const [mat, geometries] of source) {
      const normalized = geometries.map(geometry => {
        const result = geometry.index ? geometry.toNonIndexed() : geometry.clone();
        if (!result.attributes.uv) result.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(result.attributes.position.count * 2), 2));
        if (!result.attributes.normal) result.computeVertexNormals();
        geometry.dispose();
        return result;
      });
      const merged = mergeGeometries(normalized, false);
      normalized.forEach(geometry => geometry.dispose());
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mesh = new T.Mesh(merged, mat);
      mesh.name = mat === glass ? 'Leaded moonlit glass' : label;
      mesh.castShadow = mat !== glass && mat !== ceiling && !mat.transparent;
      mesh.receiveShadow = mat !== contactMaterial;
      if(mat === contactMaterial && label === 'Clustered impact column') group.add(mesh);
      else target.add(mesh);
      triangles += merged.attributes.position.count / 3;
    }
  }
  mergeBatch(batches, group, 'Chapel architecture');
  const intactPillar = new T.Group();
  intactPillar.name = 'Left impact pillar · intact';
  group.add(intactPillar);
  mergeBatch(pillarBatches, intactPillar, 'Clustered impact column');
  const fracturedPillar = new T.Group();
  const fallenCapital = new T.Group();
  fracturedPillar.name = 'Left impact pillar · fractured';
  fallenCapital.name = 'Fallen carved upper pillar';
  fracturedPillar.visible = fallenCapital.visible = false;
  group.add(fracturedPillar, fallenCapital);
  intactPillar.children.forEach(object => {
    if(object.material.transparent) return;
    for(const upper of [false,true]) {
      const positions=[], normals=[], uvs=[];
      const src=object.geometry.attributes;
      for(let i=0;i<src.position.count;i+=3) {
        const polygon=Array.from({length:3},(_,j)=>{
          const n=i+j;
          return {p:V(src.position.getX(n),src.position.getY(n),src.position.getZ(n)), n:V(src.normal.getX(n),src.normal.getY(n),src.normal.getZ(n)), uv:new T.Vector2(src.uv.getX(n),src.uv.getY(n))};
        });
        const distance=vertex=>{
          const cut=(upper?1.65:.93)+Math.sin((vertex.p.x+3.3)*17+(vertex.p.z+2.2)*9)*.045;
          return (vertex.p.y-cut)*(upper?1:-1);
        };
        const clipped=[];
        for(let j=0;j<3;j++) {
          const current=polygon[j], previous=polygon[(j+2)%3];
          const dc=distance(current), dp=distance(previous);
          if((dc>=0)!==(dp>=0)) {
            const alpha=dp/(dp-dc);
            clipped.push({p:previous.p.clone().lerp(current.p,alpha),n:previous.n.clone().lerp(current.n,alpha).normalize(),uv:previous.uv.clone().lerp(current.uv,alpha)});
          }
          if(dc>=0)clipped.push(current);
        }
        for(let j=1;j<clipped.length-1;j++) for(const vertex of [clipped[0],clipped[j],clipped[j+1]]) {
          positions.push(vertex.p.x+(upper?3.3:0),vertex.p.y-(upper?1.65:0),vertex.p.z+(upper?2.2:0));
          normals.push(...vertex.n.toArray());
          uvs.push(...vertex.uv.toArray());
        }
      }
      if(!positions.length)continue;
      const geometry=new T.BufferGeometry();
      geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
      geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
      geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
      const mesh=new T.Mesh(geometry,object.material);
      mesh.castShadow=mesh.receiveShadow=true;
      (upper?fallenCapital:fracturedPillar).add(mesh);
    }
  });
  const fractureCap=new T.Mesh(new T.CylinderGeometry(.24,.235,.065,11),stone);
  fractureCap.position.set(-3.3,.895,-2.2);
  fractureCap.rotation.set(.08,0,.13);
  fracturedPillar.add(fractureCap);
  const impact = createImpact(T,{ position:[-3.3,1.34,-2.2], material:stone });
  group.add(impact.group);
  // The doors. Oak planks on iron straps; the two in the nave doorway stay shut until the story is over, then swing
  // back against the passage walls. The one at the end stands ajar on warm light and opens as you reach it.
  const plankMap = texture(256, 512, (ctx, w, h) => {
    ctx.fillStyle = '#6b4b34';
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 32) {
      ctx.fillStyle = `rgba(${40 + random() * 30},${24 + random() * 16},${14 + random() * 10},.35)`;
      ctx.fillRect(x, 0, 32, h);
      ctx.fillStyle = 'rgba(18,10,6,.8)';
      ctx.fillRect(x, 0, 2, h);
      for (let i = 0; i < 26; i++) {
        ctx.strokeStyle = `rgba(30,18,10,${.08 + random() * .12})`;
        ctx.beginPath();
        const gx = x + 4 + random() * 24;
        ctx.moveTo(gx, 0);
        ctx.bezierCurveTo(gx + random() * 6 - 3, h * .3, gx + random() * 6 - 3, h * .7, gx + random() * 4 - 2, h);
        ctx.stroke();
      }
    }
  });
  const oak = material({ color: '#c49b76', map: plankMap, roughness: .72 });
  const iron = material({ color: '#2b2f33', metalness: .7, roughness: .55 });
  function leaf(points, thickness, straps) {
    const leafGroup = new T.Group();
    const shape = new T.Shape(points.map(([u, v]) => new T.Vector2(u, v)));
    const geometry = new T.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: true, bevelSize: .006, bevelThickness: .006, bevelSegments: 1, curveSegments: 16 });
    geometry.translate(0, 0, -thickness / 2);
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 1.3, uv.getY(i) * .45);
    const width = Math.max(...points.map(([u]) => u));
    const planks = new T.Mesh(geometry, oak);
    leafGroup.add(planks);
    for (const y of straps) for (const side of [-1, 1]) {
      const strap = new T.Mesh(new T.BoxGeometry(width * .82, .06, .012), iron);
      strap.position.set(width * .43, y, side * (thickness / 2 + .006));
      leafGroup.add(strap);
    }
    leafGroup.traverse(object => { if (object.isMesh) object.castShadow = object.receiveShadow = true; });
    return leafGroup;
  }
  // Half a pointed arch, hinge side at u = 0: the outline of the doorway from its jamb up to the apex.
  const halfArch = (width, spring, rise) => [
    ...outline(0, 0, spring, width, rise, 0).filter(point => point.x >= -1e-6).reverse().map(point => [width / 2 - point.x, point.y]),
    [width / 2, 0],
  ];
  const doors = { nave: [], end: null, naveAt: Infinity, naveLength: 2.2, endAt: Infinity, endLength: 1.4, floodAt: Infinity };
  const AJAR = .38;
  for (const side of [-1, 1]) {
    // side -1 hangs on the north jamb, side 1 on the south; both open towards +x.
    const pivot = new T.Group();
    pivot.position.set(5.82, .01, DOOR.z - side * (DOOR.width / 2 - .04));
    pivot.add(leaf(halfArch(DOOR.width - .1, DOOR.spring, DOOR.rise - .02), .07, [.45, 1.85]));
    pivot.userData.closed = side * Math.PI / 2 * -1;
    pivot.rotation.y = pivot.userData.closed;
    doors.nave.push(pivot);
    group.add(pivot);
  }
  {
    const pivot = new T.Group();
    pivot.position.set(PASSAGE_END + .3, 0, DOOR.z - END.width / 2);
    const points = outline(END.width / 2, 0, END.spring, END.width - .02, END.rise - .01, 0).map(point => [point.x, point.y]);
    pivot.add(leaf(points, .07, [.4, 1.55]));
    pivot.userData.closed = -Math.PI / 2;
    pivot.rotation.y = pivot.userData.closed + AJAR;
    doors.end = pivot;
    group.add(pivot);
  }
  // Beyond the end door: a small room of warm light, so a gap anywhere round the door shows it.
  const beyond = new T.Mesh(new T.BoxGeometry(2.6, 3.2, 2.4), new T.MeshBasicMaterial({ color: new T.Color(2.6, 1.9, 1.15), side: T.BackSide, fog: false }));
  materials.add(beyond.material);
  beyond.position.set(PASSAGE_END + .3 + 1.2, 1.6, DOOR.z);
  group.add(beyond);
  // Its light comes from behind the door, through the gap at the door's free edge, so the leaf takes it only at a slant.
  const warmth = new T.PointLight('#ffc58a', 7, 9, 1.5);
  warmth.position.set(PASSAGE_END + .12, 1.6, DOOR.z + .5);
  group.add(warmth);
  // The journey's way out: both nave doors thrown open at once on a passage full of warm light, the end door already
  // wide, the light growing round it until it fills the view, and the dust in the passage carried in on the air.
  const flood = new T.PointLight('#ffd6a6', 0, 9, 1.2);
  flood.position.set(9.4, 1.9, DOOR.z);
  group.add(flood);
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = glowCanvas.height = 128;
  {
    const g = glowCanvas.getContext('2d'), gradient = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255,240,214,1)');
    gradient.addColorStop(.3, 'rgba(255,218,170,.55)');
    gradient.addColorStop(.7, 'rgba(255,190,130,.12)');
    gradient.addColorStop(1, 'rgba(255,180,120,0)');
    g.fillStyle = gradient;
    g.fillRect(0, 0, 128, 128);
  }
  const glowMap = new T.CanvasTexture(glowCanvas);
  glowMap.colorSpace = T.SRGBColorSpace;
  textures.add(glowMap);
  // Glare rather than a thing in the room, so nothing in the passage cuts it off.
  const glow = new T.Sprite(new T.SpriteMaterial({ map: glowMap, transparent: true, depthTest: false, depthWrite: false, blending: T.AdditiveBlending, fog: false, opacity: 0 }));
  glow.renderOrder = 10;
  materials.add(glow.material);
  glow.position.set(PASSAGE_END + .2, 1.25, DOOR.z);
  glow.visible = false;
  // Light, not stone: line-of-sight rays pass through it.
  glow.raycast = () => {};
  group.add(glow);
  const motes = new Float32Array(90 * 3);
  {
    let seed = 41;
    const random = () => ((seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) / 4294967296);
    for (let i = 0; i < motes.length; i += 3) motes.set([6.2 + random() * 6, .25 + random() * 2.6, DOOR.z + (random() - .5) * 1.4], i);
  }
  const moteGeometry = new T.BufferGeometry();
  moteGeometry.setAttribute('position', new T.BufferAttribute(motes, 3));
  const dust = new T.Points(moteGeometry, new T.PointsMaterial({ color: '#ffd9a8', size: .014, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, fog: false }));
  materials.add(dust.material);
  dust.visible = false;
  dust.raycast = () => {};
  group.add(dust);
  const swing = (at, time, length) => { const t = Math.min(1, Math.max(0, (time - at) / length)); return t * t * (3 - 2 * t); };
  function updateDoors(time) {
    // Pushed hard, they swing fast from the first instant and slow as they reach the walls.
    const open = doors.naveLength < 2 ? 1 - (1 - Math.min(1, Math.max(0, (time - doors.naveAt) / doors.naveLength))) ** 3 : swing(doors.naveAt, time, doors.naveLength);
    doors.nave.forEach((pivot, i) => { pivot.rotation.y = pivot.userData.closed * (1 - open * .96) + (i ? -.01 : .01) * Math.sin(open * Math.PI); });
    const wide = swing(doors.endAt, time, doors.endLength);
    doors.end.rotation.y = doors.end.userData.closed + AJAR + wide * (Math.PI / 2 + .12 - AJAR);
    warmth.intensity = 7 + wide * 10;
    const light = swing(doors.floodAt, time, 1.3), since = Math.max(0, time - doors.floodAt);
    flood.intensity = light * 26;
    glow.visible = dust.visible = light > 0;
    glow.material.opacity = light * .8;
    glow.scale.setScalar(1.6 + 5.4 * swing(doors.floodAt + .2, time, 2.6));
    // The air pushed in by the doors, slowing as it spends itself.
    dust.material.opacity = light * .55;
    dust.position.set(-1.6 * (1 - Math.exp(-since * 1.1)), Math.sin(since * 1.3) * .04, 0);
  }
  let smashTime=Infinity;
  const upright = new T.Quaternion();
  const restingCapital = new T.Quaternion().setFromUnitVectors(V(0,1,0),V(-.78,.08,.625).normalize());
  const flameMaterials=[];
  const assets = new T.Group();
  assets.name = 'CC0 carved stone and brass';
  group.add(assets);
  const candleAnchors = [[-.82,1.715,-5.52],[.83,1.715,-5.49],[-2.18,.4,-6.12],[2.2,.4,-6.04],[4.95,.08,-3.35]];
  const loader = new GLTFLoader();

  function prepareAsset(root) {
    root.traverse(object=>{
      if(!object.isMesh)return;
      object.castShadow=object.receiveShadow=true;
      const list=Array.isArray(object.material)?object.material:[object.material];
      list.forEach(mat=>{
        materials.add(mat);
        for(const value of Object.values(mat)) if(value?.isTexture){value.anisotropy=4;textures.add(value);}
        if(/flame/.test(mat.name)) {
          mat.emissive.set('#dc9c55');
          mat.emissiveMap=mat.map;
          mat.emissiveIntensity=.62;
          mat.transparent=true;
          mat.opacity=.72;
          mat.depthWrite=false;
          flameMaterials.push(mat);
          object.castShadow=false;
        } else if(/brass_candleholders_0[123]$/.test(mat.name)) {
          mat.color.set('#777973');
          mat.roughness=.82;
          mat.envMapIntensity=.7;
        }
      });
    });
  }
  function fitAsset(root,height) {
    const wrapper=new T.Group();
    wrapper.add(root);
    root.updateWorldMatrix(true,true);
    const bounds=new T.Box3().setFromObject(root);
    const center=bounds.getCenter(new T.Vector3());
    const scale=height/(bounds.max.y-bounds.min.y);
    root.position.sub(new T.Vector3(center.x,bounds.min.y,center.z));
    wrapper.scale.setScalar(scale);
    return wrapper;
  }
  const ready = options.assets === false ? Promise.resolve([]) : Promise.allSettled([
    loader.loadAsync('/assets/bloodbound/chapel-gothic-statue/gothic_statue_1k.gltf').then(gltf=>{
      if(disposed)return;
      prepareAsset(gltf.scene);
      gltf.scene.traverse(object=>{if(object.isMesh){object.material.color.set('#929ca2');object.material.roughness=.96;}});
      const statue=fitAsset(gltf.scene,1.32);
      statue.position.set(-4.25,.62,-6.45);
      statue.rotation.y=.12;
      assets.add(statue);
    }),
    loader.loadAsync('/assets/bloodbound/chapel-brass-candleholders/brass_candleholders_1k.gltf').then(gltf=>{
      if(disposed)return;
      prepareAsset(gltf.scene);
      const tall=gltf.scene.getObjectByName('brass_candleholder_03');
      const single=gltf.scene.getObjectByName('brass_candleholder_01');
      candleAnchors.forEach((anchor,i)=>{
        const source=i<2?single:tall;
        if(!source)return;
        const candle=fitAsset(source.clone(true),i<2?.35:.75);
        candle.position.set(...anchor);
        candle.rotation.y=i*.7;
        assets.add(candle);
      });
      // The short three-arm variant stays beside the rear altar.
      const small=gltf.scene.getObjectByName('brass_candleholder_02');
      if(small) {
        const candle=fitAsset(small.clone(true),.42);
        candle.position.set(.25,1.715,-5.7);
        assets.add(candle);
      }
    }),
  ]).then(results=>{
    const failures=results.filter(result=>result.status==='rejected').map(result=>String(result.reason));
    group.userData.assetErrors=failures;
    let assetTriangles=0;
    assets.traverse(object=>{if(object.isMesh)assetTriangles+=(object.geometry.index?.count||object.geometry.attributes.position.count)/3;});
    group.userData.triangles=triangles+assetTriangles;
    return results;
  });
  group.userData = {
    geometryType: 'carved procedural architecture with local CC0 sculptural assets',
    triangles,
    // The end of the passage, where the next memory begins, and the doorway into it from the nave.
    exit: { position: [PASSAGE_END, 0, DOOR.z], forward: [1, 0, 0], doorway: [5.65, 0, DOOR.z] },
    impact: { position:[-3.3,1.34,-2.2], pillar:[-3.3,0,-2.2] },
    candles: candleAnchors,
    moonWindow: { position:[-5.7,4.0,-4.3], inward:[1,0,0] },
    suggestedCamera: { position: [0, 1.6, 4], target: [0, 1.45, 0] },
  };

  function update(time=0) {
    updateDoors(time);
    flameMaterials.forEach((mat,i)=>{mat.emissiveIntensity=.59+Math.sin(time*3.1+i)*.025+Math.sin(time*8.7+i*2)*.018;});
    impact.update(time);
    if(smashTime===Infinity)return;
    const elapsed=Math.max(0,time-smashTime);
    const active=time>=smashTime;
    intactPillar.visible=!active;
    fracturedPillar.visible=fallenCapital.visible=active;
    const fall=Math.min(1,elapsed/.92);
    const ease=fall*fall*(3-2*fall);
    fallenCapital.position.set(-3.3-ease*.09,1.65-ease*1.41,-2.2+ease*.12);
    fallenCapital.quaternion.slerpQuaternions(upright,restingCapital,ease);
    if(elapsed>1)fallenCapital.position.y+=Math.sin((elapsed-1)*18)*.015*Math.exp(-(elapsed-1)*6);
  }
  return {
    group,ready,update,
    smash(time=0){smashTime=time;impact.trigger(time,[-1,0,.3]);update(time);},
    // Swing the nave doors open, or the end door wide, from `time` on.
    openPassage(time=0){doors.naveAt=Math.min(doors.naveAt,time);},
    openEnd(time=0,length=1.4){if(time<doors.endAt)doors.endLength=length;doors.endAt=Math.min(doors.endAt,time);},
    // Both hands on the nave doors at `time`: they give at once, and the light comes in.
    burst(time=0){doors.naveAt=time;doors.naveLength=.95;this.openEnd(time-.6,.8);doors.floodAt=time+.08;},
    reset(){smashTime=Infinity;doors.naveAt=doors.endAt=doors.floodAt=Infinity;doors.naveLength=2.2;updateDoors(0);intactPillar.visible=true;fracturedPillar.visible=fallenCapital.visible=false;impact.reset();},
    dispose() {
      disposed=true;
      const disposedGeometry=new Set();
      group.traverse(object=>{if(object.isMesh&&!disposedGeometry.has(object.geometry)){disposedGeometry.add(object.geometry);object.geometry.dispose();}});
      impact.dispose();
      materials.forEach(mat=>mat.dispose());
      textures.forEach(map=>map.dispose());
      group.clear();
    },
  };
}
