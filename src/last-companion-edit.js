import { DIALOGUE, clamp, sample, smooth, stateAt } from './last-companion-timeline.js';

export const DURATION=60;
export const HOME_OFFSET_Z=44;
// Each retained action has a deliberate screen-time budget. Omitted source
// sections are never fast-forwarded; the camera follows the new compact route.
export const SHOTS=[
  [0,3,24,33],[3,5,37,42],[5,12,44,52],
  [12,15,280,288],[15,18,288,301],[18,23,301,310],
  [23,26,319,326.8],[26,29.5,332,335.6],[29.5,32,335.6,342],
  [32,35,342,349],[35,39,357.8,360],
  [39,40,360,370],[40,42,370,378],[42,44,378,388],
  [44,46,388,391.1],[46,47,395.2,401],[47,52,401,420],
  [52,53,429,433],[53,55,460,464.3],[55,56.8,464.3,466],
  [56.8,58.2,466,474],[58.2,60,477,480],
].map(([start,end,from,to])=>({start,end,from,to}));
export function playbackAt(source){const s=SHOTS.find(s=>source>=s.from&&source<s.to);return s?s.start+(source-s.from)/(s.to-s.from)*(s.end-s.start):null;}

// Source contacts at the landing, lever and door retain their world coordinates.
// The starting dwelling is staged in the adjacent lot, and the story ends at
// the stair head instead of taking another 18-metre detour to the fountain.
export const CAMERA=[
  [0,-22.25,1.98,83.6],[1,-22.25,1.98,83.6],[2.3,-21,1.98,84.3],
  [3,-20.3,1.98,84.9],[4,-18.2,1.98,84.9],[5,-16.1,1.98,84.9],
  [7,-12,1.78,85.5],[9,-8.5,1.78,87.5],[10.5,-7,1.78,89],[12,-6,1.78,90],
  [13,-4,1.78,92.5],[14,-1.2,1.78,94.8],[14.45,-.8,1.72,95.6],[14.8,-.5,1.55,96.5],[15,-1.1,1.7,98.2],
  [15.4,-1.75,.2,100.2],[16.15,-1.65,-3.1,101],[16.8,.65,-7.1,103.45],
  [18,.65,-7.1,103.45],[20,.65,-7.1,103.45],[23,1.15,-7.1,103.5],
  [24,1.25,-7.1,104.45],[25,1.15,-7.1,104.7],[26,.7,-7.1,104.9],
  [29.8,.7,-7.1,104.9],[31,1.7,-7.4,105.7],[32,1.7,-7.1,105.7],
  [33,1.5,-7.6,105.5],[35,1.7,-7.1,105.7],[37,1.7,-6.9,105.7],
  [38,1.7,-6.7,105.7],[39,2.5,-5.3,108],
  [40,2.8,-5.3,111],[41,2.8,-6.1,114],[42,3.2,-5.3,117],
  [42.7,3.25,-5.3,119.5],[43.35,3.25,-5.3,123.1],[44,5.7,-5.3,123.05],[44.7,5.35,-5.3,123.4],
  [45.6,4.7,-5.3,123.55],[46,4.7,-5.3,123.55],
  [47,8,-5.3,126],[49,8,-2.75,131],[51,8,.7,138.5],[52,8,1.2,141],
  [53,8,.9,141.3],[60,8,.9,141.3],
];
export const LOOK=[
  [0,-22.25,2.54,80.36],[.8,-22.25,2.54,80.36],[2,-19,1.7,85],
  [4,-16,1.7,85],[5,-6,2.4,87],[7,-1,7,101],[9,-1,6,103],
  [10,-14,1.7,87],[11,-15,1.6,88],[12,-1,1.6,98],
  [12.8,-3.5,9,104],[13.65,-3.5,17,104],[14.15,-1,10,102],[14.45,0,2.2,101.4],[14.8,0,1.8,101.4],[15,0,-1,101],[16.5,0,-7,105],[18,1,-7.8,105],
  [19,-2,-5.5,107],[20.5,.2,-7.75,104.1],[23,1.25,-8,104.35],
  [25,1.25,-8,104.35],[26,.12,-7.68,104.2],[29.5,.12,-7.68,104.2],
  [30.2,0,-2.8,104],[32,1.4,-7.8,106.3],[33.5,1.4,-7.7,106.3],
  [35,1.4,-7.7,106.3],[37,1.4,-8,105.9],[39,3,-5.4,112],
  [40,4,-4.9,116],[41,1,-4.6,115],[42,4,-5.1,122],
  [44,5.5,-5.5,122.6],[45,4.2,-5.45,123.8],[46,4.1,-5.45,123.8],
  [47,8,-3,132],[50,8,1,142],[52,7,1.6,151],[53,7,1,151],
  [54,8,.8,144],[56.8,8,.8,144],[58,7,1.6,151],[60,7,1.6,151],
];
export const CHAPTERS=[
  [0,5,'向日葵与回声'],[5,12,'街角异响'],[12,18,'路面坍塌'],
  [18,23,'被困'],[23,32,'撬梁与二次坍塌'],[32,39,'失去左臂'],
  [39,52,'单臂逃生'],[52,60,'最后一次并肩'],
].map(([start,end,title])=>({start,end,title}));
// Sparse cues are placed on the new action beats, never inherited from deleted scenes.
export const CUES=[
  [.8,'beep'],[3.8,'door'],[9.5,'scrape'],[11.2,'growl'],[13.3,'rush'],[14.45,'impact'],[14.5,'crack'],[15,'collapse'],
  [16.8,'impact'],[18,'ring'],[24.9,'metal'],[26.2,'lever'],[29.7,'rebar'],[30.2,'collapse'],
  [31,'pain'],[35.5,'breath'],[37,'pain'],[40.7,'rush'],[45.5,'door'],[46.4,'bang'],[49,'bang'],
  [53,'breath'],[57.6,'howl'],
];
export const LINES=[
  [1.1,2.5,33],[20,22.7,16],[29.6,30.9,18],[37.1,39,22],
  [40,41.2,23],[55,56.8,36],[58.2,60,38],
].map(([start,end,index])=>({start,end,index,line:DIALOGUE[index]}));
export function editStateAt(time){
  const playbackTime=clamp(time,0,DURATION),shot=SHOTS.find(s=>playbackTime<s.end)||SHOTS.at(-1);
  const playbackRate=(shot.to-shot.from)/(shot.end-shot.start),sourceTime=shot.from+(playbackTime-shot.start)*playbackRate;
  const state=stateAt(sourceTime),line=LINES.find(l=>playbackTime>=l.start&&playbackTime<l.end);
  const chapter=CHAPTERS.findIndex(c=>playbackTime<c.end);
  const blackout=playbackTime>=58.2?1:playbackTime>=30? smooth(playbackTime,30,30.5)*(1-smooth(playbackTime,31.4,32)):smooth(playbackTime,16.5,17)*(1-smooth(playbackTime,17.7,18.7));
  return {...state,compact:true,playbackTime,playbackRate,editChapter:chapter<0?CHAPTERS.length-1:chapter,
    crowbar:playbackTime>=35&&playbackTime<53?true:state.crowbar,camera:sample(CAMERA,playbackTime),look:sample(LOOK,playbackTime),blackout,
    leftArm:playbackTime<31.2,injured:playbackTime>=31.2,backpack:false,pipe:false,
    storeOnly:false,underground:playbackTime>=16&&playbackTime<52,sunset:playbackTime>=52,
    terminalPlaced:false,terminalOn:true,inventory:{water:0,bandage:false,biscuits:0},
    line:line?.line||null,voice:line?{index:line.index,elapsed:playbackTime-line.start,duration:line.end-line.start}:null};
}
