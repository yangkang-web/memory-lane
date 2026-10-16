import * as T from 'three';
import { createInfectedCrowdAssets } from './infected-crowd-assets.js';
import { streetSurface } from './companion-street-response.js';
import { smooth } from './last-companion-timeline.js';

export const FINALE_HORDE_COUNT = 180;

// Two deep streams pass either side of the fountain, inside the plaza walls.
// Use playback seconds so edits/seeking cannot teleport the pursuit forward.
export function finaleCrowdPosition(index, time) {
  const side = index % 12 < 6 ? 1 : -1;
  const lane = index % 6, row = Math.floor(index / 12);
  const speed = 3.35 + (index % 5) * .045;
  const distance = Math.max(0, time - 49) * speed;
  return {
    x: side * (5.8 + lane * 1.04) + Math.sin(index * 17.1) * .14,
    y: .23,
    z: 178 + row * 1.55 + Math.cos(index * 7.31) * .45 - distance,
    distance, speed,
  };
}

// East-side pursuers stay on the station side of the maintenance-room wall.
// Their old route at z124 put background extras inside the escape room.
export function metroCrowdPosition(index, time) {
  const west = index % 2;
  return {
    x: (west ? -5.1 : 5.1) + Math.sin(index * 17.1) * .35,
    y: -6.9,
    z: (west ? 129 - Math.floor(index / 2) * 1.1 - smooth(time, 311, 390) * 5
      : 119 - Math.floor(index / 2) * .9 - smooth(time, 311, 390) * 2)
      + Math.cos(index * 7.31) * .65,
  };
}

// Mid-distance crowd shares geometry; close encounters use fully articulated actors.
export function createCompanionHorde(scene) {
  const root = new T.Group(); root.name = 'Infected crowd / textured pose atlas'; scene.add(root);
  const count=56, assets=createInfectedCrowdAssets(root,FINALE_HORDE_COUNT);
  const actor=new T.Object3D(), target=new T.Vector3();
  function update(s, camera) {
    if (s.compact && s.playbackTime >= 49) {
      root.visible = s.playbackTime < 58.2;
      if (!root.visible) return;
      assets.begin();
      for (let i = 0; i < FINALE_HORDE_COUNT; i++) {
        const path = finaleCrowdPosition(i, s.playbackTime);
        const size = .91 + (i % 7) * .023;
        actor.position.set(path.x, path.y, path.z);
        actor.rotation.set(0, 0, 0);
        actor.scale.set(size * (.94 + (i % 3) * .06), size, size);
        actor.updateMatrix();
        assets.write(i, s.playbackTime, true, true, actor.matrix, path.distance / size);
      }
      assets.end();
      return;
    }
    if(s.compact&&(s.playbackTime<18||s.playbackTime>=52)){root.visible=false;return;}
    const t = s.t, shop = t >= 147 && t < 184, street = t >= 234 && t < 289, metro = t >= 311 && t < 402, plaza = t >= 433 && t < 474;
    root.visible = shop || street || metro || plaza; if (!root.visible) return;
    const visible = plaza ? count : shop ? 12 : street ? Math.min(36,Math.max(0,Math.floor((t-240)*2)+1)) : 20;
    assets.begin();
    for (let i = 0; i < visible; i++) {
      let x, y, z;
      if (shop) { x = 17.8 + smooth(t, 147 + i * .12, 177) * 5; z = 44 + (i % 3 - 1) * .53; y = .3; x -= Math.floor(i / 3) * .65; }
      if (street) { const u=smooth(t,240+i*.5,280+i*.15);x=15.7-u*(14+(i%3)*.5);z=70.9+(i%3)*.7+u*24;y=streetSurface(x); }
      if (metro) { ({ x, y, z } = metroCrowdPosition(i, t));if(s.compact){x=i%2?-5.1:5.1;z=148+Math.floor(i/2)*2.2-(s.playbackTime-18)*2.7;} }
      if (plaza) {
        if (i < 28) { x = (i % 7 - 3) * 2.5; z = 176 + Math.floor(i / 7) * 1.7; }
        else if (i < 40) { x = 10.5 + (i % 2) * .65; z = 152 + (i - 28) * 1.25; }
        else { x = 6.7 + (i % 4) * .65; z = 143 - Math.floor((i - 40) / 4) * .9; }
        // Leave the giant a readable approach lane until the final charge.
        if (i < 28 && Math.abs(x) < 2) x += x < 0 ? -2.7 : 2.7;
        const move = smooth(t, 468.5, 476) * .7; x += (3.8 - x) * move; z += (159 - z) * move; y = .23;
      }
      if (!metro) { x+=Math.sin(i*17.1)*.35;z+=Math.cos(i*7.31)*.65; }
      target.set(camera.position.x, y, camera.position.z);
      actor.position.set(x, y, z); actor.rotation.set(0, Math.atan2(x - target.x, z - target.z), 0);
      const size = .90 + (i % 7) * .028; actor.scale.set(size * (.92 + (i % 3) * .08), size, size); actor.updateMatrix();
      const moving=!plaza||t>468.5;
      assets.write(i,s.playbackTime??t,moving,s.compact||street||t>468.5,actor.matrix,s.compact?(s.playbackTime-18)*2.7/size:null);
    }
    assets.end();
  }
  return {ready:assets.ready,update,hide(){root.visible=false;},dispose(){assets.dispose();root.removeFromParent();}};
}
