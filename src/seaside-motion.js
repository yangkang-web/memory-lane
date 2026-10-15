const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10);};
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
export const GAZE_DURATION=12;
export const APPROACH_END=3.2;
export const INSPECT_END=8;
export const HERO_POSITION=[3.48,1.39,-.8];
const cabinetPosition=[1.65,1.6,-.7],cabinetLook=[3.48,1.54,-.8];
const finalPosition=[2.6,1.54,-.65];
// Approach first. Only once stationary in front of the cabinet do the two gaze
// cycles begin; the final move settles on the actual cigarette, without a cut.
export function seasidePose(time,reducedMotion=false){
  const t=Math.max(0,time);
  if(reducedMotion)return {position:[...finalPosition],look:[...HERO_POSITION],fov:40,focus:1,stage:'focus',done:true};
  if(t<APPROACH_END){
    const u=smooth(t/APPROACH_END);
    return {position:mix([.15,1.63,2.5],cabinetPosition,u),look:mix([.1,1.5,-3.5],cabinetLook,u),fov:63-8*u,focus:0,stage:'approach',done:false};
  }
  if(t<INSPECT_END){
    const u=(t-APPROACH_END)/(INSPECT_END-APPROACH_END),envelope=Math.sin(u*Math.PI)**2;
    const sway=Math.sin(u*Math.PI*4)*.36*envelope;
    return {position:[...cabinetPosition],look:[cabinetLook[0],cabinetLook[1]+Math.sin(u*Math.PI*8)*.018*envelope,cabinetLook[2]+sway],fov:55,focus:0,stage:'inspect',done:false};
  }
  const focus=smooth((t-INSPECT_END)/(GAZE_DURATION-INSPECT_END));
  return {position:mix(cabinetPosition,finalPosition,focus),look:mix(cabinetLook,HERO_POSITION,focus),fov:55-15*focus,focus,stage:'focus',done:t>=GAZE_DURATION};
}
