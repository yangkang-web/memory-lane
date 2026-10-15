import * as T from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';

// One occupied-room reflection, blurred and blended into the mineral floor.
// Other rooms are hidden to prevent recursive renders and unnecessary GPU work.
export function addFloorReflections(scene,rooms) {
  const shader={
    uniforms:{...Reflector.ReflectorShader.uniforms},
    vertexShader:`
      uniform mat4 textureMatrix;
      varying vec4 reflectedUv;
      varying vec3 worldPoint;
      varying vec2 floorUv;
      void main() {
        reflectedUv=textureMatrix*vec4(position,1.0);
        worldPoint=(modelMatrix*vec4(position,1.0)).xyz;
        floorUv=uv;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }`,
    fragmentShader:`
      uniform sampler2D tDiffuse;
      varying vec4 reflectedUv;
      varying vec3 worldPoint;
      varying vec2 floorUv;
      void main() {
        vec2 uv=reflectedUv.xy/reflectedUv.w;
        // Nine taps soften silhouettes; the reflection is deliberately faint.
        float radius=.0025+.003*clamp(distance(cameraPosition,worldPoint)/12.0,0.0,1.0);
        vec3 reflection=texture2D(tDiffuse,uv).rgb*.28;
        for(int x=-1;x<=1;x++) for(int y=-1;y<=1;y++) {
          if(x!=0||y!=0) reflection+=texture2D(tDiffuse,uv+vec2(float(x),float(y))*radius).rgb*.09;
        }
        float facing=abs(normalize(cameraPosition-worldPoint).y);
        float fresnel=.04+.12*pow(1.0-facing,3.0);
        vec2 edge=smoothstep(vec2(0.0),vec2(.035),floorUv)*smoothstep(vec2(0.0),vec2(.035),1.0-floorUv);
        gl_FragColor=vec4(reflection,fresnel*edge.x*edge.y);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  };
  const floors=rooms.map(room=>{
    const surface=new Reflector(new T.PlaneGeometry(room.right-room.left-.28,11.45),{
      textureWidth:512,textureHeight:512,multisample:0,clipBias:.003,shader,
    });
    surface.rotation.x=-Math.PI/2;surface.position.set((room.left+room.right)/2,.490,-28.125);
    surface.material.transparent=true;surface.material.depthWrite=false;
    surface.renderOrder=0;surface.visible=false;scene.add(surface);
    return {room,surface};
  });
  return {update(active){for(const {room,surface} of floors)surface.visible=room===active;}};
}
