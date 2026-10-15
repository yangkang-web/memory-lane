import { EYE_HEIGHT, PLAYER_RADIUS, floorHeight, resolve } from './layout.js';

const SPEED = 1.2;
const MOUSE = 0.0022;
const TOUCH_LOOK = 0.0052;
const PITCH_LIMIT = 1.25;
const STICK_RADIUS = 48;
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));

// First-person body: WASD or the left-thumb stick moves, mouse (pointer lock or drag) or the right thumb looks.
// yaw 0 faces -z, the direction a default Three.js camera looks.
export function createPlayer({ camera, dom, stick, reducedMotion = false }) {
  const keys = new Set();
  const pose = { x: 0, z: 0, yaw: 0, pitch: 0, floor: 0 };
  const touches = new Map();
  const move = { x: 0, z: 0 };
  let stickVector = { x: 0, y: 0 };
  let dragging = null;
  let limit = null;
  let bob = 0, bobAmount = 0;
  const player = {
    enabled: false,
    movable: true,
    // Off while auto-play has the body: keys, mouse and touch no longer move or turn it, and `drive` walks it instead,
    // a world-space direction scaled 0 … 1.
    manual: true,
    drive: null,
    pose,
    // Metres walked; the story uses it to tell an idle player from one who is exploring.
    travelled: 0,
    obstacles: [],
    // The passage out through the east wall can be walked once its door has opened.
    passageOpen: false,
    get locked() { return document.pointerLockElement === dom; },
    setPose({ x, z, yaw = pose.yaw, pitch = 0 }) {
      Object.assign(pose, resolve({ x, z }, PLAYER_RADIUS, [], { open: player.passageOpen }), { yaw, pitch });
      pose.floor = floorHeight(pose.x, pose.z);
      move.x = move.z = 0;
      apply(0);
    },
    // Keep the view within `range` radians of `yaw`. A view outside the window is eased back, not snapped.
    limitLook(next) { limit = next; },
    requestLock() {
      if (matchMedia('(pointer: coarse)').matches || player.locked || !player.manual) return;
      try { dom.requestPointerLock?.()?.catch?.(() => {}); } catch {}
    },
    releaseLock() { if (player.locked) document.exitPointerLock(); },
    forward() { return { x: -Math.sin(pose.yaw) * Math.cos(pose.pitch), y: Math.sin(pose.pitch), z: -Math.cos(pose.yaw) * Math.cos(pose.pitch) }; },
    update,
    dispose() { abort.abort(); },
  };

  const abort = new AbortController();
  const on = (target, type, fn, opts = {}) => target.addEventListener(type, fn, { signal: abort.signal, ...opts });
  const look = (dx, dy, scale) => {
    if (!player.enabled || !player.manual) return;
    pose.yaw -= dx * scale;
    pose.pitch = Math.min(PITCH_LIMIT, Math.max(-PITCH_LIMIT, pose.pitch - dy * scale));
  };
  on(window, 'keydown', event => {
    if (/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    keys.add(event.code);
    if (player.enabled && /^(Arrow|Key[WASD])/.test(event.code)) event.preventDefault();
  });
  on(window, 'keyup', event => keys.delete(event.code));
  on(window, 'blur', () => keys.clear());
  on(document, 'mousemove', event => { if (player.locked) look(event.movementX, event.movementY, MOUSE); });
  on(dom, 'pointerdown', event => {
    if (!player.enabled) return;
    if (event.pointerType === 'touch') {
      const left = event.clientX < innerWidth * 0.45 && ![...touches.values()].some(t => t.kind === 'stick');
      touches.set(event.pointerId, { kind: left ? 'stick' : 'look', x: event.clientX, y: event.clientY, ox: event.clientX, oy: event.clientY });
      if (left) { stick.hidden = false; stick.style.left = `${event.clientX}px`; stick.style.top = `${event.clientY}px`; setKnob(0, 0); }
      dom.setPointerCapture(event.pointerId);
    } else if (!player.locked) {
      dragging = { x: event.clientX, y: event.clientY, id: event.pointerId };
      dom.setPointerCapture(event.pointerId);
    }
  });
  on(dom, 'pointermove', event => {
    const touch = touches.get(event.pointerId);
    if (touch?.kind === 'look') { look(event.clientX - touch.x, event.clientY - touch.y, TOUCH_LOOK); touch.x = event.clientX; touch.y = event.clientY; }
    else if (touch?.kind === 'stick') {
      let dx = event.clientX - touch.ox, dy = event.clientY - touch.oy;
      const d = Math.hypot(dx, dy);
      if (d > STICK_RADIUS) { dx *= STICK_RADIUS / d; dy *= STICK_RADIUS / d; }
      stickVector = { x: dx / STICK_RADIUS, y: dy / STICK_RADIUS };
      setKnob(dx, dy);
    } else if (dragging?.id === event.pointerId) {
      look(event.clientX - dragging.x, event.clientY - dragging.y, MOUSE * 1.4);
      dragging.x = event.clientX; dragging.y = event.clientY;
    }
  });
  const end = event => {
    const touch = touches.get(event.pointerId);
    if (touch?.kind === 'stick') { stickVector = { x: 0, y: 0 }; stick.hidden = true; }
    touches.delete(event.pointerId);
    if (dragging?.id === event.pointerId) dragging = null;
  };
  on(dom, 'pointerup', end);
  on(dom, 'pointercancel', end);
  function setKnob(dx, dy) { stick.firstElementChild.style.transform = `translate(${dx}px, ${dy}px)`; }

  function update(dt) {
    let ix = 0, iz = 0;
    if (player.enabled && player.movable && !player.manual && player.drive) {
      // Turned back into the body's frame so it is walked like any other input.
      const sin = Math.sin(pose.yaw), cos = Math.cos(pose.yaw);
      ix = player.drive.x * cos - player.drive.z * sin;
      iz = player.drive.x * sin + player.drive.z * cos;
    } else if (player.enabled && player.movable && player.manual) {
      if (keys.has('KeyW') || keys.has('ArrowUp')) iz -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) iz += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
      ix += stickVector.x; iz += stickVector.y;
    }
    const length = Math.hypot(ix, iz);
    if (length > 1) { ix /= length; iz /= length; }
    // Short acceleration so starts and stops feel like a body, not a camera rig.
    const blend = 1 - Math.exp(-dt * 9);
    const sin = Math.sin(pose.yaw), cos = Math.cos(pose.yaw);
    move.x += ((ix * cos + iz * sin) * SPEED - move.x) * blend;
    move.z += ((-ix * sin + iz * cos) * SPEED - move.z) * blend;
    if (dt > 0 && Math.hypot(move.x, move.z) > 0.01) {
      const before = { x: pose.x, z: pose.z };
      Object.assign(pose, resolve({ x: pose.x + move.x * dt, z: pose.z + move.z * dt }, PLAYER_RADIUS, player.obstacles, { open: player.passageOpen }));
      const step = Math.hypot(pose.x - before.x, pose.z - before.z);
      player.travelled += step;
      bob += step * 5.4;
      bobAmount += (Math.min(1, step / dt / SPEED) - bobAmount) * blend;
    } else bobAmount += (0 - bobAmount) * blend;
    if (limit) {
      const offset = wrap(pose.yaw - limit.yaw);
      if (Math.abs(offset) > limit.range) pose.yaw = limit.yaw + Math.sign(offset) * (limit.range + (Math.abs(offset) - limit.range) * Math.exp(-dt * 6));
      if (limit.pitch != null) pose.pitch = Math.min(limit.pitch, Math.max(-(limit.down ?? limit.pitch), pose.pitch));
    }
    // Climbing a step is eased so the eye rises over a few frames instead of popping.
    pose.floor += (floorHeight(pose.x, pose.z) - pose.floor) * (1 - Math.exp(-dt * 12));
    apply(dt);
  }
  function apply() {
    const sway = reducedMotion ? 0 : bobAmount;
    camera.position.set(
      pose.x + Math.cos(pose.yaw) * Math.sin(bob * 0.5) * 0.008 * sway,
      pose.floor + EYE_HEIGHT + Math.abs(Math.sin(bob * 0.5)) * 0.018 * sway,
      pose.z - Math.sin(pose.yaw) * Math.sin(bob * 0.5) * 0.008 * sway,
    );
    camera.rotation.set(pose.pitch, pose.yaw, 0, 'YXZ');
  }
  return player;
}
