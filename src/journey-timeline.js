import {SCHOOL_STORY_SECONDS} from './school-short-edit.js';

export const SCHOOL_SEQUENCE_SECONDS=SCHOOL_STORY_SECONDS;
export const JOURNEY = Object.freeze([
  {id:'annual', path:'/annual-memory', seconds:11, transition:'enter', transitionSeconds:2.2},
  {id:'seaside', path:'/seaside', seconds:12, transition:'rift', transitionSeconds:3.8},
  {id:'bloodbound', path:'/bloodbound', seconds:60, transition:'door', transitionSeconds:4.4},
  {id:'school', path:'/school', seconds:SCHOOL_SEQUENCE_SECONDS, transition:'fracture', transitionSeconds:5.1},
  {id:'apocalypse', path:'/apocalypse', seconds:60, transition:'ash', transitionSeconds:3},
  {id:'stage', path:'/stage', seconds:30},
]);
export const JOURNEY_SECONDS = JOURNEY.reduce((sum, stage) => sum + stage.seconds + (stage.transitionSeconds || 0), 0);
export const BLOODBOUND_CUT = Object.freeze([
  {at:0,id:'explore'}, {at:6,id:'danger'}, {at:12,id:'rescue'}, {at:21,id:'wound'},
  {at:27,id:'intimacy'}, {at:36,id:'gift'}, {at:41,id:'wear'}, {at:58,id:'end'},
]);
export function bloodboundBeat(time) {
  return BLOODBOUND_CUT.findLast(beat => time >= beat.at) || BLOODBOUND_CUT[0];
}
