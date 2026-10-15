import * as T from 'three';

// Pose shapes for the locally rigged LokitoBlu mesh. Its authored fingers have
// topology but no joints; curl their distal geometry while preserving the palm,
// UVs and wrist weights. Separate shapes allow either hand to release on rewind.
export function addInfectedHandGrips(model) {
  model.traverse(mesh=>{
    if(!mesh.isSkinnedMesh)return;
    const source=mesh.geometry.attributes.position;
    if(!Array.from({length:source.count},(_,i)=>Math.abs(source.getX(i))).some(x=>x>.76))return;
    const geometry=mesh.geometry.clone(),positions=[],normals=[];
    for(const sign of [1,-1]){
      const posed=source.clone();
      for(let i=0;i<source.count;i++){
        const x=source.getX(i)*sign,y=source.getY(i),z=source.getZ(i);
        if(x<.745||y<1.31)continue;
        let px=x,py=y,pz=z;
        if(z<-.018){
          const knuckle=.811+(z+.06)*.28,length=Math.max(0,x-knuckle);
          const angle=Math.min(2.65,length/.041),thickness=y-1.379;
          px=knuckle+Math.sin(angle)*.041+thickness*Math.sin(angle);
          py=1.379-.041*(1-Math.cos(angle))+thickness*Math.cos(angle);
          if(length===0){px=x;py=y;}
        }else{
          const blend=T.MathUtils.smoothstep(x,.755,.815)*T.MathUtils.smoothstep(z,-.022,.012);
          const dx=x-.755,dz=z+.025,angle=.9*blend;
          px=.755+dx*Math.cos(angle)+dz*Math.sin(angle);
          pz=-.025-dx*Math.sin(angle)+dz*Math.cos(angle);
          py-=.025*blend;
        }
        posed.setXYZ(i,px*sign,py,pz);
      }
      const normalGeometry=geometry.clone();normalGeometry.setAttribute('position',posed);normalGeometry.computeVertexNormals();
      positions.push(posed);normals.push(normalGeometry.attributes.normal.clone());normalGeometry.dispose();
    }
    geometry.morphAttributes.position=positions;geometry.morphAttributes.normal=normals;
    mesh.geometry=geometry;mesh.updateMorphTargets();mesh.userData.infectedGrip=true;
  });
}
