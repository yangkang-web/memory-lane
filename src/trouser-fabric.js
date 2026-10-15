import * as T from 'three';

// A small seamless 2/2 twill tile. Mipmaps average the threads at normal
// viewing distance so the cloth does not turn into stripes or shimmer.
function twillMaps() {
  const size=128,normal=new Uint8Array(size*size*4),roughness=new Uint8Array(size*size*4);
  const height=(x,y)=>.45*Math.sin((x+y)*Math.PI/4)+.12*Math.sin(x*Math.PI/2)+.09*Math.sin(y*Math.PI/2);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const i=(y*size+x)*4;
    const n=new T.Vector3((height(x-1,y)-height(x+1,y))*.25,(height(x,y-1)-height(x,y+1))*.25,1).normalize();
    normal.set([Math.round((n.x*.5+.5)*255),Math.round((n.y*.5+.5)*255),Math.round((n.z*.5+.5)*255),255],i);
    const r=Math.round(243+height(x,y)*9);
    roughness.set([r,r,r,255],i);
  }
  const texture=data=>{
    const t=new T.DataTexture(data,size,size);
    t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.setScalar(48);
    t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;
    t.generateMipmaps=true;t.anisotropy=4;t.needsUpdate=true;
    return t;
  };
  return {normalMap:texture(normal),roughnessMap:texture(roughness)};
}

export function applyTrouserFabric(material) {
  Object.assign(material,twillMaps());
  // Retain the original UV-aligned tailoring (pockets, seams and broad folds),
  // but remap its dark painted navy to a narrow neutral range below.
  material.color.set('#3b4147');
  material.roughness=.90;
  material.sheen=.18;material.sheenColor.set('#737a82');material.sheenRoughness=.95;
  material.normalScale.setScalar(.14);
  material.alphaTest=0;
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vTrouserPosition;');
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvTrouserPosition=position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vTrouserPosition;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
      #ifdef USE_MAP
        vec3 tailoring=texture2D(map,vMapUv).rgb;
        float threadTone=pow(max(dot(tailoring,vec3(0.2126,0.7152,0.0722)),0.00001),0.4545);
        float fabricTone=mix(0.87,1.10,smoothstep(0.035,0.32,threadTone));
        diffuseColor.rgb*=fabricTone;
      #endif
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`
      #include <color_fragment>
      vec3 tp=vTrouserPosition;
      float leg=smoothstep(0.15,0.19,tp.y)*(1.0-smoothstep(1.06,1.12,tp.y));
      float side=smoothstep(0.085,0.112,abs(tp.x));
      float seamZ=mix(0.034,0.003,smoothstep(0.3,1.05,tp.y));
      float aa=max(fwidth(tp.z),0.0003);
      float seam=1.0-smoothstep(0.0005,0.0005+aa,abs(tp.z-seamZ));
      diffuseColor.rgb*=1.0-0.13*seam*side*leg;
    `);
    // Gentle compression near the knees and ankles modifies the lit normal
    // only. It cannot inflate the mesh or alter garment/body clearances.
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`
      #include <normal_fragment_maps>
      vec3 fp=vTrouserPosition;
      float knee=exp(-pow((fp.y-0.59)/0.075,2.0));
      float ankle=exp(-pow((fp.y-0.20)/0.055,2.0));
      float clothHeight=0.00055*sin(fp.y*53.0+abs(fp.x)*32.0)*knee;
      clothHeight+=0.0004*sin(fp.y*77.0-abs(fp.x)*21.0)*ankle;
      vec3 sx=dFdx(-vViewPosition),sy=dFdy(-vViewPosition);
      vec3 rx=cross(sy,normal),ry=cross(normal,sx);
      float determinant=dot(sx,rx);
      vec3 gradient=sign(determinant)*(dFdx(clothHeight)*rx+dFdy(clothHeight)*ry);
      normal=normalize(abs(determinant)*normal-gradient);
    `);
  };
  material.customProgramCacheKey=()=> 'campus-charcoal-twill-v2';
  material.needsUpdate=true;
}
