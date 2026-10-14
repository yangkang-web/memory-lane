export const SINKHOLE=[[-2.8,56.4],[2.8,56.7],[3.4,58.8],[2.9,63.7],[-2.4,64.3],[-3.2,60.8]];
// Shared authored locations: damage, plant growth and walkability agree in metres.
export const ROAD_FRACTURES=[
  {points:[[-11.1,55],[-8.7,54.3],[-6.3,52.6],[-3.4,53.1],[-.3,51.3],[2.8,51.8],[5.7,49.5],[8.7,50.2],[11.1,48.7]],width:.46},
  {points:[[-10.9,76],[-8.3,74.6],[-5.7,75.1],[-2.8,72.8],[.3,73.5],[3.2,71.4],[6.1,72],[9.8,69.5]],width:.29},
  {points:[[-10.8,-39],[-7.1,-37.2],[-3.9,-38],[-1.6,-35.9],[2,-36.7],[5.2,-34.9],[9.7,-35.6]],width:.25},
];
export function fractureOutline({points,width}) {
  const left=[],right=[];
  for(let i=0;i<points.length;i++) {
    const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
    const r=width*(.55+(i%3)*.24),[x,z]=points[i];
    left.push([x-dz/length*r,z+dx/length*r]);right.push([x+dz/length*r,z-dx/length*r]);
  }
  return [...left,...right.reverse()];
}
export const ROAD_PLANTS=ROAD_FRACTURES.flatMap(f=>f.points.slice(1,-1).map(([x,z],i)=>[x,z,.24+(i%3)*.07]));
export const ROOF_GARDENS=[
  [19.1,11.32,38.6,2.6],[18.7,11.32,41,2.1],[19.2,14.92,45.5,3.3],
  [17.4,7.55,52,.95],[17.2,11.15,58,1.2],[-18.5,8.98,55,2.8],
];
export function nearFracture(x,z,padding=0) {
  return ROAD_FRACTURES.some(({points,width})=>points.slice(1).some((b,i)=>{
    const a=points[i],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));
    return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t)<width+padding;
  }));
}
