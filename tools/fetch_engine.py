"""Fetch the published noncommercial upstream version at build time, not app runtime."""
from pathlib import Path
from urllib.request import urlopen, Request
from hashlib import sha256
import json
import subprocess

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'app/src/main/assets/engine'
BASE = 'https://raw.githubusercontent.com/vish-4-1/WA-audio-stickers-en/v0.7.2-en/extension/src/'
LICENSE = 'https://raw.githubusercontent.com/vish-4-1/WA-audio-stickers-en/v0.7.2-en/LICENSE.md'
FILES = {name + '.js': BASE + name + '.js' for name in ('logger', 'convert', 'wa', 'ui', 'main')}
FILES['LICENSE.md'] = LICENSE

def fetch(url):
    with urlopen(Request(url, headers={'User-Agent':'SoundStickerMaker-build/0.1'}), timeout=60) as r:
        return r.read()

def patch_engine(name, data):
    if name not in ('convert.js', 'ui.js'):
        return data
    text = data.decode('utf-8')
    patches = ROOT / 'tools/patches'
    if name == 'convert.js':
        a = text.index('  function drawFrame(ctx, v, mode, side) {')
        b = text.index('  async function probeVideo(file)', a)
        text = text[:a] + (patches / 'draw.js').read_text(encoding='utf-8') + '\n' + text[b:]
    else:
        for old, new, expected in json.loads((patches / 'ui-rules.json').read_text(encoding='utf-8')):
            count = text.count(old)
            if count != expected:
                raise RuntimeError(f'Upstream patch mismatch: {old[:90]} (expected {expected}, got {count})')
            if isinstance(new, dict):
                new = (patches / new['prepend']).read_text(encoding='utf-8') + '\n' + old
            text = text.replace(old, new)
    return text.encode('utf-8')

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for name, url in FILES.items():
        data = fetch(url)
        if len(data) < 50: raise RuntimeError(f'Invalid upstream response: {name}')
        patched = patch_engine(name, data)
        (OUT/name).write_bytes(patched)
        manifest[name] = {'source': url, 'sha256': sha256(data).hexdigest(), 'packaged_sha256': sha256(patched).hexdigest()}
        print(name, manifest[name]['sha256'])
    for js in sorted(OUT.glob('*.js')) + [ROOT / 'app/src/main/assets/editor/mobile.js']:
        subprocess.run(['node', '--check', str(js)], check=True)
    (OUT/'sources.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')

if __name__ == '__main__': main()
