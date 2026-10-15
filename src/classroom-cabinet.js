import * as T from 'three';

let finishes;
function cabinetFinishes() {
  if (finishes) return finishes;
  const label = (text, color) => {
    const c = document.createElement('canvas');c.width = 512;c.height = 128;
    const g = c.getContext('2d');g.fillStyle = color;g.fillRect(0,0,512,128);
    g.strokeStyle = '#d8c9a7';g.lineWidth = 3;g.strokeRect(12,12,488,104);
    g.fillStyle = '#eee6d3';g.font = '28px Georgia';g.textAlign = 'center';g.textBaseline = 'middle';
    g.fillText(text,256,64,472);
    const map = new T.CanvasTexture(c);map.colorSpace = T.SRGBColorSpace;map.anisotropy = 8;
    return new T.MeshStandardMaterial({map,roughness:.88});
  };
  const titles = ['BOTANY','POETRY','OUR WORLD','SKETCHBOOK','STORIES','NATURE'];
  const colors = ['#667d70','#a47752','#637f8b','#b6a078','#8d6c60','#758464'];
  const c = document.createElement('canvas');c.width = c.height = 256;
  const g = c.getContext('2d');g.fillStyle = '#819184';g.fillRect(0,0,256,256);
  for (let i=0;i<256;i+=4) {
    g.fillStyle = '#b9c0a544';g.fillRect(i,0,1,256);
    g.fillStyle = '#435a512b';g.fillRect(0,i,256,1);
  }
  const map = new T.CanvasTexture(c);map.colorSpace = T.SRGBColorSpace;map.anisotropy = 8;
  finishes = {colors,spines:titles.map((t,i)=>label(t,colors[i])),
    labels:['READING','SCIENCE','SUPPLIES'].map(t=>label(t,'#68796c')),
    fabric:new T.MeshStandardMaterial({map,roughness:1}),
    paper:new T.MeshStandardMaterial({color:'#e4dcc7',roughness:.94})};
  return finishes;
}

// A shallow built-in cabinet; geometry joins the existing classroom batches.
export function furnishRearCabinet({x,z,rounded,detailed,wood,steel,props,block}) {
  const f = cabinetFinishes();
  const piece = (w,h,d,mat,dx,y,dz,r=.004) => rounded(w,h,d,mat,x+dx,y,z+dz,0,0,r);
  const face = (w,h,mat,dx,y,dz,roll=0) => {
    const geo = new T.PlaneGeometry(w,h);geo.rotateZ(roll);
    detailed(geo,mat,x+dx,y,z+dz,Math.PI);geo.dispose();
  };
  // Set-back plinth, continuous back, thick end panels and eased shelf fronts.
  piece(2.27,.13,.32,'#64533e',0,.565,.015);
  piece(2.38,1.28,.025,wood,0,1.25,.19);
  for (const dx of [-1.19,1.19]) piece(.07,1.31,.4,wood,dx,1.245,0,.009);
  for (const y of [.62,1.075,1.48,1.9]) {
    piece(2.45,.055,.43,wood,0,y,-.012,.009);
    piece(2.31,.014,.018,'#8f6a44',0,y-.031,-.216,.002);
    piece(2.3,.022,.006,'#92764f',0,y+.039,.173,.001);
  }
  for (const dx of [-.4,.4]) piece(.038,1.22,.365,wood,dx,1.25,.012);
  piece(2.49,.024,.45,wood,0,1.937,-.014,.008);

  for (let bay=0;bay<3;bay++) {
    const bx = (bay-1)*.8;
    // Recessed panel doors, separate frame rails, metal pulls and hinge barrels.
    piece(.752,.386,.028,wood,bx,.846,-.188,.006);
    piece(.644,.278,.012,wood,bx,.846,-.207,.003);
    for (const dx of [-.352,.352]) piece(.048,.386,.028,wood,bx+dx,.846,-.218,.005);
    for (const y of [.677,1.015]) piece(.656,.048,.028,wood,bx,y,-.218,.005);
    for (const dx of [-.065,.065]) piece(.014,.018,.035,steel,bx+dx,.96,-.247,.003);
    piece(.149,.018,.019,steel,bx,.96,-.27,.005);
    for (const y of [.741,.946]) {
      piece(.018,.055,.018,steel,bx-.368,y,-.236,.004);
      piece(.004,.009,.002,'#59615d',bx-.368,y,-.246,.001);
    }
    piece(.234,.047,.007,steel,bx,1.075,-.232,.003);
    face(.216,.033,f.labels[bay],bx,1.075,-.237);
    for (const dx of [-.352,.352]) for (const zz of [-.13,.13]) {
      piece(.018,.014,.017,steel,bx+dx,1.442,zz,.003);
    }
  }

  function standingBook(dx,base,index) {
    const w=.056+(index%3)*.012,h=.255+(index%4)*.021,d=.24+(index%2)*.025;
    const color=f.colors[index%6],front=-.153+(index%3)*.009;
    piece(w-.009,h-.015,d-.014,f.paper,dx,base+h/2,front+d/2);
    for (const side of [-1,1]) piece(.005,h,d,color,dx+side*(w/2-.0025),base+h/2,front+d/2,.002);
    piece(w,h,.013,color,dx,base+h/2,front,.005);
    face(h*.76,w*.71,f.spines[index%6],dx,base+h/2,front-.0075,Math.PI/2);
    for (const yy of [.027,h-.028]) piece(w*.86,.006,.002,'#d7c399',dx,base+yy,front-.0075,.001);
    for (let j=0;j<4;j++) piece(.001,h-.025,d-.02,'#c9bea6',dx-w*.28+j*w*.18,base+h/2,front+d/2,.0004);
  }
  // Group books by subject, varying their depth and height; add metal bookends.
  for (const [bx,base,count,start] of [[-.8,1.105,6,0],[-.8,1.51,5,3],[0,1.51,6,1]]) {
    for (let i=0;i<count;i++) standingBook(bx-.25+i*.082,base,i+start);
    const end=bx-.25+(count-1)*.082+.059;
    piece(.018,.22,.24,'#738075',end,base+.11,-.015,.003);
    piece(.12,.007,.24,'#738075',end-.05,base+.004,-.015,.002);
  }
  function basket(dx,base) {
    const front=-.178;
    piece(.60,.018,.30,f.fabric,dx,base+.009,-.015);
    for (const side of [-1,1]) piece(.018,.245,.30,f.fabric,dx+side*.291,base+.132,-.015);
    for (const zz of [front,.127]) piece(.60,.245,.014,f.fabric,dx,base+.132,zz);
    for (const zz of [front-.006,.137]) piece(.615,.024,.022,'#a6afa0',dx,base+.252,zz,.006);
    for (const xx of [-.303,.303]) piece(.024,.024,.31,'#a6afa0',dx+xx,base+.252,-.015,.006);
    piece(.145,.047,.008,'#b9bdac',dx,base+.185,front-.012,.012);
    piece(.119,.025,.009,'#44584c',dx,base+.185,front-.017,.009);
    piece(.20,.054,.006,'#c5c8b6',dx,base+.085,front-.012,.003);
    face(.18,.037,f.labels[2],dx,base+.085,front-.016);
  }
  basket(.8,1.105);
  // Flat exercise books and lidded archival boxes add varied silhouettes.
  for (let i=0;i<3;i++) props.book(x-.04,1.105+i*.048,z-.025,{variant:i,yaw:Math.PI+(i-1)*.04,scale:.94});
  for (let i=0;i<2;i++) {
    const base=1.51+i*.142;
    piece(.55,.124,.29,i?'#b9a381':'#829487',.8,base+.062,-.01,.008);
    piece(.566,.022,.308,i?'#c8b494':'#99a999',.8,base+.129,-.01,.005);
    piece(.206,.058,.008,steel,.8,base+.065,-.16,.003);
    face(.184,.041,f.labels[i],.8,base+.065,-.165);
  }
  for (let i=0;i<2;i++) props.book(x-.7,1.95+i*.051,z-.01,{variant:i+1,yaw:Math.PI+.07-i*.12});
  // Include the projecting handles and top in the walking collider.
  block(x,z-.025,2.51,.52);
}
