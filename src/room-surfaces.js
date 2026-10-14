import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Authored locally, in metres. A fixed seed keeps damage in the same place on reload.
export function createRoomSurfaces() {
  let seed=91423;
  const random=()=>((seed=seed*16807%2147483647)-1)/2147483646;
  const range=(a,b)=>a+(b-a)*random();
  const pick=a=>a[Math.floor(random()*a.length)];
  function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
  function texture(c,color=false){const t=new T.CanvasTexture(c);t.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;t.anisotropy=8;return t;}
  function stain(c,x,y,rx,ry,color){c.save();c.translate(x,y);c.scale(rx,ry);const g=c.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,color);g.addColorStop(1,'#00000000');c.fillStyle=g;c.fillRect(-1,-1,2,2);c.restore();}
  function patch(c,x,y,rx,ry){c.beginPath();for(let j=0;j<72;j++){const a=j/72*Math.PI*2,r=.86+random()*.2+Math.sin(a*7)*.08;const px=x+Math.cos(a)*rx*r,py=y+Math.sin(a)*ry*r;j?c.lineTo(px,py):c.moveTo(px,py);}c.closePath();}
  function grain(c,w,h,amount){const data=c.getImageData(0,0,w,h),p=data.data;for(let i=0;i<p.length;i+=4){const n=(random()-.5)*amount;p[i]+=n;p[i+1]+=n;p[i+2]+=n;}c.putImageData(data,0,0);}
  function normalFrom(height,strength){const {width:w,height:h}=height,src=height.getContext('2d').getImageData(0,0,w,h).data,out=canvas(w,h),ctx=out.getContext('2d'),im=ctx.createImageData(w,h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const at=(xx,yy)=>src[(Math.max(0,Math.min(h-1,yy))*w+Math.max(0,Math.min(w-1,xx)))*4]/255;const nx=(at(x-1,y)-at(x+1,y))*strength,ny=(at(x,y+1)-at(x,y-1))*strength,l=Math.hypot(nx,ny,1),i=(y*w+x)*4;im.data[i]=(nx/l*.5+.5)*255;im.data[i+1]=(ny/l*.5+.5)*255;im.data[i+2]=(1/l*.5+.5)*255;im.data[i+3]=255;}ctx.putImageData(im,0,0);return texture(out);}

  const wallCanvas=canvas(2048,1024),wc=wallCanvas.getContext('2d'),relief=canvas(2048,1024),hc=relief.getContext('2d');
  wc.fillStyle='#a69f8c';wc.fillRect(0,0,2048,1024);hc.fillStyle='#b8b8b8';hc.fillRect(0,0,2048,1024);
  wc.fillStyle='#53655b';wc.fillRect(0,686,2048,338);
  // A damp tide line, soft seepage and chalky paint, not high-contrast polygon camouflage.
  for(let i=0;i<100;i++)stain(wc,range(0,2048),range(0,1024),range(25,220),range(35,260),pick(['#303d3044','#d2c7a31c','#4a44373b']));
  for(let i=0;i<65;i++)stain(wc,range(0,2048),range(870,1080),range(12,95),range(50,230),'#32372d66');
  wc.save();wc.filter='blur(2px)';
  for(let i=0;i<48;i++){const x=range(0,2048),length=range(70,700),g=wc.createLinearGradient(0,0,0,length);g.addColorStop(0,'#4a493c32');g.addColorStop(1,'#4a493c00');wc.fillStyle=g;wc.fillRect(x,0,range(1,7),length);}
  wc.restore();
  for(let i=0;i<85;i++){
    const x=range(0,2048),y=range(650,1030),rx=range(2,27),ry=range(3,25);
    patch(wc,x,y,rx,ry);wc.fillStyle=pick(['#69766a','#737d6d','#657266']);wc.fill();
    wc.strokeStyle='#393e3325';wc.lineWidth=.6;wc.stroke();
    patch(hc,x,y,rx,ry);hc.fillStyle='#969696';hc.fill();
  }
  // Localized exposed masonry with crumbly plaster lips. Coordinates are also used for real edge flakes.
  const damage=[{x:345,y:735,rx:140,ry:125},{x:1680,y:440,rx:108,ry:155},{x:1230,y:970,rx:180,ry:65}];
  for(const p of damage){
    patch(wc,p.x,p.y,p.rx+7,p.ry+7);wc.fillStyle='#8e8a77';wc.fill();
    // Reuse exactly the same clip for albedo and relief.
    const outline=new Path2D();for(let j=0;j<90;j++){const a=j/90*Math.PI*2,r=.88+random()*.18;const x=p.x+Math.cos(a)*p.rx*r,y=p.y+Math.sin(a)*p.ry*r;j?outline.lineTo(x,y):outline.moveTo(x,y);}outline.closePath();
    for(const c of [wc,hc]){c.save();c.clip(outline);c.fillStyle=c===wc?'#716d5e':'#424242';c.fillRect(p.x-p.rx*1.2,p.y-p.ry*1.2,p.rx*2.4,p.ry*2.4);}
    for(let row=Math.floor((p.y-p.ry*1.2)/22);row<(p.y+p.ry*1.2)/22;row++)for(let x=p.x-p.rx*1.4;x<p.x+p.rx*1.4;x+=57){const xx=x+(row%2)*28;wc.fillStyle=pick(['#796653','#806957','#726354','#8a7059']);wc.fillRect(xx+2,row*22+2,53,18);hc.fillStyle=pick(['#777777','#808080','#707070']);hc.fillRect(xx+2,row*22+2,53,18);wc.fillStyle='#c4ac8540';wc.fillRect(xx+3,row*22+2,50,1);}
    wc.restore();hc.restore();
    for(let i=0;i<70;i++){const a=range(0,Math.PI*2),x=p.x+Math.cos(a)*p.rx*range(.95,1.2),y=p.y+Math.sin(a)*p.ry*range(.95,1.2);wc.fillStyle='#a19a86';wc.fillRect(x,y,range(1,4),range(1,5));}
  }
  function crack(x,y,length,width,branch=true){
    const path=new Path2D();path.moveTo(x,y);let fork;
    for(let j=0;j<length;j++){x+=range(-9,11);y+=range(5,15);path.lineTo(x,y);if(branch&&j===Math.floor(length*.55))fork=[x,y];}
    wc.strokeStyle='#46473d66';wc.lineWidth=width;wc.stroke(path);hc.strokeStyle='#656565';hc.lineWidth=width;hc.stroke(path);
    if(fork)crack(...fork,7,.45,false);
  }
  for(let i=0;i<16;i++)crack(range(0,2048),range(0,850),Math.floor(range(8,22)),range(.45,1.15));
  grain(wc,2048,1024,12);grain(hc,2048,1024,15);
  const wallMap=texture(wallCanvas,true),wallNormal=normalFrom(relief,2.2);
  for(const t of [wallMap,wallNormal])t.wrapS=t.wrapT=T.RepeatWrapping;
  const wall=new T.MeshStandardMaterial({map:wallMap,normalMap:wallNormal,normalScale:new T.Vector2(.45,.45),color:'#c7c0a9',roughness:.98});
  const ready=new Promise((resolve,reject)=>new T.TextureLoader().load('/assets/materials/concrete_wall_007_diff.jpg',scan=>{wc.save();wc.globalCompositeOperation='multiply';wc.globalAlpha=.72;for(let y=0;y<2;y++)for(let x=0;x<4;x++)wc.drawImage(scan.image,x*512,y*512,512,512);wc.restore();wallMap.needsUpdate=true;scan.dispose();resolve();},undefined,reject));

  // Eight different boards in one atlas; grain, knots, worn edges and splits have matching relief.
  const woodCanvas=canvas(1024,2048),c=woodCanvas.getContext('2d'),woodHeight=canvas(1024,2048),b=woodHeight.getContext('2d');
  b.fillStyle='#888888';b.fillRect(0,0,1024,2048);
  for(let board=0;board<8;board++){
    const left=board*128;c.fillStyle=pick(['#7e7160','#887b69','#766b5b','#91816c','#827462']);c.fillRect(left,0,128,2048);
    const knots=Array.from({length:3},()=>({x:range(25,103),y:range(70,1980),r:range(8,19)}));
    c.save();b.save();c.beginPath();c.rect(left,0,128,2048);c.clip();b.beginPath();b.rect(left,0,128,2048);b.clip();
    for(let j=0;j<210;j++){
      const x=range(0,128);c.beginPath();b.beginPath();
      for(let y=0;y<=2048;y+=8){let dx=Math.sin(y*.007+j)*1.2+Math.sin(y*.031+j*2)*.4;for(const k of knots){const d=(y-k.y)/55;dx+=(x<k.x?-1:1)*k.r*Math.exp(-d*d)*Math.exp(-Math.abs(x-k.x)/38);}const xx=left+x+dx;y?(c.lineTo(xx,y),b.lineTo(xx,y)):(c.moveTo(xx,y),b.moveTo(xx,y));}
      c.strokeStyle=pick(['#322b2240','#b8a68a40','#423b302b']);c.lineWidth=range(.3,1.1);c.stroke();b.strokeStyle=j%3?'#737373':'#a0a0a0';b.lineWidth=.6;b.stroke();
    }
    for(const k of knots){for(let ring=5;ring>0;ring--){c.beginPath();c.ellipse(left+k.x,k.y,k.r*ring/5,k.r*2.5*ring/5,.08,0,Math.PI*2);c.strokeStyle='#3a302a77';c.lineWidth=1;c.stroke();}stain(c,left+k.x,k.y,k.r*.4,k.r,'#3b322c99');}
    for(let i=0;i<24;i++){const x=left+range(2,125),y=range(0,2048);c.strokeStyle='#c1af902e';c.lineWidth=range(.4,1.2);c.beginPath();c.moveTo(x,y);c.lineTo(x+range(-2,2),y+range(12,160));c.stroke();}
    for(let i=0;i<5;i++){let x=left+range(10,118),y=range(0,1800);c.beginPath();c.moveTo(x,y);for(let j=0;j<9;j++){x+=range(-.7,.7);y+=range(5,17);c.lineTo(x,y);}c.strokeStyle='#362f2666';c.lineWidth=range(.6,1.5);c.stroke();}
    for(const edge of [left+1,left+126]){c.fillStyle='#c1b19644';c.fillRect(edge,0,1,2048);b.fillStyle='#444444';b.fillRect(edge,0,1,2048);}
    for(let i=0;i<12;i++)stain(c,left+range(0,128),range(0,2048),range(20,100),range(80,350),'#44473555');
    for(let i=0;i<65;i++){const x=left+range(0,128),y=range(0,2048);c.fillStyle='#c1b19240';c.fillRect(x,y,range(.5,1.8),range(4,35));}
    c.restore();b.restore();
  }
  grain(c,1024,2048,10);grain(b,1024,2048,7);
  const woodMap=texture(woodCanvas,true),woodNormal=normalFrom(woodHeight,1.8);
  const woodMats=['#c6bdac','#d4cab7','#b3afa1','#c1b7a2','#ded1b9'].map(color=>new T.MeshStandardMaterial({map:woodMap,normalMap:woodNormal,color,roughness:.86}));
  const painted=woodCanvas.cloneNode();const pc=painted.getContext('2d');pc.drawImage(woodCanvas,0,0);pc.fillStyle='#46594d99';pc.fillRect(0,0,1024,2048);
  for(let i=0;i<1500;i++){const x=range(0,1024),y=range(0,2048),w=range(.4,5),h=range(3,90);pc.drawImage(woodCanvas,x,y,w,h,x,y,w,h);}
  for(let i=0;i<8;i++){pc.save();patch(pc,i*128+64,1950,range(25,60),range(100,220));pc.clip();pc.drawImage(woodCanvas,0,0);pc.restore();}
  const doorMat=new T.MeshStandardMaterial({map:texture(painted,true),normalMap:woodNormal,color:'#c4c3b1',roughness:.95});
  function boardUV(geo,index,vertical=false){const uv=geo.attributes.uv,p=geo.attributes.position;geo.computeBoundingBox();const bounds=geo.boundingBox,size=new T.Vector3();bounds.getSize(size);for(let i=0;i<uv.count;i++){const u=vertical?(p.getX(i)-bounds.min.x)/size.x:uv.getX(i),v=vertical?(p.getY(i)-bounds.min.y)/size.y:uv.getY(i);uv.setXY(i,((index%8)+.025+u*.95)/8,.02+v*.96);}return geo;}
  return {wall,ready,woodMap,woodNormal,woodMats,doorMat,boardUV,random,range,pick,damage};
}

export function dressRoomSurfaces({mesh,box,mat,finishes,wood,darkWood,metal,rust}) {
  const {range,pick,boardUV,woodMats}=finishes;
  // Narrow, staggered boards with millimetre joints. The walking surface stays at y=.3.
  const width=10.36/46;
  for(let row=0;row<46;row++){
    const x=-27.43+(row+.5)*width;let z=36.17;
    let first=true;
    while(z<45.83){const length=Math.min(first?range(.4,2.1):range(1.3,2.7),45.83-z);first=false;if(length<.02)break;
      const geo=boardUV(new RoundedBoxGeometry(width-.004,.065,length-.006,1,.004),Math.floor(range(0,8)));
      const plank=mesh(geo,pick(woodMats),x,.267+range(-.002,.002),z+length/2);
      // Only peripheral boards curl; the central route and rug remain level.
      if(x> -18&&z<39)plank.rotation.x=range(-.009,.009);
      if(row%3===0&&length>.4)for(const end of [-1,1]){const nail=mesh(new T.CylinderGeometry(.008,.008,.002,6),metal,x+.065,.302,z+length/2+end*(length/2-.055));nail.rotation.y=range(0,3);}
      z+=length;
    }
  }
  const gritMap=document.createElement('canvas');gritMap.width=gritMap.height=128;const gc=gritMap.getContext('2d');gc.fillStyle='#9c9382';gc.fillRect(0,0,128,128);for(let i=0;i<6000;i++){gc.fillStyle=pick(['#453e3328','#ded1b32b','#6b655b38']);gc.fillRect(range(0,128),range(0,128),range(.5,2),range(.5,2));}
  const texture=new T.CanvasTexture(gritMap);texture.colorSpace=T.SRGBColorSpace;
  const debris=['#aca593','#999582','#847d6d','#706e61','#77604a','#896c52'].map(color=>mat(color,{map:texture,bumpMap:texture,bumpScale:.009}));
  const chips=Array.from({length:9},()=>{const s=new T.Shape();const n=Math.floor(range(4,8));for(let j=0;j<n;j++){const a=j/n*Math.PI*2,r=range(.65,1);j?s.lineTo(Math.cos(a)*r,Math.sin(a)*r):s.moveTo(Math.cos(a)*r,Math.sin(a)*r);}s.closePath();const g=new T.ExtrudeGeometry(s,{depth:1,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.03,bevelThickness:.03});g.rotateX(-Math.PI/2);return g;});
  // Concentrate fallen plaster below wall damage and around the collapsed ceiling.
  const piles=[[-25.7,36.5,1,.28],[-21.2,36.5,1.2,.22],[-26.95,42.8,.22,.9],[-18.1,38.1,.7,1],[-20,37.3,.65,.7],[-24.2,45.45,.7,.23]];
  for(let i=0;i<300;i++){
    const pile=piles[i%piles.length],x=pile[0]+range(-1,1)*pile[2],z=pile[1]+range(-1,1)*pile[3],size=i%7===0?range(.08,.18):range(.012,.065),thick=size*range(.08,.28);
    const m=mesh(pick(chips),debris[i%debris.length],x,.304,z);m.scale.set(size,thick,size*range(.45,1.2));m.rotation.y=range(0,Math.PI*2);
  }
  for(let i=0;i<48;i++){const x=range(-26.7,-18),z=range(36.6,45.5);if(x>-21&&z>40.2&&z<41.6)continue;const m=mesh(pick(chips),pick(debris.slice(0,4)),x,(x>-24.9&&x<-21.5&&z>38.55&&z<42.35)?.314:.303,z);m.scale.set(range(.012,.05),range(.003,.009),range(.015,.075));m.rotation.y=range(0,6.28);}
  for(let i=0;i<28;i++){
    const geo=new T.BoxGeometry(1,1,1,2,1,2),p=geo.attributes.position;
    // Matching displacements at shared corners keep the brick watertight.
    for(let j=0;j<p.count;j++){const x=p.getX(j),y=p.getY(j),z=p.getZ(j),chip=Math.sin(x*18+z*31)*.07;p.setXYZ(j,x+Math.sin(y*9+z*13)*.04,y+(y>0?chip:0),z+Math.sin(x*11+y*7)*.04);}geo.computeVertexNormals();
    const pile=piles[i%piles.length],m=mesh(geo,debris[4+i%2],pile[0]+range(-.7,.7)*pile[2],.34,pile[1]+range(-.7,.7)*pile[3]);m.scale.set(range(.055,.16),range(.025,.065),range(.07,.2));m.position.y=.302+m.scale.y/2;m.rotation.y=range(0,6.28);
  }
  // Dust has soft irregular edges; it blends the chunks into the floor rather than looking like white pebbles.
  const dc=document.createElement('canvas');dc.width=dc.height=256;const d=dc.getContext('2d');for(let i=0;i<700;i++){const x=range(0,256),y=range(0,256),falloff=Math.max(0,1-Math.hypot(x-128,y-128)/128);d.fillStyle=`rgba(143,132,109,${falloff*range(.02,.16)})`;d.beginPath();d.ellipse(x,y,range(1,14),range(1,8),0,0,Math.PI*2);d.fill();}const dt=new T.CanvasTexture(dc);dt.colorSpace=T.SRGBColorSpace;
  const dust=mat('#aaa08b',{map:dt,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  for(const [x,z,rx,rz]of piles){const p=mesh(new T.PlaneGeometry(rx*3,rz*4),dust,x,.307,z);p.rotation.x=-Math.PI/2;}
  // Splinters and broken lath, with small cross-grain ends.
  for(let i=0;i<24;i++){const p=box(range(.008,.045),range(.007,.016),range(.06,.48),i%3?wood:darkWood,range(-20.2,-18),.32,range(37.5,39));p.position.y=.302+p.scale.y/2;p.rotation.y=range(0,6.28);}
  // Chipped skirting edges, cut ends and rusty fixings.
  for(let i=0;i<16;i++){const p=box(range(.035,.15),.014,.018,wood,range(-27,-17.6),range(.35,.48),36.285);p.rotation.z=range(-.06,.06);}
  for(const x of [-26.6,-24.8,-23.1,-21.4,-19.8]){const nail=mesh(new T.CylinderGeometry(.012,.01,.009,8),rust,x,.43,36.281);nail.rotation.x=Math.PI/2;}
}
