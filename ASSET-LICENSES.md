# Sources and licenses

## Code

- Three.js 0.186.1 (including GLTFLoader and postprocessing): MIT. https://github.com/mrdoob/three.js
- @pixiv/three-vrm 3.5.5 and its runtime modules: MIT. https://github.com/pixiv/three-vrm
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

## Campus character

- Character: Sakurada Fumiriya (桜田 史利矢).
- Creator: VRoid Project / pixiv Inc.; embedded author: VRoidプロジェクト.
- Official model: https://hub.vroid.com/en/characters/6912965120285194650/models/2261505926203110716
- Official CC0 declaration: https://vroid.pixiv.help/hc/en-us/articles/360014788554-Sakurada-Fumiriya
- Download mirror: https://opengameart.org/content/vroid-studio-cc0-models (submitted by hecko).
- Download: https://opengameart.org/sites/default/files/sakurada_fumiriya.zip
- Local file: `public/assets/characters/sakurada-fumiriya.vrm` (19,589,760 bytes; original model bytes unchanged).
- SHA-256: `a36e91b81518c59f6da0e3f34a176b79090a8c68cc6bd5fe03c1560744b283f3`.
- The embedded legacy VRM metadata uses `licenseName: Other` with a VRoid Hub permissions URL explicitly allowing use by everyone, corporate and individual commercial use, modification and redistribution without required credit. The official creator page separately declares this model CC0.
- Runtime adaptations: scale/ground alignment, VRM 0 orientation, humanoid pose previews and an MToon spotlight-shadow compatibility fix. Original textures, including the two-tone hair, are retained. All assets load locally; no VRoid account, SDK service or network request to a third party is used at runtime.

## Campus character: Sendagaya Shino

- Creator: VRoid Project / pixiv Inc.; embedded author: VRoidプロジェクト.
- Official model: https://hub.vroid.com/en/characters/5860098757548846785/models/6567311261748429976
- Official CC0 declaration: https://vroid.pixiv.help/hc/en-us/articles/360013482714-Sendagaya-Shino
- Download mirror: https://opengameart.org/content/vroid-studio-cc0-models (submitted by hecko).
- Download: https://opengameart.org/sites/default/files/sendagaya_shino.zip
- Local file: `public/assets/characters/sendagaya-shino.vrm` (14,870,776 bytes; original VRM bytes unchanged).
- SHA-256: `f11b2648e7e588ae171ad1c32e465f84e5b130b1d1789e3a3702946c0981d2a9`.
- The ZIP passed its integrity check. Embedded metadata names 千駄ヶ谷篠 and VRoidプロジェクト; `licenseName: Other` points to VRoid Hub permissions allowing everyone to use, modify and redistribute the model, with corporate and individual commercial use permitted and no required credit. The creator's official FAQ separately declares CC0.
- Runtime adaptations: fitted to 1.65 m, ground alignment, VRM 0 orientation, the shared campus material compatibility adjustments, procedural humanoid poses and contact shadows. Shino has an independent chair, route, action state and loading/retry state. The model is bundled locally; no runtime third-party service is used.

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

## Downtown scene study

- The independent `/map` scene uses original procedural buildings, vehicles, street furniture, vegetation, house interiors and canvas textures, generated locally in the scene modules. The PBR maps and hero-street models listed below are the exceptions to the procedural assets.
- Its overgrown, abandoned downtown mood was requested with reference to The Last of Us Part II. It does not reproduce the game's map or use extracted game assets, logos, dialogue or characters.
- The planar puddle reflection uses Three.js Reflector (MIT). This fictional scene is not actual user history.

### Street surface materials

- Poly Haven: [Asphalt 02](https://polyhaven.com/a/asphalt_02) and [Bark Brown 02](https://polyhaven.com/a/bark_brown_02), both by Rob Tuytel.
- License: [CC0](https://polyhaven.com/license), permitting redistribution and commercial use.
- Building materials: [Brick Wall 001](https://polyhaven.com/a/brick_wall_001), photography by Dimitrios Savva and processing by Rob Tuytel; [Concrete Wall 007](https://polyhaven.com/a/concrete_wall_007), photography by Charlotte Baglioni, processing by Dario Barresi and tiling by Rico Cilliers. Both are CC0.
- Bundled in `public/assets/materials/`: the 1K JPEG diffuse, OpenGL normal and roughness maps for each of the four materials. Original download URLs are recorded in `sources.json`.
- Downloaded 2026-10-14 through the public asset API. All twelve maps are served locally at runtime; no external service or paid API is required. Scene tint, texture scale and normal strength are adjusted in code.
- Vehicle rust, cracked windows, leaf textures, grass geometry and other street details are original procedural work. No extracted game assets are used.

## Recording tools

The local development dependency @ffmpeg-installer/ffmpeg provides FFmpeg for browser recordings. It is a development tool and is not loaded or called by the demo. Its packaged licensing information is retained under node_modules.

## Character locomotion curves

- Creator: Quaternius (Universal Animation Library, with animation contributions credited by the author to Gonzalo Furnier).
- Official pack: https://quaternius.com/packs/universalanimationlibrary.html
- Official download: https://quaternius.itch.io/universal-animation-library
- Edition: free Standard, v3.0 (June 2026). No purchase, account or runtime service is required.
- License: CC0 1.0 Universal, confirmed in the downloaded `License.txt`: https://creativecommons.org/publicdomain/zero/1.0/
- Derived file: `src/data/student-locomotion.json`, containing sampled and coordinate-converted `Walk_Loop`, `Jog_Fwd_Loop` and `Idle_Loop` curves from `Unreal-Godot/UAL1_Standard.glb`. The source GLB SHA-256 is recorded in the derived file.
- Reproducible extraction: `scripts/extract-locomotion.mjs`. No third-party executable is included; the extraction script reads the GLB data using the project's existing Three.js dependency.
- Runtime adaptation: the complete retargeted humanoid pose (including legs and toes) supplies the motion base. Airborne leg poses are warped at the step boundaries for the curved route; planted feet, shoe pivots, limb proportions and joint limits are corrected after sampling. Sharp source jog keys receive a cyclic zero-phase filter during extraction. Idle posture, turn anticipation, relaxed hands and chair transitions are layered locally. These are adapted game animation curves, not a claim of motion capture.

## Fumiriya English greeting

- File: `public/assets/voices/fumiriya-greeting-en.wav`; original campus dialogue generated locally.
- Voice: Kokoro v1.0 `am_puck` (American English male), speed 0.96.
- Model: https://huggingface.co/hexgrad/Kokoro-82M — Apache 2.0.
- Voice catalog: https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md
- ONNX implementation: https://github.com/thewh1teagle/kokoro-onnx — MIT; official v1.0 fp16 export from its model-files-v1.1 release.
- Only the generated WAV and vowel timing JSON are included; no model, runtime, cloud service or new browser dependency is shipped.
- Reproduction: `scripts/generate-student-voice.py --model <kokoro-v1.0.fp16.onnx> --voices <voices-v1.0.bin>` with `kokoro-onnx==0.6.1`, `onnx`, `numpy`, and `soundfile` installed separately.
- The original model hash is recorded in `src/data/fumiriya-voice.json`. The generator exposes the model's existing phoneme-duration tensor for audio-aligned mouth cues.

## Sunflower story (October 2026)

- `public/assets/voices/sunflower-story-en.wav`: 60-second local English track generated with the same Kokoro v1.0 `am_puck` voice and 0.96 speed as the campus greeting. Seven spoken passages, with original model-derived phoneme timings in `src/data/sunflower-voice.json`. Generated offline with `scripts/generate-sunflower-story.py`; the Kokoro and ONNX licenses listed above apply.
- The screenplay and storyboard reference were supplied by the user for this fictional scene. English dialogue adapts that screenplay; it is not a record of real user history. Phone, stationery, envelope, and sunflower geometry/textures were authored for this demo. The existing CC0 Fumiriya model and public-domain Van Gogh painting retain their credits above.

## Emochi mascot

`public/assets/characters/emochi.glb` is original procedural geometry generated locally by `src/emochi.js`, based on the Emochi icon supplied by the user in this task. No third-party model or texture was imported. The Emochi brand/icon remains attributable to its owner; this entry makes no CC0 claim for the brand. The studio uses no paid APIs or runtime asset services.

## Painting inside the abandoned house

- Artist: Vincent van Gogh (1853–1890).
- Work: *Sunflowers*, August 1888; National Gallery, London, NG3863.
- Local file: `public/assets/art/sunflowers-1888.jpg`, 960 × 1221 JPEG, a faithful reproduction downloaded from the Commons thumbnail service. The image is not AI-generated or repainted.
- Source and public-domain notice: https://commons.wikimedia.org/wiki/File:Vincent_van_Gogh_-_Sunflowers_(1888,_National_Gallery_London).jpg
- Source museum catalogue: https://www.nationalgallery.org.uk/paintings/vincent-van-gogh-sunflowers
- Commons marks the work and faithful reproduction PD-Art / Public Domain Mark 1.0. The downloaded image itself is unmodified; its frame, lighting and surrounding wall are original scene geometry. Fading, stains, varnish cracks and edge abrasions are fictional procedural material effects, not the actual condition of the museum painting.
- Downloaded 2026-10-14. The fictional room displays a reproduction; it does not represent the museum's actual setting or provenance of the physical painting.

### Hero street models (2026-10-14)

Locally bundled Poly Haven assets, all [CC0](https://polyhaven.com/license):

- [Tree Small 02](https://polyhaven.com/a/tree_small_02), Rico Cilliers. Bark, branch and foliage maps at 2K. Original 2,062,487-triangle glTF was reduced offline with meshoptimizer to 154,118 triangles; the optimized buffer is 9.2 MB. No runtime decoder or service is needed.
- [Fern 02](https://polyhaven.com/a/fern_02), Rob Tuytel (scanning), Rico Cilliers (modeling). Four mesh variants and 2K maps, including the separate alpha mask.
- [Nettle Plant](https://polyhaven.com/a/nettle_plant), Rob Tuytel (photography), Rico Cilliers (modeling). Six mesh variants with 2K maps and alpha mask.
- [Dead Tree Trunk](https://polyhaven.com/a/dead_tree_trunk), Rob Tuytel. Scanned mesh with 2K maps.

Download URLs and original checksums are in `public/assets/models/sources.json`; tree geometry was subsequently optimized, so its bundled checksum differs from the original. Models are placed, scaled and lit for this fictional scene. The printworks facade, fire escape, vehicle damage, open doors and contact-occlusion shader are original authored work. They are not extracted from The Last of Us Part II.

Offline optimization utility: `scripts/art/optimize-tree.mjs`; meshoptimizer by Arseny Kapoulkine, MIT, installed only in a temporary authoring directory. To rebuild, obtain the original source glTF/buffer from the manifest and pass the path to `meshopt_simplifier.js`. The delivered runtime assets are already optimized.

## Last Companion narrative prototype

The fictional script 《回忆之路：最后一次并肩》 was supplied by the user. It is a fictional authored narrative, not personal history. Story environments, articulated characters and animated props are locally authored procedural geometry; none are extracted from commercial games.

The 39 dialogue recordings under `public/assets/story/voice/` use installed macOS voices (Tingting and Eddy, Mandarin Chinese), generated offline by `scripts/art/synthesize-story.mjs`. They are synthetic prototype performances, not recordings of real actors. The line manifest is `public/assets/story/voice/sources.json`. No paid speech service or runtime cloud dependency is used.

Close-up skin, oxidized steel and surface microdetail in `src/story-surfaces.js` are seeded local procedural textures authored for this fictional demo. They do not use scans of real people or extracted game assets.

- 剧情街道附属建筑、车库栅门、卷帘门分片、屋顶边缘、碎窗和路障：本项目本地程序化几何（`src/companion-street-response.js`），沿用上述已注明来源的砖墙和混凝土材质；没有引入游戏资产或付费资源。

### Skinned character upgrade (2026-10-15)

The first-person arms and the nine narrative infected now use locally bundled, independently released assets. The earlier procedural actors remain as animation/contact drivers and loading fallbacks; the crowd and mirror-body prototype are still procedural.

- **fps arms**, [DJMaesen / bumstrum](https://sketchfab.com/bumstrum), [source](https://sketchfab.com/3d-models/fps-arms-08ec4403a47645d8ad80633abf13d39d), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Approximately 7,000 triangles, 2K source maps and articulated fingers. Downloaded using Sketchfab's normal authorized download. Modified the unsupported legacy specular/gloss material to metallic/roughness and retargeted the skin to authored contacts. Runtime limb groups preserve the existing injury timeline.
- **Thin Zombie [ Awake Zombie Asset ]**, Rosswet Mobile (submitted by dogchicken), [source](https://opengameart.org/node/14826), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Converted the author's Blender source, restored the diffuse material, subdivided the silhouette once (20,040 triangles), adjusted surface response and retargeted the skeleton. 1K diffuse texture. This is a modest free game asset, not a scanned or AAA-quality character.
- Reproduction command for the zombie: Blender 4.2 with `--background --factory-startup --disable-autoexec --python scripts/art/convert-story-zombie.py -- <source.blend> <texture.png> <output.glb>`. The offline converter is not a runtime dependency.
- Complete attribution is also bundled in `public/assets/story/characters/CREDITS.txt`. No paid APIs, paid assets, cloud dependencies, commercial-game extractions, or changes to the 60-second edit were introduced.
- Rusty pipe detailing remains original local geometry (`src/story-weapon-details.js`).

### Mirror protagonist and instanced infected crowd (2026-10-15)

- `public/assets/story/characters/survivor.glb`: [3D Zombie Apocalypse Survivor Male Character](https://sketchfab.com/3d-models/3d-zombie-apocalypse-survivor-male-character-f56ffc64d18c40cf95d17559542ca44c) by [codersan](https://sketchfab.com/codersan), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Free author-provided GLB, downloaded using the normal Sketchfab download UI. Runtime changes: size normalization, skeletal retargeting and matte shading. Embedded creator credits retained.
- `public/assets/story/characters/infected-crowd.glb`: low-detail derivative of the Rosswet Mobile / dogchicken Thin Zombie source credited above, CC BY 3.0. Original 3,340-triangle mesh, converted locally using Blender with script execution disabled. Runtime poses are authored locally, not imported animations. Color/size/pose-phase variation is applied per instance.
- Full attribution is also shipped in `public/assets/story/characters/CREDITS.txt`. No purchased assets or game-ripped content introduced.

### Detailed infected replacement

- **Zombie (Male 1)** by **LokitoBlu** (martinezequielgorno), [original asset](https://sketchfab.com/3d-models/zombie-male-1-f40dda49b8b94f2faedf58679f676763), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Downloaded the author's 2K GLB. Local derivative: `public/assets/story/characters/infected-detailed.glb`. Original geometry and UVs retained; locally authored 19-bone skeleton and skin weights, corrected scale, dry nonmetal materials and alpha testing. Color and normal textures retained. Converted with `scripts/art/rig-infected.py`, Blender script auto-execution disabled. No Mixamo upload, asset purchase or paid API. Replaces the near-camera Thin Zombie; the older attributed asset remains the distant crowd LOD.

Additional runtime adaptations: LokitoBlu hand grip shapes, palm-axis and size retargeting; DJMaesen upper torso flaps replaced by locally modeled closed cloth sleeves. Original credited forearm/glove and infected textures/UVs are retained.

## Seaside cigarette (user supplied, local demo)

- Supplied by the user from Downloads: `Cigarette_1015071228_image-to-3d-texture_fbx.zip`. Archive filenames identify `Meshy_AI_Lit_Cigarette_1015071228_image-to-3d-texture`.
- Earlier revision: `public/assets/seaside/cigarette.glb` replaced the procedural cigarette-case placeholder and included a static smoke mesh. It has now been superseded by the cigarette-butt model below; the original download remains untouched.
- Local processing: FBX to GLB, 206,316 to 103,158 triangles, aligned for shelf presentation, original base color/normal maps at 2K and metallic/roughness at 1K. Conversion script: `scripts/art/convert-seaside-cigarette.py`.
- No license document was included in the supplied archive. User authorized use in this local demo; no claim of CC0/MIT or redistribution rights is made for this asset. No new asset purchases, API calls or uploads.

## Seaside necklace and letter (user supplied, local demo)

- User supplied `Meshy_AI_Heart_Necklace_Pendan_1015054857_texture_fbx.zip` and `love_letter_envelope_1015072436_image-to-3d-texture_fbx.zip` from Downloads, and explicitly requested both on the cigarette's sides. Archive names identify Meshy AI exports.
- Local outputs: `public/assets/seaside/heart-necklace.glb` (left, 3,196 triangles) and `public/assets/seaside/love-letter.glb` (right, 80,000 triangles, reduced from 166,612). Original base color and normal maps at 2K, metallic/roughness at 1K.
- Conversion: `scripts/art/convert-seaside-collectible.py`; original UVs retained, runtime orientation/scale adjusted for display. Backboard, plinths and envelope easel are original procedural geometry.
- Neither archive includes a license document. Used only in this user-authorized local demo; no CC0/MIT or redistribution claim is made for these assets. No purchases, uploads or API calls.

### Cigarette-butt replacement and central necklace

- User supplied `Cigarette_Butt_1015085107_image-to-3d-texture_fbx.zip`; archive identifies `Meshy_AI_Cigarette_Butt_1015085107_image-to-3d-texture`. Runtime file: `public/assets/seaside/cigarette-butt.glb`, replacing the old cigarette and smoke model.
- Local conversion via `scripts/art/convert-seaside-collectible.py`: 2,651,754 source triangles reduced to 80,000 for this shelf display; base color/normal maps at 2K and metallic/roughness at 1K. This is a reduced-detail derivative, not full source geometry. Original archive and textures remain in Downloads unchanged.
- No license document is included in the archive. Authorized for this local demo by the user; no redistribution license is asserted.
- Layout updated to cigarette butt on the left, necklace in the center as the first focus target, and letter on the right.
