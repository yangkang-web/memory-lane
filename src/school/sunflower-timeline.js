export const STORY_DURATION=60;
export const storyChapters=['A promise in the sunlight','A letter, just for you','The little things you remember','Always toward you'];
export const letterFront=['Today is day N of liking you.','','If you haven’t said yes yet,','I’ll try a little harder tomorrow.','','After all, what I’m best at','is always liking you.'];
export const letterBack=['Remember saying yesterday','that you love sunflowers?','','They always turn toward the sun.','','And me?','I only want to turn toward you.'];
export const finalThought='The sweetest love letter is knowing you remembered even the things I said in passing.';
const messages=[
 [0,3.3,'You','If we went to the same school, how would you win me over?'],
 [3.3,9.3,'Fumiriya','I’d write you a love letter every day, until you said yes to being my girlfriend.'],
 [9.3,12,'You','Then the first one has to be super sweet! No half-hearted effort!'],
 [12,14.7,'Fumiriya','Deal. You’ll have it tomorrow.'],
 [15.3,18.6,'','The next morning… A pink envelope, waiting on your desk.'],
 [18.6,20,'','To my favorite girl.'],
 [39,43,'You · yesterday','I love sunflowers. Just seeing them makes me happy.'],
 [43,45,'','He remembered. Even that little thing.'],
 [45,47.1,'You','Got your letter. I love it.'],
 [47.1,49.6,'Fumiriya','Then, may I ask you something a little early?'],
 [49.6,51,'You','What?'],
 [51,54,'Fumiriya','Will today’s leading lady be my girlfriend?'],
 [54,56.8,'You','Yes. But I still want a letter tomorrow.'],
 [56.8,58.6,'Fumiriya','As you wish, my girlfriend.'],
 [58.6,60.01,'',finalThought],
];
// Walk along Room 101’s clear window aisle, then look at its existing right-wall painting.
export const cameraKeys=[
 [0,[-34.1,1.72,-24.28],[-34.1,1.2,-25.1]],
 [2.8,[-34.1,1.72,-24.28],[-34.1,1.35,-25.15]],
 [4,[-34.1,1.72,-24.28],[-33.25,1.65,-26.1]],
 [8.5,[-34.1,1.72,-24.28],[-33.25,1.65,-26.1]],
 [10,[-34.1,1.72,-24.28],[-34.1,1.25,-25.1]],
 [12.3,[-34.1,1.72,-24.28],[-33.25,1.65,-26.1]],
 [14.8,[-34.1,1.72,-24.28],[-36.68,1.95,-24.35]],
 [15,[-35.35,2.08,-22.8],[-34.1,1.3,-25.1]],
 [17.3,[-35.35,2.02,-24.2],[-33.91,1.3,-25.1]],
 [19,[-34.1,1.72,-24.28],[-34.1,1.35,-25.1]],
 [22,[-34.1,1.72,-24.28],[-34.1,2,-30]],
 [38.5,[-34.1,1.72,-24.28],[-34.1,2,-30]],
 [41,[-34.1,1.72,-24.28],[-36.68,1.95,-24.35]],
 [45,[-34.1,1.72,-24.28],[-34.1,1.3,-25.1]],
 [47.5,[-34.1,1.72,-24.28],[-33.25,1.65,-26.1]],
 [54,[-34.1,1.72,-24.28],[-33.25,1.65,-26.1]],
 [55.3,[-35.45,2.05,-24.28],[-26.271,2.94,-31.15]],
 [58.7,[-35.55,2.05,-29.8],[-26.271,2.94,-31.15]],
 [60,[-35.2,2.05,-32.0],[-26.271,2.94,-31.15]],
];
const smooth=x=>x*x*(3-2*x);
export function storyFrame(value){
 const t=Math.max(0,Math.min(STORY_DURATION,Number.isFinite(value)?value:0));
 let i=cameraKeys.findIndex(k=>k[0]>t);if(i<0)i=cameraKeys.length-1;if(i===0)i=1;
 const a=cameraKeys[i-1],b=cameraKeys[i],p=smooth(Math.max(0,Math.min(1,(t-a[0])/(b[0]-a[0]))));
 const mix=(a,b)=>a.map((x,j)=>x+(b[j]-x)*p);
 const message=messages.find(([start,end])=>t>=start&&t<end);
 const letter=t>=18.6&&t<40;
 return {time:t,chapter:Math.min(3,Math.floor(t/15)),position:mix(a[1],b[1]),target:mix(a[2],b[2]),
  speaker:message?.[2]||'',text:message?.[3]||'',phone:t<14.5||(t>=45&&t<47.1)||(t>=54&&t<55),
  letter,back:t>=30,flip:t>=29.7&&t<=30.5?smooth((t-29.7)/.8):t>30.5?1:0,
  fade:t>14.55&&t<15.55?Math.max(0,1-Math.abs(t-15.05)/.5):0,
  envelope:t>=15&&t<19,ending:t>=58.6};
}
