import * as T from 'three';

// A single readable silhouette, clear of the existing sill plant and cherry trunk.
export const FLOWER_POSITION=[-36.68,1.36,-25.55];
export function createStorySunflower(parent){
 const root=new T.Group();root.name='Story sunflower — curved stem and layered petals';
 root.position.fromArray(FLOWER_POSITION);parent.add(root);
 const material=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.78,...extra});
 const green=material('#648347',{side:T.DoubleSide}),vein=material('#9ba969');
 const add=(group,g,m)=>{const o=new T.Mesh(g,m);o.castShadow=o.receiveShadow=true;group.add(o);return o;};
 const pot=add(root,new T.LatheGeometry([[.072,0],[.08,.015],[.105,.20],[.112,.205],[.112,.225],[.098,.225],[.096,.20],[.08,.025]].map(p=>new T.Vector2(...p)),32),material('#c6a784'));
 pot.name='Warm ceramic pot';
 const soil=add(root,new T.CylinderGeometry(.096,.096,.012,24),material('#574432'));soil.position.y=.198;
 const plant=new T.Group();plant.position.y=.202;root.add(plant);
 const curve=new T.CatmullRomCurve3([new T.Vector3(0,0,0),new T.Vector3(-.019,.20,.012),new T.Vector3(.012,.40,.015),new T.Vector3(.028,.62,.025)]);
 add(plant,new T.TubeGeometry(curve,20,.008,8,false),green);
 for(const [sign,height,turn] of [[-1,.17,-.4],[1,.31,.65],[-1,.43,.2]]){
  const leaf=new T.Group();leaf.position.copy(curve.getPoint(height/.62));leaf.rotation.set(.3,turn,sign*-.8);plant.add(leaf);
  const shape=new T.Shape();shape.moveTo(0,0);shape.bezierCurveTo(-.11,-.015,-.105,.11,0,.205);shape.bezierCurveTo(.105,.11,.11,-.015,0,0);
  const g=new T.ShapeGeometry(shape,14),a=g.attributes.position;
  for(let i=0;i<a.count;i++)a.setZ(i,.025*Math.sin(a.getY(i)/.205*Math.PI)-Math.abs(a.getX(i))*.2);
  g.computeVertexNormals();add(leaf,g,green);
  add(leaf,new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(),new T.Vector3(0,.09,.026),new T.Vector3(0,.195,.005)]),10,.0016,4,false),vein);
 }
 const head=new T.Group();head.position.copy(curve.getPoint(1));head.rotation.set(-.09,1.11,-.09);plant.add(head);
 const petalMat=material('#ffffff',{vertexColors:true,side:T.DoubleSide,roughness:.62});
 for(let layer=0;layer<2;layer++)for(let n=0;n<19;n++){
  const g=new T.PlaneGeometry(1,1,5,12),a=g.attributes.position,colors=[];
  const length=(layer?.107:.139)*(1+.065*Math.sin(n*4.7));
  for(let i=0;i<a.count;i++){
   const u=a.getX(i)*2,v=a.getY(i)+.5;
   const width=Math.pow(Math.sin(Math.PI*v),.8)*(layer?.022:.026);
   a.setXYZ(i,u*width,.041+v*length,.006+Math.sin(v*Math.PI)*.017-v*v*.022+u*u*.008);
   const color=new T.Color().lerpColors(new T.Color('#cf8d26'),new T.Color(layer?'#ffd86c':'#efba45'),Math.min(1,v*2));colors.push(color.r,color.g,color.b);
  }
  g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();
  const petal=add(head,g,petalMat);petal.rotation.z=n/19*Math.PI*2+layer*.17;petal.position.z=layer*.007;
 }
 const disc=add(head,new T.SphereGeometry(.054,24,16),material('#70472e'));disc.scale.z=.38;disc.position.z=.013;
 const seeds=new T.InstancedMesh(new T.SphereGeometry(.0028,5,4),material('#9b713b'),320),dummy=new T.Object3D();
 for(let i=0;i<320;i++){
  const r=.051*Math.sqrt((i+.5)/320),angle=i*2.399963;
  dummy.position.set(Math.cos(angle)*r,Math.sin(angle)*r,.014+.021*Math.sqrt(1-(r/.054)**2));dummy.scale.set(1,.8,.6);dummy.updateMatrix();seeds.setMatrixAt(i,dummy.matrix);
  seeds.setColorAt(i,new T.Color(i%3?'#a58249':'#d0aa61'));
 }
 head.add(seeds);
 return {root,update(time){plant.rotation.z=Math.sin(time*1.12)*.018;plant.rotation.x=Math.sin(time*.83+.5)*.012;head.rotation.z=-.09+Math.sin(time*1.12-.35)*.012;}};
}
