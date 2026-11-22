export type FocusMode = 'study' | 'work' | 'sleep';

export type AmbientSoundType =
  | 'soft-rain'
  | 'heavy-rain'
  | 'forest-birds'
  | 'ocean-waves'
  | 'gentle-stream'
  | 'night-crickets'
  | 'soft-wind'
  | 'fireplace'
  | 'brown-noise';

export type AmbientPresetId = 'deep-sleep' | 'focus' | 'calm-night' | 'cozy';

export interface AmbientChannelState {
  enabled: boolean;
  volume: number; // 0..1
}

export interface AmbientMixState {
  masterVolume: number; // 0..1
  channels: Record<AmbientSoundType, AmbientChannelState>;
}

export type RepeatMode = 'off' | 'surah' | 'all';

export type PlayMode = 'surah' | 'ayah';

export type AppLanguage = 'en' | 'ar' | 'bn';

export type TabId = 'home' | 'hadith' | 'search' | 'library' | 'stats' | 'settings';

export interface SurahMeta {
  number: number;
  name: string; // Arabic name
  englishName: string; // Transliterated name e.g. Al-Fatihah
  englishNameTranslation: string; // Meaning e.g. The Opening
  numberOfAyahs: number;
  revelationType: 'Meccan' | 'Medinan';
}

export interface AyahItem {
  number: number; // Global ayah number
  numberInSurah: number;
  text: string;
  translation: string;
  juz: number;
  page: number;
}

export interface SurahDetail {
  surahNumber: number;
  translationEdition: string;
  ayahs: AyahItem[];
  fetchedAt: number;
}

export interface Reciter {
  id: string;
  nameEn: string;
  nameAr: string;
  serverUrl: string; // Full-surah mp3 server trailing slash
  fallbackServerUrl?: string;
  everyAyahFolder: string; // Ayah-by-ayah folder
  everyAyahLowFolder?: string;
  styleEn: string;
  styleAr: string;
  recommendedModes: FocusMode[];
  availableSurahs?: number[]; // Undefined = all 114
  archiveSurahMap?: Record<number, string>;
  isCommunityExtra?: boolean;
}

export interface PlaylistItem {
  id: string;
  surahNumber: number;
  reciterId: string;
}

export interface Playlist {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  mode?: FocusMode;
  isCurated: boolean;
  items: PlaylistItem[];
  createdAt: number;
}

export interface DownloadRecord {
  key: string; // `${reciterId}_${surahNumber}`
  reciterId: string;
  reciterNameEn: string;
  reciterNameAr: string;
  surahNumber: number;
  surahNameEn: string;
  surahNameAr: string;
  sizeBytes: number;
  downloadedAt: number;
  blob?: Blob;
  nativeFilePath?: string;
}

export interface FavoriteAyah {
  id: string; // `${surahNumber}:${ayahNumber}`
  surahNumber: number;
  ayahNumber: number;
  surahNameEn: string;
  surahNameAr: string;
  arabicText: string;
  translationText: string;
  savedAt: number;
}

export interface RecentPlayItem {
  surahNumber: number;
  reciterId: string;
  playedAt: number;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  language: AppLanguage;
  arabicFont: 'amiri' | 'scheherazade';
  arabicFontSize: number; // px, 22 - 44
  showArabic: boolean;
  showTranslation: boolean;
  showBanglaTranslation: boolean;
  translationEdition: string;
  selectedTafsirId: number | null;
  audioQuality: 'high' | 'standard';
  defaultReciterId: string;
}

export interface TranslationOption {
  edition: string;
  name: string;
  language: string;
}

export interface TafsirResource {
  id: number;
  name: string;
  author_name: string;
  slug: string;
  language_name: string;
  translated_name?: {
    name: string;
    language_name: string;
  };
}

export interface TafsirAyahContent {
  tafsirId: number;
  verseKey: string; // `${surah}:${ayah}`
  resourceName: string;
  languageName: string;
  sanitizedHtml: string;
  fetchedAt: number;
}

export type HadithCollectionSlug =
  | 'bukhari'
  | 'muslim'
  | 'abudawud'
  | 'tirmidhi'
  | 'nasai'
  | 'ibnmajah'
  | 'malik';

export interface HadithEditionEntry {
  name: string;
  collection: string;
  book?: string;
  author?: string;
  language: string;
  direction?: 'ltr' | 'rtl';
  link: string;
  linkmin: string;
}

export interface HadithSectionMeta {
  sectionNumber: string;
  title: string;
  hadithFirst?: number;
  hadithLast?: number;
}

export interface HadithCollectionInfo {
  slug: HadithCollectionSlug;
  nameEn: string;
  nameAr: string;
  nameBn: string;
  arabicEdition: string | null;
  englishEdition: string | null;
  banglaEdition: string | null;
  sections: HadithSectionMeta[];
}

export interface HadithGrade {
  name: string;
  grade: string;
}

export interface HadithEntry {
  hadithNumber: number;
  arabicNumber?: number | string;
  arabicText: string;
  englishText: string;
  banglaText: string;
  grades: HadithGrade[];
  bookNumber?: number;
  bookHadithNumber?: number;
  sectionNumber?: string;
  sectionTitle?: string;
}

export interface HadithSectionCache {
  collectionSlug: HadithCollectionSlug;
  sectionNumber: string;
  entries: HadithEntry[];
  hasBangla: boolean;
  fetchedAt: number;
}

export interface HadithBookmark {
  collectionSlug: HadithCollectionSlug;
  sectionNumber: string;
  hadithNumber: number;
  sectionTitle: string;
  updatedAt: number;
}

export interface FavoriteHadith {
  id: string; // `${collectionSlug}:${hadithNumber}`
  collectionSlug: HadithCollectionSlug;
  sectionNumber: string;
  hadithNumber: number;
  arabicText: string;
  englishText: string;
  banglaText: string;
  grades: HadithGrade[];
  savedAt: number;
}
