import { poseGiant, createImpactDebris } from './giant-impact.js';
import { posePursuit, finalePursuer } from './infected-locomotion.js';
import { detailPipe } from './story-weapon-details.js';
import { placePalm } from './companion-performance.js';
import { createCharacterAssets } from './story-character-assets.js';
import { createStoreAmbush } from './companion-store-ambush.js';
import { createCarVault } from './companion-car-vault.js';
import { createSingleArmEscape } from './companion-single-arm.js';
import * as T from 'three';
import { dragFence } from './companion-fence.js';
import { createDoorEscapePerformance } from './companion-door-escape.js';
import { createCrowbarPickup } from './companion-crowbar.js';
import { createFinalePerformance } from './companion-finale.js';
import { createAisleFight } from './companion-aisle-fight.js';
import { createTorchPickup } from './companion-torch.js';
import { createBackpackStruggle } from './companion-backpack.js';
import { streetResponseActors,windowPounce,groundStreetActor } from './companion-street-response.js';
import { createCompanionInteractions } from './companion-interactions.js';
import { createCompanionHorde } from './companion-horde.js';
import { createCompanionPerformance } from './companion-performance.js';
import { weatheredSurface } from './story-surfaces.js';
import { createStoryActors } from './story-actors.js';
import { smooth,clamp } from './last-companion-timeline.js';

export function createCompanionCast(scene,camera,sets,door){
  const horde=createCompanionHorde(scene);horde.hide();const actors=createStoryActors(scene,camera);actors.companion.root.visible=false;actors.companion.root.name='Protagonist reflection';
  // The reflection needs a complete body, not the camera-attached first-person arms.
  const reflector=sets.items.mirror,reflectionRender=reflector.onBeforeRender;
  reflector.onBeforeRender=function(...args){const visible=actors.rig.visible,terminalVisible=sets.items.terminal.visible;actors.rig.visible=false;sets.items.terminal.visible=false;actors.companion.root.visible=true;try{return reflectionRender.apply(this,args);}finally{actors.rig.visible=visible;sets.items.terminal.visible=terminalVisible;actors.companion.root.visible=false;}};
  const metal=weatheredSurface('metal'),cloth=new T.MeshStandardMaterial({color:'#978d79',roughness:1,side:T.DoubleSide}),dark=new T.MeshStandardMaterial({color:'#473c34',roughness:.97}),skin=new T.MeshStandardMaterial({color:'#ad9279',roughness:.9});
  const props=new T.Group();actors.rig.add(props);const pipe=new T.Mesh(new T.CylinderGeometry(.022,.027,.8,16),metal);pipe.rotation.x=Math.PI/2;props.add(pipe);
  const hook=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0,0,-.38),new T.Vector3(0,0,.25),new T.Vector3(.09,0,.33)]),16,.018,10),metal);props.add(hook);
  const lightBody=new T.Mesh(new T.CylinderGeometry(.035,.04,.19,12),dark);lightBody.rotation.x=Math.PI/2;actors.rig.add(lightBody);const torch=new T.SpotLight('#e0e4ce',9,20,.32,.55,1.3);torch.position.set(.1,-.15,-.35);torch.target.position.set(0,-.1,-8);actors.rig.add(torch,torch.target);
  const handFill=new T.PointLight('#e7c8b3',0,1.8,2);handFill.position.set(.05,.04,-.1);actors.rig.add(handFill);
  const reflectedPipe=new T.Mesh(pipe.geometry,metal),reflectedTorch=new T.Mesh(lightBody.geometry,dark);actors.companion.body.add(reflectedPipe,reflectedTorch);detailPipe(pipe);detailPipe(reflectedPipe);
  function reflectedProp(source,target){source.updateWorldMatrix(true,false);actors.companion.body.updateWorldMatrix(true,false);const m=actors.companion.body.matrixWorld.clone().invert().multiply(source.matrixWorld);m.decompose(target.position,target.quaternion,target.scale);target.visible=source.visible&&source.parent.visible;}
  const bandage=new T.Mesh(new T.CylinderGeometry(.080,.069,.105,32,6),cloth);actors.playerArms[0].shoulder.add(bandage);bandage.position.y=-.30;
  const flapGeo=new T.SphereGeometry(1,24,12);const flap=new T.Mesh(flapGeo,new T.MeshStandardMaterial({color:'#464a3b',roughness:1}));flap.scale.set(.066,.014,.066);flap.position.y=-.354;actors.playerArms[0].shoulder.add(flap);
  const wetSleeve=new T.Mesh(new T.CylinderGeometry(.078,.075,.08,32,8,true),new T.MeshStandardMaterial({color:'#33251f',roughness:.97,transparent:true,opacity:.28,depthWrite:false}));wetSleeve.position.y=-.235;actors.playerArms[0].shoulder.add(wetSleeve);
  const finale=createFinalePerformance(actors);
  const emergencyPouch=new T.Group();actors.rig.add(emergencyPouch);const pouchShell=new T.Mesh(new T.BoxGeometry(.13,.16,.06),dark);emergencyPouch.add(pouchShell);const indicator=new T.Mesh(new T.SphereGeometry(.006,8,6),new T.MeshBasicMaterial({color:'#b17b48'}));indicator.position.set(.035,.045,.034);emergencyPouch.add(indicator);
  const inventoryBag=new T.Group();actors.rig.add(inventoryBag);const bagMesh=new T.Mesh(new T.BoxGeometry(.4,.45,.22),dark);inventoryBag.add(bagMesh);
  const interactions=createCompanionInteractions(camera,sets,actors,inventoryBag,door);
  const storeAmbush=createStoreAmbush(camera,actors,props);
  const aisleFight=createAisleFight(camera,actors,props,sets.items.aisleShelf);
  const carVault=createCarVault(actors,props,sets.items.vaultCar);
  const singleArmEscape=createSingleArmEscape(camera,actors,props,sets.items.bag,inventoryBag);
  const torchPickup=createTorchPickup(actors,sets.items.torch,sets.items.torchLight);
  const backpackStruggle=createBackpackStruggle(camera,actors,sets.items.bag,props,inventoryBag);
  const dressingRoll=new T.Mesh(new T.TorusGeometry(.039,.016,8,20),cloth);actors.rig.add(dressingRoll);
  const wraps=[];for(let i=0;i<5;i++){const wrap=new T.Mesh(new T.CylinderGeometry(.085+i*.0004,.085+i*.0004,.026,32,1,true),cloth);wrap.position.y=-.20-i*.018;wrap.rotation.z=Math.sin(i*2.4)*.04;leftShoulder().add(wrap);wraps.push(wrap);}
  const performance=createCompanionPerformance(actors,props,dressingRoll,wraps);
  const doorEscape=createDoorEscapePerformance(actors,props,sets);
  const crowbarPickup=createCrowbarPickup(actors,props,hook,sets.items.floorCrowbar);
  function leftShoulder(){return actors.playerArms[0].shoulder;}
  // Distinct giant silhouette: asymmetric shoulders, a bowed back and crusted growths.
  const giant=actors.enemies[8],crust=new T.MeshStandardMaterial({color:'#4b392b',roughness:.94});
  const fungusCanvas=document.createElement('canvas');fungusCanvas.width=fungusCanvas.height=256;const fc=fungusCanvas.getContext('2d'),fd=fc.createImageData(256,256);
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
    const u=x/256,v=y/256,grain=((x*73+y*97+x*y*13)%47)/47,fold=Math.sin(u*310+Math.sin(v*19)*3)*Math.sin(v*Math.PI),mottle=Math.sin(u*43+v*17)*Math.sin(v*61-u*21),shade=.58+grain*.18+fold*.075+mottle*.12;
    const at=(y*256+x)*4;fd.data.set([135*shade,108*shade,76*shade,255],at);
  }
  fc.putImageData(fd,0,0);const fungusMap=new T.CanvasTexture(fungusCanvas);fungusMap.colorSpace=T.SRGBColorSpace;fungusMap.anisotropy=8;crust.map=fungusMap;crust.bumpMap=fungusMap;crust.bumpScale=.009;

  const growth=new T.Group();growth.name='Fungal mantle / layered shoulder and cranial plates';giant.body.add(growth);growth.visible=false;
  for(let i=0;i<34;i++){
    const geo=new T.SphereGeometry(1,24,16),p=geo.attributes.position;
    for(let j=0;j<p.count;j++){const x=p.getX(j),y=p.getY(j),z=p.getZ(j),r=1+.16*Math.sin(x*9+y*13)*Math.sin(z*11)+.035*Math.sin(x*37-z*19);p.setXYZ(j,x*r,y*r,z*r);}
    geo.computeVertexNormals();const mat=crust.clone();mat.color.setHSL(.075+i%4*.008,.12,.36+i%5*.018);mat.roughness=.91;
    const plate=new T.Mesh(geo,mat),a=i*2.399;
    if(i<26){plate.position.set(Math.cos(a)*(.27+i%3*.018),1.25+(i%5)*.063,Math.sin(a)*.17+.035);plate.scale.set(.065+i%4*.014,.055+i%3*.013,.07);plate.rotation.set(Math.sin(a)*.8,a,Math.cos(a)*.65);}
    else{plate.position.set((i%2?1:-1)*.105,1.58+(i%4)*.035,.015+Math.sin(a)*.075);plate.scale.set(.06,.052,.06);plate.rotation.set(.45,a,.5);}
    plate.castShadow=plate.receiveShadow=true;growth.add(plate);
  }
  const impactDebris=createImpactDebris(actors.root);
  const characterAssets=createCharacterAssets(actors);
  const temp=new T.Vector3();
  function actorAt(index,x,y,z,state,t,target=null,death=0){const a=actors.enemies[index];a.root.visible=true;a.root.position.set(x,y,z);a.root.scale.setScalar(1);a.root.rotation.set(0,0,0);const aim=target||camera.position;a.root.rotation.y=Math.atan2(x-aim.x,z-aim.z);a.pose(t,state,death);a.root.userData.floorY=state==='fall'?null:y;return a;}
  function reach(a,target){a.reachWorld(1,target);}
  function update(s){horde.update(s,camera);const t=s.t;growth.visible=t>=433;actors.root.visible=true;actors.companion.root.visible=false;actors.enemies.forEach(a=>{a.root.visible=false;a.root.userData.motionTime=s.playbackTime??s.t;});
    const body=actors.companion;body.root.position.set(camera.position.x,camera.position.y-1.68,camera.position.z);camera.getWorldDirection(temp);body.root.rotation.y=Math.atan2(-temp.x,-temp.z);body.pose(t,'idle');body.weapon.visible=false;body.arms[0].reach(new T.Vector3(-.18,1.25,-.4));body.arms[1].reach(new T.Vector3(.18,1.15,-.35));
    if(t>=60&&t<155){const a=actorAt(0,30.27,.3,40.4,'idle',t,new T.Vector3(35,1.7,40.4));a.root.rotation.y=-Math.PI/2;a.arms.forEach(x=>{x.shoulder.rotation.set(0,0,0);x.elbow.rotation.set(0,0,0);});a.body.rotation.set(0,0,0);a.body.position.y=0;a.legs.forEach(l=>{l.hip.rotation.x=0;l.knee.rotation.x=0;});a.head.rotation.y=t<139?0:smooth(t,139,145)*2.3;a.eyeLook((camera.position.z-40.4)*.6);}
    if(t>=116&&t<145){
      const f=smooth(t,120,123),g=smooth(t,129,134),x=T.MathUtils.lerp(26.7-1.15*f,21.75,g),z=T.MathUtils.lerp(40.4-1.35*f,43.12,g);
      const a=actorAt(1,x,.3,z,t<123?'run':'idle',t);
      if(t>=123&&t<129){a.jaw.visible=true;a.body.position.y=-.48;a.body.rotation.x=-.25;a.legs.forEach(l=>{l.hip.rotation.x=.75;l.knee.rotation.x=-1.15;});}
      if(t>=134){const hit=smooth(t,135,135.24)*(1-smooth(t,136,137.35)),fall=smooth(t,138,138.85);a.root.position.x-=.4*fall;a.root.position.z+=.16*hit+.1*fall;a.body.position.y=-.3*hit-.55*fall;a.body.rotation.set(.32*hit+.45*fall,0,-.22*hit+1.35*fall);a.head.rotation.x=-.22*hit; a.legs.forEach(l=>{l.hip.rotation.x=.25*hit+.4*fall;l.knee.rotation.x=-.55*hit;});a.arms.forEach((arm,i)=>{arm.shoulder.rotation.z=(i?1:-1)*(.2+.8*fall);});a.root.updateWorldMatrix(true,true);a.body.position.y+=Math.max(0,.3-new T.Box3().setFromObject(a.body).min.y);}
      if(t<130)reach(a,camera.position.clone().add(new T.Vector3(0,-.25,-.15)));
    }
    if(t>=146&&t<181)for(let i=2;i<7;i++){const u=clamp((t-146-i*.4)/13);actorAt(i,17.3+u*11.2-(i-2)*.9,.3,44+(i%2?-.48:.48),'run',t);}
    if(t>=155&&t<162){const a=actorAt(2,28.2,.3,43.7,'run',t,null,t>160?t-160:0);reach(a,camera.position.clone().add(new T.Vector3(0,-.35,0)));}
    if(t>=163&&t<171){const a=actorAt(3,27.2,.3,43.8,'run',t,null,Math.max(0,t-168));reach(a,camera.position.clone().add(new T.Vector3(-.25,-.3,0)));}
    if(t>=171&&t<178){const a=actorAt(4,30.7-smooth(t,171,174)*.5,.3,46.5-smooth(t,171,174)*.4,'run',t);reach(a,camera.position.clone().add(new T.Vector3(0,-.3,.18)));}
    if(t>=181&&t<211){for(let i=0;i<4;i++)actorAt(i,31.8+clamp((t-184)/4,0,4.7)-i*.95,.3,44.5+(i%2?-.38:.38),'run',t);if(t>=196){const a=actorAt(5,camera.position.x-2.35,.3,44.5,t<204?'crawl':'down',t,null,Math.max(0,t-204));reach(a,new T.Vector3(39.1,.38,44.5));}}
    if(t>=225&&t<244){const a=actorAt(7,-.8,.3,66.5,t<234?'crawl':'idle',t);const rise=smooth(t,231.8,234);a.body.rotation.x=-Math.PI*.47*(1-rise);a.body.position.y=-.16*(1-rise);a.head.rotation.x=-.5*rise;if(t>=233)a.jaw.visible=true;}
    for(const p of streetResponseActors(t)){
      // The tracking infected retains index 7 until it finishes its howl.
      const index=p.index===7?8:p.index;
      const a=actorAt(index,p.x,p.y,p.z,p.pose==='climb'?'walk':p.pose,t);
      if(p.phase==='garage'){a.body.rotation.x=-Math.PI*.47*p.duck;a.body.position.y=.21*p.duck;if(p.duck<.01)groundStreetActor(a);}
      if(p.phase==='window'){a.body.rotation.x=-.08;a.head.rotation.y=Math.sin(t*.7+index)*.18;}
      if(p.phase==='roof'){a.root.userData.floorY=null;a.body.rotation.x=-.32*p.lean;if(p.lean>.45)for(const side of [0,1])a.reachWorld(side,new T.Vector3(13.47,6.92,p.z+(side?.2:-.2)));if(p.lean>.85){a.legs[0].hip.rotation.x=.8;a.legs[0].knee.rotation.x=-1.1;}}
    }
    const pounce=windowPounce(t);
    if(pounce){const a=actorAt(7,pounce.x,pounce.y,pounce.z,pounce.pose,t);if(t<264){a.body.rotation.x=-.48;a.body.rotation.z=0;for(const side of [0,1])a.reachWorld(side,new T.Vector3(pounce.x-1,1.1,pounce.z+(side?.2:-.2)));a.legs.forEach(l=>{l.hip.rotation.x=.6;l.knee.rotation.x=-.9;});}if(t>=264)groundStreetActor(a);if(t>267)reach(a,camera.position.clone().add(new T.Vector3(.25,-.38,-.55)));}
    if(t>=310&&t<360){for(let i=0;i<7;i++){const u=smooth(t,315,350);actorAt(i,(i%2?1:-1)*(4.8-u*1.45),-6.92,Math.max(107.5,117-i*.5-u*(4+i*.2)),t<316?'idle':'walk',t);}
      if(t>=327&&t<335){const a=actorAt(1,1.2,-8,105.1,'run',t,null,Math.max(0,t-329));reach(a,camera.position.clone().add(new T.Vector3(0,-.15,-.3)));}}
    if(t>=360&&t<395){for(let i=0;i<6;i++)actorAt(i,2.9+Math.sin(i)*.35,-6.9,109+i*2+smooth(t,360,385)*5,'run',t);if(t<369)actorAt(0,2.8,-6.9,111,'down',t,null,Math.max(0,t-362));
      if(t>=371&&t<377){const u=smooth(t,371,375);const a=actorAt(3,5-u*6,-6.8+Math.sin(u*Math.PI)*1.5,114,'fall',t);a.body.rotation.x=-1;}
      if(t>=378&&t<386){const a=actorAt(4,camera.position.x-.62,-6.92,camera.position.z-1.15,'run',t);reach(a,camera.position.clone().add(new T.Vector3(-.22,-.48,-.28)));}
      if(t>=388&&t<393.1){for(let i=0;i<3;i++){const a=actorAt(i,3.58,-6.9,122.46+i*.66,'idle',t);const withdraw=s.compact?smooth(t,389.2+i*.1,390.5+i*.1):smooth(t,391.8+i*.15,392.7+i*.1);sets.items.maintenanceDoor.updateWorldMatrix(true,false);const target=sets.items.maintenanceDoor.localToWorld(new T.Vector3(s.compact?-.38:.10,1.75-i*.22,.45+i*.66));target.x-=withdraw*.75;reach(a,target);}}
    }
    if(t>=407&&t<420)for(let i=0;i<4;i++)actorAt(i,8+Math.sin(i)*.4,-6.8+(t-407)*.2,127+(t-407)*.5-i,'run',t);
    // Keep standing pursuers beside the player path; passing through their heads
    // obscures the one-handed escape and exposes the inside of the face mesh.
    if(t>=360&&t<386)for(const a of actors.enemies){if(!a.root.visible)continue;const dx=a.root.position.x-camera.position.x,dz=a.root.position.z-camera.position.z;if(Math.hypot(dx,dz)<1.05)a.root.position.x=camera.position.x+Math.sqrt(1.05**2-dz**2);}
    if(t>=433){const a=actorAt(8,0,.2,176-(t-433)*.14,'walk',t);a.root.scale.set(1.8,2.2,1.8);a.body.rotation.x=-.12;reach(a,new T.Vector3(.95,2.2,a.root.position.z+.25));a.arms[1].palm.userData.grip(.92);a.root.updateWorldMatrix(true,true);dragFence(sets.items.fence,a.arms[1].palm.localToWorld(new T.Vector3(0,-.078,-.032)),t);
      for(let i=0;i<8;i++){const angle=i/8*Math.PI*2,r=t<469?12-i*.35:Math.max(2,12-(t-469)*1.8),x=3.8+Math.sin(angle)*r,z=159+Math.cos(angle)*r;actorAt(i,x,.2,z,t<469?'idle':'run',t);}}
    // First person gear. Left forearm is permanently absent after the second collapse.
    actors.firstPerson(t,'lower');actors.rig.visible=t<474;actors.rifle.visible=false;actors.rig.rotation.set(0,0,0);actors.playerArms.forEach((a,i)=>a.shoulder.position.set(i?.27:-.27,-.42,.10));actors.rig.position.set(Math.sin((s.playbackTime??t)*7)*.002,0,0);
    const left=actors.playerArms[0],right=actors.playerArms[1];left.elbow.visible=s.leftArm;left.palm.userData.grip(.15);right.palm.userData.grip((s.pipe||s.crowbar)?.88:.12);bandage.visible=!s.leftArm||t>=220;flap.visible=!s.leftArm;wetSleeve.visible=s.injured&&s.leftArm;flap.rotation.x=Math.sin(t*7)*.15;
    left.reach(new T.Vector3(-.22,-.5,-.28));right.reach(new T.Vector3(.22,-.43,-.4));
    const swinging=['fight-through','crowbar-block','limp-fight','duck-attacker'].includes(s.action),swing=swinging?Math.sin(s.actionTime*3.5):0;
    props.visible=(s.pipe||s.crowbar)&&!['bandage','one-hand-bandage','missing-arm','pack-water','take-water','take-supplies','lemon-memory'].includes(s.action);props.position.set(.23+swing*.16,-.37+Math.max(0,swing)*.18,-.55);props.rotation.set(.4+swing*.8,-.15+swing*.6,-.35+swing*.3);pipe.visible=s.pipe;hook.visible=s.crowbar;if(props.visible)right.reach(props.position.clone().add(new T.Vector3(0,0,.12)));
    if(['shelf-impact','crowbar-block'].includes(s.action)){props.rotation.set(0,0,Math.PI/2);props.position.set(0,-.18,-.48);right.reach(new T.Vector3(.25,-.18,-.48));if(s.leftArm)left.reach(new T.Vector3(-.25,-.18,-.48));}
    if(['take-pipe-door','bar-maintenance-door'].includes(s.action)){right.reach(new T.Vector3(.12,-.18,-.62));if(s.leftArm)left.reach(new T.Vector3(-.2,-.18,-.61));}
    if(['wipe-connect','recognition','lemon-memory','terminal-goodbye','bandage','one-hand-bandage','pinned-wake','missing-arm'].includes(s.action)){right.reach(new T.Vector3(-.09,-.2,-.45));if(s.leftArm)left.reach(new T.Vector3(-.22,-.2,-.45));}
    if(!s.leftArm){left.shoulder.position.set(-.25,t<360?-.16:-.34,t<360?-.18:.02);left.shoulder.rotation.set(t<360?1.7:.65,0,-.14);left.shoulder.rotation.x+=Math.sin(t*7)*.04;if(t>=349&&t<357)right.reach(new T.Vector3(-.23+Math.sin(t*11)*.035,-.31+Math.cos(t*11)*.025,-.29));}
    if(t>=300&&t<338){const approaching=smooth(t,327,331);left.shoulder.position.lerp(new T.Vector3(-.25,-.28,-.25),approaching);const wrist=camera.worldToLocal(new T.Vector3(T.MathUtils.lerp(.6,.32,approaching),-7.72+smooth(t,332,335)*.12,104.14));left.reach(wrist);}
    lightBody.visible=['approach-store','clerk-back','mirror-eyes','retreat'].includes(s.action);lightBody.position.set(-.21,-.22,-.48);torch.intensity=lightBody.visible?2.5:0;if(lightBody.visible&&s.leftArm){left.reach(lightBody.position);left.palm.userData.grip(.85);}
    inventoryBag.visible=['pack-water','take-water','take-supplies','backpack-grab','lose-backpack'].includes(s.action);inventoryBag.position.set(-.15,-.48,-.53);inventoryBag.rotation.y=s.action==='backpack-grab'?Math.sin(t*9)*.8:0;
    if(s.action==='lose-backpack')inventoryBag.position.z-=smooth(t,379,382)*1.8;
    // One-handed dressing and visible legs keep injury and contact readable.
    performance.dressing(t,s.compact?'none':s.action,s.compact);
    performance.combat(t,s.action);
    crowbarPickup.update(s.compact&&t>=429?0:t);
    torchPickup.update(s.compact&&t>=295&&t<327?319.5:t);
    if(s.action==='three-gate-impacts'){props.position.set(.22,-.46,-.35);props.rotation.set(.6,-.1,-.5);right.reach(new T.Vector3(.20,-.35,-.24));right.palm.userData.grip(.9);}
    if(t>=387.8&&t<395.2)hook.visible=true;
    doorEscape.update(t);
    actors.boots.visible=s.action==='knee-push'||s.action==='ankle-fall'||s.action==='alarm-kick';
    if(actors.boots.visible){actors.boots.position.set(0,-.05,-.12);actors.boots.rotation.x=0;if(t>=196){camera.getWorldDirection(temp);temp.y=0;temp.normalize().multiplyScalar(.65).add(camera.position);temp.y=.38;camera.worldToLocal(temp);actors.boots.position.set(temp.x,temp.y+.45,temp.z+.55);actors.boots.rotation.x=s.action==='alarm-kick'?Math.sin(smooth(t,202,204)*Math.PI)*-.65:0;actors.boots.updateWorldMatrix(true,true);if(t<202)reach(actors.enemies[5],actors.boots.localToWorld(new T.Vector3(.14,-.42,-.5)));}}
    // A single screen moves from table to hands to chest pocket, then rests in the fountain.
    const term=sets.items.terminal,held=t>=18&&t<465;
    if(held){if(term.parent!==camera)camera.add(term);term.visible=t<474;const raised=t<34||s.action==='lemon-memory'||t>=429&&t<433||t>=460;term.position.set(raised?-.05:.22,raised?-.18:-.53,raised?-.48:-.29);term.rotation.set(raised?-.12:-.35,0,0);term.scale.setScalar(1);
      if(t>=200&&t<203)term.position.set(.21,-.02,-.53);
      if(t>=463){const u=smooth(t,463,465),destination=camera.worldToLocal(new T.Vector3(3.3,.83,160.4));term.position.lerp(destination,u);const rotation=new T.Quaternion().setFromEuler(new T.Euler(-.25,Math.PI,0));rotation.premultiply(camera.getWorldQuaternion(new T.Quaternion()).invert());term.quaternion.slerp(rotation,u);right.reach(term.position.clone().add(new T.Vector3(.04,-.08,.02)));}
    }
    else if(t>=465){if(term.parent!==sets.plaza)sets.plaza.add(term);term.position.set(3.3,.83,160.4);term.rotation.set(-.25,Math.PI,0);term.visible=true;}
    else{if(term.parent!==sets.room)sets.room.add(term);term.position.set(-19.5,1.21,44.35);term.rotation.set(-Math.PI/2,0,0);term.visible=true;}
    sets.items.cable.visible=t>=21&&t<34;
    emergencyPouch.visible=t>=459&&t<474;emergencyPouch.position.set(.26,-.35,-.48);emergencyPouch.rotation.y=-.25;
    if(t>=460&&t<463||t>=471&&t<474){right.reach(new T.Vector3(.24,-.28,-.45));right.shoulder.rotation.z+=Math.sin(t*19)*.018;}
    interactions.update(s);
    storeAmbush.update(t);
    aisleFight.update(t);
    singleArmEscape.update(s.compact&&(t<370||t>=378)?0:t);
    carVault.update(t);
    backpackStruggle.update(t);
    finale.update(s.compact?0:t);
    if(s.compact){
      const p=s.playbackTime;handFill.intensity=p>=18&&p<52?(p>=31.2&&p<36?.55:.3):0;torch.intensity=p>=18&&p<52?6:0;growth.visible=false;emergencyPouch.visible=false;
      bandage.visible=flap.visible=wetSleeve.visible=dressingRoll.visible=false;wraps.forEach(w=>w.visible=false);
      if(!s.leftArm){left.shoulder.position.set(p<36?-.30:-.26,p<36?-.12:-.38,p<36?-.65:.025);left.shoulder.rotation.set(p<36?-1:.35,0,p<36?.7:-.22);}
      if(p>=3&&p<15){
        const running=p>=11.8,cycle=p*(running?12:7);
        for(const [i,a] of actors.playerArms.entries()){
          const side=i?1:-1,pump=Math.sin(cycle+i*Math.PI)*(running?.075:.025);
          placePalm(a,actors.rig,new T.Vector3(side*.26,-.59+pump*.4,-.22+pump),new T.Quaternion().setFromEuler(new T.Euler(-.35,side*.25,-side*.2)),running?.58:.36);
        }
      }
      if(p>=35&&p<39){props.visible=true;props.position.set(.26,-.5,-.4);right.reach(props.position);right.palm.userData.grip(.85);}
      if(p>=47&&p<52){const pump=Math.sin(p*13)*.055;props.position.y+=pump;props.rotation.x+=Math.sin(p*13)*.06;right.reach(props.position.clone().add(new T.Vector3(0,0,.12)));right.palm.userData.grip(.9);}

      if(p<15){
        actors.enemies.forEach(a=>a.root.visible=false);
        if(p>=8.5){const u=clamp((p-8.5)/6.5),a=actorAt(0,-23+u*20,.3,87+u*9,'run',p);a.root.rotation.y=Math.atan2(-20,-9);posePursuit(a,u*Math.hypot(20,9),Math.hypot(20,9)/6.5,0);}
      }
      impactDebris.update(p);
      if(p>=13.65&&p<16.15){
        const monster=actorAt(8,0,0,101.4,'idle',p);
        poseGiant(monster,p);growth.traverse(o=>o.visible=true);
      }
      if(p>=18&&p<39){
        actors.enemies.forEach(a=>a.root.visible=false);
        // Visible runners on opposite platforms; their path is parallel to the tracks.
        for(let i=0;i<6;i++){const d=(p-18)*(2.65+i*.08),z=175+i*3-d,a=actorAt(i,i%2?-4.7:4.9,-6.9,z,'run',p);a.root.rotation.y=0;posePursuit(a,d,2.65+i*.08,i);}
      }
      if(p>=39&&p<44){
        actors.enemies.forEach((a,i)=>{if(i!==3||t<370||t>=378)a.root.visible=false;});
        const a=actorAt(6,2.4,-6.9,camera.position.z-4,'run',p);a.root.rotation.y=Math.PI;posePursuit(a,(p-39)*3.1,3.1,6);
      }
      if(p>=49){
        actors.enemies.forEach(a=>a.root.visible=false);
        for(let i=0;i<5;i++){const path=finalePursuer(p,i),a=actorAt(i,path.x,path.y,path.z,'run',p);a.root.rotation.y=path.yaw;posePursuit(a,path.distance,path.speed,i);}
        if(p>=53)props.visible=false;actors.boots.visible=false;
      }
      if(p<23)props.visible=false;
      // The short story has no earlier glass wound or street bandage.
      if(p<31.2){bandage.visible=false;wetSleeve.visible=false;wraps.forEach(w=>w.visible=false);}
    }
    if(t>=91&&t<146){left.palm.updateWorldMatrix(true,false);right.palm.updateWorldMatrix(true,false);body.reachWorld(-1,left.palm.getWorldPosition(new T.Vector3()));body.reachWorld(1,right.palm.getWorldPosition(new T.Vector3()));body.arms.forEach((a,i)=>{const source=actors.playerArms[i].palm;a.palm.userData.grip(source.userData.gripValue,source.userData.thumbClosure);a.palm.parent.updateWorldMatrix(true,false);a.palm.position.copy(a.palm.parent.worldToLocal(source.getWorldPosition(new T.Vector3())));a.palm.quaternion.copy(a.palm.parent.getWorldQuaternion(new T.Quaternion()).invert()).multiply(source.getWorldQuaternion(new T.Quaternion()));});reflectedProp(pipe,reflectedPipe);reflectedProp(lightBody,reflectedTorch);}
    characterAssets.update();

  }
  function dispose(){impactDebris.dispose();characterAssets.dispose();storeAmbush.dispose();carVault.dispose();singleArmEscape.dispose();finale.dispose();performance.dispose();interactions.dispose();horde.dispose();reflector.onBeforeRender=reflectionRender;for(const m of [metal,cloth,dark,skin,flap.material,wetSleeve.material])m.dispose();actors.dispose();}
  return {ready:Promise.all([characterAssets.ready,horde.ready]),actors,update,hide(){interactions.hide();horde.hide();},dispose};
}
