// Offline authoring utility. Usage: node scripts/art/optimize-tree.mjs /path/to/meshopt_simplifier.js
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const {MeshoptSimplifier:S}=await import(pathToFileURL(process.argv[2]));await S.ready;
const root='public/assets/models/tree_small_02/';
const j=JSON.parse(fs.readFileSync(root+'tree_small_02.gltf'));
if(j.asset.extras?.optimized)throw new Error('Already optimized; restore source files before rebuilding.');
const bin=fs.readFileSync(root+j.buffers[0].uri),oldAccessors=j.accessors,oldViews=j.bufferViews;
const sizes={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
function read(id){const a=oldAccessors[id],v=oldViews[a.bufferView],C=a.componentType===5126?Float32Array:a.componentType===5125?Uint32Array:Uint16Array,n=sizes[a.type],out=new C(a.count*n),d=new DataView(bin.buffer,bin.byteOffset,bin.byteLength);for(let i=0;i<a.count;i++)for(let k=0;k<n;k++){const offset=(v.byteOffset||0)+(a.byteOffset||0)+i*(v.byteStride||n*C.BYTES_PER_ELEMENT)+k*C.BYTES_PER_ELEMENT;out[i*n+k]=C===Float32Array?d.getFloat32(offset,true):C===Uint32Array?d.getUint32(offset,true):d.getUint16(offset,true);}return out;}
const chunks=[];let offset=0;j.accessors=[];j.bufferViews=[];
function append(data,type,componentType){const bytes=Buffer.from(data.buffer,data.byteOffset,data.byteLength);const id=j.accessors.length,view=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:bytes.length});const a={bufferView:view,componentType,count:data.length/sizes[type],type};if(type==='VEC3'){a.min=[Infinity,Infinity,Infinity];a.max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<data.length;i++){const k=i%3;a.min[k]=Math.min(a.min[k],data[i]);a.max[k]=Math.max(a.max[k],data[i]);}}j.accessors.push(a);chunks.push(bytes);offset+=bytes.length;const pad=(4-offset%4)%4;if(pad){chunks.push(Buffer.alloc(pad));offset+=pad;}return id;}
let before=0,after=0;
for(const p of j.meshes[0].primitives){const pos=read(p.attributes.POSITION),ind=new Uint32Array(read(p.indices));before+=ind.length/3;const [reduced,error]=S.simplify(ind,pos,3,Math.floor(ind.length*.075/3)*3,.012,['Permissive']);const kept=new Map();for(const i of reduced)if(!kept.has(i))kept.set(i,kept.size);const remapped=Uint32Array.from(reduced,i=>kept.get(i));for(const [key,id]of Object.entries(p.attributes)){const source=read(id),a=oldAccessors[id],n=sizes[a.type],dest=new source.constructor(kept.size*n);for(const [old,next]of kept)dest.set(source.subarray(old*n,old*n+n),next*n);p.attributes[key]=append(dest,a.type,a.componentType);}p.indices=append(remapped,'SCALAR',5125);after+=reduced.length/3;console.log(j.materials[p.material].name,ind.length/3,'->',reduced.length/3,'error',error);}
j.buffers=[{uri:'tree_small_02.bin',byteLength:offset}];j.asset.extras={optimized:true,sourceTriangles:before,triangles:after,method:'meshoptimizer 7.5% target, 1.2% error, UV seams preserved'};
fs.writeFileSync(root+'tree_small_02.bin',Buffer.concat(chunks));fs.writeFileSync(root+'tree_small_02.gltf',JSON.stringify(j));console.log('Total',before,'->',after,'triangles',offset,'bytes');
