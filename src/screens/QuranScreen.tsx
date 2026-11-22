import {
  BookMarked,
  BookOpen,
  ChevronRight,
  Heart,
  Pause,
  Play,
  Search,
  X,
} from 'lucide-react';
import React, {useMemo, useState} from 'react';
import {pickLang, TRANSLATIONS} from '../data/i18n';
import {
  getSurahNumberForPage,
  JUZ_DATA,
  SURAH_START_PAGES,
  TOTAL_QURAN_PAGES,
} from '../data/quranMeta';
import {audioManager} from '../services/audioManager';
import {useQuranStore} from '../store/useQuranStore';

type QuranSubTab = 'surah' | 'juz' | 'page';

export const QuranScreen: React.FC = () => {
  const surahs = useQuranStore((s) => s.surahs);
  const currentSurahNumber = useQuranStore((s) => s.currentSurahNumber);
  const currentReciterId = useQuranStore((s) => s.currentReciterId);
  const isPlaying = useQuranStore((s) => s.isPlaying);
  const favoriteSurahNumbers = useQuranStore((s) => s.favoriteSurahNumbers);
  const lastReadQuran = useQuranStore((s) => s.lastReadQuran);
  const lang = useQuranStore((s) => s.settings.language);

  const openReader = useQuranStore((s) => s.openReader);
  const toggleFavoriteSurah = useQuranStore((s) => s.toggleFavoriteSurah);

  const [subTab, setSubTab] = useState<QuranSubTab>('surah');
  const [query, setQuery] = useState('');
  const [surahFilter, setSurahFilter] = useState<'all' | 'meccan' | 'medinan' | 'short'>('all');
  const [pageInput, setPageInput] = useState('1');
  const [pageGroupStart, setPageGroupStart] = useState(1);

  const t = TRANSLATIONS[lang];

  const continueSurah = lastReadQuran
    ? surahs.find((s) => s.number === lastReadQuran.surahNumber) || surahs[0]
    : null;

  const filteredSurahs = useMemo(() => {
    const clean = query.trim().toLowerCase();
    return surahs.filter((s) => {
      if (surahFilter === 'meccan' && s.revelationType !== 'Meccan') return false;
      if (surahFilter === 'medinan' && s.revelationType !== 'Medinan') return false;
      if (surahFilter === 'short' && s.numberOfAyahs > 20) return false;
      if (!clean) return true;
      return (
        String(s.number) === clean ||
        s.englishName.toLowerCase().includes(clean) ||
        s.englishNameTranslation.toLowerCase().includes(clean) ||
        s.name.includes(query.trim())
      );
    });
  }, [surahs, surahFilter, query]);

  const filteredJuz = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return JUZ_DATA;
    return JUZ_DATA.filter((j) => {
      const s = surahs.find((x) => x.number === j.startSurah);
      return (
        String(j.juz) === clean ||
        j.nameEn.toLowerCase().includes(clean) ||
        j.nameAr.includes(query.trim()) ||
        (s && s.englishName.toLowerCase().includes(clean))
      );
    });
  }, [query, surahs]);

  const visiblePages = useMemo(() => {
    const arr: number[] = [];
    const end = Math.min(TOTAL_QURAN_PAGES, pageGroupStart + 59);
    for (let p = pageGroupStart; p <= end; p++) arr.push(p);
    return arr;
  }, [pageGroupStart]);

  const handleOpenPage = (pageNum: number) => {
    const clamped = Math.max(1, Math.min(TOTAL_QURAN_PAGES, pageNum));
    const surahNum = getSurahNumberForPage(clamped);
    openReader(surahNum);
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-ink dark:text-ink-dark">{t.quranTab.title}</h1>
        <p className="text-xs text-muted dark:text-muted-dark mt-0.5">{t.quranTab.subtitle}</p>
      </div>

      {/* Continue Reading Card */}
      {lastReadQuran && continueSurah && (
        <button
          type="button"
          onClick={() => openReader(lastReadQuran.surahNumber, lastReadQuran.ayahNumber)}
          className="md-ripple w-full text-start rounded-3xl glass-strong p-4 sm:p-5 flex items-center justify-between gap-3 border border-brand-500/25 dark:border-accent/30"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white dark:bg-accent dark:text-brand-950 flex items-center justify-center shrink-0">
              <BookMarked className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-brand-700 dark:text-accent">
                {t.quranTab.continueReading}
              </p>
              <p className="text-sm font-bold text-ink dark:text-ink-dark truncate mt-0.5">
                {continueSurah.number}. {continueSurah.englishName} ·{' '}
                {pickLang(lang, 'Ayah', 'آية', 'আয়াত')} {lastReadQuran.ayahNumber}
              </p>
              <p className="text-xs text-muted dark:text-muted-dark truncate font-quran-amiri">
                {continueSurah.name}
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 rtl:rotate-180 text-muted dark:text-muted-dark shrink-0" />
        </button>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute start-4 top-1/2 -translate-y-1/2 text-muted dark:text-muted-dark pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.quranTab.searchPlaceholder}
          aria-label={t.quranTab.searchPlaceholder}
          className="w-full min-h-[48px] rounded-2xl glass-strong ps-11 pe-10 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-accent"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute end-1.5 top-1/2 -translate-y-1/2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Sub-tabs: Surah / Juz / Page */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl glass max-w-lg">
        {(
          [
            {id: 'surah', label: t.quranTab.surahTab},
            {id: 'juz', label: t.quranTab.juzTab},
            {id: 'page', label: t.quranTab.pageTab},
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            className={`min-h-[44px] rounded-xl text-xs font-semibold transition-colors ${
              subTab === tab.id
                ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950 shadow-sm'
                : 'text-muted dark:text-muted-dark'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SUBTAB 1: 114 SURAHS */}
      {subTab === 'surah' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-1 p-1 rounded-2xl glass w-fit">
            {(
              [
                {id: 'all', en: 'All', ar: 'الكل', bn: 'সব'},
                {id: 'meccan', en: 'Meccan', ar: 'مكية', bn: 'মক্কী'},
                {id: 'medinan', en: 'Medinan', ar: 'مدنية', bn: 'মাদানী'},
                {id: 'short', en: 'Short', ar: 'قصار', bn: 'ছোট'},
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSurahFilter(tab.id)}
                className={`px-3 min-h-[38px] rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  surahFilter === tab.id
                    ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950 shadow-sm'
                    : 'text-muted dark:text-muted-dark'
                }`}
              >
                {pickLang(lang, tab.en, tab.ar, tab.bn)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredSurahs.map((s) => {
              const isCurrent = currentSurahNumber === s.number;
              const isFav = favoriteSurahNumbers.includes(s.number);
              const startPage = SURAH_START_PAGES[s.number - 1];
              return (
                <div
                  key={s.number}
                  className={`rounded-3xl p-4 flex items-center justify-between gap-2 transition-colors border ${
                    isCurrent
                      ? 'bg-brand-600/12 dark:bg-accent/14 border-brand-500/45 dark:border-accent/45 shadow-md'
                      : 'glass'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => openReader(s.number)}
                    className="flex-1 min-w-0 flex items-center gap-3 text-start min-h-[48px]"
                  >
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xs font-bold tabular-nums shrink-0 ${
                        isCurrent
                          ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950'
                          : 'bg-brand-600/14 dark:bg-white/10 text-brand-700 dark:text-accent'
                      }`}
                    >
                      {s.number}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-ink dark:text-ink-dark truncate">
                          {s.englishName}
                        </span>
                        <span
                          className="font-quran-amiri text-base text-brand-700 dark:text-accent shrink-0"
                          dir="rtl"
                        >
                          {s.name}
                        </span>
                      </div>
                      <p className="text-xs text-muted dark:text-muted-dark truncate tabular-nums">
                        {s.englishNameTranslation} · {s.numberOfAyahs} {t.home.ayahs} · p.{startPage}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleFavoriteSurah(s.number)}
                      aria-label={`Favorite ${s.englishName}`}
                      className="min-h-[48px] min-w-[44px] flex items-center justify-center rounded-2xl hover:bg-brand-500/10 dark:hover:bg-white/10"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isFav ? 'fill-accent text-accent' : 'text-muted dark:text-muted-dark'
                        }`}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (isCurrent && isPlaying) {
                          audioManager.pause();
                        } else {
                          audioManager.playSurah(s.number, currentReciterId, 0);
                        }
                      }}
                      aria-label={`Play ${s.englishName}`}
                      className="md-ripple min-h-[48px] min-w-[48px] flex items-center justify-center rounded-2xl bg-brand-600/14 dark:bg-white/10 text-brand-700 dark:text-accent"
                    >
                      {isCurrent && isPlaying ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ms-0.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 2: ALL 30 JUZ */}
      {subTab === 'juz' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredJuz.map((j) => {
            const startSurahMeta = surahs.find((s) => s.number === j.startSurah);
            return (
              <button
                key={j.juz}
                type="button"
                onClick={() => openReader(j.startSurah, j.startAyah)}
                className="md-ripple rounded-3xl glass p-4 flex items-center justify-between gap-3 text-start min-h-[76px]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-brand-600/14 dark:bg-accent/18 text-brand-700 dark:text-accent flex items-center justify-center text-xs font-bold tabular-nums shrink-0">
                    {j.juz}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <p className="text-sm font-bold text-ink dark:text-ink-dark truncate">
                        {t.quranTab.juzLabel} {j.juz} · {j.nameEn}
                      </p>
                    </div>
                    <p className="text-xs text-muted dark:text-muted-dark truncate mt-0.5">
                      {t.quranTab.startsAt} {startSurahMeta?.englishName || `Surah ${j.startSurah}`}:
                      {j.startAyah} · {t.quranTab.pageLabel} {j.startPage}
                    </p>
                  </div>
                </div>
                <span className="font-quran-amiri text-lg text-brand-700 dark:text-accent shrink-0" dir="rtl">
                  {j.nameAr}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* SUBTAB 3: MUSHAF PAGES 1-604 */}
      {subTab === 'page' && (
        <div className="space-y-4">
          {/* Quick Page Jump */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleOpenPage(Number(pageInput) || 1);
            }}
            className="rounded-3xl glass p-4 flex flex-wrap items-center gap-3"
          >
            <BookOpen className="w-5 h-5 text-brand-600 dark:text-accent shrink-0" />
            <input
              type="number"
              min={1}
              max={TOTAL_QURAN_PAGES}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              aria-label="Mushaf page number (1-604)"
              className="w-28 min-h-[44px] rounded-2xl glass px-3 text-sm font-bold tabular-nums text-center"
            />
            <button
              type="submit"
              className="md-ripple px-5 min-h-[44px] rounded-2xl bg-brand-600 text-white dark:bg-accent dark:text-brand-950 text-xs font-semibold"
            >
              {t.quranTab.jumpPage} (1–604)
            </button>
          </form>

          {/* Range switcher */}
          <div className="flex flex-wrap gap-1.5">
            {[1, 61, 121, 181, 241, 301, 361, 421, 481, 541, 601].map((start) => {
              const end = Math.min(TOTAL_QURAN_PAGES, start + 59);
              const active = pageGroupStart === start;
              return (
                <button
                  key={start}
                  type="button"
                  onClick={() => setPageGroupStart(start)}
                  className={`px-3 min-h-[38px] rounded-xl text-xs font-semibold tabular-nums ${
                    active
                      ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950'
                      : 'glass text-muted dark:text-muted-dark'
                  }`}
                >
                  {start}–{end}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
            {visiblePages.map((p) => {
              const sNum = getSurahNumberForPage(p);
              const sMeta = surahs.find((s) => s.number === sNum);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleOpenPage(p)}
                  className="md-ripple rounded-2xl glass p-3 text-start min-h-[60px] flex flex-col justify-between"
                >
                  <span className="text-xs font-bold text-brand-700 dark:text-accent tabular-nums">
                    {t.quranTab.pageLabel} {p}
                  </span>
                  <span className="text-xs text-ink dark:text-ink-dark truncate mt-1">
                    {sNum}. {sMeta?.englishName}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
export default QuranScreen;
