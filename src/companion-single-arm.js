import * as T from 'three';
import { smooth, stateAt } from './last-companion-timeline.js';
import { placePalm } from './companion-performance.js';

// Authored contacts for the injured escape; the missing arm is never animated.
export function createSingleArmEscape(camera,actors,props,bag,placeholder){
  const {rig,playerArms:[,right]}=actors,axis=new T.Vector3(0,0,1);
  const releaseCamera=stateAt(379.6).camera;
  const lossState=stateAt(380.3),lossCamera=new T.PerspectiveCamera();lossCamera.position.fromArray(lossState.camera);lossCamera.lookAt(new T.Vector3(...lossState.look));lossCamera.updateMatrixWorld(true);
  const impactCamera=stateAt(362).camera;
  const firstContact=new T.Vector3(0,1.25,-.17).applyAxisAngle(new T.Vector3(0,1,0),Math.atan2(2.8-impactCamera[0],110-impactCamera[2])).add(new T.Vector3(2.8,-6.9,110));
  const stripGeometry=new T.BufferGeometry();
  stripGeometry.setAttribute('position',new T.Float32BufferAttribute([-.045,0,0,.04,0,0,.025,-.22,.015,-.045,0,0,.025,-.22,.015,-.035,-.17,-.01],3));
  stripGeometry.computeVertexNormals();
  const stripMaterial=right.elbow.children[1].material.clone();stripMaterial.side=T.DoubleSide;
  const tornCloth=new T.Mesh(stripGeometry,stripMaterial);rig.add(tornCloth);tornCloth.visible=false;
  function hold(){
    props.updateMatrix();const shaft=new T.Vector3(0,0,.24).applyMatrix4(props.matrix);
    const approach=shaft.clone().sub(right.shoulder.position).applyQuaternion(props.quaternion.clone().invert());
    const rotation=props.quaternion.clone().multiply(new T.Quaternion().setFromAxisAngle(axis,Math.atan2(approach.x,-approach.y))).multiply(new T.Quaternion().setFromEuler(new T.Euler(0,Math.PI/2,0)));
    placePalm(right,rig,shaft.sub(new T.Vector3(0,-.045,-.032).applyQuaternion(rotation)),rotation,.96);right.palm.userData.grip(.96,1);
  }
  function strike(contact,t,start,hit,end){
    const target=rig.worldToLocal(contact),ready=new T.Vector3(.45,.23,-.4),follow=target.clone().add(new T.Vector3(-.25,-.25,.04));
    const tip=ready.lerp(target,smooth(t,start,hit)).lerp(follow,smooth(t,hit,end));
    const direction=new T.Vector3(.23,-.26,-.18).sub(tip).normalize();
    props.quaternion.setFromUnitVectors(axis,direction);props.position.copy(tip).addScaledVector(direction,.4);
    const recover=smooth(t,end,end+.7);props.position.lerp(new T.Vector3(.24,-.25,-.46),recover);props.quaternion.slerp(new T.Quaternion().setFromEuler(new T.Euler(.3,-.6,-.25)),recover);hold();
  }
  function face(a,x,y,z,t){a.root.visible=true;a.root.position.set(x,y,z);a.root.rotation.y=Math.atan2(x-camera.position.x,z-camera.position.z);a.pose(t,'idle');}
  function update(t){
    tornCloth.visible=t>=378&&t<380.2;
    if(t<360||t>=386)return;
    right.shoulder.position.set(.23,-.25,-.18);
    props.position.set(.24,-.25,-.46);props.rotation.set(.3,-.6,-.25);hold();
    // Keep the pursuing group behind the close performers, with space between bodies.
    const active=new Set([...(t<365?[0]:[]),...(t>=364&&t<370?[1]:[]),...(t>=370&&t<378?[3]:[]),...(t>=378?[4]:[]),...(t>=380.3?[5]:[])]);
    for(const [i,a]of actors.enemies.entries())if(a.root.visible&&!active.has(i))a.root.position.set(5.7+(i%2)*.85,-6.9,116+Math.floor(i/2)*2.1);
    if(t<365){
      const a=actors.enemies[0],fall=smooth(t,362,363);
      face(a,2.8-.15*fall,-6.9,111.2-1.2*smooth(t,360,361.7)+.6*fall,t);
      a.body.position.y=-.65*fall;a.body.rotation.set(1.3*fall,0,-.35*fall);a.legs.forEach(l=>l.knee.rotation.x=-.7*fall);a.root.updateWorldMatrix(true,true);
      if(fall>0){a.body.position.y+=Math.max(0,-6.9-new T.Box3().setFromObject(a.body).min.y);a.root.updateWorldMatrix(true,true);}
      strike(firstContact.clone(),t,361.1,362,362.35);
    }
    if(t>=364&&t<370){
      const a=actors.enemies[1],shove=smooth(t,365.3,366.2);
      face(a,3.15+1.2*shove,-6.9,111.1+.5*shove,t);a.body.rotation.z=-.6*shove;a.body.position.y=-.2*shove;
      a.arms[0].shoulder.rotation.x=1.1*(1-shove);
      a.root.updateWorldMatrix(true,true);a.body.position.y+=Math.max(0,-6.9-new T.Box3().setFromObject(a.body).min.y);
    }
    // Hold the same bar while bracing the knuckles against the chipped pillar.
    if(t>=366.3&&t<369.8){
      const brace=smooth(t,366.3,367)*(1-smooth(t,369.1,369.8));
      const shaft=rig.worldToLocal(new T.Vector3(3.315,camera.position.y-.22,111.52));
      const rotation=rig.getWorldQuaternion(new T.Quaternion()).invert().multiply(new T.Quaternion().setFromUnitVectors(axis,new T.Vector3(.025,1,.035).normalize()));
      const position=shaft.addScaledVector(axis.clone().applyQuaternion(rotation),-.24);
      props.position.lerp(position,brace);props.quaternion.slerp(rotation,brace);hold();
    }
    if(t>=370&&t<378){
      // Launch from the right platform, pass above the lowered viewpoint, then
      // land in the track bed instead of hovering beside the platform.
      const a=actors.enemies[3],flight=smooth(t,371.6,374.8),fall=smooth(t,373.7,374.8);
      const x=6.6-7.1*flight,z=114.3+.25*flight;
      const y=-6.9+Math.sin(flight*Math.PI)*2.2-.95*fall;
      face(a,x,y,z,t);a.root.rotation.y=Math.PI/2;
      a.body.rotation.set(-.7-1.0*smooth(t,371.6,372.4),0,0);
      a.body.position.y=.25*fall;a.legs.forEach(l=>{l.hip.rotation.x=.5;l.knee.rotation.x=-.55;});
      a.arms.forEach((arm,i)=>{arm.shoulder.rotation.set(2.2-2.1*fall,0,(i?1:-1)*(.16+.3*fall));arm.elbow.rotation.x=-.3;});
    }
    if(t>=378){
      placeholder.visible=false;const a=actors.enemies[4],release=smooth(t,379.2,379.6);
      const anchor=t<379.6?camera.position:new T.Vector3(...releaseCamera);
      face(a,anchor.x+.35+release*.3,-6.9,anchor.z+.65,t);a.body.rotation.x=.45*release;a.body.position.y=-.18*release;
      const cloth=new T.Vector3(.22,-.09,-.5),pull=smooth(t,378,379.2);
      cloth.x+=.09*pull;cloth.y+=.06*pull;
      if(tornCloth.parent!==rig)rig.add(tornCloth);tornCloth.position.copy(cloth);tornCloth.rotation.set(.3,0,-.25);
      const hem=smooth(t,379.2,379.45),positions=stripGeometry.attributes.position;
      positions.setXYZ(2,.025,-.65+.43*hem,.25*(1-hem));positions.setXYZ(4,.025,-.65+.43*hem,.25*(1-hem));positions.setXYZ(5,-.035,-.59+.42*hem,.25*(1-hem));positions.needsUpdate=true;stripGeometry.computeVertexNormals();
      a.root.updateWorldMatrix(true,true);
      const grab=rig.localToWorld(cloth.clone()),rotation=rig.getWorldQuaternion(new T.Quaternion()).multiply(new T.Quaternion().setFromEuler(new T.Euler(0,Math.PI/2,0)));
      const center=grab.clone().sub(new T.Vector3(0,-.045,-.032).applyQuaternion(rotation));
      const localRotation=a.body.getWorldQuaternion(new T.Quaternion()).invert().multiply(rotation);
      if(t<379.6){placePalm(a.arms[0],a.body,a.body.worldToLocal(center),localRotation,.95);a.arms[0].palm.userData.grip(.95,1);}else{a.arms[0].shoulder.rotation.set(.1,0,-.25);a.arms[0].palm.userData.grip(.1);}
      if(t<379.6)strike(grab,t,378.4,379.2,379.6);
      if(t>=379.2){tornCloth.position.x+=release*.18;tornCloth.position.y-=smooth(t,379.6,380.2)*.8;tornCloth.rotation.z-=release*1.1;}
      // The same collected bag is pulled off the back; the one free hand stays on the bar.
      if(bag.parent!==actors.root)actors.root.add(bag);bag.visible=t>=380.3&&t<384;const loss=smooth(t,380.3,383.5);
      bag.position.set(-.26-loss*.9,-.55+Math.sin(loss*Math.PI)*.12,-.65-loss*.8).applyMatrix4(lossCamera.matrixWorld);bag.quaternion.copy(lossCamera.quaternion).multiply(new T.Quaternion().setFromEuler(new T.Euler(.3*loss,.7,-.3-loss)));
      if(t>=380.3){
        bag.updateWorldMatrix(true,true);const strap=bag.localToWorld(new T.Vector3(0,.50,0));
        const away=strap.clone().sub(camera.position);away.y=0;away.normalize();
        const thief=actors.enemies[5];face(thief,strap.x+away.x*.28,-6.9,strap.z+away.z*.28,t);thief.root.updateWorldMatrix(true,true);
        const rotation=bag.getWorldQuaternion(new T.Quaternion()).multiply(new T.Quaternion().setFromAxisAngle(axis,Math.PI));
        const center=strap.clone().sub(new T.Vector3(0,-.045,-.032).applyQuaternion(rotation));
        const localRotation=thief.body.getWorldQuaternion(new T.Quaternion()).invert().multiply(rotation);
        placePalm(thief.arms[1],thief.body,thief.body.worldToLocal(center),localRotation,.95,new T.Vector3(0,-1,0));thief.arms[1].palm.userData.grip(.95,1);
      }
    }
  }
  return {update,tornCloth,dispose(){tornCloth.removeFromParent();stripGeometry.dispose();stripMaterial.dispose();}};
}
