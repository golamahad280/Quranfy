import {BookText, CheckCircle2, RotateCcw, WifiOff, X} from 'lucide-react';
import React, {useEffect, useMemo, useState} from 'react';
import {pickLang, TRANSLATIONS} from '../data/i18n';
import {
  fetchAvailableTafsirs,
  fetchAyahTafsir,
  groupTafsirsByLanguage,
  resolvePreferredTafsirId,
} from '../services/tafsirApi';
import {useQuranStore} from '../store/useQuranStore';
import {TafsirAyahContent, TafsirResource} from '../types/quran';

export const TafsirSheet: React.FC = () => {
  const tafsirTarget = useQuranStore((s) => s.tafsirTarget);
  const closeTafsirSheet = useQuranStore((s) => s.closeTafsirSheet);
  const surahs = useQuranStore((s) => s.surahs);
  const settings = useQuranStore((s) => s.settings);
  const updateSettings = useQuranStore((s) => s.updateSettings);

  const [tafsirs, setTafsirs] = useState<TafsirResource[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [content, setContent] = useState<TafsirAyahContent | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [loadingText, setLoadingText] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  const lang = settings.language;
  const t = TRANSLATIONS[lang];

  // Fetch available tafsirs dynamically at runtime when sheet opens
  useEffect(() => {
    if (!tafsirTarget) return;
    let active = true;
    setLoadingList(true);
    setListError(null);

    fetchAvailableTafsirs()
      .then((list) => {
        if (!active) return;
        setTafsirs(list);
        setLoadingList(false);
        if (settings.selectedTafsirId === null && list.length > 0) {
          const preferred = resolvePreferredTafsirId(list, null, lang);
          if (preferred !== null) {
            updateSettings({selectedTafsirId: preferred});
          }
        }
      })
      .catch(() => {
        if (!active) return;
        setListError(t.tafsir.errorLoad);
        setLoadingList(false);
      });

    return () => {
      active = false;
    };
  }, [tafsirTarget, retryTick]);

  const grouped = useMemo(() => groupTafsirsByLanguage(tafsirs), [tafsirs]);

  const activeTafsirId = useMemo(
    () => resolvePreferredTafsirId(tafsirs, settings.selectedTafsirId, lang),
    [tafsirs, settings.selectedTafsirId, lang]
  );

  const activeResource = useMemo(
    () => tafsirs.find((item) => item.id === activeTafsirId),
    [tafsirs, activeTafsirId]
  );

  // Fetch ayah tafsir when activeTafsirId or tafsirTarget changes
  useEffect(() => {
    if (!tafsirTarget || activeTafsirId === null) return;
    let active = true;
    setLoadingText(true);
    setTextError(null);

    fetchAyahTafsir(
      activeTafsirId,
      tafsirTarget.surahNumber,
      tafsirTarget.ayahNumber,
      activeResource
    )
      .then((res) => {
        if (!active) return;
        setContent(res.content);
        setFromCache(res.fromCache);
        setLoadingText(false);
      })
      .catch(() => {
        if (!active) return;
        setContent(null);
        setTextError(t.tafsir.errorLoad);
        setLoadingText(false);
      });

    return () => {
      active = false;
    };
  }, [tafsirTarget, activeTafsirId, activeResource, retryTick, t.tafsir.errorLoad]);

  if (!tafsirTarget) return null;

  const surah = surahs.find((s) => s.number === tafsirTarget.surahNumber);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-brand-950/65 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t.tafsir.title}
      onClick={closeTafsirSheet}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-t-3xl sm:rounded-3xl glass-strong shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-brand-500/15 dark:border-white/12">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-brand-600/14 dark:bg-accent/18 text-brand-700 dark:text-accent flex items-center justify-center shrink-0">
              <BookText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-ink dark:text-ink-dark truncate">
                {t.tafsir.title}
              </h2>
              <p className="text-xs text-muted dark:text-muted-dark truncate">
                {surah ? `${surah.englishName} (${surah.name})` : `Surah ${tafsirTarget.surahNumber}`}{' '}
                · {tafsirTarget.surahNumber}:{tafsirTarget.ayahNumber}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeTafsirSheet}
            aria-label="Close Tafsir"
            className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full hover:bg-brand-500/10 dark:hover:bg-white/10 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Runtime Tafsir Selector */}
          <div className="rounded-2xl glass p-3.5 space-y-2">
            <label
              htmlFor="tafsir-resource-select"
              className="block text-xs font-semibold text-brand-700 dark:text-accent"
            >
              {t.tafsir.selectTafsir}
            </label>

            {loadingList && tafsirs.length === 0 ? (
              <div className="h-11 rounded-xl bg-brand-900/10 dark:bg-white/10 animate-pulse" />
            ) : listError && tafsirs.length === 0 ? (
              <div className="flex items-center justify-between gap-2 text-xs text-muted dark:text-muted-dark">
                <span>{listError}</span>
                <button
                  type="button"
                  onClick={() => setRetryTick((x) => x + 1)}
                  className="min-h-[40px] px-3 rounded-xl bg-brand-600 text-white dark:bg-accent dark:text-brand-950 font-semibold"
                >
                  {pickLang(lang, 'Retry', 'إعادة المحاولة', 'পুনরায় চেষ্টা করুন')}
                </button>
              </div>
            ) : (
              <select
                id="tafsir-resource-select"
                value={activeTafsirId ?? ''}
                onChange={(e) => updateSettings({selectedTafsirId: Number(e.target.value)})}
                className="w-full min-h-[48px] rounded-2xl glass px-3.5 text-sm font-medium text-ink dark:text-ink-dark"
              >
                {grouped.english.length > 0 && (
                  <optgroup label={t.tafsir.englishGroup}>
                    {grouped.english.map((item) => (
                      <option
                        key={item.id}
                        value={item.id}
                        className="bg-surface-light dark:bg-surface-dark"
                      >
                        {item.name} — {item.author_name}
                      </option>
                    ))}
                  </optgroup>
                )}

                {grouped.bangla.length > 0 && (
                  <optgroup label={t.tafsir.banglaGroup}>
                    {grouped.bangla.map((item) => (
                      <option
                        key={item.id}
                        value={item.id}
                        className="bg-surface-light dark:bg-surface-dark"
                      >
                        {item.translated_name?.name || item.name} — {item.author_name}
                      </option>
                    ))}
                  </optgroup>
                )}

                {grouped.others.length > 0 && (
                  <optgroup label={t.tafsir.otherGroup}>
                    {grouped.others.map((item) => (
                      <option
                        key={item.id}
                        value={item.id}
                        className="bg-surface-light dark:bg-surface-dark"
                      >
                        [{item.language_name}] {item.name} — {item.author_name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            )}
          </div>

          {/* Ayah Reference Card */}
          <div className="rounded-2xl bg-brand-600/8 dark:bg-white/6 border border-brand-500/15 dark:border-white/12 p-4">
            <p className="font-quran-amiri text-2xl leading-loose text-right" dir="rtl">
              {tafsirTarget.arabicText}
            </p>
          </div>

          {/* Tafsir Body / Skeleton / Error */}
          {loadingText && (
            <div className="space-y-3 py-2">
              <div className="h-4 bg-brand-900/10 dark:bg-white/12 rounded-lg w-3/4 animate-pulse" />
              <div className="h-4 bg-brand-900/10 dark:bg-white/12 rounded-lg w-full animate-pulse" />
              <div className="h-4 bg-brand-900/10 dark:bg-white/12 rounded-lg w-5/6 animate-pulse" />
              <div className="h-4 bg-brand-900/10 dark:bg-white/12 rounded-lg w-2/3 animate-pulse" />
            </div>
          )}

          {textError && !loadingText && (
            <div className="rounded-2xl glass p-6 text-center space-y-3">
              <WifiOff className="w-7 h-7 mx-auto text-muted dark:text-muted-dark" />
              <p className="text-sm text-muted dark:text-muted-dark">{textError}</p>
              <button
                type="button"
                onClick={() => setRetryTick((x) => x + 1)}
                className="md-ripple inline-flex items-center gap-2 px-5 min-h-[48px] rounded-2xl bg-brand-600 text-white dark:bg-accent dark:text-brand-950 text-xs font-semibold"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{pickLang(lang, 'Retry', 'إعادة المحاولة', 'পুনরায় চেষ্টা করুন')}</span>
              </button>
            </div>
          )}

          {!loadingText && !textError && content && (
            <div className="space-y-3 pb-4">
              {fromCache && (
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 dark:text-accent">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t.tafsir.offlineNotice}</span>
                </div>
              )}

              {content.sanitizedHtml.trim() ? (
                <div
                  className={`tafsir-html ${
                    (activeResource?.language_name || '').toLowerCase() === 'bengali'
                      ? 'font-bengali'
                      : ''
                  }`}
                  // HTML is sanitized strictly through DOMPurify.sanitize in tafsirApi.ts
                  dangerouslySetInnerHTML={{__html: content.sanitizedHtml}}
                />
              ) : (
                <p className="text-sm text-muted dark:text-muted-dark">{t.tafsir.noText}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
