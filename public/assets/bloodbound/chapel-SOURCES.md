# Chapel material sources

The chapel geometry, carved mouldings, window tracery and wear details are original procedural geometry. Surface textures and the reflection environment below are downloaded from Poly Haven and served locally with the demo.

| Use | Asset | License |
| --- | --- | --- |
| Columns, arches, altar | [Sandstone Cracks](https://polyhaven.com/a/sandstone_cracks) | CC0 1.0 |
| Masonry walls | [Old Stone Wall 02](https://polyhaven.com/a/old_stone_wall_02) | CC0 1.0 |
| Floor | [Monastery Stone Floor](https://polyhaven.com/a/monastery_stone_floor) | CC0 1.0 |
| Material reflection lighting | [Studio Small 09](https://polyhaven.com/a/studio_small_09) | CC0 1.0 |

See the [Poly Haven license](https://polyhaven.com/license). Original download URLs, hashes and file sizes are recorded in `chapel-materials-manifest.json`. Original image files are unchanged; the shader reduces stone color saturation and combines them with color, normal and roughness maps. All material maps and the HDR are 1K.

Texture coordinates use meters: stone 1.6m per tile, wall 2.1m and floor 2m. Floor mapping is continuous in world X/Z rather than restarting on each geometry tile.

Rendering is local realtime WebGL. Portrait depth of field is used in the character close-up; architectural views stay sharp. Moonlight has a directional source near the upper left of the room, with restrained ambient lighting, contact shadows and a subtle beam. No offline ray-traced rendering or remote runtime dependency is used.

## Sculptural assets added for the full sequence

Downloaded on 2026-10-15 from the official Poly Haven API/download host. All files are served locally; the running experience never calls Poly Haven. Original file hashes and URLs are recorded in `chapel-models-manifest.json`.

| Use | Asset and author | License | Local payload |
| --- | --- | --- | --- |
| Left niche beside the altar | [Gothic Statue](https://polyhaven.com/a/gothic_statue), Benny Weimer | CC0 1.0 | 3.79 MiB, 1K PBR, original geometry 27,739 triangles |
| Altar and aisle candleholders | [Brass Candleholders](https://polyhaven.com/a/brass_candleholders), Tina | CC0 1.0 | 9.06 MiB, 1K PBR, three original variants total 41,936 triangles |
| Hunter's blade, caught and dropped during the rescue | [Antique Estoc](https://polyhaven.com/a/antique_estoc), Ulan Cabanilla (model), James Ray Cock (textures) | CC0 1.0 | 2.41 MiB, 1K PBR, 8,246 triangles |

The statue is scaled and placed in an original architectural niche; its stone tint is cooled in the material. Candleholder variations share geometry and material data between placements. Brass brightness and emissive flame levels are reduced to keep blue-gray moonlight dominant. The estoc is scaled to the hunter's grip and uses its original PBR maps. No downloaded source images were modified.

The hunter's hooded coat, gloves and articulated silhouette are original procedural geometry, not a scanned human. The impact uses a split version of the existing carved pillar, a deterministic falling capital, 62 instanced stone chips and 84 soft dust points. No physics library, local AI inference or offline rendering is used. Fragments stop updating after they settle; replay restores the intact pillar and sword grip.

The environment now also has a real cutout in the left wall for the broad moonlit window. The old exit niche has been replaced by a real passage: the east wall has an arched doorway at `z = -4.45` with two oak doors, and a 7.5 m vaulted stone corridor runs east to a second door at `x = 12.75`. All of it is original procedural geometry made with the existing stone and wall materials; the door planks are a generated canvas texture. A warm point light and an unlit glow box beyond the end door stand in for the next world, which is not part of this chapel.

## Runtime module contract

- `createChapel(THREE, options)` keeps the existing synchronous `group`; `ready` resolves after local sculpture/candle assets finish. Any missing asset is listed in `group.userData.assetErrors` and leaves the architecture usable.
- `chapel.smash(sceneTime)` breaks the left column at `[-3.3, 0, -2.2]`. Call `chapel.update(sceneTime)` on the cinematic clock, and `chapel.reset()` before replay. The impact is already part of the chapel; do not spawn a second impact on top.
- `createHunter(THREE)` exposes `group`, `ready`, `blade`, `rightHand`, `leftHand`, and `head`. The hunter faces local `+Z`, with feet at `Y=0` and a 1.87m silhouette. Placement is controlled externally.
- `hunter.setPose({ threat, attack, stunned }, sceneTime)` accepts weights from 0 to 1. The string shorthand `setPose('threat', sceneTime, weight)` also works. Do not call idle `hunter.update()` after setting a specific pose.
- `hunter.dropBlade(sceneTime, scene)` preserves world placement, then `hunter.updateBlade(sceneTime)` handles the short fall/bounce/slide. Alternatively, `detachBlade(scene)` returns the world-preserved sword for a custom timeline. `reset()` restores the hand parent and grip transform.
- The environment adds no point lights. Candle emission is deliberately dim; the main scene owns moonlight, shadows and any restrained local warm bounce.

## Browser verification, 2026-10-15

The actual local WebGL scene at `http://127.0.0.1:4320/?review=1` was checked at entry, the hunter approach, 16–18 second impact and replay. Screenshots are saved in `.local/bloodbound-review/chapel-impact-18s-20261015.jpg` and `chapel-replay-reset-20261015.jpg`. The 18 second view shows the fractured pillar, fallen upper section, settled stone fragments and complete silver blade on the floor. Returning to the danger section restores the standing hunter, sword grip and clear floor. The left bench was removed to clear the fallen column's resting position.

Visual review caught and corrected uncropped pillar flute triangles at the fracture, the blade passing through the hunter's hood, oversized uniform stone chips and oval face pieces that looked like goggles. Console warnings/errors were empty in the last browser check. The page displayed 52–55 FPS in the final checked views; this was a live observation with other browser work active, not an isolated performance benchmark. The review tab was then closed to release GPU work. These checks cover the environment and hunter, not acceptance of the hero character or the full cinematic.

## Heart pendant

The pendant he gives and the player wears comes from a Meshy AI model the user supplied (`Meshy_AI_Heart_Necklace_Pendan_1015054857`, FBX plus PBR textures). Only the heart vial, cap and cross bail were kept; the chain was dropped, and the textures were resized to 1024 before the parts were exported as `heart-pendant.glb`. Its glow and heartbeat are added at runtime. The asset's usage rights follow the user's Meshy account terms, not this repository's licence.
