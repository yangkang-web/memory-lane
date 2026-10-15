import * as T from 'three';

// A deliberately authored elevation for the warehouse opposite the dwelling.
// Local X runs along the facade; positive Z points out onto the pavement.
export function createHeroStorefront({scene,mesh,box,material,texture,wall,cement,timber,iron,dark,glazing,range}) {
  const group=new T.Group();group.name='Pine Street / damaged printworks';group.position.set(16.5,.3,50);group.rotation.y=-Math.PI/2;scene.add(group);
  const stone=cement.clone();stone.color.set('#9e9a87');
  const rust=material('#583c2d',{roughness:.89,metalness:.3});
  const plaster=material('#a5a397',{map:cement.map,normalMap:cement.normalMap,roughnessMap:cement.roughnessMap});
  function rod(a,b,r=.025,mat=rust){const av=new T.Vector3(...a),bv=new T.Vector3(...b),o=mesh(new T.CylinderGeometry(r,r,av.distanceTo(bv),7),mat,0,0,0,group);o.position.copy(av).add(bv).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),bv.sub(av).normalize());}
  function poly(points,mat,z=.02,depth=.26){const s=new T.Shape(points.map(p=>new T.Vector2(...p))),g=new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.018,bevelThickness:.018,bevelSegments:1,steps:1});const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/3,uv.getY(i)/3);return mesh(g,mat,0,0,z,group);}
  const stains=texture(512,512,(c,w,h)=>{for(let i=0;i<180;i++){const x=range(0,w),y=range(0,70),r=range(2,16),end=range(70,h),g=c.createLinearGradient(x,y,x,end);g.addColorStop(0,'#202c2480');g.addColorStop(.6,'#37443330');g.addColorStop(1,'#37443300');c.fillStyle=g;c.fillRect(x,y,r,end-y);}});
  const damp=material('#837d68',{map:stains,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
  // An inset room behind the collapsed shop window. Floors, ceiling and partitions are visible.
  box(30,7.4,.2,dark,0,7.1,-2.9,group);
  for(const [x,w]of [[-11.15,7.7],[5.15,19.7]])box(w,3.4,.2,dark,x,1.7,-2.9,group);
  box(18,7.2,.2,dark,6,14.4,-2.9,group);
  for(let row=0;row<5;row++) {
    if(row<3)box(30,.18,3,stone,0,row*3.6,-1.4,group);
    else {
      const edge=row===3?[[-15,-2.7],[-12,-1.9],[-10,-2.1],[-8,-.8],[-6,-1.2],[-4,-.1]]:[[-15,-2.8],[-9,-2.6],[-7,-2.3],[-5,-1.6],[-3,-.6],[-1,.1]];
      const points=[[-15,-3],[15,-3],[15,.1],...edge.reverse()];const shape=new T.Shape(points.map(([x,z])=>new T.Vector2(x,-z)));
      const slab=new T.ExtrudeGeometry(shape,{depth:.22,bevelEnabled:false});slab.rotateX(-Math.PI/2);mesh(slab,stone,0,row*3.6,0,group);
      for(let i=0;i<14;i++){const x=-14+i*.78,z=-2.7+(x+14)*.16;rod([x,row*3.6+.09,z-.35],[x+.1,row*3.6+.2+(i%3)*.13,z+.6],.022);}
    }
  }
  for(const x of [-15,-9,-3,3,9,15]){const h=x< -10?8.5:x< -5?11.2:x<0?14.5:17.8;box(.28,h,3,stone,x,h/2,-1.4,group);}
  for(let row=0;row<5;row++) {
    const y=row*3.6;
    for(let col=0;col<5;col++) {
      const x=-12+col*6,broken=row===0&&col===1,ww=broken?4.6:3.6,lo=broken?0:y+.48,hi=y+2.95;
      if(row>=3&&col<2) {
        // The facade is actually absent here; a stepped fracture exposes floor sections.
        const remaining=row===3?(col===0?.45:1.8):0;
        if(remaining)poly([[x-3,y],[x+3,y],[x+3,y+remaining+.2],[x+1.9,y+remaining-.15],[x+.6,y+remaining+.3],[x-.2,y+remaining-.1],[x-1.7,y+remaining+.06],[x-3,y+remaining*.6]],wall,-.18,.42);
        continue;
      }
      const s=new T.Shape();s.moveTo(x-3,y);s.lineTo(x+3,y);s.lineTo(x+3,y+3.6);s.lineTo(x-3,y+3.6);s.closePath();
      const hole=new T.Path();
      const edge=broken?[[x-2.5,lo],[x-2.38,1.2],[x-2.6,1.48],[x-2.1,2.5],[x-1.75,2.85],[x+.3,3.12],[x+1.85,2.8],[x+2.5,2.1],[x+2.32,lo]]:[[x-ww/2,lo],[x-ww/2,hi],[x+ww/2,hi],[x+ww/2,lo]];
      edge.forEach(([a,b],i)=>i?hole.lineTo(a,b):hole.moveTo(a,b));hole.closePath();s.holes.push(hole);
      const geo=new T.ExtrudeGeometry(s,{depth:.42,bevelEnabled:true,bevelSize:.025,bevelThickness:.015,bevelSegments:1});const uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/3,uv.getY(i)/3);mesh(geo,wall,0,0,-.18,group);
      if(broken) {
        // Snapped brick teeth, loose sill fragments and bent reinforcing rods.
        for(let i=1;i<edge.length-1;i++){const [xx,yy]=edge[i];const b=box(.29,.16,.5,i%3?wall:stone,xx,yy,.05,group);b.rotation.z=(i%3-1)*.16;}
        for(const dx of [-2.1,2.1])rod([x+dx,.3,.05],[x+dx+.25,1,.2],.018);
        for(let i=0;i<23;i++){const b=mesh(new T.DodecahedronGeometry(1,0),i%3?wall:stone,x+range(-2.6,2.6),range(.09,.22),range(.4,1.15),group);b.scale.set(range(.13,.45),range(.07,.16),range(.1,.3));b.rotation.set(.2,range(0,6),range(-.2,.2));}
        box(3.3,.12,.7,timber,x-4,.95,-1.65,group);for(const dx of [-1.3,1.3])box(.1,.9,.1,iron,x-4+dx,.45,-1.65,group);
        for(let i=0;i<4;i++)box(.35,.3,.25,i%2?dark:stone,x-5+i*.6,1.13,-1.65,group);
      } else {
        for(const dx of [-ww/2,0,ww/2])box(.065,hi-lo,.09,iron,x+dx,(lo+hi)/2,-.07,group);
        for(const yy of [lo,lo+(hi-lo)*.5,hi])box(ww,.065,.09,iron,x,yy,-.07,group);
        box(ww+.26,.13,.7,stone,x,lo-.06,.1,group);
        for(let pane=0;pane<4;pane++) {
          const px=x+(pane%2?1:-1)*ww*.25,py=lo+(hi-lo)*(pane<2?.75:.25),w=ww*.48,h=(hi-lo)*.47;
          if((row*7+col*3+pane)%5===0){const shard=new T.Shape();shard.moveTo(-w/2,-h/2);shard.lineTo(w/2,-h/2);shard.lineTo(w*.22,-h*.15);shard.lineTo(-w*.14,h*.15);shard.lineTo(-w/2,h/2);mesh(new T.ShapeGeometry(shard),glazing[1],px,py,-.11,group);}
          else if((row+col+pane)%7!==0)mesh(new T.PlaneGeometry(w,h),glazing[(row+col)%3],px,py,-.11,group);
        }
        if(row===0&&col===4)for(let n=0;n<4;n++){const plank=box(3.8,.24,.09,timber,x,1+n*.4,.3,group);plank.rotation.z=.12-n*.065;}
      }
      // Patchy plaster has chipped, non-rectangular edges and exposes the brick below.
      if((row+col)%3===1)poly([[x-2.9,y+.05],[x-1.4,y+.05],[x-1.53,y+.16],[x-.8,y+.22],[x-.5,y+.37],[x-1.76,y+.4],[x-2.87,y+.48]],plaster,.255,.015);
      const stain=mesh(new T.PlaneGeometry(ww+.4,.85),damp,x,y+.05,.275,group);stain.renderOrder=1;
    }
    for(const [dy,depth]of [[3.28,.55],[3.46,.7],[3.58,.82]])box(row>=3?18:30,.1,depth,stone,row>=3?6:0,y+dy,.08,group);
  }
  // Large surviving plaster islands follow masonry piers; their broken edges reveal brick.
  for(const [x,y,h]of[[-14.4,1.2,5.3],[-2.85,5.1,3.1],[3.1,1,5.6],[9.1,11.5,3.7]]) {
    poly([[x-.38,y],[x+.35,y+.1],[x+.45,y+.65],[x+.26,y+1.1],[x+.47,y+h*.52],[x+.24,y+h*.64],[x+.43,y+h-.3],[x+.05,y+h],[x-.36,y+h-.14],[x-.46,y+h*.7],[x-.31,y+h*.56],[x-.48,y+.3]],plaster,.255,.02);
    const drip=mesh(new T.PlaneGeometry(.8,h),damp,x,y+h/2,.301,group);drip.renderOrder=2;
  }
  // Broken cornice, stepped brick crown, and exposed steel on one roof corner.
  for(let i=20;i<48;i++){if(i>37&&i<43)continue;box(.61,.45+(i%5)*.035,.65,wall,-14.7+i*.62,18.15,.02,group);}
  for(let i=0;i<7;i++)rod([8.5+i*.22,17.85,0],[8.7+i*.22,18.5+(i%3)*.17,.13],.017);
  for(let i=0;i<95;i++) {
    const x=range(-14.5,-8.5),z=range(.4,2.8),height=Math.max(.05,.65*(1-Math.abs(x+11.5)/3)*(1-z/3));
    const rubble=mesh(new T.DodecahedronGeometry(1,0),i%4?wall:stone,x,height+range(.05,.16),z,group);
    rubble.scale.set(range(.16,.55),range(.07,.28),range(.12,.42));rubble.rotation.set(range(-.5,.5),range(0,6),range(-.5,.5));
  }
  // Off-centre fire escape: grated landings, zig-zag stair flights and delicate handrails.
  const fx=8.1;
  for(let level=1;level<4;level++) {
    const y=level*3.6;
    for(let i=0;i<14;i++)box(3.6,.045,.045,iron,fx,y,.4+i*.11,group);
    for(const sx of [-1,1]){box(.09,.15,1.7,rust,fx+sx*1.8,y,1.15,group);rod([fx+sx*1.8,y-1.2,.22],[fx+sx*1.8,y,1.9],.038);rod([fx+sx*1.8,y,1.9],[fx+sx*1.8,y+1,1.9]);}
    rod([fx-1.8,y+1,1.9],[fx+1.8,y+1,1.9]);
    for(let n=0;n<12;n++)rod([fx-1.65+n*.3,y,1.9],[fx-1.65+n*.3,y+1,1.9],.012);
    if(level<3){const sign=level%2?1:-1;for(let n=0;n<15;n++)box(.28,.055,.7,iron,fx-sign*1.65+sign*n*.23,y+n*.24,1.05,group);for(const zz of [.68,1.43])rod([fx-sign*1.8,y+.95,zz],[fx+sign*1.8,y+4.55,zz],.025);}
  }
  // Partially hanging awning: folded fabric rather than a perfectly rigid cuboid.
  const fabric=material('#52675d',{map:cement.map,roughness:1,side:T.DoubleSide});
  const awning=new T.PlaneGeometry(9,1.9,36,8),p=awning.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setZ(i,Math.sin(x*2.5)*.055-.2*(1-(x/4.5)**2)*(y+.95));}
  awning.computeVertexNormals();const canopy=mesh(awning,fabric,-6,3.08,1,group);canopy.rotation.x=-1.3;canopy.rotation.z=.025;
  for(const x of [-10.5,-1.5])rod([x,2.35,.2],[x,3,1.9],.035,iron);
  const sign=texture(1024,128,(c,w,h)=>{c.fillStyle='#283b37';c.fillRect(0,0,w,h);c.strokeStyle='#7f8f7c';c.strokeRect(10,10,w-20,h-20);c.font='42px Georgia';c.textAlign='center';c.fillStyle='#d3c7a7';c.fillText('P I N E   S T R E E T   P R I N T W O R K S',w/2,78);for(let i=0;i<3000;i++){c.fillStyle=i%3?'#2c332949':'#b4a68a42';c.fillRect(range(0,w),range(0,h),range(1,4),range(1,4));}});
  mesh(new T.PlaneGeometry(13.5,1.15),material('#fff',{map:sign}),-4,4.02,.49,group);
  return group;
}
