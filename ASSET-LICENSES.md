# Sources and licenses

## Code

- Three.js 0.186.1 (including GLTFLoader and postprocessing): MIT. https://github.com/mrdoob/three.js
- Vite 8.3.4: MIT. https://github.com/vitejs/vite
- Zod 4.3.6: MIT. https://github.com/colinhacks/zod
- Original project code, procedural architecture, tea objects, typography layout, sky/water shaders and synthesized audio: MIT, Memory Lane contributors.

Full dependency licenses are present in their packages under node_modules.

## Nature

- Creator: Quaternius.
- Pack: Ultimate Stylized Nature Pack.
- Original asset page / verified license: https://quaternius.com/packs/ultimatestylizednature.html
- License: CC0 1.0. https://creativecommons.org/publicdomain/zero/1.0/
- File used in the final scene: BirchTree_1.gltf (embedded buffer).
- Delivery mirror: https://github.com/badestrand/threejs/tree/master/models/quaternius-ultimate-stylized-nature
- The official Google Drive copy returned a quota exceeded page during preparation. The CC0 model and mask were obtained from the public mirror and bundled locally. The bark material is adapted in code. Original leaf cards are replaced with original procedural volume crowns, derived from the model’s branch layout, to avoid noisy silhouettes.

## Classroom painting

- Artist: Vincent van Gogh (1853–1890).
- Work: *Sunflowers / Vase with Fifteen Sunflowers*, August 1888, oil on canvas; National Gallery, London, NG3863.
- Source: https://commons.wikimedia.org/wiki/File:Vincent_van_Gogh_-_Sunflowers_(1888,_National_Gallery_London).jpg
- Public-domain artwork and faithful reproduction (PD-Art / Public Domain Mark 1.0, as identified by Wikimedia Commons).
- Local file: `public/assets/art/van-gogh-sunflowers-1888.jpg` (1920 × 2441 Wikimedia thumbnail, uncropped).
- Bundled locally and displayed at its original image aspect ratio; no remote requests are needed while exploring the campus.

## Text

- Author: Lewis Carroll (1832–1898).
- Work: Alice’s Adventures in Wonderland (1865), Chapter VII, A Mad Tea-Party.
- Source: https://www.gutenberg.org/ebooks/11
- Plain text edition: https://www.gutenberg.org/cache/epub/11/pg11.txt
- The original work is public domain; the source lists public domain in the USA. The Project Gutenberg license is bundled in public/assets/PROJECT-GUTENBERG-LICENSE.txt.
- The local chapter excerpt preserves original English wording. Chinese text is an original demonstration translation; scene summaries are adaptations.
- This is not actual Emochi user history. This provenance is displayed in the entry and story details.

No stock music, generated image services, paid models, paid APIs, or commercial asset packs were used.

## Recording tools

The local development dependency @ffmpeg-installer/ffmpeg provides FFmpeg for browser recordings. It is a development tool and is not loaded or called by the demo. Its packaged licensing information is retained under node_modules.
