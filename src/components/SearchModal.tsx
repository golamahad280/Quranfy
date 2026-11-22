import {Search, X} from 'lucide-react';
import React from 'react';
import {TRANSLATIONS} from '../data/i18n';
import {SearchScreen} from '../screens/SearchScreen';
import {useQuranStore} from '../store/useQuranStore';

export const SearchModal: React.FC = () => {
  const isSearchOpen = useQuranStore((s) => s.isSearchOpen);
  const setSearchOpen = useQuranStore((s) => s.setSearchOpen);
  const lang = useQuranStore((s) => s.settings.language);
  const t = TRANSLATIONS[lang];

  if (!isSearchOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col bg-surface-light/95 dark:bg-surface-dark/96 backdrop-blur-2xl"
      role="dialog"
      aria-modal="true"
      aria-label={t.nav.search}
    >
      <header className="pt-safe glass-nav border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-brand-700 dark:text-accent">
            <Search className="w-5 h-5" />
            <h1 className="text-base font-bold text-ink dark:text-ink-dark">{t.nav.search}</h1>
          </div>
          <button
            type="button"
            onClick={() => setSearchOpen(false)}
            aria-label="Close Search"
            className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-2xl hover:bg-brand-500/10 dark:hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
        <div className="max-w-4xl mx-auto">
          <SearchScreen />
        </div>
      </div>
    </div>
  );
};
export default SearchModal;
