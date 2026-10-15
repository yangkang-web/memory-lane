// Local, silent articulation preview. These are syllable envelopes, not audio lip-sync.
export const mouthShapes=['aa','ih','ou','ee','oh'];
const phrase=[['aa',.24,.55],['ih',.18,.35],['ee',.26,.42],['',.22,0],['oh',.29,.5],['ou',.22,.4],['aa',.3,.58],['',.48,0],['ih',.2,.35],['aa',.28,.5],['oh',.24,.42],['',.65,0]];
const duration=phrase.reduce((sum,part)=>sum+part[1],0);
export function speechPose(time){
  let t=((time%duration)+duration)%duration;
  const pose=Object.fromEntries(mouthShapes.map(name=>[name,0]));
  for(const [shape,length,amount] of phrase){
    if(t<length){if(shape)pose[shape]=Math.sin(Math.PI*t/length)**2*amount;break;}
    t-=length;
  }
  return pose;
}
export function offerPose(time){
  const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  return ease(time/.9)*(1-ease((time-2.3)/1));
}
