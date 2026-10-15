import {inSequence,installSequence,sequenceEvent,snapshot} from '../sequence-bridge.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { createChapel } from './chapel.js';
import { createPendant } from './pendant.js';
import { createAtmosphere } from './atmosphere.js';
import { loadChapelTextures } from './materials.js';
import { createCinematic } from './cinematic.js';
import { createCharacter } from './character.js';
import { createPlayer } from './player.js';
import { createInteraction } from './interact.js';
import { createDirector } from './director.js';
import { createArms } from './arms.js';
import { StoryFlow, SEGMENTS, readCheckpoint, readAutoplay, saveAutoplay } from './flow.js';
import { createAutopilot } from './autopilot.js';
import { START, PASSAGE, PLAYER_RADIUS } from './layout.js';
import { ESTOC } from './props.js';
import { MemorySound } from './sound.js';
import { dialogue, line } from './story.js';
import './style.css';

const icon = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 11 7-11 7z"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>',
  sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5 5 9H2v6h3l5 4zM14 8a6 6 0 0 1 0 8M17 5a10 10 0 0 1 0 14"/></svg>',
  mute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5 5 9H2v6h3l5 4zM15 8l7 8M22 8l-7 8"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h17m-6-6 6 6-6 6"/></svg>',
};
const CHARACTERS = '/assets/bloodbound/characters/v3/';
const touchDevice = matchMedia('(pointer: coarse)').matches;
const controlsHelp = touchDevice
  ? '左侧拖动移动 · 右侧滑动环顾 · 对准后按屏幕按钮互动'
  : 'WASD 移动 · 鼠标环顾 · E 或左键互动 · 按住 E 伸手 · Space / Esc 菜单 · M 静音';
const autoHelp = touchDevice ? '自动播放中 · 右上角可打开菜单' : '自动播放中 · Space / Esc 菜单 · M 静音';
const autoToggle = '<button class="auto-toggle" type="button" data-autoplay aria-pressed="true"><i aria-hidden="true"></i><span>自动播放<small>按时间轴自动走完这段回忆</small></span></button>';

document.querySelector('#app').innerHTML = `
  <div class="memory-stage" data-state="loading">
    <div class="film-shade" aria-hidden="true"></div><div class="grain" aria-hidden="true"></div>
    <div class="cinema-matte" aria-hidden="true"></div><div class="flash" aria-hidden="true"></div><div class="fade" aria-hidden="true"></div>
    <div class="reticle" aria-hidden="true" hidden></div>
    <div class="use-prompt" aria-live="polite" hidden></div>
    <button class="use-button" type="button" hidden>使用</button>
    <div class="stick" aria-hidden="true" hidden><span></span></div>
    <p class="hint" role="status" hidden></p>
    <p class="controls-tip" hidden></p>
    <header class="masthead"><a class="wordmark" href="/">MEMORY LANE<span>A PLACE FOR WHAT REMAINS</span></a><span class="chapter-mark">CHAPTER I <i></i> BLOODBOUND</span>
      <div class="player-tools" hidden><button class="icon-button" id="sound-toggle" aria-label="关闭声音" title="声音 · M">${icon.sound}</button><button class="icon-button" id="menu-toggle" aria-label="打开菜单" title="菜单 · Esc">${icon.menu}</button></div>
    </header>
    <section class="opening" aria-labelledby="memory-title"><div class="opening-content"><p class="overline">THE NIGHT YOU WERE MINE</p><h1 id="memory-title">BLOOD<span>BOUND</span></h1><div class="hairline"></div><p class="opening-quote">他渴望你的血。<br>却选择将它珍藏。</p>
      <button class="enter-button" id="enter-memory" disabled><span>走进这段回忆<small>STEP INSIDE</small></span>${icon.arrow}</button>
      ${autoToggle}
      <button class="text-button" id="resume-checkpoint" hidden disabled></button>
      <p class="opening-detail">第一人称 · 自由走动 · 建议佩戴耳机</p><p class="provenance">虚构示例 · 改编自《BLOODBOUND — The Night You Were Mine》，不是你的真实经历</p></div>
      <div class="opening-index"><span>01</span><p>月下教堂<br><small>THE CHAPEL</small></p></div><a class="credits-link" href="/assets/bloodbound/credits.html" target="_blank" rel="noopener">制作与素材致谢</a>
    </section>
    <section class="subtitle" aria-live="polite" hidden><span class="speaker"></span><p class="english"></p><p class="chinese"></p></section>
    <section class="pause-panel" role="dialog" aria-modal="true" aria-label="菜单" hidden><p class="overline">THE MEMORY CAN WAIT</p><h2>停留在这一刻</h2><p class="menu-segment"></p>
      <div class="menu-actions"><button class="solid-button" id="resume-memory">继续 ${icon.play}</button>${autoToggle}<button class="text-button" id="menu-next">跳到下一段</button><button class="text-button" id="menu-segment-start">回到本段开头</button><button class="text-button" id="menu-restart">从头开始</button></div>
      <p class="menu-help"></p></section>
    <section class="ending" hidden><p class="overline">A PROMISE, KEPT</p><h2>有些承诺，<br>值得再次走近。</h2><p class="ending-quote">“Not even me.”</p><div class="ending-actions"><button class="solid-button" id="next-memory">走向下一段回忆 ${icon.arrow}</button><button class="text-button" id="ending-replay">再走一遍</button></div><p class="ending-note">虚构示例 · 改编自《BLOODBOUND — The Night You Were Mine》 · <a href="/assets/bloodbound/credits.html" target="_blank" rel="noopener">制作与素材致谢</a></p></section>
    <section class="handoff-panel" hidden><p class="overline">THE NEXT CHAPTER</p><h2>下一段回忆，<br>从这里继续。</h2><p>这段示例到此结束。</p><button class="text-button" id="return-memory">返回这段回忆</button></section>
    <footer class="player-footer" hidden><span class="beat-label"></span><div class="progress" aria-hidden="true"><span></span></div></footer>
    <div class="loading-panel" role="status"><p class="overline">PREPARING THE MEMORY</p><h2>月光正在抵达</h2><div class="loading-track"><span></span></div><p id="loading-detail">准备教堂、人物与声音…</p><button id="retry-load" class="text-button" hidden>重新加载</button></div>
    <div class="notice" role="status" hidden></div>
    <div class="review-controls" hidden>${SEGMENTS.map(s => `<button data-review-segment="${s.id}">${s.label}</button>`).join('')}<span id="performance-label"></span></div>
  </div>`;

const $ = selector => document.querySelector(selector);
const stage = $('.memory-stage');
const reviewMode = new URLSearchParams(location.search).get('review') === '1';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer;
let disposeScene = () => {};
$('#retry-load').addEventListener('click', () => location.reload());
try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'default' }); }
catch { showError('暂时无法打开三维场景，请开启浏览器硬件加速后重试。'); }
if (renderer) init().catch(error => { console.error('BLOODBOUND setup', error); showError('这段回忆暂时未准备好，请重新加载。'); });

function showError(message) {
  $('#loading-detail').textContent = message;
  $('#retry-load').hidden = false;
  $('.loading-track').hidden = true;
  stage.dataset.state = 'error';sequenceEvent('error',{message});
}
let noticeTimer = 0;
function notice(message) {
  const element = $('.notice');
  element.textContent = message; element.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { element.hidden = true; }, 3500);
}
const storage = (() => { try { return localStorage; } catch { return null; } })();

async function init() {
  const lifetime = new AbortController();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101922);
  scene.fog = new THREE.FogExp2(0x14212d, 0.025);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.transmissionResolutionScale = 0.5;
  stage.prepend(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', '月下教堂的三维回忆');
  const camera = new THREE.PerspectiveCamera(touchDevice ? 68 : 62, innerWidth / innerHeight, 0.025, 60);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  let environment = pmrem.fromScene(room, .05);
  room.dispose();
  scene.environment = environment.texture;
  scene.environmentIntensity = .18;
  scene.add(new THREE.HemisphereLight(0xb6c9df, 0x171c22, .22));
  const moon = new THREE.SpotLight(0xb0cded, 265, 22, .5, .65, 2);
  moon.position.set(-5.65, 5.4, -4.15);
  moon.target.position.set(0, .4, -1.45);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  moon.shadow.camera.near = .15;
  moon.shadow.camera.far = 22;
  moon.shadow.bias = -.0002;
  moon.shadow.normalBias = .015;
  scene.add(moon, moon.target);
  const key = new THREE.SpotLight(0xe0e5e9, 16, 9, .57, .95, 2);
  key.position.set(-1.65, 2.4, -.15);
  key.target.position.set(0, 1.4, -1.3);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -.00006;
  key.shadow.normalBias = .002;
  scene.add(key, key.target);
  const rim = new THREE.SpotLight(0x89abd5, 26, 8, .5, .85, 2);
  rim.position.set(1.5, 3, -3.3);
  rim.target.position.set(0, 1.4, -1.2);
  scene.add(rim, rim.target);
  const atmosphere = createAtmosphere();
  scene.add(atmosphere.group);
  const pendant = createPendant({ wearable: true });
  pendant.group.visible = false;
  scene.add(pendant.group, pendant.light, pendant.drops);
  const sound = new MemorySound();
  const audioPromise = sound.load().catch(error => {
    if (!reviewMode) throw error;
    console.warn('Development audio assets', error.message);
    return { lines: [] };
  });
  const loader = new GLTFLoader();
  const progress = new Map();
  const track = name => event => {
    if (!event.total) return;
    progress.set(name, event.loaded / event.total);
    $('#loading-detail').textContent = `正在准备人物 · ${Math.round([...progress.values()].reduce((a, b) => a + b, 0) / 2 * 100)}%`;
  };
  const [textureSet, lucienGltf, hunterGltf, estocGltf, armsGltf, pendantGltf] = await Promise.all([
    loadChapelTextures(),
    loader.loadAsync(`${CHARACTERS}lucien.glb`, track('lucien')),
    loader.loadAsync(`${CHARACTERS}hunter.glb`, track('hunter')),
    loader.loadAsync(ESTOC.file),
    loader.loadAsync(`${CHARACTERS}arms.glb`),
    loader.loadAsync('/assets/bloodbound/heart-pendant.glb'),
    audioPromise,
  ]);
  pendant.setModel(pendantGltf.scene);
  const audioComplete = dialogue.every(entry => sound.buffers.has(entry.id));
  const chapel = createChapel(THREE, { textures: textureSet, metersPerTile: { stone: 1.6, wall: 2.1, floor: 2 } });
  scene.add(chapel.group);
  const lucien = createCharacter(lucienGltf);
  const hunter = createCharacter(hunterGltf, { prop: { gltf: estocGltf, spec: ESTOC } });
  // The hunter's figure is modelled at about 1.55 m; scaled to stand a little over Lucien and over the player's eyes.
  hunter.root.scale.multiplyScalar(1.18);
  hunter.root.updateMatrixWorld(true);
  hunter.root.position.y -= new THREE.Box3().setFromObject(hunter.root, true).min.y;
  lucien.group.visible = hunter.group.visible = false;
  const arms = createArms(armsGltf);
  scene.add(lucien.group, hunter.group, arms.group);
  $('#loading-detail').textContent = '正在准备教堂光影…';
  await chapel.ready;
  try {
    const hdr = await new HDRLoader().loadAsync('/assets/bloodbound/chapel-lighting.hdr');
    environment.dispose();
    environment = pmrem.fromEquirectangular(hdr);
    scene.environment = environment.texture;
    hdr.dispose();
  } catch { console.info('Using the local soft-light reflection environment'); }
  pmrem.dispose();
  const cinematic = createCinematic(renderer, scene, camera);

  const player = createPlayer({ camera, dom: renderer.domElement, stick: $('.stick'), reducedMotion });
  const interact = createInteraction({ camera, dom: renderer.domElement, prompt: $('.use-prompt'), button: $('.use-button'), isLocked: () => player.locked });
  let state = 'loading';
  let launched = false;
  let starting = false;
  let disposed = false;
  let lastFrame = 0;
  let frames = 0;
  let fpsStart = performance.now();
  let runTime = 0;
  let exitAnimation = null;
  // After the ending card, walking out along the passage.
  let walkingOut = false;
  // When auto-play sets off down the passage.
  let leaveAt = 0;
  let endOpened = false;
  // The end door swings wide as you come near it.
  const openEnd = (length = 1.4) => {
    if (endOpened) return;
    endOpened = true;
    chapel.openEnd(runTime, length);
    sound.play('door-open', 0, 0, 'effects', .6);
  };
  // Inside the journey the memory plays whole, from the walk down the nave to the door. When he has said his last line
  // you turn from him, cross the nave and push the doors to the passage open with both hands, into the light the next
  // memory grows from (see journey-effects.js).
  const OUTRO_SECONDS = 5.4;
  let sequenceStart = 0, outro = null;
  const smooth = u => { const k = Math.min(1, Math.max(0, u)); return k * k * (3 - 2 * k); };
  const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
  function beginOutro() {
    const { x, z, yaw, pitch } = player.pose, [doorX, , doorZ] = chapel.group.userData.exit.doorway;
    // An arm's length from the leaves, which hang at x 5.82.
    // Far enough back that the arch stays in frame on the approach; the step in comes with the push.
    const stand = new THREE.Vector3(doorX - .8, 0, doorZ);
    const path = new THREE.CatmullRomCurve3([new THREE.Vector3(x, 0, z), new THREE.Vector3(stand.x - 1.2, 0, doorZ + (z - doorZ) * .2), stand], false, 'centripetal');
    outro = { time: 0, length: OUTRO_SECONDS, path, yaw, pitch, pushed: false, sent: false };
  }
  // Seconds below are on a 4.8 s clock, stretched to the outro's length.
  function steerOutro(dt) {
    const o = outro;
    o.time += dt;
    const s = o.time / o.length * 4.8, ease = (from, length) => smooth((s - from) / length);
    const walk = ease(.35, 2.95), point = o.path.getPointAt(walk), tangent = o.path.getTangentAt(Math.min(walk, .999));
    // Facing the way you go, and square to the doors for the last steps.
    const along = Math.atan2(-tangent.x, -tangent.z), ahead = along + wrap(-Math.PI / 2 - along) * ease(2.4, .8);
    const turn = ease(0, 2.1), yaw = o.yaw + wrap(ahead - o.yaw) * turn;
    // Leaning into the doors as they give, then a step on into the doorway.
    const forward = ease(2.85, .5) * .48 + ease(3.55, 1.25) * .55;
    player.limitLook(null);
    player.passageOpen = true;
    Object.assign(player.pose, { x: point.x - Math.sin(yaw) * forward, z: point.z - Math.cos(yaw) * forward, yaw, pitch: o.pitch + (.03 - o.pitch) * turn });
    if (s > 2.8 && arms.pose !== 'push' && !o.pushed) arms.set('push', { speed: 5 });
    if (s > 3.3 && !o.pushed) {
      o.pushed = true;
      chapel.burst(runTime);
      sound.play('door-burst', 0, 0, 'effects', 1.1);
      sound.play('door-open', 0, .2, 'effects', .45);
      ui.shake(.45);
    }
    if (s > 3.95 && arms.pose === 'push') arms.set('rest', { speed: 2.2 });
    if (s >= 4.8 && !o.sent) { o.sent = true; sequenceEvent('done'); }
  }
  let completionSent = false;
  let accepted = false;
  let externalHandoff = false;
  let jumping = false;
  let subtitleUntil = 0;
  let hintUntil = 0;
  let tipUntil = 0;
  let fade = { value: 0, target: 0 };
  let flash = 0;
  let shake = 0;
  let pixelRatio = Math.min(devicePixelRatio, 1.5, Math.sqrt(2200000 / (innerWidth * innerHeight)));
  let fullRatio = pixelRatio, stalled = false;
  const finishDetail = () => ({ memoryId: 'bloodbound', keepsakeId: 'blood-heart-pendant', completed: true, exit: chapel.group.userData.exit, dialogueSource: 'BLOODBOUND — The Night You Were Mine, 2026-10-14' });
  const event = (name, detail = {}) => dispatchEvent(new CustomEvent(`memorylane:${name}`, { detail }));

  // Made once the director is (it drives the director's scenes); the hints ask whether it is on.
  let autopilot = null;
  const ui = {
    say(id) {
      const entry = line(id);
      const length = Math.max(sound.duration(id), 1.6);
      sound.play(id);
      $('.speaker').textContent = entry.speaker;
      $('.english').textContent = entry.text;
      $('.chinese').textContent = entry.translation;
      $('.subtitle').hidden = false;
      subtitleUntil = runTime + length + 0.6;
      return length;
    },
    // Auto-play does what the hints ask, so it does not show them.
    hint(text, seconds = 5) { if (autopilot?.active) return; $('.hint').textContent = text; $('.hint').hidden = false; hintUntil = runTime + seconds; },
    shake(amount = 1) { shake = Math.max(shake, amount); },
    matte(on) { stage.dataset.matte = on ? 'on' : 'off'; },
    fade(value, instant = false) { fade.target = value; if (instant) fade.value = value; },
    flash(amount = 0.7, tone = 'light') { flash = Math.max(flash, amount); $('.flash').style.background = tone === 'blood' ? '#8c0c14' : ''; },
  };
  const flow = new StoryFlow({
    storage:inSequence?null:storage,
    onEnter: id => {
      director.enter(id, { jump: jumping });
      jumping = false;
      $('.beat-label').textContent = flow.label;
      $('.progress span').style.transform = `scaleX(${flow.index / (SEGMENTS.length - 1)})`;
      stage.dataset.segment = id;
      event('statechange', { state, segment: id });
    },
  });
  const director = createDirector({
    player, flow, interact, lucien, hunter, arms, chapel, pendant, sound, ui, brisk: inSequence,
    onAccept: () => { accepted = true; event('accept', { keepsakeId: 'blood-heart-pendant' }); },
    onComplete: () => (outro ? null : autopilot.active ? leaveOnOwn() : setState('complete')),
  });
  autopilot = createAutopilot({ player, flow, interact, director, lucien, hunter, pendant, arms });
  // Inside the journey it always plays itself.
  let autoplay = inSequence || readAutoplay(storage);
  // The same switch on the title and in the menu; it takes the body over (or hands it back) when the memory plays on.
  function showAutoplay() {
    document.querySelectorAll('[data-autoplay]').forEach(button => button.setAttribute('aria-pressed', String(autoplay)));
    $('.menu-help').textContent = autoplay ? autoHelp : controlsHelp;
    $('.controls-tip').textContent = autoplay ? autoHelp : controlsHelp;
  }
  showAutoplay();
  document.querySelectorAll('[data-autoplay]').forEach(button => button.addEventListener('click', () => {
    autoplay = !autoplay;
    saveAutoplay(storage, autoplay);
    showAutoplay();
  }));
  const takeOver = () => {
    // Taking the body back mid-memory shows the controls again.
    if (autopilot.active && !autoplay && launched) { $('.controls-tip').hidden = false; tipUntil = runTime + 9; player.travelled = 0; }
    autopilot.active = autoplay;
    if (autoplay) player.releaseLock();
  };

  function setState(next) {
    state = next;
    stage.dataset.state = next;
    const live = ['playing', 'paused'].includes(next);
    $('.opening').hidden = next !== 'ready';
    if (next === 'ready') refreshCheckpoint();
    $('.player-tools').hidden = !live;
    $('.player-footer').hidden = !live;
    $('.pause-panel').hidden = next !== 'paused';
    $('.ending').hidden = next !== 'complete';
    $('.handoff-panel').hidden = next !== 'handoff';
    $('.reticle').hidden = next !== 'playing' || autopilot.active;
    player.enabled = next === 'playing';
    interact.enabled = next === 'playing';
    if (next !== 'playing') { $('.stick').hidden = true; $('.use-prompt').hidden = true; $('.use-button').hidden = true; }
    if (!live) { $('.subtitle').hidden = true; $('.hint').hidden = true; $('.controls-tip').hidden = true; }
    if (next === 'paused') {
      $('.menu-segment').textContent = flow.label;
      $('#menu-next').hidden = ['wear', 'end'].includes(flow.segment);
      sound.suspend().catch(() => {});
      $('#resume-memory').focus({ preventScroll: true });
    }
    if (next === 'complete') {
      player.releaseLock();
      fade.target = .88;
      $('#next-memory').focus({ preventScroll: true });
      if (!completionSent) { completionSent = true; event('complete', finishDetail()); }
    }
    if (next === 'ready') sound.stop();
    event('statechange', { state: next, segment: flow.segment });
  }

  // `segment` is where the run starts: the beginning, a checkpoint, or a review jump.
  async function start(segment = 'explore') {
    if (disposed || starting) return;
    starting = true;
    try { await sound.unlock(); }
    finally { starting = false; }
    if (disposed) return;
    completionSent = false;
    accepted = ['wear', 'end'].includes(segment);
    exitAnimation = null;
    sequenceStart = runTime;
    outro = null;
    walkingOut = endOpened = false;
    leaveAt = 0;
    externalHandoff = false;
    chapterGroup.visible = true;
    launched = true;
    sound.stop();
    sound.startAmbience();
    $('.subtitle').hidden = true;
    takeOver();
    setState('playing');
    jumping = true;
    flow.go(segment);
    if (state !== 'playing') return;
    if(!inSequence)player.requestLock();
    $('.controls-tip').hidden = false;
    tipUntil = runTime + 9;
    renderer.shadowMap.needsUpdate = true;
    event('enter', { memoryId: 'bloodbound', segment });
  }
  async function pause() {
    // The journey holds the memory still once the doors are open; the room's sound dies away under its own.
    if (outro?.sent && state === 'playing') { sound.fadeOut(1.2); state = 'held'; return true; }
    if (state !== 'playing') return false;
    setState('paused');
    player.releaseLock();
    return true;
  }
  async function resume() {
    if (state !== 'paused') return;
    await sound.unlock();
    takeOver();
    setState('playing');
    if(!inSequence)player.requestLock();
  }
  async function jump(segment) {
    await sound.unlock();
    walkingOut = endOpened = false;
    sound.stop();
    sound.startAmbience();
    $('.subtitle').hidden = true;
    accepted = ['wear', 'end'].includes(segment);
    leaveAt = 0;
    takeOver();
    setState('playing');
    jumping = true;
    flow.go(segment);
    if(!inSequence)player.requestLock();
  }
  // Auto-play's way on from the end, in place of the ending card: a moment with him, then the nave doors open and the
  // walk east down the passage to the door at its end.
  function leaveOnOwn() {
    if (!completionSent) { completionSent = true; event('complete', finishDetail()); }
    if (!director.release()) return;
    walkingOut = true;
    chapel.openPassage(runTime + 1.2);
    sound.play('door-open', 1.2, 0, 'effects', .9, false, .5);
    // A last look at him before the walk out.
    leaveAt = runTime + 3.6;
  }
  // The ending card's way on: back on your feet beside him, the nave doors swinging open on the passage east.
  async function walkOut() {
    if (state !== 'complete' || !director.release()) return exit();
    await sound.unlock();
    walkingOut = true;
    fade.target = 0;
    setState('playing');
    chapel.openPassage(runTime + .3);
    sound.play('door-open', .3, 0, 'effects', .9, false, .5);
    // Say where the doorway is from where you stand: it is often behind you when the card closes.
    const [dx, , dz] = chapel.group.userData.exit.doorway, { x, z, yaw } = player.pose;
    const turn = Math.atan2(Math.sin(Math.atan2(-(dx - x), -(dz - z)) - yaw), Math.cos(Math.atan2(-(dx - x), -(dz - z)) - yaw));
    const where = Math.abs(turn) < Math.PI / 4 ? '就在前方' : Math.abs(turn) > Math.PI * 3 / 4 ? '在你身后' : turn > 0 ? '在你左手边' : '在你右手边';
    ui.hint(`东侧的门开了 · 门${where} · 走廊尽头有光`, 8);
    if(!inSequence)player.requestLock();
  }
  async function exit() {
    if (state !== 'complete' && !(state === 'playing' && walkingOut)) return;
    walkingOut = false;
    sound.stopScheduled();
    const detail = { ...finishDetail(), context: { renderer, scene, camera, chapter: chapterGroup, keepsake: pendant.group } };
    const request = new CustomEvent('memorylane:exitrequest', { detail, cancelable: true });
    if (!dispatchEvent(request)) {
      externalHandoff = true;
      setState('handoff');
      stage.dataset.state = 'external-handoff';
      event('exit', detail);
      return;
    }
    // Down the passage and through the end door, by the nave doorway if you are not in the passage yet.
    const { position, doorway } = chapel.group.userData.exit, eye = player.pose.floor + 1.6;
    const path = [camera.position.clone()];
    if (camera.position.x < doorway[0]) path.push(new THREE.Vector3(doorway[0] - .7, eye, doorway[2]), new THREE.Vector3(doorway[0] + .5, eye, doorway[2]));
    // To an arm's length from the end door, where both hands go to it.
    if (camera.position.x < position[0] - 2.4) path.push(new THREE.Vector3(position[0] - 1.8, 1.6, position[2]));
    path.push(new THREE.Vector3(position[0] - .55, 1.6, position[2]));
    const curve = new THREE.CatmullRomCurve3(path, false, 'centripetal');
    exitAnimation = { at: performance.now(), curve, length: Math.max(1200, curve.getLength() / 1.6 * 1000), quaternion: camera.quaternion.clone(), stand: null };
    if (!['playing', 'paused'].includes(state)) chapel.openPassage(runTime - 3);
    setState('exiting');
    fade.target = 0;
    pendant.group.visible = false;
    arms.group.visible = false;
    event('exit', detail);
  }
  const safe = fn => () => { Promise.resolve(fn()).catch(error => { console.error('Memory control', error); notice('声音暂时无法启动，请再次点击继续。'); }); };
  // The title offers the checkpoint only while one is saved; finishing or restarting clears it.
  function refreshCheckpoint() {
    const checkpoint = readCheckpoint(storage);
    $('#resume-checkpoint').hidden = !checkpoint;
    if (checkpoint) $('#resume-checkpoint').textContent = `从存档继续 · ${SEGMENTS.find(s => s.id === checkpoint).label}`;
  }
  refreshCheckpoint();
  $('#enter-memory').addEventListener('click', safe(() => { flow.clear(); return start(); }));
  $('#resume-checkpoint').addEventListener('click', safe(() => start(readCheckpoint(storage) ?? 'explore')));
  $('#menu-toggle').addEventListener('click', safe(() => state === 'paused' ? resume() : pause()));
  $('#resume-memory').addEventListener('click', safe(resume));
  $('#menu-next').addEventListener('click', safe(() => jump(SEGMENTS[Math.min(flow.index + 1, SEGMENTS.length - 1)].id)));
  $('#menu-segment-start').addEventListener('click', safe(() => jump(flow.segment)));
  $('#menu-restart').addEventListener('click', safe(() => jump('explore')));
  $('#ending-replay').addEventListener('click', safe(() => { flow.clear(); return start(); }));
  $('#next-memory').addEventListener('click', safe(walkOut));
  $('#return-memory').addEventListener('click', () => { exitAnimation = null; walkingOut = endOpened = false; sound.stop(); flash = 0; $('.flash').style.opacity = '0'; launched = false; chapel.reset(); lucien.group.visible = hunter.group.visible = false; fade.target = fade.value = 0; setState('ready'); });
  $('#sound-toggle').addEventListener('click', () => {
    sound.mute(!sound.muted);
    $('#sound-toggle').innerHTML = sound.muted ? icon.mute : icon.sound;
    $('#sound-toggle').setAttribute('aria-label', sound.muted ? '开启声音' : '关闭声音');
    notice(sound.muted ? '声音已关闭 · M 恢复' : '声音已开启');
  });
  // Clicking the scene takes the mouse back for looking around.
  renderer.domElement.addEventListener('click', () => { if (state === 'playing'&&!inSequence)player.requestLock(); }, { signal: lifetime.signal });
  // Leaving pointer lock (Esc, switching windows) opens the menu, as games do.
  let lockedOnce = false;
  let lockLostAt = 0;
  document.addEventListener('pointerlockchange', () => {
    if (player.locked) { lockedOnce = true; return; }
    if (lockedOnce && state === 'playing') { lockLostAt = performance.now(); pause(); }
  }, { signal: lifetime.signal });
  addEventListener('keydown', event => {
    if (event.repeat || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    if (event.code === 'KeyM') $('#sound-toggle').click();
    if ((event.code === 'Space' && event.target.tagName !== 'BUTTON') || event.key === 'Escape') {
      if (state === 'playing') { event.preventDefault(); safe(pause)(); }
      // The Esc that just released the pointer must not also close the menu it opened.
      else if (state === 'paused' && performance.now() - lockLostAt > 400) { event.preventDefault(); safe(resume)(); }
    }
    if (event.key === 'Tab' && state === 'paused') {
      const buttons = [...document.querySelectorAll('.pause-panel button')].filter(button => !button.hidden);
      const index = buttons.indexOf(document.activeElement);
      event.preventDefault();
      buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
    }
  }, { signal: lifetime.signal });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state === 'playing') pause();
  }, { signal: lifetime.signal });
  renderer.domElement.addEventListener('webglcontextlost', event => {
    if (disposed) return;
    event.preventDefault(); pause(); notice('画面连接暂时中断，正在恢复。');
  }, { signal: lifetime.signal });
  renderer.domElement.addEventListener('webglcontextrestored', () => { if (!disposed) location.reload(); }, { signal: lifetime.signal });

  const resize = () => {
    if (externalHandoff) return;
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    pixelRatio = fullRatio = Math.min(devicePixelRatio, 1.5, Math.sqrt(2200000 / (innerWidth * innerHeight)));
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(innerWidth, innerHeight);
    cinematic.resize();
  };
  addEventListener('resize', resize, { signal: lifetime.signal });
  resize();
  const chapterGroup = new THREE.Group();
  chapterGroup.name = 'BLOODBOUND chapter';
  for (const object of [...scene.children]) chapterGroup.add(object);
  scene.add(chapterGroup);
  player.setPose(START);
  cinematic.render('scene', 3);
  $('#loading-detail').textContent = '正在准备第一束月光…';
  // Compile every program the chapter will need now, the figures included although they are hidden until their
  // scenes; otherwise the frame stalls for seconds at the moment he first runs in.
  const hidden = [lucien.group, hunter.group, arms.group].filter(object => !object.visible);
  for (const object of hidden) object.visible = true;
  const compiled = cinematic.compile();
  // Shadow programs are only built by a real draw: stand the figures in view for one frame behind the loading panel.
  const spot = camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize().multiplyScalar(2.5).add(camera.position);
  lucien.place(spot.x - 0.5, spot.z, 0);
  hunter.place(spot.x + 0.5, spot.z, 0);
  cinematic.render('scene', 3);
  for (const object of hidden) object.visible = false;
  await Promise.race([compiled, new Promise(resolve => setTimeout(resolve, 4000))]);
  // Their textures are uploaded on first draw too; do it now rather than mid-scene.
  for (const object of [lucien.group, hunter.group, arms.group]) object.traverse(o => {
    for (const material of [o.material ?? []].flat()) for (const value of Object.values(material)) if (value?.isTexture) renderer.initTexture(value);
  });
  $('.loading-panel').classList.add('loaded');
  setTimeout(() => { $('.loading-panel').hidden = true; }, reducedMotion ? 0 : 700);
  stage.dataset.ready = 'true';
  stage.dataset.audioReady = String(audioComplete);
  if (audioComplete || reviewMode) $('#enter-memory').disabled = false;
  else { $('#loading-detail').textContent = '声音素材正在准备'; console.warn('Speech generation has not completed'); }
  $('#resume-checkpoint').disabled = $('#enter-memory').disabled;
  setState('ready');
  if (reviewMode) {
    // Development handle for browser checks; review builds only.
    window.__bloodbound = { player, director, arms, lucien, hunter, camera, flow, interact, scene, renderer, sound, pendant, chapel, autopilot };
    $('.review-controls').hidden = false;
    document.querySelectorAll('[data-review-segment]').forEach(button => button.addEventListener('click', safe(() => start(button.dataset.reviewSegment))));
  }

  function loop(now) {
    if (disposed) return;
    requestAnimationFrame(loop);
    if (externalHandoff) return;
    if (document.hidden) { lastFrame = now; return; }
    const elapsedFrame = Math.max(0,(now - (lastFrame || now)) / 1000);
    const dt = Math.min(elapsedFrame, 0.1);
    lastFrame = now;
    if (elapsedFrame > 0.25) stalled = true;
    if (exitAnimation) {
      // An even walk along the path, easing in and out, the view turning from where you looked to the way ahead; then
      // both hands on the end door, which swings slowly away, and the step through into the warm light beyond it.
      const walked = (now - exitAnimation.at) / exitAnimation.length;
      const t = Math.min(1, walked), k = t * t * (3 - 2 * t);
      const curve = exitAnimation.curve;
      runTime += dt;
      if (walked < 1) {
        camera.position.copy(curve.getPointAt(k));
        const ahead = k < .97 ? curve.getPointAt(Math.min(1, k + .08)) : camera.position.clone().add(new THREE.Vector3(1, 0, 0));
        // Matrix4.lookAt has a camera's convention, looking down -z.
        const look = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(camera.position, ahead, camera.up));
        // Turning from him unhurriedly, over the first 1.8 s.
        const turn = Math.min(1, (now - exitAnimation.at) / 1800);
        camera.quaternion.slerpQuaternions(exitAnimation.quaternion, look, turn * turn * (3 - 2 * turn));
      } else {
        const push = (now - exitAnimation.at - exitAnimation.length) / 1000;
        const ease = (from, length) => { const u = Math.min(1, Math.max(0, (push - from) / length)); return u * u * (3 - 2 * u); };
        if (!exitAnimation.stand) {
          exitAnimation.stand = camera.position.clone();
          exitAnimation.quaternion = camera.quaternion.clone();
          arms.set('push', { speed: 4.5 });
        }
        if (push > .6) openEnd(2.8);
        if (push > 2.1 && arms.pose === 'push') arms.set('rest', { speed: 2.2 });
        // Leaning into the door as it gives, then walking on through.
        camera.position.copy(exitAnimation.stand).x += ease(.5, .9) * .12 + ease(1.3, 2.7) * 1.7;
        camera.quaternion.slerpQuaternions(exitAnimation.quaternion, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -Math.PI / 2, 0, 'YXZ')), ease(0, .6));
        arms.update(dt, camera, { yaw: -Math.PI / 2, pitch: 0, floor: 0 });
        // The light beyond the door takes the view as you go through it, then, with the next chapter's card, fades to
        // the dark it is read on.
        if (state === 'handoff') flash *= Math.exp(-dt * 1.4);
        else flash = Math.max(flash, ease(1.25, 2.2));
        if (push > 3.9 && state === 'exiting') { sound.stop(); fade.target = 1; setState('handoff'); }
      }
      chapel.update(runTime);
      atmosphere.update(runTime);
      fade.value += (fade.target - fade.value) * (1 - Math.exp(-dt * (state === 'handoff' ? 1.2 : 7)));
      $('.fade').style.opacity = String(fade.value);
      $('.flash').style.background = '#ffe2bb';
      $('.flash').style.opacity = String(flash);
      cinematic.render('scene', 4);
    } else if (launched) {
      const step = dt;
      {
        if (state === 'playing') {
          runTime += step;
          flow.update(step);
          director.update(step, runTime);
          autopilot.update(step);
          if (inSequence && !outro && flow.segment === 'wear' && director.rite?.release < Infinity) beginOutro();
          if (outro) steerOutro(step);
          if (player.travelled > 1.5 && runTime > tipUntil - 6) tipUntil = Math.min(tipUntil, runTime + 1);
          if (walkingOut && player.pose.x > PASSAGE.maxX - PLAYER_RADIUS - .25) exit();
          if (walkingOut && leaveAt && runTime > leaveAt) { leaveAt = 0; exit(); }
        }
        player.update(state === 'playing' ? step : 0);
      }
      if (shake > 0.01 && !reducedMotion) {
        camera.rotation.x += (Math.random() - 0.5) * 0.035 * shake;
        camera.rotation.z += (Math.random() - 0.5) * 0.025 * shake;
      }
      shake *= Math.exp(-dt * 6);
      director.animate(state === 'playing' ? step : 0, camera);
      interact.update();
      $('.reticle').classList.toggle('active', Boolean(interact.focused));
      chapel.update(runTime);
      atmosphere.update(runTime);
      if (runTime > subtitleUntil) $('.subtitle').hidden = true;
      if (runTime > hintUntil) $('.hint').hidden = true;
      if (runTime > tipUntil) $('.controls-tip').hidden = true;
      sound.duck(!$('.subtitle').hidden);
      fade.value += (fade.target - fade.value) * (1 - Math.exp(-dt * 7));
      flash *= Math.exp(-dt * 5);
      $('.fade').style.opacity = String(fade.value);
      $('.flash').style.opacity = String(flash);
      const close = lucien.group.visible && ['intimacy', 'gift', 'wear'].includes(flow.segment);
      cinematic.render(close ? 'face' : 'scene', close ? Math.max(0.5, lucien.distanceTo(player.pose.x, player.pose.z)) : 4);
    } else {
      // Title screen: the empty nave from the doorway, breathing slightly. In the journey there is no title screen; the
      // memory waits on the first frame of its walk, so the transition reveals the shot that then plays on.
      if (inSequence) player.setPose(START);
      else {
        camera.position.set(Math.sin(now * .00007) * .08, 1.6, START.z + 0.4);
        camera.rotation.set(-0.04, Math.sin(now * .00005) * .03, 0, 'YXZ');
      }
      chapel.update(now / 1000);
      atmosphere.update(now / 1000);
      fade.value += (fade.target - fade.value) * (1 - Math.exp(-dt * 7));
      $('.fade').style.opacity = String(fade.value);
      cinematic.render('scene', inSequence ? 4 : 4.5);
    }
    frames++;
    if (now - fpsStart > 2000) {
      const measured = Math.round(frames * 1000 / (now - fpsStart));
      stage.dataset.fps = String(measured);
      $('#performance-label').textContent = `${measured} FPS`;
      // In the journey a single stall (another memory loading) or the first seconds do not count against the
      // resolution, it never drops below 1, and it climbs back once the frame rate recovers.
      const floor = inSequence ? Math.min(1, fullRatio) : .85;
      const judged = !inSequence || (!stalled && runTime - sequenceStart > 5);
      if (launched && state === 'playing' && judged && measured < 35 && pixelRatio > floor) {
        pixelRatio = Math.max(floor, pixelRatio * .88);
        renderer.setPixelRatio(pixelRatio); renderer.setSize(innerWidth, innerHeight); cinematic.resize();
      } else if (inSequence && launched && judged && measured > 52 && pixelRatio < fullRatio) {
        pixelRatio = Math.min(fullRatio, pixelRatio / .88);
        renderer.setPixelRatio(pixelRatio); renderer.setSize(innerWidth, innerHeight); cinematic.resize();
      }
      stalled = false;
      frames = 0; fpsStart = now;
    }
  }
  requestAnimationFrame(loop);
  disposeScene = () => {
    if (disposed) return;
    disposed = true;
    lifetime.abort();
    player.dispose(); interact.dispose(); lucien.dispose(); hunter.dispose();
    sound.dispose(); chapel.dispose(); pendant.dispose(); cinematic.dispose();
    scene.traverse(object => {
      if (object.isMesh) { object.geometry.dispose(); for (const mat of Array.isArray(object.material) ? object.material : [object.material]) mat.dispose(); }
    });
    environment.dispose(); renderer.dispose(); renderer.forceContextLoss();
    stage.remove();
    delete window.MemoryLaneBloodbound;
  };
  window.MemoryLaneBloodbound = Object.freeze({
    // Both start from the top and forget the checkpoint, like the title screen's enter button.
    enter: () => { flow.clear(); return start(); }, pause, resume, replay: () => { flow.clear(); return start(); }, exit, destroy: disposeScene,
    getState: () => ({
      state, segment: flow.segment, accepted, audioReady: audioComplete,
      pose: { ...player.pose }, focused: interact.focused, held: interact.held,
    }),
    getKeepsake: () => pendant.group,
    getContext: () => ({ renderer, scene, camera, chapter: chapterGroup, keepsake: pendant.group }),
  });
  // The journey has had its gesture already; waking the audio now keeps start() from waiting on it after the transition.
  if(inSequence)sound.unlock().catch(()=>{});
  if(inSequence)installSequence({ready:audioComplete?Promise.resolve():Promise.reject(new Error('吸血鬼音频未就绪')),start:()=>start(),pause,resume,capture:()=>snapshot(renderer.domElement,()=>cinematic.render('scene',4)),dispose:()=>disposeScene()});
  event('ready', { memoryId: 'bloodbound', segments: SEGMENTS.map(s => s.id) });
  addEventListener('pagehide', disposeScene, { once: true });
  console.info('BLOODBOUND ready', { audioComplete, triangles: renderer.info.render.triangles });
}
