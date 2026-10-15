import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

let finishes;
const shapes=new Map();
function textureMaterial(width,height,draw,options={}) {
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  draw(canvas.getContext('2d'),width,height);
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;
  return new T.MeshStandardMaterial({map,roughness:.86,...options});
}
const keys=[];
const letters=['1234567890−=⌫','QWERTYUIOP[]','ASDFGHJKL;','ZXCVBNM,./','⌘   SPACE   ⌘'];
for(let row=0;row<5;row++)for(let col=0;col<14;col++) {
  if(row===4&&col>3&&col<10)continue;
  keys.push({u:(col+(row===4&&col===3?3.5:.5))/14,v:(row+.5)/5,
    width:row===4&&col===3?6.6/14:.85/14,label:row===4&&col===3?'':letters[row][col]||''});
}
function propFinishes() {
  if(finishes)return finishes;
  const covers=['FIELD NOTES','LITERATURE','NATURAL SCIENCE'].map((title,index)=>textureMaterial(512,640,(c,w,h)=>{
    c.fillStyle=['#577275','#ad8055','#6d805e'][index];c.fillRect(0,0,w,h);
    c.fillStyle='#263d3535';c.fillRect(0,0,30,h);
    c.strokeStyle='#e9d8af';c.lineWidth=2;c.strokeRect(48,54,w-85,h-106);
    c.fillStyle='#f3e8cc';c.textAlign='center';c.font='25px Georgia';c.fillText('WESTBRIDGE ACADEMY',w*.54,115);
    c.font='bold 36px Georgia';c.fillText(title,w*.54,h*.44,w*.78);
    c.font='21px serif';c.fillText('SPRING TERM',w*.54,h*.53);
    c.strokeStyle='#f3e8cc';c.beginPath();c.arc(w*.54,h*.7,39,0,Math.PI*2);c.stroke();
    c.font='28px Georgia';c.fillText('W',w*.54,h*.7+10);
    c.font='17px sans-serif';c.fillText('NAME __________________',w*.54,h*.87);
  }));
  const spines=['FIELD NOTES','LITERATURE','NATURAL SCIENCE'].map((title,index)=>textureMaterial(768,80,(c,w,h)=>{
    c.fillStyle=['#577275','#ad8055','#6d805e'][index];c.fillRect(0,0,w,h);
    c.fillStyle='#f3e8cc';c.font='28px Georgia';c.textAlign='center';c.fillText(title,w/2,51);
  }));
  const pages=[0,1].map(side=>textureMaterial(512,640,(c,w,h)=>{
    c.fillStyle='#ece4d1';c.fillRect(0,0,w,h);
    const shade=c.createLinearGradient(side?0:w,0,side?60:w-60,0);
    shade.addColorStop(0,'#766b5133');shade.addColorStop(1,'#766b5100');c.fillStyle=shade;c.fillRect(0,0,w,h);
    c.strokeStyle='#789ba8';c.lineWidth=1;
    for(let y=125;y<h-40;y+=33){c.beginPath();c.moveTo(42,y);c.lineTo(w-34,y);c.stroke();}
    c.strokeStyle='#d0a5a1';c.beginPath();c.moveTo(66,35);c.lineTo(66,h-30);c.stroke();
    c.fillStyle='#253548';c.font='27px "Chalkboard SE", cursive';
    c.fillText(side?'Light & shadow':'Spring observations',78,83);
    c.font='20px "Chalkboard SE", cursive';
    const lines=side?['Look at the window.','The light changes through the day.','A soft edge, a warm reflection.']:['April 08','The trees are in bloom.','Small petals catch the sunlight.','Sketch what you notice today.'];
    lines.forEach((line,i)=>c.fillText(line,79,151+i*33,w-105));
    c.strokeStyle='#40543c';c.lineWidth=2;c.beginPath();
    if(side){c.moveTo(100,450);c.lineTo(395,450);c.lineTo(395,320);c.moveTo(100,450);c.lineTo(250,333);c.lineTo(395,450);}
    else {c.ellipse(263,399,61,110,.55,0,Math.PI*2);c.moveTo(205,490);c.lineTo(320,300);}
    c.stroke();c.font='17px serif';c.fillText(side?'12':'11',w-55,h-22);
  }));
  const edges=textureMaterial(512,256,(c,w,h)=>{
    c.fillStyle='#e7dfca';c.fillRect(0,0,w,h);
    for(let y=0;y<h;y+=5){c.fillStyle=y%3?'#c9c1af':'#f8f0dc';c.fillRect(0,y,w,1);}
  });
  const keyboard=textureMaterial(840,290,(c,w,h)=>{
    c.fillStyle='#d8dee0';c.font='17px sans-serif';c.textAlign='center';c.textBaseline='middle';
    for(const key of keys)c.fillText(key.label,key.u*w,key.v*h);
  },{transparent:true,depthWrite:false});
  const screen=textureMaterial(1024,576,(c,w,h)=>{
    c.fillStyle='#dae4df';c.fillRect(0,0,w,h);c.fillStyle='#345451';c.fillRect(0,0,w,54);
    c.font='22px sans-serif';c.fillStyle='#f6f1df';c.fillText('WESTBRIDGE  /  CLASSROOM',28,35);
    c.fillStyle='#eff2e9';c.fillRect(25,78,190,468);c.fillStyle='#627e77';c.font='21px sans-serif';
    ['Today','Lesson notes','Reading list','Class journal'].forEach((t,i)=>c.fillText(t,44,121+i*57));
    c.fillStyle='#fffaf0';c.fillRect(240,78,756,468);c.fillStyle='#425e58';c.font='bold 42px Georgia';c.fillText('A new season',280,160);
    c.font='25px Georgia';c.fillText('Creative writing · Spring term',280,211);
    c.font='23px sans-serif';['01  Notice the light around you.','02  Describe a small spring moment.','03  Share your first paragraph.'].forEach((t,i)=>c.fillText(t,280,291+i*61));
    c.fillStyle='#8ba38a';c.fillRect(280,476,605,5);
  },{roughness:.3,emissive:'#ffffff',emissiveIntensity:.12});
  // Keep the display readable in direct window light, like a self-lit screen.
  const display=new T.MeshBasicMaterial({map:screen.map,toneMapped:false});screen.dispose();
  const drawerLabels=['FILES','NOTES','STATIONERY'].map(title=>textureMaterial(256,80,(c,w,h)=>{
    c.fillStyle='#e2dfce';c.fillRect(0,0,w,h);c.fillStyle='#50635d';c.textAlign='center';c.font='26px sans-serif';c.fillText(title,w/2,51);
  }));
  finishes={covers,spines,pages,edges,keyboard,screen:display,drawerLabels,
    aluminum:new T.MeshStandardMaterial({color:'#929ca3',metalness:.8,roughness:.3}),
    key:new T.MeshStandardMaterial({color:'#30383e',roughness:.65})};
  return finishes;
}

// Every prop is built locally then merged into the classroom's material batches.
export function classroomProps({detailed,steel}) {
  const f=propFinishes();
  function frame(matrix) {
    const emit=(g,mat,x=0,y=0,z=0,rx=0,ry=0)=>{
      g.rotateX(rx);g.rotateY(ry);g.translate(x,y,z);g.applyMatrix4(matrix);
      detailed(g,mat,0,0,0);g.dispose();
    };
    return {emit,
      piece(w,h,d,mat,x=0,y=0,z=0,r=.003) {
        const key=[w,h,d,r].join(':');
        if(!shapes.has(key))shapes.set(key,r?new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/3,h/3,d/3)):new T.BoxGeometry(w,h,d));
        emit(shapes.get(key).clone(),mat,x,y,z);
      },
      plane(w,h,mat,x,y,z,rx=0){emit(new T.PlaneGeometry(w,h),mat,x,y,z,rx);},
      child(x,y,z,rx=0){const m=new T.Matrix4().makeRotationX(rx);m.setPosition(x,y,z);return frame(matrix.clone().multiply(m));},
    };
  }
  const at=(x,y,z,yaw=0,scale=1)=>{
    const m=new T.Matrix4().makeRotationY(yaw);m.scale(new T.Vector3(scale,scale,scale));m.setPosition(x,y,z);return frame(m);
  };
  function book(x,y,z,{open=false,variant=0,yaw=0,scale=1}={}) {
    const p=at(x,y,z,yaw,scale),cover=['#577275','#ad8055','#6d805e'][variant%3];
    if(open) {
      p.piece(.47,.009,.355,cover,0,.005,0);
      for(const side of [-1,1]) {
        p.piece(.219,.018,.337,f.edges,side*.115,.019,0);
        const g=new T.PlaneGeometry(.222,.335,14,18),a=g.attributes.position;
        for(let i=0;i<a.count;i++) {
          const u=a.getX(i)/.222+.5,v=.5-a.getY(i)/.335;
          a.setXYZ(i,side<0?-.224+u*.222:.002+u*.222,
            .031+Math.sin(u*Math.PI)*.016+Math.pow(v,5)*Math.pow(side<0?1-u:u,4)*.018,(v-.5)*.335);
        }
        g.computeVertexNormals();p.emit(g,f.pages[side<0?0:1]);
      }
      p.piece(.007,.006,.332,'#9d8d72',0,.029,0,.001);
    } else {
      p.piece(.31,.008,.395,cover,0,.004,0);
      p.piece(.294,.033,.376,f.edges,.003,.024,0);
      p.piece(.31,.009,.395,cover,0,.045,0);
      p.plane(.301,.387,f.covers[variant%3],0,.0502,0,-Math.PI/2);
      p.piece(.014,.046,.395,cover,-.15,.026,0,.006);
      p.emit(new T.PlaneGeometry(.34,.026),f.spines[variant%3],-.1575,.027,0,0,-Math.PI/2);
      for(const zz of [-.145,.145])p.piece(.016,.008,.016,'#d4bd8b',-.15,.025,zz,.001);
    }
    p.piece(.016,.002,.065,'#a65f4c',.085,.014,open?.185:.218,.001);
  }
  function laptop(x,y,z) {
    const p=at(x,y,z);
    p.piece(.5,.02,.32,f.aluminum,0,.012,0,.009);
    p.piece(.486,.004,.306,'#c1c7c9',0,.024,0,.007);
    p.piece(.44,.002,.164,'#515d63',0,.027,-.035,.006);
    for(const key of keys)p.piece(key.width*.42,.006,.024,f.key,(key.u-.5)*.42,.03,(key.v-.5)*.145-.035,.002);
    p.plane(.42,.145,f.keyboard,0,.0336,-.035,-Math.PI/2);
    p.piece(.152,.002,.066,'#6e7a81',0,.027,.108,.004);
    p.piece(.148,.002,.062,'#bac1c4',0,.0285,.108,.004);
    p.piece(.075,.002,.005,'#65727b',0,.023,.158,.001);
    for(const xx of [-.19,.19])p.emit(new T.CylinderGeometry(.009,.009,.065,12).rotateZ(Math.PI/2),steel,xx,.031,-.143);
    const lid=p.child(0,.178,-.156,-.18);
    lid.piece(.5,.297,.014,f.aluminum,0,0,0,.008);
    lid.piece(.477,.272,.003,'#202b34',0,0,.008,.005);
    lid.plane(.455,.249,f.screen,0,-.002,.0101);
    lid.emit(new T.SphereGeometry(.0038,10,6),'#070f19',0,.134,.011);
    lid.piece(.004,.002,.001,'#9fc5a9',.012,.134,.011,.0005);
    for(const side of [-1,1])for(let i=0;i<3;i++)p.piece(.0015,.006,.021,'#252f35',side*.251,.014,-.065+i*.039,.001);
    for(let i=0;i<7;i++)p.piece(.017,.001,.002,'#66757c',-.215,.027,.035+i*.012,.0005);
    const cable=new T.CatmullRomCurve3([[.251,.015,.055],[.32,.015,.08],[.39,.008,-.05],[.34,.008,-.12]].map(v=>new T.Vector3(...v)));
    p.emit(new T.TubeGeometry(cable,24,.0035,6,false),'#51585c');
    p.piece(.026,.013,.03,'#51585c',.34,.009,-.133,.003);
    p.piece(.017,.007,.013,steel,.34,.009,-.153,.001);
  }
  function pedestal(x,y,z) {
    const p=at(x,y,z),shell='#73877e',inside='#b9b5a5';
    for(const xx of [-.235,.235])p.piece(.025,.72,.68,shell,xx,.36,0,.008);
    p.piece(.46,.72,.025,shell,0,.36,-.327,.004);
    p.piece(.46,.025,.65,shell,0,.018,0,.004);
    p.piece(.46,.025,.65,shell,0,.705,0,.004);
    for(let i=0;i<3;i++) {
      const yy=.13+i*.225,extension=i===2?.15:0;
      const drawer=p.child(0,yy,extension);
      drawer.piece(.427,.017,.605,inside,0,-.073,0,.003);
      for(const xx of [-.207,.207])drawer.piece(.016,.13,.605,inside,xx,-.015,0,.002);
      drawer.piece(.427,.13,.016,inside,0,-.015,-.295,.002);
      drawer.piece(.448,.199,.027,shell,0,.015,.325,.009);
      for(const xx of [-.067,.067])drawer.piece(.013,.015,.027,steel,xx,.035,.352,.003);
      drawer.piece(.149,.018,.018,steel,0,.035,.371,.006);
      drawer.piece(.075,.025,.001,'#c6cebd',0,-.031,.339,.001);
      drawer.plane(.073,.023,f.drawerLabels[i],0,-.031,.3401);
      for(const xx of [-.219,.219])p.piece(.008,.025,.56,steel,xx,yy-.04,.01,.001);
      if(i===2) {
        drawer.piece(.012,.083,.535,'#8f9585',.075,-.026,.015,.001);
        drawer.piece(.22,.015,.29,'#eae3d0',-.058,-.054,.11,.001);
        drawer.piece(.22,.004,.29,'#f8f2e4',-.058,-.044,.11,.001);
        for(let j=0;j<3;j++)drawer.piece(.008,.008,.20,['#a17e49','#576e77','#ac6656'][j],.115+j*.023,-.055,.095,.002);
      }
    }
  }
  function deskTray(x,z,variant) {
    const p=at(x,1.11,z);
    p.piece(.72,.024,.46,steel,0,0,0,.008);
    for(const xx of [-.354,.354]) {
      p.piece(.016,.135,.46,steel,xx,.063,0,.004);
      for(const zz of [-.17,.17])p.emit(new T.SphereGeometry(.009,8,6),steel,xx,.105,zz);
    }
    p.piece(.72,.135,.016,steel,0,.063,-.222,.004);
    p.piece(.72,.018,.021,steel,0,.018,.222,.006);
    for(const xx of [-.24,0,.24])p.piece(.012,.004,.4,'#727d80',xx,.014,0,.001);
    p.piece(.29,.007,.30,['#909c7c','#aa8c65','#708e94'][variant%3],-.12,.025,.025,.003);
    p.piece(.27,.018,.28,f.edges,-.12,.038,.025,.002);
    p.piece(.29,.004,.30,'#bcc4ab',-.12,.05,.025,.002);
    p.piece(.035,.008,.10,'#d4c7a4',-.12,.055,.13,.002);
  }
  function pencil(x,y,z,{yaw=0}={}) {
    const p=at(x,y,z,yaw);
    function barrel(radiusTop,radiusBottom,length,color,zz,segments=6) {
      const g=new T.CylinderGeometry(radiusTop,radiusBottom,length,segments);
      g.rotateX(Math.PI/2);p.emit(g,color,0,0,zz);
    }
    barrel(.004,.004,.145,'#c59d49',0);
    barrel(.004,.0008,.019,'#d6b084',-.082);
    barrel(.0008,0,.006,'#343b40',-.0945);
    barrel(.0043,.0043,.011,steel,.078);
    barrel(.004,.004,.011,'#c99c92',.089);
  }
  return {book,laptop,pedestal,deskTray,pencil};
}
