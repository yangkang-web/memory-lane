import * as T from 'three';
import { smooth } from './last-companion-timeline.js';
import { placePalm } from './companion-performance.js';

export function createStoreAmbush(camera,actors,props){
  const {rig,playerArms:[left,right]}=actors,enemy=actors.enemies[1];
  const axis=new T.Vector3(0,0,1),handTurn=new T.Quaternion().setFromEuler(new T.Euler(0,Math.PI/2,0));
  const kneeGeometry=new T.SphereGeometry(1,20,14),legGeometry=new T.CylinderGeometry(.105,.085,1,16);
  const knee=new T.Mesh(kneeGeometry,actors.boots.children[1].material);knee.scale.set(.105,.13,.12);
  const thigh=new T.Mesh(legGeometry,knee.material),shin=new T.Mesh(legGeometry,knee.material),foot=actors.boots.children[2].clone();
  const leg=new T.Group();rig.add(leg);leg.add(knee,thigh,shin,foot);leg.visible=false;
  function grip(arm,z,blend=1){
    props.updateMatrix();const shaft=new T.Vector3(0,0,z).applyMatrix4(props.matrix);
    const approach=shaft.clone().sub(arm.shoulder.position).applyQuaternion(props.quaternion.clone().invert());
    const roll=new T.Quaternion().setFromAxisAngle(axis,Math.atan2(approach.x,-approach.y));
    const rotation=props.quaternion.clone().multiply(roll).multiply(handTurn);
    const center=shaft.sub(new T.Vector3(0,-.045,-.032).applyQuaternion(rotation));
    if(blend<1)center.lerp(new T.Vector3(-.22,-.5,-.28),1-blend);
    placePalm(arm,rig,center,rotation,.95*blend);arm.palm.userData.grip(.95*blend,blend);
  }
  function limb(mesh,a,b){mesh.position.copy(a).lerp(b,.5);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());mesh.scale.y=a.distanceTo(b);}
  function update(t){
    leg.visible=t>=129.15&&t<131.6;
    if(t<120||t>=134)return;
    actors.boots.visible=false;enemy.root.visible=true;enemy.pose(t,'idle');
    const hit=smooth(t,120,122.5),push=smooth(t,130,130.6),retreat=smooth(t,130.6,134),stand=smooth(t,131,134);
    enemy.root.position.set(26.7,.3,40.4).lerp(new T.Vector3(25.7,.3,39.2),hit).lerp(new T.Vector3(21.75,.3,43.12),retreat);
    enemy.root.position.addScaledVector(new T.Vector3(.707,0,.707),push*(1-retreat)*.6);
    enemy.root.rotation.y=Math.atan2(enemy.root.position.x-camera.position.x,enemy.root.position.z-camera.position.z);
    enemy.body.position.y=-.16*(hit*(1-stand))**2;enemy.body.rotation.x=-.06*hit+.28*push*(1-stand);
    enemy.legs.forEach(l=>{l.hip.rotation.x=.9*hit*(1-stand);l.knee.rotation.x=-1.8*hit*(1-stand);});
    const bite=(smooth(t,126.4,126.8)*(1-smooth(t,126.8,127.1))+smooth(t,127.4,127.8)*(1-smooth(t,127.8,128.1)));
    enemy.head.rotation.set(.13-.5*bite,-.3*bite,.08);enemy.jaw.visible=t>=122&&t<131;enemy.jaw.scale.y=1+.8*bite;
    enemy.root.updateWorldMatrix(true,true);
    enemy.body.position.y+=Math.max(0,.3-new T.Box3().setFromObject(enemy.body).min.y);
    enemy.root.updateWorldMatrix(true,true);rig.updateWorldMatrix(true,true);
    const chest=rig.worldToLocal(enemy.body.localToWorld(new T.Vector3(-.21*bite,1.25+.29*bite,-.23+.14*bite)));
    const blockRotation=new T.Quaternion().setFromEuler(new T.Euler(0,Math.PI/2,0));
    const block=smooth(t,120,121.7);
    props.position.lerp(chest,block);props.quaternion.slerp(blockRotation,block);
    // The pipe holds the torso away from the camera; knees then create room for the swing.
    if(t>=130){
      const lower=smooth(t,130,131.1);props.position.lerp(new T.Vector3(.23,-.3,-.5),lower);
      const ready=new T.Vector3(.6,.2,-.37),direction=new T.Vector3(.25,-.26,-.25).sub(ready).normalize(),prepare=smooth(t,131.1,134);
      props.position.lerp(ready.addScaledVector(direction,.4),prepare);props.quaternion.slerp(new T.Quaternion().setFromUnitVectors(axis,direction),prepare);
    }
    right.shoulder.position.set(.23,-.26,-.2);left.shoulder.position.set(-.23,-.26,-.2);
    grip(right,.24);grip(left,-.25,1-smooth(t,130.3,131.3));
    if(t>=122&&t<130.3){
      for(const [i,arm]of enemy.arms.entries()){
        const wrist=actors.playerArms[i?0:1],side=i?-1:1;wrist.elbow.updateWorldMatrix(true,false);
        const target=enemy.body.worldToLocal(wrist.elbow.localToWorld(new T.Vector3(side*.075,-.25,.025)));
        const rotation=enemy.body.getWorldQuaternion(new T.Quaternion()).invert().multiply(wrist.elbow.getWorldQuaternion(new T.Quaternion())).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),side*Math.PI/2));
        placePalm(arm,enemy.body,target,rotation,.55,new T.Vector3(i?1:-1,-1,0));
      }
    }
    if(leg.visible){
      // Contact is authored at the instant of the knee strike, then released as the enemy recoils.
      const contact=new T.Vector3(25.7,.3,39.2).add(new T.Vector3(0,.97,-.20).applyEuler(new T.Euler(-.06,0,0)).add(new T.Vector3(0,-.16,0)).applyAxisAngle(new T.Vector3(0,1,0),Math.PI/4));
      const target=rig.worldToLocal(contact),thrust=smooth(t,129.2,130)*(1-smooth(t,130.05,131.5));
      knee.position.set(.15,-.9,-.1).lerp(target.add(new T.Vector3(0,0,.12)),thrust);
      foot.position.copy(knee.position).add(new T.Vector3(.01,-.35,.22));foot.rotation.set(-.4,0,0);
      limb(thigh,new T.Vector3(.15,-.8,.12),knee.position);limb(shin,knee.position,foot.position.clone().add(new T.Vector3(0,.04,.05)));
    }
  }
  return {update,leg,knee,dispose(){leg.removeFromParent();kneeGeometry.dispose();legGeometry.dispose();}};
}
