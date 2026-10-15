import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createStreetWater } from './street-water.js';
import { createWorldLighting } from './world-lighting.js';
import { createAbandonedHome } from './abandoned-home.js';
import { rect } from './walk-layout.js';
import { createPlantTextures, grassGeometry, fernGeometry } from './street-vegetation.js';
import { createVehicles } from './street-vehicles.js';
import { dressStreet } from './street-dressing.js';
import { createFacadeBuilder } from './building-facades.js';
import { loadHeroNature, HERO_TREES } from './hero-nature.js';
import { fracturedAvenue, growRuins } from './urban-decay.js';
import { nearFracture, SINKHOLE, EXIT_SHAFT } from './ruin-layout.js';

// Original geometry with bundled CC0 surface maps. No extracted game assets or runtime remote services.
export function createDowntown() {
  let seed = 2077;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const range = (a, b) => a + random() * (b - a);
  const pick = values => values[Math.floor(random() * values.length)];
  const scene = new T.Scene();
  const lighting=createWorldLighting(scene);

  function texture(width, height, draw) {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    draw(canvas.getContext('2d'), width, height);
    const result = new T.CanvasTexture(canvas);
    result.colorSpace = T.SRGBColorSpace;
    result.anisotropy = 8;
    return result;
  }
  function noise(ctx, w, h, count, light = false) {
    for (let i = 0; i < count; i++) {
      ctx.fillStyle = light ? `rgba(226,224,203,${range(.03,.18)})` : `rgba(12,23,18,${range(.04,.2)})`;
      const s = range(1, 4);
      ctx.fillRect(range(0,w), range(0,h), s, s * range(1,3));
    }
  }
  const pendingTextures=[];
  function localTexture(name,color=false,repeat=[1,1]) {
    let map;
    pendingTextures.push(new Promise((resolve,reject)=>{map=new T.TextureLoader().load(`/assets/materials/${name}.jpg`,resolve,undefined,reject);}));
    map.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(...repeat);map.anisotropy=8;return map;
  }
  const concreteMap = texture(256, 256, (c,w,h) => {
    c.fillStyle = '#96988a'; c.fillRect(0,0,w,h);
    noise(c,w,h,6500); noise(c,w,h,1600,true);
    for(let i=0;i<30;i++) {
      c.fillStyle = `rgba(49,68,42,${range(.04,.16)})`;
      c.fillRect(range(0,w),range(0,h),range(4,25),range(10,90));
    }
  });
  const roadMap=localTexture('asphalt_02_diff',true,[23/3,760/3]);
  const roadNormal=localTexture('asphalt_02_nor_gl',false,[23/3,760/3]);
  const roadRough=localTexture('asphalt_02_rough',false,[23/3,760/3]);
  const pavementMap=texture(512,512,(c,w,h)=>{
    c.fillStyle='#838879';c.fillRect(0,0,w,h);noise(c,w,h,13000);noise(c,w,h,7000,true);
    c.strokeStyle='#41493d';c.lineWidth=4;c.strokeRect(2,2,508,508);c.beginPath();c.moveTo(256,0);c.lineTo(256,512);c.moveTo(0,256);c.lineTo(512,256);c.stroke();
    for(let i=0;i<18;i++){const x=range(0,w),y=range(0,h),r=range(15,100),g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'#37403260');g.addColorStop(1,'#37403200');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
    c.strokeStyle='#343e3280';c.lineWidth=1.2;c.beginPath();c.moveTo(256,270);c.lineTo(330,310);c.lineTo(366,400);c.lineTo(440,512);c.stroke();
  });
  pavementMap.wrapS=pavementMap.wrapT=T.RepeatWrapping;
  const material = (color, extra={}) => new T.MeshStandardMaterial({color,roughness:.94,...extra});
  const concrete=material('#8c9181',{map:concreteMap});
  const pale=material('#c1bca4',{map:concreteMap});
  const dark=material('#2b3632');
  const rusty=material('#6e4733',{map:concreteMap});
  const asphalt=material('#78817f',{map:roadMap,normalMap:roadNormal,normalScale:new T.Vector2(.65,.65),roughnessMap:roadRough,roughness:.86});
  const pavement=material('#b1b4a5',{map:pavementMap,bumpMap:pavementMap,bumpScale:.035});
  const iron=material('#39463f',{metalness:.5,roughness:.7});
  const rubber=material('#18221e');
  const glass=material('#182b29',{metalness:.35,roughness:.3});
  const yellow=material('#a58b48');
  const soil=material('#384334',{map:concreteMap});
  const bark=material('#b4b29a',{map:localTexture('bark_brown_02_diff',true,[2,6]),normalMap:localTexture('bark_brown_02_nor_gl',false,[2,6]),normalScale:new T.Vector2(.8,.8),roughnessMap:localTexture('bark_brown_02_rough',false,[2,6])});
  const cube=new T.BoxGeometry(1,1,1);
  const objects=[];
  const obstacles=[];
  function mesh(geo,mat,x,y,z,parent=scene) {
    const object=new T.Mesh(geo,mat);object.position.set(x,y,z);parent.add(object);objects.push(object);return object;
  }
  function box(w,h,d,mat,x,y,z,parent=scene) {
    let geo=cube;
    if(mat===pavement||mat.userData.metreScale) {
      geo=cube.clone();const uv=geo.attributes.uv,p=geo.attributes.position,n=geo.attributes.normal;
      const scale=mat.userData.metreScale||2.4;
      for(let i=0;i<uv.count;i++){const xx=p.getX(i)*w+x,yy=p.getY(i)*h+y,zz=p.getZ(i)*d+z;uv.setXY(i,(Math.abs(n.getX(i))>.5?zz:xx)/scale,(Math.abs(n.getY(i))>.5?zz:yy)/scale);}
    }
    const object=mesh(geo,mat,x,y,z,parent);object.scale.set(w,h,d);return object;
  }
  function cylinder(r1,r2,length,mat,a,b,parent=scene) {
    const start=new T.Vector3(...a),end=new T.Vector3(...b);
    const object=mesh(new T.CylinderGeometry(r1,r2,length,mat===bark?12:8),mat,0,0,0,parent);
    object.position.copy(start).add(end).multiplyScalar(.5);
    object.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),end.sub(start).normalize());
    return object;
  }
  function branch(a,b,r1,r2,parent=scene) {
    return cylinder(r1,r2,new T.Vector3(...a).distanceTo(new T.Vector3(...b)),bark,a,b,parent);
  }
  function sign(label,w,h,x,y,z,color='#384e45',rotation=0,parent=scene) {
    const map=texture(768,128,(c,cw,ch)=>{
      c.fillStyle=color;c.fillRect(0,0,cw,ch);c.strokeStyle='#aab39b';c.lineWidth=3;c.strokeRect(9,9,cw-18,ch-18);
      c.fillStyle='#d5d2b7';c.font=`500 ${label.length>18?38:52}px Georgia`;c.textAlign='center';c.textBaseline='middle';c.fillText(label,cw/2,ch/2,cw-45);
      noise(c,cw,ch,4000);
      for(let i=0;i<20;i++){c.fillStyle='#14221a45';c.fillRect(range(0,cw),0,range(1,5),range(20,ch));}
    });
    const object=mesh(new T.PlaneGeometry(w,h),material('#fff',{map,side:T.DoubleSide}),x,y,z,parent);
    object.rotation.y=rotation;return object;
  }

  // Ground and streets continue well beyond the walkable district and the fog horizon.
  // Soil is open below the collapse, so the fall never passes through a solid ground plane.
  box(596.5,.5,1200,soil,-301.75,-.36,0);
  box(590.7,.5,1200,soil,304.65,-.36,0);box(3.3,.5,1200,soil,5.15,-.36,0);
  box(2.5,.5,726.2,soil,8.05,-.36,-236.9);box(2.5,.5,460,soil,8.05,-.36,370);
  box(7,.5,696,soil,0,-.36,-252);box(7,.5,495,soil,0,-.36,352.5);
  const coverShape=new T.Shape(SINKHOLE.map(([x,z])=>new T.Vector2(x,-z))),coverGeometry=new T.ShapeGeometry(coverShape);coverGeometry.rotateX(-Math.PI/2);
  const cp=coverGeometry.attributes.position,cu=coverGeometry.attributes.uv;for(let i=0;i<cu.count;i++)cu.setXY(i,(cp.getX(i)+11.5)/23,(cp.getZ(i)+380)/760);
  const sinkholeCover=new T.Mesh(coverGeometry,asphalt);sinkholeCover.position.y=.045;sinkholeCover.receiveShadow=true;sinkholeCover.castShadow=true;scene.add(sinkholeCover);
  const exitShape=new T.Shape(EXIT_SHAFT.map(([x,z])=>new T.Vector2(x,-z))),exitGeometry=new T.ShapeGeometry(exitShape);exitGeometry.rotateX(-Math.PI/2);
  const ep=exitGeometry.attributes.position,eu=exitGeometry.attributes.uv;for(let i=0;i<eu.count;i++)eu.setXY(i,(ep.getX(i)+11.5)/23,(ep.getZ(i)+380)/760);
  const exitCover=new T.Mesh(exitGeometry,asphalt);exitCover.position.y=.045;exitCover.receiveShadow=exitCover.castShadow=true;scene.add(exitCover);
  fracturedAvenue({mesh,asphalt,soil,concrete,range,obstacles});
  const crossRoad=asphalt.clone();
  for(const key of ['map','normalMap','roughnessMap']){crossRoad[key]=asphalt[key].clone();crossRoad[key].repeat.set(760/3,19/3);}
  box(760,.14,19,crossRoad,0,-.01,19);
  for(const side of [-1,1]) {
    for(const [z,length] of [[-176,368],[204,350]]) {
      box(5,.3,length,pavement,side*14,.1,z);
      box(.28,.42,length,pale,side*11.6,.12,z);
    }
    for(const [x,length] of [[-197,360],[197,360]]) {
      box(length,.3,4.5,pavement,x,.1,19+side*12);
      box(length,.42,.25,pale,x,.12,19+side*9.65);
    }
  }
  for(let z=-365;z<370;z+=7) {
    if((z>7&&z<32)||nearFracture(0,z,2))continue;
    for(const x of [-.2,.2])box(.1,.018,range(2.1,3.9),yellow,x,.065,z);
  }
  for(const z of [7,31])for(let x=-9;x<11;x+=2.4)box(1.25,.02,2.8,pale,x,.075,z);
  for(const side of [-1,1])for(let z=-360;z<370;z+=5) {
    if(z>7&&z<33)continue;
    if(!nearFracture(side*10,z,.3))box(1.6,.025,.2,pale,side*10,.085,z);
  }

  function facade(brick,cols,rows,style='brick') {
    const map=texture(512,1024,(c,w,h)=>{
      c.fillStyle=brick;c.fillRect(0,0,w,h);
      // Mortar and thin courses remain visible in close street views.
      if(style!=='glass')for(let y=0;y<h;y+=12){c.fillStyle='#18251e24';c.fillRect(0,y,w,1);for(let x=(y%24?0:18);x<w;x+=36)c.fillRect(x,y,1,12);}
      const cw=w/cols,rh=h/rows;
      for(let row=0;row<rows;row++)for(let col=0;col<cols;col++) {
        const x=col*cw+cw*.18,y=row*rh+rh*.17,ww=cw*.64,wh=rh*.65;
        c.fillStyle='#242c29';c.fillRect(x-3,y-3,ww+6,wh+6);
        c.fillStyle=pick(['#1e2c2a','#273734','#384845','#3f4c46']);c.fillRect(x,y,ww,wh);
        const gradient=c.createLinearGradient(x,y,x+ww,y+wh);gradient.addColorStop(0,'#9baea833');gradient.addColorStop(.65,'#19282255');c.fillStyle=gradient;c.fillRect(x,y,ww,wh);
        c.fillStyle='#7e8170';c.fillRect(x-4,y+wh,ww+8,3);c.fillStyle='#535e51';c.fillRect(x+ww*.5,y,2,wh);c.fillRect(x,y+wh*.52,ww,2);
        if(random()<.36){c.fillStyle='#0f1a17';c.beginPath();c.moveTo(x+2,y+3);c.lineTo(x+ww*.8,y+5);c.lineTo(x+ww*.46,y+wh*.5);c.lineTo(x+ww*.85,y+wh*.78);c.lineTo(x+2,y+wh*.9);c.fill();}
        if(random()<.13){c.fillStyle='#706652';c.fillRect(x,y+wh*.2,ww,7);c.fillRect(x,y+wh*.64,ww,8);}
        c.fillStyle='#1d2b2245';c.fillRect(x-3,y+wh+4,ww+6,range(5,rh*.3));
      }
      for(let i=0;i<110;i++){const x=range(0,w),y=range(0,h);c.fillStyle=`rgba(21,41,26,${range(.06,.25)})`;c.fillRect(x,y,range(3,15),range(30,250));}
      noise(c,w,h,15000);noise(c,w,h,3000,true);
    });
    return material('#d2d0bf',{map});
  }
  const facadeColors=['#80634f','#a09b83','#786454','#627775','#686b60','#586e6a','#737365','#9b8a6c'];
  const brick=material('#8b6f58',{map:concreteMap});
  const greenMetal=material('#53695e',{metalness:.45,roughness:.8,map:concreteMap});
  const detailedShell=createFacadeBuilder({scene,mesh,box,material,texture,localTexture,range,random,iron,pale,dark});
  function shell(x,z,w,d,h,y,wall) {
    if(wall.userData.architecture){detailedShell(x,z,w,d,h,y,wall.userData.architecture.kind,wall);return;}
    box(w,h,d,concrete,x,y+h/2,z);
    for(const side of [-1,1]) {
      const front=mesh(new T.PlaneGeometry(w,h),wall,x,y+h/2,z+side*(d/2+.02));front.rotation.y=side===1?0:Math.PI;
      const flank=mesh(new T.PlaneGeometry(d,h),wall,x+side*(w/2+.02),y+h/2,z);flank.rotation.y=side*Math.PI/2;
    }
    box(w+.4,.3,d+.4,pale,x,y+h+.12,z);
  }
  function building(x,z,w,d,h,index) {
    const kind=index%8;
    const streetX=x>0?x-w/2-.06:x+w/2+.06,side=x>0?-1:1;
    if(kind===0)h=Math.min(h,18);
    if(kind===4)h=Math.min(h,20);
    if(kind===7)h=Math.min(h,16);
    const wall=facade(facadeColors[kind],Math.max(3,Math.round(d/(kind===0?5.5:3.8))),Math.max(3,Math.round(h/3.7)),[3,5].includes(kind)?'glass':'brick');
    const detailed=Math.abs(x)<80&&z> -105&&z<135;
    if(detailed)wall.userData.architecture={kind};
    obstacles.push(rect(x,z,w,d));
    if(kind===1) {
      // Art-deco massing: broad podium, two setbacks, a narrow crown and vertical fins.
      shell(x,z,w,d,h*.38,.3,wall);
      shell(x,z,w*.77,d*.83,h*.42,h*.38,wall);
      shell(x,z,w*.52,d*.6,h*.2,h*.8,wall);
      for(const sx of [-1,1])for(let q=-d*.35;q<d*.4;q+=d*.17)box(.35,h*.78,.5,pale,x+sx*w*.39,h*.4,z+q);
      box(w*.4,1.1,d*.46,greenMetal,x,h+.65,z);
      cylinder(.06,.1,6,iron,[x,h,z],[x,h+6,z]);
    } else if(kind===4) {
      // Open-sided parking garage, not another window-textured box.
      box(w*.32,h,d,concrete,x-side*w*.34,h/2,z);
      for(let y=.4;y<h;y+=3.1) {
        const broken=y>h*.53;
        box(broken?w*.62:w,.3,d,concrete,x-(broken?side*w*.19:0),y,z);
        for(let q=-d/2+1;q<d/2;q+=5){if(broken&&q<d*.12)continue;box(.55,broken?1.2:3,.55,concrete,streetX-side*(broken?w*.38+.3:.7),y+(broken?.6:1.5),z+q);}
        if(!broken)box(.22,.6,d,concrete,streetX-side*.25,y+.7,z);
      }
      const ramp=box(w*.62,.3,d*.6,concrete,x,h*.45,z);ramp.rotation.x=.18;
      box(w*.62,.32,d+.5,concrete,x-side*w*.19,h,z);
      sign('P A R K',7,2.3,streetX+side*.05,h*.62,z,'#42544c',side*Math.PI/2);
    } else if(kind===6) {
      // Cut-open ruin: exposed slabs, a surviving back wing and irregular rebar.
      shell(x-side*w*.3,z,w*.4,d,h,.3,wall);
      for(let floor=0;floor<Math.floor(h/3.7);floor++) {
        const width=w*(floor>5?.52:floor>3?.77:1),sx=x-side*(w-width)/2;
        box(width,.28,d,concrete,sx,.35+floor*3.7,z);
        for(const zz of [-d*.43,0,d*.43])box(.5,3.4,.5,concrete,sx+side*(width/2-.6),2+floor*3.7,z+zz);
        if(floor%2===0)box(.2,2.2,d*.25,brick,sx+side*(width/2-.2),1.5+floor*3.7,z-d*.3);
        for(let j=0;j<5;j++){const rod=box(.045,betweenHeight(floor),.045,rusty,sx+side*(width/2-.3),floor*3.7+1,z+range(-d*.4,d*.4));rod.rotation.z=range(-.4,.4);}
      }
    } else if(kind===5||kind===3) {
      // Two unequal office wings and recessed dark glazing, with missing curtain-wall panels.
      shell(x-side*w*.12,z,w*.76,d,h,.3,wall);
      shell(x+side*w*.37,z+d*.2,w*.25,d*.6,h*.55,.3,wall);
      for(let q=-d*.45;q<d*.5;q+=3.2)box(.23,h,.23,iron,x+side*w*.265,h/2,z+q);
      for(let y=5;y<h;y+=4.2)box(.25,.18,d,iron,x+side*w*.27,y,z);
      box(w*.56,2,d*.3,dark,x-side*w*.12,h+1,z+d*.2);
    } else {
      if(kind===7){shell(x,z,w,d,h*.72,.3,wall);shell(x-side*w*.16,z+d*.15,w*.68,d*.7,h*.28,h*.72,wall);}
      else shell(x,z,w,d,h,.3,wall);
      if(kind===0&&index!==8) {
        // Low warehouse with a pitched, ribbed metal roof and tall loading doors.
        for(const sx of [-1,1]) {
          const roof=box(w*.55,.2,d+1,greenMetal,x+sx*w*.25,h+1.4,z);roof.rotation.z=-sx*.2;
          for(let q=-d/2;q<d/2;q+=1.3){const rib=box(w*.56,.06,.06,iron,x+sx*w*.25,h+1.5,z+q);rib.rotation.z=-sx*.2;}
        }
        if(!detailed)for(let q=-d*.3;q<d*.4;q+=d*.35){box(.1,4.5,d*.25,iron,streetX,2.5,z+q);for(let y=.5;y<4.7;y+=.35)box(.16,.035,d*.25,pale,streetX+side*.08,y,z+q);}
        for(const sx of [-1,1])box(1.3,3,1.3,brick,x+sx*w*.3,h+2,z-d*.25);
      } else if(kind===2) {
        // Old apartment hotel: balconies, cornices and a distinct outside stair tower.
        for(let y=4;y<h;y+=3.8) {
          box(w+.6,.28,d+.6,pale,x,y,z);
          for(let q=-d*.3;q<d*.4;q+=d*.35) {
            box(1.3,.15,3.4,concrete,streetX+side*.55,y,z+q);
            box(.07,.08,3.4,iron,streetX+side*1.1,y+.9,z+q);
            for(let k=-1.5;k<=1.5;k+=.5)box(.05,.8,.05,iron,streetX+side*1.1,y+.5,z+q+k);
          }
        }
        box(3,h+3,3.5,brick,x-side*(w/2-1.5),h/2+1.5,z-d/2+1.7);
        for(const sz of [-1,1])box(w+1,.8,.65,pale,x,h+.6,z+sz*d/2);
      } else if(kind===7) {
        // A partially lost upper storey leaves a broken parapet over the lower floor.
        for(let q=-d*.4;q<d*.45;q+=2.7){if(q>d*.08&&q<d*.32)continue;box(.42,.6,1.9,brick,streetX-side*.05,h*.72+.55,z+q);const rebar=box(.025,1.1,.025,rusty,streetX-side*.16,h*.72+.8,z+q+.7);rebar.rotation.z=.21;}
        // Small historic corner block: tall bays, projecting awnings and a pediment.
        for(let q=-d*.4;q<d*.5;q+=4){box(.35,h*.72,.5,pale,streetX,h*.36,z+q);box(1.5,.15,2.7,greenMetal,streetX+side*.65,3.4,z+q+1.5).rotation.z=side*.12;}
        box(w*.68,.3,d*.7,pale,x-side*w*.16,h+.1,z+d*.15);
      }
    }
    if(kind!==4&&kind!==6&&index!==8) {
      if(!detailed)for(let q=-d/2+2;q<d/2-1;q+=4.1){box(.06,2.5,2.9,glass,streetX,1.65,z+q);box(.19,2.9,.18,pale,streetX,1.8,z+q+1.5);}
      const labels=[['UNION FREIGHT','FOUNDRY No. 8','HARBOR STORAGE'],['CIVIC TRUST','BELL TOWER','NORTHWEST BANK'],['MERIDIAN HOTEL','PINE APARTMENTS','THE PORTLAND'],['PACIFIC EXCHANGE','CENTRAL OFFICES','WESTERN HOUSE'],['PARK','GARAGE','PARKING'],['MEDICAL ARTS','MERCER CENTRE','CITY CLINIC'],['RESTRICTED','DANGER','KEEP OUT'],['WESTLAKE STORES','WILLOW BOOKS','CORNER MARKET']];
      sign(labels[kind][Math.floor(index/8)%3],Math.min(d*.65,13),1.15,streetX+side*.12,4,z,'#414b3c',side*Math.PI/2);
    }
    // Different service equipment and roof silhouettes on each building.
    if(kind!==0&&kind!==6) {
      const count=1+index%3,roofWidth=kind===1?w*.52:kind===7?w*.68:kind===4?w*.62:[3,5].includes(kind)?w*.76:w,roofX=kind===7?x-side*w*.16:kind===4?x-side*w*.19:[3,5].includes(kind)?x-side*w*.12:x;
      for(let i=0;i<count;i++){const unitH=range(.7,1.5);box(range(1,2),unitH,range(1.5,2.6),iron,roofX+(i-(count-1)/2)*Math.min(2.4,(roofWidth-3)/count),h+.3+unitH/2,z+d*.12);}
    }
    if(kind===2||kind===7){const tank=mesh(new T.CylinderGeometry(1.4,1.4,2.3,12),dark,kind===7?x-side*w*.16:x+w*.25,h+2,kind===7?z+d*.15:z-d*.2);box(3,.2,3,iron,tank.position.x,h+.7,tank.position.z);}
    return {x,z,w,d,h,streetX,ivyHeight:[3,5,6].includes(kind)?0:kind===1?h*.38:kind===7?h*.72:h,roofPlants:![1,3,4,5,6,7].includes(kind)};
  }
  function betweenHeight(floor){return floor%2?1.8:.9;}

  const buildings=[];
  const blocks=[[-29,-79,25,27,46],[-29,-44,25,29,31],[-30,-7,27,26,27],[-29,48,25,30,38],[-30,85,27,29,28],
    [30,-91,27,30,53],[29,-51,25,34,40],[30,-12,27,28,32],[30,50,27,30,26],[30,86,27,28,44],
    [-67,-80,31,30,62],[-65,-39,28,32,47],[-64,-2,27,29,37],[-66,55,30,36,54],
    [67,-84,29,33,64],[65,-41,27,31,48],[66,-2,28,29,46],[65,56,28,34,37]];
  // Keep the adjacent lot separable for the short cinematic's starting house.
  const cinematicLot=new T.Group();cinematicLot.name='Cinematic dwelling lot';scene.add(cinematicLot);
  blocks.forEach((b,i)=>{if(i===3)return;const before=new Set(scene.children),start=objects.length;buildings.push(building(...b,i));if(i===4){for(const child of [...scene.children])if(!before.has(child))cinematicLot.add(child);for(const object of objects.slice(start))object.userData.cinematicLot=true;}});
  // Reserve the front lot for the enterable house; a narrow brick wing stands behind it.
  buildings.push(building(-36,51,13,33,23,16));
  obstacles.push(rect(15.1,38.8,2.5,5.3));
  buildings.push(building(-23,58,13,17,12,15));
  for(let i=0;i<9;i++)building(-100+i*25,-148,range(17,23),25,range(39,82),i);
  // Continue the avenue south of the dwelling, with real blocks on both sides.
  for(const [i,z]of [122,175,222,269,316].entries())for(const side of [-1,1]) {
    building(side*(30+i%2*2),z,25+i%3*2,29+i%2*6,23+(i*13+(side+1)*7)%38,24+i*2+(side+1)/2);
  }
  // East/west cross-street extensions close the former open horizon in front of the door.
  for(const [i,x]of [105,148,193,237,282,328].entries())for(const side of [-1,1]) {
    building(side*x,-7,28+i%2*4,29,22+(i*17)%40,39+i*2+(side+1)/2);
    building(side*x,51,29,31+i%2*5,18+(i*11)%35,52+i*2+(side+1)/2);
  }
  // Outer blocks share a small material palette; distant silhouettes need less geometry.
  const distantWalls=facadeColors.slice(0,4).map((color,i)=>facade(color,5,8,i===3?'glass':'brick'));
  function distantBlock(x,z,index) {
    const w=25+index%3*4,d=27+index%2*5,h=24+index*13%57;
    obstacles.push(rect(x,z,w,d));
    shell(x,z,w,d,h,.3,distantWalls[index%4]);
    if(index%3===0)shell(x,z,w*.6,d*.7,9,h,distantWalls[index%4]);
    else box(w*.45,2,d*.3,iron,x,h+1,z);
  }
  let distantIndex=0;
  for(const side of [-1,1])for(const x of [73,117,163,211])for(const z of [110,184,229,276,323])distantBlock(side*x,z,distantIndex++);
  for(const side of [-1,1])for(const x of [112,162,212,263])for(const z of [-65,-115,-180,-235,-292])distantBlock(side*x,z,distantIndex++);
  // A second cross street gives the southern extension a readable junction.
  box(480,.14,17,crossRoad,0,-.01,147);
  for(const z of [137.8,156.2])for(const side of [-1,1])box(210,.3,2.5,concrete,side*122,.1,z);
  for(let x=-350;x<355;x+=8)if(Math.abs(x)>17)box(3,.018,.12,yellow,x,.08,19);

  // The broken, exposed corner of an annex opposite the intersection.
  const ruin=new T.Group();scene.add(ruin);ruin.position.set(-26,0,10);
  obstacles.push(rect(-26,10,13,8));
  for(let floor=0;floor<4;floor++) {
    const width=13-floor*1.7;
    box(width,.35,8,concrete,-floor*.6,1+floor*3.7,0,ruin);
    for(const x of [-5,1])box(.55,3.7,.55,concrete,x,2.6+floor*3.7,-3,ruin);
    box(width,2.8,.5,dark,-floor*.6,2.65+floor*3.7,-3.5,ruin);
    for(let i=0;i<4;i++){const rod=box(.045,range(.8,2.8),.045,rusty,width/2-.4,1.5+floor*3.7,range(-3,3),ruin);rod.rotation.z=range(-.7,.7);}
  }

  // Organic cards keep thousands of plants to just a few draw calls.
  const {leafMap,ivyMap}=createPlantTextures(texture,random);
  const mossMap=texture(256,256,c=>{
    for(let i=0;i<1700;i++){const a=range(0,Math.PI*2),r=Math.sqrt(random())*118;c.fillStyle=pick(['#4c5c32aa','#677347aa','#394b2c88']);c.beginPath();c.ellipse(128+Math.cos(a)*r,128+Math.sin(a)*r,range(1,8),range(1,5),0,0,Math.PI*2);c.fill();}
  });
  const leaves=[],grass=[],ivy=[],moss=[],ferns=[];
  function card(list,x,y,z,sx,sy,rx=0,ry=0,rz=0){if(x>-26&&x<-11&&z>78&&z<91&&y<5)return;if(x>12.8&&x<18&&z>42.65&&z<45.35&&y>.35&&y<2.9)return;list.push({x,y,z,sx,sy,rx,ry,rz});}
  function tree(x,z,height=10) {
    if(HERO_TREES.some(t=>t[0]===x&&t[1]===z))return;
    obstacles.push(rect(x,z,.65,.65));
    const leanX=range(-.65,.65),leanZ=range(-.5,.5),width=height*.032;
    let start=[x,.18,z];
    for(let i=1;i<=5;i++){const t=i/5,end=[x+leanX*t+Math.sin(t*4)*.15,height*t*.87,z+leanZ*t];branch(start,end,width*(1-t*.9),width*(1-(t-.2)*.9));start=end;}
    for(let i=0;i<6;i++) {const a=i*2.4;branch([x+Math.cos(a)*range(.8,1.45),.17,z+Math.sin(a)*range(.8,1.45)],[x,.8,z],.05,width*.5);}
    for(let i=0;i<10;i++) {
      const a=i*2.4+range(-.3,.3),r=range(1.5,3.6),y=height*range(.42,.84),bx=x+Math.cos(a)*r,bz=z+Math.sin(a)*r;
      branch([x+leanX*y/height,y-1.2,z+leanZ*y/height],[bx,y+.8,bz],.035,.13);
      for(let twig=0;twig<3;twig++) {
        const ta=a+range(-.9,.9),tx=bx+Math.cos(ta)*range(.4,1.35),tz=bz+Math.sin(ta)*range(.4,1.35),ty=y+range(.8,2.1);
        branch([bx,y+.65,bz],[tx,ty,tz],.012,.04);
        for(let j=0;j<11;j++)card(leaves,tx+range(-1,1),ty+range(-.35,1),tz+range(-1,1),range(1.2,2.1),range(1.2,2),range(-1.2,1.2),range(0,Math.PI),range(-.6,.6));
      }
    }
    for(let i=0;i<5;i++)card(ferns,x+range(-1.3,1.3),.28,z+range(-1.3,1.3),range(.6,1.1),range(.6,1),0,range(0,6.28));
  }
  [[-12,-9,11],[13,-22,13],[-12,-64,14],[13,37,10],[-13,38,10],[12,-77,12],[-13,70,12],[13,82,11],[-46,27,14],[49,29,13],[-6,-117,10]].forEach(p=>tree(...p));
  for(const side of [-1,1])for(const z of [109,151,190,235,276])tree(side*13.5,z,9+(z%5));
  for(const side of [-1,1])for(const x of [86,127,171,218,263])tree(side*x,31.7,9+x%4);
  for(let i=0;i<1600;i++) {
    const side=random()<.5?-1:1,z=range(-132,105),x=side*range(10.2,17);
    if(z>9&&z<29&&Math.abs(x)>12)continue;
    if(side<0&&z>39.6&&z<42&&x< -15.5)continue;
    const h=range(.25,.85);card(grass,x,.25+h/2,z,range(.6,1.4),h,0,range(0,Math.PI));
    if(i%12===0)card(moss,x,.17,z,range(2,5),range(2,5),-Math.PI/2,0,range(0,Math.PI));
  }
  for(let i=0;i<200;i++) {
    const side=i%2?-1:1,z=range(-100,108);
    if((z>8&&z<32)||(side<0&&z>39&&z<43))continue;
    card(ferns,side*range(14.5,17),.28,z,range(.6,1.3),range(.65,1.3),0,range(0,6.28));
  }
  for(let i=0;i<1800;i++) {
    const alongAvenue=i%2===0,side=random()<.5?-1:1;
    const x=alongAvenue?side*range(11,16.5):side*range(80,300),z=alongAvenue?range(104,320):19+side*range(10,14);
    const h=range(.3,1.2);card(grass,x,.18+h/2,z,range(.6,1.2),h,0,range(0,Math.PI));
    if(i%24===0)card(moss,x,.18,z,range(2,5),range(2,5),-Math.PI/2);
  }
  // Small islands of regrowth push through asphalt, leaving the avenue readable.
  for(const [x,z] of [[-5,7],[5,-7],[-4,-49],[5,36],[-2,-85],[6,74]]) {
    card(moss,x,.08,z,8,12,-Math.PI/2);
    for(let i=0;i<110;i++){const h=range(.3,.9);card(grass,x+range(-2,2),.06+h/2,z+range(-3.8,3.8),.8,h,0,range(0,Math.PI));}
  }
  for(const b of buildings.slice(0,10)) {
    if(b.x===30&&b.z===50||b.x===-30&&b.z===85)continue;
    for(let strand=0;strand<(b.ivyHeight?9:0);strand++) {
      const z=b.z+range(-b.d*.44,b.d*.44),top=b.ivyHeight*range(.25,.95),bottom=.3;
      const x=b.streetX+(b.x>0?-.09:.09),points=[];
      for(let y=bottom;y<top;y+=.3) {
        const zz=z+Math.sin(y*.8+strand)*.45+Math.sin(y*.23)*.8;
        points.push(new T.Vector3(x,y,zz));
        for(let j=0;j<4;j++) {
          const spread=(.5+Math.sin(y*.4+strand)*.3)*(1-y/top*.5);
          card(ivy,x+(b.x>0?-1:1)*range(.015,.13),y+range(-.15,.15),zz+range(-spread,spread),range(.18,.36),range(.23,.42),range(-.25,.25),Math.PI/2+range(-.3,.3),range(-.7,.7));
        }
      }
      if(points.length>2)mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),Math.min(48,points.length),.018,4),bark,0,0,0);
    }
    for(let i=0;i<(b.roofPlants?35:0);i++)card(grass,b.x+range(-b.w/2,b.w/2),b.h+1,b.z+range(-b.d/2,b.d/2),1.1,1.3,0,range(0,Math.PI));
  }
  growRuins({buildings:buildings.filter(b=>!(b.x===-30&&b.z===85)),card,ivy,grass,moss,ferns,mesh,bark,range,random});
  function instances(items,map,{alphaTest=.3,roughness=1}={}) {
    const isGrass=items===grass,isFern=items===ferns;
    const geometry=isGrass?grassGeometry(random):isFern?fernGeometry():new T.PlaneGeometry(1,1);
    const tint=isFern?'#415933':items===leaves?'#82956d':items===ivy?'#a1b184':items===moss?'#66734c':'#fff';
    const mat=material(tint,{map:isGrass||isFern?null:map,alphaTest,side:T.DoubleSide,roughness,vertexColors:isGrass,envMapIntensity:.15});
    mat.alphaToCoverage=false;
    const batch=new T.InstancedMesh(geometry,mat,items.length),dummy=new T.Object3D();
    items.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(p.rx,p.ry,p.rz);dummy.scale.set(p.sx,p.sy,isGrass||isFern?p.sx:1);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);});
    batch.receiveShadow=true;batch.castShadow=items===leaves||items===ivy;scene.add(batch);
  }
  instances(leaves,leafMap);instances(grass,null);instances(ferns,null);instances(ivy,ivyMap);instances(moss,mossMap,{alphaTest:.15});

  const water=createStreetWater(scene);

  const car=createVehicles({scene,mesh,box,material,texture,noise,range,random,obstacles,iron,rusty,rubber,pale,glass,sign});
  car(-6,0,-.22,'#5e6855',true);
  car(7,31,-.3,'#73817a',false,'pickup');car(-7,-31,.13,'#756a51',false,'van');car(5,-61,-.3,'#4b6260',false,'hatch');car(-6,66,.4,'#745b47',false,'pickup');car(19,20,1.5,'#72776b');car(7,-100,.12,'#6b6c57');
  car(6,118,-.12,'#65726b',false,'van');car(-6,179,.35,'#6e654f',false,'hatch');car(5,228,-.2,'#5b6658',true);
  car(91,20,1.3,'#726348',false,'pickup');car(-133,17,1.7,'#647369',false,'van');car(184,22,1.5,'#706c5c');

  // Street furniture: leaning signals, cables, bollards and barricades.
  for(const side of [-1,1])for(const z of [-92,-53,-18,38,77,116,164,205,249,290]) {
    const g=new T.Group();g.position.set(side*10.8,0,z);g.rotation.z=range(-.055,.055);scene.add(g);
    cylinder(.075,.12,7,iron,[0,.2,0],[0,7.2,0],g);
    box(2.4,.13,.13,iron,-side*1.1,7.2,0,g);box(.8,.18,.4,dark,-side*2.1,7.05,0,g);
    box(.33,.4,.33,concrete,0,.25,0,g);
  }
  for(const [x,z,side] of [[10.8,7,-1],[-10.8,31,1]]) {
    cylinder(.1,.16,7.6,iron,[x,0,z],[x,7.6,z]);
    box(8,.14,.15,iron,x+side*3.8,7.5,z);
    for(let i=0;i<2;i++) {
      const sx=x+side*(3+i*3);
      box(.55,1.6,.45,yellow,sx,6.65,z);
      for(let j=0;j<3;j++){const bulb=mesh(new T.CylinderGeometry(.17,.17,.05,12),dark,sx,7.15-j*.48,z+.25);bulb.rotation.x=Math.PI/2;}
    }
  }
  sign('PINE ST',2.4,.6,10.7,4.6,7.2,'#355549');
  sign('4TH AVE',2.4,.6,-10.7,4.6,31.2,'#355549');
  for(let i=0;i<5;i++) {
    const barrier=box(2.4,.95,.65,concrete,-8+i*3.5,.5,-81);barrier.rotation.y=range(-.15,.15);
    box(2.2,.14,.67,yellow,-8+i*3.5,.65,-81);
  }
  const wire=new T.CatmullRomCurve3([new T.Vector3(-12,8,31),new T.Vector3(-3,6,29),new T.Vector3(11,7.6,29)]);
  mesh(new T.TubeGeometry(wire,18,.035,4,false),dark,0,0,0);
  for(let i=0;i<220;i++) {
    const x=i<100?range(-23,-10):(random()<.5?-1:1)*range(8,16),z=i<100?range(-1,12):range(-110,96);
    const block=mesh(new T.DodecahedronGeometry(1,0),i%3?concrete:rusty,x,.16,z);block.scale.set(range(.12,.4),range(.06,.22),range(.12,.45));block.rotation.set(range(-.5,.5),range(0,6.28),range(-.4,.4));
  }
  // Paper scraps and fallen masonry break the perfectly clean road surface.
  for(let i=0;i<80;i++){const scrap=box(range(.1,.3),.015,range(.2,.45),pale,range(-10,10),.08,range(-110,100));scrap.rotation.y=range(0,Math.PI);}

  // Merge static architecture and vehicles by material to keep orbiting responsive.
  dressStreet({scene,mesh,box,material,texture,range,random,iron,rusty,concrete,obstacles});
  scene.updateMatrixWorld(true);
  const batches=new Map(),oldGeometry=new Set();
  for(const object of objects) {
    if(object.material.transparent||object.userData.cinematicLot)continue;
    const list=batches.get(object.material)||[];
    const geometry=object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone();
    list.push(geometry.applyMatrix4(object.matrixWorld));batches.set(object.material,list);
    oldGeometry.add(object.geometry);object.removeFromParent();
  }
  for(const [mat,geometries] of batches) {
    const merged=mergeGeometries(geometries);
    const object=new T.Mesh(merged,mat);object.castShadow=true;object.receiveShadow=true;scene.add(object);
    geometries.forEach(g=>g.dispose());
  }
  oldGeometry.forEach(g=>g.dispose());

  const nature=loadHeroNature(scene,obstacles);
  const homeRoot=new T.Group();homeRoot.name='Walkable Sunflowers dwelling';scene.add(homeRoot);
  const home=createAbandonedHome(homeRoot,{normal:localTexture('concrete_wall_007_nor_gl',false,[3,2]),rough:localTexture('concrete_wall_007_rough',false,[3,2])});
  home.root=homeRoot;home.cinematicLot=cinematicLot;home.doorMesh.name='Sunflowers broken door';
  obstacles.push(...home.obstacles);

  function dispose() {
    nature.dispose();
    const geometry=new Set(),materials=new Set(),textures=new Set();
    scene.traverse(o=>{if(o.geometry)geometry.add(o.geometry);if(o.material)materials.add(o.material);});
    materials.forEach(m=>{for(const value of Object.values(m))if(value?.isTexture)textures.add(value);m.dispose();});
    textures.forEach(t=>t.dispose());geometry.forEach(g=>g.dispose());lighting.dispose();water.dispose();
  }
  const wetSurfaces=[asphalt,crossRoad,pavement].map(mat=>({mat,color:mat.color.clone(),roughness:mat.roughness}));
  function setWetness(amount){for(const {mat,color,roughness}of wetSurfaces){mat.color.copy(color).multiplyScalar(1-amount*.19);mat.roughness=roughness-amount*.29;}}
  return {scene,dispose,home,obstacles,lighting,water,setStoryExit(open){exitCover.visible=!open;},setSinkhole(open){sinkholeCover.visible=!open;},setWetness,assetsReady:Promise.all([...pendingTextures,home.artworkReady,nature.ready])};
}
