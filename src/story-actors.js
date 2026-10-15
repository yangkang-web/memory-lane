import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { weatheredSurface } from './story-surfaces.js';

export function createStoryActors(scene,camera){
  const root=new T.Group();root.name='Cinematic / Lin and infected';root.visible=false;scene.add(root);
  function fabric(color,metalness=0){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,128,128);for(let i=0;i<7000;i++){const x=(i*73)%128,y=(i*97+Math.floor(i/128)*3)%128;ctx.fillStyle=i%3?'#181b1622':'#d6c9ae22';ctx.fillRect(x,y,1,i%7?1:4);}const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;return new T.MeshStandardMaterial({map,roughness:metalness?.6:.92,metalness});}
  const mats={skin:weatheredSurface('skin'),dead:weatheredSurface('dead'),jacket:fabric('#536355'),pants:fabric('#353e3c'),boots:fabric('#242826'),metal:fabric('#39413f',.65),wood:fabric('#725641'),cloth:fabric('#8b8167'),strap:fabric('#473d30'),hair:fabric('#282b26'),wound:fabric('#59513e'),eyes:new T.MeshStandardMaterial({color:'#3a382c',roughness:.52}),white:new T.MeshStandardMaterial({color:'#8b8979',roughness:.7}),clouded:new T.MeshStandardMaterial({color:'#a2aaa0',roughness:.48}),deadIris:new T.MeshStandardMaterial({color:'#667166',roughness:.65}),nails:new T.MeshStandardMaterial({color:'#8d8270',roughness:.85}),badge:fabric('#b9aa78')};
  const originals=new Set();
  function mesh(parent,geo,mat,x=0,y=0,z=0){const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);originals.add(geo);return m;}
  function box(parent,w,h,d,mat,x=0,y=0,z=0){return mesh(parent,new RoundedBoxGeometry(w,h,d,1,Math.min(w,h,d)*.1),mat,x,y,z);}
  function ellipsoid(parent,w,h,d,mat,x=0,y=0,z=0){const m=mesh(parent,new T.SphereGeometry(1,16,12),mat,x,y,z);m.scale.set(w,h,d);return m;}
  function capsule(parent,length,r1,r2,mat){return mesh(parent,new T.CylinderGeometry(r1,r2,length,12,1),mat,0,-length/2,0);}
  function gun(parent){const g=new T.Group();parent.add(g);box(g,.075,.1,.33,mats.metal,0,0,-.06);box(g,.075,.1,.23,mats.wood,0,-.015,.18);box(g,.066,.065,.27,mats.wood,0,-.01,-.35);mesh(g,new T.CylinderGeometry(.017,.019,.25,12),mats.metal,0,.012,-.59).rotation.x=Math.PI/2;box(g,.047,.14,.075,mats.metal,0,-.1,-.05).rotation.x=.14;box(g,.026,.03,.024,mats.metal,0,.065,-.49);box(g,.013,.013,.10,mats.metal,.052,.01,-.05);const muzzle=new T.Object3D();muzzle.position.set(0,.012,-.73);g.add(muzzle);g.userData.muzzle=muzzle;return g;}
  function hand(parent,skin,side){
    const g=new T.Group();parent.add(g);ellipsoid(g,.039,.053,.022,skin,0,-.033,0);
    const fingers=[];
    for(let i=0;i<4;i++){
      const finger=new T.Group();finger.position.set(-.027+i*.018,-.071,-.001);g.add(finger);
      const length=.036-(i===3?.008:0);capsule(finger,length,.0085,.007,skin);
      const tip=new T.Group();tip.position.y=-length;finger.add(tip);capsule(tip,.024,.007,.0055,skin);ellipsoid(tip,.006,.009,.006,skin,0,-.025,0);ellipsoid(tip,.0045,.007,.001,mats.nails,0,-.021,.006);ellipsoid(finger,.009,.009,.008,skin,0,-.004,0);
      fingers.push({finger,tip});
    }
    const thumb=new T.Group();thumb.position.set(-side*.035,-.023,0);thumb.rotation.z=-side*.65;g.add(thumb);capsule(thumb,.033,.013,.009,skin);ellipsoid(thumb,.009,.02,.009,skin,0,-.042,-.004);
    g.userData.fingers=fingers;g.userData.thumb=thumb;
    g.userData.grip=(value,thumbClosure=0)=>{g.userData.gripValue=value;g.userData.thumbClosure=thumbClosure;fingers.forEach(({finger,tip},i)=>{finger.rotation.x=.12+value*(1.08+i*.025);tip.rotation.x=.12+value*.95;});thumb.rotation.x=value*.7;thumb.rotation.z=side*(-.65+thumbClosure*1.35);};g.userData.grip(0);
    return g;
  }
  function sculptedHead(parent,skin,zombie){
    const geometry=new T.SphereGeometry(1,40,32),positions=geometry.attributes.position;
    const bell=(x,y,cx,cy,sx,sy)=>Math.exp(-(((x-cx)/sx)**2+((y-cy)/sy)**2));
    for(let i=0;i<positions.count;i++){
      let x=positions.getX(i)*.127,y=positions.getY(i)*.178,z=positions.getZ(i)*.119;
      if(y<-.055)x*=1-(-y-.055)*1.45;
      if(z<0){const front=Math.min(1,-z/.065);
        z-=front*(.055*bell(x,y,0,-.013,.021,.052)+.013*bell(x,y,0,-.039,.029,.019));
        for(const side of [-1,1]){z+=front*.018*bell(x,y,side*.048,.018,.031,.025);z-=front*.007*bell(x,y,side*.048,.052,.038,.012);z-=front*.005*bell(x,y,side*.07,-.041,.026,.024);}
        z+=front*.008*bell(x,y,0,-.077,.04,.011);
        if(zombie){
          for(const side of [-1,1]){z+=front*.019*bell(x,y,side*.073,-.055,.031,.04);z-=front*.009*bell(x,y,side*.074,-.015,.025,.021);}
          z+=front*.003*Math.sin(x*99+y*63)*Math.sin(y*77);
          if(y<-.025)x*=1-Math.min(.13,(-y-.025)*1.4);
        }
      }
      positions.setXYZ(i,x,y,z-.008);
    }
    geometry.computeVertexNormals();const colors=[];for(let i=0;i<positions.count;i++){const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);const stain=zombie?Math.max(0,Math.sin(x*71+y*93)*Math.cos(z*81+y*37))*.24:Math.max(0,Math.sin(x*88+y*41))*.035;let hollow=0;if(z<-.065){for(const side of [-1,1])hollow+=.28*bell(x,y,side*.047,.015,.026,.024)+.13*bell(x,y,side*.07,-.05,.023,.035);hollow+=.12*bell(x,y,0,-.078,.04,.018);}colors.push(1-stain-hollow,.98-stain-hollow,.94-stain*.8-hollow);}geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));const surface=skin.clone();surface.vertexColors=true;return mesh(parent,geometry,surface);
  }
  function arm(parent,side,skin,sleeve,firstPerson=false){const shoulder=new T.Group();shoulder.position.set(side*(firstPerson?.27:.255),firstPerson?-.42:1.42,firstPerson?.10:0);parent.add(shoulder);const upper=firstPerson?.33:.32,lower=firstPerson?.32:.30;capsule(shoulder,upper,.082,.065,sleeve);ellipsoid(shoulder,.082,.09,.082,sleeve,0,0,0);const elbow=new T.Group();elbow.position.y=-upper;shoulder.add(elbow);ellipsoid(elbow,.065,.075,.065,sleeve);capsule(elbow,lower,.062,.045,sleeve);const cuff=mesh(elbow,new T.CylinderGeometry(.047,.046,.035,16),mats.strap,0,-lower+.018,0);const palm=hand(elbow,skin,side);palm.position.y=-lower;
    function reach(point,poleOverride=null){const d=point.clone().sub(shoulder.position),dist=Math.min(upper+lower-.005,Math.max(.06,d.length()));d.normalize();const pole=poleOverride||(firstPerson?new T.Vector3(side*.4,-1,.12):new T.Vector3(side,.15,.2));const bend=pole.clone().addScaledVector(d,-pole.dot(d)).normalize();const along=(upper*upper-lower*lower+dist*dist)/(2*dist),height=Math.sqrt(Math.max(0,upper*upper-along*along)),mid=d.clone().multiplyScalar(along).addScaledVector(bend,height);shoulder.quaternion.setFromUnitVectors(new T.Vector3(0,-1,0),mid.clone().normalize());const fore=d.multiplyScalar(dist).sub(mid).applyQuaternion(shoulder.quaternion.clone().invert()).normalize();elbow.quaternion.setFromUnitVectors(new T.Vector3(0,-1,0),fore);palm.rotation.set(-.5,0,0);}
    shoulder.traverse(o=>{if(o.isMesh)o.userData.contactSkin=true;});
    return {shoulder,elbow,palm,reach};
  }
  function batchRigid(group){for(const child of [...group.children])if(child.isGroup)batchRigid(child);const batches=new Map();for(const child of [...group.children])if(child.isMesh){child.updateMatrix();const geo=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();geo.applyMatrix4(child.matrix);const list=batches.get(child.material)||[];list.push(geo);batches.set(child.material,list);child.removeFromParent();}for(const [mat,parts]of batches){const m=new T.Mesh(mergeGeometries(parts),mat);m.castShadow=m.receiveShadow=true;group.add(m);parts.forEach(p=>p.dispose());}}
  function actor(zombie=false,index=0){
    const g=new T.Group(),body=new T.Group();g.add(body);root.add(g);g.name=zombie?`infected-${index}`:'Lin';
    const jacket=zombie?fabric(['#74634f','#64716b','#75715e','#4c595f'][index%4]):mats.jacket,skin=zombie?mats.dead:mats.skin;
    // Tapered jacket silhouette, shoulder seams, collar, cargo pockets and worn boot soles.
    const profile=[[.16,.85],[.19,.91],[.21,1.12],[.25,1.35],[.22,1.45],[.105,1.48]].map(p=>new T.Vector2(...p));const torso=mesh(body,new T.LatheGeometry(profile,20),jacket);torso.scale.z=.68;
    ellipsoid(body,.21,.14,.15,mats.pants,0,.84,0);capsule(body,.12,.055,.065,skin).position.y=1.57;
    for(const side of [-1,1]){box(body,.125,.14,.045,jacket,side*.125,1.24,-.145);box(body,.135,.028,.05,mats.strap,side*.125,1.30,-.169);box(body,.085,.13,.027,jacket,side*.07,1.42,-.12).rotation.z=side*.4;box(body,.04,.035,.035,mats.metal,side*.13,.87,-.147);}
    box(body,.014,.48,.014,mats.strap,0,1.17,-.17);
    const head=new T.Group();head.position.set(0,1.63,0);body.add(head);sculptedHead(head,skin,zombie);if(zombie)head.scale.set(.96+(index%3)*.025,1+(index%2)*.035,1);const eyes=[];
    for(const side of [-1,1]){
      ellipsoid(head,.021,.036,.018,skin,side*.124,-.004,0);
      ellipsoid(head,.015,zombie?.0045:.0055,.006,zombie?mats.clouded:mats.white,side*.047,.018,-.111);
      const pupil=new T.Group();pupil.position.set(side*.047,.017,-.117);head.add(pupil);ellipsoid(pupil,zombie?.003:.004,.004,.0025,zombie?mats.deadIris:mats.eyes);eyes.push({pupil,side});
      for(const upper of [-1,1]){const lid=new T.CatmullRomCurve3([new T.Vector3(side*.047-.017,.017,-.106),new T.Vector3(side*.047,.018+upper*.005,-.117),new T.Vector3(side*.047+.017,.018,-.105)]);mesh(head,new T.TubeGeometry(lid,10,upper>0?.003:.002,6),skin);}
      const brow=new T.CatmullRomCurve3([new T.Vector3(side*.025,zombie?.026:.034,-.116),new T.Vector3(side*.047,zombie?.035:.04,-.115),new T.Vector3(side*.074,.039,-.105)]);
      mesh(head,new T.TubeGeometry(brow,8,.004,6),skin);
      ellipsoid(head,.004,.002,.003,mats.wound,side*.012,-.044,-.165);
    }
    const mouth=new T.CatmullRomCurve3([new T.Vector3(-.026,zombie?-.087:-.076,-.126),new T.Vector3(0,zombie?-.079:-.081,-.136),new T.Vector3(.026,zombie?-.084:-.076,-.126)]);mesh(head,new T.TubeGeometry(mouth,12,.0025,6),mats.wound);
    const lip=new T.CatmullRomCurve3([new T.Vector3(-.021,zombie?-.091:-.082,-.126),new T.Vector3(0,zombie?-.084:-.086,-.134),new T.Vector3(.021,zombie?-.089:-.082,-.126)]);mesh(head,new T.TubeGeometry(lip,10,.003,6),skin);
    if(!zombie){ellipsoid(head,.13,.055,.122,mats.hair,0,.128,.005);box(body,.09,.12,.025,mats.badge,-.13,1.26,-.18);box(body,.30,.41,.16,mats.cloth,0,1.17,.205);box(body,.24,.12,.09,mats.strap,0,.99,.29);for(const side of [-1,1])box(body,.036,.52,.025,mats.strap,side*.17,1.20,-.16);}
    else{for(let i=0;i<7;i++){const tear=box(body,.05+(i%3)*.018,.025,.014,mats.wound,(i%2?1:-1)*.15,.99+i*.061,-.15);tear.rotation.z=(i%2?1:-1)*.5;}if(index%3!==0){const hair=mesh(head,new T.SphereGeometry(1,24,16,0,Math.PI*2,0,1.4),mats.hair,0,.058,.008);hair.scale.set(.128,.125,.123);}head.rotation.z=(index%2?1:-1)*.12;}
    const jaw=new T.Group();head.add(jaw);ellipsoid(jaw,.025,.017,.006,mats.eyes,0,-.083,-.135);for(let i=0;i<6;i++)box(jaw,.005,.006+(i%2)*.002,.004,mats.white,-.018+i*.007,-.073,-.142);jaw.visible=false;
    const arms=[arm(body,-1,skin,jacket),arm(body,1,skin,jacket)],legs=[];
    for(const side of [-1,1]){const hip=new T.Group();hip.position.set(side*.125,.84,0);body.add(hip);capsule(hip,.42,.105,.078,mats.pants);box(hip,.09,.16,.035,mats.pants,side*.08,-.2,0);const knee=new T.Group();knee.position.y=-.42;hip.add(knee);ellipsoid(knee,.078,.079,.077,mats.pants);capsule(knee,.33,.075,.056,mats.pants);box(knee,.15,.12,.27,mats.boots,0,-.33,-.055);box(knee,.155,.026,.28,mats.hair,0,-.391,-.055);for(let j=0;j<4;j++)box(knee,.09,.008,.012,mats.cloth,0,-.29-j*.012,-.17);const foot=new T.Object3D();g.add(foot);legs.push({hip,knee,foot});}
    const weapon=zombie?null:gun(body);if(weapon)weapon.position.set(.12,1.21,-.33);
    const shoulderAnchor=new T.Object3D();shoulderAnchor.position.set(.17,1.36,-.17);body.add(shoulderAnchor);
    batchRigid(body);
    function pose(t,state='run',death=0){
      const phase=g.userData.motionTime??t;g.userData.contactRun=false;g.userData.flightHeight=0;g.userData.giantSettle=0;body.scale.set(1,1,1);
      jaw.scale.set(1,1,1);jaw.visible=zombie&&['run','crawl'].includes(state);body.position.set(0,0,0);body.rotation.set(0,0,0);head.rotation.x=zombie?.13:0;head.rotation.y=0;head.rotation.z=zombie?(index%2?1:-1)*.12:0;eyes.forEach(({pupil,side})=>pupil.position.x=side*.047);
      const moving=['run','walk','crawl','squeeze','climb'].includes(state),rate=state==='walk'?8:12,stride=moving?Math.sin(phase*rate)*(state==='walk'?.45:.8):.025*Math.sin(phase*2);
      legs.forEach((l,i)=>{l.hip.rotation.set(i?-stride:stride,0,0);l.knee.rotation.x=Math.max(0,(i?stride:-stride))*.85;});
      arms.forEach((a,i)=>{a.shoulder.rotation.set(zombie?.85:(i?stride:-stride)*.7,0,(i?1:-1)*.04);a.elbow.rotation.set(-.25,0,0);a.palm.rotation.set(-.5,0,0);a.palm.userData.grip(.1);});
      body.position.y=moving?Math.abs(Math.sin(phase*rate))*(state==='run'?.065:.025):Math.sin(phase*2)*.008;
      if(zombie&&state==='run'){body.rotation.x=.23;arms.forEach((a,i)=>{a.shoulder.rotation.x=(i?-stride:stride)*.95+.25;a.elbow.rotation.x=-1.05-Math.max(0,i?stride:-stride)*.35;a.palm.userData.grip(.45);});legs.forEach((l,i)=>{l.hip.rotation.x=(i?-stride:stride)*1.22;l.knee.rotation.x=-Math.max(0,i?stride:-stride)*1.15;});}
      if(weapon){weapon.visible=!['crawl','pull','climb','squeeze','hold','latch','down','dragged','rise'].includes(state);weapon.rotation.x=state==='aim'?0:.28;}
      if(state==='aim'){arms[1].reach(new T.Vector3(.14,1.19,-.38));arms[0].reach(new T.Vector3(.06,1.2,-.68));}
      if(state==='wave'||state==='beckon'){arms[1].shoulder.rotation.set(1.1,0,-1.3);arms[1].elbow.rotation.x=-.6+Math.sin(phase*8)*.4;}
      if(state==='crawl'){body.rotation.x=-Math.PI*.47;body.position.y=.21;legs.forEach((l,i)=>{l.hip.rotation.x=Math.sin(phase*7+i*3)*.28;l.knee.rotation.x=.4;});arms.forEach((a,i)=>{a.shoulder.rotation.x=2.2+Math.sin(phase*7+i*3)*.3;a.elbow.rotation.x=-.7;});}
      if(state==='pull'||state==='hold'||state==='latch'){body.position.y=state==='pull'?-.16:0;body.rotation.x=-.1;legs.forEach(l=>l.knee.rotation.x=.35);arms[0].reach(new T.Vector3(-.15,1.2,-.6));}
      if(state==='kick'){legs[1].hip.rotation.x=1.2;legs[1].knee.rotation.x=-.25;body.rotation.x=-.13;}
      if(state==='squeeze'){arms.forEach(a=>a.shoulder.rotation.x=.9);body.rotation.z=.09;}
      if(state==='fall'){body.rotation.z=.5*Math.sin(phase*11);arms.forEach((a,i)=>a.shoulder.rotation.z=(i?1:-1)*1.5);legs[1].hip.rotation.x=.7;}
      if(state==='climb'){legs[1].hip.rotation.x=1.2;legs[1].knee.rotation.x=-.8;arms.forEach(a=>a.shoulder.rotation.x=2.1);}
      if(state==='down'||state==='dragged'||death>0){const f=death>0?Math.min(1,death/.45):1;body.rotation.x=f*Math.PI*.48;body.position.y=.16*f;legs.forEach((l,i)=>{l.hip.rotation.x=(i?-.16:.2)*f;l.knee.rotation.x=.25*f;});arms.forEach((a,i)=>{a.shoulder.rotation.z=(i?1:-1)*.6*f;a.shoulder.rotation.x=.3;});if(weapon)weapon.visible=false;}
      if(state==='rise'){body.rotation.x=.5;body.position.y=-.3;legs.forEach(l=>{l.hip.rotation.x=.5;l.knee.rotation.x=-.8;});}
      if(zombie&&state==='run'){body.rotation.x=-.15;body.rotation.z=Math.sin(phase*5+index)*.04;}
    }
    function reachWorld(side,target){body.updateWorldMatrix(true,false);const local=body.worldToLocal(target.clone());arms[side>0?1:0].reach(local);}
    return {root:g,body,head,jaw,arms,legs,weapon,shoulderAnchor,pose,reachWorld,eyeLook(value){eyes.forEach(({pupil,side})=>pupil.position.x=side*.047+T.MathUtils.clamp(value,-1,1)*.006);}};
  }
  const companion=actor(),enemies=Array.from({length:9},(_,i)=>actor(true,i));
  const rig=new T.Group();rig.visible=false;camera.add(rig);scene.add(camera);
  const rifle=gun(rig);rifle.position.set(.17,-.27,-.42);rifle.scale.setScalar(.8);
  const playerArms=[arm(rig,-1,mats.skin,mats.jacket,true),arm(rig,1,mats.skin,mats.jacket,true)];
  const strap=box(rig,.055,.5,.025,mats.strap,-.28,-.4,-.32);strap.rotation.z=-.3;strap.visible=false;
  const boots=new T.Group();rig.add(boots);for(const side of [-1,1]){box(boots,.14,.12,.25,mats.boots,side*.14,-.45,-.55);const shin=capsule(boots,.4,.085,.07,mats.pants);shin.position.set(side*.14,-.45,-.43);shin.rotation.x=-Math.PI/2;}boots.visible=false;
  const flash=new T.Mesh(new T.OctahedronGeometry(.11),new T.MeshBasicMaterial({color:'#ffe3a0',transparent:true,blending:T.AdditiveBlending,depthWrite:false}));root.add(flash);flash.visible=false;
  const muzzleLight=new T.PointLight('#ffc478',0,5,2);root.add(muzzleLight);
  const tracer=new T.Mesh(new T.CylinderGeometry(.006,.006,1,5),new T.MeshBasicMaterial({color:'#dbc592',transparent:true,opacity:.45,depthWrite:false}));root.add(tracer);tracer.visible=false;
  function firstPerson(t,action,recoil=0,target=null){
    rig.visible=t>18&&t<60;rig.position.set(Math.sin(t*8)*.004,-Math.abs(Math.sin(t*8))*.006,recoil*.065);rig.rotation.set(recoil*.06,0,0);
    rifle.visible=!['pull','climb','squeeze','rescue','slam'].includes(action);rifle.rotation.set(action==='crawl'?.28:0,action==='squeeze'?-.7:0,action==='lower'?.35:0);rifle.position.y=-.27-(action==='lower'?Math.min(1,(t-58.5)/1.5)*.55:0);
    playerArms[1].reach(new T.Vector3(.17,-.31,-.43));playerArms[0].reach(new T.Vector3(.04,-.28,-.7));
    if(['pull','climb','rescue','slam'].includes(action)){const local=target?camera.worldToLocal(target.clone()):new T.Vector3(-.1,-.1,-.62);playerArms[0].reach(local);playerArms[1].reach(local.clone().add(new T.Vector3(.16,-.15,.08)));}
    if(action==='squeeze'){playerArms[0].reach(new T.Vector3(-.25,-.1,-.22));playerArms[1].reach(new T.Vector3(.3,-.32,-.2));}
    strap.visible=action==='squeeze';strap.rotation.z=-.3+Math.sin(t*15)*.12;boots.visible=t>28.5&&t<30;
    if(action==='lower')playerArms.forEach((a,i)=>a.reach(new T.Vector3(i?.2:-.2,-.6,-.15)));
  }
  function dispose(){root.removeFromParent();rig.removeFromParent();const gs=new Set(originals),ms=new Set(Object.values(mats)),ts=new Set();for(const group of [root,rig])group.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)ms.add(o.material);});ms.forEach(m=>{for(const v of Object.values(m))if(v?.isTexture)ts.add(v);m.dispose();});gs.forEach(g=>g.dispose());ts.forEach(t=>t.dispose());}
  return {root,companion,enemies,rig,rifle,playerArms,flash,tracer,muzzleLight,boots,firstPerson,dispose};
}
