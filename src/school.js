import * as T from 'three';
import { createStudent } from './student.js';
import { addCampusArchitecture } from './campus-architecture.js';
import { buildSchoolInterior, interiorStops } from './school-interior.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mapWallUVs } from './wall-materials.js';
import { springSky } from './spring-sky.js';
import { addCherryTrees } from './cherry-blossoms.js';
import { addClassroomReflections } from './classroom-reflections.js';

export const locations = [
  {id:'teaching',title:'Westbridge Hall',en:'ACADEMIC BUILDING',point:[-14,7,-23],label:[-14,21,-23],view:[18,25,27]},
  {id:'library',title:'Oak Library',en:'CAMPUS LIBRARY',point:[-32,4,0],label:[-32,12,0],view:[20,20,27]},
  {id:'sports',title:'Athletics Field',en:'SPORTS GROUND',point:[25,0,-6],label:[25,2,-8],view:[26,38,35]},
  {id:'square',title:'The Quad',en:'GINKGO SQUARE',point:[-5,0,7],label:[-5,3,9],view:[23,25,29]},
];
const v=(x,y,z)=>new T.Vector3(x,y,z);

export function createCampus(canvas,labelRoot,onZone=()=>{}) {
  const scene=new T.Scene(),daySky=springSky(),duskSky=springSky(true);
  scene.background=daySky;scene.fog=new T.Fog('#cbe9f5',220,450);
  const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
  const camera=new T.PerspectiveCamera(39,1,.1,500);
  const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.07;controls.maxPolarAngle=Math.PI*.47;controls.minDistance=15;controls.maxDistance=450;controls.target.set(0,0,0);
  const hemi=new T.HemisphereLight('#e6f5ff','#f4e8cb',2.5);scene.add(hemi);
  const sun=new T.DirectionalLight('#fff4d7',3.5);sun.position.set(-40,70,35);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-75,right:75,top:75,bottom:-75,near:1,far:180});sun.shadow.normalBias=.13;sun.shadow.bias=-.0002;scene.add(sun);
  const palette={cream:'#f3e9ce',wall:'#e4d6b7',brick:'#9b5546',roof:'#495964',glass:'#688c96',frame:'#e9ead8',wood:'#b38a5c',green:'#7d9b63',dark:'#445e50',path:'#dedbc5'};
  const mats=new Map(), batches=new Map(),colliders=[];
  const material=color=>{if(color?.isMaterial)return color;if(!mats.has(color))mats.set(color,new T.MeshStandardMaterial({color,roughness:.85}));return mats.get(color);};
  // Static scenery is merged by material to keep the large campus inexpensive to render.
  function mesh(geo,color,x=0,y=0,z=0,rotation=0){if(geo.index){const source=geo;geo=source.toNonIndexed();source.dispose();}geo.rotateY(rotation);geo.translate(x,y,z);mapWallUVs(geo,color);if(!batches.has(color))batches.set(color,[]);batches.get(color).push(geo);}
  const box=(w,h,d,color,x,y,z,r=0)=>mesh(new T.BoxGeometry(w,h,d),color,x,y,z,r);
  const cyl=(rt,rb,h,color,x,y,z,n=12)=>mesh(new T.CylinderGeometry(rt,rb,h,n),color,x,y,z);
  const sphere=(r,color,x,y,z,sx=1,sy=1,sz=1)=>{const g=new T.IcosahedronGeometry(r,1);g.scale(sx,sy,sz);mesh(g,color,x,y,z);};
  const block=(x,z,w,d)=>colliders.push({x,z,w:w/2+.45,d:d/2+.45});
  function line(points,color='#f4eedb',width=.07){const curve=new T.CatmullRomCurve3(points.map(p=>v(...p)));mesh(new T.TubeGeometry(curve,Math.max(4,points.length*3),width,5,false),color);}
  function textSign(text,w,h,x,y,z,bg='#365c4c',fg='#fff1ce'){
    const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle=fg;ctx.font='600 90px Georgia, serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,128,960);
    const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;
    const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:texture}));m.position.set(x,y,z);scene.add(m);return m;
  }
  // A raised model base gives the entire campus a clear, crafted silhouette.
  box(96,1.5,80,'#b9bea1',0,-1,0);box(95.8,.35,79.8,'#9eaf7c',0,-.08,0);
  box(91,.13,75,palette.path,0,.12,0);
  box(88,.15,72,'#94ac75',0,.25,0);
  box(9,.08,71,palette.path,-6,.36,0);
  box(85,.08,5,palette.path,0,.37,-14);
  box(85,.08,4.4,palette.path,0,.37,18);
  box(5,.08,70,palette.path,-23,.36,0);
  box(4,.08,70,palette.path,43,.36,0);
  box(85,.08,2,palette.path,0,.36,-36);
  const floor=new T.Mesh(new T.PlaneGeometry(2000,2000),material('#e9e9dc'));floor.rotation.x=-Math.PI/2;floor.position.y=-1.8;floor.receiveShadow=true;scene.add(floor);

  function window(x,y,z,w=1.8,h=2){box(w+.24,h+.24,.18,palette.frame,x,y,z);box(w,h,.2,palette.glass,x,y,z+.09);box(.07,h,.23,palette.frame,x,y,z+.17);box(w,.08,.23,palette.frame,x,y-.25,z+.17);box(w+.4,.13,.48,palette.cream,x,y-h/2-.12,z+.14);}
  function building(x,z,w,d,h,floors,name){
    if(name!=='main'){box(w+.6,.7,d+.6,'#c4c0aa',x,.65,z);box(w,h,d,palette.brick,x,h/2+.8,z);box(w,.9,d+.08,palette.brick,x,1.25,z);}
    for(let f=name==='main'?1:0;f<floors;f++){
      const y=2.9+f*3.2;
      for(let dx=-w/2+2;dx<w/2-1;dx+=3.2){if(Math.abs(dx)<2.5&&name==='main')continue;window(x+dx,y,z+d/2+.05);window(x+dx,y,z-d/2-.24);}
      box(w+.15,.16,d+.15,palette.brick,x,4.5+f*3.2,z);
      for(let dz=-d/2+2;dz<d/2-1;dz+=3){box(.2,2,1.6,palette.glass,x+w/2+.05,y,z+dz);box(.2,2,1.6,palette.glass,x-w/2-.05,y,z+dz);}
    }
    box(w+.8,.35,d+.8,palette.frame,x,h+.9,z);box(w+.4,.32,d+.4,palette.roof,x,h+1.2,z);
    box(w-.6,.3,.3,palette.frame,x,h+1.5,z+d/2);box(w-.6,.3,.3,palette.frame,x,h+1.5,z-d/2);
    for(const dx of [-w/2,w/2])box(.3,.3,d,palette.frame,x+dx,h+1.5,z);
    if(name!=='main')block(x,z,w,d);
  }
  building(-14,-26.5,46,15,11,3,'main');
  // Central clock tower, glazed entrance and a sheltered colonnade.
  box(8.1,.5,12.3,palette.cream,-14,14.8,-23.8);box(8,.5,12.2,palette.roof,-14,15.25,-23.8);

  box(8.8,.35,3,palette.cream,-14,5.3,-16.7);
  for(let i=0;i<3;i++)box(9+i*.5,.16,2+i*.5,'#c9c6b2',-14,.5-i*.14,-16.2+i*.15);
  textSign('WESTBRIDGE ACADEMY',5.8,1.2,-14,10.8,-17.92,palette.brick);
  const face=new T.CircleGeometry(1.2,48);face.rotateX(0);mesh(face,palette.cream,-14,13,-17.93);
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;box(.07,.15,.04,palette.dark,-14+Math.sin(a)*.99,13+Math.cos(a)*.99,-17.89);}
  box(.08,.72,.07,palette.dark,-14,13.3,-17.85);box(.6,.08,.07,palette.dark,-13.74,13,-17.85);

  building(-33,0,13,19,7.8,2,'library');
  box(14,.6,20,palette.brick,-33,9,0);box(10,5,.3,palette.glass,-33,3.7,9.66);
  for(let dx=-4.8;dx<=4.8;dx+=1.6)box(.13,5.2,.4,palette.frame,-33+dx,3.7,9.9);
  box(14,.25,3,palette.cream,-33,6.5,10.3);textSign('LIBRARY',5,.95,-33,7.5,10.02);
  building(-32,26,17,10,4.5,1,'canteen');
  box(18,.6,11,palette.brick,-32,5.8,26);textSign('DINING HALL',5,1,-32,4.35,31.13);

  // Paved courtyard, planting beds and a small sculptural fountain.
  box(23,.1,23,'#e6e1cc',-7,.44,2);
  for(let x=-17;x<=3;x+=2)box(.035,.015,22,'#cacbb8',x,.5,2);
  for(let z=-8;z<=12;z+=2)box(22,.015,.035,'#cacbb8',-7,.5,z);
  cyl(3.6,3.8,.4,'#b9c1ac',-6,.7,3,48);cyl(3.3,3.3,.15,'#7ca9a5',-6,.94,3,48);cyl(.8,1.1,.6,palette.cream,-6,1.23,3,24);
  const sculpture=new T.Mesh(new T.TorusKnotGeometry(.85,.15,72,8,2,3),new T.MeshStandardMaterial({color:'#bb995a',roughness:.38,metalness:.55}));sculpture.position.set(-6,2.5,3);scene.add(sculpture);block(-6,3,7.4,7.4);
  cyl(.08,.1,12,'#a5aaa0',-6,6.6,-9);box(3.3,1.8,.08,'#345c4c',-4.3,11.4,-9);textSign('W',1.1,1.2,-4.3,11.4,-8.95,'#345c4c','#f0e9d7');cyl(.16,.16,.3,'#d9b55b',-6,12.7,-9);block(-6,-9,.5,.5);
  // Athletic track: capsule perimeter, six lanes, striped pitch and field markings.
  function capsule(radius,half,color,y){const s=new T.Shape();s.moveTo(-radius,-half);s.absarc(0,-half,radius,Math.PI,Math.PI*2,false);s.lineTo(radius,half);s.absarc(0,half,radius,0,Math.PI,false);s.closePath();const g=new T.ShapeGeometry(s,64);g.rotateX(-Math.PI/2);mesh(g,color,25,y,-7);}
  capsule(14,9,'#c17c65',.46);capsule(10.5,9,'#77996a',.49);
  for(let lane=0;lane<6;lane++){
    const r=10.7+lane*.56,pts=[];
    for(let j=0;j<=36;j++){const a=Math.PI+j/36*Math.PI;pts.push([25+Math.cos(a)*r,.5,-7+(-9+Math.sin(a)*r)]);}
    for(let j=0;j<=36;j++){const a=j/36*Math.PI;pts.push([25+Math.cos(a)*r,.5,-7+(9+Math.sin(a)*r)]);}
    pts.push(pts[0]);line(pts,'#edd7b7',.035);
  }
  for(let i=0;i<8;i++)box(17,.025,3.5,i%2?'#83a86d':'#749b65',25,.53,-19.25+i*3.5);
  const pitchOutline=[ [16.5,.58,-21],[33.5,.58,-21],[33.5,.58,7],[16.5,.58,7],[16.5,.58,-21] ];
  // Straight segments avoid rounding the rectangular sports markings.
  function straight(points,color='#ecebd1',r=.045){for(let i=0;i<points.length-1;i++){const a=v(...points[i]),b=v(...points[i+1]);const g=new T.CylinderGeometry(r,r,a.distanceTo(b),5);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(v(0,1,0),b.clone().sub(a).normalize()));g.translate(...a.add(b).multiplyScalar(.5).toArray());mesh(g,color);}}
  straight(pitchOutline);straight([[16.5,.58,-7],[33.5,.58,-7]]);
  const center=[];for(let i=0;i<=64;i++){const a=i/64*Math.PI*2;center.push([25+Math.cos(a)*3,.58,-7+Math.sin(a)*3]);}line(center,'#ecebd1',.045);
  for(const z of [-21,7]){const sign=z<0?1:-1;straight([[20.5,.58,z],[20.5,.58,z+sign*4.5],[29.5,.58,z+sign*4.5],[29.5,.58,z]]);const back=z-sign*1.3;
    straight([[22.4,.6,z],[22.4,2.7,z],[27.6,2.7,z],[27.6,.6,z]],'#f2efdb',.09);
    straight([[22.4,.6,back],[22.4,2.7,z],[27.6,2.7,z],[27.6,.6,back]],'#dddcc8',.065);
    for(let x=22.4;x<=27.7;x+=.4)straight([[x,.6,back],[x,2.7,z]],'#e2e0cb',.015);
    for(let y=.8;y<2.7;y+=.3)straight([[22.4,y,back+(z-back)*(y-.6)/2.1],[27.6,y,back+(z-back)*(y-.6)/2.1]],'#e2e0cb',.015);
  }
  for(let i=0;i<5;i++)straight([[35.5,.56,2+i*.65],[39,.56,2+i*.65]],'#f3dfbc',.04);
  // Basketball court and both hoops.
  box(25,.08,13,'#c38866',24,.46,26);box(22,.03,11,'#789a90',24,.52,26);
  straight([[13,.57,20.5],[35,.57,20.5],[35,.57,31.5],[13,.57,31.5],[13,.57,20.5]]);straight([[24,.57,20.5],[24,.57,31.5]]);
  const hoopCircle=[];for(let i=0;i<=48;i++){const a=i/48*Math.PI*2;hoopCircle.push([24+Math.cos(a)*1.9,.57,26+Math.sin(a)*1.9]);}line(hoopCircle,'#ecebd1',.045);
  for(const x of [13,35]){const s=x<24?1:-1;box(4,.02,4.5,'#c38866',x+s*2,.55,26);straight([[x,.59,23.75],[x+s*4,.59,23.75],[x+s*4,.59,28.25],[x,.59,28.25]]);box(.16,3.9,.16,palette.dark,x-s*.65,2.4,26);box(1.4,.15,.15,palette.dark,x,4.25,26);box(.12,1.25,2,'#ececdf',x+s*.5,4.4,26);box(.14,.6,.8,'#718f8c',x+s*.58,4.3,26);const ring=new T.TorusGeometry(.35,.045,6,24);ring.rotateX(Math.PI/2);mesh(ring,'#c87045',x+s*.95,3.9,26);}
  // Bleachers along the east side of the track.
  for(let i=0;i<3;i++){box(1.1,.45+i*.4,16,'#c8c4ad',40+i*.9,(.45+i*.4)/2+.4,-5);box(.7,.12,15,'#68897c',40+i*.9,.9+i*.4,-5);}
  // Trees use deterministic positions and shared materials; no downloaded assets.
  let seed=72;const rand=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
  const cherryOrigins=[];
  function tree(x,z,scale=1,gold=false,blossom=false){
    if(blossom){
      cherryOrigins.push({x,z,scale,ground:.11,seed:72+cherryOrigins.length*97});block(x,z,.7,.7);
      // Preserve the established random sequence for the other campus trees.
      for(let i=0;i<240;i++)rand();
      return;
    }
    const colors=gold?['#beac5f','#d1bb68','#a9a55b']:['#93b779','#afd08b','#c2dc9d'];cyl(.14*scale,.22*scale,3*scale,'#958368',x,1.8*scale,z,7);
    for(let i=0;i<4;i++){const a=i*2.4;const r=i===3?0:.85*scale;sphere((1.35+rand()*.35)*scale,colors[i%3],x+Math.cos(a)*r,(3.6+(i===3?.8:0))*scale,z+Math.sin(a)*r,1,.95,1);}block(x,z,.7,.7);}
  for(let x=-41;x<=40;x+=6){tree(x,-38,.72+rand()*.12,false,((x+41)/6)%2===0);if(x<-13||x>6)tree(x,35,.85+rand()*.15);}
  for(let z=-27;z<=28;z+=7){if(z>-19)tree(-43,z,.95+rand()*.2);tree(44,z,.85+rand()*.1);}
  for(const [x,z]of[[-19,-7],[4,-7],[-19,10],[4,10],[-15,23],[2,23],[-15,31],[2,31]]){box(3.4,.35,3.4,palette.cream,x,.6,z);box(3,.15,3,'#8caa71',x,.82,z);tree(x,z,.95,true);}
  function bench(x,z,rotation=0){const parts=[[-.8,.5,0,.12,1,.5],[.8,.5,0,.12,1,.5],[0,.85,0,2.3,.16,.7],[0,1.35,-.28,2.3,.7,.12]];for(const [dx,y,dz,w,h,d]of parts){const px=x+dx*Math.cos(rotation)+dz*Math.sin(rotation),pz=z-dx*Math.sin(rotation)+dz*Math.cos(rotation);box(w,h,d,y>.7?palette.wood:palette.dark,px,y,pz,rotation);}block(x,z,2.3,1);}
  for(const z of [-4,8]){bench(-17,z,Math.PI/2);bench(3,z,-Math.PI/2);}bench(-25,15);bench(-36,15);bench(11,18,Math.PI);bench(32,18,Math.PI);
  function lamp(x,z){cyl(.06,.09,3.8,palette.dark,x,2.25,z,8);box(.8,.12,.5,palette.dark,x,4.2,z);box(.65,.06,.4,'#f8e7b5',x,4.11,z);}
  for(let z=-10;z<34;z+=10){lamp(-11.2,z);lamp(-.8,z);}
  for(const z of [-11,16])for(let x=13;x<40;x+=12)lamp(x,z);
  // Small flower beds, pergola and paths give the model a lived-in scale.
  for(const x of [-20,7])for(let z=-9;z<14;z+=2){box(1.1,.55,1.5,'#70905c',x,.7,z);if(z%3===0)sphere(.17,'#e8c67e',x,1.1,z);}
  for(let z=21;z<=30;z+=3)for(const x of [-21,-17])box(.17,2.8,.17,palette.wood,x,1.9,z);
  for(let z=20;z<=31;z+=.7)box(5,.16,.2,palette.wood,-19,3.4,z);
  // Low boundary fence, entrance gate and school sign.
  for(const x of [-45.5,45.5]){box(.2,1.2,74,palette.frame,x,1.2,0);box(.25,.12,74,palette.dark,x,1.9,0);for(let z=-36;z<=36;z+=3)box(.32,1.9,.32,palette.frame,x,1.35,z);}
  for(const [a,b]of[[-45,-13],[2,45]]){box(b-a,.7,.35,palette.wall,(a+b)/2,.85,37);box(b-a,.12,.4,palette.dark,(a+b)/2,1.7,37);for(let x=a;x<=b;x+=1)box(.07,.8,.07,palette.dark,x,1.3,37);}

  box(5,3.5,4,palette.cream,6,2.1,34.8);box(5.6,.25,4.6,palette.roof,6,4,34.8);box(2.8,1.5,.14,palette.glass,6,2.6,36.85);block(6,34.8,5,4);
  box(13,.1,5,'#cacbb7',-5.5,.38,38);for(let i=0;i<8;i++)box(.65,.02,3,'#eeeada',-10.5+i*1.45,.45,38);
  const campusCherries=addCherryTrees(scene,cherryOrigins);
  const blossomMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const interior=buildSchoolInterior({scene,box,cyl,material,textSign,block});
  addCampusArchitecture({box,cyl,mesh,block,textSign});
  for(const [color,geos]of batches){const merged=mergeGeometries(geos,false);const m=new T.Mesh(merged,material(color));m.castShadow=true;m.receiveShadow=true;scene.add(m);geos.forEach(g=>g.dispose());}
  addClassroomReflections(renderer,scene);
  const student=createStudent(scene,{reducedMotion:blossomMotion.matches});
  const studentDelta=new T.Vector3();
  let viewingStudent=false;
  const labelNodes=locations.map(p=>{const el=document.createElement('div');el.className='map-label';el.textContent=p.title;labelRoot.append(el);return{el,pos:v(...p.label)};});
  let width=0,height=0,walking=false,labels=true,transition=null,yaw=0,pitch=0,drag=null,sunset=false;
  const keys=new Set();let previousTime=performance.now();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function home(){const scale=width<700?Math.max(1.45,.92/camera.aspect):1;return{position:v(99,104,126).multiplyScalar(scale),target:v(0,0,0)};}
  function tween(position,target){transition={start:performance.now(),from:camera.position.clone(),to:position,fromTarget:controls.target.clone(),target};if(reduced){camera.position.copy(position);controls.target.copy(target);transition=null;controls.update();}}
  function studentFrame(){const target=student.root.position.clone().add(v(0,width<700?.7:1.05,0));return{target,position:target.clone().add(v(width<700?.5:3,1.25,4.8).multiplyScalar(width<700?1.55:1))};}
  function resize(){width=canvas.clientWidth;height=canvas.clientHeight;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();if(viewingStudent){const f=studentFrame();transition=null;camera.position.copy(f.position);controls.target.copy(f.target);controls.update();}if(!walking&&!transition&&!viewingStudent){const h=home();camera.position.copy(h.position);controls.target.copy(h.target);controls.update();}}
  resize();addEventListener('resize',resize);
  controls.addEventListener('start',()=>{transition=null;});
  canvas.addEventListener('pointerdown',e=>{if(walking){drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);}});
  canvas.addEventListener('pointermove',e=>{if(walking&&drag){yaw-=(e.clientX-drag.x)*.004;pitch=T.MathUtils.clamp(pitch-(e.clientY-drag.y)*.003,-1.15,1.15);drag={x:e.clientX,y:e.clientY};}});
  for(const event of ['pointerup','pointercancel'])canvas.addEventListener(event,()=>{drag=null;});
  const movementKeys=['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'];
  addEventListener('keydown',e=>{if(walking&&movementKeys.includes(e.key.toLowerCase())){e.preventDefault();keys.add(e.key.toLowerCase());}});
  addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>{keys.clear();drag=null;});
  const valid=(x,z)=>Math.abs(x)<44.5&&Math.abs(z)<39.5&&interior.canOccupy(x,z)&&!colliders.some(c=>Math.abs(x-c.x)<c.w&&Math.abs(z-c.z)<c.d);
  function animate(){requestAnimationFrame(animate);const now=performance.now(),dt=Math.min((now-previousTime)/1000,.05);previousTime=now;interior.update(dt,camera.position,walking);campusCherries.update(dt,camera.position,blossomMotion.matches);
    studentDelta.copy(student.root.position);student.update(dt);studentDelta.subVectors(student.root.position,studentDelta);
    if(viewingStudent&&!walking){
      if(transition){transition.target.add(studentDelta);transition.to.add(studentDelta);}
      else{camera.position.add(studentDelta);controls.target.add(studentDelta);}
    }
    const indoors=walking&&camera.position.z< -19&&camera.position.z> -34&&camera.position.x> -37&&camera.position.x<9;
    hemi.intensity=T.MathUtils.damp(hemi.intensity,indoors?(sunset?.85:1.02):(sunset?1.9:2.5),5,dt);
    renderer.toneMappingExposure=T.MathUtils.damp(renderer.toneMappingExposure,indoors?1.1:1.25,5,dt);
    if(walking){let dx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));let dz=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));const len=Math.hypot(dx,dz)||1;const speed=camera.position.z< -16?2.8:5;dx=dx/len*dt*speed;dz=dz/len*dt*speed;const mx=dx*Math.cos(yaw)+dz*Math.sin(yaw),mz=-dx*Math.sin(yaw)+dz*Math.cos(yaw);if(valid(camera.position.x+mx,camera.position.z))camera.position.x+=mx;if(valid(camera.position.x,camera.position.z+mz))camera.position.z+=mz;camera.rotation.set(pitch,yaw,0,'YXZ');onZone(interior.zone(camera.position));}
    else if(transition){let t=Math.min(1,(performance.now()-transition.start)/1100);t=t*t*(3-2*t);camera.position.lerpVectors(transition.from,transition.to,t);controls.target.lerpVectors(transition.fromTarget,transition.target,t);controls.update();if(t>=1)transition=null;}else controls.update();
    labelNodes.forEach(({el,pos})=>{const p=pos.clone().project(camera);el.style.display=labels&&!walking&&!viewingStudent&&p.z<1&&Math.abs(p.x)<1&&Math.abs(p.y)<1?'block':'none';el.style.transform=`translate(${(p.x*.5+.5)*width}px,${(-p.y*.5+.5)*height}px) translate(-50%,-100%)`;});scene.fog.near=walking?150:camera.position.distanceTo(controls.target)+90;scene.fog.far=scene.fog.near+200;renderer.render(scene,camera);
  }animate();
  return {
    overview(){viewingStudent=false;controls.minDistance=15;controls.maxDistance=450;const h=home();tween(h.position,h.target);},
    focus(id){viewingStudent=false;controls.minDistance=15;controls.maxDistance=450;const p=locations.find(p=>p.id===id);if(p){const target=v(...p.point);const offset=v(...p.view).multiplyScalar(width<700?1.55:1);tween(target.clone().add(offset),target);}},
    setWalking(value){viewingStudent=false;controls.minDistance=15;controls.maxDistance=450;if(walking===value)return;walking=value;transition=null;controls.enabled=!value;camera.fov=value?68:39;camera.updateProjectionMatrix();keys.clear();drag=null;if(value){camera.position.set(-5.5,2.15,38);yaw=0;pitch=0;}else{camera.rotation.set(0,0,0);const h=home();camera.position.copy(h.position);controls.target.copy(h.target);controls.update();}},
    visit(id){const stop=interiorStops.find(s=>s.id===id);if(!stop)return;camera.position.set(...(width<700&&stop.compactPosition?stop.compactPosition:stop.position));yaw=width<700&&stop.compactYaw!==undefined?stop.compactYaw:stop.yaw;pitch=stop.pitch||0;camera.fov=stop.fov?(width<700?68:stop.fov):68;camera.updateProjectionMatrix();keys.clear();drag=null;interior.update(1,camera.position,true);},
    focusStudent(){viewingStudent=true;controls.minDistance=2.8;controls.maxDistance=18;camera.fov=39;camera.updateProjectionMatrix();const f=studentFrame();tween(f.position,f.target);},
    setStudentAction(value){student.setAction(value);},
    get studentAction(){return student.action;},
    moveKey(key,value){if(value)keys.add(key);else keys.delete(key);},
    setLabels(value){labels=value;},
    setSunset(value){sunset=value;interior.setSunset(value);sun.color.set(value?'#ffd1a1':'#fff4d7');sun.position.set(value?-65:-40,value?28:70,35);sun.intensity=value?3:3.5;scene.background=value?duskSky:daySky;scene.fog.color.set(value?'#f2dcd4':'#cbe9f5');floor.material.color.set(value?'#f0e2d5':'#e9e9dc');},
  };
}
