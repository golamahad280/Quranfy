# Quranfy

A 100% free, ad-free, privacy-first Quran audio player and reader built for study, work, and sleep—packaged as a Progressive Web App (PWA) and an Android APK with Capacitor.

## Download APK

Pre-built Android APKs (`minSdk 24` / Android 7.0+) can be downloaded from CI or built locally:

1. **GitHub Actions CI**: Every push triggers the **Build Android APK** workflow (`.github/workflows/build-apk.yml`) using Node 20, Java 21, and the Android SDK, uploading the **`Quranfy-APK`** artifact (`Quranfy.apk`) under the **Actions** tab.
2. **Local APK Output**: Building locally copies the APK to `./Quranfy.apk` and `./release/Quranfy.apk`.
3. **Installing on Android**:
   - Download `Quranfy.apk` from the latest **Quranfy-APK** workflow artifact (or copy your locally built APK to your phone).
   - Tap the file and allow **Install unknown apps** if prompted.
   - All features—Quran reader & Tafsir, 7 Hadith books, Prayer & Qibla, Adhkar, Hifz, Khatam tracker, self-hosted Arabic/Bangla/Latin fonts, and offline nature ambient sound loops—are unlocked 100% free with no ads, accounts, or subscriptions.

---

## Features

- **100% Free & Local-First**: No login, no subscriptions, no ads, and no tracking.
- **Full Surah & Ayah-by-Ayah Playback**: All 114 surahs with 11 featured reciters (searchable Arabic + English names) plus live reciters from `mp3quran.net/api/v3`.
- **Background Playback & Lock-Screen Controls**: Integrated with `@capgo/capacitor-media-session` and `@capawesome-team/capacitor-android-foreground-service` on Android (plus Web Media Session API on browsers).
- **Focus Modes (Study, Work, Sleep)**: Mode-tailored indigo/violet glassmorphism themes, curated playlists, recommended reciters, and a multi-track ambient sound mixer with offline CC0 nature loops (`public/sounds/`) and 4 one-tap presets.
- **Quran Reader, Tafsir & Tilawat Bar**: Self-hosted Uthmani & Bangla fonts (`Amiri Quran`, `Scheherazade New`, `Noto Sans Bengali`, `DM Sans`, `Plus Jakarta Sans`), Juz/Page/Surah browsing, English & Bangla translations, per-ayah Tafsir, bookmarks, notes, and shareable PNG ayah cards.
- **Hadith, Adhkar, Prayer & Hifz**: Offline-cached 7 Hadith collections with calm Reading Mode, Adhkar tap counters, offline Prayer times & Qibla compass (`adhan`), progressive-masking Hifz mode, Khatam tracker, and JSON backup/restore.
- **Offline Downloads**: Chunk-streamed to `@capacitor/filesystem` on Android (with IndexedDB fallback on web) with storage readout and delete controls.
- **Trilingual UI (English, Arabic RTL, বাংলা)** with Light, Dark, and Auto themes.

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

Verify `android/local.properties` points to your machine's Android SDK (it is git-ignored and will not be committed):

```properties
sdk.dir=/path/to/your/Android/Sdk
```

All bundled fonts (`dist/assets/*.woff2`) and offline CC0 loops (`public/sounds/`) are synced into `android/app/src/main/assets/public/`.

### 2. Build the Debug APK via Gradle

```bash
cd android
./gradlew assembleDebug
```

Copy the resulting APK to the project root and `/release/Quranfy.apk`:

```bash
cd ..
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
