import fs from 'node:fs/promises';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
export async function loadGeometry(url) {
  const bytes=await fs.readFile(new URL('../../public'+url,import.meta.url));
  const length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length));
  const bin=bytes.subarray(28+length);
  json.materials=json.materials.map(()=>({pbrMetallicRoughness:{metallicFactor:0,roughnessFactor:.9}}));
  delete json.images;delete json.textures;delete json.samplers;
  json.extensionsUsed=[];json.extensionsRequired=[];
  let encoded=Buffer.from(JSON.stringify(json));encoded=Buffer.concat([encoded,Buffer.alloc((4-encoded.length%4)%4,32)]);
  const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+encoded.length+bin.length,8);header.writeUInt32LE(encoded.length,12);header.writeUInt32LE(0x4e4f534a,16);
  const chunk=Buffer.alloc(8);chunk.writeUInt32LE(bin.length);chunk.writeUInt32LE(0x004e4942,4);
  const data=Buffer.concat([header,encoded,chunk,bin]);
  return new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.length),'');
}
