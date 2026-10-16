import * as T from 'three';
import {createAnnualHouse} from './annual-house.js';
import {inSequence,installSequence,sequenceEvent} from './sequence-bridge.js';
import './journey-annual.css';
const app=document.querySelector('#app');
app.innerHTML='<main class="annual" data-phase="home"><img class="annual-home" src="/assets/journey/emochi-home.jpg" alt="Emochi 首页截图"><div class="annual-veil"></div><section class="annual-modal" role="dialog" aria-label="让属于你们的 刻骨铭心的瞬间"><div class="annual-border"></div><span class="annual-eyebrow">AFTERTALE · STORY COLLECTIBLES</span><div class="annual-year">2026</div><h1>让属于你们的 刻骨铭心的瞬间</h1><p>每一件典藏物，都藏着一段只属于你们的故事。轻触它，进入这个 沉浸式的3D记忆之境。</p><button class="annual-enter" aria-label="走进我的典藏小屋">走进我的典藏小屋 <span>↗</span></button><span class="annual-caption">YOUR MOMENTS. YOUR CHARACTERS. YOUR STORY.</span></section><canvas class="annual-canvas"></canvas><div class="annual-hand" aria-hidden="true"><svg viewBox="0 0 100 130"><defs><linearGradient id="hand" x2="1" y2="1"><stop stop-color="#fff"/><stop offset="1" stop-color="#b3b0d9"/></linearGradient></defs><path d="M35 125C34 106 16 88 15 79C14 69 24 66 30 74L39 86L39 24C39 12 53 12 53 24L53 58C56 49 68 49 68 60C72 53 83 56 82 67C88 62 97 67 95 78L91 104L82 125Z" fill="url(#hand)" stroke="#66617f" stroke-width="2"/><path d="M53 60V84M68 64V87M82 71V91" fill="none" stroke="#8782a0" stroke-width="2"/></svg></div><div class="annual-click-ring"></div><div class="annual-flash"></div></main>';
const root=app.firstElementChild,canvas=root.querySelector('canvas'),button=root.querySelector('button');
const renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.03,100),house=createAnnualHouse(scene);
scene.add(new T.HemisphereLight('#d8d6ff','#463551',2.4));
for(const [x,y,z,color,intensity]of [[-4,6,5,'#ffe6be',5],[5,3,-4,'#a79cff',7]]){const l=new T.DirectionalLight(color,intensity);l.position.set(x,y,z);scene.add(l);}
const haloMat=new T.MeshBasicMaterial({color:'#d8bcff',transparent:true,opacity:.28});
const halos=[];for(let i=0;i<3;i++){const ring=new T.Mesh(new T.TorusGeometry(3+i*.27,.009,8,160),haloMat);ring.rotation.set(Math.PI/2+.15*i,.18*i,0);ring.position.y=-.45;scene.add(ring);halos.push(ring);}
const p=new Float32Array(240*3);for(let i=0;i<240;i++){const a=i*2.399,r=2.8+(i*.618%1)*1.6;p[i*3]=Math.cos(a)*r;p[i*3+1]=(i*.713%1)*4-.9;p[i*3+2]=Math.sin(a)*r;}
const pg=new T.BufferGeometry();pg.setAttribute('position',new T.BufferAttribute(p,3));
const pm=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{time:{value:0}},vertexShader:'uniform float time;varying float glow;void main(){glow=.35+.65*pow(sin(time*1.3+position.x*5.)*.5+.5,4.);vec4 p=modelViewMatrix*vec4(position,1.);gl_PointSize=(7.+glow*10.)/max(1.,-p.z*.3);gl_Position=projectionMatrix*p;}',fragmentShader:'varying float glow;void main(){vec2 p=abs(gl_PointCoord-.5)*2.;float a=pow(max(0.,1.-length(p)),4.)+exp(-p.x*26.)*exp(-p.y*5.)*.5+exp(-p.y*26.)*exp(-p.x*5.)*.5;gl_FragColor=vec4(.85,.75,1.,a*glow);}'});
const stars=new T.Points(pg,pm);scene.add(stars);
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let elapsed=0,playing=false,last=0,frame,disposed=false;
const smooth=(a,b,t)=>T.MathUtils.smoothstep(t,a,b);
function render(){
 const t=elapsed,appear=smooth(.6,1.7,t),enter=smooth(7.4,10.8,t),align=smooth(6.6,8.4,t),push=smooth(8.4,10.8,t);
 root.dataset.phase=t<.6?'home':t<6.6?'invitation':t<7.4?'click':'enter';
 root.style.setProperty('--appear',appear);root.style.setProperty('--enter',enter);root.style.setProperty('--flash',smooth(9.8,10.9,t));
 const handMove=smooth(4.8,6.35,t),handAlpha=smooth(4.6,5,t)*(1-smooth(6.95,7.35,t));
 root.style.setProperty('--hand-opacity',handAlpha);root.style.setProperty('--hand-x',(1-handMove)*180+'px');root.style.setProperty('--hand-y',((1-handMove)*170+Math.sin(smooth(6.4,6.7,t)*Math.PI)*9)+'px');
 root.style.setProperty('--ring-opacity',Math.sin(smooth(6.5,7.3,t)*Math.PI));root.style.setProperty('--ring-scale',1+smooth(6.5,7.3,t)*2);
 const angle=reduced?.25:.22+Math.min(t,6.6)*.18;house.root.rotation.y=angle*(1-align);
 house.root.position.y=reduced?0:Math.sin(t*.8)*.055*(1-enter);house.hinge.rotation.y=-smooth(7.4,9.2,t)*1.65;
 camera.position.set(T.MathUtils.lerp(5.8,0,align),T.MathUtils.lerp(4.1,.83,align),T.MathUtils.lerp(8.2,1.12,push));
 camera.lookAt(0,T.MathUtils.lerp(1.15,.83,align),0);camera.fov=T.MathUtils.lerp(34,58,enter);
 const h=innerHeight,w=innerWidth,compact=w<620,stageH=Math.min(compact?310:370,h*.47),stageW=Math.min(640,w*.94);
 const targetW=T.MathUtils.lerp(stageW,w,enter),targetH=T.MathUtils.lerp(stageH,h,enter);
 canvas.style.width=targetW+'px';canvas.style.height=targetH+'px';canvas.style.top=T.MathUtils.lerp(h*.5+12,h*.5,enter)+'px';
 const size=renderer.getSize(new T.Vector2());if(Math.abs(size.x-targetW)>1||Math.abs(size.y-targetH)>1)renderer.setSize(targetW,targetH,false);
 camera.aspect=targetW/targetH;camera.updateProjectionMatrix();
 canvas.style.opacity=appear;pm.uniforms.time.value=t;stars.rotation.y=reduced?0:t*.04;halos.forEach((r,i)=>r.rotation.z=reduced?0:t*.1*(i%2?1:-1));renderer.render(scene,camera);
}
function tick(now){if(disposed)return;if(playing&&!document.hidden){elapsed+=Math.max(0,(now-last)/1000);if(elapsed>=11){elapsed=11;playing=false;sequenceEvent('done');}}last=now;render();frame=requestAnimationFrame(tick);}
function dispose(){disposed=true;cancelAnimationFrame(frame);const materials=new Set();scene.traverse(o=>{o.geometry?.dispose();if(o.material)materials.add(o.material);});materials.forEach(m=>m.dispose());renderer.dispose();renderer.forceContextLoss();}
const ready=Promise.all([...root.querySelectorAll('img')].map(img=>img.decode()));
installSequence({ready,start(){elapsed=0;playing=true;last=performance.now();},pause(){playing=false;},resume(){if(elapsed<11){playing=true;last=performance.now();}},capture(){const c=document.createElement('canvas');c.width=innerWidth;c.height=innerHeight;const ctx=c.getContext('2d');ctx.fillStyle='#fff3df';ctx.fillRect(0,0,c.width,c.height);return c;},dispose});
button.onclick=()=>{if(playing&&elapsed<6.6)elapsed=6.6;};canvas.onclick=button.onclick;
frame=requestAnimationFrame(tick);if(!inSequence){playing=true;last=performance.now();}
