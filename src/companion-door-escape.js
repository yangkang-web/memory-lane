import * as T from 'three';
import { smooth } from './last-companion-timeline.js';
import { placePalm } from './companion-performance.js';

const pulse=(t,at)=>t<at?0:Math.sin((t-at)*19)*Math.exp(-(t-at)*7);
export function maintenanceAngle(t){
  const closing=(1-smooth(t,387.8,391.1))*1.35;
  const held=.16*(1-smooth(t,391.4,393.1));
  return Math.max(closing,held)+smooth(t,408.8,409.6)*1.25;
}
export function gatePose(t){
  return {fall:smooth(t,418.3,419.5)*Math.PI*.48,
    shake:pulse(t,412)*.018+pulse(t,415)*.055,
    lock:smooth(t,415,415.4),broken:smooth(t,418.3,419)};
}

export function createDoorEscapeDetails({items,metro,group,box,mesh,metal,rust,dark}){
  const door=items.maintenanceDoor;
  // The handle and frame keeper share a horizontal passage for the actual crowbar.
  items.maintenanceGrip=group(door,.15,1.38,1.55);
  const handle=new T.CatmullRomCurve3([
    new T.Vector3(-.10,0,-.14),new T.Vector3(0,0,-.14),
    new T.Vector3(0,0,.14),new T.Vector3(-.10,0,.14),
  ]);
  mesh(items.maintenanceGrip,new T.TubeGeometry(handle,16,.018,8),metal,0,0,0,true);
  for(const z of [1.41,1.69])box(door,.025,.13,.07,rust,.055,1.38,z,true);
  items.doorBar=group(door,.10,1.38,1.79);
  for(const z of [121.96,124.04])box(metro,.25,2.85,.12,metal,4,-5.5,z);
  box(metro,.25,.12,2.2,metal,4,-4.12,123);
  for(const z of [123.98,124.12])box(metro,.16,.12,.035,rust,4.13,-5.52,z);
  box(metro,.035,.12,.18,metal,4.21,-5.52,124.05);
  // A stressed latch remains engaged after the protagonist pulls the bar free.
  items.maintenanceLatch=box(door,.1,.035,.23,metal,.11,1.25,1.99,true);
  const doorLight=new T.PointLight('#a6b8a5',3.5,4,2);doorLight.position.set(5.5,-4.5,123.5);metro.add(doorLight);
  const gate=items.gate;
  for(const y of [.08,2.52])box(gate,2.2,.075,.07,metal,1.1,y,0,true);
  for(const x of [.03,2.17])box(gate,.07,2.6,.075,metal,x,1.3,0,true);
  for(const y of [.4,2.2])box(metro,.17,.16,.17,rust,6.89,y,139.5);
  for(const x of [6.85,9.15])box(metro,.12,2.8,.16,metal,x,1.3,139.5);
  items.gateLock=group(gate,2.1,1.1,-.065);
  box(items.gateLock,.16,.21,.055,rust,0,0,0,true);
  box(items.gateLock,.24,.045,.045,metal,.1,0,-.02,true);
  box(metro,.08,.2,.12,metal,9.15,1,139.5);
  items.gateLockChip=box(metro,.15,.18,.045,rust,9.02,1,139.5,true);
  function update(t){
    door.rotation.y=maintenanceAngle(t);
    items.maintenanceLatch.position.z=1.99+smooth(t,392,394)*.04;
    items.maintenanceLatch.rotation.x=smooth(t,392,394)*.12;
    const g=gatePose(t);gate.rotation.x=g.fall;gate.rotation.y=g.shake;
    items.gateLock.rotation.y=g.lock*.4;items.gateLock.position.x=2.1-g.lock*.06;
    items.gateLock.visible=t<418.3;items.gateLockChip.visible=t>=418.3;
    items.gateLockChip.position.set(9.02+g.broken*.08,1-g.broken*.87,139.5+g.broken*.6);
    items.gateLockChip.rotation.set(g.broken*2,g.broken,0);
  }
  return {update};
}

export function createDoorEscapePerformance(actors,props,sets){
  const {rig,playerArms:[,right]}=actors;
  const local=(object,p)=>rig.worldToLocal(object.localToWorld(new T.Vector3(...p)));
  function update(t){
    if(t<387.8||t>=395.2)return;
    const door=sets.items.maintenanceDoor,anchor=sets.items.doorBar;
    door.updateWorldMatrix(true,true);rig.updateWorldMatrix(true,true);
    right.shoulder.position.set(.22,-.30,-.04);
    if(t<390.7){
      // With one hand the bar rests against the forearm while the palm pulls the loop.
      props.visible=true;props.position.set(.29,-.47,-.32);props.rotation.set(.9,0,-.18);
      const center=local(sets.items.maintenanceGrip,[.025,-.02,.02]);
      const orientation=rig.getWorldQuaternion(new T.Quaternion()).invert().multiply(door.getWorldQuaternion(new T.Quaternion())).multiply(new T.Quaternion().setFromEuler(new T.Euler(0,0,Math.PI/2)));
      placePalm(right,rig,center,orientation,.78);
      return;
    }
    props.visible=true;
    const inserted=smooth(t,390.7,391.6)*(1-smooth(t,394,395.2));
    const destination=local(anchor,[0,0,-.20*(1-smooth(t,390.7,391.6))]);
    props.position.lerp(destination,inserted);
    const direction=rig.getWorldQuaternion(new T.Quaternion()).invert().multiply(door.getWorldQuaternion(new T.Quaternion()));
    props.quaternion.slerp(direction,inserted);props.updateMatrix();
    // The hand follows the same physical shaft during insertion and retrieval.
    const grip=new T.Vector3(.032,.045,-.16).applyMatrix4(props.matrix);
    const orientation=props.quaternion.clone().multiply(new T.Quaternion().setFromEuler(new T.Euler(0,Math.PI/2,0)));
    if(t<392||t>=394)placePalm(right,rig,grip,orientation,.95);
    else{
      // Release the seated bar and brace the door with the palm and shoulder.
      const contact=local(door,[.08,1.62,1.5]);
      const palmRotation=rig.getWorldQuaternion(new T.Quaternion()).invert().multiply(door.getWorldQuaternion(new T.Quaternion())).multiply(new T.Quaternion().setFromEuler(new T.Euler(0,-Math.PI/2,0)));
      placePalm(right,rig,contact,palmRotation,.12);
    }
  }
  return {update};
}
