import * as T from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {BokehShader} from 'three/addons/shaders/BokehShader.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

// Reuse the colour render's depth instead of redrawing the entire campus.
class FocusPass extends ShaderPass {
 constructor(){super(BokehShader,'tColor');this.material.defines.DEPTH_PACKING=0;}
 render(renderer,write,read,...args){this.uniforms.tDepth.value=read.depthTexture;super.render(renderer,write,read,...args);}
}
export function createStoryCinematography(renderer,scene,camera){
 const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthTexture:new T.DepthTexture(1,1)});
 const composer=new EffectComposer(renderer,target);
 composer.addPass(new RenderPass(scene,camera));
 const lens=new FocusPass();composer.addPass(lens);composer.addPass(new OutputPass());
 const size=new T.Vector2();let width=0,height=0;
 return {render(frame){
  renderer.getSize(size);
  if(width!==size.x||height!==size.y){width=size.x;height=size.y;composer.setSize(width,height);}
  lens.uniforms.focus.value=frame.focus;lens.uniforms.aspect.value=camera.aspect;
  lens.uniforms.nearClip.value=camera.near;lens.uniforms.farClip.value=camera.far;
  lens.uniforms.aperture.value=frame.aperture??(frame.letter?.0035:.0015+frame.portrait*.0015);
  lens.uniforms.maxblur.value=frame.maxblur??(frame.letter?.007:.003+frame.portrait*.004);
  composer.render();
  // Readable first-person lettering is drawn in focus. Existing shadow maps
  // already describe this frame; a second update would waste two cascades.
  const background=scene.background,autoClear=renderer.autoClear,shadows=renderer.shadowMap.autoUpdate;
  scene.background=null;renderer.autoClear=false;renderer.shadowMap.autoUpdate=false;
  renderer.clearDepth();camera.layers.set(1);renderer.render(scene,camera);
  camera.layers.set(0);renderer.autoClear=autoClear;renderer.shadowMap.autoUpdate=shadows;scene.background=background;
 },dispose(){for(const pass of composer.passes)pass.dispose();composer.dispose();}};
}
