import {BookOpen, ListMusic, Loader2, Play, Search, UserCheck, X} from 'lucide-react';
import React, {useEffect, useMemo, useState} from 'react';
import {TRANSLATIONS} from '../data/i18n';
import {audioManager} from '../services/audioManager';
import {AyahSearchMatch, searchQuranAyahs} from '../services/quranApi';
import {getAllPlaylists, useQuranStore} from '../store/useQuranStore';

export const SearchScreen: React.FC = () => {
  const surahs = useQuranStore((s) => s.surahs);
  const reciters = useQuranStore((s) => s.reciters);
  const customPlaylists = useQuranStore((s) => s.customPlaylists);
  const currentReciterId = useQuranStore((s) => s.currentReciterId);
  const settings = useQuranStore((s) => s.settings);
  const openReader = useQuranStore((s) => s.openReader);
  const setQueueAndPlay = useQuranStore((s) => s.setQueueAndPlay);

  const [query, setQuery] = useState('');
  const [ayahMatches, setAyahMatches] = useState<AyahSearchMatch[]>([]);
  const [searchingAyahs, setSearchingAyahs] = useState(false);

  const lang = settings.language;
  const t = TRANSLATIONS[lang];
  const allPlaylists = useMemo(() => getAllPlaylists(customPlaylists), [customPlaylists]);

  const clean = query.trim().toLowerCase();

  const surahMatches = useMemo(() => {
    if (!clean) return [];
    return surahs.filter(
      (s) =>
        String(s.number) === clean ||
        s.englishName.toLowerCase().includes(clean) ||
        s.englishNameTranslation.toLowerCase().includes(clean) ||
        s.name.includes(query.trim())
    );
  }, [surahs, clean, query]);

  const reciterMatches = useMemo(() => {
    if (!clean) return [];
    return reciters.filter(
      (r) =>
        r.nameEn.toLowerCase().includes(clean) ||
        r.nameAr.includes(query.trim()) ||
        r.styleEn.toLowerCase().includes(clean)
    );
  }, [reciters, clean, query]);

  const playlistMatches = useMemo(() => {
    if (!clean) return [];
    return allPlaylists.filter(
      (p) =>
        p.nameEn.toLowerCase().includes(clean) ||
        p.nameAr.includes(query.trim()) ||
        p.descriptionEn.toLowerCase().includes(clean)
    );
  }, [allPlaylists, clean, query]);

  useEffect(() => {
    if (query.trim().length < 3) {
      setAyahMatches([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      setSearchingAyahs(true);
      const res = await searchQuranAyahs(query.trim(), settings.translationEdition);
      setAyahMatches(res);
      setSearchingAyahs(false);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [query, settings.translationEdition]);

  const hasAnyResults =
    surahMatches.length > 0 ||
    reciterMatches.length > 0 ||
    playlistMatches.length > 0 ||
    ayahMatches.length > 0;

  return (
    <div className="space-y-6 pb-8">
      {/* Search Input */}
      <div className="relative">
        <Search className="w-5 h-5 absolute start-4 top-1/2 -translate-y-1/2 text-muted dark:text-muted-dark z-10 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.search.placeholder}
          aria-label={t.search.placeholder}
          className="w-full min-h-[54px] rounded-3xl glass-strong ps-12 pe-12 text-sm text-ink dark:text-ink-dark outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-accent"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute end-1.5 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-brand-500/10 dark:hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Quick Suggestions when empty */}
      {!clean && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted dark:text-muted-dark">
            {lang === 'ar' ? 'عمليات بحث مقترحة' : 'Quick Searches'}
          </p>
          <div className="flex flex-wrap gap-2">
            {['Al-Kahf', 'Ar-Rahman', 'Al-Mulk', 'Yasin', 'Alafasy', 'Hazza', 'mercy', 'patience'].map(
              (term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setQuery(term)}
                  className="md-ripple px-4 min-h-[44px] rounded-2xl glass text-xs font-semibold text-ink dark:text-ink-dark"
                >
                  {term}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Empty Results */}
      {clean && !hasAnyResults && !searchingAyahs && (
        <div className="rounded-3xl glass p-8 text-center">
          <p className="text-base font-bold text-ink dark:text-ink-dark">{t.search.noResults}</p>
          <p className="mt-1 text-xs text-muted dark:text-muted-dark">{t.search.tryAnother}</p>
        </div>
      )}

      {surahMatches.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-brand-700 dark:text-accent mb-2.5">
            {t.search.surahs} ({surahMatches.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {surahMatches.slice(0, 12).map((s) => (
              <div
                key={s.number}
                className="rounded-3xl glass p-4 flex items-center justify-between gap-2"
              >
                <button
                  type="button"
                  onClick={() => openReader(s.number)}
                  className="flex-1 min-w-0 text-start flex items-center gap-3 min-h-[48px]"
                >
                  <span className="w-10 h-10 rounded-2xl bg-brand-600/14 dark:bg-white/10 text-brand-700 dark:text-accent flex items-center justify-center text-xs font-bold tabular-nums shrink-0">
                    {s.number}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {s.englishName} · <span className="font-quran-amiri">{s.name}</span>
                    </p>
                    <p className="text-xs text-muted dark:text-muted-dark truncate">
                      {s.englishNameTranslation} · {s.numberOfAyahs} {t.home.ayahs}
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => audioManager.playSurah(s.number, currentReciterId, 0)}
                  aria-label={`Play ${s.englishName}`}
                  className="md-ripple min-h-[48px] min-w-[48px] flex items-center justify-center rounded-2xl bg-brand-600 text-white dark:bg-accent dark:text-brand-950"
                >
                  <Play className="w-4 h-4 fill-current ms-0.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {reciterMatches.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-brand-700 dark:text-accent mb-2.5">
            {t.search.reciters} ({reciterMatches.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {reciterMatches.slice(0, 10).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => audioManager.playSurah(1, r.id, 0)}
                className="md-ripple text-start rounded-3xl glass p-4 flex items-center justify-between gap-3 min-h-[60px]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {lang === 'ar' ? r.nameAr : r.nameEn}
                  </p>
                  <p className="text-xs text-muted dark:text-muted-dark truncate">
                    {lang === 'ar' ? r.nameEn : r.nameAr} · {lang === 'ar' ? r.styleAr : r.styleEn}
                  </p>
                </div>
                <UserCheck className="w-4 h-4 text-brand-600 dark:text-accent shrink-0" />
              </button>
            ))}
          </div>
        </section>
      )}

      {playlistMatches.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-brand-700 dark:text-accent mb-2.5">
            {t.search.playlists} ({playlistMatches.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {playlistMatches.map((pl) => (
              <button
                key={pl.id}
                type="button"
                onClick={() => {
                  setQueueAndPlay(
                    pl.items.map((it) => ({surahNumber: it.surahNumber, reciterId: it.reciterId})),
                    0
                  );
                  audioManager.loadAndPlayCurrent(0);
                }}
                className="md-ripple text-start rounded-3xl glass p-4 flex items-center justify-between gap-3 min-h-[60px]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ListMusic className="w-5 h-5 text-brand-600 dark:text-accent shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {lang === 'ar' ? pl.nameAr : pl.nameEn}
                    </p>
                    <p className="text-xs text-muted dark:text-muted-dark truncate">
                      {pl.items.length} {lang === 'ar' ? 'سور' : 'surahs'}
                    </p>
                  </div>
                </div>
                <Play className="w-4 h-4 text-brand-600 dark:text-accent shrink-0" />
              </button>
            ))}
          </div>
        </section>
      )}

      {(searchingAyahs || ayahMatches.length > 0) && (
        <section>
          <div className="flex items-center gap-2 mb-2.5">
            <h2 className="text-sm font-bold text-brand-700 dark:text-accent">{t.search.ayahs}</h2>
            {searchingAyahs && (
              <Loader2 className="w-4 h-4 animate-spin text-brand-600 dark:text-accent" />
            )}
          </div>
          <div className="space-y-2.5">
            {ayahMatches.map((m, idx) => (
              <div
                key={`${m.surahNumber}:${m.numberInSurah}:${idx}`}
                className="rounded-3xl glass p-4 flex items-start justify-between gap-3"
              >
                <button
                  type="button"
                  onClick={() => openReader(m.surahNumber)}
                  className="text-start flex-1 min-w-0"
                >
                  <p className="text-xs font-semibold text-brand-700 dark:text-accent">
                    {m.surahNameEn} ({m.surahNameAr}) · {m.surahNumber}:{m.numberInSurah}
                  </p>
                  <p className="mt-1.5 text-sm text-ink dark:text-ink-dark leading-relaxed">
                    {m.text}
                  </p>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => audioManager.playAyah(m.surahNumber, m.numberInSurah)}
                    aria-label="Play Ayah"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl bg-brand-600/14 dark:bg-white/10 text-brand-700 dark:text-accent"
                  >
                    <Play className="w-4 h-4 fill-current" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openReader(m.surahNumber)}
                    aria-label="Read in Surah"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl hover:bg-brand-500/10 dark:hover:bg-white/10"
                  >
                    <BookOpen className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
