#!/usr/bin/env bash
# Builds the Atherium website (100% Atherium static site generator) into website/site/
set -euo pipefail
cd "$(dirname "$0")/.."
./Atherium/build/atherium run --allow-io --mem 64M --lib Atherium/lib --lib website/lib website/build.ath
[ -f "AtheriumStudio-x86_64.AppImage" ] && cp -u "AtheriumStudio-x86_64.AppImage" website/site/ 2>/dev/null || true
[ -f "AtheriumStudio-x86_64.exe" ] && cp -u "AtheriumStudio-x86_64.exe" website/site/ 2>/dev/null || true

python3 -c "
import os, zipfile
os.makedirs('website/site/bundles', exist_ok=True)
def make_zip(out, sdir, ext):
    with zipfile.ZipFile(out, 'w', compression=zipfile.ZIP_DEFLATED) as z:
        for f in sorted(os.listdir(sdir)):
            if f.endswith(ext):
                z.write(os.path.join(sdir, f), arcname=f)

make_zip('website/site/bundles/atherium-plugins-bundle.zip', 'website/site/plugins', '.athplugin')
make_zip('website/site/bundles/atherium-themes-bundle.zip', 'website/site/themes', '.aththeme')

with zipfile.ZipFile('website/site/bundles/atherium-studio-full-pack.zip', 'w', compression=zipfile.ZIP_DEFLATED) as z:
    for f in sorted(os.listdir('website/site/plugins')):
        if f.endswith('.athplugin'):
            z.write(os.path.join('website/site/plugins', f), arcname=os.path.join('plugins', f))
    for f in sorted(os.listdir('website/site/themes')):
        if f.endswith('.aththeme'):
            z.write(os.path.join('website/site/themes', f), arcname=os.path.join('themes', f))
"

