import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { interiorWallFinishes, mapWallUVs } from './wall-materials.js';
import { addClassroomSurfaceDetail } from './classroom-surface-detail.js';
import { addSpringWindowDetails } from './spring-window-details.js';
import { classroomFloorFinish } from './classroom-floor.js';
import { classroomWood } from './classroom-wood.js';
import { drawChalkWriting } from './chalk-writing.js';
import { classroomProps } from './classroom-props.js';
import { sunflowerPaintingMaterial, sunflowerPaintingAspect } from './sunflower-painting.js';
import { furnishRearCabinet } from './classroom-cabinet.js';

let finishes;
const forms = new Map();
function classroomFinishes() {
  if (finishes) return finishes;
  finishes = {
    oak: classroomWood(),
    chairWood: classroomWood({baseColor:[187,165,135],roughnessLevel:170,roughness:.9,clearcoat:.28,clearcoatRoughness:.45}),
    chairFrame: new T.MeshStandardMaterial({color:'#8e9993',metalness:.55,roughness:.5}),
    ...interiorWallFinishes(),
    steel: new T.MeshStandardMaterial({ color: '#a9b1b6', metalness: .88, roughness: .25 }),
    vase: new T.MeshPhysicalMaterial({color:'#b7d4d6',roughness:.14,clearcoat:1,
      transparent:true,opacity:.5,depthWrite:false,side:T.DoubleSide}),
    light: new T.MeshStandardMaterial({ color: '#f6efdf', emissive: '#fff2d6', emissiveIntensity: .4, roughness: .7 }),
  };
  return finishes;
}

// Full-size rooms, front-facing individual desks and clear central/side aisles.
export function furnishClassroom({ scene, box, cyl, block, material, room }) {
  const { left, right, number } = room;
  const cx = (left + right) / 2, north = -34, south = -22.25, mid = (north + south) / 2;
  const navy = '#658ba0', sage = '#a6bda4', oak = '#b88957', ivory = '#f5efde', dark = '#697477';
  const f = classroomFinishes(), batches = new Map();
  const resolve = mat => typeof mat === 'string' ? material(mat) : mat;
  function detailed(geo, mat, x, y, z, yaw = 0, tilt = 0) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();g.rotateX(tilt);g.rotateY(yaw);g.translate(x, y, z);
    const m = resolve(mat);mapWallUVs(g,m);if (!batches.has(m)) batches.set(m, []);batches.get(m).push(g);
  }
  function rounded(w, h, d, mat, x, y, z, yaw = 0, tilt = 0, radius = .025) {
    const key = [w,h,d,radius].join(':');
    if (!forms.has(key)) forms.set(key, new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w/3, h/3, d/3)));
    detailed(forms.get(key), mat, x, y, z, yaw, tilt);
  }
  const props=classroomProps({detailed,steel:f.steel});
  function rod(a, b, r = .023, mat = f.steel) {
    const start = new T.Vector3(...a), end = new T.Vector3(...b);
    const geo = new T.CylinderGeometry(r, r, start.distanceTo(end), 8);
    geo.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0), end.clone().sub(start).normalize()));
    const center = start.add(end).multiplyScalar(.5);detailed(geo, mat, ...center.toArray());geo.dispose();
  }
  function artwork(w, h, x, y, z, angle, draw, lit = false) {
    const canvas = document.createElement('canvas');canvas.width = 1536;canvas.height = Math.round(1536 * h / w);
    draw(canvas.getContext('2d'), canvas.width, canvas.height);
    const texture = new T.CanvasTexture(canvas);texture.colorSpace = T.SRGBColorSpace;
    const plane = new T.Mesh(new T.PlaneGeometry(w,h),lit?new T.MeshStandardMaterial({map:texture,roughness:.9}):new T.MeshBasicMaterial({map:texture,toneMapped:false}));
    plane.receiveShadow=true;
    plane.position.set(x,y,z);plane.rotation.y=angle;scene.add(plane);return plane;
  }
  function label(ctx, text, x, y, size, color = '#384d5b', align = 'left') {
    ctx.fillStyle=color;ctx.font=`600 ${size}px sans-serif`;ctx.textAlign=align;ctx.fillText(text,x,y);
  }
  function chair(x,z) {
    rounded(.51,.024,.52,f.chairWood,x,.98,z,0,-.035,.009);
    // A regular face grid is needed before bending: rounded-box faces contain
    // broad triangles that otherwise bridge the curve and bury the fasteners.
    const back=new T.BoxGeometry(.49,.34,.022,20,12,2);
    const bp=back.attributes.position,point=new T.Vector3(),core=new T.Vector3();
    for(let i=0;i<bp.count;i++) {
      point.fromBufferAttribute(bp,i);
      core.set(T.MathUtils.clamp(point.x,-.241,.241),T.MathUtils.clamp(point.y,-.166,.166),T.MathUtils.clamp(point.z,-.007,.007));
      point.sub(core).normalize().multiplyScalar(.004).add(core);
      point.z+=.045*Math.pow(point.x/.245,2);bp.setXYZ(i,point.x,point.y,point.z);
    }
    back.computeVertexNormals();detailed(back,f.chairWood,x,1.26,z+.245,0,-.09);back.dispose();
    rounded(.09,.055,.0015,'#e8dfce',x,1.34,z+.251,0,-.09,.0005);
    const surround=new T.CatmullRomCurve3([
      new T.Vector3(x-.25,.57,z+.25),new T.Vector3(x-.25,1.36,z+.28),
      new T.Vector3(x-.2,1.46,z+.28),new T.Vector3(x+.2,1.46,z+.28),
      new T.Vector3(x+.25,1.36,z+.28),new T.Vector3(x+.25,.57,z+.25)]);
    const tube=new T.TubeGeometry(surround,32,.019,8,false);detailed(tube,f.chairFrame,0,0,0);tube.dispose();
    for(const dx of [-.2,.2]) {
      rod([x+dx,.53,z-.2],[x+dx,.978,z-.18],.023,f.chairFrame);
      rod([x+dx,.53,z+.25],[x+dx,1.4,z+.23],.023,f.chairFrame);
      rod([x+dx,.77,z-.18],[x+dx,.77,z+.23],.018,f.chairFrame);
      for(const dz of [-.2,.25])cyl(.034,.037,.055,'#626b66',x+dx,.52,z+dz,8);
      for(const y of [1.16,1.34]) {
        const screw=new T.SphereGeometry(.014,8,6);screw.scale(1,1,.35);
        const surfaceZ=z+.245+(.011+.045*Math.pow(dx*.8/.245,2))/Math.cos(.09)-Math.tan(.09)*(y-1.26);
        detailed(screw,f.chairFrame,x+dx*.8,y,surfaceZ+.002);screw.dispose();
        box(.014,.002,.002,'#717974',x+dx*.8,y,surfaceZ+.007);
      }
    }
    block(x,z,.53,.57);
  }
  function studentDesk(x,z,row,col) {
    rounded(1.01,.012,.71,'#ac885f',x,1.254,z,0,0,.004);
    rounded(1,.032,.7,f.oak,x,1.2765,z,0,0,.009);
    // Steel apron, open storage tray and rubber-ended tubular legs.
    for(const dx of [-.42,.42])for(const dz of [-.26,.26]) {
      rod([x+dx,.54,z+dz],[x+dx,1.254,z+dz]);
      cyl(.032,.038,.065,'#37494c',x+dx,.52,z+dz,8);
    }
    box(.87,.065,.04,dark,x,1.215,z-.27);box(.87,.065,.04,dark,x,1.215,z+.27);
    for(const dx of [-.42,.42])box(.04,.065,.54,dark,x+dx,1.215,z);
    props.deskTray(x,z,row+col);
    rod([x+.42,1.22,z+.1],[x+.56,1.22,z+.1],.014);
    rod([x+.56,1.22,z+.1],[x+.56,1.26,z+.1],.014);
    chair(x+Math.sin(row*4+col)*.045,z+.77+Math.sin(row*3.1+col*1.7)*.12);
    block(x,z,1.07,.75);
    props.book(x-.17+Math.sin(row+col)*.035,1.295,z+.03+Math.cos(row*2+col)*.04,{open:(row+col)%3!==0,variant:(row+col)%3,yaw:Math.sin(row*2.7+col)*.28,scale:.93+(row+col)%3*.035});
    props.pencil(x+.27,1.299,z+.08,{yaw:.45+Math.sin(row+col)*.2});
    rounded(.07,.026,.04,'#d4b1a0',x+.3,1.31,z+.2,0,0,.006);
    if((row+col)%4===0) {
      rounded(.21,.37,.15,'#718979',x+.58,.96,z+.08,0,0,.04);
      rounded(.17,.16,.045,'#566d66',x+.58,.90,z+.174,0,0,.02);
      rod([x+.53,1.14,z+.08],[x+.53,1.22,z+.08],.014,dark);
      rod([x+.63,1.14,z+.08],[x+.63,1.22,z+.08],.014,dark);
      rod([x+.53,1.22,z+.08],[x+.63,1.22,z+.08],.014,dark);
    }
  }
  function plant(x,y,z) {
    cyl(.16,.12,.25,'#b8866b',x,y+.125,z,16);
    for(let i=0;i<5;i++){
      const g=new T.SphereGeometry(.13,8,6);g.scale(.65,1.8,.7);g.rotateZ((i-2)*.3);
      detailed(g,i%2?'#668868':'#86a27b',x+Math.sin(i*2.4)*.1,y+.4,z+Math.cos(i*2.4)*.1);g.dispose();
    }
  }
  function flowerVase(x,y,z) {
    const profile=[[.065,0],[.09,.035],[.085,.13],[.038,.26],[.033,.34],[.042,.36]];
    const vessel=new T.LatheGeometry(profile.map(([r,h])=>new T.Vector2(r,h)),20);
    detailed(vessel,f.vase,x,y,z);vessel.dispose();
    for(let i=0;i<5;i++) {
      const a=i*2.4,tx=x+Math.cos(a)*.14,tz=z+Math.sin(a)*.11,ty=y+.47+(i%3)*.06;
      rod([x,y+.04,z],[tx,ty,tz],.005,'#6c8a63');
      for(let j=0;j<5;j++) {
        const p=j*Math.PI*.4,g=new T.SphereGeometry(.024,8,6);g.scale(1,.45,1);
        detailed(g,j%2?'#eed0d7':'#f5e6e3',tx+Math.cos(p)*.025,ty,tz+Math.sin(p)*.025);g.dispose();
      }
      const center=new T.SphereGeometry(.012,8,6);detailed(center,'#cdb779',tx,ty+.009,tz);center.dispose();
    }
  }

  // The room itself is deeper, with plaster surfaces, a painted dado and perimeter trim.
  box(right-left-.25,.035,south-north-.25,classroomFloorFinish(),cx,.47,mid);
  for(const side of [-1,1]) {
    if(room.sideWindows===side)continue;
    const x=side<0?left+.135:right-.135;
    rounded(.025,2.94,south-north-.28,f.plaster,x,3.17,mid,0,0,.005);
    rounded(.032,1.01,south-north-.28,f.paint,x,1.125,mid,0,0,.005);
    box(.045,.16,south-north-.26,'#5b736b',x,.58,mid);
    box(.045,.023,south-north-.26,'#617b70',x,1.615,mid);
    rounded(.085,.06,south-north-.26,f.paint,x,1.65,mid,0,0,.01);
    box(.09,.12,south-north-.25,'#eee9dc',x,4.58,mid);
    // Recessed panel joints and a softly rounded cap catch light at close range.
    for(let z=north+.5;z<south-.5;z+=1.25) {
      box(.037,.83,.012,'#6b8377',x,1.12,z);
      rounded(.051,.87,.045,f.paint,x,1.12,z+.025,0,0,.008);
    }
    rounded(.06,.045,south-north-.26,f.paint,x,.71,mid,0,0,.008);
    for(const z of [-25,-30.1]) {
      rounded(.04,.16,.1,ivory,x-side*.02,.83,z,0,0,.012);
      for(const dz of [-.023,.023])box(.008,.04,.01,'#536a64',x-side*.045,.84,z+dz);
    }
  }
  // Project beyond the painted wall face (+.22), avoiding coplanar flicker.
  box(right-left-.25,.14,.08,'#5b736b',cx,.57,north+.25);
  box(right-left-.25,.13,.08,'#eee9dc',cx,4.58,north+.19);
  // A solid teaching wall is flanked by tall windows and low radiators.
  const teachingWidth=room.sideWindows?right-left-.28:right-left-4.45;
  const boardWidth=room.sideWindows?Math.min(7.6,teachingWidth-1):Math.min(5.45,teachingWidth-.35);
  box(teachingWidth,2.48,.42,f.plaster,cx,2.4,north);
  box(teachingWidth,1.14,.44,f.paint,cx,1.02,north);
  for(const x of room.sideWindows?[]:[left+1.3,right-1.3]) {
    rounded(2.12,.11,.7,'#eee8d8',x,1.72,north+.16,0,0,.018);
    box(1.99,.07,.06,'#c1bda9',x,1.64,north+.42);
    for(const dx of [-.52,.52])box(.1,.19,.27,'#ded9c8',x+dx,1.58,north+.24);
    box(1.25,.6,.22,'#c7cec1',x,1.04,north+.28);
    for(let i=0;i<11;i++)box(.045,.55,.12,'#aeb9af',x-.56+i*.112,1.04,north+.42);
    rod([x-.7,.74,north+.29],[x+.7,.74,north+.29],.025,'#a5b4a9');
    box(2.05,.12,.2,'#ddd6c2',x,4.06,north+.28);
    rod([x+.9,3.9,north+.22],[x+.9,2.15,north+.22],.008,'#b4b7a9');
  }
  // Used chalkboard, timber frame, chalk tray and pinned classroom notes.
  rounded(boardWidth,1.82,.13,'#997b53',cx,2.73,north+.31,0,0,.035);
  artwork(boardWidth-.21,1.63,cx,2.73,north+.385,0,(ctx,w,h)=>{
    ctx.fillStyle='#365e57';ctx.fillRect(0,0,w,h);
    for(let i=0;i<48;i++){
      ctx.strokeStyle=`rgba(219,229,207,${.007+i%3*.004})`;ctx.lineWidth=3+i%11;
      ctx.beginPath();ctx.ellipse(w*.37+(i*137)%(w*.47),h*.38+(i*47)%(h*.52),45+i%40,12, -.15,0,Math.PI*1.6);ctx.stroke();
    }
    label(ctx,`ROOM ${number} / SPRING TERM`,55,55,25,'#bdcebd');
    drawChalkWriting(ctx,'A new season,',w*.42,h*.37,45,-.035);
    drawChalkWriting(ctx,'a new beginning.',w*.45,h*.59,43,-.018);
    ctx.strokeStyle='#c7d8bb';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(w*.43,h*.81);ctx.quadraticCurveTo(w*.60,h*.79,w*.80,h*.75);ctx.stroke();
    label(ctx,'APRIL 08',w-55,65,27,'#d1ddc5','right');
    ctx.fillStyle='#eee9d6';ctx.fillRect(45,h*.25,w*.18,h*.55);
    label(ctx,'THIS WEEK',65,h*.34,24,'#63796b');
    for(let i=0;i<4;i++){ctx.fillStyle='#b3b9a6';ctx.fillRect(65,h*(.43+i*.08),w*.13,3);}
    ctx.strokeStyle='#cedac7';ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(w*.88,h*.76,18,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.arc(w*.88,h*.76,10,0,Math.PI);ctx.stroke();
    for(const dx of [-6,6]){ctx.beginPath();ctx.arc(w*.88+dx,h*.76-5,1.8,0,Math.PI*2);ctx.stroke();}
  },true);
  const note=artwork(.48,.59,cx-boardWidth*.31,2.23,north+.405,0,(ctx,w,h)=>{
    ctx.fillStyle='#e5d9b9';ctx.fillRect(0,0,w,h);label(ctx,'THIS FRIDAY',w/2,h*.2,105,'#697b78','center');
    label(ctx,'Spring recital',w/2,h*.44,92,'#66776a','center');
    label(ctx,'3:30 PM',w/2,h*.71,100,'#8d7963','center');
  },true);
  // Lift the lower corners very slightly away from the board.
  note.geometry.dispose();note.geometry=new T.PlaneGeometry(.48,.59,8,8);
  const np=note.geometry.attributes.position;
  for(let i=0;i<np.count;i++)np.setZ(i,Math.pow(Math.max(0,-np.getY(i)/.295),2)*(.008+.025*Math.pow(np.getX(i)/.24,2)));
  note.geometry.computeVertexNormals();
  rounded(.035,.035,.025,'#9e755c',cx-boardWidth*.31,2.49,north+.428,0,0,.01);
  if(room.sideWindows) {
    rounded(3.7,.62,.09,'#977b57',cx,4.06,north+.27,0,0,.015);
    artwork(3.52,.46,cx,4.06,north+.325,0,(ctx,w,h)=>{
      ctx.fillStyle='#f4efdf';ctx.fillRect(0,0,w,h);
      ctx.fillStyle='#6c6b58';ctx.textAlign='center';ctx.font='italic 58px Georgia, serif';
      ctx.fillText('Every day, a new beginning.',w/2,h*.64);
    },true);
  }
  rounded(boardWidth+.05,.075,.25,'#a1ada7',cx,1.78,north+.43,0,0,.025);
  rounded(.24,.07,.12,'#506664',cx+1.4,1.86,north+.4,0,0,.018);
  for(let i=0;i<3;i++)rod([cx-.5+i*.3,1.84,north+.4],[cx-.3+i*.3,1.84,north+.4],.027,[navy,'#a56655','#5e7f69'][i]);
  for(let i=0;i<18;i++)box(.012+(i%3)*.004,.003,.008,'#d8ddc9',cx-.8+i*.1,1.821,north+.39+(i%4)*.025);
  for(const dx of [-boardWidth/2+.3,boardWidth/2-.3])for(const y of [2.1,3.35])rounded(.065,.065,.03,'#9a7563',cx+dx,y,north+.41,0,0,.02);
  artwork(.54,.54,room.sideWindows?cx+boardWidth/2+.42:left+.17,room.sideWindows?3.96:3.65,room.sideWindows?north+.24:-32.5,room.sideWindows?0:Math.PI/2,(ctx,w,h)=>{
    ctx.fillStyle='#ece8dc';ctx.fillRect(0,0,w,h);ctx.fillStyle=navy;ctx.beginPath();ctx.arc(w/2,h/2,w*.48,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#f7f3e7';ctx.beginPath();ctx.arc(w/2,h/2,w*.43,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=navy;ctx.lineWidth=20;
    for(let i=0;i<12;i++){const a=i*Math.PI/6;ctx.beginPath();ctx.moveTo(w/2+Math.sin(a)*w*.35,h/2-Math.cos(a)*h*.35);ctx.lineTo(w/2+Math.sin(a)*w*.39,h/2-Math.cos(a)*h*.39);ctx.stroke();}
    ctx.lineWidth=28;ctx.beginPath();ctx.moveTo(w*.5,h*.21);ctx.lineTo(w*.5,h*.5);ctx.lineTo(w*.71,h*.5);ctx.stroke();
  });

  // Sixteen desks: four rows of four, arranged as two pairs around a broad central aisle.
  const columns=[cx-2.7,cx-1.2,cx+1.2,cx+2.7];
  const rows=[-31.4,-29.3,-27.2,-25.1];
  rows.forEach((z,row)=>columns.forEach((x,col)=>studentDesk(x,z,row,col)));
  addClassroomSurfaceDetail({scene,room,columns,rows});
  const windowDetails=addSpringWindowDetails({scene,room,box,material});
  // Modest teacher workstation stays to one side of the central presentation area.
  const tx=left+2.15,tz=-33.1;
  rounded(1.7,.045,.78,f.oak,tx,1.3225,tz,0,0,.012);
  props.pedestal(tx-.5,.54,tz);
  for(const dz of [-.3,.3])rod([tx+.66,.5,tz+dz],[tx+.66,1.3,tz+dz],.028);
  block(tx,tz,1.7,.8);
  block(tx-.5,tz+.06,.5,.94);
  props.laptop(tx+.15,1.35,tz);
  for(let i=0;i<3;i++)props.book(tx-.5,1.35+i*.052,tz,{variant:i,yaw:(i-1)*.09});
  flowerVase(tx+.64,1.35,tz+.03);

  // Pinboards have timber edges, paper layers and small physical pins.
  for(const [x,angle]of [[left+.18,Math.PI/2],[right-.18,-Math.PI/2]]) {
    if(room.sideWindows===(x<cx?-1:1))continue;
    const z=-27.9;
    rounded(.11,1.6,2.9,f.oak,x,2.85,z,0,0,.02);
    artwork(2.72,1.43,x+(x<cx?.07:-.07),2.85,z,angle,(ctx,w,h)=>{
      ctx.fillStyle='#b49a76';ctx.fillRect(0,0,w,h);label(ctx,x<cx?'STUDENT WORK':'WONDER & DISCOVER',w/2,90,47,'#f7efdc','center');
      for(let i=0;i<3;i++){
        const px=65+i*490;ctx.fillStyle=['#d7e1d4','#e6d7b3','#c7d8db'][i];ctx.fillRect(px,135,420,h-185);
        label(ctx,['OBSERVE','IMAGINE','CREATE'][i],px+210,215,34,navy,'center');
        ctx.strokeStyle=['#759881','#ad865f','#708ea1'][i];ctx.lineWidth=9;ctx.strokeRect(px+100,270,220,150);
        ctx.fillStyle='#faf2df';ctx.fillRect(px+70,h-105,280,12);ctx.fillRect(px+110,h-74,200,10);
      }
    });
    for(const dz of [-1.06,0,1.06])box(.025,.05,.05,'#557968',x+(x<cx?.1:-.1),3.39,z+dz);
  }
  // Hang one framed still life on a solid side wall, clear of windows and pinboards.
  const paintingSide = room.sideWindows === 1 ? -1 : 1;
  const paintingX = paintingSide < 0 ? left + .21 : right - .21;
  const paintingYaw = -paintingSide * Math.PI / 2;
  rounded(1.48,1.79,.09,f.oak,paintingX,2.94,-31.15,paintingYaw,0,.014);
  rounded(1.36,1.67,.012,'#f3ead6',paintingX-paintingSide*.051,2.94,-31.15,paintingYaw,0,.004);
  const painting = new T.Mesh(new T.PlaneGeometry(1.18,1.18/sunflowerPaintingAspect),sunflowerPaintingMaterial());
  painting.name = `Room ${number} — Van Gogh, Sunflowers (1888)`;
  painting.position.set(paintingX-paintingSide*.061,2.94,-31.15);
  painting.rotation.y = paintingYaw;
  painting.receiveShadow = true;
  scene.add(painting);

  // Rear storage occupies only the right corner, leaving the entrance and rear aisle clear.
  const sx=right-1.6;
  furnishRearCabinet({x:sx,z:south-.36,rounded,detailed,wood:f.oak,steel:f.steel,props,block});
  artwork(2.6,.62,sx,2.64,south-.16,Math.PI,(ctx,w,h)=>{
    ctx.fillStyle=navy;ctx.fillRect(0,0,w,h);label(ctx,'OUR CLASS, OUR COMMUNITY',w/2,h*.43,51,'#f3e9d5','center');label(ctx,'Respect. Curiosity. Kindness.',w/2,h*.8,35,'#c8d9d2','center');
  });
  rounded(.14,.23,.045,ivory,room.door+1.18,1.55,south-.14,0,0,.012);
  box(.035,.09,.025,'#9aa99f',room.door+1.18,1.55,south-.17);
  // Ceiling acoustic grid, light diffusers, vent and a small projector.
  for(let x=left+.2;x<right-.1;x+=1.2)box(.028,.025,south-north-.3,'#c4c9be',x,4.66,mid);
  for(let z=north+.2;z<south-.1;z+=1.2)box(right-left-.3,.025,.028,'#c4c9be',cx,4.66,z);
  for(const x of [left+2.4,right-2.4])for(const z of [-25.3,-29.6]){
    for(const dz of [-.65,.65])rod([x,4.68,z+dz],[x,4.12,z+dz],.012);
    rounded(.24,.1,1.8,'#bbc3c0',x,4.08,z,0,0,.012);
    rounded(.19,.025,1.7,f.light,x,4.015,z,0,0,.008);
  }
  box(.6,.05,.52,'#b6c1b8',cx,4.61,-32.9);
  for(let i=0;i<7;i++)box(.48,.025,.022,'#85978e',cx,4.57,-33.1+i*.065);
  rod([cx,4.7,-28.2],[cx,4.2,-28.2],.04);
  rounded(.42,.16,.35,'#dce1d7',cx,4.15,-28.2,0,0,.035);
  const lens=new T.CylinderGeometry(.055,.055,.05,16);lens.rotateX(Math.PI/2);detailed(lens,'#405c6c',cx+.1,4.14,-28.39);lens.dispose();
  const light=new T.PointLight('#e5edff',3.8,15,1.35);light.position.set(cx,3.9,-28.1);scene.add(light);

  // Merge the fine geometry by finish: detail does not mean a draw call for every screw.
  for(const [mat,geos]of batches){
    const combined=mergeGeometries(geos,false);const m=new T.Mesh(combined,mat);m.castShadow=mat!==f.vase;m.receiveShadow=true;scene.add(m);geos.forEach(g=>g.dispose());
  }
  return windowDetails;
}
