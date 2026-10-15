import * as T from 'three';
import { smooth } from './last-companion-timeline.js';
import { placePalm } from './companion-performance.js';

// The collected backpack is the same object used during the struggle.
export function createBackpackStruggle(camera,actors,bag,props,placeholder){
  const {rig,playerArms:[left,right]}=actors,enemy=actors.enemies[3];
  const axis=new T.Vector3(0,0,1),turn=new T.Quaternion().setFromEuler(new T.Euler(0,0,Math.PI));
  function grasp(arm,parent,point,worldRotation){
    parent.updateWorldMatrix(true,false);
    const center=point.clone().sub(new T.Vector3(0,-.045,-.032).applyQuaternion(worldRotation));
    const orientation=parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(worldRotation);
    placePalm(arm,parent,parent.worldToLocal(center),orientation,.95);
    arm.palm.userData.grip(.95,1);
  }
  function update(t){
    if(t<163||t>=178)return;
    actors.enemies.forEach((other,i)=>{
      if(other===enemy||!other.root.visible||i===4&&t>=171)return;
      other.root.position.set(camera.position.x-1.9-Math.floor(i/2)*.7,.3,42+(i%2)*3.8);
    });
    if(t>=171)return;
    placeholder.visible=false;
    const recoil=smooth(t,168,168.45),push=smooth(t,169.6,170.1);
    enemy.root.position.set(28.5,.3,44+Math.sin(3)*.65).lerp(new T.Vector3(camera.position.x-.76-recoil*.16-push*.14,.3,43.8),smooth(t,163,163.8));
    enemy.root.rotation.y=-Math.PI/2;
    enemy.pose(t,'idle');enemy.body.position.y=-.08*recoil;
    enemy.body.rotation.x=.24*recoil+.12*push;enemy.head.rotation.x=-.16*recoil;enemy.jaw.visible=t<168;
    enemy.root.updateWorldMatrix(true,true);

    if(bag.parent!==rig)rig.add(bag);bag.visible=true;
    const ready=new T.Vector3(-.2,-.56,-.46);
    ready.x-=smooth(t,165,166.6)*.12;
    ready.y+=Math.sin(t*19)*.006*(1-recoil);
    const strike=smooth(t,167.2,168)*(1-smooth(t,168.05,168.75));
    bag.rotation.set(.12*strike,-.3*(1-strike),-.25*(1-strike));
    const contact=rig.worldToLocal(enemy.body.localToWorld(new T.Vector3(0,1.2,-.17)));
    const front=new T.Vector3(0,.22,-.13).applyQuaternion(bag.quaternion);
    bag.position.copy(ready).lerp(contact.sub(front),strike);
    bag.position.y-=smooth(t,169.7,171)*.65;
    bag.updateWorldMatrix(true,true);
    left.shoulder.position.set(-.25,-.28,-.1);
    const gripRotation=bag.getWorldQuaternion(new T.Quaternion()).multiply(turn);
    grasp(left,rig,bag.localToWorld(new T.Vector3(-.14,.4,-.13)),gripRotation);
    if(t<167.4){
      // The pursuer catches the other shoulder strap, then loses it during the swing.
      grasp(enemy.arms[1],enemy.body,bag.localToWorld(new T.Vector3(.14,.27,-.22)),gripRotation);
    }else enemy.arms[1].shoulder.rotation.set(.3,0,.65*recoil);

    if(t>=168.8){
      right.shoulder.position.set(.23,-.25,-.25);
      const thrust=smooth(t,168.8,169.6)*(1-smooth(t,169.8,170.8));
      const heldPosition=props.position.clone(),heldRotation=props.quaternion.clone();
      const tip=rig.worldToLocal(enemy.body.localToWorld(new T.Vector3(.02,1.27,-.18)));
      const direction=new T.Vector3(.22,-.26,-.25).sub(tip).normalize();
      props.position.copy(heldPosition).lerp(tip.clone().addScaledVector(direction,.4),thrust);
      props.quaternion.copy(heldRotation).slerp(new T.Quaternion().setFromUnitVectors(axis,direction),thrust);
      props.updateWorldMatrix(true,true);
      const rotation=props.getWorldQuaternion(new T.Quaternion()).multiply(new T.Quaternion().setFromEuler(new T.Euler(0,Math.PI/2,0)));
      grasp(right,rig,props.localToWorld(new T.Vector3(0,0,.24)),rotation);
    }
  }
  return {update};
}
