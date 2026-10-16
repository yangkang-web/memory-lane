"""Build the short school cut; retain original speech pitch and a continuous music bed."""
import array
import json
import math
import sys
import wave
from pathlib import Path
root=Path(__file__).resolve().parents[1]
def read(name):
    with wave.open(str(root/'public/assets/voices'/name),'rb') as source:
        assert (source.getnchannels(),source.getsampwidth(),source.getframerate())==(1,2,24000)
        samples=array.array('h',source.readframes(source.getnframes()))
        if sys.byteorder!='little': samples.byteswap()
        return samples
voice=read('sunflower-story-en.wav');mix=read('sunflower-story-mix.wav');rate=24000
edits=json.loads((root/'src/data/school-short-edit.json').read_text())
out=array.array('h');duration=sum(e['seconds'] for e in edits)
for edit in edits:
    count=round(edit['seconds']*rate);source_count=round((edit['to']-edit['from'])*rate)
    if abs(source_count-count)>1:
        # Accelerated intervals must be silent: never speed up or crop a spoken line.
        assert max(abs(v) for v in voice[round(edit['from']*rate):round(edit['to']*rate)])<200
    for i in range(count):
        source_index=round(edit['from']*rate)+min(source_count-1,round(i*source_count/count))
        speech=voice[source_index] if source_index<len(voice) else 0
        edge=min(1,i/(rate*.008),(count-1-i)/(rate*.008))
        t=len(out)/rate;bed_index=round((19.2+t)*rate)
        bed=mix[bed_index]-(voice[bed_index] if bed_index<len(voice) else 0)
        fade=max(0,min(1,t/.3,(duration-t)/1.2))
        out.append(round(max(-32767,min(32767,speech*edge+bed*fade))))
if sys.byteorder!='little':out.byteswap()
with wave.open(str(root/'public/assets/voices/sunflower-story-short.wav'),'wb') as target:
    target.setparams((1,2,rate,0,'NONE','not compressed'));target.writeframes(out.tobytes())
print(f'Short reading and ending: {duration:.2f}s')
