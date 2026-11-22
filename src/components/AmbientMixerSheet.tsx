import {
  AudioLines,
  CloudLightning,
  CloudRain,
  Droplets,
  Flame,
  Loader2,
  Moon,
  Sparkles,
  Trees,
  Volume2,
  Waves,
  Wind,
  X,
} from 'lucide-react';
import React, {useEffect, useState} from 'react';
import {TRANSLATIONS} from '../data/i18n';
import {AMBIENT_SOUNDS, ambientEngine} from '../services/ambientAudio';
import {getActiveAmbientSounds, useQuranStore} from '../store/useQuranStore';
import {AmbientPresetId, AmbientSoundType} from '../types/quran';

const SOUND_ICONS: Record<AmbientSoundType, React.FC<{className?: string}>> = {
  'soft-rain': CloudRain,
  'heavy-rain': CloudLightning,
  'forest-birds': Trees,
  'ocean-waves': Waves,
  'gentle-stream': Droplets,
  'night-crickets': Moon,
  'soft-wind': Wind,
  fireplace: Flame,
  'brown-noise': AudioLines,
};

const PRESET_DEFS: Array<{
  id: AmbientPresetId;
  labelKey: 'presetDeepSleep' | 'presetFocus' | 'presetCalmNight' | 'presetCozy';
}> = [
  {id: 'deep-sleep', labelKey: 'presetDeepSleep'},
  {id: 'focus', labelKey: 'presetFocus'},
  {id: 'calm-night', labelKey: 'presetCalmNight'},
  {id: 'cozy', labelKey: 'presetCozy'},
];

export const AmbientMixerSheet: React.FC = () => {
  const isOpen = useQuranStore((s) => s.isAmbientSheetOpen);
  const setOpen = useQuranStore((s) => s.setAmbientSheetOpen);
  const ambientMix = useQuranStore((s) => s.ambientMix);
  const toggleAmbientChannel = useQuranStore((s) => s.toggleAmbientChannel);
  const setAmbientChannelVolume = useQuranStore((s) => s.setAmbientChannelVolume);
  const setAmbientMasterVolume = useQuranStore((s) => s.setAmbientMasterVolume);
  const applyAmbientPreset = useQuranStore((s) => s.applyAmbientPreset);
  const clearAmbientMix = useQuranStore((s) => s.clearAmbientMix);
  const lang = useQuranStore((s) => s.settings.language);
  const t = TRANSLATIONS[lang];

  const [loadingSounds, setLoadingSounds] = useState<AmbientSoundType[]>(() =>
    ambientEngine.getLoadingSounds()
  );

  useEffect(() => {
    return ambientEngine.subscribeLoading(() => {
      setLoadingSounds(ambientEngine.getLoadingSounds());
    });
  }, []);

  if (!isOpen) return null;

  const activeSounds = getActiveAmbientSounds(ambientMix);

  const handleToggle = (id: AmbientSoundType) => {
    const nextMix = toggleAmbientChannel(id);
    void ambientEngine.syncMix(nextMix);
  };

  const handleChannelVolume = (id: AmbientSoundType, vol: number) => {
    const wasOff = !ambientMix.channels[id]?.enabled;
    let nextMix = setAmbientChannelVolume(id, vol);
    if (wasOff) {
      nextMix = toggleAmbientChannel(id);
      void ambientEngine.syncMix(nextMix);
    } else {
      ambientEngine.setChannelVolume(id, vol);
    }
  };

  const handleMasterVolume = (vol: number) => {
    setAmbientMasterVolume(vol);
    ambientEngine.setMasterVolume(vol);
  };

  const handlePreset = (presetId: AmbientPresetId) => {
    const nextMix = applyAmbientPreset(presetId);
    void ambientEngine.syncMix(nextMix);
  };

  const handleMuteAll = () => {
    clearAmbientMix();
    ambientEngine.stop();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-brand-950/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t.modes.ambientMixer}
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl max-h-[88vh] flex flex-col rounded-t-3xl sm:rounded-3xl glass-strong p-5 sm:p-6 pb-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1.5 rounded-full bg-brand-600/25 dark:bg-white/25 mx-auto mb-3 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between gap-4 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-ink dark:text-ink-dark">
              {t.modes.ambientMixer}
            </h2>
            <p className="text-xs text-muted dark:text-muted-dark mt-0.5">
              {lang === 'ar'
                ? 'امزج عدة أصوات طبيعية حقيقية بهدوء أسفل التلاوة'
                : 'Layer real CC0 nature recordings gently beneath Quran recitation'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full hover:bg-brand-500/10 dark:hover:bg-white/10 text-muted dark:text-muted-dark"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* One-Tap Presets */}
        <div className="mt-4 shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-700 dark:text-accent mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.modes.presetsLabel}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRESET_DEFS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePreset(preset.id)}
                className="md-ripple glass min-h-[48px] px-3 rounded-2xl text-xs font-semibold text-ink dark:text-ink-dark hover:border-brand-500/40 dark:hover:border-accent/40 transition-colors"
              >
                {t.modes[preset.labelKey]}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable 9-Channel Sound Mixer */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-2.5 pe-1">
          {AMBIENT_SOUNDS.map((id) => {
            const Icon = SOUND_ICONS[id];
            const ch = ambientMix.channels[id];
            const active = ch?.enabled ?? false;
            const vol = ch?.volume ?? 0.5;
            const isLoading = loadingSounds.includes(id);

            return (
              <div
                key={id}
                className={`rounded-2xl p-3.5 transition-colors border ${
                  active
                    ? 'bg-brand-600/12 dark:bg-brand-500/20 border-brand-500/40 dark:border-accent/45'
                    : 'glass'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggle(id)}
                    aria-pressed={active}
                    className="md-ripple flex-1 min-w-0 flex items-center gap-3 text-start min-h-[48px] rounded-xl"
                  >
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                        active
                          ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950'
                          : 'bg-brand-100 dark:bg-white/10 text-brand-700 dark:text-brand-200'
                      }`}
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink dark:text-ink-dark truncate">
                        {t.modes[id]}
                      </p>
                      <p className="text-xs text-muted dark:text-muted-dark tabular-nums">
                        {isLoading
                          ? lang === 'ar'
                            ? 'جاري التحميل...'
                            : 'Loading sound...'
                          : active
                          ? `${Math.round(vol * 100)}%`
                          : t.modes.ambientOff}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggle(id)}
                    aria-label={`${t.modes[id]} toggle`}
                    className={`md-ripple min-h-[48px] px-4 rounded-2xl text-xs font-semibold shrink-0 transition-colors ${
                      active
                        ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950'
                        : 'bg-brand-100/80 dark:bg-white/10 text-muted dark:text-muted-dark'
                    }`}
                  >
                    {active ? (lang === 'ar' ? 'يعمل' : 'On') : lang === 'ar' ? 'إيقاف' : 'Off'}
                  </button>
                </div>

                {/* Per-sound volume slider */}
                <div className="mt-2.5 flex items-center gap-3 px-1">
                  <Volume2 className="w-3.5 h-3.5 text-muted dark:text-muted-dark shrink-0" />
                  <input
                    type="range"
                    min={0.05}
                    max={1}
                    step={0.01}
                    value={vol}
                    onChange={(e) => handleChannelVolume(id, Number(e.target.value))}
                    aria-label={`${t.modes[id]} volume`}
                    className="w-full md-slider bg-brand-900/15 dark:bg-white/20"
                  />
                  <span className="text-xs font-medium text-muted dark:text-muted-dark tabular-nums w-9 text-end shrink-0">
                    {Math.round(vol * 100)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Master Ambient Level + Footer */}
        <div className="mt-4 pt-3 border-t border-brand-600/12 dark:border-white/12 shrink-0 space-y-3">
          <div className="rounded-2xl glass p-3.5">
            <div className="flex items-center justify-between text-xs font-semibold text-ink dark:text-ink-dark mb-2.5">
              <span>{t.player.ambientVolume}</span>
              <span className="tabular-nums text-brand-700 dark:text-accent">
                {Math.round(ambientMix.masterVolume * 100)}%
                {activeSounds.length > 0 &&
                  ` · ${activeSounds.length} ${lang === 'ar' ? 'نشط' : 'active'}`}
              </span>
            </div>
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.01}
              value={ambientMix.masterVolume}
              onChange={(e) => handleMasterVolume(Number(e.target.value))}
              aria-label={t.player.ambientVolume}
              className="w-full md-slider bg-brand-900/15 dark:bg-white/20"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleMuteAll}
              className="md-ripple flex-1 min-h-[48px] rounded-2xl glass text-sm font-semibold text-ink dark:text-ink-dark"
            >
              {t.modes.ambientOff}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="md-ripple flex-1 min-h-[48px] rounded-2xl bg-brand-600 text-white dark:bg-accent dark:text-brand-950 text-sm font-semibold"
            >
              {lang === 'ar' ? 'تم' : 'Done'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
