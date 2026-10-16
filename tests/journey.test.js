import test from 'node:test';
import assert from 'node:assert/strict';
import {JOURNEY,JOURNEY_SECONDS,SCHOOL_SEQUENCE_SECONDS} from '../src/journey-timeline.js';
import {resolveExperience,isAppPath} from '../src/routes.js';

test('journey preserves the latest scenes and complete school story under one minute',()=>{
 assert.deepEqual(JOURNEY.map(s=>s.id),['annual','seaside','bloodbound','school','apocalypse','stage']);
 assert.deepEqual(JOURNEY.map(s=>s.seconds),[11,12,68,SCHOOL_SEQUENCE_SECONDS,60,30]);
 assert.ok(SCHOOL_SEQUENCE_SECONDS>58&&SCHOOL_SEQUENCE_SECONDS<60);
 assert.ok(Math.abs(JOURNEY_SECONDS-(199.5+SCHOOL_SEQUENCE_SECONDS))<.00001);
 assert.equal(JOURNEY.find(s=>s.id==='bloodbound').transition,'door');
 for(const stage of JOURNEY){assert.ok(isAppPath(stage.path));assert.equal(resolveExperience(stage.path,'?sequence=1').experience,stage.id);}
 assert.equal(resolveExperience('/journey').experience,'journey');
 assert.equal(isAppPath('/journey/missing.glb'),false);
});
