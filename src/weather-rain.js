import * as T from 'three';

// One instanced draw for nearby rain; a top-down scene depth capture shelters
// interiors, awnings and surviving floor plates without rectangular rain masks.
export function createWeatherRain(scene) {
  const count=3200,geometry=new T.InstancedBufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute([-1,0,0,1,0,0,-1,1,0,1,1,0],3));geometry.setIndex([0,1,2,2,1,3]);
  const offsets=[],seeds=[];let seed=1907;const random=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};
  for(let i=0;i<count;i++){offsets.push((random()-.5)*64,random()*24,(random()-.5)*64);seeds.push(random(),random());}
  geometry.setAttribute('dropOffset',new T.InstancedBufferAttribute(new Float32Array(offsets),3));geometry.setAttribute('dropSeed',new T.InstancedBufferAttribute(new Float32Array(seeds),2));geometry.instanceCount=count;
  const depthTarget=new T.WebGLRenderTarget(2048,2048,{depthTexture:new T.DepthTexture(2048,2048,T.UnsignedIntType)});
  const material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{time:{value:0},rain:{value:0},center:{value:new T.Vector3()},roofDepth:{value:depthTarget.depthTexture}},vertexShader:`
    attribute vec3 dropOffset;attribute vec2 dropSeed;uniform float time;uniform vec3 center;
    varying vec2 stroke;varying vec3 world;varying float opacitySeed;varying float viewDistance;
    void main(){float speed=6.5+dropSeed.x*3.;float y=mod(dropOffset.y-time*speed,24.);
      vec3 head=center+vec3(dropOffset.x+y*.085,y,dropOffset.z+y*.035);
      float length=.18+dropSeed.y*.24;vec3 right=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]);
      world=head+vec3(.085,1.,.035)*position.y*length+right*position.x*(.005+dropSeed.x*.003);
      stroke=position.xy;opacitySeed=dropSeed.y;vec4 view=modelViewMatrix*vec4(world,1.);viewDistance=-view.z;gl_Position=projectionMatrix*view;
    }`,fragmentShader:`
    uniform sampler2D roofDepth;uniform float rain;varying vec2 stroke;varying vec3 world;varying float opacitySeed;varying float viewDistance;
    void main(){if(opacitySeed>rain*.82)discard;
      vec2 roofUv=vec2(world.x,-world.z)/780.+.5;
      float roof=250.-(.2+texture2D(roofDepth,roofUv).r*259.8);
      if(world.y<max(.09,roof+.08))discard;
      float feather=pow(max(0.,1.-abs(stroke.x)),.7)*sin(stroke.y*3.14159);
      float distanceFade=smoothstep(.8,2.,viewDistance)*(1.-smoothstep(22.,44.,viewDistance));
      gl_FragColor=vec4(.64,.73,.78,feather*distanceFade*rain*(.24+opacitySeed*.21));
    }`});
  const rainMesh=new T.Mesh(geometry,material);rainMesh.frustumCulled=false;rainMesh.name='Sheltered fine rain';rainMesh.renderOrder=3;rainMesh.visible=false;scene.add(rainMesh);
  let ready=false;
  return {
    capture(renderer){
      const roofCamera=new T.OrthographicCamera(-390,390,390,-390,.2,260);roofCamera.position.set(0,250,0);roofCamera.up.set(0,0,-1);roofCamera.lookAt(0,0,0);roofCamera.updateMatrixWorld();
      const target=renderer.getRenderTarget(),shadowUpdate=renderer.shadowMap.needsUpdate,hidden=[];
      scene.traverse(o=>{if((o.isReflector||o===rainMesh)&&o.visible){hidden.push(o);o.visible=false;}});
      try{renderer.shadowMap.needsUpdate=false;renderer.setRenderTarget(depthTarget);renderer.clear();renderer.render(scene,roofCamera);ready=true;}
      finally{hidden.forEach(o=>{o.visible=true;});renderer.shadowMap.needsUpdate=shadowUpdate;renderer.setRenderTarget(target);}
    },
    update(camera,state,time){rainMesh.visible=ready&&state.rain>.005;material.uniforms.time.value=time;material.uniforms.rain.value=state.rain;
      material.uniforms.center.value.set(Math.round(camera.position.x/8)*8,Math.max(0,camera.position.y-12),Math.round(camera.position.z/8)*8);},
    dispose(){rainMesh.removeFromParent();geometry.dispose();material.dispose();depthTarget.dispose();},
  };
}
