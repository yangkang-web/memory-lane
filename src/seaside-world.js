import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function createSeasideWorld(scene){
  let seed=81;const random=()=>((seed=seed*16807%2147483647)-1)/2147483646;
  const animated=[],root=new T.Group();root.name='Seaside cottage';scene.add(root);
  const mat=(color,roughness=.75,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
  function texture(kind){const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d'),data=ctx.createImageData(512,512);
    for(let y=0;y<512;y++)for(let x=0;x<512;x++){
      const i=(y*512+x)*4,n=random(),grain=kind==='wood'?Math.sin(y*.4+Math.sin(x*.018)*2+Math.sin(x*.073+y*.008))*.08+Math.sin(y*2.8+x*.015)*.025:kind==='linen'?((x%4<2?1:-1)+(y%4<2?1:-1))*.024:Math.sin(x*.035)*Math.sin(y*.04)*.008;
      const base=kind==='wood'?[155,113,73]:kind==='linen'?[222,214,190]:[213,206,188];
      for(let a=0;a<3;a++)data.data[i+a]=base[a]*(1+grain)+(n-.5)*(kind==='wood'?22:15);data.data[i+3]=255;
    }ctx.putImageData(data,0,0);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=8;return map;
  }
  const woodMap=texture('wood'),fabricMap=texture('linen'),plasterMap=texture('plaster');
  const wood=new T.MeshStandardMaterial({map:woodMap,roughness:.65,color:'#c4ac89'}),teak=wood.clone();teak.color.set('#71533b');
  const linen=new T.MeshStandardMaterial({map:fabricMap,roughness:.98,color:'#ece4ce'}),blue=linen.clone();blue.color.set('#557f87');
  const cream=new T.MeshStandardMaterial({map:plasterMap,roughness:.94,color:'#efe7d1'}),white=mat('#f6ebd5'),brass=mat('#ad8650',.3,.76),black=mat('#343c3b');
  const glass=new T.MeshPhysicalMaterial({color:'#e1f4ed',roughness:.08,metalness:0,transmission:.82,thickness:.008,ior:1.46,transparent:true,opacity:.3,depthWrite:false});
  const ceramic=mat('#c9d8cc',.28),terra=mat('#a5674d'),darkBlue=mat('#37616e',.32);
  function mesh(parent,geometry,material,x=0,y=0,z=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
  function box(parent,w,h,d,material,x=0,y=0,z=0,r=.012){return mesh(parent,r?new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/3,h/3,d/3)):new T.BoxGeometry(w,h,d),material,x,y,z);}
  function cyl(parent,r1,r2,h,material,x=0,y=0,z=0){return mesh(parent,new T.CylinderGeometry(r1,r2,h,40),material,x,y,z);}
  function ball(parent,r,material,x,y,z){return mesh(parent,new T.SphereGeometry(r,28,18),material,x,y,z);}
  function line(parent,points,r,material){return mesh(parent,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),32,r,8,false),material);}
  function lathe(parent,points,material,x,y,z){return mesh(parent,new T.LatheGeometry(points.map(p=>new T.Vector2(...p)),48),material,x,y,z);}
  function label(parent,text,x,y,z,w=.23,h=.045){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#d2bc8c';ctx.fillRect(0,0,512,128);ctx.fillStyle='#4b4636';ctx.textAlign='center';ctx.font='28px Georgia';ctx.fillText(text,256,78);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;const m=mesh(parent,new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map,roughness:.7}),x,y,z);return m;}
  // Individual staggered floorboards: physical gaps, restrained color variation.
  box(root,8.3,.15,8.8,teak,0,-.1,.2);
  for(let row=0;row<22;row++)for(let col=-1;col<6;col++){
    const start=-4.1+col*1.65+(row%3)*.55,left=Math.max(-4.1,start),right=Math.min(4.1,start+1.65);if(right-left<.05)continue;
    const material=wood.clone();material.color.setHSL(.09,.24,.65+random()*.13);
    box(root,right-left-.008,.045,.39,material,(left+right)/2,.001,-3.88+row*.4,.004);
  }
  box(root,.16,3.4,8.6,cream,-4.12,1.7,.15);box(root,.16,3.4,8.6,cream,4.12,1.7,.15);
  box(root,8.4,3.4,.16,cream,0,1.7,4.45);
  // Wide glazed opening facing the sea; wall sections leave real light apertures.
  box(root,8.4,.68,.18,cream,0,.34,-4.12);box(root,8.4,.45,.18,cream,0,3.175,-4.12);
  for(const x of [-3.9,3.9])box(root,.65,2.3,.18,cream,x,1.82,-4.12);
  for(const x of [-3.56,-1.2,1.2,3.56])box(root,.075,2.36,.13,white,x,1.82,-4.04);
  for(const y of [.65,2.98])box(root,7.2,.09,.26,wood,0,y,-4);
  box(root,7.3,.055,.4,white,0,.66,-3.96);
  box(root,8.4,.16,8.7,cream,0,3.48,.2);
  for(const z of [-3.4,-.2,3])box(root,8.2,.16,.16,wood,0,3.32,z);
  for(const x of [-4.01,4.01])box(root,.04,.13,8.5,white,x,.085,.15);
  // Linen curtains with real folds, gathered at either end of the ocean window.
  for(const side of [-1,1]){
    const g=new T.PlaneGeometry(.74,2.48,30,30),p=g.attributes.position;
    for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setZ(i,Math.sin(x*41)*.065+Math.sin(y*3+x*9)*.012);p.setX(i,x*(.75+.13*(y+1.24)));}g.computeVertexNormals();
    const curtain=mesh(root,g,linen,side*3.34,1.75,-3.82);curtain.material=linen.clone();curtain.material.side=T.DoubleSide;animated.push({type:'curtain',mesh:curtain,side});
  }
  // Deck and a distant continuous horizon.
  for(let i=0;i<34;i++)box(root,11,.07,.18,wood,0,-.03,-4.4-i*.19,.003);
  for(const x of [-4.7,4.7])for(let i=0;i<6;i++)box(root,.07,.9,.07,white,x,.4,-4.3-i*.9);
  for(const x of [-4.7,4.7])box(root,.09,.06,5.5,white,x,.85,-6.5);
  const oceanUniforms={time:{value:0},sun:{value:new T.Vector3(-.3,.5,-.8).normalize()}};
  const ocean=mesh(root,new T.PlaneGeometry(1500,1500),new T.ShaderMaterial({uniforms:oceanUniforms,vertexShader:`varying vec3 wp;void main(){vec4 p=modelMatrix*vec4(position,1.);wp=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,fragmentShader:`varying vec3 wp;uniform float time;uniform vec3 sun;void main(){vec2 p=wp.xz;float w=sin(p.x*.74+p.y*.46+time*.65)*.018+sin(p.y*1.83-p.x*1.13-time*.8+sin(p.x*.12))* .009+sin(p.x*3.2+p.y*2.9-time*.32)*.004;float w2=sin(p.y*.57-p.x*.89+time*.4)*.02+sin(p.x*1.72+p.y*1.13+sin(p.y*.13)-time*.7)*.009;vec3 n=normalize(vec3(w,1.,w2));vec3 v=normalize(cameraPosition-wp);float fres=pow(1.-max(dot(v,n),0.),4.);vec3 c=mix(vec3(.055,.25,.29),vec3(.48,.68,.71),fres);float glint=pow(max(dot(reflect(-sun,n),v),0.),140.);float far=smoothstep(50.,550.,length(p));c=mix(c,vec3(.31,.49,.54),far*.65);c+=vec3(1.,.88,.63)*glint*.65;gl_FragColor=vec4(c,1.);
#include <tonemapping_fragment>\n#include <colorspace_fragment>}`}),0,-.7,-450);ocean.rotation.x=-Math.PI/2;ocean.castShadow=false;
  // Distant headland, kept below the sky rather than a flat backdrop card.
  const rockMat=mat('#849b94');for(let i=0;i<12;i++){const r=mesh(root,new T.IcosahedronGeometry(1,2),rockMat,-55-i*5,-2+random()*1.8,-85-i*2);r.scale.set(8,2+random()*5,6);}
  // Sofa, piping, loose cushions and a woven throw.
  const sofa=new T.Group();sofa.position.set(-2.8,0,.6);sofa.rotation.y=Math.PI/2;root.add(sofa);
  for(const x of [-1.15,1.15])for(const z of [-.3,.3])cyl(sofa,.035,.025,.2,teak,x,.13,z);
  box(sofa,2.75,.28,1.03,linen,0,.33,0,.12);box(sofa,2.6,.68,.2,linen,0,.8,-.47,.09);
  for(const x of [-1.34,1.34])box(sofa,.2,.57,1.07,linen,x,.59,0,.085);
  for(const x of [-.65,.65]){box(sofa,1.27,.2,.88,linen,x,.56,.03,.075);line(sofa,[[x-.58,.655,-.36],[x+.58,.655,-.36],[x+.58,.655,.4],[x-.58,.655,.4],[x-.58,.655,-.36]],.003,white);}
  for(const [x,m,r] of [[-.83,blue,.1],[.83,linen,-.16]]){const p=box(sofa,.52,.5,.17,m,x,.85,-.22,.1);p.rotation.set(-.22,0,r);}
  const throwGeo=new T.PlaneGeometry(.8,1.2,24,32);const tp=throwGeo.attributes.position;for(let i=0;i<tp.count;i++){const y=tp.getY(i);tp.setZ(i,Math.sin(tp.getX(i)*35)*.012+(y<0?Math.pow(-y,1.2)*.7:0));}throwGeo.computeVertexNormals();const throwMat=blue.clone();throwMat.side=T.DoubleSide;const blanket=mesh(sofa,throwGeo,throwMat,-.43,.64,.25);blanket.rotation.x=-Math.PI/2;
  // Rug with stitched border and physical fringe.
  const rug=box(root,3.3,.015,3.1,linen,-.5,.038,.85,.004);
  for(const x of [-2.1,1.1])box(root,.024,.004,3,blue,x,.048,.85,.001);
  for(let i=0;i<85;i++)for(const z of [-.77,2.47]){const f=box(root,.008,.006,.10,linen,-2.05+i*.037,.04,z,.001);f.rotation.y=(random()-.5)*.4;}
  // Coffee table: softly rounded slab, turned legs, book and a glazed cup.
  box(root,1.65,.07,.83,wood,-.65,.48,.8,.07);for(const x of [-1.3,0])for(const z of [.53,1.07])cyl(root,.034,.045,.42,teak,x,.24,z);
  box(root,.39,.025,.29,blue,-.83,.54,.71);box(root,.365,.025,.27,white,-.82,.563,.71);
  cyl(root,.064,.052,.10,ceramic,-.29,.58,.86);const rim=mesh(root,new T.TorusGeometry(.06,.005,10,40),white,-.29,.633,.86);rim.rotation.x=Math.PI/2;
  cyl(root,.053,.053,.001,mat('#523d2c'),-.29,.63,.86);const handle=mesh(root,new T.TorusGeometry(.033,.007,10,24),ceramic,-.21,.585,.86);handle.scale.set(1,.85,1);
  // Wicker side lamp and a leafy plant at the window.
  cyl(root,.18,.2,.035,brass,-2.95,.04,-2.5);cyl(root,.014,.017,1.6,brass,-2.95,.85,-2.5);
  const shade=mesh(root,new T.CylinderGeometry(.20,.34,.43,48,1,true),linen,-2.95,1.65,-2.5);shade.material=linen.clone();shade.material.side=T.DoubleSide;
  for(let i=0;i<44;i++){const a=i/44*Math.PI*2;line(root,[[-2.95+Math.cos(a)*.20,1.86,-2.5+Math.sin(a)*.20],[-2.95+Math.cos(a)*.34,1.44,-2.5+Math.sin(a)*.34]],.0025,wood);}
  const lamp=new T.PointLight('#ffdc9b',7,3,2);lamp.position.set(-2.95,1.55,-2.5);root.add(lamp);
  lathe(root,[[0,0],[.18,0],[.24,.35],[.25,.38],[.23,.39]],terra,2.7,.03,-3.4);
  for(let i=0;i<17;i++){const a=i*2.4,h=.4+random()*.65,r=.25+random()*.35;line(root,[[2.7,.35,-3.4],[2.7+Math.cos(a)*r*.4,h*.8+.35,-3.4+Math.sin(a)*r*.4],[2.7+Math.cos(a)*r,h+.35,-3.4+Math.sin(a)*r]],.006,mat('#526747'));
    const leaf=mesh(root,new T.SphereGeometry(1,16,8),mat(i%2?'#69846b':'#405f4a'),2.7+Math.cos(a)*r,h+.35,-3.4+Math.sin(a)*r);leaf.scale.set(.10,.22,.012);leaf.rotation.set(.4*Math.cos(a),a,.6*Math.sin(a));}
  // Collector's cabinet on the right wall, facing into the living room.
  const cabinet=new T.Group();cabinet.name='Right wall collection cabinet';cabinet.position.set(3.67,.04,-.8);cabinet.rotation.y=-Math.PI/2;root.add(cabinet);
  box(cabinet,3.3,2.77,.07,teak,0,1.43,-.24);
  box(cabinet,3.15,2.07,.03,cream,0,1.77,-.192);
  for(const x of [-1.65,1.65])box(cabinet,.09,2.85,.63,teak,x,1.46,.03);
  for(const y of [.07,.62,1.27,2.03,2.88])box(cabinet,3.4,.065,.68,teak,0,y,.03);
  for(const x of [-1.25,-.42,.42,1.25]){box(cabinet,.79,.48,.045,wood,x,.355,.365);box(cabinet,.67,.35,.024,teak,x,.355,.395);ball(cabinet,.017,brass,x,.45,.422);}
  const ledMat=new T.MeshStandardMaterial({color:'#fff1bf',emissive:'#ffce80',emissiveIntensity:3});
  for(const y of [1.24,2,2.85])box(cabinet,3.1,.012,.018,ledMat,0,y,.27,.002);
  for(const y of [1.24,2,2.85]){const l=new T.PointLight('#ffe3b2',2.2,2.1,2);l.position.set(0,y-.08,.26);cabinet.add(l);}
  function book(x,y,z,h,color,tilt=0){const group=new T.Group();group.position.set(x,y,z);group.rotation.z=tilt;cabinet.add(group);box(group,.06,h,.19,mat(color),0,h/2,0,.003);box(group,.045,h-.024,.181,white,0,h/2,.005,.002);for(const sy of [.035,h-.035])box(group,.063,.008,.003,brass,0,sy,.098,.001);}
  for(let i=0;i<7;i++)book(-1.43+i*.075,1.31,.13,.21+random()*.12,['#46666a','#d1c4a1','#8d5d46','#676b4a'][i%4],i===6?-.16:0);
  // Lower shelf: handmade schooner with cloth sails and rigging.
  const ship=new T.Group();ship.position.set(-.84,.67,.07);cabinet.add(ship);
  const hull=lathe(ship,[[0,-.07],[.07,-.07],[.11,-.03],[.12,.035]],teak,0,.09,0);hull.scale.set(3.3,1,.7);
  cyl(ship,.012,.012,.44,teak,0,.35,0);line(ship,[[-.31,.13,0],[0,.56,0],[.31,.13,0]],.002,linen);
  const sailGeo=new T.BufferGeometry();sailGeo.setAttribute('position',new T.Float32BufferAttribute([.015,.53,0,.015,.19,0,.26,.19,.015],3));sailGeo.computeVertexNormals();const sailMat=linen.clone();sailMat.side=T.DoubleSide;mesh(ship,sailGeo,sailMat);
  line(ship,[[.015,.53,.002],[.015,.19,.002],[.26,.19,.017],[.015,.53,.002]],.0025,wood);
  const sail2=mesh(ship,sailGeo.clone(),sailMat);sail2.scale.set(-.85,.9,1);sail2.position.y=.05;
  box(ship,.42,.025,.20,teak,0,.01,0);for(const x of [-.16,.16])cyl(ship,.012,.012,.07,brass,x,.055,0);
  label(cabinet,'THE NORTH STAR',-.84,.60,.376,.31);
  // Assorted pottery and bottles, each with its own profile.
  lathe(cabinet,[[0,0],[.11,0],[.15,.08],[.16,.22],[.09,.3],[.075,.36],[.09,.37]],darkBlue,.51,.66,.08);
  lathe(cabinet,[[0,0],[.07,0],[.105,.13],[.06,.19],[.035,.23],[.035,.34],[.04,.35]],ceramic,.88,.66,.14);
  for(const [x,h]of [[-1.3,.4],[-1.03,.29]]){const bottle=lathe(cabinet,[[0,0],[.065,0],[.07,h*.6],[.03,h*.73],[.025,h],[.028,h]],new T.MeshPhysicalMaterial({color:x<-1.1?'#426d6c':'#a5bbb0',roughness:.16,metalness:0,transparent:true,opacity:.7}),x,2.07,.1);cyl(cabinet,.025,.026,.04,wood,x,2.08+h,.1);}
  // Framed pressed seaweed specimen.
  box(cabinet,.44,.49,.03,teak,-.51,2.33,.05);box(cabinet,.39,.44,.015,white,-.51,2.33,.071);
  for(let i=0;i<7;i++){const x=-.51+(i-3)*.037;line(cabinet,[[-.51,2.16,.085],[x,2.3,.087],[x+(i-3)*.017,2.47-random()*.07,.087]],.003,mat('#5c7460'));}
  // Nautilus spiral, ribbed ivory with naturally alternating bands.
  const shell=new T.Group();shell.position.set(.15,2.26,.10);shell.scale.setScalar(.7);cabinet.add(shell);
  const pos=[],col=[],idx=[];const rings=240,sides=16;
  for(let i=0;i<=rings;i++){const t=i/rings*Math.PI*4.8,r=.016*Math.exp(t*.19),tube=.005+r*.30;for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2,rad=r+tube*Math.cos(a);pos.push(Math.cos(t)*rad,Math.sin(t)*rad,tube*Math.sin(a)*.8);const c=new T.Color(i%14<3?'#94644b':'#e8d9b9');c.multiplyScalar(.92+.08*Math.cos(a));col.push(c.r,c.g,c.b);if(i<rings&&j<sides){const q=i*(sides+1)+j;idx.push(q,q+sides+1,q+1,q+1,q+sides+1,q+sides+2);}}}
  const sg=new T.BufferGeometry();sg.setAttribute('position',new T.Float32BufferAttribute(pos,3));sg.setAttribute('color',new T.Float32BufferAttribute(col,3));sg.setIndex(idx);sg.computeVertexNormals();mesh(shell,sg,new T.MeshStandardMaterial({vertexColors:true,roughness:.38}));
  // Small lighthouse and a mineral on a brass stand.
  cyl(cabinet,.065,.11,.38,white,1.1,2.26,.08);for(const y of [2.17,2.33])cyl(cabinet,.09,.09,.035,darkBlue,1.1,y,.08);
  cyl(cabinet,.075,.075,.09,brass,1.1,2.49,.08);mesh(cabinet,new T.ConeGeometry(.12,.11,24),darkBlue,1.1,2.59,.08);
  cyl(cabinet,.08,.09,.018,brass,.67,2.08,.09);cyl(cabinet,.008,.008,.13,brass,.67,2.15,.09);const mineral=mesh(cabinet,new T.IcosahedronGeometry(.09,1),mat('#809d91',.2),.67,2.27,.09);mineral.rotation.z=.6;
  // Chart tube and stacked field notebooks.
  for(let i=0;i<3;i++){const b=box(cabinet,.36,.035,.21,i%2?blue:linen,1.1,1.32+i*.04,.12,.003);b.rotation.y=.06*i;}
  // User-supplied textured cigarette; isolated from the display plinth.
  const cigaretteDisplay=new T.Group();cigaretteDisplay.name='User cigarette butt display';cigaretteDisplay.position.set(-.67,1.315,.19);cabinet.add(cigaretteDisplay);
  box(cigaretteDisplay,.55,.035,.34,teak,0,0,0);
  const supports=[-.12,.12].map(x=>({x,stem:cyl(cigaretteDisplay,.012,.016,1,brass,x,0,0),rest:box(cigaretteDisplay,.035,.009,.05,brass,x,.061,0,.004)}));
  supports.forEach(({stem})=>{stem.scale.y=.042;stem.position.y=.038;});
  label(cabinet,'06  /  CIGARETTE',-.67,1.238,.378,.3);
  let disposed=false;
  function disposeObject(object){const geometries=new Set(),materials=new Set(),textures=new Set();object.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?[].concat(o.material):[]){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());object.removeFromParent();}
  const loader=new GLTFLoader();
  const cigaretteReady=loader.loadAsync('/assets/seaside/cigarette-butt.glb').then(({scene:asset})=>{
    if(disposed){disposeObject(asset);return;}
    asset.name='Meshy AI Cigarette Butt / user supplied';
    // New user asset retains its authored shape and surface maps.
    asset.rotation.z=0;
    const bounds=new T.Box3().setFromObject(asset,true),size=bounds.getSize(new T.Vector3()),scale=.39/size.x;
    asset.scale.setScalar(scale);bounds.setFromObject(asset,true);const center=bounds.getCenter(new T.Vector3());
    asset.position.set(-center.x,.065-bounds.min.y,-center.z);
    asset.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;for(const m of [].concat(o.material)){m.color.multiplyScalar(.8);if(m.map)m.map.anisotropy=8;if(m.normalMap)m.normalScale.set(.55,.55);}}});
    cigaretteDisplay.add(asset);root.updateMatrixWorld(true);
    // Fit each cradle to the underside of the authored, slightly irregular body.
    for(const {x,stem,rest} of supports){
      const origin=cigaretteDisplay.localToWorld(new T.Vector3(x,.018,0)),direction=new T.Vector3(0,1,0).transformDirection(cigaretteDisplay.matrixWorld);
      const hit=new T.Raycaster(origin,direction,0,.4).intersectObject(asset,true)[0];
      if(hit){const top=cigaretteDisplay.worldToLocal(hit.point).y,height=Math.max(.01,top-.018-.009);stem.scale.y=height;stem.position.y=.018+height/2;rest.position.y=top-.0045;}
    }
  });
  let hero;
  // The necklace is the central focal collectible; the letter remains on the right.
  function loadKeepsake({file,name,x,width,rotationX,backing=false}){
    const display=new T.Group();display.name=name+' display';if(backing)hero=display;display.position.set(x,1.32,.12);cabinet.add(display);
    box(display,.50,.025,.30,teak,0,0,0);
    if(backing){
      box(display,.48,.54,.025,teak,0,.282,-.07);
      box(display,.45,.51,.009,mat('#243b40',.96),0,.282,-.051);
    }else{
      // A small easel supports the envelope, leaving its face unobstructed.
      box(display,.30,.018,.06,brass,0,.026,.06,.004);
      const brace=box(display,.025,.27,.025,teak,0,.14,-.06);brace.rotation.x=-.25;
    }
    label(cabinet,backing?'07  /  HEART':'08  /  LETTER',x,1.238,.378,.31);
    return loader.loadAsync('/assets/seaside/'+file).then(({scene:asset})=>{
      if(disposed){disposeObject(asset);return;}
      asset.name=name;asset.rotation.x=rotationX;
      const bounds=new T.Box3().setFromObject(asset,true),size=bounds.getSize(new T.Vector3());
      asset.scale.setScalar(Math.min(width/size.x,.48/size.y,.24/size.z));
      bounds.setFromObject(asset,true);const center=bounds.getCenter(new T.Vector3());
      asset.position.set(-center.x,.036-bounds.min.y,-center.z);
      asset.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;for(const m of [].concat(o.material)){if(m.map)m.map.anisotropy=8;if(m.normalMap)m.normalScale.set(.6,.6);}}});
      display.add(asset);
    });
  }
  const ready=Promise.all([
    cigaretteReady,
    loadKeepsake({file:'heart-necklace.glb',name:'User heart necklace',x:0,width:.42,rotationX:Math.PI/2,backing:true}),
    loadKeepsake({file:'love-letter.glb',name:'User love letter envelope',x:.67,width:.46,rotationX:-.12}),
  ]);
  // Warm pool of light over the hero, with an actual shadow under the stand.
  const spot=new T.SpotLight('#ffe2b4',4,4,.6,.75,1.5);spot.position.set(2.95,2.82,-.8);spot.target.position.set(3.25,1.4,-.8);spot.castShadow=true;spot.shadow.mapSize.set(512,512);spot.shadow.bias=-.001;root.add(spot,spot.target);
  // Floating dust, sparse enough to read as sunlight rather than snow.
  const dustPositions=new Float32Array(90*3);for(let i=0;i<90;i++)dustPositions.set([(random()-.5)*6,random()*3,-3+random()*5],i*3);
  const dg=new T.BufferGeometry();dg.setAttribute('position',new T.BufferAttribute(dustPositions,3));const dust=new T.Points(dg,new T.PointsMaterial({color:'#fff2cf',size:.009,transparent:true,opacity:.28,depthWrite:false}));root.add(dust);
  return {root,hero,cabinet,ready,update(t){oceanUniforms.time.value=t;dust.rotation.y=Math.sin(t*.03)*.015;for(const c of animated)c.mesh.rotation.y=Math.sin(t*.6+c.side)*.012;},dispose(){disposed=true;disposeObject(root);}};
}
