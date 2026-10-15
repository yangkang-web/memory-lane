// Offline speech assets: installed macOS voices, no API or network requests.
import { DIALOGUE } from '../../src/last-companion-timeline.js';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const require=createRequire(import.meta.url),ffmpeg=require('@ffmpeg-installer/ffmpeg').path;
const directory=new URL('../../public/assets/story/voice/',import.meta.url);mkdirSync(directory,{recursive:true});
for(let i=0;i<DIALOGUE.length;i++){
  const line=DIALOGUE[i],temp=join(tmpdir(),`memory-lane-voice-${process.pid}-${i}.aiff`),out=new URL(`${String(i).padStart(2,'0')}.wav`,directory);
  execFileSync('say',['-v',line[2]==='我'?'Eddy (中文（中国大陆）)':'Tingting','-r','210','-o',temp,line[3]]);
  execFileSync(ffmpeg,['-y','-loglevel','error','-i',temp,'-ac','1','-ar','24000',out.pathname]);rmSync(temp);
  if(statSync(out).size<1000)throw new Error(`Empty speech output for line ${i}: macOS speech service must be accessible.`);
  console.log(`${i+1}/${DIALOGUE.length} ${line[3]}`);
}
writeFileSync(new URL('sources.json',directory),JSON.stringify({source:'Offline macOS speech synthesis',voices:['Tingting','Eddy (中文（中国大陆）)'],text:'User-authored fictional story: 回忆之路：最后一次并肩',generatedWith:'scripts/art/synthesize-story.mjs',lines:DIALOGUE.map((l,i)=>({file:`${String(i).padStart(2,'0')}.wav`,speaker:l[2],text:l[3],start:l[0],end:l[1]}))},null,2));
