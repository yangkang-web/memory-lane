import * as T from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { addFloorReflections } from './classroom-floor-reflection.js';
import { furnishClassroom } from './classroom.js';
import { interiorWallFinishes } from './wall-materials.js';
import { springWindowCenters } from './window-petals.js';

export const interiorStops = [
  { id: 'gate', title: 'Main gate', subtitle: 'Your campus starts here', position: [-5.5, 2.15, 38], yaw: 0 },
  { id: 'corridor', title: 'Main hallway', subtitle: 'Follow the afternoon light', position: [-15, 2.15, -20.4], yaw: -Math.PI / 2 },
  { id: 'classroom', title: 'Room 101', subtitle: 'Sunlight through the blossoms', position: [-31.4, 2.05, -23.55], yaw: .28 },
  { id: 'sunlit', title: 'Window view', subtitle: 'An afternoon in class', position: [-33.5, 1.62, -23.25], yaw: -.12, pitch: .015, fov: 58, compactPosition: [-35.35, 1.65, -23.7], compactYaw: .04 },
];

// The first floor is a continuous, walkable shell in the same campus coordinates.
export function buildSchoolInterior({ scene, box, cyl, material, textSign, block }) {
  const doors = [];
  const animatedWindows = [], motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const rooms = [
    {number:'103',left:-10.5,right:-.8,door:-9},
    {number:'104',left:-.8,right:8.8,door:.7,sideWindows:1},
    {number:'101',left:-36.8,right:-26,door:-35.3,sideWindows:-1},
    {number:'102',left:-26,right:-17.5,door:-24.5},
  ];
  const floorReflections=addFloorReflections(scene,rooms);
  const { plaster: wall, paint: trim } = interiorWallFinishes();
  const wood = '#b68c60', frame = '#efe8d6';
  const floorY = .45, ceilingY = 4.8;
  // A shared, restrained sky sheen keeps the view through the panes clear.
  const glassCanvas=document.createElement('canvas');glassCanvas.width=glassCanvas.height=256;
  const gc=glassCanvas.getContext('2d'),sky=gc.createLinearGradient(0,0,0,256);
  sky.addColorStop(0,'#a4dcec');sky.addColorStop(.55,'#dceff1');sky.addColorStop(1,'#f9f3d6');
  gc.fillStyle=sky;gc.fillRect(0,0,256,256);
  for(const offset of [-120,70]) {
    gc.fillStyle='rgba(255,255,255,.6)';gc.beginPath();
    gc.moveTo(offset,0);gc.lineTo(offset+28,0);gc.lineTo(offset+180,256);gc.lineTo(offset+152,256);gc.fill();
  }
  const glassMap=new T.CanvasTexture(glassCanvas);glassMap.colorSpace=T.SRGBColorSpace;
  const glassMaterial=new T.MeshPhysicalMaterial({map:glassMap,color:'#e3f5fc',transparent:true,opacity:.12,
    roughness:.12,metalness:0,clearcoat:1,clearcoatRoughness:.08,depthWrite:false});
  function wallBox(x, z, w, d, h = 4.3) {
    box(w, h, d, wall, x, floorY + h / 2, z);
    box(w + .015, 1.12, d + .015, trim, x, 1.01, z);
    box(w + .035, .09, d + .035, '#6c8879', x, 1.58, z);
    box(w + .025, .12, d + .025, '#66796d', x, .52, z);
    block(x, z, w, d);
  }
  function solid(parent, w, h, d, color, x, y, z) {
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), material(color));
    mesh.position.set(x, y, z);mesh.castShadow = mesh.receiveShadow = true;parent.add(mesh);return mesh;
  }
  function glass(parent, w, h, x, y, z) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, .045), glassMaterial);
    m.position.set(x, y, z);parent.add(m);return m;
  }
  function hingedDoor({ name, x, z, width = 1.65, height = 2.9, direction = 1, angle = Math.PI / 2, metal = false, radius = 3, centerX = x + direction * width / 2 }) {
    const pivot = new T.Group();pivot.position.set(x, floorY, z);scene.add(pivot);
    const dx = direction * width / 2, col = metal ? '#466a59' : wood;
    solid(pivot, width, .17, .13, col, dx, .12, 0);
    solid(pivot, width, .17, .13, col, dx, height - .1, 0);
    for (const a of [0, direction * width]) solid(pivot, .13, height, .15, col, a, height / 2, 0);
    if (metal) {
      solid(pivot, width, .65, .12, col, dx, .6, 0);
      for (let p = .3; p < width; p += .32) solid(pivot, .055, height - .7, .06, '#718d78', direction * p, (height + .7) / 2, 0);
      solid(pivot, width, .09, .1, '#c0ad79', dx, 1.38, 0);
    } else {
      solid(pivot, width - .16, 1.45, .13, col, dx, .84, 0);
      glass(pivot, width - .2, height - 1.75, dx, (height + 1.55) / 2, 0);
      solid(pivot, .12, .38, .14, '#626e61', direction * (width - .22), 1.2, .12);
      solid(pivot, .12, .38, .14, '#626e61', direction * (width - .22), 1.2, -.12);
    }
    doors.push({ name, pivot, width, direction, angle, radius, centerX, z, progress: 0 });
  }
  // Existing gate pillars are retained; the paired metal leaves now actually open.
  hingedDoor({ name: 'Main gate', x: -12.5, z: 36, width: 7, height: 3.25, radius: 10, centerX: -5.5, metal: true });
  hingedDoor({ name: 'Main gate', x: 1.5, z: 36, width: 7, direction: -1, angle: -Math.PI / 2, height: 3.25, radius: 10, centerX: -5.5, metal: true });
  for (const x of [-13, 2]) block(x, 36, 1, 1.3);
  for (const [left,right] of [[-45,-13],[2,45]]) block((left+right)/2,37,right-left,.35);

  // Upper floors remain intact; only the ground floor is hollowed out.
  box(46, 7.2, 15, '#9b5546', -14, 8.4, -26.5);
  box(46.5, .24, 15.5, '#c6bfa9', -14, .32, -26.5);
  box(46.2, .22, 15.2, wall, -14, ceilingY, -26.5);
  box(7.4, 10.2, 11.6, '#9b5546', -14, 9.9, -23.8);
  for(const x of [-36.85,8.85]) {
    wallBox(x,-20.625,.3,3.25);
    box(.3,.85,11.75,trim,x,.875,-28.125);block(x,-28.125,.3,11.75);
    box(.3,.45,11.75,wall,x,4.575,-28.125);
    for(const [a,b] of [[-34,-33.45],[-30.35,-29.85],[-26.75,-26.25],[-23.15,-22.25]])
      box(.3,3.05,b-a,wall,x,2.825,(a+b)/2);
    for(const z of springWindowCenters) {
      for(const dz of [-1.58,1.58])box(.5,3.13,.1,frame,x,2.825,z+dz);
      for(const y of [1.28,4.37])box(.5,.1,3.24,frame,x,y,z);
      box(.15,.065,3.1,frame,x,2.85,z);
      box(.15,3.05,.055,frame,x,2.825,z);
      // Slide the right sash behind the left, leaving a real opening for petals.
      const fixed=glass(scene,1.48,2.94,x,2.825,z-.78);fixed.rotation.y=Math.PI/2;
      const sashX=x+(x<0?.09:-.09),sashZ=z-.6;
      const sliding=glass(scene,1.48,2.94,sashX,2.825,sashZ);sliding.rotation.y=Math.PI/2;
      for(const dz of [-.77,.77])box(.08,3.02,.055,frame,sashX,2.825,sashZ+dz);
      for(const y of [1.34,2.85,4.31])box(.08,.05,1.54,frame,sashX,y,sashZ);
      block(x,z,.3,3.2);
    }
  }
  // Front wall: regularly spaced windows and an actual doorway in the middle.
  for (const [left, right] of [[-37, -17.5], [-10.5, 9]]) {
    box(right - left, 1.1, .3, trim, (left + right) / 2, 1, -19);
    box(right - left, 1, .3, wall, (left + right) / 2, 4.2, -19);
    block((left + right) / 2, -19, right - left, .3);
    for (let x = left + .2; x < right - 3; x += 3.2) {
      box(.26, 4.2, .4, frame, x, 2.55, -19);
      glass(scene, 2.9, 2.2, x + 1.6, 2.65, -19);
      box(2.9, .07, .15, frame, x + 1.6, 2.65, -19);
      box(.07, 2.2, .15, frame, x + 1.6, 2.65, -19);
    }
  }
  wallBox(-17.65, -18.4, .3, 1.5);wallBox(-10.35, -18.4, .3, 1.5);
  for (const [left, right] of [[-17.5, -15.7], [-12.3, -10.5]]) wallBox((left + right) / 2, -17.9, right - left, .25);
  box(3.5, 1.3, .3, wall, -14, 4.1, -17.9);
  for (const x of [-15.78, -12.22]) box(.13, 3.2, .35, '#547765', x, 2, -17.9);
  box(3.7, .14, .35, '#547765', -14, 3.53, -17.9);
  hingedDoor({ name: 'Main entrance', x: -15.65, z: -17.9, width: 1.65, angle: Math.PI / 2, centerX: -14, radius: 4.2 });
  hingedDoor({ name: 'Main entrance', x: -12.35, z: -17.9, width: 1.65, direction: -1, angle: -Math.PI / 2, centerX: -14, radius: 4.2 });
  textSign('MAIN ENTRANCE', 3.3, .52, -14, 4.12, -17.72);
  box(7.2, .16, 2.2, '#d6d1bb', -14, .37, -18.1);
  box(3.3, .022, 1.6, '#73927b', -14, .47, -18.6);

  // Windows are actual openings aligned to each classroom, with deep reveals.
  wallBox(-14,-34,46,.42,1.25);
  wallBox(-14,-34,6.8,.42);
  for (const {left,right,sideWindows} of rooms) {
    if(sideWindows){wallBox((left+right)/2,-34,right-left,.42);continue;}
    const centers=[left+1.3,right-1.3], half=.925;
    const a=centers[0]+half,b=centers[1]-half,cx=(a+b)/2,span=b-a;
    for(const [start,end] of [[left,centers[0]-half],[centers[1]+half,right]]) {
      box(end-start,3.1,.42,wall,(start+end)/2,3.25,-34);
    }
    box(span,2.2,.42,wall,cx,2.8,-34);
    box(span,.18,.42,wall,cx,4.71,-34);
    // Three true clerestory openings above the teaching board.
    for(let i=0;i<=3;i++)box(.12,.76,.49,frame,a+i*span/3,4.27,-33.98);
    for(const y of [3.94,4.6])box(span,.1,.5,frame,cx,y,-33.98);
    for(let i=0;i<3;i++)glass(scene,span/3-.12,.56,a+(i+.5)*span/3,4.27,-34.12);
    for(const x of centers) {
      box(1.85,.74,.42,wall,x,4.43,-34);
      for(const dx of [-.96,.96])box(.11,2.39,.56,frame,x+dx,2.85,-33.96);
      for(const y of [1.68,4.02])box(2.03,.12,.56,frame,x,y,-33.96);
      glass(scene,1.83,2.23,x,2.85,-34.14);
      for(const dx of [-.86,.86])box(.045,2.19,.07,'#c9c9ba',x+dx,2.85,-34.08);
      box(.047,2.23,.1,frame,x,2.85,-34.04);
      box(1.83,.055,.1,frame,x,2.85,-34.04);
      box(.07,.17,.06,'#a6b9bb',x+.09,2.72,-33.96);
    }
  }
  // A continuous corridor runs east-west between the entrance and four classrooms.
  for (let x = -36; x < 9; x += 1.2) box(.025, .012, 9.7, '#c8c6b7', x, .452, -24);
  for (let z = -28.5; z <= -19.5; z += 1.2) box(45.4, .012, .025, '#c8c6b7', -14, .452, z);
  box(44.8, .018, .12, '#b4bba5', -14, .46, -21.75);
  for (const x of [-26, -17.5, -10.5, -.8]) wallBox(x, -28.125, .22, 11.75);
  wallBox(-14, -22.25, 6.8, .22);
  textSign('STAY CURIOUS. KEEP GROWING.', 5.8, .8, -14, 2.75, -22.1, '#6c8979');
  for (const x of [-32, -23, -14, -5, 4]) {
    box(2.2, .13, .5, '#d0d5c5', x, 4.61, -20.5);
    const lightPanel = solid(scene, 2, .045, .35, '#fff7dc', x, 4.52, -20.5);
    lightPanel.material = new T.MeshStandardMaterial({color:'#fff7dc',emissive:'#fff2d6',emissiveIntensity:.6});
  }
  const corridorLight = new T.PointLight('#fff2d5', 22, 28, 1.3);corridorLight.position.set(-14, 3.8, -20.4);scene.add(corridorLight);
  textSign('← 101 / 102     1F     103 / 104 →', 5.5, .48, -14, 3.92, -20.9);

  for (const room of rooms) {
    const {left,right,door,number}=room,cx=(left+right)/2;
    const gap=1.75;
    wallBox((left+door-gap/2)/2,-22.25,door-gap/2-left,.22);
    wallBox((door+gap/2+right)/2,-22.25,right-door-gap/2,.22);
    box(gap,1.32,.25,wall,door,4.1,-22.25);
    for(const x of [door-gap/2,door+gap/2])box(.12,3.1,.3,'#74917c',x,2,-22.25);
    box(gap+.15,.12,.3,'#74917c',door,3.51,-22.25);
    // Layered jambs and casing sit outside the clear opening on both sides.
    for(const z of [-22.45,-22.05]) {
      for(const side of [-1,1]) {
        const x=door+side*(gap/2+.075);
        box(.13,3.09,.075,frame,x,2,z);
        box(.035,3.09,.095,'#b6baaa',x+side*.065,2,z);
      }
      box(gap+.29,.13,.09,frame,door,3.54,z);
    }
    hingedDoor({name:`Room ${number}`,x:door-gap/2+.05,z:-22.25,width:1.65,centerX:door,radius:2.8});
    textSign(`ROOM ${number}`,1.75,.4,door,3.85,-22.07);
    const windows=furnishClassroom({ scene, box, cyl, block, material, room });
    if(windows)animatedWindows.push({room,windows});
  }

  // Reuse the same three window lights for the occupied room; the high-window
  // projection and tall-window projections remain independent of room count.
  const windowMask=document.createElement('canvas');windowMask.width=windowMask.height=256;
  const mask=windowMask.getContext('2d');mask.fillStyle='#000';mask.fillRect(0,0,256,256);
  mask.filter='blur(3px)';mask.fillStyle='#fff';
  for(const x of [38,132])for(const y of [32,132])mask.fillRect(x,y,86,92);
  const windowMap=new T.CanvasTexture(windowMask);
  const highMask=document.createElement('canvas');highMask.width=highMask.height=256;
  const hc=highMask.getContext('2d');hc.fillStyle='#000';hc.fillRect(0,0,256,256);
  hc.filter='blur(2px)';hc.fillStyle='#fff';
  for(const x of [27,97,167])hc.fillRect(x,91,61,74);
  const highMap=new T.CanvasTexture(highMask);
  const windowLights=Array.from({length:3},(_,i)=>{
    const light=new T.SpotLight('#ffefd0',0,18,i===2?.65:.55,.2,1.4);light.map=i===2?highMap:windowMap;
    light.castShadow=true;light.shadow.mapSize.set(1024,1024);
    light.shadow.intensity=.82;
    light.shadow.bias=-.00015;light.shadow.normalBias=.025;
    light.shadow.camera.near=.15;light.shadow.camera.far=16;
    scene.add(light,light.target);return light;
  });
  // Parallel sunlight travels through the actual side-window openings. A local
  // shadow frustum resolves slim mullions and desk legs without three spot cones.
  RectAreaLightUniformsLib.init();
  const windowFill=Array.from({length:3},()=>{const light=new T.RectAreaLight('#fff1d9',0,3.0,2.95);scene.add(light);return light;});
  const sideSun=new T.DirectionalLight('#ffe1ad',0);
  sideSun.castShadow=true;sideSun.shadow.mapSize.set(2048,2048);
  Object.assign(sideSun.shadow.camera,{left:-10,right:10,top:9,bottom:-9,near:.5,far:38});
  sideSun.shadow.normalBias=.018;sideSun.shadow.bias=-.00008;sideSun.shadow.radius=2;
  scene.add(sideSun,sideSun.target);
  let warmLight=false,storyLight=false;

  return {
    setSunset(value){warmLight=value;},
    setStoryLight(value){storyLight=value;},
    update(dt,position,walking){
      const active=walking&&position.z<-22.3&&position.z>-34
        ? rooms.find(r=>position.x>r.left&&position.x<r.right):null;
      floorReflections.update(active);
      for(const {room,windows}of animatedWindows)windows.update(dt,active===room,motionPreference.matches,position);
      sideSun.intensity=T.MathUtils.damp(sideSun.intensity,active?.sideWindows?(storyLight?4.4:warmLight?3.4:3.7):0,7,dt);
      sideSun.color.set(warmLight?'#ffc28b':'#ffdda6');
      sideSun.castShadow=!!active?.sideWindows;
      windowFill.forEach((light,i)=>{
        light.intensity=T.MathUtils.damp(light.intensity,active?.sideWindows?(storyLight?1.4:warmLight?.85:1.25):0,7,dt);
        if(active?.sideWindows){
          const side=active.sideWindows,wall=side<0?active.left:active.right;
          light.position.set(wall-side*.18,2.83,[-31.9,-28.3,-24.7][i]);
          light.rotation.y=side*Math.PI/2;
          light.color.set(warmLight?'#ffd5a4':'#fff0d2');
        }
      });
      if(active?.sideWindows) {
        const side=active.sideWindows,wall=side<0?active.left:active.right;
        sideSun.position.set(wall+side*10,warmLight?4.9:5.8,-23.7);
        sideSun.target.position.set(wall-side*7,.5,-31.1);
        sideSun.target.updateMatrixWorld();
      }
      windowLights.forEach((light,i)=>{
        light.castShadow=!!active&&!active.sideWindows;
        light.intensity=T.MathUtils.damp(light.intensity,active&&!active.sideWindows?(i===2?(warmLight?105:95):(warmLight?85:80)):0,7,dt);
        light.color.set(warmLight?'#ffd3a0':'#fff2d5');
        if(active){
          light.map=active.sideWindows?windowMap:(i===2?highMap:windowMap);
          if(active.sideWindows){
            const side=active.sideWindows,x=side<0?active.left+.24:active.right-.24,z=[-31.9,-28.3,-24.7][i];
            light.position.set(x,3.95,z);
            light.target.position.set(x-side*(warmLight?7.8:6.2),.6,z-2.8);
          }else{
            const x=i===2?(active.left+active.right)/2:i?active.right-1.3:active.left+1.3;
            light.position.set(x,i===2?4.24:3.58,-33.68);
            light.target.position.set(x+1.6,.55,warmLight?-25.7:-28.1);
          }
          light.target.updateMatrixWorld();
        }
      });
      for(const door of doors){
        const near=walking&&Math.hypot(position.x-door.centerX,position.z-door.z)<door.radius;
        door.progress=T.MathUtils.damp(door.progress,near?1:0,7,dt);
        door.pivot.rotation.y=door.angle*door.progress;
      }
    },
    canOccupy(x,z){
      return !doors.some(door=>{
        const a=door.pivot.rotation.y,dx=x-door.pivot.position.x,dz=z-door.z;
        const localX=dx*Math.cos(a)-dz*Math.sin(a),localZ=dx*Math.sin(a)+dz*Math.cos(a);
        const along=localX*door.direction;
        return along>-.22&&along<door.width+.22&&Math.abs(localZ)<.27;
      });
    },
    zone(position){
      if(position.z< -22.3&&position.z> -34&&position.x> -37&&position.x<9){const room=rooms.find(r=>position.x>r.left&&position.x<r.right);if(room)return `Room ${room.number}`;}
      if(position.z< -18&&position.z> -22.4&&position.x> -37&&position.x<9)return 'Main hallway';
      if(position.z>32)return 'Main gate';
      return 'Exploring campus';
    },
  };
}
