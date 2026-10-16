import edits from './data/school-short-edit.json' with {type:'json'};
import {OPENING_DURATION,OPENING_STAGES,OPENING_FILM_DURATION,OPENING_FILM_SOURCE_DURATION} from './story-opening.js';
let cursor=0;
export const SCHOOL_EDITS=edits.map(edit=>{const start=cursor;cursor+=edit.seconds;return {...edit,start,end:cursor};});
export const SCHOOL_AUDIO_SECONDS=Number(cursor.toFixed(6));
export const SCHOOL_STORY_SECONDS=OPENING_DURATION+SCHOOL_AUDIO_SECONDS;
export function schoolSourceTime(value){
 const time=Math.max(0,Math.min(SCHOOL_AUDIO_SECONDS,value));
 const edit=SCHOOL_EDITS.find(e=>time<e.end)||SCHOOL_EDITS.at(-1);
 return edit.from+(edit.to-edit.from)*Math.max(0,Math.min(1,(time-edit.start)/edit.seconds));
}
export function openingProgress({stage,elapsed}){let result=0;for(const [name,duration] of OPENING_STAGES){if(name===stage)return result+Math.min(duration,elapsed);result+=duration;}return result;}
export function openingSceneState(state){return state.stage==='film'?{...state,elapsed:state.elapsed*OPENING_FILM_SOURCE_DURATION/OPENING_FILM_DURATION}:state;}
// Cut from the fully bright transition to the painting, then gently reveal it.
export function schoolEndingFade(time){const start=SCHOOL_EDITS.at(-1).start;if(time<start)return 0;const p=Math.min(1,(time-start)/.75);return 1-p*p*(3-2*p);}
