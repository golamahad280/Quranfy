import {
  BarChart3,
  BookOpen,
  Home,
  Library,
  Search,
  Settings,
  WifiOff,
} from 'lucide-react';
import React, {useEffect, useState} from 'react';
import {AmbientMixerSheet} from './components/AmbientMixerSheet';
import {BrandLogo} from './components/BrandLogo';
import {FullPlayerModal} from './components/FullPlayerModal';
import {MiniPlayer} from './components/MiniPlayer';
import {OnboardingModal, WhatsNewModal} from './components/OnboardingAndWhatsNew';
import {PWAInstallButton} from './components/PWAInstallButton';
import {ReaderView} from './components/ReaderView';
import {TRANSLATIONS} from './data/i18n';
import {useOnlineStatus} from './hooks/useOnlineStatus';
import {HomeScreen} from './screens/HomeScreen';
import {LibraryScreen} from './screens/LibraryScreen';
import {SearchScreen} from './screens/SearchScreen';
import {SettingsScreen} from './screens/SettingsScreen';
import {StatsScreen} from './screens/StatsScreen';
import {audioManager} from './services/audioManager';
import {listAudioDownloads} from './services/db';
import {fetchLiveReciters, fetchSurahList} from './services/quranApi';
import {useQuranStore} from './store/useQuranStore';
import {TabId} from './types/quran';

export default function App() {
  const activeTab = useQuranStore((s) => s.activeTab);
  const setActiveTab = useQuranStore((s) => s.setActiveTab);
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

  // Apply theme, sleep-dimmed mode, and RTL direction on <html>
  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = lang === 'ar' ? 'rtl' : 'ltr';

    const applyTheme = () => {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldBeDark =
        focusMode === 'sleep' ||
        settings.theme === 'dark' ||
        (settings.theme === 'auto' && prefersDark);

      root.classList.toggle('dark', shouldBeDark);
      root.classList.toggle('sleep-dimmed', focusMode === 'sleep');
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
    {id: 'search', label: t.nav.search, icon: Search},
    {id: 'library', label: t.nav.library, icon: Library},
    {id: 'stats', label: t.nav.stats, icon: BarChart3},
    {id: 'settings', label: t.nav.settings, icon: Settings},
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F6F8F7] dark:bg-[#0B1210] text-[#13201C] dark:text-[#ECF2EF]">
      {/* Desktop / Tablet Material You Navigation Rail */}
      <aside className="hidden md:flex flex-col items-center justify-between w-20 lg:w-22 shrink-0 py-5 border-e border-black/8 dark:border-white/10 bg-white/70 dark:bg-[#0F1916]/80 backdrop-blur-md sticky top-0 h-screen z-20">
        <div className="flex flex-col items-center gap-6 w-full">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            aria-label="Quranfy Home"
            className="flex flex-col items-center gap-1"
          >
            <BrandLogo className="w-10 h-10" />
          </button>

          <nav className="flex flex-col items-center gap-2 w-full px-2" aria-label="Main Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`md-ripple w-full flex flex-col items-center justify-center gap-1 py-2.5 rounded-2xl transition-colors ${
                    active
                      ? 'bg-[#0F5C4D]/14 dark:bg-[#4ECBA9]/18 text-[#0F5C4D] dark:text-[#4ECBA9]'
                      : 'text-[#546660] dark:text-[#96ABA3] hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[11px] font-medium whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <button
          type="button"
          onClick={() => openReader(currentSurahNumber)}
          aria-label={t.home.openReader}
          className="md-ripple w-12 h-12 rounded-2xl bg-[#0F5C4D] text-white dark:bg-[#4ECBA9] dark:text-[#081A15] flex items-center justify-center shadow-sm"
        >
          <BookOpen className="w-5 h-5" />
        </button>
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Compact Top App Bar */}
        <header className="sticky top-0 z-20 pt-safe bg-[#F6F8F7]/90 dark:bg-[#0B1210]/90 backdrop-blur-md border-b border-black/6 dark:border-white/8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <BrandLogo className="w-8 h-8 md:hidden shrink-0" />
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
                onClick={() => openReader(currentSurahNumber)}
                className="md-ripple inline-flex items-center gap-1.5 px-3.5 min-h-[40px] rounded-2xl bg-[#0F5C4D] text-white dark:bg-[#4ECBA9] dark:text-[#081A15] text-xs font-semibold whitespace-nowrap shrink-0"
              >
                <BookOpen className="w-4 h-4" />
                <span>{t.home.openReader}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Offline Connectivity Banner */}
        {!isOnline && (
          <div className="bg-amber-600 text-white text-xs font-medium px-4 py-2 flex items-center justify-center gap-2">
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            <span>
              {lang === 'ar'
                ? 'وضع عدم الاتصال — يتم استخدام السور والتلاوات المحفوظة محلياً'
                : 'Offline Mode — Cached text & downloaded surahs remain available'}
            </span>
          </div>
        )}

        {/* Active Screen Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-5 pb-36 md:pb-28">
          {activeTab === 'home' && <HomeScreen />}
          {activeTab === 'search' && <SearchScreen />}
          {activeTab === 'library' && <LibraryScreen />}
          {activeTab === 'stats' && <StatsScreen />}
          {activeTab === 'settings' && (
            <SettingsScreen onOpenWhatsNew={() => setShowWhatsNewManual(true)} />
          )}
        </main>
      </div>

      {/* Mini Player above Bottom Tab Bar */}
      <MiniPlayer />

      {/* Mobile Bottom Tab Bar */}
      <nav
        aria-label="Bottom Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-[#101C18]/95 backdrop-blur-md border-t border-black/8 dark:border-white/10 pb-safe"
      >
        <div className="grid grid-cols-5 h-16 items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center min-h-[48px] gap-0.5 transition-colors ${
                  active
                    ? 'text-[#0F5C4D] dark:text-[#4ECBA9]'
                    : 'text-[#546660] dark:text-[#96ABA3]'
                }`}
              >
                <div
                  className={`px-4 py-1 rounded-full transition-colors ${
                    active ? 'bg-[#0F5C4D]/12 dark:bg-[#4ECBA9]/18' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-semibold tracking-tight whitespace-nowrap">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Modals & Overlays */}
      <ReaderView />
      <FullPlayerModal />
      <AmbientMixerSheet />
      <OnboardingModal />
      <WhatsNewModal
        forceOpen={showWhatsNewManual}
        onClose={() => setShowWhatsNewManual(false)}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-[#13201C] text-white dark:bg-[#ECF2EF] dark:text-[#0B1210] text-xs font-semibold shadow-xl"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
