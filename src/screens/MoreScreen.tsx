import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bookmark,
  BookOpenCheck,
  Compass,
  HandHeart,
  Loader2,
  Repeat,
  Settings,
} from 'lucide-react';
import React, {lazy, Suspense} from 'react';
import {pickLang, TRANSLATIONS} from '../data/i18n';
import {useQuranStore} from '../store/useQuranStore';
import {MoreSectionId} from '../types/quran';

const PrayerScreen = lazy(() => import('./PrayerScreen'));
const AdhkarScreen = lazy(() => import('./AdhkarScreen'));
const HifzScreen = lazy(() => import('./HifzScreen'));
const KhatamScreen = lazy(() => import('./KhatamScreen'));
const BookmarksNotesScreen = lazy(() => import('./BookmarksNotesScreen'));
const StatsScreen = lazy(() => import('./StatsScreen').then((m) => ({default: m.StatsScreen})));
const SettingsScreen = lazy(() => import('./SettingsScreen'));

interface MoreScreenProps {
  onOpenWhatsNew: () => void;
}

export const MoreScreen: React.FC<MoreScreenProps> = ({onOpenWhatsNew}) => {
  const lang = useQuranStore((s) => s.settings.language);
  const moreSection = useQuranStore((s) => s.moreSection);
  const setMoreSection = useQuranStore((s) => s.setMoreSection);
  const khatamState = useQuranStore((s) => s.khatamState);
  const bookmarkedAyahs = useQuranStore((s) => s.bookmarkedAyahs);
  const prayerSettings = useQuranStore((s) => s.prayerSettings);
  const hifzState = useQuranStore((s) => s.hifzState);

  const t = TRANSLATIONS[lang];

  if (moreSection !== null) {
    const BackIcon = lang === 'ar' ? ArrowRight : ArrowLeft;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMoreSection(null)}
            className="md-ripple inline-flex items-center gap-2 px-4 min-h-[44px] rounded-2xl glass text-xs font-semibold text-ink dark:text-ink-dark"
          >
            <BackIcon className="w-4 h-4" />
            <span>{t.more.title}</span>
          </button>
        </div>

        <Suspense
          fallback={
            <div className="rounded-3xl glass p-12 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-brand-600 dark:text-accent" />
            </div>
          }
        >
          {moreSection === 'prayer' && <PrayerScreen />}
          {moreSection === 'adhkar' && <AdhkarScreen />}
          {moreSection === 'hifz' && <HifzScreen />}
          {moreSection === 'khatam' && <KhatamScreen />}
          {moreSection === 'bookmarks' && <BookmarksNotesScreen />}
          {moreSection === 'stats' && <StatsScreen />}
          {moreSection === 'settings' && <SettingsScreen onOpenWhatsNew={onOpenWhatsNew} />}
        </Suspense>
      </div>
    );
  }

  const cards: Array<{
    id: MoreSectionId;
    title: string;
    desc: string;
    meta?: string;
    icon: React.FC<{className?: string}>;
  }> = [
    {
      id: 'prayer',
      title: t.more.prayerTitle,
      desc: t.more.prayerDesc,
      meta: prayerSettings.cityName,
      icon: Compass,
    },
    {
      id: 'adhkar',
      title: t.more.adhkarTitle,
      desc: t.more.adhkarDesc,
      meta: pickLang(lang, '5 Categories', '٥ تصنيفات', '৫টি বিভাগ'),
      icon: HandHeart,
    },
    {
      id: 'hifz',
      title: t.more.hifzTitle,
      desc: t.more.hifzDesc,
      meta: `${hifzState.memorizedAyahKeys.length} ${pickLang(lang, 'ayahs', 'آية', 'আয়াত')}`,
      icon: Repeat,
    },
    {
      id: 'khatam',
      title: t.more.khatamTitle,
      desc: t.more.khatamDesc,
      meta: `${khatamState.pagesCompleted} / 604`,
      icon: BookOpenCheck,
    },
    {
      id: 'bookmarks',
      title: t.more.bookmarksTitle,
      desc: t.more.bookmarksDesc,
      meta: `${bookmarkedAyahs.length} ${pickLang(lang, 'saved', 'محفوظة', 'সংরক্ষিত')}`,
      icon: Bookmark,
    },
    {
      id: 'stats',
      title: t.more.statsTitle,
      desc: t.more.statsDesc,
      icon: BarChart3,
    },
    {
      id: 'settings',
      title: t.more.settingsTitle,
      desc: t.more.settingsDesc,
      icon: Settings,
    },
  ];

  return (
    <div className="space-y-5 pb-8">
      <div>
        <h1 className="font-display text-xl font-bold text-ink dark:text-ink-dark">
          {t.more.title}
        </h1>
        <p className="text-xs text-muted dark:text-muted-dark mt-0.5">{t.more.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => setMoreSection(card.id)}
              className="md-ripple text-start rounded-3xl glass p-5 flex items-start gap-4 hover:border-brand-400/50 dark:hover:border-accent/45 transition-all min-h-[104px]"
            >
              <div className="w-12 h-12 rounded-2xl bg-brand-600/14 dark:bg-accent/18 text-brand-700 dark:text-accent flex items-center justify-center shrink-0">
                <Icon className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-ink dark:text-ink-dark truncate">
                    {card.title}
                  </h2>
                  {card.meta && (
                    <span className="text-[11px] font-semibold text-brand-700 dark:text-accent tabular-nums shrink-0">
                      {card.meta}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted dark:text-muted-dark leading-relaxed">
                  {card.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
export default MoreScreen;
