# KCC POS Android

Package `co.itlegend.kccpos`, version 1.0.0 (code 1), Android 6 or later.
The APK opens `https://itlegend-co.github.io/KCC-Pos/` in a browser Custom Tab,
falling back to the normal browser if Custom Tabs are unsupported. A browser and
internet access are required. It is a lightweight launcher, not a bundled offline
copy of the site. Firebase login, PDF downloads/printing/sharing, and Excel file
selection use the browser's existing support. There is no WebView JavaScript
bridge, embedded password, or extra device permission.

The app follows live website updates without reinstalling the APK. Browser
installation is also enabled through the project's manifest and service worker;
there is no custom installation prompt or public explanation in the UI. The
service worker caches no financial or authentication data and returns only a
static connection message when navigation fails offline.

## Rebuild

Install Android SDK platform 35, build-tools 35.0.0 and JDK 17 or later. Set
`ANDROID_HOME`, then run `bash android/build.sh` to produce an unsigned APK in
`android/build/`. An optional `KCC_JAVAC_JAR` can point to an Eclipse ECJ compiler
JAR when javac is unavailable.

For a signed update, use the private signing backup supplied to the owner. Set
`KCC_KEYSTORE` to its keystore path and `KCC_STORE_PASSWORD` privately. Alias:
`kcc-pos`. The script aligns, signs, verifies and writes
`public/downloads/KCC-POS.apk`. Increase the manifest versionCode for native app
updates. Generate `public/downloads/KCC-POS.apk.sha256` again after signing.
Never commit the keystore or its password. Keep using the same key so Android
accepts updates to this installed package.

The committed APK is signed with the private release key; it is not a debug APK.
Website deployment serves it directly, without a separate artifact or GitHub
login. CI verifies the signature, package metadata and checksum before publishing.
