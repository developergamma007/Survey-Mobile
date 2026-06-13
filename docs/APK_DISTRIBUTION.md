# PeoplePulse Survey — APK distribution

## Why Gmail shows "Unable to open document"

That error is **not** a broken APK. Gmail and Google Drive try to **preview** the file as a document. APK files are Android install packages, not documents, so preview fails with "Internal error occurred."

**Correct steps on the phone:**

1. Open the email and tap the APK attachment.
2. Choose **Download** (save to device). Do **not** tap "Open in browser."
3. Open **Files** or **Downloads** and tap `peoplepulse-survey-release.apk`.
4. Tap **Install**. Allow "Install unknown apps" for Gmail/Files if Android asks.

**Better ways to share:**

- Google Drive / Dropbox **direct download** link
- USB (`adb install dist/peoplepulse-survey-release.apk`)
- Messaging apps that save files locally (WhatsApp → Save)

## Build a release APK

```bash
cd Survey-Mobile
npm run release:apk
```

Output: `dist/peoplepulse-survey-release.apk`

Production API is baked in: `https://peoplepulse.iswot.in`

## Signing

- Upload keystore: `android/app/survey-upload-key.keystore` (create with `keytool` if missing)
- Config: copy `android/gradle.properties.example` → `android/gradle.properties` and set passwords
- If no upload keystore is configured, release builds fall back to the debug keystore (still installable for field testing)

## Troubleshooting install failures

| Symptom | Likely cause |
|---------|----------------|
| Gmail "Unable to open document" | Use Download + Files app, not preview |
| "App not installed" | Corrupt download — re-send APK; use Drive link |
| "App not installed as package appears invalid" | Unsigned APK — rebuild with `npm run release:apk` |
| "App not installed" (app already installed) | Uninstall old build or use same signing key |
