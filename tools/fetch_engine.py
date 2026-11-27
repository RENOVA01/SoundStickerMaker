"""Fetch the published noncommercial upstream version at build time, not app runtime."""
from pathlib import Path
from urllib.request import urlopen, Request
from hashlib import sha256
import json

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'app/src/main/assets/engine'
BASE = 'https://raw.githubusercontent.com/vish-4-1/WA-audio-stickers-en/v0.7.2-en/extension/src/'
LICENSE = 'https://raw.githubusercontent.com/vish-4-1/WA-audio-stickers-en/v0.7.2-en/LICENSE.md'
FILES = {name + '.js': BASE + name + '.js' for name in ('logger', 'convert', 'wa', 'ui', 'main')}
FILES['LICENSE.md'] = LICENSE

def fetch(url):
    with urlopen(Request(url, headers={'User-Agent':'SoundStickerMaker-build/0.1'}), timeout=60) as r:
        return r.read()

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for name, url in FILES.items():
        data = fetch(url)
        if len(data) < 50: raise RuntimeError(f'Invalid upstream response: {name}')
        (OUT/name).write_bytes(data)
        manifest[name] = {'source': url, 'sha256': sha256(data).hexdigest()}
        print(name, manifest[name]['sha256'])
    (OUT/'sources.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')

if __name__ == '__main__': main()
