import { createShelfFall } from './companion-shelf-fall.js';
import * as T from 'three';
import { createDoorEscapeDetails } from './companion-door-escape.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { HOME_OFFSET_Z } from './last-companion-edit.js';
import { smooth,clamp } from './last-companion-timeline.js';
import { weatheredSurface } from './story-surfaces.js';
import { createStreetResponse } from './companion-street-response.js';

export function createCompanionSets(scene){
  const root=new T.Group();root.name='Last companion / authored sets';root.visible=false;scene.add(root);
  const room=new T.Group(),store=new T.Group(),metro=new T.Group(),plaza=new T.Group(),street=new T.Group();for(const g of [room,store,metro,plaza,street])root.add(g);
  const items={},pending=[],staticMeshes=[],geometries=new Set(),materials=new Set(),textures=new Set();
  let seed=4163;const random=()=>((seed=seed*16807%2147483647)-1)/2147483646,range=(a,b)=>a+(b-a)*random();
  function mat(color,extra={}){const m=new T.MeshStandardMaterial({color,roughness:.93,...extra});materials.add(m);return m;}
  function scan(name,color,scale=1){const m=mat(color);for(const [key,suffix,colorSpace]of [['map','diff',T.SRGBColorSpace],['normalMap','nor_gl',T.NoColorSpace],['roughnessMap','rough',T.NoColorSpace]])pending.push(new Promise((resolve,reject)=>{const t=new T.TextureLoader().load(`/assets/materials/${name}_${suffix}.jpg`,resolve,undefined,reject);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=colorSpace;t.anisotropy=4;textures.add(t);m[key]=t;}));m.userData.scale=scale;return m;}
  const concrete=scan('concrete_wall_007','#b1b3a7',2),brick=scan('brick_wall_001','#ae9c82',2),asphalt=scan('asphalt_02','#777e73',3),metal=mat('#48534e',{metalness:.6,roughness:.68}),rust=mat('#73513b'),dark=mat('#26322f'),cream=mat('#a8a994'),wood=mat('#776851'),glass=mat('#91aaa4',{transparent:true,opacity:.19,roughness:.2,metalness:.25,side:T.DoubleSide}),red=mat('#56342c'),cloth=mat('#8c8c76'),green=mat('#54816d');
  function mesh(parent,geo,material,x=0,y=0,z=0,dynamic=false){geometries.add(geo);const m=new T.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);if(!dynamic&&!material.transparent)staticMeshes.push(m);return m;}
  function box(parent,w,h,d,material,x,y,z,dynamic=false){const g=new T.BoxGeometry(w,h,d);if(material.userData.scale){const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,s=material.userData.scale;for(let i=0;i<uv.count;i++)uv.setXY(i,(Math.abs(n.getX(i))>.5?p.getZ(i)+z:p.getX(i)+x)/s,(Math.abs(n.getY(i))>.5?p.getZ(i)+z:p.getY(i)+y)/s);}return mesh(parent,g,material,x,y,z,dynamic);}
  function cylinder(parent,r,h,material,x,y,z,dynamic=false){return mesh(parent,new T.CylinderGeometry(r,r,h,16),material,x,y,z,dynamic);}
  function group(parent,x,y,z){const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;}
  function label(parent,text,w,h,x,y,z,rotation=0,color='#c8c6ac',bg='#344b43',dynamic=false){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,512,128);ctx.fillStyle=color;ctx.font='bold 38px sans-serif';ctx.textAlign='center';ctx.fillText(text,256,78,480);for(let i=0;i<1500;i++){ctx.fillStyle=i%2?'#252d2420':'#d9cda51a';ctx.fillRect(range(0,512),range(0,128),range(1,4),range(1,5));}const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;textures.add(t);const m=mesh(parent,new T.PlaneGeometry(w,h),mat('#fff',{map:t}),x,y,z,dynamic);m.rotation.y=rotation;return m;}
  const bottlePlastic=mat('#c2d3c5',{transparent:true,opacity:.27,roughness:.24,metalness:.08,side:T.DoubleSide,depthWrite:false});
  const drinkingWater=mat('#8da597',{transparent:true,opacity:.43,roughness:.16,depthWrite:false});
  function bottle(parent,x,y,z,dynamic=false,fill=.87){
    const g=group(parent,x,y,z);
    mesh(g,new T.LatheGeometry([[.045,0],[.062,.014],[.066,.035],[.064,.075],[.066,.09],[.064,.16],[.066,.18],[.063,.24],[.035,.29],[.024,.32],[.024,.37]].map(p=>new T.Vector2(...p)),24),bottlePlastic,0,0,0,dynamic);
    cylinder(g,.059,.27*fill,drinkingWater,0,.02+.135*fill,0,dynamic);
    cylinder(g,.027,.035,cream,0,.38,0,dynamic);
    mesh(g,new T.CylinderGeometry(.067,.067,.085,24,1,true),cloth,0,.16,0,dynamic);
    for(const y of [.06,.23,.34]){const ring=mesh(g,new T.TorusGeometry(y>.3?.025:.064,.0025,4,24),cream,0,y,0,dynamic);ring.rotation.x=Math.PI/2;}
    return g;
  }
  function shelf(parent,x,z,dynamic=false){const g=group(parent,x,.3,z);for(const xx of [-2.4,2.4])for(const zz of [-.3,.3])box(g,.045,1.9,.045,metal,xx,.95,zz,dynamic);for(const y of [.13,.65,1.18,1.75])box(g,4.9,.045,.67,metal,0,y,0,dynamic);for(let i=0;i<16;i++){if(x===25&&((z===38.2&&(i===11||i===12))||(z===43.3&&(i===14||i===15))))continue;const xx=-2.1+(i%8)*.58,y=i<8?.68:1.21;box(g,.15,.22,.12,i%3?cream:green,xx,y+.11,range(-.1,.1),dynamic);}return g;}
  function hinged(parent,x,y,z,w,h,axis='z',material=metal){const g=group(parent,x,y,z);box(g,axis==='z'?w:.09,h,axis==='z'?.09:w,material,axis==='z'?w/2:0,h/2,axis==='z'?0:w/2,true);return g;}
  function debris(parent,count,bounds,material=concrete,clear=[]){for(let i=0;i<count;i++){const x=range(bounds[0],bounds[1]),z=range(bounds[2],bounds[3]);if(clear.some(([cx,cz,r])=>Math.hypot(x-cx,z-cz)<r))continue;const m=mesh(parent,new T.DodecahedronGeometry(1,0),material,x,bounds[4]??.33,z);m.scale.set(range(.025,.15),range(.015,.07),range(.04,.18));m.rotation.set(range(-.2,.2),range(0,6.3),0);}}

  // Room props sit on the existing table and floor. Rain drops are animated into a real basin.
  const basin=group(room,-21.2,.31,41.3);mesh(basin,new T.LatheGeometry([[.25,0],[.33,.025],[.38,.19],[.40,.2],[.38,.17],[.32,.03],[.25,.02]].map(p=>new T.Vector2(...p)),32),metal);items.basinWater=mesh(basin,new T.CircleGeometry(.34,32),mat('#708b7c',{roughness:.2,metalness:.5}),0,.09,0,true);items.basinWater.rotation.x=-Math.PI/2;
  items.drips=Array.from({length:7},()=>mesh(room,new T.SphereGeometry(.014,6,4),glass,-21.2,2,41.3,true));
  items.tin=group(room,-20,1.16,44.1);
  mesh(items.tin,new T.LatheGeometry([[0,0],[.075,0],[.087,.01],[.087,.13],[.083,.133],[.082,.015],[0,.015]].map(p=>new T.Vector2(...p)),32),metal,0,0,0,true);
  for(const y of [.025,.055,.085,.115]){const ring=mesh(items.tin,new T.TorusGeometry(.087,.002,4,32),metal,0,y,0,true);ring.rotation.x=Math.PI/2;}
  const lid=mesh(items.tin,new T.CircleGeometry(.08,24),metal,0,.135,-.065,true);lid.rotation.x=-.35;
  items.halfWater=bottle(room,-19.8,1.16,44.1,true,.45);
  const bagCanvas=weatheredSurface('canvas');materials.add(bagCanvas);textures.add(bagCanvas.map);textures.add(bagCanvas.bumpMap);
  items.bag=group(room,-20.3,.34,43.85);
  mesh(items.bag,new RoundedBoxGeometry(.42,.29,.26,3,.035),bagCanvas,0,.15,0,true);
  // The opening has real side walls and an inset lining, so supplies can pass below its rim.
  for(const z of [-.12,.12])mesh(items.bag,new RoundedBoxGeometry(.42,.15,.025,2,.012),bagCanvas,0,.35,z,true);
  for(const x of [-.2,.2])box(items.bag,.025,.15,.24,bagCanvas,x,.35,0,true);
  box(items.bag,.36,.018,.20,dark,0,.285,0,true);
  mesh(items.bag,new RoundedBoxGeometry(.26,.18,.055,3,.014),dark,0,.16,.16,true);
  for(const x of [-.14,.14]){const strap=new T.CatmullRomCurve3([new T.Vector3(x,.05,-.12),new T.Vector3(x,.2,-.24),new T.Vector3(x,.44,-.13)]);mesh(items.bag,new T.TubeGeometry(strap,14,.014,5),dark,0,0,0,true);}
  for(const x of [-.18,.18])box(items.bag,.015,.015,.22,metal,x,.425,0,true);
  items.bagLid=mesh(items.bag,new RoundedBoxGeometry(.42,.025,.26,2,.012),bagCanvas,0,.425,0,true);
  for(const x of [-.115,.115]){
    box(items.bag,.026,.24,.012,dark,x,.29,.145,true);
    for(const dx of [-.017,.017])box(items.bag,.005,.035,.012,metal,x+dx,.22,.157,true);
    for(const y of [.205,.235])box(items.bag,.039,.005,.012,metal,x,y,.157,true);
  }
  const haul=new T.CatmullRomCurve3([new T.Vector3(-.07,.43,0),new T.Vector3(-.06,.49,0),new T.Vector3(.06,.49,0),new T.Vector3(.07,.43,0)]);
  mesh(items.bag,new T.TubeGeometry(haul,16,.012,6),dark,0,0,0,true);
  for(let i=0;i<18;i++)for(const y of [.075,.245])box(items.bag,.007,.0018,.002,cream,-.119+i*.014,y,.19,true);
  items.power=box(room,.15,.035,.08,dark,-19.5,1.18,44.15,true);
  // Terminal screen is redrawn from persistent story state, no external service.
  const terminalCanvas=document.createElement('canvas');terminalCanvas.width=512;terminalCanvas.height=768;const screenTexture=new T.CanvasTexture(terminalCanvas);screenTexture.colorSpace=T.SRGBColorSpace;textures.add(screenTexture);
  items.terminal=group(room,-19.5,1.21,44.35);box(items.terminal,.19,.29,.032,metal,0,0,0,true);items.terminalScreen=mesh(items.terminal,new T.PlaneGeometry(.162,.235),new T.MeshBasicMaterial({map:screenTexture}),0,.008,.018,true);materials.add(items.terminalScreen.material);box(items.terminal,.028,.009,.005,dark,0,-.126,.021,true);items.terminal.rotation.x=-Math.PI/2;
  const cablePath=new T.CatmullRomCurve3([new T.Vector3(-.06,-.14,0),new T.Vector3(-.15,-.2,.02),new T.Vector3(-.2,-.15,.01)]);items.cable=mesh(items.terminal,new T.TubeGeometry(cablePath,16,.004,5),dark,0,0,0,true);
  let screenSecond=-1;
  function drawTerminal(state){const second=Math.floor(state.t*6);if(second===screenSecond)return;screenSecond=second;const c=terminalCanvas.getContext('2d');c.fillStyle=state.t>=200&&state.t<203?(Math.sin(state.t*19)>0?'#6a3226':'#191e18'):state.terminalOn?'#102521':'#141b18';c.fillRect(0,0,512,768);c.fillStyle='#9eb7a0';c.font='22px sans-serif';c.fillText('MEMORY / LOCAL LINK',36,65);c.font='64px sans-serif';c.fillStyle=state.terminalOn?'#d1dfc2':'#52584d';c.fillText('小月',36,170);c.font='25px sans-serif';c.fillStyle='#92ad99';c.fillText(state.t>=200&&state.t<203?'警报 / SIGNAL':state.t>=437?'正在寻找可行路线…':state.t<24?'电源接触不良':state.action==='lemon-memory'?'旧录音 · 一队':'连接中 · 声音正常',36,228);
    c.strokeStyle='#aac9ab';c.lineWidth=3;c.beginPath();for(let x=35;x<480;x++){const wave=state.line?Math.sin(x*.06+state.t*11)*Math.sin(x*.013)*24:Math.sin(x*.025+state.t*2)*3;const y=330+wave;x===35?c.moveTo(x,y):c.lineTo(x,y);}c.stroke();
    if(state.t>=437&&state.t<468){for(let i=0;i<4;i++){c.strokeStyle=state.t>438+i*1.4?'#6e4d42':'#b6cf98';c.lineWidth=7;c.beginPath();c.moveTo(260,620);c.lineTo(130+i*63,530);c.lineTo(70+i*105,420);c.stroke();}c.font='22px sans-serif';c.fillText('路线不可达',36,700);}
    if(state.terminalCracked){c.strokeStyle='#c0d1bd88';c.lineWidth=2;for(let i=0;i<5;i++){c.beginPath();c.moveTo(355,260);c.lineTo(355+Math.sin(i*2)*70,300+i*40);c.lineTo(200+i*60,620);c.stroke();}}
    if(state.t<21.4){c.fillStyle='#9d96854a';const cleared=smooth(state.t,19,21.3);for(let i=0;i<1800;i++){const y=(i*113)%768;if(y>cleared*768)c.fillRect((i*73)%512,y,3,2);}}screenTexture.needsUpdate=true;
  }

  // Shop: two open-ended aisles, a real warehouse and an eastern alley.
  box(store,21,.2,12,concrete,27.5,.19,41);box(store,21,.2,12,concrete,27.5,3.7,41);
  for(const z of [35,47])box(store,21,3.4,.24,brick,27.5,2,z);
  for(const [z,d]of [[38.9,7.8],[46.1,1.8]])box(store,.24,3.4,d,brick,17,2,z);
  box(store,.25,.65,2.6,brick,17,3.35,44);
  label(store,'OPEN · 便利店',.8,.25,16.84,2.5,42.8,-Math.PI/2);
  items.storeSign=group(store,16.8,3.1,44);label(items.storeSign,'CORNER MARKET',3.5,.5,0,0,0,-Math.PI/2);
  items.frontDoor=hinged(store,17,.3,42.8,2.4,2.8,'x',metal);items.frontDoor.rotation.y=Math.PI*.48;
  items.frontDoor.children[0].visible=false;for(const z of [.055,2.345])box(items.frontDoor,.075,2.8,.09,metal,0,1.4,z,true);for(const y of [.07,2.73])box(items.frontDoor,.075,.14,2.4,metal,0,y,1.2,true);items.frontDoorGlass=box(items.frontDoor,.018,2.5,2.22,glass,0,1.4,1.2,true);box(items.frontDoor,.08,.30,2.25,metal,0,.25,1.2,true);
  items.fallingShelf=shelf(store,25,38.2,true);items.aisleShelf=shelf(store,25,43.3,true);
  box(store,3.2,.9,.85,wood,22, .75,44.7);box(store,3.35,.08,.98,cream,22,1.24,44.7);
  items.lemons=group(store,22.3,1.31,44.45);box(items.lemons,.22,.035,.3,mat('#b7aa65'),0,0,0,true);label(items.lemons,'LEMON',.18,.07,0,.022,0,0,'#3f5135','#b7aa65',true).rotation.x=-Math.PI/2;items.lemons.scale.setScalar(.56);
  items.water=[bottle(store,24.7,1.505,38.2,true),bottle(store,25.1,1.505,38.2,true)];items.bandage=cylinder(store,.075,.055,cream,26.1,1.531,43.3,true);items.biscuits=box(store,.22,.08,.16,cloth,26.6,1.543,43.3,true);
  for(const z of [37.2,43.4]){box(store,.6,2.2,z>40?2:3.4,metal,30.6,1.4,z);for(let i=0;i<3;i++){box(store,.03,2.05,.035,dark,30.24,1.4,z-1.1+i*1.1);}}
  items.fallenCabinetDoor=group(store,30.25,1.1,43.6);
  box(items.fallenCabinetDoor,.82,.06,1.55,metal,0,0,0,true);
  box(items.fallenCabinetDoor,.7,.015,1.4,cream,0,.035,0,true);
  box(items.fallenCabinetDoor,.028,.035,.24,dark,.29,.06,.35,true);
  // Central cold cabinet reflection: the clerk faces the mirror, the player sees its back and reflected face.
  box(store,.45,2.5,3.5,metal,30.8,1.55,40.4);
  const mirror=new Reflector(new T.PlaneGeometry(3.15,2.05),{textureWidth:768,textureHeight:768,color:0x899b91,clipBias:.002});mirror.rotation.y=-Math.PI/2;mirror.position.set(30.55,1.65,40.4);store.add(mirror);items.mirror=mirror;
  for(const z of [38.8,42])box(store,.08,2.2,.055,metal,30.48,1.65,z);
  const fridgeLight=new T.PointLight('#c4d8ca',1.8,6,2);fridgeLight.position.set(29.8,2.5,40.4);store.add(fridgeLight);
  for(const [z,d] of [[39.2,8.4],[46.3,1.4]])box(store,.2,3.4,d,concrete,31,2,z);
  box(store,.2,.6,2.1,concrete,31,3.4,44.5);
  for(const x of [33.2,35.4])for(const z of [36.5,38.3])for(let i=0;i<3;i++)box(store,1,.65,.8,wood,x,.65+i*.65,z);
  items.warehouseShelf=group(store,32,.3,42.6);for(const x of [-.8,.8])for(const z of [-.28,.28])box(items.warehouseShelf,.045,1.85,.045,metal,x,.93,z,true);for(let i=0;i<4;i++)box(items.warehouseShelf,1.7,.07,.65,metal,0,.2+i*.5,0,true);
  for(const z of [39,46.2])box(store,.22,3.4,z<40?7.8:1.5,brick,38,2,z);
  items.backDoor=hinged(store,38,.3,43.6,1.8,2.9,'x');
  box(items.backDoor,.025,.19,.12,metal,-.065,1.2,1.5,true);
  items.backHandle=group(items.backDoor,-.11,1.2,1.5);
  const handleCurve=new T.CatmullRomCurve3([new T.Vector3(.02,-.05,0),new T.Vector3(-.07,-.05,0),new T.Vector3(-.07,.08,0),new T.Vector3(.02,.08,0)]);
  mesh(items.backHandle,new T.TubeGeometry(handleCurve,16,.012,8),metal,0,0,0,true);
  items.bolt=group(items.backDoor,-.08,.25,1.47);
  box(items.bolt,.05,.04,.34,rust,0,0,0,true);box(items.bolt,.09,.09,.035,metal,-.025,.015,.04,true);
  for(const z of [1.34,1.55])box(items.backDoor,.07,.10,.045,metal,-.06,.25,z,true);
  // Alley has an open roof and a perpendicular exit back into the existing avenue.
  box(store,6,.18,30,asphalt,41,.18,50);box(store,.3,6,30,brick,44,3,50);box(store,26,.18,5,asphalt,27,.18,64);box(store,24,5,.25,brick,27,2.5,61.5);
  for(let z=37;z<62;z+=5){box(store,.1,.08,1.5,metal,43.8,4,z);cylinder(store,.065,5,rust,43.8,2.5,z);}
  items.bin=group(store,40,.34,47.4);box(items.bin,1.5,1.1,.85,green,0,.6,0,true);box(items.bin,1.56,.1,.9,dark,0,1.2,0,true);for(const x of [-.55,.55])for(const z of [-.3,.3]){const wheel=cylinder(items.bin,.09,.055,dark,x,.09,z,true);wheel.rotation.z=Math.PI/2;}
  const pool=mesh(store,new T.PlaneGeometry(3,4),mat('#465f58',{metalness:.4,roughness:.22}),40,.286,44.5);pool.rotation.x=-Math.PI/2;
  for(const [x,z]of [[23,40],[34,44],[40,46]]){const light=new T.PointLight('#cad6b7',x<30?5:4,10,2);light.position.set(x,2.8,z);store.add(light);}
  debris(store,180,[18,37,35.4,46.7]);
  const oldBottleGlass=mat('#829b7b',{transparent:true,opacity:.68,roughness:.17,metalness:.08,side:T.DoubleSide,depthWrite:false});
  items.bottles=Array.from({length:12},(_,i)=>{const b=bottle(items.fallingShelf,-2.2+i*.4,1.82,.24,true);b.children[0].material=oldBottleGlass;b.children[1].visible=false;b.children[2].material=rust;return b;});
  const shelfFall=createShelfFall(items.fallingShelf,items.bottles,store);
  // Glass fragments and hanging shop sign remain objects, not a full-screen effect.
  items.shards=Array.from({length:38},(_,i)=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([0,0,0,.08+random()*.08,.03,0,random()*.06,.18,0],3));g.computeVertexNormals();const m=mesh(store,g,glass,17,1,40,true);m.userData.seed=i;return m;});
  items.sideWindow=mesh(store,new T.PlaneGeometry(2.2,2),glass,30.1,1.8,45.55,true);items.sideWindow.rotation.y=0;

  // Underground structure beneath the avenue's actual opening at z=100.
  box(metro,16,.4,44,concrete,0,-8.25,121);box(metro,.5,5.8,44,concrete,-7.8,-5.2,121);box(metro,.5,5.8,26,concrete,7.8,-5.2,112);box(metro,16,5.8,.45,concrete,0,-5.2,99);box(metro,16,5.8,.45,concrete,0,-5.2,143);
  box(metro,14.3,.45,36,concrete,-.85,-2.65,125); // shaft is left open above the landing
  for(const x of [-3.6,3.6])box(metro,.35,8,7,concrete,x,-4,100);
  for(const x of [-4.7,4.7])box(metro,4.5,1.1,35,concrete,x,-7.45,124);
  for(const x of [-.72,.72]){box(metro,.085,.12,42,metal,x,-7.88,122);box(metro,.16,.04,42,rust,x,-7.96,122);}for(let z=102;z<143;z+=.65)box(metro,2.1,.09,.18,wood,0,-8,z);
  for(const x of [-3.1,5.7])for(let z=107;z<140;z+=7){box(metro,.5,4.9,.5,concrete,x,-4.6,z);box(metro,.62,.15,.62,dark,x,-6.7,z);}
  items.escapePillar=box(metro,.5,4.9,.5,concrete,3.6,-4.6,111.52);
  box(metro,.62,.15,.62,dark,3.6,-6.7,111.52);
  const ramp=box(metro,1.7,.18,3.5,concrete,2.8,-7.42,106.7);ramp.rotation.x=-.34;
  label(metro,'NORTH STATION / 北站',4,.65,-7.48,-4.6,108,Math.PI/2);label(metro,'维修通道 →',2.2,.38,4.7,-4.6,121,Math.PI/2);
  for(let i=0;i<5;i++){box(metro,.5,1.2,.5,metal,-5.8,-6.2,126+i*1.1);box(metro,1.6,.06,.04,rust,-5.1,-5.8,126+i*1.1);}
  for(let z=112;z<140;z+=8){box(metro,1.3,.07,.13,cream,0,-2.94,z);const light=new T.PointLight('#b4c5bc',15,13,2);light.position.set(0,-3.1,z);metro.add(light);(items.metroLights??=[]).push(light);}
  // A surviving platform utility lamp lights the attacker crossing the aisle.
  // Keep the far station dark; the pool is attached to a visible pillar fixture.
  const utilityGlow=mat('#bfd0b9',{emissive:'#a4bea1',emissiveIntensity:1.8});
  box(metro,.36,.16,.16,metal,5.7,-3.65,113.67);
  box(metro,.28,.085,.025,utilityGlow,5.7,-3.65,113.58);
  const utilityLight=new T.PointLight('#c1d1ba',30,7,2);utilityLight.position.set(5.25,-3.85,113.3);metro.add(utilityLight);
  box(metro,.18,.3,.08,metal,3.6,-4.05,111.82);
  box(metro,.10,.22,.025,utilityGlow,3.6,-4.05,111.88);
  const aisleLight=new T.PointLight('#c1d1ba',12,5,2);aisleLight.position.set(3.55,-4.15,112.05);metro.add(aisleLight);
  const shaftLight=new T.SpotLight('#d1e0de',90,20,.48,.6,1.6);shaftLight.position.set(0,1,100);shaftLight.target.position.set(.3,-8,104);metro.add(shaftLight,shaftLight.target);
  const beamSteel=weatheredSurface('metal');materials.add(beamSteel);textures.add(beamSteel.map);textures.add(beamSteel.bumpMap);
  function steelBeam(length,x,y,z){const g=group(metro,x,y,z);for(const yy of [-.155,.155])box(g,length,.05,.38,beamSteel,0,yy,0,true);box(g,length,.26,.045,beamSteel,0,0,0,true);for(const xx of [-length*.32,length*.32]){box(g,.12,.28,.065,beamSteel,xx,0,0,true);for(const yy of [-.085,.085]){const bolt=cylinder(g,.021,.08,rust,xx,yy,0,true);bolt.rotation.x=Math.PI/2;}}return g;}
  items.beam=steelBeam(2.3,-.35,-7.48,104.1);items.beam.rotation.z=.06;items.fallingBeam=steelBeam(2.5,.1,-2,104);
  items.torch=group(metro,1.02,-7.991,104.35);
  cylinder(items.torch,.035,.22,beamSteel,0,0,0,true).rotation.x=Math.PI/2;
  for(const z of [-.10,-.08,.075,.10])cylinder(items.torch,z<0?.059:.039,.016,metal,0,0,z,true).rotation.x=Math.PI/2;
  for(let z=-.045;z<.065;z+=.014)cylinder(items.torch,.037,.006,dark,0,0,z,true).rotation.x=Math.PI/2;
  mesh(items.torch,new T.CircleGeometry(.048,24),mat('#c3d2b5',{emissive:'#91a880',emissiveIntensity:.7}),0,0,-.11,true).rotation.y=Math.PI;
  box(items.torch,.018,.009,.035,dark,0,.037,.02,true);
  items.torchLight=new T.SpotLight('#d8dfce',7,20,.35,.45,1.3);items.torch.add(items.torchLight,items.torchLight.target);items.torchLight.position.z=-.12;items.torchLight.target.position.set(0,0,-8);
  items.floorCrowbar=group(metro,1.25,-7.85,104.4);const cb=new T.CatmullRomCurve3([new T.Vector3(0,0,-.35),new T.Vector3(0,0,.25),new T.Vector3(.09,0,.33)]);mesh(items.floorCrowbar,new T.TubeGeometry(cb,12,.017,8),metal,0,0,0,true);
  items.adFrame=group(metro,1.6,-6.8,107);for(const x of [-.6,.6])box(items.adFrame,.045,1.8,.045,metal,x,.9,0,true);label(items.adFrame,'THE CITY / BEFORE',1.1,1.4,0,1,0,Math.PI,'#aaa795','#354b43',true);
  debris(metro,180,[-3,3,100,110,-7.96],concrete,[[1.25,104.35,.62],[1.02,104.72,.35],[1.4,105.9,.62]]);
  // Maintenance room, a real inner opening and ascending treads.
  box(metro,4,.2,6,concrete,6,-7,124);box(metro,4,3,.25,concrete,6,-5.4,121);box(metro,2.8,3,.25,concrete,5.4,-5.4,127);
  for(const [z,length]of [[121.5,1],[125.5,3]])box(metro,.2,3,length,concrete,4,-5.4,z);
  items.maintenanceDoor=hinged(metro,4,-6.9,122,2,2.7,'x');
  items.innerDoor=hinged(metro,6.9,-6.9,127,2,2.7,'z');
  items.maintenanceGlass=mesh(metro,new T.PlaneGeometry(2,1),glass,6,-5,126.84,true);
  // Solid risers and a connected landing, rather than floating thin treads.
  for(let i=0;i<24;i++){const top=-6.655+i*.29,height=top+7.1;box(metro,2.3,height,.55,concrete,8,-7.1+height/2,126.6+i*.55);}
  box(metro,2.3,.655,1.5,concrete,8,-.2825,140.275);
  for(const x of [6.8,9.2])box(metro,.2,10,15,concrete,x,-3,133);
  items.gate=hinged(metro,6.9,-.1,139.5,2.2,2.6,'z');for(let i=0;i<12;i++)box(items.gate,.035,2.6,.045,metal,.08+i*.18,1.3,0,true);
  const exitLight=new T.PointLight('#f3c895',24,18,1.5);exitLight.position.set(8,1.5,140);metro.add(exitLight);
  items.gate.children[0].visible=false;label(metro,'EXIT / 出口',1.6,.35,8,2.8,139.55,Math.PI);

  // A dry fountain above the station, warm light and physically blocked exits.
  box(plaza,28,.14,36,concrete,0,.1,159);const fountain=group(plaza,0,.2,160);
  mesh(fountain,new T.CylinderGeometry(4.6,4.9,.4,48,1,true),concrete,0,.2,0);mesh(fountain,new T.TorusGeometry(4.7,.22,8,48),concrete,0,.45,0).rotation.x=Math.PI/2;cylinder(fountain,.7,1.8,concrete,0,.9,0);mesh(fountain,new T.TorusGeometry(1.4,.18,8,32),concrete,0,1.65,0).rotation.x=Math.PI/2;
  for(const x of [-13,13])box(plaza,.6,6,28,brick,x,3,157);for(let z=144;z<178;z+=1.8)for(let x=-12;x<13;x+=1.8){if(Math.hypot(x,z-160)<5)continue;const tile=box(plaza,1.78,.05,1.78,concrete,x,.20,z);tile.rotation.z=Math.sin(x*2+z)*.006;}
  for(let i=0;i<14;i++){const curve=new T.CatmullRomCurve3([new T.Vector3(-12,.25,154+i*.4),new T.Vector3(-9,.3,156+i*.5),new T.Vector3(-6,.26,160+i*.6)]);mesh(plaza,new T.TubeGeometry(curve,16,.05+i*.004,6),wood);}
  items.fence=group(plaza,1,.2,176);for(let i=0;i<9;i++)box(items.fence,.04,1.2,.04,metal,-1.6+i*.4,.6,0,true);for(const y of [.15,1.1])box(items.fence,3.4,.05,.05,metal,0,y,0,true);
  // Broken stone channel provides an actual resting surface for the terminal.
  box(plaza,.58,.36,.46,concrete,3.3,.50,160.4);box(plaza,.08,.25,.46,concrete,3.05,.80,160.4);box(plaza,.08,.25,.46,concrete,3.55,.80,160.4);box(plaza,.52,.29,.06,concrete,3.3,.81,160.59);

  // Story road cover consists of independently moving concrete wedges and reinforcement.
  items.slabs=[];for(let i=0;i<12;i++){const a=i/12*Math.PI*2,b=(i+1)/12*Math.PI*2,s=new T.Shape();s.moveTo(0,0);s.lineTo(Math.cos(a)*3.2,Math.sin(a)*3.9);s.lineTo(Math.cos(b)*3.2,Math.sin(b)*3.9);s.closePath();const g=new T.ExtrudeGeometry(s,{depth:.24,bevelEnabled:false});g.rotateX(-Math.PI/2);const slab=mesh(street,g,asphalt,0,-.16,100,true);slab.userData.index=i;items.slabs.push(slab);}
  items.rebar=[];for(let i=0;i<12;i++){const bar=box(street,.018,.018,6,metal,-2.8+i*.5,-.2,100,true);items.rebar.push(bar);}
  // Fractures grow underneath the shallow water before the road gives way.
  items.roadCracks=group(street,0,.086,100);
  for(let i=0;i<7;i++){const points=[];for(let j=0;j<9;j++)points.push(new T.Vector3(-3.1+j*.77,0,(i-3)*.7+Math.sin(j*2.4+i)*.19));const m=mesh(items.roadCracks,new T.TubeGeometry(new T.CatmullRomCurve3(points),32,.012,4),dark,0,0,0,true);m.userData.delay=i*.35;}
  const dustCanvas=document.createElement('canvas');dustCanvas.width=dustCanvas.height=64;const dc=dustCanvas.getContext('2d'),gradient=dc.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'#c4b8a3aa');gradient.addColorStop(.4,'#afa89366');gradient.addColorStop(1,'#afa89300');dc.fillStyle=gradient;dc.fillRect(0,0,64,64);const dustTexture=new T.CanvasTexture(dustCanvas);textures.add(dustTexture);
  const dustMaterial=new T.PointsMaterial({map:dustTexture,color:'#c5b9a5',size:.75,transparent:true,opacity:.45,depthWrite:false});materials.add(dustMaterial);const dustGeometry=new T.BufferGeometry(),dustPosition=new Float32Array(360*3);dustGeometry.setAttribute('position',new T.BufferAttribute(dustPosition,3));geometries.add(dustGeometry);items.collapseDust=new T.Points(dustGeometry,dustMaterial);root.add(items.collapseDust);
  // Vehicle used in the vault, with identifiable bonnet, cabin and wheels.
  items.vaultCar=group(street,-8,.1,81.3);items.vaultCar.rotation.y=Math.PI/2;
  const car=items.vaultCar,paint=weatheredSurface('metal'),rubber=mat('#202521'),carGlass=mat('#354943',{roughness:.24,metalness:.4});
  paint.color.set('#bacac0');paint.metalness=.28;materials.add(paint);textures.add(paint.map);textures.add(paint.bumpMap);
  const carRust=mat('#a58065',{map:paint.map,bumpMap:paint.bumpMap,bumpScale:.0017,roughness:1});
  mesh(car,new RoundedBoxGeometry(1.8,.53,4.15,3,.13),paint,0,.58,0);
  mesh(car,new RoundedBoxGeometry(1.66,.12,1.22,3,.045),paint,0,.89,1.44);
  mesh(car,new RoundedBoxGeometry(1.59,.09,.7,3,.03),paint,0,.88,-1.7);
  // Tapered cabin: raked glass, roof, pillars, sills and recessed windows.
  mesh(car,new RoundedBoxGeometry(1.48,.09,1.58,3,.035),paint,0,1.55,-.35);
  for(const end of [-1,1]){const z=end>0?.65:-1.35;const pane=box(car,1.38,.64,.035,carGlass,0,1.21,z);pane.rotation.x=end*.48;for(const side of [-1,1]){const pillar=box(car,.075,.75,.065,paint,side*.73,1.2,z);pillar.rotation.x=end*.48;}}
  for(const side of [-1,1]){
    box(car,.035,.46,1.44,carGlass,side*.745,1.26,-.35);box(car,.06,.6,.065,paint,side*.76,1.24,-.35);
    box(car,.035,.035,2.62,rubber,side*.891,.78,-.25);box(car,.04,.055,.22,metal,side*.914,.83,-.65);
    for(const z of [-1.25,-.29,.73])box(car,.018,.34,.012,dark,side*.907,.57,z);
    for(const z of [-1.35,1.35]){cylinder(car,.34,.19,rubber,side*.89,.31,z).rotation.z=Math.PI/2;cylinder(car,.21,.205,metal,side*.9,.31,z).rotation.z=Math.PI/2;cylinder(car,.075,.218,rust,side*.9,.31,z).rotation.z=Math.PI/2;for(let j=0;j<5;j++){const a=j*Math.PI*2/5;cylinder(car,.024,.22,dark,side*.9,.31+Math.sin(a)*.145,z+Math.cos(a)*.145).rotation.z=Math.PI/2;}}
    box(car,.31,.13,.04,cream,side*.59,.73,2.086);box(car,.34,.1,.045,red,side*.58,.74,-2.08);
  }
  box(car,1.65,.12,.1,rust,0,.44,2.1);box(car,1.62,.11,.09,metal,0,.44,-2.1);box(car,.62,.2,.025,dark,0,.66,2.086);
  for(let i=0;i<8;i++)box(car,.014,.15,.03,metal,-.28+i*.08,.66,2.104);
  box(car,.36,.09,.02,cream,0,.47,2.159);
  for(const x of [-.43,.32]){const wiper=box(car,.48,.018,.018,rubber,x,.99,.91);wiper.rotation.y=-.15;}
  for(let i=0;i<34;i++){const shape=new T.Shape();for(let j=0;j<=12;j++){const a=(j%12)*Math.PI/6,r=(.008+(i%5)*.006)*(.6+.4*Math.sin(i*13+(j%12)*7)**2),x=Math.cos(a)*r,y=Math.sin(a)*r;if(j===0)shape.moveTo(x,y);else shape.lineTo(x,y);}const patch=mesh(car,new T.ShapeGeometry(shape),carRust,Math.sin(i*2.399)*.72,.952,1.03+(i%7)*.145);patch.rotation.x=-Math.PI/2;patch.scale.set(1.5,.7,1);}
  for(let i=0;i<9;i++){const scratch=box(car,.001,.001,.08+(i%4)*.025,metal,.3+i*.022,.953,1.35+Math.sin(i)*.08);scratch.rotation.y=.4;}
  // A split in the front glass follows the pane, with the steering wheel and seats behind it.
  for(let i=0;i<5;i++){const line=box(car,.006,.24+i*.035,.008,cream,-.22+i*.045,1.27,.62);line.rotation.set(.48,0,-.5+i*.2);}
  for(const x of [-.36,.36]){box(car,.48,.15,.48,dark,x,.87,-.2);const seat=box(car,.48,.46,.14,dark,x,1.1,-.45);seat.rotation.x=.12;}
  const wheel=mesh(car,new T.TorusGeometry(.18,.025,8,24),rubber,-.4,1.12,.35);wheel.rotation.x=.35;
  items.bloodDrops=Array.from({length:30},(_,i)=>{const m=mesh(root,new T.CircleGeometry(.025+(i%3)*.012,8),red,0,.31,0,true);m.rotation.x=-Math.PI/2;return m;});
  // A shallow patch of wet asphalt, with feathered edges and small ripples around
  // the blood trail. This is also the exact spot the tracking infected examines.
  const trackingWater=mat('#24312c',{transparent:true,opacity:.32,roughness:.36,metalness:.02,envMapIntensity:.2,depthWrite:false});
  const rippleTime={value:0};trackingWater.onBeforeCompile=shader=>{
    shader.uniforms.uTrackingTime=rippleTime;
    shader.vertexShader='varying vec2 vTrackingUv;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvTrackingUv=uv;');
    shader.fragmentShader='uniform float uTrackingTime; varying vec2 vTrackingUv;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal.xy+=vec2(sin(vTrackingUv.x*91.0+uTrackingTime*2.0),cos(vTrackingUv.y*73.0-uTrackingTime*1.7))*.018;normal=normalize(normal);');
    shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>','diffuseColor.a*=1.0-smoothstep(.24,.5,length(vTrackingUv-.5));\n#include <alphatest_fragment>');
  };
  items.trackingPuddle=mesh(root,new T.CircleGeometry(1.35,64),trackingWater,-2.4,.092,67,true);items.trackingPuddle.rotation.x=-Math.PI/2;items.trackingPuddle.scale.y=.58;
  const stainCanvas=document.createElement('canvas');stainCanvas.width=stainCanvas.height=64;const stainContext=stainCanvas.getContext('2d'),stainGradient=stainContext.createRadialGradient(32,32,0,32,32,32);stainGradient.addColorStop(0,'#5a302ac0');stainGradient.addColorStop(.3,'#5a302a65');stainGradient.addColorStop(1,'#5a302a00');stainContext.fillStyle=stainGradient;stainContext.fillRect(0,0,64,64);const stainTexture=new T.CanvasTexture(stainCanvas);stainTexture.colorSpace=T.SRGBColorSpace;textures.add(stainTexture);
  items.waterStains=Array.from({length:6},(_,i)=>{const m=mesh(root,new T.PlaneGeometry(.22,.22),mat('#fff',{map:stainTexture,transparent:true,depthWrite:false,roughness:.35}),-2.5+i*.06,.094,66.95+Math.sin(i*2.4)*.13,true);m.rotation.x=-Math.PI/2;return m;});
  items.streetResponse=createStreetResponse({street,group,box,mesh,label,concrete,brick,metal,rust,dark,glass});
  const doorEscape=createDoorEscapeDetails({items,metro,group,box,mesh,metal,rust,dark});
  // Batch fixed architecture within each set, preserving dynamic joints and object visibility.
  for(const g of [room,store,metro,plaza,street]){g.updateWorldMatrix(true,true);const batches=new Map();for(const m of staticMeshes){if(!g.getObjectById(m.id))continue;const geo=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();geo.applyMatrix4(m.matrixWorld).applyMatrix4(g.matrixWorld.clone().invert());const list=batches.get(m.material)||[];list.push(geo);batches.set(m.material,list);m.removeFromParent();}for(const [material,parts]of batches){const m=new T.Mesh(mergeGeometries(parts),material);m.castShadow=m.receiveShadow=true;g.add(m);geometries.add(m.geometry);parts.forEach(p=>p.dispose());}}
  function update(s,camera){const t=s.t;room.visible=t<60;store.visible=t>=35&&t<215;metro.visible=t>285&&t<424;plaza.visible=t>=416;street.visible=t>=210&&t<301;items.streetResponse.update(t);if(s.compact){room.position.z=HOME_OFFSET_Z;store.visible=false;items.mirror.visible=false;street.visible=s.playbackTime>=12&&s.playbackTime<20;metro.visible=s.playbackTime>=14&&s.playbackTime<54;plaza.visible=s.playbackTime>=49;}
    rippleTime.value=t;items.trackingPuddle.visible=t>=210&&t<246;items.waterStains.forEach((m,i)=>{m.visible=t>=217+i*.45&&t<246;m.scale.setScalar(1+smooth(t,217+i*.45,228)*1.4);});
    drawTerminal(s);items.drips.forEach((m,i)=>{m.position.y=.43+(1-((t*.7+i*.14)%1))*3.3;m.scale.y=1.7;});items.basinWater.scale.setScalar(1+Math.sin(t*9)*.008);
    items.tin.rotation.z=t<7?0:Math.sin(smooth(t,7,10)*Math.PI)*1.8;items.halfWater.visible=t<13;items.bag.visible=t<14;items.bagLid.visible=t>=91;items.power.visible=t<24;
    items.storeSign.rotation.x=Math.sin(t*1.6)*.025;items.frontDoor.rotation.y=t<146?Math.PI*.48:Math.PI*.48+smooth(t,146,148)*1.1;items.frontDoor.position.y=.3-smooth(t,146,148)*.2;
    items.water.forEach((g,i)=>g.visible=t<65+i*4);items.bandage.visible=t<76;items.biscuits.visible=t<79;items.lemons.visible=!(t>84&&t<90);
    items.mirror.visible=!s.compact&&t>=35&&t<215;items.warehouseShelf.rotation.x=smooth(t,187,190)*1.2;
    shelfFall.update(t);
    items.shards.forEach((m,i)=>{const age=t-(t<160?146:173),active=age>=0&&age<4; m.visible=active;const angle=i*2.399;m.position.set((t<160?17:30.4)+Math.cos(angle)*age*.6,Math.max(.31,1.7+Math.sin(angle)*age*.8-age*age*.8),(t<160?44:45.55)+Math.sin(angle)*age*.5);m.rotation.set(age*2+i,age+i,0);});
    const cabinetFall=smooth(t,160.2,161.5);items.fallenCabinetDoor.position.set(30.25-1.15*cabinetFall,1.1-.76*cabinetFall,43.6);items.fallenCabinetDoor.rotation.z=-Math.PI*.48*(1-cabinetFall);
    items.sideWindow.visible=t<173;items.frontDoorGlass.visible=t<146;
    const handlePull=Math.sin(smooth(t,181.5,183)*Math.PI)+Math.sin(smooth(t,185,186.5)*Math.PI);
    items.backHandle.position.x=-.11-handlePull*.027;items.backHandle.rotation.z=handlePull*.10;
    items.bolt.position.z=1.47-smooth(t,191,194)*.32;items.backDoor.rotation.y=smooth(t,194,196)*Math.PI*.48-handlePull*.012;items.backDoor.rotation.z=t>209?Math.sin(t*17)*.018:0;
    items.bin.rotation.x=smooth(t,206,209)*-Math.PI*.44;items.bin.position.z=47.4-smooth(t,206,209)*1.5;
    items.metroLights.forEach((l,i)=>l.intensity=(i%3===1?.15:Math.sin((s.playbackTime??t)*7+i*4)>.94?.3:3.2)*(t>337&&t<341?.4:1));shaftLight.intensity=24;exitLight.intensity=7;items.beam.position.y=-7.48+smooth(t,332,335)*.12-smooth(t,338,339)*.16;items.fallingBeam.position.y=-2-smooth(t,337,339)*5.4;
    items.floorCrowbar.visible=t<325;
    items.adFrame.rotation.x=smooth(t,329,332)*.8;items.maintenanceGlass.visible=t<398;items.innerDoor.rotation.y=-smooth(t,398,402)*Math.PI*.52;
    doorEscape.update(t);if(s.compact){items.innerDoor.rotation.y=-Math.PI*.52;items.maintenanceGlass.visible=false;items.maintenanceDoor.rotation.y=(1-smooth(t,387.8,391.1))*1.35;items.gate.rotation.set(0,-Math.PI*.52,0);items.gateLockChip.visible=false;}
    items.fence.position.set(Math.sin(t)*.07,.15,176-(t-433)*.18);items.fence.rotation.y=.2;
    items.roadCracks.visible=s.compact?s.playbackTime>=14.45&&s.playbackTime<15.4:t>=280&&t<291;items.roadCracks.children.forEach((m,i)=>{m.scale.z=.3+smooth(t,281+i*.35,287)*1.2;});
    items.collapseDust.visible=t>=288&&t<305||t>=337&&t<347;
    if(items.collapseDust.visible){const second=t>=337,age=t-(second?337:288);for(let i=0;i<360;i++){const phase=i*.618,fall=Math.min(7.7,age*age*.6),radius=.5+Math.min(3,age*.35);dustPosition[i*3]=Math.sin(i*2.399)*radius;dustPosition[i*3+1]=(second?-5:-.3)-fall+Math.sin(phase+age)*1.2+(i%7)*.16;dustPosition[i*3+2]=102+Math.cos(i*2.399)*radius;}dustGeometry.attributes.position.needsUpdate=true;items.collapseDust.material.opacity=.45*(1-smooth(age,7,11));}
    items.slabs.forEach((m,i)=>{const age=s.compact?clamp((s.playbackTime-14.5)*2.6-i*.025,0,8):clamp(t-288-i*.035,0,8);m.visible=t>=282;m.position.y=-.16-Math.min(7.7,age*age*1.1);m.rotation.set(age*.13*Math.sin(i),0,age*.16*Math.cos(i));});items.rebar.forEach((m,i)=>{const age=clamp(t-289-i*.03,0,5);m.position.y=-.2-age*1.5;m.rotation.x=age*.25;});
    items.bloodDrops.forEach((m,i)=>{m.visible=s.injured&&t>199+i*.6;if(t<240)m.position.set(i<15?40.1+Math.sin(i)*.1:12-(i-15)*1.1,.292,i<15?45+i*.7:65+Math.sin(i)*.2);else if(t>=340)m.position.set(1.5+Math.sin(i)*.1,-7.96,105+i*.35);});
  }
  function dispose(){shelfFall.dispose();items.terminal.removeFromParent();root.removeFromParent();mirror.getRenderTarget().dispose();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}
  return {root,room,store,metro,plaza,street,items,ready:Promise.all(pending),update,drawTerminal,dispose};
}
