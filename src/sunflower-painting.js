import * as T from 'three';

let paintingMaterial;

// Vincent van Gogh, Sunflowers (1888), National Gallery, London.
// Public-domain reproduction bundled locally; source in ASSET-LICENSES.md.
export function sunflowerPaintingMaterial() {
  if (!paintingMaterial) {
    const texture = new T.TextureLoader().load(`${import.meta.env.BASE_URL}assets/art/van-gogh-sunflowers-1888.jpg`);
    texture.colorSpace = T.SRGBColorSpace;
    texture.anisotropy = 8;
    paintingMaterial = new T.MeshStandardMaterial({ map: texture, roughness: .93 });
  }
  return paintingMaterial;
}

export const sunflowerPaintingAspect = 1920 / 2441;
