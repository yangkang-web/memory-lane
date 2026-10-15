import * as T from 'three';

// Small, seamless weave tiles. Mipmaps remove subpixel threads in distant views;
// texture UVs follow the skinned cloth instead of swimming in world space.
function weaveMaps(repeats) {
  const size=128,normal=new Uint8Array(size*size*4),roughness=new Uint8Array(size*size*4);
  const height=(x,y)=>{
    const u=x*Math.PI/4,v=y*Math.PI/4;
    return Math.sin(u)*.5+Math.sin(v)*.32+Math.sin(u+v)*.18;
  };
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const i=(y*size+x)*4;
    const n=new T.Vector3((height(x-1,y)-height(x+1,y))*.35,(height(x,y-1)-height(x,y+1))*.35,1).normalize();
    normal.set([Math.round((n.x*.5+.5)*255),Math.round((n.y*.5+.5)*255),Math.round((n.z*.5+.5)*255),255],i);
    const r=Math.round(238+height(x,y)*12);
    roughness.set([r,r,r,255],i);
  }
  const texture=data=>{
    const t=new T.DataTexture(data,size,size);
    t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.setScalar(repeats);
    t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;
    t.generateMipmaps=true;t.anisotropy=4;t.needsUpdate=true;
    return t;
  };
  return {normalMap:texture(normal),roughnessMap:texture(roughness)};
}

export function adaptStudentMaterials(model,{hairColor}={}) {
  const surfaces=new Map();
  const knit=weaveMaps(28),twill=weaveMaps(36);
  let frontHair;
  model.scene.traverse(object=>{
    if(object.isMesh)frontHair??=[object.material].flat().find(m=>m.name==='F00_000_Hair_00_HAIR_01');
  });
  model.scene.traverse(object=>{
    if(!object.isMesh)return;
    const original=[object.material].flat();
    const source=original.find(m=>!m.isOutline);
    if(!source?.isMToonMaterial)return;
    const isClothing=source.name.endsWith('_CLOTH');
    const isHair=source.name.includes('Hair'),isSkin=source.name.endsWith('_SKIN');
    const isEye=source.name.endsWith('_EYE');
    if(isClothing) {
      // The loader duplicates the surface geometry for an expanded outline.
      // Replace the whole pair: a lit fabric must not retain the old bright rim
      // or a second overlapping surface (which flickers as limbs move).
      if(!surfaces.has(source)) {
        const shoes=source.name.includes('_Shoes_'),tie=source.name.includes('_Accessory_');
        const material=new T.MeshPhysicalMaterial({
          name:source.name+' · campus fabric',map:source.map,color:source.color.clone(),
          side:T.DoubleSide,alphaTest:source.alphaTest,alphaToCoverage:true,
          roughness:shoes?.55:tie?.72:.94,metalness:0,
          sheen:shoes?0:tie?.16:.22,sheenColor:new T.Color('#a9afc3'),sheenRoughness:.85,
          ...(shoes?{}:source.name.includes('_Tops_')?knit:twill),
          normalScale:new T.Vector2(tie?.12:.22,tie?.12:.22),
        });
        // Keep the atlas and its intentional transparent garment openings.
        if(material.map)material.map.anisotropy=4;
        surfaces.set(source,material);
      }
    } else {
      if(!surfaces.has(source)) {
        // Use the same irradiance/shadow response as the campus. MToon adds
        // its shade color even when N.L <= 0 or a light is occluded; emission
        // and matcaps further kept skin/hair bright independently of the sun.
        const matchFringe=frontHair&&(source.name==='F00_000_Hair_00_HAIR_02'||source.name==='M00_000_HairBack_00_HAIR');
        const material=new T.MeshStandardMaterial({
          name:source.name+' · campus light',
          color:isHair&&hairColor?new T.Color(hairColor):(matchFringe?frontHair:source).color.clone(),map:source.map,
          normalMap:source.normalMap,normalScale:source.normalScale.clone(),
          roughness:isHair?.64:isEye?.36:.78,metalness:0,
          transparent:source.transparent,opacity:source.opacity,
          alphaTest:source.alphaTest,alphaToCoverage:source.alphaTest>0,
          depthWrite:source.depthWrite,side:source.side,
        });
        if(material.map)material.map.anisotropy=4;
        surfaces.set(source,material);
      }
    }
    // A single surface replaces the surface/expanded-outline pair. Preserve
    // geometry, morph targets, alpha maps and rig so facial expressions work.
    object.material=surfaces.get(source);
    object.receiveShadow=true;
    // Brow/lash/eye decals must receive shading but must not cast rectangular
    // shadows over the face. Solid skin, garments and cutout strands cast it.
    object.castShadow=isClothing||isSkin||isHair;
    if(isHair&&source.transparent) {
      object.customDepthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:source.map,alphaTest:.5,side:source.side});
    }
    object.frustumCulled=false;
  });
}

// The campus sun covers 150 m, too coarse for shoe contact. These two soft
// local occlusion patches supplement it, fading out as each foot lifts.
export function createStudentContactShadows(scene,model,groundY) {
  const size=64,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const r=Math.hypot((x+.5-size/2)/(size/2),(y+.5-size/2)/(size/2));
    data.set([255,255,255,Math.round(Math.pow(Math.max(0,1-r*r),3)*255)],(y*size+x)*4);
  }
  const map=new T.DataTexture(data,size,size);map.magFilter=T.LinearFilter;map.needsUpdate=true;
  const position=new T.Vector3(),rotation=new T.Quaternion(),offset=new T.Vector3();
  const feet=['left','right'].map(side=>{
    const bone=model.humanoid.getNormalizedBoneNode(side+'Foot');
    const mesh=new T.Mesh(new T.PlaneGeometry(.27,.4),new T.MeshBasicMaterial({map,color:0x393d38,transparent:true,opacity:0,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));
    mesh.rotation.x=-Math.PI/2;mesh.renderOrder=1;scene.add(mesh);
    return {bone,mesh,restHeight:bone.getWorldPosition(new T.Vector3()).y-groundY};
  });
  return ()=>{
    model.scene.updateWorldMatrix(true,true);
    for(const {bone,mesh,restHeight} of feet) {
      bone.getWorldPosition(position);bone.getWorldQuaternion(rotation);
      const lift=Math.max(0,position.y-groundY-restHeight);
      offset.set(0,0,.045).applyQuaternion(rotation);
      mesh.position.set(position.x+offset.x,groundY+.002,position.z+offset.z);
      mesh.rotation.z=-Math.atan2(offset.x,offset.z);
      mesh.material.opacity=.32*(1-T.MathUtils.smoothstep(lift,.015,.19));
      mesh.scale.setScalar(1+lift*1.5);
    }
  };
}
