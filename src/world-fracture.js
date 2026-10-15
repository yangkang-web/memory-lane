import * as THREE from 'three';
import { WIPE_TIMING, worldWipeAt } from './world-wipe.js';

// A refractive fracture in the image itself, rather than a row of sprite shards.
// The rooms render only when the camera changes; this screen pass animates their
// captured, aligned pixels. No third scene, downloaded VFX, or per-frame uploads.
export function createWorldFracture(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setClearColor(0, 0);
  renderer.toneMapping = THREE.NoToneMapping;
  const surfaces = [document.createElement('canvas'), document.createElement('canvas')];
  const contexts = surfaces.map(surface => surface.getContext('2d'));
  const maps = surfaces.map(surface => {
    const map = new THREE.CanvasTexture(surface);
    // Captured pixels are already display encoded. Preserve both rooms exactly.
    map.colorSpace = THREE.NoColorSpace;
    map.minFilter = map.magFilter = THREE.LinearFilter;
    map.generateMipmaps = false;
    return map;
  });
  const uniforms = {
    whiteWorld: { value: maps[0] }, ruinedWorld: { value: maps[1] },
    resolution: { value: new THREE.Vector2(1, 1) },
    center: { value: 1.12 }, time: { value: 0 }, intensity: { value: 0 },
    collision: { value: 0 }, release: { value: 0 }, travel: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms, depthTest: false, depthWrite: false, toneMapped: false,
    vertexShader: `varying vec2 vUv;
      void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`,
    fragmentShader: `
      precision highp float;
      uniform sampler2D whiteWorld,ruinedWorld;
      uniform vec2 resolution;
      uniform float center,time,intensity,collision,release,travel;
      varying vec2 vUv;
      vec2 hash2(vec2 p){
        return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);
      }
      float noise(vec2 p){
        vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(hash2(i).x,hash2(i+vec2(1,0)).x,f.x),
          mix(hash2(i+vec2(0,1)).x,hash2(i+1.).x,f.x),f.y);
      }
      float fbm(vec2 p){
        return noise(p)*.57+noise(p*2.07+8.3)*.28+noise(p*4.21+17.4)*.15;
      }
      // Shared polygonal cells keep neighbouring surfaces visibly connected.
      vec4 facets(vec2 p){
        vec2 tile=floor(p),f=fract(p),nearest=vec2(0.); float first=8.,second=8.;
        for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
          vec2 offset=vec2(float(x),float(y)),seed=hash2(tile+offset);
          vec2 delta=offset+.15+seed*.7-f; float d=dot(delta,delta);
          if(d<first){second=first;first=d;nearest=seed;}else second=min(second,d);
        }
        return vec4(nearest,sqrt(second)-sqrt(first),sqrt(first));
      }
      vec2 safeUV(vec2 p){return clamp(p,vec2(.001),vec2(.999));}
      vec3 world(vec2 uv,float blend){
        return mix(texture2D(ruinedWorld,safeUV(uv)).rgb,texture2D(whiteWorld,safeUV(uv)).rgb,blend);
      }
      void main(){
        vec2 pixel=vUv*resolution;
        float scale=clamp(resolution.y/850.,.7,1.3);
        float line=(center-.12+.24*vUv.y)*resolution.x;
        float turbulence=fbm(vec2(pixel.y/(81.*scale),time*.12));
        float irregular=(turbulence-.5)*26.*scale;
        irregular+=(noise(vec2(pixel.y/(13.*scale),2.7))-.5)*4.*scale;
        float distance=(line+irregular-pixel.x)/scale;
        float nearFront=exp(-abs(distance)/65.);
        float edgeBand=exp(-abs(distance)/18.);
        vec2 domainWarp=vec2(fbm(pixel/(137.*scale)),fbm(pixel/(119.*scale)+13.))*1.7;
        vec4 cell=facets(pixel/(49.*scale)+domainWarp);
        // The surface first compresses, then fractures into refractive facets.
        float wake=exp(-abs(distance+28.)/100.)*intensity;
        float stress=(.52+travel*.48+collision*.28+release*.48)*intensity;
        float structure=exp(-pow(distance/63.,2.))*stress;
        float tilt=sin(time*.7+cell.x*8.+cell.y*5.)*.18;
        vec2 normal=(cell.xy-.5)*2.+vec2(tilt,-tilt*.6);
        vec2 field=vec2(fbm(pixel/(77.*scale)+vec2(time*.2,0.)),
          fbm(pixel/(91.*scale)+vec2(8.,-time*.17)))-.5;
        vec2 displacement=(normal*14.*structure+field*11.*nearFront*stress)*scale;
        displacement.x+=sin(distance*.046-time*.8)*exp(-abs(distance)/110.)*7.*stress*scale;
        // A travelling pressure ripple, not a whole-screen flash or camera jump.
        float ringRadius=collision*175.+release*240.;
        float ring=sin(abs(distance)*.065-ringRadius*.035)*exp(-abs(distance)/150.);
        displacement+=vec2(ring,ring*.12)*(collision+release)*7.*scale;
        displacement.x=-displacement.x;
        vec2 warped=vUv+displacement/resolution;
        float cellTear=(cell.x-.5)*17.*structure;
        float blend=smoothstep(-1.2,1.2,distance+cellTear);
        vec3 color=world(warped,blend);
        // A short directional echo is restricted to fast motion at the fault.
        vec2 drag=vec2(travel*5.*nearFront*intensity*scale/resolution.x,0.);
        color=mix(color,world(warped+drag,blend),travel*nearFront*.18);
        // Dispersion follows the fracture normals, so it refracts scene detail.
        vec2 dispersion=(normal*.75+vec2(1.,.2))*nearFront*stress*2.6*scale/resolution;
        color.r=world(warped+dispersion,blend).r;
        color.b=world(warped-dispersion,blend).b;
        float fractureZone=exp(-abs(distance)/23.)*structure;
        float polygonEdge=(1.-smoothstep(.009,.035,cell.z))*fractureZone;
        float bevel=exp(-cell.z*25.)*fractureZone;
        float orientation=dot(normal,normalize(vec2(-.6,.8)));
        color*=1.+orientation*.07*fractureZone;
        color*=1.-polygonEdge*.27;
        color+=vec3(.55,.69,.72)*bevel*max(orientation,0.)*.13;
        float specular=pow(max(0.,orientation),9.)*fractureZone;
        color+=vec3(.27,.35,.37)*specular*.16;
        // A dark interior and light catching broken lips give the rift thickness.
        float fault=exp(-abs(distance+cellTear)/3.8)*intensity;
        color*=1.-fault*.68;
        float lip=exp(-abs(distance+cellTear-3.6)/1.35)*intensity;
        float glint=smoothstep(.36,.73,noise(vec2(pixel.y/(21.*scale),time*.37)));
        color+=vec3(.56,.73,.77)*lip*(.16+glint*.48);
        float backLip=exp(-abs(distance+cellTear+5.)/2.2)*intensity;
        color+=vec3(.55,.43,.27)*backLip*glint*.25;
        // Broad, low-energy scattering supports the edge rather than outlining it.
        color+=vec3(.13,.23,.26)*edgeBand*intensity*(.08+glint*.09+collision*.09);
        color=mix(color,color*vec3(.93,.97,1.01),wake*.08);
        float fineGrain=(hash2(pixel+floor(time*18.)).x-.5)*.012*nearFront*intensity;
        color+=fineGrain;
        // Sparse motes disperse into the wake; no opaque paper confetti.
        vec2 dustSpace=pixel/scale+vec2(time*13.,time*9.);
        vec2 dustTile=floor(dustSpace/19.),dustUV=fract(dustSpace/19.);
        vec2 dustSeed=hash2(dustTile);
        float mote=1.-smoothstep(.018,.065,length(dustUV-dustSeed));
        float sparse=step(.94,dustSeed.x);
        float dustBand=exp(-abs(distance+45.)/85.)*intensity;
        color+=vec3(.42,.48,.41)*mote*sparse*dustBand;
        gl_FragColor=vec4(color,1.);
      }`,
  });
  const scene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  scene.add(quad);
  const camera = new THREE.Camera();
  let captured = false;
  function clear() { canvas.hidden = true; }
  return {
    resize(width, height, dpr) {
      renderer.setPixelRatio(Math.min(dpr, 1.5));
      renderer.setSize(width, height, false);
      uniforms.resolution.value.set(width, height);
    },
    capture(white, apocalypse) {
      if (!apocalypse) return;
      [white, apocalypse].forEach((source, index) => {
        const surface = surfaces[index];
        if (surface.width !== source.width || surface.height !== source.height) {
          // WebGL texture storage is immutable after its first upload. Recreate
          // that storage when the viewport rotates or changes size.
          maps[index].dispose();
          surface.width = source.width; surface.height = source.height;
        }
        contexts[index].drawImage(source, 0, 0);
        maps[index].needsUpdate = true;
      });
      captured = true;
    },
    clear,
    draw({ phase, center }, elapsed) {
      if (!captured || phase === 'white' || phase === 'apocalypse') { clear(); return; }
      canvas.hidden = false;
      const meet = (elapsed - WIPE_TIMING.lead - WIPE_TIMING.reveal) / 1000;
      const release = meet - WIPE_TIMING.hold / 1000;
      uniforms.center.value = center / 100;
      uniforms.time.value = elapsed / 1000;
      uniforms.intensity.value = Math.min(1, Math.max(0, (center + 12) / 12), Math.max(0, (112 - center) / 12));
      uniforms.collision.value = meet >= 0 ? Math.exp(-meet * 5) : 0;
      uniforms.release.value = release >= 0 ? Math.exp(-release * 5) : 0;
      // Derive energy from actual eased movement, so the fault settles gradually
      // at the stop instead of changing its appearance on a phase boundary.
      const velocity = Math.abs(worldWipeAt(elapsed + 8).center - worldWipeAt(Math.max(0, elapsed - 8)).center) / 16;
      uniforms.travel.value = Math.min(1, velocity / .065);
      renderer.render(scene, camera);
    },
    dispose() {
      maps.forEach(map => map.dispose());
      surfaces.forEach(surface => { surface.width = surface.height = 1; });
      quad.geometry.dispose(); material.dispose(); renderer.dispose(); clear();
    },
  };
}
