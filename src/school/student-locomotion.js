import * as T from 'three';
import data from './data/student-locomotion.json' with {type:'json'};

// CC0 animation curves by Quaternius. Offline-extracted normalized rotations;
// All humanoid joints are sampled; contact correction is applied after the authored pose.
export function sampleLocomotion(phase,runMix) {
  const frame=clip=>{
    const f=clip.frames,p=((phase%1)+1)%1*(f.length-1),i=Math.floor(p);
    return [f[i],f[i+1],p-i];
  };
  const w=frame(data.clips.walk),r=frame(data.clips.jog),pose={};
  for(const name of Object.keys(w[0])){
    if(name==='feet'){pose.feet=w[0].feet.map((v,i)=>new T.Vector3().fromArray(v).lerp(new T.Vector3().fromArray(w[1].feet[i]),w[2]).lerp(new T.Vector3().fromArray(r[0].feet[i]).lerp(new T.Vector3().fromArray(r[1].feet[i]),r[2]),runMix));continue;}
    if(name==='pelvis'){
      pose.pelvis=new T.Vector3().fromArray(w[0][name]).lerp(new T.Vector3().fromArray(w[1][name]),w[2]);
      const jog=new T.Vector3().fromArray(r[0][name]).lerp(new T.Vector3().fromArray(r[1][name]),r[2]);
      jog.y=.895+(jog.y-.85)*.65;
      pose.pelvis.lerp(jog,runMix);
      continue;
    }
    const a=new T.Quaternion().fromArray(w[0][name]).slerp(new T.Quaternion().fromArray(w[1][name]),w[2]);
    const b=new T.Quaternion().fromArray(r[0][name]).slerp(new T.Quaternion().fromArray(r[1][name]),r[2]);
    pose[name]=a.normalize().slerp(b.normalize(),runMix).normalize();
  }
  return pose;
}

export function sampleIdle(time) {
  const clip=data.clips.idle,frames=clip.frames,p=((time/clip.duration)%1+1)%1*(frames.length-1),i=Math.floor(p),pose={};
  for(const name of Object.keys(frames[0]))if(name!=='feet')pose[name]=name==='pelvis'?new T.Vector3().fromArray(frames[i][name]).lerp(new T.Vector3().fromArray(frames[i+1][name]),p-i):new T.Quaternion().fromArray(frames[i][name]).slerp(new T.Quaternion().fromArray(frames[i+1][name]),p-i);
  return pose;
}
