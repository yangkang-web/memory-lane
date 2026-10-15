// Local synthesized Foley: no network, recordings or speech service.
export function createStoryAudio(){
  const Context=window.AudioContext||window.webkitAudioContext;
  if(!Context)return {cue(){},pause(){},resume(){},mute(){},dispose(){}};
  const ctx=new Context(),master=ctx.createGain();master.gain.value=.23;master.connect(ctx.destination);
  let muted=false;const buffer=ctx.createBuffer(1,ctx.sampleRate*.4,ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  function tone(frequency,duration,level,type='sine') {const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(frequency,ctx.currentTime);osc.frequency.exponentialRampToValueAtTime(Math.max(25,frequency*.45),ctx.currentTime+duration);gain.gain.setValueAtTime(level,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);osc.connect(gain).connect(master);osc.start();osc.stop(ctx.currentTime+duration);osc.onended=()=>{osc.disconnect();gain.disconnect();};}
  function noise(duration,level,cutoff){const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=cutoff;gain.gain.setValueAtTime(level,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);source.connect(filter).connect(gain).connect(master);source.start();source.stop(ctx.currentTime+duration);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};}
  const drone=ctx.createOscillator(),bed=ctx.createGain();drone.type='sine';drone.frequency.value=49;bed.gain.value=.035;drone.connect(bed).connect(master);drone.start();
  ctx.resume().catch(()=>{});
  return {cue(type){if(ctx.state!=='running')return;if(type==='shot'){noise(.22,.8,2400);tone(110,.18,.45,'triangle');}else if(type==='step'){noise(.065,.12,430);tone(80,.08,.08);}else if(type==='radio'){noise(.25,.1,1600);tone(950,.08,.06);}else if(type==='growl'){tone(75,.6,.22,'sawtooth');}else if(type==='door'){noise(.35,.35,650);tone(65,.3,.35);}else if(type==='safe'){tone(660,.6,.12);}},pause(){ctx.suspend().catch(()=>{});},resume(){ctx.resume().catch(()=>{});},mute(){muted=!muted;master.gain.setTargetAtTime(muted?0:.23,ctx.currentTime,.02);return muted;},dispose(){drone.stop();ctx.close().catch(()=>{});}};
}
