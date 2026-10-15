import * as T from 'three';
import { smooth } from './last-companion-timeline.js';

// A shallow service frontage attaches to the existing east block. Openings have
// real depth; actors emerge from those openings rather than appearing in the road.
export function createStreetResponse({street,group,box,mesh,label,concrete,brick,metal,rust,dark,glass}) {
  const root=group(street,0,0,0);root.name='Street awakening / service frontage';
  const front=13.6,back=16.3,base=.24,roof=6.3;
  // Ground level: garage at z72, battered shutter at z78.
  for(const [z,w] of [[68.8,1.6],[75.1,2.6],[82.1,3.6]])box(root,back-front,3.1,w,brick,(front+back)/2,1.79,z);
  box(root,back-front,.4,16,concrete,(front+back)/2,3.54,76);
  box(root,.12,3.2,4.6,dark,back,1.8,72);
  box(root,.12,3.2,3.2,dark,back,1.8,78);
  box(root,2.9,.16,4.6,concrete,14.95,base-.08,72);
  // Window bays above the garage, with thick reveals and a recessed dark room.
  box(root,2.9,.24,16,concrete,14.95,3.87,76);
  box(root,2.9,.3,16,concrete,14.95,6.15,76);
  for(const [z,w]of [[68.7,1.4],[73.5,1.6],[79,1.4],[83.3,1.4]])box(root,2.9,2,w,brick,14.95,5,z);
  box(root,.1,2,16,dark,back,5,76);
  const windows=[];
  for(const [z,w]of [[71.1,3.4],[76.3,4],[81.2,3]]){
    for(const zz of [z-w/2,z+w/2])box(root,.12,2.1,.08,metal,front-.04,4.98,zz);
    for(const y of [4,6])box(root,.15,.09,w,metal,front-.04,y,z);
    box(root,.42,.12,w+.24,concrete,front-.05,3.98,z);
    const pane=box(root,.018,1.9,w-.1,glass,front-.04,5,z,true);windows.push(pane);
    box(root,.1,2,.045,metal,front-.04,5,z);
  }
  // Roof edge leaves a hand-sized coping instead of an invisible launch point.
  box(root,3.2,.20,16.4,concrete,14.95,roof,76);
  box(root,.28,.45,16.4,brick,13.46,roof+.32,76);
  box(root,.4,.09,16.5,concrete,13.46,roof+.59,76);
  for(const z of [68,84])box(root,3.1,.45,.25,brick,14.95,roof+.32,z);
  label(root,'P  /  地下停车场',4.2,.42,13.4,3.22,72,-Math.PI/2,'#b5b5a0','#303b35');
  label(root,'SERVICE · 04',2.9,.36,13.4,3.2,78,-Math.PI/2);
  // Slats buckle outward under separate impacts, with a bottom opening revealing feet.
  const slats=[];
  const shutterMetal=metal.clone();shutterMetal.color.multiplyScalar(1.4);shutterMetal.roughness=.52;
  for(let row=0;row<19;row++){
    const segments=[];
    for(let col=0;col<7;col++)segments.push(box(root,.065,.14,.46,row%4===0?rust:shutterMetal,front,base+.12+row*.145,76.5+col*.46,true));
    slats.push(segments);
  }
  for(const z of [76.2,79.85])box(root,.12,2.95,.12,metal,13.5,1.7,z);
  const garageGate=group(root,front,base,72);
  for(let i=0;i<16;i++)box(garageGate,.07,2.85,.04,metal,0,1.425,-2.15+i*.285,true);
  for(const y of [.1,1.4,2.8])box(garageGate,.09,.07,4.5,rust,0,y,0,true);
  const chips=Array.from({length:20},(_,i)=>{
    const g=new T.TetrahedronGeometry(.025+(i%4)*.009);
    return mesh(root,g,i%3?concrete:rust,front,.3,77,true);
  });
  // A broken roadblock leaves the authored running line open between x=-7 and -4.7.
  for(const [x,z,angle]of [[-9.2,86,.19],[-2.6,86.4,-.37]]){
    const block=group(root,x,.12,z);block.rotation.y=angle;
    box(block,3.5,.42,.7,concrete,0,.21,0);box(block,3.2,.24,.36,concrete,0,.51,0);
    for(const xx of [-1.2,1.2]){const leg=box(block,.06,xx<0?.2:.8,.06,rust,xx,xx<0?.65:.9,.05);leg.rotation.z=.25;}
    const rail=box(block,3.1,.26,.045,metal,0,.95,.06);rail.rotation.z=.24;
    for(let i=0;i<9;i++){const strip=box(block,.13,.23,.012,rust,-1.35+i*.34, .63+i*.075,.09);strip.rotation.z=-.3;}
  }
  // The later pounce breaks a real shop window on the same block.
  const shop=group(root,0,0,0);
  box(shop,2.9,.18,6.4,concrete,14.95,.23,91);
  box(shop,2.9,.3,6.4,concrete,14.95,3.5,91);
  box(shop,.13,3.4,6.4,dark,16.32,1.8,91);
  for(const z of [87.9,94.1])box(shop,2.9,3.3,.4,brick,14.95,1.8,z);
  for(const y of [.45,3.25])box(shop,.12,.08,5.8,metal,13.55,y,91);
  for(const z of [88.2,93.8])box(shop,.12,2.8,.07,metal,13.55,1.85,z);
  const escapeGlass=box(shop,.018,2.75,5.55,glass,13.57,1.85,91,true);
  label(shop,'REPAIRS / CLOSED',5,.4,13.4,3.48,91,-Math.PI/2);
  const shards=Array.from({length:44},(_,i)=>{
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([0,0,0,0,.12+(i%4)*.04,.035,0,.03,.16+(i%3)*.05],3));g.computeVertexNormals();
    return mesh(shop,g,glass,13.57,1,91,true);
  });
  function update(t){
    root.visible=t>=210&&t<289;
    escapeGlass.visible=t<262;
    shards.forEach((m,i)=>{const age=t-262;m.visible=age>=0&&age<9;const velocity=.7+(i%7)*.17;m.position.set(13.57-Math.max(0,age)*velocity,Math.max(.27, .65+(i%8)*.3+.7*age-age*age*1.5),88.7+(i%11)*.43+Math.sin(i)*age*.2);m.rotation.set(age+i,age*2,age*.7);});
    const opening=smooth(t,235.2,238.6);
    garageGate.position.y=base+opening*1.15;
    garageGate.rotation.z=Math.sin(t*23)*.008*opening*(1-opening);
    // Keep both impacts readable from across the street: fast shove, slower recoil.
    const pulse=[235.7,237.1,239.2].reduce((sum,at)=>sum+smooth(t,at,at+.08)*(1-smooth(t,at+.08,at+.62)),0);
    for(let row=0;row<slats.length;row++)for(let col=0;col<7;col++){
      const m=slats[row][col];
      const bend=Math.sin(col/6*Math.PI)*Math.sin((row+1)/20*Math.PI);
      m.position.x=front-bend*(smooth(t,235.7,239.6)*.35+pulse*1.25);
      m.position.y=base+.12+row*.145+(smooth(t,237,240)*.24+pulse*.85)*Math.sin(col/6*Math.PI)*Math.exp(-row/9);
      m.rotation.y=Math.cos(col/6*Math.PI)*bend*(.18+pulse*.38);m.rotation.z=pulse*bend*.28;
    }
    chips.forEach((m,i)=>{const age=t-(t>=237.1?237.1:235.7)-i*.018;m.visible=age>=0&&age<2.8;m.position.set(front-Math.min(1.6,Math.max(0,age)*(.18+i%4*.08)),Math.max(base+.02,2.6+(i%5)*.08-age*age*2),76.7+(i%7)*.38);m.rotation.set(age*3,i,age);});
  }
  return {root,windows,garageGate,slats,escapeGlass,shards,update};
}

// Shared authored paths let timing checks verify emergence and rooftop support.
export function streetResponseActors(t) {
  const out=[];
  if(t<233.7||t>=289)return out;
  // Movement behind the upper windows is deliberately staggered.
  for(let i=0;i<2;i++){
    const u=smooth(t,234+i*.4,237+i*.4);
    out.push({index:i,x:13.94,y:4,z:70.3+i*6+u*1.1,pose:'walk',phase:'window'});
  }
  // Three bodies crouch beneath the rising garage gate, then straighten outside.
  for(let i=0;i<3;i++){
    const u=smooth(t,236+i*.65,243+i*.65);
    out.push({index:2+i,x:15.4-u*5.7-smooth(t,246,280)*8,y:.24,z:70.9+i*.75+u*1.2+smooth(t,246,280)*23,pose:'run',duck:1-smooth(u,.4,.56),phase:'garage'});
  }
  for(let i=0;i<3;i++){
    const u=smooth(t,235.8+i*.65,239.2+i*.65);
    out.push({index:5+i,x:15.25-u*1.6,y:6.4,z:73.4+i*2.15,pose:'climb',phase:'roof',lean:u});
  }
  return out;
}

export function windowPounce(t) {
  if(t<261||t>=271)return null;
  const approach=smooth(t,261,262),leap=smooth(t,262,264),chase=smooth(t,264,268);
  return {x:14.5-.9*approach-3*leap-14.7*chase,y:.24+Math.sin(leap*Math.PI)*.8,z:91+chase*.4,pose:t<264?'fall':'run'};
}

export function streetSurface(x){return .08+.16*smooth(x,10.8,11.5);}

// Keep the lower boot sole on the road as the run cycle bends the knees.
// Roof poses and airborne pounces deliberately bypass this contact correction.
export function groundStreetActor(actor){
  actor.root.updateWorldMatrix(true,true);
  const soleY=Math.min(...actor.legs.map(l=>l.knee.localToWorld(new T.Vector3(0,-.404,-.055)).y));
  actor.root.position.y+=streetSurface(actor.root.position.x)-soleY;
}
