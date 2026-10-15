import test from 'node:test';
import assert from 'node:assert/strict';
import { seasidePose, GAZE_DURATION,HERO_POSITION,APPROACH_END,INSPECT_END } from '../src/seaside-motion.js';

test('seaside gaze stays inside the room, has one gentle cycle, and settles without drift',()=>{
  let previous=seasidePose(0),crossings=0,lastSign=0;
  for(let i=1;i<=GAZE_DURATION*120;i++){
    const t=i/120,p=seasidePose(t);
    assert.ok([...p.position,...p.look,p.fov].every(Number.isFinite));
    assert.ok(p.position[0]>-3.8&&p.position[0]<3,'camera remains clear of right cabinet');
    assert.ok(p.position[1]>1.5&&p.position[1]<1.7,'first-person eye height');
    assert.ok(Math.hypot(...p.position.map((v,j)=>v-previous.position[j]))<.02,'no camera teleport');
    if(t>=APPROACH_END&&t<INSPECT_END){
      assert.deepEqual(p.position,seasidePose(APPROACH_END).position,'stand still at cabinet while looking');
      const offset=p.look[2]-HERO_POSITION[2],sign=Math.abs(offset)>1e-7?Math.sign(offset):0;
      if(sign){if(sign!==lastSign&&lastSign)crossings++;lastSign=sign;}
    }
    if(t<APPROACH_END){assert.equal(p.stage,'approach');assert.ok(p.position[0]>=previous.position[0]&&p.look[0]>=previous.look[0],'opening approaches and turns steadily, without sway');}
    previous=p;
  }
  assert.equal(crossings,1,'one complete left/right cycle');
  assert.ok(seasidePose(12).look.every((v,i)=>Math.abs(v-HERO_POSITION[i])<1e-9));
  assert.deepEqual(seasidePose(12),seasidePose(60),'hold the collectible after focus');
  assert.deepEqual(seasidePose(2),seasidePose(2),'replay is deterministic');
});

test('reduced motion shows the final composition immediately without head sway',()=>{
  assert.deepEqual(seasidePose(0,true),seasidePose(12,true));
  assert.deepEqual(seasidePose(0,true).look,HERO_POSITION);
});
