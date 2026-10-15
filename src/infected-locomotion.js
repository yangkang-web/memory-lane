import * as T from 'three';

const down=new T.Vector3(0,-1,0),forward=new T.Vector3(0,0,-1);
const fract=x=>x-Math.floor(x),ease=x=>x*x*(3-2*x);
export const STRIDE_DISTANCE=2.18;
export const STANCE=.32;
// Distance, not elapsed time, drives contact. In stance the local foot moves
// backward exactly as far as the root moves forward, leaving a fixed world plant.
export function strideFoot(distance,side,index=0){
  const phase=fract(distance/STRIDE_DISTANCE+index*.173+side*.5);
  const planted=phase<STANCE,travel=STRIDE_DISTANCE*STANCE;
  let z,y,pitch;
  if(planted){z=-travel*.5+phase*STRIDE_DISTANCE;y=.105;pitch=0;}
  else{const u=(phase-STANCE)/(1-STANCE);z=travel*.5-travel*ease(u);y=.105+.34*Math.pow(Math.sin(Math.PI*u),1.35);pitch=-.75*Math.sin(Math.PI*u);}
  return {phase,planted,position:new T.Vector3(side? .135:-.135,y,z),pitch};
}

export function solveKnee(hip,ankle){
  const direction=ankle.clone().sub(hip);
  const distance=T.MathUtils.clamp(direction.length(),.03,.749);direction.normalize();
  const bend=forward.clone().addScaledVector(direction,-forward.dot(direction)).normalize();
  const along=(.42*.42-.33*.33+distance*distance)/(2*distance);
  const knee=hip.clone().addScaledVector(direction,along).addScaledVector(bend,Math.sqrt(Math.max(0,.42*.42-along*along)));
  return knee;
}

export function plantLeg(actor,leg,ankle){
  // Solve knee forward from a fixed root-space ankle. Both limb lengths stay fixed.
  actor.body.updateMatrix();
  const hip=leg.hip.position.clone().applyMatrix4(actor.body.matrix);
  const knee=solveKnee(hip,ankle);
  const inverse=actor.body.matrix.clone().invert(),localKnee=knee.clone().applyMatrix4(inverse),localAnkle=ankle.clone().applyMatrix4(inverse);
  leg.hip.quaternion.setFromUnitVectors(down,localKnee.clone().sub(leg.hip.position).normalize());
  leg.knee.quaternion.setFromUnitVectors(down,localAnkle.sub(localKnee).applyQuaternion(leg.hip.quaternion.clone().invert()).normalize());
  leg.foot.position.copy(ankle);leg.foot.rotation.set(0,0,0);
}

export function posePursuit(actor,distance,speed,index=0){
  const feet=[strideFoot(distance,0,index),strideFoot(distance,1,index)];
  const cycle=distance/STRIDE_DISTANCE*2*Math.PI+index*.173*2*Math.PI;
  // Pelvis compression on contact; counter-rotating shoulders and fixed gaze.
  const compression=Math.max(...feet.map(f=>f.planted?Math.sin(f.phase/STANCE*Math.PI):0));
  actor.body.position.set(0,-.015-.02*compression, .26);
  actor.body.rotation.set(-.29-Math.min(.04,speed*.006),Math.sin(cycle)*.07,Math.sin(cycle)*.035);
  actor.head.rotation.set(.19,-Math.sin(cycle)*.055,(index%2?1:-1)*.055);
  actor.legs.forEach((leg,i)=>{plantLeg(actor,leg,feet[i].position);leg.foot.rotation.x=feet[i].pitch;});
  actor.arms.forEach((arm,i)=>{
    const swing=Math.sin(cycle-.7+i*Math.PI),side=i?1:-1;
    arm.shoulder.rotation.set(-.18+swing*.68,side*.04,side*.055);
    arm.elbow.rotation.set(.95+Math.max(0,-swing)*.15,0,0);
    arm.palm.rotation.set(.03,side*1.2,0);arm.palm.userData.grip(.45);
  });
  actor.root.userData.contactRun=true;
  actor.root.userData.flightHeight=Math.min(...feet.map(f=>f.position.y-.105));
  return feet;
}

export function finalePursuer(time,index){
  // Staggered entry and convergence, rather than a front-facing row.
  const start=48.6+index*.31,age=Math.max(0,time-start),speed=3.8+(index%3)*.23;
  const distance=speed*age;
  const lane=[-1.45,2.1,-2.5,.7,3.1][index],sway=Math.sin(age*1.3+index)*.22;
  return {x:8+lane+sway,z:176+index*3.1-distance,y:.23,distance,speed,
    yaw:Math.atan2(-.286*Math.cos(age*1.3+index),speed)};
}
