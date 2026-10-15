import {bloodboundBeat} from '../journey-timeline.js';
// A 60-second edit, not a time-scale multiplier. Existing performances play at their authored speed.
export function createBloodboundSequence({flow,player,hunter,lucien,interact,onComplete}) {
 let time=0,done=false;
 const wrap=value=>Math.atan2(Math.sin(value),Math.cos(value));
 function update(dt){
  if(done)return;time=Math.min(60,time+dt);
  const beat=bloodboundBeat(time);if(flow.segment!==beat.id)flow.go(beat.id);
  const local=time-beat.at;
  let target=null,pitch=-.03;
  if(beat.id==='explore'){
   const k=Math.min(1,time/6),ease=k*k*(3-2*k);player.setPose({x:0,z:5.6-7.8*ease,yaw:0,pitch:-.02});
  }else{
   target=beat.id==='danger'||beat.id==='rescue'&&local<2.3?hunter.group.position:lucien.group.position;
   const yaw=Math.atan2(player.pose.x-target.x,player.pose.z-target.z);
   player.pose.yaw+=wrap(yaw-player.pose.yaw)*(1-Math.exp(-dt*(beat.id==='rescue'?3:1.8)));
   if(beat.id==='wound'){pitch=local<4?-.65:-.05;if(local>.6)interact.perform('arm');}
   if(beat.id==='intimacy'){pitch=-.10;if(local>.35)interact.perform('lucien');}
   if(beat.id==='gift'){pitch=-.24;if(local>3)interact.perform('pendant');}
   if(beat.id==='wear')pitch=-.02;
   if(beat.id==='end')pitch=-.8;
   player.pose.pitch+=(pitch-player.pose.pitch)*(1-Math.exp(-dt*2.3));
  }
  if(time>=60){done=true;onComplete();}
 }
 return {update,reset(){time=0;done=false;},get time(){return time;}};
}
