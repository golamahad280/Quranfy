import {Heart, RotateCcw} from 'lucide-react';
import React, {useMemo, useState} from 'react';
import adhkarJson from '../data/adhkar.json';
import {pickLang} from '../data/i18n';
import {useQuranStore} from '../store/useQuranStore';
import {AdhkarCategory, AdhkarItem} from '../types/quran';

type FilterTab = AdhkarCategory | 'favorites';

const ALL_ADHKAR = adhkarJson as AdhkarItem[];

export const AdhkarScreen: React.FC = () => {
  const lang = useQuranStore((s) => s.settings.language);
  const arabicFont = useQuranStore((s) => s.settings.arabicFont);
  const favoriteAdhkarIds = useQuranStore((s) => s.favoriteAdhkarIds);
  const toggleFavoriteAdhkar = useQuranStore((s) => s.toggleFavoriteAdhkar);

  const [category, setCategory] = useState<FilterTab>('morning');
  const [counts, setCounts] = useState<Record<string, number>>({});

  const categories: Array<{id: FilterTab; label: string}> = [
    {id: 'morning', label: pickLang(lang, 'Morning', 'الصباح', 'সকাল')},
    {id: 'evening', label: pickLang(lang, 'Evening', 'المساء', 'সন্ধ্যা')},
    {id: 'after-prayer', label: pickLang(lang, 'After Prayer', 'بعد الصلاة', 'নামাজের পর')},
    {id: 'sleep', label: pickLang(lang, 'Sleep', 'النوم', 'ঘুম')},
    {id: 'travel', label: pickLang(lang, 'Travel', 'السفر', 'সফর')},
    {id: 'favorites', label: pickLang(lang, 'Favorites', 'المفضلة', 'প্রিয়')},
  ];

  const items = useMemo(() => {
    if (category === 'favorites') {
      return ALL_ADHKAR.filter((item) => favoriteAdhkarIds.includes(item.id));
    }
    return ALL_ADHKAR.filter((item) => item.category === category);
  }, [category, favoriteAdhkarIds]);

  const arabicFontClass =
    arabicFont === 'scheherazade' ? 'font-quran-scheherazade' : 'font-quran-amiri';

  const handleTapCount = (item: AdhkarItem) => {
    const current = counts[item.id] ?? 0;
    if (current >= item.count) return;
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(12);
      } catch {
        // Ignore on unsupported browsers
      }
    }
    setCounts((prev) => ({...prev, [item.id]: Math.min(item.count, current + 1)}));
  };

  const handleReset = (id: string) => {
    setCounts((prev) => {
      const next = {...prev};
      delete next[id];
      return next;
    });
  };

  const handleResetAll = () => {
    setCounts({});
  };

  return (
    <div className="space-y-5 pb-8 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink dark:text-ink-dark">
            {pickLang(lang, 'Dua & Adhkar', 'الأدعية والأذكار', 'দুআ ও আযকার')}
          </h2>
          <p className="text-xs text-muted dark:text-muted-dark">
            {pickLang(
              lang,
              '100% offline authentic remembrances with tap counters',
              'أذكار مأثورة تعمل دون إنترنت مع عدّاد تفاعلي',
              'অফলাইন সহীহ আযকার ও তাসবীহ কাউন্টার'
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetAll}
          className="md-ripple inline-flex items-center gap-1.5 px-3.5 min-h-[44px] rounded-2xl glass text-xs font-semibold"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{pickLang(lang, 'Reset Counters', 'تصفير الكل', 'সব রিসেট')}</span>
        </button>
      </div>

      {/* Category Filter Strip */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const active = category === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`md-ripple px-4 min-h-[44px] rounded-2xl text-xs font-semibold transition-colors ${
                active
                  ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950 shadow-sm'
                  : 'glass text-ink dark:text-ink-dark'
              }`}
            >
              {cat.label}
              {cat.id === 'favorites' && favoriteAdhkarIds.length > 0
                ? ` (${favoriteAdhkarIds.length})`
                : ''}
            </button>
          );
        })}
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl glass p-8 text-center">
          <p className="text-sm text-muted dark:text-muted-dark">
            {pickLang(
              lang,
              'Tap the heart on any dhikr or dua to save it to Favorites.',
              'اضغط على أيقونة القلب لحفظ أي ذكر أو دعاء في المفضلة.',
              'যেকোনো দুআ প্রিয় তালিকায় রাখতে হার্ট আইকনে ট্যাপ করুন।'
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const currentCount = counts[item.id] ?? 0;
            const done = currentCount >= item.count;
            const isFav = favoriteAdhkarIds.includes(item.id);
            const pct = Math.min(100, Math.round((currentCount / item.count) * 100));

            return (
              <article
                key={item.id}
                className={`rounded-3xl glass p-5 space-y-4 transition-all ${
                  done ? 'ring-1 ring-accent/50 bg-accent/8 dark:bg-accent/10' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-brand-700 dark:text-accent">
                      {pickLang(lang, item.titleEn, item.titleAr, item.titleBn)}
                    </h3>
                    <p className="text-[11px] text-muted dark:text-muted-dark mt-0.5">
                      {item.reference}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleReset(item.id)}
                      aria-label="Reset counter"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl hover:bg-brand-500/10 dark:hover:bg-white/10 text-muted dark:text-muted-dark"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleFavoriteAdhkar(item.id)}
                      aria-label="Favorite dhikr"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl hover:bg-brand-500/10 dark:hover:bg-white/10"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isFav ? 'fill-accent text-accent' : 'text-muted dark:text-muted-dark'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <p
                  dir="rtl"
                  className={`${arabicFontClass} text-right text-2xl sm:text-[26px] leading-[2.1] text-ink dark:text-ink-dark`}
                >
                  {item.arabic}
                </p>

                <p className="text-xs italic text-brand-700/85 dark:text-brand-200/85 leading-relaxed">
                  {item.transliteration}
                </p>

                <div className="space-y-2">
                  <p className="text-sm text-ink/90 dark:text-ink-dark/90 leading-relaxed">
                    {item.english}
                  </p>
                  <p className="font-bengali text-sm text-muted dark:text-muted-dark leading-relaxed">
                    {item.bangla}
                  </p>
                </div>

                {/* Progress bar + Tap counter button */}
                <div className="pt-2 flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-brand-600/12 dark:bg-white/12 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        done ? 'bg-accent' : 'bg-brand-600 dark:bg-accent'
                      }`}
                      style={{width: `${pct}%`}}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleTapCount(item)}
                    className={`md-ripple min-h-[48px] px-5 rounded-2xl text-xs font-bold tabular-nums transition-colors ${
                      done
                        ? 'bg-accent text-brand-950 shadow-sm'
                        : 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950 shadow-sm'
                    }`}
                  >
                    {done
                      ? pickLang(lang, `Done (${item.count}/${item.count})`, `تم (${item.count})`, `সম্পন্ন (${item.count})`)
                      : `${currentCount} / ${item.count}`}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default AdhkarScreen;
