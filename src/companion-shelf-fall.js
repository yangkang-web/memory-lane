import * as T from 'three';
import { smooth } from './last-companion-timeline.js';

export function createShelfFall(shelf,bottles,parent){
  const glass=bottles[0].children[0].material;
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute([-.025,0,-.02,.038,0,-.012,.006,.012,.045],3));geometry.computeVertexNormals();
  const shards=new T.InstancedMesh(geometry,glass,bottles.length*6);shards.frustumCulled=false;shards.castShadow=shards.receiveShadow=true;parent.add(shards);
  const dummy=new T.Object3D();
  const origins=bottles.map(b=>b.position.clone()),base=shelf.position.clone();
  function pose(t){
    // The rack falls away from the player; the impact throws loose bottles over its front lip.
    const rotation=new T.Quaternion().setFromEuler(new T.Euler(-smooth(t,121.4,125.8)*1.35,0,0,'YXZ'));
    const position=base.clone().add(new T.Vector3(0,0,-.335-.18*smooth(t,121,122))).add(new T.Vector3(0,0,.335).applyQuaternion(rotation));
    return {rotation,position};
  }
  function release(i){
    const at=121.9+i*.08,frame=pose(at);
    const position=origins[i].clone().applyQuaternion(frame.rotation).add(frame.position);
    const velocity=new T.Vector3(i>5?1.6:.3,.7,i>5?.8:-.4);
    const duration=(.7+Math.sqrt(.49+19.6*(position.y-.31)))/9.8;
    return {at,rotation:frame.rotation,position,velocity,duration};
  }
  function update(t){
    const frame=pose(t);shelf.quaternion.copy(frame.rotation);shelf.position.copy(frame.position);
    shards.visible=t>=121.9;
    for(const [i,bottle]of bottles.entries()){
      const r=release(i),age=t-r.at;
      bottle.visible=age<r.duration;
      if(age<0){if(bottle.parent!==shelf)shelf.add(bottle);bottle.position.copy(origins[i]);bottle.rotation.set(0,0,0);}
      else{
        if(bottle.parent!==parent)parent.add(bottle);
        bottle.position.copy(r.position).addScaledVector(r.velocity,Math.min(age,r.duration));bottle.position.y-=4.9*Math.min(age,r.duration)**2;
        bottle.quaternion.copy(r.rotation).multiply(new T.Quaternion().setFromEuler(new T.Euler(-age*1.7,age*.6,Math.sin(i)*age)));
      }
      for(let j=0;j<6;j++){
        const a=age-r.duration,index=i*6+j;
        dummy.scale.setScalar(a<0?0:1+(j%3)*.3);
        const spread=Math.min(1,Math.max(0,a)*3),theta=(i*2.399+j)*1.7;
        dummy.position.copy(r.position).addScaledVector(r.velocity,r.duration);
        dummy.position.x+=Math.cos(theta)*spread*(.06+j*.025);dummy.position.z+=Math.sin(theta)*spread*(.06+j*.025);
        dummy.position.y=.306+Math.max(0,Math.sin(Math.min(Math.PI,Math.max(0,a)*7)))*.13;
        dummy.rotation.set(0,theta,0);dummy.updateMatrix();shards.setMatrixAt(index,dummy.matrix);
      }
    }
    shards.instanceMatrix.needsUpdate=true;
  }
  return {update,shards,dispose(){shards.removeFromParent();geometry.dispose();}};
}
