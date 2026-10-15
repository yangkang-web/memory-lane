import * as T from 'three';

// Hold one corner while the far rail scrapes the plaza; solve the tilt from the
// actual hand height so a moving giant never carries an upright, floating fence.
export function dragFence(fence,grip,time){
  const ground=.25,span=3.2,y=T.MathUtils.clamp((ground-grip.y)/span,-.9,-.05);
  const x=.2+Math.sin(time*3.1)*.025,z=Math.sqrt(1-x*x-y*y);
  const along=new T.Vector3(x,y,z),across=new T.Vector3(z,0,-x).normalize();
  const normal=new T.Vector3().crossVectors(along,across).normalize();
  fence.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(along,across,normal));
  const localGrip=new T.Vector3(-1.6,.15,0).applyQuaternion(fence.quaternion);
  fence.position.copy(grip).sub(localGrip);fence.updateWorldMatrix(true,true);
}
