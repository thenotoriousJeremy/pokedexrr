# Mobile apps (iOS + Android)

The native apps are the existing React frontend wrapped with [Capacitor](https://capacitorjs.com).
No separate codebase: every web change flows into both apps on the next build.

Because each user self-hosts Bindarr, the app asks for a **Server URL** on the
login screen (shown only in the native app) and stores it locally. All `/api`
calls are routed to that server through Capacitor's native HTTP layer, which
also sidesteps WebView CORS — no backend CORS changes needed.

## Layout

- `frontend/capacitor.config.json` — app id (`com.bindarr.app`), name, `CapacitorHttp` on.
- `frontend/src/apiBase.js` — native fetch shim that prepends the user's server URL.
- `frontend/android/`, `frontend/ios/` — native projects (committed; build output is git-ignored).

## Local build

```bash
cd frontend
npm ci
npm run build
npx cap sync            # copies dist/ into both native projects
npx cap open android    # opens Android Studio
npx cap open ios        # opens Xcode (macOS only)
```

## Automated releases

`.github/workflows/mobile-release.yml` runs on every `v*` tag push (same trigger
as the Docker image) and on manual `workflow_dispatch`. It builds:

- **Android** -> `.apk` (signed release if the keystore secrets are set, otherwise
  a debug-signed APK so builds work before you set anything up).
- **iOS** -> App Store / TestFlight-signed `.ipa` (only when the Apple signing
  secrets are present; the job self-skips if not).

Both packages are attached to the GitHub Release for the tag **and** uploaded as
workflow artifacts (so a manual `workflow_dispatch` run also gives you downloads).

Store uploads are intentionally deferred: nothing is pushed to Google Play or
TestFlight yet — the packages just land on GitHub. When ready, add the upload
steps (Play: `r0adkll/upload-google-play`; TestFlight: `xcrun altool`/`notarytool`).

Version name comes from the tag (`v1.4.0` -> `1.4.0`); the build/version code is
the workflow run number.

Cut a release:

```bash
git tag v1.4.0 && git push origin v1.4.0
```

## One-time setup (required secrets)

Add these under **Settings -> Secrets and variables -> Actions**.

### Android (optional for now)

Without these, the workflow builds a **debug** APK (installable, fine for testing).
Add them to get a release-signed APK (and later, Play uploads).

| Secret | How to get it |
|--------|---------------|
| `ANDROID_KEYSTORE_BASE64` | `keytool -genkeypair -v -keystore release.keystore -alias bindarr -keyalg RSA -keysize 2048 -validity 10000` then base64 the file |
| `ANDROID_KEYSTORE_PASSWORD` | keystore password you chose |
| `ANDROID_KEY_ALIAS` | `bindarr` (the alias above) |
| `ANDROID_KEY_PASSWORD` | key password you chose |

Back up `release.keystore` — losing it means you can never update the Play listing later.

### iOS (required for an .ipa; TestFlight-ready)

Requires the paid Apple Developer Program (you are enrolled). The `.ipa` is signed
for App Store / TestFlight distribution and attached to the Release; uploading it
to TestFlight is a later step.

| Secret | How to get it |
|--------|---------------|
| `IOS_CERTIFICATE_BASE64` | Apple Distribution certificate exported as `.p12`, then base64 |
| `IOS_CERTIFICATE_PASSWORD` | password set when exporting the `.p12` |
| `IOS_PROVISIONING_PROFILE_BASE64` | an **App Store** distribution provisioning profile for `com.bindarr.app`, base64 |
| `IOS_PROVISIONING_PROFILE_NAME` | the profile's exact name |
| `APPLE_TEAM_ID` | 10-char Team ID from the Apple Developer account |
