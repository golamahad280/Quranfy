# Quranfy

A 100% free, ad-free, privacy-first Quran audio player and reader built for study, work, and sleep—packaged as a Progressive Web App (PWA) and an Android APK with Capacitor.

## Download APK

Pre-built Android APKs (`minSdk 24` / Android 7.0+) can be downloaded directly or built from GitHub Actions:

1. **Direct APK (`Quranfy.apk`)**: Available at the repository root (`./Quranfy.apk`) and `./release/Quranfy.apk` when built locally.
2. **GitHub Actions CI**: Every push automatically triggers the **Build Android APK** workflow (`.github/workflows/build-apk.yml`) and uploads the **`Quranfy-APK`** artifact under the **Actions** tab.
3. **Installing on Android**:
   - Transfer `Quranfy.apk` to your Android device (Android 7.0 / API 24 or newer).
   - Tap the file and allow **Install unknown apps** if prompted.
   - All features, Quran audio streams, Uthmani fonts, and all 9 offline CC0 nature ambient sound loops are included—no account, no ads, and no subscription required.

---

## Features

- **100% Free & Local-First**: No login, no subscriptions, no ads, and no tracking.
- **Full Surah & Ayah-by-Ayah Playback**: All 114 surahs with 11 featured reciters (searchable Arabic + English names) plus additional reciters loaded from `mp3quran.net/api/v3`.
- **Background Playback & Lock-Screen Controls**: Integrated with `@capgo/capacitor-media-session` and `@capawesome-team/capacitor-android-foreground-service` on Android (plus Web Media Session API on browsers).
- **Focus Modes (Study, Work, Sleep)**: Mode-tailored indigo/violet glassmorphism themes, curated playlists, recommended reciters, and a multi-track ambient sound mixer featuring 9 offline CC0 nature loops (Soft Rain, Heavy Rain, Forest & Birds, Ocean Waves, Gentle Stream, Night Crickets, Soft Wind, Fireplace, Brown Noise) with 4 one-tap presets.
- **Read & Listen**: Self-hosted Uthmani fonts (`Amiri Quran` and `Scheherazade New`), selectable translations via `api.alquran.cloud/v1`, synced ayah highlighting, auto-scroll, ayah repeat (N times), and range loops.
- **Offline Downloads**: Chunk-streamed to `@capacitor/filesystem` on Android (with IndexedDB fallback on web) with storage readout and delete controls.
- **Listening Habit & Stats**: Accurate played-seconds tracking, daily goal ring, streaks, 7-day chart, and local reminders via `@capacitor/local-notifications`.
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
- **JDK 21** & **Android SDK** (`minSdk 24`, `compileSdk 36`, `targetSdk 36`)

### 1. Build Web Assets & Sync Android

```bash
npm install
npm run build
npx cap sync android
```

All assets, fonts, and offline CC0 loops in `public/sounds/` are synced into `android/app/src/main/assets/public/`.

### 2. Build the Debug APK via Gradle

```bash
cd android
./gradlew assembleDebug
```

Copy the resulting APK:

```bash
cp android/app/build/outputs/apk/debug/app-debug.apk Quranfy.apk
mkdir -p release && cp android/app/build/outputs/apk/debug/app-debug.apk release/Quranfy.apk
```

### 3. Signing & Building a Release APK

1. Generate a release keystore (keep this file and passwords safe):

```bash
keytool -genkey -v -keystore quranfy-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias quranfy
```

2. In Android Studio (`npx cap open android`), open **Build > Generate Signed Bundle / APK...** or configure `signingConfigs.release` in `android/app/build.gradle` and run:

```bash
cd android
./gradlew assembleRelease
```
