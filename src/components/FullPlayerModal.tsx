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
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  UserCheck,
  X,
} from 'lucide-react';
import React, {useMemo, useState} from 'react';
import modeSleepImg from '../assets/images/mode_sleep_1795329629389.jpg';
import modeStudyImg from '../assets/images/mode_study_1795329629451.jpg';
import modeWorkImg from '../assets/images/mode_work_1795329629446.jpg';
import {TRANSLATIONS} from '../data/i18n';
import {audioManager} from '../services/audioManager';
import {listAudioDownloads} from '../services/db';
import {downloadSurahForOffline} from '../services/quranApi';
import {SleepTimerType, useQuranStore} from '../store/useQuranStore';
import {formatTime} from '../utils/formatters';

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
  const ambientSound = useQuranStore((s) => s.ambientSound);
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
  const [reciterQuery, setReciterQuery] = useState('');

  const t = TRANSLATIONS[lang];
  const surah = surahs.find((s) => s.number === currentSurahNumber) || surahs[0];
  const reciter = reciters.find((r) => r.id === currentReciterId) || reciters[0];
  const isFav = favoriteSurahNumbers.includes(surah.number);
  const dlKey = `${reciter.id}_${surah.number}`;
  const isDownloaded = downloadedKeys.includes(dlKey);
  const dlPct = downloadProgress[dlKey];

  const modeArtwork =
    focusMode === 'sleep' ? modeSleepImg : focusMode === 'work' ? modeWorkImg : modeStudyImg;

  const filteredReciters = useMemo(() => {
    const q = reciterQuery.trim().toLowerCase();
    if (!q) return reciters;
    return reciters.filter(
      (r) =>
        r.nameEn.toLowerCase().includes(q) ||
        r.nameAr.includes(q) ||
        r.styleEn.toLowerCase().includes(q)
    );
  }, [reciters, reciterQuery]);

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
    } catch {
      setDownloadProgress(dlKey, null);
      showToast(lang === 'ar' ? 'فشل التحميل. تحقق من الاتصال.' : 'Download failed. Check connection.');
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
      className="fixed inset-0 z-50 flex flex-col bg-[#F6F8F7] dark:bg-[#0B1210] overflow-y-auto pt-safe pb-safe"
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
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        {/* Segmented Play Mode Control */}
        <div className="flex items-center p-1 rounded-2xl bg-[#E5ECE8] dark:bg-[#172420]">
          <button
            type="button"
            onClick={() => handleModeSwitch('surah')}
            className={`px-3.5 min-h-[36px] rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
              playMode === 'surah'
                ? 'bg-white dark:bg-[#233730] text-[#13201C] dark:text-[#ECF2EF] shadow-sm'
                : 'text-[#546660] dark:text-[#96ABA3]'
            }`}
          >
            {t.player.fullSurah}
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch('ayah')}
            className={`px-3.5 min-h-[36px] rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
              playMode === 'ayah'
                ? 'bg-white dark:bg-[#233730] text-[#13201C] dark:text-[#ECF2EF] shadow-sm'
                : 'text-[#546660] dark:text-[#96ABA3]'
            }`}
          >
            {t.player.ayahByAyah}
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setOpen(false);
            openReader(surah.number);
          }}
          aria-label={t.player.readerView}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#0F5C4D] dark:text-[#4ECBA9]"
        >
          <BookOpen className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-between max-w-lg w-full mx-auto px-5 pb-8 pt-2">
        {/* Artwork Card */}
        <div className="relative rounded-3xl overflow-hidden aspect-[16/10] bg-[#132922] shadow-xl">
          <img
            src={modeArtwork}
            alt={`${focusMode} atmosphere`}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#081512]/90 via-[#081512]/40 to-transparent" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <p
              className="font-quran-amiri text-3xl sm:text-4xl text-[#F4E6C3] drop-shadow"
              dir="rtl"
            >
              {surah.name}
            </p>
            <p className="mt-2 text-xs text-white/80 tracking-wide">
              {surah.number} · {surah.englishNameTranslation} · {surah.numberOfAyahs} {t.home.ayahs}
            </p>
          </div>
          {playingOffline && (
            <div className="absolute bottom-3 left-4 text-[11px] font-medium text-[#4ECBA9]">
              {t.player.offlineReady}
            </div>
          )}
          {isFadingOut && (
            <div className="absolute bottom-3 right-4 text-[11px] font-medium text-[#E2B76B]">
              {t.player.fadingOut}
            </div>
          )}
        </div>

        {/* Title & Reciter & Favorite */}
        <div className="mt-6 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-[#13201C] dark:text-[#ECF2EF] truncate">
              {surah.englishName}
              {playMode === 'ayah' && (
                <span className="text-base font-medium text-[#0F5C4D] dark:text-[#4ECBA9] ms-2">
                  · {lang === 'ar' ? 'آية' : 'Ayah'} {currentAyahNumber}
                </span>
              )}
            </h1>
            <button
              type="button"
              onClick={() => setShowReciterPicker(true)}
              className="mt-1 inline-flex items-center gap-1.5 text-sm text-[#0F5C4D] dark:text-[#4ECBA9] font-medium hover:underline min-h-[36px]"
            >
              <UserCheck className="w-4 h-4 shrink-0" />
              <span className="truncate">
                {lang === 'ar' ? reciter.nameAr : reciter.nameEn}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => toggleFavoriteSurah(surah.number)}
            aria-label="Favorite Surah"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          >
            <Heart
              className={`w-6 h-6 transition-colors ${
                isFav ? 'fill-[#C69749] text-[#C69749]' : 'text-[#546660] dark:text-[#96ABA3]'
              }`}
            />
          </button>
        </div>

        {audioError && (
          <div className="mt-3 rounded-2xl bg-amber-500/15 px-3.5 py-2.5 text-xs text-amber-800 dark:text-amber-300">
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
            className="w-full md-slider bg-black/15 dark:bg-white/15"
          />
          <div className="mt-1.5 flex items-center justify-between text-xs text-[#546660] dark:text-[#96ABA3] tabular-nums">
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
                ? 'text-[#0F5C4D] dark:text-[#4ECBA9] bg-[#0F5C4D]/10 dark:bg-[#4ECBA9]/15'
                : 'text-[#546660] dark:text-[#96ABA3] hover:bg-black/5 dark:hover:bg-white/10'
            }`}
          >
            <Shuffle className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => audioManager.playPrevious()}
            aria-label="Previous"
            className="md-ripple min-h-[52px] min-w-[52px] flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#13201C] dark:text-[#ECF2EF]"
          >
            <SkipBack className="w-6 h-6" />
          </button>

          <button
            type="button"
            onClick={() => audioManager.togglePlay()}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="md-ripple w-16 h-16 rounded-3xl bg-[#0F5C4D] text-white dark:bg-[#4ECBA9] dark:text-[#081A15] flex items-center justify-center shadow-lg"
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
            className="md-ripple min-h-[52px] min-w-[52px] flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#13201C] dark:text-[#ECF2EF]"
          >
            <SkipForward className="w-6 h-6" />
          </button>

          <button
            type="button"
            onClick={cycleRepeatMode}
            aria-label="Repeat mode"
            className={`min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full transition-colors ${
              repeatMode !== 'off'
                ? 'text-[#0F5C4D] dark:text-[#4ECBA9] bg-[#0F5C4D]/10 dark:bg-[#4ECBA9]/15'
                : 'text-[#546660] dark:text-[#96ABA3] hover:bg-black/5 dark:hover:bg-white/10'
            }`}
          >
            {repeatMode === 'surah' ? (
              <Repeat1 className="w-5 h-5" />
            ) : (
              <Repeat className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Utility Row: Speed, Sleep Timer, Ambient, Offline Download */}
        <div className="mt-6 grid grid-cols-4 gap-2">
          {/* Speed cycle button */}
          <button
            type="button"
            onClick={() => {
              const idx = SPEED_OPTIONS.indexOf(playbackSpeed);
              const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
              audioManager.setSpeed(next);
            }}
            className="md-ripple flex flex-col items-center justify-center gap-1 rounded-2xl bg-[#EDF3F0] dark:bg-[#16241F] py-2.5 min-h-[54px] text-xs font-medium text-[#13201C] dark:text-[#DCE6E2]"
          >
            <span className="text-sm font-bold tabular-nums">{playbackSpeed}x</span>
            <span className="text-[11px] text-[#546660] dark:text-[#96ABA3]">{t.player.speed}</span>
          </button>

          {/* Sleep Timer */}
          <button
            type="button"
            onClick={() => setShowSleepPicker(true)}
            className={`md-ripple flex flex-col items-center justify-center gap-1 rounded-2xl py-2.5 min-h-[54px] text-xs font-medium ${
              sleepTimerSetting
                ? 'bg-[#0F5C4D] text-white dark:bg-[#4ECBA9] dark:text-[#081A15]'
                : 'bg-[#EDF3F0] dark:bg-[#16241F] text-[#13201C] dark:text-[#DCE6E2]'
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

          {/* Ambient Mixer */}
          <button
            type="button"
            onClick={() => setAmbientSheetOpen(true)}
            className={`md-ripple flex flex-col items-center justify-center gap-1 rounded-2xl py-2.5 min-h-[54px] text-xs font-medium ${
              ambientSound
                ? 'bg-[#0F5C4D] text-white dark:bg-[#4ECBA9] dark:text-[#081A15]'
                : 'bg-[#EDF3F0] dark:bg-[#16241F] text-[#13201C] dark:text-[#DCE6E2]'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="text-[11px] truncate max-w-full px-1">
              {ambientSound ? t.modes[ambientSound] : lang === 'ar' ? 'الأصوات' : 'Ambient'}
            </span>
          </button>

          {/* Offline Download */}
          <button
            type="button"
            onClick={handleDownload}
            className={`md-ripple flex flex-col items-center justify-center gap-1 rounded-2xl py-2.5 min-h-[54px] text-xs font-medium ${
              isDownloaded
                ? 'bg-[#0F5C4D]/15 text-[#0F5C4D] dark:bg-[#4ECBA9]/20 dark:text-[#4ECBA9]'
                : 'bg-[#EDF3F0] dark:bg-[#16241F] text-[#13201C] dark:text-[#DCE6E2]'
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
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowSleepPicker(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#131F1C] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">{t.player.sleepTimer}</h3>
              <button
                type="button"
                onClick={() => setShowSleepPicker(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full"
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
                    className={`min-h-[46px] rounded-2xl px-4 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-[#0F5C4D] text-white dark:bg-[#4ECBA9] dark:text-[#081A15]'
                        : 'bg-[#F3F6F4] dark:bg-[#192823] text-[#13201C] dark:text-[#ECF2EF]'
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

      {/* Searchable Reciter Picker Sheet */}
      {showReciterPicker && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowReciterPicker(false)}
        >
          <div
            className="w-full max-w-lg max-h-[82vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#131F1C] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold">{t.player.switchReciter}</h3>
              <button
                type="button"
                onClick={() => setShowReciterPicker(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-[#546660]" />
              <input
                type="text"
                value={reciterQuery}
                onChange={(e) => setReciterQuery(e.target.value)}
                placeholder={lang === 'ar' ? 'ابحث عن قارئ...' : 'Search reciters...'}
                className="w-full min-h-[44px] rounded-2xl bg-[#F3F6F4] dark:bg-[#192823] ps-10 pe-4 text-sm outline-none focus:ring-2 focus:ring-[#0F5C4D] dark:focus:ring-[#4ECBA9]"
              />
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5">
              {filteredReciters.map((r) => {
                const active = r.id === reciter.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setShowReciterPicker(false);
                      if (playMode === 'ayah') {
                        audioManager.playAyah(surah.number, currentAyahNumber, r.id);
                      } else {
                        audioManager.playSurah(surah.number, r.id, 0);
                      }
                    }}
                    className={`w-full text-start rounded-2xl p-3.5 min-h-[56px] flex items-center justify-between gap-3 transition-colors ${
                      active
                        ? 'bg-[#0F5C4D]/12 dark:bg-[#4ECBA9]/15 text-[#0F5C4D] dark:text-[#4ECBA9]'
                        : 'hover:bg-black/4 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {lang === 'ar' ? r.nameAr : r.nameEn}
                      </p>
                      <p className="text-xs text-[#546660] dark:text-[#96ABA3] truncate">
                        {lang === 'ar' ? r.nameEn : r.nameAr} · {lang === 'ar' ? r.styleAr : r.styleEn}
                      </p>
                    </div>
                    {active && <Check className="w-5 h-5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
