"""DEPRECATED: the site now uses clean URLs served by server/entry.mjs, which a ZIP
upload cannot include. Deploy with `npm run release` / GitHub Actions instead (see DEPLOY.md).

Rebuild the pages and package site/ for Wix Headless upload.

Usage:  python tools/make_upload_zip.py
Output: wix-upload/sanjh-shringar-site.zip  (index.html at the root, forward-slash paths)
"""
import os
print("WARNING: ZIP upload has no clean-URL worker; /shop etc. will 404. Use `npm run release` instead.")
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE, OUT = ROOT / "site", ROOT / "wix-upload" / "sanjh-shringar-site.zip"

subprocess.run([sys.executable, str(ROOT / "tools" / "build.py")], check=True)
OUT.parent.mkdir(exist_ok=True)
total = 0
with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
    for d, _, files in os.walk(SITE):
        for f in files:
            p = Path(d) / f
            size = p.stat().st_size
            if size > 3 * 1024 * 1024:
                sys.exit(f"{p} is over 3 MB; Wix rejects files that large.")
            total += size
            z.write(p, p.relative_to(SITE).as_posix())
if total > 20 * 1024 * 1024:
    sys.exit(f"Site is {total / 1048576:.1f} MB; the Wix upload limit is 20 MB.")
config = (SITE / "assets" / "wix-config.js").read_text(encoding="utf-8")
connected = 'clientId: ""' not in config
print(f"Built {OUT.relative_to(ROOT)}  ({total / 1048576:.1f} MB)")
print("Wix Stores:", "CONNECTED (clientId set)" if connected else "NOT connected; add your Client ID in site/assets/wix-config.js")
