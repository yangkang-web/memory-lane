import * as THREE from 'three';
import { ALTAR } from './layout.js';

// Auto-play: walks and looks for the player and does what each scene asks of them, on the beats of the timeline, so
// the memory plays through like a film. It only reads the story's state and acts through the same doors the player
// does (the body's drive, the view, the interaction targets), so it can be switched on or off at any moment and pick
// up from wherever the story is.
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));

export function createAutopilot({ player, flow, interact, director, lucien, hunter, pendant, arms }) {
  const bone = (character, name) => character.root.getObjectByName(`mixamorig${name}`);
  const lucienHead = bone(lucien, 'Head'), hunterHead = bone(hunter, 'Head'), hunterHips = bone(hunter, 'Hips');
  const look = new THREE.Vector3(), at = new THREE.Vector3(), from = new THREE.Vector3();
  let active = false, segment = null, holding = null, used = false;

  // Turns the view towards a world point, `rate` per second, like a head rather than a camera cut.
  function face(point, dt, rate = 3) {
    const { x, z, floor } = player.pose;
    from.set(x, floor + 1.6, z);
    const dx = point.x - from.x, dy = point.y - from.y, dz = point.z - from.z;
    const yaw = Math.atan2(-dx, -dz), pitch = Math.atan2(dy, Math.hypot(dx, dz));
    const k = 1 - Math.exp(-dt * rate);
    player.pose.yaw += wrap(yaw - player.pose.yaw) * k;
    player.pose.pitch += (pitch - player.pose.pitch) * k;
  }
  const head = (bone, drop = 0, target = look) => bone.getWorldPosition(target).setY(target.y - drop);
  function hold(id) { if (holding !== id) { holding = id; interact.hold(id); } }
  function letGo() { if (holding) { holding = null; interact.letGo(); } }

  function update(dt) {
    if (!active) return;
    if (flow.segment !== segment) { segment = flow.segment; letGo(); used = false; }
    const t = flow.elapsed, rite = director.rite;
    player.drive = null;
    switch (segment) {
      case 'explore': {
        // Down the nave towards the altar light at a steady walk.
        const { x, z } = player.pose;
        const dx = ALTAR.x - x, dz = ALTAR.z + 2.6 - z, d = Math.hypot(dx, dz) || 1;
        if (t > 0.6) player.drive = { x: dx / d, z: dz / d };
        face(at.set(ALTAR.x + Math.sin(t * 0.5) * 0.4, 1.35, ALTAR.z), dt, 1.6);
        break;
      }
      case 'danger':
        // Still facing the altar until the blade sounds, then round to find him and keep him in view.
        if (t < 2.1) face(at.set(ALTAR.x, 1.35, ALTAR.z), dt, 1.6);
        else face(head(hunterHead, 0.12), dt, t < 3.2 ? 2.4 : 4);
        break;
      case 'rescue':
        if (hunter.clip === 'knocked') face(head(hunterHips), dt, 3.5);
        else if (lucien.group.visible) face(head(hunterHead, 0.1, at).lerp(head(lucienHead, 0.1), 0.5), dt, 3);
        else face(head(hunterHead, 0.1), dt, 4);
        break;
      case 'wound':
        // Watch him come over, then lift the cut arm and look at it while he speaks.
        if (t < 1.4) face(head(lucienHead, 0.1), dt, 2.5);
        else {
          if (player.pose.pitch < -0.32) hold('arm');
          face(arms.wrist(at).setY(at.y + 0.05), dt, 3);
        }
        break;
      case 'intimacy':
        // A long look at each other before you reach for him; once he has your hand, eyes on his face.
        face(head(lucienHead, 0.08), dt, 2.5);
        if (t > 4.2) hold('lucien');
        break;
      case 'gift':
        // Down at the glass while it fills, then at the necklace as he holds it up, and take it.
        if (rite?.kind === 'gift' && rite.time > 0.9 && rite.time < 5.6) face(pendant.group.getWorldPosition(at).setY(at.y + 0.04), dt, 2.6);
        else face(rite?.time >= 5.6 ? pendant.group.getWorldPosition(at).lerp(head(lucienHead, 0.1), 0.35) : head(lucienHead, 0.1), dt, 2.6);
        if (!used && rite?.kind === 'gift' && rite.time > 6.3) { used = true; interact.use('pendant'); }
        break;
      case 'wear':
        // At his face while he opens the chain; once it is fastened and his brow rests on yours, down at the heart now
        // on your chest, and up again as he draws back for the last line.
        if (rite?.kind === 'wear' && rite.time > 4.3 && rite.gapGoal !== 0.05 && rite.release === Infinity) face(arms.anchor('chest', at).addScaledVector(arms.forward, 0.08), dt, 2);
        else if (rite?.kind === 'wear' && rite.gapGoal === 0.05) face(head(lucienHead, -0.07), dt, 3.6); // up to his eyes for the last line
        else face(head(lucienHead, 0.13), dt, 2.2);
        break;
      case 'end':
        // Down at the heart lit on your chest, then back up to him.
        // The heart hangs almost straight below the eyes; aimed just ahead of it so it sits in the lower frame.
        if (rite?.kind === 'end' && !rite.done && rite.time > 0.5) face(arms.anchor('chest', at).addScaledVector(arms.forward, 0.08), dt, 2.2);
        else face(head(lucienHead, 0.06), dt, 2);
        break;
    }
  }

  return {
    get active() { return active; },
    set active(value) {
      if (active === value) return;
      active = value;
      segment = null;
      letGo();
      player.manual = !value;
      player.drive = null;
      interact.quiet = value;
    },
    update,
  };
}
