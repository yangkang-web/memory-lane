import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { createStage } from './stage.js';
import { createEmochiRig } from './emochi-rig.js';
import { createProps, MEMORIES } from './props.js';
import { createShow, DURATION, SUBTITLES, ORB_TIMES } from './show.js';
import { renderScore, createPlayer } from './music.js';
import { clamp } from './tracks.js';
import { inSequence, installSequence, sequenceEvent, snapshot } from '../sequence-bridge.js';
import './style.css';

const params = new URLSearchParams(location.search);
const REVIEW = params.has('review');
const START_AT = !inSequence && params.has('t') ? clamp(Number(params.get('t')) || 0, 0, DURATION) : null;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const app = document.querySelector('#app');
app.innerHTML = `
  <div class="cc-stage" aria-hidden="true"></div>
  <div class="cc-labels" aria-hidden="true">${MEMORIES.map(m => `<span class="cc-label" style="--tint:${m.color}">${m.title}<small>${m.en}</small></span>`).join('')}</div>
  <div class="cc-title" aria-hidden="true"><span class="zh">谢谢观看</span><span class="en">Thank you for watching</span></div>
  <div class="cc-subtitles" aria-live="polite">${SUBTITLES.map(s => `<p class="cc-line"><span class="zh">${s.zh}</span><span class="en">${s.en}</span></p>`).join('')}</div>
  <section class="cc-end" aria-hidden="true" inert>
    <h2>Emochi</h2>
    <p class="cc-thanks"><span class="zh">我们一起拼过的时光，有了模样。</span><span class="en">Everything we fought through together has taken shape.</span></p>
    <p class="cc-thanks"><span class="zh">我们一起期待的未来，正在开始。</span><span class="en">The future we’ve been hoping for is just beginning.</span></p>
    <button class="cc-button cc-replay-big" type="button">再看一次</button>
  </section>
  <section class="cc-intro">
    <div class="cc-intro-inner">
      <p class="cc-kicker">Emochi · 终章</p>
      <h1>谢幕</h1>
      <p class="cc-sub">Curtain Call</p>
      <button class="cc-button cc-start" type="button" disabled><span class="cc-start-label">正在搭建舞台</span><span class="cc-meter"><i></i></span></button>
      <p class="cc-hint">约 30 秒 · 建议打开声音 · 空格暂停，← → 快退快进<br>About 30 s · sound on · Space to pause, ← → to skip</p>
      <p class="cc-provenance">Emochi 依据 white-character.blend 重建；音乐为本地合成。</p>
    </div>
  </section>
  <nav class="cc-controls" aria-label="播放控制">
    <button class="cc-icon cc-play" type="button" aria-label="暂停"></button>
    <span class="cc-time">0:00 / 0:30</span>
    <div class="cc-track" role="slider" tabindex="0" aria-label="进度" aria-valuemin="0" aria-valuemax="30" aria-valuenow="0">
      <div class="cc-track-fill"></div><div class="cc-track-head"></div>
    </div>
    <button class="cc-icon cc-cc on" type="button" aria-label="字幕" aria-pressed="true">CC</button>
    <button class="cc-icon cc-mute" type="button" aria-label="静音" aria-pressed="false"></button>
    <button class="cc-icon cc-again" type="button" aria-label="从头播放"></button>
  </nav>
  <div class="cc-fps" hidden></div>`;

const $ = selector => app.querySelector(selector);
const ICONS = {
  play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z"/></svg>',
  sound: '<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 8.8a4.5 4.5 0 0 1 0 6.4M18 6.3a8 8 0 0 1 0 11.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  muted: '<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9.5l5 5M20.5 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  again: '<svg viewBox="0 0 24 24"><path d="M5.5 12a6.5 6.5 0 1 0 2-4.7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M4.5 4.5v4.5H9z"/></svg>',
};
$('.cc-again').innerHTML = ICONS.again;
$('.cc-mute').innerHTML = ICONS.sound;
$('.cc-play').innerHTML = ICONS.pause;

// —— Renderer ——
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  if (!renderer.capabilities.isWebGL2) throw new Error('WebGL2 unavailable');
} catch (error) {
  app.innerHTML = '<section class="cc-fallback"><h1>谢幕</h1><p>这个浏览器暂时无法运行 WebGL2，所以舞台没能亮起来。换用最新版 Chrome、Edge 或 Safari 再试一次。</p></section>';
  throw error;
}
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
$('.cc-stage').append(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#050307');
scene.fog = new THREE.FogExp2('#07040a', 0.018);
const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);

const stage = createStage(renderer);
scene.add(stage.group);
scene.environment = stage.environment.texture;
scene.environmentIntensity = 0.7;
const rig = createEmochiRig();
scene.add(rig.root);
const show = createShow();

const composerTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, composerTarget);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.42, 0.5, 0.92);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const finish = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAspect: { value: 1 }, uGrain: { value: 0.03 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uTime, uAspect, uGrain; varying vec2 vUv;
    float rand(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec2 d = (vUv - 0.5) * vec2(uAspect, 1.0);
      color.rgb *= mix(1.0, 0.42, smoothstep(0.35, 1.05, length(d)));
      color.rgb += (rand(vUv * 913.0 + fract(uTime * 7.13)) - 0.5) * uGrain;
      gl_FragColor = color;
    }`,
});
composer.addPass(finish);

// —— Sizing, with a frame-time governor on the pixel ratio ——
let pixelCap = Math.min(window.devicePixelRatio || 1, 1.75);
let baseFov = 36;
function resize() {
  const width = window.innerWidth, height = window.innerHeight;
  renderer.setPixelRatio(pixelCap);
  renderer.setSize(width, height);
  composer.setPixelRatio(pixelCap);
  composer.setSize(width, height);
  bloom.resolution.set(width * pixelCap, height * pixelCap);
  camera.aspect = width / height;
  finish.uniforms.uAspect.value = camera.aspect;
  stage.setPixelRatio(pixelCap * height / 900);
  props?.setPixelRatio(pixelCap * height / 900);
  updateFov();
}
function updateFov() {
  // Keep the stage's width in view on narrow screens by widening the vertical field.
  const minAspect = camera.aspect < 1 ? 0.82 : 1.5;
  let fov = baseFov;
  if (camera.aspect < minAspect) fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(baseFov) / 2) * minAspect / camera.aspect));
  camera.fov = Math.min(fov, 75);
  // On short landscape screens the captions sit over the body: shift the picture up to clear them.
  const width = window.innerWidth, height = window.innerHeight;
  if (height < 520 && camera.aspect > 1) camera.setViewOffset(width, height, 0, height * 0.2, width, height);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}
// Samples for as long as the show plays and only ever steps down, so a busy moment later on can still be caught.
let frameTimes = [];
function govern(delta) {
  if (!playing || document.hidden || delta > 250) return;
  frameTimes.push(delta);
  if (frameTimes.length < 90) return;
  const average = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
  frameTimes = [];
  if (average > 21 && pixelCap > 1) { pixelCap = Math.max(1, pixelCap - 0.25); resize(); }
}

// —— Loading ——
const startButton = $('.cc-start');
const meter = $('.cc-meter i');
let loaded = 0;
const step = value => { loaded += value; meter.style.transform = `scaleX(${Math.min(1, loaded)})`; return value; };
const loader = new GLTFLoader();
const loadModel = url => loader.loadAsync(url).then(gltf => { step(0.25); return gltf.scene; });
let props = null, player = null, score = null;

async function load() {
  const [questionMark, buffer] = await Promise.all([
    loadModel('/assets/curtain-call/question-mark.glb'),
    renderScore().catch(() => null).then(result => { step(0.3); return result; }),
  ]);
  score = buffer;
  props = createProps({ questionMark });
  scene.add(props.group);
  resize();
  // Compile and warm up every look of the show now, so nothing stalls the first time it appears.
  await renderer.compileAsync(scene, camera).catch(() => {});
  for (const t of [3.6, 6.4, 10.6, 15.8, 18.4, 19.4, 21.6, 28.5]) drawAt(t);
  // Opening an audio device blocks for a few hundred milliseconds; pay that behind the loading bar. The context starts
  // suspended and the first click resumes it.
  ensurePlayer();
  step(0.2);
}

// —— Show clock: wall clock while playing, re-synced on every play and seek ——
let time = START_AT ?? 0, playing = false, started = false, startPerf = 0, startTime = 0, muted = false;
const now = () => playing ? Math.min(DURATION, startTime + (performance.now() - startPerf) / 1000) : time;
function play() {
  if (time >= DURATION - 0.05) time = 0;
  startTime = time;
  startPerf = performance.now();
  playing = true;
  ensurePlayer();
  player?.start(time);
  syncControls();
}
function ensurePlayer() {
  if (!player && score) { player = createPlayer(score); player?.setMuted(muted); }
}
function pause() {
  time = now();
  playing = false;
  player?.stop();
  syncControls();
}
function seek(value) {
  const wasPlaying = playing;
  if (playing) pause();
  time = clamp(value, 0, DURATION);
  // Seeking to the end while playing lands on the end card instead of wrapping round to the start.
  if (wasPlaying && time < DURATION - 0.05) play(); else drawAt(time);
  syncControls();
}
function toggle() { if (playing) pause(); else play(); }
function setMuted(value) {
  muted = value;
  player?.setMuted(muted);
  $('.cc-mute').innerHTML = muted ? ICONS.muted : ICONS.sound;
  $('.cc-mute').setAttribute('aria-pressed', String(muted));
  $('.cc-mute').setAttribute('aria-label', muted ? '打开声音' : '静音');
}

function begin() {
  if (started) return;
  started = true;
  app.classList.add('is-started');
  play();
}

// —— Poking Emochi: a giggle hop layered over the choreography ——
let reaction = -10;
const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(), parallax = new THREE.Vector2(), parallaxGoal = new THREE.Vector2();
function emochiUnder(event) {
  pointer.set(event.clientX / window.innerWidth * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const t = now();
  return t > 4.2 && t < 27.2 && raycaster.intersectObjects(rig.pickables, false).length > 0;
}
renderer.domElement.addEventListener('pointermove', event => {
  parallaxGoal.set(event.clientX / window.innerWidth - 0.5, event.clientY / window.innerHeight - 0.5);
  renderer.domElement.style.cursor = started && emochiUnder(event) ? 'pointer' : '';
});
renderer.domElement.addEventListener('click', event => {
  if (!started) return;
  if (emochiUnder(event)) {
    if (performance.now() - reaction > 650) { reaction = performance.now(); player?.giggle(); }
  } else toggle();
});
function react(frame) {
  const u = (performance.now() - reaction) / 650;
  if (u < 0 || u > 1) return;
  const s = Math.sin(Math.PI * u);
  frame.pose.bob += 0.14 * s;
  frame.pose.squash += 0.08 * Math.sin(Math.PI * 2 * u) * (1 - u);
  frame.pose.happy = Math.max(frame.pose.happy, s * 1.4 > 1 ? 1 : s * 1.4);
  frame.pose.blush = Math.max(frame.pose.blush, s);
  frame.pose.smile = Math.max(frame.pose.smile, s);
}

// —— Drawing ——
const labels = [...app.querySelectorAll('.cc-label')];
const lines = [...app.querySelectorAll('.cc-line')];
const endCard = $('.cc-end');
const titleCard = $('.cc-title');
const projected = new THREE.Vector3();
let currentLine = -2;
let endedAt = 0;
function drawAt(t, wall = 0) {
  const frame = show.evaluate(t);
  react(frame);
  rig.apply(frame.pose, frame.place);
  const state = show.carry(t, rig);
  // Once the show has ended, let the confetti keep drifting behind the title card on the wall clock.
  if (t >= DURATION && endedAt) state.time = DURATION + (performance.now() - endedAt) / 1000;
  props?.update(state);
  stage.update(frame.stage);
  const heartLight = stage.lights.heart;
  heartLight.position.copy(state.heart.position);
  heartLight.intensity = 1.1 * state.heart.glow * Math.min(1, state.heart.scale / 0.3);

  // Camera with a little handheld breathing and pointer parallax.
  camera.position.copy(frame.camera.position);
  const calm = reducedMotion.matches ? 0 : 1;
  parallax.lerp(parallaxGoal, 0.04);
  camera.position.x += calm * (0.025 * Math.sin(wall * 0.37) + 0.012 * Math.sin(wall * 0.91) + parallax.x * 0.22);
  camera.position.y += calm * (0.018 * Math.sin(wall * 0.53 + 1) - parallax.y * 0.1);
  camera.lookAt(frame.camera.target);
  if (frame.camera.fov !== baseFov) { baseFov = frame.camera.fov; updateFov(); }
  renderer.toneMappingExposure = frame.camera.exposure;
  finish.uniforms.uTime.value = wall;
  composer.render();

  // Memory labels under their orbs.
  for (const [i, label] of labels.entries()) {
    const visible = frame.labels[i];
    label.style.opacity = visible.toFixed(3);
    if (visible > 0) {
      projected.copy(state.orbs[i].position).project(camera);
      // Kept inside the screen edges on narrow viewports.
      const half = label.offsetWidth / 2 + 8;
      const x = clamp((projected.x * 0.5 + 0.5) * window.innerWidth, half, window.innerWidth - half);
      label.style.transform = `translate(-50%, 0) translate(${x}px, ${(-projected.y * 0.5 + 0.5) * window.innerHeight + 34}px)`;
    }
  }
  if (frame.subtitle !== currentLine) {
    lines[currentLine]?.classList.remove('on');
    lines[frame.subtitle]?.classList.add('on');
    currentLine = frame.subtitle;
  }
  titleCard.style.opacity = frame.title.toFixed(3);
  endCard.style.opacity = frame.endCard.toFixed(3);
  const live = frame.endCard > 0.5;
  if (live !== endCard.classList.contains('is-live')) {
    endCard.classList.toggle('is-live', live);
    endCard.setAttribute('aria-hidden', String(!live));
    endCard.inert = !live;
    if (!live && endCard.contains(document.activeElement)) document.activeElement.blur();
  }
  return frame;
}

// —— Controls ——
const controls = $('.cc-controls'), track = $('.cc-track'), fill = $('.cc-track-fill'), head = $('.cc-track-head'), clock = $('.cc-time');
const format = seconds => `0:${String(Math.floor(seconds)).padStart(2, '0')}`;
for (const t of ORB_TIMES.concat([2.5, 15, 18.75, 21.25, 22.6, 28.2])) {
  const tick = document.createElement('i');
  tick.className = 'cc-tick';
  tick.style.left = `${t / DURATION * 100}%`;
  track.append(tick);
}
function syncControls() {
  const playButton = $('.cc-play');
  playButton.innerHTML = playing ? ICONS.pause : ICONS.play;
  playButton.setAttribute('aria-label', playing ? '暂停' : '播放');
  app.classList.toggle('is-paused', !playing);
  wake();
}
let idleTimer = 0;
function wake() {
  app.classList.add('show-controls');
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (!playing || scrubbing || controls.contains(document.activeElement) || controls.matches(':hover')) return wake();
    app.classList.remove('show-controls');
  }, 2400);
}
window.addEventListener('pointermove', () => { if (started) wake(); });
controls.addEventListener('focusin', () => { if (started) wake(); });
// Space and Enter belong to the show, not to whichever button was clicked last.
// Capture phase: the handlers below swap icons, which detaches the original click target.
app.addEventListener('click', event => { if (event.detail > 0) event.target.closest?.('button')?.blur(); }, true);
$('.cc-play').addEventListener('click', toggle);
$('.cc-again').addEventListener('click', () => { seek(0); if (!playing) play(); });
$('.cc-replay-big').addEventListener('click', () => { seek(0); if (!playing) play(); });
$('.cc-mute').addEventListener('click', () => setMuted(!muted));
$('.cc-cc').addEventListener('click', event => {
  const on = app.classList.toggle('no-captions') === false;
  event.currentTarget.classList.toggle('on', on);
  event.currentTarget.setAttribute('aria-pressed', String(on));
});
const SKIP = 5;
let scrubbing = false, resumeAfterScrub = false;
const scrubTo = event => {
  const box = track.getBoundingClientRect();
  time = clamp((event.clientX - box.left) / box.width, 0, 1) * DURATION;
  drawAt(time, performance.now() / 1000);
};
track.addEventListener('pointerdown', event => {
  scrubbing = true;
  resumeAfterScrub = playing;
  if (playing) pause();
  track.setPointerCapture(event.pointerId);
  scrubTo(event);
});
track.addEventListener('pointermove', event => { if (scrubbing) scrubTo(event); });
const endScrub = () => { if (!scrubbing) return; scrubbing = false; if (resumeAfterScrub && time < DURATION - 0.05) play(); else syncControls(); };
track.addEventListener('pointerup', endScrub);
track.addEventListener('pointercancel', endScrub);
track.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); event.stopPropagation(); seek(now() + (event.key === 'ArrowLeft' ? -SKIP : SKIP)); }
});
window.addEventListener('keydown', event => {
  if (inSequence) return;
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (!started) {
    if ((event.key === 'Enter' || event.key === ' ') && !startButton.disabled) { event.preventDefault(); begin(); }
    return;
  }
  if (event.key === ' ' || event.key === 'k') {
    // Mouse clicks blur their button, so a button only has focus here when it was reached by keyboard: let it act.
    if (event.target.closest?.('button')) return;
    event.preventDefault();
    if (!event.repeat) toggle();
  }
  else if (event.key === 'ArrowLeft') seek(now() - SKIP);
  else if (event.key === 'ArrowRight') seek(now() + SKIP);
  else if (event.key === 'r' || event.key === 'R') { seek(0); if (!playing) play(); }
  else if (event.key === 'm' || event.key === 'M') setMuted(!muted);
  else if (event.key === 'c' || event.key === 'C') $('.cc-cc').click();
  else return;
  wake();
});
document.addEventListener('visibilitychange', () => { if (document.hidden && playing) pause(); });
window.addEventListener('resize', resize);
startButton.addEventListener('click', begin);

// —— Loop ——
const fps = $('.cc-fps');
let last = performance.now(), fpsFrames = 0, fpsSince = last;
function loop() {
  if (disposed) return;
  requestAnimationFrame(loop);
  const wall = performance.now();
  const delta = wall - last;
  last = wall;
  if (!props) return;
  let t = now();
  if (playing && t >= DURATION) { time = DURATION; playing = false; endedAt = performance.now(); player?.stop(); syncControls(); t = DURATION; sequenceEvent('done'); }
  if (t < DURATION) endedAt = 0;
  drawAt(t, wall / 1000);
  govern(delta);
  const progress = t / DURATION;
  fill.style.transform = `scaleX(${progress})`;
  head.style.left = `${progress * 100}%`;
  track.setAttribute('aria-valuenow', t.toFixed(1));
  clock.textContent = `${format(t)} / ${format(DURATION)}`;
  if (REVIEW) {
    fpsFrames++;
    if (wall - fpsSince > 500) { fps.textContent = `${Math.round(fpsFrames * 1000 / (wall - fpsSince))} fps · dpr ${pixelCap.toFixed(2)} · t ${t.toFixed(2)}`; fpsFrames = 0; fpsSince = wall; }
  }
}

resize();
const loading = load();
// In the journey the parent page starts, pauses and captures the show; its own intro and controls stay hidden.
let disposed = false;
installSequence({
  ready: loading,
  start() { time = 0; started = true; app.classList.add('is-started'); play(); },
  pause() { if (playing) pause(); },
  resume() { if (started && !playing && time < DURATION) play(); },
  capture: () => snapshot(renderer.domElement, () => drawAt(now(), performance.now() / 1000)),
  dispose() { disposed = true; player?.stop(); player?.context?.close?.(); composer.dispose(); renderer.dispose(); renderer.forceContextLoss(); },
});
loading.then(() => {
  startButton.disabled = false;
  $('.cc-start-label').textContent = '开始谢幕';
  app.classList.add('is-ready');
  if (START_AT !== null) {
    started = true;
    app.classList.add('is-started');
    syncControls();
  }
  requestAnimationFrame(loop);
}).catch(error => {
  console.error(error);
  $('.cc-start-label').textContent = '舞台没能搭好，请刷新重试';
});

if (REVIEW) {
  fps.hidden = false;
  window.__curtain = { seek, play, pause, get time() { return now(); }, get playing() { return playing; }, renderer, scene, camera, composer, bloom, stage, get props() { return props; }, drawAt, get audio() { return score ? score.duration : 0; }, get audioState() { return player?.context.state; } };
}
