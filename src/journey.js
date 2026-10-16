import {JOURNEY,JOURNEY_SECONDS} from './journey-timeline.js';
import {createJourneyEffects} from './journey-effects.js';
import {createJourneySound} from './journey-sound.js';
import {createWorldFracture} from './world-fracture.js';
import {worldWipeAt} from './world-wipe.js';
import './journey.css';

// `?play=1` is the playable journey: the same memories in the same order, walked and touched by the visitor.
const play=new URLSearchParams(location.search).get('play')==='1';
document.title=play?'Memory Lane · 亲自走一遍':'Memory Lane · 连续回忆';
document.querySelector('#app').innerHTML=`<main class="journey" data-state="loading" data-mode="${play?'play':'film'}"><div class="journey-worlds"></div><canvas class="journey-effect" hidden></canvas><canvas class="journey-fracture" hidden></canvas><div class="journey-card" role="status" aria-live="polite"><p class="journey-card-en"><em></em><span></span></p><p class="journey-card-zh" lang="zh-CN"><span></span><span></span></p></div><p class="journey-hint" role="status" aria-live="polite"></p><button class="journey-touch" type="button" hidden><small>下一件信物</small><strong></strong><span></span></button><button class="journey-skip" type="button" hidden>跳过这段 →</button><section class="journey-gate"><small>MEMORY LANE</small><h1>每一件信物，<br>通往一个世界。</h1><p class="journey-status">正在准备年度回忆…</p><button class="journey-start" disabled>准备中</button><a href="/">返回场景选择</a><p class="journey-credit">虚构故事 · 含惊悚、受伤场景 · 建议佩戴耳机<br>${play?'用鼠标与键盘亲自走过每一段回忆 · 按 Esc 暂停 · 请使用电脑浏览器':`播放时无界面，按 Esc 暂停 · 约 ${Math.floor(JOURNEY_SECONDS/60)} 分 ${Math.round(JOURNEY_SECONDS%60)} 秒`}<br><a href="/assets/bloodbound/credits.html" target="_blank" rel="noopener">吸血鬼素材致谢</a> · <a href="/school" target="_blank" rel="noopener">校园故事</a> · <a href="/apocalypse" target="_blank" rel="noopener">末世与画作来源</a></p></section></main>`;
const root=document.querySelector('.journey'),worlds=root.querySelector('.journey-worlds'),gate=root.querySelector('.journey-gate'),button=root.querySelector('.journey-start'),status=root.querySelector('.journey-status');
const fxCanvas=root.querySelector('.journey-effect'),fractureCanvas=root.querySelector('.journey-fracture');
const effects=createJourneyEffects(fxCanvas),fracture=createWorldFracture(fractureCanvas),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const sound=createJourneySound();
const card=root.querySelector('.journey-card');let cardLinger=0;
const hintEl=root.querySelector('.journey-hint'),touch=root.querySelector('.journey-touch'),skip=root.querySelector('.journey-skip');let hintTimer=0;
function showHint(text){clearTimeout(hintTimer);hintEl.textContent=text||'';hintEl.classList.toggle('shown',Boolean(text));if(text)hintTimer=setTimeout(()=>hintEl.classList.remove('shown'),6500);}
// Hands the keyboard and mouse to the memory on screen.
function focusWorld(){if(!play)return;const iframe=slots.get(index)?.iframe;iframe?.focus({preventScroll:true});iframe?.contentWindow?.focus();}
function offerTouch(spec){touch.querySelector('strong').textContent=spec.name;touch.querySelector('span').textContent=spec.action+' →';touch.hidden=false;skip.hidden=true;touch.focus({preventScroll:true});}
function showCard(spec){const [a,b]=card.querySelectorAll('.journey-card-en>*'),[c,d]=card.querySelectorAll('.journey-card-zh>*');a.textContent=spec.en[0];b.textContent=spec.en[1];c.textContent=spec.zh[0];d.textContent=spec.zh[1];card.dataset.kind=spec.kind;card.classList.add('shown');}
const slots=new Map();let index=0,started=false,paused=false,transition=null,frame=0,last=0,disposed=false,busy=false,failed=false,stageComplete=false;
function resize(){effects.resize(innerWidth,innerHeight);fracture.resize(innerWidth,innerHeight,devicePixelRatio);}
addEventListener('resize',resize);resize();
function state(value){root.dataset.state=value;root.dataset.scene=JOURNEY[index].id;skip.hidden=!play||value!=='playing'||!touch.hidden;}
function fail(error){sound.pause();failed=true;paused=true;slots.get(index)?.api?.pause();state('error');gate.hidden=false;status.textContent=`这段回忆未能继续：${error.message || error}`;button.disabled=false;button.textContent='重新载入';button.onclick=()=>location.reload();console.error(error);}
function load(i){
 if(i>=JOURNEY.length)return Promise.resolve();if(slots.has(i))return slots.get(i).ready;
 const iframe=document.createElement('iframe');iframe.className='journey-world';iframe.title=JOURNEY[i].id;iframe.allow='autoplay';if(!play){iframe.tabIndex=-1;iframe.setAttribute('aria-hidden','true');}
 const slot={iframe,api:null,ready:null};slots.set(i,slot);
 slot.ready=new Promise((resolve,reject)=>{
  const deadline=setTimeout(()=>reject(new Error(`${JOURNEY[i].id} 资源载入超时，请重试。`)),180000);
  iframe.addEventListener('load',async()=>{try{
   // The bridge is installed by the route's own module, which may load after iframe.load.
   for(let attempt=0;attempt<1200&&!disposed;attempt++){
    const api=iframe.contentWindow.memorySequenceScene;
    if(api){slot.api=api;await api.ready;clearTimeout(deadline);resolve(slot);return;}
    await new Promise(r=>setTimeout(r,100));
   }
   throw new Error(`${JOURNEY[i].id} 未提供播放入口。`);
  }catch(error){clearTimeout(deadline);reject(error);}}, {once:true});
  iframe.addEventListener('error',()=>{clearTimeout(deadline);reject(new Error('场景加载失败'));},{once:true});
 });
 iframe.src=JOURNEY[i].path+'?sequence=1'+(play?'&play=1':'');worlds.append(iframe);slot.ready.catch(fail);return slot.ready;
}
function reveal(slot){for(const s of slots.values())s.iframe.classList.toggle('current',s===slot);}
async function start(){
 if(busy||failed)return;busy=true;button.disabled=true;
 try{await sound.resume();const slot=await load(index);await slot.api.start();started=true;paused=false;gate.hidden=true;reveal(slot);state('playing');focusWorld();showHint(play&&JOURNEY[index].hint);void load(index+1);}
 catch(error){fail(error);}finally{busy=false;button.disabled=false;}
}
async function pause(){
 if(!started||paused||failed||root.dataset.state==='complete')return;
 paused=true;await sound.pause();await slots.get(index)?.api.pause();state('paused');gate.hidden=false;status.textContent='回忆停在这里。';button.textContent='继续';button.onclick=resume;button.focus({preventScroll:true});
}
async function resume(){
 if(busy||failed)return;busy=true;
 try{await sound.resume();if(!stageComplete)await slots.get(index)?.api.resume();paused=false;gate.hidden=true;last=performance.now();state(transition?'transition':'playing');if(touch.hidden)focusWorld();else touch.focus({preventScroll:true});}
 catch(error){fail(error);}finally{busy=false;}
}
async function advance(){
 if(busy||transition||failed)return;busy=true;
 try{
  stageComplete=true;const previous=slots.get(index);await previous.api.pause();
  touch.hidden=true;showHint('');
  if(index===JOURNEY.length-1){state('complete');if(play)finish();return;}
  state('waiting');const next=await load(index+1);if(disposed)return;
  const a=previous.api.capture(),b=next.api.capture(),stage=JOURNEY[index];
  effects.capture(a,b,stage.transition,reduced);fracture.capture(a,b);
  sound.play(stage.transition,stage.transitionSeconds);
  transition={elapsed:0,duration:stage.transitionSeconds*1000,kind:stage.transition,card:stage.card,previous,next};
  fxCanvas.hidden=false;effects.draw(0);last=performance.now();state(paused?'paused':'transition');
 }catch(error){fail(error);}finally{busy=false;}
}
async function finishTransition(){
 sound.stop();const old=transition;transition=null;if(old.card&&card.classList.contains('shown'))cardLinger=old.card.until*1000-old.duration;index++;stageComplete=false;reveal(old.next);fxCanvas.hidden=fractureCanvas.hidden=true;fracture.clear();
 old.previous.api.dispose?.();old.previous.iframe.remove();slots.delete(index-1);
 try{await old.next.api.start();if(paused)await old.next.api.pause();state(paused?'paused':'playing');if(!paused)focusWorld();showHint(play&&JOURNEY[index].hint);void load(index+1);}catch(error){fail(error);}
}
function tick(now){
 if(disposed)return;
 if(transition&&!paused&&!document.hidden){
  transition.elapsed+=Math.max(0,now-last);const {elapsed,duration,kind}=transition,p=Math.min(1,elapsed/duration);
  if(kind==='fracture'&&!reduced){effects.draw(p>=1?1:0);fracture.draw(worldWipeAt(elapsed),elapsed);}else effects.draw(p);
  const spec=transition.card;
  if(spec&&elapsed>=spec.at*1000&&elapsed<spec.until*1000&&!card.classList.contains('shown'))showCard({...spec,kind});
  if(spec&&elapsed>=spec.until*1000)card.classList.remove('shown');
  if(p>=1)void finishTransition();
 }else if(cardLinger>0&&!paused&&!document.hidden&&(cardLinger-=Math.max(0,now-last))<=0)card.classList.remove('shown');
 last=now;frame=requestAnimationFrame(tick);
}
addEventListener('message',event=>{
 if(event.origin!==location.origin||event.data?.channel!=='memory-lane-sequence')return;
 const entry=[...slots.entries()].find(([,slot])=>slot.iframe.contentWindow===event.source);if(!entry)return;
 if(event.data.type==='error')fail(new Error(event.data.message));
 if(entry[0]===index&&event.data.type==='done'&&started&&!transition){if(play&&JOURNEY[index].touch)offerTouch(JOURNEY[index].touch);else void advance();}
 if(event.data.type==='pause')void(paused?resume():pause());
});
addEventListener('keydown',event=>{if(event.code==='Escape'){event.preventDefault();void(paused?resume():pause());}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)void pause();});
button.onclick=start;
touch.onclick=()=>void advance();skip.onclick=()=>void advance();
// The end of the playable journey: the last memory stays behind the invitation to walk it again.
function finish(){gate.hidden=false;status.textContent='谢谢你走完这段回忆。每一件信物，都还在小屋里等你。';button.disabled=false;button.textContent='再走一遍';button.onclick=()=>location.reload();}
// Every scene loads before the gesture. The worlds share one main thread, and loading one stalls it for seconds, which
// would freeze whichever memory is playing; scenes waiting their turn draw only a few frames a second (sequence-bridge.js).
Promise.all(JOURNEY.map((_,i)=>load(i))).then(()=>{if(failed)return;reveal(slots.get(0));state('ready');status.textContent='首页弹窗 → 回忆小屋 → 三段故事 → 星光舞台';button.disabled=false;button.textContent=play?'开始这段旅程':'播放年度回忆演示';}).catch(fail);
frame=requestAnimationFrame(tick);
function dispose(){sound.dispose();disposed=true;cancelAnimationFrame(frame);for(const slot of slots.values()){slot.api?.dispose?.();slot.iframe.remove();}effects.dispose();fracture.dispose();}
addEventListener('pagehide',dispose,{once:true});if(import.meta.hot)import.meta.hot.dispose(dispose);
