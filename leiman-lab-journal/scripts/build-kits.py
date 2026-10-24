# Packs every kits/<name>/ folder into public/files/<zip name> for download from articles.
# Usage (from the project root): python3 -I scripts/build-kits.py
import os, zipfile
KITS = {'human-voice-ru': 'leiman-lab-kit-001-human-voice.zip'}
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
for folder, zip_name in KITS.items():
    src = os.path.join(root, 'kits', folder)
    out = os.path.join(root, 'public', 'files', zip_name)
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for name in sorted(os.listdir(src)):
            info = zipfile.ZipInfo(f'{folder}/{name}', date_time=(2026, 10, 24, 12, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            with open(os.path.join(src, name), 'rb') as f: z.writestr(info, f.read())
    print(out, os.path.getsize(out), 'bytes')
