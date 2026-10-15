import * as T from 'three';
// Image-driven refraction: the outgoing room remains recognisable as the incoming world opens inside it.
export function createJourneyEffects(canvas) {
  const renderer = new T.WebGLRenderer({canvas, antialias:false});
  renderer.toneMapping = T.NoToneMapping;
  const uniforms = { from:{value:null}, to:{value:null}, progress:{value:0}, mode:{value:0}, aspect:{value:1}, reduced:{value:0} };
  const material = new T.ShaderMaterial({uniforms, depthTest:false, depthWrite:false,
    vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`precision highp float;
      uniform sampler2D from,to; uniform float progress,mode,aspect,reduced; varying vec2 vUv;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
      float fbm(vec2 p){return noise(p)*.55+noise(p*2.03)*.27+noise(p*4.13)*.13+noise(p*8.2)*.05;}
      vec3 image(sampler2D tex,vec2 uv,float ca){return vec3(texture2D(tex,clamp(uv+vec2(ca,0.),.001,.999)).r,texture2D(tex,clamp(uv,.001,.999)).g,texture2D(tex,clamp(uv-vec2(ca,0.),.001,.999)).b);}
      void main(){
        float p=clamp(progress,0.,1.),e=p*p*(3.-2.*p); vec2 uv=vUv;
        vec3 a=image(from,uv,0.),b=image(to,uv,0.);
        if(reduced>.5){gl_FragColor=vec4(mix(a,b,e),1.);return;}
        float envelope=sin(p*3.14159265);
        vec2 origin=mode<.5?vec2(.5,.31):mode>2.5?vec2(.5,.52):vec2(.5);
        vec2 q=(uv-origin)*vec2(aspect,1.);float r=length(q),n=fbm(q*5.+vec2(p*.7,-p*.4));
        vec3 color;
        if(mode<.5){
          // The pendant becomes the source of a jagged luminous fault; no full-frame spinning.
          float radius=-.18+e*(length(vec2(aspect,1.))*.64+.42);
          float fault=r+(n-.5)*.19-radius;
          float edge=exp(-abs(fault)*58.)*envelope;
          vec2 normal=normalize(q+vec2(.0001))/vec2(aspect,1.);
          vec2 warp=normal*edge*.055;
          a=image(from,.5+(uv-.5)*(1.-.10*e)+warp,edge*.009);
          b=image(to,.5+(uv-.5)*(1.05-.05*e)-warp,edge*.006);
          float opening=1.-smoothstep(-.025,.025,fault);
          color=mix(a,b,opening);
          color+=edge*vec3(.32,.64,.8)*1.45;
          float filaments=pow(max(0.,1.-abs(fault+.028)*110.),3.)*noise(q*95.);
          color+=filaments*envelope*vec3(.9,.55,.3);
          vec2 cells=floor(q*65.);float fleck=step(.975,hash(cells))*pow(max(0.,1.-length(fract(q*65.)-.5)*2.),6.);
          color+=fleck*exp(-abs(fault)*7.)*envelope*vec3(.8,.76,.55)*2.;
        }else if(mode<1.5){
          // Blood-red ink filaments turn into a warm exposure wash, revealing the school.
          float field=fbm(q*3.+vec2(p*.35,-p*.25))*.7+uv.y*.3;
          float mask=smoothstep(field-.12,field+.12,e*1.4-.2);
          float rim=4.*mask*(1.-mask)*envelope;
          vec2 warp=vec2(sin(n*15.),cos(n*13.))*rim*.022;
          color=mix(image(from,uv+warp,rim*.003),image(to,uv-warp,0.),mask);
          color=mix(color,color*vec3(.7,.15,.23),rim*.65*(1.-e));
          color+=rim*e*vec3(.36,.23,.12);
        }else if(mode>2.5){
          // Through the doors: the light at the end of the passage swells towards you and takes the whole view, never
          // quite white, and the next world comes up out of its middle, settling from slightly too close as it clears.
          float rise=smoothstep(0.,.5,p),clear=smoothstep(.3,1.,p);
          vec3 cream=vec3(1.,.93,.81);
          vec2 at=origin+(uv-origin)/(1.+.38*rise*rise);
          // Rushing forwards: the outgoing frame smears along lines from the light.
          // Each pixel starts its taps at a different offset, so the copies blur instead of banding.
          vec3 near=vec3(0.);float jitter=hash(uv*913.7);
          for(int i=0;i<12;i++)near+=image(from,mix(at,origin,(float(i)+jitter)*.008*rise),0.);
          near/=12.;
          float glow=exp(-r*r/(.012+.75*rise*rise));
          float veil=clamp(glow*(.25+1.4*rise)+rise*rise*.55,0.,.94);
          vec3 out1=mix(near*(1.+.7*rise),cream,veil);
          // The push-in keeps easing all the way to the hand-off rather than stopping short of it.
          float scale=1.15-.15*(1.-pow(1.-clamp((p-.3)/.7,0.,1.),1.7));
          vec3 world=image(to,origin+(uv-origin)/scale,0.);
          float reach=clear*(length(vec2(aspect,1.))*.5+.55);
          float shown=1.-smoothstep(reach-.5,reach,r);
          float haze=pow(1.-clear,1.6)*.94;
          vec3 in1=mix(world*mix(vec3(1.),vec3(1.06,1.,.9),haze),cream,haze);
          color=mix(out1,in1,shown*smoothstep(.26,.46,p));
        }else{
          float field=fbm(q*4.+vec2(0.,p*.2));
          float mask=smoothstep(field-.18,field+.18,e*1.5-.25);
          color=mix(a,b,mask);
          color+=sin(mask*3.14159)*envelope*.09*vec3(.82,.79,.7);
        }
        // Exact endpoints avoid a flash when the live canvases replace this composite.
        color=mix(a,color,smoothstep(0.,.06,p));color=mix(color,b,smoothstep(.94,1.,p));
        gl_FragColor=vec4(color,1.);
      }`});
  const scene=new T.Scene(),camera=new T.Camera(),quad=new T.Mesh(new T.PlaneGeometry(2,2),material);scene.add(quad);
  let textures=[];
  const drawImage=p=>{uniforms.progress.value=p;renderer.render(scene,camera);};
  return {
    capture(a,b,type,reduced=false){textures.forEach(t=>t.dispose());textures=[a,b].map(source=>{const t=new T.CanvasTexture(source);t.colorSpace=T.NoColorSpace;t.generateMipmaps=false;t.minFilter=T.LinearFilter;return t;});uniforms.from.value=textures[0];uniforms.to.value=textures[1];uniforms.mode.value={rift:0,ink:1,ash:2,enter:2,door:3}[type]||0;uniforms.reduced.value=Number(reduced);},
    resize(w,h){renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(w,h,false);uniforms.aspect.value=w/h;},
    draw:drawImage,
    dispose(){textures.forEach(t=>t.dispose());quad.geometry.dispose();material.dispose();renderer.dispose();}
  };
}
