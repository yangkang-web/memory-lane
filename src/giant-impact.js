import * as T from 'three';
import { plantLeg } from './infected-locomotion.js';
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export const GIANT_IMPACT=14.45;
export function giantBeat(time){
  const drop=clamp((time-13.65)/.8),age=time-GIANT_IMPACT;
  const compression=smooth(age/.18)*(1-.36*smooth((age-.34)/.56));
  const settle=age>0?Math.sin(Math.min(Math.PI,age/.34*Math.PI))*Math.exp(-age*1.6):0;
  return {visible:time>=13.65&&time<16.15,age,drop,
    x:1.2-4.7*(1-drop),z:102.2+2.2*(1-drop),
    y:18*(1-drop*drop)-7.7*smooth((age-.7)/1),compression,settle};
}

export function poseGiant(actor,time){
  const b=giantBeat(time),c=b.compression;
  actor.root.position.set(b.x,b.y,b.z);actor.root.rotation.set(0,-.12,0);actor.root.scale.set(3.5,2.85,3.1);
  actor.body.rotation.set(-.27-c*.20,.04,0);actor.body.position.set(0,-.025-c*.19,.17+c*.08);
  actor.root.userData.giantSettle=b.settle;
  actor.head.rotation.set(.2,0,-.1);
  actor.legs.forEach((leg,i)=>{
    const ankle=new T.Vector3(i?.255:-.255,.105+(b.age<0?.25*(1-b.drop):0),i?.10:-.12);
    plantLeg(actor,leg,ankle);
  });
  actor.arms.forEach((arm,i)=>{
    // Arms brace, absorb the impact, then recoil independently. No falling-loop roll.
    const side=i?1:-1,absorb=smooth((b.age-.045)/.19);
    arm.shoulder.rotation.set(.28+absorb*.32,side*.18,side*(.45-c*.18));
    arm.elbow.rotation.set(.45+absorb*.55,0,0);arm.palm.rotation.set(.15,side*.8,side*.12);arm.palm.userData.grip(.7);
  });
  actor.root.userData.contactRun=true;actor.root.userData.flightHeight=0;
  actor.root.userData.floorY=b.age>=0?b.y:null;
  return b;
}

export function createImpactDebris(parent){
  const root=new T.Group();root.name='Giant / radial road ejecta';parent.add(root);
  const material=new T.MeshStandardMaterial({color:'#5e6157',roughness:.95});
  const geometry=new T.DodecahedronGeometry(1,0),chunks=[];
  for(let i=0;i<56;i++){const m=new T.Mesh(geometry,material);m.castShadow=m.receiveShadow=true;const size=.025+(i%7)*.027;m.scale.set(size*1.8,size*.55,size);root.add(m);chunks.push(m);}
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d'),g=ctx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'#c2b5a5c0');g.addColorStop(.45,'#aca18b70');g.addColorStop(1,'#aca18b00');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);const map=new T.CanvasTexture(canvas);
  const dustMaterial=new T.SpriteMaterial({map,color:'#aca18b',transparent:true,opacity:.36,depthWrite:false});
  const dust=Array.from({length:32},()=>{const s=new T.Sprite(dustMaterial);root.add(s);return s;});
  return {update(time){const age=time-GIANT_IMPACT;root.visible=age>=0&&age<2.2;if(!root.visible)return;
    root.position.set(1.2,0,102.2);
    chunks.forEach((m,i)=>{const a=i*2.399,r=.5+age*(2.2+i%7*.45),v=2.4+i%5*.6;m.position.set(Math.cos(a)*r,Math.max(-1,.16+v*age-4.9*age*age),Math.sin(a)*r);m.rotation.set(age*(i%3+2),a,age*(i%4-2));});
    dust.forEach((s,i)=>{const a=i*2.399,r=.5+age*(1.4+i%5*.38);s.position.set(Math.cos(a)*r,.15+age*(.7+i%3*.4),Math.sin(a)*r);s.scale.setScalar(.7+age*(1.3+i%3*.3));s.material.rotation=i*1.7;});
    dustMaterial.opacity=.5*(1-smooth((age-1.1)/1.1));
  },dispose(){root.removeFromParent();geometry.dispose();material.dispose();map.dispose();dustMaterial.dispose();}};
}
