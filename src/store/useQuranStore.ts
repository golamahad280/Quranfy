import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {APP_VERSION} from '../data/i18n';
import {CURATED_PLAYLISTS, FEATURED_RECITERS, MODE_CONFIG} from '../data/recitersAndPlaylists';
import {SURAHS} from '../data/surahs';
import {
  AMBIENT_PRESETS,
  AMBIENT_SOUNDS,
  DEFAULT_CHANNEL_VOLUMES,
} from '../services/ambientAudio';
import {
  AmbientChannelState,
  AmbientMixState,
  AmbientPresetId,
  AmbientSoundType,
  AppSettings,
  BookmarkedAyah,
  FavoriteAyah,
  FavoriteHadith,
  FocusMode,
  HadithBookmark,
  HifzState,
  KhatamState,
  LastReadQuran,
  MoreSectionId,
  Playlist,
  PlaylistItem,
  PlayMode,
  PrayerSettings,
  RecentPlayItem,
  Reciter,
  RepeatMode,
  ShareImagePayload,
  SurahMeta,
  TabId,
} from '../types/quran';

export type SleepTimerType = number | 'end-of-surah' | null;

export interface QueueTrack {
  surahNumber: number;
  reciterId: string;
}

export function createInitialAmbientMix(): AmbientMixState {
  const channels = {} as Record<AmbientSoundType, AmbientChannelState>;
  for (const id of AMBIENT_SOUNDS) {
    channels[id] = {enabled: false, volume: DEFAULT_CHANNEL_VOLUMES[id]};
  }
  return {
    masterVolume: 0.65,
    channels,
  };
}

export function getActiveAmbientSounds(mix: AmbientMixState): AmbientSoundType[] {
  return AMBIENT_SOUNDS.filter((id) => mix.channels[id]?.enabled);
}

const DEFAULT_PRAYER_SETTINGS: PrayerSettings = {
  latitude: 21.4225,
  longitude: 39.8262,
  cityName: 'Makkah',
  method: 'UmmAlQura',
  madhab: 'shafi',
  notifications: {
    fajr: false,
    dhuhr: false,
    asr: false,
    maghrib: false,
    isha: false,
  },
};

const DEFAULT_HIFZ_STATE: HifzState = {
  memorizedAyahKeys: [],
  sessionsCompleted: 0,
  lastSurahNumber: 112,
  lastRangeStart: 1,
  lastRangeEnd: 4,
};

const DEFAULT_KHATAM_STATE: KhatamState = {
  dailyPagesGoal: 20,
  pagesCompleted: 0,
  startedAt: Date.now(),
  historyByDate: {},
};

interface QuranState {
  // Navigation & UI
  activeTab: TabId;
  moreSection: MoreSectionId | null;
  isSearchOpen: boolean;
  readerSurahNumber: number | null;
  readerTargetAyahNumber: number | null;
  tafsirTarget: {surahNumber: number; ayahNumber: number; arabicText: string} | null;
  shareImagePayload: ShareImagePayload | null;
  isFullPlayerOpen: boolean;
  isAmbientSheetOpen: boolean;
  hasCompletedOnboarding: boolean;
  lastSeenVersion: string;
  toastMessage: string | null;

  // Catalogs (populated with defaults, enriched from APIs)
  surahs: SurahMeta[];
  reciters: Reciter[];
  customPlaylists: Playlist[];

  // Focus Mode & Multi-Track Ambient Mixer
  focusMode: FocusMode;
  ambientMix: AmbientMixState;

  // Playback State
  currentSurahNumber: number;
  currentReciterId: string;
  playMode: PlayMode;
  currentAyahNumber: number;
  ayahRepeatTarget: number;
  ayahRepeatCurrent: number;
  ayahRangeEnabled: boolean;
  ayahRangeStart: number;
  ayahRangeEnd: number;
  continueToNextAyah: boolean;

  isPlaying: boolean;
  isLoadingAudio: boolean;
  playingOffline: boolean;
  audioError: string | null;
  currentTimeSec: number;
  durationSec: number;
  playbackSpeed: number;
  repeatMode: RepeatMode;
  shuffle: boolean;

  queue: QueueTrack[];
  queueIndex: number;

  // Sleep Timer
  sleepTimerSetting: SleepTimerType;
  sleepTimerEndsAt: number | null;
  isFadingOut: boolean;

  // Resume, Reading Progress, Favorites, Bookmarks, Notes & Recent
  resumePositionSec: number;
  lastReadQuran: LastReadQuran | null;
  favoriteSurahNumbers: number[];
  favoriteReciterIds: string[];
  favoriteAyahs: FavoriteAyah[];
  bookmarkedAyahs: BookmarkedAyah[];
  ayahNotes: Record<string, string>;
  recentlyPlayed: RecentPlayItem[];

  // Daily Habit & Stats
  dailyGoalMinutes: number;
  listeningSecondsByDate: Record<string, number>;
  reminderEnabled: boolean;
  reminderTime: string;

  // Offline download progress map (`${reciterId}_${surahNumber}` -> %)
  downloadProgress: Record<string, number>;
  downloadedKeys: string[];

  // Hadith persistence
  favoriteHadiths: FavoriteHadith[];
  hadithNotes: Record<string, string>;
  hadithBookmark: HadithBookmark | null;
  hadithFontSize: number;
  hadithLineHeight: number;
  hadithTtsSpeed: number;
  hadithAutoNext: boolean;

  // Offline Worship & Memorization Features
  favoriteAdhkarIds: string[];
  prayerSettings: PrayerSettings;
  hifzState: HifzState;
  khatamState: KhatamState;

  // Settings
  settings: AppSettings;

  // Actions
  setActiveTab: (tab: TabId) => void;
  setMoreSection: (section: MoreSectionId | null) => void;
  openMoreSection: (section: MoreSectionId) => void;
  setSearchOpen: (open: boolean) => void;
  openReader: (surahNumber: number, targetAyahNumber?: number) => void;
  closeReader: () => void;
  openTafsirSheet: (surahNumber: number, ayahNumber: number, arabicText: string) => void;
  closeTafsirSheet: () => void;
  openShareImageModal: (payload: ShareImagePayload) => void;
  closeShareImageModal: () => void;
  setFullPlayerOpen: (open: boolean) => void;
  setAmbientSheetOpen: (open: boolean) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  markVersionSeen: () => void;
  showToast: (msg: string) => void;

  setSurahs: (surahs: SurahMeta[]) => void;
  setReciters: (reciters: Reciter[]) => void;
  setFocusMode: (mode: FocusMode) => void;

  // Ambient Mixer actions
  toggleAmbientChannel: (sound: AmbientSoundType) => AmbientMixState;
  setAmbientChannelVolume: (sound: AmbientSoundType, volume: number) => AmbientMixState;
  setAmbientMasterVolume: (volume: number) => AmbientMixState;
  applyAmbientPreset: (presetId: AmbientPresetId) => AmbientMixState;
  clearAmbientMix: () => AmbientMixState;

  setPlaybackTrack: (
    surahNumber: number,
    reciterId?: string,
    playMode?: PlayMode,
    ayahNumber?: number
  ) => void;
  setQueueAndPlay: (tracks: QueueTrack[], startIndex?: number) => void;
  setPlaybackRuntime: (
    patch: Partial<
      Pick<
        QuranState,
        | 'isPlaying'
        | 'isLoadingAudio'
        | 'playingOffline'
        | 'audioError'
        | 'currentTimeSec'
        | 'durationSec'
        | 'isFadingOut'
        | 'currentAyahNumber'
        | 'ayahRepeatCurrent'
        | 'queueIndex'
      >
    >
  ) => void;
  setPlayMode: (mode: PlayMode) => void;
  setPlaybackSpeed: (speed: number) => void;
  cycleRepeatMode: () => void;
  toggleShuffle: () => void;
  setAyahRepeatTarget: (count: number) => void;
  setAyahRange: (enabled: boolean, start?: number, end?: number) => void;
  setContinueToNextAyah: (val: boolean) => void;
  setSleepTimer: (setting: SleepTimerType) => void;
  setResumePositionSec: (sec: number) => void;
  setLastReadQuran: (surahNumber: number, ayahNumber: number) => void;

  // Favorites, Bookmarks & Notes
  toggleFavoriteSurah: (surahNumber: number) => void;
  toggleFavoriteReciter: (reciterId: string) => void;
  toggleFavoriteAyah: (ayah: FavoriteAyah) => void;
  toggleBookmarkedAyah: (ayah: BookmarkedAyah) => void;
  setAyahNote: (surahNumber: number, ayahNumber: number, note: string) => void;
  recordRecentPlay: (surahNumber: number, reciterId: string) => void;

  // Playlists
  createPlaylist: (name: string) => Playlist;
  renamePlaylist: (id: string, name: string) => void;
  deletePlaylist: (id: string) => void;
  addToPlaylist: (playlistId: string, surahNumber: number, reciterId: string) => void;
  removeFromPlaylist: (playlistId: string, itemId: string) => void;
  movePlaylistItem: (playlistId: string, itemId: string, direction: 'up' | 'down') => void;
  updatePlaylistItemReciter: (playlistId: string, itemId: string, reciterId: string) => void;

  // Habit & Stats
  addPlayedSecond: () => void;
  setDailyGoalMinutes: (mins: number) => void;
  setReminder: (enabled: boolean, time?: string) => void;

  // Downloads
  setDownloadProgress: (key: string, pct: number | null) => void;
  setDownloadedKeys: (keys: string[]) => void;

  // Hadith actions
  toggleFavoriteHadith: (item: FavoriteHadith) => void;
  setHadithNote: (id: string, note: string) => void;
  setHadithBookmark: (bookmark: HadithBookmark | null) => void;
  setHadithFontSize: (size: number) => void;
  setHadithLineHeight: (lh: number) => void;
  setHadithTtsSpeed: (speed: number) => void;
  setHadithAutoNext: (autoNext: boolean) => void;

  // Adhkar, Prayer, Hifz, Khatam actions
  toggleFavoriteAdhkar: (id: string) => void;
  updatePrayerSettings: (patch: Partial<PrayerSettings>) => void;
  toggleMemorizedAyah: (surahNumber: number, ayahNumber: number) => void;
  recordHifzSession: (surahNumber: number, start: number, end: number) => void;
  updateHifzRange: (surahNumber: number, start: number, end: number) => void;
  setKhatamGoal: (dailyPages: number) => void;
  logKhatamPages: (deltaPages: number) => void;
  setKhatamPagesCompleted: (pages: number) => void;
  resetKhatam: () => void;

  // Settings & Backup
  updateSettings: (patch: Partial<AppSettings>) => void;
  exportBackupJson: () => string;
  importBackupJson: (rawJson: string) => {ok: boolean; error?: string};
}

export function getTodayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function calculateStreakDays(logs: Record<string, number>): number {
  const today = new Date();
  let streak = 0;

  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todaySec = logs[formatDate(today)] || 0;
  const cursor = new Date(today);
  if (todaySec < 60) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (true) {
    const key = formatDate(cursor);
    if ((logs[key] || 0) >= 60) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

const VALID_TABS = new Set<TabId>(['home', 'quran', 'hadith', 'library', 'more']);

export const useQuranStore = create<QuranState>()(
  persist(
    (set, get) => ({
      activeTab: 'home',
      moreSection: null,
      isSearchOpen: false,
      readerSurahNumber: null,
      readerTargetAyahNumber: null,
      tafsirTarget: null,
      shareImagePayload: null,
      isFullPlayerOpen: false,
      isAmbientSheetOpen: false,
      hasCompletedOnboarding: false,
      lastSeenVersion: '',
      toastMessage: null,

      surahs: SURAHS,
      reciters: FEATURED_RECITERS,
      customPlaylists: [],

      focusMode: 'study',
      ambientMix: createInitialAmbientMix(),

      currentSurahNumber: 1,
      currentReciterId: 'mishary-alafasy',
      playMode: 'surah',
      currentAyahNumber: 1,
      ayahRepeatTarget: 1,
      ayahRepeatCurrent: 1,
      ayahRangeEnabled: false,
      ayahRangeStart: 1,
      ayahRangeEnd: 7,
      continueToNextAyah: true,

      isPlaying: false,
      isLoadingAudio: false,
      playingOffline: false,
      audioError: null,
      currentTimeSec: 0,
      durationSec: 0,
      playbackSpeed: 1,
      repeatMode: 'off',
      shuffle: false,

      queue: SURAHS.map((s) => ({surahNumber: s.number, reciterId: 'mishary-alafasy'})),
      queueIndex: 0,

      sleepTimerSetting: null,
      sleepTimerEndsAt: null,
      isFadingOut: false,

      resumePositionSec: 0,
      lastReadQuran: null,
      favoriteSurahNumbers: [1, 18, 55, 67],
      favoriteReciterIds: ['mishary-alafasy', 'hazza-balushi'],
      favoriteAyahs: [],
      bookmarkedAyahs: [],
      ayahNotes: {},
      recentlyPlayed: [],

      dailyGoalMinutes: 15,
      listeningSecondsByDate: {},
      reminderEnabled: false,
      reminderTime: '20:30',

      downloadProgress: {},
      downloadedKeys: [],

      favoriteHadiths: [],
      hadithNotes: {},
      hadithBookmark: null,
      hadithFontSize: 24,
      hadithLineHeight: 1.85,
      hadithTtsSpeed: 1,
      hadithAutoNext: false,

      favoriteAdhkarIds: [],
      prayerSettings: DEFAULT_PRAYER_SETTINGS,
      hifzState: DEFAULT_HIFZ_STATE,
      khatamState: DEFAULT_KHATAM_STATE,

      settings: {
        theme: 'auto',
        language: 'en',
        arabicFont: 'amiri',
        arabicFontSize: 30,
        showArabic: true,
        showTranslation: true,
        showBanglaTranslation: false,
        translationEdition: 'en.sahih',
        selectedTafsirId: null,
        audioQuality: 'high',
        defaultReciterId: 'mishary-alafasy',
        enableExperimentalEnglishHadithTts: false,
      },

      setActiveTab: (activeTab) => set({activeTab}),
      setMoreSection: (moreSection) => set({moreSection}),
      openMoreSection: (section) => set({activeTab: 'more', moreSection: section}),
      setSearchOpen: (isSearchOpen) => set({isSearchOpen}),
      openReader: (surahNumber, targetAyahNumber) =>
        set({
          readerSurahNumber: surahNumber,
          readerTargetAyahNumber: targetAyahNumber ?? null,
          lastReadQuran: {
            surahNumber,
            ayahNumber: targetAyahNumber ?? 1,
            updatedAt: Date.now(),
          },
        }),
      closeReader: () =>
        set({readerSurahNumber: null, readerTargetAyahNumber: null, tafsirTarget: null}),
      openTafsirSheet: (surahNumber, ayahNumber, arabicText) =>
        set({tafsirTarget: {surahNumber, ayahNumber, arabicText}}),
      closeTafsirSheet: () => set({tafsirTarget: null}),
      openShareImageModal: (shareImagePayload) => set({shareImagePayload}),
      closeShareImageModal: () => set({shareImagePayload: null}),
      setFullPlayerOpen: (isFullPlayerOpen) => set({isFullPlayerOpen}),
      setAmbientSheetOpen: (isAmbientSheetOpen) => set({isAmbientSheetOpen}),
      completeOnboarding: () =>
        set({hasCompletedOnboarding: true, lastSeenVersion: APP_VERSION}),
      resetOnboarding: () => set({hasCompletedOnboarding: false}),
      markVersionSeen: () => set({lastSeenVersion: APP_VERSION}),
      showToast: (toastMessage) => {
        set({toastMessage});
        setTimeout(() => {
          if (get().toastMessage === toastMessage) {
            set({toastMessage: null});
          }
        }, 3200);
      },

      setSurahs: (surahs) => set({surahs}),
      setReciters: (reciters) => set({reciters}),

      setFocusMode: (mode) => {
        const modeReciter =
          get().reciters.find((r) => r.recommendedModes.includes(mode))?.id ||
          get().currentReciterId;
        const speed = MODE_CONFIG[mode].recommendedSpeed;
        set({
          focusMode: mode,
          playbackSpeed: speed,
          currentReciterId: modeReciter,
        });
      },

      toggleAmbientChannel: (sound) => {
        const prev = get().ambientMix;
        const currentChannel = prev.channels[sound] || {
          enabled: false,
          volume: DEFAULT_CHANNEL_VOLUMES[sound],
        };
        const nextMix: AmbientMixState = {
          ...prev,
          channels: {
            ...prev.channels,
            [sound]: {
              ...currentChannel,
              enabled: !currentChannel.enabled,
            },
          },
        };
        set({ambientMix: nextMix});
        return nextMix;
      },

      setAmbientChannelVolume: (sound, volume) => {
        const prev = get().ambientMix;
        const currentChannel = prev.channels[sound] || {
          enabled: true,
          volume: DEFAULT_CHANNEL_VOLUMES[sound],
        };
        const nextMix: AmbientMixState = {
          ...prev,
          channels: {
            ...prev.channels,
            [sound]: {
              ...currentChannel,
              volume,
            },
          },
        };
        set({ambientMix: nextMix});
        return nextMix;
      },

      setAmbientMasterVolume: (masterVolume) => {
        const prev = get().ambientMix;
        const nextMix: AmbientMixState = {
          ...prev,
          masterVolume,
        };
        set({ambientMix: nextMix});
        return nextMix;
      },

      applyAmbientPreset: (presetId) => {
        const prev = get().ambientMix;
        const nextChannels = {...prev.channels};
        for (const id of AMBIENT_SOUNDS) {
          nextChannels[id] = {
            enabled: false,
            volume: nextChannels[id]?.volume ?? DEFAULT_CHANNEL_VOLUMES[id],
          };
        }
        for (const entry of AMBIENT_PRESETS[presetId]) {
          nextChannels[entry.id] = {
            enabled: true,
            volume: entry.volume,
          };
        }
        const nextMix: AmbientMixState = {
          ...prev,
          channels: nextChannels,
        };
        set({ambientMix: nextMix});
        return nextMix;
      },

      clearAmbientMix: () => {
        const prev = get().ambientMix;
        const nextChannels = {...prev.channels};
        for (const id of AMBIENT_SOUNDS) {
          nextChannels[id] = {
            enabled: false,
            volume: nextChannels[id]?.volume ?? DEFAULT_CHANNEL_VOLUMES[id],
          };
        }
        const nextMix: AmbientMixState = {
          ...prev,
          channels: nextChannels,
        };
        set({ambientMix: nextMix});
        return nextMix;
      },

      setPlaybackTrack: (surahNumber, reciterId, playMode, ayahNumber) => {
        const state = get();
        const nextReciter = reciterId || state.currentReciterId || state.settings.defaultReciterId;
        const nextMode = playMode || state.playMode;
        const surah = state.surahs.find((s) => s.number === surahNumber);
        const maxAyah = surah?.numberOfAyahs ?? 7;

        const qIdx = state.queue.findIndex(
          (t) => t.surahNumber === surahNumber && t.reciterId === nextReciter
        );
        const nextQueue =
          qIdx >= 0
            ? state.queue
            : state.surahs.map((s) => ({surahNumber: s.number, reciterId: nextReciter}));
        const resolvedIdx =
          qIdx >= 0
            ? qIdx
            : nextQueue.findIndex((t) => t.surahNumber === surahNumber);

        set({
          currentSurahNumber: surahNumber,
          currentReciterId: nextReciter,
          playMode: nextMode,
          currentAyahNumber: ayahNumber || 1,
          ayahRepeatCurrent: 1,
          ayahRangeStart: 1,
          ayahRangeEnd: Math.min(maxAyah, 10),
          currentTimeSec: 0,
          resumePositionSec: 0,
          audioError: null,
          queue: nextQueue,
          queueIndex: Math.max(0, resolvedIdx),
        });
      },

      setQueueAndPlay: (tracks, startIndex = 0) => {
        if (tracks.length === 0) return;
        const idx = Math.max(0, Math.min(startIndex, tracks.length - 1));
        const track = tracks[idx];
        set({
          queue: tracks,
          queueIndex: idx,
          currentSurahNumber: track.surahNumber,
          currentReciterId: track.reciterId,
          playMode: 'surah',
          currentAyahNumber: 1,
          currentTimeSec: 0,
          resumePositionSec: 0,
          audioError: null,
        });
      },

      setPlaybackRuntime: (patch) => set(patch),
      setPlayMode: (playMode) => set({playMode, currentTimeSec: 0}),
      setPlaybackSpeed: (playbackSpeed) => set({playbackSpeed}),

      cycleRepeatMode: () => {
        const order: RepeatMode[] = ['off', 'surah', 'all'];
        const cur = get().repeatMode;
        const next = order[(order.indexOf(cur) + 1) % order.length];
        set({repeatMode: next});
      },

      toggleShuffle: () => set((s) => ({shuffle: !s.shuffle})),

      setAyahRepeatTarget: (ayahRepeatTarget) =>
        set({ayahRepeatTarget, ayahRepeatCurrent: 1}),

      setAyahRange: (ayahRangeEnabled, start, end) =>
        set((s) => ({
          ayahRangeEnabled,
          ayahRangeStart: start ?? s.ayahRangeStart,
          ayahRangeEnd: end ?? s.ayahRangeEnd,
        })),

      setContinueToNextAyah: (continueToNextAyah) => set({continueToNextAyah}),

      setSleepTimer: (setting) => {
        if (setting === null) {
          set({sleepTimerSetting: null, sleepTimerEndsAt: null, isFadingOut: false});
        } else if (setting === 'end-of-surah') {
          set({sleepTimerSetting: 'end-of-surah', sleepTimerEndsAt: null, isFadingOut: false});
        } else {
          set({
            sleepTimerSetting: setting,
            sleepTimerEndsAt: Date.now() + setting * 60 * 1000,
            isFadingOut: false,
          });
        }
      },

      setResumePositionSec: (resumePositionSec) => set({resumePositionSec}),

      setLastReadQuran: (surahNumber, ayahNumber) =>
        set({lastReadQuran: {surahNumber, ayahNumber, updatedAt: Date.now()}}),

      toggleFavoriteSurah: (surahNumber) =>
        set((s) => ({
          favoriteSurahNumbers: s.favoriteSurahNumbers.includes(surahNumber)
            ? s.favoriteSurahNumbers.filter((n) => n !== surahNumber)
            : [surahNumber, ...s.favoriteSurahNumbers],
        })),

      toggleFavoriteReciter: (reciterId) =>
        set((s) => ({
          favoriteReciterIds: s.favoriteReciterIds.includes(reciterId)
            ? s.favoriteReciterIds.filter((id) => id !== reciterId)
            : [reciterId, ...s.favoriteReciterIds],
        })),

      toggleFavoriteAyah: (ayah) =>
        set((s) => {
          const exists = s.favoriteAyahs.some((a) => a.id === ayah.id);
          return {
            favoriteAyahs: exists
              ? s.favoriteAyahs.filter((a) => a.id !== ayah.id)
              : [ayah, ...s.favoriteAyahs],
          };
        }),

      toggleBookmarkedAyah: (ayah) =>
        set((s) => {
          const exists = s.bookmarkedAyahs.some((a) => a.id === ayah.id);
          return {
            bookmarkedAyahs: exists
              ? s.bookmarkedAyahs.filter((a) => a.id !== ayah.id)
              : [ayah, ...s.bookmarkedAyahs],
          };
        }),

      setAyahNote: (surahNumber, ayahNumber, note) =>
        set((s) => {
          const key = `${surahNumber}:${ayahNumber}`;
          const next = {...s.ayahNotes};
          const trimmed = note.trim();
          if (trimmed) {
            next[key] = trimmed;
          } else {
            delete next[key];
          }
          return {ayahNotes: next};
        }),

      recordRecentPlay: (surahNumber, reciterId) =>
        set((s) => {
          const filtered = s.recentlyPlayed.filter(
            (r) => !(r.surahNumber === surahNumber && r.reciterId === reciterId)
          );
          return {
            recentlyPlayed: [{surahNumber, reciterId, playedAt: Date.now()}, ...filtered].slice(
              0,
              12
            ),
          };
        }),

      createPlaylist: (name) => {
        const clean = name.trim() || 'My Playlist';
        const newPl: Playlist = {
          id: `custom-${Date.now()}`,
          nameEn: clean,
          nameAr: clean,
          descriptionEn: 'Custom playlist',
          descriptionAr: 'قائمة تشغيل مخصصة',
          isCurated: false,
          items: [],
          createdAt: Date.now(),
        };
        set((s) => ({customPlaylists: [newPl, ...s.customPlaylists]}));
        return newPl;
      },

      renamePlaylist: (id, name) => {
        const clean = name.trim();
        if (!clean) return;
        set((s) => ({
          customPlaylists: s.customPlaylists.map((p) =>
            p.id === id ? {...p, nameEn: clean, nameAr: clean} : p
          ),
        }));
      },

      deletePlaylist: (id) =>
        set((s) => ({
          customPlaylists: s.customPlaylists.filter((p) => p.id !== id),
        })),

      addToPlaylist: (playlistId, surahNumber, reciterId) =>
        set((s) => ({
          customPlaylists: s.customPlaylists.map((p) => {
            if (p.id !== playlistId) return p;
            const item: PlaylistItem = {
              id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              surahNumber,
              reciterId,
            };
            return {...p, items: [...p.items, item]};
          }),
        })),

      removeFromPlaylist: (playlistId, itemId) =>
        set((s) => ({
          customPlaylists: s.customPlaylists.map((p) =>
            p.id === playlistId
              ? {...p, items: p.items.filter((it) => it.id !== itemId)}
              : p
          ),
        })),

      movePlaylistItem: (playlistId, itemId, direction) =>
        set((s) => ({
          customPlaylists: s.customPlaylists.map((p) => {
            if (p.id !== playlistId) return p;
            const idx = p.items.findIndex((it) => it.id === itemId);
            if (idx < 0) return p;
            const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
            if (targetIdx < 0 || targetIdx >= p.items.length) return p;
            const copy = [...p.items];
            const [moved] = copy.splice(idx, 1);
            copy.splice(targetIdx, 0, moved);
            return {...p, items: copy};
          }),
        })),

      updatePlaylistItemReciter: (playlistId, itemId, reciterId) =>
        set((s) => ({
          customPlaylists: s.customPlaylists.map((p) =>
            p.id === playlistId
              ? {
                  ...p,
                  items: p.items.map((it) => (it.id === itemId ? {...it, reciterId} : it)),
                }
              : p
          ),
        })),

      addPlayedSecond: () =>
        set((s) => {
          const today = getTodayDateKey();
          const prev = s.listeningSecondsByDate[today] || 0;
          return {
            listeningSecondsByDate: {
              ...s.listeningSecondsByDate,
              [today]: prev + 1,
            },
          };
        }),

      setDailyGoalMinutes: (dailyGoalMinutes) => set({dailyGoalMinutes}),

      setReminder: (reminderEnabled, time) =>
        set((s) => ({
          reminderEnabled,
          reminderTime: time ?? s.reminderTime,
        })),

      setDownloadProgress: (key, pct) =>
        set((s) => {
          const next = {...s.downloadProgress};
          if (pct === null) {
            delete next[key];
          } else {
            next[key] = pct;
          }
          return {downloadProgress: next};
        }),

      setDownloadedKeys: (downloadedKeys) => set({downloadedKeys}),

      toggleFavoriteHadith: (item) =>
        set((s) => {
          const exists = s.favoriteHadiths.some((h) => h.id === item.id);
          return {
            favoriteHadiths: exists
              ? s.favoriteHadiths.filter((h) => h.id !== item.id)
              : [item, ...s.favoriteHadiths],
          };
        }),
      setHadithNote: (id, note) =>
        set((s) => {
          const next = {...s.hadithNotes};
          const trimmed = note.trim();
          if (trimmed) {
            next[id] = trimmed;
          } else {
            delete next[id];
          }
          return {hadithNotes: next};
        }),
      setHadithBookmark: (hadithBookmark) => set({hadithBookmark}),
      setHadithFontSize: (hadithFontSize) => set({hadithFontSize}),
      setHadithLineHeight: (hadithLineHeight) => set({hadithLineHeight}),
      setHadithTtsSpeed: (hadithTtsSpeed) => set({hadithTtsSpeed}),
      setHadithAutoNext: (hadithAutoNext) => set({hadithAutoNext}),

      toggleFavoriteAdhkar: (id) =>
        set((s) => ({
          favoriteAdhkarIds: s.favoriteAdhkarIds.includes(id)
            ? s.favoriteAdhkarIds.filter((x) => x !== id)
            : [id, ...s.favoriteAdhkarIds],
        })),

      updatePrayerSettings: (patch) =>
        set((s) => ({
          prayerSettings: {
            ...s.prayerSettings,
            ...patch,
            notifications: patch.notifications
              ? {...s.prayerSettings.notifications, ...patch.notifications}
              : s.prayerSettings.notifications,
          },
        })),

      toggleMemorizedAyah: (surahNumber, ayahNumber) =>
        set((s) => {
          const key = `${surahNumber}:${ayahNumber}`;
          const exists = s.hifzState.memorizedAyahKeys.includes(key);
          return {
            hifzState: {
              ...s.hifzState,
              memorizedAyahKeys: exists
                ? s.hifzState.memorizedAyahKeys.filter((k) => k !== key)
                : [key, ...s.hifzState.memorizedAyahKeys],
            },
          };
        }),

      recordHifzSession: (surahNumber, start, end) =>
        set((s) => ({
          hifzState: {
            ...s.hifzState,
            sessionsCompleted: s.hifzState.sessionsCompleted + 1,
            lastSurahNumber: surahNumber,
            lastRangeStart: start,
            lastRangeEnd: end,
          },
        })),

      updateHifzRange: (surahNumber, start, end) =>
        set((s) => ({
          hifzState: {
            ...s.hifzState,
            lastSurahNumber: surahNumber,
            lastRangeStart: start,
            lastRangeEnd: end,
          },
        })),

      setKhatamGoal: (dailyPagesGoal) =>
        set((s) => ({
          khatamState: {
            ...s.khatamState,
            dailyPagesGoal: Math.max(1, Math.min(100, dailyPagesGoal)),
          },
        })),

      logKhatamPages: (deltaPages) =>
        set((s) => {
          const today = getTodayDateKey();
          const nextTotal = Math.max(0, Math.min(604, s.khatamState.pagesCompleted + deltaPages));
          const prevToday = s.khatamState.historyByDate[today] || 0;
          return {
            khatamState: {
              ...s.khatamState,
              pagesCompleted: nextTotal,
              historyByDate: {
                ...s.khatamState.historyByDate,
                [today]: Math.max(0, prevToday + deltaPages),
              },
            },
          };
        }),

      setKhatamPagesCompleted: (pages) =>
        set((s) => ({
          khatamState: {
            ...s.khatamState,
            pagesCompleted: Math.max(0, Math.min(604, pages)),
          },
        })),

      resetKhatam: () =>
        set((s) => ({
          khatamState: {
            ...s.khatamState,
            pagesCompleted: 0,
            startedAt: Date.now(),
            historyByDate: {},
          },
        })),

      updateSettings: (patch) =>
        set((s) => ({
          settings: {...s.settings, ...patch},
        })),

      exportBackupJson: () => {
        const s = get();
        const payload = {
          app: 'Quranfy',
          schemaVersion: 1,
          appVersion: APP_VERSION,
          exportedAt: new Date().toISOString(),
          data: {
            customPlaylists: s.customPlaylists,
            focusMode: s.focusMode,
            ambientMix: s.ambientMix,
            lastReadQuran: s.lastReadQuran,
            favoriteSurahNumbers: s.favoriteSurahNumbers,
            favoriteReciterIds: s.favoriteReciterIds,
            favoriteAyahs: s.favoriteAyahs,
            bookmarkedAyahs: s.bookmarkedAyahs,
            ayahNotes: s.ayahNotes,
            favoriteHadiths: s.favoriteHadiths,
            hadithNotes: s.hadithNotes,
            hadithBookmark: s.hadithBookmark,
            hadithFontSize: s.hadithFontSize,
            hadithLineHeight: s.hadithLineHeight,
            recentlyPlayed: s.recentlyPlayed,
            dailyGoalMinutes: s.dailyGoalMinutes,
            listeningSecondsByDate: s.listeningSecondsByDate,
            reminderEnabled: s.reminderEnabled,
            reminderTime: s.reminderTime,
            favoriteAdhkarIds: s.favoriteAdhkarIds,
            prayerSettings: s.prayerSettings,
            hifzState: s.hifzState,
            khatamState: s.khatamState,
            settings: s.settings,
          },
        };
        return JSON.stringify(payload, null, 2);
      },

      importBackupJson: (rawJson) => {
        try {
          const parsed = JSON.parse(rawJson) as Record<string, unknown>;
          if (!parsed || typeof parsed !== 'object' || parsed.app !== 'Quranfy') {
            return {ok: false, error: 'Invalid backup file format (expected Quranfy JSON).'};
          }
          const data = parsed.data as Record<string, unknown> | undefined;
          if (!data || typeof data !== 'object') {
            return {ok: false, error: 'Backup file is missing data section.'};
          }

          const current = get();
          set({
            customPlaylists: Array.isArray(data.customPlaylists)
              ? (data.customPlaylists as Playlist[])
              : current.customPlaylists,
            favoriteSurahNumbers: Array.isArray(data.favoriteSurahNumbers)
              ? (data.favoriteSurahNumbers as number[])
              : current.favoriteSurahNumbers,
            favoriteReciterIds: Array.isArray(data.favoriteReciterIds)
              ? (data.favoriteReciterIds as string[])
              : current.favoriteReciterIds,
            favoriteAyahs: Array.isArray(data.favoriteAyahs)
              ? (data.favoriteAyahs as FavoriteAyah[])
              : current.favoriteAyahs,
            bookmarkedAyahs: Array.isArray(data.bookmarkedAyahs)
              ? (data.bookmarkedAyahs as BookmarkedAyah[])
              : current.bookmarkedAyahs,
            ayahNotes:
              data.ayahNotes && typeof data.ayahNotes === 'object'
                ? (data.ayahNotes as Record<string, string>)
                : current.ayahNotes,
            favoriteHadiths: Array.isArray(data.favoriteHadiths)
              ? (data.favoriteHadiths as FavoriteHadith[])
              : current.favoriteHadiths,
            hadithNotes:
              data.hadithNotes && typeof data.hadithNotes === 'object'
                ? (data.hadithNotes as Record<string, string>)
                : current.hadithNotes,
            hadithBookmark:
              data.hadithBookmark && typeof data.hadithBookmark === 'object'
                ? (data.hadithBookmark as HadithBookmark)
                : current.hadithBookmark,
            lastReadQuran:
              data.lastReadQuran && typeof data.lastReadQuran === 'object'
                ? (data.lastReadQuran as LastReadQuran)
                : current.lastReadQuran,
            recentlyPlayed: Array.isArray(data.recentlyPlayed)
              ? (data.recentlyPlayed as RecentPlayItem[])
              : current.recentlyPlayed,
            listeningSecondsByDate:
              data.listeningSecondsByDate && typeof data.listeningSecondsByDate === 'object'
                ? (data.listeningSecondsByDate as Record<string, number>)
                : current.listeningSecondsByDate,
            dailyGoalMinutes:
              typeof data.dailyGoalMinutes === 'number'
                ? data.dailyGoalMinutes
                : current.dailyGoalMinutes,
            favoriteAdhkarIds: Array.isArray(data.favoriteAdhkarIds)
              ? (data.favoriteAdhkarIds as string[])
              : current.favoriteAdhkarIds,
            prayerSettings:
              data.prayerSettings && typeof data.prayerSettings === 'object'
                ? {...current.prayerSettings, ...(data.prayerSettings as Partial<PrayerSettings>)}
                : current.prayerSettings,
            hifzState:
              data.hifzState && typeof data.hifzState === 'object'
                ? {...current.hifzState, ...(data.hifzState as Partial<HifzState>)}
                : current.hifzState,
            khatamState:
              data.khatamState && typeof data.khatamState === 'object'
                ? {...current.khatamState, ...(data.khatamState as Partial<KhatamState>)}
                : current.khatamState,
            settings:
              data.settings && typeof data.settings === 'object'
                ? {...current.settings, ...(data.settings as Partial<AppSettings>)}
                : current.settings,
          });
          return {ok: true};
        } catch {
          return {ok: false, error: 'Could not parse JSON backup file.'};
        }
      },
    }),
    {
      name: 'quranfy-store-v1',
      merge: (persisted, current) => {
        const p = (persisted || {}) as Partial<QuranState>;
        const baseMix = createInitialAmbientMix();
        const mergedChannels = {...baseMix.channels};
        if (p.ambientMix?.channels) {
          for (const id of AMBIENT_SOUNDS) {
            if (p.ambientMix.channels[id]) {
              mergedChannels[id] = p.ambientMix.channels[id];
            }
          }
        }
        const rawTab = p.activeTab as TabId | undefined;
        const safeTab: TabId = rawTab && VALID_TABS.has(rawTab) ? rawTab : 'home';
        return {
          ...current,
          ...p,
          activeTab: safeTab,
          prayerSettings: {
            ...current.prayerSettings,
            ...(p.prayerSettings || {}),
            notifications: {
              ...current.prayerSettings.notifications,
              ...(p.prayerSettings?.notifications || {}),
            },
          },
          hifzState: {
            ...current.hifzState,
            ...(p.hifzState || {}),
          },
          khatamState: {
            ...current.khatamState,
            ...(p.khatamState || {}),
          },
          settings: {
            ...current.settings,
            ...(p.settings || {}),
          },
          ambientMix: {
            masterVolume: p.ambientMix?.masterVolume ?? baseMix.masterVolume,
            channels: mergedChannels,
          },
        };
      },
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        lastSeenVersion: state.lastSeenVersion,
        customPlaylists: state.customPlaylists,
        focusMode: state.focusMode,
        ambientMix: state.ambientMix,
        currentSurahNumber: state.currentSurahNumber,
        currentReciterId: state.currentReciterId,
        playMode: state.playMode,
        currentAyahNumber: state.currentAyahNumber,
        playbackSpeed: state.playbackSpeed,
        repeatMode: state.repeatMode,
        shuffle: state.shuffle,
        resumePositionSec: state.resumePositionSec,
        lastReadQuran: state.lastReadQuran,
        favoriteSurahNumbers: state.favoriteSurahNumbers,
        favoriteReciterIds: state.favoriteReciterIds,
        favoriteAyahs: state.favoriteAyahs,
        bookmarkedAyahs: state.bookmarkedAyahs,
        ayahNotes: state.ayahNotes,
        favoriteHadiths: state.favoriteHadiths,
        hadithNotes: state.hadithNotes,
        hadithBookmark: state.hadithBookmark,
        hadithFontSize: state.hadithFontSize,
        hadithLineHeight: state.hadithLineHeight,
        hadithTtsSpeed: state.hadithTtsSpeed,
        hadithAutoNext: state.hadithAutoNext,
        recentlyPlayed: state.recentlyPlayed,
        dailyGoalMinutes: state.dailyGoalMinutes,
        listeningSecondsByDate: state.listeningSecondsByDate,
        reminderEnabled: state.reminderEnabled,
        reminderTime: state.reminderTime,
        favoriteAdhkarIds: state.favoriteAdhkarIds,
        prayerSettings: state.prayerSettings,
        hifzState: state.hifzState,
        khatamState: state.khatamState,
        settings: state.settings,
      }),
    }
  )
);

export function getAllPlaylists(customPlaylists: Playlist[]): Playlist[] {
  return [...customPlaylists, ...CURATED_PLAYLISTS];
}
