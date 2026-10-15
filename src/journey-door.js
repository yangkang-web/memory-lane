import * as T from 'three';

// A real hinged doorway: the destination is visible behind the leaves as the camera crosses the threshold.
export function createJourneyDoor(renderer){
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(48,1,.05,100);
 const wood=new T.MeshStandardMaterial({color:'#2d202d',roughness:.57,metalness:.12});
 const trim=new T.MeshStandardMaterial({color:'#bca57c',roughness:.3,metalness:.8});
 const dark=new T.MeshStandardMaterial({color:'#100e17',roughness:.85});
 const portals=[];
 function box(w,h,d,material,x,y,z,parent=scene){const m=new T.Mesh(new T.BoxGeometry(w,h,d),material);m.position.set(x,y,z);parent.add(m);return m;}
 for(const side of [-1,1]){
  const hinge=new T.Group();hinge.position.set(side*1.45,0,0);scene.add(hinge);portals.push(hinge);
  box(1.45,4.6,.15,wood,-side*.725,0,0,hinge);
  for(const y of [-1.15,1.15]){
   box(1.17,1.95,.035,dark,-side*.725,y,.09,hinge);
   for(const x of [-1.29,-.16])box(.018,1.95,.04,trim,-side*-x,y,.12,hinge);
   for(const dy of [-.97,.97])box(1.15,.018,.04,trim,-side*.725,y+dy,.12,hinge);
  }
  box(.035,.37,.10,trim,-side*1.27,-.14,.18,hinge);
  box(.14,4.85,.29,trim,side*1.53,0,0);
 }
 box(3.22,.17,.29,trim,0,2.39,0);
 box(10,10,.2,dark,-6.61,0,-.1);box(10,10,.2,dark,6.61,0,-.1);
 box(3.1,8,.2,dark,0,6.47,-.1);box(3.1,8,.2,dark,0,-6.47,-.1);
 scene.add(new T.HemisphereLight('#c6c5f1','#231324',2.3));
 const key=new T.PointLight('#ffd79b',30,12);key.position.set(0,2,4);scene.add(key);
 let aspect=1;
 return {
  resize(w,h){aspect=w/h;camera.aspect=aspect;camera.updateProjectionMatrix();},
  draw(p,drawBackground){
   // First close over the outgoing shot, then reveal the classroom through the opening.
   const cover=T.MathUtils.smoothstep(p,0,.21),open=T.MathUtils.smoothstep(p,.24,.84),pass=T.MathUtils.smoothstep(p,.58,1);
   drawBackground(p<.23?0:1);
   if(p<=0||p>=1)return;
   scene.traverse(o=>{if(o.isMesh){o.material.transparent=true;o.material.opacity=cover;}});
   portals[0].rotation.y=-open*1.52;portals[1].rotation.y=open*1.52;
   camera.position.set(0,0,T.MathUtils.lerp(Math.max(5.9,3.8/aspect),.23,pass));camera.lookAt(0,0,-1);
   renderer.autoClear=false;renderer.clearDepth();renderer.render(scene,camera);renderer.autoClear=true;
  },
  dispose(){scene.traverse(o=>o.geometry?.dispose());wood.dispose();trim.dispose();dark.dispose();}
 };
}
