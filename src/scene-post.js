import * as T from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

// Uses the actual scene depth, so leaf/fern cut-outs keep their silhouettes in AO.
// No normal-material override that would turn foliage cards into opaque rectangles.
export function createScenePost(renderer,scene,camera,lighting) {
  const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthTexture:new T.DepthTexture(1,1,T.UnsignedIntType)});
  const composer=new EffectComposer(renderer,target);composer.addPass(new RenderPass(scene,camera));
  const contact=new ShaderPass({uniforms:{tDiffuse:{value:null},tDepth:{value:null},inverseProjection:{value:camera.projectionMatrixInverse},projection:{value:camera.projectionMatrix},resolution:{value:new T.Vector2(1,1)},tSunShadow:{value:null},sunShadowMatrix:{value:lighting.sun.shadow.matrix},inverseView:{value:camera.matrixWorld},sunDirection:{value:lighting.sunDirection},shadowReady:{value:0},haze:{value:1},sunStrength:{value:1}},vertexShader:`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`
    uniform sampler2D tDiffuse,tDepth;uniform sampler2DShadow tSunShadow;
    uniform mat4 inverseProjection,projection,inverseView,sunShadowMatrix;uniform vec2 resolution;uniform vec3 sunDirection;uniform float shadowReady,haze,sunStrength;varying vec2 vUv;
    float sunlightAt(vec3 p){vec4 s=sunShadowMatrix*vec4(p,1.);vec3 q=s.xyz/s.w;
      if(any(lessThan(q,vec3(0.)))||any(greaterThan(q,vec3(1.))))return 0.;
      return texture(tSunShadow,vec3(q.xy,q.z-.0003));}

    vec3 positionAt(vec2 uv){float d=texture2D(tDepth,uv).r;vec4 p=inverseProjection*vec4(uv*2.-1.,d*2.-1.,1.);return p.xyz/p.w;}
    void main(){vec4 c=texture2D(tDiffuse,vUv);float depth=texture2D(tDepth,vUv).r;vec3 p=positionAt(vUv);vec3 n=normalize(cross(dFdx(p),dFdy(p)));float occlusion=0.;
      if(depth<.9999){float radius=.65;vec2 scale=vec2(projection[0][0],projection[1][1])*radius/max(-p.z,.1)*.5;
        for(int i=0;i<16;i++){float a=float(i)*2.399963;float r=sqrt((float(i)+.5)/16.);vec2 uv=clamp(vUv+vec2(cos(a),sin(a))*scale*r,vec2(.001),vec2(.999));vec3 d=positionAt(uv)-p;float len=length(d);float facing=max(dot(n,d/max(len,.001))-.12,0.);occlusion+=facing*(1.-smoothstep(.08,radius,len));}
      }float ao=clamp(1.-occlusion*.19,.62,1.);
      vec3 radiance=c.rgb*ao;
      // Integrate actual shadowed daylight through a thin, height-dependent haze.
      // Geometry stops the ray: no decorative beams drawn over walls or the painting.
      if(shadowReady>.5){vec3 origin=inverseView[3].xyz;vec3 endpoint=(inverseView*vec4(p,1.)).xyz;
        vec3 ray=normalize(endpoint-origin);float distanceToSurface=min(length(p),70.);float stepSize=distanceToSurface/16.;
        float jitter=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);float scatter=0.,extinction=0.;
        for(int i=0;i<16;i++){vec3 samplePoint=origin+ray*(float(i)+jitter)*stepSize;float density=exp(-max(samplePoint.y,0.)/18.)*.002*haze;
          float optical=density*stepSize;scatter+=sunlightAt(samplePoint)*optical;extinction+=optical;}
        float phase=.65+.8*pow(max(dot(ray,sunDirection),0.),6.);
        radiance=radiance*exp(-extinction*.3)+vec3(1.,.89,.69)*scatter*phase*.62*sunStrength;
      }
      gl_FragColor=vec4(radiance,c.a);
    }`});
  const baseRender=contact.render.bind(contact);contact.render=(r,w,read,...rest)=>{contact.uniforms.haze.value=lighting.haze;contact.uniforms.sunStrength.value=lighting.scatter;contact.uniforms.tDepth.value=read.depthTexture;contact.uniforms.tSunShadow.value=lighting.sun.shadow.map?.depthTexture;contact.uniforms.shadowReady.value=lighting.sun.shadow.map?1:0;baseRender(r,w,read,...rest);};
  composer.addPass(contact);const output=new OutputPass();composer.addPass(output);const antialias=new ShaderPass(FXAAShader);composer.addPass(antialias);
  return {render(){composer.render();},resize(w,h,dpr){composer.setPixelRatio(dpr);composer.setSize(w,h);contact.uniforms.resolution.value.set(w*dpr,h*dpr);antialias.uniforms.resolution.value.set(1/(w*dpr),1/(h*dpr));},dispose(){contact.dispose();output.dispose();antialias.dispose();composer.dispose();}};
}
