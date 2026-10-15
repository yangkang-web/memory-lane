import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

let assets;
function texture(draw,size=256) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  draw(canvas.getContext('2d'),size);
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;return map;
}
function random(seed) {
  return ()=>((seed=seed*16807%2147483647)/2147483647);
}
function petalPath(ctx,variant=0) {
  const notch=.035+variant*.012;
  ctx.beginPath();ctx.moveTo(0,0);
  ctx.bezierCurveTo(-.15,-.13,-.48,-.52,-.30,-.82);
  ctx.bezierCurveTo(-.24,-.96,-.08,-.96,-.015,-.91+notch);
  ctx.bezierCurveTo(.08,-.99,.25,-.96,.31,-.79);
  ctx.bezierCurveTo(.45,-.48,.17,-.12,0,0);ctx.closePath();
}
function paintPetal(ctx,variant=0) {
  const rand=random(471+variant*337);
  petalPath(ctx,variant);const g=ctx.createRadialGradient(-.035,-.04,.025,0,-.1,.91);
  g.addColorStop(0,'#cf8d9f');g.addColorStop(.18,'#e7b0c0');g.addColorStop(.43,'#f5d0da');
  g.addColorStop(.78,'#fff0ee');g.addColorStop(1,'#fbe6e9');
  ctx.fillStyle=g;ctx.fill();
  ctx.save();ctx.clip();
  // Uneven pigment and fine branching veins, without a hard outline around the petal.
  for(let i=0;i<160;i++) {
    ctx.fillStyle=i%3?'rgba(255,255,250,.12)':'rgba(185,106,128,.035)';
    ctx.beginPath();ctx.ellipse((rand()-.5)*.8,-rand(),.006+rand()*.025,.012+rand()*.04,rand(),0,Math.PI*2);ctx.fill();
  }
  for(let i=0;i<7;i++) {
    const x=(i-3)*.075;
    ctx.strokeStyle=`rgba(185,113,137,${.045+rand()*.04})`;ctx.lineWidth=.004;
    ctx.beginPath();ctx.moveTo(x*.04,-.06);ctx.bezierCurveTo(x*.2,-.28,x*.8,-.58,x,-.83+rand()*.09);ctx.stroke();
  }
  const fold=ctx.createLinearGradient(-.35,0,.3,0);
  fold.addColorStop(0,'rgba(177,131,149,.11)');fold.addColorStop(.43,'rgba(255,255,255,.17)');fold.addColorStop(1,'rgba(205,151,167,.025)');
  ctx.fillStyle=fold;ctx.fillRect(-.5,-1,1,1);ctx.restore();
}
function makeBarkMaps() {
  const size=512,rand=random(2947),canvases=Array.from({length:3},()=>{
    const canvas=document.createElement('canvas');canvas.width=canvas.height=size;return canvas;
  });
  const contexts=canvases.map(c=>c.getContext('2d')),images=contexts.map(c=>c.createImageData(size,size));
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const u=x/size*Math.PI*2,v=y/size*Math.PI*2;
    const broad=Math.sin(u*5+Math.sin(v*3))*.5+Math.sin(u*11-v*2)*.25;
    const grain=Math.sin(u*67+Math.sin(v*13)*2)*1.8+Math.sin(u*119-v*7)*.9;
    const fine=(rand()-.5)*9,variation=broad*10+grain+fine;
    const i=(y*size+x)*4;
    [129,105,101].forEach((base,c)=>{images[0].data[i+c]=base+variation;});
    for(let c=0;c<3;c++){images[1].data[i+c]=134+broad*13+grain*3+fine;images[2].data[i+c]=216+broad*8+fine;}
    for(const image of images)image.data[i+3]=255;
  }
  contexts.forEach((ctx,i)=>ctx.putImageData(images[i],0,0));
  // Cherry bark has irregular horizontal lenticels, with muted edges and shallow relief.
  for(let i=0;i<130;i++) {
    const x=rand()*size,y=rand()*size,w=3+Math.pow(rand(),2)*37,h=.45+rand()*1.4,angle=(rand()-.5)*.035;
    for(const dx of [-size,0,size])for(const dy of [-size,0,size]) {
      for(let channel=0;channel<3;channel++) {
        const ctx=contexts[channel];ctx.save();ctx.translate(x+dx,y+dy);ctx.rotate(angle);
        ctx.fillStyle=['rgba(59,49,47,.36)','rgba(42,42,42,.55)','rgba(245,245,245,.55)'][channel];
        ctx.beginPath();ctx.ellipse(0,0,w,h,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=['rgba(187,161,144,.47)','rgba(197,197,197,.5)','rgba(190,190,190,.4)'][channel];
        ctx.beginPath();ctx.ellipse(0,h,w*.86,h*.42,0,0,Math.PI*2);ctx.fill();ctx.restore();
      }
    }
  }
  return canvases.map((canvas,i)=>{
    const map=new T.CanvasTexture(canvas);map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=4;
    map.colorSpace=i===0?T.SRGBColorSpace:T.NoColorSpace;return map;
  });
}
function getAssets() {
  if(assets)return assets;
  const flowerMats=Array.from({length:3},(_,variant)=>{
    const rand=random(718+variant*73);
    // A small flowering spray, not one oversized flower. Each atlas contains
    // slender connecting stems, buds and separated five-petal blossoms.
    const blossom=texture((ctx,s)=>{
      ctx.translate(s/2,s*.52);ctx.scale(s*.94,s*.94);
      const blooms=Array.from({length:17+variant*2},(_,i)=>{
        const angle=i*2.399+rand()*.3,r=.12+Math.sqrt(rand())*.29;
        return {x:Math.cos(angle)*r,y:Math.sin(angle)*r*.88,r:.064+rand()*.027};
      });
      ctx.lineCap='round';ctx.strokeStyle='rgba(124,101,92,.78)';ctx.lineWidth=.004;
      for(const b of blooms){ctx.beginPath();ctx.moveTo(0,.39);ctx.quadraticCurveTo(b.x*.18,b.y*.48,b.x,b.y);ctx.stroke();}
      for(const b of blooms){
        ctx.save();ctx.translate(b.x,b.y);ctx.rotate(rand()*Math.PI*2);ctx.scale(b.r,b.r);
        for(let i=0;i<5;i++){
          ctx.save();ctx.rotate(i*Math.PI*2/5+(rand()-.5)*.13);paintPetal(ctx,variant+i);ctx.restore();
        }
        ctx.fillStyle='#c69c94';ctx.beginPath();ctx.arc(0,0,.07,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#e8d1a8';ctx.lineWidth=.018;
        for(let i=0;i<9;i++){const a=i*2.399;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*.16,Math.sin(a)*.16);ctx.stroke();}
        ctx.restore();
      }
      // A few emerging bronze-green leaves soften the otherwise uniform pink.
      for(let i=0;i<3;i++){
        ctx.save();ctx.translate((rand()-.5)*.4,.1+rand()*.23);ctx.rotate(rand()*5);
        ctx.fillStyle=['#969c72','#adb187','#b5aa84'][i];ctx.beginPath();
        ctx.moveTo(0,.04);ctx.quadraticCurveTo(-.025,0,0,-.055);ctx.quadraticCurveTo(.026,0,0,.04);ctx.fill();ctx.restore();
      }
    },512);
    return new T.MeshStandardMaterial({map:blossom,side:T.DoubleSide,alphaTest:.24,alphaToCoverage:true,
      roughness:.93,emissive:'#f4d9df',emissiveIntensity:.035});
  });
  const petal=texture((ctx,s)=>{ctx.translate(s*.5,s*.94);ctx.scale(s*.91,s*.91);paintPetal(ctx,2);},256);
  const [bark,bump,roughness]=makeBarkMaps();
  const petalMat=new T.MeshStandardMaterial({map:petal,side:T.DoubleSide,alphaTest:.18,
    roughness:.94,emissive:'#f4d9df',emissiveIntensity:.035});
  const flowerGeo=new T.PlaneGeometry(1,1,2,2),petalGeo=new T.PlaneGeometry(1,1,4,5);
  for(const geometry of [flowerGeo,petalGeo]) {
    const p=geometry.attributes.position;
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),angle=Math.atan2(y,x),r=Math.hypot(x,y);
      p.setZ(i,r*r*.3+Math.sin(angle*5+.6)*r*.065+x*y*.1);
    }
    geometry.computeVertexNormals();
  }
  assets={flowerMats,petalMat,flowerGeo,petalGeo,
    barkMat:new T.MeshStandardMaterial({map:bark,bumpMap:bump,bumpScale:.012,roughnessMap:roughness,roughness:1,emissive:'#76554e',emissiveIntensity:.035}),
    budMat:new T.MeshStandardMaterial({color:'#bf8494',roughness:.9}),budGeo:new T.SphereGeometry(1,6,5)};
  return assets;
}

export function addCherryTrees(scene,origins) {
  const a=getAssets(),systems=[];
  for(const {x,z,scale=1,ground=.34,seed=137} of origins) {
    let state=seed;const rand=()=>((state=state*16807%2147483647)/2147483647);
    const root=new T.Group();root.position.set(x,ground,z);root.scale.set(scale*(.94+rand()*.10),scale*(.93+rand()*.12),scale*(.94+rand()*.10));root.rotation.y=rand()*Math.PI*2;scene.add(root);
    const wood=[],flowers=[],buds=[];
    function limb(points,radius,endRadius,segments=16) {
      const curve=new T.CatmullRomCurve3(points),g=new T.TubeGeometry(curve,segments,1,10,false);
      const pos=g.attributes.position,norm=g.attributes.normal,uv=g.attributes.uv,length=curve.getLength();
      const center=new T.Vector3();
      for(let ring=0;ring<=segments;ring++) {
        const t=ring/segments;curve.getPointAt(t,center);
        const taper=radius+(endRadius-radius)*Math.pow(t,.83);
        for(let j=0;j<=10;j++) {
          const index=ring*11+j,angle=j/10*Math.PI*2;
          const irregular=1+Math.sin(angle*3+t*5)*.045+Math.cos(angle*5-t*3)*.025;
          const r=taper*irregular;
          pos.setXYZ(index,center.x+norm.getX(index)*r,center.y+norm.getY(index)*r,center.z+norm.getZ(index)*r);
          uv.setXY(index,j/10,t*length*1.3);
        }
      }
      g.computeVertexNormals();wood.push(g);return curve;
    }
    const lean=(rand()-.5)*.34;
    const trunkPath=limb([
      new T.Vector3(0,0,0),new T.Vector3(.07,.55,.03),new T.Vector3(-.10,1.15,.07),
      new T.Vector3(lean,1.85,-.06),new T.Vector3(lean+.14,2.7,-.12),new T.Vector3(lean+.02,3.85,.05),
    ],.205,.012,30);
    for(let i=0;i<5;i++) {
      const angle=i*2.399+.3;
      limb([new T.Vector3(.01,.28,0),new T.Vector3(Math.cos(angle)*.22,.08,Math.sin(angle)*.22),
        new T.Vector3(Math.cos(angle)*.44,.008,Math.sin(angle)*.44)],.072,.005,8);
    }
    const zAxis=new T.Vector3(0,0,1);
    function spray(position,size,normal,roll) {
      const q=new T.Quaternion().setFromUnitVectors(zAxis,normal.normalize());
      q.multiply(new T.Quaternion().setFromAxisAngle(zAxis,roll));
      const e=new T.Euler().setFromQuaternion(q);
      flowers.push({position,size,rx:e.x,ry:e.y,rz:e.z,tint:rand()});
    }
    function floweringTwig(start,tip,radius=.009) {
      const middle=start.clone().lerp(tip,.55);middle.y+=.055;
      const curve=limb([start,middle,tip],radius,.0018,7);
      buds.push(tip.clone());
      const count=5+Math.floor(rand()*3);
      for(let k=0;k<count;k++) {
        const t=.19+(k+.2+rand()*.5)/count*.8,position=curve.getPointAt(Math.min(1,t));
        position.add(new T.Vector3((rand()-.5)*.085,(rand()-.5)*.06,(rand()-.5)*.085));
        const normal=new T.Vector3(position.x*.35+(rand()-.5)*.8,.45+rand()*.65,position.z*.35+(rand()-.5)*.8);
        const size=.32+rand()*.13;
        spray(position,size,normal,rand()*Math.PI*2);
        if(k%2===0) spray(position.clone().add(new T.Vector3(.025,-.035,.02)),size*.88,
          new T.Vector3(normal.z,-.12+rand()*.4,-normal.x),rand()*Math.PI*2);
      }
    }
    // Asymmetric, spreading boughs: seven uneven fans leave sky between them.
    // Every flower spray follows a twig; no blossoms are scattered inside balls.
    const phase=rand()*Math.PI*2;
    for(let b=0;b<7;b++) {
      const angle=phase+b*2.399+(rand()-.5)*.4;
      const reach=1.72+rand()*.65,height=2.9+rand()*1.05;
      const direction=new T.Vector3(Math.cos(angle),0,Math.sin(angle));
      const across=new T.Vector3(-direction.z,0,direction.x);
      const start=trunkPath.getPointAt(.36+b*.052);
      const elbow=start.clone().addScaledVector(direction,reach*.48);elbow.y=height-.3;
      const end=direction.clone().multiplyScalar(reach);end.y=height;
      const main=limb([start,elbow,end],.083-b*.006,.009,18);
      const fans=6+Math.floor(rand()*3);
      for(let t=0;t<fans;t++) {
        const fraction=.42+(t+.3)/fans*.55,anchor=main.getPointAt(fraction);
        const lateral=(t%2?1:-1)*(.24+rand()*.38);
        const tip=anchor.clone().addScaledVector(direction,.25+rand()*.24).addScaledVector(across,lateral);
        tip.y+=.14+rand()*.37-(fraction>.85?.12:0);
        const bend=anchor.clone().lerp(tip,.5);bend.y+=.075;
        const branch=limb([anchor,bend,tip],.018,.004,9);
        for(let j=0;j<3;j++) {
          const base=branch.getPointAt(.42+j*.24);
          const end=base.clone().addScaledVector(direction,.13+rand()*.19).addScaledVector(across,(j-1)*.19);
          end.y+=.06+rand()*.23-(j===2?.19:0);
          floweringTwig(base,end);
        }
      }
    }
    // Smaller upper shoots close the crown without a spherical central cap.
    for(let i=0;i<7;i++) {
      const angle=phase+i*2.399,start=trunkPath.getPointAt(.78+rand()*.2);
      const tip=new T.Vector3(Math.cos(angle)*(.45+rand()*.6),3.95+rand()*.43,Math.sin(angle)*(.45+rand()*.6));
      const bend=start.clone().lerp(tip,.5);bend.y+=.08;const branch=limb([start,bend,tip],.025,.004,12);
      for(let j=0;j<4;j++){
        const base=branch.getPointAt(.35+j*.19);
        const end=base.clone().add(new T.Vector3((rand()-.5)*.38,.15+rand()*.18,(rand()-.5)*.38));
        floweringTwig(base,end,.007);
      }
    }
    const trunk=new T.Mesh(mergeGeometries(wood),a.barkMat);trunk.castShadow=trunk.receiveShadow=true;root.add(trunk);wood.forEach(g=>g.dispose());
    const dummy=new T.Object3D(),color=new T.Color();
    for(let variant=0;variant<a.flowerMats.length;variant++) {
      const selected=flowers.filter((_,i)=>i%a.flowerMats.length===variant);
      const bloom=new T.InstancedMesh(a.flowerGeo,a.flowerMats[variant],selected.length);
      selected.forEach((f,i)=>{
        dummy.position.copy(f.position);dummy.rotation.set(f.rx,f.ry,f.rz);dummy.scale.set(f.size,f.size*(.9+f.tint*.18),f.size);dummy.updateMatrix();bloom.setMatrixAt(i,dummy.matrix);
        color.set(f.tint<.18?'#e8c6cf':f.tint<.65?'#f5e3e5':'#fff6ef');bloom.setColorAt(i,color);
      });
      bloom.castShadow=bloom.receiveShadow=true;bloom.computeBoundingSphere();root.add(bloom);
    }
    const budMesh=new T.InstancedMesh(a.budGeo,a.budMat,buds.length);
    buds.forEach((p,i)=>{dummy.position.copy(p);dummy.rotation.set(0,0,0);dummy.scale.set(.013,.022,.013);dummy.updateMatrix();budMesh.setMatrixAt(i,dummy.matrix);});root.add(budMesh);
    const carpet=new T.InstancedMesh(a.petalGeo,a.petalMat,150);
    for(let i=0;i<carpet.count;i++) {
      const angle=rand()*Math.PI*2,r=Math.sqrt(rand())*2.45;
      dummy.position.set(Math.cos(angle)*r,.015+rand()*.009,Math.sin(angle)*r);
      dummy.rotation.set(-Math.PI/2,0,rand()*Math.PI*2);dummy.scale.setScalar(.022+rand()*.025);dummy.updateMatrix();carpet.setMatrixAt(i,dummy.matrix);
    }
    carpet.receiveShadow=true;root.add(carpet);
    const fall=new T.InstancedMesh(a.petalGeo,a.petalMat,42),particles=[];
    fall.instanceMatrix.setUsage(T.DynamicDrawUsage);
    // Bounds include the complete flight, so frustum culling does not use the first frame alone.
    fall.boundingSphere=new T.Sphere(new T.Vector3(0,2.5,0),4.5);root.add(fall);
    for(let i=0;i<fall.count;i++) {
      const f=flowers[Math.floor(rand()*flowers.length)];
      particles.push({x:f.position.x,z:f.position.z,top:f.position.y,phase:rand(),speed:.12+rand()*.14,
        size:.025+rand()*.025,spin:rand()*Math.PI*2,sway:.12+rand()*.2});
    }
    let elapsed=0;
    function pose() {
      particles.forEach((p,i)=>{
        const progress=(p.phase+elapsed*p.speed/p.top)%1,age=progress*p.top/p.speed;
        // Drift remains close to the tree, outside the classroom wall; reset occurs inside the crown.
        dummy.position.set(p.x+Math.sin(age*.65+p.spin)*p.sway, p.top*(1-progress),p.z+Math.sin(age*.43+p.spin)*.24);
        dummy.rotation.set(age*1.15+p.spin,Math.sin(age*.8+p.spin)*.9,age*.48+p.spin);
        const fade=T.MathUtils.smoothstep(progress,0,.06)*(1-T.MathUtils.smoothstep(progress,.94,1));
        dummy.scale.setScalar(p.size*fade);dummy.updateMatrix();fall.setMatrixAt(i,dummy.matrix);
      });fall.instanceMatrix.needsUpdate=true;
    }
    pose();
    systems.push({update(dt,position,reducedMotion){
      fall.visible=!reducedMotion;
      if(reducedMotion||Math.hypot(position.x-x,position.z-z)>48)return;
      elapsed+=Math.max(0,Math.min(dt,.05));pose();
    }});
  }
  return {update(dt,position,reducedMotion){for(const system of systems)system.update(dt,position,reducedMotion);}};
}
