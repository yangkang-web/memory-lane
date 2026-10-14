import * as T from 'three';

export function createWorldLighting(scene) {
  const sunOffset=new T.Vector3(-38,83,46),sunDirection=sunOffset.clone().normalize();
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
  const context=canvas.getContext('2d'),pixels=context.createImageData(canvas.width,canvas.height);
  function hash(x,y,z){const n=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return n-Math.floor(n);}
  function noise(x,y,z){const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);let fx=x-ix,fy=y-iy,fz=z-iz;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);fz=fz*fz*(3-2*fz);let value=0;for(let a=0;a<2;a++)for(let b=0;b<2;b++)for(let c=0;c<2;c++)value+=hash(ix+a,iy+b,iz+c)*(a?fx:1-fx)*(b?fy:1-fy)*(c?fz:1-fz);return value;}
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
    const phi=(x/canvas.width-.5)*Math.PI*2,theta=y/canvas.height*Math.PI;
    const dx=Math.sin(theta)*Math.cos(phi),dy=Math.cos(theta),dz=Math.sin(theta)*Math.sin(phi);
    const horizon=Math.pow(1-Math.abs(dy),3),sun=Math.max(0,dx*sunDirection.x+dy*sunDirection.y+dz*sunDirection.z);
    const n=noise(dx*4,dy*4,dz*4)*.58+noise(dx*9+7,dy*9,dz*9)*.28+noise(dx*23,dy*23,dz*23)*.14;
    // Sparse bright clouds leave most of the blue sky open, even while it rains.
    const cloud=T.MathUtils.smoothstep(n,.62,.78)*Math.min(1,Math.max(0,dy)*5);
    const glow=Math.pow(sun,24)*.18+Math.pow(sun,480)*.3;
    const base=dy>0?[.3+horizon*.4,.49+horizon*.26,.69+horizon*.1]:[.29,.33,.28];
    const i=(y*canvas.width+x)*4;
    for(let c=0;c<3;c++)pixels.data[i+c]=Math.min(255,255*(base[c]*(1-cloud)+[.91,.93,.92][c]*cloud+glow*[1,.91,.72][c]));
    pixels.data[i+3]=255;
  }
  context.putImageData(pixels,0,0);
  const sky=new T.CanvasTexture(canvas);sky.colorSpace=T.SRGBColorSpace;sky.mapping=T.EquirectangularReflectionMapping;
  scene.background=sky;scene.environment=sky;scene.environmentIntensity=.65;
  scene.fog=new T.Fog('#b4c6d0',95,320);
  const fill=new T.HemisphereLight('#c7dce9','#666853',1.25);scene.add(fill);
  const sun=new T.DirectionalLight('#fff0d9',4.8);sun.position.copy(sunOffset);sun.castShadow=true;
  sun.shadow.mapSize.set(4096,4096);sun.shadow.normalBias=.035;sun.shadow.bias=-.00008;
  Object.assign(sun.shadow.camera,{left:-65,right:65,top:65,bottom:-65,near:1,far:240});sun.shadow.camera.updateProjectionMatrix();scene.add(sun,sun.target);
  let lastX=Infinity,lastZ=Infinity,lastSpan=0;
  return {sky,sun,fill,sunDirection,haze:.55,scatter:1,
    applyWeather(state,overview=false){sun.intensity=state.sun;fill.intensity=state.fill;scene.environmentIntensity=state.environment;
      scene.fog.near=state.fogNear*(overview?1.8:1);scene.fog.far=state.fogFar*(overview?1.7:1);this.haze=state.haze;this.scatter=state.sun/4.8;},
    update(camera){const overview=camera.position.y>45,span=overview?180:65;
      const x=overview?0:Math.round(camera.position.x/12)*12,z=overview?30:Math.round(camera.position.z/12)*12;
      if(x===lastX&&z===lastZ&&span===lastSpan)return false;
      lastX=x;lastZ=z;lastSpan=span;sun.target.position.set(x,0,z);sun.position.copy(sun.target.position).add(sunOffset);
      Object.assign(sun.shadow.camera,{left:-span,right:span,top:span,bottom:-span});sun.shadow.camera.updateProjectionMatrix();sun.target.updateMatrixWorld();sun.updateMatrixWorld();return true;
    },
    dispose(){sky.dispose();sun.shadow.map?.dispose();},
  };
}
