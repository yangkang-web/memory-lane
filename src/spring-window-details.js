import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createCurtainSimulation } from './curtain-physics.js';
import { addCherryTrees } from './cherry-blossoms.js';

let cloth,hem;
export function addSpringWindowDetails({scene,room,box,material}) {
  if(!room.sideWindows)return;
  if(!cloth) {
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#f9faf7';ctx.fillRect(0,0,256,256);
    for(let i=0;i<256;i+=4){ctx.fillStyle=i%8?'#f0f1ec':'#ffffff';ctx.fillRect(i,0,1,256);ctx.fillRect(0,i,256,.5);}
    const weave=new T.CanvasTexture(canvas);weave.colorSpace=T.SRGBColorSpace;weave.anisotropy=8;
    weave.wrapS=weave.wrapT=T.RepeatWrapping;weave.repeat.set(4,24);
    cloth=new T.MeshPhysicalMaterial({map:weave,roughness:.94,
      emissive:'#fff0d7',emissiveIntensity:.045,side:T.DoubleSide,transparent:true,opacity:.58,
      sheen:1,sheenColor:'#fff3d8',sheenRoughness:.55,depthWrite:false});
    hem=cloth.clone();hem.opacity=.84;hem.roughness=.98;
  }
  const side=room.sideWindows,x=side<0?room.left:room.right,panels=[];
  for(const z of [-31.9,-28.3,-24.7]) {
    box(.64,.11,3.4,'#d9c5a6',x-side*.13,1.3,z);
    box(.07,.07,3.5,'#b6afa0',x-side*.64,4.43,z);
    // Sash tracks, rubber seals and a small latch sit inside the existing frame.
    for(const dz of [-1.5,1.5]) {
      box(.055,2.96,.025,'#8b8c85',x-side*.09,2.825,z+dz);
      box(.075,3.04,.045,'#e8dfce',x-side*.19,2.825,z+dz);
    }
    for(const y of [1.37,2.84,4.28])box(.07,.028,3,'#979b95',x-side*.13,y,z);
    box(.06,.16,.035,'#727d82',x-side*.22,2.68,z+.08);
    box(.12,.025,.07,'#b3b8b7',x-side*.27,2.7,z+.08);
    for(const end of [-1,1]) {
      const simulation=createCurtainSimulation({phase:z*.37+end*.9,windStrength:.65+.35*(1+Math.sin(z*.8+end))/2});
      const {nx,ny}=simulation,g=new T.PlaneGeometry(.64,3.22,nx,ny);
      g.setAttribute('position',new T.BufferAttribute(simulation.positions,3).setUsage(T.DynamicDrawUsage));
      const body=[],seams=[],indices=g.index.array;
      for(let row=0;row<ny;row++)for(let col=0;col<nx;col++) {
        const target=row===0||row===ny-1||col===0||col===nx-1?seams:body;
        const start=(row*nx+col)*6;for(let i=0;i<6;i++)target.push(indices[start+i]);
      }
      g.setIndex([...body,...seams]);g.clearGroups();
      g.addGroup(0,body.length,0);g.addGroup(body.length,seams.length,1);
      g.computeVertexNormals();g.computeBoundingSphere();g.boundingSphere.radius+=.45;
      const panel=new T.Mesh(g,[cloth,hem]);panel.rotation.y=side<0?Math.PI/2:-Math.PI/2;
      panel.position.set(x-side*.64,2.78,z+end*1.36);
      panel.receiveShadow=true;panel.renderOrder=1;scene.add(panel);panels.push({simulation,g});
      const bandGeometry=new T.CylinderGeometry(.125,.125,.065,24,1,true);
      bandGeometry.scale(1,1,.42);
      const band=new T.Mesh(bandGeometry,hem);band.rotation.y=panel.rotation.y;
      band.position.set(x-side*.70,2.18,z+end*1.36);band.receiveShadow=true;scene.add(band);
      for(let ring=0;ring<5;ring++)box(.05,.055,.015,'#c1b9a8',x-side*.64,4.405,z+end*1.36+(ring-2)*.13);
    }
  }

  // Sill plants and accessories share geometry batches by color.
  const batches=new Map();
  function add(geo,color){if(!batches.has(color))batches.set(color,[]);if(geo.index){batches.get(color).push(geo.toNonIndexed());geo.dispose();}else batches.get(color).push(geo);}
  function branch(a,b,r){const start=new T.Vector3(...a),end=new T.Vector3(...b);
    const g=new T.CylinderGeometry(r*.55,r,start.distanceTo(end),7);
    g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),end.clone().sub(start).normalize()));
    g.translate(...start.add(end).multiplyScalar(.5).toArray());add(g,'#927967');}
  let seed=137;const rand=()=>((seed=seed*16807%2147483647)/2147483647);
  const sillX=x-side*.2;
  for(const z of [-31.7,-24.3]) {
    const pot=new T.CylinderGeometry(.13,.095,.22,16);pot.translate(sillX,1.47,z);add(pot,'#af8062');
    const soil=new T.CylinderGeometry(.115,.115,.012,16);soil.translate(sillX,1.58,z);add(soil,'#665746');
    for(let i=0;i<9;i++) {
      const angle=i*2.4,tip=[sillX+Math.cos(angle)*(.13+rand()*.08),1.8+rand()*.32,z+Math.sin(angle)*.17];
      branch([sillX,1.57,z],tip,.006);
      const leaf=new T.SphereGeometry(1,8,6);leaf.scale(.035,.12,.014);
      leaf.rotateZ((rand()-.5)*1.4);leaf.rotateY(angle);leaf.translate(...tip);add(leaf,i%2?'#729262':'#94ac71');
    }
  }
  for(let i=0;i<3;i++) {
    box(.3,.035,.4,['#6a8185','#ad8a60','#829776'][i],sillX,1.38+i*.045,-28.5,i*.07);
    box(.27,.018,.38,'#e8dfc9',sillX,1.398+i*.045,-28.5,i*.07);
  }
  const cherries=addCherryTrees(scene,[-31.6,-24.9].map((z,i)=>({x:x+side*(4.1+i*.55),z,scale:i?.94:1,seed:137+i*93+(side>0?321:0)})));
  for(const [color,parts] of batches) {
    const mesh=new T.Mesh(mergeGeometries(parts,false),material(color));mesh.castShadow=mesh.receiveShadow=true;
    scene.add(mesh);parts.forEach(g=>g.dispose());
  }
  let wasMoving=false;
  return {
    update(dt,active,reducedMotion,position) {
      cherries.update(dt,position,reducedMotion);
      if(!active)return;
      for(const {simulation,g}of panels) {
        let changed=false;
        if(reducedMotion){if(wasMoving){simulation.reset();changed=true;}}
        else changed=simulation.step(dt);
        if(changed){g.attributes.position.needsUpdate=true;g.computeVertexNormals();}
      }
      wasMoving=!reducedMotion;
    },
  };
}
