import * as THREE from 'three';

// Things the player can use by looking at them: the crosshair picks the nearest target whose sphere the view ray
// passes through. E, a left click while the pointer is locked, or the touch button uses it; hold targets stay active
// for as long as the input is held and the target stays in view.
export function createInteraction({ camera, dom, prompt, button, isLocked }) {
  const targets = new Map();
  const ray = new THREE.Ray();
  const point = new THREE.Vector3();
  const toPoint = new THREE.Vector3();
  let focused = null;
  let held = null;
  let pressed = false;
  let enabled = false;
  let shown = '';
  // Set while auto-play reaches for a target by name rather than by where the view points; `quiet` hides the prompt.
  let forced = null, quiet = false;
  const abort = new AbortController();
  const on = (target, type, fn) => target.addEventListener(type, fn, { signal: abort.signal });

  const press = () => {
    if (!enabled || pressed) return;
    pressed = true;
    if (!focused) return;
    if (focused.hold) { held = focused; focused.onHold?.(); } else focused.onUse?.();
  };
  // Letting go of the target, not of the key: a key still held when the next scene's target appears takes it.
  const drop = () => { if (held) { const was = held; held = null; was.onRelease?.(); } };
  const release = () => { pressed = false; drop(); };
  on(window, 'keydown', event => { if (event.code === 'KeyE' && !event.repeat && !/INPUT|TEXTAREA/.test(event.target.tagName)) press(); });
  on(window, 'keyup', event => { if (event.code === 'KeyE') release(); });
  on(window, 'blur', release);
  on(dom, 'mousedown', event => { if (event.button === 0 && isLocked()) press(); });
  on(window, 'mouseup', event => { if (event.button === 0) release(); });
  on(button, 'pointerdown', event => {
    event.preventDefault();
    // Capture keeps the hold when the thumb drifts off the button; losing it must not lose the press.
    try { button.setPointerCapture(event.pointerId); } catch {}
    press();
  });
  on(button, 'pointerup', release);
  on(button, 'pointercancel', release);
  on(button, 'contextmenu', event => event.preventDefault());

  function pick() {
    camera.getWorldPosition(ray.origin);
    camera.getWorldDirection(ray.direction);
    let best = null, bestDistance = Infinity;
    for (const target of targets.values()) {
      if (target.enabled && !target.enabled()) continue;
      target.position(point);
      toPoint.subVectors(point, ray.origin);
      const along = toPoint.dot(ray.direction), distance = toPoint.length();
      if (along <= 0 || distance > (target.maxDistance ?? 2.2)) continue;
      // Near targets get a wider window so a close face is not fiddly to aim at.
      const radius = (target.radius ?? 0.2) + Math.max(0, 1.2 - distance) * 0.12;
      if (ray.distanceSqToPoint(point) > radius * radius) continue;
      if (distance < bestDistance) { best = target; bestDistance = distance; }
    }
    return best;
  }

  return {
    get focused() { return focused?.id ?? null; },
    get held() { return held?.id ?? null; },
    set enabled(value) { enabled = value; if (!value) { drop(); focused = null; render(); } },
    get enabled() { return enabled; },
    add(target) { targets.set(target.id, target); return target; },
    remove(id) { if (held?.id === id) drop(); targets.delete(id); if (focused?.id === id) focused = null; },
    clear() { drop(); targets.clear(); focused = null; render(); },
    // Auto-play's hands: press and keep holding the target `id` whatever the view, let go, or use one outright.
    hold(id) { forced = id; pressed = true; },
    letGo() { forced = null; release(); },
    use(id) { const target = targets.get(id); if (enabled && target && (!target.enabled || target.enabled())) target.onUse?.(); },
    set quiet(value) { quiet = value; shown = ''; render(); },
    update() {
      const named = forced && targets.get(forced);
      let next = enabled ? (named && (!named.enabled || named.enabled()) ? named : pick()) : null;
      // A hold target is let go as soon as the player looks away from it, unless it asks to be kept while held.
      if (held?.sticky?.() && enabled) next = held;
      if (held && next !== held) { const was = held; held = null; was.onRelease?.(); }
      focused = next;
      // Holding E first and then turning to the target counts as reaching for it.
      if (pressed && !held && focused?.hold) { held = focused; focused.onHold?.(); }
      render();
    },
    dispose() { abort.abort(); },
  };

  function render() {
    const label = focused && !quiet ? (held === focused ? focused.holdingLabel ?? focused.label : focused.label) : '';
    const signature = `${label}|${held === focused}`;
    if (signature === shown) return;
    shown = signature;
    prompt.hidden = !label;
    button.hidden = !label;
    if (!label) return;
    const touch = matchMedia('(pointer: coarse)').matches;
    const key = focused.hold ? (touch ? '按住' : '按住 E') : (touch ? '轻点' : 'E');
    // On touch the round button already says what to do, so the prompt carries only the label.
    prompt.innerHTML = touch ? '<span></span>' : `<kbd>${key}</kbd><span></span>`;
    prompt.querySelector('span').textContent = label;
    button.textContent = focused.hold ? '按住' : '使用';
    button.classList.toggle('holding', held === focused);
  }
}
