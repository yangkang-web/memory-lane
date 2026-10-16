import {SCHOOL_STORY_SECONDS} from './school-short-edit.js';

export const SCHOOL_SEQUENCE_SECONDS=SCHOOL_STORY_SECONDS;
// In the playable journey `hint` tells the visitor what this memory asks of them as it opens, and `touch` names the
// keepsake they click to leave it for the next one; without `touch` the next memory follows on its own.
// `card` titles the passage into the next memory: it rises `at` seconds into the transition and
// starts to fade at `until`, a beat into the next scene unless that scene opens on a line of its own.
export const JOURNEY = Object.freeze([
  {id:'annual', path:'/annual-memory', seconds:11, transition:'enter', transitionSeconds:2.2, hint:'点击「走进我的典藏小屋」'},
  {id:'seaside', path:'/seaside', seconds:12, transition:'rift', transitionSeconds:3.8, hint:'拖动画面环顾小屋 · 方向键转头',
    touch:{name:'爱心项链', action:'触碰项链，走进它的回忆'}},
  {id:'bloodbound', path:'/bloodbound', seconds:68, transition:'door', transitionSeconds:4.4,
    touch:{name:'一封情书', action:'触碰情书，打开下一段回忆'},
    card:{at:1.2, until:5.6, en:['You touched the love letter.','A new story unfolds.'], zh:['你触碰了那封情书。','一段新的故事，就此展开。']}},
  {id:'school', path:'/school', seconds:SCHOOL_SEQUENCE_SECONDS, transition:'fracture', transitionSeconds:5.1,
    touch:{name:'一枚烟头', action:'触碰烟头，打开下一段回忆'},
    card:{at:0.9, until:4.7, en:['You touched the cigarette butt.','A forgotten story unfolds.'], zh:['你触碰了那枚烟头。','一段被遗忘的故事，就此展开。']}},
  {id:'apocalypse', path:'/apocalypse', seconds:60, transition:'ash', transitionSeconds:3},
  {id:'stage', path:'/stage', seconds:30},
]);
export const JOURNEY_SECONDS = JOURNEY.reduce((sum, stage) => sum + stage.seconds + (stage.transitionSeconds || 0), 0);
