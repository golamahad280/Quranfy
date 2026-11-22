import {
  BookOpen,
  Check,
  ChevronDown,
  Download,
  Heart,
  Loader2,
  Moon,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  UserCheck,
  X,
} from 'lucide-react';
import React, {useState} from 'react';
import modeSleepImg from '../assets/images/mode_sleep.webp';
import modeStudyImg from '../assets/images/mode_study.webp';
import modeWorkImg from '../assets/images/mode_work.webp';
import {TRANSLATIONS} from '../data/i18n';
import {audioManager} from '../services/audioManager';
import {listAudioDownloads} from '../services/db';
import {downloadSurahForOffline} from '../services/quranApi';
import {getActiveAmbientSounds, SleepTimerType, useQuranStore} from '../store/useQuranStore';
import {formatTime} from '../utils/formatters';
import {ReciterPickerSheet} from './ReciterPickerSheet';

const SPEED_OPTIONS = [0.75, 0.9, 1, 1.25, 1.5, 2];
const SLEEP_OPTIONS: Array<{value: SleepTimerType; labelEn: string; labelAr: string}> = [
  {value: null, labelEn: 'Off', labelAr: 'إيقاف'},
  {value: 15, labelEn: '15 min', labelAr: '١٥ د'},
  {value: 30, labelEn: '30 min', labelAr: '٣٠ د'},
  {value: 45, labelEn: '45 min', labelAr: '٤٥ د'},
  {value: 60, labelEn: '60 min', labelAr: '٦٠ د'},
  {value: 90, labelEn: '90 min', labelAr: '٩٠ د'},
  {value: 'end-of-surah', labelEn: 'End of Surah', labelAr: 'نهاية السورة'},
];

export const FullPlayerModal: React.FC = () => {
  const isOpen = useQuranStore((s) => s.isFullPlayerOpen);
  const setOpen = useQuranStore((s) => s.setFullPlayerOpen);
  const currentSurahNumber = useQuranStore((s) => s.currentSurahNumber);
  const currentReciterId = useQuranStore((s) => s.currentReciterId);
  const surahs = useQuranStore((s) => s.surahs);
  const reciters = useQuranStore((s) => s.reciters);
  const focusMode = useQuranStore((s) => s.focusMode);
  const playMode = useQuranStore((s) => s.playMode);
  const currentAyahNumber = useQuranStore((s) => s.currentAyahNumber);
  const isPlaying = useQuranStore((s) => s.isPlaying);
  const isLoadingAudio = useQuranStore((s) => s.isLoadingAudio);
  const playingOffline = useQuranStore((s) => s.playingOffline);
  const audioError = useQuranStore((s) => s.audioError);
  const currentTimeSec = useQuranStore((s) => s.currentTimeSec);
  const durationSec = useQuranStore((s) => s.durationSec);
  const playbackSpeed = useQuranStore((s) => s.playbackSpeed);
  const repeatMode = useQuranStore((s) => s.repeatMode);
  const shuffle = useQuranStore((s) => s.shuffle);
  const sleepTimerSetting = useQuranStore((s) => s.sleepTimerSetting);
  const sleepTimerEndsAt = useQuranStore((s) => s.sleepTimerEndsAt);
  const isFadingOut = useQuranStore((s) => s.isFadingOut);
  const ambientMix = useQuranStore((s) => s.ambientMix);
  const favoriteSurahNumbers = useQuranStore((s) => s.favoriteSurahNumbers);
  const downloadedKeys = useQuranStore((s) => s.downloadedKeys);
  const downloadProgress = useQuranStore((s) => s.downloadProgress);
  const lang = useQuranStore((s) => s.settings.language);

  const toggleFavoriteSurah = useQuranStore((s) => s.toggleFavoriteSurah);
  const cycleRepeatMode = useQuranStore((s) => s.cycleRepeatMode);
  const toggleShuffle = useQuranStore((s) => s.toggleShuffle);
  const setSleepTimer = useQuranStore((s) => s.setSleepTimer);
  const setAmbientSheetOpen = useQuranStore((s) => s.setAmbientSheetOpen);
  const openReader = useQuranStore((s) => s.openReader);
  const setDownloadProgress = useQuranStore((s) => s.setDownloadProgress);
  const setDownloadedKeys = useQuranStore((s) => s.setDownloadedKeys);
  const showToast = useQuranStore((s) => s.showToast);

  const [showReciterPicker, setShowReciterPicker] = useState(false);
  const [showSleepPicker, setShowSleepPicker] = useState(false);

  const t = TRANSLATIONS[lang];
  const surah = surahs.find((s) => s.number === currentSurahNumber) || surahs[0];
  const reciter = reciters.find((r) => r.id === currentReciterId) || reciters[0];
  const isFav = favoriteSurahNumbers.includes(surah.number);
  const dlKey = `${reciter.id}_${surah.number}`;
  const isDownloaded = downloadedKeys.includes(dlKey);
  const dlPct = downloadProgress[dlKey];
  const activeAmbient = getActiveAmbientSounds(ambientMix);

  const modeArtwork =
    focusMode === 'sleep' ? modeSleepImg : focusMode === 'work' ? modeWorkImg : modeStudyImg;

  if (!isOpen) return null;

  const remainingMin =
    sleepTimerEndsAt && sleepTimerEndsAt > Date.now()
      ? Math.ceil((sleepTimerEndsAt - Date.now()) / 60000)
      : null;

  const handleDownload = async () => {
    if (isDownloaded || dlPct !== undefined) return;
    try {
      setDownloadProgress(dlKey, 1);
      await downloadSurahForOffline(reciter, surah, (pct) => {
        setDownloadProgress(dlKey, pct);
      });
      const list = await listAudioDownloads();
      setDownloadedKeys(list.map((d) => d.key));
      setDownloadProgress(dlKey, null);
      showToast(lang === 'ar' ? 'تم تحميل السورة للاستماع دون إنترنت' : 'Saved for offline listening');
    } catch (err) {
      setDownloadProgress(dlKey, null);
      const msg =
        err instanceof Error && err.message
          ? err.message
          : lang === 'ar'
          ? 'فشل التحميل. تحقق من الاتصال.'
          : 'Download failed. Check connection.';
      showToast(msg);
    }
  };

  const handleModeSwitch = (mode: 'surah' | 'ayah') => {
    if (mode === playMode) return;
    if (mode === 'ayah') {
      audioManager.playAyah(surah.number, currentAyahNumber, reciter.id);
    } else {
      audioManager.playSurah(surah.number, reciter.id, 0);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-surface-light/95 dark:bg-surface-dark/95 backdrop-blur-2xl overflow-y-auto pt-safe pb-safe"
      role="dialog"
      aria-modal="true"
      aria-label="Full Player"
    >
      {/* Top Bar */}
      <header className="flex items-center justify-between gap-3 px-4 py-3 max-w-2xl w-full mx-auto">
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Collapse player"
          className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full hover:bg-brand-500/10 dark:hover:bg-white/10"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        {/* Segmented Play Mode Control */}
        <div className="flex items-center p-1 rounded-2xl glass">
          <button
            type="button"
            onClick={() => handleModeSwitch('surah')}
            className={`px-3.5 min-h-[40px] rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              playMode === 'surah'
                ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950 shadow-sm'
                : 'text-muted dark:text-muted-dark'
            }`}
          >
            {t.player.fullSurah}
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch('ayah')}
            className={`px-3.5 min-h-[40px] rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              playMode === 'ayah'
                ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950 shadow-sm'
                : 'text-muted dark:text-muted-dark'
            }`}
          >
            {t.player.ayahByAyah}
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setOpen(false);
            openReader(surah.number, playMode === 'ayah' ? currentAyahNumber : undefined);
          }}
          aria-label={t.player.readerView}
          className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full hover:bg-brand-500/10 dark:hover:bg-white/10 text-brand-600 dark:text-accent"
        >
          <BookOpen className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-between max-w-lg w-full mx-auto px-5 pb-8 pt-2">
        {/* Artwork Card */}
        <div className="relative rounded-3xl overflow-hidden aspect-[16/10] bg-brand-950 shadow-xl border border-white/15">
          <img
            src={modeArtwork}
            alt={`${focusMode} atmosphere`}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-950/92 via-brand-950/45 to-brand-900/20" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <p className="font-quran-amiri text-3xl sm:text-4xl text-accent-200 drop-shadow" dir="rtl">
              {surah.name}
            </p>
            <p className="mt-2 text-xs text-white/85 tracking-wide font-medium">
              {surah.number} · {surah.englishNameTranslation} · {surah.numberOfAyahs} {t.home.ayahs}
            </p>
          </div>
          {playingOffline && (
            <div className="absolute bottom-3 left-4 text-[11px] font-semibold text-accent-200">
              {t.player.offlineReady}
            </div>
          )}
          {isFadingOut && (
            <div className="absolute bottom-3 right-4 text-[11px] font-semibold text-accent">
              {t.player.fadingOut}
            </div>
          )}
        </div>

        {/* Title & Reciter & Favorite */}
        <div className="mt-6 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-ink dark:text-ink-dark truncate">
              {surah.englishName}
              {playMode === 'ayah' && (
                <span className="text-base font-semibold text-brand-600 dark:text-accent ms-2">
                  · {lang === 'ar' ? 'آية' : 'Ayah'} {currentAyahNumber}
                </span>
              )}
            </h1>
            <button
              type="button"
              onClick={() => setShowReciterPicker(true)}
              className="mt-1 inline-flex items-center gap-1.5 text-sm text-brand-600 dark:text-accent font-semibold hover:underline min-h-[40px]"
            >
              <UserCheck className="w-4 h-4 shrink-0" />
              <span className="truncate">{lang === 'ar' ? reciter.nameAr : reciter.nameEn}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => toggleFavoriteSurah(surah.number)}
            aria-label="Favorite Surah"
            className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full hover:bg-brand-500/10 dark:hover:bg-white/10"
          >
            <Heart
              className={`w-6 h-6 transition-colors ${
                isFav ? 'fill-accent text-accent' : 'text-muted dark:text-muted-dark'
              }`}
            />
          </button>
        </div>

        {audioError && (
          <div className="mt-3 rounded-2xl glass px-4 py-3 text-xs font-medium text-accent-600 dark:text-accent-200">
            {audioError}
          </div>
        )}

        {/* Seek Bar */}
        <div className="mt-5">
          <input
            type="range"
            min={0}
            max={durationSec || 100}
            value={Math.min(currentTimeSec, durationSec || 100)}
            onChange={(e) => audioManager.seekTo(Number(e.target.value))}
            aria-label="Seek position"
            className="w-full md-slider bg-brand-900/15 dark:bg-white/20"
          />
          <div className="mt-1.5 flex items-center justify-between text-xs text-muted dark:text-muted-dark tabular-nums">
            <span>{formatTime(currentTimeSec)}</span>
            <span>{durationSec > 0 ? formatTime(durationSec) : '--:--'}</span>
          </div>
        </div>

        {/* Transport Controls */}
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={toggleShuffle}
            aria-label={t.player.shuffle}
            className={`min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full transition-colors ${
              shuffle
                ? 'text-brand-700 dark:text-accent bg-brand-600/14 dark:bg-accent/18'
                : 'text-muted dark:text-muted-dark hover:bg-brand-500/10 dark:hover:bg-white/10'
            }`}
          >
            <Shuffle className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => audioManager.playPrevious()}
            aria-label="Previous"
            className="md-ripple min-h-[52px] min-w-[52px] flex items-center justify-center rounded-full hover:bg-brand-500/10 dark:hover:bg-white/10 text-ink dark:text-ink-dark"
          >
            <SkipBack className="w-6 h-6" />
          </button>

          <button
            type="button"
            onClick={() => audioManager.togglePlay()}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="md-ripple w-16 h-16 rounded-3xl bg-brand-600 text-white dark:bg-accent dark:text-brand-950 flex items-center justify-center shadow-lg"
          >
            {isLoadingAudio ? (
              <Loader2 className="w-7 h-7 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-7 h-7 fill-current" />
            ) : (
              <Play className="w-7 h-7 fill-current ms-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => audioManager.playNext()}
            aria-label="Next"
            className="md-ripple min-h-[52px] min-w-[52px] flex items-center justify-center rounded-full hover:bg-brand-500/10 dark:hover:bg-white/10 text-ink dark:text-ink-dark"
          >
            <SkipForward className="w-6 h-6" />
          </button>

          <button
            type="button"
            onClick={cycleRepeatMode}
            aria-label="Repeat mode"
            className={`min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full transition-colors ${
              repeatMode !== 'off'
                ? 'text-brand-700 dark:text-accent bg-brand-600/14 dark:bg-accent/18'
                : 'text-muted dark:text-muted-dark hover:bg-brand-500/10 dark:hover:bg-white/10'
            }`}
          >
            {repeatMode === 'surah' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
          </button>
        </div>

        {/* Utility Row: Speed, Sleep Timer, Ambient, Offline Download */}
        <div className="mt-6 grid grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() => {
              const idx = SPEED_OPTIONS.indexOf(playbackSpeed);
              const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
              audioManager.setSpeed(next);
            }}
            className="md-ripple glass flex flex-col items-center justify-center gap-1 rounded-2xl py-2.5 min-h-[58px] text-xs font-semibold text-ink dark:text-ink-dark"
          >
            <span className="text-sm font-bold tabular-nums">{playbackSpeed}x</span>
            <span className="text-[11px] text-muted dark:text-muted-dark">{t.player.speed}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSleepPicker(true)}
            className={`md-ripple flex flex-col items-center justify-center gap-1 rounded-2xl py-2.5 min-h-[58px] text-xs font-semibold ${
              sleepTimerSetting
                ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950 shadow-sm'
                : 'glass text-ink dark:text-ink-dark'
            }`}
          >
            <Moon className="w-4 h-4" />
            <span className="text-[11px] tabular-nums truncate max-w-full px-1">
              {sleepTimerSetting === 'end-of-surah'
                ? lang === 'ar'
                  ? 'نهاية'
                  : 'End'
                : remainingMin
                ? `${remainingMin}m`
                : t.player.sleepTimer}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAmbientSheetOpen(true)}
            className={`md-ripple flex flex-col items-center justify-center gap-1 rounded-2xl py-2.5 min-h-[58px] text-xs font-semibold ${
              activeAmbient.length > 0
                ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950 shadow-sm'
                : 'glass text-ink dark:text-ink-dark'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="text-[11px] truncate max-w-full px-1">
              {activeAmbient.length === 1
                ? t.modes[activeAmbient[0]]
                : activeAmbient.length > 1
                ? `${activeAmbient.length} ${lang === 'ar' ? 'أصوات' : 'Mix'}`
                : lang === 'ar'
                ? 'الأصوات'
                : 'Ambient'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className={`md-ripple flex flex-col items-center justify-center gap-1 rounded-2xl py-2.5 min-h-[58px] text-xs font-semibold ${
              isDownloaded
                ? 'bg-brand-600/15 text-brand-700 dark:bg-accent/20 dark:text-accent border border-brand-500/30 dark:border-accent/35'
                : 'glass text-ink dark:text-ink-dark'
            }`}
          >
            {dlPct !== undefined ? (
              <span className="text-xs font-bold tabular-nums">{dlPct}%</span>
            ) : isDownloaded ? (
              <Check className="w-4 h-4" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span className="text-[11px]">
              {isDownloaded ? (lang === 'ar' ? 'محفوظ' : 'Saved') : lang === 'ar' ? 'تحميل' : 'Offline'}
            </span>
          </button>
        </div>
      </div>

      {/* Sleep Timer Picker Sheet */}
      {showSleepPicker && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-brand-950/60 backdrop-blur-sm"
          onClick={() => setShowSleepPicker(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl sm:rounded-3xl glass-strong p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-ink dark:text-ink-dark">
                {t.player.sleepTimer}
              </h3>
              <button
                type="button"
                onClick={() => setShowSleepPicker(false)}
                className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full hover:bg-brand-500/10 dark:hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {SLEEP_OPTIONS.map((opt) => {
                const active = sleepTimerSetting === opt.value;
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => {
                      setSleepTimer(opt.value);
                      setShowSleepPicker(false);
                    }}
                    className={`md-ripple min-h-[48px] rounded-2xl px-4 text-sm font-semibold transition-colors ${
                      active
                        ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950'
                        : 'glass text-ink dark:text-ink-dark'
                    }`}
                  >
                    {lang === 'ar' ? opt.labelAr : opt.labelEn}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Shared Searchable Reciter Picker Sheet */}
      <ReciterPickerSheet
        isOpen={showReciterPicker}
        onClose={() => setShowReciterPicker(false)}
        selectedReciterId={reciter.id}
        onSelectReciter={(r) => {
          if (playMode === 'ayah') {
            audioManager.playAyah(surah.number, currentAyahNumber, r.id);
          } else {
            audioManager.playSurah(surah.number, r.id, 0);
          }
        }}
      />
    </div>
  );
};
export default FullPlayerModal;
