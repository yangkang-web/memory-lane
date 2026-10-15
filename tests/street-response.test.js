import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createStreetResponse, streetResponseActors, windowPounce } from '../src/companion-street-response.js';

function fixture(){
  const street=new T.Group(),material=new T.MeshStandardMaterial();
  const group=(p,x,y,z)=>{const o=new T.Group();o.position.set(x,y,z);p.add(o);return o;};
  const mesh=(p,g,m,x=0,y=0,z=0)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);p.add(o);return o;};
  const box=(p,w,h,d,m,x,y,z)=>mesh(p,new T.BoxGeometry(w,h,d),m,x,y,z);
  const response=createStreetResponse({street,group,mesh,box,label:()=>{},concrete:material,brick:material,metal:material,rust:material,dark:material,glass:material});
  return {response,dispose(){street.traverse(o=>o.geometry?.dispose());material.dispose();}};
}

test('pouncing actor crosses the actual window only after breakage, and rewinding restores the set',()=>{
  const f=fixture(),r=f.response;
  try{
    for(let t=261;t<265;t+=.025){
      r.update(t);const actor=windowPounce(t);
      if(actor.x<=r.escapeGlass.position.x)assert.equal(r.escapeGlass.visible,false,`actor crosses intact glass at ${t}`);
      assert.ok(actor.y>=.24,`feet below pavement at ${t}`);
    }
    r.update(263);assert.ok(r.shards.some(s=>s.visible));assert.ok(r.garageGate.position.y>1);
    r.update(232);assert.equal(r.escapeGlass.visible,true);assert.ok(r.shards.every(s=>!s.visible));assert.equal(r.garageGate.position.y,.24);
    assert.ok(r.slats.flat().every(s=>s.position.x===13.6));
    // Roof actors remain on the slab, instead of teleporting into the road at 251s.
    for(let t=234;t<289;t+=.1)for(const a of streetResponseActors(t).filter(a=>a.phase==='roof')){
      assert.ok(a.x>=13.35&&a.x<=16.55);assert.equal(a.y,6.4);assert.ok(a.z>=67.8&&a.z<=84.2);
    }
  }finally{f.dispose();}
});

test('shutter impacts lift the centre then recoil while the guide edges stay seated',()=>{
  const f=fixture(),r=f.response;
  try{
    r.update(235.4);const rest=r.slats[0][3].position.clone();
    for(const at of [235.7,237.1]){
      r.update(at+.08);const struck=r.slats[0][3].position.clone();
      assert.ok(struck.y-rest.y>.8,'lower opening is too small to read across the road');
      for(const edge of [0,6])assert.ok(Math.abs(r.slats[0][edge].position.y-rest.y)<1e-6,'guide edge lifts out of its channel');
      assert.ok(r.slats.flat().every(s=>s.position.y>=.3),'slat drops below the pavement');
      r.update(at+.65);assert.ok(r.slats[0][3].position.y<struck.y-.6,'impact never recoils');
    }
    r.update(232);assert.ok(r.slats[0][3].position.distanceTo(rest)<1e-6,'rewind keeps the dent');
  }finally{f.dispose();}
});
