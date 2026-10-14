import * as T from 'three';
import { createHeroStorefront } from './hero-storefront.js';

// Street-facing elevations are built around window openings; the recess is real geometry.
export function createFacadeBuilder({scene,mesh,box,material,texture,localTexture,range,random,iron,pale,dark}) {
  function surface(asset,color,scale) {
    const m=material(color,{map:localTexture(`${asset}_diff`,true),normalMap:localTexture(`${asset}_nor_gl`),normalScale:new T.Vector2(.65,.65),roughnessMap:localTexture(`${asset}_rough`)});
    m.userData.metreScale=scale;return m;
  }
  // Maps are shared across variants; only the tint changes between adjacent buildings.
  const red=surface('brick_wall_001','#baaa94',3),cement=surface('concrete_wall_007','#a5ada4',2.2);
  const walls=[red,cement,red.clone(),cement.clone(),cement,cement.clone(),red,red.clone()];
  walls[2].color.set('#a39982');walls[3].color.set('#879c98');walls[5].color.set('#7f9490');walls[7].color.set('#c7b89b');
  const frame=material('#4e5a50',{metalness:.35,roughness:.8}),inside=material('#4d5145');
  const curtain=material('#827e68',{roughness:1});
  const glassMaps=[0,1,2].map(index=>texture(256,512,(c,w,h)=>{
    c.fillStyle=['#364b4b','#273b39','#53645d'][index];c.fillRect(0,0,w,h);
    const g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,'#b7c9c54a');g.addColorStop(.6,'#12232130');g.addColorStop(1,'#18251f90');c.fillStyle=g;c.fillRect(0,0,w,h);
    for(let i=0;i<80;i++){c.fillStyle='#a4b4a413';c.fillRect(range(0,w),range(0,h),range(1,3),range(30,180));}
    if(index===1){c.strokeStyle='#b5c5b570';c.lineWidth=1;for(let i=0;i<9;i++){c.beginPath();c.moveTo(80,310);c.lineTo(80+Math.cos(i*.7)*220,310+Math.sin(i*.7)*230);c.stroke();}}
  }));
  const glazing=glassMaps.map(map=>material('#a2b7b0',{map,metalness:.4,roughness:.34,envMapIntensity:.55}));
  const woodMap=texture(256,512,(c,w,h)=>{c.fillStyle='#6b6753';c.fillRect(0,0,w,h);for(let i=0;i<220;i++){c.fillStyle=i%3?'#2b352a35':'#b3a37b3a';c.fillRect(range(0,w),0,range(1,3),h);}for(let i=0;i<14;i++){c.strokeStyle='#202b2155';c.beginPath();c.ellipse(range(0,w),range(0,h),range(2,7),range(10,35),0,0,6.28);c.stroke();}});
  const timber=material('#a3977c',{map:woodMap,bumpMap:woodMap,bumpScale:.015});
  const grimeMap=texture(256,512,(c,w,h)=>{
    for(let i=0;i<85;i++){const x=range(0,w),ww=range(1,13),g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#1d302a77');g.addColorStop(range(.25,.6),'#36403330');g.addColorStop(1,'#26362b00');c.fillStyle=g;c.fillRect(x,0,ww,range(h*.2,h));}
  });
  const grime=material('#7c8064',{map:grimeMap,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  function windowBay(g,cx,cy,width,height,kind,row,col) {
    // A dark pocket .5 m behind the face, framed by masonry reveals and projecting sill.
    box(width,height,.025,dark,cx,cy,-.51,g);
    box(width,.08,.48,pale,cx,cy-height/2,-.18,g);
    for(const side of [-1,1])box(.09,height,.48,inside,cx+side*width/2,cy,-.2,g);
    box(width+.24,.14,.5,pale,cx,cy-height/2-.06,.02,g);
    for(const side of [-1,1])box(.065,height,.08,frame,cx+side*(width/2-.07),cy,-.08,g);
    for(const side of [-1,1])box(width-.08,.065,.08,frame,cx,cy+side*(height/2-.045),-.08,g);
    const state=(row*17+col*11+kind*3)%13;
    if(state===0||state===8) {
      for(let i=0;i<3;i++){const plank=box(width*.97,.22,.075,timber,cx,cy-height*.32+i*height*.3,.04,g);plank.rotation.z=(i-1)*.09;}
      for(const x of [-width*.35,width*.35])for(const y of [-height*.3,height*.3])box(.025,.025,.018,iron,cx+x,cy+y,.09,g);
    } else {
      box(.045,height,.055,frame,cx,cy,-.08,g);box(width,.04,.055,frame,cx,cy+.12,-.08,g);
      for(let pane=0;pane<4;pane++) {
        const px=cx+(pane%2?1:-1)*width*.235,py=cy+(pane<2?1:-1)*height*.24;
        if((state===2||state===5)&&pane%3===0) {
          const shard=new T.Shape();shard.moveTo(-width*.22,-height*.22);shard.lineTo(width*.22,-height*.22);shard.lineTo(-width*.09,height*.11);shard.closePath();
          mesh(new T.ShapeGeometry(shard),glazing[1],px,py,-.1,g);
        } else mesh(new T.PlaneGeometry(width*.43,height*.44),glazing[(row+col+pane)%3],px,py,-.1,g);
      }
      if(state===2||state===5){box(.2,height*.82,.06,curtain,cx-width*.32,cy,-.38,g);box(width*.6,.06,.32,inside,cx,cy-height*.38,-.35,g);}
    }
  }
  function elevation(x,y,z,width,height,rotation,kind,groundFloor) {
    const g=new T.Group();g.position.set(x,y,z);g.rotation.y=rotation;scene.add(g);
    const wall=walls[kind],cols=Math.max(2,Math.floor(width/(kind===0?4.8:3.8))),rows=Math.max(1,Math.round(height/3.7)),cw=width/cols,rh=height/rows;
    const ww=cw*(kind===3||kind===5?.82:.58),wh=Math.min(rh*.65,2.55);
    for(let row=0;row<rows;row++) {
      const cy=(row+.5)*rh,base=row*rh;
      box(width,(rh-wh)/2,.28,wall,0,base+(rh-wh)/4,0,g);
      box(width,(rh-wh)/2,.28,wall,0,base+rh-(rh-wh)/4,0,g);
      for(let col=0;col<=cols;col++)box(col===0||col===cols?(cw-ww)/2:cw-ww,wh,.28,wall,-width/2+col*cw+(col===0?(cw-ww)/4:col===cols?-(cw-ww)/4:0),cy,0,g);
      for(let col=0;col<cols;col++) {
        const cx=-width/2+(col+.5)*cw;
        windowBay(g,cx,cy,ww,wh,kind,row,col);
        // Uneven runoff under the occasional sill; no identical full-height wallpaper strips.
        if((row+col)%3===0)mesh(new T.PlaneGeometry(ww*1.2,Math.min(.9,rh-wh)),grime,cx,base+.25,.148,g);
      }
      if(kind===1||kind===2||kind===7)box(width+.12,.12,.42,cement,0,base+.05,.03,g);
    }
    box(width,.55,.36,cement,0,.275,0,g);
    for(let i=0;i<3;i++)box(width+.22+i*.12,.11,.32+i*.1,cement,0,height-.11+i*.12,.06,g);
    if(groundFloor) {
      // Storefront display bays have deep jambs, transoms and an occasional roll-down grille.
      for(let col=0;col<cols;col++) {
        const cx=-width/2+(col+.5)*cw;
        if((col+kind)%3===0) {
          for(let slat=0;slat<9;slat++)box(ww,.08,.06,iron,cx,.7+slat*.2,.14,g);
        } else if((col+kind)%3===1) {
          const awning=box(cw*.9,.1,1.1,kind%2?timber:frame,cx,3.18,.45,g);awning.rotation.x=.13;
          for(const side of [-1,1]){const brace=box(.04,.65,.04,iron,cx+side*cw*.38,2.85,.46,g);brace.rotation.x=-.65;}
        }
      }
      // External AC compressor with fins and a drainpipe, attached to a solid pier.
      const px=width/2-.32;
      box(.5,.65,.55,cement,px,4.3,.38,g);
      for(let i=0;i<7;i++)box(.4,.018,.025,iron,px,4.07+i*.07,.67,g);
      box(.07,Math.min(height,12),.07,iron,-width/2+.22,Math.min(height,12)/2,.2,g);
      for(let yy=1;yy<Math.min(height,12);yy+=2)box(.16,.05,.12,iron,-width/2+.22,yy,.2,g);
    }
  }
  return function detailedShell(x,z,w,d,h,y,kind,wall) {
    const hero=x===30&&z===50&&y<.5;
    if(hero){box(w-4.1,10.8,d-1.1,dark,x+1.5,y+5.4,z);box(w-8.5,h-10.8,d-1.1,dark,x+3.75,y+10.8+(h-10.8)/2,z);}
    else box(w-1.1,h,d-1.1,dark,x,y+h/2,z);
    const side=x>0?-1:1,front=z<19?1:-1;
    if(hero)createHeroStorefront({scene,mesh,box,material,texture,wall:red,cement,timber,iron,dark,glazing,range});
    else elevation(x+side*w/2,y,z,d,h,side*Math.PI/2,kind,y<.5);
    if(hero){elevation(x,y,z+front*d/2,w,10.8,Math.PI,kind,true);elevation(x+4.25,y+10.8,z+front*d/2,w-8.5,h-10.8,Math.PI,kind,false);}
    else elevation(x,y,z+front*d/2,w,h,front===1?0:Math.PI,kind,y<.5);
    // Back elevations remain light-weight, as do the fog-bound outer city blocks.
    const back=mesh(new T.PlaneGeometry(w,h),wall,x,y+h/2,z-front*d/2);back.rotation.y=front===1?Math.PI:0;
    const flank=mesh(new T.PlaneGeometry(d,h),wall,x-side*w/2,y+h/2,z);flank.rotation.y=-side*Math.PI/2;
    box(w+.4-(hero?8.5:0),.3,d+.4,cement,x+(hero?4.25:0),y+h+.12,z);
  };
}
