import * as T from 'three';
import {applyTrouserFabric} from './trouser-fabric.js';

// A continuous displacement across the separate torso/sleeve panels keeps
// coincident seam vertices together. The neck stays anchored to the collar.
export function relaxedShirtPosition(x,y,z) {
  const smooth=T.MathUtils.smoothstep;
  // Release the added ease below the upper chest. Carrying both the scale
  // and hanging envelope up to the collar inflated the vest's chest profile.
  const neck=1-smooth(y,1.38,1.56);
  const torso=1-smooth(Math.abs(x),.135,.255);
  const waist=1-smooth(y,1.24,1.46);
  const hem=1-smooth(y,1.13,1.24);
  const ease=neck*torso;
  const sleeve=smooth(Math.abs(x),.14,.25);
  const angle=Math.atan2(z,x);
  const hanging=1-smooth(y,1.25,1.49);
  // Unequal folds descend from the chest and converge toward the side seams.
  // The placket remains relatively flat; folds widen as the fabric hangs.
  const fold=(center,width)=>Math.exp(-Math.pow((x-center)/width,2));
  const drift=(1.44-y)*.055;
  const drape=(.002*fold(-.103-drift,.025)-.0012*fold(-.074-drift,.021)
    +.0015*fold(-.043,.023)+.0022*fold(.088+drift,.028)-.001*fold(.059,.021))
    *hanging*ease;
  const sideFold=.0008*Math.sin(angle*5+.8)*hanging*ease;
  const tail=hem*torso*(.008+.012*Math.pow(Math.sin(angle),2));
  // The source vest has a gathered waistband and bulging stomach rows.
  // Scaling that profile inflated the bulges. Refit its outer lower panels
  // to a gently tapered hanging envelope, leaving hidden inner faces alone.
  const radial=Math.hypot(x/.15,(z+.012)/.12);
  const refit=(1-smooth(y,1.40,1.54))*torso*smooth(radial,.25,.5);
  const theta=Math.atan2((z+.012)/.12,x/.15);
  const width=.161+.004*(1-smooth(y,1.13,1.40));
  const depth=.119+.002*(1-smooth(y,1.13,1.40));
  const relaxedX=T.MathUtils.lerp(x*(1+ease*(.13+.10*waist)),width*Math.cos(theta),refit);
  const relaxedZ=T.MathUtils.lerp(z*(1+ease*(.16+.10*waist)),-.017+depth*Math.sin(theta),refit);
  return [
    relaxedX + Math.cos(angle)*sideFold,
    y-tail+.003*hem*Math.sin(angle*5+.6)*torso
      + (y-1.515)*.16*sleeve-.005*sleeve*(1-smooth(y,1.46,1.56)),
    relaxedZ + Math.sin(angle)*(drape+sideFold)
      + (z+.008)*.15*sleeve,
  ];
}

// As the thighs rise, the front tail rests on them instead of hanging as a
// rigid point between the legs. The animation's continuous seat blend also
// handles interrupted sitting/rising, without triggering during running.
export function seatedShirtOffset(x,y,z) {
  const hem=1-T.MathUtils.smoothstep(y,1.12,1.28);
  const front=1-T.MathUtils.smoothstep(z,-.065,.015);
  const support=hem*front;
  const center=1-T.MathUtils.smoothstep(Math.abs(x),.035,.11);
  return [0,(.055+.04*center)*support,-.012*support];
}

// Refine only the garment triangles. Midpoints retain a normalized mixture of
// the original bone influences; never average joint IDs as numeric attributes.
export function subdivideShirt(source) {
  const geometry=source.clone(),attributes=Object.fromEntries(Object.entries(geometry.attributes).map(([name,a])=>[name,Array.from(a.array)]));
  const edges=new Map(),indices=[];
  const middle=(a,b)=>{
    const key=a<b?`${a}:${b}`:`${b}:${a}`;
    if(edges.has(key))return edges.get(key);
    const index=attributes.position.length/3;
    for(const [name,values] of Object.entries(attributes)) {
      const size=geometry.attributes[name].itemSize;
      if(name==='skinIndex'||name==='skinWeight')continue;
      for(let j=0;j<size;j++)values.push((values[a*size+j]+values[b*size+j])*.5);
    }
    const influences=new Map();
    for(const i of [a,b])for(let j=0;j<4;j++) {
      const bone=attributes.skinIndex[i*4+j],weight=attributes.skinWeight[i*4+j]*.5;
      influences.set(bone,(influences.get(bone)??0)+weight);
    }
    const sorted=[...influences].sort((a,b)=>b[1]-a[1]).slice(0,4);
    const total=sorted.reduce((sum,p)=>sum+p[1],0);
    for(let j=0;j<4;j++) {
      attributes.skinIndex.push(sorted[j]?.[0]??0);
      attributes.skinWeight.push((sorted[j]?.[1]??0)/total);
    }
    edges.set(key,index);return index;
  };
  const original=geometry.index.array;
  for(let i=0;i<original.length;i+=3) {
    const a=original[i],b=original[i+1],c=original[i+2],ab=middle(a,b),bc=middle(b,c),ca=middle(c,a);
    indices.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca);
  }
  for(const [name,values] of Object.entries(attributes)) {
    const old=geometry.attributes[name];
    geometry.setAttribute(name,new T.BufferAttribute(new old.array.constructor(values),old.itemSize,old.normalized));
  }
  geometry.setIndex(indices);geometry.clearGroups();
  return geometry;
}

// Fumiriya's short sleeves and folded collar are already part of the rigged
// top. Replace its vest artwork with a cotton shirt; details use bind-space
// coordinates, so they deform with the garment rather than sliding on it.
function shirtDetails(material) {
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>',
      '#include <common>\nattribute vec3 garmentRestPosition;\nvarying vec3 vGarmentPosition;');
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nvGarmentPosition = garmentRestPosition;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
      '#include <common>\nvarying vec3 vGarmentPosition;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      vec3 p = vGarmentPosition;
      float front = 1.0 - smoothstep(-0.065, -0.035, p.z);
      float torso = smoothstep(1.12, 1.13, p.y) * (1.0 - smoothstep(1.55, 1.57, p.y));
      float aa = max(fwidth(p.x), 0.00025);
      // Narrow folded placket, with a restrained seam along each edge.
      float edge = 1.0 - smoothstep(0.00065, 0.00065 + aa, abs(abs(p.x - 0.001) - 0.008));
      float placket = 1.0-smoothstep(0.006,0.008,abs(p.x-0.001));
      diffuseColor.rgb *= 1.0 - (0.26 * edge + 0.025 * placket) * front * torso;
      // Four pearl buttons, below an open neck. The ring stays subtle at distance.
      float buttonY = abs(mod(p.y - 1.19 + 0.031, 0.062) - 0.031);
      float radius = length(vec2(p.x - 0.001, buttonY));
      float buttons = front * step(1.17,p.y) * step(p.y,1.51);
      float ring = (1.0-smoothstep(0.0032,0.0032+aa,radius)) * smoothstep(0.0018,0.0026,radius);
      diffuseColor.rgb *= 1.0 - 0.42 * ring * buttons;
      // Left breast patch pocket: vertical sides, a shallow pointed base and lip.
      vec2 q = vec2(p.x - 0.068, p.y - 1.465);
      float sides = (1.0-smoothstep(0.0003,0.0003+aa,abs(abs(q.x)-0.025))) * step(-0.052,q.y) * step(q.y,0.0);
      float lip = (1.0-smoothstep(0.0007,0.0007+aa,abs(q.y))) * step(abs(q.x),0.025);
      float base = (1.0-smoothstep(0.0004,0.0004+aa,abs(q.y+0.057-abs(q.x)*0.2))) * step(abs(q.x),0.025);
      diffuseColor.rgb *= 1.0 - 0.32 * max(max(sides,lip),base) * front;
      float cuff = 1.0-smoothstep(0.0008,0.0008+aa,abs(abs(p.x)-0.267));
      diffuseColor.rgb *= 1.0-0.16*cuff*step(1.43,p.y);
    `);
    // Millimetre-scale folds change the lit normal, not the fabric's base
    // color. Thus the same creases work in daylight, sunset and cast shadows.
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>', `
      #include <normal_fragment_maps>
      vec3 gp = vGarmentPosition;
      float lower = (1.0-smoothstep(1.22,1.47,gp.y))*smoothstep(1.115,1.15,gp.y);
      float foldHeight = 0.0004*sin(gp.x*79.0+sin(gp.y*9.0))*lower;
      // Soft diagonal compression folds below the arm, fading toward the front.
      float underarm = smoothstep(0.07,0.14,abs(gp.x))*(1.0-smoothstep(0.16,0.24,abs(gp.x)));
      underarm *= exp(-pow((gp.y-1.40)/0.085,2.0));
      foldHeight += 0.0005*sin(gp.y*57.0+abs(gp.x)*43.0)*underarm;
      // Turned-under hem and sleeve edges have physical thickness in the light.
      foldHeight += 0.0007*exp(-pow((gp.y-1.125)/0.004,2.0));
      vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition);
      vec3 rx = cross(sy,normal), ry = cross(normal,sx);
      float determinant = dot(sx,rx);
      vec3 gradient = sign(determinant)*(dFdx(foldHeight)*rx+dFdy(foldHeight)*ry);
      normal = normalize(abs(determinant)*normal-gradient);
    `);
    // Nearby cloth blocks some sky bounce inside a crease. Keep direct sun
    // untouched so this remains a lit cotton surface, including in sunset.
    shader.fragmentShader=shader.fragmentShader.replace('#include <aomap_fragment>', `
      #include <aomap_fragment>
      vec3 cp = vGarmentPosition;
      float hanging = 1.0-smoothstep(1.24,1.48,cp.y);
      float drift = (1.44-cp.y)*0.055;
      float cavities = exp(-pow((cp.x+0.074+drift)/0.012,2.0));
      cavities += 0.7*exp(-pow((cp.x-0.059)/0.013,2.0));
      float side = smoothstep(0.07,0.13,abs(cp.x))*(1.0-smoothstep(0.17,0.24,abs(cp.x)));
      float armpit = side*exp(-pow((cp.y-1.425)/0.04,2.0));
      float clothOcclusion = 1.0-0.07*min(cavities,1.0)*hanging-0.08*armpit;
      reflectedLight.indirectDiffuse *= clothOcclusion;
    `);
  };
  material.customProgramCacheKey=()=> 'summer-cotton-shirt-v5';
}

export function applySummerUniform(model) {
  const seatedTargets=[];
  model.scene.traverse(mesh=>{
    if(!mesh.isMesh)return;
    const material=mesh.material;
    if(material.name.startsWith('M00_001_01_Accessory_01_CLOTH')) {
      mesh.visible=false;
    } else if(material.name.startsWith('M00_001_01_Tops_01_CLOTH')) {
      material.map=null;
      material.color.set('#d8d6cf');
      material.roughness=.97;
      material.sheen=.16;
      material.sheenRoughness=1;
      material.sheenColor.set('#e8e7df');
      material.normalScale.setScalar(.13);
      material.alphaTest=0;
      // Add ease through the chest, waist and sleeve openings, retaining the
      // collar and rig. Clone because GLTF primitives share
      // their original vertex buffers with the body and trousers.
      const geometry=subdivideShirt(mesh.geometry),position=geometry.attributes.position;
      geometry.setAttribute('garmentRestPosition',position.clone());
      const indices=new Set(geometry.index.array);
      for(const i of indices) {
        const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
        position.setXYZ(i,...relaxedShirtPosition(x,y,z));
      }
      position.needsUpdate=true;
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();geometry.computeBoundingSphere();
      const seated=geometry.clone(),seatedPosition=seated.attributes.position;
      const offsets=new Float32Array(position.count*3);
      const rest=geometry.attributes.garmentRestPosition;
      for(const i of indices) {
        const offset=seatedShirtOffset(rest.getX(i),rest.getY(i),rest.getZ(i));
        offsets.set(offset,i*3);
        seatedPosition.setXYZ(i,position.getX(i)+offset[0],position.getY(i)+offset[1],position.getZ(i)+offset[2]);
      }
      seated.computeVertexNormals();
      const normals=new Float32Array(position.count*3);
      for(let i=0;i<normals.length;i++)normals[i]=seated.attributes.normal.array[i]-geometry.attributes.normal.array[i];
      geometry.morphTargetsRelative=true;
      geometry.morphAttributes.position=[new T.Float32BufferAttribute(offsets,3)];
      geometry.morphAttributes.normal=[new T.Float32BufferAttribute(normals,3)];
      seated.dispose();
      mesh.geometry=geometry;
      mesh.updateMorphTargets();
      seatedTargets.push(mesh);
      shirtDetails(material);
      material.needsUpdate=true;
    } else if(material.name.startsWith('M00_001_01_Bottoms_01_CLOTH')) {
      applyTrouserFabric(material);
    }
  });
  return amount=>{
    for(const mesh of seatedTargets)mesh.morphTargetInfluences[0]=T.MathUtils.clamp(Number.isFinite(amount)?amount:0,0,1);
  };
}
