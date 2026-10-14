import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// A deliberately simple, original character: rigid parts follow a bone hierarchy.
// This demonstrates joint animation without external models or smooth skinning.
export function createStudent(scene, { reducedMotion = false } = {}) {
  const root = new T.Group();
  root.name = 'Campus student';
  scene.add(root);
  const colors = { skin:'#dba477', hair:'#352b29', blazer:'#315c58', trousers:'#344451',
    shirt:'#fff4dc', tie:'#bf7849', shoe:'#283337', sole:'#dfd9c7', bag:'#b96c46', eye:'#242c2e' };
  const materials = Object.fromEntries(Object.entries(colors).map(([key,color]) =>
    [key,new T.MeshStandardMaterial({color,roughness:.78})]));
  const cube = new RoundedBoxGeometry(1,1,1,2,.12);
  const ball = new T.SphereGeometry(1,16,12);
  function part(parent, material, position, scale, round = false) {
    const mesh = new T.Mesh(round ? ball : cube,materials[material]);
    mesh.position.set(...position); mesh.scale.set(...scale);
    mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh); return mesh;
  }
  function joint(name,parent,x,y,z) {
    const bone=new T.Bone(); bone.name=name; bone.position.set(x,y,z);parent.add(bone);return bone;
  }
  const hips=joint('hips',root,0,.87,0);
  const chest=joint('chest',hips,0,.32,0);
  part(hips,'trousers',[0,.01,0],[.42,.2,.27]);
  part(chest,'blazer',[0,.02,0],[.5,.56,.3]);
  part(chest,'shirt',[0,.17,.157],[.2,.24,.025]);
  const tie=part(chest,'tie',[0,.09,.183],[.06,.24,.025]);tie.rotation.z=.06;
  for(const x of [-.115,.115]) {
    const collar=part(chest,'shirt',[x,.26,.17],[.12,.12,.025]);collar.rotation.z=x<0?-.4:.4;
  }
  for(const y of [-.14,-.04])part(chest,'tie',[.025,y,.161],[.024,.024,.018],true);
  part(chest,'shirt',[-.16,.07,.16],[.065,.07,.022]);
  part(chest,'bag',[0,.02,-.25],[.43,.47,.22]);
  part(chest,'tie',[0,-.1,-.38],[.31,.18,.06]);
  for(const x of [-.17,.17])part(chest,'bag',[x,.08,.17],[.045,.42,.038]);
  const head=joint('head',chest,0,.39,0);
  part(head,'skin',[0,-.03,0],[.11,.14,.11]);
  part(head,'skin',[0,.18,.015],[.245,.28,.225],true);
  part(head,'hair',[0,.31,-.025],[.25,.17,.23],true);
  part(head,'hair',[0,.18,-.17],[.22,.21,.09],true);
  for(const x of [-.16,-.05,.07,.16]) {
    const fringe=part(head,'hair',[x,.34,.15],[.1,.14,.09],true);fringe.rotation.z=-.3;
  }
  for(const x of [-.245,.245])part(head,'skin',[x,.17,0],[.045,.065,.045],true);
  for(const x of [-.085,.085]) {
    part(head,'eye',[x,.2,.224],[.025,.033,.013],true);
    part(head,'shirt',[x-.006,.21,.235],[.007,.009,.004],true);
    part(head,'hair',[x,.265,.213],[.062,.015,.018]);
  }
  part(head,'skin',[0,.13,.238],[.034,.04,.034],true);
  part(head,'tie',[0,.07,.224],[.067,.014,.012]);
  const arms=[],legs=[];
  for(const side of [-1,1]) {
    const shoulder=joint(side<0?'left shoulder':'right shoulder',chest,side*.3,.23,0);
    part(shoulder,'blazer',[0,-.14,0],[.16,.3,.19]);
    const elbow=joint('elbow',shoulder,0,-.29,0);
    part(elbow,'blazer',[0,-.12,0],[.14,.26,.16]);
    part(elbow,'shirt',[0,-.245,0],[.145,.045,.165]);
    part(elbow,'skin',[0,-.305,0],[.075,.09,.065],true);
    arms.push({shoulder,elbow});
    const hip=joint(side<0?'left hip':'right hip',hips,side*.115,0,0);
    part(hip,'trousers',[0,-.19,0],[.18,.4,.22]);
    const knee=joint('knee',hip,0,-.38,0);
    part(knee,'trousers',[0,-.17,0],[.16,.36,.19]);
    const ankle=joint('ankle',knee,0,-.35,0);
    part(ankle,'shoe',[0,-.07,.055],[.2,.14,.34]);
    part(ankle,'sole',[0,-.125,.055],[.205,.035,.345]);
    for(const z of [.04,.1])part(ankle,'shirt',[0,-.005,z],[.115,.014,.018]);
    legs.push({hip,knee,ankle});
  }
  let action=reducedMotion?'idle':'walk',elapsed=0,phase=0,route=-Math.PI/2;
  root.position.set(-7.7,.41,25);
  function setAction(value) {
    if(!['idle','walk','wave'].includes(value))return;
    action=value;elapsed=0;
  }
  function update(dt) {
    const step=Number.isFinite(dt)?T.MathUtils.clamp(dt,0,.05):0;
    elapsed+=step;
    if(action==='walk') {
      route+=step*.48;phase+=step*6;
      root.position.set(-6+1.7*Math.sin(route),.41,25+2*Math.cos(route));
      root.rotation.y=Math.atan2(1.7*Math.cos(route),-2*Math.sin(route));
    }
    const blend=1-Math.exp(-step*12);
    const walking=action==='walk';
    for(let i=0;i<2;i++) {
      const p=phase+i*Math.PI,swing=Math.sin(p);
      const wave=action==='wave'&&i===1;
      const arm=arms[i],leg=legs[i];
      arm.shoulder.rotation.x=T.MathUtils.lerp(arm.shoulder.rotation.x,walking?swing*.48:wave?-.3:0,blend);
      arm.shoulder.rotation.z=T.MathUtils.lerp(arm.shoulder.rotation.z,wave?2.35:(i===0?-.08:.08),blend);
      arm.elbow.rotation.x=T.MathUtils.lerp(arm.elbow.rotation.x,walking?-.15-Math.max(0,-swing)*.3:wave?-.4:0,blend);
      arm.elbow.rotation.z=T.MathUtils.lerp(arm.elbow.rotation.z,wave?Math.sin(elapsed*9)*.3:0,blend);
      leg.hip.rotation.x=T.MathUtils.lerp(leg.hip.rotation.x,walking?-swing*.52:0,blend);
      leg.knee.rotation.x=T.MathUtils.lerp(leg.knee.rotation.x,walking?Math.max(0,-swing)*.8:0,blend);
      leg.ankle.rotation.x=T.MathUtils.lerp(leg.ankle.rotation.x,walking?Math.max(0,swing)*.15:0,blend);
    }
    hips.position.y=T.MathUtils.lerp(hips.position.y,.87+(walking?Math.abs(Math.cos(phase))*.025:0),blend);
    chest.rotation.y=T.MathUtils.lerp(chest.rotation.y,walking?Math.sin(phase)*.05:0,blend);
    head.rotation.z=T.MathUtils.lerp(head.rotation.z,action==='wave'?-.08:0,blend);
  }
  return { root, update, setAction, get action(){return action;} };
}
