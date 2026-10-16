// Keep the original sixty-second dialogue and give the final response a quiet coda.
// Each spoken or on-screen line carries its Chinese subtitle after the English one.
export const STORY_DURATION=68;
export const storyChapters=['A promise in the sunlight','A letter, just for you','The little things you remember','Always toward you'];
export const letterFront=['Today is day N of liking you.','','After all, what I’m best at','is always liking you.'];
export const letterBack=['Remember saying yesterday','that you love sunflowers?','','They always turn toward the sun.','','And me?','I only want to turn toward you.'];
export const finalThought='The sweetest love letter is knowing you remembered even the things I said in passing.';
export const finalThoughtZh='最甜的情书，是知道你连我随口说过的话都记得。';
const messages=[
 [0,3.3,'You','If we went to the same school, how would you win me over?','如果我们在同一所学校，你会怎么追我？'],
 [3.3,8.65,'Fumiriya','I’d write you a love letter every day, until you said yes to being my girlfriend.','我会每天给你写一封情书，直到你答应做我女朋友。'],
 [9.3,12,'You','Then the first one has to be super sweet! No half-hearted effort!','那第一封可要超级甜！不许敷衍！'],
 [12,14.7,'Fumiriya','Deal. You’ll have it tomorrow.','一言为定，明天就给你。'],
 [15.3,18.6,'','The next morning… A sealed love letter, waiting on your desk.','第二天早上……一封封好的情书，正静静躺在你的课桌上。'],
 [18.6,20,'','To my favorite girl.','致我最喜欢的女孩。'],
 [39,43,'You · yesterday','I love sunflowers. Just seeing them makes me happy.','我好喜欢向日葵，光是看着就很开心。'],
 [43,44.35,'','He remembered. Even that little thing.','他记得。连这样的小事也记得。'],
 [45,47.1,'You','Got your letter. I love it.','收到你的信了，好喜欢。'],
 [47.1,49.6,'Fumiriya','Then, may I ask you something a little early?','那……我可以提前问你一件事吗？'],
 [49.6,51,'You','What?','什么？'],
 [51,54,'Fumiriya','Will today’s leading lady be my girlfriend?','今天的女主角，愿意做我的女朋友吗？'],
 [54,56.3,'You','Yes. But I still want a letter tomorrow.','愿意。不过明天我还要一封信。'],
 [56.8,58.6,'Fumiriya','As you wish, my girlfriend.','遵命，我的女朋友。'],
 [63,68.01,'',finalThought,finalThoughtZh],
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
 [17.3,[-33.93,1.86,-24.79],[-33.89,1.315,-25.12]],
 [18.2,[-33.93,1.86,-24.79],[-33.89,1.315,-25.12]],
 [19,[-34.1,1.72,-24.28],[-34.1,2,-30]],
 [22,[-34.1,1.72,-24.28],[-34.1,2,-30]],
 [38.5,[-34.1,1.72,-24.28],[-34.1,2,-30]],
 [41,[-34.1,1.86,-24.28],[-36.68,2.08,-25.55]],
 [42.7,[-34.1,1.86,-24.28],[-36.68,2.08,-25.55]],
 [45,[-34.1,1.72,-24.28],[-34.1,1.3,-25.1]],
 [47.8,[-34.1,1.82,-24.28],[-33.39,1.91,-26.1]],
 [50.5,[-34.1,1.82,-24.28],[-33.39,1.91,-26.1]],
 [53.6,[-34.02,1.84,-24.48],[-33.38,1.96,-26.1]],
 [58.7,[-34.02,1.84,-24.48],[-33.38,1.96,-26.1]],
 [59.4,[-35.5,2.03,-24.8],[-26.271,2.85,-31.15]],
 [64,[-35.5,2.03,-31.65],[-26.271,2.85,-31.15]],
 [68,[-35.5,2.03,-31.65],[-26.271,2.85,-31.15]],
];
const smooth=x=>x*x*(3-2*x);
const ramp=(t,a,b)=>smooth(Math.max(0,Math.min(1,(t-a)/(b-a))));
const pulse=(t,a,b,c,d)=>ramp(t,a,b)*(1-ramp(t,c,d));
export function storyPerformance(t){
 const shy=pulse(t,48.5,49.3,50.1,51.1),gaze=pulse(t,48.25,48.65,50.1,50.65);
 const relief=ramp(t,54.25,55.7),settle=ramp(t,55.6,56.5);
 const blink=[4.2,8.9,12.1,47.65,50.45,54.35,57.9].reduce((v,start)=>Math.max(v,pulse(t,start,start+.09,start+.12,start+.24)),0);
 return {headPitch:shy*.075-relief*.018,headYaw:shy*.055,
  headTilt:relief*.035,pelvisShift:Math.sin(t*.65)*.003,
  eyeYaw:gaze*.095-shy*.03,eyePitch:gaze*.04,blink,
  breath:Math.sin(t*1.55)*.006*(1-relief*.35),relax:relief*.012,
  smile:.02+relief*.08+settle*.025,gesture:pulse(t,51.15,52.2,52.8,54)*.24,
  nod:pulse(t,56.75,57.05,57.2,57.6)*.032};
}
export const voiceCaptions=[
 [19.2,21.2,'Today is day N of liking you.','今天，是喜欢你的第 N 天。'],
 [24.2,28.5,"What I’m best at is always liking you.",'我最擅长的，就是一直喜欢你。'],
 [31,33.4,'Remember saying you love sunflowers?','还记得你说过喜欢向日葵吗？'],
 [33.4,35.4,'They always turn toward the sun.','它们总是朝着太阳。'],
 [35.4,39,'And me? I only want to turn toward you.','而我呢？我只想朝着你。'],
];
export function storyFrame(value){
 const t=Math.max(0,Math.min(STORY_DURATION,Number.isFinite(value)?value:0));
 let i=cameraKeys.findIndex(k=>k[0]>t);if(i<0)i=cameraKeys.length-1;if(i===0)i=1;
 const a=cameraKeys[i-1],b=cameraKeys[i],p=smooth(Math.max(0,Math.min(1,(t-a[0])/(b[0]-a[0]))));
 const mix=(a,b)=>a.map((x,j)=>x+(b[j]-x)*p);
 const message=messages.find(([start,end])=>t>=start&&t<end);
 const spoken=voiceCaptions.find(([start,end])=>t>=start&&t<end);
 const letter=t>=18.6&&t<40;
 const position=mix(a[1],b[1]);
 const envelopeFocus=Math.hypot(position[0]+33.89,position[1]-1.315,position[2]+25.12);
 return {time:t,chapter:Math.min(3,Math.floor(t/15)),position,target:mix(a[2],b[2]),
  speaker:message?.[2]||(spoken?'Fumiriya':''),text:spoken?.[2]||message?.[3]||'',translation:spoken?.[3]||message?.[4]||'',phone:t<14.5||(t>=45&&t<47.8),
  phoneLift:pulse(t,-1,0,13.7,14.5)+pulse(t,44.7,45.4,47.1,47.8),
  focus:letter?.66:t>=15&&t<18.6?envelopeFocus:t>=46.7&&t<59.35?1.85:t>=3.1&&t<14.6?2.05:t>=63?9:5,
  dreamHint:(t>=3.7&&t<6.7)||(t>=47.2&&t<49.1),
  chapterHint:t<3||(t>=15&&t<17)||(t>=30&&t<32)||(t>=45&&t<47),
  portrait: pulse(t,47.1,51,58.7,59.3),
  fov:52-25*pulse(t,47.1,51,58.7,59.3)-23*ramp(t,60,64),
  boyOpacity:pulse(t,3.1,4,13.8,14.6)+pulse(t,46.7,47.8,58.8,59.35),
  dream:(t>=3.1&&t<14.6)||(t>=46.7&&t<59.35),
  transition:t>=14.65&&t<16.2?'The next morning':t>=59&&t<60?'A moment to keep':'',
  letter,back:t>=30,flip:0,
  fade:Math.max(pulse(t,14.55,14.95,15.3,15.9),pulse(t,58.8,59.05,59.5,59.85)),
  envelope:t>=15&&t<19.3,ending:t>=63};
}
