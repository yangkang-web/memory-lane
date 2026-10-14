import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { HOME, HOME_WALLS, HOME_OBSTACLES } from './walk-layout.js';
import { furnishInterior } from './interior-props.js';
import { createRoomSurfaces, dressRoomSurfaces } from './room-surfaces.js';

export function createAbandonedHome(scene,surfaceMaps={}) {
  let seed=71;
  const rnd=()=>((seed=seed*16807%2147483647)-1)/2147483646;
  const between=(a,b)=>a+(b-a)*rnd();
  const choose=a=>a[Math.floor(rnd()*a.length)];
  const objects=[];
  const cube=new T.BoxGeometry(1,1,1);
  const mat=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.94,...extra});
  function canvasTexture(w,h,draw) {
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    draw(canvas.getContext('2d'),w,h);
    const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;return map;
  }
  function speckle(c,w,h,n) {
    for(let i=0;i<n;i++){c.fillStyle=choose(['#172a2024','#d7c5a323','#25291d36']);c.fillRect(between(0,w),between(0,h),between(1,4),between(1,7));}
  }
  const finishes=createRoomSurfaces();
  const plasterReady=finishes.ready;
  const woodMap=canvasTexture(256,512,(c,w,h)=>{
    c.fillStyle='#71634e';c.fillRect(0,0,w,h);
    for(let i=0;i<500;i++){c.strokeStyle=choose(['#1e281e46','#ac956539','#d1b88d20']);c.beginPath();const x=between(0,w);c.moveTo(x,0);c.bezierCurveTo(x+between(-8,8),h*.3,x+between(-8,8),h*.7,x,h);c.stroke();}
    speckle(c,w,h,6000);
  });
  const fabricMap=canvasTexture(512,256,(c,w,h)=>{
    c.fillStyle='#6b7462';c.fillRect(0,0,w,h);
    for(let y=0;y<h;y+=3){c.fillStyle='#18261922';c.fillRect(0,y,w,1);}
    for(let i=0;i<50;i++){const x=between(0,w),y=between(0,h),r=between(8,40);c.fillStyle=choose(['#1b2b1d55','#a0926755']);c.beginPath();c.ellipse(x,y,r,r*.6,between(0,3),0,Math.PI*2);c.fill();}
    c.fillStyle='#292c20';c.beginPath();c.moveTo(170,40);c.lineTo(240,30);c.lineTo(208,71);c.lineTo(250,90);c.lineTo(166,80);c.fill();speckle(c,w,h,7000);
  });
  const ceilingMap=canvasTexture(768,768,(c,w,h)=>{
    c.fillStyle='#878779';c.fillRect(0,0,w,h);
    for(let i=0;i<35;i++) {
      const x=between(0,w),y=between(0,h),r=between(20,140),stain=c.createRadialGradient(x,y,0,x,y,r);
      stain.addColorStop(0,'#51493280');stain.addColorStop(.65,'#635c3545');stain.addColorStop(1,'#635c3500');c.fillStyle=stain;c.fillRect(x-r,y-r,r*2,r*2);
    }
    for(let i=0;i<20;i++){let x=between(0,w),y=between(0,h);c.beginPath();c.moveTo(x,y);for(let j=0;j<8;j++){x+=between(-35,45);y+=between(6,30);c.lineTo(x,y);}c.strokeStyle='#383e3280';c.lineWidth=1.2;c.stroke();}
    speckle(c,w,h,16000);
  });
  const exteriorMap=canvasTexture(768,512,(c,w,h)=>{
    c.fillStyle='#635f50';c.fillRect(0,0,w,h);
    for(let y=0;y<h;y+=32)for(let x=-64;x<w;x+=128){c.fillStyle=choose(['#75634e','#7b6650','#695b4b','#88765b']);c.fillRect(x+(y%64?64:0)+3,y+3,122,26);}
    for(let i=0;i<90;i++){c.fillStyle='#2c3b2d30';c.fillRect(between(0,w),between(0,h),between(1,8),between(25,180));}
    speckle(c,w,h,18000);
  });
  exteriorMap.wrapS=exteriorMap.wrapT=T.RepeatWrapping;exteriorMap.repeat.set(2.5,1.5);
  const roofMap=canvasTexture(512,512,(c,w,h)=>{
    c.fillStyle='#383e38';c.fillRect(0,0,w,h);
    for(let y=0;y<h;y+=32)for(let x=-32;x<w;x+=64){c.fillStyle=choose(['#555c4d','#464e44','#5f6251']);c.fillRect(x+(y%64?32:0)+1,y+2,62,28);}
    speckle(c,w,h,14000);
  });
  roofMap.wrapS=roofMap.wrapT=T.RepeatWrapping;roofMap.repeat.set(3,3);
  const dirty=finishes.wall;
  const wood=mat('#a39472',{map:woodMap});
  const darkWood=mat('#5b5945',{map:woodMap});
  const fabric=mat('#a1a488',{map:fabricMap});
  const metal=mat('#403e32',{metalness:.55,roughness:.72});
  const concrete=mat('#777869');
  const cream=mat('#bab399');
  const rust=mat('#6c4935');
  const ceiling=mat('#c2bdab',{map:ceilingMap});
  const exterior=mat('#b4a48c',{map:exteriorMap});
  const roofing=mat('#8f977b',{map:roofMap});
  function mesh(geo,material,x,y,z,parent=scene) {
    const m=new T.Mesh(geo,material);m.position.set(x,y,z);parent.add(m);objects.push(m);return m;
  }
  function box(w,h,d,material,x,y,z,parent=scene){const m=mesh(cube,material,x,y,z,parent);m.scale.set(w,h,d);return m;}
  function cylinder(r,h,material,x,y,z,parent=scene){return mesh(new T.CylinderGeometry(r,r,h,12),material,x,y,z,parent);}

  // Keep the texture scale continuous across short walls, lintels and the window sill.
  function wallBox(w,h,d,x,y,z){
    const geo=cube.clone(),p=geo.attributes.position,n=geo.attributes.normal,uv=geo.attributes.uv;
    for(let i=0;i<p.count;i++){
      const wx=x+p.getX(i)*w,wy=y+p.getY(i)*h,wz=z+p.getZ(i)*d;
      const u=Math.abs(n.getX(i))>.5?(n.getX(i)>0?(46-wz)/10.5+.64:(wz-36)/10.5+.38):(wx+27.5)/10.5+(n.getZ(i)<0?.22:0);
      uv.setXY(i,u,(wy-.3)/4.2);
    }
    const m=mesh(geo,dirty,x,y,z);m.scale.set(w,h,d);return m;
  }
  for(const wall of HOME_WALLS)wallBox(wall.w,wall.h,wall.d,wall.x,wall.y,wall.z);
  wallBox(.32,1.35,2.2,-17,3.825,40.8);
  wallBox(3.2,3.15,.32,-25.9,2.925,46);
  wallBox(3.3,3.15,.32,-18.65,2.925,46);
  wallBox(4,1.1,.32,-22.25,3.95,46);

  // Thin lifted edges around the actual masonry damage, matched to the wall atlas.
  const flakeMat=mat('#9b9784',{map:dirty.map,side:T.DoubleSide});
  for(const patch of finishes.damage)for(let i=0;i<12;i++){
    const a=i/12*Math.PI*2,px=patch.x+Math.cos(a)*patch.rx,py=patch.y+Math.sin(a)*patch.ry;
    const shape=new T.Shape();shape.moveTo(-.5,0);shape.lineTo(-.22,.7);shape.lineTo(.42,.35);shape.lineTo(.5,-.3);shape.lineTo(0,-.45);shape.closePath();
    const geo=new T.ShapeGeometry(shape),position=geo.attributes.position,uv=geo.attributes.uv;
    for(let j=0;j<position.count;j++){position.setZ(j,Math.max(0,position.getY(j))*.22);uv.setXY(j,px/2048,1-py/1024);}geo.computeVertexNormals();
    const flake=mesh(geo,flakeMat,-27.5+px/2048*10.5,4.5-py/1024*4.2,36.169);flake.scale.setScalar(between(.025,.065));flake.rotation.z=a;
  }

  // Dark subfloor is visible only inside narrow joints; planks have their own atlas UVs.
  box(10.5,.25,10,darkWood,-22.25,.125,41);
  dressRoomSurfaces({mesh,box,mat,finishes,wood,darkWood,metal,rust});
  box(10.2,.18,.1,darkWood,-22.25,.4,36.22);box(.1,.18,9.6,darkWood,-27.27,.4,41);
  box(.1,.18,3.5,darkWood,-17.22,.4,37.85);box(.1,.18,3.8,darkWood,-17.22,.4,43.95);
  // Partial ceiling, exposed joists and sagging fragments leave daylight entering above the door.
  box(6.4,.22,10,ceiling,-24.3,4.62,41);
  box(4.1,.22,3.5,ceiling,-19.05,4.62,44.25);
  for(let z=36.3;z<46;z+=1.35)box(10.5,.24,.14,darkWood,-22.25,4.43,z);
  for(let i=0;i<7;i++){const p=box(between(.5,1.4),.12,.8,ceiling,between(-22,-17.8),4.32,between(36.5,42));p.rotation.z=between(-.3,.3);}
  for(let z=36.6;z<42;z+=.22)box(.8,.045,.055,wood,-21.6,4.56,z);
  // Outside cornice and small chimney make this dwelling identifiable from the city.
  box(.45,.55,10.6,wood,-16.9,4.4,41);box(11,.55,.5,wood,-22.25,4.4,46.1);
  box(1,2,1.1,rust,-26.1,5.4,37.5);box(1.15,.17,1.25,concrete,-26.1,6.4,37.5);
  box(1.1,.18,2.4,concrete,-16.5,.18,40.8);
  // Exterior brick veneer and masonry plinth; openings exactly match the inside shell.
  box(.035,4.2,3.7,exterior,-16.821,2.4,37.85);
  box(.035,4.2,4.1,exterior,-16.821,2.4,43.95);
  box(.035,1.35,2.2,exterior,-16.821,3.825,40.8);
  box(10.5,4.2,.035,exterior,-22.25,2.4,35.821);
  box(.035,4.2,10,exterior,-27.679,2.4,41);
  for(const [x,w]of[[-25.9,3.2],[-18.65,3.3]])box(w,3.15,.035,exterior,x,2.925,46.179);
  box(10.5,1.05,.035,exterior,-22.25,.825,46.179);box(4,1.1,.035,exterior,-22.25,3.95,46.179);
  for(const [z,d]of[[37.85,3.7],[43.95,4.1]])box(.1,.45,d,concrete,-16.79,.525,z);
  // Low, weathered roof planes retain the collapsed opening over the entrance.
  box(6.6,.12,10.5,roofing,-24.35,4.79,41);
  box(4.1,.12,3.7,roofing,-19.05,4.79,44.3);
  for(let z=36.5;z<42;z+=1.35){const rafter=box(4.4,.16,.12,wood,-19.1,4.83,z);rafter.rotation.z=-.04;}
  for(const z of [35.9,46.1])box(10.9,.28,.2,wood,-22.25,4.7,z);
  // Gutter, downpipe, cracked lintel, house number and an empty porch light.
  cylinder(.065,9.8,metal,-16.73,4.55,41).rotation.x=Math.PI/2;
  cylinder(.06,4.2,rust,-16.7,2.3,45.7);
  for(const y of [.75,2.2,3.8])box(.12,.045,.2,metal,-16.7,y,45.7);
  box(.48,.19,2.8,concrete,-16.9,3.31,40.8);
  for(const z of [39.57,42.03])box(.22,3.12,.14,wood,-16.75,1.87,z);
  const numberMap=canvasTexture(256,128,(c,w,h)=>{c.fillStyle='#263d36';c.fillRect(0,0,w,h);c.strokeStyle='#a9a181';c.lineWidth=6;c.strokeRect(8,8,w-16,h-16);c.fillStyle='#c9c09b';c.font='58px Georgia';c.textAlign='center';c.fillText('214',w/2,85);speckle(c,w,h,1500);});
  mesh(new T.PlaneGeometry(.43,.23),mat('#fff',{map:numberMap}),-16.77,2.26,42.4).rotation.y=Math.PI/2;
  box(.12,.34,.18,metal,-16.7,2.91,39.12);box(.28,.06,.28,metal,-16.61,3.13,39.12);
  box(.18,.24,.17,mat('#798779',{roughness:.6}),-16.61,2.96,39.12);
  for(const z of [39.02,39.22])box(.2,.27,.012,metal,-16.61,2.96,z);
  const switchBox=box(.055,.16,.11,cream,-17.2,1.45,42.3);box(.025,.06,.035,metal,switchBox.position.x-.035,1.45,42.3);
  cylinder(.012,2.8,metal,-17.21,2.96,42.3);

  // Broken, permanently ajar timber door. Individual splintered boards leave holes.
  for(const z of [39.65,41.95])box(.45,2.95,.13,darkWood,-17,1.775,z);
  box(.45,.15,2.45,darkWood,-17,3.2,40.8);
  const door=new T.Group();door.position.set(-17.12,.31,39.7);door.rotation.y=-Math.PI*.94;scene.add(door);
  for(let i=0;i<10;i++) {
    const x=i*.215,base=i===5?.6:between(0,.22),top=i===6?1.7:between(2.4,2.72);
    const shape=new T.Shape();shape.moveTo(0,base);shape.lineTo(.08,base+.16);shape.lineTo(.2,base+.04);shape.lineTo(.2,top);shape.lineTo(.12,top-.16);shape.lineTo(.04,top+.05);shape.lineTo(0,top-.1);shape.closePath();
    const geo=finishes.boardUV(new T.ExtrudeGeometry(shape,{depth:.075,bevelEnabled:true,bevelSize:.002,bevelThickness:.002,bevelSegments:1}),i,true);
    mesh(geo,finishes.doorMat,x,0,0,door);
    // Long thin fibres emerge from the shattered ends.
    for(let j=0;j<3;j++){const splinter=box(.006,between(.06,.19),.018,wood,x+between(.02,.18),base+between(.04,.1),.04,door);splinter.rotation.z=between(-.15,.15);}
  }
  for(const y of [.45,1.85,2.45])box(2.05,.13,.12,darkWood,1.02,y,.08,door);
  for(const y of [.6,2.1])box(.28,.1,.16,metal,.1,y,0,door);
  cylinder(.035,.16,metal,1.78,1.25,.17,door).rotation.x=Math.PI/2;
  box(.06,.2,.06,metal,1.78,1.25,.24,door);
  // Worn lock escutcheon, strap hinges and recessed screw heads remain on both faces.
  for(const side of [-.012,.095]){
    box(.14,.32,.012,rust,1.78,1.25,side,door);
    for(const y of [1.12,1.39]){const screw=cylinder(.011,.014,metal,1.78,y,side+(side<0?-.008:.008),door);screw.rotation.x=Math.PI/2;}
    for(const y of [.6,2.1]){
      box(.47,.065,.018,rust,.23,y,side,door);
      for(const x of [.08,.23,.41]){const screw=cylinder(.012,.021,metal,x,y,side,door);screw.rotation.x=Math.PI/2;}
    }
    for(const y of [.45,1.85,2.45])for(let i=0;i<9;i++){const nail=cylinder(.009,.016,rust,.1+i*.215,y,side+(side<0?-.016:.12),door);nail.rotation.x=Math.PI/2;}
  }
  for(const y of [.6,2.1]){cylinder(.038,.22,rust,0,y,.04,door);for(const dy of [-.1,.1])cylinder(.043,.018,metal,0,y+dy,.04,door);}
  // Raised mouldings and split corner joints give the old frame a profile.
  for(const z of [39.57,42.03]){box(.035,2.95,.08,wood,-17.245,1.775,z);box(.035,2.95,.025,darkWood,-17.266,1.775,z-.055);}


  // A broken south-facing window: mullions, surviving triangular glass, two nailed boards.
  for(const x of [-24.22,-22.25,-20.28])box(.08,2,.12,darkWood,x,2.35,46);
  for(const y of [1.38,2.3,3.35])box(4.1,.08,.14,darkWood,-22.25,y,46);
  const shardMat=mat('#879f91',{transparent:true,opacity:.3,metalness:.4,roughness:.18,side:T.DoubleSide});
  for(let i=0;i<5;i++){const s=new T.Shape();s.moveTo(0,0);s.lineTo(between(.15,.5),0);s.lineTo(between(0,.2),between(.2,.7));s.closePath();mesh(new T.ShapeGeometry(s),shardMat,-24+i*.73,1.4,45.96);}
  box(3.6,.18,.1,wood,-22.2,2.2,45.85).rotation.z=.18;
  box(2.4,.14,.1,darkWood,-22.8,2.9,45.82).rotation.z=-.3;

  // Sofa: separate sagging cushions, torn upholstery, exposed springs.
  box(1.45,.38,3.1,darkWood,-26.35,.55,40.1);
  box(.3,.9,3.1,fabric,-26.96,1,40.1);
  for(let i=0;i<3;i++){const cushion=mesh(new RoundedBoxGeometry(1.17,.3,.91,2,.08),fabric,-26.23,.85,39.08+i*.98);cushion.rotation.z=between(-.1,.1);}
  for(const z of [38.55,41.65])box(1.5,.65,.22,fabric,-26.35,.85,z);
  for(let i=0;i<4;i++)mesh(new T.TorusGeometry(.08,.018,5,12),metal,-25.62,.72,39+i*.22);
  // A mouldy mattress below the window, not in the route to the doorway.
  box(2.8,.21,1.1,fabric,-25.4,.43,44.9);
  box(.75,.18,.75,fabric,-26.3,.6,44.9).rotation.y=.12;

  // The painting hangs alone on the dirty wall; the floor beneath it is walkable.
  const frame=new T.Group();frame.position.set(-22.25,2.54,36.24);frame.rotation.z=-.018;scene.add(frame);
  const artW=1.38,artH=artW*1221/960;
  box(artW+.24,artH+.24,.1,darkWood,0,0,0,frame);
  const brass=mat('#74664c',{map:woodMap,metalness:.22,roughness:.92});
  for(const s of [-1,1]){box(.075,artH+.2,.1,brass,s*(artW/2+.055),0,.065,frame);box(artW+.2,.075,.1,brass,0,s*(artH/2+.055),.065,frame);}
  let artTexture;
  const artworkReady=new Promise((resolve,reject)=>{
    artTexture=new T.TextureLoader().load('/assets/art/sunflowers-1888.jpg',resolve,undefined,reject);
  });
  artTexture.colorSpace=T.SRGBColorSpace;artTexture.anisotropy=8;
  const artMaterial=mat('#c9bda3',{map:artTexture,emissive:'#b5a783',emissiveMap:artTexture,emissiveIntensity:.035});
  mesh(new T.PlaneGeometry(artW,artH),artMaterial,0,0,.12,frame);
  // Fictional weathering is a separate layer; the source reproduction stays untouched.
  const patina=canvasTexture(768,976,(c,w,h)=>{
    c.fillStyle='#a89d7c20';c.fillRect(0,0,w,h);
    for(let i=0;i<28;i++) {
      const x=between(0,w),y=i<18?choose([between(0,90),between(h-100,h)]):between(0,h),r=between(25,130);
      const stain=c.createRadialGradient(x,y,0,x,y,r);
      stain.addColorStop(0,'#443b2590');stain.addColorStop(.4,'#65563a45');stain.addColorStop(1,'#65563a00');
      c.fillStyle=stain;c.fillRect(x-r,y-r,r*2,r*2);
    }
    // Fine irregular varnish cracks, with occasional pale exposed canvas beside them.
    for(let i=0;i<170;i++) {
      let x=between(0,w),y=between(0,h);
      c.beginPath();c.moveTo(x,y);
      for(let j=0;j<between(3,9);j++){x+=between(-13,13);y+=between(4,14);c.lineTo(x,y);}
      c.strokeStyle=choose(['#3d352b48','#51422d38','#dbcca33b']);c.lineWidth=between(.45,1.2);c.stroke();
    }
    for(let i=0;i<650;i++) {
      const edge=Math.floor(rnd()*4),inset=between(0,20);
      const x=edge===0?inset:edge===1?w-inset:between(0,w),y=edge===2?inset:edge===3?h-inset:between(0,h);
      c.fillStyle=choose(['#d0bf9477','#5b4c3180','#c7b58d55']);c.fillRect(x,y,between(1,6),between(1,5));
    }
    for(let i=0;i<1600;i++){c.fillStyle=choose(['#53492d32','#bbaa7a22']);c.fillRect(between(0,w),between(0,h),1,between(1,3));}
  });
  mesh(new T.PlaneGeometry(artW,artH),mat('#ffffff',{map:patina,transparent:true,depthWrite:false,roughness:1}),0,0,.124,frame);
  // A slack hanging wire and a small nail remain visible above the frame.
  const wire=new T.CatmullRomCurve3([new T.Vector3(-22.85,3.52,36.22),new T.Vector3(-22.25,3.8,36.2),new T.Vector3(-21.65,3.52,36.22)]);
  mesh(new T.TubeGeometry(wire,8,.009,4),metal,0,0,0);

  // Shelves and a cupboard with a missing door, tins, bottles, books and an overturned chair.
  box(1.6,2.3,.075,darkWood,-18.5,1.45,36.335);
  for(const x of [-19.26,-17.74])box(.08,2.3,.8,darkWood,x,1.45,36.7);
  for(const y of [.33,2.57])box(1.6,.08,.8,darkWood,-18.5,y,36.7);
  for(const y of [.75,2.1])box(.055,.12,.08,metal,-17.7,y,37.08);
  for(const y of [.5,1.15,1.8,2.45])box(1.5,.08,.7,wood,-18.5,y,36.8);
  for(const x of [-17.9,-17.2])for(const z of [43.4,45])box(.05,2.1,.05,metal,x,1.35,z);
  for(const y of [.5,1.15,1.9,2.35])box(.8,.065,1.8,wood,-17.55,y,44.2);
  const table=new T.Group();table.position.set(-19.5,0,44.4);table.rotation.y=.08;scene.add(table);
  box(2,.1,1.1,wood,0,1.1,0,table);
  for(const x of [-.83,.83])for(const z of [-.4,.4])box(.09,.8,.09,darkWood,x,.65,z,table);
  const chair=new T.Group();chair.position.set(-21.2,.7,45);chair.rotation.set(.1,0,1.3);scene.add(chair);
  box(.55,.07,.55,wood,0,.5,0,chair);box(.55,.55,.07,wood,0,.85,-.24,chair);
  for(const x of [-.23,.23])for(const z of [-.23,.23])box(.045,.5,.045,darkWood,x,.23,z,chair);

  const rugMap=canvasTexture(512,512,(c,w,h)=>{
    c.fillStyle='#78644d';c.fillRect(0,0,w,h);c.strokeStyle='#4c5040';c.lineWidth=28;c.strokeRect(28,28,w-56,h-56);
    for(let x=60;x<w-30;x+=48)for(let y=60;y<h-30;y+=48){c.strokeStyle='#9b8d695a';c.lineWidth=3;c.beginPath();c.moveTo(x,y-17);c.lineTo(x+16,y);c.lineTo(x,y+17);c.lineTo(x-16,y);c.closePath();c.stroke();}speckle(c,w,h,23000);
  });
  mesh(new T.PlaneGeometry(3.4,3.8),mat('#c0b69d',{map:rugMap}),-23.2,.312,40.45).rotation.x=-Math.PI/2;
  // Ferns and weeds entering through the broken window.
  const leaf=mat('#5b6b43',{side:T.DoubleSide});
  for(let i=0;i<32;i++){const blade=mesh(new T.PlaneGeometry(.07,between(.2,.5)),leaf,between(-24.3,-23.6),.5,between(45.4,45.8));blade.rotation.set(between(-.6,.6),between(0,3),between(-.4,.4));}
  furnishInterior({scene,mesh,box,cylinder,mat,canvasTexture,wood,darkWood,metal,rust});
  // Diffuse window light plus a small practical lantern replace the unexplained ceiling hotspot.
  const fill=new T.PointLight('#cad8d2',8,12,2);fill.position.set(-22.25,2.8,45.5);scene.add(fill);
  const skylight=new T.SpotLight('#dce4dc',38,14,.65,.85,1.7);skylight.position.set(-19.8,6.4,39.2);skylight.target.position.set(-22,0,39.8);scene.add(skylight,skylight.target);

  // Room geometry stays separate from the outside, but is still batched by material.
  scene.updateMatrixWorld(true);
  const batches=new Map(),old=new Set();
  for(const m of objects) {
    if(m.material.transparent)continue;
    const list=batches.get(m.material)||[];const geometry=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();list.push(geometry.applyMatrix4(m.matrixWorld));batches.set(m.material,list);old.add(m.geometry);m.removeFromParent();
  }
  for(const [material,parts]of batches){const m=new T.Mesh(mergeGeometries(parts),material);m.castShadow=true;m.receiveShadow=true;scene.add(m);parts.forEach(p=>p.dispose());}
  old.forEach(g=>g.dispose());
  return { ...HOME, obstacles:HOME_OBSTACLES, artworkReady:Promise.all([artworkReady,plasterReady]) };
}
