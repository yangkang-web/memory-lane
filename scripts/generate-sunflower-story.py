"""Offline English story track, using the same Kokoro Puck voice as the greeting."""
import argparse, json, tempfile, hashlib
from pathlib import Path
import numpy as np
import onnx
import soundfile as sf
from kokoro_onnx import Kokoro
p=argparse.ArgumentParser();p.add_argument('--model',required=True);p.add_argument('--voices',required=True);args=p.parse_args()
root=Path(__file__).resolve().parents[1]
lines=[
 ('promise',3.3,"I'd write you a love letter every day, until you said yes to being my girlfriend."),
 ('tomorrow',12.0,"Deal. You'll have it tomorrow."),
 ('letter',19.2,"Today is day N of liking you. If you haven't said yes, I'll try a little harder tomorrow. What I'm best at is always liking you."),
 ('secret',31.0,"Remember saying you love sunflowers? They always turn toward the sun. And me? I only want to turn toward you."),
 ('ask',47.1,"Then, may I ask you something a little early?"),
 ('confession',51.0,"Will today's leading lady be my girlfriend?"),
 ('yes',56.8,"As you wish, my girlfriend."),
]
model=onnx.load(args.model)
if 'duration' not in [o.name for o in model.graph.output]:
 rounded={out for n in model.graph.node if n.op_type=='Round' for out in n.output}
 candidates=[n for n in model.graph.node if n.op_type=='Clip' and n.input[0] in rounded]
 assert len(candidates)==1
 name=candidates[0].output[0];value=next(v for v in model.graph.value_info if v.name==name)
 model.graph.node.append(onnx.helper.make_node('Identity',[name],['duration']))
 output=onnx.ValueInfoProto();output.CopyFrom(value);output.name='duration';model.graph.output.append(output)
shapes={**dict.fromkeys('ɑɐæʌa','aa'),**dict.fromkeys('iɪ','ih'),**dict.fromkeys('uʊ','ou'),**dict.fromkeys('ɛeəɜɚ','ee'),**dict.fromkeys('ɔo','oh')}
track=np.zeros(60*24000,dtype=np.float32);metadata=[];cues=[]
with tempfile.TemporaryDirectory(prefix='sunflower-voice-') as d:
 path=Path(d)/'timed.onnx';onnx.save(model,path);synth=Kokoro(str(path),args.voices)
 for i,(key,start,text) in enumerate(lines):
  audio,rate,timings=synth.create_timed(text,voice='am_puck',speed=.96,lang='en-us')
  assert rate==24000 and timings
  audio=np.asarray(audio,dtype=np.float32);audio*=min(1,.8/max(float(np.max(np.abs(audio))),.0001))
  duration=len(audio)/rate
  assert start+duration < (lines[i+1][1] if i+1<len(lines) else 60), (key,duration)
  offset=round(start*rate);track[offset:offset+len(audio)]+=audio
  metadata.append({'id':key,'start':start,'end':round(start+duration,5),'text':text})
  cues.extend({'start':round(start+t.start,5),'end':round(start+t.end,5),'shape':shapes[t.phoneme]} for t in timings if t.phoneme in shapes and t.end>t.start)
  print(key,round(duration,2),flush=True)
out=root/'public/assets/voices/sunflower-story-en.wav';sf.write(out,track,24000,subtype='PCM_16')
(root/'src/data/sunflower-voice.json').write_text(json.dumps({'duration':60,'language':'en-US','voice':'am_puck','speed':.96,'modelSha256':hashlib.sha256(Path(args.model).read_bytes()).hexdigest(),'lines':metadata,'cues':cues},indent=2)+'\n')
