import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

export function createCinematic(renderer, scene, camera) {
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  target.depthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      tColor: { value: target.texture }, tDepth: { value: target.depthTexture },
      texel: { value: new THREE.Vector2() }, nearClip: { value: camera.near }, farClip: { value: camera.far },
      focus: { value: 1 }, portrait: { value: 0 },
    },
    depthTest: false,
    depthWrite: false,
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,
    fragmentShader: `
      #include <common>
      #include <packing>
      varying vec2 vUv;
      uniform sampler2D tColor,tDepth;
      uniform vec2 texel;
      uniform float nearClip,farClip,focus,portrait;
      float distanceAt(vec2 uv){return -perspectiveDepthToViewZ(texture2D(tDepth,uv).x,nearClip,farClip);}
      void main(){
        vec3 color=texture2D(tColor,vUv).rgb;
        float distance=distanceAt(vUv);
        float blur=portrait*clamp((distance-focus-.18)*.22,0.,1.);
        if(blur>.01){
          vec3 total=color*2.;float weight=2.;
          for(int i=0;i<12;i++){
            float angle=float(i)*2.39996323;
            float radius=sqrt((float(i)+.5)/12.);
            vec2 uv=vUv+vec2(cos(angle),sin(angle))*texel*22.*radius*blur;
            if(distanceAt(uv)>focus+.12){total+=texture2D(tColor,uv).rgb;weight+=1.;}
          }
          color=total/weight;
        }
        vec2 p=(vUv-.5)*vec2(1.,.8);
        color*=1.-smoothstep(.28,.72,length(p))*.17;
        float shadows=1.-smoothstep(.025,.3,dot(color,vec3(.2126,.7152,.0722)));
        color*=mix(vec3(1.01,.995,.985),vec3(.9,.99,1.1),shadows*.55);
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const quad = new FullScreenQuad(material);
  const size = new THREE.Vector2();
  return {
    resize() {
      renderer.getDrawingBufferSize(size);
      target.setSize(size.x, size.y);
      material.uniforms.texel.value.set(1 / size.x, 1 / size.y);
    },
    render(view, focus) {
      material.uniforms.focus.value = focus;
      material.uniforms.portrait.value = view === 'face' ? 1 : view === 'pendant' ? 0.5 : 0;
      material.uniforms.nearClip.value = camera.near;
      material.uniforms.farClip.value = camera.far;
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      quad.render(renderer);
    },
    // Programs depend on the target they draw into, so compile against the one the scene is actually drawn to.
    compile() {
      renderer.setRenderTarget(target);
      const done = renderer.compileAsync(scene, camera);
      renderer.setRenderTarget(null);
      return done;
    },
    dispose() { target.dispose(); material.dispose(); quad.dispose(); },
  };
}
