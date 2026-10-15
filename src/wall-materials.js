import * as T from 'three';

let finishes;

// Seamless, seeded value noise: broad plaster variation and fine roller stipple
// share a physical scale instead of stretching one bitmap over each wall.
function noiseLayer(cells, seed) {
  const values = new Float32Array(cells * cells);
  for (let i = 0; i < values.length; i++) {
    seed = (seed * 16807) % 2147483647;
    values[i] = seed / 2147483647;
  }
  return (u, v) => {
    const x = u * cells, y = v * cells, ix = Math.floor(x), iy = Math.floor(y);
    let fx = x - ix, fy = y - iy;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const at = (a, b) => values[(b % cells) * cells + a % cells];
    return T.MathUtils.lerp(T.MathUtils.lerp(at(ix, iy), at(ix + 1, iy), fx),
      T.MathUtils.lerp(at(ix, iy + 1), at(ix + 1, iy + 1), fx), fy) - .5;
  };
}

function finish(base, painted) {
  const size = 1024;
  const canvases = Array.from({ length: 3 }, () => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
    return canvas;
  });
  const contexts = canvases.map(c => c.getContext('2d'));
  const maps = contexts.map(c => c.createImageData(size, size));
  const broad = noiseLayer(8, 391), middle = noiseLayer(48, 729), fine = noiseLayer(256, 1823);
  const trowel = noiseLayer(19, 2119), pores = noiseLayer(410, 991);
  let seed = 713;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size, i = (y * size + x) * 4;
    seed = (seed * 16807) % 2147483647;
    const grain = seed / 2147483647 - .5;
    const b = broad(u, v), m = middle(u, v), f = fine(u, v);
    // Broad overlapping plaster passes, with small pits visible in grazing light.
    // Keep pigment variation gentle so sunny walls do not look stained.
    const sweep = trowel(u, v), pit = Math.max(0, -pores(u, v) - .23) * 4;
    const variation = b * 2 + sweep * 1.5 + m * 1.5 + f * 2
      + grain - pit * (painted ? 1 : 2.5);
    const relief = 145 + sweep * (painted ? 12 : 36) + m * 24 + f * 55
      + grain * 16 - pit * (painted ? 25 : 65);
    const roughness = (painted ? 173 : 220) + b * 12 + m * 22 + f * 20 + pit * 27;
    for (let channel = 0; channel < 3; channel++) {
      maps[0].data[i + channel] = base[channel] + variation;
      maps[1].data[i + channel] = relief;
      maps[2].data[i + channel] = roughness;
    }
    for (const map of maps) map.data[i + 3] = 255;
  }
  const textures = canvases.map((canvas, i) => {
    contexts[i].putImageData(maps[i], 0, 0);
    const texture = new T.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = T.RepeatWrapping;
    texture.anisotropy = 8;
    if (i === 0) texture.colorSpace = T.SRGBColorSpace;
    return texture;
  });
  const material = new T.MeshStandardMaterial({
    map: textures[0], bumpMap: textures[1], roughnessMap: textures[2],
    bumpScale: painted ? .002 : .0045, roughness: 1,
  });
  material.userData.wallTextureScale = 2.4; // meters per repeat, on every wall
  return material;
}

export function interiorWallFinishes() {
  if (!finishes) finishes = {
    plaster: finish([247, 247, 243], false),
    paint: finish([235, 237, 232], true),
  };
  return finishes;
}

export function mapWallUVs(geometry, material) {
  const scale = material?.userData?.wallTextureScale;
  if (!scale) return;
  const positions = geometry.attributes.position, normals = geometry.attributes.normal;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < positions.count; i++) {
    const nx = Math.abs(normals.getX(i)), ny = Math.abs(normals.getY(i));
    const nz = Math.abs(normals.getZ(i));
    const u = nx > nz ? positions.getZ(i) : positions.getX(i);
    const v = ny > Math.max(nx, nz) ? positions.getZ(i) : positions.getY(i);
    uv.setXY(i, u / scale, v / scale);
  }
}
