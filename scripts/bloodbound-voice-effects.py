#!/usr/bin/env python3
"""Build small, cached sound layers from CC0 foley and original synthesis."""

import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import wave

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
PRIVATE = ROOT / '.local/bloodbound-voice'
OUT = ROOT / 'public/assets/bloodbound/audio'
sys.path.insert(0, str(PRIVATE / 'deps'))
import imageio_ffmpeg
from mutagen.mp3 import MP3

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
SR = 44100
RNG = np.random.default_rng(14102026)


def noise(seconds, low=80, high=3000):
    count = round(seconds * SR)
    bins = np.fft.rfftfreq(count, 1 / SR)
    shape = np.exp(-((bins / high) ** 3)) * (1 - np.exp(-((bins / low) ** 3)))
    spectrum = np.fft.rfft(RNG.normal(0, 1, count)) * shape
    values = np.fft.irfft(spectrum, n=count)
    return values / max(np.std(values), 0.0001)


def fade(values, attack=0.012, release=0.06):
    result = values.copy()
    a = min(round(attack * SR), len(values))
    b = min(round(release * SR), len(values))
    result[:a] *= np.linspace(0, 1, a)[:, None] if result.ndim == 2 else np.linspace(0, 1, a)
    result[-b:] *= np.linspace(1, 0, b)[:, None] if result.ndim == 2 else np.linspace(1, 0, b)
    return result


def load(pack, name, speed=1):
    path = PRIVATE / 'kenney' / pack / 'Audio' / name
    raw = subprocess.check_output([FFMPEG, '-v', 'error', '-i', str(path), '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'])
    sound = np.frombuffer(raw, dtype='<f4').astype(float)
    if speed != 1:
        sound = np.interp(np.arange(0, len(sound), speed), np.arange(len(sound)), sound)
    return sound


def mix(seconds, layers):
    output = np.zeros(round(seconds * SR))
    for start, sound, gain in layers:
        index = round(start * SR)
        length = min(len(sound), len(output)-index)
        if length > 0:
            output[index:index+length] += sound[:length] * gain
    return output


def room(mono, tail=0.7, amount=0.22):
    padded = np.pad(mono, (0, round(tail * SR)))
    stereo = np.column_stack([padded, padded])
    for channel in range(2):
        for index, delay in enumerate([0.043, 0.079, 0.127, 0.193, 0.281, 0.419, 0.613]):
            shift = round((delay + channel * 0.007) * SR)
            if shift < len(stereo):
                stereo[shift:, channel] += padded[:-shift] * amount * (0.74 ** index)
    return fade(stereo)


def write(name, samples, peak_db, info):
    samples = np.nan_to_num(samples)
    samples -= np.mean(samples, axis=0)
    samples *= (10 ** (peak_db/20)) / max(np.max(np.abs(samples)), 1e-9)
    temporary = PRIVATE / (name + '.wav')
    target = OUT / (name + '.mp3')
    with wave.open(str(temporary), 'wb') as handle:
        handle.setnchannels(2 if samples.ndim == 2 else 1)
        handle.setsampwidth(2)
        handle.setframerate(SR)
        handle.writeframes((np.clip(samples, -1, 1) * 32767).astype('<i2').tobytes())
    subprocess.run([FFMPEG, '-v', 'error', '-y', '-i', str(temporary), '-codec:a', 'libmp3lame', '-b:a', '128k', '-write_xing', '1', str(target)], check=True)
    decoded = subprocess.check_output([FFMPEG, '-v', 'error', '-i', str(target), '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'])
    values = np.frombuffer(decoded, dtype='<f4')
    temporary.unlink()
    return dict(info, id=name, file=target.name, duration=round(MP3(target).info.length, 3), bytes=target.stat().st_size,
                peakDbFS=round(float(20*np.log10(max(np.max(np.abs(values)), 1e-9))), 2),
                rmsDbFS=round(float(20*np.log10(max(np.sqrt(np.mean(values**2)), 1e-9))), 2),
                clippedSamples=int(np.count_nonzero(np.abs(values) >= 1)), sha256=hashlib.sha256(target.read_bytes()).hexdigest())


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    effects = []
    seconds = 24
    t = np.arange(seconds * SR) / SR
    air = noise(seconds, 100, 2200) * (0.45 + 0.12*np.sin(2*np.pi*t/12))
    low = noise(seconds, 28, 210) * 0.25
    drone = sum(np.sin(2*np.pi*f*t + index*0.63) * gain for index, (f, gain) in enumerate([(73.4166667, .18), (110, .055), (146.8333333, .038)]))
    bed = fade(air * .12 + low * .19 + drone, 1.8, 1.8)
    ambience = [write('chapel-air', np.column_stack([bed, np.roll(bed, 617)]), -17, {'title': '教堂冷风与低声氛围', 'loop': True, 'gain': 0.4, 'duckDuringSpeech': 0.45, 'provenance': 'Original filtered-noise / sine synthesis; seamless loop should crossfade by 1.8 seconds.'})]

    feet = [(i*.74, load('impact', f'footstep_concrete_00{i}.ogg'), .85 + i*.05) for i in range(4)]
    effects.append(write('hunter-footsteps', room(mix(3.2, feet), amount=.21), -10, {'title': '猎人靠近的石地脚步', 'gain': .5, 'sourceFiles': ['Kenney Impact Sounds: footstep_concrete_000–003.ogg']}))
    effects.append(write('silver-blade', room(load('rpg', 'drawKnife2.ogg', .9), amount=.16), -11, {'title': '银刃抽出', 'gain': .5, 'sourceFiles': ['Kenney RPG Audio: drawKnife2.ogg']}))
    t = np.arange(round(.55*SR))/SR
    whoosh = noise(.55, 180, 5200) * np.sin(np.pi*t/.55)**1.7 * .23
    whoosh += np.sin(2*np.pi*(180*t-110*t*t)) * np.sin(np.pi*t/.55)**2 * .07
    effects.append(write('rescue-whoosh', room(whoosh, amount=.13), -11, {'title': '瞬移风切', 'gain': .45, 'provenance': 'Original filtered-noise sweep.'}))
    blade = mix(1.15, [(0, load('impact', 'impactMetal_medium_001.ogg', .85), .75), (.012, load('rpg', 'knifeSlice.ogg'), .26)])
    effects.append(write('blade-block', room(blade, amount=.22), -8, {'title': '挡住银刃', 'gain': .5, 'sourceFiles': ['Kenney Impact Sounds: impactMetal_medium_001.ogg', 'Kenney RPG Audio: knifeSlice.ogg']}))
    t = np.arange(round(1.1*SR))/SR
    thump = (np.sin(2*np.pi*(58*t-10*t*t)) + noise(1.1, 35, 140)*.22)*np.exp(-7*t)
    layers = [(0, load('impact', 'impactMining_000.ogg', .78), .7), (0, fade(thump, .004, .1), .42)]
    for i, when in enumerate([.12, .23, .38, .59, .87, 1.16, 1.5]):
        layers.append((when, load('impact', f'impactMining_00{i%5}.ogg', .85+i*.07), .19/(1+i*.35)))
    effects.append(write('pillar-impact', room(mix(2.3, layers), tail=1, amount=.3), -6, {'title': '石柱撞击与碎石尾音', 'gain': .5, 'sourceFiles': ['Kenney Impact Sounds: impactMining_000–004.ogg'], 'provenance': 'Layered CC0 foley with original low impact; no explosion.'}))
    falling = mix(1.25, [(0, load('impact', 'impactMetal_light_001.ogg'), .7), (.22, load('impact', 'impactMetal_light_002.ogg'), .35), (.54, load('rpg', 'metalClick.ogg'), .13)])
    effects.append(write('blade-fall', room(falling, amount=.25), -11, {'title': '银刃落地回响', 'gain': .4, 'sourceFiles': ['Kenney Impact Sounds: impactMetal_light_001/002.ogg', 'Kenney RPG Audio: metalClick.ogg']}))
    t = np.arange(round(.34*SR))/SR
    beat = fade(np.sin(2*np.pi*(62*t-23*t*t))*np.exp(-17*t), .01, .04)
    pulse = mix(4.2, [(start, beat, gain) for start, gain in [(0,.9),(.23,.55),(1.3,.9),(1.53,.55),(2.6,.9),(2.83,.55)]])
    effects.append(write('heartbeat', room(pulse, tail=.25, amount=.055), -16, {'title': '近距离心跳', 'gain': .35, 'provenance': 'Original two-pulse sine synthesis; three beats.'}))
    t = np.arange(round(3.8*SR))/SR
    crystal = sum(np.sin(2*np.pi*f*t + i*.4)*np.exp(-(1.1+i*.17)*t)*g for i,(f,g) in enumerate([(587.33,.3),(880,.12),(1174.66,.08),(1760,.035),(2349.32,.016)]))
    crystal = fade(crystal, .07, .4)
    effects.append(write('crystal-bloom', room(crystal, tail=.9, amount=.18), -14, {'title': '血滴凝成心形水晶', 'gain': .35, 'provenance': 'Original restrained harmonic chime; no stock magic flourish.'}))
    touch = mix(1.45, [(0, load('rpg', 'cloth2.ogg'), .55), (.42, load('rpg', 'metalClick.ogg'), .11)])
    effects.append(write('necklace-touch', room(touch, amount=.075), -16, {'title': '衣料与项链轻响', 'gain': .4, 'sourceFiles': ['Kenney RPG Audio: cloth2.ogg, metalClick.ogg']}))
    data = {'schemaVersion': 1, 'ambience': ambience, 'effects': effects, 'sources': [
        {'type': 'foley', 'name': 'Kenney — Impact Sounds', 'url': 'https://kenney.nl/assets/impact-sounds', 'license': 'CC0-1.0', 'licenseFile': 'licenses/kenney-impact.txt'},
        {'type': 'foley', 'name': 'Kenney — RPG Audio', 'url': 'https://kenney.nl/assets/rpg-audio', 'license': 'CC0-1.0', 'licenseFile': 'licenses/kenney-rpg.txt'},
        {'type': 'original-synthesis', 'script': 'scripts/bloodbound-voice-effects.py', 'note': 'Original procedural wind, low tone, whoosh, heart pulse and crystal harmonics. Lightweight NumPy, no AI inference.'},
    ], 'verification': {'decode': 'all MP3 files fully decoded with FFmpeg 7.1', 'subjectiveListening': 'not completed; current reviewer tool cannot expose audio perception'}}
    (OUT/'effects-manifest.json').write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n')
    (OUT/'licenses').mkdir(exist_ok=True)
    for pack in ['impact','rpg']:
        shutil.copyfile(PRIVATE/'kenney'/pack/'License.txt',OUT/'licenses'/f'kenney-{pack}.txt')
    print(json.dumps([{'id':row['id'],'duration':row['duration'],'peakDbFS':row['peakDbFS'],'clippedSamples':row['clippedSamples']} for row in ambience+effects], ensure_ascii=False))


if __name__ == '__main__':
    main()
