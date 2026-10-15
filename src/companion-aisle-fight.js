import * as T from 'three';
import { smooth } from './last-companion-timeline.js';
import { placePalm } from './companion-performance.js';

export function createAisleFight(camera,actors,props,shelf){
  const {rig,playerArms:[,right]}=actors,grabber=actors.enemies[2],kicked=actors.enemies[5];
  const axis=new T.Vector3(0,0,1),turn=new T.Quaternion().setFromEuler(new T.Euler(0,Math.PI/2,0));
  const kick=new T.Group();rig.add(kick);
  const boot=actors.boots.children[2].clone(),shin=actors.boots.children[3].clone();
  boot.position.set(0,0,0);kick.add(boot);
  const sole=new T.Mesh(new T.BoxGeometry(.15,.026,.27),boot.material);sole.position.y=-.065;kick.add(sole);
  for(let i=0;i<4;i++){const lace=new T.Mesh(new T.BoxGeometry(.10,.009,.014),actors.playerArms[1].elbow.children[2].material);lace.position.set(0,.061,-.07+i*.032);kick.add(lace);}rig.add(shin);kick.visible=shin.visible=false;
  function gripPipe(){
    props.updateMatrix();
    const shaft=new T.Vector3(0,0,.24).applyMatrix4(props.matrix);
    const approach=shaft.clone().sub(right.shoulder.position).applyQuaternion(props.quaternion.clone().invert());
    const roll=new T.Quaternion().setFromAxisAngle(axis,Math.atan2(approach.x,-approach.y));
    const rotation=props.quaternion.clone().multiply(roll).multiply(turn);
    placePalm(right,rig,shaft.sub(new T.Vector3(0,-.045,-.032).applyQuaternion(rotation)),rotation,.95);
    right.palm.userData.grip(.95,1);
  }
  function update(t){
    kick.visible=shin.visible=t>=159.25&&t<161.2;
    const impact=smooth(t,158.2,158.4),settle=smooth(t,158.4,159.4);
    shelf.rotation.z=-impact*(.06+Math.sin((t-158.4)*24)*.025*(1-settle));
    if(t<154||t>=163)return;
    for(const [i,a]of actors.enemies.entries())if(a.root.visible&&i!==2&&(i!==5||t<159)){a.root.position.set(25.9-Math.floor(i/2)*.7,.3,40.5+(i%2)*5.3);}
    const hit=smooth(t,154.8,155.1),slam=smooth(t,157.5,158.4),fall=smooth(t,158.4,159.15);
    grabber.root.visible=true;grabber.root.position.set(27.75+.12*hit-.07*smooth(t,155.5,156),.3,41.95+.15*smooth(t,155.5,156)).lerp(new T.Vector3(27.55,.3,42.745),slam);
    grabber.root.rotation.y=-Math.PI/2;grabber.pose(t,'idle');
    grabber.body.position.y=-.12*smooth(t,155.5,156)*(1-fall)-fall*.42;grabber.body.rotation.set(.12*hit-.2*smooth(t,155.5,156)-.7*fall,0,.2*fall);grabber.head.rotation.x=-.15*impact;
    grabber.root.updateWorldMatrix(true,true);
    right.shoulder.position.set(.23,-.25,-.17-.08*slam);
    const heldPosition=new T.Vector3(.12,.08-.28*smooth(t,159,159.5),-.34);
    const heldRotation=new T.Quaternion().setFromEuler(new T.Euler(.08,-1.45,-.25));
    const clearImpact=smooth(t,157.9,158.2);heldPosition.lerp(new T.Vector3(.37,-.35,-.46),clearImpact);heldRotation.slerp(new T.Quaternion().setFromEuler(new T.Euler(.2,-.7,-.25)),clearImpact);
    if(t<156){
      const contact=rig.worldToLocal(grabber.body.localToWorld(new T.Vector3(0,1.35,-.17)));
      const u=smooth(t,154.1,154.8),release=smooth(t,154.8,155.4);
      const tip=new T.Vector3(.46,.18,-.35).lerp(contact,u).lerp(new T.Vector3(-.3,-.2,-.65),release);
      const direction=new T.Vector3(.23,-.22,-.22).sub(tip).normalize();
      props.position.copy(tip).addScaledVector(direction,.4);props.quaternion.setFromUnitVectors(axis,direction);
      const secondSwing=smooth(t,155.4,156);props.position.lerp(heldPosition,secondSwing);props.quaternion.slerp(heldRotation,secondSwing);
    }else{
      props.position.copy(heldPosition);props.quaternion.copy(heldRotation);
    }
    gripPipe();
    if(t>=156&&t<157.9){
      right.elbow.updateWorldMatrix(true,false);
      const cloth=right.elbow.localToWorld(new T.Vector3(0,-.25,.055));
      const orientation=grabber.body.getWorldQuaternion(new T.Quaternion()).invert().multiply(rig.getWorldQuaternion(new T.Quaternion())).multiply(new T.Quaternion().setFromEuler(new T.Euler(-Math.PI/2,0,.7)));
      const target=grabber.body.worldToLocal(cloth);
      placePalm(grabber.arms[0],grabber.body,target.sub(new T.Vector3(0,-.045,-.032).applyQuaternion(orientation)),orientation,.96,new T.Vector3(0,-1,0));
      grabber.arms[0].palm.userData.grip(.96,1);
    }
    if(t>=159){
      kicked.root.visible=true;kicked.pose(t,'idle');
      const recoil=smooth(t,160,160.7);
      kicked.root.position.set(29.05+recoil*.05,.3,43.55+recoil*.95);kicked.root.rotation.y=Math.atan2(kicked.root.position.x-camera.position.x,kicked.root.position.z-camera.position.z);
      kicked.body.position.y=-.6*recoil;kicked.body.rotation.x=1.1*recoil;kicked.legs.forEach(l=>{l.hip.rotation.x=.35*recoil;l.knee.rotation.x=-.7*recoil;});kicked.root.updateWorldMatrix(true,true);
      const contact=rig.worldToLocal(kicked.body.localToWorld(new T.Vector3(0,.95,-.17)));
      const thrust=smooth(t,159.3,160)*(1-smooth(t,160.1,161.1));
      kick.rotation.set(1.15*thrust,.22*thrust,-.15*thrust);
      kick.position.set(.14,-.9,-.35).lerp(contact.sub(new T.Vector3(0,-.078,-.03).applyQuaternion(kick.quaternion)),thrust);
      const ankle=new T.Vector3(0,.02,.08).applyQuaternion(kick.quaternion).add(kick.position),hip=new T.Vector3(.14,-.78,.05);
      shin.position.copy(ankle).lerp(hip,.5);shin.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),hip.clone().sub(ankle).normalize());shin.scale.y=hip.distanceTo(ankle)/.4;


    }
  }
  return {update,kick};
}
