# Curtain call asset sources

- `question-mark.glb`: the chrome question mark from the user-supplied Emochi reference model
  (`white-character.blend`), exported with `scripts/curtain-call-question-mark.py`. Not redistributable on its own.
- Emochi: rebuilt procedurally in `src/curtain-call/emochi-rig.js` from the proportions of the same reference model.
  It does not load the .blend file at runtime.
- Desk lamp, pencil, paper ball, clapperboard, steps, heart, confetti, stage, curtains and lights: generated in code.
- Music and sound effects: synthesised locally with Web Audio (`src/curtain-call/music.js`). No samples, no network.
- Script: the thank-you lines were written by the user for this curtain call.
