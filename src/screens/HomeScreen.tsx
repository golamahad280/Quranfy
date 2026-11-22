import {
  BookOpen,
  BookText,
  Briefcase,
  ChevronRight,
  GraduationCap,
  Heart,
  ListMusic,
  Moon,
  Pause,
  Play,
  SlidersHorizontal,
  UserCheck,
} from 'lucide-react';
import React, {useEffect, useMemo, useState} from 'react';
import modeSleepImg from '../assets/images/mode_sleep.webp';
import modeStudyImg from '../assets/images/mode_study.webp';
import modeWorkImg from '../assets/images/mode_work.webp';
import {pickLang, TRANSLATIONS} from '../data/i18n';
import {CURATED_PLAYLISTS, MODE_CONFIG} from '../data/recitersAndPlaylists';
import {audioManager} from '../services/audioManager';
import {fetchHadithOfTheDay, HadithOfDayResult} from '../services/hadithApi';
import {getActiveAmbientSounds, useQuranStore} from '../store/useQuranStore';
import {FocusMode} from '../types/quran';
import {formatTime} from '../utils/formatters';

const MODE_META: Array<{
  id: FocusMode;
  icon: React.FC<{className?: string}>;
  img: string;
}> = [
  {id: 'study', icon: GraduationCap, img: modeStudyImg},
  {id: 'work', icon: Briefcase, img: modeWorkImg},
  {id: 'sleep', icon: Moon, img: modeSleepImg},
];

export const HomeScreen: React.FC = () => {
  const focusMode = useQuranStore((s) => s.focusMode);
  const setFocusMode = useQuranStore((s) => s.setFocusMode);
  const surahs = useQuranStore((s) => s.surahs);
  const reciters = useQuranStore((s) => s.reciters);
  const currentSurahNumber = useQuranStore((s) => s.currentSurahNumber);
  const currentReciterId = useQuranStore((s) => s.currentReciterId);
  const isPlaying = useQuranStore((s) => s.isPlaying);
  const resumePositionSec = useQuranStore((s) => s.resumePositionSec);
  const recentlyPlayed = useQuranStore((s) => s.recentlyPlayed);
  const favoriteSurahNumbers = useQuranStore((s) => s.favoriteSurahNumbers);
  const favoriteReciterIds = useQuranStore((s) => s.favoriteReciterIds);
  const ambientMix = useQuranStore((s) => s.ambientMix);
  const lang = useQuranStore((s) => s.settings.language);

  const openReader = useQuranStore((s) => s.openReader);
  const setActiveTab = useQuranStore((s) => s.setActiveTab);
  const toggleFavoriteSurah = useQuranStore((s) => s.toggleFavoriteSurah);
  const toggleFavoriteReciter = useQuranStore((s) => s.toggleFavoriteReciter);
  const setQueueAndPlay = useQuranStore((s) => s.setQueueAndPlay);
  const setAmbientSheetOpen = useQuranStore((s) => s.setAmbientSheetOpen);

  const [surahFilter, setSurahFilter] = useState<'all' | 'meccan' | 'medinan' | 'short'>('all');
  const [hadithOfDay, setHadithOfDay] = useState<HadithOfDayResult | null>(null);

  useEffect(() => {
    let active = true;
    fetchHadithOfTheDay()
      .then((res) => {
        if (active && res) setHadithOfDay(res);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const t = TRANSLATIONS[lang];
  const activeModeCfg = MODE_CONFIG[focusMode];
  const activeAmbient = getActiveAmbientSounds(ambientMix);

  const modePlaylists = useMemo(
    () => CURATED_PLAYLISTS.filter((p) => p.mode === focusMode),
    [focusMode]
  );

  const modeReciters = useMemo(() => {
    const recommended = reciters.filter((r) => r.recommendedModes.includes(focusMode));
    const others = reciters.filter(
      (r) => !r.recommendedModes.includes(focusMode) && !r.isCommunityExtra
    );
    return [...recommended, ...others];
  }, [reciters, focusMode]);

  const filteredSurahs = useMemo(() => {
    if (surahFilter === 'meccan') return surahs.filter((s) => s.revelationType === 'Meccan');
    if (surahFilter === 'medinan') return surahs.filter((s) => s.revelationType === 'Medinan');
    if (surahFilter === 'short') return surahs.filter((s) => s.numberOfAyahs <= 20);
    return surahs;
  }, [surahs, surahFilter]);

  const resumeSurah = surahs.find((s) => s.number === currentSurahNumber) || surahs[0];
  const resumeReciter = reciters.find((r) => r.id === currentReciterId) || reciters[0];
  const activeModeMeta = MODE_META.find((m) => m.id === focusMode) || MODE_META[0];

  const ambientButtonLabel =
    activeAmbient.length === 1
      ? t.modes[activeAmbient[0]]
      : activeAmbient.length > 1
      ? `${activeAmbient.length} ${lang === 'ar' ? 'أصوات نشطة' : 'Sounds Active'}`
      : t.modes.ambientMixer;

  return (
    <div className="space-y-8 pb-8">
      {/* Hero Focus Mode Banner + 3-Mode Selector */}
      <section aria-labelledby="focus-modes-heading">
        <div className="flex items-center justify-between gap-3 mb-3.5">
          <h2 id="focus-modes-heading" className="text-lg font-bold text-ink dark:text-ink-dark">
            {t.home.focusModes}
          </h2>
          <button
            type="button"
            onClick={() => setAmbientSheetOpen(true)}
            className={`md-ripple inline-flex items-center gap-2 px-4 min-h-[48px] sm:min-h-[42px] rounded-2xl text-xs font-semibold transition-colors ${
              activeAmbient.length > 0
                ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950 shadow-sm'
                : 'glass text-ink dark:text-ink-dark'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 shrink-0" />
            <span>{ambientButtonLabel}</span>
          </button>
        </div>

        {/* Mode Segmented Switcher */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {MODE_META.map((m) => {
            const Icon = m.icon;
            const active = focusMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setFocusMode(m.id)}
                className={`md-ripple flex items-center justify-center gap-2 rounded-2xl min-h-[48px] px-3 text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950 shadow-md'
                    : 'glass text-ink dark:text-ink-dark'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{t.modes[m.id]}</span>
              </button>
            );
          })}
        </div>

        {/* Mode Feature Card + Resume Card Grid on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          <div className="lg:col-span-7 relative rounded-3xl overflow-hidden min-h-[192px] bg-brand-950 text-white shadow-lg border border-white/15 flex flex-col justify-end p-5">
            <img
              src={activeModeMeta.img}
              alt={t.modes[focusMode]}
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover opacity-75"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-950/92 via-brand-950/50 to-brand-900/20" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-accent">{t.modes[focusMode]}</p>
                <h3 className="text-xl sm:text-2xl font-bold mt-0.5 text-balance">
                  {lang === 'ar' ? activeModeCfg.titleAr : `${activeModeCfg.titleEn} Mode`}
                </h3>
                <p className="text-xs sm:text-sm text-white/85 mt-1 max-w-md">
                  {lang === 'ar' ? activeModeCfg.subtitleAr : activeModeCfg.subtitleEn}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const pl = modePlaylists[0];
                  if (pl) {
                    setQueueAndPlay(
                      pl.items.map((it) => ({surahNumber: it.surahNumber, reciterId: it.reciterId})),
                      0
                    );
                    audioManager.loadAndPlayCurrent(0);
                  }
                }}
                className="md-ripple inline-flex items-center justify-center gap-2 px-5 min-h-[48px] rounded-2xl bg-accent text-brand-950 text-xs font-bold whitespace-nowrap shrink-0 shadow-md"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{lang === 'ar' ? 'ابدأ الجلسة' : 'Start Session'}</span>
              </button>
            </div>
          </div>

          {/* Resume Listening Glass Card */}
          <div className="lg:col-span-5 rounded-3xl glass-strong p-5 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-brand-600 dark:text-accent">
                {t.home.resumeTitle}
              </p>
              <div className="mt-2 flex items-baseline justify-between gap-3">
                <h3 className="text-xl font-bold text-ink dark:text-ink-dark truncate">
                  {resumeSurah.englishName}
                </h3>
                <span
                  className="font-quran-amiri text-xl text-brand-700 dark:text-accent shrink-0"
                  dir="rtl"
                >
                  {resumeSurah.name}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted dark:text-muted-dark">
                {lang === 'ar' ? resumeReciter.nameAr : resumeReciter.nameEn}
                {resumePositionSec > 5 && ` · ${formatTime(resumePositionSec)}`}
              </p>
            </div>

            <div className="mt-5 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  if (isPlaying) {
                    audioManager.pause();
                  } else {
                    audioManager.playSurah(resumeSurah.number, resumeReciter.id, resumePositionSec);
                  }
                }}
                className="md-ripple flex-1 min-h-[48px] rounded-2xl bg-brand-600 text-white dark:bg-accent dark:text-brand-950 text-xs font-semibold flex items-center justify-center gap-2 shadow-sm"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
                <span>{isPlaying ? (lang === 'ar' ? 'إيقاف مؤقت' : 'Pause') : t.home.listenNow}</span>
              </button>

              <button
                type="button"
                onClick={() => openReader(resumeSurah.number)}
                className="md-ripple min-h-[48px] px-4 rounded-2xl glass text-ink dark:text-ink-dark text-xs font-semibold flex items-center gap-1.5"
              >
                <BookOpen className="w-4 h-4" />
                <span>{t.home.openReader}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Hadith of the Day Glass Card */}
      {hadithOfDay && (
        <section aria-labelledby="hadith-day-heading">
          <div className="rounded-3xl glass-strong p-5 space-y-3 border border-brand-500/20 dark:border-accent/25">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-brand-600/14 dark:bg-accent/18 text-brand-700 dark:text-accent flex items-center justify-center shrink-0">
                  <BookText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 id="hadith-day-heading" className="text-sm font-bold text-brand-700 dark:text-accent">
                    {t.home.hadithOfDay}
                  </h2>
                  <p className="text-xs text-muted dark:text-muted-dark truncate">
                    {pickLang(
                      lang,
                      hadithOfDay.collectionNameEn,
                      hadithOfDay.collectionNameAr,
                      hadithOfDay.collectionNameBn
                    )}{' '}
                    · #{hadithOfDay.entry.hadithNumber}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('hadith')}
                className="md-ripple inline-flex items-center gap-1 px-4 min-h-[44px] rounded-2xl bg-brand-600 text-white dark:bg-accent dark:text-brand-950 text-xs font-semibold shrink-0"
              >
                <span>{t.home.openHadith}</span>
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>

            {hadithOfDay.entry.arabicText && (
              <p
                dir="rtl"
                className="font-hadith-amiri text-xl leading-loose text-right text-ink dark:text-ink-dark line-clamp-3"
              >
                {hadithOfDay.entry.arabicText}
              </p>
            )}

            {(lang === 'bn'
              ? hadithOfDay.entry.banglaText || hadithOfDay.entry.englishText
              : hadithOfDay.entry.englishText || hadithOfDay.entry.banglaText) && (
              <p
                className={`text-xs sm:text-sm leading-relaxed text-muted dark:text-muted-dark line-clamp-3 ${
                  lang === 'bn' && hadithOfDay.entry.banglaText ? 'font-bengali' : ''
                }`}
              >
                {lang === 'bn'
                  ? hadithOfDay.entry.banglaText || hadithOfDay.entry.englishText
                  : hadithOfDay.entry.englishText || hadithOfDay.entry.banglaText}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Curated Playlists for Current Mode */}
      <section aria-labelledby="curated-heading">
        <div className="flex items-center justify-between mb-3">
          <h2 id="curated-heading" className="text-lg font-bold text-ink dark:text-ink-dark">
            {t.home.curatedForMode} {t.modes[focusMode]}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {modePlaylists.map((pl) => (
            <div
              key={pl.id}
              className="rounded-3xl glass p-4 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-brand-600/14 dark:bg-white/10 text-brand-700 dark:text-accent flex items-center justify-center shrink-0">
                  <ListMusic className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-ink dark:text-ink-dark truncate">
                    {lang === 'ar' ? pl.nameAr : pl.nameEn}
                  </h3>
                  <p className="text-xs text-muted dark:text-muted-dark truncate mt-0.5">
                    {lang === 'ar' ? pl.descriptionAr : pl.descriptionEn}
                  </p>
                  <p className="text-[11px] text-muted dark:text-muted-dark mt-1 tabular-nums">
                    {pl.items.length} {lang === 'ar' ? 'سور' : 'surahs'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                aria-label={`Play ${pl.nameEn}`}
                onClick={() => {
                  setQueueAndPlay(
                    pl.items.map((it) => ({surahNumber: it.surahNumber, reciterId: it.reciterId})),
                    0
                  );
                  audioManager.loadAndPlayCurrent(0);
                }}
                className="md-ripple min-h-[48px] min-w-[48px] rounded-2xl bg-brand-600 text-white dark:bg-accent dark:text-brand-950 flex items-center justify-center shrink-0 shadow-sm"
              >
                <Play className="w-4 h-4 fill-current ms-0.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Recommended Reciters */}
      <section aria-labelledby="reciters-heading">
        <h2 id="reciters-heading" className="text-lg font-bold text-ink dark:text-ink-dark mb-3">
          {t.home.recommendedReciters}
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
          {modeReciters.map((r) => {
            const active = currentReciterId === r.id;
            const isFavReciter = favoriteReciterIds.includes(r.id);
            const isBestForMode = r.recommendedModes.includes(focusMode);
            return (
              <div
                key={r.id}
                className={`snap-start shrink-0 w-64 rounded-3xl p-4 transition-colors border ${
                  active
                    ? 'bg-brand-600/14 dark:bg-accent/14 border-brand-500/45 dark:border-accent/45 shadow-md'
                    : 'glass'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => audioManager.playSurah(currentSurahNumber, r.id, 0)}
                    className="text-start min-w-0 flex-1 min-h-[48px]"
                  >
                    <p className="text-sm font-semibold text-ink dark:text-ink-dark truncate">
                      {lang === 'ar' ? r.nameAr : r.nameEn}
                    </p>
                    <p className="text-xs text-muted dark:text-muted-dark truncate mt-0.5">
                      {lang === 'ar' ? r.nameEn : r.nameAr}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFavoriteReciter(r.id)}
                    aria-label="Favorite Reciter"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-brand-500/10 dark:hover:bg-white/10"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        isFavReciter ? 'fill-accent text-accent' : 'text-muted dark:text-muted-dark'
                      }`}
                    />
                  </button>
                </div>

                <p className="mt-2 text-xs text-muted dark:text-muted-dark truncate">
                  {lang === 'ar' ? r.styleAr : r.styleEn}
                </p>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-brand-700 dark:text-accent">
                    {isBestForMode ? `${t.modes[focusMode]} Pick` : 'Full Murattal'}
                  </span>
                  <button
                    type="button"
                    onClick={() => audioManager.playSurah(currentSurahNumber, r.id, 0)}
                    className={`md-ripple inline-flex items-center gap-1.5 px-3.5 min-h-[40px] rounded-xl text-xs font-semibold ${
                      active
                        ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950'
                        : 'bg-brand-600/12 dark:bg-white/10 text-brand-700 dark:text-accent'
                    }`}
                  >
                    {active ? <UserCheck className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    <span>{active ? (lang === 'ar' ? 'نشط' : 'Active') : (lang === 'ar' ? 'اختر' : 'Select')}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recently Played */}
      {recentlyPlayed.length > 0 && (
        <section aria-labelledby="recent-heading">
          <h2 id="recent-heading" className="text-lg font-bold text-ink dark:text-ink-dark mb-3">
            {t.home.recentlyPlayed}
          </h2>
          <div className="flex gap-2.5 overflow-x-auto pb-2">
            {recentlyPlayed.slice(0, 6).map((item) => {
              const s = surahs.find((x) => x.number === item.surahNumber);
              const r = reciters.find((x) => x.id === item.reciterId);
              if (!s || !r) return null;
              return (
                <button
                  key={`${item.surahNumber}-${item.reciterId}`}
                  type="button"
                  onClick={() => audioManager.playSurah(s.number, r.id, 0)}
                  className="md-ripple shrink-0 text-start rounded-2xl glass px-4 py-3 min-w-[185px] min-h-[64px]"
                >
                  <p className="text-sm font-semibold text-ink dark:text-ink-dark truncate">
                    {s.number}. {lang === 'ar' ? s.name : s.englishName}
                  </p>
                  <p className="text-xs text-muted dark:text-muted-dark truncate mt-0.5">
                    {lang === 'ar' ? r.nameAr : r.nameEn}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* All 114 Surahs */}
      <section aria-labelledby="all-surahs-heading">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 id="all-surahs-heading" className="text-lg font-bold text-ink dark:text-ink-dark">
            {t.home.allSurahs}
          </h2>

          <div className="flex items-center gap-1 p-1 rounded-2xl glass">
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredSurahs.map((s) => {
            const isCurrent = currentSurahNumber === s.number;
            const isFav = favoriteSurahNumbers.includes(s.number);
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
                    <p className="text-xs text-muted dark:text-muted-dark truncate">
                      {s.englishNameTranslation} · {s.numberOfAyahs} {t.home.ayahs}
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
      </section>
    </div>
  );
};
