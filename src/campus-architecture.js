import * as T from 'three';

// Brick-and-limestone academic buildings with slate roofs and a columned entrance.
export function addCampusArchitecture({ box, cyl, mesh, block, textSign }) {
  const brick = '#9b5546', stone = '#f0e9d7', slate = '#495964', green = '#345c4c';
  function beam(a, b, radius, color) {
    const start = new T.Vector3(...a), end = new T.Vector3(...b);
    const g = new T.CylinderGeometry(radius, radius, start.distanceTo(end), 8);
    g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), end.clone().sub(start).normalize()));
    g.translate(...start.add(end).multiplyScalar(.5).toArray());mesh(g, color);
  }
  function gableRoof(x, y, z, width, depth, rise) {
    const shape = new T.Shape();shape.moveTo(-depth / 2, 0);shape.lineTo(depth / 2, 0);shape.lineTo(0, rise);shape.closePath();
    const roof = new T.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false, steps: 1 });roof.rotateY(Math.PI / 2);
    mesh(roof, slate, x - width / 2, y, z);
    box(width + .3, .12, .2, '#394d57', x, y + rise, z);
    for (const end of [x - width / 2, x + width / 2]) {
      const cap = new T.ExtrudeGeometry(shape, { depth: .06, bevelEnabled: false });cap.rotateY(Math.PI / 2);
      mesh(cap, stone, end - .03, y, z);
      beam([end, y + .04, z - depth / 2], [end, y + rise + .08, z], .09, stone);
      beam([end, y + rise + .08, z], [end, y + .04, z + depth / 2], .09, stone);
      const rim = new T.CylinderGeometry(.39, .39, .1, 24);rim.rotateZ(Math.PI / 2);mesh(rim, '#c4cec8', end, y + rise * .4, z);
      const glass = new T.CylinderGeometry(.27, .27, .13, 24);glass.rotateZ(Math.PI / 2);mesh(glass, '#607f89', end, y + rise * .4, z);
    }
    for (const side of [-1, 1]) box(width + .3, .17, .26, stone, x, y, z + side * depth / 2);
    // Thin roof courses make the large roof surfaces readable at a distance.
    for (let t = .2; t < 1; t += .2) for (const side of [-1, 1]) box(width, .025, .045, '#586975', x, y + rise * (1 - t) + .03, z + side * depth * .5 * t);
  }
  gableRoof(-27.1, 12.4, -26.5, 20.2, 16.2, 2.6);
  gableRoof(-.9, 12.4, -26.5, 20.2, 16.2, 2.6);
  gableRoof(-33, 9.35, 0, 14.3, 20.4, 2.8);
  gableRoof(-32, 6.1, 26, 18.2, 11.3, 2.1);

  // A small white cupola crowns the central clock tower.
  box(4.1, .28, 4.1, stone, -14, 15.65, -23.8);
  box(2.5, 2.05, 2.5, stone, -14, 16.8, -23.8);
  for (const z of [-25.08, -22.52]) {
    box(1.65, 1.3, .04, '#3f5b60', -14, 16.8, z);
    for (let y = 16.25; y < 17.4; y += .18) box(1.7, .05, .11, stone, -14, y, z);
  }
  for (const x of [-15.28, -12.72]) {
    box(.04, 1.3, 1.65, '#3f5b60', x, 16.8, -23.8);
    for (let y = 16.25; y < 17.4; y += .18) box(.11, .05, 1.7, stone, x, y, -23.8);
  }
  box(3.2, .2, 3.2, stone, -14, 17.88, -23.8);
  const cap = new T.ConeGeometry(2.4, 1.45, 4);cap.rotateY(Math.PI / 4);mesh(cap, slate, -14, 18.66, -23.8);
  cyl(.055, .055, 1, '#b29a61', -14, 19.62, -23.8, 8);
  box(.9, .06, .06, '#b29a61', -14, 20.03, -23.8);

  // Exterior brick piers frame the ground-floor corridor windows.
  for (const [left, right] of [[-37, -17.5], [-10.5, 9]]) {
    box(right - left, 1.08, .12, brick, (left + right) / 2, 1, -18.78);
    box(right - left, .9, .12, brick, (left + right) / 2, 4.25, -18.78);
    box(right - left, .16, .3, stone, (left + right) / 2, 1.62, -18.75);
    for (let x = left + .2; x < right - 3; x += 3.2) box(.34, 3.2, .2, brick, x, 2.9, -18.76);
  }
  // White corner quoins and horizontal stone bands tie all elevations together.
  for (const [x,z,w,d,h] of [[-14,-26.5,46,15,11.5],[-33,0,13,19,8.1],[-32,26,17,10,4.8]]) {
    for (const a of [-1,1]) for (const b of [-1,1]) for (let y=1.1;y<h;y+=.66) {
      box(.62,.31,.3,stone,x+a*(w/2-.22),y,z+b*(d/2+.06));
      box(.3,.31,.62,stone,x+a*(w/2+.06),y,z+b*(d/2-.22));
    }
    for (const y of [1.65,4.65,7.85]) if(y<h) {
      for(const side of [-1,1]) {
        box(w+.18,.13,.18,stone,x,y,z+side*d/2);
        box(.18,.13,d+.18,stone,x+side*w/2,y,z);
      }
    }
  }
  // Four columns leave the central entrance and its approach clear.
  for (const dx of [-3.7,-2.1,2.1,3.7]) {
    const x=-14+dx,z=-15.6;
    box(.72,.18,.72,stone,x,.55,z);cyl(.2,.27,4.45,stone,x,2.83,z,16);
    box(.65,.19,.65,stone,x,5.12,z);block(x,z,.55,.55);
  }
  const pediment = new T.Shape();pediment.moveTo(-4.6,0);pediment.lineTo(4.6,0);pediment.lineTo(0,1.7);pediment.closePath();
  mesh(new T.ExtrudeGeometry(pediment,{depth:.35,bevelEnabled:false}),stone,-14,5.52,-15.4);
  const inner = new T.Shape();inner.moveTo(-3.7,.19);inner.lineTo(3.7,.19);inner.lineTo(0,1.48);inner.closePath();
  mesh(new T.ExtrudeGeometry(inner,{depth:.03,bevelEnabled:false}),'#bac3b9',-14,5.52,-15.01);
  textSign('EST. 1968',2.1,.37,-14,6.03,-14.96,'#bac3b9','#3f5f4e');
  box(9.5,.2,3.6,stone,-14,5.42,-16.6);

  // The gate uses masonry piers and an open metal crest instead of a solid lintel.
  for (const x of [-13,2]) {
    box(1.7,3.5,1.7,brick,x,2.2,36);box(2,.24,2,stone,x,4.06,36);
    cyl(.34,.39,.45,'#b4ac88',x,4.43,36,12);
    textSign('W',.65,.75,x,2.7,36.87,green,stone);
  }
  const arch = new T.EllipseCurve(-5.5,4.3,7.5,1.55,0,Math.PI,false,0).getPoints(32);
  for(let i=0;i<arch.length-1;i++)beam([arch[i].x,arch[i].y,36],[arch[i+1].x,arch[i+1].y,36],.075,green);
  textSign('WESTBRIDGE ACADEMY',8.3,.65,-5.5,4.7,36.12,green,stone);

  // Small collegiate details: banners, brick-bordered walks and lawn seating.
  for (const x of [-28,-.5]) {
    box(.06,1.9,.42,'#857253',x,8.35,-18.53);
    textSign('W',.85,1.4,x,7.65,-18.24,green,stone);
  }
  for(const x of [-10.6,-1.4])box(.23,.05,43,brick,x,.43,13.5);
  for(const [x,z]of[[-31,14],[8,12]]){
    box(3.2,.15,1.4,'#b99a72',x,1.26,z);
    for(const side of[-1,1]){box(3.2,.12,.42,'#b99a72',x,.88,z+side*.95);box(.18,.85,2.2,green,x+side*1.1,.83,z);}
    block(x,z,3.2,2.3);
  }
}
