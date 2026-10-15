"""Fetch the pinned, MIT-licensed character sources used by the local builder."""
import hashlib
import json
import shutil
from pathlib import Path
from urllib.parse import quote
from urllib.request import urlopen

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets/bloodbound/characters'
LOCAL = ROOT / '.local/bloodbound-tools/character-next'
manifest = json.loads((OUT / 'source/rocketbox-files.json').read_text())
for item in manifest['files']:
    target = LOCAL / 'rocketbox' / item['path']
    if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest() == item['sha256']:
        continue
    url = 'https://raw.githubusercontent.com/microsoft/Microsoft-Rocketbox/' + manifest['revision'] + '/' + quote(item['path'])
    with urlopen(url, timeout=90) as response:
        data = response.read()
    if hashlib.sha256(data).hexdigest() != item['sha256']:
        raise ValueError('Unexpected source checksum: ' + item['path'])
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    print(item['path'])

cache = LOCAL / 'texture-cache'
cache.mkdir(parents=True, exist_ok=True)
for source in (LOCAL / 'rocketbox').rglob('*_color.tga'):
    if 'opacity' not in source.name:
        Image.open(source).convert('RGB').save(cache / (source.stem + '.jpg'), quality=94, subsampling=0)
print('Source files verified; color textures compressed without changing their layout.')

groom_manifest = OUT / 'source/groom-files.json'
if groom_manifest.exists():
    groom = json.loads(groom_manifest.read_text())
    folder = ROOT / '.local/bloodbound-tools/hair-next'
    folder.mkdir(parents=True, exist_ok=True)
    target = folder / groom['filename']
    if not target.exists() or hashlib.sha256(target.read_bytes()).hexdigest() != groom['sha256']:
        with urlopen(groom['url'], timeout=90) as response:
            data = response.read()
        if hashlib.sha256(data).hexdigest() != groom['sha256']:
            raise ValueError('Unexpected official groom source checksum')
        target.write_bytes(data)
    atlas = OUT / 'source' / groom['atlas']['file']
    if hashlib.sha256(atlas.read_bytes()).hexdigest() != groom['atlas']['sha256']:
        raise ValueError('Unexpected packaged hair atlas checksum')
    shutil.copy2(atlas, folder / 'male01-image-4.png')
    print('Official groom source and packaged opacity atlas verified.')
