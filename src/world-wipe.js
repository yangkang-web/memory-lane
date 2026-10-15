// Screen-space diagonal: at the hold, top = 62%, bottom = 38%.
export const WIPE_TIMING = Object.freeze({ lead: 700, reveal: 1800, hold: 1000, finish: 1600 });
// Solve x(t) before evaluating y(t), just like CSS cubic-bezier easing.
function cubicBezier(x1, y1, x2, y2) {
  const coordinate = (t, a, b) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t * t * b + t ** 3;
  return x => {
    if (x <= 0 || x >= 1) return Math.max(0, Math.min(1, x));
    let low = 0, high = 1;
    for (let i = 0; i < 18; i++) {
      const mid = (low + high) / 2;
      if (coordinate(mid, x1, x2) < x) low = mid; else high = mid;
    }
    return coordinate((low + high) / 2, y1, y2);
  };
}
const enter = cubicBezier(.76, 0, .24, 1);
const leave = cubicBezier(.65, 0, .15, 1);
export function worldWipeAt(elapsed) {
  const { lead, reveal, hold, finish } = WIPE_TIMING;
  if (elapsed < lead) return { phase: 'white', center: 112 };
  if (elapsed < lead + reveal) return { phase: 'revealing', center: 112 - 62 * enter((elapsed - lead) / reveal) };
  if (elapsed < lead + reveal + hold) return { phase: 'hold', center: 50 };
  if (elapsed < lead + reveal + hold + finish) return { phase: 'finishing', center: 50 - 62 * leave((elapsed - lead - reveal - hold) / finish) };
  return { phase: 'apocalypse', center: -12 };
}

export function wipeClip(center) {
  return `polygon(100% 0, ${center + 12}% 0, ${center - 12}% 100%, 100% 100%)`;
}
