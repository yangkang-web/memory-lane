# 海边小屋 / Seaside cottage

Independent local Three.js scene at `/seaside`. Original procedural room and collections with user-supplied cigarette, necklace and letter models; no purchases, remote services, or changes to the apocalypse story.

- First-person living room: ocean window, linen curtains, sofa, coffee table, plant and warm wood cabinet on the right.
- Approximately 12 seconds after the asset loads: 0–3.2s approach and turn toward the cabinet without sway; 3.2–8s stand at the cabinet and make two small head movements; 8–12s move closer and focus on the cigarette. Hold the final view.
- The user's downloaded cigarette is loaded from `public/assets/seaside/cigarette.glb` into `createSeasideWorld().hero`. It retains the supplied color, normal and metallic/roughness maps plus the source's static smoke sculpture. Brass cradle heights are fitted to the model's underside. Camera focus is defined by `HERO_POSITION` in `src/seaside-motion.js`. Loading completes before camera motion starts; failures show a retry message.
- Replay restarts the view. Drag or focus the canvas and use arrow keys to look freely. The focus button returns smoothly to the collectible. Reduced motion skips the automatic camera movement and freezes environmental motion.
- Rendering uses local procedural textures, environment lighting, directional shadows, cabinet lights, ambient occlusion and animated sea ripples. Room geometry is original; downloaded collectible provenance is recorded in `ASSET-LICENSES.md`.

Validation (current revision): motion tests check the approach is monotonic, two gaze cycles occur only while stationary at the cabinet, continuous camera positions, stable final focus and reduced-motion behavior. Converted GLB positions are finite and all three PBR texture slots are present. Previous review screenshots depict the superseded placeholder.

Current checks: `npm test` passed 61/61, production build passed (existing shared Three.js chunk-size advisory remains), and `git diff --check` passed. Final model screenshot: `evidence/seaside-cigarette-final.jpg`.

Independent browser replay review passed for this revision: approach without opening sway, two sways while at the cabinet, stable final focus, textured cigarette and static smoke fully visible, both brass supports in contact. No console errors/warnings. Evidence: `evidence/seaside-cigarette-review.jpg`.

### Side collectibles

The user-supplied heart necklace replaces the compass on the left of the cigarette. The love-letter envelope replaces the rolled chart on the right. Each keeps its supplied PBR textures, with a dark necklace backboard and a small envelope easel. All three GLBs load before automatic playback begins. The camera path and cigarette focus remain unchanged.

Both GLBs passed finite-position and PBR-slot checks; production build and diff checks pass. Screenshot: `evidence/seaside-keepsakes.jpg`.

Independent browser review passed: all three collectibles visible side by side, necklace and letter face forward with intact materials, supports touch the shelf without visible overlap or floating, and the existing approach/sway/cigarette-focus sequence still works. No console errors or warnings. Review evidence: `evidence/seaside-keepsakes-review.jpg`.
