# KCC POS Android

Package `co.itlegend.kccpos`, version 2.0.0 (code 2), Android 6 or later.
The app displays the live KCC POS site inside its own WebView with no browser
address bar or Custom Tab. Internet access and an up-to-date Android System
WebView are required. This is an online Android app, not an offline ledger.

Firebase email/password login uses app-local persistent web storage. An upgrade
from the old browser launcher requires signing in once in the new app. Website
updates continue to appear without reinstalling. Native changes require an APK
update. Install over version 1.0.0 using the same release signature; do not uninstall.

The APK link is hidden by default and is shown only in ordinary Android browsers.
It stays hidden on desktop, iPhone, installed PWAs and inside the Android app.

## Files and printing

- Excel upload uses Android's document picker.
- Excel template and CSV exports use Android's Save dialog.
- Receipt PDFs have a native scrollable preview with Save, Share and Print.
  Use Android Back or tap outside the dialog to close it. All receipt pages are included.
- PDF sharing grants temporary read access to a single cached PDF through a
  private content provider. Exports older than one day are removed at app startup.
- Treasury reports use Android's print interface, including Save as PDF.
- No broad storage permission is requested.

The native file/print connection uses a WebMessagePort delivered only to the
trusted top-level HTTPS page; there is no addJavascriptInterface bridge exposed
to arbitrary frames. Top-level in-app navigation is restricted to the KCC path,
cleartext and mixed content are disabled, TLS errors are never bypassed, and
external HTTPS links open only after a user gesture. Report-print WebViews have
JavaScript and network resource loading disabled. Firebase security rules remain
the authority for all staff/admin access.

## Rebuild

Install Android SDK platform 35, build-tools 35.0.0 and JDK 17 or later. Set
`ANDROID_HOME`, then run `bash android/build.sh`. `KCC_JAVAC_JAR` can point to an
Eclipse ECJ compiler JAR when javac is unavailable.

For signed updates, set `KCC_KEYSTORE` to the owner's private keystore and provide
`KCC_STORE_PASSWORD` privately. Alias: `kcc-pos`. The script aligns, signs and
verifies `public/downloads/KCC-POS.apk`. Regenerate its SHA-256 checksum after
signing. Never commit the keystore or password. Use the same key for updates.

CI runs the web tests and checks the release APK signature/checksum before
publishing. Android smoke checks launch the release APK in an emulator after
successful deployment and verify its own activity renders the sign-in screen.
