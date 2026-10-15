// Shared by the visible room and collision tests, in world-space metres.
export const HOME = {
  bounds: { minX: -27.5, maxX: -17, minZ: 36, maxZ: 46 },
  floor: .3,
  height: 4.2,
  door: { x: -17, minZ: 39.7, maxZ: 41.9, height: 2.85 },
  spawn: { x: -22.25, z: 39.6 },
  lookAt: [-22.25, 2.54, 36.36],
  route: [{ x: -22.25, z: 39.6 }, { x: -20.3, z: 40.9 }, { x: -15, z: 40.9 }, { x: -8, z: 40.9 }],
};

export const rect = (x,z,w,d) => ({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});
export const HOME_WALLS = [
  { x:-22.25,z:36,w:10.5,d:.32,h:4.2,y:2.4 },
  { x:-27.5,z:41,w:.32,d:10,h:4.2,y:2.4 },
  { x:-17,z:37.85,w:.32,d:3.7,h:4.2,y:2.4 },
  { x:-17,z:43.95,w:.32,d:4.1,h:4.2,y:2.4 },
  // Window sill remains solid at foot level.
  { x:-22.25,z:46,w:10.5,d:.32,h:1.05,y:.825 },
];
export const HOME_OBSTACLES = [
  ...HOME_WALLS.map(p=>rect(p.x,p.z,p.w,p.d)),
  rect(-26.35,40.1,1.65,3.3), // sofa
  rect(-18.5,36.8,1.65,1.1), // storage cupboard
  rect(-19.5,44.4,2.1,1.25), // table
  rect(-17.55,44.2,.8,1.8), // shelf
  rect(-25.4,44.9,2.9,1.25), // mattress
  rect(-18.1,39.9,2.35,.5), // broken door, open against the jamb
];
export const isInsideHome = ({x,z}) => x>HOME.bounds.minX&&x<HOME.bounds.maxX&&z>36&&z<46;
export const WORLD_BOUNDS = {minX:-240,maxX:240,minZ:-280,maxZ:280};
export function floorHeight({x,z}) {
  if(isInsideHome({x,z}))return HOME.floor;
  if(Math.abs(x)>11.5&&Math.abs(x)<17.3&&!(z>8&&z<30))return .3;
  if(Math.abs(x)>17&&Math.abs(x)<377&&Math.abs(z-19)>9.5&&Math.abs(z-19)<14.25)return .3;
  if(Math.abs(x)>17&&Math.abs(x)<227&&(Math.abs(z-137.8)<1.25||Math.abs(z-156.2)<1.25))return .3;
  return .08;
}
export function canOccupy(x,z,obstacles,radius=.23) {
  if(!Number.isFinite(x)||!Number.isFinite(z)||x<WORLD_BOUNDS.minX||x>WORLD_BOUNDS.maxX||z<WORLD_BOUNDS.minZ||z>WORLD_BOUNDS.maxZ)return false;
  return !obstacles.some(b=>x+radius>b.minX&&x-radius<b.maxX&&z+radius>b.minZ&&z-radius<b.maxZ);
}
export function moveWithCollisions(position,dx,dz,obstacles) {
  const next={x:position.x,z:position.z};
  // Substeps prevent thin door jambs from being crossed on a slow frame.
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.1));
  for(let i=0;i<steps;i++) {
    if(canOccupy(next.x+dx/steps,next.z,obstacles))next.x+=dx/steps;
    if(canOccupy(next.x,next.z+dz/steps,obstacles))next.z+=dz/steps;
  }
  return next;
}
