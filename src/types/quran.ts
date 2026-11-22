export type FocusMode = 'study' | 'work' | 'sleep';

export type AmbientSoundType = 'rain' | 'night' | 'forest' | 'ocean' | 'wind' | 'white';

export type RepeatMode = 'off' | 'surah' | 'all';

export type PlayMode = 'surah' | 'ayah';

export type TabId = 'home' | 'search' | 'library' | 'stats' | 'settings';

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
  blob: Blob;
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
  language: 'en' | 'ar';
  arabicFont: 'amiri' | 'scheherazade';
  arabicFontSize: number; // px, 22 - 42
  showTranslation: boolean;
  translationEdition: string;
  audioQuality: 'high' | 'standard';
  defaultReciterId: string;
}

export interface TranslationOption {
  edition: string;
  name: string;
  language: string;
}
