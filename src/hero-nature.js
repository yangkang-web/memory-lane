import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { rect } from './walk-layout.js';
import { ROAD_PLANTS, ROOF_GARDENS } from './ruin-layout.js';

export const HERO_TREES=[[-12,-9,10.5],[13,37,9.6],[-13,38,9.2],[-13,70,11],[13,82,10]];
// Real CC0 meshes, optimized offline. Runtime makes no external requests.
export function loadHeroNature(scene,obstacles) {
  let disposed=false;const loader=new GLTFLoader(),textures=new T.TextureLoader(),owned=[];
  const tasks=[];
  function alpha(id,name){return textures.loadAsync(`/assets/models/${id}/${name}.jpg`).then(t=>{t.colorSpace=T.NoColorSpace;t.anisotropy=8;owned.push(t);return t;});}
  const specs=[['tree_small_02','leaves_alpha'],['fern_02','Alpha'],['nettle_plant','Alpha'],['dead_tree_trunk',null]];
  function instances(source,placements,whole=false) {
    source.updateMatrixWorld(true);
    const bounds=new T.Box3().setFromObject(source),center=bounds.getCenter(new T.Vector3()),height=bounds.max.y-bounds.min.y;
    source.traverse(o=>{if(!o.isMesh)return;const geo=o.geometry.clone().applyMatrix4(o.matrixWorld);geo.translate(-center.x,-bounds.min.y,-center.z);owned.push(geo);
      const batch=new T.InstancedMesh(geo,o.material,placements.length),dummy=new T.Object3D();
      placements.forEach(([x,y,z,h,a=0],i)=>{dummy.position.set(x,y,z);dummy.rotation.set(0,a,0);dummy.scale.setScalar(h/height);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);});
      batch.castShadow=true;batch.receiveShadow=true;batch.name=whole?'Hero tree canopy / bark':'Scanned undergrowth';scene.add(batch);
    });
  }
  for(const [id,mask]of specs)tasks.push(Promise.all([loader.loadAsync(`/assets/models/${id}/${id}.gltf`),mask?alpha(id,mask):null]).then(([gltf,maskMap])=>{
    const root=gltf.scene;root.updateMatrixWorld(true);const prepared=new Set();
    root.traverse(o=>{if(!o.isMesh)return;const m=o.material;owned.push(o.geometry);if(prepared.has(m))return;prepared.add(m);owned.push(m);for(const v of Object.values(m))if(v?.isTexture){v.anisotropy=8;owned.push(v);}
      m.envMapIntensity=.28;m.roughness=Math.max(.72,m.roughness);m.side=T.DoubleSide;
      if(maskMap&&(id!=='tree_small_02'||m.name.includes('leaves'))){m.alphaMap=maskMap;m.alphaTest=.48;m.transparent=false;m.depthWrite=true;m.alphaToCoverage=false;m.color.multiply(new T.Color('#aab49c'));m.roughness=1;m.envMapIntensity=.15;}
    });
    if(disposed){disposeOwned();return;}
    if(id==='tree_small_02')instances(root,[...HERO_TREES.map(([x,z,h],i)=>[x,.25,z,h,i*1.73]),...ROOF_GARDENS.map(([x,y,z,h],i)=>[x,y,z,h,i*1.9])],true);
    else if(id==='dead_tree_trunk'){
      const placements=[[14.3,.27,60,.29,.7],[-14.5,.27,52,.22,2.3]];instances(root,placements);
      const size=new T.Box3().setFromObject(root).getSize(new T.Vector3());
      for(const [x,,z,h,a]of placements){const scale=h/size.y,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a));obstacles.push(rect(x,z,(size.x*c+size.z*s)*scale,(size.x*s+size.z*c)*scale));}
    } else {
      const variants=root.children.filter(o=>o.isMesh),groups=variants.map(()=>[]);
      // Authored clusters leave the doorway and automatic walking route clear.
      const anchors=id==='fern_02'?[[-14.5,35.8],[-14.7,44],[13.4,38.6],[14.8,44.8],[14.2,61.5],[-14.5,53.5],[-12.5,69.5]]:[[-15.7,36.5],[-15.4,45.2],[15.2,41],[14.9,54.4],[13.9,65.2],[-13.8,55.5],[12.9,74]];
      for(const [i,[x,z]]of anchors.entries())for(let n=0;n<6;n++){const a=n*2.399+i,r=.35+Math.sqrt(n)*.34;groups[(n+i)%variants.length].push([x+Math.cos(a)*r,.26,z+Math.sin(a)*r,id==='fern_02'?.45+(n%3)*.14:.62+(n%4)*.17,a]);}
      for(const [i,[x,z,h]]of ROAD_PLANTS.entries())groups[i%variants.length].push([x,.025,z,h*(id==='fern_02'?1.7:2.2),i*2.4]);
      for(const [i,[x,y,z]]of ROOF_GARDENS.entries())for(let n=0;n<5;n++)groups[(i+n)%variants.length].push([x+Math.cos(n*2.4)*.35,y,z+Math.sin(n*2.4)*.4,.45+(n%3)*.14,n*2.4]);
      variants.forEach((v,i)=>{const detached=v.clone();detached.applyMatrix4(root.matrixWorld);instances(detached,groups[i]);});
    }
  }));
  for(const [x,z]of HERO_TREES)obstacles.push(rect(x,z,.9,.9));
  function disposeOwned(){new Set(owned).forEach(o=>o.dispose());owned.length=0;}
  return {ready:Promise.all(tasks),dispose(){disposed=true;disposeOwned();}};
}
