import * as T from 'three';

// Closed, asymmetric wound and torn cuff. No open skin triangles or flat white cap.
export function createInjuredArm(){
  const root=new T.Group();root.name='Torn sleeve / unbandaged injury';
  const cloth=new T.MeshStandardMaterial({color:'#171c1a',roughness:.93,side:T.DoubleSide});
  const weave=new Uint8Array(64*64*4);for(let i=0;i<64*64;i++){const x=i%64,y=Math.floor(i/64),c=100+(x%3?0:60)+(y%4?0:45);weave.set([c,c,c,255],i*4);}const bump=new T.DataTexture(weave,64,64);bump.wrapS=bump.wrapT=T.RepeatWrapping;bump.repeat.set(3,4);bump.needsUpdate=true;cloth.bumpMap=bump;cloth.bumpScale=.0013;
  const blood=new T.MeshStandardMaterial({color:'#791619',roughness:.34,vertexColors:true});
  const geometry=new T.CylinderGeometry(.065,.051,.28,48,16,false),p=geometry.attributes.position;
  for(let i=0;i<p.count;i++){const y=p.getY(i),a=Math.atan2(p.getZ(i),p.getX(i)),fold=1+.045*Math.sin(y*104+a*3)+.025*Math.sin(y*183-a*5);p.setX(i,p.getX(i)*fold);p.setZ(i,p.getZ(i)*fold);if(y<-.12)p.setY(i,y+.012*Math.sin(a*9)+.006*Math.sin(a*17));}
  geometry.computeVertexNormals();const sleeve=new T.Mesh(geometry,cloth);sleeve.position.y=-.14;root.add(sleeve);
  const wound=new T.SphereGeometry(1,48,32),v=wound.attributes.position,colors=[];
  for(let i=0;i<v.count;i++){const x=v.getX(i),y=v.getY(i),z=v.getZ(i),n=Math.sin(x*31+y*17)*Math.sin(z*27-x*11);v.setXYZ(i,x*.049*(1+n*.06),y*.023+n*.003,z*.049*(1+n*.07));const shade=.55+Math.max(0,n)*.4;colors.push(shade,shade*.7,shade*.64);}
  wound.setAttribute('color',new T.Float32BufferAttribute(colors,3));wound.computeVertexNormals();const tissue=new T.Mesh(wound,blood);tissue.position.y=-.273;root.add(tissue);
  const darkBlood=new T.MeshStandardMaterial({color:'#300609',roughness:.48});
  for(let i=0;i<18;i++){const a=i*2.399,r=.046;const strip=new T.Mesh(new T.ConeGeometry(.003+i%3*.0008,.018+i%4*.006,6),i%3?cloth:darkBlood);strip.position.set(Math.cos(a)*r,-.282-i%3*.004,Math.sin(a)*r);strip.rotation.z=Math.PI+.18*Math.sin(i);root.add(strip);}
  for(let i=0;i<13;i++){const a=i*2.399;const stain=new T.Mesh(new T.SphereGeometry(1,12,8),darkBlood);stain.scale.set(.006,.018+i%4*.008,.002);stain.position.set(Math.sin(a)*.054,-.24+i%3*.014,Math.cos(a)*.054);stain.rotation.y=a;root.add(stain);}
  root.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});return root;
}
