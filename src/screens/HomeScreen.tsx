import {
  BookOpen,
  Briefcase,
  GraduationCap,
  Heart,
  ListMusic,
  Moon,
  Pause,
  Play,
  SlidersHorizontal,
  UserCheck,
} from 'lucide-react';
import React, {useMemo, useState} from 'react';
import modeSleepImg from '../assets/images/mode_sleep_1795329629389.jpg';
import modeStudyImg from '../assets/images/mode_study_1795329629451.jpg';
import modeWorkImg from '../assets/images/mode_work_1795329629446.jpg';
import {TRANSLATIONS} from '../data/i18n';
import {CURATED_PLAYLISTS, MODE_CONFIG} from '../data/recitersAndPlaylists';
import {audioManager} from '../services/audioManager';
import {useQuranStore} from '../store/useQuranStore';
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
  const ambientSound = useQuranStore((s) => s.ambientSound);
  const lang = useQuranStore((s) => s.settings.language);

  const openReader = useQuranStore((s) => s.openReader);
  const toggleFavoriteSurah = useQuranStore((s) => s.toggleFavoriteSurah);
  const toggleFavoriteReciter = useQuranStore((s) => s.toggleFavoriteReciter);
  const setQueueAndPlay = useQuranStore((s) => s.setQueueAndPlay);
  const setAmbientSheetOpen = useQuranStore((s) => s.setAmbientSheetOpen);

  const [surahFilter, setSurahFilter] = useState<'all' | 'meccan' | 'medinan' | 'short'>('all');

  const t = TRANSLATIONS[lang];
  const activeModeCfg = MODE_CONFIG[focusMode];

  const modePlaylists = useMemo(
    () => CURATED_PLAYLISTS.filter((p) => p.mode === focusMode),
    [focusMode]
  );

  const modeReciters = useMemo(() => {
    const recommended = reciters.filter((r) => r.recommendedModes.includes(focusMode));
    const others = reciters.filter((r) => !r.recommendedModes.includes(focusMode) && !r.isCommunityExtra);
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

  return (
    <div className="space-y-8 pb-8">
      {/* Hero Focus Mode Banner + 3-Mode Selector */}
      <section aria-labelledby="focus-modes-heading">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 id="focus-modes-heading" className="text-lg font-bold text-[#13201C] dark:text-[#ECF2EF]">
            {t.home.focusModes}
          </h2>
          <button
            type="button"
            onClick={() => setAmbientSheetOpen(true)}
            className={`md-ripple inline-flex items-center gap-2 px-3.5 min-h-[40px] rounded-2xl text-xs font-semibold transition-colors ${
              ambientSound
                ? 'bg-[#0F5C4D] text-white dark:bg-[#4ECBA9] dark:text-[#081A15]'
                : 'bg-[#EDF3F0] dark:bg-[#16241F] text-[#13201C] dark:text-[#DCE6E2]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>
              {ambientSound
                ? `${t.modes[ambientSound]}`
                : t.modes.ambientMixer}
            </span>
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
                className={`md-ripple flex items-center justify-center gap-2 rounded-2xl min-h-[48px] px-3 text-sm font-semibold border transition-colors ${
                  active
                    ? 'bg-[#0F5C4D] text-white border-[#0F5C4D] dark:bg-[#4ECBA9] dark:text-[#081A15] dark:border-[#4ECBA9]'
                    : 'bg-white dark:bg-[#131F1C] text-[#283833] dark:text-[#DCE6E2] border-black/8 dark:border-white/10'
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
          <div className="lg:col-span-7 relative rounded-3xl overflow-hidden min-h-[180px] bg-[#0F2A23] text-white shadow-sm flex flex-col justify-end p-5">
            <img
              src={activeModeMeta.img}
              alt={t.modes[focusMode]}
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover opacity-75"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#081512]/92 via-[#081512]/50 to-transparent" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-[#E2B76B]">
                  {t.modes[focusMode]}
                </p>
                <h3 className="text-xl sm:text-2xl font-bold mt-0.5 text-balance">
                  {lang === 'ar' ? activeModeCfg.titleAr : `${activeModeCfg.titleEn} Mode`}
                </h3>
                <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-md">
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
                className="md-ripple inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-2xl bg-[#E2B76B] text-[#101C18] text-xs font-bold whitespace-nowrap shrink-0"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{lang === 'ar' ? 'ابدأ الجلسة' : 'Start Session'}</span>
              </button>
            </div>
          </div>

          {/* Resume Listening Card */}
          <div className="lg:col-span-5 rounded-3xl bg-white dark:bg-[#131F1C] border border-black/8 dark:border-white/10 p-5 flex flex-col justify-between">
            <div>
              <p className="text-xs font-medium text-[#0F5C4D] dark:text-[#4ECBA9]">
                {t.home.resumeTitle}
              </p>
              <div className="mt-2 flex items-baseline justify-between gap-3">
                <h3 className="text-xl font-bold text-[#13201C] dark:text-[#ECF2EF] truncate">
                  {resumeSurah.englishName}
                </h3>
                <span className="font-quran-amiri text-xl text-[#0F5C4D] dark:text-[#E2B76B] shrink-0" dir="rtl">
                  {resumeSurah.name}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#546660] dark:text-[#96ABA3]">
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
                className="md-ripple flex-1 min-h-[44px] rounded-2xl bg-[#0F5C4D] text-white dark:bg-[#4ECBA9] dark:text-[#081A15] text-xs font-semibold flex items-center justify-center gap-2"
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
                className="md-ripple min-h-[44px] px-4 rounded-2xl bg-[#EDF3F0] dark:bg-[#1B2B25] text-[#13201C] dark:text-[#DCE6E2] text-xs font-semibold flex items-center gap-1.5"
              >
                <BookOpen className="w-4 h-4" />
                <span>{t.home.openReader}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Curated Playlists for Current Mode */}
      <section aria-labelledby="curated-heading">
        <div className="flex items-center justify-between mb-3">
          <h2 id="curated-heading" className="text-lg font-bold text-[#13201C] dark:text-[#ECF2EF]">
            {t.home.curatedForMode} {t.modes[focusMode]}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {modePlaylists.map((pl) => (
            <div
              key={pl.id}
              className="rounded-2xl bg-white dark:bg-[#131F1C] border border-black/8 dark:border-white/10 p-4 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-[#EDF3F0] dark:bg-[#1B2B25] text-[#0F5C4D] dark:text-[#4ECBA9] flex items-center justify-center shrink-0">
                  <ListMusic className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-[#13201C] dark:text-[#ECF2EF] truncate">
                    {lang === 'ar' ? pl.nameAr : pl.nameEn}
                  </h3>
                  <p className="text-xs text-[#546660] dark:text-[#96ABA3] truncate mt-0.5">
                    {lang === 'ar' ? pl.descriptionAr : pl.descriptionEn}
                  </p>
                  <p className="text-[11px] text-[#546660] dark:text-[#96ABA3] mt-1 tabular-nums">
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
                className="md-ripple min-h-[44px] min-w-[44px] rounded-2xl bg-[#0F5C4D] text-white dark:bg-[#4ECBA9] dark:text-[#081A15] flex items-center justify-center shrink-0"
              >
                <Play className="w-4 h-4 fill-current ms-0.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Recommended Reciters */}
      <section aria-labelledby="reciters-heading">
        <h2 id="reciters-heading" className="text-lg font-bold text-[#13201C] dark:text-[#ECF2EF] mb-3">
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
                className={`snap-start shrink-0 w-60 rounded-2xl p-4 border transition-colors ${
                  active
                    ? 'bg-[#0F5C4D]/8 dark:bg-[#4ECBA9]/12 border-[#0F5C4D]/40 dark:border-[#4ECBA9]/40'
                    : 'bg-white dark:bg-[#131F1C] border-black/8 dark:border-white/10'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => audioManager.playSurah(currentSurahNumber, r.id, 0)}
                    className="text-start min-w-0 flex-1"
                  >
                    <p className="text-sm font-semibold text-[#13201C] dark:text-[#ECF2EF] truncate">
                      {lang === 'ar' ? r.nameAr : r.nameEn}
                    </p>
                    <p className="text-xs text-[#546660] dark:text-[#96ABA3] truncate mt-0.5">
                      {lang === 'ar' ? r.nameEn : r.nameAr}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFavoriteReciter(r.id)}
                    aria-label="Favorite Reciter"
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        isFavReciter ? 'fill-[#C69749] text-[#C69749]' : 'text-[#546660]'
                      }`}
                    />
                  </button>
                </div>

                <p className="mt-2 text-[11px] text-[#546660] dark:text-[#96ABA3] truncate">
                  {lang === 'ar' ? r.styleAr : r.styleEn}
                </p>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-[#0F5C4D] dark:text-[#4ECBA9]">
                    {isBestForMode ? `${t.modes[focusMode]} Pick` : 'Full Murattal'}
                  </span>
                  <button
                    type="button"
                    onClick={() => audioManager.playSurah(currentSurahNumber, r.id, 0)}
                    className="md-ripple inline-flex items-center gap-1.5 px-3 min-h-[36px] rounded-xl bg-[#EDF3F0] dark:bg-[#1B2B25] text-xs font-semibold text-[#0F5C4D] dark:text-[#4ECBA9]"
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
          <h2 id="recent-heading" className="text-lg font-bold text-[#13201C] dark:text-[#ECF2EF] mb-3">
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
                  className="md-ripple shrink-0 text-start rounded-2xl bg-white dark:bg-[#131F1C] border border-black/8 dark:border-white/10 px-4 py-3 min-w-[180px]"
                >
                  <p className="text-sm font-semibold text-[#13201C] dark:text-[#ECF2EF] truncate">
                    {s.number}. {lang === 'ar' ? s.name : s.englishName}
                  </p>
                  <p className="text-xs text-[#546660] dark:text-[#96ABA3] truncate mt-0.5">
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
          <h2 id="all-surahs-heading" className="text-lg font-bold text-[#13201C] dark:text-[#ECF2EF]">
            {t.home.allSurahs}
          </h2>

          <div className="flex items-center gap-1 p-1 rounded-2xl bg-[#E5ECE8] dark:bg-[#16241F]">
            {(
              [
                {id: 'all', en: 'All', ar: 'الكل'},
                {id: 'meccan', en: 'Meccan', ar: 'مكية'},
                {id: 'medinan', en: 'Medinan', ar: 'مدنية'},
                {id: 'short', en: 'Short', ar: 'قصار'},
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSurahFilter(tab.id)}
                className={`px-3 min-h-[34px] rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                  surahFilter === tab.id
                    ? 'bg-white dark:bg-[#233730] text-[#13201C] dark:text-[#ECF2EF] shadow-sm'
                    : 'text-[#546660] dark:text-[#96ABA3]'
                }`}
              >
                {lang === 'ar' ? tab.ar : tab.en}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
          {filteredSurahs.map((s) => {
            const isCurrent = currentSurahNumber === s.number;
            const isFav = favoriteSurahNumbers.includes(s.number);
            return (
              <div
                key={s.number}
                className={`rounded-2xl border p-3.5 flex items-center justify-between gap-2 transition-colors ${
                  isCurrent
                    ? 'bg-[#0F5C4D]/8 dark:bg-[#4ECBA9]/12 border-[#0F5C4D]/35 dark:border-[#4ECBA9]/35'
                    : 'bg-white dark:bg-[#131F1C] border-black/6 dark:border-white/8'
                }`}
              >
                <button
                  type="button"
                  onClick={() => openReader(s.number)}
                  className="flex-1 min-w-0 flex items-center gap-3 text-start min-h-[44px]"
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold tabular-nums shrink-0 ${
                      isCurrent
                        ? 'bg-[#0F5C4D] text-white dark:bg-[#4ECBA9] dark:text-[#081A15]'
                        : 'bg-[#EDF3F0] dark:bg-[#1B2B25] text-[#0F5C4D] dark:text-[#4ECBA9]'
                    }`}
                  >
                    {s.number}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[#13201C] dark:text-[#ECF2EF] truncate">
                        {s.englishName}
                      </span>
                      <span className="font-quran-amiri text-base text-[#0F5C4D] dark:text-[#E2B76B] shrink-0" dir="rtl">
                        {s.name}
                      </span>
                    </div>
                    <p className="text-xs text-[#546660] dark:text-[#96ABA3] truncate">
                      {s.englishNameTranslation} · {s.numberOfAyahs} {t.home.ayahs}
                    </p>
                  </div>
                </button>

                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleFavoriteSurah(s.number)}
                    aria-label={`Favorite ${s.englishName}`}
                    className="min-h-[44px] min-w-[40px] flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        isFav ? 'fill-[#C69749] text-[#C69749]' : 'text-[#546660] dark:text-[#96ABA3]'
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
                    className="md-ripple min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#EDF3F0] dark:bg-[#1B2B25] text-[#0F5C4D] dark:text-[#4ECBA9]"
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
