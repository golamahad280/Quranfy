import {CheckCircle2, Eye, EyeOff, Loader2, Play, Repeat, Square} from 'lucide-react';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {pickLang} from '../data/i18n';
import {audioManager} from '../services/audioManager';
import {fetchSurahWithTranslation} from '../services/quranApi';
import {useQuranStore} from '../store/useQuranStore';
import {AyahItem} from '../types/quran';

type HideLevel = 0 | 1 | 2 | 3;

export const HifzScreen: React.FC = () => {
  const surahs = useQuranStore((s) => s.surahs);
  const settings = useQuranStore((s) => s.settings);
  const currentReciterId = useQuranStore((s) => s.currentReciterId);
  const currentAyahNumber = useQuranStore((s) => s.currentAyahNumber);
  const isPlaying = useQuranStore((s) => s.isPlaying);
  const hifzState = useQuranStore((s) => s.hifzState);
  const toggleMemorizedAyah = useQuranStore((s) => s.toggleMemorizedAyah);
  const recordHifzSession = useQuranStore((s) => s.recordHifzSession);
  const updateHifzRange = useQuranStore((s) => s.updateHifzRange);

  const [selectedSurah, setSelectedSurah] = useState(hifzState.lastSurahNumber || 112);
  const [rangeStart, setRangeStart] = useState(hifzState.lastRangeStart || 1);
  const [rangeEnd, setRangeEnd] = useState(hifzState.lastRangeEnd || 4);
  const [hideLevel, setHideLevel] = useState<HideLevel>(0);
  const [peekedKeys, setPeekedKeys] = useState<Record<string, boolean>>({});
  const [repeatEach, setRepeatEach] = useState(3);
  const [gapSeconds, setGapSeconds] = useState(2);

  const [ayahs, setAyahs] = useState<AyahItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [activeRepeatIndex, setActiveRepeatIndex] = useState(1);

  const gapTimerRef = useRef<number | null>(null);
  const loopConfigRef = useRef({
    surahNumber: selectedSurah,
    start: rangeStart,
    end: rangeEnd,
    repeatEach,
    gapSeconds,
    reciterId: currentReciterId,
    repIndex: 1,
    active: false,
  });

  const lang = settings.language;
  const surahMeta = useMemo(
    () => surahs.find((s) => s.number === selectedSurah) || surahs[0],
    [surahs, selectedSurah]
  );
  const maxAyahs = surahMeta?.numberOfAyahs || 7;

  useEffect(() => {
    setRangeStart((prev) => Math.max(1, Math.min(prev, maxAyahs)));
    setRangeEnd((prev) => Math.max(1, Math.min(prev, maxAyahs)));
  }, [maxAyahs]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchSurahWithTranslation(selectedSurah, settings.translationEdition)
      .then((detail) => {
        if (active) {
          setAyahs(detail.ayahs);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedSurah, settings.translationEdition]);

  const stopLoop = () => {
    if (gapTimerRef.current) {
      window.clearTimeout(gapTimerRef.current);
      gapTimerRef.current = null;
    }
    loopConfigRef.current.active = false;
    audioManager.setAyahEndedObserver(null);
    audioManager.pause();
    setIsLooping(false);
    setActiveRepeatIndex(1);
  };

  useEffect(() => {
    return () => {
      if (gapTimerRef.current) window.clearTimeout(gapTimerRef.current);
      audioManager.setAyahEndedObserver(null);
    };
  }, []);

  const visibleAyahs = useMemo(() => {
    const start = Math.min(rangeStart, rangeEnd);
    const end = Math.max(rangeStart, rangeEnd);
    return ayahs.filter((a) => a.numberInSurah >= start && a.numberInSurah <= end);
  }, [ayahs, rangeStart, rangeEnd]);

  const memorizedInRange = useMemo(() => {
    return visibleAyahs.filter((a) =>
      hifzState.memorizedAyahKeys.includes(`${selectedSurah}:${a.numberInSurah}`)
    ).length;
  }, [visibleAyahs, hifzState.memorizedAyahKeys, selectedSurah]);

  const startLoop = () => {
    const start = Math.min(rangeStart, rangeEnd);
    const end = Math.max(rangeStart, rangeEnd);
    updateHifzRange(selectedSurah, start, end);

    loopConfigRef.current = {
      surahNumber: selectedSurah,
      start,
      end,
      repeatEach,
      gapSeconds,
      reciterId: currentReciterId,
      repIndex: 1,
      active: true,
    };

    setIsLooping(true);
    setActiveRepeatIndex(1);

    audioManager.setAyahEndedObserver((finishedSurah, finishedAyah) => {
      const cfg = loopConfigRef.current;
      if (!cfg.active || finishedSurah !== cfg.surahNumber) return false;

      const scheduleNext = (nextAyah: number, nextRep: number) => {
        setActiveRepeatIndex(nextRep);
        if (gapTimerRef.current) window.clearTimeout(gapTimerRef.current);
        gapTimerRef.current = window.setTimeout(() => {
          if (!loopConfigRef.current.active) return;
          void audioManager.playAyah(cfg.surahNumber, nextAyah, cfg.reciterId);
        }, cfg.gapSeconds * 1000);
      };

      if (cfg.repIndex < cfg.repeatEach) {
        cfg.repIndex += 1;
        scheduleNext(finishedAyah, cfg.repIndex);
      } else {
        cfg.repIndex = 1;
        if (finishedAyah < cfg.end) {
          scheduleNext(finishedAyah + 1, 1);
        } else {
          recordHifzSession(cfg.surahNumber, cfg.start, cfg.end);
          scheduleNext(cfg.start, 1);
        }
      }
      return true;
    });

    void audioManager.playAyah(selectedSurah, start, currentReciterId);
  };

  const arabicFontClass =
    settings.arabicFont === 'scheherazade' ? 'font-quran-scheherazade' : 'font-quran-amiri';

  const hideModes: Array<{level: HideLevel; label: string}> = [
    {level: 0, label: pickLang(lang, 'Visible', 'واضح', 'দৃশ্যমান')},
    {level: 1, label: pickLang(lang, 'Faded', 'خافت', 'হালকা')},
    {level: 2, label: pickLang(lang, 'Blurred', 'مموّه', 'ঝাপসা')},
    {level: 3, label: pickLang(lang, 'Hidden', 'مخفي', 'লুকানো')},
  ];

  return (
    <div className="space-y-5 pb-8 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink dark:text-ink-dark">
            {pickLang(lang, 'Hifz Memorization Mode', 'وضع الحفظ والتكرار', 'হিফজ (মুখস্থ) মোড')}
          </h2>
          <p className="text-xs text-muted dark:text-muted-dark tabular-nums">
            {hifzState.memorizedAyahKeys.length}{' '}
            {pickLang(lang, 'ayahs marked memorized', 'آية محفوظة', 'টি আয়াত মুখস্থ চিহ্নিত')} ·{' '}
            {hifzState.sessionsCompleted}{' '}
            {pickLang(lang, 'loops completed', 'دورات مكتملة', 'বার অনুশীলন সম্পন্ন')}
          </p>
        </div>
      </div>

      {/* Controls Card */}
      <section className="rounded-3xl glass p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <label className="block text-xs font-medium text-muted dark:text-muted-dark mb-1">
              {pickLang(lang, 'Surah', 'السورة', 'সূরা')}
            </label>
            <select
              value={selectedSurah}
              onChange={(e) => {
                if (isLooping) stopLoop();
                const num = Number(e.target.value);
                const s = surahs.find((x) => x.number === num);
                setSelectedSurah(num);
                setRangeStart(1);
                setRangeEnd(Math.min(s?.numberOfAyahs || 7, 7));
              }}
              className="w-full min-h-[48px] rounded-2xl glass px-3 text-xs font-medium"
            >
              {surahs.map((s) => (
                <option key={s.number} value={s.number} className="bg-surface-light dark:bg-surface-dark">
                  {s.number}. {s.englishName} ({s.name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted dark:text-muted-dark mb-1">
              {pickLang(lang, 'From Ayah', 'من الآية', 'শুরু আয়াত')}
            </label>
            <input
              type="number"
              min={1}
              max={maxAyahs}
              value={rangeStart}
              onChange={(e) => setRangeStart(Math.max(1, Math.min(maxAyahs, Number(e.target.value) || 1)))}
              className="w-full min-h-[48px] rounded-2xl glass px-3 text-xs font-semibold tabular-nums"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted dark:text-muted-dark mb-1">
              {pickLang(lang, 'To Ayah', 'إلى الآية', 'শেষ আয়াত')}
            </label>
            <input
              type="number"
              min={1}
              max={maxAyahs}
              value={rangeEnd}
              onChange={(e) => setRangeEnd(Math.max(1, Math.min(maxAyahs, Number(e.target.value) || 1)))}
              className="w-full min-h-[48px] rounded-2xl glass px-3 text-xs font-semibold tabular-nums"
            />
          </div>
        </div>

        {/* Repeat + Pause Gap */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-medium text-muted dark:text-muted-dark mb-1.5 flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5" />
              <span>{pickLang(lang, 'Repeat Each Ayah', 'تكرار كل آية', 'প্রতি আয়াত রিপিট')}</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 5, 7].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRepeatEach(n)}
                  className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold tabular-nums ${
                    repeatEach === n
                      ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950'
                      : 'glass'
                  }`}
                >
                  {n}x
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted dark:text-muted-dark mb-1.5">
              {pickLang(lang, 'Pause Between Recitations (s)', 'سكتة للحفظ بين الآيات (ث)', 'মাঝখানে বিরতি (সেকেন্ড)')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[0, 2, 4, 6, 10].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setGapSeconds(sec)}
                  className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold tabular-nums ${
                    gapSeconds === sec
                      ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950'
                      : 'glass'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Progressive Blur / Hide Mode */}
        <div>
          <p className="text-xs font-medium text-muted dark:text-muted-dark mb-1.5 flex items-center gap-1.5">
            {hideLevel > 0 ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>
              {pickLang(
                lang,
                'Recall Masking (tap any masked ayah to peek)',
                'إخفاء تدريجي للاختبار (اضغط على الآية للكشف)',
                'মুখস্থ পরীক্ষা (দেখতে আয়াতে ট্যাপ করুন)'
              )}
            </span>
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {hideModes.map((m) => (
              <button
                key={m.level}
                type="button"
                onClick={() => {
                  setHideLevel(m.level);
                  setPeekedKeys({});
                }}
                className={`min-h-[44px] rounded-xl text-xs font-semibold ${
                  hideLevel === m.level
                    ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950'
                    : 'glass'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Play / Stop Loop + Range Mastery */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-brand-500/12 dark:border-white/10">
          <div className="text-xs text-muted dark:text-muted-dark tabular-nums">
            {pickLang(lang, 'Range memorized', 'المحفوظ في النطاق', 'এই অংশে মুখস্থ')}:{' '}
            <strong className="text-ink dark:text-ink-dark">
              {memorizedInRange} / {visibleAyahs.length}
            </strong>
            {isLooping && (
              <span className="ms-2 text-brand-700 dark:text-accent font-semibold">
                · {pickLang(lang, `Pass ${activeRepeatIndex}/${repeatEach}`, `تكرار ${activeRepeatIndex}/${repeatEach}`, `বার ${activeRepeatIndex}/${repeatEach}`)}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={isLooping ? stopLoop : startLoop}
            className={`md-ripple min-h-[48px] px-5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm ${
              isLooping
                ? 'bg-rose-600 text-white'
                : 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950'
            }`}
          >
            {isLooping ? (
              <>
                <Square className="w-4 h-4 fill-current" />
                <span>{pickLang(lang, 'Stop Hifz Loop', 'إيقاف التكرار', 'লুপ থামান')}</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>{pickLang(lang, 'Start Hifz Loop', 'بدء حلقة الحفظ', 'হিফজ লুপ শুরু করুন')}</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* Ayah List */}
      {loading ? (
        <div className="rounded-3xl glass p-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-brand-600 dark:text-accent" />
        </div>
      ) : (
        <div className="space-y-3">
          {visibleAyahs.map((ayah) => {
            const key = `${selectedSurah}:${ayah.numberInSurah}`;
            const isMem = hifzState.memorizedAyahKeys.includes(key);
            const isCurrent = isLooping && isPlaying && currentAyahNumber === ayah.numberInSurah;
            const peeked = Boolean(peekedKeys[key]);

            const textVisualClass =
              peeked || hideLevel === 0
                ? 'opacity-100 blur-none'
                : hideLevel === 1
                ? 'opacity-40'
                : hideLevel === 2
                ? 'blur-md select-none opacity-65'
                : 'opacity-0 select-none';

            return (
              <div
                key={ayah.number}
                className={`rounded-3xl glass p-5 space-y-3 transition-all ${
                  isCurrent ? 'ring-2 ring-brand-500 dark:ring-accent' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="px-3 py-1 rounded-xl bg-brand-600/12 dark:bg-white/10 text-xs font-bold tabular-nums text-brand-700 dark:text-accent">
                    {selectedSurah}:{ayah.numberInSurah}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => audioManager.playAyah(selectedSurah, ayah.numberInSurah, currentReciterId)}
                      aria-label={`Play Ayah ${ayah.numberInSurah}`}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl glass"
                    >
                      <Play className="w-4 h-4 fill-current" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleMemorizedAyah(selectedSurah, ayah.numberInSurah)}
                      className={`min-h-[44px] px-3.5 rounded-2xl text-xs font-semibold flex items-center gap-1.5 ${
                        isMem
                          ? 'bg-accent text-brand-950'
                          : 'glass text-muted dark:text-muted-dark'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {isMem
                          ? pickLang(lang, 'Memorized', 'تم الحفظ', 'মুখস্থ')
                          : pickLang(lang, 'Mark', 'تحديد', 'চিহ্নিত')}
                      </span>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setPeekedKeys((prev) => ({...prev, [key]: !prev[key]}))
                  }
                  className="w-full text-right block rounded-2xl p-2 hover:bg-brand-500/6 dark:hover:bg-white/6 transition-colors"
                >
                  <p
                    dir="rtl"
                    className={`${arabicFontClass} leading-[2.2] text-ink dark:text-ink-dark transition-all duration-200 ${textVisualClass}`}
                    style={{fontSize: `${settings.arabicFontSize}px`}}
                  >
                    {ayah.text}
                  </p>
                  {hideLevel > 0 && !peeked && (
                    <span className="block text-center text-[11px] font-medium text-brand-600 dark:text-accent mt-1">
                      {pickLang(lang, 'Tap to peek', 'اضغط للكشف', 'দেখতে ট্যাপ করুন')}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default HifzScreen;
