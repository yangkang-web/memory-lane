// Keep the original sixty-second dialogue and give the final response a quiet coda.
export const STORY_DURATION=68;
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
 [63,68.01,'',finalThought],
];
// Walk along Room 101’s clear window aisle, then look at its existing right-wall painting.
export const cameraKeys=[
 [0,[-34.1,1.72,-24.28],[-34.1,1.2,-25.1]],
 [2.8,[-34.1,1.72,-24.28],[-34.1,1.35,-25.15]],
 [4,[-34.1,1.72,-24.28],[-33.25,1.65,-26.1]],
 [8.5,[-34.1,1.72,-24.28],[-33.25,1.65,-26.1]],
 [10,[-34.1,1.72,-24.28],[-34.1,1.25,-25.1]],
 [12.3,[-34.1,1.72,-24.28],[-33.25,1.65,-26.1]],
 [14.8,[-34.1,1.72,-24.28],[-36.68,2.08,-25.55]],
 [15,[-35.35,2.08,-22.8],[-34.1,1.3,-25.1]],
 [17.3,[-35.35,2.02,-24.2],[-33.91,1.3,-25.1]],
 [19,[-34.1,1.72,-24.28],[-34.1,1.35,-25.1]],
 [22,[-34.1,1.72,-24.28],[-34.1,2,-30]],
 [38.5,[-34.1,1.72,-24.28],[-34.1,2,-30]],
 [41,[-34.1,1.86,-24.28],[-36.68,2.08,-25.55]],
 [42.7,[-34.1,1.86,-24.28],[-36.68,2.08,-25.55]],
 [45,[-34.1,1.72,-24.28],[-34.1,1.3,-25.1]],
 [47.8,[-34.1,1.82,-24.28],[-33.25,1.96,-26.1]],
 [51,[-34.1,1.82,-24.28],[-33.25,1.96,-26.1]],
 [58.7,[-34.1,1.82,-24.28],[-33.25,1.96,-26.1]],
 [59.4,[-35.5,2.03,-24.8],[-26.271,2.85,-31.15]],
 [64,[-35.5,2.03,-31.65],[-26.271,2.85,-31.15]],
 [68,[-35.5,2.03,-31.65],[-26.271,2.85,-31.15]],
];
const smooth=x=>x*x*(3-2*x);
const ramp=(t,a,b)=>smooth(Math.max(0,Math.min(1,(t-a)/(b-a))));
const pulse=(t,a,b,c,d)=>ramp(t,a,b)*(1-ramp(t,c,d));
export function storyPerformance(t){
 const shy=pulse(t,48.8,49.7,50.4,51.2);
 const relief=ramp(t,54,56);
 return {headPitch:shy*.11-relief*.025,headYaw:shy*.065,
  headTilt:relief*.055,pelvisShift:Math.sin(t*.65)*.004,
  smile:.04+relief*.24,gesture:pulse(t,50.8,51.8,53,54)*.5,
  nod:pulse(t,56.7,57.05,57.25,57.65)*.055};
}
export const voiceCaptions=[
 [19.2,21.2,'Today is day N of liking you.'],
 [21.2,24.2,"If you haven’t said yes, I’ll try a little harder tomorrow."],
 [24.2,28.5,"What I’m best at is always liking you."],
 [31,33.4,'Remember saying you love sunflowers?'],
 [33.4,35.4,'They always turn toward the sun.'],
 [35.4,39,'And me? I only want to turn toward you.'],
];
export function storyFrame(value){
 const t=Math.max(0,Math.min(STORY_DURATION,Number.isFinite(value)?value:0));
 let i=cameraKeys.findIndex(k=>k[0]>t);if(i<0)i=cameraKeys.length-1;if(i===0)i=1;
 const a=cameraKeys[i-1],b=cameraKeys[i],p=smooth(Math.max(0,Math.min(1,(t-a[0])/(b[0]-a[0]))));
 const mix=(a,b)=>a.map((x,j)=>x+(b[j]-x)*p);
 const message=messages.find(([start,end])=>t>=start&&t<end);
 const spoken=voiceCaptions.find(([start,end])=>t>=start&&t<end);
 const letter=t>=18.6&&t<40;
 return {time:t,chapter:Math.min(3,Math.floor(t/15)),position:mix(a[1],b[1]),target:mix(a[2],b[2]),
  speaker:message?.[2]||(spoken?'Fumiriya':''),text:spoken?.[2]||message?.[3]||'',phone:t<14.5||(t>=45&&t<47.8),
  phoneLift:pulse(t,-1,0,13.7,14.5)+pulse(t,44.7,45.4,47.1,47.8),
  portrait: pulse(t,47.1,51,58.7,59.3),
  fov:52-19*pulse(t,47.1,51,58.7,59.3)-23*ramp(t,60,64),
  boyOpacity:pulse(t,3.1,4,13.8,14.6)+pulse(t,46.7,47.8,58.8,59.35),
  dream:(t>=3.1&&t<14.6)||(t>=46.7&&t<59.35),
  transition:t>=14.65&&t<16.2?'The next morning':t>=59&&t<60?'A moment to keep':'',
  letter,back:t>=30,flip:t>=29.7&&t<=30.5?smooth((t-29.7)/.8):t>30.5?1:0,
  fade:Math.max(pulse(t,14.55,14.95,15.3,15.9),pulse(t,58.8,59.05,59.5,59.85)),
  envelope:t>=15&&t<19.3,ending:t>=63};
}
