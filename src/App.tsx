import {
  BookOpen,
  BookText,
  Home,
  LayoutGrid,
  Library,
  Loader2,
  Search,
  WifiOff,
} from 'lucide-react';
import React, {lazy, Suspense, useEffect, useState} from 'react';
import {BrandLogo} from './components/BrandLogo';
import {MiniPlayer} from './components/MiniPlayer';
import {OnboardingModal, WhatsNewModal} from './components/OnboardingAndWhatsNew';
import {PWAInstallButton} from './components/PWAInstallButton';
import {pickLang, TRANSLATIONS} from './data/i18n';
import {useOnlineStatus} from './hooks/useOnlineStatus';
import {HomeScreen} from './screens/HomeScreen';
import {audioManager} from './services/audioManager';
import {listAudioDownloads} from './services/db';
import {syncNativeStatusBar} from './services/native';
import {fetchLiveReciters, fetchSurahList} from './services/quranApi';
import {useQuranStore} from './store/useQuranStore';
import {TabId} from './types/quran';

const QuranScreen = lazy(() => import('./screens/QuranScreen'));
const HadithScreen = lazy(() => import('./screens/HadithScreen'));
const LibraryScreen = lazy(() =>
  import('./screens/LibraryScreen').then((m) => ({default: m.LibraryScreen}))
);
const MoreScreen = lazy(() => import('./screens/MoreScreen'));
const ReaderView = lazy(() => import('./components/ReaderView'));
const FullPlayerModal = lazy(() => import('./components/FullPlayerModal'));
const AmbientMixerSheet = lazy(() =>
  import('./components/AmbientMixerSheet').then((m) => ({default: m.AmbientMixerSheet}))
);
const ShareImageModal = lazy(() => import('./components/ShareImageModal'));
const SearchModal = lazy(() => import('./components/SearchModal'));

const TabFallback: React.FC = () => (
  <div className="rounded-3xl glass p-12 flex items-center justify-center">
    <Loader2 className="w-6 h-6 animate-spin text-brand-600 dark:text-accent" />
  </div>
);

export default function App() {
  const activeTab = useQuranStore((s) => s.activeTab);
  const setActiveTab = useQuranStore((s) => s.setActiveTab);
  const setMoreSection = useQuranStore((s) => s.setMoreSection);
  const isSearchOpen = useQuranStore((s) => s.isSearchOpen);
  const setSearchOpen = useQuranStore((s) => s.setSearchOpen);
  const readerSurahNumber = useQuranStore((s) => s.readerSurahNumber);
  const isFullPlayerOpen = useQuranStore((s) => s.isFullPlayerOpen);
  const isAmbientSheetOpen = useQuranStore((s) => s.isAmbientSheetOpen);
  const shareImagePayload = useQuranStore((s) => s.shareImagePayload);

  const focusMode = useQuranStore((s) => s.focusMode);
  const settings = useQuranStore((s) => s.settings);
  const currentSurahNumber = useQuranStore((s) => s.currentSurahNumber);
  const openReader = useQuranStore((s) => s.openReader);
  const setSurahs = useQuranStore((s) => s.setSurahs);
  const setReciters = useQuranStore((s) => s.setReciters);
  const setDownloadedKeys = useQuranStore((s) => s.setDownloadedKeys);
  const toastMessage = useQuranStore((s) => s.toastMessage);

  const [showWhatsNewManual, setShowWhatsNewManual] = useState(false);
  const isOnline = useOnlineStatus();

  const lang = settings.language;
  const t = TRANSLATIONS[lang];

  // Apply theme, sleep-dimmed mode, focus-mode orb hue, and RTL direction on <html>
  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = lang === 'ar' ? 'rtl' : 'ltr';
    root.dataset.mode = focusMode;

    const applyTheme = () => {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldBeDark =
        focusMode === 'sleep' ||
        settings.theme === 'dark' ||
        (settings.theme === 'auto' && prefersDark);

      root.classList.toggle('dark', shouldBeDark);
      root.classList.toggle('sleep-dimmed', focusMode === 'sleep');
      void syncNativeStatusBar(shouldBeDark, focusMode === 'sleep');
    };

    applyTheme();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', applyTheme);
    return () => mq.removeEventListener('change', applyTheme);
  }, [settings.theme, focusMode, lang]);

  // Initialize audio manager & hydrate APIs/IndexedDB
  useEffect(() => {
    audioManager.init();

    fetchSurahList()
      .then((list) => {
        if (list.length === 114) setSurahs(list);
      })
      .catch(() => {});

    fetchLiveReciters()
      .then((list) => {
        if (list.length > 0) setReciters(list);
      })
      .catch(() => {});

    listAudioDownloads()
      .then((dls) => {
        setDownloadedKeys(dls.map((d) => d.key));
      })
      .catch(() => {});
  }, [setSurahs, setReciters, setDownloadedKeys]);

  const navItems: Array<{id: TabId; label: string; icon: React.FC<{className?: string}>}> = [
    {id: 'home', label: t.nav.home, icon: Home},
    {id: 'quran', label: t.nav.quran, icon: BookOpen},
    {id: 'hadith', label: t.nav.hadith, icon: BookText},
    {id: 'library', label: t.nav.library, icon: Library},
    {id: 'more', label: t.nav.more, icon: LayoutGrid},
  ];

  const handleSelectTab = (tabId: TabId) => {
    if (tabId === 'more' && activeTab === 'more') {
      setMoreSection(null);
      return;
    }
    setActiveTab(tabId);
  };

  return (
    <div className="relative min-h-screen flex flex-col md:flex-row text-ink dark:text-ink-dark">
      {/* Lightweight CSS-only Animated Blurred Orb Backdrop */}
      <div className="orb-backdrop" aria-hidden="true">
        <span className="orb-blob orb-blob-1" />
        <span className="orb-blob orb-blob-2" />
        <span className="orb-blob orb-blob-3" />
      </div>

      {/* Desktop / Tablet Material You Glass Navigation Rail (5 Tabs) */}
      <aside className="hidden md:flex flex-col items-center justify-between w-20 lg:w-22 shrink-0 py-5 border-e glass-nav sticky top-0 h-screen z-20">
        <div className="flex flex-col items-center gap-6 w-full">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            aria-label="Quranfy Home"
            className="flex flex-col items-center gap-1 min-h-[48px] min-w-[48px] justify-center rounded-2xl"
          >
            <BrandLogo className="w-10 h-10" />
          </button>

          <nav className="flex flex-col items-center gap-1.5 w-full px-2" aria-label="Main Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectTab(item.id)}
                  className={`md-ripple w-full flex flex-col items-center justify-center gap-1 min-h-[54px] py-2 rounded-2xl transition-colors ${
                    active
                      ? 'bg-brand-600/15 dark:bg-brand-400/20 text-brand-700 dark:text-brand-200'
                      : 'text-muted dark:text-muted-dark hover:bg-brand-500/8 dark:hover:bg-white/8'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[11px] font-semibold whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <button
          type="button"
          onClick={() => openReader(currentSurahNumber)}
          aria-label={t.home.openReader}
          className="md-ripple w-12 h-12 rounded-2xl bg-brand-600 text-white dark:bg-accent dark:text-brand-950 flex items-center justify-center shadow-md"
        >
          <BookOpen className="w-5 h-5" />
        </button>
      </aside>

      {/* Main Column */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0">
        {/* Compact Glass Top App Bar */}
        <header className="sticky top-0 z-20 pt-safe glass-nav border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <BrandLogo className="w-9 h-9 md:hidden shrink-0" />
              <span className="font-display text-lg font-bold tracking-tight whitespace-nowrap shrink-0">
                {t.appName}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden sm:block">
                <PWAInstallButton compact />
              </div>
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label={t.nav.search}
                className="md-ripple min-h-[48px] min-w-[48px] sm:min-h-[42px] sm:min-w-[42px] rounded-2xl glass flex items-center justify-center text-ink dark:text-ink-dark"
              >
                <Search className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => openReader(currentSurahNumber)}
                className="md-ripple inline-flex items-center gap-1.5 px-4 min-h-[48px] sm:min-h-[42px] rounded-2xl bg-brand-600 text-white dark:bg-accent dark:text-brand-950 text-xs font-semibold whitespace-nowrap shrink-0 shadow-sm"
              >
                <BookOpen className="w-4 h-4" />
                <span>{t.home.openReader}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Offline Connectivity Banner */}
        {!isOnline && (
          <div className="bg-accent-600 text-white text-xs font-medium px-4 py-2 flex items-center justify-center gap-2">
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            <span>
              {pickLang(
                lang,
                'Offline Mode — Cached text, tafsir, hadiths & downloads remain available',
                'وضع عدم الاتصال — السور والتفاسير والأحاديث والتلاوات المحفوظة متاحة محلياً',
                'অফলাইন মোড — সংরক্ষিত পাঠ, তাফসীর, হাদিস ও অডিও সচল আছে'
              )}
            </span>
          </div>
        )}

        {/* Active Screen Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-5 pb-40 md:pb-28">
          {activeTab === 'home' && <HomeScreen />}
          {activeTab === 'quran' && (
            <Suspense fallback={<TabFallback />}>
              <QuranScreen />
            </Suspense>
          )}
          {activeTab === 'hadith' && (
            <Suspense fallback={<TabFallback />}>
              <HadithScreen />
            </Suspense>
          )}
          {activeTab === 'library' && (
            <Suspense fallback={<TabFallback />}>
              <LibraryScreen />
            </Suspense>
          )}
          {activeTab === 'more' && (
            <Suspense fallback={<TabFallback />}>
              <MoreScreen onOpenWhatsNew={() => setShowWhatsNewManual(true)} />
            </Suspense>
          )}
        </main>
      </div>

      {/* Mini Player above Bottom Tab Bar */}
      <MiniPlayer />

      {/* Mobile Glass Bottom Tab Bar (5 Tabs) */}
      <nav
        aria-label="Bottom Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 glass-nav border-t pb-safe"
      >
        <div className="grid grid-cols-5 h-16 items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                className={`flex flex-col items-center justify-center min-h-[48px] gap-0.5 transition-colors px-1 ${
                  active
                    ? 'text-brand-700 dark:text-accent'
                    : 'text-muted dark:text-muted-dark'
                }`}
              >
                <div
                  className={`px-3 py-1 rounded-full transition-colors ${
                    active ? 'bg-brand-600/14 dark:bg-accent/18' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold tracking-tight truncate max-w-full">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Lazy-loaded Modals & Overlays */}
      {readerSurahNumber !== null && (
        <Suspense fallback={null}>
          <ReaderView />
        </Suspense>
      )}
      {isFullPlayerOpen && (
        <Suspense fallback={null}>
          <FullPlayerModal />
        </Suspense>
      )}
      {isAmbientSheetOpen && (
        <Suspense fallback={null}>
          <AmbientMixerSheet />
        </Suspense>
      )}
      {shareImagePayload !== null && (
        <Suspense fallback={null}>
          <ShareImageModal />
        </Suspense>
      )}
      {isSearchOpen && (
        <Suspense fallback={null}>
          <SearchModal />
        </Suspense>
      )}

      <OnboardingModal />
      <WhatsNewModal
        forceOpen={showWhatsNewManual}
        onClose={() => setShowWhatsNewManual(false)}
      />

      {/* Glass Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed top-18 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl glass-strong text-ink dark:text-ink-dark text-xs font-semibold shadow-xl"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
