# 海边小屋 / Seaside cottage

Independent local Three.js scene at `/seaside`. Original procedural room and collections with user-supplied cigarette, necklace and letter models; no purchases, remote services, or changes to the apocalypse story.

- First-person living room: ocean window, linen curtains, sofa, coffee table, plant and warm wood cabinet on the right.
- Approximately 12 seconds after the asset loads: 0–3.2s approach and turn toward the cabinet without sway; 3.2–8s stand at the cabinet and make one gentle left/right sweep; 8–12s move closer and focus on the necklace. Hold the final view.
- The user's new cigarette-butt model loads from `public/assets/seaside/cigarette-butt.glb` on the left. It replaces the earlier cigarette with smoke; its supplied PBR maps are retained at the documented runtime resolutions. The original download is untouched. Runtime mesh is reduced from 2,651,754 to 80,000 triangles; this is a performance tradeoff, not a full-fidelity source export.
- The necklace occupies the middle plinth; `createSeasideWorld().hero` now refers to its display. The letter remains on the right. `HERO_POSITION` in `src/seaside-motion.js` targets the centered necklace. Automatic opening, replay and manual return-to-focus all use that target.
- Replay restarts the view. Drag or focus the canvas and use arrow keys to look freely. The focus button returns smoothly to the collectible. Reduced motion skips the automatic camera movement and freezes environmental motion.
- Rendering uses local procedural textures, environment lighting, directional shadows, cabinet lights, ambient occlusion and animated sea ripples. Room geometry is original; downloaded collectible provenance is recorded in `ASSET-LICENSES.md`.

Validation (current revision): motion tests check the approach is monotonic, one gaze cycle occurs only while stationary at the cabinet, continuous camera positions, stable final focus and reduced-motion behavior. Converted GLB positions are finite and all three PBR texture slots are present. Previous review screenshots depict the superseded placeholder.

Current checks: `npm test` passed 61/61, production build passed (existing shared Three.js chunk-size advisory remains), and `git diff --check` passed. Final model screenshot: `evidence/seaside-cigarette-final.jpg`.

Previous two-sway revision browser review: approach without opening sway, two sways while at the cabinet, stable final focus, textured cigarette and static smoke fully visible, both brass supports in contact. No console errors/warnings. Evidence: `evidence/seaside-cigarette-review.jpg`.

### Side collectibles

The user-supplied heart necklace is now in the middle, with the new cigarette butt on the left and the love-letter envelope on the right. Each keeps its supplied PBR textures, with a dark necklace backboard and a small envelope easel. All three GLBs load before automatic playback begins. The approach and single sway are retained; final focus now targets the central necklace.

Both GLBs passed finite-position and PBR-slot checks; production build and diff checks pass. Screenshot: `evidence/seaside-keepsakes.jpg`.

Independent browser review passed: all three collectibles visible side by side, necklace and letter face forward with intact materials, supports touch the shelf without visible overlap or floating, and the existing approach/sway/cigarette-focus sequence still works. No console errors or warnings. Review evidence: `evidence/seaside-keepsakes-review.jpg`.

Single-sway revision: cabinet inspection now uses one left/right cycle and a smaller synchronized vertical motion. Motion tests and build pass. Independent full 12-second browser replay confirmed one sweep, no repeated nodding, normal approach and final cigarette focus, and no console errors/warnings. Evidence: `evidence/seaside-single-sway-review.jpg`.

Necklace-focus revision: motion tests and production build pass; new cigarette-butt GLB positions are finite and all PBR texture slots are present. Previous review entries above describe earlier layouts. Current screenshot: `evidence/seaside-necklace-focus.jpg`.

Independent necklace-focus review passed: first automatic playback, replay and manual refocus all settle on the centered necklace with full chain and pendant visible. One cabinet sway remains. New left cigarette butt has visible wrinkles and charred tip, contacts both supports, and has no old smoke mesh. The right letter remains separate. No console errors/warnings. Evidence: `evidence/seaside-necklace-review.jpg`.
