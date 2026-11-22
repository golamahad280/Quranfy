import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {APP_VERSION} from '../data/i18n';
import {CURATED_PLAYLISTS, FEATURED_RECITERS, MODE_CONFIG} from '../data/recitersAndPlaylists';
import {SURAHS} from '../data/surahs';
import {
  AmbientSoundType,
  AppSettings,
  FavoriteAyah,
  FocusMode,
  Playlist,
  PlaylistItem,
  PlayMode,
  RecentPlayItem,
  Reciter,
  RepeatMode,
  SurahMeta,
  TabId,
} from '../types/quran';

export type SleepTimerType = number | 'end-of-surah' | null;

export interface QueueTrack {
  surahNumber: number;
  reciterId: string;
}

interface QuranState {
  // Navigation & UI
  activeTab: TabId;
  readerSurahNumber: number | null; // When non-null, Read & Listen screen is open
  isFullPlayerOpen: boolean;
  isAmbientSheetOpen: boolean;
  hasCompletedOnboarding: boolean;
  lastSeenVersion: string;
  toastMessage: string | null;

  // Catalogs (populated with defaults, enriched from APIs)
  surahs: SurahMeta[];
  reciters: Reciter[];
  customPlaylists: Playlist[];

  // Focus Mode & Ambient Mixer
  focusMode: FocusMode;
  ambientSound: AmbientSoundType | null;
  ambientVolume: number;

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

  // Resume & Favorites & Recent
  resumePositionSec: number;
  favoriteSurahNumbers: number[];
  favoriteReciterIds: string[];
  favoriteAyahs: FavoriteAyah[];
  recentlyPlayed: RecentPlayItem[];

  // Daily Habit & Stats
  dailyGoalMinutes: number;
  listeningSecondsByDate: Record<string, number>;
  reminderEnabled: boolean;
  reminderTime: string;

  // Offline download progress map (`${reciterId}_${surahNumber}` -> %)
  downloadProgress: Record<string, number>;
  downloadedKeys: string[];

  // Settings
  settings: AppSettings;

  // Actions
  setActiveTab: (tab: TabId) => void;
  openReader: (surahNumber: number) => void;
  closeReader: () => void;
  setFullPlayerOpen: (open: boolean) => void;
  setAmbientSheetOpen: (open: boolean) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  markVersionSeen: () => void;
  showToast: (msg: string) => void;

  setSurahs: (surahs: SurahMeta[]) => void;
  setReciters: (reciters: Reciter[]) => void;
  setFocusMode: (mode: FocusMode) => void;
  setAmbientSound: (sound: AmbientSoundType | null) => void;
  setAmbientVolume: (vol: number) => void;

  setPlaybackTrack: (surahNumber: number, reciterId?: string, playMode?: PlayMode, ayahNumber?: number) => void;
  setQueueAndPlay: (tracks: QueueTrack[], startIndex?: number) => void;
  setPlaybackRuntime: (patch: Partial<Pick<QuranState, 'isPlaying' | 'isLoadingAudio' | 'playingOffline' | 'audioError' | 'currentTimeSec' | 'durationSec' | 'isFadingOut' | 'currentAyahNumber' | 'ayahRepeatCurrent' | 'queueIndex'>>) => void;
  setPlayMode: (mode: PlayMode) => void;
  setPlaybackSpeed: (speed: number) => void;
  cycleRepeatMode: () => void;
  toggleShuffle: () => void;
  setAyahRepeatTarget: (count: number) => void;
  setAyahRange: (enabled: boolean, start?: number, end?: number) => void;
  setContinueToNextAyah: (val: boolean) => void;
  setSleepTimer: (setting: SleepTimerType) => void;
  setResumePositionSec: (sec: number) => void;

  // Favorites
  toggleFavoriteSurah: (surahNumber: number) => void;
  toggleFavoriteReciter: (reciterId: string) => void;
  toggleFavoriteAyah: (ayah: FavoriteAyah) => void;
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

  // Settings
  updateSettings: (patch: Partial<AppSettings>) => void;
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

  // Check if today has >= 60s; if not, check starting from yesterday
  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todaySec = logs[formatDate(today)] || 0;
  let cursor = new Date(today);
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

export const useQuranStore = create<QuranState>()(
  persist(
    (set, get) => ({
      activeTab: 'home',
      readerSurahNumber: null,
      isFullPlayerOpen: false,
      isAmbientSheetOpen: false,
      hasCompletedOnboarding: false,
      lastSeenVersion: '',
      toastMessage: null,

      surahs: SURAHS,
      reciters: FEATURED_RECITERS,
      customPlaylists: [],

      focusMode: 'study',
      ambientSound: null,
      ambientVolume: 0.32,

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
      favoriteSurahNumbers: [1, 18, 55, 67],
      favoriteReciterIds: ['mishary-alafasy', 'hazza-balushi'],
      favoriteAyahs: [],
      recentlyPlayed: [],

      dailyGoalMinutes: 15,
      listeningSecondsByDate: {},
      reminderEnabled: false,
      reminderTime: '20:30',

      downloadProgress: {},
      downloadedKeys: [],

      settings: {
        theme: 'auto',
        language: 'en',
        arabicFont: 'amiri',
        arabicFontSize: 30,
        showTranslation: true,
        translationEdition: 'en.sahih',
        audioQuality: 'high',
        defaultReciterId: 'mishary-alafasy',
      },

      setActiveTab: (activeTab) => set({activeTab}),
      openReader: (surahNumber) => set({readerSurahNumber: surahNumber}),
      closeReader: () => set({readerSurahNumber: null}),
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

      setAmbientSound: (ambientSound) => set({ambientSound}),
      setAmbientVolume: (ambientVolume) => set({ambientVolume}),

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

      recordRecentPlay: (surahNumber, reciterId) =>
        set((s) => {
          const filtered = s.recentlyPlayed.filter(
            (r) => !(r.surahNumber === surahNumber && r.reciterId === reciterId)
          );
          return {
            recentlyPlayed: [{surahNumber, reciterId, playedAt: Date.now()}, ...filtered].slice(0, 12),
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
                  items: p.items.map((it) =>
                    it.id === itemId ? {...it, reciterId} : it
                  ),
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

      updateSettings: (patch) =>
        set((s) => ({
          settings: {...s.settings, ...patch},
        })),
    }),
    {
      name: 'quranfy-store-v1',
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        lastSeenVersion: state.lastSeenVersion,
        customPlaylists: state.customPlaylists,
        focusMode: state.focusMode,
        ambientSound: state.ambientSound,
        ambientVolume: state.ambientVolume,
        currentSurahNumber: state.currentSurahNumber,
        currentReciterId: state.currentReciterId,
        playMode: state.playMode,
        currentAyahNumber: state.currentAyahNumber,
        playbackSpeed: state.playbackSpeed,
        repeatMode: state.repeatMode,
        shuffle: state.shuffle,
        resumePositionSec: state.resumePositionSec,
        favoriteSurahNumbers: state.favoriteSurahNumbers,
        favoriteReciterIds: state.favoriteReciterIds,
        favoriteAyahs: state.favoriteAyahs,
        recentlyPlayed: state.recentlyPlayed,
        dailyGoalMinutes: state.dailyGoalMinutes,
        listeningSecondsByDate: state.listeningSecondsByDate,
        reminderEnabled: state.reminderEnabled,
        reminderTime: state.reminderTime,
        settings: state.settings,
      }),
    }
  )
);

export function getAllPlaylists(customPlaylists: Playlist[]): Playlist[] {
  return [...customPlaylists, ...CURATED_PLAYLISTS];
}
