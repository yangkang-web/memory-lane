import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// Cream paper, overlapping folded flaps and a raised pink wax seal, from the user's reference.
export function createStoryEnvelope(){
 const envelope=new T.Group();envelope.name='Love Letter — cream envelope and heart wax seal';
 const grainCanvas=document.createElement('canvas');grainCanvas.width=grainCanvas.height=256;
 const ctx=grainCanvas.getContext('2d'),pixels=ctx.createImageData(256,256);let seed=812;
 for(let i=0;i<pixels.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const value=190+Math.floor(seed/4294967296*50);pixels.data.set([value,value,value,255],i);}
 ctx.putImageData(pixels,0,0);
 const grain=new T.CanvasTexture(grainCanvas);grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.repeat.set(3,3);grain.anisotropy=4;
 const paper=new T.MeshStandardMaterial({color:'#f5e8c9',roughness:.92,bumpMap:grain,bumpScale:.00008});
 const foldedPaper=paper.clone();foldedPaper.color.set('#f8ecd2');
 const seamMaterial=new T.MeshStandardMaterial({color:'#c7bda5',roughness:1});
 const wax=new T.MeshPhysicalMaterial({color:'#e99b9d',roughness:.43,ior:1.44,clearcoat:.18,clearcoatRoughness:.46});
 const waxEdge=wax.clone();waxEdge.color.set('#efacad');
 const heartMaterial=waxEdge.clone();heartMaterial.color.set('#f4b6b6');
 function mesh(name,geometry,material,z=0,parent=envelope){const m=new T.Mesh(geometry,material);m.name=name;m.position.z=z;m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
 mesh('Thick cream envelope paper',new RoundedBoxGeometry(.34,.23,.003,3,.0011),paper);
 function flap(name,shape,z,material=foldedPaper){
  const geometry=new T.ExtrudeGeometry(shape,{depth:.00035,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.00035,bevelThickness:.0002,curveSegments:24});
  // Small UVs on ExtrudeGeometry are unsuitable for the fine paper grain.
  const uv=geometry.attributes.uv,position=geometry.attributes.position;
  for(let i=0;i<uv.count;i++)uv.setXY(i,position.getX(i)/.34+.5,position.getY(i)/.23+.5);
  return mesh(name,geometry,material,z);
 }
 const lower=new T.Shape();lower.moveTo(-.168,-.113);lower.lineTo(.168,-.113);lower.bezierCurveTo(.166,-.080,.147,-.062,.125,-.044);lower.lineTo(.011,.040);lower.quadraticCurveTo(0,.049,-.011,.040);lower.lineTo(-.125,-.044);lower.bezierCurveTo(-.147,-.062,-.166,-.080,-.168,-.113);
 flap('Lower envelope fold',lower,.0018,paper);
 const top=new T.Shape();top.moveTo(-.168,.113);top.lineTo(.168,.113);top.bezierCurveTo(.166,.085,.164,.077,.149,.065);top.lineTo(.012,-.048);top.quadraticCurveTo(0,-.059,-.012,-.048);top.lineTo(-.149,.065);top.bezierCurveTo(-.164,.077,-.166,.085,-.168,.113);
 // A narrow paper-coloured shadow beneath the flap gives the folds depth.
 const edge=mesh('Fold edge shadow',new T.ShapeGeometry(top,32),seamMaterial,.0023);edge.position.y=-.00065;
 const closure=flap('Curved triangular closure flap',top,.0029);

 const letteringCanvas=document.createElement('canvas');letteringCanvas.width=1536;letteringCanvas.height=384;
 const ink=letteringCanvas.getContext('2d');ink.textAlign='center';ink.textBaseline='middle';
 ink.font='200px "Snell Roundhand", "Apple Chancery", "Brush Script MT", cursive';
 // Dark rose impression and a tiny lighter edge, like foil pressed into paper.
 ink.fillStyle='#a55f6c';ink.fillText('Love Letter',768,196,1480);
 ink.fillStyle='#cf8590';ink.fillText('Love Letter',768,192,1480);
 const letteringMap=new T.CanvasTexture(letteringCanvas);letteringMap.colorSpace=T.SRGBColorSpace;letteringMap.anisotropy=8;
 const lettering=mesh('Rose calligraphy — Love Letter',new T.PlaneGeometry(.195,.04875),new T.MeshStandardMaterial({map:letteringMap,transparent:true,depthWrite:false,roughness:.7,polygonOffset:true,polygonOffsetFactor:-1}),.0039);
 lettering.position.y=.055;lettering.castShadow=false;
 const hinge=new T.Group();hinge.position.set(0,.113,.0029);envelope.add(hinge);
 for(const part of [closure,lettering]){part.position.sub(hinge.position);hinge.add(part);}

 const seal=new T.Group();seal.name='Hand-poured pink wax seal';seal.position.set(0,-.045,.0042);envelope.add(seal);
 // A shallow stamped centre and irregular rolled rim, rather than a perfect torus.
 const rings=[[0,.0025],[.020,.0025],[.0245,.0028],[.026,.0045],[.028,.0060],[.031,.0068],[.0338,.0050],[.035,.0022],[.034,.0001]];
 const segments=96,positions=[],indices=[];
 for(let r=0;r<rings.length;r++)for(let i=0;i<segments;i++){
  const a=i/segments*Math.PI*2,[radius,height]=rings[r];
  const ripple=1+.022*Math.sin(a*5+.4)+.015*Math.sin(a*9-1);
  positions.push(Math.cos(a)*radius*ripple,Math.sin(a)*radius*ripple,height+(radius/.035)*.00035*Math.sin(a*4));
  if(r>0){const current=r*segments+i,next=r*segments+(i+1)%segments;indices.push(current-segments,current,next,current-segments,next,next-segments);}
 }
 const waxGeometry=new T.BufferGeometry();waxGeometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));waxGeometry.setIndex(indices);waxGeometry.computeVertexNormals();
 mesh('Soft irregular wax rim',waxGeometry,waxEdge,0,seal);
 const stamped=mesh('Recessed wax stamp',new T.CircleGeometry(.0248,96),wax,.0027,seal);
 stamped.castShadow=false;
 const heart=new T.Shape();heart.moveTo(0,.010);heart.bezierCurveTo(-.007,.023,-.023,.010,-.009,-.009);heart.quadraticCurveTo(-.004,-.016,0,-.020);heart.quadraticCurveTo(.004,-.016,.009,-.009);heart.bezierCurveTo(.023,.010,.007,.023,0,.010);
 const curve=new T.CatmullRomCurve3(heart.getPoints(80).map(p=>new T.Vector3(p.x*.82,p.y*.82+.002,.0037)),true);
 mesh('Raised heart impression',new T.TubeGeometry(curve,128,.00105,8,true),heartMaterial,0,seal);
 envelope.userData.setOpen=value=>{const p=T.MathUtils.clamp(value,0,1);hinge.rotation.x=-Math.PI*.94*p;edge.visible=p<.05;seal.scale.setScalar(Math.max(.001,1-p*3));seal.visible=p<.34;};
 return envelope;
}
