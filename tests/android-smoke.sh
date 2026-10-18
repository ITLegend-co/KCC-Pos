#!/usr/bin/env bash
set -euo pipefail
mkdir -p artifacts/android
adb install -r public/downloads/KCC-POS.apk
adb shell am start -W -n co.itlegend.kccpos/.MainActivity
for attempt in $(seq 1 24); do
  adb shell uiautomator dump /sdcard/kcc-ui.xml >/dev/null 2>&1 || true
  adb pull /sdcard/kcc-ui.xml artifacts/android/ui.xml >/dev/null 2>&1 || true
  if test -f artifacts/android/ui.xml && grep -q 'Welcome to the club desk' artifacts/android/ui.xml; then break; fi
  sleep 5
done
adb exec-out screencap -p > artifacts/android/app.png
adb logcat -d -s AndroidRuntime > artifacts/android/runtime.log
adb shell dumpsys activity activities > artifacts/android/activity.txt
python3 - <<'PY'
from pathlib import Path
import xml.etree.ElementTree as ET
p=Path('artifacts/android')
root=ET.parse(p/'ui.xml').getroot()
nodes=list(root.iter('node'))
assert any('Welcome to the club desk' in n.get('text','') for n in nodes), 'Sign-in screen did not load'
assert any(n.get('class')=='android.webkit.WebView' and n.get('package')=='co.itlegend.kccpos' for n in nodes), 'Not the standalone app WebView'
assert not any('Download Android APK' in n.get('text','') for n in nodes), 'APK link visible inside the app'
assert 'FATAL EXCEPTION' not in (p/'runtime.log').read_text(), 'Android runtime crash'
print('Standalone Android activity loaded sign-in successfully without an APK download link.')
PY
