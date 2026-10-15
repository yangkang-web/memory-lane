import test from 'node:test';
import assert from 'node:assert/strict';
import {JOURNEY,JOURNEY_SECONDS,BLOODBOUND_CUT,bloodboundBeat} from '../src/journey-timeline.js';
import {resolveExperience,isAppPath} from '../src/routes.js';
import {createBloodboundSequence} from '../src/bloodbound/sequence.js';

test('journey preserves order, three full-minute stories and thirty seconds of blank space',()=>{
 assert.deepEqual(JOURNEY.map(s=>s.id),['seaside','bloodbound','school','apocalypse','blank']);
 assert.deepEqual(JOURNEY.map(s=>s.seconds),[12,60,60,60,30]);
 assert.equal(JOURNEY_SECONDS,237.1);
 for(const stage of JOURNEY){assert.ok(isAppPath(stage.path));assert.equal(resolveExperience(stage.path,'?sequence=1').experience,stage.id);}
 assert.equal(resolveExperience('/journey').experience,'journey');
 assert.equal(isAppPath('/journey/missing.glb'),false);
});
test('vampire cut boundaries retain the complete story instead of changing playback speed',()=>{
 for(const [i,beat] of BLOODBOUND_CUT.entries()){
  assert.equal(bloodboundBeat(beat.at).id,beat.id);
  if(i)assert.equal(bloodboundBeat(beat.at-.001).id,BLOODBOUND_CUT[i-1].id);
 }
});
test('automatic performance completes once, invokes hand and pendant actions and has finite camera poses',()=>{
 const visited=[],performed=[];let completions=0;
 const flow={segment:'explore',go(id){this.segment=id;visited.push(id);}};
 const player={pose:{x:0,z:5.6,yaw:0,pitch:0},setPose(p){Object.assign(this.pose,p);}};
 const actor={group:{position:{x:-1,z:-2}}};
 const sequence=createBloodboundSequence({flow,player,hunter:actor,lucien:actor,interact:{perform(id){performed.push(id);}},onComplete(){completions++;}});
 for(let i=0;i<6001;i++)sequence.update(.01);
 assert.deepEqual(visited,BLOODBOUND_CUT.slice(1).map(b=>b.id));assert.equal(completions,1);
 for(const action of ['arm','lucien','pendant'])assert.ok(performed.includes(action));
 assert.ok(Object.values(player.pose).every(Number.isFinite));assert.equal(sequence.time,60);
 sequence.update(10);assert.equal(completions,1);
});
