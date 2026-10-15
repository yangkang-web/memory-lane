"""Generate the English greeting offline with kokoro-onnx 0.6.1.

Requires numpy, soundfile, onnx and the official Kokoro v1.0 fp16 model plus
voices-v1.0.bin. Only the generated WAV and cue JSON ship with the website.
Example: python scripts/generate-student-voice.py --model /path/model.onnx
         --voices /path/voices-v1.0.bin
"""
import argparse
import hashlib
import json
import tempfile
from pathlib import Path
import numpy as np
import onnx
import soundfile as sf
from kokoro_onnx import Kokoro

parser = argparse.ArgumentParser()
parser.add_argument('--model', required=True)
parser.add_argument('--voices', required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
text = 'Good morning. The breeze feels nice today. Want to walk to class together?'
voice = 'am_puck'
speed = 0.96
model = onnx.load(args.model)
# Older official exports expose audio only. Also expose their existing rounded
# phoneme-duration tensor, so cues use actual model timing, not guessed syllables.
if 'duration' not in [o.name for o in model.graph.output]:
    round_outputs = {out for n in model.graph.node if n.op_type == 'Round' for out in n.output}
    candidates = [n for n in model.graph.node if n.op_type == 'Clip' and n.input[0] in round_outputs]
    if len(candidates) != 1:
        raise RuntimeError('Cannot identify a unique model duration tensor.')
    duration_name = candidates[0].output[0]
    value = next(v for v in model.graph.value_info if v.name == duration_name)
    model.graph.node.append(onnx.helper.make_node('Identity', [duration_name], ['duration']))
    output = onnx.ValueInfoProto()
    output.CopyFrom(value)
    output.name = 'duration'
    model.graph.output.append(output)
with tempfile.TemporaryDirectory(prefix='campus-english-voice-') as temporary:
    timed_model = Path(temporary) / 'timed.onnx'
    onnx.save(model, timed_model)
    synth = Kokoro(str(timed_model), args.voices)
    audio, rate, timings = synth.create_timed(text, voice=voice, speed=speed, lang='en-us')
assert timings, 'The English audio must have matching phoneme timings.'
# Gentle level with headroom, preserving the generated intonation and pitch.
audio = np.asarray(audio, dtype=np.float32)
audio *= min(1, .8 / max(float(np.max(np.abs(audio))), .0001))
shapes = {**dict.fromkeys('ɑɐæʌa', 'aa'), **dict.fromkeys('iɪ', 'ih'),
          **dict.fromkeys('uʊ', 'ou'), **dict.fromkeys('ɛeəɜɚ', 'ee'),
          **dict.fromkeys('ɔo', 'oh')}
cues = [{'start': round(t.start, 5), 'end': round(t.end, 5), 'shape': shapes[t.phoneme]}
        for t in timings if t.phoneme in shapes and t.end > t.start]
path = root / 'public/assets/voices/fumiriya-greeting-en.wav'
path.parent.mkdir(parents=True, exist_ok=True)
sf.write(path, audio, rate, subtype='PCM_16')
metadata = {'text': text, 'language': 'en-US', 'languageLabel': 'English',
            'credit': 'Kokoro · Puck', 'voice': voice, 'speed': speed,
            'duration': len(audio) / rate,
            'modelSha256': hashlib.sha256(Path(args.model).read_bytes()).hexdigest(), 'cues': cues}
(root / 'src/data/fumiriya-voice.json').write_text(json.dumps(metadata, indent=2) + '\n')
print(f'Generated {len(audio)/rate:.2f}s of English speech with {len(cues)} timed vowel cues.')
