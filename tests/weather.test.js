import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {WEATHER} from '../src/weather-state.js';
import {createWeatherRain} from '../src/weather-rain.js';

test('the default is simultaneous sunshine and gentle rain, not separate modes',()=>{
  assert(WEATHER.sun>4);assert(WEATHER.rain>0&&WEATHER.rain<1);
  assert(WEATHER.fogNear>80,'sunshowers retain clear long-distance visibility');
  assert(WEATHER.wetness>0&&WEATHER.wetness<1);
});
test('rain initializes with finite instanced buffers and stays hidden before shelter capture',()=>{
  const scene=new T.Scene(),rain=createWeatherRain(scene),camera=new T.PerspectiveCamera();
  rain.update(camera,WEATHER,8);const mesh=scene.children[0];assert.equal(mesh.visible,false);
  for(const attribute of Object.values(mesh.geometry.attributes))assert([...attribute.array].every(Number.isFinite));
  rain.dispose();assert.equal(scene.children.length,0);
});
