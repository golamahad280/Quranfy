import {Capacitor} from '@capacitor/core';
import {Directory, Filesystem} from '@capacitor/filesystem';
import {ForegroundService, Importance} from '@capawesome-team/capacitor-android-foreground-service';
import {MediaSession} from '@capgo/capacitor-media-session';
import {useQuranStore} from '../store/useQuranStore';
import {ambientEngine} from './ambientAudio';
import {getAudioDownload} from './db';
import {getAyahAudioUrl, getSurahAudioUrl} from './quranApi';

const PLAYBACK_CHANNEL_ID = 'quranfy_playback';
const PLAYBACK_NOTIFICATION_ID = 11400;

class SharedAudioManager {
  private audio: HTMLAudioElement;
  private currentBlobUrl: string | null = null;
  private habitInterval: number | null = null;
  private fadeTimer: number | null = null;
  private initialized = false;
  private lastLoadedSignature = '';
  private lastResumeSavedAt = 0;
  private lastPositionSyncAt = 0;
  private foregroundChannelCreated = false;
  private foregroundRunning = false;

  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'metadata';
  }

  public init(): void {
    if (this.initialized) return;
    this.initialized = true;

    this.audio.addEventListener('loadedmetadata', () => {
      const store = useQuranStore.getState();
      store.setPlaybackRuntime({
        durationSec: Number.isFinite(this.audio.duration) ? this.audio.duration : 0,
        isLoadingAudio: false,
      });
      this.audio.playbackRate = store.playbackSpeed;
      void this.updateMediaSession();
    });

    this.audio.addEventListener('canplay', () => {
      useQuranStore.getState().setPlaybackRuntime({isLoadingAudio: false, audioError: null});
    });

    this.audio.addEventListener('waiting', () => {
      useQuranStore.getState().setPlaybackRuntime({isLoadingAudio: true});
    });

    this.audio.addEventListener('playing', () => {
      const store = useQuranStore.getState();
      store.setPlaybackRuntime({isPlaying: true, isLoadingAudio: false, audioError: null});
      ambientEngine.setRecitationActive(true);
      void this.updateMediaSession();
      void this.syncForegroundService(true);
    });

    this.audio.addEventListener('pause', () => {
      const store = useQuranStore.getState();
      store.setPlaybackRuntime({isPlaying: false});
      ambientEngine.setRecitationActive(false);
      this.lastResumeSavedAt = Date.now();
      store.setResumePositionSec(this.audio.currentTime || 0);
      void this.updateMediaSession();
      void this.syncForegroundService(false);
    });

    this.audio.addEventListener('timeupdate', () => {
      const store = useQuranStore.getState();
      const ct = this.audio.currentTime || 0;
      store.setPlaybackRuntime({currentTimeSec: ct});

      const now = Date.now();
      if (now - this.lastResumeSavedAt >= 5000) {
        this.lastResumeSavedAt = now;
        store.setResumePositionSec(ct);
      }

      if (now - this.lastPositionSyncAt >= 5000) {
        this.lastPositionSyncAt = now;
        void this.syncPositionState();
      }
    });

    this.audio.addEventListener('ended', () => {
      void this.handleTrackEnded();
    });

    this.audio.addEventListener('error', () => {
      const store = useQuranStore.getState();
      const reciter = store.reciters.find((r) => r.id === store.currentReciterId);
      if (
        store.playMode === 'surah' &&
        reciter?.fallbackServerUrl &&
        !this.audio.src.includes(reciter.fallbackServerUrl)
      ) {
        const padded = String(store.currentSurahNumber).padStart(3, '0');
        this.audio.src = `${reciter.fallbackServerUrl}${padded}.mp3`;
        this.audio.play().catch(() => {});
        return;
      }
      store.setPlaybackRuntime({
        isPlaying: false,
        isLoadingAudio: false,
        audioError:
          store.settings.language === 'ar'
            ? 'تعذر تشغيل هذا المقطع دون إنترنت. جرّب تحميل السورة أو التبديل لقارئ آخر.'
            : 'Unable to load audio stream. Check connection or play a downloaded surah.',
      });
      void this.syncForegroundService(false);
    });

    // Single authoritative 1-second loop for active listening seconds & sleep timer
    this.habitInterval = window.setInterval(() => {
      const store = useQuranStore.getState();
      if (!this.audio.paused && !this.audio.ended && this.audio.readyState >= 2) {
        store.addPlayedSecond();
      }
      this.checkSleepTimerTick();
    }, 1000);

    void this.setupMediaSessionHandlers();
  }

  private async ensureForegroundChannel(): Promise<void> {
    if (this.foregroundChannelCreated || Capacitor.getPlatform() !== 'android') return;
    try {
      const perms = await ForegroundService.checkPermissions();
      if (perms.display !== 'granted') {
        await ForegroundService.requestPermissions();
      }
      await ForegroundService.createNotificationChannel({
        id: PLAYBACK_CHANNEL_ID,
        name: 'Quran Playback',
        description: 'Keeps Quran audio playing with the screen off',
        importance: Importance.Low,
      });
      this.foregroundChannelCreated = true;
    } catch {
      // Ignore permission or channel errors
    }
  }

  private async syncForegroundService(active: boolean): Promise<void> {
    if (Capacitor.getPlatform() !== 'android') return;
    try {
      if (active) {
        await this.ensureForegroundChannel();
        const store = useQuranStore.getState();
        const surah = store.surahs.find((s) => s.number === store.currentSurahNumber);
        const reciter = store.reciters.find((r) => r.id === store.currentReciterId);
        const title = surah
          ? store.playMode === 'ayah'
            ? `${surah.englishName} · Ayah ${store.currentAyahNumber}`
            : `${surah.englishName} (${surah.name})`
          : 'Quranfy';
        const body = reciter ? reciter.nameEn : 'Quran Audio';

        if (!this.foregroundRunning) {
          await ForegroundService.startForegroundService({
            id: PLAYBACK_NOTIFICATION_ID,
            title,
            body,
            smallIcon: 'ic_stat_quranfy',
            notificationChannelId: PLAYBACK_CHANNEL_ID,
            silent: true,
          });
          this.foregroundRunning = true;
        } else {
          await ForegroundService.updateForegroundService({
            id: PLAYBACK_NOTIFICATION_ID,
            title,
            body,
            smallIcon: 'ic_stat_quranfy',
            notificationChannelId: PLAYBACK_CHANNEL_ID,
            silent: true,
          });
        }
      } else if (this.foregroundRunning) {
        await ForegroundService.stopForegroundService();
        this.foregroundRunning = false;
      }
    } catch {
      // Ignore foreground service issues
    }
  }

  private async setupMediaSessionHandlers(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await MediaSession.setActionHandler({action: 'play'}, () => {
          void this.resume();
        });
        await MediaSession.setActionHandler({action: 'pause'}, () => {
          this.pause();
        });
        await MediaSession.setActionHandler({action: 'previoustrack'}, () => {
          void this.playPrevious();
        });
        await MediaSession.setActionHandler({action: 'nexttrack'}, () => {
          void this.playNext();
        });
        await MediaSession.setActionHandler({action: 'seekbackward'}, () => {
          this.seekTo(Math.max(0, (this.audio.currentTime || 0) - 10));
        });
        await MediaSession.setActionHandler({action: 'seekforward'}, () => {
          this.seekTo(Math.min(this.audio.duration || 0, (this.audio.currentTime || 0) + 10));
        });
        await MediaSession.setActionHandler({action: 'seekto'}, (details) => {
          if (typeof details.seekTime === 'number') {
            this.seekTo(details.seekTime);
          }
        });
        await MediaSession.setActionHandler({action: 'stop'}, () => {
          this.pause();
        });
        return;
      } catch {
        // Fallback to Web Media Session API
      }
    }

    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.setActionHandler('play', () => {
        void this.resume();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        this.pause();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        void this.playPrevious();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        void this.playNext();
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const offset = details.seekOffset || 10;
        this.seekTo(Math.max(0, (this.audio.currentTime || 0) - offset));
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const offset = details.seekOffset || 10;
        this.seekTo(Math.min(this.audio.duration || 0, (this.audio.currentTime || 0) + offset));
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (typeof details.seekTime === 'number') {
          this.seekTo(details.seekTime);
        }
      });
    } catch {
      // Some browsers restrict specific handlers
    }
  }

  private async syncPositionState(): Promise<void> {
    const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
    const position = Math.min(this.audio.currentTime || 0, duration || 0);
    const playbackRate = this.audio.playbackRate || 1;

    if (Capacitor.isNativePlatform()) {
      try {
        await MediaSession.setPositionState({duration, position, playbackRate});
        return;
      } catch {
        // Fallback
      }
    }

    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({duration, position, playbackRate});
      } catch {
        // Ignore invalid states
      }
    }
  }

  private async updateMediaSession(): Promise<void> {
    const store = useQuranStore.getState();
    const surah = store.surahs.find((s) => s.number === store.currentSurahNumber);
    const reciter = store.reciters.find((r) => r.id === store.currentReciterId);
    if (!surah || !reciter) return;

    const title =
      store.playMode === 'ayah'
        ? `${surah.englishName} · Ayah ${store.currentAyahNumber}`
        : `${surah.englishName} (${surah.name})`;

    const artwork = [
      {src: './pwa-192x192.png', sizes: '192x192', type: 'image/png'},
      {src: './pwa-512x512.png', sizes: '512x512', type: 'image/png'},
    ];

    if (Capacitor.isNativePlatform()) {
      try {
        await MediaSession.setMetadata({
          title,
          artist: reciter.nameEn,
          album: 'Quranfy',
          artwork,
        });
        await MediaSession.setPlaybackState({
          playbackState: store.isPlaying ? 'playing' : 'paused',
        });
        await this.syncPositionState();
        return;
      } catch {
        // Fallback
      }
    }

    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist: reciter.nameEn,
      album: 'Quranfy',
      artwork,
    });
    navigator.mediaSession.playbackState = store.isPlaying ? 'playing' : 'paused';
    await this.syncPositionState();
  }

  private checkSleepTimerTick(): void {
    const store = useQuranStore.getState();
    const endsAt = store.sleepTimerEndsAt;
    if (!endsAt || !store.isPlaying) return;

    const remainingMs = endsAt - Date.now();
    if (remainingMs <= 5000 && !store.isFadingOut) {
      this.triggerFadeOutAndSleep();
    }
  }

  private triggerFadeOutAndSleep(): void {
    const store = useQuranStore.getState();
    store.setPlaybackRuntime({isFadingOut: true});
    ambientEngine.fadeOutAndStop(4);

    if (this.fadeTimer) window.clearInterval(this.fadeTimer);
    const startVol = this.audio.volume;
    const steps = 20;
    let step = 0;

    this.fadeTimer = window.setInterval(() => {
      step++;
      const ratio = Math.max(0, 1 - step / steps);
      this.audio.volume = startVol * ratio;
      if (step >= steps) {
        if (this.fadeTimer) window.clearInterval(this.fadeTimer);
        this.fadeTimer = null;
        this.audio.pause();
        this.audio.volume = 1;
        const s = useQuranStore.getState();
        s.setSleepTimer(null);
        s.clearAmbientMix();
        s.setPlaybackRuntime({isPlaying: false, isFadingOut: false});
        ambientEngine.setRecitationActive(false);
        void this.syncForegroundService(false);
      }
    }, 200);
  }

  public async playSurah(
    surahNumber: number,
    reciterId?: string,
    resumeFromSec = 0
  ): Promise<void> {
    this.init();
    const store = useQuranStore.getState();
    const targetReciterId = reciterId || store.currentReciterId;
    store.setPlaybackTrack(surahNumber, targetReciterId, 'surah', 1);
    store.recordRecentPlay(surahNumber, targetReciterId);
    await this.loadAndPlayCurrent(resumeFromSec);
  }

  public async playAyah(
    surahNumber: number,
    ayahNumber: number,
    reciterId?: string
  ): Promise<void> {
    this.init();
    const store = useQuranStore.getState();
    const targetReciterId = reciterId || store.currentReciterId;
    store.setPlaybackTrack(surahNumber, targetReciterId, 'ayah', ayahNumber);
    store.recordRecentPlay(surahNumber, targetReciterId);
    await this.loadAndPlayCurrent(0);
  }

  public async loadAndPlayCurrent(startAtSec = 0): Promise<void> {
    this.init();
    const store = useQuranStore.getState();
    const reciter =
      store.reciters.find((r) => r.id === store.currentReciterId) || store.reciters[0];
    if (!reciter) return;

    this.audio.volume = 1;
    store.setPlaybackRuntime({isLoadingAudio: true, audioError: null});

    const sig =
      store.playMode === 'ayah'
        ? `ayah:${reciter.id}:${store.currentSurahNumber}:${store.currentAyahNumber}:${store.settings.audioQuality}`
        : `surah:${reciter.id}:${store.currentSurahNumber}`;

    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }

    let sourceUrl = '';
    let isOffline = false;

    if (store.playMode === 'surah') {
      const offlineRecord = await getAudioDownload(reciter.id, store.currentSurahNumber);
      if (offlineRecord?.nativeFilePath && Capacitor.isNativePlatform()) {
        try {
          const uriRes = await Filesystem.getUri({
            path: offlineRecord.nativeFilePath,
            directory: Directory.Data,
          });
          sourceUrl = Capacitor.convertFileSrc(uriRes.uri);
          isOffline = true;
        } catch {
          sourceUrl = getSurahAudioUrl(reciter, store.currentSurahNumber);
        }
      } else if (offlineRecord?.blob) {
        this.currentBlobUrl = URL.createObjectURL(offlineRecord.blob);
        sourceUrl = this.currentBlobUrl;
        isOffline = true;
      } else {
        sourceUrl = getSurahAudioUrl(reciter, store.currentSurahNumber);
      }
    } else {
      sourceUrl = getAyahAudioUrl(
        reciter,
        store.currentSurahNumber,
        store.currentAyahNumber,
        store.settings.audioQuality
      );
    }

    store.setPlaybackRuntime({playingOffline: isOffline});

    if (this.lastLoadedSignature !== sig || this.audio.src !== sourceUrl) {
      this.lastLoadedSignature = sig;
      this.audio.src = sourceUrl;
      this.audio.load();
    }

    if (startAtSec > 0) {
      this.audio.currentTime = startAtSec;
    }
    this.audio.playbackRate = store.playbackSpeed;

    ambientEngine.setRecitationActive(true);
    void ambientEngine.syncMix(store.ambientMix);

    try {
      await this.audio.play();
      store.setPlaybackRuntime({isPlaying: true});
    } catch {
      ambientEngine.setRecitationActive(false);
      store.setPlaybackRuntime({isPlaying: false, isLoadingAudio: false});
    }
  }

  public async togglePlay(): Promise<void> {
    this.init();
    const store = useQuranStore.getState();
    if (!this.audio.src) {
      await this.loadAndPlayCurrent(store.resumePositionSec);
      return;
    }
    if (this.audio.paused) {
      await this.resume();
    } else {
      this.pause();
    }
  }

  public async resume(): Promise<void> {
    this.init();
    const store = useQuranStore.getState();
    if (!this.audio.src) {
      await this.loadAndPlayCurrent(store.resumePositionSec);
      return;
    }
    ambientEngine.setRecitationActive(true);
    void ambientEngine.syncMix(store.ambientMix);
    this.audio.playbackRate = store.playbackSpeed;
    try {
      await this.audio.play();
      store.setPlaybackRuntime({isPlaying: true});
    } catch {
      store.setPlaybackRuntime({isPlaying: false});
    }
  }

  public pause(): void {
    this.audio.pause();
    useQuranStore.getState().setPlaybackRuntime({isPlaying: false});
    void this.syncForegroundService(false);
  }

  public seekTo(seconds: number): void {
    if (!Number.isFinite(seconds)) return;
    const clamped = Math.max(0, Math.min(seconds, this.audio.duration || seconds));
    this.audio.currentTime = clamped;
    useQuranStore.getState().setPlaybackRuntime({currentTimeSec: clamped});
    void this.syncPositionState();
  }

  public setSpeed(speed: number): void {
    this.audio.playbackRate = speed;
    useQuranStore.getState().setPlaybackSpeed(speed);
    void this.syncPositionState();
  }

  public async playNext(): Promise<void> {
    const store = useQuranStore.getState();
    if (store.playMode === 'ayah') {
      const surah = store.surahs.find((s) => s.number === store.currentSurahNumber);
      const maxAyah = surah?.numberOfAyahs || 7;
      if (store.currentAyahNumber < maxAyah) {
        await this.playAyah(store.currentSurahNumber, store.currentAyahNumber + 1);
        return;
      }
    }

    const q = store.queue;
    if (q.length === 0) return;

    let nextIdx = store.queueIndex + 1;
    if (store.shuffle && q.length > 1) {
      nextIdx = Math.floor(Math.random() * q.length);
    } else if (nextIdx >= q.length) {
      nextIdx = 0;
    }
    const nextTrack = q[nextIdx];
    store.setPlaybackRuntime({queueIndex: nextIdx});
    await this.playSurah(nextTrack.surahNumber, nextTrack.reciterId, 0);
  }

  public async playPrevious(): Promise<void> {
    const store = useQuranStore.getState();
    if ((this.audio.currentTime || 0) > 4 && store.playMode === 'surah') {
      this.seekTo(0);
      return;
    }

    if (store.playMode === 'ayah' && store.currentAyahNumber > 1) {
      await this.playAyah(store.currentSurahNumber, store.currentAyahNumber - 1);
      return;
    }

    const q = store.queue;
    if (q.length === 0) return;

    const prevIdx = store.queueIndex - 1 < 0 ? q.length - 1 : store.queueIndex - 1;
    const prevTrack = q[prevIdx];
    store.setPlaybackRuntime({queueIndex: prevIdx});
    await this.playSurah(prevTrack.surahNumber, prevTrack.reciterId, 0);
  }

  private async handleTrackEnded(): Promise<void> {
    const store = useQuranStore.getState();

    if (store.sleepTimerSetting === 'end-of-surah' && store.playMode === 'surah') {
      store.setSleepTimer(null);
      store.clearAmbientMix();
      ambientEngine.fadeOutAndStop(3);
      ambientEngine.setRecitationActive(false);
      store.setPlaybackRuntime({isPlaying: false});
      void this.syncForegroundService(false);
      return;
    }

    if (store.playMode === 'ayah') {
      if (store.ayahRepeatCurrent < store.ayahRepeatTarget) {
        store.setPlaybackRuntime({ayahRepeatCurrent: store.ayahRepeatCurrent + 1});
        this.audio.currentTime = 0;
        await this.audio.play().catch(() => {});
        return;
      }

      store.setPlaybackRuntime({ayahRepeatCurrent: 1});
      const surah = store.surahs.find((s) => s.number === store.currentSurahNumber);
      const maxAyah = surah?.numberOfAyahs || 7;

      if (store.ayahRangeEnabled) {
        const nextInRange =
          store.currentAyahNumber < store.ayahRangeEnd
            ? store.currentAyahNumber + 1
            : store.ayahRangeStart;
        await this.playAyah(store.currentSurahNumber, nextInRange);
        return;
      }

      if (store.continueToNextAyah) {
        if (store.currentAyahNumber < maxAyah) {
          await this.playAyah(store.currentSurahNumber, store.currentAyahNumber + 1);
          return;
        }
      } else {
        store.setPlaybackRuntime({isPlaying: false});
        void this.syncForegroundService(false);
        return;
      }
    }

    if (store.repeatMode === 'surah') {
      this.audio.currentTime = 0;
      await this.audio.play().catch(() => {});
      return;
    }

    const isLast = store.queueIndex >= store.queue.length - 1;
    if (store.repeatMode === 'all' || store.shuffle || !isLast) {
      await this.playNext();
    } else {
      store.setPlaybackRuntime({isPlaying: false});
      void this.syncForegroundService(false);
    }
  }
}

export const audioManager = new SharedAudioManager();
