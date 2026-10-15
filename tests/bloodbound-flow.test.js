import test from 'node:test';
import assert from 'node:assert/strict';
import { StoryFlow, readCheckpoint, CHECKPOINT_KEY, readAutoplay, saveAutoplay, AUTOPLAY_KEY } from '../src/bloodbound/flow.js';
import { resolve, floorHeight, CIRCLES, BOXES, BOUNDS, PASSAGE, PLAYER_RADIUS } from '../src/bloodbound/layout.js';

const memoryStorage = () => {
  const map = new Map();
  return { getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, String(v)), removeItem: k => map.delete(k), map };
};

test('a stale trigger from an earlier segment cannot skip ahead', () => {
  const flow = new StoryFlow();
  flow.go('danger');
  assert.equal(flow.advance('danger'), true);
  assert.equal(flow.segment, 'rescue');
  assert.equal(flow.advance('danger'), false);
  assert.equal(flow.segment, 'rescue');
});

test('checkpoints round-trip and malformed saves are discarded', () => {
  const storage = memoryStorage();
  const flow = new StoryFlow({ storage });
  flow.go('wound');
  assert.equal(readCheckpoint(storage), 'wound');
  flow.go('end');
  assert.equal(readCheckpoint(storage), null);
  for (const bad of ['{', '[]', '{"version":1,"segment":"boss","savedAt":1}', '{"version":1,"segment":"gift","savedAt":1,"x":1}', '{"version":2,"segment":"gift","savedAt":1}']) {
    storage.setItem(CHECKPOINT_KEY, bad);
    assert.equal(readCheckpoint(storage), null, bad);
    assert.equal(storage.map.has(CHECKPOINT_KEY), false);
  }
});

test('auto-play defaults on, round-trips, and anything else saved is discarded', () => {
  const storage = memoryStorage();
  assert.equal(readAutoplay(storage), true);
  saveAutoplay(storage, false);
  assert.equal(readAutoplay(storage), false);
  for (const bad of ['true', '0', '{"on":false}', '']) {
    storage.setItem(AUTOPLAY_KEY, bad);
    assert.equal(readAutoplay(storage), true, bad);
    assert.equal(storage.map.has(AUTOPLAY_KEY), false);
  }
  assert.equal(readAutoplay(null), true);
});

test('walking into any obstacle from any side leaves the body outside it', () => {
  const clear = ({ x, z }, maxX) => CIRCLES.every(c => Math.hypot(x - c.x, z - c.z) >= c.r + PLAYER_RADIUS - 1e-6)
    && BOXES.every(b => Math.hypot(x - Math.min(Math.max(x, b.minX), b.maxX), z - Math.min(Math.max(z, b.minZ), b.maxZ)) >= PLAYER_RADIUS - 1e-6)
    && x >= BOUNDS.minX + PLAYER_RADIUS - 1e-6 && x <= maxX - PLAYER_RADIUS + 1e-6;
  for (const open of [false, true]) {
    for (let x = -5.5; x <= 13; x += 0.05) for (let z = -7.2; z <= 7.2; z += 0.05) {
      assert.ok(clear(resolve({ x, z }, PLAYER_RADIUS, [], { open }), open ? PASSAGE.maxX : BOUNDS.maxX), `${open} ${x.toFixed(2)},${z.toFixed(2)}`);
    }
  }
});

test('the open passage can be walked from the nave to its door', () => {
  let p = { x: 4, z: PASSAGE.z };
  for (let i = 0; i < 400; i++) p = resolve({ x: p.x + 0.05, z: p.z }, PLAYER_RADIUS, [], { open: true });
  assert.ok(p.x > PASSAGE.maxX - PLAYER_RADIUS - 0.01);
  assert.ok(resolve({ x: 7, z: PASSAGE.z }, PLAYER_RADIUS, [], { open: false }).x <= BOUNDS.maxX - PLAYER_RADIUS + 1e-6);
});

test('the altar steps rise towards the altar', () => {
  assert.equal(floorHeight(0, 0), 0);
  assert.equal(floorHeight(0, -4.4), 0.15);
  assert.equal(floorHeight(0, -6.5), 0.4);
  assert.equal(floorHeight(2.6, -6.5), 0.15);
});
