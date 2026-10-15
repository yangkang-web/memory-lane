import * as T from 'three';

let finish;

// A 3.6 m repeat contains sixteen 90 cm mineral tiles. The shared maps keep
// seams, tiny aggregate and polish at the same scale in every classroom.
export function classroomFloorFinish() {
  if (finish) return finish;
  const size = 1024, tile = size / 4;
  const canvases = Array.from({ length: 3 }, () => {
    const c = document.createElement('canvas'); c.width = c.height = size; return c;
  });
  const contexts = canvases.map(c => c.getContext('2d'));
  const images = contexts.map(c => c.createImageData(size, size));
  let seed = 3961;
  const random = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647; };
  const tones = Array.from({ length: 16 }, () => (random() - .5) * 9);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4, tx = x % tile, ty = y % tile;
    const edge = Math.min(tx, ty, tile - tx, tile - ty);
    const joint = 1 - T.MathUtils.smoothstep(edge, .5, 1.6);
    const bevel = 1 - T.MathUtils.smoothstep(edge, 1, 3.2);
    const grain = (random() - .5) * 4;
    const mineral = Math.sin(x * .025 + Math.sin(y * .031) * 2)
      * Math.cos(y * .019 + Math.sin(x * .018)) * 2;
    const tone = tones[Math.floor(y / tile) * 4 + Math.floor(x / tile)];
    const color = [218, 212, 197];
    for (let ch = 0; ch < 3; ch++) {
      images[0].data[i + ch] = color[ch] + tone + grain + mineral - joint * 27 - bevel * 3;
      images[1].data[i + ch] = 153 + grain * 1.5 - joint * 64 - bevel * 13;
      images[2].data[i + ch] = 137 + grain * 2 + mineral * 3 + joint * 65;
    }
    for (const image of images) image.data[i + 3] = 255;
  }
  contexts.forEach((c, i) => c.putImageData(images[i], 0, 0));
  // Small cream and grey stone chips, with no oversized marble veins.
  for (let n = 0; n < 18000; n++) {
    const x = random() * size, y = random() * size, r = .3 + random() * 1.3;
    if (Math.min(x % tile, y % tile, tile - x % tile, tile - y % tile) < 4) continue;
    const light = random() > .45, angle = random() * Math.PI;
    const colors = [light ? 'rgba(247,239,218,.48)' : 'rgba(130,132,119,.25)',
      light ? '#a0a0a0' : '#959595', light ? '#888888' : '#a0a0a0'];
    contexts.forEach((c, i) => {
      c.fillStyle = colors[i]; c.beginPath(); c.ellipse(x, y, r, r * .65, angle, 0, Math.PI * 2); c.fill();
    });
  }
  // Fine cleaning arcs affect the polish more than the pigment.
  for(let n=0;n<65;n++) {
    const x=24+random()*(size-48),y=24+random()*(size-48),r=8+random()*22;
    for(const i of [0,2]) {
      const c=contexts[i];c.strokeStyle=i?'rgba(185,185,185,.16)':'rgba(130,124,108,.035)';
      c.lineWidth=i?1:.6;c.beginPath();c.arc(x,y,r,.2,1.2);c.stroke();
    }
  }
  const maps = canvases.map((canvas, i) => {
    const map = new T.CanvasTexture(canvas); map.wrapS = map.wrapT = T.RepeatWrapping;
    map.anisotropy = 8; if (!i) map.colorSpace = T.SRGBColorSpace; return map;
  });
  finish = new T.MeshPhysicalMaterial({ map: maps[0], bumpMap: maps[1], roughnessMap: maps[2],
    bumpScale: .005, roughness: 1, clearcoat: .22, clearcoatRoughness: .34 });
  finish.userData.wallTextureScale = 3.6;
  return finish;
}
