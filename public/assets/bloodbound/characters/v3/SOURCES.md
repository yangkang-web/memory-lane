# BLOODBOUND v3 characters

These are downloaded, rigged stock characters adapted for this demo. They are not likeness reconstructions of any person or reference image.

## Lucien — `lucien.glb`

- Body, long coat, trousers, boots, gloves, hair and rig: ["Alucard"](https://sketchfab.com/3d-models/alucard-633eb0d66019491390ba941b55851fd4) by SpatialNeglect, Sketchfab Free Standard license.
- Head, eyes, lashes and facial shape keys: MakeHuman / MPFB (CC0), shaped for this project.
- Project edits: dark wool coat and hair tint, wine silk cravat, scalp blend under the hair, polygon reduction, Mixamo bone names.
- Animations: Adobe Mixamo, retargeted from Lucien's own Mixamo upload. Clips: `circle`, `idle`, `lookdown`, `reach`, `shackle`, `slam`, `sprint`, `throw`, `turn_l`, `turn_r`, `walk`.
- Build: `scripts/bloodbound-lucien-build.py` (Blender 4.5.3). Clip sources are cached under `.local/bloodbound-tools/lucien/anim/`.

## Hunter — `hunter.glb`

- Model: ["Old Hunter – Game Character"](https://sketchfab.com/3d-models/old-hunter-game-character-e4f29469a36a4189aee31a674465b9a7) by Blue-Spirit, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Project edits: claw blade and pistol removed, coat darkened to brown-black, Mixamo auto-rig (reduced hand rig: one index chain per hand).
- Weapon: Poly Haven ["Antique Estoc"](https://polyhaven.com/a/antique_estoc) (CC0), attached at runtime by `src/bloodbound/props.js`.
- Animations: Adobe Mixamo. Clips: `draw`, `idle`, `knocked`, `slash`, `thrown`, `walk`.
- Build: `scripts/bloodbound-hunter-build.py`.

## Player arms — `arms.glb`

- Model and rig: Adobe Mixamo character "Louise", exported skinned in T-pose.
- Project edits: head, neck, hips and legs removed so only the torso, arms and hands remain (full skeleton kept so clips bind); jacket and shirt tinted near-black and made matte.
- Animations: Adobe Mixamo. Clips: `hit`, `holding`, `idle`, `reach`.
- Build: `scripts/bloodbound-arms-build.py`. Sources are cached under `.local/bloodbound-tools/arms/`.

Mixamo characters and animations are used under Adobe's Mixamo terms, which permit use in projects without attribution; they are listed here for provenance.
