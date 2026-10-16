// The opening plays automatically on the same pausable clock as its shots.
export const OPENING_QUESTION='If we went to the same school, how would you win me over?';
export const OPENING_REPLY='I’d write you a love letter every day, until you said yes to being my girlfriend.';
export const OPENING_FILM_SOURCE_DURATION=18;
export const OPENING_FILM_DURATION=17;
const TYPING_SPEED=16;
export const STORY_READING_START=19.2;
export const OPENING_STAGES=Object.freeze([
 ['invite',1.2],['compose',OPENING_QUESTION.length/TYPING_SPEED+.7],['typing',1.6],
 ['reply',3.8],['leaving',1.6],['film',OPENING_FILM_DURATION],
]);
export const OPENING_DURATION=OPENING_STAGES.reduce((sum,[,seconds])=>sum+seconds,0);

// The embedded and standalone players use the same pausable opening clock.
export function createOpeningClock({onComplete=()=>{},onStage=()=>{}}={}){
 let index=0,elapsed=0,active=false,running=false;
 return {
  start(){index=0;elapsed=0;active=running=true;onStage();},
  stop(){active=running=false;},pause(){running=false;},resume(){if(active)running=true;},
  get active(){return active;},get running(){return running;},
  get state(){return {stage:OPENING_STAGES[index][0],elapsed};},
  update(dt){
   if(!active||!running)return;
   // Story timing follows real elapsed time even when rendering slows down.
   elapsed+=Math.max(0,dt);
   while(elapsed>=OPENING_STAGES[index][1]){
    if(index===OPENING_STAGES.length-1){elapsed=OPENING_STAGES[index][1];active=running=false;onComplete();return;}
    elapsed-=OPENING_STAGES[index++][1];onStage();
   }
  },
 };
}
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export const openingRamp=(t,a,b)=>smooth((t-a)/(b-a));
const mix=(a,b,p)=>a.map((v,i)=>v+(b[i]-v)*p);
const arrival=p=>{const a=[-35.3,2.05,-21.65],b=[-35.3,2.05,-23.4],c=[-34.9,1.98,-24.28],d=[-34.1,1.72,-24.28],q=1-p;return a.map((v,i)=>q*q*q*v+3*q*q*p*b[i]+3*q*p*p*c[i]+p*p*p*d[i]);};
export function openingFrame({stage='invite',elapsed=0}={}){
 const t=elapsed,film=stage==='film',leaving=stage==='leaving';
 let position=[-34.1,1.72,-24.28],target=[-34.1,1.26,-25.1];
 if(leaving){const turn=openingRamp(t,0,1.6);position=mix(position,[-34.65,2.05,-24.1],turn);target=mix(target,[-33.75,1.57,-25.48],turn);}
 if(film){
  if(t<6){position=mix([-34.65,2.05,-24.1],[-34.25,1.88,-24.38],openingRamp(t,0,4.6));target=[-33.75,1.57,-25.48];}
  else if(t<11){
   const walk=openingRamp(t,6.4,10.6);
   position=arrival(walk);
   target=mix([-35.3,1.65,-25.4],[-33.89,1.315,-25.12],walk);
   position[1]+=Math.sin(t*8)*.012*Math.sin(walk*Math.PI);
  }else{position=[-34.1,1.72,-24.28];target=mix([-33.89,1.315,-25.12],[-34.1,2,-30],openingRamp(t,14,18));}
 }
 return {position,target,film,time:t,phone:!film&&stage==='invite',boy:leaving||(film&&t<6),boyOpacity:leaving?openingRamp(t,.15,1.25):1,delivery:leaving||film,
  place:film?openingRamp(t,.8,3.3):0,release:film?openingRamp(t,3.4,4.5):0,
  pickup:film?openingRamp(t,10.8,12):0,open:film?openingRamp(t,12.3,13.9):0,
  extract:film?openingRamp(t,14.2,17.7):0,
  fade:film?openingRamp(t,4.8,5.8)*(1-openingRamp(t,6.2,7.5)):0,
  transition:film&&t>=4.8&&t<7.5?'第二天 · 清晨':'',
  text:film?(t<5?'他把第一封情书，轻轻放在你的课桌上。':t<10.8?'第二天，你走进教室，回到窗边的座位。':t<14.2?'拆开蜡封，打开只写给你的信。':'你慢慢抽出信纸，展开来看。'):'',
  aperture:.0015+(film?.002*openingRamp(t,10.5,12):0),maxblur:.003+(film?.004*openingRamp(t,10.5,12):0),
  focus:leaving?.7+openingRamp(t,0,1.6):film&&t<6?1.7:film?3-2.34*openingRamp(t,9.2,12):.7,portrait:0,letter:film&&t>=11,fov:52};
}

export function mountStoryOpening(panel,{onComplete,onWake}){
 const host=document.createElement('div');host.className='story-opening';host.hidden=true;
 host.innerHTML=`<div class="story-phone-invite"><span class="phone-glimmer">✦</span><span>A message just for you</span></div>
 <section class="story-chat-phone" aria-label="Chat with Fumiriya" hidden><div class="chat-notch"></div><div class="chat-status"><span>9:41</span><span>● ▰</span></div><header><span class="chat-avatar">F</span><div><strong>Fumiriya</strong><small>Online</small></div><span>♡</span></header><div class="chat-conversation" aria-live="polite"><p class="chat-date">By the window · Afternoon sunshine</p><p class="chat-sent" hidden></p><p class="chat-typing" hidden>Typing<span>…</span></p><p class="chat-reply" hidden></p></div><div class="chat-compose"><label for="story-chat-input">Typing…</label><textarea id="story-chat-input" rows="3" readonly tabindex="-1" aria-label="Message being typed"></textarea><button type="button" disabled tabindex="-1">Sending… <span>↑</span></button></div><div class="chat-home-bar"></div></section>`;
 panel.append(host);
 const $=s=>host.querySelector(s),input=$('textarea'),compose=$('.chat-compose');
 const clock=createOpeningClock({onStage:onWake,onComplete(){render();onComplete();}});
 function render(){
  const {stage,elapsed}=clock.state,{active,running}=clock;
  input.value=stage==='compose'?OPENING_QUESTION.slice(0,Math.floor(elapsed*TYPING_SPEED)):'';
  $('.chat-sent').textContent=OPENING_QUESTION;
  if(stage==='leaving'){
   const lower=openingRamp(elapsed,0,1.25);$('.story-chat-phone').style.opacity=String(1-lower);
   $('.story-chat-phone').style.transform=`translate(-50%,calc(-50% + ${lower*240}px)) scale(${1-lower*.12})`;
  }
  host.hidden=!active;$('.story-phone-invite').hidden=stage!=='invite';$('.story-chat-phone').hidden=stage==='invite'||stage==='film';
  if(stage!=='leaving'){$('.story-chat-phone').style.removeProperty('opacity');$('.story-chat-phone').style.removeProperty('transform');}
  $('.chat-sent').hidden=!['typing','reply','leaving'].includes(stage);$('.chat-typing').hidden=stage!=='typing';$('.chat-reply').hidden=!['reply','leaving'].includes(stage);
  $('.chat-reply').textContent=OPENING_REPLY;compose.hidden=stage!=='compose';
  host.classList.toggle('opening-paused',!running);
 }
 return {
  start(){clock.start();render();},stop(){clock.stop();render();},
  pause(){clock.pause();render();},resume(){clock.resume();render();},
  get active(){return clock.active;},get running(){return clock.running;},get state(){return clock.state;},
  update(dt){clock.update(dt);render();},
 };
}
