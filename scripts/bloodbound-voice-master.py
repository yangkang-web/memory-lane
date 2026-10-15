#!/usr/bin/env python3
"""Normalize cached speech and retain measurable, non-subjective QA evidence."""

import hashlib
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import sys

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
PRIVATE = ROOT / '.local/bloodbound-voice'
OUT = ROOT / 'public/assets/bloodbound/audio'
sys.path.insert(0, str(PRIVATE/'deps'))
import imageio_ffmpeg
from mutagen.mp3 import MP3

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


def run(*args):
    return subprocess.run([FFMPEG, '-hide_banner', '-nostdin', *args], capture_output=True, check=True)


def loudness(path):
    result = run('-i', str(path), '-af', 'loudnorm=I=-20:TP=-2:LRA=7:print_format=json', '-f', 'null', '-')
    blocks = re.findall(r'\{[^{}]+\}', result.stderr.decode())
    return json.loads(blocks[-1])


def process(raw, target):
    before = loudness(raw)
    values = {'measured_I': before['input_i'], 'measured_TP': before['input_tp'], 'measured_LRA': before['input_lra'], 'measured_thresh': before['input_thresh'], 'offset': before['target_offset']}
    settings = 'loudnorm=I=-20:TP=-2:LRA=7:linear=true:' + ':'.join(key+'='+value for key,value in values.items())
    run('-v','error','-y','-i',str(raw),'-af',settings,'-ar','44100','-ac','1','-codec:a','libmp3lame','-b:a','128k',str(target))
    after = loudness(target)
    pcm = run('-v','error','-i',str(target),'-f','f32le','-ar','44100','-ac','1','-').stdout
    samples = np.frombuffer(pcm,dtype='<f4')
    measured_peak = float(np.max(np.abs(samples)))
    frames = samples[:len(samples)//441*441].reshape(-1,441)
    rms = np.sqrt(np.mean(frames**2,axis=1))
    voiced = np.flatnonzero(rms > 10**(-42/20))
    result = {
        'file': str(target.relative_to(OUT)), 'duration': round(MP3(target).info.length,3),
        'decodedDuration': round(len(samples)/44100,3),
        'beforeIntegratedLUFS': float(before['input_i']), 'integratedLUFS': float(after['input_i']),
        'truePeakDBTP': float(after['input_tp']),
        'peakDbFS': round(20*np.log10(max(measured_peak,1e-9)),3),
        'clippedSamples': int(np.count_nonzero(np.abs(samples)>=1)),
        'leadingBelowMinus42dBSeconds': round(float(voiced[0])*.01,3) if len(voiced) else None,
        'trailingBelowMinus42dBSeconds': round(float(len(frames)-1-voiced[-1])*.01,3) if len(voiced) else None,
        'bytes': target.stat().st_size,
        'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
        'rawSha256': hashlib.sha256(raw.read_bytes()).hexdigest(),
    }
    if result['clippedSamples'] or not len(voiced):
        raise RuntimeError('Speech failed no-clipping/non-silent check: '+target.name)
    return result


def main():
    rows=[]
    for raw in sorted((PRIVATE/'raw').rglob('*.mp3')):
        target=OUT/raw.relative_to(PRIVATE/'raw')
        target.parent.mkdir(parents=True,exist_ok=True)
        rows.append(process(raw,target))
    manifest=json.loads((OUT/'manifest.json').read_text())
    for line in manifest['lines']:
        row=next((item for item in rows if item['file']==line['id']+'.mp3'),None)
        if row:
            line.update(file=row['file'],duration=row['duration'],audioQuality=row)
            line['cue']['duration']=row['duration']
    manifest['quality']['speechMastering']='Two-pass EBU R128 loudness normalization, -20 LUFS target, -2 dBTP ceiling; all rendered MP3 decoded and measured.'
    manifest['quality']['speechChecks']='All speech files have non-silent samples and zero clipping. This does not verify pronunciation, emotion, or exact spoken transcript.'
    (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    candidates=json.loads((OUT/'candidates.json').read_text())
    for candidate in candidates['candidates']:
        row=next(item for item in rows if item['file']==candidate['file'])
        candidate.update(duration=row['duration'],audioQuality=row,bytes=row['bytes'],sha256=row['sha256'])
    (OUT/'candidates.json').write_text(json.dumps(candidates,ensure_ascii=False,indent=2)+'\n')
    report={'model':'elevenlabs/eleven_v4','normalization':{'targetIntegratedLUFS':-20,'maxTruePeakDBTP':-2},'files':rows,'subjectiveListening':'not completed; audio input unsupported by this review model','transcriptVerification':'source text is exact; audio speech recognition not performed'}
    (OUT/'voice-quality.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps([{'file':r['file'],'duration':r['duration'],'LUFS':r['integratedLUFS'],'peak':r['peakDbFS'],'clipped':r['clippedSamples']} for r in rows],ensure_ascii=False))


if __name__=='__main__':
    main()
