import {Check, Search, X} from 'lucide-react';
import React, {useMemo, useState} from 'react';
import {pickLang, TRANSLATIONS} from '../data/i18n';
import {useQuranStore} from '../store/useQuranStore';
import {Reciter} from '../types/quran';

interface ReciterPickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedReciterId: string;
  onSelectReciter: (reciter: Reciter) => void;
}

export const ReciterPickerSheet: React.FC<ReciterPickerSheetProps> = ({
  isOpen,
  onClose,
  selectedReciterId,
  onSelectReciter,
}) => {
  const reciters = useQuranStore((s) => s.reciters);
  const lang = useQuranStore((s) => s.settings.language);
  const [query, setQuery] = useState('');

  const t = TRANSLATIONS[lang];

  const filteredReciters = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return reciters;
    return reciters.filter(
      (r) =>
        r.nameEn.toLowerCase().includes(q) ||
        r.nameAr.includes(query.trim()) ||
        r.styleEn.toLowerCase().includes(q)
    );
  }, [reciters, query]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-brand-950/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t.player.switchReciter}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[82vh] flex flex-col rounded-t-3xl sm:rounded-3xl glass-strong p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-ink dark:text-ink-dark">
            {t.player.switchReciter}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close reciter picker"
            className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full hover:bg-brand-500/10 dark:hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative mb-3">
          <Search className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-muted dark:text-muted-dark pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={pickLang(
              lang,
              'Search reciters...',
              'ابحث عن قارئ...',
              'কারি খুঁজুন...'
            )}
            className="w-full min-h-[48px] rounded-2xl glass ps-10 pe-4 text-sm text-ink dark:text-ink-dark outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-accent"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pb-safe">
          {filteredReciters.map((r) => {
            const active = r.id === selectedReciterId;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  onSelectReciter(r);
                  onClose();
                }}
                className={`w-full text-start rounded-2xl p-3.5 min-h-[56px] flex items-center justify-between gap-3 transition-colors ${
                  active
                    ? 'bg-brand-600/15 dark:bg-accent/18 text-brand-700 dark:text-accent border border-brand-500/35 dark:border-accent/35'
                    : 'glass hover:bg-brand-500/8 dark:hover:bg-white/10'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {lang === 'ar' ? r.nameAr : r.nameEn}
                  </p>
                  <p className="text-xs text-muted dark:text-muted-dark truncate">
                    {lang === 'ar' ? r.nameEn : r.nameAr} · {lang === 'ar' ? r.styleAr : r.styleEn}
                  </p>
                </div>
                {active && <Check className="w-5 h-5 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
