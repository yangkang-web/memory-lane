import test from 'node:test';
import assert from 'node:assert/strict';
import { worldWipeAt, wipeClip, WIPE_TIMING } from '../src/world-wipe.js';

test('the diagonal holds at the reference position for exactly one second', () => {
  const start = WIPE_TIMING.lead + WIPE_TIMING.reveal;
  assert.equal(worldWipeAt(start - 1).phase, 'revealing');
  for (const offset of [0, 1, 500, 999]) {
    assert.deepEqual(worldWipeAt(start + offset), { phase: 'hold', center: 50 });
  }
  assert.equal(worldWipeAt(start + 1000).phase, 'finishing');
  assert.equal(wipeClip(50), 'polygon(100% 0, 62% 0, 38% 100%, 100% 100%)');
});

test('the wipe moves right to left, starts fully white and ends fully apocalypse', () => {
  const end = Object.values(WIPE_TIMING).reduce((sum, duration) => sum + duration, 0);
  let previous = 112;
  for (let time = 0; time <= end; time += 10) {
    const { center } = worldWipeAt(time);
    assert(center <= previous && center >= -12);
    previous = center;
  }
  assert.equal(worldWipeAt(0).center - 12, 100);
  assert.deepEqual(worldWipeAt(end), { phase: 'apocalypse', center: -12 });
  assert.equal(worldWipeAt(end).center + 12, 0);
  assert.deepEqual(worldWipeAt(end + 10000), worldWipeAt(end));
});
