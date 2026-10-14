import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createStreetWater, PUDDLES } from '../src/street-water.js';

test('water is above both avenue and raised intersection, while below the curb',()=>{
  const scene=new T.Scene(),water=createStreetWater(scene);scene.updateMatrixWorld(true);
  const ray=new T.Raycaster(),down=new T.Vector3(0,-1,0);
  for(const [x,z]of PUDDLES){
    ray.set(new T.Vector3(x,2,z),down);
    const hit=ray.intersectObjects(scene.children)[0];
    assert(hit,'each authored pool has a visible surface');
    const roadHeight=z>=9.5&&z<=28.5?.06:.04;
    assert(hit.point.y>roadHeight+.001,'water must not disappear beneath the cross-street');
    assert(hit.point.y<.25,'shallow road water must remain below the pavement');
  }
  water.dispose();scene.children[0].geometry.dispose();scene.children[0].material.dispose();
});
