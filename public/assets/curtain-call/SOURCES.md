# Curtain call asset sources

- `question-mark.glb`: the chrome question mark from the user-supplied Emochi reference model
  (`white-character.blend`), exported with `scripts/curtain-call-question-mark.py`. Not redistributable on its own.
- Emochi: rebuilt procedurally in `src/curtain-call/emochi-rig.js` from the proportions of the same reference model.
  It does not load the .blend file at runtime.
- Blood-heart pendant: reused from `public/assets/bloodbound/blood-heart-pendant.glb` (BLOODBOUND in this repository).
- Sunflower, paper boat, flame, teacup, heart, confetti, stage, curtains and lights: generated in code.
- Music and sound effects: synthesised locally with Web Audio (`src/curtain-call/music.js`). No samples, no network.
- Memory titles name the demo and literary sample worlds of Memory Lane; the tea party adapts *Alice's Adventures in
  Wonderland*, Chapter VII (public domain). None of it is real user history.
