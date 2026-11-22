import {useQuranStore} from '../store/useQuranStore';
import {ambientEngine} from './ambientAudio';
import {getAudioDownload} from './db';
import {getAyahAudioUrl, getSurahAudioUrl} from './quranApi';

class SharedAudioManager {
  private audio: HTMLAudioElement;
  private currentBlobUrl: string | null = null;
  private habitInterval: number | null = null;
  private fadeTimer: number | null = null;
  private initialized = false;
  private lastLoadedSignature = '';

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
      this.updateMediaSession();
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
      this.updateMediaSession();
    });

    this.audio.addEventListener('pause', () => {
      const store = useQuranStore.getState();
      store.setPlaybackRuntime({isPlaying: false});
      store.setResumePositionSec(this.audio.currentTime || 0);
      this.updateMediaSession();
    });

    this.audio.addEventListener('timeupdate', () => {
      const store = useQuranStore.getState();
      const ct = this.audio.currentTime || 0;
      store.setPlaybackRuntime({currentTimeSec: ct});
      if (Math.floor(ct) % 5 === 0) {
        store.setResumePositionSec(ct);
      }
      this.checkSleepTimerTick();
    });

    this.audio.addEventListener('ended', () => {
      this.handleTrackEnded();
    });

    this.audio.addEventListener('error', () => {
      const store = useQuranStore.getState();
      // Attempt fallback server if available
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
    });

    // Accurate played seconds tracker & sleep timer monitor
    this.habitInterval = window.setInterval(() => {
      const store = useQuranStore.getState();
      if (!this.audio.paused && !this.audio.ended && this.audio.readyState >= 2) {
        store.addPlayedSecond();
      }
      this.checkSleepTimerTick();
    }, 1000);

    this.setupMediaSessionHandlers();
  }

  private setupMediaSessionHandlers(): void {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.setActionHandler('play', () => {
        this.resume();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        this.pause();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        this.playPrevious();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        this.playNext();
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
      // Some webviews restrict specific handlers
    }
  }

  private updateMediaSession(): void {
    if (!('mediaSession' in navigator)) return;
    const store = useQuranStore.getState();
    const surah = store.surahs.find((s) => s.number === store.currentSurahNumber);
    const reciter = store.reciters.find((r) => r.id === store.currentReciterId);
    if (!surah || !reciter) return;

    const title =
      store.playMode === 'ayah'
        ? `${surah.englishName} · Ayah ${store.currentAyahNumber}`
        : `${surah.englishName} (${surah.name})`;

    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist: reciter.nameEn,
      album: 'Quranfy',
      artwork: [
        {src: './pwa-192x192.png', sizes: '192x192', type: 'image/png'},
        {src: './pwa-512x512.png', sizes: '512x512', type: 'image/png'},
      ],
    });
    navigator.mediaSession.playbackState = store.isPlaying ? 'playing' : 'paused';
  }

  private checkSleepTimerTick(): void {
    const store = useQuranStore.getState();
    const endsAt = store.sleepTimerEndsAt;
    if (!endsAt || !store.isPlaying) return;

    const remainingMs = endsAt - Date.now();
    if (remainingMs <= 5000 && remainingMs > 0 && !store.isFadingOut) {
      this.triggerFadeOutAndSleep();
    } else if (remainingMs <= 0 && !store.isFadingOut) {
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
        s.setAmbientSound(null);
        s.setPlaybackRuntime({isPlaying: false, isFadingOut: false});
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
      if (offlineRecord?.blob) {
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

    // Sync ambient sound if user selected one
    if (store.ambientSound) {
      ambientEngine.start(store.ambientSound, store.ambientVolume);
    }

    try {
      await this.audio.play();
      store.setPlaybackRuntime({isPlaying: true});
    } catch {
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
    if (store.ambientSound) {
      ambientEngine.start(store.ambientSound, store.ambientVolume);
    }
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
  }

  public seekTo(seconds: number): void {
    if (!Number.isFinite(seconds)) return;
    const clamped = Math.max(0, Math.min(seconds, this.audio.duration || seconds));
    this.audio.currentTime = clamped;
    useQuranStore.getState().setPlaybackRuntime({currentTimeSec: clamped});
  }

  public setSpeed(speed: number): void {
    this.audio.playbackRate = speed;
    useQuranStore.getState().setPlaybackSpeed(speed);
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

    // Sleep timer "end-of-surah" stops gracefully after surah finishes
    if (store.sleepTimerSetting === 'end-of-surah' && store.playMode === 'surah') {
      store.setSleepTimer(null);
      store.setAmbientSound(null);
      ambientEngine.fadeOutAndStop(3);
      store.setPlaybackRuntime({isPlaying: false});
      return;
    }

    if (store.playMode === 'ayah') {
      // Repeat current ayah N times
      if (store.ayahRepeatCurrent < store.ayahRepeatTarget) {
        store.setPlaybackRuntime({ayahRepeatCurrent: store.ayahRepeatCurrent + 1});
        this.audio.currentTime = 0;
        await this.audio.play().catch(() => {});
        return;
      }

      store.setPlaybackRuntime({ayahRepeatCurrent: 1});
      const surah = store.surahs.find((s) => s.number === store.currentSurahNumber);
      const maxAyah = surah?.numberOfAyahs || 7;

      // Ayah Range loop
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
    }
  }
}

export const audioManager = new SharedAudioManager();
