import {
  ArrowLeft,
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
import {TRANSLATIONS} from '../data/i18n';
import {TRANSLATION_OPTIONS} from '../data/recitersAndPlaylists';
import {audioManager} from '../services/audioManager';
import {listAudioDownloads} from '../services/db';
import {downloadSurahForOffline, fetchSurahWithTranslation} from '../services/quranApi';
import {useQuranStore} from '../store/useQuranStore';
import {SurahDetail} from '../types/quran';

export const ReaderView: React.FC = () => {
  const readerSurahNumber = useQuranStore((s) => s.readerSurahNumber);
  const closeReader = useQuranStore((s) => s.closeReader);
  const openReader = useQuranStore((s) => s.openReader);
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDisplayPanel, setShowDisplayPanel] = useState(false);
  const [showAyahControls, setShowAyahControls] = useState(false);

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
            lang === 'ar'
              ? 'تعذر تحميل نص السورة. تأكد من اتصالك بالإنترنت للمرة الأولى.'
              : 'Unable to load surah text. Connect once to cache this surah offline.'
          );
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [readerSurahNumber, settings.translationEdition, lang]);

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
      showToast(lang === 'ar' ? 'تم حفظ السورة للاستماع دون إنترنت' : 'Surah saved offline');
    } catch {
      setDownloadProgress(dlKey, null);
      showToast(lang === 'ar' ? 'تعذر التحميل' : 'Download failed');
    }
  };

  const fontClass =
    settings.arabicFont === 'scheherazade' ? 'font-quran-scheherazade' : 'font-quran-amiri';

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#F6F8F7] dark:bg-[#0B1210] pt-safe">
      {/* Top Reader App Bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between gap-2 px-3 py-2 bg-[#F6F8F7]/95 dark:bg-[#0B1210]/95 backdrop-blur-md border-b border-black/8 dark:border-white/10">
        <div className="flex items-center gap-1 min-w-0">
          <button
            type="button"
            onClick={closeReader}
            aria-label="Back"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-[#13201C] dark:text-[#ECF2EF] truncate">
              {surah.number}. {surah.englishName}
            </h1>
            <p className="text-xs text-[#546660] dark:text-[#96ABA3] truncate">
              {surah.name} · {surah.numberOfAyahs} {t.home.ayahs}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => toggleFavoriteSurah(surah.number)}
            aria-label="Favorite Surah"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          >
            <Heart
              className={`w-5 h-5 ${
                isFavSurah ? 'fill-[#C69749] text-[#C69749]' : 'text-[#546660] dark:text-[#96ABA3]'
              }`}
            />
          </button>

          <button
            type="button"
            onClick={handleDownload}
            aria-label={t.library.downloadSurah}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#0F5C4D] dark:text-[#4ECBA9]"
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
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full ${
              showAyahControls || ayahRangeEnabled || ayahRepeatTarget > 1
                ? 'bg-[#0F5C4D]/12 text-[#0F5C4D] dark:bg-[#4ECBA9]/20 dark:text-[#4ECBA9]'
                : 'hover:bg-black/5 dark:hover:bg-white/10 text-[#546660] dark:text-[#96ABA3]'
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
            aria-label="Reader Typography"
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full ${
              showDisplayPanel
                ? 'bg-[#0F5C4D]/12 text-[#0F5C4D] dark:bg-[#4ECBA9]/20 dark:text-[#4ECBA9]'
                : 'hover:bg-black/5 dark:hover:bg-white/10 text-[#546660] dark:text-[#96ABA3]'
            }`}
          >
            <Type className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Display / Typography Settings Drawer */}
      {showDisplayPanel && (
        <div className="border-b border-black/8 dark:border-white/10 bg-[#EDF3F0] dark:bg-[#131F1C] px-4 py-4">
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="flex justify-between text-xs font-medium text-[#43544E] dark:text-[#A4B7B0] mb-1.5">
                  <span>{t.settings.fontSize}</span>
                  <span className="tabular-nums">{settings.arabicFontSize}px</span>
                </div>
                <input
                  type="range"
                  min={22}
                  max={44}
                  value={settings.arabicFontSize}
                  onChange={(e) => updateSettings({arabicFontSize: Number(e.target.value)})}
                  className="w-full md-slider bg-black/15 dark:bg-white/15"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateSettings({arabicFont: 'amiri'})}
                  className={`px-3 min-h-[40px] rounded-xl text-xs font-medium border ${
                    settings.arabicFont === 'amiri'
                      ? 'bg-[#0F5C4D] text-white border-[#0F5C4D] dark:bg-[#4ECBA9] dark:text-[#081A15] dark:border-[#4ECBA9]'
                      : 'bg-white dark:bg-[#1A2924] border-black/10 dark:border-white/10'
                  }`}
                >
                  Amiri Quran
                </button>
                <button
                  type="button"
                  onClick={() => updateSettings({arabicFont: 'scheherazade'})}
                  className={`px-3 min-h-[40px] rounded-xl text-xs font-medium border ${
                    settings.arabicFont === 'scheherazade'
                      ? 'bg-[#0F5C4D] text-white border-[#0F5C4D] dark:bg-[#4ECBA9] dark:text-[#081A15] dark:border-[#4ECBA9]'
                      : 'bg-white dark:bg-[#1A2924] border-black/10 dark:border-white/10'
                  }`}
                >
                  Scheherazade
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-black/5 dark:border-white/10">
              <label className="flex items-center gap-2.5 text-sm font-medium cursor-pointer min-h-[40px]">
                <input
                  type="checkbox"
                  checked={settings.showTranslation}
                  onChange={(e) => updateSettings({showTranslation: e.target.checked})}
                  className="w-4 h-4 accent-[#0F5C4D] dark:accent-[#4ECBA9]"
                />
                <span>{t.settings.showTranslation}</span>
              </label>

              <select
                value={settings.translationEdition}
                onChange={(e) => updateSettings({translationEdition: e.target.value})}
                aria-label={t.settings.translation}
                className="min-h-[40px] rounded-xl bg-white dark:bg-[#1A2924] px-3 text-xs font-medium border border-black/10 dark:border-white/10"
              >
                {TRANSLATION_OPTIONS.map((opt) => (
                  <option key={opt.edition} value={opt.edition}>
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
        <div className="border-b border-black/8 dark:border-white/10 bg-[#EDF3F0] dark:bg-[#131F1C] px-4 py-4">
          <div className="max-w-3xl mx-auto space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-semibold text-[#13201C] dark:text-[#ECF2EF]">
                {t.player.ayahRepeat}
              </span>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 5, 10].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setAyahRepeatTarget(cnt)}
                    className={`min-w-[40px] min-h-[36px] rounded-xl text-xs font-semibold tabular-nums ${
                      ayahRepeatTarget === cnt
                        ? 'bg-[#0F5C4D] text-white dark:bg-[#4ECBA9] dark:text-[#081A15]'
                        : 'bg-white dark:bg-[#1A2924] text-[#43544E] dark:text-[#A4B7B0]'
                    }`}
                  >
                    {cnt}x
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer min-h-[36px]">
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
                  className="w-4 h-4 accent-[#0F5C4D]"
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
                  className="w-16 min-h-[36px] rounded-xl bg-white dark:bg-[#1A2924] px-2 text-center tabular-nums border border-black/10 dark:border-white/10"
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
                  className="w-16 min-h-[36px] rounded-xl bg-white dark:bg-[#1A2924] px-2 text-center tabular-nums border border-black/10 dark:border-white/10"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer min-h-[36px]">
                <input
                  type="checkbox"
                  checked={continueToNextAyah}
                  onChange={(e) => setContinueToNextAyah(e.target.checked)}
                  className="w-4 h-4 accent-[#0F5C4D]"
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
          <div className="rounded-3xl bg-gradient-to-br from-[#0F5C4D] to-[#08352C] text-white p-6 text-center shadow-md mb-6">
            <p className="font-quran-amiri text-3xl sm:text-4xl text-[#F4E6C3]" dir="rtl">
              {surah.name}
            </p>
            <p className="mt-1.5 text-sm font-medium text-white/90">
              {surah.englishName} · {surah.englishNameTranslation}
            </p>
            <p className="mt-1 text-xs text-white/75">
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
                className="md-ripple inline-flex items-center gap-2 px-5 min-h-[44px] rounded-2xl bg-[#E2B76B] text-[#111C18] text-xs font-semibold"
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
                className="md-ripple inline-flex items-center gap-2 px-5 min-h-[44px] rounded-2xl bg-white/15 hover:bg-white/20 text-white text-xs font-semibold"
              >
                <Volume2 className="w-4 h-4" />
                <span>{t.player.ayahByAyah}</span>
              </button>
            </div>
          </div>

          {/* Bismillah */}
          {surah.number !== 1 && surah.number !== 9 && (
            <p
              className={`${fontClass} text-center text-2xl sm:text-3xl text-[#0F5C4D] dark:text-[#E2B76B] mb-6 leading-loose`}
              dir="rtl"
            >
              بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
            </p>
          )}

          {loading && (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-white dark:bg-[#131F1C] p-5 animate-pulse space-y-3"
                >
                  <div className="h-7 bg-black/8 dark:bg-white/10 rounded-lg w-3/4 ms-auto" />
                  <div className="h-4 bg-black/6 dark:bg-white/8 rounded-lg w-full" />
                  <div className="h-4 bg-black/6 dark:bg-white/8 rounded-lg w-2/3" />
                </div>
              ))}
            </div>
          )}

          {error && !loading && (
            <div className="rounded-3xl bg-white dark:bg-[#131F1C] p-8 text-center border border-black/8 dark:border-white/10">
              <p className="text-sm text-[#43544E] dark:text-[#A4B7B0]">{error}</p>
              <button
                type="button"
                onClick={() => openReader(surah.number)}
                className="mt-4 inline-flex items-center gap-2 px-4 min-h-[44px] rounded-2xl bg-[#0F5C4D] text-white dark:bg-[#4ECBA9] dark:text-[#081A15] text-sm font-medium"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}</span>
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

                return (
                  <div
                    key={ayah.number}
                    ref={(el) => {
                      ayahRefs.current[ayah.numberInSurah] = el;
                    }}
                    className={`rounded-2xl p-4 sm:p-5 transition-colors border ${
                      isActiveAyah
                        ? 'bg-[#0F5C4D]/8 dark:bg-[#4ECBA9]/12 border-[#0F5C4D]/35 dark:border-[#4ECBA9]/35'
                        : 'bg-white dark:bg-[#131F1C] border-black/5 dark:border-white/8'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => audioManager.playAyah(surah.number, ayah.numberInSurah, reciter.id)}
                        className={`md-ripple inline-flex items-center gap-2 px-3 min-h-[38px] rounded-xl text-xs font-semibold tabular-nums ${
                          isActiveAyah
                            ? 'bg-[#0F5C4D] text-white dark:bg-[#4ECBA9] dark:text-[#081A15]'
                            : 'bg-[#EDF3F0] dark:bg-[#1B2B25] text-[#0F5C4D] dark:text-[#4ECBA9]'
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
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            isFavAyah
                              ? 'fill-[#C69749] text-[#C69749]'
                              : 'text-[#546660] dark:text-[#96ABA3]'
                          }`}
                        />
                      </button>
                    </div>

                    <p
                      dir="rtl"
                      onClick={() =>
                        audioManager.playAyah(surah.number, ayah.numberInSurah, reciter.id)
                      }
                      className={`${fontClass} text-right leading-[2.1] text-[#13201C] dark:text-[#F1F5F3] cursor-pointer select-text`}
                      style={{fontSize: `${settings.arabicFontSize}px`}}
                    >
                      {ayah.text}
                    </p>

                    {settings.showTranslation && ayah.translation && (
                      <p className="mt-3 text-sm sm:text-[15px] leading-relaxed text-[#43544E] dark:text-[#B4C6BF]">
                        {ayah.translation}
                      </p>
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
                  className="md-ripple inline-flex items-center gap-1.5 px-4 min-h-[44px] rounded-2xl bg-white dark:bg-[#131F1C] border border-black/10 dark:border-white/10 text-xs font-medium disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                  <span>{lang === 'ar' ? 'السورة السابقة' : 'Previous Surah'}</span>
                </button>

                <button
                  type="button"
                  disabled={surah.number >= 114}
                  onClick={() => openReader(surah.number + 1)}
                  className="md-ripple inline-flex items-center gap-1.5 px-4 min-h-[44px] rounded-2xl bg-white dark:bg-[#131F1C] border border-black/10 dark:border-white/10 text-xs font-medium disabled:opacity-40"
                >
                  <span>{lang === 'ar' ? 'السورة التالية' : 'Next Surah'}</span>
                  <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Compact Reader Playback Bar */}
      <div
        className="sticky bottom-0 z-20 bg-white/95 dark:bg-[#131F1C]/95 backdrop-blur-md border-t border-black/8 dark:border-white/10 px-4 py-2.5 pb-safe"
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#13201C] dark:text-[#ECF2EF] truncate">
              {lang === 'ar' ? reciter.nameAr : reciter.nameEn}
            </p>
            <p className="text-[11px] text-[#546660] dark:text-[#96ABA3] truncate">
              {playMode === 'ayah'
                ? `${lang === 'ar' ? 'آية' : 'Ayah'} ${currentAyahNumber} · ${ayahRepeatTarget}x`
                : t.player.fullSurah}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowAyahControls((v) => !v)}
              aria-label="Ayah Repeat"
              className="min-h-[44px] px-3 rounded-xl bg-[#EDF3F0] dark:bg-[#1B2B25] text-xs font-medium flex items-center gap-1.5"
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
              className="md-ripple min-h-[44px] px-5 rounded-2xl bg-[#0F5C4D] text-white dark:bg-[#4ECBA9] dark:text-[#081A15] text-xs font-semibold flex items-center gap-2"
            >
              {isLoadingAudio && currentSurahNumber === surah.number ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isCurrentSurahPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
              <span>{isCurrentSurahPlaying ? (lang === 'ar' ? 'إيقاف' : 'Pause') : (lang === 'ar' ? 'استماع' : 'Listen')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
