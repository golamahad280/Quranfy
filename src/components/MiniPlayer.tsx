import {BookOpen, Loader2, Pause, Play, SlidersHorizontal} from 'lucide-react';
import React from 'react';
import {audioManager} from '../services/audioManager';
import {useQuranStore} from '../store/useQuranStore';

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
  const ambientSound = useQuranStore((s) => s.ambientSound);
  const setFullPlayerOpen = useQuranStore((s) => s.setFullPlayerOpen);
  const setAmbientSheetOpen = useQuranStore((s) => s.setAmbientSheetOpen);
  const openReader = useQuranStore((s) => s.openReader);
  const lang = useQuranStore((s) => s.settings.language);

  const surah = surahs.find((s) => s.number === currentSurahNumber) || surahs[0];
  const reciter = reciters.find((r) => r.id === currentReciterId) || reciters[0];
  const progressPct = durationSec > 0 ? Math.min(100, (currentTimeSec / durationSec) * 100) : 0;

  return (
    <div
      className="fixed bottom-[64px] md:bottom-4 left-0 right-0 md:left-24 md:right-6 z-30 px-2 md:px-0 pointer-events-none"
      style={{marginBottom: 'env(safe-area-inset-bottom, 0px)'}}
    >
      <div className="pointer-events-auto max-w-4xl mx-auto rounded-2xl bg-[#EDF3F0]/95 dark:bg-[#172621]/95 backdrop-blur-md border border-black/8 dark:border-white/10 shadow-lg overflow-hidden">
        {/* Progress hairline */}
        <div className="h-[2px] w-full bg-black/8 dark:bg-white/10">
          <div
            className="h-full bg-[#0F5C4D] dark:bg-[#4ECBA9] transition-all duration-300"
            style={{width: `${progressPct}%`}}
          />
        </div>

        <div className="flex items-center justify-between gap-2 px-3 py-1.5">
          <button
            type="button"
            onClick={() => setFullPlayerOpen(true)}
            className="flex-1 min-w-0 flex items-center gap-3 text-start min-h-[46px]"
          >
            <div className="w-10 h-10 rounded-xl bg-[#0F5C4D] dark:bg-[#1E473C] text-white flex items-center justify-center font-display text-xs font-semibold tabular-nums shrink-0">
              {surah.number}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-semibold text-[#13201C] dark:text-[#ECF2EF] truncate">
                  {lang === 'ar' ? surah.name : surah.englishName}
                </span>
                <span className="text-xs text-[#546660] dark:text-[#96ABA3] truncate hidden sm:inline">
                  {lang === 'ar' ? surah.englishName : surah.name}
                </span>
              </div>
              <p className="text-xs text-[#546660] dark:text-[#96ABA3] truncate">
                {lang === 'ar' ? reciter.nameAr : reciter.nameEn}
                {playMode === 'ayah' && ` · ${lang === 'ar' ? 'آية' : 'Ayah'} ${currentAyahNumber}`}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setAmbientSheetOpen(true)}
              aria-label="Ambient Sound Mixer"
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-colors ${
                ambientSound
                  ? 'text-[#0F5C4D] dark:text-[#4ECBA9] bg-[#0F5C4D]/10 dark:bg-[#4ECBA9]/15'
                  : 'text-[#546660] dark:text-[#96ABA3] hover:bg-black/5 dark:hover:bg-white/10'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => openReader(surah.number)}
              aria-label="Open Reader"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#546660] dark:text-[#96ABA3] hover:bg-black/5 dark:hover:bg-white/10"
            >
              <BookOpen className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => audioManager.togglePlay()}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="md-ripple min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#0F5C4D] text-white dark:bg-[#4ECBA9] dark:text-[#081A15]"
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
