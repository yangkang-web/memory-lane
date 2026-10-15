import * as T from 'three';
import {inSequence,installSequence,sequenceEvent,snapshot} from './sequence-bridge.js';
const canvas=document.createElement('canvas');canvas.setAttribute('aria-label','静候下一幕的星光舞台');document.querySelector('#app').replaceChildren(canvas);
Object.assign(document.body.style,{margin:'0',overflow:'hidden',background:'#080a19'});
const renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
const scene=new T.Scene();scene.background=new T.Color('#080a19');scene.fog=new T.FogExp2('#0c1026',.022);
const camera=new T.PerspectiveCamera(46,innerWidth/innerHeight,.1,180);
const navy=new T.MeshStandardMaterial({color:'#151c37',roughness:.36,metalness:.65});
const gold=new T.MeshStandardMaterial({color:'#b9a382',roughness:.23,metalness:.8});
const glow=new T.MeshBasicMaterial({color:'#eddaab'}),blue=new T.MeshBasicMaterial({color:'#8b9eff'});
function mesh(g,m,x=0,y=0,z=0){const obj=new T.Mesh(g,m);obj.position.set(x,y,z);scene.add(obj);return obj;}
const floor=mesh(new T.PlaneGeometry(180,180),navy,0,-.18);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;
for(let i=0;i<3;i++){const disk=mesh(new T.CylinderGeometry(5.8-i*.33,5.8-i*.33,.18,128),navy,0,i*.18,0);disk.receiveShadow=true;const ring=mesh(new T.TorusGeometry(5.8-i*.33,.018,8,160),glow,0,i*.18+.09,0);ring.rotation.x=Math.PI/2;}
// Receding architectural prosceniums, with fine light seams and an open central stage.
for(let i=0;i<5;i++){
 const r=5.1+i*.8,z=-3.1-i*1.1;
 const arch=mesh(new T.TorusGeometry(r,.12,12,128,Math.PI),gold,0,1,z);
 const seam=mesh(new T.TorusGeometry(r-.16,.024,8,128,Math.PI),i%2?blue:glow,0,1,z+.04);
 for(const side of [-1,1]){mesh(new T.CylinderGeometry(.12,.12,1.2,16),gold,side*r,.4,z);}
 arch.castShadow=true;seam.renderOrder=1;
}
scene.add(new T.HemisphereLight('#9bafff','#120b22',.7));
const beams=[];
for(const [x,z,color] of [[-5,2,'#bac9ff'],[5,1,'#ffe1a3'],[-3,-5,'#b6a0ff'],[3,-5,'#9fd7ff']]){
 const light=new T.SpotLight(color,210,32,.29,.8,1.5);light.position.set(x,10,z);light.target.position.set(x*.22,.4,-.5);scene.add(light,light.target);light.castShadow=true;light.shadow.mapSize.set(512,512);
 const beamMat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{color:{value:new T.Color(color)}},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 v;uniform vec3 color;void main(){float a=pow(sin(v.x*3.14159),2.)*pow(1.-v.y,1.7)*.065;gl_FragColor=vec4(color,a);}'});
 const beam=mesh(new T.ConeGeometry(2.7,10,48,1,true),beamMat,x/2,5,z/2);beam.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(x*.78,9.6,z+.5).normalize());beams.push({light,beam,x,z});
}
const particles=new Float32Array(450*3);for(let i=0;i<particles.length;i+=3){const n=i/3;particles[i]=Math.sin(n*12.989)*13;particles[i+1]=.4+(n*1.618%1)*10;particles[i+2]=Math.cos(n*4.713)*10-2;}
const dustGeometry=new T.BufferGeometry();dustGeometry.setAttribute('position',new T.BufferAttribute(particles,3));const dust= new T.Points(dustGeometry,new T.PointsMaterial({color:'#d8c9a5',size:.022,transparent:true,opacity:.55,depthWrite:false}));scene.add(dust);
let elapsed=0,playing=false,last=0,frame,disposed=false;
function render(){const t=elapsed;camera.position.set(Math.sin(t*.035)*.6,3.5-t*.012,15.5-t*.055);camera.lookAt(0,2,-2);dust.rotation.y=t*.008;for(const b of beams)b.light.intensity=210+Math.sin(t*.45+b.x)*15;renderer.render(scene,camera);}
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();render();}addEventListener('resize',resize);resize();
function tick(now){if(disposed)return;if(playing&&!document.hidden){elapsed+=Math.max(0,(now-last)/1000);if(elapsed>=30){elapsed=30;playing=false;sequenceEvent('done');}}last=now;render();frame=requestAnimationFrame(tick);}frame=requestAnimationFrame(tick);
installSequence({ready:Promise.resolve(),start(){elapsed=0;playing=true;last=performance.now();},pause(){playing=false;},resume(){if(elapsed<30){playing=true;last=performance.now();}},capture:()=>snapshot(canvas,render),dispose(){disposed=true;cancelAnimationFrame(frame);removeEventListener('resize',resize);const materials=new Set();scene.traverse(o=>{o.geometry?.dispose();if(o.material)materials.add(o.material);o.shadow?.dispose();});materials.forEach(m=>m.dispose());renderer.dispose();renderer.forceContextLoss();}});
if(!inSequence){playing=true;last=performance.now();}
