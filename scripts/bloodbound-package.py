import hashlib
import json
import os
import zipfile
from pathlib import Path


root = Path(__file__).resolve().parents[1]
output = root / 'output/bloodbound/2026-10-15/release'
output.mkdir(parents=True, exist_ok=True)
destination = output / 'Memory-Lane-BLOODBOUND.zip'
manifest = json.loads((root / 'public/assets/bloodbound/characters/manifest.json').read_text())
model = root / ('public' + manifest['file'])
if hashlib.sha256(model.read_bytes()).hexdigest() != manifest['sha256']:
    raise ValueError('The runtime model does not match its reviewed manifest')

secrets = []
for path in [root / '.local/kaon-tts/key', root / '.local/kaon-assets/key']:
    if path.exists():
        value = path.read_bytes().strip()
        if value.startswith(b'sk-kaon-'):
            secrets.append(value)

top = ['package.json', 'package-lock.json', 'bloodbound.html', 'vite.bloodbound.config.js',
       'LICENSE', 'BLOODBOUND.md', 'BLOODBOUND-INTEGRATION.md', '打开 Bloodbound.command']
files = [root / name for name in top]
files += list((root / 'src/bloodbound').rglob('*'))
files += list((root / 'public/assets/bloodbound').rglob('*'))
files += list((root / 'dist-bloodbound').rglob('*'))
files += list((root / 'scripts').glob('bloodbound-*'))
files += [root / 'tests/bloodbound-timeline.test.js',
          root / 'output/bloodbound/2026-10-15/full-scene-review/REVIEW.md',
          root / 'output/bloodbound/2026-10-15/preview-gift.jpg']
unused_models = {'rocketbox-male01.glb', 'rocketbox-male02.glb', 'lucien-next-candidate.glb',
                 'lucien-next-combined.glb', 'lucien-hair-option.glb'}
archive_root = 'Memory-Lane-BLOODBOUND/'
count = 0
with zipfile.ZipFile(destination, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=1) as archive:
    for path in sorted(set(files)):
        if not path.is_file() or path.name in unused_models:
            continue
        relative = path.relative_to(root).as_posix()
        if '/selection/' in relative or relative.endswith('.staged') or '__pycache__' in relative:
            continue
        data = path.read_bytes()
        if any(value in data for value in secrets):
            raise ValueError(f'A private credential was found in {relative}')
        if path.name == 'package.json' and path.parent == root:
            package = json.loads(data)
            package['name'] = 'memory-lane-bloodbound'
            package['scripts'] = {
                'dev': 'vite --config vite.bloodbound.config.js --host 127.0.0.1 --port 4330 --strictPort --open /bloodbound.html',
                'build': package['scripts']['build:bloodbound'],
                'build:bloodbound': package['scripts']['build:bloodbound'],
                'start': package['scripts']['start:bloodbound'],
                'start:bloodbound': package['scripts']['start:bloodbound'],
                'test': 'node --test tests/bloodbound-timeline.test.js',
            }
            data = (json.dumps(package, ensure_ascii=False, indent=2) + '\n').encode()
        if path.name == 'package-lock.json' and path.parent == root:
            lock = json.loads(data)
            lock['name'] = 'memory-lane-bloodbound'
            lock['packages']['']['name'] = 'memory-lane-bloodbound'
            data = (json.dumps(lock, ensure_ascii=False, indent=2) + '\n').encode()
        entry = zipfile.ZipInfo(archive_root + relative)
        entry.compress_type = zipfile.ZIP_DEFLATED
        entry.external_attr = (path.stat().st_mode & 0xFFFF) << 16
        archive.writestr(entry, data, compresslevel=1)
        count += 1
with zipfile.ZipFile(destination) as archive:
    if archive.testzip() is not None:
        raise ValueError('The development archive did not pass its CRC check')
digest = hashlib.sha256(destination.read_bytes()).hexdigest()
destination.with_suffix('.zip.sha256').write_text(digest + '  ' + destination.name + '\n')
print(json.dumps({'file': str(destination), 'bytes': destination.stat().st_size,
                  'entries': count, 'sha256': digest, 'credentials': 'not included'}, indent=2))
