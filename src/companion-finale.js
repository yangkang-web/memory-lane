import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { smooth, stateAt } from './last-companion-timeline.js';
import { placePalm } from './companion-performance.js';

// The filter extends below the eye's field of view, back toward the mouth.
const mouth = new T.Vector3(.035, -.08, -.155);
const heldSmoke = new T.Vector3(.13, -.22, -.42);
const heldLighter = new T.Vector3(.12, -.18, -.40);
const pocket = new T.Vector3(.22, -.48, -.24);
const lighterRest = new T.Vector3(3.39, .182, 159.15);
const lighterFlat = new T.Quaternion().setFromEuler(new T.Euler(Math.PI / 2, .25, -.35));
const up = new T.Vector3(0, 1, 0);
const handTurn = new T.Quaternion().setFromEuler(new T.Euler(0, Math.PI / 2, 0));

function authoredRotation(time) {
  const state = stateAt(time), position = new T.Vector3(...state.camera);
  return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().lookAt(position, new T.Vector3(...state.look), up));
}
function authoredWorld(time, local) {
  return local.clone().applyQuaternion(authoredRotation(time)).add(new T.Vector3(...stateAt(time).camera));
}

export function finalePhase(t) {
  if (t < 445 || t >= 474) return 'hidden';
  if (t < 446.6) return 'take-cigarette';
  if (t < 447) return 'take-lighter';
  if (t < 447.55) return 'drop-lighter';
  if (t < 448.3) return 'reach-lighter';
  if (t < 449.1) return 'lift-lighter';
  if (t < 450.2) return 'failed-strikes';
  if (t < 450.9) return 'light-cigarette';
  if (t < 451.6) return 'pocket-lighter';
  if (t < 453) return 'cough';
  if (t < 459) return 'trembling';
  if (t < 468.5) return 'mouth';
  if (t < 473) return 'last-drag';
  return 'drop-cigarette';
}

export function createFinalePerformance(actors) {
  const {rig, playerArms:[,right]} = actors;
  const root = new T.Group();root.name='One-handed cigarette and dropped lighter';rig.add(root);
  const resources=[];
  const material=(color,extra={})=>{const m=new T.MeshStandardMaterial({color,roughness:.75,...extra});resources.push(m);return m;};
  const paper=material('#c6bf9e'),filter=material('#937250'),ash=material('#4f4942');
  const metal=material('#8d9182',{metalness:.7,roughness:.42}),body=material('#474e43',{metalness:.25});
  function mesh(parent,geometry,mat,x=0,y=0,z=0){resources.push(geometry);const m=new T.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  const cigarette=new T.Group();root.add(cigarette);
  const curve=new T.CatmullRomCurve3([new T.Vector3(0,0,-.043),new T.Vector3(.003,0,-.014),new T.Vector3(0,0,.023)]);
  mesh(cigarette,new T.TubeGeometry(curve,16,.0036,10),paper);
  mesh(cigarette,new T.CylinderGeometry(.0037,.0037,.024,12),filter,0,0,.032).rotation.x=Math.PI/2;
  const tip=mesh(cigarette,new T.SphereGeometry(.0038,10,8),ash,0,0,-.043);
  const emberMaterial=material('#6c2512',{emissive:'#df5b18',emissiveIntensity:0});tip.material=emberMaterial;
  const lighter=new T.Group();root.add(lighter);
  mesh(lighter,new RoundedBoxGeometry(.028,.046,.013,2,.003),body);
  mesh(lighter,new T.BoxGeometry(.029,.014,.014),metal,0,.027,0);
  const wheel=mesh(lighter,new T.CylinderGeometry(.006,.006,.011,12),metal,-.007,.038,0);wheel.rotation.z=Math.PI/2;
  for(const x of [-.01,0,.01])mesh(lighter,new T.SphereGeometry(.0018,6,4),ash,x,.028,.0072);
  const trigger=mesh(lighter,new T.BoxGeometry(.009,.006,.012),ash,.008,.034,0);
  const flameMaterial=new T.MeshBasicMaterial({color:'#ffd28a',transparent:true,opacity:.8,depthWrite:false});resources.push(flameMaterial);
  const flame=mesh(lighter,new T.SphereGeometry(1,12,12),flameMaterial,0,.055,0);flame.scale.set(.006,.022,.004);
  const blueMaterial=new T.MeshBasicMaterial({color:'#91beed',transparent:true,opacity:.9,depthWrite:false});resources.push(blueMaterial);
  const blue=mesh(lighter,new T.SphereGeometry(1,8,8),blueMaterial,0,.04,0);blue.scale.set(.004,.006,.003);
  flame.castShadow=blue.castShadow=false;
  const glow=new T.PointLight('#ffc783',0,.65,2);glow.position.set(0,.06,0);lighter.add(glow);
  const smokeMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,
    vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'varying vec2 vUv;void main(){float d=length((vUv-.5)*2.0);float a=pow(1.0-smoothstep(.1,1.0,d),2.0)*.065;gl_FragColor=vec4(.65,.68,.62,a);}',
  });resources.push(smokeMaterial);
  const wisps=Array.from({length:5},()=>mesh(root,new T.PlaneGeometry(1,1),smokeMaterial));
  wisps.forEach(w=>w.castShadow=false);
  const local=(v)=>rig.worldToLocal(v.clone());
  function gripLighter(approach=1){
    right.shoulder.position.set(.25,-.28,-.12);
    const orientation=lighter.quaternion.clone().multiply(new T.Quaternion().setFromEuler(new T.Euler(0,0,Math.PI)));
    const center=new T.Vector3(0,-.045,.032).applyQuaternion(lighter.quaternion).add(lighter.position);
    center.lerp(new T.Vector3(.23,-.35,-.35),1-approach);
    placePalm(right,rig,center,orientation,.15+.78*approach);
  }
  function gripCigarette(position) {
    right.shoulder.position.set(.27,-.36,-.04);
    const center=position.clone().add(new T.Vector3(.032,.045,.02));
    placePalm(right,rig,center,handTurn,.48);
  }
  function followFingers(){
    right.palm.updateWorldMatrix(true,false);
    cigarette.position.copy(local(right.palm.localToWorld(new T.Vector3(0,-.078,-.032))));
    cigarette.quaternion.copy(rig.getWorldQuaternion(new T.Quaternion()).invert().multiply(right.palm.getWorldQuaternion(new T.Quaternion())).multiply(handTurn.clone().invert()));
    cigarette.position.add(new T.Vector3(0,0,-.02).applyQuaternion(cigarette.quaternion));
  }
  function update(t){
    const phase=finalePhase(t);root.visible=phase!=='hidden';if(!root.visible)return;
    cigarette.visible=true;lighter.visible=t>=446.6&&t<451.6;
    cigarette.quaternion.identity();lighter.quaternion.identity();
    cigarette.position.copy(mouth);lighter.position.copy(heldLighter);
    // Tip the cigarette upward around its mouth end while looking down to light it.
    // Keeping the filter anchored avoids lifting a whole cigarette into mid-air.
    const lighting=smooth(t,449.1,449.5)*(1-smooth(t,450.9,451.6));
    cigarette.rotation.x=.65*lighting;
    const mouthEnd=new T.Vector3(0,0,.044);
    cigarette.position.add(mouthEnd.clone().sub(mouthEnd.clone().applyQuaternion(cigarette.quaternion)));
    const lightingTip=new T.Vector3(0,0,-.043).applyQuaternion(cigarette.quaternion).add(cigarette.position);
    const ignition=lightingTip.clone().add(new T.Vector3(.006,-.075,.004));
    flame.visible=blue.visible=t>=450.2&&t<450.9;
    const strike=[449.15,449.65,450.2].reduce((a,at)=>a+Math.max(0,1-Math.abs(t-at)/.09),0);
    trigger.position.y=.034-strike*.004;wheel.rotation.x=strike*1.2;
    glow.intensity=flame.visible?.12:0;flame.scale.y=.022*(1+Math.sin(t*49)*.12);
    emberMaterial.emissiveIntensity=t>=450.3?.7+Math.max(0,Math.sin(t*2))*.6:0;
    if(t<446.6){
      cigarette.position.copy(pocket).lerp(heldSmoke,smooth(t,445,445.7)).lerp(mouth,smooth(t,446,446.6));
      gripCigarette(cigarette.position);followFingers();
    }else if(t<447){
      lighter.position.copy(pocket).lerp(heldLighter,smooth(t,446.6,447));gripLighter();
    }else if(t<448.3){
      const drop=smooth(t,447,447.55);
      const point=authoredWorld(447,heldLighter).lerp(lighterRest,drop);point.y+=Math.sin(drop*Math.PI)*.035;
      lighter.position.copy(local(point));
      lighter.quaternion.copy(rig.getWorldQuaternion(new T.Quaternion()).invert().multiply(authoredRotation(447).slerp(lighterFlat,drop)));
      gripLighter(smooth(t,447.65,448.3));
    }else if(t<449.1){
      const lift=smooth(t,448.3,449.1);lighter.position.copy(local(lighterRest)).lerp(heldLighter,lift);
      lighter.quaternion.copy(rig.getWorldQuaternion(new T.Quaternion()).invert().multiply(lighterFlat)).slerp(new T.Quaternion(),lift);gripLighter();
    }else if(t<450.9){
      lighter.position.copy(heldLighter).lerp(ignition,smooth(t,449.1,449.5));
      lighter.position.x+=Math.sin(t*31)*.002;gripLighter();
    }else if(t<451.6){
      lighter.position.copy(ignition).lerp(pocket,smooth(t,450.9,451.6));gripLighter();
    }else if(t<459){
      const shake=t<453?.014:.006;
      const hand=mouth.clone().lerp(heldSmoke,smooth(t,451.6,452)).add(new T.Vector3(Math.sin(t*25)*shake,Math.cos(t*29)*shake*.6,0));
      gripCigarette(hand);followFingers();
    }else if(t<459.7){
      const hand=heldSmoke.clone().lerp(mouth,smooth(t,459,459.7));gripCigarette(hand);followFingers();
    }else if(t>=468.5&&t<471){
      const hand=mouth.clone().lerp(heldSmoke,smooth(t,468.5,469.2));hand.x+=Math.sin(t*27)*.008;gripCigarette(hand);followFingers();
    }else if(t>=471&&t<473){
      // It remains between the fingers while the hand rests on the closed pouch.
      followFingers();
    }else if(t>=473){
      const drop=smooth(t,473,473.65);
      followFingers();
      const release=authoredWorld(473,cigarette.position);
      const rotation=authoredRotation(473).multiply(cigarette.quaternion).slerp(new T.Quaternion().setFromEuler(new T.Euler(0,1.8,0)),drop);
      cigarette.position.copy(local(release.lerp(new T.Vector3(3.55,.174,159.3),drop)));
      cigarette.quaternion.copy(rig.getWorldQuaternion(new T.Quaternion()).invert().multiply(rotation));
    }
    const smokeOrigin=new T.Vector3(0,0,-.043).applyQuaternion(cigarette.quaternion).add(cigarette.position);
    wisps.forEach((w,i)=>{w.visible=t>=450.3&&t<473;const age=((t*.55+i*.2)%1);w.position.copy(smokeOrigin).add(new T.Vector3(Math.sin(t+i)*age*.025,.02+age*.13,0));w.scale.set(.012+age*.05,.024+age*.09,1);w.rotation.z=Math.sin(t*.5+i)*.3;});
  }
  return {update,root,cigarette,lighter,flame,dispose(){root.removeFromParent();resources.forEach(r=>r.dispose());}};
}
