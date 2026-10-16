import * as T from 'three';
import { cherryPetalAssets } from './cherry-blossoms.js';

// Shared with the sliding sashes: the positive-z half is open, clear of curtains.
export const springWindowCenters=[-31.9,-28.3,-24.7];

export function addWindowPetals(scene,room) {
  const {geometry,material}=cherryPetalAssets();
  const side=room.sideWindows,wall=side<0?room.left:room.right;
  let seed=Number(room.number)*317;
  const rand=()=>((seed=seed*16807%2147483647)/2147483647);
  const petals=Array.from({length:126},(_,i)=>({
    window:springWindowCenters[i%3],phase:rand(),duration:18+rand()*10,
    offset:.55+rand()*.16,height:3.95+rand()*.25,
    reach:.88+rand()*.3,size:.065+rand()*.045,spin:rand()*Math.PI*2,drift:(rand()-.5)*1.25,
  }));
  const flight=new T.InstancedMesh(geometry,material,petals.length);
  flight.name=`Room ${room.number} — petals carried through open windows`;
  flight.instanceMatrix.setUsage(T.DynamicDrawUsage);
  // World-space matrices; bounds include the outside approach and every window.
  flight.boundingSphere=new T.Sphere(new T.Vector3(wall,2.3,-28),9);
  petals.forEach((p,i)=>flight.setColorAt(i,new T.Color(i%3===0?'#f6b9d2':'#ffe1ec')));
  scene.add(flight);
  const dummy=new T.Object3D();let elapsed=0;
  function pose() {
    petals.forEach((p,i)=>{
      const cycle=(p.phase+elapsed/p.duration)%1;
      const t=Math.min(cycle/.88,1),v=1-t;
      // A continuous Bezier path crosses the opening above its horizontal rail.
      // The last metre stays in the side aisle, outside desk/chair footprints.
      const inward=-3.4*v*v*v+3*.65*v*v*t+3*p.reach*v*t*t+p.reach*t*t*t;
      const y=p.height*v*v*v+3*3.9*v*v*t+3*2.7*v*t*t+.505*t*t*t;
      const flutter=Math.sin(t*Math.PI);
      dummy.position.set(wall-side*inward,y+Math.sin(t*19+p.spin)*.055*flutter,
        p.window+Math.min(.88,p.offset+Math.sin(t*13+p.spin)*.1*flutter
          +p.drift*T.MathUtils.smoothstep(inward,.3,.9)));
      const settle=T.MathUtils.smoothstep(t,.9,1);
      dummy.rotation.set(T.MathUtils.lerp(t*9+p.spin,-Math.PI/2,settle),
        Math.sin(t*11+p.spin)*.7*(1-settle),p.spin+t*3*(1-settle));
      const fade=T.MathUtils.smoothstep(cycle,0,.035)*(1-T.MathUtils.smoothstep(cycle,.95,1));
      dummy.scale.setScalar(p.size*fade);dummy.updateMatrix();flight.setMatrixAt(i,dummy.matrix);
    });
    flight.instanceMatrix.needsUpdate=true;
  }
  pose();
  return {update(dt,position,reducedMotion) {
    flight.visible=!reducedMotion;
    if(reducedMotion||Math.hypot(position.x-wall,position.z+28)>38)return;
    elapsed+=Math.max(0,Math.min(dt,.05));pose();
  }};
}
