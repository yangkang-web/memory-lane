import test from 'node:test';
import assert from 'node:assert/strict';
import { FINALE_HORDE_COUNT, finaleCrowdPosition } from '../src/companion-horde.js';

test('finale crowd runs on both sides of the fountain without crossing walls or the final camera', () => {
  assert.ok(FINALE_HORDE_COUNT >= 180);
  for (let time = 49; time < 58.2; time += .1) {
    const positions = new Set();
    for (let i = 0; i < FINALE_HORDE_COUNT; i++) {
      const p = finaleCrowdPosition(i, time);
      assert.ok(Math.abs(p.x) < 12, 'body clears the plaza wall');
      assert.ok(Math.hypot(p.x, p.z - 160) > 5.3, 'body clears the fountain');
      assert.ok(p.z > 143, 'background runners remain ahead of the camera');
      assert.equal(p.y, .23);
      positions.add(`${p.x},${p.z}`);
    }
    assert.equal(positions.size, FINALE_HORDE_COUNT);
  }
});

test('the horde covers real ground continuously, with stride distance matching motion and deterministic seeking', () => {
  for (let i = 0; i < FINALE_HORDE_COUNT; i++) {
    const before = finaleCrowdPosition(i, 54), after = finaleCrowdPosition(i, 56);
    assert.ok(before.z - after.z > 6.5);
    assert.ok(Math.abs(before.z - after.z - (after.distance - before.distance)) < 1e-10);
    finaleCrowdPosition(i, 58);
    assert.deepEqual(finaleCrowdPosition(i, 54), before);
  }
});
