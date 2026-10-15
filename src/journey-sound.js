// Small locally synthesised transition beds; no service calls or downloaded sound packs.
export function createJourneySound(){
 let context,master;const sources=new Set();
 function voice(type,frequency,peak,from,top,to,filterAt=0){
  const tone=context.createOscillator(),amp=context.createGain();tone.type=type;tone.frequency.value=frequency;let out=tone;
  if(filterAt){const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=filterAt;out=tone.connect(filter);}
  amp.gain.setValueAtTime(.0001,from);amp.gain.exponentialRampToValueAtTime(peak,top);amp.gain.exponentialRampToValueAtTime(.0001,to);
  out.connect(amp).connect(master);tone.start(from);tone.stop(to+.05);sources.add(tone);tone.onended=()=>{sources.delete(tone);tone.disconnect();amp.disconnect();};
 }
 // Through the doors: a low swell under the light as it grows, the air of it, and a soft open chord as the next world
 // comes up out of it.
 function door(now,seconds){
  const end=now+seconds;
  voice('sine',55,.16,now,now+seconds*.42,end);voice('sine',82.4,.06,now+.2,now+seconds*.45,end);
  const count=Math.ceil(context.sampleRate*seconds),buffer=context.createBuffer(1,count,context.sampleRate),data=buffer.getChannelData(0);
  let low=0;for(let i=0;i<count;i++){low+=((Math.random()*2-1)-low)*.12;data[i]=low;}
  const air=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();air.buffer=buffer;filter.type='bandpass';filter.Q.value=.5;
  filter.frequency.setValueAtTime(320,now);filter.frequency.exponentialRampToValueAtTime(1500,now+seconds*.45);filter.frequency.exponentialRampToValueAtTime(500,end);
  gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.3,now+seconds*.42);gain.gain.exponentialRampToValueAtTime(.0001,end);
  air.connect(filter).connect(gain).connect(master);air.start(now);air.stop(end);sources.add(air);air.onended=()=>{sources.delete(air);air.disconnect();filter.disconnect();gain.disconnect();};
  // D, F♯, A and E above: open, unresolved, warm.
  for(const [i,frequency] of [146.83,220,293.66,369.99,659.25].entries())voice('triangle',frequency*(1+(i%2?.0015:-.0012)),i<2?.05:.035,now+seconds*.3+i*.06,now+seconds*.62,end,1600);
 }
 function stop(){for(const node of sources){try{node.stop();}catch{}}sources.clear();}
 return {
  async resume(){if(!context){context=new AudioContext();master=context.createGain();master.gain.value=.3;master.connect(context.destination);}await context.resume();},
  pause(){return context?.suspend();},stop,
  play(kind,seconds){
   if(!context||context.state!=='running')return;stop();const now=context.currentTime;
   if(kind==='door')return door(now,seconds);
   const duration=Math.min(seconds,5.1),count=Math.ceil(context.sampleRate*duration),buffer=context.createBuffer(1,count,context.sampleRate),data=buffer.getChannelData(0);
   let low=0;for(let i=0;i<count;i++){low+=((Math.random()*2-1)-low)*.18;data[i]=low;}
   const noise=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();noise.buffer=buffer;filter.type='bandpass';filter.Q.value=.65;
   filter.frequency.setValueAtTime(kind==='ink'?180:450,now);filter.frequency.exponentialRampToValueAtTime(kind==='ash'?140:2100,now+duration*.55);filter.frequency.exponentialRampToValueAtTime(90,now+duration);
   gain.gain.setValueAtTime(.001,now);gain.gain.exponentialRampToValueAtTime(kind==='ash'?.13:.55,now+duration*.45);gain.gain.exponentialRampToValueAtTime(.001,now+duration);
   noise.connect(filter).connect(gain).connect(master);noise.start(now);noise.stop(now+duration);sources.add(noise);noise.onended=()=>{sources.delete(noise);noise.disconnect();filter.disconnect();gain.disconnect();};
   if(kind!=='ash')for(const frequency of [48,kind==='rift'?520:220]){
    const tone=context.createOscillator(),amp=context.createGain();tone.frequency.setValueAtTime(frequency,now);tone.frequency.exponentialRampToValueAtTime(frequency*.55,now+duration);
    amp.gain.setValueAtTime(.001,now);amp.gain.exponentialRampToValueAtTime(frequency<100?.10:.025,now+duration*.3);amp.gain.exponentialRampToValueAtTime(.001,now+duration);
    tone.connect(amp).connect(master);tone.start(now);tone.stop(now+duration);sources.add(tone);tone.onended=()=>{sources.delete(tone);tone.disconnect();amp.disconnect();};
   }
  },dispose(){stop();context?.close();}
 };
}
