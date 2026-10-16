// Run after the authored humanoid pose, before the character can be rendered.
export function createStudentStability(model,root,{reducedMotion=false}={}){
 let pendingReset=true;
 // The motion controller owns normalized eye bones. Consume the VRM's initial
 // gaze once, before that controller writes its first pose, then leave it alone.
 if(model.lookAt){model.lookAt.autoUpdate=false;model.lookAt.target=null;model.lookAt.reset();model.lookAt.update(0);}
 return {
  reset(){pendingReset=true;},
  update(delta){
   const dt=reducedMotion?0:Math.max(0,Math.min(Number.isFinite(delta)?delta:0,.05));
   if(pendingReset){
    // update(0) synchronizes raw bones/expressions but does NOT reset springs.
    model.update(0);root.updateWorldMatrix(true,true);
    model.springBoneManager?.reset();
    // Settle secondary motion at the current pose, without advancing the story,
    // locomotion or speech. No intermediate pose is exposed to the renderer.
    if(!reducedMotion)for(let i=0;i<30;i++)model.springBoneManager?.update(1/60);
    pendingReset=false;
   }else{
    const steps=Math.max(1,Math.ceil(dt/(1/60)));
    for(let i=0;i<steps;i++)model.update(dt/steps);
   }
   root.updateWorldMatrix(true,true);
  }
 };
}

// Alpha hashing fades coverage while preserving occlusion between the face,
// eyes and hair. Ordinary whole-model blending exposes the rear surfaces.
export function createStudentFade(root){
 const originals=new Map();
 return opacity=>{
  root.traverse(o=>{if(!o.isMesh)return;for(const m of [o.material].flat()){
   if(!originals.has(m))originals.set(m,{opacity:m.opacity,transparent:m.transparent,depthWrite:m.depthWrite,alphaHash:m.alphaHash,alphaTest:m.alphaTest,alphaToCoverage:m.alphaToCoverage});
   const original=originals.get(m),fading=opacity<1;
   const next=fading?{transparent:false,depthWrite:true,alphaHash:true,alphaTest:0,alphaToCoverage:false}:original;
   for(const key of ['transparent','depthWrite','alphaHash','alphaTest','alphaToCoverage'])if(m[key]!==next[key]){m[key]=next[key];m.needsUpdate=true;}
   m.opacity=original.opacity*Math.max(0,Math.min(1,opacity));
  }});
 };
}
