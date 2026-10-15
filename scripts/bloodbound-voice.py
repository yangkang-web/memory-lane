#!/usr/bin/env python3
"""Prepare Bloodbound dialogue through the authorized Kaon speech route."""

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sys
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets/bloodbound/audio'
PRIVATE = ROOT / '.local/bloodbound-voice'
sys.path.insert(0, str(PRIVATE / 'deps'))
ENDPOINT = 'https://kaon-router.kaonai.com/v1/audio/speech'
LAST_REQUEST = 0

VOICES = {
    'charlie': {'id': 'IKne3meq5aSn9XLyUdCD', 'name': 'Charlie', 'role': 'lucien', 'description': 'Young, deep, confident; Australian English'},
    'eric': {'id': 'cjVigY5qzO86Huf0OWal', 'name': 'Eric', 'role': 'lucien', 'description': 'Smooth, warm; American English'},
    'harry': {'id': 'SOYHLrjzK2X1ezoPC6cr', 'name': 'Harry', 'role': 'hunter', 'description': 'Young, rough warrior; American English'},
    'adam': {'id': 'pNInz6obpgDQGcFmaJgB', 'name': 'Adam', 'role': 'hunter', 'description': 'Dominant, firm; American English'},
}

LINES = [
    {'id': 'hunter-warning', 'speaker': 'hunter', 'text': "He won't make it in time.", 'translation': '他来不及救你了。', 'direction': '[coldly]', 'phase': 'danger', 'offset': 3.2},
    {'id': 'lucien-warning', 'speaker': 'lucien', 'text': "Don't. Touch. Her.", 'translation': '别。碰。她。', 'direction': '[restrained anger]', 'phase': 'rescue', 'offset': 1.2},
    {'id': 'bleeding', 'speaker': 'lucien', 'text': "You're bleeding...", 'translation': '你流血了……', 'direction': '[whispers]', 'phase': 'intimacy', 'offset': 0.8},
    {'id': 'every-drop', 'speaker': 'lucien', 'text': 'I can hear it. Every drop.', 'translation': '我听得见。每一滴。', 'direction': '[whispers]', 'phase': 'intimacy', 'offset': 6.0},
    {'id': 'lose-control', 'speaker': 'lucien', 'text': 'Even if I lose control of everything else...', 'translation': '即使我失去对一切的控制……', 'direction': '[softly]', 'phase': 'gift', 'offset': 0.5},
    {'id': 'protect', 'speaker': 'lucien', 'text': "I'll never let anyone hurt you again.", 'translation': '我也绝不会再让任何人伤害你。', 'direction': '[softly, resolute]', 'phase': 'gift', 'offset': 5.8},
    {'id': 'not-me', 'speaker': 'lucien', 'text': 'Not even me.', 'translation': '哪怕那个人是我。', 'direction': '[whispers]', 'phase': 'gift', 'offset': 11.0},
]

SOURCES = [
    {'type': 'dialogue', 'url': 'https://claude.ai/artifact/8787e8Bv8pouUkDoYUafxt#7b7708cb-e89e.mep3ebf446m.1335', 'note': 'Online 60-second document, seven original lines verified by the primary agent on 2026-10-15. The downloaded 30-second PDF is an older five-line revision.'},
    {'type': 'api', 'url': 'https://kaon-router-admin.kaonai.com/models', 'note': 'Live ElevenLabs v4 route schema inspected 2026-10-15; speech is binary response; no v4 speed/style fields.'},
    {'type': 'voice-catalog', 'url': 'https://api.elevenlabs.io/v1/voices', 'note': 'Public official catalog read without credentials on 2026-10-15. Labels guide candidate casting; they do not establish subjective listening quality.'},
    {'type': 'provider-documentation', 'url': 'https://github.com/elevenlabs/skills/blob/main/text-to-speech/SKILL.md', 'note': 'Official model/voice settings reference; actual requests use Kaon only.'},
]


def duration(path):
    from mutagen.mp3 import MP3
    return round(MP3(path).info.length, 3)


def speech(key, payload, target):
    global LAST_REQUEST
    time.sleep(max(0, 6.5 - (time.monotonic() - LAST_REQUEST)))
    LAST_REQUEST = time.monotonic()
    record = {'at': datetime.now(timezone.utc).isoformat(), 'model': payload['model'], 'voice': payload['voice'], 'inputCharacters': len(payload['input']), 'target': str(target.relative_to(OUT))}
    PRIVATE.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(ENDPOINT, data=json.dumps(payload).encode(), headers={
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json',
    })
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            body = response.read()
            content_type = response.headers.get('Content-Type', '')
            allowed = ['x-request-id', 'request-id', 'x-character-count', 'x-cost', 'x-kaon-cost', 'x-billed-cost', 'x-usage-cost', 'x-total-cost', 'x-kaon-cost-usd', 'x-kaon-model', 'x-kaon-provider', 'x-kaon-upstream-model', 'x-kaon-attempts']
            record.update(status=response.status, contentType=content_type, responseHeaders={name: response.headers[name] for name in allowed if name in response.headers}, responseHeaderNames=list(response.headers.keys()), elapsedSeconds=round(time.monotonic()-LAST_REQUEST, 3))
            if 'audio' not in content_type and not body[:3] == b'ID3' and not body[:1] == b'\xff':
                raise RuntimeError('Successful response was not recognizable audio; not saved.')
    except urllib.error.HTTPError as error:
        message = error.read().decode(errors='replace').replace(key, '[REDACTED]')
        record.update(status=error.code, error=message[:800], elapsedSeconds=round(time.monotonic()-LAST_REQUEST, 3))
        with (PRIVATE/'requests.jsonl').open('a') as log:
            log.write(json.dumps(record)+'\n')
        raise RuntimeError(f'Kaon HTTP {error.code}: {message[:800]}') from None
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(body)
    result = {'duration': duration(target), 'bytes': len(body), 'sha256': hashlib.sha256(body).hexdigest()}
    record.update(result)
    record['costStatus'] = 'See response cost headers when present; otherwise billing requires the Kaon usage page, not estimated as zero.'
    with (PRIVATE/'requests.jsonl').open('a') as log:
        log.write(json.dumps(record)+'\n')
    raw = PRIVATE/'raw'/target.relative_to(OUT)
    raw.parent.mkdir(parents=True, exist_ok=True)
    raw.write_bytes(body)
    return result


def payload(model, voice, text, previous=None, next_text=None):
    options = {
        'language_code': 'en', 'output_format': 'mp3_44100_128',
        'seed': 14102026,
        'voice_settings': {'stability': 0.5, 'similarity_boost': 0.75, 'use_speaker_boost': True},
        'apply_text_normalization': 'auto',
    }
    if previous:
        options['previous_text'] = previous
    if next_text:
        options['next_text'] = next_text
    return {'model': model, 'input': text, 'voice': voice, 'stream': False, 'response_format': 'mp3', 'provider_options': {'elevenlabs': options}}


def manifest(model, lucien, hunter):
    lines = []
    for line in LINES:
        target = OUT / (line['id'] + '.mp3')
        value = dict(line, file=target.name if target.exists() else None, duration=duration(target) if target.exists() else None)
        value['cue'] = {'phase': line['phase'], 'offset': line['offset'], 'duration': value['duration'], 'timing': 'phase-relative; runtime must allow measured speech duration and player wait'}
        value['status'] = 'generated' if target.exists() else 'awaiting-authorized-tts-key'
        lines.append(value)
    data = {
        'schemaVersion': 1, 'model': model,
        'voices': {'lucien': VOICES[lucien], 'hunter': VOICES[hunter]},
        'voiceSelectionStatus': 'candidate casting; subjective listening not completed',
        'lines': lines, 'ambience': [], 'sources': SOURCES,
        'quality': {'subjectiveListening': 'not-completed: reviewer tool does not expose audio perception', 'timing': 'Actual MP3 duration only; missing files have null duration, never estimated as real audio.'},
    }
    fx_path = OUT / 'effects-manifest.json'
    if fx_path.exists():
        fx = json.loads(fx_path.read_text())
        data['ambience'] = fx['ambience']
        data['effects'] = fx['effects']
        data['sources'] += fx['sources']
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'manifest.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    return data


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['prepare', 'candidates', 'lines'])
    parser.add_argument('--key-file', type=Path)
    parser.add_argument('--model', default='elevenlabs/eleven_v4')
    parser.add_argument('--lucien', choices=['charlie', 'eric'], default='charlie')
    parser.add_argument('--hunter', choices=['harry', 'adam'], default='harry')
    parser.add_argument('--only', choices=[x['id'] for x in LINES])
    args = parser.parse_args()
    if args.action == 'prepare':
        manifest(args.model, args.lucien, args.hunter)
        candidates_path = OUT / 'candidates.json'
        if not candidates_path.exists():
            candidates_path.write_text(json.dumps({'model': args.model, 'candidates': [], 'status': 'awaiting-authorized-tts-key'}, indent=2) + '\n')
        print('Prepared seven exact lines; no speech API call made.')
        return
    if not args.key_file or not args.key_file.is_file():
        parser.error('Provide the existing authorized Kaon key file with --key-file; never put a key in command arguments.')
    key = args.key_file.read_text().strip()
    if not key:
        parser.error('Key file is empty.')
    if args.action == 'candidates':
        results = []
        for name, voice in VOICES.items():
            text = "[whispers] You're bleeding... I can hear it. Every drop." if voice['role'] == 'lucien' else "[coldly] He won't make it in time."
            target = OUT / 'candidates' / (name + '.mp3')
            info = {'duration': duration(target), 'bytes': target.stat().st_size} if target.exists() else speech(key, payload(args.model, voice['id'], text), target)
            results.append(dict(voice, candidate=name, file='candidates/' + target.name, **info))
            print(name, info)
        (OUT / 'candidates.json').write_text(json.dumps({'model': args.model, 'candidates': results, 'status': 'awaiting-subjective-listening', 'sources': SOURCES}, ensure_ascii=False, indent=2) + '\n')
    else:
        for index, line in enumerate(LINES):
            if args.only and line['id'] != args.only:
                continue
            target = OUT / (line['id'] + '.mp3')
            if target.exists():
                print('Existing', target.name, duration(target))
                continue
            voice = VOICES[args.lucien if line['speaker'] == 'lucien' else args.hunter]
            previous = LINES[index-1]['text'] if index > 1 else None
            next_text = LINES[index+1]['text'] if 0 < index < len(LINES)-1 else None
            info = speech(key, payload(args.model, voice['id'], line['direction'] + ' ' + line['text'], previous, next_text), target)
            print(target.name, info)
        manifest(args.model, args.lucien, args.hunter)


if __name__ == '__main__':
    try:
        main()
    except RuntimeError as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
