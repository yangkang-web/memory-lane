import * as T from 'three';

// Local, seeded surface work; no network assets or runtime generation service.
export function weatheredSurface(kind = 'skin') {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const pixels = ctx.createImageData(512, 512);
  const metal = kind === 'metal', dead = kind === 'dead', fabric = kind === 'canvas';
  let seed = metal ? 831 : 6153;
  const random = () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;
  const base = fabric ? [83, 91, 68] : metal ? [106, 109, 99] : dead ? [140, 134, 115] : [170, 139, 112];
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const broad = Math.sin(x * .043 + Math.sin(y * .021) * 2) * Math.cos(y * .031 + x * .017);
    const medium = Math.sin(x * .19 + y * .11) * Math.cos(y * .137 - x * .073);
    const grain = (random() - .5) * (metal ? 25 : 13);
    const patch = Math.max(0, broad + medium * .3 - .25);
    const i = (y * 512 + x) * 4;
    for (let c = 0; c < 3; c++) {
      const stain = metal ? [15, 44, 52][c] : [27, 36, 29][c];
      pixels.data[i + c] = base[c] + grain + medium * 4 - patch * stain + (fabric ? ((x%4<2?5:-5)+(y%4<2?4:-4)) : 0);
    }
    pixels.data[i + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  if (metal) {
    for (let i = 0; i < 320; i++) {
      ctx.strokeStyle = i % 3 ? '#37392d39' : '#d4d0bb55';
      ctx.lineWidth = .5 + random();
      const x = random() * 512, y = random() * 512;
      ctx.beginPath();ctx.moveTo(x, y);ctx.lineTo(x + random() * 3, y + 4 + random() * 45);ctx.stroke();
    }
  } else {
    for (let i = 0; i < 5500; i++) {
      ctx.fillStyle = i % 3 ? '#3d33251c' : '#e3c7ac20';
      ctx.fillRect(random() * 512, random() * 512, .6 + random(), .7 + random());
    }
  }
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;map.wrapS = map.wrapT = T.RepeatWrapping;
  map.anisotropy = 4;
  const bump = map.clone();bump.colorSpace = T.NoColorSpace;
  return new T.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: metal ? .0017 : fabric ? .0012 : .0007, roughness: metal ? .78 : .89, metalness: metal ? .5 : 0 });
}
