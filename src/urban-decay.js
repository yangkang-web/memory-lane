import * as T from 'three';
import { ROAD_FRACTURES, fractureOutline, SINKHOLE } from './ruin-layout.js';
import { rect } from './walk-layout.js';

export function fracturedAvenue({mesh,asphalt,soil,concrete,range,obstacles}) {
  const shape=new T.Shape();shape.moveTo(-11.5,-380);shape.lineTo(11.5,-380);shape.lineTo(11.5,380);shape.lineTo(-11.5,380);shape.closePath();
  for(const fracture of ROAD_FRACTURES){const hole=new T.Path();fractureOutline(fracture).forEach(([x,z],i)=>i?hole.lineTo(x,-z):hole.moveTo(x,-z));hole.closePath();shape.holes.push(hole);}
  const sink=new T.Path();SINKHOLE.forEach(([x,z],i)=>i?sink.lineTo(x,-z):sink.moveTo(x,-z));sink.closePath();shape.holes.push(sink);
  const top=new T.ShapeGeometry(shape);top.rotateX(-Math.PI/2);const uv=top.attributes.uv,p=top.attributes.position;
  // Original road maps already repeat 23/3 by 760/3; keep their real-world scale.
  for(let i=0;i<uv.count;i++)uv.setXY(i,(p.getX(i)+11.5)/23,(p.getZ(i)+380)/760);
  mesh(top,asphalt,0,.04,0);
  for(const fracture of ROAD_FRACTURES) {
    const ring=fractureOutline(fracture),positions=[],indices=[];
    for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],k=positions.length/3;positions.push(a[0],.04,a[1],b[0],.04,b[1],a[0],-.105,a[1],b[0],-.105,b[1]);indices.push(k,k+2,k+1,k+1,k+2,k+3);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(positions.length/3*2,2));g.setIndex(indices);g.computeVertexNormals();mesh(g,soil,0,0,0);
    // Torn pavement lips expose angular aggregate, in several sizes rather than cube debris.
    for(let i=1;i<fracture.points.length-1;i++) {
      const [x,z]=fracture.points[i];
      for(const side of [-1,1]) {
        const piece=new T.Shape();piece.moveTo(-.6,-.32);piece.lineTo(-.37,.48);piece.lineTo(.12,.6);piece.lineTo(.66,.21);piece.lineTo(.48,-.39);piece.closePath();
        const geo=new T.ExtrudeGeometry(piece,{depth:.12,bevelEnabled:false});geo.rotateX(-Math.PI/2);
        const a=mesh(geo,asphalt,x,.055,z+side*(fracture.width+.35));a.rotation.set(side*.11,(i%3-1)*.3,side*.06);
        const tex=geo.attributes.uv,position=geo.attributes.position;for(let j=0;j<tex.count;j++)tex.setXY(j,(position.getX(j)+x+11.5)/23,(position.getZ(j)+z+380)/760);
        for(let j=0;j<3;j++){const chip=mesh(new T.DodecahedronGeometry(1,0),j%2?concrete:soil,x+range(-.7,.7),.065,z+side*range(.2,.8));chip.scale.set(range(.045,.14),range(.025,.07),range(.04,.15));}
      }
    }
  }
  // A root-heaved island beside the eastern tree: traversable lanes remain around it.
  for(const [x,z,w,d,a]of [[10.1,46.8,1.7,2,.12],[9.3,47.5,1.3,1.4,-.15],[10.4,48.7,1.8,1.5,.17]]) {
    const geo=new T.BoxGeometry(w,.18,d),uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w/23,uv.getY(i)*d/760);
    const slab=mesh(geo,asphalt,x,.17,z);slab.rotation.set(a,.13,-a*.7);obstacles.push(rect(x,z,w,d));
  }
}

export function growRuins({buildings,card,ivy,grass,moss,ferns,mesh,bark,range,random}) {
  function vine(points,r=.027){mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),24,r,5),bark,0,0,0);}
  function wallGarden(x,z,base,height,width,side,phase) {
    // An irregular colony: narrow old stems below, broad overlapping foliage above.
    for(let stem=0;stem<7;stem++) {
      const top=base+height*range(.7,1),points=[];
      for(let y=base;y<=top;y+=.38){const zz=z+Math.sin(y*.65+phase+stem)*width*.16+(stem-3)*width*.1;points.push([x+side*.09,y,zz]);}
      if(points.length>2)vine(points,.018+random()*.015);
    }
    const count=Math.ceil(height*width*42);
    for(let i=0;i<count;i++) {
      const yy=range(0,height),t=yy/height,spread=width*(.18+.32*Math.sin(t*Math.PI)),zz=range(-spread,spread);
      if(random()<.1+Math.sin(t*17+phase)*.07)continue;
      const y=base+yy,zp=z+zz+Math.sin(t*7+phase)*width*.16;
      // The collapsed upper-left corner has no wall to support climbing ivy.
      if(x>15&&x<17&&zp<47&&y>10.7)continue;
      card(ivy,x+side*range(.12,.46),y,zp,range(.23,.48),range(.27,.52),range(-.3,.3),side*Math.PI/2+range(-.4,.4),range(-1.2,1.2));
    }
  }
  // Several broad colonies overlap at damp piers, sills and the external stair.
  for(const [z,base,h,w]of [[37.7,.3,10,5],[44,.3,9.5,5.8],[51,.3,17,6.3],[59,.3,17,6.7],[63.4,.3,11,3.4]])wallGarden(16.22,z,base,h,w,-1,z*.3);
  for(const b of buildings.slice(0,10)) {
    if(!b.ivyHeight||(b.x===30&&b.z===50))continue;
    for(let i=0;i<3;i++)wallGarden(b.streetX,b.z+(i-1)*b.d*.23,.3,Math.min(b.ivyHeight-.5,18)*range(.65,1),range(3.5,6),b.x>0?-1:1,i+b.z);
  }
  // Hanging growth spills over the broken floors and the shop canopy.
  for(const [x,y,z,length,span]of [[18.6,11.25,39,3.8,3],[18.3,14.85,45,4.3,2],[15.15,3.25,44,1.3,7.5],[14.4,7.6,58,2.5,3.6],[-16.8,4.8,44,2.6,2.8]]) {
    for(let strand=0;strand<18;strand++) {
      const zz=z+(strand/17-.5)*span,drop=length*range(.45,1),points=[];
      for(let t=0;t<=1;t+=.08){const px=x+Math.sin(t*4+strand)*.12,py=y-drop*t,pz=zz+Math.sin(t*6+strand)*.12;points.push([px,py,pz]);for(let j=0;j<3;j++)card(ivy,px+range(-.08,.08),py+range(-.07,.07),pz+range(-.2,.2),range(.2,.38),range(.24,.43),range(-.4,.4),-Math.PI/2+range(-.5,.5),range(-.7,.7));}
      vine(points,.014);
    }
  }
  // Creeping growth bridges the gutter, the road fissures and damp rubble footings.
  for(const fracture of ROAD_FRACTURES)for(const [x,z]of fracture.points.slice(1,-1)) {
    card(moss,x,.044,z,2.4,2,-Math.PI/2,0,range(0,6));
    for(let i=0;i<28;i++){const h=range(.3,.9);card(grass,x+range(-.3,.3),-.07+h/2,z+range(-.2,.2),range(.6,1.1),h,0,range(0,6));}
  }
  for(let i=0;i<550;i++){const z=range(34,65),x=range(13,16.2),h=range(.35,1.1);card(grass,x,.25+h/2,z,range(.8,1.4),h,0,range(0,6));if(i%12===0)card(ferns,x,.26,z,range(.7,1.2),range(.7,1.1),0,range(0,6));}
  // Exposed woody roots physically join the wall-side trees to the broken road.
  vine([[13,.3,37],[12.3,.4,41],[11.4,.23,44.4],[10.1,.21,47],[8.7,.11,50.2]],.13);
  vine([[11.5,.24,44],[10.3,.2,44.6],[9.5,.17,46.2],[9.2,.12,48]],.07);
}
