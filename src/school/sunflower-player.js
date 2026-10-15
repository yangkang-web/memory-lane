import {inSequence,installSequence,sequenceEvent} from './sequence-bridge.js';
import {storyFrame,storyChapters,STORY_DURATION} from './sunflower-timeline.js';
import voice from './data/sunflower-voice.json';

export function mountSunflowerPlayer(world,{onEnter,onExit}){
 const app=document.querySelector('#app');
 const entry=document.createElement('button');entry.className='story-entry';entry.innerHTML='<span>✺</span><div><small>A FIRST-PERSON LOVE STORY</small><strong>Always toward you</strong></div><b>Play story ↗</b>';entry.id='story-open';app.append(entry);
 const panel=document.createElement('section');panel.className='story-player';panel.hidden=true;panel.setAttribute('aria-label','Sunflower story');
 panel.innerHTML=`<div class="story-tint"></div><div class="story-fade"></div>
 <header class="story-header"><div><small id="story-number">01 / 04</small><strong id="story-chapter"></strong></div><button id="story-exit" aria-label="Exit story">Exit ✕</button></header>
 <div class="story-start"><span class="story-flower">✺</span><small>WESTBRIDGE · A SPRING MEMORY</small><h1>Always toward you.</h1><p>A promise. A pink letter.<br>The little things he never forgot.</p><button id="story-play" disabled>Preparing your story…</button><span>60 seconds · First person · English voice</span></div>
 <div class="story-caption" hidden><span id="story-speaker"></span><p id="story-line"></p></div>
 <div class="story-controls"><button id="story-pause" aria-label="Pause story" disabled>Pause</button><button id="story-replay" aria-label="Replay story" disabled>Replay</button><input id="story-progress" type="range" min="0" max="60" step="0.1" value="0" aria-label="Story progress in seconds" disabled><output id="story-time">0:00 / 1:00</output><button id="story-mute" aria-label="Mute story" aria-pressed="false">Sound on</button></div>
 <p id="story-notice" role="status" hidden></p><audio id="story-audio" preload="auto" src="/assets/voices/sunflower-story-en.wav"></audio>`;app.append(panel);
 const $=s=>panel.querySelector(s),audio=$('#story-audio'),intro=$('.story-start'),play=$('#story-play'),pause=$('#story-pause'),progress=$('#story-progress'),caption=$('.story-caption');
 let active=false,started=false,ready=false,opening=0,playAttempt=0,audioPrepared;
 // A local Blob remains seekable even when a simple static server omits HTTP Range support.
 function prepareAudio(){return audioPrepared??=(async()=>{
  const response=await fetch('/assets/voices/sunflower-story-en.wav');if(!response.ok)throw new Error('Voice unavailable');
  const blob=await response.blob();audio.src=URL.createObjectURL(blob);
  await new Promise((resolve,reject)=>{audio.addEventListener('loadedmetadata',resolve,{once:true});audio.addEventListener('error',reject,{once:true});audio.load();});
 })().catch(error=>{audioPrepared=null;throw error;});}

 const notice=text=>{$('#story-notice').textContent=text;$('#story-notice').hidden=!text;};
 const sync=()=>{
  if(!active)return;
  const time=audio.currentTime||0,f=storyFrame(time),playing=started&&!audio.paused&&!audio.ended&&audio.readyState>=3;
  world.updateStory(time,playing);$('#story-chapter').textContent=storyChapters[f.chapter];$('#story-number').textContent=`0${f.chapter+1} / 04`;
  const speaking=voice.lines.find(line=>time>=line.start&&time<line.end);
  const text=f.text||speaking?.text||'';caption.hidden=!started||!text;$('#story-line').textContent=text;$('#story-speaker').textContent=f.text?f.speaker:speaking?'Fumiriya':'';
  panel.classList.toggle('story-ending',f.ending);$('.story-fade').style.opacity=f.fade;
  progress.value=String(time);progress.setAttribute('aria-valuetext',`${Math.floor(time)} of 60 seconds`);
  $('#story-time').textContent=`${Math.floor(time/60)}:${String(Math.floor(time%60)).padStart(2,'0')} / 1:00`;
  pause.textContent=audio.ended?'Play again':audio.paused?'Resume':'Pause';pause.setAttribute('aria-label',audio.ended?'Play story again':audio.paused?'Resume story':'Pause story');
 };
 async function resume(){
  if(!ready||!active)return;
  const attempt=++playAttempt;notice('');if(audio.ended||audio.currentTime>=STORY_DURATION)audio.currentTime=0;
  started=true;intro.hidden=true;pause.disabled=progress.disabled=$('#story-replay').disabled=false;
  try{await audio.play();}catch(error){if(inSequence)throw error;if(active&&attempt===playAttempt)notice('Voice could not play. Press Resume to try again.');}sync();
 }
 function close(){if(!active)return;opening++;playAttempt++;audio.pause();audio.currentTime=0;active=false;started=false;world.stopStory();panel.hidden=true;app.classList.remove('story-mode');onExit();entry.focus();}
 async function open(){
  if(active)return;const token=++opening;active=true;started=false;ready=false;onEnter();app.classList.add('story-mode');panel.hidden=false;intro.hidden=false;notice('');play.disabled=true;play.textContent='Preparing your story…';pause.disabled=progress.disabled=$('#story-replay').disabled=true;
  let loaded;try{[loaded]=await Promise.all([world.prepareStory(),prepareAudio()]);}catch(error){if(inSequence)throw error;if(token===opening&&active){notice('Voice could not load. Exit and reopen the story to try again.');play.textContent='Voice unavailable';}return;}if(token!==opening||!active)return;
  if(!loaded){if(inSequence)throw new Error('校园人物资源未加载');notice('The character could not load. Exit and reopen the story to try again.');play.textContent='Character unavailable';return;}
  world.startStory();ready=true;play.disabled=false;play.textContent='Begin story';play.focus();sync();
 };
 entry.onclick=open;
 play.onclick=resume;pause.onclick=()=>{if(audio.paused||audio.ended)void resume();else{playAttempt++;audio.pause();sync();}};
 $('#story-replay').onclick=()=>{audio.currentTime=0;void resume();};
 progress.oninput=()=>{audio.currentTime=Number(progress.value);sync();};
 $('#story-exit').onclick=close;
 $('#story-mute').onclick=()=>{audio.muted=!audio.muted;$('#story-mute').textContent=audio.muted?'Sound off':'Sound on';$('#story-mute').setAttribute('aria-pressed',String(audio.muted));$('#story-mute').setAttribute('aria-label',audio.muted?'Unmute story':'Mute story');};
 audio.addEventListener('error',()=>{if(active&&started){audio.pause();notice('Voice could not load. Press Resume to try again.');sequenceEvent('error',{message:'校园语音播放失败，请重新载入。'});}});
 audio.addEventListener('waiting',()=>{if(active&&started)notice('Loading voice…');});audio.addEventListener('playing',()=>notice(''));audio.addEventListener('ended',()=>{world.updateStory(STORY_DURATION,false);sync();sequenceEvent('done');});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&active){playAttempt++;audio.pause();sync();}});
 window.addEventListener('pagehide',()=>audio.pause());
 addEventListener('keydown',e=>{if(!active)return;if(inSequence){if(e.key==='Escape')sequenceEvent('pause');return;}if(e.key==='Escape'){e.stopImmediatePropagation();close();}else if(e.code==='Space'&&e.target===document.body){e.preventDefault();pause.click();}},true);
 let disposed=false,frameId;function frame(){if(disposed)return;sync();frameId=requestAnimationFrame(frame);}frameId=requestAnimationFrame(frame);
 if(inSequence){const prepared=open();installSequence({ready:prepared,start:resume,pause(){audio.pause();sync();},resume,capture:()=>world.captureStory(),dispose(){disposed=true;active=false;cancelAnimationFrame(frameId);audio.pause();world.dispose();if(audio.src.startsWith('blob:'))URL.revokeObjectURL(audio.src);}});}
 else if(new URLSearchParams(location.search).has('story'))entry.click();
 return {close,get active(){return active;}};
}
