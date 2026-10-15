import {inSequence,installSequence,sequenceEvent,snapshot} from './sequence-bridge.js';
import * as T from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { createSeasideWorld } from './seaside-world.js';
import { seasidePose, GAZE_DURATION, INSPECT_END } from './seaside-motion.js';
import './seaside.css';

document.title='海边小屋 · Memory Lane';
document.querySelector('meta[name="description"]').content='海风、午后光线，与客厅展示柜里留下的藏品。独立第一视角场景。';
document.querySelector('#app').innerHTML=`
  <canvas id="seaside-canvas" tabindex="0" aria-label="海边小屋客厅，拖动画面环顾，右侧展示柜陈列藏品"></canvas>
  <div class="sea-vignette" aria-hidden="true"></div>
  <header class="sea-heading"><small>MEMORY LANE / 02</small><h1>海边小屋</h1></header>
  <span class="sea-number">THE TIDE ROOM</span>
  <nav class="sea-controls" aria-label="海边小屋场景控制"><button id="sea-replay">↺ 重看视线</button><button id="sea-look" aria-pressed="false">自由环顾</button><a href="/">返回</a></nav>
  <div class="sea-caption" role="status" aria-live="polite"><span id="sea-status">午后，海风穿过客厅。</span><small>拖动画面环顾 · 方向键转头</small></div>
  <div class="sea-dialogue" role="status" aria-live="polite" hidden>诶，这不是斯提爵士送我的项链么，<br>真怀念啊。</div>
  <section class="sea-error" hidden><h2>小屋暂时没有打开</h2><p>请使用开启硬件加速、支持 WebGL 的浏览器。</p><a href="/">返回首页</a></section>`;
const canvas=document.querySelector('#seaside-canvas'),status=document.querySelector('#sea-status'),lookButton=document.querySelector('#sea-look');
const dialogue=document.querySelector('.sea-dialogue');
let dispose=()=>{};
try{
  const renderer=new T.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.13;renderer.outputColorSpace=T.SRGBColorSpace;
  const scene=new T.Scene();scene.background=new T.Color('#b9d4db');scene.fog=new T.FogExp2('#b9d4db',.0009);
  const camera=new T.PerspectiveCamera(63,innerWidth/innerHeight,.035,1800);
  const pmrem=new T.PMREMGenerator(renderer),environment=new RoomEnvironment();
  const environmentTarget=pmrem.fromScene(environment,.08);scene.environment=environmentTarget.texture;scene.environmentIntensity=.4;environment.dispose();pmrem.dispose();
  const sun=new T.DirectionalLight('#fff0ce',3.2);sun.position.set(-3,7,-8);sun.target.position.set(0,0,1);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:.5,far:25});sun.shadow.bias=-.00015;sun.shadow.normalBias=.012;sun.shadow.radius=3;scene.add(sun,sun.target);
  scene.add(new T.HemisphereLight('#d5e9ee','#b3a185',1.1));
  RectAreaLightUniformsLib.init();const windowLight=new T.RectAreaLight('#d5e9ed',3.5,6.7,2.2);windowLight.position.set(0,1.8,-3.95);windowLight.lookAt(0,1.3,2);scene.add(windowLight);
  const world=createSeasideWorld(scene);
  const composer=new EffectComposer(renderer),ao=new SSAOPass(scene,camera,innerWidth,innerHeight,16);ao.kernelRadius=.13;ao.minDistance=.0002;ao.maxDistance=.025;composer.addPass(new RenderPass(scene,camera));composer.addPass(ao);composer.addPass(new OutputPass());const fxaa=new ShaderPass(FXAAShader);composer.addPass(fxaa);
  let assetReady=false,assetFailed=false,sequencePlaying=false,sequenceDone=false;
  let elapsed=0,previous=performance.now(),automatic=true,drag=null,refocus=null,yaw=0,pitch=0,frame=0,disposed=false;
  status.textContent='正在摆放藏品…';
  world.ready.then(()=>{assetReady=true;previous=performance.now();}).catch(error=>{assetFailed=true;status.textContent='藏品模型未能载入，请刷新重试。';console.error('Seaside collectible could not load',error);});
  const reduce=matchMedia('(prefers-reduced-motion: reduce)'),keys=new Set(),euler=new T.Euler(0,0,0,'YXZ');
  function setManual(){dialogue.hidden=true;if(!automatic)return;automatic=false;refocus=null;euler.setFromQuaternion(camera.quaternion,'YXZ');yaw=euler.y;pitch=euler.x;lookButton.setAttribute('aria-pressed','true');lookButton.textContent='聚焦藏品';status.textContent='慢慢看，每一件都有来处。';}
  function replay(){dialogue.hidden=true;automatic=true;refocus=null;elapsed=0;previous=performance.now();keys.clear();drag=null;lookButton.setAttribute('aria-pressed','false');lookButton.textContent='自由环顾';status.textContent='午后，海风穿过客厅。';}
  const listeners=[];function on(target,event,fn,options){target.addEventListener(event,fn,options);listeners.push(()=>target.removeEventListener(event,fn,options));}
  on(document.querySelector('#sea-replay'),'click',replay);
  on(lookButton,'click',()=>{if(automatic)setManual();else{automatic=true;elapsed=GAZE_DURATION;refocus={position:camera.position.clone(),quaternion:camera.quaternion.clone(),fov:camera.fov,time:0};lookButton.setAttribute('aria-pressed','false');lookButton.textContent='自由环顾';}});
  on(canvas,'pointerdown',e=>{if(e.button!==0)return;setManual();canvas.focus();drag={x:e.clientX,y:e.clientY,id:e.pointerId};canvas.setPointerCapture(e.pointerId);});
  on(canvas,'pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;yaw-=(e.clientX-drag.x)*.003;pitch=Math.max(-.95,Math.min(.95,pitch-(e.clientY-drag.y)*.0025));drag.x=e.clientX;drag.y=e.clientY;});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])on(canvas,event,()=>{drag=null;});
  on(canvas,'keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code)){e.preventDefault();setManual();keys.add(e.code);}if(e.code==='Escape'){drag=null;keys.clear();}});
  on(window,'keyup',e=>keys.delete(e.code));on(window,'blur',()=>{keys.clear();drag=null;});on(document,'visibilitychange',()=>{previous=performance.now();keys.clear();drag=null;});
  function resize(){const dpr=Math.min(devicePixelRatio,innerWidth<700?1.25:1.5);renderer.setPixelRatio(dpr);renderer.setSize(innerWidth,innerHeight);composer.setPixelRatio(dpr);composer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();fxaa.uniforms.resolution.value.set(1/(innerWidth*dpr),1/(innerHeight*dpr));}
  on(window,'resize',resize);resize();
  let sequencePrevious=performance.now();
  function tick(now){if(disposed)return;const dt=Math.min(.05,(now-previous)/1000);previous=now;if(!document.hidden){
    if(automatic){if(assetReady&&(!inSequence||sequencePlaying))elapsed=Math.min(GAZE_DURATION,elapsed+(inSequence?Math.max(0,(now-sequencePrevious)/1000):dt));const pose=seasidePose(elapsed,reduce.matches);camera.position.fromArray(pose.position);camera.lookAt(new T.Vector3(...pose.look));camera.fov=pose.fov;
      if(refocus){refocus.time+=dt;const u=reduce.matches?1:Math.min(1,refocus.time/2.8),blend=u*u*(3-2*u),endPosition=camera.position.clone(),endRotation=camera.quaternion.clone();camera.position.copy(refocus.position).lerp(endPosition,blend);camera.quaternion.copy(refocus.quaternion).slerp(endRotation,blend);camera.fov=T.MathUtils.lerp(refocus.fov,pose.fov,blend);if(u===1)refocus=null;}
      camera.updateProjectionMatrix();ao.ssaoMaterial.uniforms.cameraProjectionMatrix.value.copy(camera.projectionMatrix);ao.ssaoMaterial.uniforms.cameraInverseProjectionMatrix.value.copy(camera.projectionMatrixInverse);const caption=assetFailed?'藏品模型未能载入，请刷新重试。':!assetReady?'正在摆放藏品…':pose.done?'07 / 爱心项链':pose.stage==='inspect'?'在柜前，慢慢看。':pose.stage==='focus'?'目光停在这条项链上。':'走近海边小屋的藏品柜。';if(status.textContent!==caption)status.textContent=caption;}
    else{yaw+=((keys.has('ArrowLeft')?1:0)-(keys.has('ArrowRight')?1:0))*dt*.65;pitch=Math.max(-.95,Math.min(.95,pitch+((keys.has('ArrowUp')?1:0)-(keys.has('ArrowDown')?1:0))*dt*.5));camera.rotation.set(pitch,yaw,0,'YXZ');}
    const subtitleOpacity=automatic&&assetReady&&!refocus?Math.min(T.MathUtils.smoothstep(elapsed,INSPECT_END,INSPECT_END+.35),1-T.MathUtils.smoothstep(elapsed,GAZE_DURATION-.5,GAZE_DURATION-.08)):0;
    dialogue.hidden=subtitleOpacity<=0;dialogue.style.opacity=subtitleOpacity;
    world.update(reduce.matches?0:now/1000);composer.render();
    if(inSequence&&elapsed>=GAZE_DURATION&&!sequenceDone){sequenceDone=true;sequencePlaying=false;sequenceEvent('done');}
  }sequencePrevious=now;frame=requestAnimationFrame(tick);}
  frame=requestAnimationFrame(tick);
  dispose=()=>{disposed=true;cancelAnimationFrame(frame);listeners.forEach(fn=>fn());ao.dispose();fxaa.dispose();composer.dispose();world.dispose();environmentTarget.dispose();renderer.dispose();};
  installSequence({ready:world.ready,start(){replay();sequenceDone=false;sequencePlaying=true;sequencePrevious=performance.now();},pause(){sequencePlaying=false;},resume(){if(!sequenceDone){sequencePlaying=true;sequencePrevious=performance.now();}},capture:()=>snapshot(canvas,()=>composer.render()),dispose:()=>dispose()});
}catch(error){sequenceEvent('error',{message:error.message});console.error('Seaside scene could not start',error);document.querySelector('.sea-error').hidden=false;}
if(import.meta.hot)import.meta.hot.dispose(()=>dispose());
