import {inSequence} from './sequence-bridge.js';
import * as T from 'three';
import { smooth,clamp } from './last-companion-timeline.js';
import { CHAPTERS,DURATION,CUES,HOME_OFFSET_Z,editStateAt } from './last-companion-edit.js';
import { createCompanionSets } from './last-companion-sets.js';
import { createCompanionCast } from './last-companion-cast.js';
import { createCompanionAudio } from './last-companion-audio.js';

export function createLastCompanion({world,camera,render,onStart,onExit,onComplete=()=>{}}){
  const scene=world.scene;
  // Only hide the city's renderables in the sealed shop interior; preserve lighting and camera.
  const city=scene.children.filter(o=>!o.isLight&&!o.isCamera&&o!==world.lighting.sun.target).map(o=>({o,visible:o.visible}));
  const stagedHome=world.home.root.clone(true);stagedHome.name='Short route dwelling';stagedHome.position.z=HOME_OFFSET_Z;stagedHome.visible=false;scene.add(stagedHome);
  const stagedDoor=stagedHome.getObjectByName('Sunflowers broken door');
  const sets=createCompanionSets(scene),cast=createCompanionCast(scene,camera,sets,stagedDoor);cast.actors.root.visible=false;
  const panel=document.createElement('section');panel.className='narrative-player';panel.hidden=true;panel.setAttribute('aria-label','最后一次并肩 · 第一视角剧情');
  panel.innerHTML=`<div class="narrative-shade" aria-hidden="true"></div><div class="narrative-injury" aria-hidden="true"></div><div class="narrative-title"><small>回忆之路</small><h2>最后一次并肩</h2></div><div class="narrative-subtitles" aria-live="off"><b></b><p></p></div><div class="narrative-controls"><button data-command="pause">暂停</button><label>章节 <select aria-label="选择剧情章节">${CHAPTERS.map((c,i)=>`<option value="${c.start}">${i+1}. ${c.title}</option>`).join('')}</select></label><input type="range" min="0" max="${DURATION}" step="0.05" value="0" aria-label="剧情播放进度"><output>00:00 / 01:00</output><button data-command="sound" aria-pressed="false">静音</button><button data-command="exit">返回漫游</button></div><div class="narrative-ending" hidden><p>……听得到吗？</p><small>没有回答。</small><button data-command="replay">从头重看</button><button data-command="exit">返回漫游</button></div>`;
  document.querySelector('#app').append(panel);const $=s=>panel.querySelector(s),title=$('.narrative-title'),subtitle=$('.narrative-subtitles'),range=$('input'),select=$('select'),output=$('output'),shade=$('.narrative-shade');
  let active=false,paused=false,ended=false,t=0,baseTime=0,baseClock=0,frame=0,audio=null,lastState=editStateAt(0),lastTick=0,oldFov=camera.fov,lastCityHidden=false;
  const lookObject=new T.Object3D(),termBox=new T.Box3(),corner=new T.Vector3();let subtitleLift=15;
  // Subtitles sit where Bloodbound's do, low and centred; while the handheld terminal fills that spot they rise just
  // above its top edge instead of being read over its screen.
  function placeSubtitle(blackout){
    let goal=15;const term=sets.items.terminal;let shown=!subtitle.hidden&&term.visible&&blackout<.5;term.traverseAncestors(o=>{if(!o.visible)shown=false;});
    if(shown){termBox.setFromObject(term);let minX=1,maxX=-1,maxY=-1,front=false;
      for(let i=0;i<8;i++){corner.set(i&1?termBox.max.x:termBox.min.x,i&2?termBox.max.y:termBox.min.y,i&4?termBox.max.z:termBox.min.z).project(camera);if(corner.z<1){front=true;minX=Math.min(minX,corner.x);maxX=Math.max(maxX,corner.x);maxY=Math.max(maxY,corner.y);}}
      if(front&&minX<.4&&maxX>-.4&&maxY>-.75)goal=Math.min(60,Math.max(15,(maxY+1)*50+3));}
    subtitleLift+=(goal-subtitleLift)*(Math.abs(goal-subtitleLift)>20?1:.25);subtitle.style.bottom=`${subtitleLift.toFixed(2)}%`;
  }
  function restoreCity(){for(const {o,visible}of city)o.visible=visible;lastCityHidden=false;}
  function hideCity(hidden){if(hidden===lastCityHidden)return;for(const {o,visible}of city)o.visible=hidden?false:visible;lastCityHidden=hidden;}
  function showFrame(){const s=editStateAt(t);lastState=s;hideCity(s.storeOnly);world.home.root.visible=false;world.home.cinematicLot.visible=false;stagedHome.visible=true;sets.root.visible=true;sets.update(s,camera);world.setSinkhole(t>=14.45);world.setStoryExit(s.t>=390);world.water.setCollapse(smooth(t,14.45,14.6));if(stagedDoor)stagedDoor.rotation.y=-Math.PI/2-smooth(t,3,4.8)*Math.PI*.44;
    camera.position.fromArray(s.camera);const next=editStateAt(Math.min(DURATION,t+.05)).camera,speed=Math.hypot(next[0]-s.camera[0],next[2]-s.camera[2])*20;
    const walking=t>=3&&t<15||t>=39&&t<52;let bob=walking?Math.sin(t*(speed>2?10:7))*Math.min(.018,speed*.006):0;if(t>=39&&t<52){const pulse=t<47?11:13;bob=Math.sin(t*pulse)*.043+Math.sin(t*pulse*.5)*.012;camera.position.x+=Math.sin(t*pulse*.5)*.025;}camera.position.y+=bob;
    lookObject.position.copy(camera.position);lookObject.lookAt(new T.Vector3(...s.look));lookObject.rotateY(Math.PI);camera.quaternion.copy(lookObject.quaternion);
    let roll=t>=14.45&&t<15.15?Math.sin((t-14.45)*47)*.07*(1-smooth(t,14.45,15.15)):0;if(t>=15&&t<17.2)roll=Math.sin((t-15)*3)*smooth(t,15,15.5)*.65;if(t>=30&&t<32)roll=Math.sin(t*9)*.1;if(t>=39&&t<52)roll+=Math.sin(t*6)*.027;camera.rotateZ(roll);
    camera.fov=64+smooth(t,12,13)*6*(1-smooth(t,15,16))+smooth(t,38,40)*5*(1-smooth(t,51,53));camera.updateProjectionMatrix();camera.updateMatrixWorld(true);cast.update(s);
    title.style.opacity=String(1-smooth(t,2,3));shade.style.opacity=String(s.blackout);
    $('.narrative-injury').style.opacity=String(s.injured&&s.t<474?(s.t>=338?.17:.08)+Math.sin(t*3)*.025:0);
    const said=s.line?.[3]||'';if(subtitle.dataset.said!==said){subtitle.dataset.said=said;subtitle.querySelector('b').textContent=s.line?.[2]||'';subtitle.querySelector('p').textContent=said;subtitle.hidden=!said;subtitle.classList.remove('is-new');void subtitle.offsetWidth;subtitle.classList.add('is-new');}
    range.value=String(t);select.value=String(CHAPTERS[s.editChapter].start);output.textContent=`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')} / 01:00`;
    placeSubtitle(s.blackout);audio?.update(s,speed);render();
  }
  function tick(now){if(!active||paused||ended)return;const before=t;t=clamp(baseTime+(now-baseClock)/1000,baseTime,DURATION);for(const [at,cue]of CUES)if(at>before&&at<=t)audio?.cue(cue);lastTick=now;showFrame();if(t>=DURATION){ended=true;onComplete();$('.narrative-ending').hidden=false;$('[data-command="pause"]').disabled=true;}else frame=requestAnimationFrame(tick);}
  async function start(at=0,hold=false){if(!active){onStart();oldFov=camera.fov;$('[data-command="sound"]').textContent='静音';$('[data-command="sound"]').setAttribute('aria-pressed','false');audio=createCompanionAudio({strict:inSequence});audio.ready.catch(error=>{console.warn('Story voice unavailable; subtitles remain available',error);});}active=true;paused=hold;ended=false;if(hold)audio?.pause();else await audio?.resume();panel.hidden=false;$('.narrative-ending').hidden=true;$('[data-command="pause"]').disabled=false;$('[data-command="pause"]').textContent='暂停';sets.root.visible=true;cast.actors.root.visible=true;seek(at);if(hold)await audio.ready;}
  function seek(value){t=clamp(Number(value)||0,0,DURATION);baseTime=t;baseClock=performance.now();ended=t>=DURATION;audio?.seek();$('.narrative-ending').hidden=!ended;$('[data-command="pause"]').disabled=ended;showFrame();cancelAnimationFrame(frame);if(!paused&&!ended)frame=requestAnimationFrame(tick);}
  async function toggle(){if(!active||ended)return;paused=!paused;$('[data-command="pause"]').textContent=paused?'继续':'暂停';if(paused){cancelAnimationFrame(frame);audio?.pause();}else{await audio?.resume();baseTime=t;baseClock=performance.now();frame=requestAnimationFrame(tick);}}
  function exit(){if(!active)return;active=false;cancelAnimationFrame(frame);audio?.dispose();audio=null;sets.root.visible=false;cast.actors.root.visible=false;cast.actors.rig.visible=false;cast.hide();sets.items.terminal.visible=false;panel.hidden=true;restoreCity();stagedHome.visible=false;world.home.cinematicLot.visible=true;world.home.root.visible=true;world.setSinkhole(false);world.setStoryExit(false);world.water.setCollapse(0);if(world.home.doorMesh)world.home.doorMesh.rotation.y=-Math.PI*.94;camera.fov=oldFov;camera.updateProjectionMatrix();onExit();}
  const listeners=[];function listen(el,event,fn){el.addEventListener(event,fn);listeners.push(()=>el.removeEventListener(event,fn));}
  panel.querySelectorAll('[data-command]').forEach(b=>listen(b,'click',()=>{const cmd=b.dataset.command;if(cmd==='exit')exit();if(cmd==='pause')toggle();if(cmd==='replay')start(0);if(cmd==='sound'){const muted=audio?.mute();b.textContent=muted?'开启声音':'静音';b.setAttribute('aria-pressed',String(muted));}}));
  listen(select,'change',()=>seek(select.value));listen(range,'input',()=>seek(range.value));listen(window,'keydown',event=>{if(!inSequence&&active&&event.code==='Escape'){event.preventDefault();exit();}});listen(document,'visibilitychange',()=>{if(document.hidden&&active&&!paused&&!ended)toggle();});
  return {ready:Promise.all([sets.ready,cast.ready]),start,exit,pause(){if(active&&!paused&&!ended)toggle();else audio?.pause();},resume(){if(active&&paused&&!ended)return toggle();},get active(){return active;},get state(){return lastState;},dispose(){exit();listeners.forEach(fn=>fn());sets.dispose();cast.dispose();stagedHome.removeFromParent();panel.remove();}};
}
