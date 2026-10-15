import {mouthShapes} from './student-gestures.js';

// Cues use the synthesizer's phoneme durations and the audio element's clock.
// A delayed render frame never advances the mouth beyond the audible line.
export function voicePose(time,cues) {
  const pose=Object.fromEntries(mouthShapes.map(name=>[name,0]));
  const cue=cues.find(c=>time>=c.start&&time<c.end);
  if(!cue||!mouthShapes.includes(cue.shape))return pose;
  const edge=Math.min(1,(time-cue.start)/.025,(cue.end-time)/.035);
  pose[cue.shape]=Math.max(0,edge)*.62;
  return pose;
}

export function createStudentVoice(audio,cues,{onState,onPose,requestFrame=requestAnimationFrame,cancelFrame=cancelAnimationFrame}) {
  let state='idle',frame=0,generation=0,requested=false;
  const setState=value=>{state=value;onState(value);};
  const clear=()=>{cancelFrame(frame);frame=0;onPose({});};
  const tick=()=>{
    if(state!=='playing')return;
    onPose(audio.paused?{}:voicePose(audio.currentTime,cues));
    frame=requestFrame(tick);
  };
  const stop=()=>{
    generation++;requested=false;clear();audio.pause();audio.currentTime=0;setState('idle');
  };
  const fail=()=>{requested=false;clear();audio.pause();setState('error');};
  audio.addEventListener('playing',()=>{
    if(!requested)return;
    clear();setState('playing');tick();
  });
  audio.addEventListener('waiting',()=>{if(requested){clear();setState('loading');}});
  audio.addEventListener('ended',stop);
  audio.addEventListener('pause',()=>{if(requested)stop();});
  audio.addEventListener('error',()=>{if(requested)fail();});
  return {
    get state(){return state;},stop,
    async play(){
      stop();const current=++generation;requested=true;setState('loading');
      try {await audio.play();}catch {if(current===generation&&requested)fail();}
    },
  };
}
