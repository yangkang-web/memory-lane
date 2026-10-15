"""Reproducible, original sound bed. No downloads or additional voice generation.

Uses only Python's standard library; keeps the supplied Puck recording untouched.
One 68-second mix gives speech, score and foley a single seek/pause/mute clock.
"""
import array
import math
import random
import sys
import wave
from pathlib import Path

root = Path(__file__).resolve().parent.parent
rate = 24000
duration = 68
track = array.array('f', [0]) * (duration * rate)
rng = random.Random(4108)


def note(start, frequency, length, volume):
    for i in range(int(length * rate)):
        t = i / rate
        envelope = min(1, t / .018) * math.exp(-t / 1.25) * min(1, (length - t) / .25)
        # Soft felt-key timbre, with quiet overtones rather than a pure test tone.
        value = sum(amplitude * math.sin(2 * math.pi * frequency * harmonic * t)
                    for harmonic, amplitude in [(1, 1), (2, .22), (3, .06)])
        j = round(start * rate) + i
        if j < len(track):
            track[j] += volume * envelope * value


# An original sparse C–G–Am–F arpeggio. Leave space around the spoken lines.
for bar in range(8):
    chord = [(130.81, 196, 261.63, 329.63), (98, 196, 246.94, 293.66),
             (110, 164.81, 220, 261.63), (87.31, 174.61, 220, 261.63)][bar % 4]
    for beat, frequency in enumerate(chord):
        note(bar * 8 + beat * 1.25 + .25, frequency, 5, .012 if beat else .015)
note(63.4, 261.63, 4.5, .016)
note(64.1, 329.63, 3.8, .009)
note(64.8, 392, 3.1, .009)

# Filtered outdoor air: low amplitude and no abrupt looping seam.
air = 0
for i in range(len(track)):
    air = air * .985 + rng.uniform(-1, 1) * .015
    track[i] += air * .018 * (.75 + .25 * math.sin(i / rate * .4))

# Distant birds, never on top of the confession.
for start in [1.1, 14, 16.5, 28.5, 40.5, 42.6, 61, 65]:
    for j in range(2):
        for i in range(int(.16 * rate)):
            t = i / rate
            value = math.sin(2 * math.pi * (1800 * t + 1900 * t * t))
            track[int((start + j * .23) * rate) + i] += value * math.sin(math.pi * t / .16) ** 2 * .006

# Paper lift / turn and quiet message arrivals.
for start, length in [(18.65, .5), (29.8, .65), (39.4, .4), (63, .5)]:
    for i in range(int(length * rate)):
        t = i / rate
        track[int(start * rate) + i] += rng.uniform(-1, 1) * math.sin(math.pi * t / length) ** 2 * .011
for start in [3.05, 11.8, 46.85]:
    note(start, 659.25, .24, .009)
    note(start + .1, 783.99, .3, .006)

with wave.open(str(root / 'public/assets/voices/sunflower-story-en.wav'), 'rb') as source:
    assert (source.getframerate(), source.getsampwidth(), source.getnchannels()) == (rate, 2, 1)
    voice = array.array('h', source.readframes(source.getnframes()))
    if sys.byteorder != 'little':
        voice.byteswap()

for i in range(len(track)):
    # Fade only the sound bed; preserve every original voice sample and its timing.
    t = i / rate
    fade = min(1, t / 1.5, (duration - t) / 3)
    track[i] = track[i] * max(0, fade) + (voice[i] / 32768 if i < len(voice) else 0)
assert max(abs(value) for value in track) < .99
pcm = array.array('h', (round(max(-1, min(1, value)) * 32767) for value in track))
if sys.byteorder != 'little':
    pcm.byteswap()
destination = root / 'public/assets/voices/sunflower-story-mix.wav'
with wave.open(str(destination), 'wb') as output:
    output.setparams((1, 2, rate, 0, 'NONE', 'not compressed'))
    output.writeframes(pcm.tobytes())
print(f'{destination.name}: {duration}s, original voice + original ambient score and foley')
