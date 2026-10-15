// Offline extraction of CC0 Quaternius Universal Animation Library v3.0.
// Usage: node scripts/extract-locomotion.mjs /path/to/UAL1_Standard.glb
// Converts source bone deltas into the legacy VRM normalized coordinate frame.
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as T from 'three';
const bytes=fs.readFileSync(process.argv[2]);
const g=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12))),start=28+bytes.readUInt32LE(12);
const read=i=>{const a=g.accessors[i],v=g.bufferViews[a.bufferView],size={SCALAR:1,VEC3:3,VEC4:4}[a.type];return Array.from({length:a.count*size},(_,j)=>bytes.readFloatLE(start+(v.byteOffset??0)+(a.byteOffset??0)+j*4));};
const nodes=g.nodes.map(n=>{const o=new T.Object3D();o.name=n.name;if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);return o;});
g.nodes.forEach((n,i)=>n.children?.forEach(c=>nodes[i].add(nodes[c])));
const scene=new T.Group();g.scenes[g.scene].nodes.forEach(i=>scene.add(nodes[i]));scene.updateMatrixWorld(true);
const map={hips:'pelvis',spine:'spine_01',chest:'spine_02',upperChest:'spine_03',neck:'neck_01',head:'Head'};
for(const [side,suffix] of [['left','l'],['right','r']])for(const [human,source] of [['Shoulder','clavicle'],['UpperArm','upperarm'],['LowerArm','lowerarm'],['Hand','hand'],['UpperLeg','thigh'],['LowerLeg','calf'],['Foot','foot'],['Toes','ball']])map[side+human]=source+'_'+suffix;
for(const [side,suffix] of [['left','l'],['right','r']])for(const [human,source] of [['Index','index'],['Middle','middle'],['Ring','ring'],['Little','pinky']])for(const [i,joint] of ['Proximal','Intermediate','Distal'].entries())map[side+human+joint]=source+'_0'+(i+1)+'_'+suffix;
const bind=nodes.map(n=>({q:n.quaternion.clone(),p:n.position.clone(),s:n.scale.clone(),parent:n.parent.getWorldQuaternion(new T.Quaternion())}));
const flip=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI);
const rounded=a=>a.map(x=>Math.round(x*1e6)/1e6);
const result={source:'Quaternius Universal Animation Library Standard v3.0',license:'CC0-1.0',sha256:crypto.createHash('sha256').update(bytes).digest('hex'),clips:{}};
for(const [name,source] of [['walk','Walk_Loop'],['jog','Jog_Fwd_Loop'],['idle','Idle_Loop']]){
 const animation=g.animations.find(a=>a.name===source);
 const tracks=animation.channels.map(c=>{const s=animation.samplers[c.sampler],times=read(s.input),values=read(s.output);return {node:c.target.node,path:c.target.path,interpolant:c.target.path==='rotation'?new T.QuaternionLinearInterpolant(times,values,4):new T.LinearInterpolant(times,values,3)};});
 const duration=Math.max(...animation.samplers.map(s=>g.accessors[s.input].max[0])),count=Math.round(duration*30),frames=[];
 for(let frame=0;frame<=count;frame++){
  nodes.forEach((n,i)=>{n.position.copy(bind[i].p);n.quaternion.copy(bind[i].q);n.scale.copy(bind[i].s);});
  for(const t of tracks)nodes[t.node][{translation:'position',rotation:'quaternion',scale:'scale'}[t.path]].fromArray(t.interpolant.evaluate(frame/30));
  scene.updateMatrixWorld(true);
  const pose={};
  for(const [human,sourceName] of Object.entries(map)){
   const i=nodes.findIndex(n=>n.name===sourceName),b=bind[i];
   pose[human]=rounded(flip.clone().multiply(b.parent).multiply(nodes[i].quaternion).multiply(b.q.clone().invert()).multiply(b.parent.clone().invert()).multiply(flip.clone().invert()).normalize().toArray());
  }
  pose.pelvis=rounded(nodes.find(n=>n.name==='pelvis').getWorldPosition(new T.Vector3()).toArray());
  pose.feet=['foot_l','foot_r'].map(name=>rounded(nodes.find(n=>n.name===name).getWorldPosition(new T.Vector3()).toArray()));
  frames.push(pose);
 }
 // The source jog has very sharp knee keys (up to 61 degrees in one
 // 30 Hz frame). A cyclic, zero-phase filter removes the impulse without
 // adding runtime lag or changing clip duration/contact order.
 if(name==='jog')for(let pass=0;pass<3;pass++){
   const source=structuredClone(frames),weights=[1,4,6,4,1];
   for(let i=0;i<count;i++)for(const key of Object.keys(map)){
     let total=0,q=new T.Quaternion();
     for(let k=-2;k<=2;k++){const weight=weights[k+2],sample=new T.Quaternion().fromArray(source[(i+k+count)%count][key]);if(!total)q.copy(sample);else q.slerp(sample,weight/(total+weight));total+=weight;}
     frames[i][key]=rounded(q.normalize().toArray());
   }
 }
 // The source jog has a sub-degree arm seam. Close the exported cycle so
 // interpolation across the final sample has the same endpoint as frame zero.
 frames[frames.length-1]=structuredClone(frames[0]);
 result.clips[name]={duration,frames};
}
fs.writeFileSync(new URL('../src/school/data/student-locomotion.json',import.meta.url),JSON.stringify(result));
console.log(Object.fromEntries(Object.entries(result.clips).map(([k,v])=>[k,{duration:v.duration,frames:v.frames.length,feet:v.frames.filter((_,i)=>i%10===0).map(f=>f.feet)}])));
