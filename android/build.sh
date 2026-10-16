#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
: "${ANDROID_HOME:?Set ANDROID_HOME to an Android SDK with platform 35 and build-tools 35.0.0}"
build_tools="$ANDROID_HOME/build-tools/35.0.0"
platform="$ANDROID_HOME/platforms/android-35/android.jar"
mkdir -p build/classes build/dex
"$build_tools/aapt2" compile --dir res -o build/resources.zip
"$build_tools/aapt2" link -o build/resources.apk -I "$platform" --manifest AndroidManifest.xml build/resources.zip
if [[ -n "${KCC_JAVAC_JAR:-}" ]]; then
  java -jar "$KCC_JAVAC_JAR" -8 -classpath "$platform" -d build/classes src/co/itlegend/kccpos/MainActivity.java
else
  javac --release 8 -classpath "$platform" -d build/classes src/co/itlegend/kccpos/MainActivity.java
fi
python3 - <<'PYTHON'
from pathlib import Path
from zipfile import ZipFile
with ZipFile('build/classes.jar','w') as z:
    for p in Path('build/classes').rglob('*.class'): z.write(p,p.relative_to('build/classes'))
PYTHON
"$build_tools/d8" --lib "$platform" --min-api 23 --output build/dex build/classes.jar
python3 - <<'PY'
from pathlib import Path
from zipfile import ZipFile
p=Path('build')
with ZipFile(p/'resources.apk') as source, ZipFile(p/'unsigned.apk','w') as target:
    for info in source.infolist(): target.writestr(info,source.read(info.filename))
    target.write(p/'dex/classes.dex','classes.dex')
PY
"$build_tools/zipalign" -f 4 build/unsigned.apk build/KCC-POS-unsigned.apk
# Signing credentials stay outside the repository. Supply them through private env/files.
if [[ -n "${KCC_KEYSTORE:-}" ]]; then
  : "${KCC_STORE_PASSWORD:?Set KCC_STORE_PASSWORD}"
  "$build_tools/apksigner" sign --ks "$KCC_KEYSTORE" --ks-key-alias kcc-pos --ks-pass env:KCC_STORE_PASSWORD --key-pass env:KCC_STORE_PASSWORD --out ../public/downloads/KCC-POS.apk build/KCC-POS-unsigned.apk
  "$build_tools/apksigner" verify --verbose ../public/downloads/KCC-POS.apk
fi
