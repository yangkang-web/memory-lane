import { DIALOGUE } from './last-companion-timeline.js';

export function createCompanionAudio({strict=false}={}){
  const Context=window.AudioContext||window.webkitAudioContext;
  if(!Context)return {ready:Promise.resolve(),update(){},cue(){},seek(){},pause(){},resume(){},mute(){return true;},dispose(){}};
  const ctx=new Context(),master=ctx.createGain(),ambience=ctx.createGain();master.gain.value=.35;master.connect(ctx.destination);ambience.connect(master);
  const buffer=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate),samples=buffer.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
  const active=new Set(),voices=[],speech=ctx.createGain();speech.gain.value=1.4;speech.connect(master);
  let muted=false,lastLine=-1,currentVoice=null,lastStep=-1,lastBreath=-1;
  const ready=Promise.all(DIALOGUE.map(async(_,i)=>{const response=await fetch(`/assets/story/voice/${String(i).padStart(2,'0')}.wav`);if(!response.ok)throw Error(`Voice ${i} unavailable`);voices[i]=await ctx.decodeAudioData(await response.arrayBuffer());if(voices[i].duration<.1)throw Error(`Voice ${i} is empty`);}));
  const wind=ctx.createBufferSource(),windFilter=ctx.createBiquadFilter();wind.buffer=buffer;wind.loop=true;windFilter.type='lowpass';windFilter.frequency.value=750;wind.connect(windFilter).connect(ambience);wind.start();
  function tone(frequency,duration,level,type='sine'){const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(frequency,ctx.currentTime);osc.frequency.exponentialRampToValueAtTime(Math.max(24,frequency*.6),ctx.currentTime+duration);gain.gain.setValueAtTime(level,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+duration);osc.connect(gain).connect(master);osc.start();osc.stop(ctx.currentTime+duration);active.add(osc);osc.onended=()=>{active.delete(osc);osc.disconnect();gain.disconnect();};}
  function noise(duration,level,cutoff=1500,highpass=false,delay=0){const at=ctx.currentTime+delay;const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;filter.type=highpass?'highpass':'lowpass';filter.frequency.value=cutoff;gain.gain.setValueAtTime(level,at);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);source.connect(filter).connect(gain).connect(master);source.start(at);source.stop(at+duration);active.add(source);source.onended=()=>{active.delete(source);source.disconnect();filter.disconnect();gain.disconnect();};}
  function cue(type){if(ctx.state!=='running')return;
    if(['glass','break','shelf'].includes(type)){noise(.65,.5,2500,true);[700,1290,2300].forEach(f=>tone(f,.25,.04,'triangle'));}
    else if(['collapse','blast'].includes(type)){noise(type==='blast'?1.4:1.8,.8,800);tone(48,1.4,.55,'triangle');}
    else if(type==='lighter'){noise(.045,.10,3400,true);tone(1700,.025,.018,'triangle');}
    else if(type==='lighter-drop'){noise(.12,.12,1400,true);tone(1250,.13,.035,'triangle');}
    else if(type==='cough'){noise(.12,.17,800);noise(.18,.14,1000,false,.22);noise(.25,.08,1400,true,.46);}
    else if(['metal','door','bang','bin','kick','hit','impact','bag','handle','bolt'].includes(type)){noise(.26,type==='handle'?.1:.35,700);tone(type==='metal'?320:65,.3,.23,'triangle');}
    else if(type==='ring'){tone(2800,4,.035);tone(3100,3,.015);}
    else if(['beep','bell','connect','drip','tin','bottle'].includes(type)){tone(type==='drip'?1600:type==='tin'?650:900,.15,.08,'sine');}
    else if(type==='alarm'){for(let i=0;i<2;i++)tone(1200+i*600,1,.16,'square');}
    else if(['growl','howl','cry','pain'].includes(type)){noise(type==='howl'?1.5:.6,.17,450);tone(type==='howl'?170:85,type==='howl'?1.6:.6,.14,'sawtooth');}
    else if(['cloth','zip','scrape','lever','rebar','drag-fence','crack','shutter','grab','splash','rush'].includes(type)){noise(.5,.16,type==='splash'?2600:1000);if(['lever','rebar','drag-fence'].includes(type))tone(210,.6,.08,'sawtooth');}
    else if(type==='step'){noise(.08,.08,450);tone(65,.06,.04);}
    else if(type==='breath')noise(.75,.05,1200,true);
  }
  function stopVoice(){if(currentVoice){try{currentVoice.stop();}catch{}currentVoice=null;}}
  function update(state,speed){const t=state.t;ambience.gain.setTargetAtTime(t>=474?0:state.underground?.018:.032,ctx.currentTime,.15);windFilter.frequency.setTargetAtTime(state.underground?160:750,ctx.currentTime,.2);
    const index=state.voice?.index??DIALOGUE.indexOf(state.line);if(index!==lastLine&&(index<0||voices[index])){stopVoice();lastLine=index;if(index>=0&&voices[index]){const source=ctx.createBufferSource();source.buffer=voices[index];const slot=state.voice?.duration??(DIALOGUE[index][1]-DIALOGUE[index][0]);source.playbackRate.value=Math.max(1,source.buffer.duration/slot);source.connect(speech);const offset=(state.voice?.elapsed??(t-DIALOGUE[index][0]))*source.playbackRate.value;if(offset<source.buffer.duration){source.start(0,offset);currentVoice=source;source.onended=()=>{source.disconnect();if(currentVoice===source)currentVoice=null;};}}}
    const clock=state.playbackTime??t;const step=Math.floor(clock*(speed>2?2.6:1.6));if(speed>.25&&t<474&&step!==lastStep){lastStep=step;cue('step');}
    const breath=Math.floor(clock/(state.injured?1.5:3));if(t>=118&&t<474&&breath!==lastBreath){lastBreath=breath;cue('breath');}
  }
  function seek(){stopVoice();lastLine=-1;lastStep=-1;for(const source of active){try{source.stop();}catch{}}active.clear();}
  ctx.resume().catch(()=>{});
  return {ready,cue,update,seek,pause(){ctx.suspend().catch(()=>{});},resume(){const result=ctx.resume().then(()=>{if(ctx.state!=='running')throw new Error('末世音频未能启动');});return strict?result:result.catch(()=>{});},mute(){muted=!muted;master.gain.setTargetAtTime(muted?0:.35,ctx.currentTime,.03);return muted;},dispose(){seek();wind.stop();ctx.close().catch(()=>{});}};
}
