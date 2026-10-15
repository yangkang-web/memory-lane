"""Promote an explicitly reviewed local candidate to the runtime character."""
import argparse
import hashlib
import json
import os
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'public/assets/bloodbound/characters'
parser = argparse.ArgumentParser()
parser.add_argument('--candidate', type=Path, default=ASSETS / 'lucien-next-combined.glb')
parser.add_argument('--expected-sha256', required=True)
parser.add_argument('--review-note', required=True)
args = parser.parse_args()
data = args.candidate.read_bytes()
digest = hashlib.sha256(data).hexdigest()
if digest != args.expected_sha256:
    raise ValueError('Candidate changed after review; do not promote it')
manifest = json.loads(args.candidate.with_suffix('.json').read_text())
if manifest['sha256'] != digest or not manifest.get('bodyBuffersPreserved'):
    raise ValueError('Candidate manifest does not match the preserved-body build')
if len(set(manifest.get('morphTargets', []))) != 68 or manifest.get('gltfJoints') != 80:
    raise ValueError('Expected the reviewed 68 controls and 80 shared joints')
if not manifest.get('componentLicenses'):
    raise ValueError('Keep the distinct body and groom license notices')
anchors = json.loads(args.candidate.with_name(args.candidate.stem + '-anchors.json').read_text())
if anchors['sha256'] != digest:
    raise ValueError('Mouth/eye anchors describe a different candidate')
manifest.update({
    'asset': 'lucien.glb', 'file': '/assets/bloodbound/characters/lucien.glb',
    'status': 'reviewed local demo character', 'reviewNote': args.review_note,
    'role': 'Lucien local cinematic character',
    'promotedFrom': args.candidate.name, 'sha256': digest,
    'limitations': [
        'Stock avatar likeness; not an identity reconstruction of P1.',
        'The derived groom remains denser and less distinctly curled than P1.',
        'Retargeted clothing is validated for the local cinematic; new poses need their own visual check.',
    ],
})
anchors.update({'asset': 'lucien.glb', 'sha256': digest})
payloads = {
    'lucien.glb': data,
    'lucien.json': (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode(),
    'lucien-face-anchors.json': (json.dumps(anchors, indent=2) + '\n').encode(),
    'manifest.json': (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode(),
}
# The manifest switches last, after the complete model and metadata exist.
for name, payload in payloads.items():
    staged = ASSETS / (name + '.staged')
    staged.write_bytes(payload)
    os.replace(staged, ASSETS / name)
print(json.dumps({'file': manifest['file'], 'sha256': digest, 'bytes': len(data)}, indent=2))
