import './style.css';
import { world } from './story.js';
import { loadSave, writeSave } from './storage.js';
import { createAmbience } from './audio.js';
import { createWorld } from './scene.js';

const icons = {
  arrow: '<svg viewBox="0 0 24 24"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="m9 5 11 7-11 7Z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>',
  sound: '<svg viewBox="0 0 24 24"><path d="m11 4-5 4H3v8h3l5 4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>',
  mute: '<svg viewBox="0 0 24 24"><path d="m11 4-5 4H3v8h3l5 4Zm5 5 6 6m0-6-6 6"/></svg>',
  bookmark: '<svg viewBox="0 0 24 24"><path d="M6 4h12v17l-6-4-6 4Z"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>',
  leaf: '<svg viewBox="0 0 32 32"><path d="M26 5C8 2 3 13 10 21c7 8 19 0 16-16ZM8 25 23 9M14 18l-1-7m5 3 7 1"/></svg>',
};
const {data:save,available:saveAvailable}=loadSave();
const app=document.querySelector('#app');
app.innerHTML=`
  <canvas id="world" aria-label="可以漫游的黄昏茶会花园" tabindex="0"></canvas>
  <div class="vignette" aria-hidden="true"></div>
  <div id="load" class="loading"><span class="loading-mark">${icons.leaf}</span><p>花园正在醒来</p><small>准备你的回忆之路</small></div>
  <header class="topbar">
    <button id="home" class="brand" aria-label="返回回忆入口">${icons.leaf}<span>回忆之路<small>MEMORY LANE</small></span></button>
    <span class="world-label">CHAPTER VII <i></i> 六点以后的花园</span>
    <div class="top-actions"><button id="source" class="text-button">故事出处</button><button id="sound" class="icon-button" aria-label="关闭环境声音">${icons.sound}</button><button id="settings" class="icon-button" aria-label="画面与操作设置"><svg viewBox="0 0 24 24"><path d="M4 7h16M4 17h16M9 4v6m6 4v6"/></svg></button></div>
  </header>
  <section id="welcome" class="welcome" aria-labelledby="welcome-title">
    <div class="eyebrow"><span></span> A PLACE THE STORY LEFT BEHIND</div>
    <h1 id="welcome-title">六点<span>以后</span><em>After six.</em></h1>
    <p class="welcome-line">时间停了，故事还在。</p>
    <p class="intro">回到那场没有结束的茶会。<br>沿着花园小路，拾起三个留下的瞬间。</p>
    <div class="entry-actions"><button id="enter" class="primary">进入回忆 ${icons.arrow}</button><button id="explore-entry" class="secondary">先在花园走走</button></div>
    <div class="entry-meta"><span>与 帽匠</span><i></i><span>3 段回忆</span><i></i><span>约 90 秒 · 可自由停留</span></div>
    <div id="return-note" class="return-note" hidden></div>
    <div class="sample-note">文学改编样例 · 非真实聊天 <button id="sample-details">了解这段故事 ${icons.arrow}</button></div>
  </section>
  <aside id="welcome-chapters" class="welcome-chapters" aria-label="世界中的三个瞬间"><span class="tiny-label">INSIDE THIS MEMORY</span>${world.nodes.map(n=>`<div class="welcome-chapter"><span>${n.number}</span><div>${n.title}<small>${n.label}</small></div></div>`).join('')}</aside>
  <footer id="welcome-footer" class="welcome-footer"><span>把经历，留在一个可以回来的地方。</span><span>THE TEA GARDEN <span class="dot"></span> 18:00</span></footer>
  <section id="hud" hidden>
    <div class="mode-badge"><span class="live-dot"></span><span id="mode-text">回忆漫游</span><small id="place-label">花园入口</small></div>
    <nav id="chapters" class="chapter-nav" aria-label="回忆章节">${world.nodes.map((n,i)=>`<button data-chapter="${i}" aria-label="前往回忆：${n.title}"><span>${n.number}</span><strong>${n.title}</strong><small>${n.place}</small><i class="chapter-dot"></i></button>`).join('')}</nav>
    <div id="route-caption" class="route-caption"><span>沿着小路，回到那个下午。</span></div>
    <button id="nearby" class="nearby" hidden>${icons.bookmark}<span></span><kbd>E</kbd></button>
    <div class="bottom-bar"><span id="saved" class="save-status">${saveAvailable?'本地回忆已准备':'本次体验暂无法保存'}</span><div class="transport"><button id="tour" class="transport-button">${icons.pause}<span>暂停漫游</span></button><span class="transport-divider"></span><button id="free" class="text-button">自由探索</button></div><span class="movement-help"><kbd>W A S D</kbd> 移动 <i></i> 拖动画面环顾</span></div>
  </section>
  <section id="memory" class="memory-card" hidden aria-labelledby="memory-title">
    <div class="memory-top"><span id="memory-index" class="tiny-label"></span><button id="memory-close" class="icon-button" aria-label="关闭回忆">${icons.close}</button></div>
    <p id="memory-place" class="memory-place"></p><h2 id="memory-title"></h2><p id="memory-summary" class="memory-summary"></p>
    <div id="quotes" class="quotes"></div>
    <button id="original" class="original-link">查看当时的对话 <span>↗</span></button>
    <div class="memory-actions"><button id="favorite" class="favorite-button">${icons.bookmark}<span>收藏这一刻</span></button><button id="next" class="primary">继续走走 ${icons.arrow}</button></div>
  </section>
  <section id="ending" class="ending" hidden aria-labelledby="ending-title"><span class="eyebrow">THIS AFTERNOON IS YOURS TO KEEP</span><h2 id="ending-title">故事走完了，<br>你还可以留下。</h2><p>三段回忆已经留在这座花园。<br>再坐一会儿，或者回到你喜欢的那一刻。</p><div class="ending-actions"><button id="stay" class="primary">留在花园 ${icons.arrow}</button><button id="restart" class="secondary">从头再走一次</button></div><small id="ending-save">回忆已保存在这台设备</small></section>
  <dialog id="detail-dialog"><div class="dialog-top"><span class="tiny-label">BEHIND THE MEMORY</span><button id="dialog-close" class="icon-button" aria-label="关闭详情">${icons.close}</button></div><div id="dialog-content"></div></dialog>
  <div id="toast" class="toast" role="status" hidden></div>
  <div id="error" class="error-state" hidden><h2>花园暂时没有打开</h2><p>请使用支持 WebGL 的 Chrome、Safari 或 Edge 浏览器，并开启硬件加速。</p><button onclick="location.reload()" class="primary">重新打开</button></div>
`;
const $=selector=>document.querySelector(selector);
let entered=false,mode='welcome',activeNode=null,tourProgress=0,nextNode=0,lastTime=performance.now(),elapsed=0,endingShown=false,engine,memoryPending=false,endingPending=false;
const ambience=createAmbience();ambience.setEnabled(save.sound);
function persist(){const ok=writeSave(save);$('#saved').textContent=ok?'已保存到本机':'本次体验暂无法保存';$('#ending-save').textContent=ok?'回忆已保存在这台设备':'本次体验暂无法保存';return ok;}
function toast(text){$('#toast').textContent=text;$('#toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').hidden=true,2600);}
function updateChapters(){document.querySelectorAll('[data-chapter]').forEach(b=>{const n=world.nodes[Number(b.dataset.chapter)];b.classList.toggle('visited',save.visited.includes(n.id));b.classList.toggle('active',activeNode?.id===n.id);b.classList.toggle('collected',save.favorites.includes(n.id));});}
function updateSound(){$('#sound').innerHTML=save.sound?icons.sound:icons.mute;$('#sound').setAttribute('aria-label',save.sound?'关闭环境声音':'开启环境声音');}
function setMode(value){mode=value;$('#mode-text').textContent={tour:'回忆漫游',free:'自由探索',paused:'漫游已暂停',memory:'停留在回忆',ending:'故事已走完'}[value]||'回忆漫游';$('#tour').innerHTML=(value==='tour'?icons.pause:icons.play)+`<span>${value==='tour'?'暂停漫游':nextNode>=3?'重新漫游':'继续漫游'}</span>`;$('#free').classList.toggle('selected',value==='free');}
function hideMemory(){$('#memory').hidden=true;memoryPending=false;activeNode=null;updateChapters();}
function enter(free=false){
  entered=true;$('#welcome').hidden=true;$('#welcome-chapters').hidden=true;$('#welcome-footer').hidden=true;$('#hud').hidden=false;$('#ending').hidden=true;
  $('#app').classList.add('entered');engine.enable(true);ambience.start();
  if(free){setMode('free');engine.setPose([0,1.72,19.8],[0,1.8,-3],true);toast('WASD 移动，按住画面拖动环顾；Esc 暂停');}
  else {tourProgress=0;nextNode=0;endingShown=false;setMode('tour');engine.setPath(0);}
  persist();
}
function openMemory(node,travel=false){
  if(!entered)enter(true);activeNode=node;nextNode=world.nodes.indexOf(node)+1;tourProgress=node.start;
  $('#ending').hidden=true;$('#nearby').hidden=true;$('#route-caption').hidden=true;setMode('memory');engine.enable(false);engine.pause();
  if(travel)engine.setPose(node.camera,node.look,true);
  $('#memory-index').textContent=`MEMORY ${node.number} / 03`;
  $('#memory-place').textContent=node.place;$('#memory-title').textContent=node.title;$('#memory-summary').textContent=node.summary;
  $('#quotes').innerHTML=node.quotes.map(q=>`<div class="quote"><span>${q.role}</span><p>“${q.content}”</p></div>`).join('');
  $('#favorite span').textContent=save.favorites.includes(node.id)?'已收藏这一刻':'收藏这一刻';$('#favorite').classList.toggle('selected',save.favorites.includes(node.id));
  $('#next').innerHTML=(nextNode===3?'走到故事的最后':'继续走走')+icons.arrow;
  memoryPending=!!travel;$('#memory').hidden=memoryPending;save.visited=[...new Set([...save.visited,node.id])];save.lastNode=node.id;persist();updateChapters();
  $('#place-label').textContent=node.place;
}
function resume(){
  if(nextNode>=3&&tourProgress>=.999){hideMemory();$('#ending').hidden=true;tourProgress=0;nextNode=0;endingShown=false;engine.setPose([0,1.72,20],[0,1.8,-3],true);}
  else hideMemory();
  $('#nearby').hidden=true;$('#route-caption').hidden=false;engine.enable(true);setMode('tour');
  // Return to the path gently before progressing after manual exploration.
  const p=engine.curve.getPoint(tourProgress),look=engine.curve.getPoint(Math.min(1,tourProgress+.04));
  engine.setPose([p.x,1.72,p.z],[look.x,1.65,look.z],true);
}
function manual(){if(!entered||mode==='memory'||mode==='ending')return;setMode('free');$('#route-caption').hidden=true;}
function showEnding(){endingShown=true;endingPending=true;setMode('ending');engine.enable(false);engine.setPose([0,1.72,-16],[0,2,4],true);$('#route-caption').hidden=true;$('#ending').hidden=true;$('#nearby').hidden=true;persist();}
function openDialog(html){$('#dialog-content').innerHTML=html;$('#detail-dialog').showModal();engine?.enable(false);if(mode==='tour')setMode('paused');}
function source(){openDialog(`<h2>这座花园从哪里来</h2><p class="dialog-lead">文学改编样例 · 非真实聊天</p><p>你以爱丽丝的视角，重访与帽匠有关的三个瞬间。对话来自 Lewis Carroll《Alice’s Adventures in Wonderland》第七章 “A Mad Tea-Party”。</p><p>${world.environmentNote}</p><div class="source-detail"><span>文本</span><strong>Lewis Carroll · 1865</strong><span>在线版本</span><a href="${world.sourceUrl}" target="_blank" rel="noopener">Project Gutenberg · eBook #11 ↗</a><span>原文副本</span><a href="${world.sourceFile}" target="_blank">阅读第七章原文 ↗</a></div><p class="fine-print">今晚先验证回忆如何成为可探索的空间。这个样例不代表已经接入真实账号历史，也不具备任意聊天自动生成世界的能力。</p>`);}
$('#enter').onclick=()=>enter();$('#explore-entry').onclick=()=>enter(true);
$('#source').onclick=source;$('#sample-details').onclick=source;
$('#sound').onclick=()=>{save.sound=!save.sound;ambience.setEnabled(save.sound);if(save.sound&&entered)ambience.start();updateSound();persist();toast(save.sound?'环境声音已开启':'环境声音已关闭');};
$('#settings').onclick=()=>openDialog(`<h2>自在地走一走</h2><div class="control-grid"><kbd>W / ↑</kbd><span>向前走</span><kbd>S / ↓</kbd><span>向后走</span><kbd>A / D</kbd><span>向左右移动</span><kbd>← / →</kbd><span>转动视角</span><kbd>鼠标拖动</kbd><span>环顾花园</span><kbd>E</kbd><span>打开附近的回忆</span><kbd>Esc</kbd><span>关闭回忆或暂停漫游</span></div><h3>画面质量</h3><p>流畅度会影响漫游体验。自动模式会在持续卡顿时降低渲染分辨率。</p><div class="quality-options">${[['auto','自动'],['high','精细'],['balanced','流畅']].map(([v,n])=>`<button data-quality="${v}" class="secondary ${save.quality===v?'selected':''}">${n}</button>`).join('')}</div><p class="fine-print">存档只保存在当前浏览器。清除网站数据会清除收藏与访问记录。</p>`);
$('#dialog-content').addEventListener('click',e=>{const b=e.target.closest('[data-quality]');if(!b)return;save.quality=b.dataset.quality;engine.setQuality(save.quality);persist();document.querySelectorAll('[data-quality]').forEach(x=>x.classList.toggle('selected',x===b));toast('画面设置已保存');});
function closeDialog(){$('#detail-dialog').close();engine?.enable(entered&&mode!=='memory'&&mode!=='ending');}
$('#dialog-close').onclick=closeDialog;$('#detail-dialog').addEventListener('cancel',()=>{engine?.enable(entered&&mode!=='memory'&&mode!=='ending');});
$('#detail-dialog').addEventListener('click',e=>{if(e.target===$('#detail-dialog'))closeDialog();});
$('#home').onclick=()=>{hideMemory();$('#ending').hidden=true;$('#hud').hidden=true;$('#welcome').hidden=false;$('#welcome-chapters').hidden=false;$('#welcome-footer').hidden=false;$('#app').classList.remove('entered');entered=false;setMode('welcome');engine.enable(false);ambience.pause();engine.setPose([0,1.72,20],[0,2,-3],true);updateReturn();};
$('#tour').onclick=()=>{if(mode==='tour'){setMode('paused');engine.pause();}else resume();};
$('#free').onclick=()=>{hideMemory();$('#ending').hidden=true;setMode('free');engine.enable(true);engine.pause();$('#route-caption').hidden=true;toast('自由探索已开启，WASD 移动，拖动环顾');};
$('#memory-close').onclick=()=>{hideMemory();setMode('free');engine.enable(true);engine.pause();};
$('#next').onclick=resume;
$('#favorite').onclick=()=>{if(!activeNode)return;const id=activeNode.id;save.favorites=save.favorites.includes(id)?save.favorites.filter(x=>x!==id):[...save.favorites,id];persist();$('#favorite span').textContent=save.favorites.includes(id)?'已收藏这一刻':'收藏这一刻';$('#favorite').classList.toggle('selected',save.favorites.includes(id));updateChapters();toast(save.favorites.includes(id)?'这一刻已经收藏，回来时还会在这里':'已取消收藏');};
$('#original').onclick=()=>{if(!activeNode)return;const n=activeNode;openDialog(`<h2>${n.title}</h2><p class="dialog-lead">${n.context}</p>${n.quotes.map(q=>`<div class="source-quote"><small>${q.role}</small><p>${q.original.replaceAll('_','')}</p><p class="translation">${q.content}</p></div>`).join('')}<p class="fine-print">原文：Chapter VII · A Mad Tea-Party<br>中文：本 Demo 演示译文</p><a class="source-file" href="${world.sourceFile}" target="_blank">阅读本章完整原文 ↗</a>`);};
$('#chapters').onclick=e=>{const b=e.target.closest('[data-chapter]');if(b)openMemory(world.nodes[Number(b.dataset.chapter)],true);};
$('#nearby').onclick=()=>{const n=engine.nearest();if(n)openMemory(n);};
$('#stay').onclick=()=>{$('#ending').hidden=true;setMode('free');engine.enable(true);engine.pause();toast('你可以通过右侧章节，回到任何一个瞬间');};
$('#restart').onclick=()=>{hideMemory();$('#ending').hidden=true;tourProgress=0;nextNode=0;endingShown=false;resume();};
function updateReturn(){const n=world.nodes.find(n=>n.id===save.lastNode);if(!n)return;$('#return-note').hidden=false;$('#return-note').innerHTML=`<span>欢迎回来 · 上次停留在「${n.title}」</span><button id="return">回到这一刻 ${icons.arrow}</button>`;$('#return').onclick=()=>openMemory(n,true);}
addEventListener('keydown',e=>{
  if($('#detail-dialog').open)return;
  if(e.code==='Escape'&&entered){if(activeNode)$('#memory-close').click();else if(mode==='tour')$('#tour').click();}
  if(e.code==='KeyE'&&entered&&!activeNode){const n=engine.nearest();if(n)openMemory(n);}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){ambience.pause();if(mode==='tour'){setMode('paused');engine.pause();}}else if(entered){ambience.start();}});
$('#world').addEventListener('webglcontextlost',e=>{e.preventDefault();$('#error').hidden=false;});
try {
  engine=await createWorld($('#world'),world.nodes,manual,n=>openMemory(n));engine.setQuality(save.quality);
  updateSound();updateChapters();updateReturn();
  let metrics={};
  function frame(now){const dt=Math.min((now-lastTime)/1000,.05);lastTime=now;elapsed+=dt;
    metrics=engine.frame(dt,elapsed);
    if(memoryPending&&!metrics.moving&&activeNode){memoryPending=false;$('#memory').hidden=false;}
    if(endingPending&&!metrics.moving&&mode==='ending'){endingPending=false;$('#ending').hidden=false;}
    if(mode==='tour'&&!metrics.moving&&!$('#detail-dialog').open){
      tourProgress=Math.min(1,tourProgress+dt/64);
      const node=world.nodes[nextNode];
      if(node&&tourProgress>=node.start){openMemory(node,true);}
      else if(tourProgress>=1&&!endingShown)showEnding();
      else engine.setPath(tourProgress);
    }
    if(entered&&(mode==='free'||mode==='paused')&&!$('#detail-dialog').open){const n=engine.nearest();$('#nearby').hidden=!n;if(n)$('#nearby span').textContent=`重温 · ${n.title}`;}
    else $('#nearby').hidden=true;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);$('#load').classList.add('ready');setTimeout(()=>$('#load').hidden=true,700);
  window.__appReady=true;
  Object.defineProperty(window,'__memoryRealm',{get:()=>({mode,activeNode:activeNode?.id||null,tourProgress,nextNode,visited:[...save.visited],favorites:[...save.favorites],sound:save.sound,quality:save.quality,worldId:save.worldId,...metrics})});
} catch(error){console.error(error);$('#load').hidden=true;$('#error').hidden=false;}
