import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createDowntown } from './downtown.js';
import { createScenePost } from './scene-post.js';
import { createWalkController } from './walk-controller.js';
import { WEATHER } from './weather-state.js';
import { createWeatherRain } from './weather-rain.js';
import { createLastCompanion } from './last-companion-player.js';
import './map.css';

document.title = '失落市中心 · Memory Lane';
document.querySelector('meta[name="description"]').content = '走过挂着向日葵的废弃房间，穿过破门，进入被植物接管的市中心。';
document.querySelector('#app').innerHTML = `
  <canvas id="map-canvas" aria-label="可行走的末世市中心，WASD 移动，拖动环顾" tabindex="0"></canvas>
  <div class="map-vignette" aria-hidden="true"></div>
  <div id="map-overlay" hidden>
  <header class="map-header">
    <div><a href="/" class="map-back">← MEMORY LANE</a><div class="map-eyebrow">WORLD STUDY — 01</div><h1 id="location-title">静默居所</h1><p class="map-subtitle" id="location-subtitle">A ROOM THAT REMEMBERS</p></div>
    <div class="map-top-right"><div class="map-weather"><span></span><strong>晴 · 少云 · 小雨</strong><i> / </i> 无人区</div><button id="story-start" disabled>▶ 最后一次并肩 · 60 秒剧情</button><button id="walk-route">走到街上 ↗</button><span id="walk-status" role="status"></span></div>
  </header>
  <nav class="map-views" aria-label="地图视角">
    <button data-view="walk" aria-pressed="true">屋内漫游</button>
    <button data-view="hero" aria-pressed="false">样板街段</button>
    <button data-view="water" aria-pressed="false">街面积水</button>
    <button data-view="street" aria-pressed="false">街道</button>
    <button data-view="overview" aria-pressed="false">俯瞰</button>
    <span></span><button id="reset-view" type="button" aria-label="重置当前视角">重置</button>
  </nav>
  <div class="walk-pad" aria-label="行走控制">
    <button data-move="KeyW" aria-label="向前走">↑</button><button data-move="KeyA" aria-label="向左移动">←</button><button data-move="KeyS" aria-label="向后走">↓</button><button data-move="KeyD" aria-label="向右移动">→</button>
  </div>
  <footer class="map-footer">
    <div><p id="scene-caption">废墟里，仍有一束向日葵。</p><small>原创场景习作 <span id="art-credit"> · 梵高《向日葵》 <a href="https://commons.wikimedia.org/wiki/File:Vincent_van_Gogh_-_Sunflowers_(1888,_National_Gallery_London).jpg" target="_blank" rel="noopener">画作出处 ↗</a></span></small></div>
    <span id="map-help">W A S D 移动 · 拖动环顾<br>↑↓ 前后 · ←→ 转向 · Esc 停止行走</span>
  </footer>
  </div>
  <button id="toggle-panel" class="hud-toggle" type="button" aria-controls="map-overlay" aria-expanded="false">显示面板</button>
  <section id="map-error" role="alert" hidden>
    <h2>地图暂时无法显示</h2><p>请使用支持 WebGL2 的浏览器，并开启硬件加速。</p><a href="/">返回首页</a>
  </section>
`;

const $=selector=>document.querySelector(selector);
const overlay=$('#map-overlay'),panelToggle=$('#toggle-panel');
function togglePanel(){
  overlay.hidden=!overlay.hidden;
  panelToggle.setAttribute('aria-expanded',String(!overlay.hidden));
  panelToggle.textContent=overlay.hidden?'显示面板':'收起面板';
}
panelToggle.addEventListener('click',togglePanel);
if(import.meta.hot)import.meta.hot.dispose(()=>panelToggle.removeEventListener('click',togglePanel));
const canvas=$('#map-canvas'),resetButton=$('#reset-view'),routeButton=$('#walk-route');
const storyButton=$('#story-start');
const viewButtons=[...document.querySelectorAll('[data-view]')];
let renderer,world;
try {
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
  world=createDowntown();
} catch(error) {
  console.error('Could not create downtown scene',error);
  $('#map-error').hidden=false;resetButton.disabled=true;routeButton.disabled=true;
  viewButtons.forEach(button=>{button.disabled=true;});renderer?.dispose();
}

if(world) {
  const camera=new THREE.PerspectiveCamera(64,1,.08,520);
  const post=createScenePost(renderer,world.scene,camera,world.lighting);
  const controls=new OrbitControls(camera,canvas);
  controls.minDistance=5;controls.maxDistance=280;controls.minPolarAngle=.15;
  controls.maxPolarAngle=Math.PI/2-.015;controls.maxTargetRadius=90;controls.screenSpacePanning=false;
  let activeView='walk',inside=true,following=false,disposed=false,assetsLoaded=false;
  const rain=createWeatherRain(world.scene);
  let narrative;
  let weatherTime=0,lastWeatherFrame=performance.now();
  const views={water:{position:[1.2,1.7,22],target:[4,.1,12]},hero:{position:[-9,5.8,59],target:[16.5,7.2,48]},street:{position:[7.8,6.2,52],target:[-3,5,-24]},overview:{position:[99,150,138],target:[0,2,-25]}};
  function render(){if(!disposed&&assetsLoaded){
    const now=performance.now(),dt=Math.min(.25,Math.max(0,(now-lastWeatherFrame)/1000));lastWeatherFrame=now;weatherTime+=dt;
    const state=WEATHER;world.lighting.setAtmosphere(narrative?.active?(narrative.state.t>=395?'evening':'morning'):'day');world.lighting.applyWeather(state,activeView==='overview');
    renderer.toneMappingExposure=state.exposure;world.setWetness(state.wetness);
    if(narrative?.active){
      const story=narrative.state,below=story.underground?THREE.MathUtils.clamp((-camera.position.y-1)/4,0,1):0;
      world.lighting.sun.intensity=(story.sunset?state.sun:1.35)*(1-below);world.lighting.fill.intensity=(story.sunset?state.fill:1.15)*(1-below)+.10*below;
      world.scene.environmentIntensity=(story.sunset?state.environment:.48)*(1-below)+.05*below;world.lighting.haze=below?.08:story.sunset?.45:.58;
      world.scene.fog.color.set(below?'#080d10':story.sunset?'#b7a18b':'#c3c7c6');
      world.scene.fog.near=below?6:story.sunset?80:22;world.scene.fog.far=below?32:story.sunset?260:150;
      if(story.sunset){world.lighting.sun.color.set('#ffc184');world.lighting.fill.color.set('#a9bdc4');}else{world.lighting.sun.color.set('#e3e9e6');world.lighting.fill.color.set('#cbd4d3');}
      renderer.toneMappingExposure=below?1.05:1.1;renderer.shadowMap.needsUpdate=true;
    }else{world.lighting.sun.color.set('#fff0d9');world.lighting.fill.color.set('#c7dce9');}

    if(world.lighting.update(camera))renderer.shadowMap.needsUpdate=true;
    world.water.update(weatherTime,state);rain.update(camera,narrative?.active&&narrative.state.storeOnly?{...state,rain:0}:state,weatherTime);
    post.render();
  }}
  function updatePlace() {
    const room=activeView==='walk'&&inside;
    $('#location-title').textContent=room?'静默居所':'失落市中心';
    $('#location-subtitle').textContent=room?'A ROOM THAT REMEMBERS':'DOWNTOWN / AFTER THE SILENCE';
    $('#scene-caption').textContent=room?'废墟里，仍有一束向日葵。':'城市沉默以后，森林开始回来。';
    $('#art-credit').hidden=!room;
    routeButton.textContent=following?'停止行走':inside?'走到街上 ↗':'沿路回屋 ↙';
  }
  const walker=createWalkController(camera,canvas,{
    obstacles:world.obstacles,render,
    onLocation(value){inside=value;updatePlace();},
    onRouteState(value,message=''){following=value;$('#walk-status').textContent=message||(value?'沿门口走过去，WASD 可接管':'');updatePlace();},
  });
  narrative=createLastCompanion({world,camera,render,
    onStart(){walker.setEnabled(false);controls.enabled=false;controls.stopListenToKeyEvents();activeView='cinematic';$('#app').classList.add('cinematic');$('#app').classList.remove('walking');},
    onExit(){activeView='walk';$('#app').classList.remove('cinematic');viewButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view==='walk')));renderer.shadowMap.needsUpdate=true;resetView();canvas.focus();},
  });
  const startStory=()=>narrative.start(0);storyButton.addEventListener('click',startStory);
  function resetView() {
    walker.stop();
    const walking=activeView==='walk';controls.enabled=!walking;controls.stopListenToKeyEvents();
    walker.setEnabled(walking);$('#app').classList.toggle('walking',walking);routeButton.hidden=!walking;
    $('#map-help').innerHTML=walking?'W A S D 移动 · 拖动环顾<br>↑↓ 前后 · ←→ 转向 · Esc 停止行走':'拖动环顾 · 滚轮缩放 · 右键平移<br>触屏：单指旋转 · 双指缩放与平移';
    camera.fov=walking?64:52;camera.updateProjectionMatrix();
    if(walking)walker.reset();
    else{controls.listenToKeyEvents(canvas);camera.position.fromArray(views[activeView].position);controls.target.fromArray(views[activeView].target);controls.update();}
    updatePlace();render();
  }
  function selectView(event) {
    activeView=event.currentTarget.dataset.view;
    viewButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===activeView)));
    resetView();
  }
  function resize() {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));renderer.setSize(window.innerWidth,window.innerHeight);
    post.resize(window.innerWidth,window.innerHeight,renderer.getPixelRatio());
    camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();render();
  }
  controls.addEventListener('change',render);
  resetButton.addEventListener('click',resetView);routeButton.addEventListener('click',walker.followRoute);
  viewButtons.forEach(button=>button.addEventListener('click',selectView));window.addEventListener('resize',resize);
  resetView();resize();
  routeButton.disabled=true;$('#walk-status').textContent='正在装载街区材质…';
  Promise.all([world.assetsReady,narrative.ready]).then(()=>{if(!disposed){assetsLoaded=true;routeButton.disabled=false;storyButton.disabled=false;$('#walk-status').textContent='';render();rain.capture(renderer);render();}}).catch(error=>{if(!disposed){assetsLoaded=true;routeButton.disabled=false;storyButton.disabled=false;render();rain.capture(renderer);console.error('Scene textures failed to load',error);$('#walk-status').textContent='部分场景贴图未加载，请刷新页面重试';}});
  // Rain also remains visible outside the windows while the camera is indoors.
  const weatherTick=setInterval(()=>{
    if(document.hidden){lastWeatherFrame=performance.now();return;}
    if(assetsLoaded&&!disposed&&!narrative.active&&(WEATHER.rain>.005||((activeView!=='walk'||!inside)&&world.water.visibleFrom(camera))))render();
  },1000/30);
  if(import.meta.hot)import.meta.hot.dispose(()=>{
    clearInterval(weatherTick);rain.dispose();narrative.dispose();storyButton.removeEventListener('click',startStory);
    disposed=true;walker.dispose();controls.dispose();world.dispose();post.dispose();renderer.dispose();
    window.removeEventListener('resize',resize);resetButton.removeEventListener('click',resetView);routeButton.removeEventListener('click',walker.followRoute);
    viewButtons.forEach(button=>button.removeEventListener('click',selectView));
  });
}
