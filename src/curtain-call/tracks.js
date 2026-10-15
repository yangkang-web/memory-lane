// Keyframed motion for the curtain call. Everything on stage is a pure function of the show clock, so pausing,
// seeking and replaying never leave the scene in a state it could not reach by playing.

export const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, value));
export const mix = (a, b, t) => a + (b - a) * t;
export const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
export const smoother = t => { t = clamp(t); return t * t * t * (t * (t * 6 - 15) + 10); };
export const easeOutBack = (t, s = 1.6) => { t = clamp(t) - 1; return 1 + t * t * ((s + 1) * t + s); };
export const easeOutCubic = t => 1 - (1 - clamp(t)) ** 3;
export const easeInCubic = t => clamp(t) ** 3;
/** 0 before `start`, 1 after `end`, eased between. */
export const window01 = (time, start, end, ease = smoother) => ease(clamp((time - start) / (end - start)));
/** Rises over [a, b], holds, falls over [c, d]. */
export const pulse = (time, a, b, c, d, ease = smooth) => Math.min(window01(time, a, b, ease), 1 - window01(time, c, d, ease));

/**
 * A cubic Hermite track over [time, value] keys, with tangents taken from the neighbouring keys and scaled by time,
 * so unevenly spaced keys still move with one continuous velocity. A key with `hold` set arrives and leaves at rest.
 * Values are numbers or equal-length arrays.
 */
export function track(keys) {
  const list = keys.map(([time, value, hold]) => ({ time, value: Array.isArray(value) ? value : [value], hold: hold === 'hold', scalar: !Array.isArray(value) }));
  const width = list[0].value.length;
  const tangents = list.map((key, i) => {
    const out = new Array(width).fill(0);
    if (key.hold || i === 0 || i === list.length - 1) return out;
    const a = list[i - 1], b = list[i + 1];
    for (let j = 0; j < width; j++) out[j] = (b.value[j] - a.value[j]) / (b.time - a.time);
    return out;
  });
  const result = new Array(width).fill(0);
  return function sample(time) {
    if (time <= list[0].time) return output(list[0].value);
    const last = list.length - 1;
    if (time >= list[last].time) return output(list[last].value);
    let i = 0;
    while (list[i + 1].time < time) i++;
    const a = list[i], b = list[i + 1], span = b.time - a.time, t = (time - a.time) / span;
    const t2 = t * t, t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
    for (let j = 0; j < width; j++) result[j] = h00 * a.value[j] + h10 * span * tangents[i][j] + h01 * b.value[j] + h11 * span * tangents[i + 1][j];
    return output(result);
  };
  function output(value) {
    if (list[0].scalar) return value[0];
    for (let j = 0; j < width; j++) result[j] = value[j];
    return result;
  }
}

/** Deterministic pseudo-random in [0, 1) for a seed, so particles fall the same way on every replay. */
export function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}
