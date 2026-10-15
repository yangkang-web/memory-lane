// Small locally synthesised transition beds; no service calls or downloaded sound packs.
export function createJourneySound(){
 let context,master;const sources=new Set();
 function stop(){for(const node of sources){try{node.stop();}catch{}}sources.clear();}
 return {
  async resume(){if(!context){context=new AudioContext();master=context.createGain();master.gain.value=.3;master.connect(context.destination);}await context.resume();},
  pause(){return context?.suspend();},stop,
  play(kind,seconds){
   if(!context||context.state!=='running')return;stop();const now=context.currentTime;
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
