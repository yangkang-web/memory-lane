import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

let decals;
function surfaceDecals() {
  if (decals) return decals;
  function make(draw, opacity) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    draw(canvas.getContext('2d'));
    const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
    return new T.MeshBasicMaterial({ map, transparent: true, opacity, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  }
  decals = {
    contact: make(ctx => {
      const g = ctx.createRadialGradient(128,128,16,128,128,128);
      g.addColorStop(0,'rgba(40,43,35,.8)'); g.addColorStop(.4,'rgba(40,43,35,.45)'); g.addColorStop(1,'rgba(40,43,35,0)');
      ctx.fillStyle = g; ctx.fillRect(0,0,256,256);
    }, .23),
    edge: make(ctx => {
      const g = ctx.createLinearGradient(0,0,256,0);
      g.addColorStop(0,'rgba(47,48,40,.7)'); g.addColorStop(.28,'rgba(47,48,40,.24)'); g.addColorStop(1,'rgba(47,48,40,0)');
      ctx.fillStyle = g; ctx.fillRect(0,0,256,256);
    }, .12),
    rail: make(ctx => {
      const g = ctx.createLinearGradient(0,256,0,0);
      g.addColorStop(0,'rgba(47,48,40,.5)');g.addColorStop(.3,'rgba(47,48,40,.12)');g.addColorStop(1,'rgba(47,48,40,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,256,256);
    }, .12),
    scuff: make(ctx => {
      let seed = 177;
      const rand = () => ((seed = seed * 16807 % 2147483647) / 2147483647);
      for (let i=0;i<58;i++) {
        const x=35+rand()*185,y=65+rand()*120;
        ctx.strokeStyle=`rgba(91,96,78,${.04+rand()*.18})`;ctx.lineWidth=.5+rand()*1.5;
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+5+rand()*23,y+rand()*9);ctx.stroke();
      }
    }, .06),
    patch: make(ctx => {
      ctx.fillStyle='rgba(214,201,169,.16)';ctx.fillRect(30,22,193,213);
      ctx.strokeStyle='rgba(150,139,111,.12)';ctx.lineWidth=2;ctx.strokeRect(30,22,193,213);
      for (const x of [38,198]) {ctx.fillStyle='rgba(194,174,131,.25)';ctx.fillRect(x,14,18,40);}
    }, .035),
  };
  return decals;
}

// Soft static contact shading and localized wear; all rooms share these maps.
export function addClassroomSurfaceDetail({ scene, room, columns, rows }) {
  const {left,right,door,number}=room, north=-34,south=-22.25,mid=(north+south)/2;
  const d=surfaceDecals(),batches=new Map();
  function plane(w,h,material,x,y,z,rx=0,ry=0,rz=0) {
    const g=new T.PlaneGeometry(w,h).toNonIndexed();
    g.applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(rx,ry,rz)));
    g.translate(x,y,z);
    if(!batches.has(material))batches.set(material,[]);batches.get(material).push(g);
  }
  for(const x of columns) for(const z of rows) {
    plane(1.36,1.05,d.contact,x,.501,z,-Math.PI/2);
    plane(.78,.83,d.contact,x,.502,z+.77,-Math.PI/2);
  }
  plane(2.05,1.1,d.contact,left+2.15,.502,-33.1,-Math.PI/2);
  for(const side of [-1,1]) {
    if(room.sideWindows===side)continue;
    const x=side<0?left+.153:right-.153,angle=side<0?Math.PI/2:-Math.PI/2;
    // Darkest at the physical corner, fading into the plaster, never a hard outline.
    for(const z of [north+.32,south-.32]) {
      const towardInterior=(side<0)===(z<north+1);
      plane(.38,3.84,d.edge,x,2.58,z,0,angle,towardInterior?Math.PI:0);
    }
    plane(11.38,.19,d.rail,x,1.76,mid,0,angle);
    for(const z of [-24.6,-30.8])plane(1.05,.25,d.scuff,x+(-side)*.005,.95,z,0,angle);
    plane(.48,.62,d.patch,x+(-side)*.005,2.52,-24.4-(Number(number)%3)*.25,0,angle);
    plane(.42,11.38,d.edge,side<0?left+.37:right-.37,.503,mid,-Math.PI/2,0,side<0?0:Math.PI);
  }
  // Faint contact shade beneath the board and wear close to the classroom entrance.
  plane(Math.min(5.6,right-left-3.8),.22,d.contact,(left+right)/2,1.74,north+.221);
  plane(.56,.72,d.scuff,door+1.03,1.27,south-.131,0,Math.PI);
  for(const [material,geometries] of batches) {
    const mesh=new T.Mesh(mergeGeometries(geometries,false),material);
    mesh.renderOrder=2;scene.add(mesh);geometries.forEach(g=>g.dispose());
  }
}
