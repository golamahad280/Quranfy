# Quranfy

A 100% free, ad-free, privacy-first Quran audio player and reader built for study, work, and sleep—packaged as a Progressive Web App (PWA) and ready to wrap as an Android APK with Capacitor.

## Features

- **100% Free & Local-First**: No login, no subscriptions, no ads, and no tracking.
- **Full Surah & Ayah-by-Ayah Playback**: All 114 surahs with 11 featured reciters (searchable Arabic + English names) plus additional reciters loaded from `mp3quran.net/api/v3`.
- **Focus Modes (Study, Work, Sleep)**: Mode-tailored themes, curated playlists, recommended reciters, and an offline procedural Web Audio API ambient sound mixer (rain, night, forest, ocean, soft wind, white noise).
- **Read & Listen**: Uthmani script (`Amiri Quran` or `Scheherazade New`), selectable translations via `api.alquran.cloud/v1`, synced ayah highlighting, auto-scroll, ayah repeat (N times), and range loops.
- **Offline Downloads**: Download surahs per reciter to IndexedDB and manage storage offline.
- **Listening Habit & Stats**: Accurate played-seconds tracking, daily goal ring, streaks, 7-day chart, and local reminders via Capacitor Local Notifications.
- **Bilingual (English & Arabic RTL)** with Light, Dark, and Auto themes.

---

## Running Locally (Web / PWA)

```bash
npm install
npm run dev
```

Build production bundle:

```bash
npm run build
```

---

## Building the Android APK with Capacitor

### Prerequisites

- **Node.js 20+**
- **Android Studio** (with Android SDK & JDK 17+)

### 1. Generate & Sync the Android Project

```bash
npm install
npm run build
npx cap add android
npx cap sync
npx cap open android
```

> **Note:** `capacitor.config.ts` is preconfigured with `appId: "com.quranfy.app"`, `appName: "Quranfy"`, and `webDir: "dist"`. Whenever you modify web code, run `npm run build && npx cap sync` before rebuilding in Android Studio.

### 2. Build a Debug APK

1. Wait for Gradle sync to finish inside Android Studio.
2. In the top menu, click **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
3. Once complete, click **locate** in the notification banner (output: `android/app/build/outputs/apk/debug/app-debug.apk`).

### 3. Signing & Building a Release APK

1. Generate a release keystore (keep this file and passwords safe):

```bash
keytool -genkey -v -keystore quranfy-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias quranfy
```

2. In Android Studio, open **Build > Generate Signed Bundle / APK...**.
3. Choose **APK** (or **Android App Bundle** for Google Play) and click **Next**.
4. Select your `quranfy-release.jks` keystore path, enter your keystore password, key alias (`quranfy`), and key password.
5. Select the **release** build variant and click **Create** (or **Finish**).
6. Your signed APK will be generated at `android/app/build/outputs/apk/release/app-release.apk`.

*(Optional CLI signing via Gradle)*: Add your signing config to `android/app/build.gradle` (`signingConfigs.release`) and run:

```bash
cd android
./gradlew assembleRelease
```
