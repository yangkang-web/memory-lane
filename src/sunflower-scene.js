import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createStudent} from './student.js';
import {characters} from './characters.js';
import {letterFront,letterBack,finalThought,storyFrame,storyPerformance} from './sunflower-timeline.js';
import {voicePose} from './student-voice.js';
import voice from './data/sunflower-voice.json';
import {createStorySunflower} from './story-sunflower.js';

function canvasMap(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;return map;}
function sunflower(ctx,x,y,r){ctx.save();ctx.translate(x,y);for(let i=0;i<14;i++){ctx.save();ctx.rotate(i*Math.PI/7);ctx.fillStyle=i%2?'#efbd45':'#e4a936';ctx.beginPath();ctx.ellipse(0,-r*.85,r*.25,r*.66,0,0,Math.PI*2);ctx.fill();ctx.restore();}ctx.fillStyle='#6c4836';ctx.beginPath();ctx.arc(0,0,r*.45,0,Math.PI*2);ctx.fill();ctx.restore();}
function paperMap(lines,back=false){return canvasMap(900,1250,(c,w,h)=>{c.fillStyle='#fff9e9';c.fillRect(0,0,w,h);c.strokeStyle='#e9d4bc';c.lineWidth=3;c.strokeRect(38,38,w-76,h-76);c.fillStyle='#aa8661';c.font='20px sans-serif';c.textAlign='center';c.fillText(back?'A LITTLE SECRET':'TO MY FAVORITE GIRL',w/2,133);c.fillStyle='#524338';c.font='34px Georgia';lines.forEach((line,i)=>c.fillText(line,w/2,270+i*84));sunflower(c,w/2,1010,44);c.fillStyle='#92765d';c.font='italic 25px Georgia';c.fillText('Always, Fumiriya',w/2,1100);c.font='18px Georgia';c.textAlign='left';wrap(c,finalThought,82,1163,736,25);});}
function wrap(c,text,x,y,maxWidth,lineHeight){let line='';for(const word of text.split(' ')){const next=line+word+' ';if(c.measureText(next).width>maxWidth&&line){c.fillText(line,x,y);line=word+' ';y+=lineHeight;}else line=next;}c.fillText(line,x,y);return y+lineHeight;}
export function createSunflowerScene(scene,camera,{sequence=false}={}){
 const stage=new T.Group();stage.name='Sunflower story — user-authored screenplay';stage.visible=false;scene.add(stage);
 const props=new T.Group();props.name='First-person phone and letter';props.visible=false;camera.add(props);scene.add(camera);
 const mat=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.65,...extra});
 function mesh(parent,g,m,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 // Only cropped first-person fingers and a sleeve; no second character or face.
 function grip(parent,x,y,scale=1){
  const hand=new T.Group();hand.position.set(x,y,-.008);hand.scale.setScalar(scale);parent.add(hand);
  const skin=mat('#e2b89c',{roughness:.8}),sleeve=mat('#eee9dc',{roughness:.95});
  const arm=mesh(hand,new RoundedBoxGeometry(.058,.34,.035,3,.016),sleeve,-.026,-.194,-.026);arm.rotation.z=-.1;
  mesh(hand,new RoundedBoxGeometry(.052,.065,.026,3,.015),skin,-.017,-.025,-.016);
  for(let i=0;i<3;i++){
   const finger=mesh(hand,new T.CapsuleGeometry(.0065,.032-i*.003,4,8),skin,.005+i*.011,.006-i*.003,-.019);finger.rotation.z=-.12;
  }
  const thumbPath=new T.CatmullRomCurve3([new T.Vector3(-.029,-.018,.016),new T.Vector3(-.015,.001,.020),new T.Vector3(.008,.012,.022)]);
  const thumb=mesh(hand,new T.TubeGeometry(thumbPath,12,.009,10,false),skin);
  const tip=mesh(hand,new T.SphereGeometry(.009,10,8),skin,.008,.012,.022);tip.userData.frontGrip=true;
  hand.traverse(o=>{if(o.isMesh)o.userData.grip=true;});thumb.userData.frontGrip=true;
  return hand;
 }
 const phone=new T.Group();props.add(phone);
 mesh(phone,new RoundedBoxGeometry(.174,.328,.013,3,.012),mat('#304d48'),0,0,0);
 let phoneKey='';const screen=mesh(phone,new T.PlaneGeometry(.158,.298),new T.MeshBasicMaterial({color:'white',toneMapped:false}),0,0,.0072);
 mesh(phone,new RoundedBoxGeometry(.046,.009,.001,2,.004),mat('#182b29'),0,.144,.008);
 grip(phone,-.06,-.11,.85);
 const letter=new T.Group();props.add(letter);
 const front=mesh(letter,new T.PlaneGeometry(.306,.425,12,16),mat('#ffffff',{map:paperMap(letterFront),side:T.FrontSide}),0,0,.0006);
 const back=mesh(letter,new T.PlaneGeometry(.306,.425,12,16),mat('#ffffff',{map:paperMap(letterBack,true),side:T.FrontSide}),0,0,-.0006);back.rotation.y=Math.PI;
 const paperGrip=grip(props,-.03,-.07,.86);
 for(const page of [front,back]){const a=page.geometry.attributes.position;for(let i=0;i<a.count;i++){a.setZ(i,Math.sin(a.getX(i)/.306*Math.PI)*.009);}page.geometry.computeVertexNormals();}
 props.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;o.material.transparent=true;o.material.opacity=1;o.material.depthTest=false;o.material.depthWrite=false;o.renderOrder=o.userData.frontGrip?102:o.userData.grip?99:100;}});
 const envelope=new T.Group();stage.add(envelope);envelope.position.set(-33.89,1.31,-25.12);envelope.rotation.set(-Math.PI/2,0,-.12);
 mesh(envelope,new RoundedBoxGeometry(.34,.23,.008,2,.005),mat('#e6aeb7'));
 const seal=canvasMap(900,600,c=>{c.fillStyle='#ecc0c7';c.fillRect(0,0,900,600);c.strokeStyle='#c98f9f';c.lineWidth=3;c.beginPath();c.moveTo(0,0);c.lineTo(450,320);c.lineTo(900,0);c.stroke();c.textAlign='center';c.fillStyle='#77515a';c.font='italic 39px Georgia';c.fillText('To my favorite girl',450,460);sunflower(c,450,290,30);});
 mesh(envelope,new T.PlaneGeometry(.335,.225),mat('white',{map:seal}),0,0,.0045);
 const flower=createStorySunflower(stage);
 const personStage=new T.Group();stage.add(personStage);
 const boy=createStudent(personStage,{character:{...characters[0],position:[-33.25,.52,-26.1],yaw:-.44,previewChair:false,chair:{x:-31.4,y:.52,z:-26.6,seatHeight:.46}}});
 let active=false,lastSpeaking=false;
 const fadingMaterials=new Map();
 function fadeBoy(opacity){
  boy.root.traverse(o=>{if(!o.isMesh)return;for(const m of (Array.isArray(o.material)?o.material:[o.material])){
   if(!fadingMaterials.has(m))fadingMaterials.set(m,{opacity:m.opacity,transparent:m.transparent,depthWrite:m.depthWrite});
   const original=fadingMaterials.get(m);m.opacity=original.opacity*opacity;
   const transparent=original.transparent||opacity<1;if(m.transparent!==transparent){m.transparent=transparent;m.needsUpdate=true;}
   m.depthWrite=opacity<1?false:original.depthWrite;
  }});
 }
 function update(time,dt,playing){
  if(!active)return;
  const f=storyFrame(time);camera.position.fromArray(f.position);camera.lookAt(...f.target);
  const portrait=camera.aspect<.8;camera.fov=f.fov+(portrait?13:0);camera.updateProjectionMatrix();
  const line=voice.lines.find(l=>time>=l.start&&time<l.end);const speaking=playing&&!!line;
  if(speaking!==lastSpeaking){boy.setSpeaking(speaking);lastSpeaking=speaking;}
  boy.setStoryPose(storyPerformance(time));
  boy.setSpeechFrame(speaking?voicePose(time,voice.cues):{});boy.update(playing?dt:0);
  // During memories he remains present as the imagined boyfriend, like the storyboard.
  personStage.visible=f.boyOpacity>.001;fadeBoy(f.boyOpacity);
  flower.update(time);
  envelope.visible=f.envelope;phone.visible=f.phone;letter.visible=f.letter||(f.ending&&!sequence);
  const phoneLower=T.MathUtils.smoothstep(time,2.8,4)*(1-T.MathUtils.smoothstep(time,8.6,10))+T.MathUtils.smoothstep(time,11.6,12.5)*(1-T.MathUtils.smoothstep(time,13.7,14.5));
  phone.position.set(.025+phoneLower*.115,-.10-phoneLower*.20-(1-f.phoneLift)*.38+Math.sin(time*1.4)*.002,-.53);
  phone.rotation.set(-.08+Math.sin(time*1.2)*.008,-.05,-.045+Math.sin(time*.8)*.009);
  const lift=T.MathUtils.smoothstep(time,18.6,19.3)*(1-T.MathUtils.smoothstep(time,39.3,40));
  letter.scale.setScalar(f.ending?.29:.86);
  letter.position.set(f.ending?(portrait?.07:.14):-.015,f.ending?-.095:.085-(1-lift)*.65,-.66);
  if(f.ending)letter.position.y-=.18*(1-T.MathUtils.smoothstep(time,63,64));
  letter.rotation.set(-.07+Math.sin(time*1.1)*.012,f.ending?-.16:Math.PI*f.flip,f.ending?.08:-.04+Math.sin(time*.7)*.014);
  paperGrip.visible=f.letter||(f.ending&&!sequence);paperGrip.scale.setScalar(letter.scale.x);
  paperGrip.position.copy(letter.position).add(new T.Vector3(-.145*letter.scale.x,-.155*letter.scale.x,-.008));
  paperGrip.rotation.set(0,Math.sin(f.flip*Math.PI)*.2,letter.rotation.z);
  for(const page of [front,back]){const a=page.geometry.attributes.position;for(let i=0;i<a.count;i++){const x=a.getX(i),y=a.getY(i);a.setZ(i,Math.sin(x/.306*Math.PI)*.009+Math.sin(y*12+time*1.3)*.002+Math.sin(f.flip*Math.PI)*x*x*.7);}a.needsUpdate=true;page.geometry.computeVertexNormals();}
  const key=f.speaker+f.text;
  if(key!==phoneKey&&f.phone){phoneKey=key;screen.material.map?.dispose();screen.material.map=canvasMap(600,1120,(c,w,h)=>{c.fillStyle='#f5f6ef';c.fillRect(0,0,w,h);c.fillStyle='#304d48';c.font='24px sans-serif';c.fillText('9:41',34,49);c.font='bold 37px Georgia';c.fillText('Fumiriya',38,139);c.fillStyle='#708477';c.font='21px sans-serif';c.fillText('●  Here with you',38,179);c.fillStyle='#e1eadf';c.fillRect(24,233,552,639);c.fillStyle='#64766b';c.font='22px sans-serif';c.fillText(f.speaker==='Fumiriya'?'Fumiriya':'You',46,280);c.fillStyle='#304d48';c.font='32px sans-serif';wrap(c,f.text||'A little promise, just between us.',46,339,500,48);sunflower(c,300,795,24);c.fillStyle='#e6e9e0';c.fillRect(25,970,550,76);c.fillStyle='#88968b';c.font='25px sans-serif';c.fillText('Message…',49,1017);});screen.material.needsUpdate=true;}
  return f;
 }
 return {get ready(){return boy.load();},get active(){return active;},start(){active=true;stage.visible=props.visible=true;},stop(){active=false;stage.visible=props.visible=false;boy.setSpeaking(false);boy.setSpeechFrame({});boy.setStoryPose(null);lastSpeaking=false;},update};
}
