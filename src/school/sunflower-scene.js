import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createStudent} from './student.js';
import {characters} from './characters.js';
import {letterFront,letterBack,finalThought,storyFrame} from './sunflower-timeline.js';
import {voicePose} from './student-voice.js';
import voice from './data/sunflower-voice.json';

function canvasMap(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;return map;}
function sunflower(ctx,x,y,r){ctx.save();ctx.translate(x,y);for(let i=0;i<14;i++){ctx.save();ctx.rotate(i*Math.PI/7);ctx.fillStyle=i%2?'#efbd45':'#e4a936';ctx.beginPath();ctx.ellipse(0,-r*.85,r*.25,r*.66,0,0,Math.PI*2);ctx.fill();ctx.restore();}ctx.fillStyle='#6c4836';ctx.beginPath();ctx.arc(0,0,r*.45,0,Math.PI*2);ctx.fill();ctx.restore();}
function paperMap(lines,back=false){return canvasMap(900,1250,(c,w,h)=>{c.fillStyle='#fff9e9';c.fillRect(0,0,w,h);c.strokeStyle='#e9d4bc';c.lineWidth=3;c.strokeRect(38,38,w-76,h-76);c.fillStyle='#aa8661';c.font='20px sans-serif';c.textAlign='center';c.fillText(back?'A LITTLE SECRET':'TO MY FAVORITE GIRL',w/2,133);c.fillStyle='#524338';c.font='34px Georgia';lines.forEach((line,i)=>c.fillText(line,w/2,270+i*84));sunflower(c,w/2,1010,44);c.fillStyle='#92765d';c.font='italic 25px Georgia';c.fillText('Always, Fumiriya',w/2,1100);c.font='18px Georgia';c.textAlign='left';wrap(c,finalThought,82,1163,736,25);});}
function wrap(c,text,x,y,maxWidth,lineHeight){let line='';for(const word of text.split(' ')){const next=line+word+' ';if(c.measureText(next).width>maxWidth&&line){c.fillText(line,x,y);line=word+' ';y+=lineHeight;}else line=next;}c.fillText(line,x,y);return y+lineHeight;}
export function createSunflowerScene(scene,camera,{sequence=false}={}){
 const stage=new T.Group();stage.name='Sunflower story — user-authored screenplay';stage.visible=false;scene.add(stage);
 const props=new T.Group();props.name='First-person phone and letter';props.visible=false;camera.add(props);scene.add(camera);
 const mat=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.65,...extra});
 function mesh(parent,g,m,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 const phone=new T.Group();props.add(phone);
 mesh(phone,new RoundedBoxGeometry(.174,.328,.013,3,.012),mat('#304d48'),0,0,0);
 let phoneKey='';const screen=mesh(phone,new T.PlaneGeometry(.158,.298),new T.MeshBasicMaterial({color:'white',toneMapped:false}),0,0,.0072);
 mesh(phone,new RoundedBoxGeometry(.046,.009,.001,2,.004),mat('#182b29'),0,.144,.008);
 const letter=new T.Group();props.add(letter);
 const front=mesh(letter,new T.PlaneGeometry(.306,.425,12,16),mat('#ffffff',{map:paperMap(letterFront),side:T.FrontSide}),0,0,.0006);
 const back=mesh(letter,new T.PlaneGeometry(.306,.425,12,16),mat('#ffffff',{map:paperMap(letterBack,true),side:T.FrontSide}),0,0,-.0006);back.rotation.y=Math.PI;
 for(const page of [front,back]){const a=page.geometry.attributes.position;for(let i=0;i<a.count;i++){a.setZ(i,Math.sin(a.getX(i)/.306*Math.PI)*.009);}page.geometry.computeVertexNormals();}
 props.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;o.material.transparent=true;o.material.opacity=1;o.material.depthTest=false;o.material.depthWrite=false;o.renderOrder=100;}});
 const envelope=new T.Group();stage.add(envelope);envelope.position.set(-33.89,1.31,-25.12);envelope.rotation.set(-Math.PI/2,0,-.12);
 mesh(envelope,new RoundedBoxGeometry(.34,.23,.008,2,.005),mat('#e6aeb7'));
 const seal=canvasMap(900,600,c=>{c.fillStyle='#ecc0c7';c.fillRect(0,0,900,600);c.strokeStyle='#c98f9f';c.lineWidth=3;c.beginPath();c.moveTo(0,0);c.lineTo(450,320);c.lineTo(900,0);c.stroke();c.textAlign='center';c.fillStyle='#77515a';c.font='italic 39px Georgia';c.fillText('To my favorite girl',450,460);sunflower(c,450,290,30);});
 mesh(envelope,new T.PlaneGeometry(.335,.225),mat('white',{map:seal}),0,0,.0045);
 const flower=new T.Group();flower.position.set(-36.68,1.33,-24.35);stage.add(flower);
 mesh(flower,new T.CylinderGeometry(.09,.067,.18,20),mat('#d7e1ce'),0,.09,0);
 const stem=mesh(flower,new T.CylinderGeometry(.009,.012,.49,8),mat('#65834f'),0,.4,0);
 const blossom=new T.Group();blossom.position.set(0,.66,0);blossom.rotation.y=.7;flower.add(blossom);
 for(let i=0;i<15;i++){const a=i/15*Math.PI*2;const petal=mesh(blossom,new T.SphereGeometry(1,10,8),mat(i%2?'#f7c95c':'#eeb943'),Math.sin(a)*.079,Math.cos(a)*.079,0);petal.scale.set(.024,.064,.009);petal.rotation.z=-a;}
 const center=mesh(blossom,new T.SphereGeometry(.046,16,12),mat('#73523b'),0,0,.012);center.scale.z=.4;
 for(const side of [-1,1]){const leaf=mesh(flower,new T.SphereGeometry(1,10,8),mat('#7d9957'),side*.055,.36,0);leaf.scale.set(.08,.023,.035);leaf.rotation.z=side*.5;}
 const personStage=new T.Group();stage.add(personStage);
 const boy=createStudent(personStage,{character:{...characters[0],position:[-33.25,.52,-26.1],yaw:-.44,previewChair:false,chair:{x:-31.4,y:.52,z:-26.6,seatHeight:.46}}});
 let active=false,lastSpeaking=false;
 function update(time,dt,playing){
  if(!active)return;
  const f=storyFrame(time);camera.position.fromArray(f.position);camera.lookAt(...f.target);
  const portrait=camera.aspect<.8;camera.fov=portrait?65:52;
  if(sequence&&time>=55.3){
   const blend=T.MathUtils.smoothstep(time,55.3,59.6);
   camera.position.lerp(new T.Vector3(-35.2,1.4,-31.15),blend);
   camera.lookAt(-26.271,2.94,-31.15);camera.fov=T.MathUtils.lerp(camera.fov,22.2,blend);
  }
  camera.updateProjectionMatrix();
  const line=voice.lines.find(l=>time>=l.start&&time<l.end);const speaking=playing&&!!line;
  if(speaking!==lastSpeaking){boy.setSpeaking(speaking);lastSpeaking=speaking;}
  boy.setSpeechFrame(speaking?voicePose(time,voice.cues):{});boy.update(playing?dt:0);
  // During memories he remains present as the imagined boyfriend, like the storyboard.
  personStage.visible=time<14.7||time>=45;
  flower.rotation.z=Math.sin(time*1.4)*.025;stem.rotation.z=Math.sin(time*1.4)*.012;
  envelope.visible=f.envelope;phone.visible=f.phone;letter.visible=f.letter||(f.ending&&!sequence);
  const lookingAtBoy=(time>=3.3&&time<9.3)||(time>=12&&time<14);
  phone.position.set(lookingAtBoy?.14:.025,lookingAtBoy?-.30:-.10,-.53);phone.rotation.set(-.08,-.05,-.045);
  const lift=T.MathUtils.smoothstep(time,18.6,19.3)*(1-T.MathUtils.smoothstep(time,39.3,40));
  letter.scale.setScalar(f.ending?.65:1);
  letter.position.set(f.ending?(portrait?.11:.30):0,f.ending?-.01:.055-(1-lift)*.65,-.66);
  letter.rotation.set(.015,f.ending?-.16:Math.PI*f.flip,f.ending?.08:-.025+Math.sin(time*.7)*.008);
  const key=f.speaker+f.text;
  if(key!==phoneKey&&f.phone){phoneKey=key;screen.material.map?.dispose();screen.material.map=canvasMap(600,1120,(c,w,h)=>{c.fillStyle='#f5f6ef';c.fillRect(0,0,w,h);c.fillStyle='#304d48';c.font='24px sans-serif';c.fillText('9:41',34,49);c.font='bold 37px Georgia';c.fillText('Fumiriya',38,139);c.fillStyle='#708477';c.font='21px sans-serif';c.fillText('●  Here with you',38,179);c.fillStyle='#e1eadf';c.fillRect(24,233,552,639);c.fillStyle='#64766b';c.font='22px sans-serif';c.fillText(f.speaker==='Fumiriya'?'Fumiriya':'You',46,280);c.fillStyle='#304d48';c.font='32px sans-serif';wrap(c,f.text||'A little promise, just between us.',46,339,500,48);sunflower(c,300,795,24);c.fillStyle='#e6e9e0';c.fillRect(25,970,550,76);c.fillStyle='#88968b';c.font='25px sans-serif';c.fillText('Message…',49,1017);});screen.material.needsUpdate=true;}
  return f;
 }
 return {get ready(){return boy.load();},get active(){return active;},start(){active=true;stage.visible=props.visible=true;},stop(){active=false;stage.visible=props.visible=false;boy.setSpeaking(false);boy.setSpeechFrame({});lastSpeaking=false;},update};
}
