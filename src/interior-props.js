import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Small, locally modelled objects. Coordinates use the top of the supporting surface.
export function furnishInterior({scene,mesh,box,cylinder,mat,canvasTexture,wood,darkWood,metal,rust}) {
  const paperMap=canvasTexture(128,256,(c,w,h)=>{
    c.fillStyle='#b5ac8d';c.fillRect(0,0,w,h);
    for(let y=0;y<h;y+=3){c.fillStyle=y%9?'#726f4b55':'#eee2bc55';c.fillRect(0,y,w,1);}
    const stain=c.createLinearGradient(0,0,w,0);stain.addColorStop(0,'#574a3b88');stain.addColorStop(.4,'#574a3b00');stain.addColorStop(1,'#574a3b55');c.fillStyle=stain;c.fillRect(0,0,w,h);
  });
  const paper=mat('#d3c6a1',{map:paperMap});
  const covers=['#4c5b4d','#73503b','#83734d','#394b50','#574a43'].map(color=>mat(color,{map:paperMap}));
  const spineMap=canvasTexture(128,512,(c,w,h)=>{
    c.fillStyle='#514e3b';c.fillRect(0,0,w,h);c.fillStyle='#ab9e73';
    c.fillRect(12,35,w-24,4);c.fillRect(12,h-40,w-24,4);
    c.font='18px Georgia';c.textAlign='center';c.fillText('FIELD',w/2,130);c.fillText('NOTES',w/2,160);c.fillText('1986',w/2,400);
    for(let i=0;i<160;i++){c.fillStyle='#251e1825';c.fillRect((i*71)%w,(i*113)%h,3,12);}
  });
  const spine=mat('#d3c5a0',{map:spineMap});
  let bookIndex=0;
  function book(x,y,z,{yaw=0,flat=false,scale=1,lean=0,parent=scene}={}) {
    const g=new T.Group();g.position.set(x,y+(flat?.042:.18)*scale,z);g.rotation.set(0,yaw,flat?Math.PI/2:lean);g.scale.setScalar(scale);parent.add(g);
    const cover=covers[bookIndex++%covers.length];
    box(.061,.337,.245,paper,0,0,0,g);
    for(const s of [-1,1])box(.009,.36,.27,cover,s*.035,0,0,g);
    box(.08,.36,.018,cover,0,0,.13,g);
    mesh(new T.PlaneGeometry(.064,.31),spine,0,0,.14,g);
    return g;
  }
  function label(text,color) {
    const map=canvasTexture(256,128,(c,w,h)=>{
      c.fillStyle=color;c.fillRect(0,0,w,h);c.fillStyle='#bcb28b';c.fillRect(10,12,w-20,h-24);
      c.strokeStyle='#595944';c.strokeRect(18,19,w-36,h-38);c.fillStyle='#454b3b';c.font='bold 22px Georgia';c.textAlign='center';c.fillText(text,w/2,66);
      c.font='10px monospace';c.fillText('PANTRY  /  400 g',w/2,91);
      for(let i=0;i<150;i++){c.fillStyle='#54452e55';c.fillRect((i*43)%w,(i*67)%h,2,4);}
    });
    return mat('#c8bc9e',{map});
  }
  const tinLabels=[label('BEANS','#5c6349'),label('PEACHES','#80613c'),label('TEA','#435b52')];
  function tin(x,y,z,index=0,scale=1,parent=scene) {
    const g=new T.Group();g.position.set(x,y,z);g.scale.setScalar(scale);parent.add(g);
    cylinder(.095,.2,metal,0,.1,0,g);
    mesh(new T.CylinderGeometry(.097,.097,.145,20,1,true),tinLabels[index%3],0,.103,0,g);
    for(const height of [.012,.19])mesh(new T.TorusGeometry(.092,.008,5,20),rust,0,height,0,g).rotation.x=Math.PI/2;
    cylinder(.086,.006,metal,0,.205,0,g);
    mesh(new T.TorusGeometry(.022,.005,4,12),metal,.022,.21,0,g).rotation.x=Math.PI/2;
  }
  const bottleMat=mat('#354c3e',{roughness:.42,metalness:.12});
  const cork=mat('#817252',{map:paperMap});
  function bottle(x,y,z,scale=1,parent=scene) {
    const points=[[.055,0],[.075,.025],[.077,.26],[.065,.31],[.027,.37],[.025,.46],[.031,.47]].map(p=>new T.Vector2(...p));
    const g=new T.Group();g.position.set(x,y,z);g.scale.setScalar(scale);parent.add(g);
    mesh(new T.LatheGeometry(points,16),bottleMat,0,0,0,g);
    cylinder(.026,.035,cork,0,.475,0,g);
    mesh(new T.CylinderGeometry(.078,.078,.1,16,1,true),tinLabels[2],0,.18,0,g);
  }
  // East rack: individual books, ridged tins, bottles and a small portable radio.
  for(let i=0;i<7;i++)book(-17.59,1.9375,43.65+i*.105,{yaw:-Math.PI/2,scale:.8+(i%3)*.13});
  book(-17.6,1.9375,44.62,{yaw:-Math.PI/2,lean:.12,scale:1.07});
  for(let i=0;i<3;i++)tin(-17.55,1.1875,43.55+i*.3,i,1.1);
  bottle(-17.65,.5375,43.6,1.25);bottle(-17.4,.5375,43.9,.95);
  bottle(-17.6,1.1875,44.78,.85);
  const radio=new T.Group();radio.position.set(-17.57,1.36,44.35);radio.rotation.y=-Math.PI/2;scene.add(radio);
  mesh(new RoundedBoxGeometry(.51,.33,.21,2,.025),metal,0,0,0,radio);
  const grille=canvasTexture(128,128,(c,w,h)=>{c.fillStyle='#1b241e';c.fillRect(0,0,w,h);for(let x=4;x<w;x+=6)for(let y=4;y<h;y+=6){c.fillStyle='#6e786555';c.fillRect(x,y,2,2);}});
  box(.29,.25,.015,mat('#9c9e84',{map:grille}),-.07,0,.113,radio);
  for(const y of [-.085,.065])cylinder(.029,.025,darkWood,.18,y,.13,radio).rotation.x=Math.PI/2;
  box(.33,.035,.015,paper,-.04,.112,.126,radio);
  const antenna=cylinder(.006,.3,metal,.16,.31,-.045,radio);antenna.rotation.z=-.22;
  box(.3,.025,.04,metal,0,.215,0,radio);for(const x of [-.15,.15])box(.025,.07,.04,metal,x,.18,0,radio);
  // Broken cupboard: supplies occupy actual shelf surfaces, not mid-air blocks.
  for(let level=0;level<2;level++)for(let i=0;i<4;i++)tin(-19.04+i*.29,.54+level*.65,36.92,(i+level)%3,.85);
  for(let i=0;i<4;i++)book(-18.9+i*.1,1.84,36.97,{scale:.85+i*.07});
  bottle(-18.07,1.84,36.92,1.15);tin(-18.4,2.49,36.89,2,.95);
  // Slatted supply crate on the bottom shelf, including edge battens and nail heads.
  const crate=new T.Group();crate.position.set(-17.57,.55,44.65);scene.add(crate);
  box(.58,.04,.56,darkWood,0,0,0,crate);
  for(const side of [-1,1])for(let row=0;row<3;row++) {
    box(.06,.065,.58,wood,side*.28,.055+row*.08,0,crate);box(.54,.065,.055,wood,0,.055+row*.08,side*.28,crate);
  }
  for(const x of [-.26,.26])for(const z of [-.26,.26])box(.045,.3,.045,darkWood,x,.14,z,crate);
  // Tabletop has separate bound pages, an open journal, a chipped enamel mug and lantern.
  book(-19.75,1.15,44.5,{flat:true,yaw:.2,scale:1.3});book(-19.73,1.26,44.49,{flat:true,yaw:-.08,scale:1.17});
  const journal=canvasTexture(512,256,(c,w,h)=>{
    c.fillStyle='#b9ad8b';c.fillRect(0,0,w,h);c.fillStyle='#5e5c4266';c.fillRect(250,0,10,h);
    for(let side=0;side<2;side++)for(let y=35;y<220;y+=17){c.strokeStyle='#4b514b77';c.beginPath();c.moveTo(24+side*256,y);c.lineTo(205+side*256-(y%4)*9,y+2);c.stroke();}
    c.fillStyle='#63563844';c.beginPath();c.ellipse(410,175,38,50,.3,0,Math.PI*2);c.fill();
  });
  const open=mesh(new T.PlaneGeometry(.65,.43),mat('#d2c3a1',{map:journal}),-19.04,1.161,44.55);open.rotation.set(-Math.PI/2,0,-.14);
  const mug=mat('#a9b4a4',{roughness:.7});
  const mugPoints=[[.06,0],[.085,.015],[.092,.16],[.081,.16],[.074,.025],[0,.025]].map(p=>new T.Vector2(...p));
  mesh(new T.LatheGeometry(mugPoints,24),mug,-19.14,1.15,44.04);
  mesh(new T.TorusGeometry(.061,.012,6,16),mug,-19.025,1.24,44.04);
  for(let i=0;i<4;i++)box(.023,.015,.004,metal,-19.17+i*.02,1.31,44.127);
  const lantern=new T.Group();lantern.position.set(-20.24,1.15,44.45);scene.add(lantern);
  cylinder(.13,.065,metal,0,.04,0,lantern);cylinder(.12,.05,metal,0,.39,0,lantern);
  const glow=mat('#dfb96d',{emissive:'#ffbd59',emissiveIntensity:1.1,roughness:.3});
  cylinder(.067,.25,glow,0,.22,0,lantern);
  for(const x of [-.095,.095])for(const z of [-.06,.06])box(.012,.33,.012,metal,x,.22,z,lantern);
  mesh(new T.TorusGeometry(.11,.009,6,20,Math.PI),metal,0,.43,0,lantern);
  const lamp=new T.PointLight('#ffc87a',4.5,4.5,2);lamp.position.set(-20.24,1.42,44.45);scene.add(lamp);
  // Ceiling pendant: exposed flex, enamel shade, inner reflector, cage and dead bulb.
  cylinder(.008,.65,metal,-23,4.03,41.8);
  cylinder(.065,.06,metal,-23,4.38,41.8);
  mesh(new T.CylinderGeometry(.08,.34,.2,28,1,true),mat('#52645c',{side:T.DoubleSide,metalness:.3}),-23,3.62,41.8);
  mesh(new T.CylinderGeometry(.075,.32,.18,28,1,true),mat('#b7b5a0',{side:T.BackSide}),-23,3.61,41.8);
  mesh(new T.SphereGeometry(.058,12,8),mat('#b1ac8e'),-23,3.56,41.8);
  mesh(new T.TorusGeometry(.32,.012,6,28),metal,-23,3.52,41.8).rotation.x=Math.PI/2;
}
