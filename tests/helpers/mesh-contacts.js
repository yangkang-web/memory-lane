import * as T from 'three';

// Read-only geometric audit of the posed, skinned clothing. BVH bounds are
// rebuilt from each sampled pose, so a bone-only check cannot hide penetration.
export function clothingAudit(rig) {
  const triIndices=rig.geometry.primitives.filter(p=>/Tops|Bottoms/.test(p.material)).flatMap(p=>{
    const tris=[];for(let i=0;i<p.indices.length;i+=3)tris.push(p.indices.slice(i,i+3));return tris;
  });
  function tree(triangles,positions,depth=0) {
    const box=new T.Box3();for(const tri of triangles)for(const i of tri)box.expandByPoint(positions.get(i));
    if(triangles.length<=12)return {box,triangles};
    const size=box.getSize(new T.Vector3()),axis=size.x>size.y&&size.x>size.z?'x':size.y>size.z?'y':'z';
    triangles.sort((a,b)=>a.reduce((n,i)=>n+positions.get(i)[axis],0)-b.reduce((n,i)=>n+positions.get(i)[axis],0));
    const half=Math.floor(triangles.length/2);
    return {box,left:tree(triangles.slice(0,half),positions,depth+1),right:tree(triangles.slice(half),positions,depth+1)};
  }
  function hits(node,ray,positions,distances) {
    if(!ray.intersectsBox(node.box))return;
    if(node.triangles)for(const ids of node.triangles){const p=ray.intersectTriangle(...ids.map(i=>positions.get(i)),false,new T.Vector3());if(p){const d=p.distanceTo(ray.origin);if(d>1e-5)distances.push(d);}}
    else {hits(node.left,ray,positions,distances);hits(node.right,ray,positions,distances);}
  }
  return function inspect(stride=5) {
    const vertices=rig.bodyVertices(),positions=new Map(vertices.map(v=>[v.index,v.position])),bvh=tree(triIndices.slice(),positions);
    const hands=vertices.filter(v=>/_(Hand|Index|Middle|Ring|Little|Thumb)/.test(v.name));
    const intrusions=[];
    for(let i=0;i<hands.length;i+=stride){const v=hands[i];let inside=0,minDepth=Infinity;
      for(const direction of [new T.Vector3(1,.137,.071),new T.Vector3(.091,1,.173),new T.Vector3(.157,.083,1)]){
        const distances=[];hits(bvh,new T.Ray(v.position,direction.normalize()),positions,distances);distances.sort((a,b)=>a-b);
        const unique=distances.filter((d,i)=>i===0||d-distances[i-1]>1e-5);
        if(unique.length%2){inside++;minDepth=Math.min(minDepth,...unique);}
      }
      if(inside>=2&&minDepth>.0015)intrusions.push({name:v.name,index:v.index,depth:minDepth,position:v.position});
    }
    return intrusions;
  };
}
