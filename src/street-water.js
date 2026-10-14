import * as T from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const WATER_LEVEL=.088;
export const PUDDLES=[[4,13,3.2,6.3],[-3,-19,2.6,7],[4,46,2.7,4.8],[-7,-68,1.8,4]];

// All pools share a single horizontal reflection capture, rather than re-rendering
// the city for each puddle. Patch UVs keep a separate, soft shoreline per pool.
export function puddleGeometry() {
  const patches=PUDDLES.map(([x,z,sx,sz],i)=>{
    const g=new T.PlaneGeometry(sx*2.4,sz*2.4);g.translate(x,-z,0);
    g.setAttribute('patchSeed',new T.Float32BufferAttribute(Array(4).fill(i*3.71),1));return g;
  });
  const geometry=mergeGeometries(patches);patches.forEach(g=>g.dispose());return geometry;
}
export function createStreetWater(scene) {
  const water=new Reflector(puddleGeometry(),{textureWidth:1024,textureHeight:1024,multisample:0,clipBias:.001,shader:{
    name:'Shallow street water',
    uniforms:{tDiffuse:{value:null},textureMatrix:{value:null},color:{value:new T.Color('#8fa4a4')},time:{value:0},wetness:{value:.12},rain:{value:0}},
    vertexShader:`
      uniform mat4 textureMatrix;
      attribute float patchSeed;
      varying vec2 patchUv;varying float seed;varying vec4 reflectionUv;varying vec3 worldPosition;
      void main(){patchUv=uv*2.-1.;seed=patchSeed;reflectionUv=textureMatrix*vec4(position,1.);
        worldPosition=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
    `,
    fragmentShader:`
      uniform sampler2D tDiffuse;uniform float time,wetness,rain;
      varying vec2 patchUv;varying float seed;varying vec4 reflectionUv;varying vec3 worldPosition;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
      void main(){
        vec2 footprint=patchUv/(.55+.45*wetness);
        float shore=length(footprint)+.13*(noise(patchUv*4.+seed)-.5)+.055*(noise(patchUv*19.+seed)-.5);
        float wet=1.-smoothstep(.72,.99,shore);
        if(wet<.005)discard;
        float pool=1.-smoothstep(.63,.84,shore);
        vec2 p=worldPosition.xz;
        // Millimetric wind ripples: crossing long waves and small capillary waves.
        vec2 ripple=vec2(sin(dot(p,vec2(2.4,.8))+time*.65),cos(dot(p,vec2(-.7,3.1))-time*.5))*.017;
        ripple+=vec2(cos(p.x*13.+time),sin(p.y*11.-time*.8))*.004;
        // Small impacts expand independently; they disappear as rain fades.
        vec2 cell=floor(p*1.6),local=fract(p*1.6)-.5;
        vec2 impact=vec2(hash(cell+7.),hash(cell+21.))*.42-.21;
        float age=fract(time*.72+hash(cell));vec2 delta=local-impact;float d=length(delta);
        float ring=exp(-pow((d-age*.27)/.018,2.))*(1.-age)*rain;
        ripple+=normalize(delta+vec2(.001))*ring*.055;
        vec3 normal=normalize(vec3(ripple.x,1.,ripple.y));
        vec3 view=normalize(cameraPosition-worldPosition);
        float fresnel=.025+.975*pow(1.-max(dot(view,normal),0.),5.);
        vec2 uv=reflectionUv.xy/reflectionUv.w+ripple*.018*pool;
        // A lightly rough reflection retains architecture without razor-sharp mirror edges.
        vec2 blur=vec2(.0012+.0015*(1.-pool));
        vec3 reflection=texture2D(tDiffuse,clamp(uv,vec2(.003),vec2(.997))).rgb*.4;
        reflection+=(texture2D(tDiffuse,clamp(uv+blur,vec2(.003),vec2(.997))).rgb+texture2D(tDiffuse,clamp(uv-blur,vec2(.003),vec2(.997))).rgb)*.15;
        reflection+=(texture2D(tDiffuse,clamp(uv+vec2(blur.x,-blur.y),vec2(.003),vec2(.997))).rgb+texture2D(tDiffuse,clamp(uv+vec2(-blur.x,blur.y),vec2(.003),vec2(.997))).rgb)*.15;
        float reflected=pool*(.035+.8*fresnel);
        float damp=wet*(.1+.13*wetness);
        float alpha=damp+reflected*(1.-damp);
        // Alpha blending transmits the actual lit asphalt, cracks and lane paint underneath.
        vec3 pigment=vec3(.032,.043,.038);
        vec3 radiance=(pigment*damp+reflection*reflected*(1.-damp))/max(alpha,.001);
        gl_FragColor=vec4(radiance+vec3(.035)*ring*pool,alpha);
      }
    `
  }});
  water.name='Rainwater / soft shoreline and angle-dependent reflection';
  water.position.y=WATER_LEVEL;water.rotation.x=-Math.PI/2;
  water.material.transparent=true;water.material.depthWrite=false;water.material.toneMapped=false;
  water.renderOrder=2;scene.add(water);
  const direction=new T.Vector3(),toward=new T.Vector3();
  return {
    update(seconds,state){water.material.uniforms.time.value=seconds;if(state){water.material.uniforms.wetness.value=state.wetness;water.material.uniforms.rain.value=state.rain;}},
    visibleFrom(camera){camera.getWorldDirection(direction);return PUDDLES.some(([x,z])=>{toward.set(x,WATER_LEVEL,z).sub(camera.position);return toward.length()<38&&toward.normalize().dot(direction)>.45;});},
    dispose(){water.getRenderTarget().dispose();},
  };
}
