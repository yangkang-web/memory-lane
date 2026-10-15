// Walkable space of the chapel, in the metres chapel.js builds with. Plain data and math so it runs without WebGL.
export const PLAYER_RADIUS = 0.26;
export const EYE_HEIGHT = 1.6;
export const ALTAR = { x: 0, z: -5.5 };
// Just inside the west door, facing the altar down the nave.
export const START = { x: 0, z: 5.6, yaw: 0 };

// Inside the side-wall plinths and the mouldings along the rear and west walls.
export const BOUNDS = { minX: -5.1, maxX: 5.1, minZ: -6.8, maxZ: 6.6 };
// The passage out through the east wall, to the door at its far end. Closed off until the story is over.
export const PASSAGE = { minX: 5.1, maxX: 12.6, minZ: -5.25, maxZ: -3.65, door: 12.75, z: -4.45 };
// What the clamp allows: the chapel and, east of it, the passage; the east wall's boxes keep the rest out.
const OUTER = { ...BOUNDS, maxX: PASSAGE.maxX };

export const CIRCLES = [
  ...[-6.7, -2.2, 2.3].flatMap(z => [{ x: -3.3, z, r: 0.42 }, { x: 3.3, z, r: 0.42 }]),
  ...[-6.7, -2.2, 2.3, 6.5].flatMap(z => [{ x: -5.22, z, r: 0.3 }, { x: 5.22, z, r: 0.3 }]),
  { x: -2.18, z: -6.12, r: 0.16 }, { x: 2.2, z: -6.04, r: 0.16 }, { x: 4.95, z: -3.35, r: 0.16 },
];

export const BOXES = [
  { minX: -1.14, maxX: 1.14, minZ: -6.03, maxZ: -4.97 }, // altar
  { minX: -4.95, maxX: -3.55, minZ: -7.1, maxZ: -5.81 }, // statue plinth
  { minX: 4.47, maxX: 5.1, minZ: -0.9, maxZ: 1.2 }, // stone bench, out to the wall
  // The east wall, either side of the doorway into the passage.
  { minX: 5.1, maxX: 14, minZ: -8, maxZ: -5.25 },
  { minX: 5.1, maxX: 14, minZ: -3.65, maxZ: 8 },
];

// The three altar steps, highest first.
const STEPS = [[2.25, -4.85, 0.4], [2.475, -4.55, 0.275], [2.7, -4.25, 0.15]];
export function floorHeight(x, z) {
  for (const [halfWidth, front, top] of STEPS) if (Math.abs(x) <= halfWidth && z <= front) return top;
  return 0;
}

// Push a circle of radius r out of every obstacle. A few passes settle corners where two obstacles meet.
export function resolve(point, r = PLAYER_RADIUS, extra = [], { open = true } = {}) {
  let { x, z } = point;
  const bounds = open ? OUTER : BOUNDS;
  const inside = ([px, pz]) => px >= bounds.minX + r && px <= bounds.maxX - r && pz >= bounds.minZ + r && pz <= bounds.maxZ - r;
  const clamp = () => {
    x = Math.min(Math.max(x, bounds.minX + r), bounds.maxX - r);
    z = Math.min(Math.max(z, bounds.minZ + r), bounds.maxZ - r);
  };
  for (let pass = 0; pass < 4; pass++) {
    clamp();
    for (const c of [...CIRCLES, ...extra]) {
      const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), min = c.r + r;
      if (d >= min) continue;
      const nx = d > 1e-6 ? dx / d : 0, nz = d > 1e-6 ? dz / d : 1;
      x = c.x + nx * min; z = c.z + nz * min;
    }
    for (const b of BOXES) {
      const cx = Math.min(Math.max(x, b.minX), b.maxX), cz = Math.min(Math.max(z, b.minZ), b.maxZ);
      const dx = x - cx, dz = z - cz, d = Math.hypot(dx, dz);
      if (d >= r) continue;
      if (d > 1e-6) { x = cx + dx / d * r; z = cz + dz / d * r; continue; }
      // Centre inside the box: leave through the nearest face that is still inside the chapel and not in another box.
      const free = ([px, pz]) => BOXES.every(o => o === b || px <= o.minX - r + 1e-6 || px >= o.maxX + r - 1e-6 || pz <= o.minZ - r + 1e-6 || pz >= o.maxZ + r - 1e-6);
      const exits = [[b.minX - r, z], [b.maxX + r, z], [x, b.minZ - r], [x, b.maxZ + r]].filter(e => inside(e) && free(e));
      [x, z] = exits.reduce((best, e) => Math.hypot(e[0] - x, e[1] - z) < Math.hypot(best[0] - x, best[1] - z) ? e : best);
    }
  }
  clamp();
  return { x, z };
}
