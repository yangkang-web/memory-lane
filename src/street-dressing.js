import * as T from 'three';

export function dressStreet({scene,mesh,box,material,texture,range,random,iron,rusty,concrete,obstacles}) {
  const grime=texture(512,512,(c,w,h)=>{
    for(let i=0;i<65;i++) {
      const x=range(w*.2,w*.8),y=range(h*.15,h*.85),r=range(15,100),g=c.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,'#1d241ddb');g.addColorStop(.5,'#26302685');g.addColorStop(1,'#26302600');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
    }
  });
  const damp=material('#758575',{map:grime,transparent:true,depthWrite:false,roughness:.3,metalness:.15,polygonOffset:true,polygonOffsetFactor:-1});
  for(let i=0;i<65;i++) {
    const x=i%2?range(-10.5,-8):range(8,10.5),z=range(-115,125);
    const patch=mesh(new T.PlaneGeometry(range(1.5,3.5),range(3,8)),damp,x,.079,z);patch.rotation.set(-Math.PI/2,0,range(-.3,.3));
  }
  const shadow=material('#151c18',{map:grime,transparent:true,opacity:.6,depthWrite:false});
  for(const [x,z,w,d,a]of[[-6,0,3.1,11,-.22],[7,31,2.7,5.3,-.3],[-7,-31,2.7,6,.13],[-6,66,2.7,5.3,.4],[5,-61,2.7,5,-.3]]) {
    const p=mesh(new T.PlaneGeometry(w,d),shadow,x,.077,z);p.rotation.set(-Math.PI/2,0,-a);
  }
  // Recessed catch basins and chipped curb sections give the road a human scale.
  const black=material('#202a24'),stone=material('#85887b');
  for(const side of [-1,1])for(const z of [-67,-27,42,89]) {
    box(.65,.025,1.15,black,side*10.9,.08,z);
    for(let i=0;i<10;i++)box(.62,.025,.035,iron,side*10.9,.103,z-.51+i*.11);
    for(const zz of [-.57,.57])box(.68,.04,.045,rusty,side*10.9,.1,z+zz);
    for(let i=0;i<5;i++){const chip=mesh(new T.DodecahedronGeometry(.11,0),stone,side*range(10.8,11.6),.13,z+range(-1,1));chip.scale.y=.4;}
  }
  // Fallen leaves are individually oriented silhouettes, not a uniformly green carpet.
  const leafShape=new T.Shape();leafShape.moveTo(0,-.5);leafShape.quadraticCurveTo(-.4,-.1,0,.5);leafShape.quadraticCurveTo(.4,-.1,0,-.5);
  const leafGeo=new T.ShapeGeometry(leafShape),leafMat=material('#6d6342',{side:T.DoubleSide});
  const leaves=new T.InstancedMesh(leafGeo,leafMat,1900),dummy=new T.Object3D(),tint=new T.Color();
  for(let i=0;i<1900;i++) {
    const side=i%2?-1:1,x=side*range(9.3,16.2),z=range(-112,112),onPavement=Math.abs(x)>11.7&&!(z>8&&z<30);
    dummy.position.set(x,onPavement?.257:.083,z);dummy.rotation.set(-Math.PI/2+range(-.15,.15),0,range(0,6.28));dummy.scale.set(range(.06,.16),range(.1,.23),1);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);
    tint.setHSL(range(.07,.17),range(.2,.5),range(.13,.28));leaves.setColorAt(i,tint);
  }
  leaves.receiveShadow=true;scene.add(leaves);
  // A corroded hydrant, discarded drums and a broken utility box beside the pavement.
  for(const [x,z]of[[12.7,48],[-14,-45]]) {
    mesh(new T.CylinderGeometry(.12,.16,.65,10),rusty,x,.6,z);
    mesh(new T.SphereGeometry(.15,12,8,0,Math.PI*2,0,Math.PI/2),rusty,x,.94,z);
    const valve=mesh(new T.CylinderGeometry(.07,.07,.37,8),iron,x,.73,z);valve.rotation.z=Math.PI/2;
    box(.35,.07,.35,concrete,x,.3,z);
  }
  for(const [x,z]of[[-15.8,32],[15.4,-5]]) {
    const barrel=mesh(new T.CylinderGeometry(.32,.3,.88,20),rusty,x,.7,z);
    for(const y of [.37,.64,1.07]){const hoop=mesh(new T.TorusGeometry(.32,.018,6,24),iron,x,y,z);hoop.rotation.x=Math.PI/2;}
    box(.48,.025,.48,black,x,1.149,z);
    obstacles.push({minX:x-.35,maxX:x+.35,minZ:z-.35,maxZ:z+.35});
    barrel.rotation.y=random()*6;
  }
  box(.68,1.1,.38,iron,15.2,.8,63);
  const flap=box(.64,.98,.04,rusty,15.55,.82,63.25);flap.rotation.y=.7;
  for(let i=0;i<6;i++)box(.48,.025,.025,black,15.2,.55+i*.12,63.21);
  obstacles.push({minX:14.8,maxX:15.9,minZ:62.7,maxZ:63.6});
}
