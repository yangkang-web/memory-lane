import * as T from 'three';

export function createStoryAssets(scene,camera){
  const root=new T.Group();root.name='Last door / cinematic cast';root.visible=false;scene.add(root);
  const mats={};for(const [name,color]of Object.entries({skin:'#b59c7e',dead:'#829080',jacket:'#526052',pants:'#333c39',boots:'#222827',metal:'#343c3c',wood:'#725641',cloth:'#857e66',strap:'#473e30',eyes:'#202924',badge:'#bb9f62'}))mats[name]=new T.MeshStandardMaterial({color,roughness:.9,metalness:name==='metal'?.45:0});
  function box(parent,w,h,d,mat,x=0,y=0,z=0){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);parent.add(m);return m;}
  function ellipsoid(parent,w,h,d,mat,x,y,z){const m=new T.Mesh(new T.SphereGeometry(1,12,10),mat);m.scale.set(w,h,d);m.position.set(x,y,z);parent.add(m);return m;}
  function limb(parent,length,radius,mat){const m=new T.Mesh(new T.CapsuleGeometry(radius,length-radius*2,5,10),mat);m.position.y=-length/2;parent.add(m);return m;}
  function gun(parent){const g=new T.Group();parent.add(g);box(g,.09,.12,.35,mats.metal,0,0,-.08);box(g,.09,.1,.24,mats.wood,0,-.01,.18);box(g,.065,.075,.31,mats.wood,0,-.01,-.37);box(g,.035,.035,.25,mats.metal,0,.02,-.61);box(g,.045,.16,.08,mats.metal,0,-.11,-.03).rotation.x=.2;box(g,.025,.035,.025,mats.metal,0,.075,-.48);return g;}
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;const c=shadowCanvas.getContext('2d'),gradient=c.createRadialGradient(32,32,3,32,32,31);gradient.addColorStop(0,'#00000080');gradient.addColorStop(1,'#00000000');c.fillStyle=gradient;c.fillRect(0,0,64,64);
  const shadowMap=new T.CanvasTexture(shadowCanvas),shadowMat=new T.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false});
  function actor(zombie=false,index=0){
    const g=new T.Group(),body=new T.Group();g.add(body);root.add(g);
    const jacket=zombie?new T.MeshStandardMaterial({color:['#74604d','#67716c','#77715b'][index%3],roughness:1}):mats.jacket;
    const skin=zombie?mats.dead:mats.skin;
    ellipsoid(body,.27,.36,.17,jacket,0,1.14,0);ellipsoid(body,.23,.15,.16,mats.pants,0,.85,0);
    const head=new T.Group();head.position.set(0,1.63,0);body.add(head);ellipsoid(head,.135,.185,.13,skin,0,0,-.015);
    for(const side of [-1,1]){ellipsoid(head,.025,.043,.024,skin,side*.135,-.005,0);ellipsoid(head,.024,.013,.011,mats.eyes,side*.049,.026,-.133);}
    ellipsoid(head,.024,.043,.032,skin,0,-.005,-.143);box(head,.063,.014,.012,mats.strap,0,-.07,-.136);
    if(!zombie){ellipsoid(head,.141,.09,.137,mats.cloth,0,.117,0);box(body,.1,.13,.035,mats.badge,-.13,1.32,-.165);box(body,.31,.43,.16,mats.strap,0,1.17,.19);for(const side of [-1,1])box(body,.035,.53,.025,mats.strap,side*.17,1.19,-.155);}
    else {for(let i=0;i<5;i++)box(body,.12,.035,.018,mats.strap,(i%2?1:-1)*.13,.98+i*.07,-.16).rotation.z=.3;head.rotation.z=(index%2?1:-1)*.12;}
    const arms=[],legs=[];
    for(const side of [-1,1]){
      const arm=new T.Group();arm.position.set(side*.28,1.43,0);body.add(arm);limb(arm,.33,.085,jacket);
      const elbow=new T.Group();elbow.position.y=-.32;arm.add(elbow);limb(elbow,.31,.065,jacket);ellipsoid(elbow,.06,.075,.055,skin,0,-.32,0);arms.push(arm);
      const leg=new T.Group();leg.position.set(side*.13,.84,0);body.add(leg);limb(leg,.43,.105,mats.pants);
      const knee=new T.Group();knee.position.y=-.42;leg.add(knee);limb(knee,.35,.078,mats.pants);box(knee,.17,.13,.28,mats.boots,0,-.34,-.055);legs.push(leg);
    }
    const weapon=zombie?null:gun(body);if(weapon)weapon.position.set(.09,1.18,-.38);
    const shadow=new T.Mesh(new T.PlaneGeometry(1.25,1.25),shadowMat);shadow.rotation.x=-Math.PI/2;shadow.position.y=.012;g.add(shadow);
    return {root:g,body,weapon,
      pose(time,moving,aim,death=0){
        const stride=Math.sin(time*(zombie?7:10))*(moving?(zombie?.38:.62):.025);
        legs[0].rotation.x=stride;legs[1].rotation.x=-stride;
        arms.forEach((a,i)=>{a.rotation.x=zombie?.85+Math.sin(time*6+i)*.18:aim?1.1:(i?stride:-stride)*.7;a.rotation.z=(i?1:-1)*(zombie?.16:.06);});
        if(weapon)weapon.rotation.x=aim?0:.25;
        body.position.y=moving?Math.abs(Math.sin(time*10))*.035:Math.sin(time*2)*.008;
        body.rotation.x=zombie?.12:0;body.rotation.z=zombie?Math.sin(time*3)*.04:0;
        if(death>0){const f=Math.min(1,death/.8);body.rotation.x=f*Math.PI*.49;body.position.y=.17*f;arms.forEach(a=>a.rotation.x=.3);}
      }};
  }
  const companion=actor(false),enemies=Array.from({length:5},(_,i)=>actor(true,i));
  const rig=new T.Group();rig.visible=false;camera.add(rig);scene.add(camera);
  const rifle=gun(rig);rifle.position.set(.17,-.28,-.48);rifle.scale.setScalar(.85);
  ellipsoid(rig,.065,.075,.11,mats.skin,.17,-.34,-.46);ellipsoid(rig,.065,.07,.1,mats.skin,.10,-.31,-.78);
  for(const [x,y,z]of [[.23,-.52,-.25],[-.03,-.49,-.47]]){const arm=ellipsoid(rig,.085,.23,.09,mats.jacket,x,y,z);arm.rotation.x=-.65;}
  rig.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.depthTest=false;o.material.depthWrite=false;o.renderOrder=20;}});
  const flashMat=new T.MeshBasicMaterial({color:'#ffd48b',transparent:true,opacity:1,depthWrite:false,blending:T.AdditiveBlending});
  const flash=new T.Mesh(new T.OctahedronGeometry(.10),flashMat);root.add(flash);flash.visible=false;
  const tracer=new T.Mesh(new T.CylinderGeometry(.009,.009,1,5),new T.MeshBasicMaterial({color:'#d5bd7c',transparent:true,opacity:.48,depthWrite:false}));root.add(tracer);tracer.visible=false;
  const impact=new T.Group();root.add(impact);for(let i=0;i<8;i++)ellipsoid(impact,.025,.025,.025,mats.cloth,0,0,0);impact.visible=false;
  // A reachable refuge in the open central lane. The gate has a real aperture.
  const shelter=new T.Group();shelter.position.set(0,0,92);root.add(shelter);
  const concrete=new T.MeshStandardMaterial({color:'#6e796c',roughness:.95});
  box(shelter,8,.15,11,concrete,0,.025,4.6);box(shelter,8,.18,11,concrete,0,3.25,4.6);
  for(const x of [-4,4])box(shelter,.25,3.2,11,concrete,x,1.6,4.6);
  box(shelter,8,3.2,.25,concrete,0,1.6,10);for(const x of [-2.8,2.8])box(shelter,2.4,3.2,.28,concrete,x,1.6,0);
  box(shelter,3.2,.5,.3,mats.metal,0,3,0);
  const door=new T.Group();door.position.set(-1.6,0,0);shelter.add(door);box(door,3.2,2.75,.15,mats.metal,1.6,1.4,0);
  for(let i=0;i<12;i++)box(door,3.1,.035,.04,mats.cloth,1.6,.25+i*.21,-.09);
  const signCanvas=document.createElement('canvas');signCanvas.width=512;signCanvas.height=128;const sc=signCanvas.getContext('2d');sc.fillStyle='#172c27';sc.fillRect(0,0,512,128);sc.strokeStyle='#90b78b';sc.lineWidth=6;sc.strokeRect(6,6,500,116);sc.fillStyle='#d7e8c3';sc.textAlign='center';sc.font='bold 36px sans-serif';sc.fillText('NORTH STATION',256,57);sc.font='22px sans-serif';sc.fillText('SAFE ZONE  /  04',256,97);
  const signMap=new T.CanvasTexture(signCanvas);signMap.colorSpace=T.SRGBColorSpace;const sign=new T.Mesh(new T.PlaneGeometry(3.3,.82),new T.MeshBasicMaterial({map:signMap}));sign.position.set(0,3.8,-.2);sign.rotation.y=Math.PI;shelter.add(sign);
  const green=new T.MeshStandardMaterial({color:'#a3d995',emissive:'#6dff9c',emissiveIntensity:2});box(shelter,.28,.17,.2,green,0,2.91,-.25);
  const lamp=new T.PointLight('#ffd69c',15,12,2);lamp.position.set(0,2.8,5);shelter.add(lamp);
  box(shelter,.6,.09,.4,new T.MeshBasicMaterial({color:'#ffe3ac'}),0,2.95,5);
  for(let i=0;i<5;i++)box(shelter,.65,.5,.6,mats.wood,2.9,.35+(i%2)*.5,3+i*.8);
  box(shelter,1.7,.18,.65,mats.wood,-2.7,.55,6);for(const z of [5.8,6.2])box(shelter,.1,.5,.1,mats.metal,-2.7,.26,z);
  function dispose(){root.removeFromParent();rig.removeFromParent();const geometries=new Set(),materials=new Set(),textures=new Set();for(const group of [root,rig])group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});materials.forEach(m=>{for(const v of Object.values(m))if(v?.isTexture)textures.add(v);m.dispose();});geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());}
  return {root,companion,enemies,rig,rifle,flash,tracer,impact,door,dispose};
}
