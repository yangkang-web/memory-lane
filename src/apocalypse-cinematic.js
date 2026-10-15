import * as T from 'three';
import { CAMERA_PATH, COMPANION_PATH, ENEMIES, SHOTS, LINES, STORY_DURATION, samplePath, storyPhase, storyCamera, storyLook } from './apocalypse-story.js';
import { canOccupy, floorHeight } from './walk-layout.js';
import { createStoryAssets } from './story-actors.js';
import { createStoryAudio } from './story-audio.js';

export function validateStoryRoute(obstacles){
  for(let i=1;i<CAMERA_PATH.length;i++){const a=CAMERA_PATH[i-1],b=CAMERA_PATH[i],steps=Math.ceil(Math.hypot(b[1]-a[1],b[2]-a[2])/.1);
    for(let j=0;j<=steps;j++){const u=steps?j/steps:0;if(!canOccupy(a[1]+(b[1]-a[1])*u,a[2]+(b[2]-a[2])*u,obstacles))return false;}}
  return true;
}
export function createApocalypseCinematic({scene,camera,obstacles,render,onStart,onExit}){
  const assets=createStoryAssets(scene,camera);
  const panel=document.createElement('section');panel.className='story-overlay';panel.hidden=true;panel.setAttribute('aria-label','最后一道门 · 自动剧情');
  panel.innerHTML=`<div class="story-top"><div><span class="story-kicker">FIRST PERSON / 60 SECONDS</span><h2>最后一道门</h2><p id="story-phase"></p></div><button id="story-exit">退出剧情 · Esc</button></div>
  <div class="story-reticle" aria-hidden="true">·</div><div class="story-intro"><span>北站还有灯。</span><p>我们必须活着抵达。</p></div>
  <div class="story-subtitle" role="status" aria-live="polite"><b id="story-speaker"></b><p id="story-line"></p></div>
  <div class="story-bottom"><span id="story-time">00:00 / 01:00</span><div class="story-progress" role="progressbar" aria-label="剧情进度" aria-valuemin="0" aria-valuemax="60" aria-valuenow="0"><i></i></div><span id="story-kills">同伴：林 · 0 / 5</span><button id="story-pause">暂停</button><button id="story-sound" aria-pressed="false">静音</button></div>
  <div class="story-ending" hidden><span class="story-kicker">NORTH STATION / SAFE ZONE</span><h2>我们活下来了。</h2><p>你与林抵达北站。门外的声音，终于远了。</p><div>同伴存活 · 5 名感染者已清除</div><button id="story-replay">重播剧情</button><button id="story-return">返回漫游</button></div>`;
  document.querySelector('#app').append(panel);
  const $=s=>panel.querySelector(s),phase=$('#story-phase'),speaker=$('#story-speaker'),line=$('#story-line'),progress=$('.story-progress'),bar=progress.querySelector('i');
  let playing=false,paused=false,ended=false,t=0,previous=0,frame=0,audio=null,lastLine=null,lastSecond=-1,lastStep=-1,lastShot=null,flashAge=100;
  const lookHelper=new T.Object3D(),targetQuaternion=new T.Quaternion(),targetLook=new T.Vector3(),from=new T.Vector3(),to=new T.Vector3(),direction=new T.Vector3();
  function placeActor(actor,path,time,aim,deadAt=null){const p=samplePath(path,time),future=samplePath(path,time+.15),moving=Math.hypot(future.x-p.x,future.z-p.z)>.001;actor.root.position.set(p.x,floorHeight(p),p.z);let target;
    if(aim)target=aim;else if(moving)target=[future.x,0,future.z];else target=[camera.position.x,0,camera.position.z];
    actor.root.rotation.y=Math.atan2(p.x-target[0],p.z-target[2]);actor.pose(time,moving,Boolean(aim),deadAt===null?0:Math.max(0,t-deadAt));
  }
  function showFrame(dt){
    const position=storyCamera(t),ahead=storyCamera(Math.min(60,t+.1)),speed=Math.hypot(ahead[0]-position[0],ahead[2]-position[2])*10;
    camera.position.fromArray(position);camera.position.y+=Math.sin(t*(speed>2.5?13:10))*Math.min(.027,speed*.012);
    targetLook.fromArray(storyLook(t));lookHelper.position.copy(camera.position);lookHelper.lookAt(targetLook);targetQuaternion.copy(lookHelper.quaternion); // Object3D faces +Z; camera faces -Z.
    lookHelper.rotateY(Math.PI);targetQuaternion.copy(lookHelper.quaternion);
    camera.quaternion.slerp(targetQuaternion,t===0?1:1-Math.exp(-dt*6));
    const fov=t>43&&t<53?68:62;camera.fov+=(fov-camera.fov)*(1-Math.exp(-dt*3));camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
    let npcAim=null;if(t>=16&&t<23){const p=samplePath(ENEMIES[1].path,t);npcAim=[p.x,1.3,p.z];}else if(t>=34&&t<42){const p=samplePath(ENEMIES[3].path,t);npcAim=[p.x,1.3,p.z];}
    placeActor(assets.companion,COMPANION_PATH,t,npcAim);
    ENEMIES.forEach((e,i)=>{const actor=assets.enemies[i];actor.root.visible=t>=e.start;placeActor(actor,e.path,Math.min(t,e.dead),[camera.position.x,1.5,camera.position.z],e.dead);});
    assets.door.rotation.y=-Math.PI*.48*T.MathUtils.smoothstep(t,49.5,51.5)*(1-T.MathUtils.smoothstep(t,57,58.6));
    assets.rig.visible=t>13&&t<55.8;
    const recoil=lastShot?.by==='player'?Math.max(0,1-flashAge/.17):0;
    assets.rig.position.set(Math.sin(t*7)*.006,-Math.abs(Math.sin(t*6))*.007,recoil*.075);assets.rig.rotation.x=recoil*.08;
    assets.flash.visible=flashAge<.065;assets.tracer.visible=flashAge<.045;assets.impact.visible=flashAge<.24;
    if(lastShot){
      const enemy=assets.enemies[lastShot.target];to.copy(enemy.root.position).add(new T.Vector3(0,1.25,0));
      if(lastShot.by==='player'){assets.rifle.getWorldPosition(from);direction.set(0,0,-1).applyQuaternion(camera.quaternion);from.addScaledVector(direction,.65);}else{assets.companion.weapon.getWorldPosition(from);direction.copy(to).sub(from).normalize();from.addScaledVector(direction,.65);}
      assets.flash.position.copy(from);assets.flash.scale.setScalar(.8+Math.sin(flashAge*130)*.3);
      assets.tracer.position.copy(from).add(to).multiplyScalar(.5);assets.tracer.scale.y=from.distanceTo(to);assets.tracer.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.copy(to).sub(from).normalize());
      assets.impact.position.copy(to);assets.impact.children.forEach((p,i)=>{const age=flashAge*3;p.position.set(Math.cos(i*2.4)*age*.3,Math.sin(i*2.4)*age*.2,age*.2);p.scale.setScalar(Math.max(.1,1-flashAge*3));});
    }
    panel.classList.toggle('story-combat',(t>16&&t<23)||(t>33&&t<42.5));
    $('.story-intro').style.opacity=String(1-T.MathUtils.smoothstep(t,2,4));
    const entry=LINES.find(l=>t>=l[0]&&t<l[1]);if(entry!==lastLine){speaker.textContent=entry?.[2]||'';line.textContent=entry?.[3]||'';lastLine=entry;}
    if(Math.floor(t)!==lastSecond){lastSecond=Math.floor(t);phase.textContent=storyPhase(t);$('#story-time').textContent=`00:${String(Math.min(59,lastSecond)).padStart(2,'0')} / 01:00`;if(t>=60)$('#story-time').textContent='01:00 / 01:00';progress.setAttribute('aria-valuenow',String(Math.floor(t)));$('#story-kills').textContent=`同伴：林 · ${ENEMIES.filter(e=>t>=e.dead).length} / 5`;}
    bar.style.transform=`scaleX(${t/60})`;
    if(speed>.3&&Math.floor(t*(speed>2.5?3:2))!==lastStep){lastStep=Math.floor(t*(speed>2.5?3:2));audio?.cue('step');}
    render();
  }
  function tick(now){frame=requestAnimationFrame(tick);const dt=Math.min(.25,Math.max(0,(now-previous)/1000));previous=now;if(!playing||paused||ended)return;
    const before=t;t=Math.min(STORY_DURATION,t+dt);flashAge+=dt;
    for(const shot of SHOTS)if(before<shot.t&&t>=shot.t){lastShot=shot;flashAge=0;audio?.cue('shot');}
    for(const time of [3.8,15.4,32.2])if(before<time&&t>=time)audio?.cue(time===3.8?'radio':'growl');
    if(before<58.5&&t>=58.5)audio?.cue('door');
    showFrame(dt);
    if(t>=STORY_DURATION){ended=true;$('.story-ending').hidden=false;$('#story-pause').hidden=true;audio?.cue('safe');$('#story-replay').focus();}
  }
  function start(){if(!validateStoryRoute(obstacles)){window.alert('剧情路线暂时受阻，请刷新场景后重试。');return;}
    audio?.dispose();audio=createStoryAudio();playing=true;paused=false;ended=false;t=0;lastSecond=-1;lastLine=null;lastStep=-1;lastShot=null;flashAge=100;
    onStart();assets.root.visible=true;panel.hidden=false;panel.classList.remove('is-paused');$('.story-ending').hidden=true;$('#story-pause').hidden=false;$('#story-pause').textContent='暂停';$('#story-sound').textContent='静音';$('#story-sound').setAttribute('aria-pressed','false');
    previous=performance.now();showFrame(1);cancelAnimationFrame(frame);frame=requestAnimationFrame(tick);$('#story-pause').focus();
  }
  function exit(){if(!playing)return;playing=false;cancelAnimationFrame(frame);assets.root.visible=false;assets.rig.visible=false;panel.hidden=true;audio?.dispose();audio=null;onExit();}
  function togglePause(){if(!playing||ended)return;paused=!paused;panel.classList.toggle('is-paused',paused);$('#story-pause').textContent=paused?'继续':'暂停';if(paused)audio?.pause();else{previous=performance.now();audio?.resume();}}
  function key(event){if(!playing)return;if(event.code==='Escape'){event.preventDefault();exit();}else if(event.code==='Space'&&event.target===document.body){event.preventDefault();togglePause();}}
  function visibility(){if(document.hidden&&playing&&!paused&&!ended)togglePause();}
  $('#story-exit').addEventListener('click',exit);$('#story-return').addEventListener('click',exit);$('#story-replay').addEventListener('click',start);$('#story-pause').addEventListener('click',togglePause);$('#story-sound').addEventListener('click',()=>{const muted=audio?.mute();$('#story-sound').textContent=muted?'开启声音':'静音';$('#story-sound').setAttribute('aria-pressed',String(muted));});
  window.addEventListener('keydown',key);document.addEventListener('visibilitychange',visibility);
  return {start,get active(){return playing;},dispose(){cancelAnimationFrame(frame);audio?.dispose();assets.dispose();panel.remove();window.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',visibility);}};
}
