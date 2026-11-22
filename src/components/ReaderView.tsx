import {
  ArrowLeft,
  BookText,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Heart,
  Loader2,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  Sliders,
  Type,
  Volume2,
} from 'lucide-react';
import React, {useEffect, useRef, useState} from 'react';
import {pickLang, TRANSLATIONS} from '../data/i18n';
import {TRANSLATION_OPTIONS} from '../data/recitersAndPlaylists';
import {audioManager} from '../services/audioManager';
import {listAudioDownloads} from '../services/db';
import {
  downloadSurahForOffline,
  fetchBanglaSurah,
  fetchSurahWithTranslation,
} from '../services/quranApi';
import {useQuranStore} from '../store/useQuranStore';
import {SurahDetail} from '../types/quran';
import {TafsirSheet} from './TafsirSheet';

export const ReaderView: React.FC = () => {
  const readerSurahNumber = useQuranStore((s) => s.readerSurahNumber);
  const closeReader = useQuranStore((s) => s.closeReader);
  const openReader = useQuranStore((s) => s.openReader);
  const openTafsirSheet = useQuranStore((s) => s.openTafsirSheet);
  const surahs = useQuranStore((s) => s.surahs);
  const reciters = useQuranStore((s) => s.reciters);
  const currentSurahNumber = useQuranStore((s) => s.currentSurahNumber);
  const currentReciterId = useQuranStore((s) => s.currentReciterId);
  const playMode = useQuranStore((s) => s.playMode);
  const currentAyahNumber = useQuranStore((s) => s.currentAyahNumber);
  const isPlaying = useQuranStore((s) => s.isPlaying);
  const isLoadingAudio = useQuranStore((s) => s.isLoadingAudio);
  const ayahRepeatTarget = useQuranStore((s) => s.ayahRepeatTarget);
  const ayahRangeEnabled = useQuranStore((s) => s.ayahRangeEnabled);
  const ayahRangeStart = useQuranStore((s) => s.ayahRangeStart);
  const ayahRangeEnd = useQuranStore((s) => s.ayahRangeEnd);
  const continueToNextAyah = useQuranStore((s) => s.continueToNextAyah);
  const favoriteAyahs = useQuranStore((s) => s.favoriteAyahs);
  const favoriteSurahNumbers = useQuranStore((s) => s.favoriteSurahNumbers);
  const downloadedKeys = useQuranStore((s) => s.downloadedKeys);
  const downloadProgress = useQuranStore((s) => s.downloadProgress);
  const settings = useQuranStore((s) => s.settings);

  const setAyahRepeatTarget = useQuranStore((s) => s.setAyahRepeatTarget);
  const setAyahRange = useQuranStore((s) => s.setAyahRange);
  const setContinueToNextAyah = useQuranStore((s) => s.setContinueToNextAyah);
  const toggleFavoriteAyah = useQuranStore((s) => s.toggleFavoriteAyah);
  const toggleFavoriteSurah = useQuranStore((s) => s.toggleFavoriteSurah);
  const updateSettings = useQuranStore((s) => s.updateSettings);
  const setDownloadProgress = useQuranStore((s) => s.setDownloadProgress);
  const setDownloadedKeys = useQuranStore((s) => s.setDownloadedKeys);
  const showToast = useQuranStore((s) => s.showToast);

  const [detail, setDetail] = useState<SurahDetail | null>(null);
  const [banglaVerses, setBanglaVerses] = useState<Record<number, string> | null>(null);
  const [banglaLoading, setBanglaLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDisplayPanel, setShowDisplayPanel] = useState(false);
  const [showAyahControls, setShowAyahControls] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const ayahRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const lang = settings.language;
  const t = TRANSLATIONS[lang];

  useEffect(() => {
    if (!readerSurahNumber) return;
    let active = true;
    setLoading(true);
    setError(null);

    fetchSurahWithTranslation(readerSurahNumber, settings.translationEdition)
      .then((res) => {
        if (active) {
          setDetail(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setError(
            pickLang(
              lang,
              'Unable to load surah text. Connect once to cache this surah offline.',
              'تعذر تحميل نص السورة. تأكد من اتصالك بالإنترنت للمرة الأولى.',
              'সূরার পাঠ লোড করা যায়নি। অফলাইনে সংরক্ষণের জন্য একবার ইন্টারনেটে সংযুক্ত হন।'
            )
          );
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [readerSurahNumber, settings.translationEdition, lang, retryCount]);

  // Fetch Bangla Quran translation (ben-muhiuddinkhan) whenever enabled
  useEffect(() => {
    if (!readerSurahNumber || !settings.showBanglaTranslation) {
      return;
    }
    let active = true;
    setBanglaLoading(true);
    fetchBanglaSurah(readerSurahNumber)
      .then((verses) => {
        if (active) {
          setBanglaVerses(verses);
          setBanglaLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setBanglaVerses(null);
          setBanglaLoading(false);
          showToast(
            pickLang(
              lang,
              'Could not load Bangla Quran translation. Check connection.',
              'تعذر تحميل الترجمة البنغالية للقرآن.',
              'বাংলা কুরআন অনুবাদ লোড করা যায়নি।'
            )
          );
        }
      });
    return () => {
      active = false;
    };
  }, [readerSurahNumber, settings.showBanglaTranslation, lang, showToast]);

  // Smoothly auto-scroll to the active playing ayah
  useEffect(() => {
    if (
      readerSurahNumber &&
      currentSurahNumber === readerSurahNumber &&
      playMode === 'ayah' &&
      ayahRefs.current[currentAyahNumber]
    ) {
      ayahRefs.current[currentAyahNumber]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [readerSurahNumber, currentSurahNumber, playMode, currentAyahNumber]);

  if (!readerSurahNumber) return null;

  const surah = surahs.find((s) => s.number === readerSurahNumber) || surahs[0];
  const reciter = reciters.find((r) => r.id === currentReciterId) || reciters[0];
  const isCurrentSurahPlaying = currentSurahNumber === surah.number && isPlaying;
  const isFavSurah = favoriteSurahNumbers.includes(surah.number);
  const dlKey = `${reciter.id}_${surah.number}`;
  const isDownloaded = downloadedKeys.includes(dlKey);
  const dlPct = downloadProgress[dlKey];

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
      showToast(
        pickLang(
          lang,
          'Surah saved offline',
          'تم حفظ السورة للاستماع دون إنترنت',
          'অফলাইনে শোনার জন্য সূরাটি সংরক্ষিত হয়েছে'
        )
      );
    } catch (err) {
      setDownloadProgress(dlKey, null);
      const msg =
        err instanceof Error && err.message
          ? err.message
          : pickLang(lang, 'Download failed', 'تعذر التحميل', 'ডাউনলোড ব্যর্থ হয়েছে');
      showToast(msg);
    }
  };

  const fontClass =
    settings.arabicFont === 'scheherazade' ? 'font-quran-scheherazade' : 'font-quran-amiri';

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-surface-light/95 dark:bg-surface-dark/95 backdrop-blur-2xl pt-safe">
      {/* Top Reader Glass App Bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between gap-2 px-3 py-2 glass-nav border-b">
        <div className="flex items-center gap-1 min-w-0">
          <button
            type="button"
            onClick={closeReader}
            aria-label="Back"
            className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full hover:bg-brand-500/10 dark:hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-ink dark:text-ink-dark truncate">
              {surah.number}. {surah.englishName}
            </h1>
            <p className="text-xs text-muted dark:text-muted-dark truncate">
              {surah.name} · {surah.numberOfAyahs} {t.home.ayahs}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => toggleFavoriteSurah(surah.number)}
            aria-label="Favorite Surah"
            className="min-h-[48px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-brand-500/10 dark:hover:bg-white/10"
          >
            <Heart
              className={`w-5 h-5 ${
                isFavSurah ? 'fill-accent text-accent' : 'text-muted dark:text-muted-dark'
              }`}
            />
          </button>

          <button
            type="button"
            onClick={handleDownload}
            aria-label={t.library.downloadSurah}
            className="min-h-[48px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-brand-500/10 dark:hover:bg-white/10 text-brand-600 dark:text-accent"
          >
            {dlPct !== undefined ? (
              <span className="text-xs font-bold tabular-nums">{dlPct}%</span>
            ) : isDownloaded ? (
              <Check className="w-5 h-5" />
            ) : (
              <Download className="w-5 h-5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setShowAyahControls((v) => !v);
              setShowDisplayPanel(false);
            }}
            aria-label="Ayah Repeat Controls"
            className={`min-h-[48px] min-w-[44px] flex items-center justify-center rounded-full ${
              showAyahControls || ayahRangeEnabled || ayahRepeatTarget > 1
                ? 'bg-brand-600/14 text-brand-700 dark:bg-accent/20 dark:text-accent'
                : 'hover:bg-brand-500/10 dark:hover:bg-white/10 text-muted dark:text-muted-dark'
            }`}
          >
            <Repeat className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => {
              setShowDisplayPanel((v) => !v);
              setShowAyahControls(false);
            }}
            aria-label="Reader Typography & Languages"
            className={`min-h-[48px] min-w-[44px] flex items-center justify-center rounded-full ${
              showDisplayPanel
                ? 'bg-brand-600/14 text-brand-700 dark:bg-accent/20 dark:text-accent'
                : 'hover:bg-brand-500/10 dark:hover:bg-white/10 text-muted dark:text-muted-dark'
            }`}
          >
            <Type className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Display / Typography & Multi-Script Language Drawer */}
      {showDisplayPanel && (
        <div className="border-b border-brand-500/15 dark:border-white/12 glass-strong px-4 py-4">
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="flex justify-between text-xs font-semibold text-muted dark:text-muted-dark mb-1.5">
                  <span>{t.settings.fontSize}</span>
                  <span className="tabular-nums">{settings.arabicFontSize}px</span>
                </div>
                <input
                  type="range"
                  min={22}
                  max={44}
                  value={settings.arabicFontSize}
                  onChange={(e) => updateSettings({arabicFontSize: Number(e.target.value)})}
                  className="w-full md-slider bg-brand-900/15 dark:bg-white/20"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateSettings({arabicFont: 'amiri'})}
                  className={`px-3.5 min-h-[44px] rounded-2xl text-xs font-semibold border ${
                    settings.arabicFont === 'amiri'
                      ? 'bg-brand-600 text-white border-brand-600 dark:bg-accent dark:text-brand-950 dark:border-accent'
                      : 'glass text-ink dark:text-ink-dark'
                  }`}
                >
                  Amiri Quran
                </button>
                <button
                  type="button"
                  onClick={() => updateSettings({arabicFont: 'scheherazade'})}
                  className={`px-3.5 min-h-[44px] rounded-2xl text-xs font-semibold border ${
                    settings.arabicFont === 'scheherazade'
                      ? 'bg-brand-600 text-white border-brand-600 dark:bg-accent dark:text-brand-950 dark:border-accent'
                      : 'glass text-ink dark:text-ink-dark'
                  }`}
                >
                  Scheherazade
                </button>
              </div>
            </div>

            {/* Independent Arabic, English, Bangla combination checkboxes */}
            <div className="pt-2 border-t border-brand-500/10 dark:border-white/10 space-y-2.5">
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-xs sm:text-sm font-medium cursor-pointer min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={settings.showArabic}
                    onChange={(e) => updateSettings({showArabic: e.target.checked})}
                    className="w-4 h-4 accent-brand-600 dark:accent-accent"
                  />
                  <span>{t.tafsir.showArabic}</span>
                </label>

                <label className="flex items-center gap-2 text-xs sm:text-sm font-medium cursor-pointer min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={settings.showTranslation}
                    onChange={(e) => updateSettings({showTranslation: e.target.checked})}
                    className="w-4 h-4 accent-brand-600 dark:accent-accent"
                  />
                  <span>{t.tafsir.showEnglish}</span>
                </label>

                <label className="flex items-center gap-2 text-xs sm:text-sm font-medium cursor-pointer min-h-[44px] font-bengali">
                  <input
                    type="checkbox"
                    checked={settings.showBanglaTranslation}
                    onChange={(e) => updateSettings({showBanglaTranslation: e.target.checked})}
                    className="w-4 h-4 accent-brand-600 dark:accent-accent"
                  />
                  <span>{t.tafsir.showBangla}</span>
                </label>
              </div>

              <select
                value={settings.translationEdition}
                onChange={(e) => updateSettings({translationEdition: e.target.value})}
                aria-label={t.settings.translation}
                className="w-full sm:w-auto min-h-[44px] rounded-2xl glass px-3 text-xs font-semibold text-ink dark:text-ink-dark"
              >
                {TRANSLATION_OPTIONS.map((opt) => (
                  <option key={opt.edition} value={opt.edition} className="bg-surface-light dark:bg-surface-dark">
                    {opt.language} — {opt.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Ayah-by-Ayah Repeat & Range Drawer */}
      {showAyahControls && (
        <div className="border-b border-brand-500/15 dark:border-white/12 glass-strong px-4 py-4">
          <div className="max-w-3xl mx-auto space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-ink dark:text-ink-dark">
                {t.player.ayahRepeat}
              </span>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 5, 10].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setAyahRepeatTarget(cnt)}
                    className={`min-w-[44px] min-h-[40px] rounded-xl text-xs font-semibold tabular-nums ${
                      ayahRepeatTarget === cnt
                        ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950'
                        : 'glass text-muted dark:text-muted-dark'
                    }`}
                  >
                    {cnt}x
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer min-h-[40px]">
                <input
                  type="checkbox"
                  checked={ayahRangeEnabled}
                  onChange={(e) =>
                    setAyahRange(
                      e.target.checked,
                      Math.max(1, Math.min(ayahRangeStart, surah.numberOfAyahs)),
                      Math.min(surah.numberOfAyahs, Math.max(ayahRangeEnd, ayahRangeStart))
                    )
                  }
                  className="w-4 h-4 accent-brand-600 dark:accent-accent"
                />
                <span>{t.player.rangeRepeat}</span>
              </label>

              <div className="flex items-center gap-2 text-xs">
                <span>{t.player.fromAyah}</span>
                <input
                  type="number"
                  min={1}
                  max={surah.numberOfAyahs}
                  value={ayahRangeStart}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(surah.numberOfAyahs, Number(e.target.value) || 1));
                    setAyahRange(ayahRangeEnabled, val, Math.max(val, ayahRangeEnd));
                  }}
                  className="w-16 min-h-[40px] rounded-xl glass px-2 text-center tabular-nums"
                />
                <span>{t.player.toAyah}</span>
                <input
                  type="number"
                  min={1}
                  max={surah.numberOfAyahs}
                  value={ayahRangeEnd}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(surah.numberOfAyahs, Number(e.target.value) || 1));
                    setAyahRange(ayahRangeEnabled, Math.min(ayahRangeStart, val), val);
                  }}
                  className="w-16 min-h-[40px] rounded-xl glass px-2 text-center tabular-nums"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer min-h-[40px]">
                <input
                  type="checkbox"
                  checked={continueToNextAyah}
                  onChange={(e) => setContinueToNextAyah(e.target.checked)}
                  className="w-4 h-4 accent-brand-600 dark:accent-accent"
                />
                <span>{t.player.continueNext}</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Scrollable Surah Text Body */}
      <main className="flex-1 overflow-y-auto px-4 pb-32 pt-5">
        <div className="max-w-3xl mx-auto">
          {/* Surah Banner Card */}
          <div className="rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-900 text-white p-6 text-center shadow-lg border border-white/15 mb-6">
            <p className="font-quran-amiri text-3xl sm:text-4xl text-accent-200" dir="rtl">
              {surah.name}
            </p>
            <p className="mt-1.5 text-sm font-semibold text-white/95">
              {surah.englishName} · {surah.englishNameTranslation}
            </p>
            <p className="mt-1 text-xs text-white/80">
              {surah.revelationType === 'Meccan' ? t.home.meccan : t.home.medinan} ·{' '}
              {surah.numberOfAyahs} {t.home.ayahs}
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  if (isCurrentSurahPlaying) {
                    audioManager.pause();
                  } else {
                    audioManager.playSurah(surah.number, reciter.id, 0);
                  }
                }}
                className="md-ripple inline-flex items-center gap-2 px-5 min-h-[48px] rounded-2xl bg-accent text-brand-950 text-xs font-bold shadow-sm"
              >
                {isCurrentSurahPlaying && playMode === 'surah' ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
                <span>{t.player.fullSurah}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  audioManager.playAyah(
                    surah.number,
                    currentSurahNumber === surah.number ? currentAyahNumber : 1,
                    reciter.id
                  )
                }
                className="md-ripple inline-flex items-center gap-2 px-5 min-h-[48px] rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold backdrop-blur-md"
              >
                <Volume2 className="w-4 h-4" />
                <span>{t.player.ayahByAyah}</span>
              </button>
            </div>
          </div>

          {/* Bismillah */}
          {surah.number !== 1 && surah.number !== 9 && settings.showArabic && (
            <p
              className={`${fontClass} text-center text-2xl sm:text-3xl text-brand-700 dark:text-accent mb-6 leading-loose`}
              dir="rtl"
            >
              بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
            </p>
          )}

          {loading && (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-3xl glass p-5 animate-pulse space-y-3">
                  <div className="h-7 bg-brand-900/10 dark:bg-white/12 rounded-lg w-3/4 ms-auto" />
                  <div className="h-4 bg-brand-900/8 dark:bg-white/10 rounded-lg w-full" />
                  <div className="h-4 bg-brand-900/8 dark:bg-white/10 rounded-lg w-2/3" />
                </div>
              ))}
            </div>
          )}

          {error && !loading && (
            <div className="rounded-3xl glass p-8 text-center">
              <p className="text-sm text-muted dark:text-muted-dark">{error}</p>
              <button
                type="button"
                onClick={() => setRetryCount((c) => c + 1)}
                className="md-ripple mt-4 inline-flex items-center gap-2 px-5 min-h-[48px] rounded-2xl bg-brand-600 text-white dark:bg-accent dark:text-brand-950 text-sm font-semibold"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{pickLang(lang, 'Retry', 'إعادة المحاولة', 'পুনরায় চেষ্টা করুন')}</span>
              </button>
            </div>
          )}

          {!loading && !error && detail && (
            <div className="space-y-3">
              {detail.ayahs.map((ayah) => {
                const isActiveAyah =
                  currentSurahNumber === surah.number &&
                  playMode === 'ayah' &&
                  currentAyahNumber === ayah.numberInSurah;

                const favId = `${surah.number}:${ayah.numberInSurah}`;
                const isFavAyah = favoriteAyahs.some((a) => a.id === favId);
                const bnText = banglaVerses?.[ayah.numberInSurah];

                return (
                  <div
                    key={ayah.number}
                    ref={(el) => {
                      ayahRefs.current[ayah.numberInSurah] = el;
                    }}
                    className={`rounded-3xl p-4 sm:p-5 transition-colors border ${
                      isActiveAyah
                        ? 'bg-brand-600/12 dark:bg-accent/14 border-brand-500/45 dark:border-accent/45 shadow-md'
                        : 'glass'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => audioManager.playAyah(surah.number, ayah.numberInSurah, reciter.id)}
                          className={`md-ripple inline-flex items-center gap-2 px-3.5 min-h-[42px] rounded-2xl text-xs font-bold tabular-nums ${
                            isActiveAyah
                              ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950'
                              : 'bg-brand-600/12 dark:bg-white/10 text-brand-700 dark:text-accent'
                          }`}
                        >
                          {isActiveAyah && isLoadingAudio ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : isActiveAyah && isPlaying ? (
                            <Pause className="w-3.5 h-3.5 fill-current" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current" />
                          )}
                          <span>
                            {surah.number}:{ayah.numberInSurah}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openTafsirSheet(surah.number, ayah.numberInSurah, ayah.text)
                          }
                          className="md-ripple inline-flex items-center gap-1.5 px-3 min-h-[42px] rounded-2xl glass text-xs font-semibold text-brand-700 dark:text-accent hover:bg-brand-500/10 dark:hover:bg-white/12"
                        >
                          <BookText className="w-3.5 h-3.5" />
                          <span>{t.tafsir.button}</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          toggleFavoriteAyah({
                            id: favId,
                            surahNumber: surah.number,
                            ayahNumber: ayah.numberInSurah,
                            surahNameEn: surah.englishName,
                            surahNameAr: surah.name,
                            arabicText: ayah.text,
                            translationText: ayah.translation,
                            savedAt: Date.now(),
                          })
                        }
                        aria-label="Favorite Ayah"
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-brand-500/10 dark:hover:bg-white/10"
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            isFavAyah ? 'fill-accent text-accent' : 'text-muted dark:text-muted-dark'
                          }`}
                        />
                      </button>
                    </div>

                    {settings.showArabic && (
                      <p
                        dir="rtl"
                        onClick={() =>
                          audioManager.playAyah(surah.number, ayah.numberInSurah, reciter.id)
                        }
                        className={`${fontClass} text-right leading-[2.1] text-ink dark:text-ink-dark cursor-pointer select-text`}
                        style={{fontSize: `${settings.arabicFontSize}px`}}
                      >
                        {ayah.text}
                      </p>
                    )}

                    {settings.showTranslation && ayah.translation && (
                      <p className="mt-3 text-sm sm:text-[15px] leading-relaxed text-muted dark:text-muted-dark">
                        {ayah.translation}
                      </p>
                    )}

                    {settings.showBanglaTranslation && (
                      <div className="mt-3 pt-2.5 border-t border-brand-500/10 dark:border-white/10">
                        {banglaLoading && !bnText ? (
                          <div className="h-4 w-3/4 rounded bg-brand-900/10 dark:bg-white/10 animate-pulse" />
                        ) : bnText ? (
                          <p className="font-bengali text-sm sm:text-[15px] leading-relaxed text-ink/90 dark:text-ink-dark/90">
                            {bnText}
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Surah Prev/Next Footer Navigation */}
              <div className="pt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={surah.number <= 1}
                  onClick={() => openReader(surah.number - 1)}
                  className="md-ripple inline-flex items-center gap-1.5 px-4 min-h-[48px] rounded-2xl glass text-xs font-semibold disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                  <span>{pickLang(lang, 'Previous Surah', 'السورة السابقة', 'পূর্ববর্তী সূরা')}</span>
                </button>

                <button
                  type="button"
                  disabled={surah.number >= 114}
                  onClick={() => openReader(surah.number + 1)}
                  className="md-ripple inline-flex items-center gap-1.5 px-4 min-h-[48px] rounded-2xl glass text-xs font-semibold disabled:opacity-40"
                >
                  <span>{pickLang(lang, 'Next Surah', 'السورة التالية', 'পরবর্তী সূরা')}</span>
                  <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Compact Reader Glass Playback Bar */}
      <div className="sticky bottom-0 z-20 glass-nav border-t px-4 py-2.5 pb-safe">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-ink dark:text-ink-dark truncate">
              {lang === 'ar' ? reciter.nameAr : reciter.nameEn}
            </p>
            <p className="text-[11px] text-muted dark:text-muted-dark truncate">
              {playMode === 'ayah'
                ? `${pickLang(lang, 'Ayah', 'آية', 'আয়াত')} ${currentAyahNumber} · ${ayahRepeatTarget}x`
                : t.player.fullSurah}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowAyahControls((v) => !v)}
              aria-label="Ayah Repeat"
              className="min-h-[48px] px-3.5 rounded-2xl glass text-xs font-semibold flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{ayahRepeatTarget}x</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (currentSurahNumber !== surah.number) {
                  audioManager.playAyah(surah.number, 1, reciter.id);
                } else {
                  audioManager.togglePlay();
                }
              }}
              aria-label={isCurrentSurahPlaying ? 'Pause' : 'Play'}
              className="md-ripple min-h-[48px] px-5 rounded-2xl bg-brand-600 text-white dark:bg-accent dark:text-brand-950 text-xs font-semibold flex items-center gap-2 shadow-sm"
            >
              {isLoadingAudio && currentSurahNumber === surah.number ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isCurrentSurahPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
              <span>
                {isCurrentSurahPlaying
                  ? pickLang(lang, 'Pause', 'إيقاف', 'বিরতি')
                  : pickLang(lang, 'Listen', 'استماع', 'শুনুন')}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Tafsir Glass Bottom Sheet */}
      <TafsirSheet />
    </div>
  );
};
