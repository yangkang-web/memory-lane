import { HOME, floorHeight } from './walk-layout.js';
export const STORY_DURATION=60;
// Optional fourth component is the authored floor level during the fall/subway.
export const CAMERA_PATH=[
  [0,-22.25,39.6],[3,-22.25,39.6],[5,-20.3,40.9],[8,-15,40.9],[11,-11,40.9],[14,-8,40.9],
  [21,-8,40.9],[24,-4,49],[27,0,56],[28,0,58,.08],[28.5,.1,59,-.4],[29.3,.3,60.4,-3.2],
  [30,.4,61.5,-7.2],[32,.4,61.5,-7.2],[35,0,69,-7.2],[37,0,72,-7.2],
  [41,0,74,-7.2],[44,0,82,-7.2],[47,0,84,-7.2],[52,0,98,-7.2],[56,0,105,-7.1],[60,0,105,-7.1],
];
export const COMPANION_PATH=[
  [0,-10,42.5],[11,-10,42.5],[14,-5.8,43],[21,-5.8,43],[24,-2,51],[27,1.3,58,.08],
  [27.7,1.3,59,-.5],[28.8,1.4,61,-4.4],[29.5,1.5,62.5,-7.2],[32,1.5,62.5,-7.2],
  [35,1.7,71,-7.2],[37,1.9,74,-7.2],[41,1.9,75,-7.2],[44,1.7,83,-7.2],[47,1.7,86,-7.2],
  [52,1.3,102,-7.1],[56,1.5,104,-7.1],[60,1.5,104,-7.1],
];
export const ENEMIES=[
  {id:'street-left',start:12,dead:17.7,path:[[12,-3,32],[17.7,-3,37]],shooter:'player'},
  {id:'street-right',start:13,dead:20,path:[[13,5,35],[20,1.3,39]],shooter:'lin'},
  {id:'tunnel-left',start:30,dead:37.4,path:[[30,-1.5,82,-7.2],[37.4,-1.5,76,-7.2]],shooter:'player'},
  {id:'platform-runner',start:32,dead:40,path:[[32,3.7,83,-7.2],[40,2.8,77,-7.2]],shooter:'lin'},
  {id:'last-runner',start:38,dead:46.5,path:[[38,.2,96,-7.2],[46.5,.2,88,-7.2]],shooter:'player'},
];
export const SHOTS=[
  {t:16.5,target:0,by:'player'},{t:17.7,target:0,by:'player'},{t:18.5,target:1,by:'lin'},{t:20,target:1,by:'lin'},
  {t:36.5,target:2,by:'player'},{t:37.4,target:2,by:'player'},{t:38.8,target:3,by:'lin'},{t:40,target:3,by:'lin'},
  {t:45.5,target:4,by:'player'},{t:46.5,target:4,by:'player'},
];
export const LINES=[
  [0,3,'我','这座城，已经安静太久了。'],[3.2,7.7,'电台 · 林','我在门外。北站还有人，跟我走。'],
  [9,12.8,'林','别出声。穿过街口，我们就能到安全屋。'],[13.2,16,'林','感染者！左边交给你，我掩护。'],
  [20.2,23,'我','清掉了。走！'],[25,28.2,'林','等等——地面在裂！'],[28.3,30.5,'我','林！抓住——！'],
  [30.8,33.7,'林','我没事……这里是地铁。起来，它们听见了！'],
  [34,36.3,'林','别停！沿着轨道跑，我掩护你！'],[38.3,41.1,'我','右边！车厢后面！'],
  [43,45.2,'林','绿灯就在前面！最后一个，打倒它！'],[47,50.4,'林','快！避难室的门开了！'],
  [51,54,'北站值守','进来！别回头！'],[55,57.3,'林','我们都进来了。关门！'],[58,60,'我','这次……我们都活下来了。'],
];
function point(p){return {x:p[1],z:p[2],y:p[3]??floorHeight({x:p[1],z:p[2]})};}
export function samplePath(path,time){
  if(time<=path[0][0])return point(path[0]);
  for(let i=1;i<path.length;i++)if(time<=path[i][0]){const a=path[i-1],b=path[i],u=(time-a[0])/(b[0]-a[0]),pa=point(a),pb=point(b);return {x:pa.x+(pb.x-pa.x)*u,z:pa.z+(pb.z-pa.z)*u,y:a[3]!==undefined||b[3]!==undefined?pa.y+(pb.y-pa.y)*u:floorHeight({x:pa.x+(pb.x-pa.x)*u,z:pa.z+(pb.z-pa.z)*u})};}
  return point(path.at(-1));
}
export function storyPhase(t){return t<8?'01 / 电台信号':t<14?'02 / 与林会合':t<21?'03 / 清理街口':t<28?'04 / 路面塌陷':t<33?'05 / 坠入地下':t<47?'06 / 地铁逃亡':'07 / 最后一道门';}
export function storyCamera(t){const p=samplePath(CAMERA_PATH,t);let eye=1.68;if(t>=30&&t<32)eye=.48+1.2*Math.min(1,(t-30)/2);return [p.x,p.y+eye,p.z];}
export function storyLook(t){
  const lin=samplePath(COMPANION_PATH,t),next=samplePath(CAMERA_PATH,t+1.5);
  if(t<3)return HOME.lookAt;if(t<5)return [-16,1.7,40.9];if(t<13.8)return [lin.x,lin.y+1.6,lin.z];
  if(t<18.3){const e=samplePath(ENEMIES[0].path,t);return [e.x,e.y+1.4,e.z];}
  if(t<21){const e=samplePath(ENEMIES[1].path,t);return [e.x,e.y+1.4,e.z];}
  if(t<27)return [next.x,1.5,next.z+2];if(t<30)return [lin.x,lin.y+.8,lin.z];if(t<33)return [lin.x,lin.y+1.3,lin.z];
  if(t<38){const e=samplePath(ENEMIES[2].path,t);return [e.x,e.y+1.4,e.z];}
  if(t<41){const e=samplePath(ENEMIES[3].path,t);return [e.x,e.y+1.4,e.z];}
  if(t<47){const e=samplePath(ENEMIES[4].path,t);return [e.x,e.y+1.4,e.z];}
  if(t<55)return [0,-5.5,106];return [1,-5.5,100];
}
