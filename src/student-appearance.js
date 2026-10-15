// Fumiriya's atlas uses image-space UVs (glTF flipY=false). These soft masks
// follow the original face through expressions, preserving its rig and texture.
export function applyNaturalComplexion(model) {
  const adapted=new Set();
  model.scene.traverse(mesh=>{
    if(!mesh.isMesh)return;
    const material=mesh.material;
    if(!material?.name.includes('_SKIN')||adapted.has(material))return;
    adapted.add(material);
    // Match face, ears, neck and hands under the same campus illumination.
    material.color.set('#e8d4cd');
    material.roughness=.86;
    const isFace=material.name.startsWith('M00_000_00_Face_00_SKIN');
    material.onBeforeCompile=shader=>{
      shader.vertexShader=shader.vertexShader.replace('#include <common>',
        '#include <common>\nvarying vec3 vSkinRestPosition;');
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\nvSkinRestPosition=position;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
        '#include <common>\nvarying vec3 vSkinRestPosition;');
      // The jaw shelters the upper neck from diffuse sky light. This soft
      // cavity follows the skinned mesh; the sun supplies the moving shadow.
      shader.fragmentShader=shader.fragmentShader.replace('#include <aomap_fragment>',`
        #include <aomap_fragment>
        float neckCavity=exp(-pow(vSkinRestPosition.x/0.053,2.0))
          *exp(-pow((vSkinRestPosition.y-1.605)/0.045,2.0))
          *(1.0-smoothstep(-0.025,0.018,vSkinRestPosition.z));
        reflectedLight.indirectDiffuse*=1.0-0.23*neckCavity;
      `);
      if(!isFace)return;
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`
        #include <common>
        float faceMask(vec2 uv, vec2 center, vec2 radius) {
          vec2 p=(uv-center)/radius;
          return exp(-dot(p,p)*2.0);
        }
      `);
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`
        #include <color_fragment>
        vec2 faceUV=vMapUv;
        float upperLip=faceMask(faceUV,vec2(0.5,0.752),vec2(0.071,0.011));
        float lowerLip=faceMask(faceUV,vec2(0.5,0.772),vec2(0.060,0.015));
        // Muted rose pigment, with less of the original painted white glint.
        float lipPigment=max(upperLip*0.34,lowerLip*0.30);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.42,0.19,0.17),lipPigment);
        float cheek=faceMask(faceUV,vec2(0.29,0.644),vec2(0.090,0.052))
          +faceMask(faceUV,vec2(0.71,0.644),vec2(0.090,0.052));
        diffuseColor.rgb*=vec3(1.0,1.0-0.035*cheek,1.0-0.025*cheek);
      `);
      shader.fragmentShader=shader.fragmentShader.replace('#include <aomap_fragment>',`
        #include <aomap_fragment>
        // Cavities block sky bounce; direct light still follows the nose mesh.
        float noseSides=faceMask(vMapUv,vec2(0.478,0.632),vec2(0.018,0.046))
          +faceMask(vMapUv,vec2(0.522,0.632),vec2(0.018,0.046));
        float underNose=faceMask(vMapUv,vec2(0.5,0.667),vec2(0.024,0.012));
        float underLip=faceMask(vMapUv,vec2(0.5,0.795),vec2(0.055,0.015));
        float fringeCavity=faceMask(vMapUv,vec2(0.5,0.40),vec2(0.30,0.16));
        float eyeSocket=faceMask(vMapUv,vec2(0.34,0.505),vec2(0.10,0.045))
          +faceMask(vMapUv,vec2(0.66,0.505),vec2(0.10,0.045));
        reflectedLight.indirectDiffuse*=1.0-0.16*noseSides-0.15*underNose-0.08*underLip
          -0.16*fringeCavity-0.10*eyeSocket;
      `);
    };
    material.customProgramCacheKey=()=> 'fumiriya-natural-complexion-v2-'+(isFace?'face':'body');
    material.needsUpdate=true;
  });
}
