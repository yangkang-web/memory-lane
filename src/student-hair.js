import * as T from 'three';

// Fumiriya bind-space: the face points toward -Z. Smoothly comb only the
// rear cards down around the scalp; keep the fringe and crown roots intact.
export function combBackHair(x,y,z) {
  const rear=T.MathUtils.smoothstep(z,0,.055);
  const roots=1-T.MathUtils.smoothstep(y,1.84,1.905);
  const weight=rear*roots;
  if(weight===0)return [x,y,z];
  const radius=Math.hypot(x/.109,z/.126);
  const tips=T.MathUtils.smoothstep(radius,.93,1.4);
  const loweredY=y-.05*tips*weight*(1-T.MathUtils.smoothstep(y,1.76,1.88));
  const width=.065+.045*T.MathUtils.smoothstep(loweredY,1.64,1.76);
  const depth=.060+.068*T.MathUtils.smoothstep(loweredY,1.64,1.77);
  const envelope=Math.hypot(x/width,z/depth);
  // A soft compression, rather than a hard clamp, preserves separate strands.
  const fitted=envelope>.94?.94+.10*Math.tanh((envelope-.94)/.10):envelope;
  const scale=envelope>0?T.MathUtils.lerp(1,fitted/envelope,weight):1;
  return [x*scale,loweredY,z*scale];
}

export function applyCombedBackHair(model) {
  const buffers=new Map();
  const jacobian=new T.Matrix3(),normalTransform=new T.Matrix3(),normal=new T.Vector3();
  model.scene.traverse(mesh=>{
    if(!mesh.isMesh||!mesh.material?.name.startsWith('F00_000_Hair_00_HAIR'))return;
    const source=mesh.geometry,old=source.attributes.position;
    let fitted=buffers.get(old);
    if(!fitted) {
      const position=old.clone(),normals=source.attributes.normal.clone();
      for(let i=0;i<old.count;i++) {
        const p=[old.getX(i),old.getY(i),old.getZ(i)];
        position.setXYZ(i,...combBackHair(...p));
        if(p[2]<=0||p[1]>=1.905)continue;
        // Transform the original smooth normals by the deformation Jacobian.
        // Rebuilding normals per material would reveal seams between cards.
        const columns=[];
        for(let axis=0;axis<3;axis++) {
          const a=[...p],b=[...p];a[axis]-=.00001;b[axis]+=.00001;
          const pa=combBackHair(...a),pb=combBackHair(...b);
          columns.push(pb.map((value,j)=>(value-pa[j])/.00002));
        }
        jacobian.set(columns[0][0],columns[1][0],columns[2][0],columns[0][1],columns[1][1],columns[2][1],columns[0][2],columns[1][2],columns[2][2]);
        normalTransform.copy(jacobian).invert().transpose();
        normal.fromBufferAttribute(source.attributes.normal,i).applyMatrix3(normalTransform).normalize();
        normals.setXYZ(i,normal.x,normal.y,normal.z);
      }
      fitted={position,normals};buffers.set(old,fitted);
    }
    const geometry=source.clone();
    geometry.setAttribute('position',fitted.position);geometry.setAttribute('normal',fitted.normals);
    geometry.computeBoundingBox();geometry.computeBoundingSphere();
    mesh.geometry=geometry;
  });
}
