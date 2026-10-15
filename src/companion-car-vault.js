import * as T from 'three';
import { smooth } from './last-companion-timeline.js';
import { placePalm } from './companion-performance.js';

// The camera crosses the bonnet, not the taller passenger cabin. A fixed world
// contact carries the body until push-off, then the knees tuck clear of the car.
export function createCarVault(actors,props,car){
  const {rig,playerArms:[left,right]}=actors;
  const legs=new T.Group();rig.add(legs);legs.visible=false;
  const feet=[],details=[];
  for(const side of [-1,1]){
    const foot=actors.boots.children[side<0?0:2].clone();foot.position.set(0,0,0);
    const shin=actors.boots.children[side<0?1:3].clone();legs.add(foot,shin);feet.push({foot,shin,side});
    const soleGeometry=new T.BoxGeometry(.15,.022,.26);details.push(soleGeometry);const sole=new T.Mesh(soleGeometry,foot.material);sole.position.y=-.064;foot.add(sole);
    const laceGeometry=new T.BoxGeometry(.09,.008,.012);details.push(laceGeometry);
    for(let i=0;i<4;i++){const lace=new T.Mesh(laceGeometry,actors.playerArms[1].elbow.children[2].material);lace.position.set(0,.061,-.06+i*.031);foot.add(lace);}
  }
  const axis=new T.Vector3(0,0,1),handTurn=new T.Quaternion().setFromEuler(new T.Euler(0,Math.PI/2,0));
  function update(t){
    legs.visible=t>=252.65&&t<256.3;
    if(t<250.5||t>=258)return;
    rig.updateWorldMatrix(true,true);car.updateWorldMatrix(true,false);
    const reach=smooth(t,250.7,251.9),release=smooth(t,252.65,253.25),settle=smooth(t,256.3,258);
    left.shoulder.position.set(-.27,-.42,.10);
    const contact=rig.worldToLocal(car.localToWorld(new T.Vector3(.62,.96,1.72)));
    const palmRotation=rig.getWorldQuaternion(new T.Quaternion()).invert().multiply(new T.Quaternion().setFromEuler(new T.Euler(-Math.PI/2,0,0)));
    const center=new T.Vector3(-.22,-.5,-.28).lerp(contact,reach).lerp(new T.Vector3(-.36,-.25,-.36),release);
    center.lerp(new T.Vector3(-.22,-.5,-.28),settle);
    placePalm(left,rig,center,palmRotation,.06,new T.Vector3(-1,-.3,.1));
    // Carry the pipe clear of the body; the supporting hand stays open.
    props.position.set(.31,-.28,-.43);props.rotation.set(.15,-.6,-.35);
    props.updateMatrix();right.shoulder.position.set(.27,-.42,.1);
    const shaft=new T.Vector3(0,0,.24).applyMatrix4(props.matrix);
    const fore=shaft.clone().sub(right.shoulder.position).applyQuaternion(props.quaternion.clone().invert());
    const roll=new T.Quaternion().setFromAxisAngle(axis,Math.atan2(fore.x,-fore.y));
    const rotation=props.quaternion.clone().multiply(roll).multiply(handTurn);
    placePalm(right,rig,shaft.sub(new T.Vector3(0,-.045,-.032).applyQuaternion(rotation)),rotation,.95);
    right.palm.userData.grip(.95,1);
    const tuck=smooth(t,252,252.65)*(1-smooth(t,254.8,256.3));
    for(const {foot,shin,side}of feet){
      foot.position.set(side*.16,-1.05+.75*tuck,-.18-.36*tuck+(side<0?.08:0));foot.rotation.set(-.12+.5*tuck,side*.12,side*.08);
      const ankle=foot.position.clone().add(new T.Vector3(0,.04,.07)),knee=new T.Vector3(side*.16,-.6+.25*tuck,-.18-.21*tuck);
      shin.position.copy(ankle).lerp(knee,.5);shin.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),knee.clone().sub(ankle).normalize());shin.scale.y=knee.distanceTo(ankle)/.4;
    }
  }
  return {update,legs,dispose(){legs.removeFromParent();details.forEach(g=>g.dispose());}};
}
