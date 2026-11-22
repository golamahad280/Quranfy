import {CloudRain, Moon, Trees, Volume2, Waves, Wind, X} from 'lucide-react';
import React from 'react';
import {TRANSLATIONS} from '../data/i18n';
import {ambientEngine} from '../services/ambientAudio';
import {useQuranStore} from '../store/useQuranStore';
import {AmbientSoundType} from '../types/quran';

const AMBIENT_OPTIONS: Array<{
  id: AmbientSoundType;
  icon: React.FC<{className?: string}>;
}> = [
  {id: 'rain', icon: CloudRain},
  {id: 'night', icon: Moon},
  {id: 'forest', icon: Trees},
  {id: 'ocean', icon: Waves},
  {id: 'wind', icon: Wind},
  {id: 'white', icon: Volume2},
];

export const AmbientMixerSheet: React.FC = () => {
  const isOpen = useQuranStore((s) => s.isAmbientSheetOpen);
  const setOpen = useQuranStore((s) => s.setAmbientSheetOpen);
  const ambientSound = useQuranStore((s) => s.ambientSound);
  const ambientVolume = useQuranStore((s) => s.ambientVolume);
  const setAmbientSound = useQuranStore((s) => s.setAmbientSound);
  const setAmbientVolume = useQuranStore((s) => s.setAmbientVolume);
  const lang = useQuranStore((s) => s.settings.language);
  const t = TRANSLATIONS[lang];

  if (!isOpen) return null;

  const selectSound = (sound: AmbientSoundType | null) => {
    setAmbientSound(sound);
    if (sound === null) {
      ambientEngine.stop();
    } else {
      ambientEngine.start(sound, ambientVolume);
    }
  };

  const handleVolumeChange = (val: number) => {
    setAmbientVolume(val);
    ambientEngine.setVolume(val);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t.modes.ambientMixer}
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#131F1C] p-6 pb-8 shadow-2xl border border-black/5 dark:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1.5 rounded-full bg-black/15 dark:bg-white/20 mx-auto mb-4 sm:hidden" />

        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#13201C] dark:text-[#ECF2EF]">
              {t.modes.ambientMixer}
            </h2>
            <p className="text-xs text-[#546660] dark:text-[#96ABA3] mt-0.5">
              {lang === 'ar'
                ? 'صوت طبيعي مولّد محلياً يعمل دون إنترنت أسفل التلاوة'
                : 'Offline procedural soundscape layered softly under recitation'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#43544E] dark:text-[#A4B7B0]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2.5">
          {AMBIENT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = ambientSound === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => selectSound(active ? null : opt.id)}
                className={`md-ripple flex flex-col items-center justify-center gap-2 rounded-2xl p-3.5 min-h-[78px] border transition-colors ${
                  active
                    ? 'bg-[#0F5C4D] text-white border-[#0F5C4D] dark:bg-[#4ECBA9] dark:text-[#081A15] dark:border-[#4ECBA9]'
                    : 'bg-[#F3F6F4] dark:bg-[#192823] text-[#283833] dark:text-[#DCE6E2] border-transparent hover:border-[#0F5C4D]/25 dark:hover:border-[#4ECBA9]/25'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium whitespace-nowrap">
                  {t.modes[opt.id]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 rounded-2xl bg-[#F3F6F4] dark:bg-[#192823] p-4">
          <div className="flex items-center justify-between text-xs font-medium text-[#43544E] dark:text-[#A4B7B0] mb-3">
            <span>{t.player.ambientVolume}</span>
            <span className="tabular-nums">{Math.round(ambientVolume * 100)}%</span>
          </div>
          <input
            type="range"
            min={0.05}
            max={0.9}
            step={0.01}
            value={ambientVolume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            aria-label={t.player.ambientVolume}
            className="w-full md-slider bg-black/15 dark:bg-white/15"
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => selectSound(null)}
            className="md-ripple flex-1 min-h-[44px] rounded-2xl border border-black/10 dark:border-white/15 text-sm font-medium text-[#283833] dark:text-[#DCE6E2]"
          >
            {t.modes.ambientOff}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="md-ripple flex-1 min-h-[44px] rounded-2xl bg-[#0F5C4D] text-white dark:bg-[#4ECBA9] dark:text-[#081A15] text-sm font-medium"
          >
            {lang === 'ar' ? 'تم' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
