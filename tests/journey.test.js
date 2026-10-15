import test from 'node:test';
import assert from 'node:assert/strict';
import {JOURNEY,JOURNEY_SECONDS} from '../src/journey-timeline.js';
import {resolveExperience,isAppPath} from '../src/routes.js';

test('journey preserves order, three stories of a minute or more and thirty seconds of stage',()=>{
 assert.deepEqual(JOURNEY.map(s=>s.id),['annual','seaside','bloodbound','school','apocalypse','stage']);
 assert.deepEqual(JOURNEY.map(s=>s.seconds),[11,12,68,60,60,30]);
 assert.ok(Math.abs(JOURNEY_SECONDS-259.5)<.00001);
 assert.equal(JOURNEY.find(s=>s.id==='bloodbound').transition,'door');
 for(const stage of JOURNEY){assert.ok(isAppPath(stage.path));assert.equal(resolveExperience(stage.path,'?sequence=1').experience,stage.id);}
 assert.equal(resolveExperience('/journey').experience,'journey');
 assert.equal(isAppPath('/journey/missing.glb'),false);
});
