import * as T from 'three';

// Local geometry on the existing prop: its origin and grip coordinates do not change.
export function detailPipe(pipe) {
  const rust = new T.MeshStandardMaterial({color:'#594431',roughness:.96,metalness:.25});
  const rim = new T.MeshStandardMaterial({color:'#7c8077',roughness:.5,metalness:.78});
  const inside = new T.MeshStandardMaterial({color:'#161b18',roughness:1,side:T.BackSide});
  const geometry = new T.CylinderGeometry(.022,.027,.8,32,12,true);
  const positions=geometry.attributes.position;
  for(let i=0;i<positions.count;i++) {
    const y=positions.getY(i),theta=Math.atan2(positions.getZ(i),positions.getX(i));
    const dent=1-.13*Math.exp(-(((y-.23)/.07)**2))*Math.max(0,Math.cos(theta+.6));
    positions.setX(i,positions.getX(i)*dent);positions.setZ(i,positions.getZ(i)*dent);
  }
  geometry.computeVertexNormals();pipe.geometry=geometry;
  const add=(geo,mat,y)=>{const m=new T.Mesh(geo,mat);m.position.y=y;m.castShadow=m.receiveShadow=true;pipe.add(m);return m;};
  for(const side of [-1,1]) {
    const radius=side<0?.027:.022;
    add(new T.TorusGeometry(radius-.002,.002,8,32),rim,side*.4).rotation.x=Math.PI/2;
    add(new T.CylinderGeometry(radius-.002,radius-.002,.055,32,1,true),inside,side*.37);
    add(new T.CylinderGeometry(radius+.002,radius+.002,.018,32,1,true),rust,side*.35);
    for(let i=0;i<4;i++)add(new T.TorusGeometry(radius+.001,.0008,5,24),rim,side*(.357+i*.006)).rotation.x=Math.PI/2;
  }
  // Uneven remnants of paint and corrosion break up the uniform cylinder.
  for(let i=0;i<23;i++) {
    const y=-.31+(i*17%23)/23*.62,angle=i*2.399;
    const radius=.0245-y*.00625;
    const patch=add(new T.CylinderGeometry(radius+.0004,radius+.0004,.009+(i%4)*.008,6,1,true,angle,.13+(i%3)*.11),rust,y);
    patch.rotation.z=Math.sin(i*1.7)*.025;
  }
}
