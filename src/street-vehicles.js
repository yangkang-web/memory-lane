import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rect } from './walk-layout.js';

export function createVehicles({scene,mesh,box,material,texture,noise,range,random,obstacles,iron,rusty,rubber,pale,glass,sign}) {
  const wear=texture(1024,512,(c,w,h)=>{
    c.fillStyle='#b3b5aa';c.fillRect(0,0,w,h);noise(c,w,h,15000);
    for(let i=0;i<240;i++) {
      const x=range(0,w),y=i<150?range(h*.65,h):range(0,h),r=range(2,28);
      c.fillStyle=i%3?'#66442b':'#42382a';c.beginPath();c.ellipse(x,y,r,r*range(.12,.6),range(-.4,.4),0,Math.PI*2);c.fill();
      c.fillStyle='#a1794a77';c.fillRect(x-r,y,r*1.8,2);
    }
    for(let i=0;i<160;i++){c.strokeStyle='#d0cab240';c.beginPath();const x=range(0,w),y=range(0,h);c.moveTo(x,y);c.lineTo(x+range(10,70),y+range(-3,3));c.stroke();}
  });
  const crackedGlass=texture(512,512,(c,w,h)=>{
    c.fillStyle='#354943';c.fillRect(0,0,w,h);
    const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#a8b6ad77');g.addColorStop(1,'#101c1799');c.fillStyle=g;c.fillRect(0,0,w,h);
    for(let i=0;i<13;i++){const a=i*Math.PI/6.5;c.strokeStyle='#bdc5ac77';c.lineWidth=1;c.beginPath();c.moveTo(150,290);c.lineTo(150+Math.cos(a)*90,290+Math.sin(a)*110);c.lineTo(150+Math.cos(a+.08)*190,290+Math.sin(a+.08)*190);c.stroke();}
    noise(c,w,h,3500);
  });
  const windshield=material('#b0bbb0',{map:crackedGlass,metalness:.35,roughness:.3,side:T.DoubleSide});
  const lamp=material('#b7bb9e',{roughness:.4,metalness:.2}),tail=material('#713d2e',{roughness:.6});
  const cabinDark=material('#17231f');
  const wheelGeo=new T.TorusGeometry(.32,.115,10,24),hubGeo=new T.CylinderGeometry(.19,.19,.055,20);
  const rounded=(w,h,d,mat,x,y,z,parent)=>mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(.08,h*.24)),mat,x,y,z,parent);
  function panel(points,mat,parent) {
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));g.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();return mesh(g,mat,0,0,0,parent);
  }
  function body(length,width,paint,parent) {
    const s=new T.Shape(),axle=length*.31;
    s.moveTo(-length/2,.48);s.lineTo(-length/2,.87);s.quadraticCurveTo(-length/2,1.08,-length*.32,1.1);s.lineTo(length*.32,1.07);s.quadraticCurveTo(length/2,1.03,length/2,.78);s.lineTo(length/2,.48);
    s.lineTo(axle+.48,.48);s.absarc(axle,.48,.48,0,Math.PI,false);s.lineTo(-axle+.48,.48);s.absarc(-axle,.48,.48,0,Math.PI,false);s.closePath();
    const geo=new T.ExtrudeGeometry(s,{depth:width,bevelEnabled:true,bevelSize:.035,bevelThickness:.025,bevelSegments:2,steps:1,curveSegments:14});
    geo.rotateY(Math.PI/2);geo.translate(-width/2,0,0);mesh(geo,paint,0,0,0,parent);
    box(width*.85,.18,length*.82,cabinDark,0,.37,0,parent);
  }
  return function car(x,z,angle,color,bus=false,model='sedan') {
    const g=new T.Group();g.position.set(x,.08,z);g.rotation.y=angle;scene.add(g);
    const hero=(x===-6&&z===66)||(x===7&&z===31);
    const paint=material(color,{map:wear,bumpMap:wear,bumpScale:.012,metalness:.35,roughness:.76});
    const length=bus?10.5:model==='van'?5.4:model==='hatch'?3.8:4.6,width=bus?2.65:model==='van'?2.1:1.9;
    obstacles.push(rect(x,z,Math.abs(Math.cos(angle))*width+Math.abs(Math.sin(angle))*length,Math.abs(Math.cos(angle))*length+Math.abs(Math.sin(angle))*width));
    body(length,width,paint,g);
    if(bus||model==='van') {
      const h=bus?2.25:1.28,y=1.05+h/2;
      rounded(width*.97,h,length*.91,paint,0,y,-.14,g);
      const top=1.05+h;
      for(const side of [-1,1]) {
        const count=bus?7:2;
        for(let i=0;i<count;i++)box(.025,bus?.95:.66,bus?1.05:1,windshield,side*(width*.49+.02),top-.65,bus?-3.8+i*1.22:.6+i*1.05,g);
        box(.035,.045,length*.86,iron,side*(width/2+.025),1.14,0,g);
      }
      box(width*.84,bus?1:.78,.04,windshield,0,top-.67,length*.455-.1,g);
      rounded(width*.93,.08,length*.9,paint,0,top+.04,-.14,g);
      if(bus)sign('OUT OF SERVICE',2.1,.3,0,top-.15,length*.46-.1,'#26342d',0,g);
      else for(const q of [-1.8,-.7,.5])box(width+.1,.055,.055,iron,0,top+.15,q,g);
    } else {
      const pickup=model==='pickup',front=pickup?1.3:.98,back=pickup?-.45:-1.35,roofFront=pickup?.85:.45,roofBack=pickup?-.35:-1.05;
      // Sloped glass and a curved roof replace the old stacked rectangular cabin.
      const lower=1.06,upper=1.88,half=width*.45,roofHalf=width*.36;
      const pts=[[-half,lower,back],[half,lower,back],[roofHalf,upper,roofBack],[-roofHalf,upper,roofBack]];
      panel(pts,windshield,g);
      if(hero) {
        // Most of the windshield is missing; glass teeth cling to the seal.
        const shard=new T.BufferGeometry();shard.setAttribute('position',new T.Float32BufferAttribute([-half,lower,front,-roofHalf,upper,roofFront,-half*.55,lower+.18,front-.08,half,lower,front,roofHalf,upper,roofFront,half*.65,lower+.22,front-.12],3));shard.setAttribute('uv',new T.Float32BufferAttribute([0,0,0,1,.25,.25,1,0,1,1,.75,.25],2));shard.computeVertexNormals();mesh(shard,windshield,0,0,0,g);
      } else panel([[-half,lower,front],[-roofHalf,upper,roofFront],[roofHalf,upper,roofFront],[half,lower,front]],windshield,g);
      for(const side of [-1,1]) {
        const points=[[side*half,lower,back],[side*half,lower,front],[side*roofHalf,upper,roofFront],[side*roofHalf,upper,roofBack]];
        if(side===1)points.reverse();if(!hero||side===1)panel(points,windshield,g);
        for(const [z0,z1]of[[back,roofBack],[front,roofFront],[(front+back)*.5,(roofFront+roofBack)*.5]]) {
          const a=new T.Vector3(side*half,lower,z0),b=new T.Vector3(side*roofHalf,upper,z1),beam=mesh(new T.CylinderGeometry(.035,.045,a.distanceTo(b),8),paint,0,0,0,g);
          beam.position.copy(a).add(b).multiplyScalar(.5);beam.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.sub(a).normalize());
        }
        for(const zz of pickup?[.6]:[-.65,.55]){box(.035,.045,.16,iron,side*(half+.07),1.07,zz,g);box(.016,.46,.017,cabinDark,side*(width/2+.035),.8,zz+.4,g);}
        rounded(.22,.13,.3,paint,side*(width/2+.12),1.24,front-.15,g);
        box(.06,.035,.22,iron,side*(width/2+.02),1.2,front-.15,g);
      }
      rounded(width*.77,.13,roofFront-roofBack+.12,paint,0,upper+.015,(roofFront+roofBack)/2,g);
      if(!hero){const hood=rounded(width*.9,.085,pickup?.8:1.1,paint,0,1.095,length*.36,g);hood.rotation.z=-.035;}
      else {
        const hoodGeo=new T.PlaneGeometry(width*.9,1.05,16,12),v=hoodGeo.attributes.position;
        for(let i=0;i<v.count;i++){const xx=v.getX(i),yy=v.getY(i);v.setZ(i,.05*Math.cos(xx*4)-.16*Math.exp(-((xx+.35)**2+yy*yy)*12));}hoodGeo.computeVertexNormals();
        const bentPaint=paint.clone();bentPaint.side=T.DoubleSide;const hood=mesh(hoodGeo,bentPaint,0,1.27,length*.36,g);hood.rotation.x=-1.12;hood.rotation.z=.09;
        rounded(1.1,.23,.75,cabinDark,0,1.08,1.61,g);rounded(.48,.27,.48,iron,-.2,1.22,1.64,g);
        for(let n=0;n<5;n++)box(.4,.02,.025,rusty,-.2,1.37,1.45+n*.08,g);
        for(const xx of [-.5,.3]){const hose=new T.CatmullRomCurve3([new T.Vector3(xx,1.15,1.3),new T.Vector3(xx+.12,1.44,1.55),new T.Vector3(xx+.17,1.23,1.88)]);mesh(new T.TubeGeometry(hose,12,.025,6),rubber,0,0,0,g);}
        // Open door reveals thickness, inner trim and the abandoned driver's seat.
        const door=new T.Group();door.position.set(-width*.49,0,front-.02);door.rotation.y=.72;g.add(door);
        rounded(.08,.53,1.3,paint,0,.84,-.64,door);rounded(.035,.34,1.09,cabinDark,.052,.87,-.63,door);
        box(.07,.035,.16,iron,-.06,1.02,-1.03,door);box(.035,.06,.22,iron,.085,.96,-.77,door);
        for(const zz of [-.02,-1.28]){const rail=box(.055,.72,.055,paint,.055,1.43,zz,door);rail.rotation.z=-.12;}box(.055,.055,1.3,paint,.1,1.8,-.64,door);
        rounded(.48,.16,.5,cabinDark,-.43,1.02,.12,g);rounded(.47,.56,.17,cabinDark,-.43,1.3,-.13,g);
        rounded(1.5,.22,.32,cabinDark,0,1.24,.91,g);
        const steering=mesh(new T.TorusGeometry(.19,.021,8,24),rubber,-.43,1.43,.67,g);steering.rotation.x=-.6;
        for(let n=0;n<3;n++){const spoke=box(.018,.018,.35,iron,-.43,1.43,.67,g);spoke.rotation.y=n*2.094;spoke.rotation.x=-.6;}
        const buckle=box(.03,.39,.04,rusty,-.16,1.19,-.05,g);buckle.rotation.z=.2;
      }
      if(pickup) {
        box(width*.83,.035,1.65,cabinDark,0,1.105,-1.28,g);
        for(const side of [-1,1])box(.11,.3,1.7,paint,side*width*.45,1.25,-1.28,g);
        box(width*.9,.3,.1,paint,0,1.25,-2.1,g);
        const spare=mesh(wheelGeo,rubber,.12,1.23,-1.4,g);spare.rotation.x=Math.PI/2;
      }
    // A dark interior silhouette remains behind the dusty glazing.
      for(const side of [-1,1])rounded(.48,.5,.2,cabinDark,side*.43,1.25,back+.3,g);
    }
    for(const side of [-1,1])for(const q of [-length*.31,length*.31]) {
      const wheel=mesh(wheelGeo,rubber,side*(width/2-.02),.43,q,g);wheel.rotation.y=Math.PI/2;if(bus)wheel.scale.setScalar(1.2);else if(hero&&side===-1&&q>0){wheel.scale.y=.72;wheel.position.y=.32;wheel.rotation.z=.18;}
      const hub=mesh(hubGeo,rusty,side*(width/2+.07),.43,q,g);hub.rotation.z=Math.PI/2;
      for(let bolt=0;bolt<5;bolt++){const a=bolt/5*Math.PI*2;box(.025,.025,.025,pale,side*(width/2+.105),.43+Math.sin(a)*.105,q+Math.cos(a)*.105,g);}
      for(let groove=0;groove<18;groove++){const a=groove/18*Math.PI*2;const tread=box(.19,.025,.07,cabinDark,side*(width/2-.02),.43+Math.sin(a)*.414,q+Math.cos(a)*.414,g);tread.rotation.x=-a;}
    }
    for(const side of [-1,1]) {
      rounded(width+.06,.14,.19,iron,0,.57,side*length/2,g);
      box(width*.52,.23,.03,cabinDark,0,.82,side*(length/2+.03),g);
      for(let i=0;i<6;i++)box(width*.5,.012,.035,iron,0,.72+i*.035,side*(length/2+.05),g);
      for(const sx of [-1,1])rounded(.34,.19,.06,side===1?lamp:tail,sx*width*.34,.85,side*(length/2+.05),g);
      box(.38,.1,.025,pale,0,.52,side*(length/2+.105),g);
    }
    // Wipers, a thin antenna and dirt packed along the sill.
    for(const sx of [-1,1]){const wiper=box(.018,.025,.45,iron,sx*.36,1.14,bus?4.7:model==='van'?2.38:.93,g);wiper.rotation.y=sx*.38;}
    if(!bus)box(.008,.55,.008,iron,-width*.43,1.38,length*.3,g);
    if(hero){g.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(g);obstacles.push({minX:bounds.min.x,maxX:bounds.max.x,minZ:bounds.min.z,maxZ:bounds.max.z});}
    return g;
  };
}
