import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createStudent} from './student.js';
import {characters} from './characters.js';
import {letterFront,letterBack,finalThought,storyFrame,storyPerformance} from './sunflower-timeline.js';
import {voicePose} from './student-voice.js';
import voice from './data/sunflower-voice.json';
import {createStoryHand} from './story-hand.js';
import {createStudentFade} from './student-stability.js';
import {createStoryEnvelope} from './story-envelope.js';
import {openingFrame,openingRamp} from './story-opening.js';

function canvasMap(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;return map;}
function sunflower(ctx,x,y,r){ctx.save();ctx.translate(x,y);for(let i=0;i<14;i++){ctx.save();ctx.rotate(i*Math.PI/7);ctx.fillStyle=i%2?'#efbd45':'#e4a936';ctx.beginPath();ctx.ellipse(0,-r*.85,r*.25,r*.66,0,0,Math.PI*2);ctx.fill();ctx.restore();}ctx.fillStyle='#6c4836';ctx.beginPath();ctx.arc(0,0,r*.45,0,Math.PI*2);ctx.fill();ctx.restore();}
function paperMap(lines,back=false){return canvasMap(900,1250,(c,w,h)=>{
 c.fillStyle='#fffaf0';c.fillRect(0,0,w,h);
 // Fine fibres and a folded centre, subtle enough to preserve handwriting.
 for(let i=0;i<14000;i++){const x=(i*137.508)%w,y=(i*79.31)%h;c.fillStyle=i%2?'#bca88a09':'#ffffff26';c.fillRect(x,y,1,2);}
 const fold=c.createLinearGradient(0,610,0,638);fold.addColorStop(0,'#bba98900');fold.addColorStop(.45,'#bba98918');fold.addColorStop(.55,'#ffffff70');fold.addColorStop(1,'#ffffff00');c.fillStyle=fold;c.fillRect(0,610,w,28);
 c.textAlign='left';c.fillStyle='#96734f';c.font='italic 29px "Bradley Hand", "Segoe Print", cursive';c.fillText(back?'One more little thing…':'To my favorite girl,',88,145);
 c.fillStyle='#514841';c.font='italic 43px "Bradley Hand", "Segoe Print", Georgia, serif';
 lines.forEach((line,i)=>{c.save();c.translate(86,275+i*82);c.rotate(Math.sin(i*2.7)*.006);c.fillText(line,0,0,735);c.restore();});
 sunflower(c,709,1005,34);c.strokeStyle='#8f9e62';c.lineWidth=2;c.beginPath();c.moveTo(710,1024);c.quadraticCurveTo(696,1053,709,1070);c.stroke();
 c.fillStyle='#756455';c.font='italic 30px "Bradley Hand", "Segoe Print", cursive';c.fillText('Always, Fumiriya',86,1100);
 c.font='italic 20px Georgia';c.fillStyle='#82766a';wrap(c,finalThought,86,1170,728,26);
 });}
function wrap(c,text,x,y,maxWidth,lineHeight){let line='';for(const word of text.split(' ')){const next=line+word+' ';if(c.measureText(next).width>maxWidth&&line){c.fillText(line,x,y);line=word+' ';y+=lineHeight;}else line=next;}c.fillText(line,x,y);return y+lineHeight;}
export function createSunflowerScene(scene,camera,{sequence=false}={}){
 const stage=new T.Group();stage.name='Sunflower story — user-authored screenplay';stage.visible=false;scene.add(stage);
 const props=new T.Group();props.name='First-person phone and letter';props.visible=false;camera.add(props);scene.add(camera);
 const mat=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.65,...extra});
 function mesh(parent,g,m,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 const grip=createStoryHand;
 const phone=new T.Group();props.add(phone);
 mesh(phone,new RoundedBoxGeometry(.174,.328,.013,3,.012),mat('#304d48'),0,0,0);
 let phoneKey='';const screen=mesh(phone,new T.PlaneGeometry(.158,.298),new T.MeshBasicMaterial({color:'white',toneMapped:false}),0,0,.0072);
 mesh(phone,new RoundedBoxGeometry(.046,.009,.001,2,.004),mat('#182b29'),0,.144,.008);
 const phoneGrip=grip(phone,-.083,-.075,1,'phone');phoneGrip.position.z=.016;
 const letter=new T.Group();props.add(letter);
 const frontPaperMap=paperMap(letterFront);
 const front=mesh(letter,new T.PlaneGeometry(.306,.425,12,16),new T.MeshBasicMaterial({map:frontPaperMap,side:T.FrontSide,toneMapped:false}),0,0,.0006);
 const back=mesh(letter,new T.PlaneGeometry(.306,.425,12,16),new T.MeshBasicMaterial({map:paperMap(letterBack,true),side:T.FrontSide,toneMapped:false}),0,0,-.0006);back.rotation.y=Math.PI;
 const paperGrip=grip(props,-.03,-.07,.86);
 const extractionClip=new T.Plane();
 for(const page of [front,back]){const a=page.geometry.attributes.position;for(let i=0;i<a.count;i++){a.setZ(i,Math.sin(a.getX(i)/.306*Math.PI)*.009);}page.geometry.computeVertexNormals();}
 const heldEnvelope=createStoryEnvelope();props.add(heldEnvelope);heldEnvelope.visible=false;
 const envelopeGrip=grip(props,0,0,.86);envelopeGrip.visible=false;
 const openingGrip=grip(props,0,0,.86,'paper','right');openingGrip.visible=false;
 props.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;o.material.opacity=1;o.material.depthTest=true;o.material.depthWrite=true;o.renderOrder=100;o.layers.set(1);}});
 const envelope=createStoryEnvelope();stage.add(envelope);envelope.position.set(-33.89,1.31,-25.12);envelope.rotation.set(-Math.PI/2,0,-.12);
 const personStage=new T.Group();stage.add(personStage);
 const boy=createStudent(personStage,{character:{...characters[0],position:[-33.25,.52,-26.1],yaw:-.44,previewChair:false,chair:{x:-31.4,y:.52,z:-26.6,seatHeight:.46}}});
 // Broad window and bounced sky light soften the face without flattening it.
 const key=new T.RectAreaLight('#fff0d9',2.6,3.2,3.4);key.position.set(-36.5,3.1,-24.5);key.lookAt(-33.25,1.9,-26.1);stage.add(key);
 const bounce=new T.RectAreaLight('#dceaff',1.0,3,2);bounce.position.set(-31.4,2.4,-24);bounce.lookAt(-33.25,1.8,-26.1);stage.add(bounce);
 scene.traverse(o=>{if(o.isLight)o.layers.enable(1);});
 let active=false,lastSpeaking=false;
 boy.ready.then(loaded=>{if(!loaded)return;boy.root.traverse(o=>{
  if(!o.isMesh)return;
  for(const m of [o.material].flat()){
   if(m.name?.includes('_SKIN')){m.color.set('#edd7cb');m.roughness=.88;}
   // Keep nose/chin shape from broad light; remove harsh fringe shadow stamps.
   if(m.name?.includes('Face')||m.name?.includes('_EYE'))o.receiveShadow=false;
   if(m.name?.includes('Hair')){m.roughness=.52;}
  }
 });});
 const fadeBoy=createStudentFade(boy.root);
 let lastStoryTime=null,lastOpeningStage=null;
 function update(time,dt,playing,opening=null){
  if(!active)return;
  if(opening)return updateOpening(opening,dt,playing);
  if(lastOpeningStage!==null||lastStoryTime===null||Math.abs(time-lastStoryTime)>.25)boy.resetSecondaryMotion();
  lastOpeningStage=null;lastStoryTime=time;
  boy.relocate([-33.25,.52,-26.1]);
  heldEnvelope.visible=envelopeGrip.visible=openingGrip.visible=false;envelopeGrip.userData.updateArm();openingGrip.userData.updateArm();
  envelope.position.set(-33.89,1.31,-25.12);envelope.rotation.set(-Math.PI/2,0,-.12);envelope.userData.setOpen(0);
  phoneGrip.visible=true;phone.scale.setScalar(1);screen.material.color.set('white');
  for(const page of [front,back])page.material.clippingPlanes=null;
  const f=storyFrame(time),portrait=camera.aspect<.8;camera.position.fromArray(f.position);
  // Leave room for the whole wide envelope on phone screens during its close-up.
  if(portrait&&time>=15&&time<18.6){
   const framing=1+.32*T.MathUtils.smoothstep(time,16,17.3)*(1-T.MathUtils.smoothstep(time,18.2,18.6));
   const target=new T.Vector3(...f.target);camera.position.sub(target).multiplyScalar(framing).add(target);
   f.focus=camera.position.distanceTo(new T.Vector3(-33.89,1.315,-25.12));
  }
  // A horizontal composition offset becomes too strong in a narrow viewport.
  camera.lookAt(f.target[0]+(portrait?.13*f.portrait:0),f.target[1],f.target[2]);
  camera.fov=f.fov+(portrait?13-5*f.portrait:0);camera.updateProjectionMatrix();
  const line=voice.lines.find(l=>time>=l.start&&time<l.end);const speaking=playing&&!!line;
  if(speaking!==lastSpeaking){boy.setSpeaking(speaking);lastSpeaking=speaking;}
  boy.setStoryPose(storyPerformance(time));
  boy.setSpeechFrame(speaking?voicePose(time,voice.cues):{});boy.update(playing?dt:0);
  // During memories he remains present as the imagined boyfriend, like the storyboard.
  personStage.visible=f.boyOpacity>.001;fadeBoy(f.boyOpacity);
  envelope.visible=f.envelope;phone.visible=f.phone;letter.visible=f.letter||(f.ending&&!sequence);
  const phoneLower=T.MathUtils.smoothstep(time,2.8,4)*(1-T.MathUtils.smoothstep(time,8.6,10))+T.MathUtils.smoothstep(time,11.6,12.5)*(1-T.MathUtils.smoothstep(time,13.7,14.5));
  phone.position.set(.025+phoneLower*.115,-.10-phoneLower*.20-(1-f.phoneLift)*.38+Math.sin(time*1.4)*.002,-.53);
  phone.rotation.set(-.08+Math.sin(time*1.2)*.008,-.05,-.045+Math.sin(time*.8)*.009);
  const lift=T.MathUtils.smoothstep(time,18.6,19.3)*(1-T.MathUtils.smoothstep(time,39.3,40));
  letter.scale.setScalar(f.ending?.29:.86);
  letter.position.set(f.ending?(portrait?.07:.14):-.015,f.ending?-.095:.085-(1-lift)*.65,-.66);
  if(f.ending)letter.position.y-=.18*(1-T.MathUtils.smoothstep(time,63,64));
  letter.rotation.set(-.08+Math.sin(time*1.1)*.007,f.ending?-.16:0,f.ending?.08:-.04+Math.sin(time*.7)*.014);
  // Keep the sheet facing the reader; reveal the next passage without turning it.
  front.material.map=f.back&&!f.ending?back.material.map:frontPaperMap;
  paperGrip.visible=letter.visible;
  paperGrip.scale.setScalar(letter.scale.x);
  paperGrip.position.copy(letter.position).add(new T.Vector3(-.145,-.12,.004).multiplyScalar(letter.scale.x).applyQuaternion(letter.quaternion));
  paperGrip.quaternion.copy(letter.quaternion);
  paperGrip.userData.updateArm();
  phoneGrip.userData.updateArm();
  for(const page of [front,back]){const a=page.geometry.attributes.position;for(let i=0;i<a.count;i++){const x=a.getX(i),y=a.getY(i);a.setZ(i,Math.sin(x/.306*Math.PI)*.012+Math.sin(y*12+time*1.3)*.001);}a.needsUpdate=true;page.geometry.computeVertexNormals();}
  const key=f.speaker+f.text;
  if(key!==phoneKey&&f.phone){phoneKey=key;screen.material.map?.dispose();screen.material.map=canvasMap(600,1120,(c,w,h)=>{c.fillStyle='#f5f6ef';c.fillRect(0,0,w,h);c.fillStyle='#304d48';c.font='24px sans-serif';c.fillText('9:41',34,49);c.font='bold 37px Georgia';c.fillText('Fumiriya',38,139);c.fillStyle='#708477';c.font='21px sans-serif';c.fillText('●  Here with you',38,179);c.fillStyle='#e1eadf';c.fillRect(24,233,552,639);c.fillStyle='#64766b';c.font='22px sans-serif';c.fillText(f.speaker==='Fumiriya'?'Fumiriya':'You',46,280);c.fillStyle='#304d48';c.font='32px sans-serif';wrap(c,f.text||'A little promise, just between us.',46,339,500,48);sunflower(c,300,795,24);c.fillStyle='#e6e9e0';c.fillRect(25,970,550,76);c.fillStyle='#88968b';c.font='25px sans-serif';c.fillText('Message…',49,1017);});screen.material.needsUpdate=true;}
  return f;
 }
 function updateOpening(opening,dt,playing){
  if(lastOpeningStage!==opening.stage)boy.resetSecondaryMotion();
  lastOpeningStage=opening.stage;lastStoryTime=null;
  const f=openingFrame(opening),t=f.time,portrait=camera.aspect<.8;
  camera.position.fromArray(f.position);camera.lookAt(...f.target);camera.fov=portrait?65:52;camera.updateProjectionMatrix();
  personStage.visible=f.boy;fadeBoy(f.boyOpacity);boy.relocate(f.boy?[-33.45,.52,-25.68]:[-33.25,.52,-26.1]);
  const resting=new T.Vector3(-33.89,1.31,-25.12),carried=new T.Vector3(-33.62,1.60,-25.40);
  envelope.position.copy(carried).lerp(resting,f.place);envelope.rotation.set(-Math.PI/2,0,-.12);envelope.userData.setOpen(0);
  envelope.visible=f.delivery&&(!f.film||t<10.8);
  const pose=storyPerformance(0);pose.headPitch=.08;pose.eyePitch=.035;pose.smile=.045;
  if(f.boy){pose.deliveryLean=(.25+.75*f.place)*(1-f.release);pose.rightHandTarget=envelope.position.clone().add(new T.Vector3(.12,.025,-.055)).toArray();pose.rightHandWeight=1-f.release;}
  boy.setStoryPose(pose);boy.setSpeaking(false);boy.setSpeechFrame({});boy.update(playing?dt:0);lastSpeaking=false;
  phone.visible=f.phone;phoneGrip.visible=false;phoneGrip.userData.updateArm();
  phone.position.set(.025,-.085,-.77);phone.rotation.set(-.85,-.05,-.08);phone.scale.setScalar(.9);
  if(phoneKey!=='opening'&&f.phone){
   phoneKey='opening';screen.material.map?.dispose();screen.material.map=canvasMap(600,1120,(c,w,h)=>{
    c.fillStyle='#e9f1df';c.fillRect(0,0,w,h);c.fillStyle='#496b52';c.textAlign='center';c.font='90px Georgia';c.fillText('9:41',300,240);
    c.fillStyle='#fcfff6';c.fillRect(40,400,520,260);c.fillStyle='#45604b';c.font='bold 32px sans-serif';c.fillText('Fumiriya',300,465);c.font='28px sans-serif';c.fillText('A message just for you',300,545);c.font='25px sans-serif';c.fillText('♡',300,610);
   });screen.material.needsUpdate=true;
  }
  screen.material.color.setScalar(.50+.50*openingRamp(t,0,1.5));
  heldEnvelope.visible=f.film&&t>=10.8;
  const envelopeLower=openingRamp(t,16.3,18)*.45;
  camera.updateMatrixWorld(true);
  heldEnvelope.position.copy(camera.worldToLocal(resting.clone())).lerp(new T.Vector3(0,-.06-f.extract*.35-envelopeLower,-.66),f.pickup);
  const pickupRotation=camera.getWorldQuaternion(new T.Quaternion()).invert().multiply(envelope.quaternion);
  heldEnvelope.quaternion.copy(pickupRotation).slerp(new T.Quaternion().setFromEuler(new T.Euler(0,0,-.055)),f.pickup);heldEnvelope.scale.setScalar(1-.14*f.pickup);heldEnvelope.userData.setOpen(f.open);
  letter.visible=f.film&&t>=14.2;
  const unfold=openingRamp(t,15.3,17.7);
  letter.scale.setScalar(.86);
  const readingY=.085-(1-T.MathUtils.smoothstep(19.2,18.6,19.3))*.65;
  letter.position.set(-.015,T.MathUtils.lerp(-.15,readingY,openingRamp(t,14.2,17.7)),-.68+.02*unfold);
  camera.updateMatrixWorld(true);
  extractionClip.setFromNormalAndCoplanarPoint(new T.Vector3(0,1,0).applyQuaternion(camera.quaternion),camera.localToWorld(new T.Vector3(0,.025-f.extract*.35,-.66)));
  for(const page of [front,back])page.material.clippingPlanes=[extractionClip];
  letter.rotation.set(-.08+Math.sin(19.2*1.1)*.007,0,-.04+Math.sin(19.2*.7)*.014);
  // One left hand moves from envelope to paper; the right hand peels, draws out,
  // then lowers below the frame. Match the reading grip exactly at handoff.
  const paperContact=letter.position.clone().add(new T.Vector3(-.145,-.12,.004).multiplyScalar(.86).applyQuaternion(letter.quaternion));
  const transfer=openingRamp(t,16,17.5);
  envelopeGrip.visible=f.film&&t>=10.1;
  envelopeGrip.position.copy(heldEnvelope.position).add(new T.Vector3(-.145,-.075,.005).applyQuaternion(heldEnvelope.quaternion)).lerp(paperContact,transfer);
  envelopeGrip.position.y+=Math.sin(transfer*Math.PI)*.035-.55*(1-openingRamp(t,10.1,10.8));
  envelopeGrip.quaternion.copy(heldEnvelope.quaternion).slerp(letter.quaternion,transfer);envelopeGrip.scale.setScalar(.86);envelopeGrip.userData.updateArm();
  const draw=openingRamp(t,13.9,15.2),lower=openingRamp(t,16.6,18);
  openingGrip.visible=f.film&&t>=10.1;
  openingGrip.position.copy(heldEnvelope.position).add(new T.Vector3(.12,.02+f.open*.14,.035)).lerp(letter.position.clone().add(new T.Vector3(.12,.10,.015)),draw);
  openingGrip.position.y-=lower*.65+.55*(1-openingRamp(t,10.1,10.8));openingGrip.rotation.set(0,0,.16*(1-draw));openingGrip.scale.setScalar(.86);openingGrip.userData.updateArm();
  paperGrip.visible=false;paperGrip.userData.updateArm();
  front.material.map=frontPaperMap;
  for(const page of [front,back]){const a=page.geometry.attributes.position;for(let i=0;i<a.count;i++)a.setZ(i,Math.sin(a.getX(i)/.306*Math.PI)*.012+Math.sin(a.getY(i)*12+19.2*1.3)*.001*openingRamp(t,17,18));a.needsUpdate=true;page.geometry.computeVertexNormals();}
  return f;
 }
 return {get ready(){return boy.load();},get active(){return active;},start(){boy.resetSecondaryMotion();lastStoryTime=lastOpeningStage=null;active=true;stage.visible=props.visible=true;},stop(){active=false;stage.visible=props.visible=false;boy.setSpeaking(false);boy.setSpeechFrame({});boy.setStoryPose(null);lastSpeaking=false;},update};
}
