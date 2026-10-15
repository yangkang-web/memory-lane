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
