import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSave,writeSave} from '../src/storage.js';
import {world} from '../src/story.js';
const storage = value => ({getItem:()=>value,setItem(k,v){value=v;}});
test('older saves receive defaults without losing collected memories',()=>{
 const s=loadSave(storage(JSON.stringify({favorites:['seat'],visited:['seat']})));
 assert.deepEqual(s.data.favorites,['seat']);assert.equal(s.data.sound,true);assert.equal(s.data.quality,'auto');
});
test('invalid disk values do not reach world rendering',()=>{
 for(const v of ['{broken',JSON.stringify({visited:['unknown-node']}),JSON.stringify({sound:'false'}),JSON.stringify({worldId:'another-world'})]){
  const s=loadSave(storage(v));assert.deepEqual(s.data.visited,[]);assert.equal(s.data.sound,true);
 }
});
test('visits and favorites survive a save and reload',()=>{
 const db=storage(null);const data=loadSave(db).data;
 data.visited=['seat','time'];data.favorites=['time'];data.lastNode='time';data.sound=false;
 assert.equal(writeSave(data,db),true);const restored=loadSave(db).data;
 assert.deepEqual(restored.visited,data.visited);assert.deepEqual(restored.favorites,['time']);assert.equal(restored.lastNode,'time');assert.equal(restored.sound,false);
});
test('blocked storage returns a failure instead of promising a save',()=>{
 const db={getItem(){throw Error('denied')},setItem(){throw Error('denied')}};
 const s=loadSave(db);assert.equal(s.available,false);assert.equal(writeSave(s.data,db),false);
});
test('every memory has original evidence in the bundled chapter',async()=>{
 const {readFile}=await import('node:fs/promises');const text=(await readFile(new URL('../public/assets/alice-chapter-vii.txt',import.meta.url),'utf8')).replace(/\s+/g,' ');
 for(const n of world.nodes)for(const q of n.quotes)assert.ok(text.includes(q.original),`Missing source: ${q.original}`);
});
