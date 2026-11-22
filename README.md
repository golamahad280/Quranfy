# Quranfy

A 100% free, ad-free, privacy-first Quran audio player and reader built for study, work, and sleep—packaged as a Progressive Web App (PWA) and an Android APK with Capacitor.

## Download APK

Every push to `main` automatically builds and signs the Android APK in the cloud via GitHub Actions:

- **Latest APK (`apk/` folder)**: [`apk/Quranfy.apk`](./apk/Quranfy.apk) ([browse all builds in `apk/`](./apk/))
- **GitHub Releases (Direct Download)**: [`Quranfy.apk` (Latest Release)](../../releases/latest/download/Quranfy.apk) · [All Releases](../../releases)
- **Install**: Allow unknown sources, open `Quranfy.apk` (Android 7.0 / API 24+). Future signed updates install cleanly over the previous version.

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
