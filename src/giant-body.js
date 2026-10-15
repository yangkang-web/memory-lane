import * as T from 'three';

// Local derivative of the existing LokitoBlu skin. Deform the original surface
// while retaining UVs; no overlapping sphere shell or replacement paid asset.
export function sculptGiant(model){
  const bell=(v,center,width)=>Math.exp(-(((v-center)/width)**2));
  model.traverse(mesh=>{
    if(!mesh.isSkinnedMesh)return;
    const geometry=mesh.geometry.clone();
    const reshape=attribute=>{
      for(let i=0;i<attribute.count;i++){
        const x=attribute.getX(i),y=attribute.getY(i),z=attribute.getZ(i);
        const trunk=bell(x,0,.225)*bell(y,1.15,.25);
        const belly=bell(x,0,.21)*bell(y,1.06,.18);
        const leg=bell(y,.64,.22),center=Math.sign(x)*.105;
        attribute.setXYZ(i,x*(1+trunk*.85)+(x-center)*leg*.35,
          y-belly*.045,z*(1+trunk*.8+leg*.35)+belly*.085);
      }
    };
    reshape(geometry.attributes.position);
    // Existing finger poses are absolute morphs, so reshape their torso too.
    for(const attribute of geometry.morphAttributes.position||[])reshape(attribute);
    geometry.computeVertexNormals();
    const positions=geometry.morphAttributes.position||[],normals=[];
    for(const attribute of positions){
      const posed=geometry.clone();posed.setAttribute('position',attribute);posed.computeVertexNormals();
      normals.push(posed.attributes.normal.clone());posed.dispose();
    }
    const settle=geometry.attributes.position.clone();
    for(let i=0;i<settle.count;i++){
      const x=settle.getX(i),y=settle.getY(i),z=settle.getZ(i);
      const belly=bell(x,0,.29)*bell(y,1.02,.21)*T.MathUtils.smoothstep(z,-.03,.12);
      settle.setY(i,y-belly*.035);settle.setZ(i,z+belly*.025);
    }
    const posed=geometry.clone();posed.setAttribute('position',settle);posed.computeVertexNormals();
    const index=positions.length;positions.push(settle);normals.push(posed.attributes.normal.clone());posed.dispose();
    geometry.morphAttributes.position=positions;geometry.morphAttributes.normal=normals;
    geometry.computeBoundingBox();geometry.computeBoundingSphere();
    mesh.geometry=geometry;mesh.updateMorphTargets();mesh.userData.giantSettle=index;
  });
}
