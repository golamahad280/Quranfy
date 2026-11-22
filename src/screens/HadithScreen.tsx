import {
  ArrowLeft,
  BookMarked,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Copy,
  Heart,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Search,
  Share2,
  SlidersHorizontal,
  Square,
  Volume2,
  WifiOff,
  X,
} from 'lucide-react';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {pickLang, TRANSLATIONS} from '../data/i18n';
import {listCachedHadithSectionKeys} from '../services/db';
import {
  fetchHadithCatalog,
  fetchHadithSection,
  searchHadithsInCollection,
} from '../services/hadithApi';
import {HadithSpeakLanguage, hadithTts} from '../services/hadithTts';
import {registerHadithBackHandler} from '../services/native';
import {useQuranStore} from '../store/useQuranStore';
import {
  HadithCollectionInfo,
  HadithCollectionSlug,
  HadithEntry,
  HadithSectionMeta,
} from '../types/quran';

type HadithViewMode = 'combined' | 'ar' | 'en' | 'bn';

const PAGE_SIZE = 20;
const TTS_SPEEDS = [0.75, 0.9, 1, 1.25, 1.5];

export interface HadithDeepLink {
  collectionSlug: HadithCollectionSlug;
  sectionNumber?: string;
  hadithNumber?: number;
}

export const HadithScreen: React.FC = () => {
  const settings = useQuranStore((s) => s.settings);
  const favoriteHadiths = useQuranStore((s) => s.favoriteHadiths);
  const hadithBookmark = useQuranStore((s) => s.hadithBookmark);
  const hadithFontSize = useQuranStore((s) => s.hadithFontSize);
  const hadithTtsSpeed = useQuranStore((s) => s.hadithTtsSpeed);
  const hadithAutoNext = useQuranStore((s) => s.hadithAutoNext);

  const toggleFavoriteHadith = useQuranStore((s) => s.toggleFavoriteHadith);
  const setHadithBookmark = useQuranStore((s) => s.setHadithBookmark);
  const setHadithFontSize = useQuranStore((s) => s.setHadithFontSize);
  const setHadithTtsSpeed = useQuranStore((s) => s.setHadithTtsSpeed);
  const setHadithAutoNext = useQuranStore((s) => s.setHadithAutoNext);
  const showToast = useQuranStore((s) => s.showToast);

  const lang = settings.language;
  const t = TRANSLATIONS[lang];

  const [subTab, setSubTab] = useState<'collections' | 'favorites'>('collections');
  const [collections, setCollections] = useState<HadithCollectionInfo[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [cachedKeys, setCachedKeys] = useState<Set<string>>(new Set());

  const [selectedCollection, setSelectedCollection] = useState<HadithCollectionInfo | null>(null);
  const [selectedSection, setSelectedSection] = useState<HadithSectionMeta | null>(null);
  const [sectionHadiths, setSectionHadiths] = useState<HadithEntry[]>([]);
  const [sectionHasBangla, setSectionHasBangla] = useState(true);
  const [sectionFromCache, setSectionFromCache] = useState(false);
  const [loadingSection, setLoadingSection] = useState(false);
  const [sectionError, setSectionError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Search within selected collection
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<HadithEntry[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Per-view language mode & detail modal
  const [viewMode, setViewMode] = useState<HadithViewMode>('combined');
  const [cardLangOverrides, setCardLangOverrides] = useState<Record<number, HadithViewMode>>({});
  const [detailHadith, setDetailHadith] = useState<HadithEntry | null>(null);

  // TTS state
  const [ttsStatus, setTtsStatus] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [ttsSpeakingNumber, setTtsSpeakingNumber] = useState<number | null>(null);
  const [ttsLang, setTtsLang] = useState<HadithSpeakLanguage>(
    lang === 'bn' ? 'bn' : lang === 'ar' ? 'ar' : 'en'
  );
  const [ttsWarning, setTtsWarning] = useState<{msg: string; missingVoice: boolean} | null>(null);

  const [catalogRetryTick, setCatalogRetryTick] = useState(0);

  // Refs for auto-next inside TTS callback without stale closures
  const activeListRef = useRef<HadithEntry[]>([]);
  const speakHadithRef = useRef<(entry: HadithEntry, overrideLang?: HadithSpeakLanguage) => void>(
    () => {}
  );

  // Load collections & offline cache index
  useEffect(() => {
    let active = true;
    setLoadingCatalog(true);
    setCatalogError(null);

    Promise.all([fetchHadithCatalog(), listCachedHadithSectionKeys()])
      .then(([cols, keys]) => {
        if (!active) return;
        setCollections(cols);
        setCachedKeys(new Set(keys));
        setLoadingCatalog(false);
      })
      .catch(() => {
        if (!active) return;
        setCatalogError(t.hadith.offlineError);
        setLoadingCatalog(false);
      });

    return () => {
      active = false;
    };
  }, [catalogRetryTick, t.hadith.offlineError]);

  // Stop TTS if leaving Hadith screen
  useEffect(() => {
    return () => {
      void hadithTts.stop();
    };
  }, []);

  // Register Android back-button sub-navigation handler
  useEffect(() => {
    registerHadithBackHandler(() => {
      if (detailHadith) {
        setDetailHadith(null);
        return true;
      }
      if (searchResults !== null) {
        setSearchResults(null);
        setSearchQuery('');
        return true;
      }
      if (selectedSection) {
        setSelectedSection(null);
        setSectionHadiths([]);
        setSectionError(null);
        return true;
      }
      if (selectedCollection) {
        setSelectedCollection(null);
        setSearchResults(null);
        setSearchQuery('');
        return true;
      }
      return false;
    });
    return () => registerHadithBackHandler(null);
  }, [detailHadith, searchResults, selectedSection, selectedCollection]);

  const getCollectionTitle = (col: {nameEn: string; nameAr: string; nameBn: string}) =>
    pickLang(lang, col.nameEn, col.nameAr, col.nameBn);

  const openSection = useCallback(
    async (collection: HadithCollectionInfo, section: HadithSectionMeta, focusHadithNum?: number) => {
      setSelectedCollection(collection);
      setSelectedSection(section);
      setSearchResults(null);
      setLoadingSection(true);
      setSectionError(null);
      setVisibleCount(PAGE_SIZE);

      try {
        const {cache, fromCache} = await fetchHadithSection(collection, section.sectionNumber);
        setSectionHadiths(cache.entries);
        setSectionHasBangla(cache.hasBangla);
        setSectionFromCache(fromCache);
        setCachedKeys((prev) => new Set(prev).add(`${collection.slug}_${section.sectionNumber}`));
        setLoadingSection(false);

        const targetEntry =
          (focusHadithNum
            ? cache.entries.find((e) => e.hadithNumber === focusHadithNum)
            : cache.entries[0]) || cache.entries[0];

        if (targetEntry) {
          setHadithBookmark({
            collectionSlug: collection.slug,
            sectionNumber: section.sectionNumber,
            hadithNumber: targetEntry.hadithNumber,
            sectionTitle: section.title,
            updatedAt: Date.now(),
          });
          if (focusHadithNum) {
            setDetailHadith(targetEntry);
          }
        }
      } catch {
        setSectionHadiths([]);
        setSectionError(t.hadith.offlineError);
        setLoadingSection(false);
      }
    },
    [setHadithBookmark, t.hadith.offlineError]
  );

  const handleContinueBookmark = async () => {
    if (!hadithBookmark || collections.length === 0) return;
    const col = collections.find((c) => c.slug === hadithBookmark.collectionSlug);
    if (!col) return;
    const sec = col.sections.find((s) => s.sectionNumber === hadithBookmark.sectionNumber) || {
      sectionNumber: hadithBookmark.sectionNumber,
      title: hadithBookmark.sectionTitle,
    };
    await openSection(col, sec, hadithBookmark.hadithNumber);
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollection || !searchQuery.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      const results = await searchHadithsInCollection(selectedCollection, searchQuery, lang);
      setSearchResults(results);
      setSearching(false);
    } catch {
      setSearchError(t.hadith.offlineError);
      setSearching(false);
    }
  };

  const activeHadithList = useMemo(() => {
    if (searchResults !== null) return searchResults;
    return sectionHadiths;
  }, [searchResults, sectionHadiths]);

  activeListRef.current = activeHadithList;

  const speakHadith = useCallback(
    async (entry: HadithEntry, requestedLang?: HadithSpeakLanguage) => {
      const chosenLang = requestedLang || ttsLang;
      const collectionSlug: HadithCollectionSlug = selectedCollection?.slug || 'bukhari';

      let spokenText = '';
      let actualLang: HadithSpeakLanguage = chosenLang;
      if (chosenLang === 'ar') {
        spokenText = entry.arabicText || entry.englishText;
        actualLang = entry.arabicText ? 'ar' : 'en';
      } else if (chosenLang === 'bn') {
        spokenText = entry.banglaText || entry.englishText;
        actualLang = entry.banglaText ? 'bn' : 'en';
      } else {
        spokenText = entry.englishText || entry.banglaText || entry.arabicText;
        actualLang = entry.englishText ? 'en' : entry.banglaText ? 'bn' : 'ar';
      }

      setTtsWarning(null);
      setTtsSpeakingNumber(entry.hadithNumber);
      setTtsStatus('playing');

      await hadithTts.speak({
        text: spokenText,
        lang: actualLang,
        rate: hadithTtsSpeed,
        collectionSlug,
        hadithNumber: entry.hadithNumber,
        onComplete: () => {
          const list = activeListRef.current;
          if (useQuranStore.getState().hadithAutoNext && list.length > 0) {
            const idx = list.findIndex((item) => item.hadithNumber === entry.hadithNumber);
            if (idx >= 0 && idx + 1 < list.length) {
              const nextItem = list[idx + 1];
              setDetailHadith((prev) => (prev ? nextItem : prev));
              speakHadithRef.current(nextItem, chosenLang);
              return;
            }
          }
          setTtsStatus('idle');
          setTtsSpeakingNumber(null);
        },
        onError: (msg, missingVoice) => {
          setTtsStatus('idle');
          setTtsSpeakingNumber(null);
          setTtsWarning({msg, missingVoice});
        },
      });
    },
    [ttsLang, selectedCollection?.slug, hadithTtsSpeed]
  );

  speakHadithRef.current = speakHadith;

  const handleToggleTtsPause = async () => {
    if (ttsStatus === 'playing') {
      await hadithTts.pause();
      setTtsStatus('paused');
    } else if (ttsStatus === 'paused') {
      setTtsStatus('playing');
      await hadithTts.resume();
    }
  };

  const handleStopTts = async () => {
    await hadithTts.stop();
    setTtsStatus('idle');
    setTtsSpeakingNumber(null);
  };

  const formatHadithClipboard = (entry: HadithEntry, colName?: string) => {
    const parts: string[] = [];
    if (colName) parts.push(`${colName} — Hadith #${entry.hadithNumber}`);
    if (entry.arabicText) parts.push(entry.arabicText);
    if (entry.englishText) parts.push(entry.englishText);
    if (entry.banglaText) parts.push(entry.banglaText);
    return parts.join('\n\n');
  };

  const handleCopyHadith = async (entry: HadithEntry, colName?: string) => {
    try {
      await navigator.clipboard.writeText(formatHadithClipboard(entry, colName));
      showToast(t.hadith.copied);
    } catch {
      showToast(t.hadith.copied);
    }
  };

  const handleShareHadith = async (entry: HadithEntry, colName?: string) => {
    const text = formatHadithClipboard(entry, colName);
    if (navigator.share) {
      try {
        await navigator.share({
          title: colName ? `${colName} #${entry.hadithNumber}` : `Hadith #${entry.hadithNumber}`,
          text,
        });
        return;
      } catch {
        // User cancelled or unsupported; fallback to copy
      }
    }
    await handleCopyHadith(entry, colName);
  };

  const isHadithFav = (slug: HadithCollectionSlug, hadithNum: number) =>
    favoriteHadiths.some((h) => h.id === `${slug}:${hadithNum}`);

  const renderHadithCard = (
    entry: HadithEntry,
    colInfo: {slug: HadithCollectionSlug; nameEn: string; nameAr: string; nameBn: string}
  ) => {
    const effectiveMode = cardLangOverrides[entry.hadithNumber] || viewMode;
    const isFav = isHadithFav(colInfo.slug, entry.hadithNumber);
    const isSpeakingThis = ttsSpeakingNumber === entry.hadithNumber && ttsStatus !== 'idle';

    // Default translation text inside combined mode respects UI language, falling back smoothly
    const combinedTranslation =
      lang === 'bn'
        ? entry.banglaText || entry.englishText
        : entry.englishText || entry.banglaText;
    const combinedIsBangla =
      lang === 'bn' ? Boolean(entry.banglaText) : !entry.englishText && Boolean(entry.banglaText);

    return (
      <article
        key={`${colInfo.slug}-${entry.hadithNumber}`}
        className="rounded-3xl glass p-4 sm:p-5 space-y-3"
      >
        {/* Card Header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setDetailHadith(entry);
                if (selectedSection) {
                  setHadithBookmark({
                    collectionSlug: colInfo.slug,
                    sectionNumber: selectedSection.sectionNumber,
                    hadithNumber: entry.hadithNumber,
                    sectionTitle: selectedSection.title,
                    updatedAt: Date.now(),
                  });
                }
              }}
              className="px-3.5 min-h-[40px] rounded-2xl bg-brand-600/14 dark:bg-accent/18 text-brand-700 dark:text-accent text-xs font-bold tabular-nums"
            >
              #{entry.hadithNumber}
            </button>

            {entry.grades.slice(0, 1).map((g, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-xl glass text-[11px] font-semibold text-brand-700 dark:text-accent-200"
              >
                {g.grade}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-1">
            {/* Per-hadith language toggle */}
            <div className="flex items-center p-0.5 rounded-xl glass text-[11px] font-semibold">
              {(['combined', 'ar', 'en', 'bn'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() =>
                    setCardLangOverrides((prev) => ({...prev, [entry.hadithNumber]: mode}))
                  }
                  className={`px-2 min-h-[32px] rounded-lg transition-colors ${
                    effectiveMode === mode
                      ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950'
                      : 'text-muted dark:text-muted-dark'
                  }`}
                >
                  {mode === 'combined' ? 'All' : mode.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                if (isSpeakingThis) {
                  void handleStopTts();
                } else {
                  void speakHadith(entry);
                }
              }}
              aria-label={t.hadith.listen}
              title={`${t.hadith.listen} — ${t.hadith.ttsDisclaimer}`}
              className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl transition-colors ${
                isSpeakingThis
                  ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950'
                  : 'hover:bg-brand-500/10 dark:hover:bg-white/10 text-brand-700 dark:text-accent'
              }`}
            >
              {isSpeakingThis ? <Square className="w-3.5 h-3.5 fill-current" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() =>
                toggleFavoriteHadith({
                  id: `${colInfo.slug}:${entry.hadithNumber}`,
                  collectionSlug: colInfo.slug,
                  sectionNumber: entry.sectionNumber || selectedSection?.sectionNumber || '1',
                  hadithNumber: entry.hadithNumber,
                  arabicText: entry.arabicText,
                  englishText: entry.englishText,
                  banglaText: entry.banglaText,
                  grades: entry.grades,
                  savedAt: Date.now(),
                })
              }
              aria-label="Favorite Hadith"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl hover:bg-brand-500/10 dark:hover:bg-white/10"
            >
              <Heart
                className={`w-4 h-4 ${
                  isFav ? 'fill-accent text-accent' : 'text-muted dark:text-muted-dark'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Body */}
        <div
          onClick={() => setDetailHadith(entry)}
          className="space-y-3 cursor-pointer"
        >
          {(effectiveMode === 'combined' || effectiveMode === 'ar') && entry.arabicText && (
            <p
              dir="rtl"
              className="font-hadith-amiri text-right leading-[2] text-ink dark:text-ink-dark"
              style={{fontSize: `${hadithFontSize}px`}}
            >
              {entry.arabicText}
            </p>
          )}

          {effectiveMode === 'combined' && combinedTranslation && (
            <p
              className={`text-sm sm:text-[15px] leading-relaxed text-muted dark:text-muted-dark ${
                combinedIsBangla ? 'font-bengali' : ''
              }`}
            >
              {combinedTranslation}
            </p>
          )}

          {effectiveMode === 'en' && entry.englishText && (
            <p className="text-sm sm:text-[15px] leading-relaxed text-muted dark:text-muted-dark">
              {entry.englishText}
            </p>
          )}

          {effectiveMode === 'bn' && (
            <>
              {entry.banglaText ? (
                <p className="font-bengali text-sm sm:text-[15px] leading-relaxed text-muted dark:text-muted-dark">
                  {entry.banglaText}
                </p>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-xs text-accent-600 dark:text-accent">
                    {t.hadith.banglaFallbackNotice}
                  </p>
                  {entry.englishText && (
                    <p className="text-sm leading-relaxed text-muted dark:text-muted-dark">
                      {entry.englishText}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Card Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-brand-500/10 dark:border-white/10 text-xs text-muted dark:text-muted-dark">
          <span className="truncate">
            {getCollectionTitle(colInfo)}
            {entry.bookNumber ? ` · Book ${entry.bookNumber}` : ''} · #{entry.hadithNumber}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => handleCopyHadith(entry, getCollectionTitle(colInfo))}
              aria-label="Copy hadith"
              className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl hover:bg-brand-500/10 dark:hover:bg-white/10"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleShareHadith(entry, getCollectionTitle(colInfo))}
              aria-label="Share hadith"
              className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl hover:bg-brand-500/10 dark:hover:bg-white/10"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Persistent TTS Control Strip whenever active or warning */}
      {(ttsStatus !== 'idle' || ttsWarning) && (
        <div className="rounded-3xl glass-strong p-4 space-y-2.5 border border-brand-500/30 dark:border-accent/35">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-brand-600 text-white dark:bg-accent dark:text-brand-950 flex items-center justify-center shrink-0">
                <Volume2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-ink dark:text-ink-dark truncate">
                  {ttsSpeakingNumber ? `Hadith #${ttsSpeakingNumber}` : t.hadith.listen} ·{' '}
                  {ttsLang.toUpperCase()} ({hadithTtsSpeed}x)
                </p>
                <p className="text-[11px] font-semibold text-accent-600 dark:text-accent truncate">
                  {t.hadith.ttsDisclaimer}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {ttsStatus !== 'idle' && (
                <>
                  <button
                    type="button"
                    onClick={handleToggleTtsPause}
                    aria-label={ttsStatus === 'playing' ? 'Pause TTS' : 'Resume TTS'}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl bg-brand-600 text-white dark:bg-accent dark:text-brand-950"
                  >
                    {ttsStatus === 'playing' ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleStopTts}
                    aria-label={t.hadith.stopListening}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl glass text-rose-500"
                  >
                    <Square className="w-4 h-4 fill-current" />
                  </button>
                </>
              )}
              {ttsWarning && ttsStatus === 'idle' && (
                <button
                  type="button"
                  onClick={() => setTtsWarning(null)}
                  aria-label="Dismiss warning"
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {ttsWarning && (
            <div className="rounded-2xl bg-accent/15 border border-accent/30 p-3 text-xs text-ink dark:text-ink-dark space-y-2">
              <p className="font-semibold">{ttsWarning.msg}</p>
              {ttsWarning.missingVoice && (
                <p className="text-muted dark:text-muted-dark leading-relaxed">
                  {t.hadith.ttsMissingVoiceHint}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ROOT: Collections & Saved Favorites */}
      {!selectedCollection && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-ink dark:text-ink-dark">{t.hadith.title}</h1>
              <p className="text-xs text-muted dark:text-muted-dark mt-0.5">{t.hadith.subtitle}</p>
            </div>
          </div>

          {/* Collections vs Favorites Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl glass max-w-md">
            <button
              type="button"
              onClick={() => setSubTab('collections')}
              className={`min-h-[44px] rounded-xl text-xs font-semibold transition-colors ${
                subTab === 'collections'
                  ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950 shadow-sm'
                  : 'text-muted dark:text-muted-dark'
              }`}
            >
              {t.hadith.collections}
            </button>
            <button
              type="button"
              onClick={() => setSubTab('favorites')}
              className={`min-h-[44px] rounded-xl text-xs font-semibold transition-colors ${
                subTab === 'favorites'
                  ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950 shadow-sm'
                  : 'text-muted dark:text-muted-dark'
              }`}
            >
              {t.hadith.favoritesTab} ({favoriteHadiths.length})
            </button>
          </div>

          {subTab === 'collections' && (
            <div className="space-y-4">
              {/* Continue Reading Bookmark */}
              {hadithBookmark && collections.length > 0 && (
                <button
                  type="button"
                  onClick={handleContinueBookmark}
                  className="md-ripple w-full text-start rounded-3xl glass-strong p-4 sm:p-5 flex items-center justify-between gap-3 border border-brand-500/25 dark:border-accent/30"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white dark:bg-accent dark:text-brand-950 flex items-center justify-center shrink-0">
                      <BookMarked className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-brand-700 dark:text-accent">
                        {t.hadith.continueReading}
                      </p>
                      <p className="text-sm font-bold text-ink dark:text-ink-dark truncate mt-0.5">
                        {(() => {
                          const c = collections.find((x) => x.slug === hadithBookmark.collectionSlug);
                          return c ? getCollectionTitle(c) : hadithBookmark.collectionSlug;
                        })()}{' '}
                        · #{hadithBookmark.hadithNumber}
                      </p>
                      <p className="text-xs text-muted dark:text-muted-dark truncate">
                        {hadithBookmark.sectionTitle}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 rtl:rotate-180 text-muted dark:text-muted-dark shrink-0" />
                </button>
              )}

              {loadingCatalog && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="rounded-3xl glass p-5 h-28 animate-pulse" />
                  ))}
                </div>
              )}

              {catalogError && !loadingCatalog && (
                <div className="rounded-3xl glass p-8 text-center space-y-3">
                  <WifiOff className="w-8 h-8 mx-auto text-muted dark:text-muted-dark" />
                  <p className="text-sm text-muted dark:text-muted-dark">{catalogError}</p>
                  <button
                    type="button"
                    onClick={() => setCatalogRetryTick((x) => x + 1)}
                    className="md-ripple inline-flex items-center gap-2 px-5 min-h-[48px] rounded-2xl bg-brand-600 text-white dark:bg-accent dark:text-brand-950 text-xs font-semibold"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>{pickLang(lang, 'Retry', 'إعادة المحاولة', 'পুনরায় চেষ্টা করুন')}</span>
                  </button>
                </div>
              )}

              {!loadingCatalog && !catalogError && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {collections.map((col) => (
                    <button
                      key={col.slug}
                      type="button"
                      onClick={() => setSelectedCollection(col)}
                      className="md-ripple text-start rounded-3xl glass p-5 flex items-center justify-between gap-4 hover:border-brand-500/35 dark:hover:border-accent/35"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <h2 className="text-base font-bold text-ink dark:text-ink-dark truncate">
                            {getCollectionTitle(col)}
                          </h2>
                          <span
                            dir="rtl"
                            className="font-hadith-amiri text-lg text-brand-700 dark:text-accent shrink-0"
                          >
                            {col.nameAr}
                          </span>
                        </div>
                        <p className="text-xs text-muted dark:text-muted-dark mt-1">
                          {col.sections.length} {t.hadith.booksCount} · AR · EN
                          {col.banglaEdition ? ' · BN' : ''}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 rtl:rotate-180 text-muted dark:text-muted-dark shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {subTab === 'favorites' && (
            <div className="space-y-3">
              {favoriteHadiths.length === 0 ? (
                <div className="rounded-3xl glass p-8 text-center">
                  <p className="text-sm text-muted dark:text-muted-dark">{t.hadith.emptyFavorites}</p>
                </div>
              ) : (
                favoriteHadiths.map((fav) => {
                  const col = collections.find((c) => c.slug === fav.collectionSlug) || {
                    slug: fav.collectionSlug,
                    nameEn: fav.collectionSlug,
                    nameAr: fav.collectionSlug,
                    nameBn: fav.collectionSlug,
                  };
                  return renderHadithCard(
                    {
                      hadithNumber: fav.hadithNumber,
                      arabicText: fav.arabicText,
                      englishText: fav.englishText,
                      banglaText: fav.banglaText,
                      grades: fav.grades,
                      sectionNumber: fav.sectionNumber,
                    },
                    col
                  );
                })
              )}
            </div>
          )}
        </>
      )}

      {/* COLLECTION -> SECTIONS & SEARCH */}
      {selectedCollection && !selectedSection && (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedCollection(null);
                setSearchResults(null);
                setSearchQuery('');
              }}
              aria-label="Back to Collections"
              className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full glass"
            >
              <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-ink dark:text-ink-dark truncate">
                {getCollectionTitle(selectedCollection)}
              </h1>
              <p className="text-xs text-muted dark:text-muted-dark truncate">
                {selectedCollection.nameAr} · {selectedCollection.sections.length} {t.hadith.booksCount}
              </p>
            </div>
          </div>

          {/* Search by Number or Keyword */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute start-4 top-1/2 -translate-y-1/2 text-muted dark:text-muted-dark pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!e.target.value.trim()) setSearchResults(null);
                }}
                placeholder={t.hadith.searchPlaceholder}
                className="w-full min-h-[48px] rounded-2xl glass-strong ps-11 pe-10 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-accent"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults(null);
                  }}
                  aria-label="Clear search"
                  className="absolute end-1.5 top-1/2 -translate-y-1/2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={searching || !searchQuery.trim()}
              className="md-ripple px-4 min-h-[48px] rounded-2xl bg-brand-600 text-white dark:bg-accent dark:text-brand-950 text-xs font-semibold disabled:opacity-50 shrink-0"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : t.nav.search}
            </button>
          </form>

          {searchError && (
            <div className="rounded-2xl glass p-4 text-xs text-rose-500">{searchError}</div>
          )}

          {searchResults !== null ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-brand-700 dark:text-accent">
                  {t.hadith.keywordMatches} ({searchResults.length})
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setSearchResults(null);
                    setSearchQuery('');
                  }}
                  className="text-xs font-semibold text-muted dark:text-muted-dark hover:underline min-h-[36px]"
                >
                  {t.hadith.sectionsTitle}
                </button>
              </div>
              {searchResults.length === 0 ? (
                <div className="rounded-3xl glass p-8 text-center text-sm text-muted dark:text-muted-dark">
                  {t.hadith.noMatches}
                </div>
              ) : (
                searchResults.map((entry) => renderHadithCard(entry, selectedCollection))
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              <h2 className="text-sm font-bold text-brand-700 dark:text-accent">
                {t.hadith.sectionsTitle}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {selectedCollection.sections.map((sec) => {
                  const isCached = cachedKeys.has(
                    `${selectedCollection.slug}_${sec.sectionNumber}`
                  );
                  return (
                    <button
                      key={sec.sectionNumber}
                      type="button"
                      onClick={() => openSection(selectedCollection, sec)}
                      className="md-ripple text-start rounded-2xl glass p-4 flex items-center justify-between gap-3 min-h-[64px]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-10 h-10 rounded-xl bg-brand-600/14 dark:bg-white/10 text-brand-700 dark:text-accent flex items-center justify-center text-xs font-bold tabular-nums shrink-0">
                          {sec.sectionNumber}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink dark:text-ink-dark truncate">
                            {sec.title}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-muted dark:text-muted-dark mt-0.5">
                            {sec.hadithFirst !== undefined && sec.hadithLast !== undefined && (
                              <span className="tabular-nums">
                                #{sec.hadithFirst}–{sec.hadithLast}
                              </span>
                            )}
                            {isCached && (
                              <span className="inline-flex items-center gap-1 text-brand-700 dark:text-accent font-semibold">
                                <CheckCircle2 className="w-3 h-3" />
                                {t.hadith.cachedOffline}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 rtl:rotate-180 text-muted dark:text-muted-dark shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION -> HADITH LIST */}
      {selectedCollection && selectedSection && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedSection(null);
                  setSectionHadiths([]);
                  setSectionError(null);
                }}
                aria-label="Back to Books"
                className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full glass shrink-0"
              >
                <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
              </button>
              <div className="min-w-0">
                <h1 className="text-base font-bold text-ink dark:text-ink-dark truncate">
                  {selectedSection.sectionNumber}. {selectedSection.title}
                </h1>
                <p className="text-xs text-muted dark:text-muted-dark truncate">
                  {getCollectionTitle(selectedCollection)}
                  {sectionFromCache && ` · ${t.hadith.cachedOffline}`}
                </p>
              </div>
            </div>

            {/* Global Section Language View Switcher */}
            <div className="flex items-center gap-1 p-1 rounded-2xl glass">
              {(
                [
                  {id: 'combined', label: t.hadith.allLanguages},
                  {id: 'ar', label: t.hadith.arabicOnly},
                  {id: 'en', label: t.hadith.englishOnly},
                  {id: 'bn', label: t.hadith.banglaOnly},
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setViewMode(opt.id);
                    setCardLangOverrides({});
                  }}
                  className={`px-2.5 min-h-[38px] rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    viewMode === opt.id
                      ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950'
                      : 'text-muted dark:text-muted-dark'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {!loadingSection && !sectionHasBangla && (lang === 'bn' || viewMode === 'bn') && (
            <div className="rounded-2xl glass px-4 py-2.5 text-xs text-accent-600 dark:text-accent">
              {t.hadith.banglaFallbackNotice}
            </div>
          )}

          {loadingSection && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-3xl glass p-5 h-36 animate-pulse" />
              ))}
            </div>
          )}

          {sectionError && !loadingSection && (
            <div className="rounded-3xl glass p-8 text-center space-y-3">
              <WifiOff className="w-8 h-8 mx-auto text-muted dark:text-muted-dark" />
              <p className="text-sm text-muted dark:text-muted-dark">{sectionError}</p>
              <button
                type="button"
                onClick={() => openSection(selectedCollection, selectedSection)}
                className="md-ripple inline-flex items-center gap-2 px-5 min-h-[48px] rounded-2xl bg-brand-600 text-white dark:bg-accent dark:text-brand-950 text-xs font-semibold"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{pickLang(lang, 'Retry', 'إعادة المحاولة', 'পুনরায় চেষ্টা করুন')}</span>
              </button>
            </div>
          )}

          {!loadingSection && !sectionError && (
            <div className="space-y-3">
              {sectionHadiths.slice(0, visibleCount).map((entry) =>
                renderHadithCard(entry, selectedCollection)
              )}

              {visibleCount < sectionHadiths.length && (
                <button
                  type="button"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="md-ripple w-full min-h-[48px] rounded-2xl glass font-semibold text-sm text-brand-700 dark:text-accent"
                >
                  {t.hadith.loadMore} ({sectionHadiths.length - visibleCount} remaining)
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* HADITH DETAIL MODAL */}
      {detailHadith && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-brand-950/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Hadith #${detailHadith.hadithNumber}`}
          onClick={() => setDetailHadith(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl glass-strong shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <header className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-brand-500/15 dark:border-white/12">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-ink dark:text-ink-dark truncate">
                  {selectedCollection
                    ? getCollectionTitle(selectedCollection)
                    : 'Hadith'}{' '}
                  · #{detailHadith.hadithNumber}
                </h2>
                <p className="text-xs text-muted dark:text-muted-dark truncate">
                  {detailHadith.sectionTitle || selectedSection?.title || ''}{' '}
                  {detailHadith.bookNumber ? `· Book ${detailHadith.bookNumber}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailHadith(null)}
                aria-label="Close Hadith Detail"
                className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full hover:bg-brand-500/10 dark:hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Font size control */}
              <div className="rounded-2xl glass p-3 flex items-center gap-3">
                <SlidersHorizontal className="w-4 h-4 text-brand-600 dark:text-accent shrink-0" />
                <input
                  type="range"
                  min={18}
                  max={36}
                  value={hadithFontSize}
                  onChange={(e) => setHadithFontSize(Number(e.target.value))}
                  aria-label="Hadith font size"
                  className="flex-1 md-slider bg-brand-900/15 dark:bg-white/20"
                />
                <span className="text-xs font-bold tabular-nums w-10 text-end">
                  {hadithFontSize}px
                </span>
              </div>

              {/* Text-to-Speech Player Bar */}
              <div className="rounded-3xl glass p-4 space-y-3 border border-brand-500/20 dark:border-accent/25">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-ink dark:text-ink-dark flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-brand-600 dark:text-accent" />
                      <span>{t.hadith.listen}</span>
                    </p>
                    <p className="text-[11px] font-semibold text-accent-600 dark:text-accent mt-0.5">
                      {t.hadith.ttsDisclaimer}
                    </p>
                  </div>

                  {/* Language choice for TTS */}
                  <div className="flex items-center gap-1 p-1 rounded-xl glass">
                    {(['ar', 'en', 'bn'] as const).map((speakCode) => (
                      <button
                        key={speakCode}
                        type="button"
                        onClick={() => setTtsLang(speakCode)}
                        className={`px-2.5 min-h-[34px] rounded-lg text-xs font-semibold ${
                          ttsLang === speakCode
                            ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950'
                            : 'text-muted dark:text-muted-dark'
                        }`}
                      >
                        {speakCode.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          ttsSpeakingNumber === detailHadith.hadithNumber &&
                          ttsStatus !== 'idle'
                        ) {
                          void handleToggleTtsPause();
                        } else {
                          void speakHadith(detailHadith, ttsLang);
                        }
                      }}
                      className="md-ripple inline-flex items-center gap-2 px-4 min-h-[44px] rounded-2xl bg-brand-600 text-white dark:bg-accent dark:text-brand-950 text-xs font-semibold"
                    >
                      {ttsSpeakingNumber === detailHadith.hadithNumber && ttsStatus === 'playing' ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current" />
                      )}
                      <span>
                        {ttsSpeakingNumber === detailHadith.hadithNumber && ttsStatus === 'playing'
                          ? pickLang(lang, 'Pause', 'إيقاف مؤقت', 'বিরতি')
                          : t.hadith.listen}
                      </span>
                    </button>

                    {ttsStatus !== 'idle' && (
                      <button
                        type="button"
                        onClick={handleStopTts}
                        className="min-h-[44px] px-3.5 rounded-2xl glass text-xs font-semibold text-rose-500"
                      >
                        {t.hadith.stopListening}
                      </button>
                    )}
                  </div>

                  {/* Speed selector */}
                  <button
                    type="button"
                    onClick={() => {
                      const idx = TTS_SPEEDS.indexOf(hadithTtsSpeed);
                      setHadithTtsSpeed(TTS_SPEEDS[(idx + 1) % TTS_SPEEDS.length]);
                    }}
                    className="min-h-[44px] px-3.5 rounded-2xl glass text-xs font-bold tabular-nums"
                  >
                    {hadithTtsSpeed}x
                  </button>
                </div>

                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={hadithAutoNext}
                    onChange={(e) => setHadithAutoNext(e.target.checked)}
                    className="w-4 h-4 accent-brand-600 dark:accent-accent"
                  />
                  <span>{t.hadith.ttsAutoNext}</span>
                </label>
              </div>

              {/* Arabic Text */}
              {detailHadith.arabicText && (
                <p
                  dir="rtl"
                  className="font-hadith-amiri text-right leading-[2.05] text-ink dark:text-ink-dark select-text"
                  style={{fontSize: `${hadithFontSize}px`}}
                >
                  {detailHadith.arabicText}
                </p>
              )}

              {/* English Text */}
              {detailHadith.englishText && (
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-brand-700 dark:text-accent">
                    English
                  </p>
                  <p className="text-sm sm:text-base leading-relaxed text-ink/90 dark:text-ink-dark/90 select-text">
                    {detailHadith.englishText}
                  </p>
                </div>
              )}

              {/* Bangla Text */}
              {detailHadith.banglaText && (
                <div className="space-y-1 pt-2 border-t border-brand-500/12 dark:border-white/10">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-brand-700 dark:text-accent font-bengali">
                    বাংলা
                  </p>
                  <p className="font-bengali text-sm sm:text-base leading-relaxed text-ink/90 dark:text-ink-dark/90 select-text">
                    {detailHadith.banglaText}
                  </p>
                </div>
              )}

              {/* Grades & Reference */}
              <div className="rounded-2xl glass p-3.5 space-y-2 text-xs">
                <p>
                  <span className="font-bold text-brand-700 dark:text-accent">
                    {t.hadith.referenceLabel}:{' '}
                  </span>
                  {selectedCollection ? getCollectionTitle(selectedCollection) : ''} · Hadith #
                  {detailHadith.hadithNumber}
                  {detailHadith.bookNumber ? ` (Book ${detailHadith.bookNumber})` : ''}
                </p>
                {detailHadith.grades.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    <span className="font-bold text-brand-700 dark:text-accent">
                      {t.hadith.gradeLabel}:
                    </span>
                    {detailHadith.grades.map((g, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-lg glass">
                        {g.name}: {g.grade}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer actions */}
            <footer className="px-5 py-3 border-t border-brand-500/15 dark:border-white/12 flex items-center justify-end gap-2 pb-safe">
              <button
                type="button"
                onClick={() =>
                  handleCopyHadith(
                    detailHadith,
                    selectedCollection ? getCollectionTitle(selectedCollection) : undefined
                  )
                }
                className="md-ripple inline-flex items-center gap-1.5 px-4 min-h-[44px] rounded-2xl glass text-xs font-semibold"
              >
                <Copy className="w-4 h-4" />
                <span>{pickLang(lang, 'Copy', 'نسخ', 'কপি')}</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleShareHadith(
                    detailHadith,
                    selectedCollection ? getCollectionTitle(selectedCollection) : undefined
                  )
                }
                className="md-ripple inline-flex items-center gap-1.5 px-4 min-h-[44px] rounded-2xl glass text-xs font-semibold"
              >
                <Share2 className="w-4 h-4" />
                <span>{pickLang(lang, 'Share', 'مشاركة', 'শেয়ার')}</span>
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default HadithScreen;
