import {BookOpen, Loader2, Pause, Play, SlidersHorizontal} from 'lucide-react';
import React from 'react';
import {audioManager} from '../services/audioManager';
import {getActiveAmbientSounds, useQuranStore} from '../store/useQuranStore';

export const MiniPlayer: React.FC = () => {
  const currentSurahNumber = useQuranStore((s) => s.currentSurahNumber);
  const currentReciterId = useQuranStore((s) => s.currentReciterId);
  const surahs = useQuranStore((s) => s.surahs);
  const reciters = useQuranStore((s) => s.reciters);
  const isPlaying = useQuranStore((s) => s.isPlaying);
  const isLoadingAudio = useQuranStore((s) => s.isLoadingAudio);
  const currentTimeSec = useQuranStore((s) => s.currentTimeSec);
  const durationSec = useQuranStore((s) => s.durationSec);
  const playMode = useQuranStore((s) => s.playMode);
  const currentAyahNumber = useQuranStore((s) => s.currentAyahNumber);
  const ambientMix = useQuranStore((s) => s.ambientMix);
  const setFullPlayerOpen = useQuranStore((s) => s.setFullPlayerOpen);
  const setAmbientSheetOpen = useQuranStore((s) => s.setAmbientSheetOpen);
  const openReader = useQuranStore((s) => s.openReader);
  const lang = useQuranStore((s) => s.settings.language);

  const surah = surahs.find((s) => s.number === currentSurahNumber) || surahs[0];
  const reciter = reciters.find((r) => r.id === currentReciterId) || reciters[0];
  const progressPct = durationSec > 0 ? Math.min(100, (currentTimeSec / durationSec) * 100) : 0;
  const activeAmbientCount = getActiveAmbientSounds(ambientMix).length;

  return (
    <div
      className="fixed bottom-[66px] md:bottom-4 left-0 right-0 md:left-24 md:right-6 z-30 px-2.5 md:px-0 pointer-events-none"
      style={{marginBottom: 'env(safe-area-inset-bottom, 0px)'}}
    >
      <div className="pointer-events-auto max-w-4xl mx-auto rounded-3xl glass-strong overflow-hidden">
        {/* Progress hairline */}
        <div className="h-[3px] w-full bg-brand-900/10 dark:bg-white/12">
          <div
            className="h-full bg-brand-600 dark:bg-accent transition-all duration-300"
            style={{width: `${progressPct}%`}}
          />
        </div>

        <div className="flex items-center justify-between gap-2 px-3.5 py-2">
          <button
            type="button"
            onClick={() => setFullPlayerOpen(true)}
            className="flex-1 min-w-0 flex items-center gap-3 text-start min-h-[48px]"
          >
            <div className="w-11 h-11 rounded-2xl bg-brand-600 dark:bg-brand-500 text-white flex items-center justify-center font-display text-xs font-bold tabular-nums shrink-0 shadow-sm">
              {surah.number}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-semibold text-ink dark:text-ink-dark truncate">
                  {lang === 'ar' ? surah.name : surah.englishName}
                </span>
                <span className="text-xs text-muted dark:text-muted-dark truncate hidden sm:inline">
                  {lang === 'ar' ? surah.englishName : surah.name}
                </span>
              </div>
              <p className="text-xs text-muted dark:text-muted-dark truncate">
                {lang === 'ar' ? reciter.nameAr : reciter.nameEn}
                {playMode === 'ayah' && ` · ${lang === 'ar' ? 'آية' : 'Ayah'} ${currentAyahNumber}`}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setAmbientSheetOpen(true)}
              aria-label="Ambient Sound Mixer"
              className={`min-h-[48px] min-w-[48px] flex items-center justify-center rounded-2xl transition-colors ${
                activeAmbientCount > 0
                  ? 'text-brand-700 dark:text-accent bg-brand-600/12 dark:bg-accent/18'
                  : 'text-muted dark:text-muted-dark hover:bg-brand-500/10 dark:hover:bg-white/10'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => openReader(surah.number)}
              aria-label="Open Reader"
              className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-2xl text-muted dark:text-muted-dark hover:bg-brand-500/10 dark:hover:bg-white/10"
            >
              <BookOpen className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => audioManager.togglePlay()}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="md-ripple min-h-[48px] min-w-[48px] flex items-center justify-center rounded-2xl bg-brand-600 text-white dark:bg-accent dark:text-brand-950 shadow-sm"
            >
              {isLoadingAudio ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ms-0.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
