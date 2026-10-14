import * as T from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const V = (x, y, z) => new T.Vector3(x, y, z);
let seed = 7182;
const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const range = (a, b) => a + random() * (b - a);

export async function createWorld(canvas, nodes, onManual, onObject) {
  const scene = new T.Scene();
  scene.fog = new T.FogExp2('#d6c3a7', 0.007);
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const camera = new T.PerspectiveCamera(56, innerWidth / innerHeight, 0.1, 210);
  camera.position.set(0, 1.72, 20);
  const target=new T.WebGLRenderTarget(innerWidth,innerHeight,{samples:Math.min(4,renderer.capabilities.maxSamples),type:T.HalfFloatType});
  const composer = new EffectComposer(renderer,target);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new T.Vector2(innerWidth, innerHeight), 0.24, 0.45, 1.1);
  composer.addPass(bloom); composer.addPass(new OutputPass());

  const materials = {};
  function mat(color, roughness = 0.8, metalness = 0) {
    const key = `${color}-${roughness}-${metalness}`;
    return materials[key] ||= new T.MeshStandardMaterial({ color, roughness, metalness });
  }
  const cream = mat('#d1c4a8'), darkStone = mat('#747a6c'), brass = mat('#c3a06a', 0.3, 0.62), wood = mat('#735c47');
  function surfaceTexture(base,variation) {
    const c=document.createElement('canvas');c.width=c.height=512;const cx=c.getContext('2d');cx.fillStyle=base;cx.fillRect(0,0,512,512);
    for(let i=0;i<85;i++){
      const x=range(0,512),y=range(0,512),r=range(15,95),grad=cx.createRadialGradient(x,y,0,x,y,r);
      grad.addColorStop(0,variation);grad.addColorStop(1,'transparent');cx.fillStyle=grad;cx.fillRect(x-r,y-r,r*2,r*2);
    }
    for(let i=0;i<4000;i++){cx.fillStyle=i%2?'rgba(255,245,216,.045)':'rgba(43,54,31,.04)';const r=range(.4,1.5);cx.fillRect(range(0,512),range(0,512),r,r);}
    const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.anisotropy=8;return tx;
  }
  const colliders = [], objects = [], lights = [], floating = [];
  function mesh(geo, material, x = 0, y = 0, z = 0, parent = scene) {
    const m = new T.Mesh(geo, material); m.position.set(x,y,z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  function box(w,h,d,material,x,y,z,parent=scene) { return mesh(new T.BoxGeometry(w,h,d),material,x,y,z,parent); }
  function cyl(r1,r2,h,material,x,y,z,parent=scene,n=16) { return mesh(new T.CylinderGeometry(r1,r2,h,n),material,x,y,z,parent); }
  function orb(r,material,x,y,z,parent=scene) { return mesh(new T.SphereGeometry(r,14,10),material,x,y,z,parent); }
  function cylinderBetween(a,b,r,material,parent=scene,r2=r) {
    const m = cyl(r2,r,a.distanceTo(b),material,0,0,0,parent,8);
    m.position.copy(a.clone().add(b).multiplyScalar(0.5)); m.quaternion.setFromUnitVectors(V(0,1,0),b.clone().sub(a).normalize()); return m;
  }

  const sky = new T.Mesh(new T.SphereGeometry(150,32,20), new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false,
    uniforms: { top: {value: new T.Color('#537f99')}, middle:{value:new T.Color('#b9cccb')}, bottom:{value:new T.Color('#ffd1aa')} },
    vertexShader: 'varying vec3 p; void main(){p=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec3 p;uniform vec3 top;uniform vec3 middle;uniform vec3 bottom;void main(){vec3 d=normalize(p);float h=d.y;vec3 c=mix(bottom,middle,smoothstep(.0,.38,h));c=mix(c,top,smoothstep(.23,.85,h));float bands=sin(d.x*6.+sin(d.z*7.)*1.3+sin(d.y*19.)*.4);float clouds=smoothstep(.55,.95,bands)*(1.-smoothstep(.24,.38,h))*smoothstep(.09,.17,h);c=mix(c,vec3(.88,.83,.74),clouds*.18);gl_FragColor=vec4(c,1.);}',
  })); scene.add(sky);
  const sunMat = new T.MeshBasicMaterial({color:'#ffe0ad'});
  orb(3.2,sunMat,-45,12,-85);
  const hemi = new T.HemisphereLight('#c5e5ec','#64754e',2.2);scene.add(hemi);
  const sun = new T.DirectionalLight('#ffcf99',3.2);sun.position.set(-28,25,15);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-26,right:26,top:30,bottom:-30,near:1,far:110});sun.shadow.bias=-0.001;sun.shadow.normalBias=0.12;scene.add(sun);
  const turf=surfaceTexture('#86916c','rgba(61,85,47,.13)');turf.repeat.set(16,16);
  mesh(new T.PlaneGeometry(230,230),new T.MeshStandardMaterial({map:turf,roughness:1}),0,-0.08,0).rotation.x=-Math.PI/2;
  for(let i=0;i<8;i++){
    const hill=mesh(new T.SphereGeometry(1,32,16),mat(i%2?'#6f887d':'#83988b'),-60+i*18,-3,-58-range(0,15));
    hill.scale.set(range(17,25),range(7,12),range(11,18));hill.castShadow=false;
  }

  const curve = new T.CatmullRomCurve3([V(0,0.018,20.5),V(-1.4,0.018,11),V(1.6,0.018,2.4),V(-0.6,0.018,-8.8),V(0,0.018,-18)]);
  const samples=curve.getPoints(160), pathVerts=[], pathIndices=[];
  samples.forEach((p,i)=>{
    const tangent=curve.getTangent(i/160), side=V(-tangent.z,0,tangent.x).multiplyScalar(1.9);
    pathVerts.push(p.x+side.x,p.y,p.z+side.z,p.x-side.x,p.y,p.z-side.z);
    if(i<160){const j=i*2;pathIndices.push(j,j+2,j+1,j+1,j+2,j+3);}
  });
  const pathUvs=[];for(let i=0;i<=160;i++)pathUvs.push(0,i/160*20,1,i/160*20);
  const pathGeo=new T.BufferGeometry();pathGeo.setAttribute('position',new T.Float32BufferAttribute(pathVerts,3));pathGeo.setAttribute('uv',new T.Float32BufferAttribute(pathUvs,2));pathGeo.setIndex(pathIndices);pathGeo.computeVertexNormals();
  const gravel=surfaceTexture('#cabe9f','rgba(115,100,75,.10)');
  const pathMesh=mesh(pathGeo,new T.MeshStandardMaterial({map:gravel,roughness:1}));pathMesh.material.side=T.DoubleSide;pathMesh.castShadow=false;
  for(let i=0;i<60;i++){
    const t=i/59,p=curve.getPoint(t), tangent=curve.getTangent(t),side=V(-tangent.z,0,tangent.x);
    for(const dir of [-1,1]){const q=p.clone().addScaledVector(side,dir*1.93);const stone=box(0.25,0.14,0.6,darkStone,q.x,0.08,q.z);stone.rotation.y=Math.atan2(tangent.x,tangent.z);}
  }
  for(let i=0;i<42;i++){
    const p=curve.getPoint(i/42);const stone=box(1.2+range(0,0.5),0.045,0.65,mat(i%3===0?'#d4c9b0':'#bbb29b'),p.x,0.032,p.z);
    stone.rotation.y=range(-0.15,0.15); stone.position.x+=range(-0.4,0.4);
  }

  function column(x,z,h=3.8,parent=scene) {
    cyl(.38,.46,.24,cream,x,.12,z,parent);cyl(.22,.27,h,cream,x,h/2+.2,z,parent);
    cyl(.4,.33,.18,cream,x,h+.25,z,parent);box(.82,.15,.82,cream,x,h+.4,z,parent);
  }
  function arch(x,z,h=3.8,width=5) {
    const g=new T.Group();scene.add(g);g.position.set(x,0,z);
    column(-width/2,0,h,g);column(width/2,0,h,g);
    const shape=new T.Shape();shape.absarc(0,h+.2,width/2,0,Math.PI,false);shape.lineTo(-width/2+.27,h+.2);
    shape.absarc(0,h+.2,width/2-.27,Math.PI,0,true);shape.closePath();
    const a=mesh(new T.ExtrudeGeometry(shape,{depth:.42,bevelEnabled:true,bevelSize:.04,bevelThickness:.04,bevelSegments:2,steps:1}),cream,0,0,-.21,g);
    a.castShadow=true;return g;
  }
  arch(0,17.2,3.4,5.5);arch(0,-18,3.4,5.5);
  for(let i=0;i<7;i++){column(-9.5,-19+i*6,2.8);box(.32,.22,5.3,cream,-9.5,2.9,-16.4+i*6);}
  for(let i=0;i<4;i++)column(8.5,-16+i*7,2.8);
  const wall=box(.35,1.2,42,cream,-10.1,.6,0);
  for(let z=-20;z<20;z+=2)box(.65,.15,1.85,cream,-10.1,1.26,z);

  function lantern(x,z,h=2.3) {
    cyl(.11,.18,.25,brass,x,.12,z);cyl(.035,.05,h,brass,x,h/2,z);
    box(.4,.09,.4,brass,x,h+.1,z);box(.3,.52,.3,new T.MeshStandardMaterial({color:'#ffddb0',emissive:'#ffba6b',emissiveIntensity:.9,roughness:.4}),x,h+.4,z);
    for(const dx of [-.16,.16])for(const dz of [-.16,.16])box(.025,.55,.025,brass,x+dx,h+.4,z+dz);
    const cap=mesh(new T.ConeGeometry(.32,.22,4),brass,x,h+.8,z);cap.rotation.y=Math.PI/4;
    const glow=new T.PointLight('#ffbf78',3.5,5,2);glow.position.set(x,h+.4,z);scene.add(glow);lights.push(glow);
    colliders.push({x,z,r:.3});
  }
  [[-2.8,14],[2.4,7],[-2.5,2.6],[2.4,-6],[-2.6,-14]].forEach(([x,z])=>lantern(x,z));

  let treeTemplate;
  try {
    const gltf = await new GLTFLoader().loadAsync('/assets/nature/BirchTree_1.gltf');
    treeTemplate = gltf.scene;
    const bounds = new T.Box3().setFromObject(treeTemplate), height = bounds.max.y - bounds.min.y;
    treeTemplate.scale.setScalar(5.6 / height);
    treeTemplate.position.y = -bounds.min.y * 5.6 / height;
    const leafMaterials=['#8a9d73','#9fa97b','#b4b98a','#859b73'].map(color=>new T.MeshStandardMaterial({color,roughness:1}));
    let crownGeometry=new T.IcosahedronGeometry(1,2);
    const crownVertices=crownGeometry.attributes.position;
    for(let i=0;i<crownVertices.count;i++){
      const x=crownVertices.getX(i),y=crownVertices.getY(i),z=crownVertices.getZ(i),r=1+.065*Math.sin(x*9+z*3)*Math.cos(y*7-z*5);
      crownVertices.setXYZ(i,x*r,y*r,z*r);
    }crownGeometry.deleteAttribute('normal');crownGeometry.deleteAttribute('uv');crownGeometry=mergeVertices(crownGeometry);crownGeometry.computeVertexNormals();
    const crown=new T.Group();
    const leafMeshes=[];treeTemplate.traverse(o=>{if(o.isMesh&&o.material.name.includes('Leaves'))leafMeshes.push(o);});
    for(const leaves of leafMeshes){
      const positions=leaves.geometry.attributes.position, centers=[];
      for(let i=0;i<200&&centers.length<23;i++){
        const index=Math.floor(random()*positions.count),point=V(positions.getX(index),positions.getY(index),positions.getZ(index));
        if(point.y<2.2||centers.some(p=>p.distanceTo(point)<.48))continue;
        centers.push(point);
      }
      centers.forEach((point,i)=>{const m=new T.Mesh(crownGeometry,leafMaterials[i%4]);m.position.copy(point);m.scale.set(range(.6,.83),range(.46,.64),range(.6,.83));m.castShadow=true;m.receiveShadow=true;crown.add(m);});
      leaves.visible=false;
    }
    treeTemplate.add(crown);
    treeTemplate.traverse(o=>{if(o.isMesh){
      o.castShadow=true;o.receiveShadow=true;o.material.roughness=.9;o.material.metalness=0;
      if(o.material.name.includes('Bark'))o.material.color.set('#c2bfb0');
    }});
  } catch (error) { console.warn('Using the built-in garden trees', error.message); }
  function tree(x,z,size=1,color='#627c64') {
    const g=new T.Group();scene.add(g);g.position.set(x,0,z);g.scale.setScalar(size);
    if(treeTemplate){g.add(treeTemplate.clone(true));g.rotation.y=range(0,Math.PI*2);colliders.push({x,z,r:.28*size});return g;}
    cylinderBetween(V(0,0,0),V(.15,4.8,0),.19,mat('#796b54'),g,.09);
    const leaf=mat(color);
    for(let b=0;b<6;b++){
      const angle=b*2.399+range(-.3,.3), reach=range(1.4,2.7), height=range(3.0,5.3);
      const tip=V(Math.cos(angle)*reach,height,Math.sin(angle)*reach);
      cylinderBetween(V(.1,2.1+b*.38,0),tip,.08,mat('#796b54'),g,.035);
      const o=orb(range(1.3,1.8),leaf,tip.x,tip.y+.5,tip.z,g);o.scale.set(1,range(.55,.85),1);
      for(let k=0;k<2;k++){const c=orb(range(.6,1.2),leaf,tip.x+range(-1,1),tip.y+range(-.2,.8),tip.z+range(-1,1),g);c.scale.y=.65;}
    }
    colliders.push({x,z,r:.28*size});return g;
  }
  const mainTree=tree(-6.6,6.6,1.75,'#687961');
  for(let i=0;i<35;i++){
    const side=i%2?1:-1, x=side*range(11,26),z=range(-40,30);
    tree(x,z,range(.7,1.4),['#617562','#728267','#566f65'][i%3]);
  }
  tree(-6,-8,1.15,'#878875');tree(6,12,1.2,'#6e836d');

  function hedge(x,z,w,d) {
    const m=box(w,.8,d,mat('#617558'),x,.45,z);
    for(let i=0;i<w*1.2;i++)orb(.42,mat('#6f805d'),x-w/2+i*.8,.8,z);
    colliders.push({x,z,halfW:w/2,halfD:d/2});return m;
  }
  hedge(-6,14,5,1.3);hedge(5.6,16,4.2,1.3);hedge(6.1,-14.3,4.2,1.4);

  // All plants share geometry so the garden stays cheap to render.
  const grassParts=[];
  for(let i=0;i<3;i++){
    const blade=new T.BufferGeometry();blade.setAttribute('position',new T.Float32BufferAttribute([-.025,0,0,.025,0,0,.025,.17+i*.035,.025],3));blade.rotateY(i*2.1);blade.translate(i*.02,0,0);blade.computeVertexNormals();grassParts.push(blade);
  }
  const grassGeo=mergeGeometries(grassParts);
  const grassMat=new T.MeshStandardMaterial({color:'#8f9b68',side:T.DoubleSide,roughness:1});
  const grass=new T.InstancedMesh(grassGeo,grassMat,3800);const dummy=new T.Object3D();
  let count=0;
  for(let i=0;i<8000&&count<3800;i++){
    const x=range(-18,18),z=range(-27,24);
    let distance=100;for(let j=0;j<samples.length;j+=5)distance=Math.min(distance,Math.hypot(x-samples[j].x,z-samples[j].z));
    if(distance<2.1||x>9&&z<5&&z>-17)continue;
    dummy.position.set(x,.02,z);dummy.rotation.set(range(-.15,.15),range(0,Math.PI),range(-.2,.2));dummy.scale.setScalar(range(.6,1.3));dummy.updateMatrix();grass.setMatrixAt(count,dummy.matrix);
    grass.setColorAt(count,new T.Color().setHSL(range(.19,.27),.22,range(.33,.49)));count++;
  }grass.count=count;grass.receiveShadow=true;scene.add(grass);

  const stem=new T.CylinderGeometry(.012,.018,.28,5);stem.translate(0,.14,0);
  const petals=[];
  for(let j=0;j<5;j++){const p=new T.SphereGeometry(.06,7,5);p.scale(1,.4,1);p.translate(Math.sin(j/5*6.28)*.055,.29,Math.cos(j/5*6.28)*.055);petals.push(p);}
  const head=mergeGeometries(petals);
  const flowers=new T.InstancedMesh(head,mat('#e4d5dd'),300),stems=new T.InstancedMesh(stem,mat('#5c7458'),300);
  const clusters=[.07,.25,.39,.59,.72,.91];
  for(let i=0;i<300;i++){
    const t=T.MathUtils.clamp(clusters[i%clusters.length]+range(-.04,.04),0,1),p=curve.getPoint(t),side=curve.getTangent(t);const dx=-side.z,dz=side.x;const r=(i%2?1:-1)*range(2.25,3.9);
    dummy.position.set(p.x+dx*r,.04,p.z+dz*r);dummy.rotation.set(0,range(0,6.28),range(-.1,.1));dummy.scale.setScalar(range(.65,1.35));dummy.updateMatrix();flowers.setMatrixAt(i,dummy.matrix);stems.setMatrixAt(i,dummy.matrix);
    flowers.setColorAt(i,new T.Color(['#b4a8ce','#e9c9bd','#ede6cb','#a9bbd2'][i%4]));
  }scene.add(flowers,stems);

  const pondGeo=new T.CircleGeometry(8,64);const waterMat=new T.ShaderMaterial({
    transparent:true, uniforms:{time:{value:0}},
    vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec2 v;uniform float time;void main(){float w=sin(v.y*160.+time*.7+sin(v.x*40.+time*.2)*2.);float w2=sin(v.x*90.+v.y*30.-time*.3);vec3 c=mix(vec3(.22,.38,.40),vec3(.52,.63,.60),v.y);c+=pow(max(0.,w*w2),10.)*.11;gl_FragColor=vec4(c,.93);}',
  });
  const pond=mesh(pondGeo,waterMat,16,-.015,-6);pond.rotation.x=-Math.PI/2;pond.scale.set(1,1.45,1);pond.castShadow=false;
  for(let i=0;i<50;i++){const a=i/50*Math.PI*2;const rock=orb(range(.45,.8),darkStone,16+Math.cos(a)*8,.03,-6+Math.sin(a)*11.6);rock.scale.y=.3;}
  for(let i=0;i<12;i++){const pad=mesh(new T.CircleGeometry(range(.25,.45),16),mat('#677e61'),range(10,18),.012,range(-13,0));pad.rotation.x=-Math.PI/2;}

  function table(x,z,w=3,d=1.3) {
    const g=new T.Group();g.position.set(x,0,z);scene.add(g);
    box(w,.14,d,wood,0,1.04,0,g);box(w+.12,.025,d+.12,mat('#d8cbae'),0,1.13,0,g);
    for(const a of [-1,1])for(const b of [-1,1])box(.12,1.0,.12,wood,a*(w/2-.25),.5,b*(d/2-.2),g);
    colliders.push({x,z,halfW:w/2+.15,halfD:d/2+.15});return g;
  }
  function chair(x,z,angle=0) {
    const g=new T.Group();g.position.set(x,0,z);g.rotation.y=angle;scene.add(g);
    box(.7,.12,.66,wood,0,.55,0,g);
    for(const a of [-1,1])for(const b of [-1,1])box(.07,.58,.07,wood,a*.29,.28,b*.26,g);
    for(const a of [-1,1])box(.08,.8,.08,wood,a*.3,.94,-.26,g);
    box(.65,.12,.08,wood,0,1.28,-.26,g);box(.6,.08,.08,wood,0,1.0,-.26,g);
    box(.6,.04,.56,mat('#ad9270'),0,.64,0,g);colliders.push({x,z,r:.53});return g;
  }
  function cup(parent,x,y,z,scale=1) {
    const g=new T.Group();g.position.set(x,y,z);g.scale.setScalar(scale);parent.add(g);
    const porcelain=mat('#ece1cd',.23);
    cyl(.2,.2,.028,porcelain,0,.02,0,g,24);
    mesh(new T.LatheGeometry([new T.Vector2(.065,0),new T.Vector2(.08,.03),new T.Vector2(.12,.13),new T.Vector2(.14,.18),new T.Vector2(.125,.18),new T.Vector2(.1,.12),new T.Vector2(.07,.03)],24),porcelain,0,.036,0,g);
    const handle=mesh(new T.TorusGeometry(.07,.015,8,16),porcelain,.145,.14,0,g);
    mesh(new T.CircleGeometry(.11,20),mat('#7a4930',.18),0,.18,0,g).rotation.x=-Math.PI/2;
    const rim=mesh(new T.TorusGeometry(.134,.004,5,24),brass,0,.216,0,g);rim.rotation.x=Math.PI/2;
    return g;
  }
  function teapot(parent,x,y,z) {
    const g=new T.Group();g.position.set(x,y,z);parent.add(g);
    orb(.25,mat('#d8c4a4',.3),0,.25,0,g).scale.set(1,.82,1);
    cyl(.16,.2,.04,brass,0,.46,0,g);orb(.04,brass,0,.51,0,g);
    const handle=mesh(new T.TorusGeometry(.18,.023,8,20),brass,-.24,.28,0,g);handle.rotation.y=0;
    cylinderBetween(V(.15,.22,0),V(.36,.43,0),.055,mat('#d8c4a4',.3),g,.032);return g;
  }
  const longTable=table(-5.8,6.0,5.1,1.5);
  [-7.5,-6,-4.5].forEach(x=>{chair(x,4.85,Math.PI);chair(x,7.2);});chair(-8.8,6,Math.PI/2);
  cup(longTable,-1.2,1.16,.25,1.2);cup(longTable,0,1.16,-.3);cup(longTable,1.1,1.16,.23,1.1);teapot(longTable,.4,1.16,0);
  const plates=[];for(let i=0;i<5;i++)cyl(.19,.19,.025,mat('#ece1cd',.3),range(-2,2),1.17,range(-.45,.45),longTable,24);
  const seatObject=scene.children.find(g=>g.position.x===-4.5&&g.position.z===7.2);if(seatObject)objects.push({mesh:seatObject,node:nodes[0]});
  // A stationary clock is an interpretation of the Hatter's words, not an extra event.
  cyl(.48,.59,.18,cream,4.4,.09,-.4);cyl(.3,.4,.9,cream,4.4,.6,-.4);cyl(.63,.5,.14,cream,4.4,1.12,-.4);
  const watch=new T.Group();watch.position.set(4.4,1.74,-.4);watch.scale.setScalar(1.2);watch.rotation.set(-.15,-.65,0);scene.add(watch);
  const body=cyl(.4,.4,.07,brass,0,0,0,watch,48);body.rotation.x=Math.PI/2;
  const clockCanvas=document.createElement('canvas');clockCanvas.width=512;clockCanvas.height=512;
  const cc=clockCanvas.getContext('2d');cc.fillStyle='#ede3c9';cc.fillRect(0,0,512,512);cc.strokeStyle='#a58a55';cc.lineWidth=5;cc.beginPath();cc.arc(256,256,225,0,Math.PI*2);cc.stroke();
  cc.font='30px Georgia';cc.textAlign='center';cc.textBaseline='middle';cc.fillStyle='#4d5148';
  const numerals=['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'];
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;cc.fillText(numerals[i],256+Math.sin(a)*185,256-Math.cos(a)*185);}
  cc.lineWidth=9;cc.lineCap='round';cc.beginPath();cc.moveTo(256,256);cc.lineTo(256,360);cc.stroke();cc.lineWidth=5;cc.beginPath();cc.moveTo(256,256);cc.lineTo(256,100);cc.stroke();cc.beginPath();cc.arc(256,256,10,0,7);cc.fill();
  const tex=new T.CanvasTexture(clockCanvas);tex.colorSpace=T.SRGBColorSpace;
  const face=mesh(new T.CircleGeometry(.37,48),new T.MeshStandardMaterial({map:tex,roughness:.55}),0,0,.038,watch);face.receiveShadow=false;
  const ring=mesh(new T.TorusGeometry(.08,.02,8,20),brass,0,.47,0,watch);objects.push({mesh:watch,node:nodes[1]});colliders.push({x:4.4,z:-.4,r:.7});

  const round=table(-3.8,-11.6,2.4,1.3);chair(-5.6,-11.6,Math.PI/2);chair(-3.8,-12.8,Math.PI);chair(-3.8,-10.4);
  const lastCup=cup(round,.4,1.16,.2,2.1);cup(round,-.6,1.16,-.2,1.1);teapot(round,-.1,1.16,0);objects.push({mesh:lastCup,node:nodes[2]});
  for(let z=-13;z<-9;z+=1.1){cyl(.25,.29,.38,mat('#9a7961'),-6.6,.19,z);orb(.5,mat('#809367'),-6.6,.57,z);}

  function glowTexture() {
    const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),grad=g.createRadialGradient(32,32,0,32,32,32);
    grad.addColorStop(0,'rgba(255,226,171,1)');grad.addColorStop(.15,'rgba(255,202,125,.8)');grad.addColorStop(1,'rgba(255,202,125,0)');g.fillStyle=grad;g.fillRect(0,0,64,64);return new T.CanvasTexture(c);
  }
  const glows=glowTexture();
  const steamGeometry=new T.BufferGeometry(),steamPositions=new Float32Array(14*3);
  steamGeometry.setAttribute('position',new T.BufferAttribute(steamPositions,3));
  const steam=new T.Points(steamGeometry,new T.PointsMaterial({map:glows,color:'#ecede2',size:.16,transparent:true,opacity:.08,depthWrite:false}));scene.add(steam);
  const motesGeo=new T.BufferGeometry(),positions=new Float32Array(90*3);
  for(let i=0;i<90;i++){positions[i*3]=range(-8,8);positions[i*3+1]=range(.5,3);positions[i*3+2]=range(-17,17);}
  motesGeo.setAttribute('position',new T.BufferAttribute(positions,3));
  const motes=new T.Points(motesGeo,new T.PointsMaterial({map:glows,color:'#ffe5b6',size:.14,transparent:true,opacity:.7,depthWrite:false,blending:T.AdditiveBlending}));scene.add(motes);
  const markerGroups=nodes.map(node=>{
    const g=new T.Group();g.position.fromArray(node.object);g.position.y+=.5;
    const sprite=new T.Sprite(new T.SpriteMaterial({map:glows,color:'#ffdda2',transparent:true,depthWrite:false}));sprite.scale.set(.35,.35,1);g.add(sprite);scene.add(g);return g;
  });

  let dragging=false,pointerMoved=false,lastX=0,lastY=0,yaw=0,pitch=0,enabled=false,targetPose=null,manual=false;
  const keys=new Set(),raycaster=new T.Raycaster(),pointer=new T.Vector2();
  let cameraDirection=V(0,0,-1);
  function stopManual(){onManual();manual=true;targetPose=null;camera.getWorldDirection(cameraDirection);yaw=Math.atan2(-cameraDirection.x,-cameraDirection.z);pitch=Math.asin(T.MathUtils.clamp(cameraDirection.y,-1,1));}
  canvas.addEventListener('pointerdown',e=>{if(!enabled)return;dragging=true;pointerMoved=false;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{
    if(!enabled)return;
    if(dragging&&(Math.abs(e.clientX-lastX)+Math.abs(e.clientY-lastY)>1)){
      pointerMoved=true;
      if(!manual)stopManual();yaw-=(e.clientX-lastX)*.004;pitch=T.MathUtils.clamp(pitch-(e.clientY-lastY)*.003,-.7,.65);lastX=e.clientX;lastY=e.clientY;
      camera.rotation.set(pitch,yaw,0,'YXZ');
    }
    pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);
  });
  canvas.addEventListener('pointerup',()=>{dragging=false;});
  canvas.addEventListener('click',e=>{
    if(!enabled||pointerMoved)return;pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);raycaster.setFromCamera(pointer,camera);
    for(const object of objects){const hit=raycaster.intersectObject(object.mesh,true)[0];if(hit&&hit.distance<7){onObject(object.node);break;}}
  });
  addEventListener('keydown',e=>{
    if(!enabled||(e.target instanceof Element&&e.target.closest('input,textarea,dialog')))return;
    if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){
      e.preventDefault();if(!manual)stopManual();keys.add(e.code);
    }
  });
  addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();dragging=false;});
  document.addEventListener('visibilitychange',()=>{keys.clear();dragging=false;});
  function valid(x,z) {
    if(x<-8.8||x>8||z>20.8||z<-17.2)return false;
    for(const c of colliders){
      if(c.r&&Math.hypot(x-c.x,z-c.z)<c.r+.24)return false;
      if(c.halfW&&Math.abs(x-c.x)<c.halfW+.22&&Math.abs(z-c.z)<c.halfD+.22)return false;
    }return true;
  }
  function move(dt) {
    let f=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0);
    let s=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0);
    if(keys.has('ArrowLeft'))yaw+=dt*.9;if(keys.has('ArrowRight'))yaw-=dt*.9;
    if(keys.has('ArrowLeft')||keys.has('ArrowRight'))camera.rotation.set(pitch,yaw,0,'YXZ');
    if(f||s){const speed=dt*2.1/Math.max(1,Math.hypot(f,s)),dx=(-Math.sin(yaw)*f+Math.cos(yaw)*s)*speed,dz=(-Math.cos(yaw)*f-Math.sin(yaw)*s)*speed;
      if(valid(camera.position.x+dx,camera.position.z))camera.position.x+=dx;
      if(valid(camera.position.x,camera.position.z+dz))camera.position.z+=dz;
    }
  }
  function setPose(position,look,smooth=true) {
    manual=false;keys.clear();
    const pos=new T.Vector3().fromArray(position),dir=new T.Vector3().fromArray(look).sub(pos).normalize();
    const q=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().lookAt(pos,pos.clone().add(dir),V(0,1,0)));
    if(smooth){targetPose={position:pos,quaternion:q};}else{camera.position.copy(pos);camera.quaternion.copy(q);targetPose=null;}
  }
  setPose([0,1.72,20],[0,2,-3],false);
  function resize() {camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);}
  addEventListener('resize',resize);resize();
  let frames=0,fps=60,lastReport=performance.now(),quality='auto',slowFrames=0;
  function frame(dt,elapsed){
    if(targetPose){const a=1-Math.exp(-dt*2.5);camera.position.lerp(targetPose.position,a);camera.quaternion.slerp(targetPose.quaternion,a);if(camera.position.distanceTo(targetPose.position)<.008&&camera.quaternion.angleTo(targetPose.quaternion)<.002)targetPose=null;}
    if(manual&&enabled)move(dt);
    waterMat.uniforms.time.value=elapsed;
    for(let i=0;i<14;i++){const age=(elapsed*.12+i/14)%1;steamPositions[i*3]=-3.4+Math.sin(age*5+i)*.06;steamPositions[i*3+1]=1.62+age*.55;steamPositions[i*3+2]=-11.4+Math.cos(age*4+i)*.06;}steamGeometry.attributes.position.needsUpdate=true;
    markerGroups.forEach((g,i)=>{g.children[0].scale.setScalar(.3+Math.sin(elapsed*1.4+i)*.04);g.children[0].material.opacity=.65+Math.sin(elapsed+i)*.15;});
    motes.rotation.y=Math.sin(elapsed*.05)*.04;
    composer.render();frames++;
    const now=performance.now();if(now-lastReport>1000){fps=Math.round(frames*1000/(now-lastReport));frames=0;lastReport=now;
      if(quality==='auto'&&fps<32)slowFrames++;else slowFrames=0;
      if(slowFrames>=4){renderer.setPixelRatio(1);composer.setPixelRatio(1);renderer.shadowMap.autoUpdate=false;slowFrames=0;}
    }
    return {fps,position:camera.position.toArray(),manual,moving:!!targetPose};
  }
  return {
    frame,camera,curve,renderer,
    enable(value){enabled=value;if(!value)keys.clear();},
    setPose,
    setPath(t){manual=false;const value=T.MathUtils.clamp(t,0,1),p=curve.getPoint(value),tangent=curve.getTangent(value);camera.position.set(p.x,1.72,p.z);camera.lookAt(p.x+tangent.x*1.4,1.65,p.z+tangent.z*1.4);targetPose=null;},
    pause(){targetPose=null;keys.clear();},
    nearest(){let best=null,d=4.5;for(const n of nodes){const dist=Math.hypot(camera.position.x-n.object[0],camera.position.z-n.object[2]);if(dist<d){d=dist;best=n;}}return best;},
    canWalk:valid,
    setQuality(value){quality=value;const ratio=value==='balanced'?1:Math.min(devicePixelRatio,1.6);renderer.setPixelRatio(ratio);composer.setPixelRatio(ratio);resize();renderer.shadowMap.autoUpdate=true;},
  };
}
