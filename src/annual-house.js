import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
export function createAnnualHouse(scene){
 const root=new T.Group();scene.add(root);
 const mat=(color,roughness=.65,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
 const ivory=mat('#e7d7c1'),wood=mat('#8a6650'),roof=mat('#345966',.38,.35),gold=mat('#c9a572',.27,.8),stone=mat('#3c415c',.4,.4);
 const warm=new T.MeshStandardMaterial({color:'#ffd7a1',emissive:'#ffb850',emissiveIntensity:2.3});
 function box(w,h,d,m,x,y,z,parent=root,r=.025){const o=new T.Mesh(new RoundedBoxGeometry(w,h,d,2,r),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
 const base=new T.Mesh(new T.CylinderGeometry(2.45,2.65,.28,96),stone);base.position.y=-.21;root.add(base);
 const ring=new T.Mesh(new T.TorusGeometry(2.5,.025,8,128),gold);ring.rotation.x=Math.PI/2;ring.position.y=-.13;root.add(ring);
 box(3.3,.15,2.7,wood,0,-.02,0);box(3.1,2.1,.12,ivory,0,1.08,-1.2);
 for(const side of [-1,1]){box(.14,2.1,2.5,ivory,side*1.5,1.08,0);box(1.05,2.1,.14,ivory,side*1.02,1.08,1.2);}
 box(1,.55,.14,ivory,0,1.86,1.2);
 const gableShape=new T.Shape();gableShape.moveTo(-1.56,0);gableShape.lineTo(1.56,0);gableShape.lineTo(0,1.02);gableShape.closePath();
 for(const z of [-1.27,1.23]){const g=new T.Mesh(new T.ExtrudeGeometry(gableShape,{depth:.07,bevelEnabled:false}),ivory);g.position.set(0,2.1,z);root.add(g);}
 for(const side of [-1,1]){
  const slab=box(1.95,.13,2.96,roof,side*.79,2.63,0);slab.rotation.z=-side*.58;
  for(let row=0;row<7;row++)for(let col=0;col<9;col++){
   const x=side*(.09+row*.249),y=3.14-Math.abs(x)*.65;
   const tile=box(.3,.045,.335,roof,x,y,-1.32+col*.33);tile.rotation.z=-side*.58;
  }
  box(.025,.88,1.08,warm,side*1.585,1.15,-.16);
  for(const z of [-.73,-.16,.42])box(.08,.98,.045,wood,side*1.61,1.15,z);
  for(const y of [.67,1.15,1.64])box(.08,.045,1.2,wood,side*1.61,y,-.16);
  box(.51,.78,.04,warm,side*1.04,1.18,1.29);
  for(const x of [-.28,0,.28])box(.025,.84,.07,wood,side*1.04+x,1.18,1.32);
  for(const y of [.76,1.18,1.6])box(.58,.025,.07,wood,side*1.04,y,1.32);
 }
 box(.35,.86,.37,wood,-.86,3,-.65);box(.43,.09,.44,gold,-.86,3.46,-.65);
 for(const side of [-1,1])box(.09,1.65,.2,gold,side*.48,.82,1.26);
 box(1.05,.10,.2,gold,0,1.67,1.26);
 const hinge=new T.Group();hinge.position.set(-.43,0,1.3);root.add(hinge);
 box(.86,1.59,.09,wood,.43,.81,0,hinge);
 for(const y of [.42,1.18])box(.63,.58,.03,roof,.43,y,.06,hinge);
 const knob=new T.Mesh(new T.SphereGeometry(.045,20,12),gold);knob.position.set(.74,.8,.1);hinge.add(knob);
 box(.89,1.6,.02,new T.MeshBasicMaterial({color:'#fff3df'}),0,.82,1.18);
 for(let i=0;i<3;i++)box(1.3+i*.18,.11,.32,ivory,0,-.02-i*.08,1.53+i*.22);
 for(const side of [-1,1]){
  box(.12,.25,.10,gold,side*.65,1.48,1.34);box(.07,.16,.06,warm,side*.65,1.49,1.41);
  for(let i=0;i<3;i++){const tree=new T.Mesh(new T.ConeGeometry(.31-i*.065,.65-i*.06,12),mat(side<0?'#507b6b':'#6f927a'));tree.position.set(side*1.98,.35+i*.29,-.54);root.add(tree);}
 }
 const glow=new T.PointLight('#ffc67a',6,8);glow.position.set(0,2.6,3);root.add(glow);
 return {root,hinge};
}
