import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ACTIONS, CAMERA, LOOK, CHAPTERS, DIALOGUE, DURATION, stateAt } from '../src/last-companion-timeline.js';

test('all eight chapters have continuous action coverage and finite camera directions', () => {
  assert.equal(CHAPTERS.length, 8);
  assert.equal(ACTIONS[0][0], 0);
  assert.equal(ACTIONS.at(-1)[1], DURATION);
  ACTIONS.forEach((action, i) => {
    assert.ok(action[1] > action[0]);
    if (i) assert.equal(action[0], ACTIONS[i - 1][1]);
  });
  for (const track of [CAMERA, LOOK]) track.forEach((key, i) => {
    assert.ok(key.every(Number.isFinite));
    if (i) assert.ok(key[0] > track[i - 1][0]);
  });
  for (let t = 0; t <= DURATION; t += .25) {
    const state = stateAt(t);
    assert.ok(Math.hypot(...state.look.map((v, i) => v - state.camera[i])) > .05, `camera target at ${t}`);
  }
});

test('injury and inventory survive seeks; no left forearm returns after the collapse', () => {
  assert.equal(stateAt(339).leftArm, true);
  for (let t = 340; t <= 480; t++) assert.equal(stateAt(t).leftArm, false);
  assert.equal(stateAt(350).crowbar, false, 'right hand must be free to bandage');
  assert.equal(stateAt(360).crowbar, true);
  assert.equal(stateAt(390).backpack, false);
  assert.equal(stateAt(466).terminalPlaced, true);
  assert.equal(stateAt(466).terminalCracked, true);
  assert.equal(stateAt(26).leftArm, true, 'seeking backwards resets the wound');
  assert.equal(stateAt(209).storeOnly, false, 'city is visible after leaving the back door');
  assert.equal(stateAt(474).blackout, 1);
});

test('every spoken line has nonempty local PCM audio that fits its subtitle slot', () => {
  for (const [i, line] of DIALOGUE.entries()) {
    const audio = readFileSync(new URL(`../public/assets/story/voice/${String(i).padStart(2, '0')}.wav`, import.meta.url));
    assert.equal(audio.toString('ascii', 0, 4), 'RIFF');
    assert.equal(audio.toString('ascii', 8, 12), 'WAVE');
    let byteRate = 0, dataSize = 0;
    for (let offset = 12; offset + 8 <= audio.length;) {
      const size = audio.readUInt32LE(offset + 4), id = audio.toString('ascii', offset, offset + 4);
      if (id === 'fmt ') byteRate = audio.readUInt32LE(offset + 16);
      if (id === 'data') dataSize = size;
      offset += 8 + size + (size % 2);
    }
    assert.ok(byteRate > 0 && dataSize / byteRate > .1, `empty voice ${i}: ${line[3]}`);
    assert.ok(dataSize / byteRate <= (line[1] - line[0]) * 1.15, `voice requires excessive acceleration: ${i}`);
  }
});

test('the stair camera clears the physical treads throughout the climb', () => {
  for(let t=401;t<=418;t+=.1){
    const [x,y,z]=stateAt(t).camera;
    if(z<126.325||z>139.525)continue;
    const step=Math.min(23,Math.floor((z-126.325)/.55));
    const top=-6.8+step*.29+.145;
    assert.ok(y-top>.55,`eye inside tread at ${t}: ${y-top}`);
    assert.ok(x>6.95&&x<9.05);
  }
});

test('the store approach passes the pavement obstruction and aligns with the open storefront',()=>{
  for(let t=54;t<=60;t+=.05){
    const [x,y,z]=stateAt(t).camera;
    if(x>=13.6&&x<=16.6)assert.ok(z>41.7,`camera intersects the original pavement obstruction at ${t}`);
    if(x>=16.2&&x<=17.2){assert.ok(z>43&&z<45.2,`camera misses the shop opening at ${t}`);assert.ok(y<3.05);}
  }
});


test('the maintenance approach goes around the front wall and crosses the actual west doorway',()=>{
  for(let t=381;t<=388;t+=.025){
    const [x,,z]=stateAt(t).camera;
    assert.ok(!(x>3.85&&x<8.15&&Math.abs(z-121)<.28),`front wall intersected at ${t}`);
    if(Math.abs(x-4)<.25)assert.ok(z>122.25&&z<123.75,`missed doorway at ${t}: ${z}`);
  }
});

test('the warehouse escape rounds the cold cabinet and crosses the partition opening',()=>{
  for(let t=170;t<=178;t+=.025){
    const [x,y,z]=stateAt(t).camera;
    assert.ok(!(x>30.2&&x<31.05&&z>42.25&&z<44.55&&y<2.65),`camera enters the cold cabinet at ${t}`);
    if(Math.abs(x-31)<.23)assert.ok(z>43.65&&z<45.35,`warehouse opening missed at ${t}`);
  }
});
