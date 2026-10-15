import {JOURNEY,JOURNEY_SECONDS} from './journey-timeline.js';
import {createJourneyEffects} from './journey-effects.js';
import {createJourneySound} from './journey-sound.js';
import {createWorldFracture} from './world-fracture.js';
import {worldWipeAt} from './world-wipe.js';
import './journey.css';

document.title='Memory Lane · 连续回忆';
document.querySelector('#app').innerHTML=`<main class="journey" data-state="loading"><div class="journey-worlds"></div><canvas class="journey-effect" hidden></canvas><canvas class="journey-fracture" hidden></canvas><section class="journey-gate"><small>MEMORY LANE</small><h1>每一件信物，<br>通往一个世界。</h1><p class="journey-status">正在准备年度回忆…</p><button class="journey-start" disabled>准备中</button><a href="/">返回场景选择</a><p class="journey-credit">虚构故事 · 含惊悚、受伤场景 · 建议佩戴耳机<br>播放时无界面，按 Esc 暂停 · 约 ${Math.floor(JOURNEY_SECONDS/60)} 分 ${Math.round(JOURNEY_SECONDS%60)} 秒<br><a href="/assets/bloodbound/credits.html" target="_blank" rel="noopener">吸血鬼素材致谢</a> · <a href="/school" target="_blank" rel="noopener">校园故事</a> · <a href="/apocalypse" target="_blank" rel="noopener">末世与画作来源</a></p></section></main>`;
const root=document.querySelector('.journey'),worlds=root.querySelector('.journey-worlds'),gate=root.querySelector('.journey-gate'),button=root.querySelector('button'),status=root.querySelector('.journey-status');
const fxCanvas=root.querySelector('.journey-effect'),fractureCanvas=root.querySelector('.journey-fracture');
const effects=createJourneyEffects(fxCanvas),fracture=createWorldFracture(fractureCanvas),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const sound=createJourneySound();
const slots=new Map();let index=0,started=false,paused=false,transition=null,frame=0,last=0,disposed=false,busy=false,failed=false,stageComplete=false;
function resize(){effects.resize(innerWidth,innerHeight);fracture.resize(innerWidth,innerHeight,devicePixelRatio);}
addEventListener('resize',resize);resize();
function state(value){root.dataset.state=value;root.dataset.scene=JOURNEY[index].id;}
function fail(error){sound.pause();failed=true;paused=true;slots.get(index)?.api?.pause();state('error');gate.hidden=false;status.textContent=`这段回忆未能继续：${error.message || error}`;button.disabled=false;button.textContent='重新载入';button.onclick=()=>location.reload();console.error(error);}
function load(i){
 if(i>=JOURNEY.length)return Promise.resolve();if(slots.has(i))return slots.get(i).ready;
 const iframe=document.createElement('iframe');iframe.className='journey-world';iframe.title=JOURNEY[i].id;iframe.allow='autoplay';iframe.tabIndex=-1;iframe.setAttribute('aria-hidden','true');
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
 iframe.src=JOURNEY[i].path+'?sequence=1';worlds.append(iframe);slot.ready.catch(fail);return slot.ready;
}
function reveal(slot){for(const s of slots.values())s.iframe.classList.toggle('current',s===slot);}
async function start(){
 if(busy||failed)return;busy=true;button.disabled=true;
 try{await sound.resume();const slot=await load(index);await slot.api.start();started=true;paused=false;gate.hidden=true;reveal(slot);state('playing');void load(index+1);}
 catch(error){fail(error);}finally{busy=false;button.disabled=false;}
}
async function pause(){
 if(!started||paused||failed||root.dataset.state==='complete')return;
 paused=true;await sound.pause();await slots.get(index)?.api.pause();state('paused');gate.hidden=false;status.textContent='回忆停在这里。';button.textContent='继续';button.onclick=resume;button.focus({preventScroll:true});
}
async function resume(){
 if(busy||failed)return;busy=true;
 try{await sound.resume();if(!stageComplete)await slots.get(index)?.api.resume();paused=false;gate.hidden=true;last=performance.now();state(transition?'transition':'playing');}
 catch(error){fail(error);}finally{busy=false;}
}
async function advance(){
 if(busy||transition||failed)return;busy=true;
 try{
  stageComplete=true;const previous=slots.get(index);await previous.api.pause();
  if(index===JOURNEY.length-1){state('complete');return;}
  state('waiting');const next=await load(index+1);if(disposed)return;
  const a=previous.api.capture(),b=next.api.capture(),stage=JOURNEY[index];
  effects.capture(a,b,stage.transition,reduced);fracture.capture(a,b);
  sound.play(stage.transition,stage.transitionSeconds);
  transition={elapsed:0,duration:stage.transitionSeconds*1000,kind:stage.transition,previous,next};
  fxCanvas.hidden=false;effects.draw(0);last=performance.now();state(paused?'paused':'transition');
 }catch(error){fail(error);}finally{busy=false;}
}
async function finishTransition(){
 sound.stop();const old=transition;transition=null;index++;stageComplete=false;reveal(old.next);fxCanvas.hidden=fractureCanvas.hidden=true;fracture.clear();
 old.previous.api.dispose?.();old.previous.iframe.remove();slots.delete(index-1);
 try{await old.next.api.start();if(paused)await old.next.api.pause();state(paused?'paused':'playing');void load(index+1);}catch(error){fail(error);}
}
function tick(now){
 if(disposed)return;
 if(transition&&!paused&&!document.hidden){
  transition.elapsed+=Math.max(0,now-last);const {elapsed,duration,kind}=transition,p=Math.min(1,elapsed/duration);
  if(kind==='fracture'&&!reduced){effects.draw(p>=1?1:0);fracture.draw(worldWipeAt(elapsed),elapsed);}else effects.draw(p);
  if(p>=1)void finishTransition();
 }
 last=now;frame=requestAnimationFrame(tick);
}
addEventListener('message',event=>{
 if(event.origin!==location.origin||event.data?.channel!=='memory-lane-sequence')return;
 const entry=[...slots.entries()].find(([,slot])=>slot.iframe.contentWindow===event.source);if(!entry)return;
 if(event.data.type==='error')fail(new Error(event.data.message));
 if(entry[0]===index&&event.data.type==='done'&&started)void advance();
 if(event.data.type==='pause')void(paused?resume():pause());
});
addEventListener('keydown',event=>{if(event.code==='Escape'){event.preventDefault();void(paused?resume():pause());}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)void pause();});
button.onclick=start;
// Every scene loads before the gesture. The worlds share one main thread, and loading one stalls it for seconds, which
// would freeze whichever memory is playing; scenes waiting their turn draw only a few frames a second (sequence-bridge.js).
Promise.all(JOURNEY.map((_,i)=>load(i))).then(()=>{if(failed)return;reveal(slots.get(0));state('ready');status.textContent='首页弹窗 → 回忆小屋 → 三段故事 → 星光舞台';button.disabled=false;button.textContent='播放年度回忆演示';}).catch(fail);
frame=requestAnimationFrame(tick);
function dispose(){sound.dispose();disposed=true;cancelAnimationFrame(frame);for(const slot of slots.values()){slot.api?.dispose?.();slot.iframe.remove();}effects.dispose();fracture.dispose();}
addEventListener('pagehide',dispose,{once:true});if(import.meta.hot)import.meta.hot.dispose(dispose);
